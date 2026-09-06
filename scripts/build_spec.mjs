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
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
// The split rule targets roughly 100 lines per file. This cap still permits
// about 409,600 body lines, but prevents metadata from driving an unbounded
// body-file loop before the files themselves have been inspected.
export const MAX_BODY_PARTS = 4096;

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
  if (!Number.isSafeInteger(meta.bodyParts) || meta.bodyParts < 1 || meta.bodyParts > MAX_BODY_PARTS) {
    failUnit(unit,
      `bad bodyParts ${JSON.stringify(meta.bodyParts)} (must be a safe integer between 1 and ${MAX_BODY_PARTS})`);
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

function buildThematicBreakSuffix(line) {
  const markers = new Uint8Array(line.length);
  const counts = new Uint32Array(line.length);
  let marker = 0;
  let count = 0;
  let valid = true;
  for (let pos = line.length - 1; pos >= 0; pos--) {
    const code = line.charCodeAt(pos);
    if (code === 0x20 || code === 0x09) continue;
    if (code === 0x2d || code === 0x2a || code === 0x5f) {
      if (marker === 0) marker = code;
      else if (marker !== code) valid = false;
      if (valid) count++;
    } else {
      valid = false;
    }
    if (valid) {
      markers[pos] = marker;
      counts[pos] = count;
    }
  }
  return { markers, counts };
}

function isThematicBreakAt(line, pos, suffix) {
  let start = pos;
  let indent = 0;
  while (start < line.length && (line[start] === ' ' || line[start] === '\t')) {
    start++;
    indent++;
  }
  if (indent > 3 || start === line.length) return false;
  const code = line.charCodeAt(start);
  return suffix.markers[start] === code && suffix.counts[start] >= 3;
}

const HTML_BLOCK_TAGS =
  '(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|' +
  'colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|' +
  'form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|' +
  'li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|pre|' +
  'script|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|' +
  'track|ul)';

// The source format is prose plus fenced examples, not arbitrary HTML. Reject
// each CommonMark HTML-block opener family instead of trying to model its
// type-specific termination rules while looking for section headings.
function isAsciiLetter(ch) {
  const code = ch?.charCodeAt(0);
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}

function isAsciiDigit(ch) {
  const code = ch?.charCodeAt(0);
  return code >= 0x30 && code <= 0x39;
}

function skipSpaceTabs(line, start) {
  let pos = start;
  while (line[pos] === ' ' || line[pos] === '\t') pos++;
  return pos;
}

function isAttributeNameStart(ch) {
  return isAsciiLetter(ch) || ch === '_' || ch === ':';
}

function isAttributeNameChar(ch) {
  return isAttributeNameStart(ch) || isAsciiDigit(ch) || ch === '.' || ch === '-';
}

function isUnquotedAttributeValueChar(ch) {
  return ch !== undefined && ch !== ' ' && ch !== '\t' &&
    ch !== '"' && ch !== "'" && ch !== '=' && ch !== '<' &&
    ch !== '>' && ch !== '`';
}

// CommonMark type 7 requires the whole line (apart from indentation and
// trailing whitespace) to be one syntactically complete open or closing tag.
// This monotonic scanner is linear in the line length and never scans past it.
function isCompleteType7Tag(line) {
  let pos = 0;
  while (pos < 3 && line[pos] === ' ') pos++;
  if (line[pos] !== '<') return false;
  pos++;

  const closing = line[pos] === '/';
  if (closing) pos++;
  if (!isAsciiLetter(line[pos])) return false;
  pos++;
  while (isAsciiLetter(line[pos]) || isAsciiDigit(line[pos]) || line[pos] === '-') pos++;

  if (closing) {
    pos = skipSpaceTabs(line, pos);
    if (line[pos] !== '>') return false;
    return skipSpaceTabs(line, pos + 1) === line.length;
  }

  while (pos < line.length) {
    const beforeWhitespace = pos;
    pos = skipSpaceTabs(line, pos);
    if (line[pos] === '>') return skipSpaceTabs(line, pos + 1) === line.length;
    if (line[pos] === '/' && line[pos + 1] === '>') {
      return skipSpaceTabs(line, pos + 2) === line.length;
    }

    // Every attribute after the tag name must be separated by whitespace.
    if (pos === beforeWhitespace || !isAttributeNameStart(line[pos])) return false;
    pos++;
    while (isAttributeNameChar(line[pos])) pos++;

    const nameEnd = pos;
    const equals = skipSpaceTabs(line, pos);
    if (line[equals] !== '=') {
      pos = nameEnd;
      continue;
    }

    pos = skipSpaceTabs(line, equals + 1);
    const quote = line[pos] === '"' || line[pos] === "'" ? line[pos] : null;
    if (quote !== null) {
      pos++;
      while (pos < line.length && line[pos] !== quote) pos++;
      if (pos === line.length) return false;
      pos++;
      continue;
    }

    const valueStart = pos;
    while (isUnquotedAttributeValueChar(line[pos])) pos++;
    if (pos === valueStart) return false;
  }
  return false;
}

function parseHtmlBlockOpener(line) {
  if (/^ {0,3}<(?:script|pre|style|textarea)(?=[ \t>]|$)/iu.test(line)) {
    return { htmlType: 1 };
  }
  if (/^ {0,3}<!--/u.test(line)) return { htmlType: 2 };
  if (/^ {0,3}<\?/u.test(line)) return { htmlType: 3 };
  if (/^ {0,3}<![A-Za-z]/u.test(line)) return { htmlType: 4 };
  if (/^ {0,3}<!\[CDATA\[/u.test(line)) return { htmlType: 5 };
  if (new RegExp(`^ {0,3}</?${HTML_BLOCK_TAGS}(?=[ \\t]|$|>|/>)`, 'iu').test(line)) {
    return { htmlType: 6 };
  }
  if (isCompleteType7Tag(line)) return { htmlType: 7 };
  return null;
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

// Expand tabs before container parsing. This preserves the spaces left by a
// tab after a consumed blockquote/list marker, including when the tab crosses
// the marker's indentation boundary.
function expandTabs(line) {
  let column = 0;
  let expanded = '';
  for (const ch of line) {
    if (ch === '\t') {
      const spaces = 4 - (column % 4);
      expanded += ' '.repeat(spaces);
      column += spaces;
    } else {
      expanded += ch;
      column++;
    }
  }
  return expanded;
}

function columnAt(line, end) {
  let column = 0;
  for (let pos = 0; pos < end; pos++) column = advanceColumn(column, line[pos]);
  return column;
}

function leadingColumns(line, start = 0, expanded = false) {
  const startColumn = expanded ? start : columnAt(line, start);
  let column = startColumn;
  let pos = start;
  while (pos < line.length && (line[pos] === ' ' || line[pos] === '\t')) {
    column = advanceColumn(column, line[pos]);
    pos++;
  }
  return { column: column - startColumn, pos };
}

function consumeIndent(line, start, columns, expanded = false) {
  const startColumn = expanded ? start : columnAt(line, start);
  let column = startColumn;
  let pos = start;
  while (pos < line.length && column - startColumn < columns &&
         (line[pos] === ' ' || line[pos] === '\t')) {
    column = advanceColumn(column, line[pos]);
    pos++;
  }
  return column - startColumn >= columns ? pos : null;
}

function consumeBlockquoteMarker(line, start, expanded = false) {
  const leading = leadingColumns(line, start, expanded);
  if (leading.column > 3 || line[leading.pos] !== '>') return null;
  let pos = leading.pos + 1;
  if (line[pos] === ' ' || line[pos] === '\t') pos++;
  return pos;
}

function parseListMarker(line, start, expanded = false) {
  const leading = leadingColumns(line, start, expanded);
  if (leading.column > 3) return null;
  const markerStart = leading.pos;
  const first = line[markerStart];
  let markerEnd = markerStart + 1;
  if (first !== '*' && first !== '+' && first !== '-') {
    if (first < '0' || first > '9') return null;
    while (markerEnd < line.length && markerEnd - markerStart < 9 &&
           line[markerEnd] >= '0' && line[markerEnd] <= '9') markerEnd++;
    if (line[markerEnd] !== '.' && line[markerEnd] !== ')') return null;
    markerEnd++;
  }
  if (markerEnd < line.length && line[markerEnd] !== ' ' && line[markerEnd] !== '\t') return null;
  const text = line.slice(markerStart, markerEnd);
  return {
    markerStart,
    markerEnd,
    marker: text,
    ordered: /^\d/.test(text),
    number: /^\d/.test(text) ? text.slice(0, -1) : null,
    start: /^\d/.test(text) ? Number(text.slice(0, -1)) : null,
  };
}

function consumeListPadding(line, list, expanded = false) {
  let pos = list.markerEnd;
  if (pos === line.length || (line[pos] !== ' ' && line[pos] !== '\t')) {
    return { pos, indent: list.markerEnd - list.markerStart + 1, indentedCode: false };
  }

  const markerEndColumn = expanded ? list.markerEnd : columnAt(line, list.markerEnd);
  let whitespaceColumns = 0;
  let scanColumn = markerEndColumn;
  let scan = pos;
  while (scan < line.length && (line[scan] === ' ' || line[scan] === '\t')) {
    const nextColumn = advanceColumn(scanColumn, line[scan]);
    whitespaceColumns = nextColumn - markerEndColumn;
    scanColumn = nextColumn;
    scan++;
  }

  if (whitespaceColumns > 4) {
    // Five or more columns of padding consume exactly one whitespace
    // character, leaving the remainder as indented code.
    const firstColumn = advanceColumn(markerEndColumn, line[pos]);
    return {
      pos: pos + 1,
      indent: list.markerEnd - list.markerStart + firstColumn - markerEndColumn,
      indentedCode: true,
    };
  }
  return {
    pos: scan,
    indent: list.markerEnd - list.markerStart + scanColumn - markerEndColumn,
    indentedCode: false,
  };
}

function isEmptyListMarker(line, list) {
  for (let pos = list.markerEnd; pos < line.length; pos++) {
    if (line[pos] !== ' ' && line[pos] !== '\t') return false;
  }
  return true;
}

function isAsciiPunctuation(ch) {
  const code = ch?.codePointAt(0);
  return (code >= 0x21 && code <= 0x2f) ||
    (code >= 0x3a && code <= 0x40) ||
    (code >= 0x5b && code <= 0x60) ||
    (code >= 0x7b && code <= 0x7e);
}

function isAsciiControl(ch) {
  const code = ch?.codePointAt(0);
  return (code >= 0x01 && code <= 0x1f) || code === 0x7f;
}

function codePointWidth(line, pos) {
  return line.codePointAt(pos) > 0xffff ? 2 : 1;
}

function isBlankLinkContinuation(line) {
  return /^[ \t]*$/.test(line);
}

// The scanner follows the link-label rules in CommonMark 0.31.2. In
// particular, the limit is in Unicode code points, not UTF-16 code units.
function scanLinkLabel(line, start, state = null) {
  let pos = start;
  let length = state?.length ?? 0;
  let hasContent = state?.hasContent ?? false;

  while (pos < line.length) {
    const ch = line[pos];
    if (ch === ']') {
      if (!hasContent || line[pos + 1] !== ':') return { invalid: true };
      return { kind: 'after-label', pos: pos + 2, length, hasContent };
    }
    if (ch === '[') return { invalid: true };

    if (ch === '\\') {
      length++;
      hasContent = true;
      pos++;
      if (pos < line.length) {
        length++;
        pos += codePointWidth(line, pos);
      }
    } else {
      const width = codePointWidth(line, pos);
      if (ch !== ' ' && ch !== '\t') hasContent = true;
      length++;
      pos += width;
    }
    if (length > 999) return { invalid: true };
  }

  // A physical line ending is a character inside a multiline label.
  length++;
  if (length > 999) return { invalid: true };
  return { kind: 'label', length, hasContent };
}

function scanLinkDestination(line, start) {
  let pos = start;
  if (line[pos] === '<') {
    pos++;
    while (pos < line.length) {
      const ch = line[pos];
      if (ch === '\\' && pos + 1 < line.length && isAsciiPunctuation(line[pos + 1])) {
        pos += 1 + codePointWidth(line, pos + 1);
        continue;
      }
      if (ch === '<') return { invalid: true };
      if (ch === '>') return { kind: 'destination', pos: pos + 1 };
      pos += codePointWidth(line, pos);
    }
    return { invalid: true };
  }

  const destinationStart = pos;
  let parenDepth = 0;
  while (pos < line.length) {
    const ch = line[pos];
    if (ch === ' ' || ch === '\t') break;
    if (isAsciiControl(ch)) return { invalid: true };
    if (ch === '\\' && pos + 1 < line.length && isAsciiPunctuation(line[pos + 1])) {
      pos += 1 + codePointWidth(line, pos + 1);
      continue;
    }
    if (ch === '(') {
      parenDepth++;
      if (parenDepth > 32) return { invalid: true };
    } else if (ch === ')' && --parenDepth < 0) {
      return { invalid: true };
    }
    pos += codePointWidth(line, pos);
  }
  if (pos === destinationStart || parenDepth !== 0) return { invalid: true };
  return { kind: 'destination', pos };
}

function scanLinkTitle(line, start, delimiter = null) {
  let pos = start;
  if (delimiter === null) {
    pos = skipSpaceTabs(line, pos);
    delimiter = line[pos];
    if (delimiter !== '"' && delimiter !== "'" && delimiter !== '(') {
      return { invalid: true };
    }
    pos++;
  }
  const closer = delimiter === '(' ? ')' : delimiter;
  while (pos < line.length) {
    const ch = line[pos];
    if (ch === '\\' && pos + 1 < line.length && isAsciiPunctuation(line[pos + 1])) {
      pos += 1 + codePointWidth(line, pos + 1);
      continue;
    }
    if (ch === closer) {
      const end = skipSpaceTabs(line, pos + 1);
      return end === line.length
        ? { kind: 'complete' }
        : { invalid: true };
    }
    if (delimiter === '(' && ch === '(') return { invalid: true };
    pos += codePointWidth(line, pos);
  }
  return { kind: 'title', delimiter };
}

function scanLinkReferenceSuffix(line, pos) {
  if (pos < line.length && line[pos] !== ' ' && line[pos] !== '\t') {
    return null;
  }
  pos = skipSpaceTabs(line, pos);
  if (pos === line.length) return { phase: 'maybe-title' };
  const title = scanLinkTitle(line, pos);
  if (title.invalid) return null;
  return title.kind === 'complete'
    ? { phase: 'complete' }
    : { phase: 'title', delimiter: title.delimiter };
}

function startsLinkTitle(line) {
  const pos = skipSpaceTabs(line, 0);
  return line[pos] === '"' || line[pos] === "'" || line[pos] === '(';
}

function scanLinkReferenceAfterLabel(line, pos) {
  pos = skipSpaceTabs(line, pos);
  if (pos === line.length) return { phase: 'destination' };
  const destination = scanLinkDestination(line, pos);
  if (destination.invalid) return null;
  return scanLinkReferenceSuffix(line, destination.pos);
}

function scanLinkReferenceStart(line, sourceLine = line) {
  line = sourceLine;
  let pos = 0;
  while (pos < 3 && line[pos] === ' ') pos++;
  if (line[pos] !== '[') return null;
  const label = scanLinkLabel(line, pos + 1);
  if (label.invalid) return null;
  if (label.kind === 'label') {
    return {
      phase: 'label',
      length: label.length,
      hasContent: label.hasContent,
    };
  }
  const suffix = scanLinkReferenceAfterLabel(line, label.pos);
  return suffix === null ? null : suffix;
}

function continueLinkReference(line, definition) {
  if (isBlankLinkContinuation(line)) return null;
  if (definition.phase === 'label') {
    const label = scanLinkLabel(line, 0, definition);
    if (label.invalid) return null;
    if (label.kind === 'label') {
      return { ...definition, length: label.length, hasContent: label.hasContent };
    }
    const suffix = scanLinkReferenceAfterLabel(line, label.pos);
    return suffix === null ? null : suffix;
  }
  if (definition.phase === 'destination') {
    const destination = scanLinkDestination(line, skipSpaceTabs(line, 0));
    if (destination.invalid) return null;
    return scanLinkReferenceSuffix(line, destination.pos);
  }
  if (definition.phase === 'maybe-title') {
    const title = scanLinkTitle(line, 0);
    if (title.invalid) return null;
    return title.kind === 'complete'
      ? { phase: 'complete' }
      : { phase: 'title', delimiter: title.delimiter };
  }
  if (definition.phase === 'title') {
    const title = scanLinkTitle(line, 0, definition.delimiter);
    if (title.invalid) return null;
    return title.kind === 'complete' ? { phase: 'complete' } : title;
  }
  return null;
}

// A block that cannot interrupt a paragraph may continue a list or quote
// paragraph without repeating its container marker. Keep that container so a
// later Setext underline is still associated with the active paragraph.
function canContinueParagraph(line) {
  const html = parseHtmlBlockOpener(line);
  if (/^[ \t]*$/.test(line) || parseAtxHeading(line) !== null ||
      parseFenceOpener(line) !== null || parseSetextUnderline(line) !== null ||
      isThematicBreak(line) || (html !== null && html.htmlType !== 7)) {
    return false;
  }
  const list = parseListMarker(line, 0);
  if (list !== null && !isEmptyListMarker(line, list) &&
      (!list.ordered || list.start === 1)) {
    return false;
  }
  return true;
}

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
export function splitPlan(body, partCount, targetLineCount) {
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
    const firstAllowed = previousBlankIndex + 1;
    const endAllowed = blankLines.length - laterCutsNeeded;
    if (firstAllowed >= endAllowed) break;
    let low = firstAllowed;
    let high = endAllowed;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2);
      if (blankLines[middle] + 1 < target) low = middle + 1;
      else high = middle;
    }
    let bestBlankIndex = low < endAllowed ? low : endAllowed - 1;
    if (bestBlankIndex > firstAllowed) {
      const previous = bestBlankIndex - 1;
      if (Math.abs((blankLines[previous] + 1) - target) <=
          Math.abs((blankLines[bestBlankIndex] + 1) - target)) {
        bestBlankIndex = previous;
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
      .filter((n) => /^body-\d+\.js$/u.test(n));
    const bodyFileSet = new Set(bodyFiles);
    const malformedBodyFiles = bodyFiles.filter((name) => {
      const digits = name.slice(5, -3);
      const number = Number(digits);
      return !Number.isSafeInteger(number) || number < 1 || String(number) !== digits;
    });
    if (malformedBodyFiles.length) {
      failUnit(unit,
        `unexpected body file(s) ${malformedBodyFiles.join(', ')} ` +
        `(body files must be body-1.js..body-${meta.bodyParts}.js)`);
    }
    if (bodyFiles.length !== meta.bodyParts) {
      for (let k = 1; k <= meta.bodyParts; k++) {
        if (!bodyFileSet.has(`body-${k}.js`)) {
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

const TRANSACTION_JOURNAL_FILE = '.build-spec.transaction.json';
const TRANSACTION_JOURNAL_TMP_FILE = '.build-spec.transaction.json.tmp';
const TRANSACTION_LOCK_FILE = '.build-spec.transaction.lock';
const TRANSACTION_LOCK_CANDIDATE_PREFIX = `${TRANSACTION_LOCK_FILE}.candidate.`;
const TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE = `${TRANSACTION_LOCK_FILE}.candidate`;
const TRANSACTION_LOCK_OWNER_PREFIX = `${TRANSACTION_LOCK_FILE}.owner.`;
const TRANSACTION_LOCK_CLAIM_PREFIX = `${TRANSACTION_LOCK_FILE}.claim.`;
const TRANSACTION_LOCK_LEASE_PREFIX = `${TRANSACTION_LOCK_FILE}.lease.`;
const TRANSACTION_LOCK_RELEASE_PREFIX = `${TRANSACTION_LOCK_FILE}.release.`;
const TRANSACTION_LOCK_QUARANTINE_PREFIX = `${TRANSACTION_LOCK_FILE}.quarantine.`;
const TRANSACTION_FORMAT = 'ktav-build-output-transaction';
const TRANSACTION_LOCK_FORMAT = 'ktav-build-output-lock';
const TRANSACTION_LOCK_CLAIM_FORMAT = 'ktav-build-output-lock-claim';
const TRANSACTION_VERSION = 2;
const TRANSACTION_LOCK_VERSION = 3;
const TRANSACTION_LOCK_CLAIM_VERSION = 1;
const TRANSACTION_LOCK_LEASE_MS = 60_000;
const TRANSACTION_NONCE_RE = /^[0-9a-f]{32}$/u;
const TRANSACTION_LOCK_UNVERIFIED_INCARNATION = '00000000000000000000000000000000';
const TRANSACTION_DIGEST_RE = /^[0-9a-f]{64}$/u;
const RECOVERABLE_OWNER_KEYS = new Set();
const RECOVERABLE_ARTIFACTS = new Map();
const TRANSACTION_OUTPUTS = LANGS.flatMap((lang) => [
  { root: 'spec', name: OUT_FILES[lang] },
  { root: 'content', name: README_FILES[lang] },
]);
const TRANSACTION_OUTPUT_NAMES = new Set(TRANSACTION_OUTPUTS.map(({ name }) => name));
const TRANSACTION_STATE_KEYS = [
  'format', 'version', 'nonce', 'durability', 'phase',
  'backupIndex', 'installIndex', 'cleanupIndex', 'rollbackIndex', 'outputs',
];
const TRANSACTION_OUTPUT_KEYS = [
  'root', 'name', 'existed', 'oldLength', 'oldSha256', 'newLength', 'newSha256',
];
const TRANSACTION_LOCK_KEYS = ['format', 'version', 'pid', 'incarnation', 'nonce', 'leaseUntil'];
const TRANSACTION_LOCK_CLAIM_KEYS = [
  'format', 'version', 'pid', 'incarnation', 'nonce', 'createdAt', 'target',
];
// A missing OS start-time source is explicitly recorded as unverified. It is
// never treated as a reusable incarnation while the PID is live.
const PROCESS_INCARNATION = processStartIncarnation(process.pid);

function transactionJournalPath(specDir) {
  return path.join(specDir, TRANSACTION_JOURNAL_FILE);
}

function transactionLockPath(specDir) {
  return path.join(specDir, TRANSACTION_LOCK_FILE);
}

function transactionJournalTmpPath(specDir) {
  return path.join(specDir, TRANSACTION_JOURNAL_TMP_FILE);
}

function transactionArtifactName(name) {
  if (name === TRANSACTION_JOURNAL_FILE || name === TRANSACTION_JOURNAL_TMP_FILE) return true;
  return [...TRANSACTION_OUTPUT_NAMES].some((output) => {
    const escaped = output.replaceAll('.', '\\.');
    return new RegExp(`^\\.${escaped}\\.[0-9a-f]{32}(?:\\.[0-9a-f]{64})?\\.(?:tmp|bak)$`).test(name);
  });
}

function transactionArtifactPaths(specDir, contentDir) {
  const result = [];
  for (const directory of [specDir, contentDir]) {
    let entries;
    try { entries = fs.readdirSync(directory); } catch { continue; }
    for (const name of entries) {
      if (transactionArtifactName(name)) result.push(path.join(directory, name));
    }
  }
  return result;
}

function transactionOutputArtifactInfo(specDir, contentDir, filePath) {
  const directory = path.dirname(filePath);
  const name = path.basename(filePath);
  for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
    const output = TRANSACTION_OUTPUTS[index];
    const expectedDir = output.root === 'spec' ? specDir : contentDir;
    if (directory !== expectedDir) continue;
    const match = new RegExp(`^\\.${output.name.replaceAll('.', '\\.')}` +
      `\\.([0-9a-f]{32})(?:\\.([0-9a-f]{64}))?\\.(tmp|bak)$`, 'u').exec(name);
    if (match !== null) {
      return { index, nonce: match[1], digest: match[2] || null, kind: match[3] };
    }
  }
  return null;
}

function pendingTransactionPaths(specDir, contentDir) {
  const result = [];
  for (const directory of [specDir, contentDir]) {
    let entries;
    try { entries = fs.readdirSync(directory); } catch { continue; }
    for (const name of entries) {
      if (name === TRANSACTION_LOCK_FILE ||
          name === TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE ||
          name === `${TRANSACTION_LOCK_FILE}.claim` ||
          name === `${TRANSACTION_LOCK_FILE}.lease` ||
          name.startsWith(TRANSACTION_LOCK_CANDIDATE_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_OWNER_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_CLAIM_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_LEASE_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_RELEASE_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_QUARANTINE_PREFIX) || transactionArtifactName(name)) {
        result.push(path.join(directory, name));
      }
    }
  }
  return result;
}

function hashBytes(data) {
  return createHash('sha256').update(data).digest('hex');
}

function lstatRegularOrMissing(filePath, label) {
  let stat;
  try { stat = fs.lstatSync(filePath); } catch (e) {
    if (e.code === 'ENOENT') return null;
    fail(`cannot inspect ${label} ${filePath}: ${e.message}`);
  }
  if (!stat.isFile()) {
    const kind = stat.isSymbolicLink() ? 'symlink' : 'special file';
    fail(`cannot use ${label} ${filePath}: it is not a regular file (${kind})`);
  }
  return stat;
}

function readRegularBytes(filePath, label) {
  if (lstatRegularOrMissing(filePath, label) === null) return null;
  try { return fs.readFileSync(filePath); } catch (e) {
    fail(`cannot read ${label} ${filePath}: ${e.message}`);
  }
}

function directorySyncSupport() {
  return process.platform === 'win32' ? 'file-only-platform-limited' : 'directory-fsync';
}

function syncDirectory(directory) {
  let fd;
  try {
    fd = fs.openSync(directory, 'r');
    fs.fsyncSync(fd);
    return true;
  } catch (e) {
    if (process.platform === 'win32' && ['EBADF', 'EISDIR', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(e.code)) return false;
    if (['EISDIR', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(e.code)) {
      throw new Error(`directory fsync is unavailable for ${directory}; refusing to claim durable transaction ordering`, { cause: e });
    }
    throw e;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function syncOutputDirectories(specDir, contentDir) {
  const syncedSpec = syncDirectory(specDir);
  const syncedContent = syncDirectory(contentDir);
  if ((!syncedSpec || !syncedContent) && process.platform !== 'win32') {
    fail('directory fsync is unavailable; refusing to claim durable transaction ordering');
  }
}

function writeAllSync(fd, data, writeSync = fs.writeSync) {
  let offset = 0;
  while (offset < data.length) {
    const written = writeSync(fd, data, offset, data.length - offset);
    if (!Number.isSafeInteger(written) || written <= 0) {
      fail(`synchronous write made zero progress at byte offset ${offset}`);
    }
    if (written > data.length - offset) {
      fail(`synchronous write exceeded the requested length at byte offset ${offset}`);
    }
    offset += written;
  }
}

function removeExactRegular(filePath, label, syncDir = null, unlinkSync = fs.unlinkSync) {
  if (lstatRegularOrMissing(filePath, label) === null) return false;
  unlinkSync(filePath);
  if (syncDir !== null) syncDirectory(syncDir);
  return true;
}

// Metadata files are private until their final record is published. Cleanup
// after a failed write must not depend on another fsync succeeding, otherwise
// the failed publication can poison the next acquisition attempt.
function removePrivateRegularBestEffort(filePath, unlinkSync = fs.unlinkSync) {
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isFile()) unlinkSync(filePath);
    return true;
  } catch {
    // Preserve the original metadata-write error. A non-regular replacement
    // is left untouched rather than being treated as our private temporary.
    return false;
  }
}

function removeOwnedLockRecordBestEffort(filePath, owner, claim = false,
                                        unlinkSync = fs.unlinkSync) {
  try {
    if (lstatRegularOrMissing(filePath, 'transaction lock artifact') === null) return true;
    const value = claim ? readLockClaim(filePath, 'transaction lock artifact')
      : readLock(filePath, 'transaction lock artifact');
    const owned = claim ? lockClaimEqual(value, owner) : lockIdentityEqual(value, owner);
    return !owned || removePrivateRegularBestEffort(filePath, unlinkSync);
  } catch {
    // Never remove an artifact whose ownership cannot be established.
    return false;
  }
}

function ownerRecoveryKey(specDir, owner) {
  return `${path.resolve(specDir)}:${owner.pid}:${owner.incarnation}:${owner.nonce}`;
}

function rememberOwnerRecovery(specDir, owner) {
  RECOVERABLE_OWNER_KEYS.add(ownerRecoveryKey(specDir, owner));
}

function forgetOwnerRecovery(specDir, owner) {
  RECOVERABLE_OWNER_KEYS.delete(ownerRecoveryKey(specDir, owner));
}

function ownerRecoveryPending(specDir, owner) {
  return RECOVERABLE_OWNER_KEYS.has(ownerRecoveryKey(specDir, owner));
}

function rememberRecoverableArtifact(filePath, owner) {
  RECOVERABLE_ARTIFACTS.set(path.resolve(filePath), {
    pid: owner.pid, incarnation: owner.incarnation, nonce: owner.nonce,
  });
}

function forgetRecoverableArtifact(filePath) {
  RECOVERABLE_ARTIFACTS.delete(path.resolve(filePath));
}

function recoverableArtifactPending(filePath) {
  return RECOVERABLE_ARTIFACTS.has(path.resolve(filePath));
}

function recoverableArtifactBelongsToCurrentProcess(filePath, options) {
  const owner = RECOVERABLE_ARTIFACTS.get(path.resolve(filePath));
  return owner !== undefined && owner.pid === process.pid &&
    owner.incarnation === lockIncarnationForOwner(options, process.pid);
}

function cleanRecoverableMetadata(specDir, options) {
  for (const [filePath, identity] of RECOVERABLE_ARTIFACTS) {
    if (path.dirname(filePath) !== path.resolve(specDir) ||
        identity.pid !== process.pid ||
        identity.incarnation !== lockIncarnationForOwner(options, process.pid)) continue;
    const name = path.basename(filePath);
    if (!name.includes(`${TRANSACTION_LOCK_FILE}.candidate.`) &&
        !name.includes(`${TRANSACTION_LOCK_FILE}.owner.`) &&
        !name.includes(`${TRANSACTION_LOCK_FILE}.claim.`) &&
        !name.includes(`${TRANSACTION_LOCK_FILE}.lease.`)) continue;
    try {
      const value = name.includes(`${TRANSACTION_LOCK_FILE}.claim.`)
        ? readLockClaim(filePath, 'resumable transaction lock claim')
        : readLock(filePath, 'resumable transaction lock artifact');
      if (value.pid !== identity.pid || value.incarnation !== identity.incarnation ||
          value.nonce !== identity.nonce) continue;
      removeExactRegular(filePath, 'resumable transaction lock artifact', specDir,
        options.unlinkSync || fs.unlinkSync);
      forgetRecoverableArtifact(filePath);
    } catch {
      // Leave a changed or unreadable replacement untouched.
    }
  }
}

function cleanupFailedLockOwnerArtifacts(specDir, owner, options = {}) {
  const unlinkSync = options.unlinkSync || fs.unlinkSync;
  for (const filePath of [
    lockCandidatePath(specDir, owner),
    lockOwnerPath(specDir, owner),
    lockLeasePath(specDir, owner),
    transactionLockPath(specDir),
  ]) {
    if (recoverableArtifactPending(filePath)) continue;
    if (!removeOwnedLockRecordBestEffort(filePath, owner, false, unlinkSync)) {
      rememberOwnerRecovery(specDir, owner);
    }
  }
}

function removeJournal(journalPath, specDir) {
  removeExactRegular(journalPath, 'transaction journal', specDir);
  syncDirectory(specDir);
}

function journalStateJson(state) {
  return JSON.stringify(state) + '\n';
}

function writeJournalSnapshot(specDir, state, journalExists, writeSync = fs.writeSync,
                              guard = null, unlinkSync = fs.unlinkSync) {
  const journalPath = transactionJournalPath(specDir);
  const tmpPath = transactionJournalTmpPath(specDir);
  if (guard !== null) guard();
  // A tmp file is never published. It is safe to replace only after lstat has
  // proved that it is a regular file under the already validated root.
  removeExactRegular(tmpPath, 'unpublished transaction journal temporary', specDir, unlinkSync);
  const fd = fs.openSync(tmpPath, 'wx', 0o600);
  try {
    const data = Buffer.from(journalStateJson(state), 'utf8');
    writeAllSync(fd, data, writeSync);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const written = readRegularBytes(tmpPath, 'unpublished transaction journal temporary');
  if (Buffer.compare(written, Buffer.from(journalStateJson(state), 'utf8')) !== 0) {
    fail('transaction journal temporary was not written completely; ambiguous data was left untouched');
  }
  fs.renameSync(tmpPath, journalPath);
  syncDirectory(specDir);
  if (!journalExists) lstatRegularOrMissing(journalPath, 'transaction journal');
}

function exactObjectKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && Object.keys(value).every((key, i) => key === keys[i]);
}

function validDigest(value) {
  return typeof value === 'string' && TRANSACTION_DIGEST_RE.test(value);
}

function validateJournalState(state, specDir, contentDir) {
  if (!exactObjectKeys(state, TRANSACTION_STATE_KEYS) ||
      state.format !== TRANSACTION_FORMAT || state.version !== TRANSACTION_VERSION ||
      !TRANSACTION_NONCE_RE.test(state.nonce) ||
      (state.durability !== 'directory-fsync' && state.durability !== 'file-only-platform-limited') ||
      !['prepared', 'backing-up', 'installing', 'committed', 'cleaning', 'rollback'].includes(state.phase) ||
      !Number.isSafeInteger(state.backupIndex) || !Number.isSafeInteger(state.installIndex) ||
      !Number.isSafeInteger(state.cleanupIndex) || !Number.isSafeInteger(state.rollbackIndex) ||
      !Array.isArray(state.outputs) || state.outputs.length !== TRANSACTION_OUTPUTS.length) {
    fail('transaction journal has an invalid schema; ambiguous data was left untouched');
  }
  const existingCount = TRANSACTION_OUTPUTS.filter(({ root, name }) => {
    const item = state.outputs.find((output) => output.root === root && output.name === name);
    return item?.existed === true;
  }).length;
  for (let i = 0; i < state.outputs.length; i++) {
    const item = state.outputs[i];
    const expected = TRANSACTION_OUTPUTS[i];
    if (!exactObjectKeys(item, TRANSACTION_OUTPUT_KEYS) || item.root !== expected.root ||
        item.name !== expected.name || typeof item.existed !== 'boolean' ||
        !Number.isSafeInteger(item.newLength) || item.newLength < 0 || !validDigest(item.newSha256) ||
        (item.existed
          ? (!Number.isSafeInteger(item.oldLength) || item.oldLength < 0 || !validDigest(item.oldSha256))
          : (item.oldLength !== null || item.oldSha256 !== null))) {
      fail('transaction journal has invalid or duplicate output records; ambiguous data was left untouched');
    }
  }
  const inRange = (n, max) => n >= 0 && n <= max;
  if (!inRange(state.backupIndex, existingCount) || !inRange(state.installIndex, 6) ||
      !inRange(state.cleanupIndex, 6) || !inRange(state.rollbackIndex, 6)) {
    fail('transaction journal has invalid phase indexes; ambiguous data was left untouched');
  }
  if (state.phase === 'prepared' &&
      (state.backupIndex !== 0 || state.installIndex !== 0 || state.cleanupIndex !== 0 || state.rollbackIndex !== 0)) {
    fail('transaction journal has invalid prepared ordering; ambiguous data was left untouched');
  }
  if (state.phase === 'backing-up' && (state.installIndex !== 0 || state.cleanupIndex !== 0 || state.rollbackIndex !== 0)) {
    fail('transaction journal has invalid backup ordering; ambiguous data was left untouched');
  }
  if (state.phase === 'installing' && (state.backupIndex !== existingCount || state.cleanupIndex !== 0 || state.rollbackIndex !== 0)) {
    fail('transaction journal has invalid install ordering; ambiguous data was left untouched');
  }
  if ((state.phase === 'committed' || state.phase === 'cleaning') &&
      (state.backupIndex !== existingCount || state.installIndex !== 6 || state.rollbackIndex !== 0)) {
    fail('transaction journal has invalid commit ordering; ambiguous data was left untouched');
  }
  if (state.phase === 'rollback' && state.rollbackIndex > 6) {
    fail('transaction journal has invalid rollback ordering; ambiguous data was left untouched');
  }
  // The journal contains no paths. These derived paths are checked here so a
  // later operation cannot accidentally acquire a path from untrusted data.
  for (let i = 0; i < TRANSACTION_OUTPUTS.length; i++) {
    const { root, name } = TRANSACTION_OUTPUTS[i];
    const directory = root === 'spec' ? specDir : contentDir;
    for (const suffix of ['tmp', 'bak']) {
      const candidateName = suffix === 'tmp'
        ? `.${name}.${state.nonce}.${state.outputs[i].newSha256}.tmp`
        : `.${name}.${state.nonce}.bak`;
      const candidate = path.join(directory, candidateName);
      if (path.dirname(candidate) !== directory || path.basename(candidate) !== candidateName) {
        fail('transaction journal derived an unexpected artifact path; ambiguous data was left untouched');
      }
    }
  }
}

function readTransactionJournal(specDir, contentDir) {
  const journalPath = transactionJournalPath(specDir);
  let source;
  try {
    lstatRegularOrMissing(journalPath, 'transaction journal');
    source = fs.readFileSync(journalPath);
  } catch (e) {
    fail(`cannot read transaction journal: ${e.message}; ambiguous data was left untouched`);
  }
  let state;
  try { state = JSON.parse(utf8Strict.decode(source)); } catch (e) {
    fail(`transaction journal is corrupt: ${e.message}; ambiguous data was left untouched`);
  }
  if (Buffer.compare(source, Buffer.from(journalStateJson(state), 'utf8')) !== 0) {
    fail('transaction journal is not a canonical complete snapshot; ambiguous data was left untouched');
  }
  validateJournalState(state, specDir, contentDir);
  return state;
}

function outputPaths(specDir, contentDir, state, index) {
  const { root, name } = TRANSACTION_OUTPUTS[index];
  const directory = root === 'spec' ? specDir : contentDir;
  return {
    destination: path.join(directory, name),
    temp: path.join(directory, `.${name}.${state.nonce}.${state.outputs[index].newSha256}.tmp`),
    backup: path.join(directory, `.${name}.${state.nonce}.bak`),
  };
}

function transactionOutputBytes(bufs, readmeBufs) {
  return TRANSACTION_OUTPUTS.map(({ root, name }) => Buffer.from(
    root === 'spec'
      ? bufs[LANGS.find((lang) => OUT_FILES[lang] === name)]
      : readmeBufs[LANGS.find((lang) => README_FILES[lang] === name)]));
}

function assertDigest(data, length, digest, label) {
  if (data === null || data.length !== length || hashBytes(data) !== digest) {
    fail(`${label} has an unexpected length or digest; ambiguous data was left untouched`);
  }
}

function ensureAbsent(filePath, label) {
  const stat = lstatRegularOrMissing(filePath, label);
  if (stat !== null) fail(`${label} ${filePath} already exists; ambiguous data was left untouched`);
}

function verifyNew(item, bytes, label) {
  assertDigest(bytes, item.newLength, item.newSha256, label);
}

function verifyOld(item, bytes, label) {
  if (!item.existed) fail(`${label} exists although the original was missing; ambiguous data was left untouched`);
  assertDigest(bytes, item.oldLength, item.oldSha256, label);
}

function cleanJournalTmpIfSafe(specDir, unlinkSync = fs.unlinkSync) {
  const tmp = transactionJournalTmpPath(specDir);
  removeExactRegular(tmp, 'unpublished transaction journal temporary', specDir, unlinkSync);
}

function cleanUnpublishedOutputTemps(specDir, contentDir, orphanPaths, options, guard) {
  const temps = [];
  for (const filePath of orphanPaths) {
    const info = transactionOutputArtifactInfo(specDir, contentDir, filePath);
    if (info === null) {
      fail(`found an unrecognized transaction artifact without ${TRANSACTION_JOURNAL_FILE}: ${filePath}; ambiguous data was left untouched`);
    }
    if (info.kind === 'bak') {
      fail(`found transaction backup without ${TRANSACTION_JOURNAL_FILE}: ${filePath}; backups are never removed without a journal`);
    }
    temps.push({ filePath, ...info });
  }
  if (temps.length === 0) return;
  const nonces = new Set(temps.map((temp) => temp.nonce));
  if (nonces.size !== 1) {
    fail(`unpublished transaction temporaries have ambiguous nonces: ${[...nonces].join(', ')}; data was left untouched`);
  }
  const tempNonce = nonces.values().next().value;
  const currentOwner = options.owner;
  const currentOwnerTemps = currentOwner !== null && currentOwner !== undefined &&
    ownerIsCurrentProcess(currentOwner, options)
    ? temps.filter((temp) => temp.nonce === currentOwner.nonce) : [];
  const reclaimedOwners = Array.isArray(options.reclaimedOwners)
    ? options.reclaimedOwners : [];
  const reclaimedTempOwners = reclaimedOwners.filter((owner) => owner.nonce === tempNonce);
  if (reclaimedTempOwners.length === 0 && currentOwnerTemps.length === 0) {
    fail(`unpublished transaction temporaries have no provably dead owner; data was left untouched`);
  }
  const reclaimRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `reclaim\\.([0-9a-f]{32})\\.[0-9a-f]{32}$`, 'u');
  const hasReclaimIntent = lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)
    .some((markerPath) => {
      const match = reclaimRe.exec(path.basename(markerPath));
      if (match === null) return false;
      const owner = (() => {
        try { return readLock(markerPath, 'transaction lock reclaim record'); } catch { return null; }
      })();
      return owner !== null && owner.nonce === tempNonce && owner.nonce === match[1] &&
        reclaimedTempOwners.some((candidate) => lockIdentityEqual(candidate, owner));
    });
  if (reclaimedTempOwners.length > 0 && !hasReclaimIntent && currentOwnerTemps.length === 0) {
    fail(`unpublished transaction temporaries have no matching reclaim intent; data was left untouched`);
  }
  for (const owner of reclaimedTempOwners) {
    if (lockIsActive(specDir, owner, lockNow(options.now), options)) {
      fail(`unpublished transaction temporary belongs to live process ${owner.pid}; data was left untouched`);
    }
  }
  for (const temp of temps) {
    if (temp.digest === null && !currentOwnerTemps.includes(temp)) {
      fail(`unpublished transaction temporary ${temp.filePath} has no derived digest; data was left untouched`);
    }
  }
  for (const temp of temps) {
    guard();
    removeExactRegular(temp.filePath, 'unpublished transaction output temporary',
      path.dirname(temp.filePath), options.unlinkSync || fs.unlinkSync);
  }
}

function cleanupPreJournalArtifacts(specDir, temporaryPaths, options, guard) {
  const unlinkSync = options.unlinkSync || fs.unlinkSync;
  let cleaned = true;
  for (const temp of temporaryPaths) {
    try {
      guard();
      removeExactRegular(temp, 'transaction temporary', path.dirname(temp), unlinkSync);
    } catch {
      // Preserve the original write error; the next owner will retry exact names.
      cleaned = false;
    }
  }
  try {
    guard();
    cleanJournalTmpIfSafe(specDir, unlinkSync);
  } catch {
    // Preserve the original write error; the next owner will retry the journal tmp.
    cleaned = false;
  }
  return cleaned;
}

function cleanReclaimedOwnerMarkers(specDir, options) {
  if (!Array.isArray(options.reclaimedOwners) || options.reclaimedOwners.length === 0) return;
  const reclaimRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `reclaim\\.([0-9a-f]{32})\\.[0-9a-f]{32}$`, 'u');
  for (const markerPath of lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)) {
    const match = reclaimRe.exec(path.basename(markerPath));
    if (match === null) continue;
    const owner = readLock(markerPath, 'transaction lock reclaim record');
    if (owner.nonce !== match[1]) {
      fail('transaction lock reclaim record name does not match its record; ambiguous data was left untouched');
    }
    if (!options.reclaimedOwners.some((candidate) => lockIdentityEqual(candidate, owner))) continue;
    cleanReleaseOwnerArtifacts(specDir, owner, lockNow(options.now), options);
  }
}

function beginRollback(specDir, contentDir, state, journalExists, writeSync, guard) {
  state.phase = 'rollback';
  state.rollbackIndex = 0;
  writeJournalSnapshot(specDir, state, journalExists, writeSync, guard);
}

function rollbackOne(specDir, contentDir, state, index, guard, unlinkSync = fs.unlinkSync) {
  const item = state.outputs[index];
  const paths = outputPaths(specDir, contentDir, state, index);
  const destination = readRegularBytes(paths.destination, 'transaction destination');
  const backup = readRegularBytes(paths.backup, 'transaction backup');
  const temporary = lstatRegularOrMissing(paths.temp, 'transaction temporary') !== null;

  if (backup !== null) {
    verifyOld(item, backup, 'transaction backup');
    if (destination !== null) {
      verifyNew(item, destination, 'installed transaction output');
      validateWriteRoots(specDir, contentDir);
      guard();
      removeExactRegular(paths.destination, 'installed transaction output', path.dirname(paths.destination));
    }
    ensureAbsent(paths.destination, 'transaction destination');
    lstatRegularOrMissing(paths.backup, 'transaction backup');
    validateWriteRoots(specDir, contentDir);
    guard();
    fs.renameSync(paths.backup, paths.destination);
    if (readRegularBytes(paths.destination, 'restored transaction destination') === null) {
      fail('restored transaction destination disappeared; ambiguous data was left untouched');
    }
    syncDirectory(path.dirname(paths.destination));
    verifyOld(item, readRegularBytes(paths.destination, 'restored transaction destination'), 'restored transaction destination');
  } else if (item.existed) {
    if (destination === null) {
      fail(`missing transaction backup for ${paths.destination}; ambiguous data was left untouched`);
    }
    verifyOld(item, destination, 'original transaction destination');
  } else if (destination !== null) {
    verifyNew(item, destination, 'installed transaction output');
    validateWriteRoots(specDir, contentDir);
    guard();
    removeExactRegular(paths.destination, 'installed transaction output', path.dirname(paths.destination));
  }

  if (temporary) {
    validateWriteRoots(specDir, contentDir);
    guard();
    removeExactRegular(paths.temp, 'transaction temporary', path.dirname(paths.temp), unlinkSync);
  }
}

function rollbackTransaction(specDir, contentDir, state, writeSync, guard, unlinkSync = fs.unlinkSync) {
  const errors = [];
  // Re-checking all six exact derived names makes rollback idempotent after a
  // crash between a restore and its snapshot. The cursor is informational;
  // actual bytes, not an untrusted cursor, decide every operation.
  state.rollbackIndex = 0;
  for (let index = TRANSACTION_OUTPUTS.length - 1; index >= 0; index--) {
    try {
      rollbackOne(specDir, contentDir, state, index, guard, unlinkSync);
      syncOutputDirectories(specDir, contentDir);
      state.rollbackIndex++;
      writeJournalSnapshot(specDir, state, true, writeSync, guard);
    } catch (e) {
      const backup = outputPaths(specDir, contentDir, state, index).backup;
      errors.push(`${TRANSACTION_OUTPUTS[index].root}/${TRANSACTION_OUTPUTS[index].name}: could not restore backup ${backup}: ${e.message}`);
    }
  }
  return errors;
}

function completeOne(specDir, contentDir, state, index, guard, unlinkSync = fs.unlinkSync) {
  const item = state.outputs[index];
  const paths = outputPaths(specDir, contentDir, state, index);
  let destination = readRegularBytes(paths.destination, 'transaction destination');
  const temporary = readRegularBytes(paths.temp, 'transaction temporary');
  if (destination === null) {
    if (temporary === null) fail(`missing committed output ${paths.destination}; ambiguous data was left untouched`);
    verifyNew(item, temporary, 'transaction temporary');
    ensureAbsent(paths.destination, 'transaction destination');
    validateWriteRoots(specDir, contentDir);
    guard();
    fs.renameSync(paths.temp, paths.destination);
    syncDirectory(path.dirname(paths.destination));
    destination = readRegularBytes(paths.destination, 'committed transaction destination');
  } else {
    verifyNew(item, destination, 'committed transaction destination');
    if (temporary !== null) fail(`both committed output and temporary exist for ${paths.destination}; ambiguous data was left untouched`);
  }
  verifyNew(item, destination, 'committed transaction destination');
  const backup = readRegularBytes(paths.backup, 'transaction backup');
  if (backup !== null) {
    verifyOld(item, backup, 'transaction backup');
    validateWriteRoots(specDir, contentDir);
    guard();
    removeExactRegular(paths.backup, 'transaction backup', path.dirname(paths.backup), unlinkSync);
  }
}

function recoverCommittedTransaction(specDir, contentDir, state, writeSync, guard, unlinkSync = fs.unlinkSync) {
  if (state.phase === 'committed') {
    state.phase = 'cleaning';
    state.cleanupIndex = 0;
    writeJournalSnapshot(specDir, state, true, writeSync, guard);
  }
  for (let index = state.cleanupIndex; index < TRANSACTION_OUTPUTS.length; index++) {
    completeOne(specDir, contentDir, state, index, guard, unlinkSync);
    syncOutputDirectories(specDir, contentDir);
    state.cleanupIndex = index + 1;
    writeJournalSnapshot(specDir, state, true, writeSync, guard);
  }
  guard();
  removeJournal(transactionJournalPath(specDir), specDir);
}

function windowsProcessStart(pid) {
  try {
    const startTime = execFileSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; ` +
      'if ($null -eq $p) { exit 3 }; ' +
      '[Console]::Out.Write($p.StartTime.ToUniversalTime().Ticks)',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^\d+$/u.test(startTime) ? startTime : null;
  } catch (e) {
    return e.status === 3 ? { dead: true } : null;
  }
}

function processStartIncarnation(pid) {
  let startTime;
  if (process.platform === 'linux') {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const close = stat.lastIndexOf(')');
      if (close === -1) return null;
      const fields = stat.slice(close + 2).trim().split(/\s+/u);
      startTime = fields[19];
    } catch {
      return null;
    }
  } else if (process.platform === 'win32') {
    startTime = windowsProcessStart(pid);
    if (startTime === null || startTime?.dead === true) return null;
  } else {
    return null;
  }
  try {
    if (!/^\d+$/u.test(startTime)) return null;
    return createHash('sha256').update(`${process.platform}:${pid}:${startTime}`).digest('hex').slice(0, 32);
  } catch {
    return null;
  }
}

function observedProcessIncarnation(pid, options = {}) {
  if (options.processIncarnation !== undefined) {
    const value = typeof options.processIncarnation === 'function'
      ? options.processIncarnation(pid) : options.processIncarnation;
    if (value === null) return null;
    if (typeof value !== 'string' || !TRANSACTION_NONCE_RE.test(value)) {
      fail('transaction process-incarnation hook returned an invalid token');
    }
    return value;
  }
  return pid === process.pid ? PROCESS_INCARNATION : processStartIncarnation(pid);
}

function lockCandidatePath(specDir, owner) {
  return path.join(specDir, `${TRANSACTION_LOCK_CANDIDATE_PREFIX}${owner.nonce}`);
}

function lockCandidateTempPath(specDir, owner) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_CANDIDATE_PREFIX}${owner.pid}.${owner.incarnation}.${owner.nonce}.tmp`);
}

function lockOwnerPath(specDir, owner) {
  return path.join(specDir, `${TRANSACTION_LOCK_OWNER_PREFIX}${owner.nonce}`);
}

function lockLeasePath(specDir, owner) {
  return path.join(specDir, `${TRANSACTION_LOCK_LEASE_PREFIX}${owner.nonce}`);
}

function lockLeaseTmpPath(specDir, owner) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_LEASE_PREFIX}${owner.pid}.${owner.incarnation}.${owner.nonce}.tmp`);
}

function lockReleasePath(specDir, owner) {
  return path.join(specDir, `${TRANSACTION_LOCK_RELEASE_PREFIX}${owner.nonce}`);
}

function lockClaimTmpPath(specDir, target, claim) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_CLAIM_PREFIX}${claim.pid}.${claim.incarnation}.${target.nonce}.${claim.nonce}.tmp`);
}

function lockClaimPathForTarget(specDir, target) {
  return path.join(specDir, `${TRANSACTION_LOCK_CLAIM_PREFIX}${target.nonce}`);
}

function lockReclaimerNonce(options = {}) {
  const nonce = options.reclaimerNonce;
  if (nonce !== undefined) {
    if (!TRANSACTION_NONCE_RE.test(nonce)) fail('transaction reclaimer hook returned an invalid token');
    return nonce;
  }
  return randomBytes(16).toString('hex');
}

function lockClaimQuarantinePath(specDir, claim, options, phase) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_QUARANTINE_PREFIX}claim.${lockReclaimerNonce(options)}.` +
    `${claim.target.nonce}.${claim.nonce}.${phase}`);
}

function lockRecordQuarantinePath(specDir, record, options, kind) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_QUARANTINE_PREFIX}${kind}.${lockReclaimerNonce(options)}.${record.nonce}`);
}

