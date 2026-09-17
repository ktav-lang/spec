
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


export { HTML_BLOCK_TAGS, advanceColumn, buildThematicBreakSuffix, canContinueParagraph, codePointWidth, columnAt, consumeBlockquoteMarker, consumeIndent, consumeListPadding, continueLinkReference, expandTabs, isAsciiControl, isAsciiDigit, isAsciiLetter, isAsciiPunctuation, isAttributeNameChar, isAttributeNameStart, isBlankLinkContinuation, isCompleteType7Tag, isEmptyListMarker, isFenceCloser, isSetextParagraphLine, isThematicBreak, isThematicBreakAt, isUnquotedAttributeValueChar, leadingColumns, parseAtxHeading, parseFenceOpener, parseHtmlBlockOpener, parseListMarker, parseSetextUnderline, scanLinkDestination, scanLinkLabel, scanLinkReferenceAfterLabel, scanLinkReferenceStart, scanLinkReferenceSuffix, scanLinkTitle, skipSpaceTabs, startsLinkTitle };
