#!/usr/bin/env node
// build_spec.mjs — assembles versions/0.7/spec{,.ru,.zh}.md from per-section
// content units in versions/0.7/content/ (manifest.js + unit dirs). Unit bodies
// come from body-1.js..body-N.js parts (N = meta.bodyParts), each holding
// { en, ru, zh } strings. No content file is ever executed: body-*.js is
// decoded by a raw-source scanner without running its code, and manifest.js /
// meta.js are decoded as strict UTF-8 and parsed as JSON, and must be
// byte-identical to the canonical serialization (`export default ` +
// JSON.stringify(value, null, 2) + one newline).
// Node ESM, built-ins only. Usage:
//   node scripts/build_spec.mjs            write the three spec files and READMEs
//   node scripts/build_spec.mjs --check    verify outputs byte-identical, no writes
//   node scripts/build_spec.mjs -h|--help  usage
//
// Importable API (no build on import):
//   validateContentDir(contentDir)  -> async closed-world validation; throws Error
//   buildBuffers(contentDir)        -> async { bufs, totalLen, manifest, readmeBufs }
//   validateMeta(unit, meta), LANGS, OUT_FILES, hasLoneSurrogate(str),
//   firstByteDiff(existing, expected), lineNumberAtByte(buf, offset),
//   lineAtByte(buf, offset), formatMismatchDiagnostic(...),
//   writeBuildOutputs(..., { renameSync, unlinkSync }), defaultSectionInventoryLockPath(contentDir)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LANGS = ['en', 'ru', 'zh'];
export const OUT_FILES = { en: 'spec.md', ru: 'spec.ru.md', zh: 'spec.zh.md' };
export const README_FILES = { en: 'README.md', ru: 'README.ru.md', zh: 'README.zh.md' };
export const README_SOURCE_FILE = 'README.source.js';
export const SECTION_INVENTORY_LOCK_FILE = 'section-inventory.0.7.lock.json';

const NUMBERED_HEADING_PREFIX_RE = /^\d+(?:\.\d+)*/u;
const UNICODE_WORD_CODE_POINT_RE = /^[\p{L}\p{N}_]/u;

const BODY_LINE_LIMIT = 120;
const BODY_TARGET_LINES = 100;

export function defaultSectionInventoryLockPath(contentDir) {
  return path.resolve(
    contentDir, '..', '..', '..', 'scripts', 'locks', SECTION_INVENTORY_LOCK_FILE);
}

const utf8Strict = new TextDecoder('utf-8', { fatal: true });

function fail(msg) {
  throw new Error(msg);
}

function failUnit(unit, problem) {
  fail(`unit "${unit}": ${problem}`);
}

function rejectRawCarriageReturns(buf, label) {
  const offset = buf.indexOf(0x0d);
  if (offset !== -1) {
    fail(`${label} contains a raw carriage return (CR, 0x0D) at byte offset ${offset}; object sources must use LF-only line endings`);
  }
}

// Strict UTF-8: reject malformed byte sequences instead of silently
// substituting U+FFFD replacement characters (lenient decoding would let a
// corrupted multi-byte sequence pass as different, valid-looking text).
// A leading BOM must be rejected HERE, at the raw-byte level, BEFORE
// decoding: TextDecoder's default ignoreBOM: false treats a leading BOM as
// an encoding signature and silently strips it from the returned string,
// and the BOM bytes are valid UTF-8, so fatal: true does not reject them
// either. Without this check a BOM-prefixed file would decode to exactly
// the same string as its canonical BOM-less form and slip past both the
// prefix check and the canonical byte-identity comparison.
function decodeUtf8Strict(buf, label) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    fail(`${label} starts with a UTF-8 byte-order mark (EF BB BF); a BOM is not permitted -- content files must be byte-identical to their canonical form, which has no encoding signature`);
  }
  try {
    return utf8Strict.decode(buf);
  } catch (e) {
    fail(`${label} is not valid UTF-8: ${e.message}`);
  }
}

// True if `str` contains an unpaired UTF-16 surrogate. Such a string cannot
// be encoded as UTF-8, so writing it into the generated spec files would
// silently substitute U+FFFD. Iterating the string resolves valid surrogate
// pairs into single code points; a lone surrogate shows up as its own
// one-code-unit "character" in the 0xD800..0xDFFF range.
export function hasLoneSurrogate(str) {
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xD800 && cp <= 0xDFFF) return true;
  }
  return false;
}

export function validateMeta(unit, meta) {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    failUnit(unit, 'meta.js default export is not an object');
  }
  if (meta.kind !== 'frontmatter' && meta.kind !== 'numbered' && meta.kind !== 'named') {
    failUnit(unit, `bad kind ${JSON.stringify(meta.kind)}`);
  }
  if (!Number.isInteger(meta.bodyParts) || meta.bodyParts < 1) {
    failUnit(unit, `bad bodyParts ${JSON.stringify(meta.bodyParts)}`);
  }
  const allowedKeys = meta.kind === 'numbered'
    ? ['kind', 'number', 'sep', 'level', 'title', 'bodyParts']
    : ['kind', 'number', 'level', 'title', 'bodyParts'];
  const keySet = Object.keys(meta).sort();
  const wantSet = [...allowedKeys].sort();
  if (keySet.length !== wantSet.length || keySet.some((k, i) => k !== wantSet[i])) {
    const extra = keySet.filter((k) => !wantSet.includes(k));
    const missing = wantSet.filter((k) => !keySet.includes(k));
    const bits = [];
    if (extra.length) bits.push(`unexpected key(s) ${extra.map((k) => JSON.stringify(k)).join(', ')}`);
    if (missing.length) bits.push(`missing key(s) ${missing.map((k) => JSON.stringify(k)).join(', ')}`);
    failUnit(unit, `meta.js keys must be exactly {${wantSet.map((k) => JSON.stringify(k)).join(', ')}}; got ${bits.join('; ')}`);
  }
  const actualKeys = Object.keys(meta);
  if (actualKeys.some((key, i) => key !== allowedKeys[i])) {
    failUnit(unit,
      `meta.js keys must be in documented order ` +
      `[${allowedKeys.map((key) => JSON.stringify(key)).join(', ')}]; got ` +
      `[${actualKeys.map((key) => JSON.stringify(key)).join(', ')}]`);
  }
  if (meta.kind === 'frontmatter') {
    if (meta.number !== null || meta.level !== null || meta.title !== null) {
      failUnit(unit, 'frontmatter must have number/level/title all null');
    }
    return;
  }
  const lvl = meta.level;
  if (!Number.isInteger(lvl) || lvl < 1 || lvl > 6) {
    failUnit(unit, `bad level ${JSON.stringify(lvl)}`);
  }
  if (meta.kind === 'numbered') {
    if (typeof meta.number !== 'string' || !/^\d+(\.\d+)*$/.test(meta.number)) {
      failUnit(unit, `bad number ${JSON.stringify(meta.number)}`);
    }
    if (unit !== 'sec-' + meta.number) {
      failUnit(unit, `unit name does not match sec-${meta.number}`);
    }
    if (meta.sep !== '. ' && meta.sep !== ' ') {
      failUnit(unit, `bad sep ${JSON.stringify(meta.sep)} (must be ". " or " ")`);
    }
  } else { // named
    if (meta.number !== null) failUnit(unit, 'named unit must have number === null');
    if (lvl < 2) failUnit(unit, `named unit level must be 2..6, got ${lvl}`);
    if (!unit.startsWith('named-')) failUnit(unit, 'named unit dir must start with "named-"');
  }
  const t = meta.title;
  if (typeof t !== 'object' || t === null) failUnit(unit, 'missing title object');
  const tKeySet = Object.keys(t).sort();
  const tWantSet = [...LANGS].sort();
  if (tKeySet.length !== tWantSet.length || tKeySet.some((k, i) => k !== tWantSet[i])) {
    const extra = tKeySet.filter((k) => !tWantSet.includes(k));
    const missing = tWantSet.filter((k) => !tKeySet.includes(k));
    const bits = [];
    if (extra.length) bits.push(`unexpected key(s) ${extra.map((k) => JSON.stringify(k)).join(', ')}`);
    if (missing.length) bits.push(`missing key(s) ${missing.map((k) => JSON.stringify(k)).join(', ')}`);
    failUnit(unit, `title keys must be exactly {en, ru, zh}; got ${bits.join('; ')}`);
  }
  const titleKeys = Object.keys(t);
  if (titleKeys.some((key, i) => key !== LANGS[i])) {
    failUnit(unit,
      `title keys must be in documented order ["en", "ru", "zh"]; got ` +
      `[${titleKeys.map((key) => JSON.stringify(key)).join(', ')}]`);
  }
  for (const lang of LANGS) {
    if (typeof t[lang] !== 'string' || t[lang].length === 0) {
      failUnit(unit, `missing/empty title.${lang}`);
    }
    if (t[lang].includes('\n') || t[lang].includes('\r')) {
      failUnit(unit, `title.${lang} must be single-line (CR/LF not allowed)`);
    }
    if (hasLoneSurrogate(t[lang])) {
      failUnit(unit, `title.${lang} contains an unpaired UTF-16 surrogate, which cannot be represented in UTF-8 output`);
    }
  }
}