const TRANSACTION_LOCK_QUARANTINE_PHASES = new Set([
  'stale-claim', 'quarantine-cleanup', 'target-missing', 'target-changed',
  'target-replaced',
  'reclaim-complete', 'acquisition-cleanup', 'owner-live',
]);

function quarantineRecordKindIsDerived(kind) {
  if (new Set([
    'stale-claim', 'acquisition-cleanup', 'release-claim', 'release-complete',
    `legacy-${TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE}`,
    `legacy-${TRANSACTION_LOCK_FILE}.claim`,
    `legacy-${TRANSACTION_LOCK_FILE}.lease`,
  ]).has(kind)) return true;
  if (/^reclaim-(?:owner|legacy)-[0-9a-f]{8}$/u.test(kind) ||
      /^quarantine-cleanup-[0-9a-f]{8}$/u.test(kind)) return true;
  const releaseCleanup = /^release-cleanup-(.*)$/u.exec(kind);
  if (releaseCleanup === null) return false;
  const escapedReleasePrefix = TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.');
  return new RegExp(
    `^${escapedReleasePrefix}(?:[0-9a-f]{32}\\.(?:candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)|` +
    `reclaim\\.[0-9a-f]{32}\\.[0-9a-f]{32})$`, 'u').test(releaseCleanup[1]);
}

