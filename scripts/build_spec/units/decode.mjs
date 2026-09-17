import { LANGS, MAX_BODY_PARTS, NUMBERED_HEADING_PREFIX_RE, UNICODE_WORD_CODE_POINT_RE } from '../shared.mjs';

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

// A unit may sit inside a group directory, so its NAME is the last path
// segment. Both naming rules below are about the name, never the location.
function unitName(unit) {
  return unit.slice(unit.lastIndexOf('/') + 1);
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
    if (unitName(unit) !== 'sec-' + meta.number) {
      failUnit(unit, `unit name does not match sec-${meta.number}`);
    }
    if (meta.sep !== '. ' && meta.sep !== ' ') {
      failUnit(unit, `bad sep ${JSON.stringify(meta.sep)} (must be ". " or " ")`);
    }
  } else { // named
    if (meta.number !== null) failUnit(unit, 'named unit must have number === null');
    if (lvl < 2) failUnit(unit, `named unit level must be 2..6, got ${lvl}`);
    if (!unitName(unit).startsWith('named-')) failUnit(unit, 'named unit dir must start with "named-"');
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


export { decodeUtf8Strict, fail, failUnit, generatedHeadingLine, hasNumberedHeadingPrefix, rejectRawCarriageReturns, utf8Strict, validateBodyPart, validateGeneratedHeading };
