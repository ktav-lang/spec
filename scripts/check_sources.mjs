// Structural checks over the CONTENT SOURCES, next to the structural
// checks `check_translation_parity.py` already runs over the generated
// documents.
//
// The division of labour matters. The Python checker reads spec.md and
// its translations and compares § references, fenced blocks and RFC 2119
// keywords per section. That is a good gate and it misses a whole class:
// `releases/sec-0.5.0` once kept every cross-reference and every keyword
// while reducing thirteen of its fourteen bullets to stubs, and the
// checker passed. These checks read the sources instead, where a defect
// can be pointed at a file and a line rather than at a rendered section.
// The four checks themselves (parts-aligned, list-parity, indent-shapes,
// unwrapped) live in @ktav-lang/polydoc's checkSources — generic over any
// configured set of languages, not specific to this repository.
//
// Usage: node scripts/check_sources.mjs [<content-dir>] [--verbose]
//        exit 0 when clean, 1 with a report on stderr otherwise.
//
// With no <content-dir> the script sweeps every LIVING source-unit tree
// of the repository: the current release's content dir plus its
// readme-units, and every root-docs/<DOC>/ tree that has a manifest.js.
// Frozen version trees — any versions/<v>/content other than the release
// path — are reported as skipped, never silently. The known pre-existing
// source defects are recorded in KNOWN_SOURCE_DEFECTS below and reported
// as notes instead of failures; anything else fails.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkSources, readUnits } from '@ktav-lang/polydoc';
import { RELEASE_PATH } from './build_spec.mjs';

export { checkSources, readUnits };

// --------------------------------------------------- known source defects

// An honest baseline ratchet. The six problems below exist in the sources
// today and each needs a translator or a content owner, not a checker, so
// fixing them is out of scope for this script. They are reported as notes
// instead of failures; every OTHER problem still fails — including a new
// defect in one of these units, because each entry is keyed to the exact
// wording of its defect, not just to the unit.
export const KNOWN_SOURCE_DEFECTS = [
  // root-docs/CHANGELOG — stub translation of a historical entry; needs a translator.
  { unit: 'v0.5.0', contains: 'section:5.2 sits in different parts across languages' },
  // root-docs/CHANGELOG — historical prose edited without re-wrapping; a translator must re-wrap it.
  { unit: 'v0.7.0', contains: 'ru line 175 is 134 columns' },
  // versions/0.8/content/readme-units — stub translation in the author instructions; needs a translator.
  { unit: 'unit-contents', contains: 'error:JavaScript sits in different parts across languages' },
  // versions/0.8/content/readme-units — a shared fence was re-cut without re-cutting the translations; a content owner must re-cut it.
  { unit: 'how-the-generator-builds-a-file', contains: 'how-the-generator-builds-a-file: fence:' },
  // versions/0.8/content/readme-units — a translation invented a manifest bullet; a content owner must correct it.
  { unit: 'manifest-js', contains: 'bullet count differs (en=3 ru=3 zh=4)' },
  // versions/0.8/content/readme-units — prose edited without re-wrapping; a translator must re-wrap it.
  { unit: 'unit-contents', contains: 'ru line 8 is 147 columns' },
];

export function isKnownSourceDefect(problem) {
  return KNOWN_SOURCE_DEFECTS.some(({ unit, contains }) =>
    (problem.startsWith(`${unit}:`) || problem.startsWith(`${unit} `)) &&
    problem.includes(contains));
}

// ------------------------------------------------------------ tree sweep

/// Every LIVING source-unit tree under repoRoot, as `{ trees, skipped }`.
/// Trees are `{ label, dir }` with the label a repo-relative path. Frozen
/// version trees come back in `skipped` with a reason, so the sweep is
/// never silently narrower than the repository. A missing root-docs/ or
/// versions/ is an empty result, not an error — synthetic roots in tests.
export function findSourceTrees(repoRoot) {
  const trees = [];
  const skipped = [];
  const rootDocs = path.join(repoRoot, 'root-docs');
  if (fs.existsSync(rootDocs)) {
    for (const name of fs.readdirSync(rootDocs).sort()) {
      const dir = path.join(rootDocs, name);
      if (fs.existsSync(path.join(dir, 'manifest.js'))) {
        trees.push({ label: `root-docs/${name}`, dir });
      }
    }
  }
  const versions = path.join(repoRoot, 'versions');
  if (fs.existsSync(versions)) {
    for (const v of fs.readdirSync(versions).sort()) {
      const dir = path.join(versions, v, 'content');
      if (!fs.existsSync(path.join(dir, 'manifest.js'))) continue;
      const rel = `versions/${v}/content`;
      if (rel === `${RELEASE_PATH}/content`) {
        trees.push({ label: rel, dir });
        const readmeUnits = path.join(dir, 'readme-units');
        if (fs.existsSync(path.join(readmeUnits, 'manifest.js'))) {
          trees.push({ label: `${rel}/readme-units`, dir: readmeUnits });
        }
      } else {
        skipped.push({
          label: rel,
          why: 'frozen — never rebuilt; only the release version content tree is living',
        });
      }
    }
  }
  trees.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  return { trees, skipped };
}