function quarantineDescriptor(name) {
  const escapedPrefix = TRANSACTION_LOCK_QUARANTINE_PREFIX.replaceAll('.', '\\.');
  const claim = new RegExp(
    `^${escapedPrefix}claim\\.([0-9a-f]{32})\\.([0-9a-f]{32})\\.([0-9a-f]{32})\\.` +
    `(${[...TRANSACTION_LOCK_QUARANTINE_PHASES].join('|')})$`, 'u').exec(name);
  if (claim !== null) {
    return {
      type: 'claim', reclaimerNonce: claim[1], targetNonce: claim[2], claimNonce: claim[3],
      phase: claim[4],
    };
  }
  const legacy = new RegExp(
    `^${escapedPrefix}legacy\\.([0-9a-f]{32})\\.([0-9a-f]{16})$`, 'u').exec(name);
  if (legacy !== null) {
    return { type: 'legacy', reclaimerNonce: legacy[1], digest: legacy[2] };
  }
  const record = new RegExp(
    `^${escapedPrefix}(.+)\\.([0-9a-f]{32})\\.([0-9a-f]{32})$`, 'u').exec(name);
  if (record !== null && quarantineRecordKindIsDerived(record[1])) {
    return { type: 'record', kind: record[1], reclaimerNonce: record[2], recordNonce: record[3] };
  }
  return null;
}