function validateBodyPart(unit, k, d, label = `body-${k}.js`) {
  if (typeof d !== 'object' || d === null || Array.isArray(d)) {
    failUnit(unit, `${label} default export is not an object`);
  }
  const keys = Object.keys(d);
  const extra = keys.filter((k2) => !LANGS.includes(k2));
  const missing = LANGS.filter((l) => !keys.includes(l));
  if (extra.length || missing.length || keys.length !== LANGS.length) {
    const bits = [];
    if (extra.length) bits.push(`unexpected key(s) ${extra.map((k2) => JSON.stringify(k2)).join(', ')}`);
    if (missing.length) bits.push(`missing key(s) ${missing.map((k2) => JSON.stringify(k2)).join(', ')}`);
    failUnit(unit, `${label} must have exactly the keys {en, ru, zh}` +
      (bits.length ? `; got ${bits.join('; ')}` : ''));
  }
  for (const l of LANGS) {
    if (typeof d[l] !== 'string') failUnit(unit, `${label} field ${l} is not a string`);
    if (hasLoneSurrogate(d[l])) {
      failUnit(unit, `${label} field ${l} contains an unpaired UTF-16 surrogate, which cannot be represented in UTF-8 output`);
    }
  }
}

function generatedHeadingLine(meta, lang) {
  return '#'.repeat(meta.level) + ' ' +
    (meta.kind === 'numbered' ? meta.number + meta.sep : '') + meta.title[lang];
}

function hasNumberedHeadingPrefix(text) {
  const match = text.match(NUMBERED_HEADING_PREFIX_RE);
  if (match === null) return false;
  const next = text.slice(match[0].length);
  return next.length === 0 || !UNICODE_WORD_CODE_POINT_RE.test(next);
}

function validateGeneratedHeading(unit, meta, lang) {
  if (meta.kind === 'frontmatter') return;
  const heading = generatedHeadingLine(meta, lang);
  const text = heading.slice(meta.level + 1);
  if (meta.kind === 'numbered') {
    const expectedPrefix = meta.number + meta.sep;
    if (!text.startsWith(expectedPrefix)) {
      failUnit(unit,
        `${lang}: generated heading must render locked number ${JSON.stringify(meta.number)} ` +
        `with separator ${JSON.stringify(meta.sep)}`);
    }
  } else if (hasNumberedHeadingPrefix(text)) {
    failUnit(unit,
      `${lang}: named title must not match numbered-heading syntax: ${JSON.stringify(meta.title[lang])}`);
  }
}

// These are the CommonMark line-level rules needed to keep generated section
// headings out of unit bodies. The builder does not need a full Markdown
// parser: fenced blocks suppress heading detection, and container prefixes
// are normalized before applying the line-level rules.
function parseFenceOpener(line) {
  let indent = 0;
  while (indent < line.length && line[indent] === ' ') indent++;
  if (indent > 3 || indent === line.length ||
      (line[indent] !== '`' && line[indent] !== '~')) return null;
  const marker = line[indent];
  let end = indent;
  while (end < line.length && line[end] === marker) end++;
  const length = end - indent;
  if (length < 3) return null;
  // CommonMark forbids backticks in a backtick fence's info string.
  if (marker === '`' && line.slice(end).includes('`')) return null;
  return { marker, length };
}

function isFenceCloser(line, fence) {
  let indent = 0;
  while (indent < line.length && line[indent] === ' ') indent++;
  if (indent > 3 || indent === line.length || line[indent] !== fence.marker) {
    return false;
  }
  let end = indent;
  while (end < line.length && line[end] === fence.marker) end++;
  if (end - indent < fence.length) return false;
  return [...line.slice(end)].every((ch) => ch === ' ' || ch === '\t');
}

function parseAtxHeading(line) {
  let indent = 0;
  while (indent < line.length && line[indent] === ' ') indent++;
  if (indent > 3) return null;
  let end = indent;
  while (end < line.length && line[end] === '#') end++;
  const level = end - indent;
  if (level < 1 || level > 6) return null;
  if (end < line.length && line[end] !== ' ' && line[end] !== '\t') return null;
  return { level, raw: line };
}

function parseSetextUnderline(line) {
  const match = line.match(/^ {0,3}(=+|-+)[ \t]*$/);
  return match === null ? null : { level: match[1][0] === '=' ? 1 : 2, raw: line };
}

function isThematicBreak(line) {
  return /^(?: {0,3})(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line);
}

function isSetextParagraphLine(line, isIndentedCode = false) {
  return !isIndentedCode &&
    /[^ \t]/.test(line) &&
    parseAtxHeading(line) === null &&
    parseFenceOpener(line) === null &&
    !isThematicBreak(line);
}

function advanceColumn(column, ch) {
  if (ch === '\t') return column + (4 - (column % 4));
  return column + 1;
}

function leadingColumns(line, start = 0) {
  let column = 0;
  let pos = start;
  while (pos < line.length && (line[pos] === ' ' || line[pos] === '\t')) {
    column = advanceColumn(column, line[pos]);
    pos++;
  }
  return { column, pos };
}

function consumeIndent(line, start, columns) {
  let column = 0;
  let pos = start;
  while (pos < line.length && column < columns &&
         (line[pos] === ' ' || line[pos] === '\t')) {
    column = advanceColumn(column, line[pos]);
    pos++;
  }
  return column >= columns ? pos : null;
}

function consumeBlockquoteMarker(line, start) {
  const leading = leadingColumns(line, start);
  if (leading.column > 3 || line[leading.pos] !== '>') return null;
  let pos = leading.pos + 1;
  if (line[pos] === ' ' || line[pos] === '\t') pos++;
  return pos;
}

function hasContainerPrefix(container, ancestor) {
  return container === ancestor || container.startsWith(`${ancestor}/`);
}

function parseListMarker(line, start) {
  const leading = leadingColumns(line, start);
  if (leading.column > 3) return null;
  const markerStart = leading.pos;
  const match = line.slice(markerStart).match(/^(?:[*+-]|\d{1,9}[.)])(?=$|[ \t])/);
  if (match === null) return null;
  const text = match[0];
  return {
    markerStart,
    markerEnd: markerStart + text.length,
    marker: text,
    ordered: /^\d/.test(text),
    number: /^\d/.test(text) ? text.slice(0, -1) : null,
  };
}

