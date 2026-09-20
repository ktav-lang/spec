// The four repository-root documents, and the three properties that make
// generating them worth anything.
//
// Each was confirmed by hand when the generation landed. Confirming by
// hand is a claim; these are the receipts.
//
// Every document is assembled from a `root-docs/<DOC>/` unit tree — see
// root_doc_units.mjs's header for why the shape is deliberately narrower
// than versions/<v>/content/'s (no headings, no nesting, no
// section-inventory lock). A single-file `<DOC>.source.md` shape existed
// here during migration and was retired once all four documents had
// moved (task #323) — do not resurrect it "just in case".

import {
  ROOT_DOCUMENTS,
  buildRootDocs,
  checkRootDocs,
  rootDocUnitsDir,
  rootOutputName,
  writeRootDocs,
} from '../../build_spec/root_docs.mjs';
import { LANGS } from '../../build_spec.mjs';
import { bodyFileName } from '../../build_spec/shared.mjs';
import { bodySource, metaJs, unitMeta, write } from '../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

/// A root that looks like this repository: it has `versions/`, which is
/// the marker the builder uses, plus whichever documents a case needs.
function rootWith(files) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-rootdocs-'));
  fs.mkdirSync(path.join(temp, 'versions'));
  for (const [name, text] of Object.entries(files)) write(path.join(temp, name), text);
  return temp;
}

function writeUnit(unitsDir, name, bodies, bodyParts = 1) {
  const dir = path.join(unitsDir, name);
  write(path.join(dir, 'meta.js'), metaJs(unitMeta('frontmatter', { bodyParts })));
  bodies.forEach((body, i) => {
    write(path.join(dir, bodyFileName(i + 1)), bodySource(...body));
  });
}

function writeSingleUnitDoc(repoRoot, doc, en, ru, zh) {
  const unitsDir = rootDocUnitsDir(repoRoot, doc);
  write(path.join(unitsDir, 'manifest.js'), metaJs(['only']));
  writeUnit(unitsDir, 'only', [[en, ru, zh]]);
}

const sampleText = (doc, lang) => `# ${doc} ${lang}\n\nbody for ${lang}.\n`;

test('a root document assembled from units generates one file per language, byte for byte', () => {
  const temp = rootWith({});
  try {
    writeSingleUnitDoc(temp, 'README', ...LANGS.map((l) => sampleText('README', l)));
    const docs = buildRootDocs(temp);
    writeRootDocs(temp, docs);
    for (const lang of LANGS) {
      assert.equal(
        fs.readFileSync(path.join(temp, rootOutputName('README', lang)), 'utf8'),
        sampleText('README', lang),
        `${rootOutputName('README', lang)} must be its unit's block verbatim`);
    }
    assert.deepEqual(checkRootDocs(temp, docs), [],
      'a freshly written set must check clean');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a hand edit to a generated root document is reported by the check', () => {
  const temp = rootWith({});
  try {
    writeSingleUnitDoc(temp, 'SECURITY', ...LANGS.map((l) => sampleText('SECURITY', l)));
    const docs = buildRootDocs(temp);
    writeRootDocs(temp, docs);
    const victim = path.join(temp, rootOutputName('SECURITY', 'ru'));
    fs.writeFileSync(victim, `${fs.readFileSync(victim, 'utf8')}hand edit\n`);

    const problems = checkRootDocs(temp, docs);
    assert.equal(problems.length, 1, `expected exactly one problem, got ${problems.length}`);
    assert.match(problems[0], /SECURITY\.ru\.md differs from what root-docs\/SECURITY\/ generates/);
    assert.match(problems[0], /edit the unit source, never the generated file/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('an artifact whose unit tree is gone fails rather than being left unverifiable', () => {
  // The dangerous state: a file that looks generated and that nothing can
  // regenerate or check. Skipping it quietly is the same silent-skip trap
  // that lets a conformance runner report success on an empty corpus.
  const temp = rootWith({
    [rootOutputName('CHANGELOG', 'en')]: 'orphan\n',
    [rootOutputName('CHANGELOG', 'ru')]: 'сирота\n',
  });
  try {
    assert.throws(() => buildRootDocs(temp), (e) =>
      /root-docs\/CHANGELOG\/manifest\.js is missing, but CHANGELOG\.md, CHANGELOG\.ru\.md exist/.test(e.message));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a tree that is not this repository generates nothing at all', () => {
  // The test harnesses build bare trees holding only content/. Without
  // this, every one of them would fail on four missing sources.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-not-a-repo-'));
  try {
    write(path.join(temp, 'README.md'), 'unrelated project\n');
    assert.equal(buildRootDocs(temp).size, 0,
      'no versions/ means this is not the spec repository');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('every root document declared is actually generated', () => {
  // Guards the list itself: adding a fifth document to ROOT_DOCUMENTS
  // without a source must fail loudly here rather than silently shipping
  // three more files nobody generates.
  const temp = rootWith({});
  try {
    for (const doc of ROOT_DOCUMENTS) {
      writeSingleUnitDoc(temp, doc, ...LANGS.map((l) => sampleText(doc, l)));
    }
    const docs = buildRootDocs(temp);
    assert.deepEqual([...docs.keys()], [...ROOT_DOCUMENTS]);
    assert.equal(docs.size * LANGS.length, ROOT_DOCUMENTS.length * LANGS.length);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a root-document unit with a non-frontmatter kind is rejected', () => {
  const temp = rootWith({});
  try {
    const unitsDir = rootDocUnitsDir(temp, 'CONTRIBUTING');
    write(path.join(unitsDir, 'manifest.js'), metaJs(['named-only']));
    const dir = path.join(unitsDir, 'named-only');
    write(path.join(dir, 'meta.js'), metaJs(unitMeta('named')));
    write(path.join(dir, bodyFileName(1)), bodySource('en.\n', 'ru.\n', 'zh.\n'));

    assert.throws(() => buildRootDocs(temp), /must have kind "frontmatter"/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('the shared non-last-unit trailing-newline rule applies across root-doc unit boundaries', () => {
  const temp = rootWith({});
  try {
    const unitsDir = rootDocUnitsDir(temp, 'CHANGELOG');
    write(path.join(unitsDir, 'manifest.js'), metaJs(['first', 'second']));
    // 'first' is NOT the last unit but ends with a single "\n", not "\n\n".
    writeUnit(unitsDir, 'first', [['no blank line after.\n', 'без пустой строки.\n', '后面没有空行。\n']]);
    writeUnit(unitsDir, 'second', [['tail.\n', 'хвост.\n', '尾部。\n']]);

    assert.throws(() => buildRootDocs(temp), /non-last unit's final chunk must end with "\\n\\n"/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