function releaseQuarantineBelongsToOwner(descriptor, owner) {
  if (descriptor?.type !== 'record') return false;
  if (descriptor.kind === 'release-claim' || descriptor.kind === 'release-complete') {
    return descriptor.reclaimerNonce.length === 32 && descriptor.recordNonce === owner.nonce;
  }
  const cleanup = /^release-cleanup-(.*)$/u.exec(descriptor.kind);
  if (cleanup === null) return false;
  const sourceName = cleanup[1];
  const source = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `([0-9a-f]{32})\\.(?:candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)$`, 'u'
  ).exec(sourceName);
  const reclaim = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `reclaim\\.([0-9a-f]{32})\\.[0-9a-f]{32}$`, 'u'
  ).exec(sourceName);
  return (source !== null && source[1] === owner.nonce) ||
    (reclaim !== null && reclaim[1] === owner.nonce);
}

function lockNow(now) {
  const value = typeof now === 'function' ? now() : now === undefined ? Date.now() : now;
  if (!Number.isSafeInteger(value) || value < 0) fail('transaction lock clock returned an invalid timestamp');
  return value;
}

function lockJson(value) {
  return JSON.stringify(value) + '\n';
}

function lockIdentityEqual(left, right) {
  return left.format === right.format && left.version === right.version &&
    left.pid === right.pid && left.incarnation === right.incarnation && left.nonce === right.nonce;
}

function lockClaimEqual(left, right) {
  return lockIdentityEqual(left.target, right.target) &&
    left.pid === right.pid && left.incarnation === right.incarnation &&
    left.nonce === right.nonce && left.createdAt === right.createdAt;
}

function lockIncarnationForOwner(options = {}, pid = process.pid) {
  return observedProcessIncarnation(pid, options) || TRANSACTION_LOCK_UNVERIFIED_INCARNATION;
}

function ownerIsCurrentProcess(owner, options = {}) {
  return owner.pid === process.pid &&
    owner.incarnation === lockIncarnationForOwner(options, process.pid);
}

function rememberReclaimedOwner(options, owner) {
  if (!Array.isArray(options.reclaimedOwners)) return;
  if (!options.reclaimedOwners.some((candidate) => lockIdentityEqual(candidate, owner))) {
    options.reclaimedOwners.push({ ...owner });
  }
}

function pidIsLive(pid) {
  if (process.platform === 'win32' && pid !== process.pid) {
    const processStart = windowsProcessStart(pid);
    if (processStart?.dead === true) return false;
    if (typeof processStart === 'string') return true;
    const incarnation = processStartIncarnation(pid);
    if (incarnation === null) {
      try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; }
    }
    return true;
  }
  try { process.kill(pid, 0); return true; } catch (e) {
    return e.code !== 'ESRCH';
  }
}

function readLock(lockPath, label = 'transaction lock') {
  const source = readLockMetadataBytes(lockPath, label);
  let value;
  try {
    value = JSON.parse(utf8Strict.decode(source));
  } catch (e) {
    fail(`${label} is corrupt: ${e.message}; no transaction mutation was attempted`);
  }
  if (Buffer.compare(source, Buffer.from(lockJson(value), 'utf8')) !== 0) {
    fail(`${label} is not a canonical complete record; no transaction mutation was attempted`);
  }
  if (!exactObjectKeys(value, TRANSACTION_LOCK_KEYS) || value.format !== TRANSACTION_LOCK_FORMAT ||
      value.version !== TRANSACTION_LOCK_VERSION || !Number.isSafeInteger(value.pid) || value.pid < 1 ||
      typeof value.incarnation !== 'string' || !TRANSACTION_NONCE_RE.test(value.incarnation) ||
      !TRANSACTION_NONCE_RE.test(value.nonce) || !Number.isSafeInteger(value.leaseUntil) || value.leaseUntil < 0) {
    fail(`${label} has an invalid schema; no transaction mutation was attempted`);
  }
  return value;
}

function readLockMetadataBytes(filePath, label) {
  if (lstatRegularOrMissing(filePath, label) === null) {
    const error = new Error(
      `${label} disappeared before it could be read; no transaction mutation was attempted`);
    error.code = 'ENOENT';
    throw error;
  }
  try {
    return fs.readFileSync(filePath);
  } catch (e) {
    const error = new Error(
      `${label} cannot be read: ${e.message}; no transaction mutation was attempted`,
      { cause: e });
    error.code = e.code;
    throw error;
  }
}

function readLockClaim(claimPath, label = 'transaction lock claim') {
  const source = readLockMetadataBytes(claimPath, label);
  let value;
  try {
    value = JSON.parse(utf8Strict.decode(source));
  } catch (e) {
    fail(`${label} is corrupt: ${e.message}; no transaction mutation was attempted`);
  }
  if (Buffer.compare(source, Buffer.from(lockJson(value), 'utf8')) !== 0 ||
      !exactObjectKeys(value, TRANSACTION_LOCK_CLAIM_KEYS) ||
      value.format !== TRANSACTION_LOCK_CLAIM_FORMAT ||
      value.version !== TRANSACTION_LOCK_CLAIM_VERSION ||
      !Number.isSafeInteger(value.pid) || value.pid < 1 ||
      typeof value.incarnation !== 'string' || !TRANSACTION_NONCE_RE.test(value.incarnation) ||
      !TRANSACTION_NONCE_RE.test(value.nonce) ||
      !Number.isSafeInteger(value.createdAt) || value.createdAt < 0 ||
      value.target === null || typeof value.target !== 'object' ||
      !exactObjectKeys(value.target, TRANSACTION_LOCK_KEYS)) {
    fail(`${label} has an invalid schema; no transaction mutation was attempted`);
  }
  // Reuse the lock validator for the target without trusting any path from it.
  if (value.target.format !== TRANSACTION_LOCK_FORMAT ||
      value.target.version !== TRANSACTION_LOCK_VERSION ||
      !Number.isSafeInteger(value.target.pid) || value.target.pid < 1 ||
      typeof value.target.incarnation !== 'string' || !TRANSACTION_NONCE_RE.test(value.target.incarnation) ||
      !TRANSACTION_NONCE_RE.test(value.target.nonce) ||
      !Number.isSafeInteger(value.target.leaseUntil) || value.target.leaseUntil < 0) {
    fail(`${label} has an invalid target schema; no transaction mutation was attempted`);
  }
  return value;
}