function consumeListPadding(line, list) {
  let pos = list.markerEnd;
  if (pos === line.length || (line[pos] !== ' ' && line[pos] !== '\t')) {
    return { pos, indent: list.markerEnd - list.markerStart + 1, indentedCode: false };
  }

  let whitespaceColumns = 0;
  let scanColumn = list.markerEnd - list.markerStart;
  let scan = pos;
  while (scan < line.length && (line[scan] === ' ' || line[scan] === '\t')) {
    const nextColumn = advanceColumn(scanColumn, line[scan]);
    whitespaceColumns = nextColumn - (list.markerEnd - list.markerStart);
    scanColumn = nextColumn;
    scan++;
  }

  if (whitespaceColumns > 4) {
    // Five or more columns of padding consume exactly one whitespace
    // character, leaving the remainder as indented code.
    const firstColumn = advanceColumn(list.markerEnd - list.markerStart, line[pos]);
    return {
      pos: pos + 1,
      indent: firstColumn,
      indentedCode: true,
    };
  }
  return {
    pos: scan,
    indent: scanColumn,
    indentedCode: false,
  };
}

// Normalize a line by repeatedly consuming blockquote and list containers.
// List frames retain the relative content indent needed to recognize a later
// continuation, while their unique item paths keep sibling paragraphs apart.
function normalizeContainerLine(line, state) {
  let pos = 0;
  let container = 'root';
  let indentedCode = false;
  let consumedContainer = false;
  let frames = state.activeLists;
  const containerFrames = [];

  while (true) {
    const continuationIndent = leadingColumns(line, pos);
    const frame = frames
      .filter((candidate) => candidate.parent === container &&
        continuationIndent.column >= candidate.indent)
      .at(-1);
    if (frame !== undefined) {
      const end = consumeIndent(line, pos, frame.indent);
      if (end !== null) {
        pos = end;
        container = frame.container;
        consumedContainer = true;
        containerFrames.push({ kind: 'list', indent: frame.indent });
        frames = frames.slice(0, frames.indexOf(frame) + 1);
        continue;
      }
    }

    const quoteEnd = consumeBlockquoteMarker(line, pos);
    if (quoteEnd !== null) {
      pos = quoteEnd;
      container += '/quote';
      consumedContainer = true;
      containerFrames.push({ kind: 'quote' });
      continue;
    }

    const list = parseListMarker(line, pos);
    if (list === null) break;
    // A paragraph in this container makes a single dash a Setext H2
    // underline, even though it also parses as an empty list marker.
    if (list.marker === '-' && state.paragraphContainer === container) break;
    if (list.ordered && list.number !== '1' && state.paragraphContainer === container) break;

    const markerIndent = leadingColumns(line, pos).column;
    const padding = consumeListPadding(line, list);
    const item = `${container}/list-${state.nextListId++}`;
    frames = frames.filter((candidate) => hasContainerPrefix(container, candidate.container));
    frames.push({
      parent: container,
      container: item,
      indent: markerIndent + padding.indent,
    });
    containerFrames.push({
      kind: 'list',
      indent: markerIndent + padding.indent,
    });
    container = item;
    pos = padding.pos;
    indentedCode ||= padding.indentedCode;
    consumedContainer = true;
  }

  if (/^[ \t]*$/.test(line) && frames.length > 0) {
    container = frames.at(-1).container;
    consumedContainer = true;
  } else if (!consumedContainer) {
    frames = [];
  }
  frames = frames.filter((candidate) => hasContainerPrefix(container, candidate.container));
  state.activeLists = frames;

  const content = line.slice(pos);
  const contentIndent = leadingColumns(content).column;
  return {
    content,
    container,
    // A tab or four visual columns at the normalized block level is code,
    // not a paragraph which can become a Setext heading.
    isIndentedCode: indentedCode || contentIndent >= 4,
    containerFrames,
    raw: line,
  };
}

function matchFenceContainer(line, frames) {
  let pos = 0;
  for (const frame of frames) {
    if (frame.kind === 'quote') {
      const end = consumeBlockquoteMarker(line, pos);
      if (end === null) return null;
      pos = end;
    } else {
      const end = consumeIndent(line, pos, frame.indent);
      if (end === null) return null;
      pos = end;
    }
  }
  return line.slice(pos);
}

function findHeadings(body) {
  const headings = [];
  let fence = null;
  let paragraphLine = null;
  const containerState = { activeLists: [], nextListId: 0, paragraphContainer: null };
  const lines = body.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    if (fence !== null) {
      const line = matchFenceContainer(raw, fence.containerFrames);
      if (line !== null) {
        if (isFenceCloser(line, fence)) fence = null;
        paragraphLine = null;
        containerState.paragraphContainer = null;
        continue;
      }
      // A list-contained fence may span completely unindented ASCII blank
      // lines. Keep the active fence and its container frames intact.
      if (/^[ \t]*$/.test(raw)) {
        paragraphLine = null;
        containerState.paragraphContainer = null;
        continue;
      }
      // A container fence ends when its required continuation frames are
      // absent. Reprocess the raw line so an escaped heading stays visible.
      fence = null;
    }

    const normalized = normalizeContainerLine(raw, containerState);
    const line = normalized.content;
    const opener = normalized.isIndentedCode ? null : parseFenceOpener(line);
    if (opener !== null) {
      fence = {
        ...opener,
        container: normalized.container,
        containerFrames: normalized.containerFrames,
      };
      paragraphLine = null;
      containerState.paragraphContainer = null;
      continue;
    }
    const heading = parseAtxHeading(line);
    if (heading !== null) {
      headings.push({ ...heading, raw: normalized.raw, container: normalized.container, type: 'ATX', line: index + 1 });
      paragraphLine = null;
      containerState.paragraphContainer = null;
      continue;
    }
    const underline = parseSetextUnderline(line);
    if (underline !== null && paragraphLine !== null &&
        paragraphLine.container === normalized.container) {
      headings.push({
        ...underline,
        type: 'Setext',
        line: index + 1,
        raw: normalized.raw,
        container: normalized.container,
        paragraph: paragraphLine.raw,
      });
      paragraphLine = null;
      containerState.paragraphContainer = null;
      continue;
    }
    paragraphLine = isSetextParagraphLine(line, normalized.isIndentedCode)
      ? { raw: normalized.raw, container: normalized.container, line: index + 1 }
      : null;
    containerState.paragraphContainer = paragraphLine === null ? null : normalized.container;
  }
  return headings;
}

