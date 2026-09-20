// The repository's four front-page documents, generated from a
// `root-docs/<DOC>/` unit tree each instead of twelve hand-kept files.
//
// README, CHANGELOG, CONTRIBUTING and SECURITY used to exist as four
// documents times three languages, each file edited on its own. Nothing
// tied a translation to its English, and the builder's own name for the
// arrangement said so: `HANDWRITTEN_FILES`. They had not drifted, but
// they were held in line by discipline, which is exactly how the author
// instructions were held in line right up until they claimed 103 units
// against a corpus of 105.
//
// Every unit uses the same `>>>>> lang=` blocks as a spec content unit's
// body, so a translator sees all three languages in one file — see
// root_doc_units.mjs for the exact shape (meta.js + body-N.md,
// `recut_bodies.mjs`'s size mandate, no generated heading).
//
// A single-file `<DOC>.source.md` shape existed here during migration
// (each of the four documents moved to the unit shape independently, so
// the ones already migrated did not have to wait on the ones that were
// not) and was retired once all four had moved — do not resurrect it
// "just in case"; the unit tree is strictly more capable (recut_bodies.mjs
// works on it, a single big file cannot be size-limited the same way).
//
// DELIBERATE ASYMMETRY, so nobody mistakes it for an oversight: this does
// not go through the journalled transaction that installs spec.md and
// content/README.md. That transaction exists to keep a 105-unit assembly
// consistent across a crash, and it is scoped to `versions/<v>/` and its
// `content/`. Extending it to the repository root would widen where a
// build may write, in exchange for atomicity on CONTRIBUTING.md. The
// `--check` guarantee — a hand edit to a generated file fails the build
// — is identical either way, and that is the guarantee these files
// actually need.

import fs from 'node:fs';
import path from 'node:path';

import { assembleRootDocUnits, hasRootDocUnits } from './root_doc_units.mjs';
import { LANGS } from './shared.mjs';
import { fail } from './units/decode.mjs';

/// Where a root document's unit tree lives, e.g. `<repoRoot>/root-docs/README/`.
/// Sibling to `versions/`, never inside it — versions/<v>/content/ already
/// owns a README.md/readme-units/ of its own (the per-version README), and
/// this name must never collide with that path (see root_doc_units.mjs's
/// header for the full reasoning).
export const rootDocUnitsDir = (repoRoot, doc) => path.join(repoRoot, 'root-docs', doc);

/// The documents that live at the repository root, in the order a
/// reader meets them.
export const ROOT_DOCUMENTS = ['README', 'CHANGELOG', 'CONTRIBUTING', 'SECURITY'];

export const rootOutputName = (doc, lang) => (lang === 'en' ? `${doc}.md` : `${doc}.${lang}.md`);

/// Read every root document's unit tree and return `doc -> lang -> Buffer`.
/// A missing or malformed source fails the build rather than leaving
/// the previous artifact in place.
export function buildRootDocs(repoRoot) {
  const out = new Map();

  // `versions/` is what identifies this repository's root, and it is the
  // same marker the Rust conformance runner uses to find a spec checkout.
  // Recognising the root by its ARTIFACTS instead does not work: the
  // content directory holds a README.md of its own, generated from its
  // own source, so the names collide and the check fires on the wrong
  // files. A test harness that builds a bare tree has no `versions/` and
  // correctly generates nothing.
  if (!fs.existsSync(path.join(repoRoot, 'versions'))) return out;

  for (const doc of ROOT_DOCUMENTS) {
    const unitsDir = rootDocUnitsDir(repoRoot, doc);

    // A directory with neither the unit tree nor the artifacts is not
    // this repository — the test harnesses build minimal trees holding
    // only `content/` — and there is nothing to generate. But an
    // artifact WITHOUT its source is the dangerous state: a file that
    // looks generated, that nothing can regenerate or check. Fail on
    // that, and never on the harmless one. A blanket "no sources, skip
    // quietly" is the same silent-skip trap that lets a conformance
    // runner report success on an empty corpus.
    if (!hasRootDocUnits(unitsDir)) {
      const orphans = LANGS
        .map((lang) => rootOutputName(doc, lang))
        .filter((artifact) => fs.existsSync(path.join(repoRoot, artifact)));
      if (orphans.length === 0) continue;
      fail(`root-docs/${doc}/manifest.js is missing, but ${orphans.join(', ')} exist and are ` +
        `generated from it; restore the unit tree or delete the artifacts — they cannot be ` +
        `checked without it`);
    }

    const blocks = assembleRootDocUnits(unitsDir);
    const perLang = new Map();
    for (const lang of LANGS) perLang.set(lang, Buffer.from(blocks[lang], 'utf8'));
    out.set(doc, perLang);
  }
  return out;
}

export function writeRootDocs(repoRoot, docs) {
  for (const [doc, perLang] of docs) {
    for (const lang of LANGS) {
      fs.writeFileSync(path.join(repoRoot, rootOutputName(doc, lang)), perLang.get(lang));
    }
  }
}

/// Compare every generated root document against what is on disk.
/// Returns a list of human-readable divergences; empty means identical.
export function checkRootDocs(repoRoot, docs) {
  const problems = [];
  for (const [doc, perLang] of docs) {
    for (const lang of LANGS) {
      const name = rootOutputName(doc, lang);
      const expected = perLang.get(lang);
      let actual;
      try {
        actual = fs.readFileSync(path.join(repoRoot, name));
      } catch (e) {
        problems.push(`${name} is missing or unreadable (${e.message}); it is generated from ` +
          `root-docs/${doc}/`);
        continue;
      }
      if (actual.equals(expected)) continue;
      let off = 0;
      const min = Math.min(actual.length, expected.length);
      while (off < min && actual[off] === expected[off]) off++;
      const line = expected.subarray(0, off).toString('utf8').split('\n').length;
      problems.push(
        `${name} differs from what root-docs/${doc}/ generates, first at byte ${off} ` +
        `(line ${line}); edit the unit source, never the generated file`);
    }
  }
  return problems;
}
