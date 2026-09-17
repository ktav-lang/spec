import fs from 'node:fs';
import path from 'node:path';

import { LANGS, LANG_SEPARATOR_RE, bodyFileName, langSeparator } from '../shared.mjs';
import { failUnit } from './decode.mjs';
import {
  buildThematicBreakSuffix,
  canContinueParagraph,
  codePointWidth,
  consumeBlockquoteMarker,
  consumeIndent,
  consumeListPadding,
  continueLinkReference,
  expandTabs,
  isBlankLinkContinuation,
  isEmptyListMarker,
  isFenceCloser,
  isSetextParagraphLine,
  isThematicBreak,
  isThematicBreakAt,
  leadingColumns,
  parseAtxHeading,
  parseFenceOpener,
  parseHtmlBlockOpener,
  parseListMarker,
  parseSetextUnderline,
  scanLinkReferenceStart,
  startsLinkTitle,
} from './blocks.mjs';
const quoteChildren = new WeakMap();

function newContainer(kind, parent = null) {
  return {
    kind,
    parent,
    containsList: kind === 'list' || parent?.containsList === true,
  };
}

function quoteChild(container) {
  let child = quoteChildren.get(container);
  if (child === undefined) {
    child = newContainer('quote', container);
    quoteChildren.set(container, child);
  }
  return child;
}

function containerLabel(container) {
  const parts = [];
  for (let current = container; current.parent !== null; current = current.parent) {
    parts.push(current.kind === 'list' ? `list-${current.id}` : 'quote');
  }
  return ['root', ...parts.reverse()].join('/');
}

