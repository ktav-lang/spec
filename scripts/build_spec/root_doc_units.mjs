// Unit/manifest assembly for a document assembled from small per-topic
// units instead of one big `<NAME>.source.md` file, mirroring
// versions/<v>/content/'s meta.js + body-N.md + manifest.js shape. Used
// by root_docs.mjs for the four repository-root documents (README,
// CHANGELOG, CONTRIBUTING, SECURITY) and by content.mjs as the
// alternative to its single-file per-version README path (see
// content.mjs's README_UNITS_DIR) — the function here is generic over
// "a directory containing manifest.js + unit dirs", so both callers
// share one implementation.
//
// DELIBERATELY NARROWER than versions/<v>/content/'s validateContentDir:
// - No numbered/named heading generation. A root document's prose is not a
//   numbered spec section; every unit's meta.js is `kind: "frontmatter"`
//   (number/level/title all null), which content.mjs's own validateMeta
//   already accepts unmodified — reused here, not reimplemented.
// - No nested group directories. Root documents are far smaller than the
//   ~105-unit spec; a flat manifest of unit names is enough.
// - No section-inventory lock. That lock exists to catch the spec's
//   105-units-claimed-vs-actual drift; root documents have no equivalent
//   external claim to drift from.
// What IS reused, unchanged, from content.mjs/decode.mjs/containers.mjs:
// validateMeta, validateBodySourceShape, validateBodyPart,
// validateBodySplitting, validateUnitTerminalNewlines, readJsonDefault,
// decodeUtf8Strict, rejectRawCarriageReturns. Same body-size mandate
// (BODY_LINE_LIMIT/BODY_TARGET_LINES via bodySplitPlan), same
// `scripts/recut_bodies.mjs <dir> --write` maintenance tool works
// unchanged against a root-document directory — it only ever assumes
// manifest.js + meta.js{bodyParts} + body-N.md, all satisfied here.
//
// Still no journalled transaction (see root_docs.mjs's own header comment
// for why root documents stay on the plain fs.writeFileSync path) — this
// module only changes what a document's SOURCE looks like, not how the
// build writes the result.

import fs from 'node:fs';
import path from 'node:path';

import {
  readJsonDefault, validateBodySplitting, validateUnitTerminalNewlines,
} from './content.mjs';
import { BODY_FILE_RE, LANGS, bodyFileName } from './shared.mjs';
import {
  decodeUtf8Strict, fail, failUnit, rejectRawCarriageReturns, validateBodyPart, validateMeta,
} from './units/decode.mjs';
import { validateBodySourceShape } from './units/containers.mjs';

/// `rootDocsDir` is e.g. `<repoRoot>/root-docs/README`. Returns `null` when
/// the directory (or its manifest.js) does not exist — the caller's signal
/// to fall back to the single-file `<NAME>.source.md` path instead.
export function hasRootDocUnits(rootDocsDir) {
  return fs.existsSync(path.join(rootDocsDir, 'manifest.js'));
}

function readManifest(rootDocsDir) {
  const manifestPath = path.join(rootDocsDir, 'manifest.js');
  const manifest = readJsonDefault(manifestPath);
  if (!Array.isArray(manifest) || manifest.length === 0 ||
      !manifest.every((n) => typeof n === 'string' && n.length > 0) ||
      new Set(manifest).size !== manifest.length) {
    fail(`${manifestPath}: manifest.js must export a non-empty array of unique non-empty strings`);
  }
  for (const unit of manifest) {
    const bad = (why) => fail(`${manifestPath}: entry ${JSON.stringify(unit)} ${why}`);
    if (unit.includes('/') || unit.includes('\\')) bad('must not contain a path separator (root documents use a flat unit list)');
    if (unit === '.' || unit === '..') bad('must not be "." or ".."');
  }
  return manifest;
}