function lockIsActive(specDir, lock, now, options = {}) {
  if (!pidIsLive(lock.pid)) return false;
  const leasePath = lockLeasePath(specDir, lock);
  const lease = lstatRegularOrMissing(leasePath, 'transaction lock lease') === null
    ? null : readLock(leasePath, 'transaction lock lease');
  if (lease !== null && !lockIdentityEqual(lease, lock)) {
    fail('transaction lock lease belongs to a different incarnation; no transaction mutation was attempted');
  }
  const leaseUntil = lease === null ? lock.leaseUntil : lease.leaseUntil;
  if (leaseUntil >= now) return true;
  const observed = observedProcessIncarnation(lock.pid, options);
  // An expired lease is not a death detector. A live matching incarnation is
  // still the owner, and an unknown incarnation is handled conservatively.
  return lock.incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
    observed === null || observed === lock.incarnation;
}

function lockClaimIsActive(claim, now, options) {
  if (!pidIsLive(claim.pid)) return false;
  const observed = observedProcessIncarnation(claim.pid, options);
  return claim.incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
    observed === null || observed === claim.incarnation;
}

function writeLockRecord(specDir, finalPath, tmpPath, value, label, writeSync,
                         unlinkSync = fs.unlinkSync) {
  let published = false;
  try {
    removeExactRegular(tmpPath, `unpublished ${label} temporary`, specDir);
    const fd = fs.openSync(tmpPath, 'wx', 0o600);
    try {
      writeAllSync(fd, Buffer.from(lockJson(value), 'utf8'), writeSync);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const written = readRegularBytes(tmpPath, `unpublished ${label} temporary`);
    if (Buffer.compare(written, Buffer.from(lockJson(value), 'utf8')) !== 0) {
      fail(`${label} temporary was not written completely; no transaction mutation was attempted`);
    }
    if (label === 'transaction lock claim') readLockClaim(tmpPath, label);
    else readLock(tmpPath, label);
    // A hard link is the cross-platform no-replace publication primitive for
    // a regular file. rename() would overwrite a concurrent fresh claim on
    // POSIX, destroying the serialization guarantee.
    try {
      fs.linkSync(tmpPath, finalPath);
    } catch (e) {
      if (e.code === 'EEXIST') {
        if (!removePrivateRegularBestEffort(tmpPath, unlinkSync)) {
          rememberRecoverableArtifact(tmpPath, value);
        }
        return false;
      }
      throw e;
    }
    published = true;
    removeExactRegular(tmpPath, `unpublished ${label} temporary`, specDir);
    syncDirectory(specDir);
    return true;
  } catch (error) {
    if (!removePrivateRegularBestEffort(tmpPath, unlinkSync)) {
      rememberRecoverableArtifact(tmpPath, value);
    }
    if (published && label === 'transaction lock claim') {
      if (!removeOwnedLockRecordBestEffort(finalPath, value, true, unlinkSync)) {
        rememberRecoverableArtifact(finalPath, value);
      }
    }
    throw error;
  }
}

function publishLockClaim(specDir, target, now, options) {
  const claimPath = lockClaimPathForTarget(specDir, target);
  const existing = lstatRegularOrMissing(claimPath, 'transaction lock claim');
  if (existing !== null) {
    let claim = null;
    let legacyOwner = null;
    try {
      claim = readLockClaim(claimPath);
    } catch (error) {
      try {
        legacyOwner = readLock(claimPath, 'transaction lock claim');
      } catch {
        throw error;
      }
      if (lockIsActive(specDir, legacyOwner, now, options)) {
        fail(`transaction is owned by live process ${legacyOwner.pid}; refusing concurrent write`);
      }
    }
    if (claim !== null && !lockIdentityEqual(claim.target, target)) {
      fail('transaction lock claim targets a different owner; ambiguous data was left untouched');
    }
    if (claim !== null && lockClaimIsActive(claim, now, options)) {
      fail(`transaction lock reclaim is already in progress by live process ${claim.pid}`);
    }
    const captured = claim === null
      ? captureExactLockRecord(specDir, claimPath, legacyOwner, options, 'stale-claim')
      : captureExactLockClaim(specDir, claimPath, claim, options, 'stale-claim');
    if (captured !== null) {
      removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir);
    }
  }

  const claim = {
    format: TRANSACTION_LOCK_CLAIM_FORMAT,
    version: TRANSACTION_LOCK_CLAIM_VERSION,
    pid: process.pid,
    incarnation: lockIncarnationForOwner(options),
    nonce: randomBytes(16).toString('hex'),
    createdAt: now,
    target,
  };
  const tmpPath = lockClaimTmpPath(specDir, target, claim);
  if (!writeLockRecord(specDir, claimPath, tmpPath, claim, 'transaction lock claim',
    options.writeSync || fs.writeSync, options.unlinkSync || fs.unlinkSync)) return null;
  try {
    setClaimCreationTime(claimPath, now);
  } catch (error) {
    if (!removeOwnedLockRecordBestEffort(claimPath, claim, true,
      options.unlinkSync || fs.unlinkSync)) {
      rememberRecoverableArtifact(claimPath, claim);
    }
    throw error;
  }
  return { path: claimPath, record: claim };
}

function restoreCapturedLock(specDir, capturedPath, targetPath) {
  if (lstatRegularOrMissing(targetPath, 'replacement transaction lock') !== null) {
    fail('transaction lock replacement appeared while restoring the captured record; ambiguous data was left untouched');
  }
  try {
    fs.linkSync(capturedPath, targetPath);
  } catch (e) {
    if (e.code === 'EEXIST') {
      fail('transaction lock replacement appeared while restoring the captured record; ambiguous data was left untouched');
    }
    throw e;
  }
  removeExactRegular(capturedPath, 'transaction lock captured record', specDir);
  syncDirectory(specDir);
}

function captureExactRecord(specDir, sourcePath, expected, quarantinePath, label,
                            readRecord, equalRecord, beforeCapture = null, afterCapture = null) {
  if (lstatRegularOrMissing(sourcePath, label) === null) return null;
  if (lstatRegularOrMissing(quarantinePath, 'transaction quarantine record') !== null) {
    fail('transaction quarantine record already exists; ambiguous data was left untouched');
  }
  const observed = readRecord(sourcePath, label);
  if (!equalRecord(observed, expected)) {
    fail(`${label} changed; refusing to remove another record`);
  }
  if (typeof beforeCapture === 'function') beforeCapture({ sourcePath, quarantinePath, record: expected });
  try {
    fs.renameSync(sourcePath, quarantinePath);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  try {
    const captured = readRecord(quarantinePath, 'transaction quarantine record');
    if (!equalRecord(captured, expected)) {
      restoreCapturedLock(specDir, quarantinePath, sourcePath);
      fail(`${label} replacement was captured; no transaction mutation was attempted`);
    }
  } catch (error) {
    if (lstatRegularOrMissing(quarantinePath, 'transaction quarantine record') !== null &&
        lstatRegularOrMissing(sourcePath, label) === null) {
      restoreCapturedLock(specDir, quarantinePath, sourcePath);
    }
    throw error;
  }
  if (typeof afterCapture === 'function') {
    afterCapture({ sourcePath, quarantinePath, record: expected });
  }
  return { quarantinePath, sourcePath };
}

function captureExactLockClaim(specDir, claimPath, expected, options, phase) {
  return captureExactRecord(
    specDir, claimPath, expected,
    lockClaimQuarantinePath(specDir, expected, options, phase),
    'transaction lock claim',
    readLockClaim, lockClaimEqual,
    options.onLockClaimBeforeCapture || options.onReclaimerClaimBeforeCapture,
    options.onLockClaimCaptured || options.onReclaimerClaimCaptured);
}

function captureExactLockRecord(specDir, recordPath, expected, options, kind) {
  return captureExactRecord(
    specDir, recordPath, expected,
    lockRecordQuarantinePath(specDir, expected, options, kind),
    'transaction lock record',
    readLock, lockIdentityEqual,
    options.onLockRecordBeforeCapture, options.onLockRecordCaptured);
}

function captureExactBytes(specDir, sourcePath, expected, quarantinePath, label, options) {
  if (lstatRegularOrMissing(sourcePath, label) === null) return null;
  if (lstatRegularOrMissing(quarantinePath, 'transaction quarantine record') !== null) {
    fail('transaction quarantine record already exists; ambiguous data was left untouched');
  }
  const before = readRegularBytes(sourcePath, label);
  if (before === null || Buffer.compare(before, expected) !== 0) {
    fail(`${label} changed; refusing to remove another record`);
  }
  const hook = options.onLockRecordBeforeCapture;
  if (typeof hook === 'function') hook({ sourcePath, quarantinePath, record: expected });
  try {
    fs.renameSync(sourcePath, quarantinePath);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  const captured = readRegularBytes(quarantinePath, 'transaction quarantine record');
  if (captured === null || Buffer.compare(captured, expected) !== 0) {
    restoreCapturedLock(specDir, quarantinePath, sourcePath);
    fail(`${label} replacement was captured; no transaction mutation was attempted`);
  }
  if (typeof options.onLockRecordCaptured === 'function') {
    options.onLockRecordCaptured({ sourcePath, quarantinePath, record: expected });
  }
  return { quarantinePath, sourcePath };
}

function discardExactLockClaim(specDir, claimPath, expected, options, phase) {
  const captured = captureExactLockClaim(specDir, claimPath, expected, options, phase);
  if (captured === null) return false;
  removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
    options.unlinkSync || fs.unlinkSync);
  return true;
}

function removeExactOwnerArtifacts(specDir, owner, claimPath, reclaimPath, options) {
  const escapedPrefix = TRANSACTION_LOCK_FILE.replaceAll('.', '\\.');
  const escapedNonce = owner.nonce;
  const re = new RegExp(
    `^${escapedPrefix}\\.(?:candidate|owner|claim|lease)\\.(?:${escapedNonce}|\\d+\\.[0-9a-f]{32}\\.${escapedNonce}(?:\\.tmp)?)$`, 'u');
  const releaseRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}${escapedNonce}(?:\\..+)?$`, 'u');
  let entries;
  try { entries = fs.readdirSync(specDir); } catch { return; }
  const captured = [];
  try {
    for (const name of entries) {
      if (!re.test(name) && !releaseRe.test(name)) continue;
      const filePath = path.join(specDir, name);
      if (filePath === reclaimPath || filePath === claimPath) continue;
      const expected = readLock(filePath, 'stale transaction lock owner artifact');
      if (!lockIdentityEqual(expected, owner)) {
        fail('stale transaction lock owner artifact belongs to a different incarnation; ambiguous data was left untouched');
      }
      const suffix = hashBytes(Buffer.from(name, 'utf8')).slice(0, 8);
      const artifact = captureExactLockRecord(
        specDir, filePath, owner, options, `reclaim-owner-${suffix}`);
      if (artifact === null) {
        fail('stale transaction lock owner artifact disappeared during cleanup; no transaction mutation was attempted');
      }
      captured.push(artifact);
    }
  } catch (error) {
    for (const artifact of captured.reverse()) {
      if (lstatRegularOrMissing(artifact.quarantinePath, 'transaction quarantine record') !== null &&
          lstatRegularOrMissing(artifact.sourcePath, 'stale transaction lock owner artifact') === null) {
        restoreCapturedLock(specDir, artifact.quarantinePath, artifact.sourcePath);
      }
    }
    throw error;
  }
  for (const artifact of captured) {
    removeExactRegular(artifact.quarantinePath, 'transaction quarantine record', specDir);
  }
  for (const legacyName of [
    `${TRANSACTION_LOCK_FILE}.claim`, `${TRANSACTION_LOCK_FILE}.lease`,
  ]) {
    const filePath = path.join(specDir, legacyName);
    if (lstatRegularOrMissing(filePath, 'legacy transaction lock artifact') === null) continue;
    try {
      const value = readLock(filePath, 'legacy transaction lock artifact');
      if (lockIdentityEqual(value, owner)) {
        const suffix = hashBytes(Buffer.from(legacyName, 'utf8')).slice(0, 8);
        const capturedLegacy = captureExactLockRecord(
          specDir, filePath, owner, options, `reclaim-legacy-${suffix}`);
        if (capturedLegacy === null) {
          fail('legacy transaction lock artifact disappeared during cleanup; no transaction mutation was attempted');
        }
        removeExactRegular(capturedLegacy.quarantinePath, 'transaction quarantine record', specDir,
          options.unlinkSync || fs.unlinkSync);
      }
    } catch {
      // Ambiguous legacy artifacts are left for conservative recovery.
    }
  }
}

function captureReleaseOwnedArtifact(specDir, sourcePath, owner, kind) {
  if (lstatRegularOrMissing(sourcePath, 'transaction lock owner artifact') === null) return null;
  const capturePath = path.join(specDir,
    `${TRANSACTION_LOCK_RELEASE_PREFIX}${owner.nonce}.${kind}`);
  if (lstatRegularOrMissing(capturePath, 'transaction lock release artifact') !== null) {
    fail('transaction lock release artifact already exists; ambiguous data was left untouched');
  }
  const expected = readLock(sourcePath, 'transaction lock owner artifact');
  if (!lockIdentityEqual(expected, owner)) {
    fail('transaction lock owner artifact changed; refusing to remove another owner artifact');
  }
  fs.renameSync(sourcePath, capturePath);
  try {
    const captured = readLock(capturePath, 'transaction lock release artifact');
    if (!lockIdentityEqual(captured, owner)) {
      restoreCapturedLock(specDir, capturePath, sourcePath);
      fail('transaction lock owner artifact replacement was captured; no transaction mutation was attempted');
    }
  } catch (error) {
    if (lstatRegularOrMissing(capturePath, 'transaction lock release artifact') !== null) {
      restoreCapturedLock(specDir, capturePath, sourcePath);
    }
    throw error;
  }
  return { capturePath, sourcePath };
}

function removeReleaseOwnerArtifacts(specDir, owner, options = {}) {
  const names = [
    [lockCandidatePath(specDir, owner), 'candidate'],
    [lockOwnerPath(specDir, owner), 'owner'],
    [lockClaimPathForTarget(specDir, owner), 'claim'],
    [lockLeasePath(specDir, owner), 'lease'],
    [path.join(specDir, `${TRANSACTION_LOCK_FILE}.claim`), 'legacy-claim'],
    [path.join(specDir, `${TRANSACTION_LOCK_FILE}.lease`), 'legacy-lease'],
  ];
  let entries;
  try { entries = fs.readdirSync(specDir); } catch { entries = []; }
  const tempRe = new RegExp(
    `^${TRANSACTION_LOCK_FILE.replaceAll('.', '\\.')}\\.(?:candidate|lease)\\.` +
    `\\d+\\.[0-9a-f]{32}\\.${owner.nonce}\\.tmp$`, 'u');
  for (const name of entries) {
    if (tempRe.test(name)) names.push([path.join(specDir, name), 'temporary']);
  }
  for (const [sourcePath, kind] of names) {
    const artifact = captureReleaseOwnedArtifact(specDir, sourcePath, owner, kind);
    if (artifact !== null) {
      removeExactRegular(artifact.capturePath, 'transaction lock release artifact', specDir,
        options.unlinkSync || fs.unlinkSync);
    }
  }
}

function cleanStaleLockLeaseTemps(specDir, now, options) {
  let entries;
  try { entries = fs.readdirSync(specDir); } catch { return; }
  const re = new RegExp(`^${TRANSACTION_LOCK_LEASE_PREFIX.replaceAll('.', '\\.')}` +
    `(\\d+)\\.([0-9a-f]{32})\\.([0-9a-f]{32})\\.tmp$`, 'u');
  const legacyRe = new RegExp(`^${TRANSACTION_LOCK_LEASE_PREFIX.replaceAll('.', '\\.')}` +
    `([0-9a-f]{32})\\.tmp$`, 'u');
  for (const name of entries) {
    const match = re.exec(name);
    const legacyMatch = legacyRe.exec(name);
    if (match === null && legacyMatch === null) continue;
    const filePath = path.join(specDir, name);
    const stat = lstatRegularOrMissing(filePath, 'unpublished transaction lock lease temporary');
    if (stat === null) continue;
    if (match !== null) {
      const pid = Number(match[1]);
      const incarnation = match[2];
      const live = pidIsLive(pid);
      const observed = live ? observedProcessIncarnation(pid, options) : null;
      if (live && (incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
          observed === null || observed === incarnation)) {
        if (!recoverableArtifactBelongsToCurrentProcess(filePath, options)) {
          fail('transaction lock lease publication is in progress; refusing concurrent write');
        }
        removeExactRegular(filePath, 'resumable unpublished transaction lock lease', specDir,
          options.unlinkSync || fs.unlinkSync);
        forgetRecoverableArtifact(filePath);
        continue;
      }
    } else {
      const owner = readLock(filePath, 'unpublished legacy transaction lock lease');
      if (lockIsActive(specDir, owner, now, options)) {
        fail(`transaction is owned by live process ${owner.pid}; refusing concurrent write`);
      }
    }
    removeExactRegular(filePath, 'stale unpublished transaction lock lease temporary', specDir,
      options.unlinkSync || fs.unlinkSync);
  }
}

function ownerHintFromCorruptSource(source) {
  const pidMatch = /"pid"\s*:\s*(\d+)/u.exec(source);
  const incarnationMatch = /"incarnation"\s*:\s*"([0-9a-f]{32})"/u.exec(source);
  if (pidMatch === null || incarnationMatch === null) return null;
  const pid = Number(pidMatch[1]);
  return Number.isSafeInteger(pid) && pid > 0
    ? { pid, incarnation: incarnationMatch[1] } : null;
}

function ownerHintIsLive(owner, options) {
  if (!pidIsLive(owner.pid)) return false;
  const observed = observedProcessIncarnation(owner.pid, options);
  return owner.incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
    observed === null || observed === owner.incarnation;
}

function cleanMalformedLegacyQuarantine(specDir, quarantinePath, descriptor, options) {
  const source = readRegularBytes(quarantinePath, 'legacy transaction lock quarantine');
  if (source === null) return;
  if (hashBytes(source).slice(0, 16) !== descriptor.digest) {
    fail('legacy transaction lock quarantine name does not match its bytes; ambiguous data was left untouched');
  }
  const hint = ownerHintFromCorruptSource(source.toString('utf8'));
  if (hint === null) {
    fail('legacy transaction lock quarantine has no safe owner provenance; ambiguous data was left untouched');
  }
  if (ownerHintIsLive(hint, options)) {
    fail(`legacy transaction lock quarantine belongs to live process ${hint.pid}; refusing concurrent write`);
  }
  removeExactRegular(quarantinePath, 'legacy transaction lock quarantine', specDir);
}

function cleanLegacyArtifact(specDir, filePath, label, now, options, claimFreshness = false) {
  const stat = lstatRegularOrMissing(filePath, label);
  if (stat === null) return;
  let owner;
  try {
    owner = readLock(filePath, label);
  } catch (error) {
    let source;
    try { source = fs.readFileSync(filePath); } catch (readError) {
      fail(`cannot read ${label}: ${readError.message}; ambiguous data was left untouched`);
    }
    const hint = ownerHintFromCorruptSource(source.toString('utf8'));
    if (hint !== null && !ownerHintIsLive(hint, options)) {
      const quarantinePath = path.join(specDir,
        `${TRANSACTION_LOCK_QUARANTINE_PREFIX}legacy.${lockReclaimerNonce(options)}.` +
        `${hashBytes(source).slice(0, 16)}`);
      const captured = captureExactBytes(
        specDir, filePath, source, quarantinePath, `stale ${label}`, options);
      if (captured === null) {
        fail(`${label} disappeared during cleanup; no transaction mutation was attempted`);
      }
      removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir);
      return;
    }
    fail(`${label} is corrupt; ambiguous data was left untouched`);
  }
  if (claimFreshness && now - Math.trunc(stat.mtimeMs) < TRANSACTION_LOCK_LEASE_MS) {
    fail('transaction lock reclaim is already in progress; refusing concurrent write');
  }
  if (lockIsActive(specDir, owner, now, options)) {
    fail(`transaction is owned by live process ${owner.pid}; refusing concurrent write`);
  }
  const captured = captureExactLockRecord(
    specDir, filePath, owner, options, `legacy-${path.basename(filePath)}`);
  if (captured === null) {
    fail(`${label} disappeared during cleanup; no transaction mutation was attempted`);
  }
  removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir);
}

function cleanLegacyFixedArtifacts(specDir, now, options) {
  cleanLegacyArtifact(specDir, path.join(specDir, TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE),
    'legacy transaction lock candidate', now, options);
  cleanLegacyArtifact(specDir, path.join(specDir, `${TRANSACTION_LOCK_FILE}.claim`),
    'legacy transaction lock claim', now, options, true);
  cleanLegacyArtifact(specDir, path.join(specDir, `${TRANSACTION_LOCK_FILE}.lease`),
    'legacy transaction lock lease', now, options);
}

function releaseArtifactEntriesForOwner(specDir, owner, options = {}) {
  const escaped = owner.nonce;
  const re = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}${escaped}\\.` +
    `(candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)$`, 'u');
  const reclaimRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `reclaim\\.${escaped}\\.[0-9a-f]{32}$`, 'u');
  return lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)
    .filter((filePath) => {
      const name = path.basename(filePath);
      if (options.preserveReclaimMarker === true && reclaimRe.test(name)) return false;
      return re.test(name) || reclaimRe.test(name);
    });
}

