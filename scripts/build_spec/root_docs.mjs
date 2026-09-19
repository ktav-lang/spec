// The repository's four front-page documents, generated from one triple
// source each instead of twelve hand-kept files.
//
// README, CHANGELOG, CONTRIBUTING and SECURITY used to exist as four
// documents times three languages, each file edited on its own. Nothing
// tied a translation to its English, and the builder's own name for the
// arrangement said so: `HANDWRITTEN_FILES`. They had not drifted, but
// they were held in line by discipline, which is exactly how the author
// instructions were held in line right up until they claimed 103 units
// against a corpus of 105.
//
// Each `<NAME>.source.md` uses the same `>>>>> lang=` blocks as a unit
// body, so a translator sees all three languages in one file.
//
// DELIBERATE ASYMMETRY, so nobody mistakes it for an oversight: these
// twelve are written plainly, not through the journalled transaction
// that installs spec.md and content/README.md. That transaction exists
// to keep a 105-unit assembly consistent across a crash, and it is
// scoped to `versions/<v>/` and its `content/`. Extending it to the
// repository root would widen where a build may write, in exchange for
// atomicity on CONTRIBUTING.md. The `--check` guarantee — a hand edit to
// a generated file fails the build — is identical either way, and that
// is the guarantee these files actually need.

import fs from 'node:fs';
import path from 'node:path';

import { LANGS, langSeparator } from './shared.mjs';
import { decodeUtf8Strict, fail, rejectRawCarriageReturns } from './units/decode.mjs';
import { validateBodySourceShape } from './units/containers.mjs';

/// The documents that live at the repository root, in the order a
/// reader meets them.
export const ROOT_DOCUMENTS = ['README', 'CHANGELOG', 'CONTRIBUTING', 'SECURITY'];

export const rootSourceName = (doc) => `${doc}.source.md`;
export const rootOutputName = (doc, lang) => (lang === 'en' ? `${doc}.md` : `${doc}.${lang}.md`);

/// Read every root source and return `doc -> lang -> Buffer`.
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
    const name = rootSourceName(doc);
    const sourcePath = path.join(repoRoot, name);

    // A directory with neither the source nor its artifacts is not this
    // repository — the test harnesses build minimal trees holding only
    // `content/` — and there is nothing to generate. But an artifact
    // WITHOUT its source is the dangerous state: a file that looks
    // generated, that nothing can regenerate or check. Fail on that, and
    // never on the harmless one. A blanket "no sources, skip quietly" is
    // the same silent-skip trap that lets a conformance runner report
    // success on an empty corpus.
    if (!fs.existsSync(sourcePath)) {
      const orphans = LANGS
        .map((lang) => rootOutputName(doc, lang))
        .filter((artifact) => fs.existsSync(path.join(repoRoot, artifact)));
      if (orphans.length === 0) continue;
      fail(`${name} is missing, but ${orphans.join(', ')} exist and are generated from it; ` +
        `restore the source or delete the artifacts — they cannot be checked without it`);
    }

    let buf;
    try {
      buf = fs.readFileSync(sourcePath);
    } catch (e) {
      fail(`cannot read ${name}: ${e.message}; the root documents are generated from it`);
    }
    rejectRawCarriageReturns(buf, name);
    const blocks = validateBodySourceShape('root', name, decodeUtf8Strict(buf, name), name);
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
          `${rootSourceName(doc)}`);
        continue;
      }
      if (actual.equals(expected)) continue;
      let off = 0;
      const min = Math.min(actual.length, expected.length);
      while (off < min && actual[off] === expected[off]) off++;
      const line = expected.subarray(0, off).toString('utf8').split('\n').length;
      problems.push(
        `${name} differs from what ${rootSourceName(doc)} generates, first at byte ${off} ` +
        `(line ${line}); edit the source, never the generated file`);
    }
  }
  return problems;
}

/// Fold three existing per-language files into one triple source. Used
/// by the one-time migration and by its test; the build never calls it.
export function foldRootSource(perLangText) {
  let source = '';
  for (const lang of LANGS) source += `${langSeparator(lang)}\n${perLangText[lang]}`;
  return source;
}