function validateUnitHeadings(unit, meta, parts) {
  for (const lang of LANGS) {
    const body = parts.map((part) => part[lang]).join('');
    const headings = findHeadings(body);
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

// Proves `src` (the raw UTF-8 text of a body-N.js file, read via
// fs.readFileSync) is EXACTLY:
//   export default {\n  en: `...`,\n  ru: `...`,\n  zh: `...`,\n};\n
// with each `...` a template-literal body where every backslash, backtick,
// and "${" has been escaped per content/README.md's rule (\\, \`, \${, in
// that priority order at write time). Returns the DECODED { en, ru, zh }
// strings; they are used directly as the body part's content. This function
// never executes the file's code.
function validateBodySourceShape(unit, k, src, label = `body-${k}.js`) {
  const HEADER = 'export default {\n  en: `';
  if (!src.startsWith(HEADER)) {
    failUnit(unit, `${label}: must start with exactly ${JSON.stringify(HEADER)}`);
  }
  let i = HEADER.length;

  // Scans forward from `i` (just after an opening backtick) for the next
  // UNESCAPED backtick, decoding escapes as it goes and rejecting any
  // unescaped "${" (real template interpolation) along the way. The
  // documented write-side grammar (content/README.md) has exactly three
  // escape forms: \\ and \` are two-character units decoding to one
  // character each; \${ is a three-character unit decoding to the two
  // literal characters "${". Any other backslash sequence -- including a
  // bare "\$" not followed by "{" -- is rejected as an unrecognised escape.
  function scanTemplateBody(fieldName) {
    let decoded = '';
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') {
        const next = src[i + 1];
        if (next === '\\') { decoded += '\\'; i += 2; continue; }
        if (next === '`') { decoded += '`'; i += 2; continue; }
        // "\${" is one three-character escape unit decoding to the two
        // literal characters "${"; a bare "\$" whose next character is not
        // "{" is NOT part of the documented grammar and is rejected below.
        if (next === '$' && src[i + 2] === '{') { decoded += '${'; i += 3; continue; }
        failUnit(unit, `${label}: unrecognised escape "\\${next}" in ${fieldName} at offset ${i} (only \\\\, \\\`, and \\\${ are valid)`);
      }
      if (c === '`') {
        return { end: i, decoded };
      }
      if (c === '$' && src[i + 1] === '{') {
        failUnit(unit, `${label}: unescaped "\${" (template interpolation) in ${fieldName} at offset ${i} -- interpolation is never allowed, escape it as "\\\${"`);
      }
      decoded += c;
      i += 1;
    }
    failUnit(unit, `${label}: unterminated template literal in ${fieldName} (no closing backtick found)`);
  }

  const en = scanTemplateBody('en');
  i = en.end + 1;

  const SEP1 = ',\n  ru: `';
  if (src.slice(i, i + SEP1.length) !== SEP1) {
    failUnit(unit, `${label}: expected exactly ${JSON.stringify(SEP1)} after the en field, at offset ${i}`);
  }
  i += SEP1.length;

  const ru = scanTemplateBody('ru');
  i = ru.end + 1;

  const SEP2 = ',\n  zh: `';
  if (src.slice(i, i + SEP2.length) !== SEP2) {
    failUnit(unit, `${label}: expected exactly ${JSON.stringify(SEP2)} after the ru field, at offset ${i}`);
  }
  i += SEP2.length;

  const zh = scanTemplateBody('zh');
  i = zh.end + 1;

  const TAIL = ',\n};\n';
  if (src.slice(i) !== TAIL) {
    failUnit(unit, `${label}: expected exactly ${JSON.stringify(TAIL)} after the zh field followed immediately by end-of-file, found ${JSON.stringify(src.slice(i, i + 20))}`);
  }

  return { en: en.decoded, ru: ru.decoded, zh: zh.decoded };
}

const TOP_LEVEL_ALLOWED_FILES = new Set([
  'README.md', 'README.ru.md', 'README.zh.md', README_SOURCE_FILE,
  'manifest.js', 'package.json',
]);

function readJsonDefault(filePath) {
  let buf;
  try {
    buf = fs.readFileSync(filePath);
  } catch (e) {
    fail(`cannot read ${filePath}: ${e.message}`);
  }
  const raw = decodeUtf8Strict(buf, filePath);
  const PREFIX = 'export default ';
  if (!raw.startsWith(PREFIX)) {
    fail(`${filePath} must start with exactly ${JSON.stringify(PREFIX)} followed by a JSON literal (content files are data, never executable code)`);
  }
  let value;
  try {
    value = JSON.parse(raw.slice(PREFIX.length, -1));
  } catch (e) {
    fail(`${filePath} is not "export default " + JSON + "\\n": JSON.parse failed: ${e.message}`);
  }
  // Canonical byte representation. JSON.parse collapses duplicate keys
  // (last one wins; the first vanishes without a trace) and accepts many
  // spellings of the same value: CRLF line endings, trailing whitespace or
  // semicolons, any indentation. Requiring the file to be byte-identical to
  // the canonical re-serialization closes all of those at once -- a
  // duplicate key makes the raw file differ from it, and so does every
  // non-canonical byte (JSON.stringify always emits LF-only, 2-space
  // indented, no-trailing-whitespace, no-semicolon output ending in exactly
  // one newline).
  const canonical = PREFIX + JSON.stringify(value, null, 2) + '\n';
  if (raw !== canonical) {
    const rawBytes = Buffer.from(raw, 'utf8');
    const canonBytes = Buffer.from(canonical, 'utf8');
    const min = Math.min(rawBytes.length, canonBytes.length);
    let off = 0;
    while (off < min && rawBytes[off] === canonBytes[off]) off++;
    fail(`${filePath} must be byte-identical to the canonical serialization "export default " + JSON.stringify(value, null, 2) + "\\n" (rejects duplicate JSON keys, CRLF line endings, trailing whitespace, trailing semicolons, and any other formatting drift); first difference at byte offset ${off}`);
  }
  return value;
}

function readCanonicalJson(filePath) {
  let buf;
  try {
    buf = fs.readFileSync(filePath);
  } catch (e) {
    fail(`cannot read ${filePath}: ${e.message}`);
  }
  const raw = decodeUtf8Strict(buf, filePath);
  let value;
  try {
    value = JSON.parse(raw);
  } catch (e) {
    fail(`${filePath} is not valid JSON: JSON.parse failed: ${e.message}`);
  }
  const canonical = JSON.stringify(value, null, 2) + '\n';
  if (raw !== canonical) {
    fail(`${filePath} must be canonical JSON (2-space indentation, LF line endings, exactly one trailing newline, no trailing whitespace)`);
  }
  return value;
}

const LOCK_ROOT_KEYS = ['format', 'units', 'version'];
const LOCK_UNIT_KEYS = ['unit', 'kind', 'number', 'level', 'sep'];

function structuralMeta(unit, meta) {
  return {
    unit,
    kind: meta.kind,
    number: meta.number,
    level: meta.level,
    sep: meta.kind === 'numbered' ? meta.sep : null,
  };
}

function validateSectionInventoryLock(manifest, lockPath, units = null) {
  const lock = readCanonicalJson(lockPath);
  if (typeof lock !== 'object' || lock === null || Array.isArray(lock)) {
    fail(`${lockPath} must export an object`);
  }
  const keys = Object.keys(lock);
  if (keys.length !== LOCK_ROOT_KEYS.length ||
      keys.some((key, i) => key !== LOCK_ROOT_KEYS[i])) {
    fail(`${lockPath} must have exactly the keys {"format", "units", "version"}`);
  }
  if (lock.format !== 'ktav-section-inventory') {
    fail(`${lockPath} has unsupported format ${JSON.stringify(lock.format)}`);
  }
  if (lock.version !== '0.7.0') {
    fail(`${lockPath} must be version "0.7.0"; got ${JSON.stringify(lock.version)}`);
  }
  if (!Array.isArray(lock.units) || lock.units.length === 0) {
    fail(`${lockPath}.units must be a non-empty array of structural records`);
  }
  const names = [];
  for (let i = 0; i < lock.units.length; i++) {
    const record = lock.units[i];
    if (typeof record !== 'object' || record === null || Array.isArray(record) ||
        Object.keys(record).some((key, j) => key !== LOCK_UNIT_KEYS[j]) ||
        Object.keys(record).length !== LOCK_UNIT_KEYS.length) {
      fail(`${lockPath}.units[${i}] must have exactly the keys {"unit", "kind", "number", "level", "sep"} in that order`);
    }
    if (typeof record.unit !== 'string' || record.unit.length === 0 ||
        (record.kind !== 'frontmatter' && record.kind !== 'numbered' && record.kind !== 'named') ||
        (record.number !== null && typeof record.number !== 'string') ||
        (record.level !== null && (!Number.isInteger(record.level) || record.level < 1 || record.level > 6)) ||
        (record.sep !== null && typeof record.sep !== 'string')) {
      fail(`${lockPath}.units[${i}] has invalid structural metadata`);
    }
    if (record.kind === 'frontmatter' &&
        (record.number !== null || record.level !== null || record.sep !== null)) {
      fail(`${lockPath}.units[${i}] must use null number, level, and sep for frontmatter`);
    }
    if (record.kind === 'named' && (record.number !== null || record.sep !== null)) {
      fail(`${lockPath}.units[${i}] must use null number and sep for named units`);
    }
    if (record.kind === 'numbered' &&
        (typeof record.number !== 'string' || record.level === null ||
         (record.sep !== '. ' && record.sep !== ' '))) {
      fail(`${lockPath}.units[${i}] has invalid numbered structural metadata`);
    }
    names.push(record.unit);
  }
  if (new Set(names).size !== names.length) {
    fail(`${lockPath}.units must contain unique unit names`);
  }
  if (names.length !== manifest.length || names.some((name, i) => name !== manifest[i])) {
    const min = Math.min(lock.units.length, manifest.length);
    let first = 0;
    while (first < min && names[first] === manifest[first]) first++;
    const lockName = names[first];
    const manifestName = manifest[first];
    fail(`${lockPath} does not match manifest.js at index ${first}: lock has ${JSON.stringify(lockName)}, manifest has ${JSON.stringify(manifestName)}`);
  }
  if (units !== null) {
    for (let i = 0; i < manifest.length; i++) {
      const unit = manifest[i];
      const expected = structuralMeta(unit, units.get(unit).meta);
      const actual = lock.units[i];
      for (const key of LOCK_UNIT_KEYS) {
        if (actual[key] !== expected[key]) {
          fail(`${lockPath} structural record for unit "${unit}" differs from meta.js field ${JSON.stringify(key)}: lock has ${JSON.stringify(actual[key])}, meta has ${JSON.stringify(expected[key])}`);
        }
      }
    }
  }
}