/// Read and validate one unit directory. Returns its per-language body
/// parts (array of `{en, ru, zh}`, one per body-N.md), already validated
/// against the same split-size mandate every content unit obeys.
function readUnit(rootDocsDir, unit) {
  const unitDir = path.join(rootDocsDir, unit);
  const unitEntries = fs.readdirSync(unitDir, { withFileTypes: true });
  for (const ent of unitEntries) {
    if (!ent.isFile()) {
      failUnit(unit, `entry "${ent.name}" is not a regular file (symlinks, directories and other special entries are not allowed inside a root-document unit directory)`);
    }
  }
  const present = new Set(unitEntries.map((e) => e.name));
  if (!present.has('meta.js')) failUnit(unit, 'missing meta.js');
  const expected = new Set(['meta.js']);
  for (const name of present) {
    if (BODY_FILE_RE.test(name)) expected.add(name);
  }
  for (const name of present) {
    if (!expected.has(name)) failUnit(unit, `unexpected file ${name} in root-document unit directory`);
  }

  const meta = readJsonDefault(path.join(unitDir, 'meta.js'));
  validateMeta(unit, meta);
  if (meta.kind !== 'frontmatter') {
    failUnit(unit, `root-document units must have kind "frontmatter" (body-only, no generated heading); got ${JSON.stringify(meta.kind)}`);
  }

  const bodyFiles = [...present].filter((n) => BODY_FILE_RE.test(n));
  if (bodyFiles.length !== meta.bodyParts) {
    for (let k = 1; k <= meta.bodyParts; k++) {
      if (!present.has(bodyFileName(k))) failUnit(unit, `missing ${bodyFileName(k)} (meta.bodyParts is ${meta.bodyParts})`);
    }
    failUnit(unit, `expected exactly ${meta.bodyParts} body file(s), found ${bodyFiles.length}`);
  }

  const parts = [];
  for (let k = 1; k <= meta.bodyParts; k++) {
    const bodyPath = path.join(unitDir, bodyFileName(k));
    let buf;
    try {
      buf = fs.readFileSync(bodyPath);
    } catch (e) {
      failUnit(unit, `cannot read ${bodyFileName(k)}: ${e.message}`);
    }
    const sourceLabel = `root-document unit "${unit}": ${bodyFileName(k)}`;
    rejectRawCarriageReturns(buf, sourceLabel);
    const src = decodeUtf8Strict(buf, sourceLabel);
    const decoded = validateBodySourceShape(unit, k, src);
    validateBodyPart(unit, k, decoded);
    parts.push(decoded);
  }

  validateBodySplitting(unit, meta, parts);
  return parts;
}

/// Assemble one root document from its unit tree. `rootDocsDir` is e.g.
/// `<repoRoot>/root-docs/README`. Returns `{en, ru, zh}` concatenated body
/// text, in manifest order — the same shape `validateBodySourceShape`
/// returns for the single-file path, so root_docs.mjs's caller does not
/// need to know which path produced it.
export function assembleRootDocUnits(rootDocsDir) {
  const manifest = readManifest(rootDocsDir);

  const entries = fs.readdirSync(rootDocsDir, { withFileTypes: true });
  const manifestSet = new Set(manifest);
  for (const ent of entries) {
    if (ent.name === 'manifest.js') continue;
    if (!ent.isDirectory()) fail(`${rootDocsDir}: unexpected file "${ent.name}" (only manifest.js and unit directories are allowed)`);
    if (!manifestSet.has(ent.name)) fail(`${rootDocsDir}: unexpected directory "${ent.name}" (not in manifest.js)`);
  }
  for (const unit of manifest) {
    if (!entries.some((e) => e.isDirectory() && e.name === unit)) {
      fail(`${rootDocsDir}: manifest.js lists unit "${unit}" but its directory is missing`);
    }
  }

  const out = Object.fromEntries(LANGS.map((l) => [l, '']));
  for (let idx = 0; idx < manifest.length; idx++) {
    const unit = manifest[idx];
    const parts = readUnit(rootDocsDir, unit);
    validateUnitTerminalNewlines(unit, parts, idx === manifest.length - 1);
    for (const lang of LANGS) out[lang] += parts.map((p) => p[lang]).join('');
  }
  return out;
}
