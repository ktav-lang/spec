import fs from 'node:fs';
import path from 'node:path';

import {
  BODY_LINE_LIMIT,
  BODY_TARGET_LINES,
  DATE_TOKEN,
  LANGS,
  OUT_FILES,
  BODY_FILE_RE,
  MAX_BODY_PARTS,
  README_FILES,
  README_SOURCE_FILE,
  RELEASE_FILE,
  bodyFileName,
  VERSION_TOKEN,
  defaultSectionInventoryLockPath,
} from './shared.mjs';
import {
  decodeUtf8Strict,
  fail,
  failUnit,
  generatedHeadingLine,
  rejectRawCarriageReturns,
  validateBodyPart,
  validateGeneratedHeading,
  validateMeta,
} from './units/decode.mjs';
import { validateBodySourceShape, validateUnitHeadings } from './units/containers.mjs';

const TOP_LEVEL_ALLOWED_FILES = new Set([
  'README.md', 'README.ru.md', 'README.zh.md', README_SOURCE_FILE,
  RELEASE_FILE, 'manifest.js', 'package.json',
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

export function substituteReleaseTokens(text, release) {
  return text.replaceAll(VERSION_TOKEN, release.version)
    .replaceAll(DATE_TOKEN, release.released);
}

// Facts about this corpus and this builder that the author instructions
// would otherwise restate by hand, in three languages.
//
// Every one of them had already rotted: the instructions claimed 103
// units when there were 105, and 97 numbered when there were 99. Those
// are not opinions a writer can hold — they are counts the manifest
// already has, copied into prose and then left behind. The same goes for
// the split constants, which live in shared.mjs and were transcribed
// into all three language blocks.
//
// Substituting them removes the second copy. It does NOT stop a future
// author typing `105` instead of the token — no check can tell a stale
// literal from a deliberate one — but it removes the reason to, and the
// guard below makes a MISSPELLED token fail the build rather than ship.
export function derivedFacts(manifest) {
  const unitName = (unit) => unit.slice(unit.lastIndexOf('/') + 1);
  const numbered = manifest.filter((u) => unitName(u).startsWith('sec-')).length;
  const named = manifest.filter((u) => unitName(u).startsWith('named-')).length;
  return new Map([
    ['@@UNIT_COUNT@@', String(manifest.length)],
    ['@@NUMBERED_UNIT_COUNT@@', String(numbered)],
    ['@@NAMED_UNIT_COUNT@@', String(named)],
    ['@@BODY_LINE_LIMIT@@', String(BODY_LINE_LIMIT)],
    ['@@BODY_TARGET_LINES@@', String(BODY_TARGET_LINES)],
    ['@@MAX_BODY_PARTS@@', String(MAX_BODY_PARTS)],
    ['@@LANG_LIST@@', LANGS.join(', ')],
    ['@@LANG_COUNT@@', String(LANGS.length)],
    ['@@README_SOURCE_FILE@@', README_SOURCE_FILE],
  ]);
}

const DERIVED_TOKEN_RE = /@@[A-Z_]+@@/gu;

// Tokens that are MEANT to reach the reader spelled as tokens. The
// author instructions document the release-token mechanism, so they have
// to be able to write @@VERSION@@ in prose; substituting there replaced
// seven explanations of the mechanism with the version number.
const PASS_THROUGH_TOKENS = new Set([VERSION_TOKEN, DATE_TOKEN]);

export function substituteDerivedFacts(text, manifest, label) {
  let out = text;
  for (const [token, value] of derivedFacts(manifest)) out = out.replaceAll(token, value);
  const straggler = [...out.matchAll(DERIVED_TOKEN_RE)]
    .map((m) => m[0])
    .find((token) => !PASS_THROUGH_TOKENS.has(token));
  if (straggler !== undefined) {
    fail(`${label} still contains placeholder ${straggler} after substitution; ` +
      `either it is misspelled or it names a fact the builder does not derive`);
  }
  return out;
}

const RELEASE_KEY_ORDER = ['version', 'released'];
const RELEASE_VERSION_RE = /^\d+\.\d+\.\d+$/u;
const RELEASE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

function readRelease(contentDir) {
  const releasePath = path.join(contentDir, RELEASE_FILE);
  const release = readJsonDefault(releasePath);
  const CANONICAL_PREFIX = 'export default ';
  const canonical = CANONICAL_PREFIX + JSON.stringify(release, null, 2) + '\n';
  if (fs.readFileSync(releasePath, 'utf8') !== canonical) {
    fail(`${RELEASE_FILE} must be byte-identical to the canonical serialization (${CANONICAL_PREFIX} + JSON.stringify(value, null, 2) + one newline)`);
  }
  if (typeof release !== 'object' || release === null || Array.isArray(release)) {
    fail(`${RELEASE_FILE} must export an object`);
  }
  const keys = Object.keys(release);
  const extra = keys.filter((key) => !RELEASE_KEY_ORDER.includes(key));
  const missing = RELEASE_KEY_ORDER.filter((key) => !keys.includes(key));
  if (extra.length || missing.length ||
      keys.some((key, i) => key !== RELEASE_KEY_ORDER[i])) {
    const bits = [];
    if (extra.length) bits.push(`unexpected key(s) ${extra.map((k) => JSON.stringify(k)).join(', ')}`);
    if (missing.length) bits.push(`missing key(s) ${missing.map((k) => JSON.stringify(k)).join(', ')}`);
    fail(`${RELEASE_FILE} must have exactly the keys {version, released} in that order` +
      (bits.length ? `; got ${bits.join('; ')}` : ''));
  }
  if (typeof release.version !== 'string' || release.version.length === 0) {
    fail(`${RELEASE_FILE} field version must be a non-empty string`);
  }
  if (!RELEASE_VERSION_RE.test(release.version)) {
    fail(`${RELEASE_FILE} field version must match /^\\d+\\.\\d+\\.\\d+$/u; got ${JSON.stringify(release.version)}`);
  }
  if (typeof release.released !== 'string' || release.released.length === 0) {
    fail(`${RELEASE_FILE} field released must be a non-empty string`);
  }
  if (!RELEASE_DATE_RE.test(release.released)) {
    fail(`${RELEASE_FILE} field released must match /^\\d{4}-\\d{2}-\\d{2}$/u; got ${JSON.stringify(release.released)}`);
  }
  return { version: release.version, released: release.released };
}

function validateSectionInventoryLock(manifest, lockPath, units = null, expectedVersion) {
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
  if (lock.version !== expectedVersion) {
    fail(`${lockPath} must be version ${JSON.stringify(expectedVersion)}; got ${JSON.stringify(lock.version)}`);
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
  const cutIndices = [];
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
    cutIndices.push(bestBlankIndex);
    previousBlankIndex = bestBlankIndex;
  }
  return {
    lineCount,
    blankLineCount: blankLines.length,
    cuts,
    // WHICH paragraph boundaries were chosen, not just where they landed.
    // The boundary index is the language-independent part: boundary i is
    // the i-th paragraph break, and that is the same break in every
    // translation. See cutsAtBoundaries below.
    cutIndices,
    boundaryOffsets: blankLines.map((b) => offsets[b + 1]),
  };
}

// The character offsets, in THIS language, of a set of paragraph-boundary
// indices chosen elsewhere.
function cutsAtBoundaries(layout, indices) {
  return indices.map((i) => layout.boundaryOffsets[i]);
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

  // The cut points are chosen ONCE and shared, as paragraph-boundary
  // indices. Boundary i is the i-th paragraph break, which is the same
  // break in every translation, so part k holds the same fragment in every
  // language — a file you can open and compare, rather than three slices
  // that happen to carry the same total.
  //
  // Choosing per language is what this replaces, and it was visibly wrong:
  // Chinese runs about half the length of English for the same meaning, so
  // its proportional target landed somewhere else and its part boundaries
  // drifted away from the other two. Nothing was lost — the generator
  // concatenates — but the source was unreviewable.
  //
  // The reference for WHERE to cut is the longest language, since the part
  // size mandate is expressed in its lines; ties break on LANGS order so
  // the choice is deterministic.
  const reference = LANGS.find((lang) => lineCounts[lang] === maxLines);
  const cutIndices = splitPlan(bodies[reference], partCount, maxLines).cutIndices;
  const plans = Object.fromEntries(
    LANGS.map((lang) => [lang, {
      ...layouts[lang],
      cuts: cutsAtBoundaries(layouts[lang], cutIndices),
    }])
  );

  return { lineCounts, maxLines, partCount, reference, cutIndices, plans };
}

function validateBodySplitting(unit, meta, parts) {
  const plan = bodySplitPlan(parts);
  if (meta.bodyParts !== plan.partCount) {
    failUnit(unit,
      `bodyParts ${meta.bodyParts} does not match the mandated split count ` +
      `${plan.partCount} for ${plan.maxLines} body lines (the limit is ` +
      `${BODY_LINE_LIMIT}; target size is ${BODY_TARGET_LINES})`);
  }

  // A cut is a paragraph-boundary INDEX chosen once, in the reference
  // language, and then looked up in each of the others. That lookup only
  // means something while the translations agree on where the paragraphs
  // are. When one of them has fewer boundaries the index names nothing,
  // and the honest report is that the paragraph structure diverged -- a
  // content defect -- rather than a cut offset of `undefined` surfacing
  // later as an unreadable mismatch against the actual parts.
  const neededBoundaries = plan.cutIndices.length === 0
    ? 0
    : Math.max(...plan.cutIndices) + 1;
  for (const lang of LANGS) {
    const available = plan.plans[lang].boundaryOffsets.length;
    if (available < neededBoundaries) {
      failUnit(unit,
        `${lang}: has ${available} paragraph boundary/boundaries but the shared cut ` +
        `points need ${neededBoundaries} (chosen in ${plan.reference}); every language ` +
        `must keep the same paragraph structure so part k is the same fragment`);
    }
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
  // A unit may live in a group directory, so an entry is a relative path
  // and not just a name. The shape is deliberately narrow: forward
  // slashes only, no empty segment, no `.` or `..`, nothing absolute and
  // no backslash — a path that escapes content/ must never reach
  // path.join below, and a Windows-style separator must not become one
  // segment on one platform and two on another.
  for (const unit of manifest) {
    const bad = (why) => fail(`manifest.js entry ${JSON.stringify(unit)} ${why}`);
    if (unit.includes('\\')) bad('must use "/" as its separator, never "\\"');
    if (unit.startsWith('/')) bad('must be relative to content/, not absolute');
    const segments = unit.split('/');
    if (segments.some((s) => s === '')) bad('must not contain an empty path segment');
    if (segments.some((s) => s === '.' || s === '..')) bad('must not contain "." or ".."');
  }
  // Two units may not disagree about whether a directory holds units or
  // holds other directories.
  const groupDirs = new Set();
  for (const unit of manifest) {
    const segments = unit.split('/');
    for (let i = 1; i < segments.length; i++) {
      groupDirs.add(segments.slice(0, i).join('/'));
    }
  }
  for (const unit of manifest) {
    if (groupDirs.has(unit)) {
      fail(`manifest.js entry ${JSON.stringify(unit)} is both a unit and the parent of another unit`);
    }
  }

  const release = readRelease(contentDir);

  const lockPath = options.requireSectionInventoryLock || options.sectionInventoryLockPath
    ? options.sectionInventoryLockPath || defaultSectionInventoryLockPath(contentDir)
    : null;
  if (lockPath !== null) validateSectionInventoryLock(manifest, lockPath, null, release.version);

  const manifestSet = new Set(manifest);

  // 1. Top-level allowlist + 2. exact directory-set match, applied at
  // every level. A group directory holds nothing but more directories;
  // only the top level may hold files, and only the allowlisted ones.
  // Anything the manifest did not name is rejected wherever it appears,
  // so nesting widens the tree without widening what is accepted.
  const actualDirs = new Set();
  const actualFiles = new Set();

  const walkLevel = (rel, levelEntries) => {
    for (const ent of levelEntries) {
      const child = rel === '' ? ent.name : `${rel}/${ent.name}`;
      if (ent.isDirectory()) {
        if (manifestSet.has(child)) {
          actualDirs.add(child);
        } else if (groupDirs.has(child)) {
          walkLevel(child, fs.readdirSync(path.join(contentDir, child), { withFileTypes: true }));
        } else {
          fail(`unexpected directory under content/: "${child}" (not in manifest.js)`);
        }
      } else if (ent.isFile()) {
        if (rel !== '') {
          fail(`unexpected file under content/: "${child}" (a group directory holds only unit directories)`);
        }
        if (!TOP_LEVEL_ALLOWED_FILES.has(ent.name)) {
          fail(`unexpected file under content/: "${ent.name}"`);
        }
        actualFiles.add(ent.name);
      } else {
        fail(`unexpected entry under content/: "${child}"`);
      }
    }
  };
  walkLevel('', entries);

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
    // symlink named meta.js/body-N.md would otherwise pass the name
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
      if (BODY_FILE_RE.test(name)) expected.add(name);
    }
    for (const name of present) {
      if (expected.has(name)) continue;
      if (/\.md$/.test(name) && ['en', 'ru', 'zh'].includes(name.slice(0, -3))) {
        failUnit(unit, `legacy per-language file ${name} is not allowed under content/; edit body-*.md instead`);
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
      .filter((n) => BODY_FILE_RE.test(n));
    const bodyFileSet = new Set(bodyFiles);
    const malformedBodyFiles = bodyFiles.filter((name) => {
      const digits = name.slice(5, -3);
      const number = Number(digits);
      return !Number.isSafeInteger(number) || number < 1 || String(number) !== digits;
    });
    if (malformedBodyFiles.length) {
      failUnit(unit,
        `unexpected body file(s) ${malformedBodyFiles.join(', ')} ` +
        `(body files must be ${bodyFileName(1)}..${bodyFileName(meta.bodyParts)})`);
    }
    if (bodyFiles.length !== meta.bodyParts) {
      for (let k = 1; k <= meta.bodyParts; k++) {
        if (!bodyFileSet.has(bodyFileName(k))) {
          failUnit(unit, `missing ${bodyFileName(k)} (meta.bodyParts is ${meta.bodyParts})`);
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
        failUnit(unit, `unexpected body file(s) ${odd.join(', ')} (body files must be ${bodyFileName(1)}..${bodyFileName(meta.bodyParts)})`);
      }
      failUnit(unit, `expected exactly ${meta.bodyParts} body file(s), found ${bodyFiles.length}`);
    }

    const parts = [];
    for (let k = 1; k <= meta.bodyParts; k++) {
      const bodyPath = path.join(unitDir, bodyFileName(k));

      // Read and shape-validate the raw source: a body file that is not
      // exactly the documented literal-object shape is rejected here, and
      // its statically decoded text is used as the body content -- no code
      // from it is ever run.
      let buf;
      try {
        buf = fs.readFileSync(bodyPath);
      } catch (e) {
        failUnit(unit, `cannot read ${bodyFileName(k)}: ${e.message}`);
      }
      const sourceLabel = `unit "${unit}": ${bodyFileName(k)}`;
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

  if (lockPath !== null) validateSectionInventoryLock(manifest, lockPath, units, release.version);
  return { manifest, units, readmes, release };
}

// Assemble outputs without writing. Returns { bufs, totalLen, manifest, pieces }.
export async function buildBuffers(contentDir, options = {}) {
  const { manifest, units, readmes, release } = await validateContentDir(contentDir, options);

  const outputs = { en: [], ru: [], zh: [] };
  const pieces = { en: [], ru: [], zh: [] };
  const lens = { en: 0, ru: 0, zh: 0 };

  for (const unit of manifest) {
    const { meta, parts } = units.get(unit);
    for (const lang of LANGS) {
      const bodyText = substituteReleaseTokens(parts.map((p) => p[lang]).join(''), release);
      const body = Buffer.from(bodyText, 'utf8');
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
  // The author instructions carry facts this builder owns — how many
  // units exist, what the split constants are. Substituting them here is
  // what stops the document drifting from the corpus it describes.
  // Derived facts are substituted; RELEASE tokens deliberately are not.
  // This document explains the token mechanism, so it has to be able to
  // write @@VERSION@@ in prose and have it survive to the reader —
  // substituting there replaced seven explanations with "0.7.1". The
  // derived-fact tokens are safe because nothing here names one; if that
  // ever changes, this same trap opens for them and will need the same
  // kind of escape the `>>>>> lang=` separator already has.
  const readmeBufs = {};
  for (const lang of LANGS) {
    const text = substituteDerivedFacts(readmes[lang], manifest, README_FILES[lang]);
    readmeBufs[lang] = Buffer.from(text, 'utf8');
  }
  for (const lang of LANGS) {
    for (const token of [VERSION_TOKEN, DATE_TOKEN]) {
      if (bufs[lang].includes(token)) {
        fail(`built ${OUT_FILES[lang]} still contains release placeholder ${token} (substitution is mandatory; a surviving token means the token text also occurs literally somewhere the builder does not substitute)`);
      }
    }
  }
  return { bufs, totalLen, manifest, pieces, readmeBufs, release };
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

export { LOCK_ROOT_KEYS, LOCK_UNIT_KEYS, RELEASE_DATE_RE, RELEASE_KEY_ORDER, RELEASE_VERSION_RE, TOP_LEVEL_ALLOWED_FILES, assertRegularDestination, bodySplitPlan, readCanonicalJson, readJsonDefault, readReadmeSource, readRelease, structuralMeta, validateBodySplitting, validateSectionInventoryLock };