function cleanReleaseOwnerArtifacts(specDir, owner, now, options) {
  const allowCurrentProcess = options.allowCurrentReleaseOwner === true &&
    ownerIsCurrentProcess(owner, options);
  if (lockIsActive(specDir, owner, now, options) && !allowCurrentProcess) {
    fail(`transaction is owned by live process ${owner.pid}; refusing concurrent write`);
  }
  removeReleaseOwnerArtifacts(specDir, owner, options);
  for (const filePath of releaseArtifactEntriesForOwner(specDir, owner, options)) {
    const observed = readLock(filePath, 'transaction lock release artifact');
    if (!lockIdentityEqual(observed, owner)) {
      fail('transaction lock release artifact belongs to a different incarnation; ambiguous data was left untouched');
    }
    if (lockIsActive(specDir, observed, now, options) && !allowCurrentProcess) {
      fail(`transaction is owned by live process ${observed.pid}; refusing concurrent write`);
    }
    const captured = captureExactLockRecord(
      specDir, filePath, owner, options, `release-cleanup-${path.basename(filePath)}`);
    if (captured === null) {
      fail('transaction lock release artifact disappeared during cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
      options.unlinkSync || fs.unlinkSync);
  }
}

function cleanExistingReleaseClaims(specDir, now, options) {
  const finalRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `([0-9a-f]{32})$`, 'u');
  const knownRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `(?:[0-9a-f]{32}\\.(?:candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)|` +
    `reclaim\\.[0-9a-f]{32}\\.[0-9a-f]{32})$`, 'u');
  for (const releasePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)) {
    const match = finalRe.exec(path.basename(releasePath));
    if (match === null) continue;
    const owner = readLock(releasePath, 'transaction lock release claim');
    if (owner.nonce !== match[1]) {
      fail('transaction lock release claim name does not match its record; ambiguous data was left untouched');
    }
    cleanReleaseOwnerArtifacts(specDir, owner, now, {
      ...options, allowCurrentReleaseOwner: true,
    });
    const captured = captureExactLockRecord(specDir, releasePath, owner, options, 'release-claim');
    if (captured === null) {
      fail('transaction lock release claim disappeared during cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
      options.unlinkSync || fs.unlinkSync);
  }

  // A crash can leave only owner-specific release captures. They are safe to
  // remove only when the captured owner is still the exact dead owner named by
  // the artifact; a replacement incarnation is never inferred from a nonce.
  for (const releasePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)) {
    const name = path.basename(releasePath);
    if (finalRe.test(name)) continue;
    const match = new RegExp(
      `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
      `([0-9a-f]{32})\\.(candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)$`, 'u').exec(name) ||
      new RegExp(
        `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
        `reclaim\\.([0-9a-f]{32})\\.([0-9a-f]{32})$`, 'u').exec(name);
    if (match === null) continue;
    const owner = readLock(releasePath, 'transaction lock release artifact');
    if (owner.nonce !== match[1]) {
      fail('transaction lock release artifact name does not match its record; ambiguous data was left untouched');
    }
    if (name.startsWith(`${TRANSACTION_LOCK_RELEASE_PREFIX}reclaim.`)) {
      rememberReclaimedOwner(options, owner);
    }
    const preserveMarker = name.startsWith(`${TRANSACTION_LOCK_RELEASE_PREFIX}reclaim.`);
    cleanReleaseOwnerArtifacts(specDir, owner, now, {
      ...options, preserveReclaimMarker: preserveMarker, allowCurrentReleaseOwner: true,
    });
  }
  for (const releasePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)) {
    if (!knownRe.test(path.basename(releasePath))) {
      fail('transaction lock release artifact has an invalid name; ambiguous data was left untouched');
    }
  }
}

function cleanExistingQuarantines(specDir, now, options) {
  for (const quarantinePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_QUARANTINE_PREFIX)) {
    const name = path.basename(quarantinePath);
    const descriptor = quarantineDescriptor(name);
    if (descriptor === null) {
      fail('transaction quarantine record has an invalid derived name; ambiguous data was left untouched');
    }
    if (descriptor.type === 'legacy') {
      cleanMalformedLegacyQuarantine(specDir, quarantinePath, descriptor, options);
      continue;
    }
    if (descriptor.type === 'claim') {
      const claim = readLockClaim(quarantinePath, 'transaction lock claim quarantine');
      if (claim.target.nonce !== descriptor.targetNonce || claim.nonce !== descriptor.claimNonce) {
        fail('transaction lock claim quarantine name does not match its record; ambiguous data was left untouched');
      }
      const resumableClaim = ownerIsCurrentProcess(claim, options);
      if ((lockClaimIsActive(claim, now, options) && !resumableClaim) ||
          lockIsActive(specDir, claim.target, now, options)) {
        fail('transaction lock claim quarantine belongs to a live process; refusing concurrent write');
      }
      const captured = captureExactLockClaim(specDir, quarantinePath, claim, options, 'quarantine-cleanup');
      if (captured === null) {
        fail('transaction lock claim quarantine disappeared during cleanup; no transaction mutation was attempted');
      }
      removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
        options.unlinkSync || fs.unlinkSync);
      continue;
    }
    const record = readLock(quarantinePath, 'transaction lock record quarantine');
    if (record.nonce !== descriptor.recordNonce) {
      fail('transaction lock record quarantine name does not match its record; ambiguous data was left untouched');
    }
    const resumableRelease = releaseQuarantineBelongsToOwner(descriptor, record) &&
      ownerIsCurrentProcess(record, options);
    if (lockIsActive(specDir, record, now, options) && !resumableRelease) {
      fail('transaction lock record quarantine belongs to a live process; refusing concurrent write');
    }
    if (resumableRelease) {
      removeExactRegular(quarantinePath, 'transaction lock record quarantine', specDir,
        options.unlinkSync || fs.unlinkSync);
      continue;
    }
    const suffix = hashBytes(Buffer.from(name, 'utf8')).slice(0, 8);
    const cleanupOptions = {
      ...options, onLockRecordBeforeCapture: undefined, onLockRecordCaptured: undefined,
    };
    const captured = captureExactLockRecord(
      specDir, quarantinePath, record, cleanupOptions, `quarantine-cleanup-${suffix}`);
    if (captured === null) {
      fail('transaction lock record quarantine disappeared during cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
      options.unlinkSync || fs.unlinkSync);
  }
}

function setClaimCreationTime(claimPath, now) {
  const seconds = now / 1000;
  try { fs.utimesSync(claimPath, seconds, seconds); } catch (e) {
    fail(`cannot timestamp transaction lock claim: ${e.message}`);
  }
}

