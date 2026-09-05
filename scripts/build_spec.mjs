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
//   writeBuildOutputs(..., { renameSync }), defaultSectionInventoryLockPath(contentDir)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LANGS = ['en', 'ru', 'zh'];
export const OUT_FILES = { en: 'spec.md', ru: 'spec.ru.md', zh: 'spec.zh.md' };
export const README_FILES = { en: 'README.md', ru: 'README.ru.md', zh: 'README.zh.md' };
export const README_SOURCE_FILE = 'README.source.js';
export const SECTION_INVENTORY_LOCK_FILE = 'section-inventory.0.7.lock.json';

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

function validateSectionInventoryLock(manifest, lockPath) {
  const lock = readCanonicalJson(lockPath);
  if (typeof lock !== 'object' || lock === null || Array.isArray(lock)) {
    fail(`${lockPath} must export an object`);
  }
  const keys = Object.keys(lock).sort();
  const wanted = ['format', 'units', 'version'].sort();
  if (keys.length !== wanted.length || keys.some((key, i) => key !== wanted[i])) {
    fail(`${lockPath} must have exactly the keys {"format", "units", "version"}`);
  }
  if (lock.format !== 'ktav-section-inventory') {
    fail(`${lockPath} has unsupported format ${JSON.stringify(lock.format)}`);
  }
  if (lock.version !== '0.7.0') {
    fail(`${lockPath} must be version "0.7.0"; got ${JSON.stringify(lock.version)}`);
  }
  if (!Array.isArray(lock.units) || lock.units.length === 0 ||
      !lock.units.every((name) => typeof name === 'string' && name.length > 0) ||
      new Set(lock.units).size !== lock.units.length) {
    fail(`${lockPath}.units must be a non-empty array of unique non-empty strings`);
  }
  if (lock.units.length !== manifest.length || lock.units.some((name, i) => name !== manifest[i])) {
    const min = Math.min(lock.units.length, manifest.length);
    let first = 0;
    while (first < min && lock.units[first] === manifest[first]) first++;
    const lockName = lock.units[first];
    const manifestName = manifest[first];
    fail(`${lockPath} does not match manifest.js at index ${first}: lock has ${JSON.stringify(lockName)}, manifest has ${JSON.stringify(manifestName)}`);
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

  if (options.requireSectionInventoryLock || options.sectionInventoryLockPath) {
    const lockPath = options.sectionInventoryLockPath ||
      defaultSectionInventoryLockPath(contentDir);
    validateSectionInventoryLock(manifest, lockPath);
  }

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
      const src = decodeUtf8Strict(buf, `unit "${unit}": body-${k}.js`);
      const decoded = validateBodySourceShape(unit, k, src);

      // The decoded values ARE the body content: no code from the file is
      // ever executed anywhere.
      validateBodyPart(unit, k, decoded);
      parts.push(decoded);
    }

    // bodyParts is a deterministic layout contract, not just a file count:
    // validate both the required count and every inter-part cut.
    validateBodySplitting(unit, meta, parts);

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
        const title = meta.title[lang];
        const headingLine =
          '#'.repeat(meta.level) + ' ' +
          (meta.kind === 'numbered' ? meta.number + meta.sep : '') + title;
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

function atomicWriteOutput(destination, data, { renameSync = fs.renameSync } = {}) {
  let fd = null;
  let tempPath = null;
  try {
    ({ fd, tempPath } = createTemporaryOutput(destination));
    if (!fs.fstatSync(fd).isFile()) {
      fail(`temporary output for ${destination} is not a regular file`);
    }
    fs.writeFileSync(fd, data);
    fs.closeSync(fd);
    fd = null;

    // Recheck immediately before replacement. rename() replaces the
    // destination atomically and never follows a destination symlink.
    assertRegularDestination(destination);
    renameSync(tempPath, destination);
    tempPath = null;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* preserve the original failure */ }
    }
    if (tempPath !== null) {
      try { fs.unlinkSync(tempPath); } catch { /* best-effort cleanup */ }
    }
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
  validateWriteRoots(specDir, contentDir);
  const outputs = [];
  for (const lang of LANGS) {
    outputs.push([path.join(specDir, OUT_FILES[lang]), bufs[lang]]);
    outputs.push([path.join(contentDir, README_FILES[lang]), readmeBufs[lang]]);
  }

  // Preflight every destination so a rejected symlink/special file cannot
  // leave a partially regenerated set of outputs behind.
  for (const [destination] of outputs) assertRegularDestination(destination);
  for (const [destination, data] of outputs) atomicWriteOutput(destination, data, options);
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
  for (const lang of LANGS) {
    const outPath = path.join(specDir, OUT_FILES[lang]);
    let existing;
    try {
      existing = fs.readFileSync(outPath);
    } catch {
      process.stderr.write(
        `build_spec --check: MISMATCH in ${OUT_FILES[lang]} (${lang}): ` +
        `output file missing at ${outPath}; expected ${totalLen[lang]} bytes\n`
      );
      process.exit(1);
    }
    const diff = firstByteDiff(existing, bufs[lang]);

    if (diff !== -1) {
      const unit = unitForLine(pieces, lang, diff);
      process.stderr.write(formatMismatchDiagnostic(
        OUT_FILES[lang], lang, existing, bufs[lang], diff, unit));
      process.exit(1);
    }
  }

  for (const lang of LANGS) {
    const outPath = path.join(contentDir, README_FILES[lang]);
    let existing;
    try {
      existing = fs.readFileSync(outPath);
    } catch {
      process.stderr.write(
        `build_spec --check: MISMATCH in ${README_FILES[lang]} (${lang}): ` +
        `output file missing at ${outPath}; expected ${readmeBufs[lang].length} bytes\n`
      );
      process.exit(1);
    }
    const diff = firstByteDiff(existing, readmeBufs[lang]);
    if (diff !== -1) {
      process.stderr.write(formatMismatchDiagnostic(
        README_FILES[lang], lang, existing, readmeBufs[lang], diff, README_SOURCE_FILE));
      process.exit(1);
    }
  }
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