function readReadmeSource(contentDir) {
  const sourcePath = path.join(contentDir, README_SOURCE_FILE);
  let buf;
  try {
    buf = fs.readFileSync(sourcePath);
  } catch (e) {
    fail(`cannot read ${sourcePath}: ${e.message}`);
  }
  rejectRawCarriageReturns(buf, sourcePath);
  const src = decodeUtf8Strict(buf, sourcePath);
  const source = validateBodySourceShape('content', README_SOURCE_FILE, src, README_SOURCE_FILE);
  validateBodyPart('content', README_SOURCE_FILE, source, README_SOURCE_FILE);
  return source;
}

// Return the exact cut offsets prescribed by content/README.md for one
// language body. Offsets are JavaScript string offsets, matching the offsets
// used when the decoded body parts are concatenated below.
function splitPlan(body, partCount, targetLineCount) {
  const lines = body.split('\n');
  const lineCount = lines.length - 1;
  const offsets = [0];
  for (const line of lines.slice(0, -1)) {
    offsets.push(offsets[offsets.length - 1] + line.length + 1);
  }

  const blankLines = [];
  for (let b = 0; b < lines.length - 1; b++) {
    if (lines[b] === '' && offsets[b + 1] < body.length) blankLines.push(b);
  }

  const cuts = [];
  let previousBlankIndex = -1;
  const cutCount = partCount - 1;
  for (let i = 1; i < partCount; i++) {
    const target = i * targetLineCount / partCount;
    const laterCutsNeeded = cutCount - i;
    let bestBlankIndex;
    for (let blankIndex = previousBlankIndex + 1;
      blankIndex < blankLines.length - laterCutsNeeded;
      blankIndex++) {
      const blank = blankLines[blankIndex];
      if (bestBlankIndex === undefined ||
          Math.abs((blank + 1) - target) <
            Math.abs((blankLines[bestBlankIndex] + 1) - target)) {
        bestBlankIndex = blankIndex;
      }
    }
    if (bestBlankIndex === undefined) break;
    const bestBlank = blankLines[bestBlankIndex];
    cuts.push(offsets[bestBlank + 1]);
    previousBlankIndex = bestBlankIndex;
  }
  return { lineCount, blankLineCount: blankLines.length, cuts };
}

function bodySplitPlan(parts) {
  const bodies = Object.fromEntries(
    LANGS.map((lang) => [lang, parts.map((part) => part[lang]).join('')])
  );
  const layouts = Object.fromEntries(
    LANGS.map((lang) => [lang, splitPlan(bodies[lang], 1, 0)])
  );
  const lineCounts = Object.fromEntries(
    LANGS.map((lang) => [lang, layouts[lang].lineCount])
  );
  const maxLines = Math.max(...Object.values(lineCounts));
  const lineCountPartCount = maxLines <= BODY_LINE_LIMIT
    ? 1
    : Math.ceil(maxLines / BODY_TARGET_LINES);
  const partCount = Math.min(
    lineCountPartCount,
    ...LANGS.map((lang) => layouts[lang].blankLineCount + 1)
  );
  const plans = Object.fromEntries(
    LANGS.map((lang) => [lang, splitPlan(bodies[lang], partCount, maxLines)])
  );

  return { lineCounts, maxLines, partCount, plans };
}

function validateBodySplitting(unit, meta, parts) {
  const plan = bodySplitPlan(parts);
  if (meta.bodyParts !== plan.partCount) {
    failUnit(unit,
      `bodyParts ${meta.bodyParts} does not match the mandated split count ` +
      `${plan.partCount} for ${plan.maxLines} body lines (the limit is ` +
      `${BODY_LINE_LIMIT}; target size is ${BODY_TARGET_LINES})`);
  }

  for (const lang of LANGS) {
    const actualCuts = [];
    let offset = 0;
    for (let i = 0; i < parts.length - 1; i++) {
      offset += parts[i][lang].length;
      actualCuts.push(offset);
    }
    const expectedCuts = plan.plans[lang].cuts;
    if (actualCuts.length !== expectedCuts.length ||
        actualCuts.some((cut, i) => cut !== expectedCuts[i])) {
      failUnit(unit,
        `${lang}: body parts must use the mandated blank-line cut points ` +
        `(expected ${JSON.stringify(expectedCuts)}, got ${JSON.stringify(actualCuts)})`);
    }
  }
}