// Normalize a line by repeatedly consuming blockquote and list containers.
// Container identity is a compact object graph rather than a cumulative path
// string. The active list path is truncated by index, so nested markers do not
// repeatedly scan or copy all ancestor frames.
function normalizeContainerLine(raw, state) {
  const line = expandTabs(raw);
  let pos = 0;
  let container = state.root;
  let indentedCode = false;
  let consumedContainer = false;
  // The active path is immutable between lines. Copy it only when this line
  // actually adds or removes a frame; lazy continuation lines keep the same
  // reference instead of copying the entire nesting depth.
  let frames = state.activeLists;
  let framesChanged = false;
  let activeFrameIndex = 0;
  let thematicBreak = false;
  const containerFrames = [];
  let checkThematicBreak = true;
  let thematicBreakSuffix = null;

  while (true) {
    const continuationIndent = leadingColumns(line, pos, true);
    const frame = frames[activeFrameIndex];
    if (frame !== undefined && frame.parent === container &&
        continuationIndent.column >= frame.indent) {
      const end = consumeIndent(line, pos, frame.indent, true);
      if (end !== null) {
        pos = end;
        container = frame.container;
        consumedContainer = true;
        containerFrames.push({ kind: 'list', indent: frame.indent });
        activeFrameIndex++;
        continue;
      }
    }

    const quoteEnd = consumeBlockquoteMarker(line, pos, true);
    if (quoteEnd !== null) {
      pos = quoteEnd;
      container = quoteChild(container);
      consumedContainer = true;
      containerFrames.push({ kind: 'quote' });
      checkThematicBreak = true;
      continue;
    }

    const isBreak = thematicBreakSuffix === null
      ? isThematicBreak(line.slice(pos))
      : isThematicBreakAt(line, pos, thematicBreakSuffix);
    if (checkThematicBreak && isBreak) {
      thematicBreak = true;
      break;
    }

    const list = parseListMarker(line, pos, true);
    if (list === null) break;
    // Empty markers and ordered markers other than 1 cannot interrupt an
    // active paragraph in this same container. A list sibling is different:
    // its marker belongs to the parent of the previous list item and must be
    // normalized as a new item, including "1. first / 2. # heading".
    const sameParagraphContainer = state.paragraphContainer === container;
    if ((sameParagraphContainer &&
         (isEmptyListMarker(line, list) ||
          (list.ordered && list.start !== 1)))) break;

    const markerIndent = leadingColumns(line, pos, true).column;
    const padding = consumeListPadding(line, list, true);
    if (!framesChanged) {
      frames = frames.slice(0, activeFrameIndex);
      framesChanged = true;
    } else {
      frames.length = activeFrameIndex;
    }
    const item = newContainer('list', container);
    item.id = state.nextListId++;
    const frameForItem = {
      parent: container,
      container: item,
      indent: markerIndent + padding.indent,
    };
    frames.push(frameForItem);
    containerFrames.push({
      kind: 'list',
      indent: markerIndent + padding.indent,
    });
    container = item;
    activeFrameIndex++;
    pos = padding.pos;
    indentedCode ||= padding.indentedCode;
    consumedContainer = true;
    checkThematicBreak = true;
    if (thematicBreakSuffix === null) thematicBreakSuffix = buildThematicBreakSuffix(line);
  }

  const lazyListSetext = !consumedContainer && !thematicBreak &&
    state.paragraphContainer?.containsList === true &&
    parseSetextUnderline(line) !== null;
  const lazySetextContainer = lazyListSetext ? state.paragraphContainer : null;
  const lazyContainer = !consumedContainer && state.paragraphContainer !== null &&
    (canContinueParagraph(line) || lazySetextContainer !== null)
    ? state.paragraphContainer : null;
  if (!consumedContainer && thematicBreak) {
    // A thematic break is a block start, not a lazy Setext continuation of
    // the list item that preceded it.
    container = state.root;
    frames = [];
    framesChanged = true;
    activeFrameIndex = 0;
  } else if (/^[ \t]*$/.test(line) && state.activeLists.length > 0) {
    frames = state.activeLists;
    activeFrameIndex = frames.length;
    container = frames.at(-1).container;
    consumedContainer = true;
  } else if (lazyContainer !== null) {
    container = lazyContainer;
    frames = state.activeLists;
    activeFrameIndex = frames.length;
  } else if (!consumedContainer) {
    frames = [];
    framesChanged = true;
    activeFrameIndex = 0;
  }
  if (frames.length > activeFrameIndex) {
    if (framesChanged) frames.length = activeFrameIndex;
    else frames = frames.slice(0, activeFrameIndex);
  }
  state.activeLists = frames;

  const content = line.slice(pos);
  // Measure indentation from the line's absolute column. Resetting a tab to
  // column zero here misclassifies content after a space-indented container.
  const contentIndent = leadingColumns(line, pos, true).column;
  const sourceContent = sourceSliceAtExpandedPosition(raw, pos);
  return {
    content,
    sourceContent,
    container,
    consumedContainer,
    // A tab or four visual columns at the normalized block level is code,
    // not a paragraph which can become a Setext heading.
    isIndentedCode: indentedCode || contentIndent >= 4,
    containerFrames,
    suppressSetext: lazyListSetext && !state.allowLazySetext,
    raw,
    expanded: line,
  };
}

function matchFenceContainer(line, frames) {
  line = expandTabs(line);
  let pos = 0;
  for (const frame of frames) {
    if (frame.kind === 'quote') {
      const end = consumeBlockquoteMarker(line, pos, true);
      if (end === null) return null;
      pos = end;
    } else {
      const end = consumeIndent(line, pos, frame.indent, true);
      if (end === null) return null;
      pos = end;
    }
  }
  return line.slice(pos);
}

function sourceSliceAtExpandedPosition(raw, target) {
  let rawPos = 0;
  let expandedPos = 0;
  let column = 0;
  while (rawPos < raw.length) {
    const ch = raw[rawPos];
    const width = codePointWidth(raw, rawPos);
    if (ch === '\t') {
      const spaces = 4 - (column % 4);
      const next = expandedPos + spaces;
      if (target < next) return ' '.repeat(next - target) + raw.slice(rawPos + 1);
      expandedPos = next;
      column += spaces;
      rawPos += width;
      continue;
    }
    const next = expandedPos + width;
    if (target < next) return raw.slice(rawPos);
    expandedPos = next;
    column++;
    rawPos += width;
  }
  return '';
}

