// The four repository-root documents, and the three properties that make
// generating them worth anything.
//
// Each was confirmed by hand when the generation landed. Confirming by
// hand is a claim; these are the receipts.

import {
  ROOT_DOCUMENTS,
  buildRootDocs,
  checkRootDocs,
  foldRootSource,
  rootOutputName,
  rootSourceName,
  writeRootDocs,
} from '../../build_spec/root_docs.mjs';
import { LANGS } from '../../build_spec.mjs';
import { write } from '../helpers.mjs';
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

const sampleText = (doc, lang) => `# ${doc} ${lang}\n\nbody for ${lang}.\n`;

function sampleSource(doc) {
  return foldRootSource(Object.fromEntries(LANGS.map((l) => [l, sampleText(doc, l)])));
}

test('a root source generates one file per language, byte for byte', () => {
  const temp = rootWith({ [rootSourceName('README')]: sampleSource('README') });
  try {
    const docs = buildRootDocs(temp);
    writeRootDocs(temp, docs);
    for (const lang of LANGS) {
      assert.equal(
        fs.readFileSync(path.join(temp, rootOutputName('README', lang)), 'utf8'),
        sampleText('README', lang),
        `${rootOutputName('README', lang)} must be its block verbatim`);
    }
    assert.deepEqual(checkRootDocs(temp, docs), [],
      'a freshly written set must check clean');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a hand edit to a generated root document is reported by the check', () => {
  const temp = rootWith({ [rootSourceName('SECURITY')]: sampleSource('SECURITY') });
  try {
    const docs = buildRootDocs(temp);
    writeRootDocs(temp, docs);
    const victim = path.join(temp, rootOutputName('SECURITY', 'ru'));
    fs.writeFileSync(victim, `${fs.readFileSync(victim, 'utf8')}hand edit\n`);

    const problems = checkRootDocs(temp, docs);
    assert.equal(problems.length, 1, `expected exactly one problem, got ${problems.length}`);
    assert.match(problems[0], /SECURITY\.ru\.md differs from what SECURITY\.source\.md generates/);
    assert.match(problems[0], /edit the source, never the generated file/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('an artifact whose source is gone fails rather than being left unverifiable', () => {
  // The dangerous state: a file that looks generated and that nothing can
  // regenerate or check. Skipping it quietly is the same silent-skip trap
  // that lets a conformance runner report success on an empty corpus.
  const temp = rootWith({
    [rootOutputName('CHANGELOG', 'en')]: 'orphan\n',
    [rootOutputName('CHANGELOG', 'ru')]: 'сирота\n',
  });
  try {
    assert.throws(() => buildRootDocs(temp), (e) =>
      /CHANGELOG\.source\.md is missing, but CHANGELOG\.md, CHANGELOG\.ru\.md exist/.test(e.message));
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
  const files = {};
  for (const doc of ROOT_DOCUMENTS) files[rootSourceName(doc)] = sampleSource(doc);
  const temp = rootWith(files);
  try {
    const docs = buildRootDocs(temp);
    assert.deepEqual([...docs.keys()], [...ROOT_DOCUMENTS]);
    assert.equal(docs.size * LANGS.length, ROOT_DOCUMENTS.length * LANGS.length);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
