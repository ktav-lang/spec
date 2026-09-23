// The docs registry: every public Markdown file in the repository is
// either generated (rebuilt and byte-checked), frozen (historical, pinned
// by a hash lock) or internal (deliberately outside the output contract)
// — and nothing else. The scenarios here are the two ways a repository
// drifts: a brand-new unregistered file nobody owns (the GUIDE.md case),
// and a hand edit to a frozen version nobody may make.
//
// The frozen rule is deliberately asymmetric, like root-docs's
// artifact-without-source rule: a tree with neither frozen documents nor
// a lock has nothing to protect (the CLI-spawn fixtures build exactly
// such trees), but one frozen file or one lock anywhere means full
// enforcement.

import {
  DOCS_REGISTRY,
  checkDocsRegistry,
  classifyRegistered,
  defaultFrozenDocsLockPath,
  expectedGeneratedPaths,
  writeFrozenDocsLock,
} from '../../build_spec/registry.mjs';
import { installGenerator, write } from '../helpers.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-registry-'));
}

// A tree carrying the full frozen 0.7 history, with its lock already
// written from the on-disk bytes.
async function lockedFrozenTree() {
  const temp = tempRoot();
  fs.mkdirSync(path.join(temp, 'versions'));
  for (const rel of DOCS_REGISTRY.frozen) {
    write(path.join(temp, rel), `frozen contents of ${rel}\n`);
  }
  await writeFrozenDocsLock(temp, defaultFrozenDocsLockPath(temp));
  return temp;
}

async function captureStdout(fn) {
  const original = process.stdout.write;
  let captured = '';
  process.stdout.write = (chunk) => {
    captured += typeof chunk === 'string' ? chunk : String(chunk);
    return true;
  };
  try {
    await fn();
  } finally {
    process.stdout.write = original;
  }
  return captured;
}

test('the real repository passes the docs registry check', () => {
  assert.deepEqual(checkDocsRegistry(process.cwd()), []);
});

test('the generated list never drifts from what the builder builds', () => {
  const expected = expectedGeneratedPaths();
  assert.equal(expected.length, 18,
    `the builder must generate 18 public Markdown files, got ${expected.length}`);
  assert.deepEqual(expected, [...DOCS_REGISTRY.generated].sort(),
    'the explicit generated list must equal the builder-derived one, sorted');
});

test('an unregistered .md at a public location is an error — the GUIDE.md scenario', () => {
  const temp = tempRoot();
  try {
    // The builder's repo-root marker is not needed by the registry, but
    // keep the tree looking like the real repository.
    fs.mkdirSync(path.join(temp, 'versions'));
    write(path.join(temp, 'GUIDE.md'), 'a well-meaning hand-kept guide\n');

    const problems = checkDocsRegistry(temp);
    assert.equal(problems.length, 1, `expected exactly one problem, got ${problems.length}`);
    assert.match(problems[0], /unregistered public Markdown file: GUIDE\.md/);
    assert.match(problems[0], /scripts\/build_spec\/registry\.mjs/);

    fs.rmSync(path.join(temp, 'GUIDE.md'));
    assert.deepEqual(checkDocsRegistry(temp), [],
      'with the unregistered file gone, nothing is left to flag');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('internal locations are classified, not flagged', () => {
  const temp = tempRoot();
  try {
    write(path.join(temp, 'versions', '0.8', 'content', 'README.source.md'), 'source\n');
    write(path.join(temp, 'docs', 'checkpoints', 'x.md'), 'checkpoint\n');
    write(path.join(temp, 'docs', 'reviews', 'y.md'), 'review\n');
    assert.deepEqual(checkDocsRegistry(temp), [],
      'working notes and the retired single-file README source are internal');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('the internal wildcard covers any version content README source', () => {
  const temp = tempRoot();
  try {
    const rel = 'versions/0.9/content/README.source.md';
    write(path.join(temp, rel), 'source for a version that does not exist yet\n');
    assert.equal(classifyRegistered(rel), 'internal');
    assert.deepEqual(checkDocsRegistry(temp), [],
      'the one-segment wildcard must not pin the version number');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a frozen doc without a lock is an error and --write-frozen-lock records it', async () => {
  const temp = tempRoot();
  try {
    fs.mkdirSync(path.join(temp, 'versions'));
    for (const rel of DOCS_REGISTRY.frozen) {
      write(path.join(temp, rel), `frozen contents of ${rel}\n`);
    }
    const lockPath = defaultFrozenDocsLockPath(temp);

    const before = checkDocsRegistry(temp, lockPath);
    assert.ok(before.some((p) => /lock is missing/.test(p) && /--write-frozen-lock/.test(p)),
      `the lock-missing problem must name the remedy, got: ${before.join(' | ')}`);

    await writeFrozenDocsLock(temp, lockPath);
    const bytes = fs.readFileSync(lockPath);

    await writeFrozenDocsLock(temp, lockPath);
    assert.deepEqual(fs.readFileSync(lockPath), bytes,
      'a current lock must not be rewritten');

    // Tamper: append one byte to a frozen document. A frozen version is
    // never edited by hand, and now nothing can claim otherwise.
    const victim = path.join(temp, 'versions', '0.7', 'spec.ru.md');
    fs.appendFileSync(victim, 'x');
    const tampered = checkDocsRegistry(temp, lockPath);
    assert.equal(tampered.length, 1, `expected exactly one problem, got ${tampered.length}`);
    assert.match(tampered[0], /versions\/0\.7\/spec\.ru\.md differs from its frozen-docs lock hash/);
    assert.match(tampered[0], /--write-frozen-lock/);

    const output = await captureStdout(() => writeFrozenDocsLock(temp, lockPath));
    assert.match(output, /~ versions\/0\.7\/spec\.ru\.md/,
      'the regenerated lock must print the changed document as a delta');
    assert.match(output, /    was [0-9a-f]{64}\n    now [0-9a-f]{64}\n/);
    assert.notDeepEqual(fs.readFileSync(lockPath), bytes, 'the lock must be rewritten');
    assert.deepEqual(checkDocsRegistry(temp, lockPath), [],
      'the deliberately recorded change must check clean');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a deleted frozen doc is an error', async () => {
  const temp = await lockedFrozenTree();
  try {
    const victim = path.join(temp, 'versions', '0.7', 'content', 'README.zh.md');
    fs.rmSync(victim);
    const problems = checkDocsRegistry(temp, defaultFrozenDocsLockPath(temp));
    assert.equal(problems.length, 1, `expected exactly one problem, got ${problems.length}`);
    assert.match(problems[0], /versions\/0\.7\/content\/README\.zh\.md/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('--write-frozen-lock works on a bare tree without a content dir', () => {
  const temp = tempRoot();
  try {
    installGenerator(path.join(temp, 'scripts'));
    // No versions/, no content/, no frozen history at all — the flag must
    // still run and leave a lock behind, which pins its early return
    // happening before the content-dir existence check.
    const result = spawnSync(
      process.execPath,
      [path.join(temp, 'scripts', 'build_spec.mjs'), '--write-frozen-lock'],
      { cwd: temp, encoding: 'utf8' });
    assert.equal(result.status, 0,
      `the bare-tree lock write must succeed, got exit ${result.status}:\n${result.stderr}`);
    assert.ok(
      fs.existsSync(defaultFrozenDocsLockPath(temp)),
      'the lock file must exist after the run');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