// Closed-world validation of a content dir. Throws Error on first violation.
// Returns { manifest, units } where units is a Map unit -> { meta, parts }.
// Content sources are data, never code. manifest.js and meta.js are written
// in exactly one shape: byte-identical to `export default ` +
// JSON.stringify(value, null, 2) + '\n' (strict JSON: no duplicate keys, no
// comments, no trailing commas or semicolons; LF-only, 2-space indent,
// exactly one trailing newline). They are decoded as strict UTF-8 and
// parsed with JSON.parse, which cannot execute code -- nothing under
// content/ is ever dynamic-import()ed or otherwise evaluated.
export async function validateContentDir(contentDir, options = {}) {
  const manifestPath = path.join(contentDir, 'manifest.js');
  if (!fs.existsSync(manifestPath)) fail(`manifest not found: ${manifestPath}`);

  // Enumerate the top level and prove manifest.js is a REGULAR file BEFORE
  // any attempt to read its contents: a symlink (or any other special
  // entry) named manifest.js must never have its target opened, let alone
  // parsed.
  const entries = fs.readdirSync(contentDir, { withFileTypes: true });
  const manifestEnt = entries.find((ent) => ent.name === 'manifest.js');
  if (!manifestEnt) fail('manifest.js is missing under content/');
  if (!manifestEnt.isFile()) {
    fail('manifest.js is not a regular file (symlinks, directories and other special entries are not allowed under content/)');
  }

  const manifest = readJsonDefault(manifestPath);
  if (!Array.isArray(manifest) || manifest.length === 0 ||
      !manifest.every((n) => typeof n === 'string' && n.length > 0) ||
      new Set(manifest).size !== manifest.length) {
    fail('manifest.js must export a non-empty array of unique non-empty strings');
  }

  const lockPath = options.requireSectionInventoryLock || options.sectionInventoryLockPath
    ? options.sectionInventoryLockPath || defaultSectionInventoryLockPath(contentDir)
    : null;
  if (lockPath !== null) validateSectionInventoryLock(manifest, lockPath);

  const manifestSet = new Set(manifest);

  // 1. Top-level allowlist + 2. exact directory-set match.
  const actualDirs = new Set();
  const actualFiles = new Set();
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (!manifestSet.has(ent.name)) {
        fail(`unexpected directory under content/: "${ent.name}" (not in manifest.js)`);
      }
      actualDirs.add(ent.name);
    } else if (ent.isFile()) {
      if (!TOP_LEVEL_ALLOWED_FILES.has(ent.name)) {
        fail(`unexpected file under content/: "${ent.name}"`);
      }
      actualFiles.add(ent.name);
    } else {
      fail(`unexpected entry under content/: "${ent.name}"`);
    }
  }
  for (const name of manifest) {
    if (!actualDirs.has(name)) {
      fail(`manifest lists unit "${name}" but its directory is missing under content/`);
    }
  }

  // 2b. README.source.js is required input. Its three generated README
  // outputs remain allowlisted above, but validation must permit them to be
  // absent so normal write mode can restore them. --check requires and
  // byte-compares all three outputs below.
  if (!actualFiles.has(README_SOURCE_FILE)) {
    fail(`required file "${README_SOURCE_FILE}" is missing under content/ (the three READMEs must come from one source object)`);
  }
  const readmes = readReadmeSource(contentDir);

  // 3. Frontmatter invariant.
  if (manifest[0] !== 'frontmatter') {
    fail(`manifest.js must start with "frontmatter"; got ${JSON.stringify(manifest[0])}`);
  }

  const units = new Map();
  let frontmatterUnit = null;

  for (let idx = 0; idx < manifest.length; idx++) {
    const unit = manifest[idx];
    const unitDir = path.join(contentDir, unit);
    const isLast = idx === manifest.length - 1;

    // 4. Exact per-unit file set. Every entry must be a REGULAR file: a
    // symlink named meta.js/body-N.js would otherwise pass the name
    // allowlist and its target would later be read (and, for meta.js,
    // JSON-parsed), possibly outside the unit or outside content/.
    const unitEntries = fs.readdirSync(unitDir, { withFileTypes: true });
    for (const ent of unitEntries) {
      if (ent.isDirectory()) {
        failUnit(unit, `subdirectory "${ent.name}" is not allowed inside a unit directory`);
      }
      if (!ent.isFile()) {
        failUnit(unit, `entry "${ent.name}" is not a regular file (symlinks, FIFOs, devices and other special entries are not allowed inside a unit directory)`);
      }
    }
    const present = new Set(unitEntries.map((e) => e.name));
    if (!present.has('meta.js')) {
      failUnit(unit, 'missing meta.js');
    }
    const expected = new Set(['meta.js']);
    for (const name of present) {
      if (/^body-\d+\.js$/.test(name)) expected.add(name);
    }
    for (const name of present) {
      if (expected.has(name)) continue;
      if (/\.md$/.test(name) && ['en', 'ru', 'zh'].includes(name.slice(0, -3))) {
        failUnit(unit, `legacy per-language file ${name} is not allowed under content/; edit body-*.js instead`);
      }
      failUnit(unit, `unexpected file ${name} in unit directory`);
    }

    const meta = readJsonDefault(path.join(unitDir, 'meta.js'));
    validateMeta(unit, meta);
    for (const lang of LANGS) validateGeneratedHeading(unit, meta, lang);

    if (meta.kind === 'frontmatter') {
      if (idx !== 0) {
        failUnit(unit, `frontmatter unit must be manifest[0], found at index ${idx}`);
      }
      if (frontmatterUnit) {
        failUnit(unit, `duplicate frontmatter unit (already seen in "${frontmatterUnit}")`);
      }
      frontmatterUnit = unit;
    }

    // exact body file count
    const bodyFiles = unitEntries
      .map((e) => e.name)
      .filter((n) => /^body-\d+\.js$/.test(n));
    if (bodyFiles.length !== meta.bodyParts) {
      for (let k = 1; k <= meta.bodyParts; k++) {
        if (!bodyFiles.includes(`body-${k}.js`)) {
          failUnit(unit, `missing body-${k}.js (meta.bodyParts is ${meta.bodyParts})`);
        }
      }
      for (const n of bodyFiles) {
        const num = Number(n.slice(5, -3));
        if (num > meta.bodyParts) {
          failUnit(unit, `unexpected extra file ${n} beyond meta.bodyParts ${meta.bodyParts}`);
        }
      }
      const odd = bodyFiles.filter((n) => {
        const num = Number(n.slice(5, -3));
        return num < 1 || num > meta.bodyParts;
      });
      if (odd.length) {
        failUnit(unit, `unexpected body file(s) ${odd.join(', ')} (body files must be body-1.js..body-${meta.bodyParts}.js)`);
      }
      failUnit(unit, `expected exactly ${meta.bodyParts} body file(s), found ${bodyFiles.length}`);
    }

    const parts = [];
    for (let k = 1; k <= meta.bodyParts; k++) {
      const bodyPath = path.join(unitDir, `body-${k}.js`);

      // Read and shape-validate the raw source: a body file that is not
      // exactly the documented literal-object shape is rejected here, and
      // its statically decoded text is used as the body content -- no code
      // from it is ever run.
      let buf;
      try {
        buf = fs.readFileSync(bodyPath);
      } catch (e) {
        failUnit(unit, `cannot read body-${k}.js: ${e.message}`);
      }
      const sourceLabel = `unit "${unit}": body-${k}.js`;
      rejectRawCarriageReturns(buf, sourceLabel);
      const src = decodeUtf8Strict(buf, sourceLabel);
      const decoded = validateBodySourceShape(unit, k, src);

      // The decoded values ARE the body content: no code from the file is
      // ever executed anywhere.
      validateBodyPart(unit, k, decoded);
      parts.push(decoded);
    }

    // bodyParts is a deterministic layout contract, not just a file count:
    // validate both the required count and every inter-part cut.
    validateBodySplitting(unit, meta, parts);

    // Section headings are generated from meta. Frontmatter is the sole
    // exception: its body owns the document h1, but no other ATX heading.
    validateUnitHeadings(unit, meta, parts);

    // 6. Terminal-newline invariant (per language).
    // Non-last units must end with EXACTLY two trailing LFs ("\n\n"), i.e.
    // exactly one blank line; a run of 3+ trailing LFs is also rejected.
    // Exception: empty "container" sections whose whole body is exactly "\n" in every
    // language (heading immediately followed by subsections — the lone "\n"
    // supplies the blank line). The last unit must end with a single "\n".
    const last = parts[parts.length - 1];
    for (const lang of LANGS) {
      const s = last[lang];
      if (isLast) {
        if (s.endsWith('\n\n')) {
          failUnit(unit, `${lang}: last unit's final chunk must end with a single "\\n" but ends with "\\n\\n" (trailing blank line)`);
        } else if (!s.endsWith('\n')) {
          failUnit(unit, `${lang}: last unit's final chunk must end with "\\n"`);
        }
      } else if (!s.endsWith('\n\n') || s.endsWith('\n\n\n')) {
        const wholeBody = parts.map((p) => p[lang]).join('');
        const container = wholeBody === '\n' && LANGS.every((l) => parts.map((p) => p[l]).join('') === '\n');
        if (container) continue;
        const shape = s.endsWith('\n\n\n')
          ? '"\\n\\n\\n" or more (two or more trailing blank lines)'
          : s.endsWith('\n') ? '"\\n" (single newline)' : 'no trailing newline';
        failUnit(unit, `${lang}: non-last unit's final chunk must end with "\\n\\n" (exactly one blank line; only whole-body "\\n" container sections are exempt), got ${shape}`);
      }
    }

    units.set(unit, { meta, parts });
  }

  if (lockPath !== null) validateSectionInventoryLock(manifest, lockPath, units);
  return { manifest, units, readmes };
}