function cloneHeadingState(state, paragraphLine) {
  return {
    root: state.root,
    activeLists: state.activeLists,
    nextListId: state.nextListId,
    paragraphContainer: state.paragraphContainer,
    allowLazySetext: state.allowLazySetext,
    paragraphLine: paragraphLine === null ? null : { ...paragraphLine },
  };
}

function restoreHeadingState(state, snapshot) {
  state.root = snapshot.root;
  state.activeLists = snapshot.activeLists;
  state.nextListId = snapshot.nextListId;
  state.paragraphContainer = snapshot.paragraphContainer;
  state.allowLazySetext = snapshot.allowLazySetext;
  return snapshot.paragraphLine === null ? null : { ...snapshot.paragraphLine };
}

// A reference definition may continue lazily inside an already-open list or
// block quote. Normalize against a copy-on-write state so a failed candidate
// cannot mutate the real container stack before its speculative lines replay.
function resolveLinkDefinitionLine(raw, definition, state) {
  if (isBlankLinkContinuation(raw)) return null;
  const working = {
    root: state.root,
    activeLists: state.activeLists,
    nextListId: state.nextListId,
    paragraphContainer: definition.container,
    allowLazySetext: false,
  };
  const normalized = normalizeContainerLine(raw, working);
  if (normalized.container !== definition.container) return null;
  const html = normalized.isIndentedCode ? null : parseHtmlBlockOpener(normalized.content);
  // Only an unfinished destination or title is interrupted: labels may span
  // lines, while a completed destination leaves a following underline as text.
  const interruptsParagraph = !normalized.isIndentedCode &&
    (parseAtxHeading(normalized.content) !== null ||
     parseFenceOpener(normalized.content) !== null ||
     isThematicBreak(normalized.content) ||
     (definition.phase !== 'maybe-title' && !normalized.suppressSetext &&
      parseSetextUnderline(normalized.content) !== null) ||
     (html !== null && html.htmlType !== 7));
  if (interruptsParagraph) {
    return null;
  }
  return {
    content: normalized.content,
    sourceContent: normalized.sourceContent,
    state: working,
  };
}

