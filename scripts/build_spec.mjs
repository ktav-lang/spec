#!/usr/bin/env node
// build_spec.mjs — assembles versions/0.7/spec{,.ru,.zh}.md from per-section
// content units in versions/0.7/content/ (manifest.js + unit dirs). Unit bodies
// come from body-1.js..body-N.js parts (N = meta.bodyParts), each holding
// { en, ru, zh } strings. No content file is ever executed: body-*.js is
// decoded by a raw-source scanner without running its code, and manifest.js /
// meta.js are decoded as strict UTF-8 and parsed as JSON, and must be
// byte-identical to the canonical serialization (`export default ` +
// JSON.stringify(value, null, 2) + one newline). release.js is the single
// release declaration (version + release date), read the same canonical way.
// Unit bodies may carry the plain tokens @@VERSION@@ / @@DATE@@; both are
// substituted with the release.js values at build time on the decoded text,
// and the build fails if a token survives into any of the three spec
// outputs. README.source.js is documentation, is never substituted, and may
// mention the tokens literally. The section-inventory
// lock's version must equal release.version.
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

//
// Implementation lives in ./build_spec/ — this entry keeps the CLI and
// re-exports the importable API.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { fail } from './build_spec/units/decode.mjs';
import { LANGS, OUT_FILES, defaultSectionInventoryLockPath } from './build_spec/shared.mjs';
import { buildBuffers, readRelease } from './build_spec/content.mjs';
import { pendingTransactionPaths } from './build_spec/transaction/journal.mjs';
import { recoverBuildOutputTransaction } from './build_spec/transaction/acquire.mjs';
import {
  checkBuildOutputs,
  validateWriteRoots,
  writeBuildOutputs,
} from './build_spec/outputs.mjs';
import { checkHandwrittenVersionReferences, writeSectionInventoryLock } from './build_spec/drift.mjs';

export * from './build_spec/shared.mjs';
export * from './build_spec/units/decode.mjs';
export * from './build_spec/units/blocks.mjs';
export * from './build_spec/units/containers.mjs';
export * from './build_spec/content.mjs';
export * from './build_spec/transaction/journal.mjs';
export * from './build_spec/transaction/rollback.mjs';
export * from './build_spec/transaction/lock.mjs';
export * from './build_spec/transaction/cleanup.mjs';
export * from './build_spec/transaction/acquire.mjs';
export * from './build_spec/outputs.mjs';
export * from './build_spec/drift.mjs';

function usage() {
  process.stdout.write(
    'Usage: node scripts/build_spec.mjs [--check | --write-section-lock | -h | --help]\n' +
    '  (default)   write the three spec files and three content READMEs\n' +
    '  --check     verify outputs are byte-identical; write nothing; silent on success\n' +
    '  --write-section-lock\n' +
    '              regenerate scripts/locks/section-inventory.0.7.lock.json from\n' +
    '              content/, printing every added, removed and changed unit first.\n' +
    '              The lock exists so that adding or removing a section is a\n' +
    '              deliberate act: read the printed delta before committing it.\n'
  );
}

async function cli() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptDir, '..');
  const specDir = path.join(root, 'versions', '0.7');
  const contentDir = path.join(specDir, 'content');

  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) { usage(); process.exit(0); }
  const KNOWN = new Set(['--check', '--write-section-lock']);
  if (args.length > 1 || (args.length === 1 && !KNOWN.has(args[0]))) {
    usage();
    process.exit(1);
  }
  const checkMode = args[0] === '--check';
  const writeLockMode = args[0] === '--write-section-lock';

  if (writeLockMode) {
    if (!fs.existsSync(contentDir)) fail(`content dir not found: ${contentDir}`);
    const release = readRelease(contentDir);
    await writeSectionInventoryLock(
      contentDir, defaultSectionInventoryLockPath(contentDir), release);
    return;
  }

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
    // Runs in BOTH write and --check modes, after buildBuffers succeeds but
    // BEFORE any output writing/comparison, so a pending-transaction or lock
    // failure still reports first.
    await checkHandwrittenVersionReferences(root, build.release);
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