// Assemble outputs without writing. Returns { bufs, totalLen, manifest, pieces }.
export async function buildBuffers(contentDir, options = {}) {
  const { manifest, units, readmes } = await validateContentDir(contentDir, options);

  const outputs = { en: [], ru: [], zh: [] };
  const pieces = { en: [], ru: [], zh: [] };
  const lens = { en: 0, ru: 0, zh: 0 };

  for (const unit of manifest) {
    const { meta, parts } = units.get(unit);
    for (const lang of LANGS) {
      const body = Buffer.from(parts.map((p) => p[lang]).join(''), 'utf8');
      const arr = outputs[lang];
      if (meta.kind !== 'frontmatter') {
        const headingLine = generatedHeadingLine(meta, lang);
        const hbuf = Buffer.from(headingLine + '\n', 'utf8');
        const start = lens[lang];
        arr.push(hbuf);
        lens[lang] = start + hbuf.length;
        pieces[lang].push({ unit, start, end: lens[lang] });
        arr.push(body);
        pieces[lang].push({ unit, start: lens[lang], end: lens[lang] + body.length });
        lens[lang] += body.length;
      } else {
        const start = lens[lang];
        arr.push(body);
        pieces[lang].push({ unit, start, end: start + body.length });
        lens[lang] += body.length;
      }
    }
  }

  const bufs = {};
  const totalLen = {};
  for (const lang of LANGS) {
    totalLen[lang] = outputs[lang].reduce((n, b) => n + b.length, 0);
    bufs[lang] = Buffer.concat(outputs[lang], totalLen[lang]);
  }
  const readmeBufs = {};
  for (const lang of LANGS) readmeBufs[lang] = Buffer.from(readmes[lang], 'utf8');
  return { bufs, totalLen, manifest, pieces, readmeBufs };
}

function assertRegularDestination(destination) {
  let stat;
  try {
    stat = fs.lstatSync(destination);
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    fail(`cannot inspect output destination ${destination}: ${e.message}`);
  }
  if (!stat.isFile()) {
    const kind = stat.isSymbolicLink() ? 'symlink' : 'special file';
    fail(`output destination ${destination} is not a regular file (${kind}; write mode refuses to follow or overwrite it)`);
  }
  return true;
}