function claimExactStaleFile(specDir, targetPath, expected, now, options) {
  const claim = publishLockClaim(specDir, expected, now, options);
  if (claim === null) return false;
  const claimPath = claim.path;
  if (typeof options.onLockClaimPublished === 'function') {
    options.onLockClaimPublished(claim.record);
  }
  let current;
  try {
    current = readLock(targetPath, 'transaction lock candidate');
  } catch (error) {
    discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-missing');
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  if (!lockIdentityEqual(current, expected) || current.leaseUntil !== expected.leaseUntil) {
    discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-changed');
    return false;
  }

  const reclaimPath = path.join(specDir,
    `${TRANSACTION_LOCK_RELEASE_PREFIX}reclaim.${expected.nonce}.${claim.record.nonce}`);
  if (lstatRegularOrMissing(reclaimPath, 'transaction lock reclaim record') !== null) {
    fail('transaction lock reclaim record already exists; ambiguous data was left untouched');
  }
  try {
    fs.renameSync(targetPath, reclaimPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-missing');
      return false;
    }
    if (e.code === 'EEXIST') {
      discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-replaced');
      return false;
    }
    throw e;
  }
  const claimed = readLock(reclaimPath, 'transaction lock reclaim record');
  if (!lockIdentityEqual(claimed, expected) || claimed.leaseUntil !== expected.leaseUntil) {
    restoreCapturedLock(specDir, reclaimPath, targetPath);
    discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-replaced');
    const replacement = readLock(targetPath, 'replacement transaction lock');
    if (lockIsActive(specDir, replacement, now, options)) {
      fail(`transaction is owned by live process ${replacement.pid}; refusing concurrent write`);
    }
    fail('transaction lock target changed during claim; no transaction mutation was attempted');
  }
  if (lockIsActive(specDir, claimed, now, options)) {
    restoreCapturedLock(specDir, reclaimPath, targetPath);
    discardExactLockClaim(specDir, claimPath, claim.record, options, 'owner-live');
    fail(`transaction is owned by live process ${claimed.pid}; refusing concurrent write`);
  }

  // Keep the reclaim marker durable before removing any owner-derived
  // artifacts. A crash after this point must leave enough provenance for a
  // later process to authorize pre-journal temporary cleanup.
  syncDirectory(specDir);

  const capturedClaim = captureExactLockClaim(specDir, claimPath, claim.record, options, 'reclaim-complete');
  if (capturedClaim === null) {
    restoreCapturedLock(specDir, reclaimPath, targetPath);
    fail('transaction lock claim disappeared during reclaim; no transaction mutation was attempted');
  }
  removeExactRegular(capturedClaim.quarantinePath, 'transaction quarantine record', specDir);
  removeExactOwnerArtifacts(specDir, expected, claimPath, reclaimPath, options);
  syncDirectory(specDir);
  return true;
}

function writeLockCandidate(specDir, owner, writeSync, unlinkSync = fs.unlinkSync) {
  const candidatePath = lockCandidatePath(specDir, owner);
  const tmpPath = lockCandidateTempPath(specDir, owner);
  let published = false;
  try {
    const fd = fs.openSync(tmpPath, 'wx', 0o600);
    try {
      const data = Buffer.from(lockJson(owner), 'utf8');
      writeAllSync(fd, data, writeSync);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const written = readRegularBytes(tmpPath, 'unpublished transaction lock candidate');
    if (Buffer.compare(written, Buffer.from(lockJson(owner), 'utf8')) !== 0) {
      fail('transaction lock candidate was not written completely; no transaction mutation was attempted');
    }
    readLock(tmpPath, 'transaction lock candidate');
    fs.renameSync(tmpPath, candidatePath);
    published = true;
    syncDirectory(specDir);
  } catch (error) {
    if (!removePrivateRegularBestEffort(tmpPath, unlinkSync)) {
      rememberRecoverableArtifact(tmpPath, owner);
    }
    if (published && !removeOwnedLockRecordBestEffort(candidatePath, owner, false, unlinkSync)) {
      rememberRecoverableArtifact(candidatePath, owner);
      rememberOwnerRecovery(specDir, owner);
    }
    throw error;
  }
}

function publishLockCandidate(specDir, owner) {
  const candidatePath = lockCandidatePath(specDir, owner);
  const lockPath = transactionLockPath(specDir);
  try {
    fs.linkSync(candidatePath, lockPath);
  } catch (e) {
    if (e.code === 'EEXIST') return false;
    throw e;
  }
  syncDirectory(specDir);
  const published = readLock(lockPath);
  if (!lockIdentityEqual(published, owner) || published.leaseUntil !== owner.leaseUntil) {
    fail('published transaction lock differs from its complete candidate; no transaction mutation was attempted');
  }
  fs.renameSync(candidatePath, lockOwnerPath(specDir, owner));
  syncDirectory(specDir);
  return true;
}

function removeCandidateIfOwned(specDir, owner) {
  for (const candidatePath of [lockCandidatePath(specDir, owner), lockOwnerPath(specDir, owner)]) {
    const candidate = lstatRegularOrMissing(candidatePath, 'transaction lock candidate');
    if (candidate === null) continue;
    try {
      const value = readLock(candidatePath, 'transaction lock candidate');
      if (lockIdentityEqual(value, owner) && value.leaseUntil === owner.leaseUntil) {
        removeExactRegular(candidatePath, 'transaction lock candidate', specDir);
      }
    } catch {
      // Never remove an artifact whose ownership cannot be established.
    }
  }
}

function writeLockLease(specDir, owner, writeSync, now, unlinkSync = fs.unlinkSync) {
  const refreshed = { ...owner, leaseUntil: now + TRANSACTION_LOCK_LEASE_MS };
  const tmpPath = lockLeaseTmpPath(specDir, owner);
  let published = false;
  try {
    removeExactRegular(tmpPath, 'unpublished transaction lock lease temporary', specDir);
    const fd = fs.openSync(tmpPath, 'wx', 0o600);
    try {
      const data = Buffer.from(lockJson(refreshed), 'utf8');
      writeAllSync(fd, data, writeSync);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const written = readRegularBytes(tmpPath, 'unpublished transaction lock lease temporary');
    if (Buffer.compare(written, Buffer.from(lockJson(refreshed), 'utf8')) !== 0) {
      fail('transaction lock lease temporary was not written completely; no transaction mutation was attempted');
    }
    readLock(tmpPath, 'transaction lock lease');
    fs.renameSync(tmpPath, lockLeasePath(specDir, owner));
    published = true;
    syncDirectory(specDir);
    owner.leaseUntil = refreshed.leaseUntil;
  } catch (error) {
    if (!removePrivateRegularBestEffort(tmpPath, unlinkSync)) {
      rememberRecoverableArtifact(tmpPath, owner);
    }
    if (published && !removeOwnedLockRecordBestEffort(lockLeasePath(specDir, owner), owner, false, unlinkSync)) {
      rememberRecoverableArtifact(lockLeasePath(specDir, owner), owner);
      rememberOwnerRecovery(specDir, owner);
    }
    throw error;
  }
}

function assertTransactionLockOwned(specDir, owner, now, options) {
  const current = readLock(transactionLockPath(specDir));
  if (!lockIdentityEqual(current, owner)) {
    fail('transaction lock ownership changed; refusing to mutate outputs');
  }
  if (!lockIsActive(specDir, current, now, options)) {
    fail('transaction lock lease expired; refusing to mutate outputs');
  }
}

function lockArtifactEntries(specDir, prefix, suffix = '') {
  let entries;
  try { entries = fs.readdirSync(specDir); } catch { return []; }
  return entries.filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .map((name) => path.join(specDir, name));
}

function cleanStaleCandidateTemps(specDir, now, options) {
  const re = new RegExp(`^${TRANSACTION_LOCK_CANDIDATE_PREFIX.replaceAll('.', '\\.')}` +
    `(\\d+)\\.([0-9a-f]{32})\\.([0-9a-f]{32})\\.tmp$`, 'u');
  for (const candidatePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_CANDIDATE_PREFIX, '.tmp')) {
    const name = path.basename(candidatePath);
    const match = re.exec(name);
    if (match === null) fail('transaction lock candidate temporary has an invalid owner name; no transaction mutation was attempted');
    const pid = Number(match[1]);
    const incarnation = match[2];
    const stat = lstatRegularOrMissing(candidatePath, 'unpublished transaction lock candidate');
    if (stat === null) continue;
    const live = pidIsLive(pid);
    const observed = live ? observedProcessIncarnation(pid, options) : null;
    if (live && (incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
        observed === null || observed === incarnation)) {
      if (!recoverableArtifactBelongsToCurrentProcess(candidatePath, options)) {
        fail(`transaction is owned by live process ${pid}; refusing concurrent write`);
      }
      removeExactRegular(candidatePath, 'resumable unpublished transaction lock candidate', specDir,
        options.unlinkSync || fs.unlinkSync);
      forgetRecoverableArtifact(candidatePath);
      continue;
    }
    if (!live || (observed !== null && incarnation !== TRANSACTION_LOCK_UNVERIFIED_INCARNATION &&
        observed !== incarnation)) {
      removeExactRegular(candidatePath, 'stale unpublished transaction lock candidate', specDir,
        options.unlinkSync || fs.unlinkSync);
    }
  }
}

function cleanExistingClaims(specDir, now, options) {
  for (const claimPath of lockArtifactEntries(specDir, TRANSACTION_LOCK_CLAIM_PREFIX)) {
    const stat = lstatRegularOrMissing(claimPath, 'transaction lock claim');
    if (stat === null) continue;
    let claim;
    let legacy = null;
    try {
      claim = readLockClaim(claimPath, 'transaction lock claim');
      if (lockClaimIsActive(claim, now, options)) {
        fail(`transaction lock reclaim is already in progress by live process ${claim.pid}`);
      }
    } catch (error) {
      try {
        legacy = readLock(claimPath, 'transaction lock claim');
      } catch {
        throw error;
      }
      if (now - Math.trunc(stat.mtimeMs) < TRANSACTION_LOCK_LEASE_MS) {
        fail('transaction lock reclaim is already in progress; refusing concurrent write');
      }
      if (lockIsActive(specDir, legacy, now, options)) {
        fail(`transaction is owned by live process ${legacy.pid}; refusing concurrent write`);
      }
      claim = null;
    }
    if (claim !== null && lockClaimIsActive(claim, now, options)) {
      fail(`transaction lock reclaim is already in progress by live process ${claim.pid}`);
    }
    const captured = claim === null
      ? captureExactLockRecord(specDir, claimPath, legacy, options, 'acquisition-cleanup')
      : captureExactLockClaim(specDir, claimPath, claim, options, 'acquisition-cleanup');
    if (captured === null) {
      fail('transaction lock claim disappeared during acquisition cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir);
  }
}

function cleanStaleLockClaimTemps(specDir, options) {
  const re = new RegExp(`^${TRANSACTION_LOCK_CLAIM_PREFIX.replaceAll('.', '\\.')}` +
    `(\\d+)\\.([0-9a-f]{32})\\.[0-9a-f]{32}\\.([0-9a-f]{32})\\.tmp$`, 'u');
  for (const claimPath of lockArtifactEntries(specDir, TRANSACTION_LOCK_CLAIM_PREFIX, '.tmp')) {
    const match = re.exec(path.basename(claimPath));
    if (match === null) {
      fail('transaction lock claim temporary has an invalid owner name; no transaction mutation was attempted');
    }
    const stat = lstatRegularOrMissing(claimPath, 'unpublished transaction lock claim');
    if (stat === null) continue;
    const pid = Number(match[1]);
    const incarnation = match[2];
    const live = pidIsLive(pid);
    const observed = live ? observedProcessIncarnation(pid, options) : null;
    if (live && (incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
        observed === null || observed === incarnation)) {
      if (!recoverableArtifactBelongsToCurrentProcess(claimPath, options)) {
        fail(`transaction lock reclaim is in progress by live process ${pid}`);
      }
      removeExactRegular(claimPath, 'resumable unpublished transaction lock claim', specDir,
        options.unlinkSync || fs.unlinkSync);
      forgetRecoverableArtifact(claimPath);
      continue;
    }
    removeExactRegular(claimPath, 'stale unpublished transaction lock claim', specDir,
      options.unlinkSync || fs.unlinkSync);
  }
}

function acquireTransactionLock(specDir, options = {}) {
  const lockPath = transactionLockPath(specDir);
  const now = lockNow(options.now);
  const writeSync = options.writeSync || fs.writeSync;
  const owner = { format: TRANSACTION_LOCK_FORMAT, version: TRANSACTION_LOCK_VERSION,
    pid: process.pid, incarnation: lockIncarnationForOwner(options),
    nonce: randomBytes(16).toString('hex'), leaseUntil: now + TRANSACTION_LOCK_LEASE_MS };
  const reclaimedOwners = options.reclaimedOwners || [];
  const lockOptions = { ...options, reclaimerNonce: owner.nonce, reclaimedOwners };
  let staleClaimed = false;
  for (;;) {
    cleanStaleLockLeaseTemps(specDir, now, lockOptions);
    cleanStaleLockClaimTemps(specDir, lockOptions);
    cleanStaleCandidateTemps(specDir, now, lockOptions);
    cleanRecoverableMetadata(specDir, lockOptions);
    cleanExistingQuarantines(specDir, now, lockOptions);
    cleanExistingClaims(specDir, now, lockOptions);
    cleanLegacyFixedArtifacts(specDir, now, lockOptions);
    cleanExistingReleaseClaims(specDir, now, lockOptions);

    const finalStat = lstatRegularOrMissing(lockPath, 'transaction lock');
    if (finalStat !== null) {
      const current = readLock(lockPath);
      if (lockIsActive(specDir, current, now, lockOptions)) {
        if (options.resumeCurrentOwner === true && ownerIsCurrentProcess(current, lockOptions) &&
            ownerRecoveryPending(specDir, current)) {
          return current;
        }
        fail(`transaction is owned by live process ${current.pid}; refusing concurrent write`);
      }
      if (!claimExactStaleFile(specDir, lockPath, current, now, lockOptions)) continue;
      reclaimedOwners.push(current);
      staleClaimed = true;
    }

    const candidates = [
      ...lockArtifactEntries(specDir, TRANSACTION_LOCK_CANDIDATE_PREFIX)
        .filter((candidatePath) => !candidatePath.endsWith('.tmp')),
      ...lockArtifactEntries(specDir, TRANSACTION_LOCK_OWNER_PREFIX),
    ];
    for (const candidatePath of candidates) {
      if (lstatRegularOrMissing(candidatePath, 'transaction lock candidate') === null) continue;
      const candidate = readLock(candidatePath, 'transaction lock candidate');
      if (lockIsActive(specDir, candidate, now, lockOptions)) {
        if (options.resumeCurrentOwner === true && ownerIsCurrentProcess(candidate, lockOptions) &&
            ownerRecoveryPending(specDir, candidate)) {
          if (!removeOwnedLockRecordBestEffort(candidatePath, candidate, false,
            options.unlinkSync || fs.unlinkSync)) {
            fail('resumable transaction lock candidate cleanup failed; no transaction mutation was attempted');
          }
          forgetOwnerRecovery(specDir, candidate);
          forgetRecoverableArtifact(candidatePath);
          continue;
        }
        fail(`transaction is owned by live process ${candidate.pid}; refusing concurrent write`);
      }
      if (!claimExactStaleFile(specDir, candidatePath, candidate, now, lockOptions)) continue;
      reclaimedOwners.push(candidate);
      staleClaimed = true;
    }

    if (typeof options.onStaleLockClaimed === 'function' && staleClaimed) {
      options.onStaleLockClaimed();
      staleClaimed = false;
    }
    try {
      writeLockCandidate(specDir, owner, writeSync, options.unlinkSync || fs.unlinkSync);
      if (!publishLockCandidate(specDir, owner)) {
        removeCandidateIfOwned(specDir, owner);
        continue;
      }
      writeLockLease(specDir, owner, writeSync, now, options.unlinkSync || fs.unlinkSync);
      return owner;
    } catch (e) {
      cleanupFailedLockOwnerArtifacts(specDir, owner, options);
      if (e.code !== 'EEXIST') throw e;
      continue;
    }
  }
}

function releaseTransactionLock(specDir, owner, options = {}) {
  const lockPath = transactionLockPath(specDir);
  const releasePath = lockReleasePath(specDir, owner);
  const releaseExists = lstatRegularOrMissing(releasePath, 'transaction lock release claim') !== null;
  if (releaseExists) {
    const captured = readLock(releasePath, 'transaction lock release claim');
    if (!lockIdentityEqual(captured, owner)) {
      fail('transaction lock release claim belongs to a different incarnation; ambiguous data was left untouched');
    }
    const current = lstatRegularOrMissing(lockPath, 'replacement transaction lock');
    if (current !== null) {
      const replacement = readLock(lockPath, 'replacement transaction lock');
      if (lockIdentityEqual(replacement, owner)) {
        fail('transaction lock release claim and fixed alias have the same owner; ambiguous data was left untouched');
      }
    }
    cleanReleaseOwnerArtifacts(specDir, owner, lockNow(options.now), {
      ...options, allowCurrentReleaseOwner: true,
    });
    const releaseOptions = { ...options, reclaimerNonce: owner.nonce };
    const capturedRelease = captureExactLockRecord(
      specDir, releasePath, owner, releaseOptions, 'release-complete');
    if (capturedRelease === null) {
      fail('transaction lock release claim disappeared during cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(capturedRelease.quarantinePath, 'transaction quarantine record', specDir,
      options.unlinkSync || fs.unlinkSync);
    syncDirectory(specDir);
    forgetOwnerRecovery(specDir, owner);
    return;
  }
  const current = readLock(lockPath);
  if (!lockIdentityEqual(current, owner)) {
    fail('transaction lock ownership changed; refusing to remove another owner lock');
  }
  const beforeReleaseRename = options.onReleaseValidated || options.onReleaseBeforeRename;
  if (typeof beforeReleaseRename === 'function') {
    beforeReleaseRename();
  }

  try {
    fs.renameSync(lockPath, releasePath);
  } catch (e) {
    if (e.code === 'ENOENT') fail('transaction lock disappeared before release; no transaction mutation was attempted');
    throw e;
  }
  const captured = readLock(releasePath, 'transaction lock release claim');
  if (!lockIdentityEqual(captured, owner)) {
    restoreCapturedLock(specDir, releasePath, lockPath);
    const replacement = readLock(lockPath, 'replacement transaction lock');
    if (lockIsActive(specDir, replacement, lockNow(options.now), options)) {
      fail(`transaction is owned by live process ${replacement.pid}; refusing concurrent write`);
    }
    fail('transaction lock replacement was captured during release; no transaction mutation was attempted');
  }

  const afterReleaseCapture = options.onReleaseCaptured || options.onReleaseBeforeArtifactCleanup;
  if (typeof afterReleaseCapture === 'function') {
    afterReleaseCapture();
  }

  // The fixed alias is now held in the owner-specific release claim. No
  // owner-derived artifact can be confused with a replacement nonce. Each
  // artifact is captured and validated again before its removal.
  removeReleaseOwnerArtifacts(specDir, owner, options);
  const releaseOptions = { ...options, reclaimerNonce: owner.nonce };
  const capturedRelease = captureExactLockRecord(
    specDir, releasePath, owner, releaseOptions, 'release-complete');
  if (capturedRelease === null) {
    fail('transaction lock release claim disappeared during cleanup; no transaction mutation was attempted');
  }
  removeExactRegular(capturedRelease.quarantinePath, 'transaction quarantine record', specDir,
    options.unlinkSync || fs.unlinkSync);
  syncDirectory(specDir);
  forgetOwnerRecovery(specDir, owner);
}

function transactionLockGuard(specDir, owner, options) {
  if (owner === null) fail('transaction mutation requires an owned cooperative lock');
  return () => {
    transactionLockOwnershipGuard(specDir, owner, options)();
    const now = lockNow(options.now);
    writeLockLease(specDir, owner, options.writeSync || fs.writeSync, now,
      options.unlinkSync || fs.unlinkSync);
    transactionLockOwnershipGuard(specDir, owner, options)();
  };
}

function transactionLockOwnershipGuard(specDir, owner, options) {
  if (owner === null) fail('transaction mutation requires an owned cooperative lock');
  return () => assertTransactionLockOwned(specDir, owner, lockNow(options.now), options);
}

function recoverBuildOutputTransactionLocked(specDir, contentDir, options = {}) {
  const guard = options.owner === null || options.owner === undefined
    ? () => fail('transaction recovery requires an owned cooperative lock')
    : transactionLockGuard(specDir, options.owner, options);
  const writeSync = options.writeSync || fs.writeSync;
  const journalPath = transactionJournalPath(specDir);
  const journal = lstatRegularOrMissing(journalPath, 'transaction journal');
  if (journal !== null) {
    const state = readTransactionJournal(specDir, contentDir);
    guard();
    cleanJournalTmpIfSafe(specDir, options.unlinkSync || fs.unlinkSync);
    if (state.phase === 'committed' || state.phase === 'cleaning') {
      recoverCommittedTransaction(specDir, contentDir, state, writeSync, guard,
        options.unlinkSync || fs.unlinkSync);
    } else {
      if (state.phase !== 'rollback') beginRollback(specDir, contentDir, state, true, writeSync, guard);
      const errors = rollbackTransaction(specDir, contentDir, state, writeSync, guard,
        options.unlinkSync || fs.unlinkSync);
      if (errors.length) fail(`transaction recovery rollback failed: ${errors.join('; ')}`);
      guard();
      removeJournal(journalPath, specDir);
    }
    cleanReclaimedOwnerMarkers(specDir, options);
    return;
  }
  guard();
  cleanJournalTmpIfSafe(specDir, options.unlinkSync || fs.unlinkSync);
  const orphans = transactionArtifactPaths(specDir, contentDir)
    .filter((filePath) => ![TRANSACTION_JOURNAL_FILE, TRANSACTION_JOURNAL_TMP_FILE].includes(path.basename(filePath)));
  cleanUnpublishedOutputTemps(specDir, contentDir, orphans, options, guard);
  cleanReclaimedOwnerMarkers(specDir, options);
}

// Recovery and writing share one cooperative lock. The lock is not a hostile
// process security boundary: a process with write access can replace files
// between lstat and rename. It prevents cooperating builders from racing by
// requiring a reliable process-incarnation token, a refreshed lease, and an
// ownership check immediately before every output mutation. Lease expiry is
// not a death detector: a live matching incarnation is never reclaimed. On
// platforms that cannot prove an incarnation, live ownership is retained and
// the builder fails safely rather than risking a paused writer.
export function recoverBuildOutputTransaction(specDir, contentDir, options = {}) {
  const resolvedSpecDir = path.resolve(specDir);
  const resolvedContentDir = path.resolve(contentDir);
  validateWriteRoots(resolvedSpecDir, resolvedContentDir);
  const recoveryOptions = { ...options, reclaimedOwners: options.reclaimedOwners || [] };
  let owner = null;
  if (recoveryOptions.lockHeld) owner = recoveryOptions.owner || null;
  else owner = acquireTransactionLock(resolvedSpecDir, recoveryOptions);
  try {
    recoverBuildOutputTransactionLocked(resolvedSpecDir, resolvedContentDir, {
      ...recoveryOptions, owner,
    });
  } finally {
    if (owner !== null) releaseTransactionLock(resolvedSpecDir, owner, recoveryOptions);
  }
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
  const resolvedSpecDir = path.resolve(specDir);
  const resolvedContentDir = path.resolve(contentDir);
  validateWriteRoots(resolvedSpecDir, resolvedContentDir);
  const writeOptions = {
    ...options, reclaimedOwners: options.reclaimedOwners || [], resumeCurrentOwner: true,
  };
  const owner = writeOptions.lockHeld
    ? writeOptions.owner || null
    : acquireTransactionLock(resolvedSpecDir, writeOptions);
  const { renameSync = fs.renameSync, unlinkSync = fs.unlinkSync } = writeOptions;
  const writeSync = writeOptions.writeSync || fs.writeSync;
  const guard = transactionLockGuard(resolvedSpecDir, owner, { ...writeOptions, writeSync });
  const ownershipGuard = transactionLockOwnershipGuard(resolvedSpecDir, owner, {
    ...writeOptions, writeSync,
  });
  let state = null;
  let firstJournalPublished = false;
  let retainLockForRecovery = false;
  const temporaryPaths = [];
  try {
    recoverBuildOutputTransactionLocked(resolvedSpecDir, resolvedContentDir, {
      ...writeOptions, owner, writeSync,
      expectedOutputBytes: transactionOutputBytes(bufs, readmeBufs),
    });

    const dataFor = (index) => {
      const { root, name } = TRANSACTION_OUTPUTS[index];
      return Buffer.from(root === 'spec' ? bufs[LANGS.find((lang) => OUT_FILES[lang] === name)]
        : readmeBufs[LANGS.find((lang) => README_FILES[lang] === name)]);
    };
    state = {
      format: TRANSACTION_FORMAT,
      version: TRANSACTION_VERSION,
      nonce: owner.nonce,
      durability: directorySyncSupport(),
      phase: 'prepared',
      backupIndex: 0,
      installIndex: 0,
      cleanupIndex: 0,
      rollbackIndex: 0,
      outputs: TRANSACTION_OUTPUTS.map(({ root, name }, index) => {
        const destination = root === 'spec' ? path.join(resolvedSpecDir, name) : path.join(resolvedContentDir, name);
        const existed = assertRegularDestination(destination);
        const old = existed ? readRegularBytes(destination, 'original output') : null;
        const data = dataFor(index);
        return {
          root, name, existed,
          oldLength: old === null ? null : old.length,
          oldSha256: old === null ? null : hashBytes(old),
          newLength: data.length,
          newSha256: hashBytes(data),
        };
      }),
    };
    validateJournalState(state, resolvedSpecDir, resolvedContentDir);

    // Every temporary is created with an exact nonce-derived name and is
    // fsynced before the first journal snapshot becomes publishable.
    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      ensureAbsent(paths.temp, 'transaction temporary');
      guard();
      const fd = fs.openSync(paths.temp, 'wx', 0o600);
      temporaryPaths.push(paths.temp);
      try {
        const data = dataFor(index);
        writeAllSync(fd, data, writeSync);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      verifyNew(state.outputs[index], readRegularBytes(paths.temp, 'transaction temporary'), 'transaction temporary');
    }
    if (process.env.KTAV_BUILD_SPEC_CRASH_BEFORE_FIRST_JOURNAL === '1' ||
        process.env.KTAV_BUILD_SPEC_CRASH_BEFORE_JOURNAL === '1' ||
        process.env.KTAV_BUILD_SPEC_CRASH_POINT === 'before-first-journal') {
      process.kill(process.pid, 'SIGKILL');
    }
    writeJournalSnapshot(resolvedSpecDir, state, false, writeSync, guard);
    firstJournalPublished = true;
    cleanReclaimedOwnerMarkers(resolvedSpecDir, writeOptions);

    state.phase = 'backing-up';
    writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const item = state.outputs[index];
      if (!item.existed) continue;
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      validateWriteRoots(resolvedSpecDir, resolvedContentDir);
      verifyOld(item, readRegularBytes(paths.destination, 'original output'), 'original output');
      ensureAbsent(paths.backup, 'transaction backup');
      guard();
      renameSync(paths.destination, paths.backup);
      verifyOld(item, readRegularBytes(paths.backup, 'transaction backup'), 'transaction backup');
      if (readRegularBytes(paths.destination, 'transaction destination') !== null) {
        fail(`backup left a destination behind at ${paths.destination}; ambiguous data was left untouched`);
      }
      if (process.env.KTAV_BUILD_SPEC_CRASH_AFTER_RENAME === `backup:${index}`) process.kill(process.pid, 'SIGKILL');
      syncDirectory(path.dirname(paths.destination));
      state.backupIndex++;
      writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    }

    state.phase = 'installing';
    writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const item = state.outputs[index];
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      validateWriteRoots(resolvedSpecDir, resolvedContentDir);
      verifyNew(item, readRegularBytes(paths.temp, 'transaction temporary'), 'transaction temporary');
      ensureAbsent(paths.destination, 'transaction destination');
      guard();
      renameSync(paths.temp, paths.destination);
      verifyNew(item, readRegularBytes(paths.destination, 'installed transaction output'), 'installed transaction output');
      if (process.env.KTAV_BUILD_SPEC_CRASH_AFTER_RENAME === `install:${index}`) process.kill(process.pid, 'SIGKILL');
      syncDirectory(path.dirname(paths.destination));
      state.installIndex++;
      writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    }

    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      verifyNew(state.outputs[index], readRegularBytes(paths.destination, 'installed transaction output'), 'installed transaction output');
      if (readRegularBytes(paths.temp, 'transaction temporary') !== null) {
        fail(`temporary remained after install at ${paths.temp}; ambiguous data was left untouched`);
      }
    }
    syncOutputDirectories(resolvedSpecDir, resolvedContentDir);
    // This is the durable direction switch. No pre-commit recovery may keep
    // new bytes after this snapshot is published.
    state.phase = 'committed';
    writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);

    state.phase = 'cleaning';
    writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    const cleanupErrors = [];
    let cleanupBlocked = false;
    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      try {
        const backup = readRegularBytes(paths.backup, 'transaction backup');
        if (backup !== null) {
          verifyOld(state.outputs[index], backup, 'transaction backup');
          validateWriteRoots(resolvedSpecDir, resolvedContentDir);
          guard();
          unlinkSync(paths.backup);
          if (readRegularBytes(paths.backup, 'transaction backup') !== null) {
            fail(`backup remained after cleanup at ${paths.backup}`);
          }
        }
        syncOutputDirectories(resolvedSpecDir, resolvedContentDir);
        if (!cleanupBlocked) {
          state.cleanupIndex = index + 1;
          writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
        }
      } catch (error) {
        cleanupBlocked = true;
        cleanupErrors.push(`${paths.backup}: ${error.message}`);
      }
    }
    if (cleanupErrors.length) {
      const cleanupError = new Error(`outputs committed; backup cleanup failed: ${cleanupErrors.join('; ')}`);
      cleanupError.code = 'KTAV_BACKUP_CLEANUP_FAILED';
      throw cleanupError;
    }
    guard();
    removeJournal(transactionJournalPath(resolvedSpecDir), resolvedSpecDir);
  } catch (error) {
    let journalPublished = firstJournalPublished;
    if (!journalPublished) {
      try {
        journalPublished = lstatRegularOrMissing(
          transactionJournalPath(resolvedSpecDir), 'transaction journal') !== null;
      } catch { /* preserve the original error */ }
    }
    if (!journalPublished) {
      const cleaned = cleanupPreJournalArtifacts(
        resolvedSpecDir, temporaryPaths, writeOptions, ownershipGuard);
      if (!cleaned && state !== null) {
        try {
          // If private staging could not be removed, publish its exact derived
          // names so the normal rollback/recovery path can dispose of it.
          writeJournalSnapshot(resolvedSpecDir, state, false, writeSync, guard,
            writeOptions.unlinkSync || fs.unlinkSync);
          journalPublished = true;
        } catch {
          // Keep the owner lock when both cleanup and journal publication fail.
          // Its nonce is the exact provenance for a same-process retry and a
          // later dead-owner reclaim.
          retainLockForRecovery = true;
          rememberOwnerRecovery(resolvedSpecDir, owner);
          cleanupPreJournalArtifacts(
            resolvedSpecDir, temporaryPaths, writeOptions, ownershipGuard);
        }
      }
      if (!journalPublished) throw error;
    }
    if (state === null) throw error;
    if (state.phase === 'committed' || state.phase === 'cleaning') throw error;
    const rollbackErrors = [];
    try {
      const journalExists = lstatRegularOrMissing(transactionJournalPath(resolvedSpecDir), 'transaction journal') !== null;
      beginRollback(resolvedSpecDir, resolvedContentDir, state, journalExists, writeSync, guard);
      rollbackErrors.push(...rollbackTransaction(
        resolvedSpecDir, resolvedContentDir, state, writeSync, guard,
        writeOptions.unlinkSync || fs.unlinkSync));
      if (rollbackErrors.length === 0) {
        guard();
        removeJournal(transactionJournalPath(resolvedSpecDir), resolvedSpecDir);
      }
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError.message);
    }
    const detail = rollbackErrors.length ? `; rollback failed: ${rollbackErrors.join('; ')}` : '';
    const transactionError = new Error(`build output transaction failed: ${error.message}${detail}`, { cause: error });
    transactionError.code = error.code;
    throw transactionError;
  } finally {
    if (owner !== null && !retainLockForRecovery) {
      releaseTransactionLock(resolvedSpecDir, owner, writeOptions);
    }
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
    validateWriteRoots(specDir, contentDir);
    if (checkMode) {
      const pending = pendingTransactionPaths(specDir, contentDir);
      if (pending.length) {
        fail(`build_spec --check: pending/interrupted transaction artifact(s): ${pending.join(', ')}; --check is read-only and will not recover or remove them`);
      }
    } else {
      // Recovery must run before content validation. Its own derived output
      // artifacts are outside the closed-world content namespace and may be
      // the only evidence needed to make the next validation possible.
      recoverBuildOutputTransaction(specDir, contentDir);
    }
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