function scanHeadings(body) {
  // CommonMark replaces NUL with U+FFFD before block parsing. This also means
  // NUL is not treated as a forbidden bare-destination control character.
  body = body.replaceAll('\u0000', '\uFFFD');
  const headings = [];
  let fence = null;
  let paragraphLine = null;
  let linkDefinition = null;
  const containerState = {
    root: newContainer('root'),
    activeLists: [],
    nextListId: 0,
    paragraphContainer: null,
    // A list-item paragraph may receive a lazy Setext underline only after a
    // non-marker continuation; an earlier paragraph interrupted by that list
    // marker must not inherit this permission.
    allowLazySetext: false,
  };
  const queue = body.split('\n').map((raw, index) => ({ raw, index, skipLinkDefinition: false }));
  let cursor = 0;
  const rollbackLinkDefinition = () => {
    paragraphLine = restoreHeadingState(containerState, linkDefinition.snapshot);
    // The speculative records already remain in queue. Rewind the cursor and
    // suppress only the original candidate so replay cannot re-enter here.
    queue[linkDefinition.startCursor].skipLinkDefinition = true;
    cursor = linkDefinition.startCursor;
    linkDefinition = null;
  };

  while (cursor < queue.length || linkDefinition !== null) {
    if (cursor >= queue.length) {
      if (linkDefinition.phase === 'maybe-title') linkDefinition = null;
      else rollbackLinkDefinition();
      continue;
    }
    const record = queue[cursor];
    const { raw, index } = record;
    if (fence !== null) {
      const line = matchFenceContainer(raw, fence.containerFrames);
      if (line !== null) {
        if (isFenceCloser(line, fence)) fence = null;
        paragraphLine = null;
        containerState.paragraphContainer = null;
        cursor++;
        continue;
      }
      // A root fence and a list-only fence may span an unindented blank line.
      // An unquoted blank ends every fence with a blockquote frame.
      if (/^[ \t]*$/.test(raw) &&
          (fence.containerFrames.length === 0 || fence.listOnly)) {
        paragraphLine = null;
        containerState.paragraphContainer = null;
        cursor++;
        continue;
      }
      // A container fence ends when its required continuation frames are
      // absent. Reprocess the raw line so an escaped heading stays visible.
      fence = null;
    }

    if (linkDefinition !== null) {
      const definitionLine = resolveLinkDefinitionLine(raw, linkDefinition, containerState);
      if (linkDefinition.phase === 'maybe-title' &&
          (definitionLine === null || !startsLinkTitle(definitionLine.sourceContent))) {
        // The destination already completed a definition. A following line
        // only belongs to it when it actually starts an optional title.
        linkDefinition = null;
        continue;
      }
      if (definitionLine !== null) {
        const next = continueLinkReference(definitionLine.sourceContent, linkDefinition);
        if (next !== null) {
          containerState.activeLists = definitionLine.state.activeLists;
          containerState.nextListId = definitionLine.state.nextListId;
          if (next.phase === 'complete') linkDefinition = null;
          else linkDefinition = { ...linkDefinition, ...next };
          cursor++;
          continue;
        }
        if (linkDefinition.phase === 'maybe-title') {
          // The destination already committed a definition. A title-looking
          // line that fails its own grammar is ordinary following content;
          // replay only this line instead of rolling back the definition.
          linkDefinition = null;
          continue;
        }
      }
      rollbackLinkDefinition();
      continue;
    }

    const beforeLine = cloneHeadingState(containerState, paragraphLine);
    const normalized = normalizeContainerLine(raw, containerState);
    const line = normalized.content;

    if (paragraphLine !== null && paragraphLine.container !== normalized.container) {
      // A paragraph belongs to exactly one container. Keeping it alive after
      // normalization changes containers creates false lazy continuations.
      paragraphLine = null;
      containerState.paragraphContainer = null;
      containerState.allowLazySetext = false;
    }
    const opener = normalized.isIndentedCode ? null : parseFenceOpener(line);
    if (opener !== null) {
      fence = {
        ...opener,
        line: index + 1,
        container: normalized.container,
        containerFrames: normalized.containerFrames,
        listOnly: normalized.containerFrames.length > 0 &&
          normalized.containerFrames.every((frame) => frame.kind === 'list'),
      };
      paragraphLine = null;
      containerState.paragraphContainer = null;
      cursor++;
      continue;
    }
    // A blank line after a container marker is still a blank line after
    // normalization. It terminates the paragraph in that container; keeping
    // the raw "> " line alive would incorrectly attach a later underline.
    if (/^[ \t]*$/.test(line)) {
      paragraphLine = null;
      containerState.paragraphContainer = null;
      containerState.allowLazySetext = false;
      cursor++;
      continue;
    }
    const paragraphIsActiveHere = paragraphLine !== null &&
      paragraphLine.container === normalized.container;
    if (!paragraphIsActiveHere && !normalized.isIndentedCode) {
      const definition = record.skipLinkDefinition
        ? null
        : scanLinkReferenceStart(line, normalized.sourceContent);
      if (definition !== null) {
        if (definition.phase === 'complete') {
          paragraphLine = null;
          containerState.paragraphContainer = null;
          containerState.allowLazySetext = false;
          cursor++;
          continue;
        }
        linkDefinition = {
          ...definition,
          raw: normalized.raw,
          container: normalized.container,
          containerFrames: normalized.containerFrames,
          line: index + 1,
          startCursor: cursor,
          snapshot: beforeLine,
        };
        paragraphLine = null;
        containerState.paragraphContainer = null;
        containerState.allowLazySetext = false;
        cursor++;
        continue;
      }
    }
    const html = normalized.isIndentedCode ? null : parseHtmlBlockOpener(line);
    const inlineHtmlContinuation = html?.htmlType === 7 &&
      paragraphLine !== null && paragraphLine.container === normalized.container;
    if (html !== null && !inlineHtmlContinuation) {
      headings.push({
        ...html,
        type: 'HTML',
        line: index + 1,
        raw: normalized.raw,
        container: containerLabel(normalized.container),
      });
      paragraphLine = null;
      containerState.paragraphContainer = null;
      containerState.allowLazySetext = false;
      cursor++;
      continue;
    }
    const heading = parseAtxHeading(line);
    if (heading !== null) {
      headings.push({ ...heading, raw: normalized.raw, container: containerLabel(normalized.container), type: 'ATX', line: index + 1 });
      paragraphLine = null;
      containerState.paragraphContainer = null;
      containerState.allowLazySetext = false;
      cursor++;
      continue;
    }
    const underline = parseSetextUnderline(line);
    if (underline !== null && !normalized.suppressSetext && paragraphLine !== null &&
        paragraphLine.container === normalized.container) {
      headings.push({
        ...underline,
        type: 'Setext',
        line: index + 1,
        raw: normalized.raw,
        container: containerLabel(normalized.container),
        paragraph: paragraphLine.raw,
      });
      paragraphLine = null;
      containerState.paragraphContainer = null;
      containerState.allowLazySetext = false;
      cursor++;
      continue;
    }
    const previousParagraphContainer = paragraphLine?.container ?? null;
    const previousAllowLazySetext = containerState.allowLazySetext;
    if (normalized.suppressSetext) {
      // This is paragraph text lazily continuing a list, not a Setext block;
      // retain both the paragraph and list frame for the following line.
    } else if (isSetextParagraphLine(line, normalized.isIndentedCode)) {
      paragraphLine = { raw: normalized.raw, container: normalized.container, line: index + 1 };
      if (previousParagraphContainer === null) {
        containerState.allowLazySetext = false;
      } else if (previousParagraphContainer === normalized.container) {
        containerState.allowLazySetext = previousAllowLazySetext ||
          (normalized.container.containsList && !normalized.consumedContainer);
      } else {
        containerState.allowLazySetext = false;
      }
    } else if (paragraphLine !== null &&
               paragraphLine.container === normalized.container &&
               canContinueParagraph(normalized.expanded)) {
      // Indented code and other non-interrupting lines do not end the active
      // paragraph. This also covers lazy continuation in list and quote
      // containers, whose marker is absent from the raw line.
    } else {
      paragraphLine = null;
      containerState.allowLazySetext = false;
    }
    containerState.paragraphContainer = paragraphLine === null ? null : normalized.container;
    cursor++;
  }
  return { headings, unclosedFence: fence };
}