function createTemporaryOutput(destination) {
  const dir = path.dirname(destination);
  const base = path.basename(destination);
  for (let attempt = 0; attempt < 100; attempt++) {
    const tempPath = path.join(dir,
      `.${base}.${process.pid}.${Date.now()}.${attempt}.tmp`);
    try {
      const fd = fs.openSync(tempPath, 'wx', 0o666);
      return { fd, tempPath };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
  }
  fail(`could not allocate a temporary output beside ${destination}`);
}

function createAuxiliaryPath(destination, suffix) {
  const dir = path.dirname(destination);
  const base = path.basename(destination);
  for (let attempt = 0; attempt < 100; attempt++) {
    const auxiliaryPath = path.join(dir,
      `.${base}.${process.pid}.${Date.now()}.${attempt}.${suffix}`);
    try {
      const fd = fs.openSync(auxiliaryPath, 'wx', 0o600);
      fs.closeSync(fd);
      fs.unlinkSync(auxiliaryPath);
      return auxiliaryPath;
    } catch (e) {
      if (e.code === 'EEXIST') continue;
      try { fs.unlinkSync(auxiliaryPath); } catch { /* preserve the original failure */ }
      throw e;
    }
  }
  fail(`could not allocate a ${suffix} beside ${destination}`);
}

function unlinkRegularIfPresent(destination) {
  let stat;
  try {
    stat = fs.lstatSync(destination);
  } catch (e) {
    if (e.code === 'ENOENT') return;
    throw e;
  }
  if (!stat.isFile()) {
    const kind = stat.isSymbolicLink() ? 'symlink' : 'special file';
    throw new Error(`cannot remove transaction output ${destination}: it is not a regular file (${kind})`);
  }
  fs.unlinkSync(destination);
}

function rollbackOutputTransaction(staged) {
  const errors = [];
  for (const item of [...staged].reverse()) {
    try {
      if (item.replaced) unlinkRegularIfPresent(item.destination);
      if (item.backupPath !== null) {
        // Rollback deliberately uses the real filesystem operation, not the
        // injected replacement hook. A one-shot test failure must not prevent
        // restoration of the already staged backups.
        fs.renameSync(item.backupPath, item.destination);
        item.backupPath = null;
      }
    } catch (e) {
      if (item.backupPath !== null) {
        // A failed restore leaves the only known copy of the original at the
        // backup path. Never let the later best-effort cleanup unlink it.
        item.preserveBackup = true;
        errors.push(`${item.destination}: could not restore backup ${item.backupPath}: ${e.message}`);
      } else {
        errors.push(`${item.destination}: ${e.message}`);
      }
    }
  }
  for (const item of staged) {
    try {
      if (item.tempPath !== null) fs.unlinkSync(item.tempPath);
    } catch (e) {
      if (e.code !== 'ENOENT') errors.push(`${item.tempPath}: ${e.message}`);
    }
    if (item.backupPath !== null && !item.preserveBackup) {
      try {
        fs.unlinkSync(item.backupPath);
      } catch (e) {
        if (e.code !== 'ENOENT') errors.push(`${item.backupPath}: ${e.message}`);
      }
    }
  }
  return errors;
}

function resolvedWriteRoot(root, label) {
  const absolute = path.resolve(root);
  const components = [];
  let current = absolute;
  while (true) {
    components.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  for (const component of components.reverse()) {
    let stat;
    try {
      stat = fs.lstatSync(component);
    } catch (e) {
      fail(`cannot inspect ${label} path component ${component}: ${e.message}`);
    }
    if (stat.isSymbolicLink()) {
      fail(`${label} path component ${component} is a symlink or junction; write roots and their ancestors must be real directories`);
    }
    if (!stat.isDirectory()) {
      fail(`${label} path component ${component} is not a directory`);
    }
  }

  try {
    return fs.realpathSync(absolute);
  } catch (e) {
    fail(`cannot resolve ${label} ${absolute}: ${e.message}`);
  }
}

function validateWriteRoots(specDir, contentDir) {
  const resolvedSpecDir = resolvedWriteRoot(specDir, 'specDir');
  const resolvedContentDir = resolvedWriteRoot(contentDir, 'contentDir');
  if (path.relative(resolvedSpecDir, resolvedContentDir) !== 'content') {
    fail(`contentDir ${path.resolve(contentDir)} must resolve to the expected child ${path.join(resolvedSpecDir, 'content')} of specDir ${resolvedSpecDir}`);
  }
}

export function writeBuildOutputs(specDir, contentDir, { bufs, readmeBufs }, options = {}) {
  validateWriteRoots(specDir, contentDir);
  const outputs = [];
  for (const lang of LANGS) {
    outputs.push([path.join(specDir, OUT_FILES[lang]), bufs[lang]]);
    outputs.push([path.join(contentDir, README_FILES[lang]), readmeBufs[lang]]);
  }

  // Preflight every destination so a rejected symlink/special file cannot
  // leave a partially regenerated set of outputs behind.
  const staged = [];
  for (const [destination] of outputs) {
    staged.push({
      destination,
      data: null,
      existed: assertRegularDestination(destination),
      tempPath: null,
      fd: null,
      backupPath: null,
      preserveBackup: false,
      replaced: false,
    });
  }
  const { renameSync = fs.renameSync, unlinkSync = fs.unlinkSync } = options;
  try {
    // Stage every replacement before touching a destination.
    for (let i = 0; i < staged.length; i++) {
      const item = staged[i];
      item.data = outputs[i][1];
      const temporary = createTemporaryOutput(item.destination);
      item.fd = temporary.fd;
      item.tempPath = temporary.tempPath;
      if (!fs.fstatSync(item.fd).isFile()) {
        fail(`temporary output for ${item.destination} is not a regular file`);
      }
      fs.writeFileSync(item.fd, item.data);
      fs.closeSync(item.fd);
      item.fd = null;
    }

    // Move all original files aside before the first replacement. This keeps
    // every original byte recoverable, including metadata and missing-file
    // state, if a later replacement fails.
    for (const item of staged) {
      if (!item.existed) continue;
      const backupPath = createAuxiliaryPath(item.destination, 'bak');
      try {
        renameSync(item.destination, backupPath);
        item.backupPath = backupPath;
      } catch (error) {
        // A custom rename hook may perform the rename and then throw. Keep a
        // successfully created backup discoverable for rollback in that case.
        try {
          if (fs.lstatSync(backupPath).isFile()) item.backupPath = backupPath;
        } catch { /* the failed rename left no backup */ }
        throw error;
      }
    }

    for (const item of staged) {
      // Recheck immediately before replacement. rename() never follows a
      // destination symlink, and this check rejects one before that point.
      assertRegularDestination(item.destination);
      // Mark before calling the hook so a hook that performs the rename and
      // then throws is still rolled back as a completed replacement.
      item.replaced = true;
      renameSync(item.tempPath, item.destination);
      item.tempPath = null;
    }

  } catch (error) {
    for (const item of staged) {
      if (item.fd !== null) {
        try { fs.closeSync(item.fd); } catch { /* preserve the original failure */ }
        item.fd = null;
      }
    }
    const rollbackErrors = rollbackOutputTransaction(staged);
    const detail = rollbackErrors.length
      ? `; rollback failed: ${rollbackErrors.join('; ')}`
      : '';
    const transactionError = new Error(
      `build output transaction failed: ${error.message}${detail}`,
      { cause: error }
    );
    transactionError.code = error.code;
    throw transactionError;
  }

  // All six replacements have committed. Backup cleanup is deliberately
  // outside the rollback boundary: once any backup is deleted, rollback can
  // no longer restore every original and must never remove committed outputs.
  const cleanupErrors = [];
  for (const item of staged) {
    if (item.backupPath === null) continue;
    try {
      unlinkSync(item.backupPath);
      item.backupPath = null;
    } catch (error) {
      cleanupErrors.push(`${item.backupPath}: ${error.message}`);
    }
  }
  if (cleanupErrors.length) {
    const cleanupError = new Error(
      `outputs committed; backup cleanup failed: ${cleanupErrors.join('; ')}`
    );
    cleanupError.code = 'KTAV_BACKUP_CLEANUP_FAILED';
    throw cleanupError;
  }
}

function readCheckTarget(destination, fileName, lang, expectedLength) {
  let stat;
  try {
    stat = fs.lstatSync(destination);
  } catch (e) {
    if (e.code === 'ENOENT') {
      fail(
        `build_spec --check: MISMATCH in ${fileName} (${lang}): ` +
        `output file missing at ${destination}; expected ${expectedLength} bytes`);
    }
    fail(`build_spec --check: cannot inspect comparison target ${destination}: ${e.message}`);
  }
  if (!stat.isFile()) {
    const kind = stat.isSymbolicLink() ? 'symlink' : 'special file';
    fail(
      `build_spec --check: cannot compare ${fileName} (${lang}): ` +
      `output comparison target ${destination} is not a regular file ` +
      `(${kind}; --check refuses to follow it)`);
  }
  try {
    return fs.readFileSync(destination);
  } catch (e) {
    fail(`build_spec --check: cannot read comparison target ${destination}: ${e.message}`);
  }
}

export function checkBuildOutputs(specDir, contentDir,
                                  { bufs, totalLen, pieces, readmeBufs }) {
  validateWriteRoots(specDir, contentDir);

  for (const lang of LANGS) {
    const outPath = path.join(specDir, OUT_FILES[lang]);
    const existing = readCheckTarget(outPath, OUT_FILES[lang], lang, totalLen[lang]);
    const diff = firstByteDiff(existing, bufs[lang]);
    if (diff !== -1) {
      const unit = unitForLine(pieces, lang, diff);
      fail(formatMismatchDiagnostic(
        OUT_FILES[lang], lang, existing, bufs[lang], diff, unit));
    }
  }

  for (const lang of LANGS) {
    const outPath = path.join(contentDir, README_FILES[lang]);
    const existing = readCheckTarget(
      outPath, README_FILES[lang], lang, readmeBufs[lang].length);
    const diff = firstByteDiff(existing, readmeBufs[lang]);
    if (diff !== -1) {
      fail(formatMismatchDiagnostic(
        README_FILES[lang], lang, existing, readmeBufs[lang], diff,
        README_SOURCE_FILE));
    }
  }
}

export function firstByteDiff(existing, expected) {
  const min = Math.min(existing.length, expected.length);
  let diff = 0;
  while (diff < min && existing[diff] === expected[diff]) diff++;
  return diff < min || existing.length !== expected.length ? diff : -1;
}

export function lineNumberAtByte(buf, offset) {
  const end = Math.min(Math.max(offset, 0), buf.length);
  let line = 1;
  for (let i = 0; i < end; i++) {
    if (buf[i] === 0x0a) line++;
  }
  return line;
}

export function lineAtByte(buf, offset) {
  const at = Math.min(Math.max(offset, 0), buf.length);
  const start = at === 0 ? 0 : buf.lastIndexOf(0x0a, at - 1) + 1;
  let end = buf.indexOf(0x0a, at);
  if (end === -1) end = buf.length;
  let line = buf.slice(start, end).toString('utf8');
  if (line.length > 160) line = line.slice(0, 160) + '…';
  return JSON.stringify(line);
}

export function formatMismatchDiagnostic(fileName, lang, existing, generated, diff, unit) {
  const lineBuf = diff < generated.length ? generated : existing;
  const lineNo = lineNumberAtByte(lineBuf, diff);
  const tail = diff >= generated.length
    ? ' (generated output is shorter; no byte here)'
    : diff >= existing.length
      ? ' (existing file is shorter; no byte here)'
      : '';
  return (
    `build_spec --check: MISMATCH in ${fileName} (${lang}) at byte offset ${diff}` +
    `${tail}, line ${lineNo}, unit "${unit}":\n` +
    `  generated: ${diff < generated.length ? lineAtByte(generated, diff) : '(no line)'}\n` +
    `  existing:  ${diff < existing.length ? lineAtByte(existing, diff) : '(no line)'}\n`
  );
}

function unitForLine(pieces, lang, offset) {
  for (const p of pieces[lang]) {
    if (offset >= p.start && offset < p.end) return p.unit;
  }
  return pieces[lang].length ? pieces[lang][pieces[lang].length - 1].unit : '?';
}

function usage() {
  process.stdout.write(
    'Usage: node scripts/build_spec.mjs [--check | -h | --help]\n' +
    '  (default)   write the three spec files and three content READMEs\n' +
    '  --check     verify outputs are byte-identical; write nothing; silent on success\n'
  );
}

async function cli() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptDir, '..');
  const specDir = path.join(root, 'versions', '0.7');
  const contentDir = path.join(specDir, 'content');

  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) { usage(); process.exit(0); }
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    usage();
    process.exit(1);
  }
  const checkMode = args.length === 1;

  if (!fs.existsSync(contentDir)) fail(`content dir not found: ${contentDir}`);

  let build;
  try {
    // --check reads generated outputs, so reject linked roots before content
    // validation can traverse a directory outside the repository.
    if (checkMode) validateWriteRoots(specDir, contentDir);
    build = await buildBuffers(contentDir, { requireSectionInventoryLock: true });
  } catch (e) {
    process.stderr.write(`build_spec: ${e.message}\n`);
    process.exit(1);
  }
  const { bufs, totalLen, manifest, pieces, readmeBufs } = build;

  if (!checkMode) {
    writeBuildOutputs(specDir, contentDir, build);
    process.stdout.write(
      `build_spec: assembled ${manifest.length} units -> ` +
      LANGS.map((l) => path.relative(root, path.join(specDir, OUT_FILES[l]))).join(', ') + '\n'
    );
    process.exit(0);
  }

  // --check mode: silent on success, first divergence diagnostic on stderr.
  checkBuildOutputs(specDir, contentDir, build);
  process.exit(0);
}

const isMain = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  cli().catch((e) => {
    process.stderr.write(`build_spec: ${e.message}\n`);
    process.exit(1);
  });
}