const KNOWN_NOTE_PREFIX = 'note: known pre-existing ' +
  '(see KNOWN_SOURCE_DEFECTS in scripts/check_sources.mjs): ';

function checkTree(dir) {
  const units = readUnits(dir);
  const { problems, notes } = checkSources(units);
  const files = units.reduce((n, u) => n + u.parts.length, 0);
  const known = problems.filter((p) => isKnownSourceDefect(p));
  const unknown = problems.filter((p) => !isKnownSourceDefect(p));
  return { units, files, notes, known, unknown };
}

function printNotes({ known, notes }, verbose) {
  for (const problem of known) {
    process.stdout.write(`${KNOWN_NOTE_PREFIX}${problem}\n`);
  }
  if (verbose || notes.length > 0) {
    for (const note of notes) process.stdout.write(`note: ${note}\n`);
  }
}

function cli() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const contentDir = args.find((a) => !a.startsWith('--'));

  if (contentDir !== undefined) {
    const report = checkTree(path.resolve(contentDir));
    printNotes(report, verbose);
    if (report.unknown.length > 0) {
      for (const problem of report.unknown) {
        process.stderr.write(`check_sources: ${problem}\n`);
      }
      process.stderr.write(`check_sources: FAIL — ${report.unknown.length} problem(s) ` +
        `across ${report.units.length} unit(s), ${report.files} body file(s)\n`);
      process.exit(1);
    }
    process.stdout.write(`check_sources: PASS — ${report.units.length} unit(s), ` +
      `${report.files} body file(s), ${report.notes.length + report.known.length} note(s)\n`);
    process.exit(0);
  }

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { trees, skipped } = findSourceTrees(repoRoot);
  if (trees.length === 0) {
    process.stderr.write(`check_sources: no source trees found under ${repoRoot}\n`);
    process.exit(1);
  }
  for (const { label, why } of skipped) {
    process.stdout.write(`check_sources: skipping ${label} (${why})\n`);
  }
  let unitTotal = 0;
  let fileTotal = 0;
  let knownTotal = 0;
  let unknownTotal = 0;
  for (const tree of trees) {
    const report = checkTree(tree.dir);
    printNotes(report, verbose);
    unitTotal += report.units.length;
    fileTotal += report.files;
    knownTotal += report.known.length;
    unknownTotal += report.unknown.length;
    for (const problem of report.unknown) {
      process.stderr.write(`check_sources: ${problem}\n`);
    }
    if (report.unknown.length > 0) {
      process.stdout.write(`check_sources ${tree.label}: FAIL — ` +
        `${report.unknown.length + report.known.length} problem(s) ` +
        `(${report.unknown.length} unknown, ${report.known.length} known)\n`);
    } else {
      process.stdout.write(`check_sources ${tree.label}: PASS — ${report.units.length} unit(s), ` +
        `${report.files} body file(s), ${report.notes.length + report.known.length} note(s)\n`);
    }
  }
  if (unknownTotal > 0) {
    process.stderr.write(`check_sources: FAIL — ${unknownTotal} unknown problem(s) ` +
      `across ${trees.length} tree(s), ${knownTotal} known pre-existing\n`);
    process.exit(1);
  }
  process.stdout.write(`check_sources: PASS — ${trees.length} tree(s), ${unitTotal} unit(s), ` +
    `${fileTotal} body file(s), ${knownTotal} known pre-existing\n`);
  process.exit(0);
}

const invokedDirectly = process.argv[1] !== undefined &&
  path.resolve(process.argv[1]).endsWith(`${path.sep}check_sources.mjs`);
if (invokedDirectly) cli();