export function findHeadings(body) {
  return scanHeadings(body).headings;
}

function validateUnitHeadings(unit, meta, parts) {
  for (const lang of LANGS) {
    const body = parts.map((part) => part[lang]).join('');
    const { headings, unclosedFence } = scanHeadings(body);
    if (unclosedFence !== null) {
      failUnit(unit,
        `${lang}: unit body ends with an unclosed fenced code block opened at line ` +
        `${unclosedFence.line}`);
    }
    if (meta.kind === 'frontmatter') {
      if (headings.length !== 1 || headings[0].container !== 'root' ||
          headings[0].type !== 'ATX' || headings[0].level !== 1) {
        failUnit(unit,
          `${lang}: frontmatter must contain exactly one ATX level-1 heading ` +
          `and no other ATX/Setext heading (found ${headings.length})`);
      }
      continue;
    }
    if (headings.length) {
      const heading = headings[0];
      if (heading.type === 'HTML') {
        failUnit(unit,
          `${lang}: unit body contains a raw HTML block opener (CommonMark type ${heading.htmlType}) ` +
          `outside a fenced code block at line ${heading.line}: ${JSON.stringify(heading.raw)}`);
      }
      if (heading.type === 'Setext') {
        failUnit(unit,
          `${lang}: unit body contains a Setext heading outside a fenced code block ` +
          `at line ${heading.line}: ${JSON.stringify(heading.raw)}`);
      }
      failUnit(unit,
        `${lang}: unit body contains an ATX heading outside a fenced code block ` +
        `at line ${heading.line}: ${JSON.stringify(heading.raw)}`);
    }
  }
}

// THE FORMAT. A body source is Markdown carrying one block per language,
// each introduced by its own separator line:
//
//   >>>>> lang=en
//   ...
//   >>>>> lang=ru
//   ...
//
// A block runs from the line after its separator to the line before the
// next separator, or to end of file for the last one. The block therefore
// keeps its own trailing newline, and a body ending in a blank line keeps
// that blank line — which is what makes the generated output byte-stable.
//
// The format does NOT name the languages. Any set will do; what it
// demands is that a language appear at most once per file, and the layer
// above demands that every file carry the SAME set. Order is free: the
// result is a map, so where a block sits says nothing.
//
// Because the source is Markdown, nothing needs escaping — the
// specification's code fences are written as themselves. The cost is that
// a line beginning ">>>>> lang=" can no longer appear inside a block, which
// is why a duplicate or a stray one is rejected here rather than silently
// taken as a boundary.
//
// Nothing in the file is executed. It is text, and now it does not even
// resemble code.
function parseLanguageBlocks(src, reject, label) {
  const marks = [];
  const scan = new RegExp(LANG_SEPARATOR_RE.source, 'gm');
  for (let m = scan.exec(src); m !== null; m = scan.exec(src)) {
    marks.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }

  if (marks.length === 0) {
    reject(`${label}: no "${langSeparator('')}" separator line found`);
  }
  if (marks[0].start !== 0) {
    reject(`${label}: must begin with a "${langSeparator('')}" separator; found ` +
      `${JSON.stringify(src.slice(0, Math.min(40, marks[0].start)))} before the first one`);
  }

  const blocks = new Map();
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    const lang = mark.text.slice(langSeparator('').length);
    if (lang.length === 0) {
      reject(`${label}: separator ${JSON.stringify(mark.text)} names no language`);
    }
    if (blocks.has(lang)) {
      reject(`${label}: duplicate separator ${JSON.stringify(mark.text)}`);
    }
    if (src[mark.end] !== '\n') {
      reject(`${label}: separator ${JSON.stringify(mark.text)} must be alone on its line`);
    }
    const from = mark.end + 1;
    const to = i + 1 < marks.length ? marks[i + 1].start : src.length;
    blocks.set(lang, src.slice(from, to));
  }

  const lastLang = marks[marks.length - 1].text.slice(langSeparator('').length);
  const trailing = blocks.get(lastLang);
  if (trailing.length > 0 && !trailing.endsWith('\n')) {
    reject(`${label}: the last block must end with a newline`);
  }
  return blocks;
}

// THIS REPOSITORY'S REQUIREMENT ON TOP OF THE FORMAT: the set is exactly
// LANGS, in every file. Comparing each file against one declared set is
// what makes "the same languages everywhere" true — not a first-file-wins
// rule that would quietly adopt a typo.
function validateBodySourceShape(unit, k, src, label = bodyFileName(k)) {
  const reject = (message) => failUnit(unit, message);
  const blocks = parseLanguageBlocks(src, reject, label);

  const unexpected = [...blocks.keys()].filter((lang) => !LANGS.includes(lang));
  if (unexpected.length > 0) {
    reject(`${label}: unexpected language block(s) ${unexpected.join(', ')} ` +
      `(this specification is written in ${LANGS.join(', ')})`);
  }
  const missing = LANGS.filter((lang) => !blocks.has(lang));
  if (missing.length > 0) {
    reject(`${label}: missing language block(s) ${missing.join(', ')} ` +
      `(every source must carry the same set: ${LANGS.join(', ')})`);
  }

  const out = {};
  for (const lang of LANGS) out[lang] = blocks.get(lang);
  return out;
}


export { cloneHeadingState, containerLabel, matchFenceContainer, newContainer, normalizeContainerLine, quoteChild, quoteChildren, resolveLinkDefinitionLine, restoreHeadingState, scanHeadings, sourceSliceAtExpandedPosition, validateBodySourceShape, validateUnitHeadings };
