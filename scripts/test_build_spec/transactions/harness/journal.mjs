// The transaction journal itself: a published journal contains only
// exact derived records and rejects crafted paths, an unpublished tmp is
// cleaned without ever being mistaken for a journal, --check reports
// pending artifacts without removing or rewriting them, and a normal CLI
// write recovers pre-journal outputs before closed-world validation runs.

import {
  buildBuffers,
  recoverBuildOutputTransaction,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import {
  REAL_RELEASE,
  baseFixtures,
  copyHandwrittenRootFiles,
  installGenerator,
  lockUnits,
  makeContent,
  realReleaseJs,
  write,
} from '../../helpers.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function publishedTransactionJournalContainsOnlyExactDerivedRecordsAndRejectsCraftedPaths() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-journal-schema-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const manifestPath = path.join(contentDir, 'manifest.js');
    const manifestBefore = fs.readFileSync(manifestPath);
    write(path.join(versionDir, '.build-spec.transaction.json'), JSON.stringify({
      format: 'ktav-build-output-transaction',
      version: 1,
      items: [{ destination: manifestPath, tempPath: manifestPath, backupPath: manifestPath }],
    }) + '\n');

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (error) => /invalid schema|invalid header|unsupported/.test(error.message) &&
        !(error instanceof TypeError)
    );
    assert.deepEqual(fs.readFileSync(manifestPath), manifestBefore);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function recoveryCleansAnUnpublishedJournalTmpButNeverTreatsItAsAJournal() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-journal-torn-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const torn = path.join(versionDir, '.build-spec.transaction.json.tmp');
    write(torn, '{"phase":"installing"');
    recoverBuildOutputTransaction(versionDir, contentDir);
    assert.equal(fs.existsSync(torn), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function checkReportsPendingTransactionArtifactsWithoutRemovingOrRewritingThem() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-check-transaction-'));
  try {
    const scriptDir = path.join(temp, 'scripts');
    const versionDir = path.join(temp, 'versions', '0.8');
    const contentDir = path.join(versionDir, 'content');
    installGenerator(scriptDir);
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    write(path.join(contentDir, 'release.js'), realReleaseJs());
    write(path.join(temp, 'scripts', 'locks', 'section-inventory.0.8.lock.json'),
      JSON.stringify({
        format: 'ktav-section-inventory',
        units: lockUnits(fixtures, fixtures.map((u) => u.name)),
        version: REAL_RELEASE.version,
      }, null, 2) + '\n');
    copyHandwrittenRootFiles(temp);
    const build = await buildBuffers(contentDir, { requireSectionInventoryLock: true });
    writeBuildOutputs(versionDir, contentDir, build);
    const torn = path.join(versionDir, '.build-spec.transaction.json.tmp');
    const lock = path.join(versionDir, '.build-spec.transaction.lock');
    write(torn, 'torn unpublished journal');
    write(lock, 'dead-owner lock must remain byte-identical\n');
    const before = new Map([torn, lock].map((file) => [file, fs.readFileSync(file)]));
    const result = spawnSync(process.execPath, [path.join(scriptDir, 'build_spec.mjs'), '--check'], {
      cwd: temp, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending\/interrupted transaction artifact/);
    for (const [file, bytes] of before) assert.deepEqual(fs.readFileSync(file), bytes, file);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function normalCliWriteRecoversPreJournalOutputsBeforeClosedWorldValidation() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-cli-prejournal-recovery-'));
  try {
    const scriptDir = path.join(temp, 'scripts');
    const versionDir = path.join(temp, 'versions', '0.8');
    const contentDir = path.join(versionDir, 'content');
    fs.mkdirSync(path.join(scriptDir, 'locks'), { recursive: true });
    installGenerator(scriptDir);
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    write(path.join(contentDir, 'release.js'), realReleaseJs());
    write(path.join(scriptDir, 'locks', 'section-inventory.0.8.lock.json'),
      JSON.stringify({
        format: 'ktav-section-inventory',
        units: lockUnits(fixtures, fixtures.map((u) => u.name)),
        version: REAL_RELEASE.version,
      }, null, 2) + '\n');
    copyHandwrittenRootFiles(temp);
    const expected = await buildBuffers(contentDir);
    const scriptUrl = pathToFileURL(path.join(scriptDir, 'build_spec.mjs')).href;
    const source = `
      import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      const build = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, build);
    `;
    const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: temp,
      env: { ...process.env, KTAV_BUILD_SPEC_CRASH_BEFORE_FIRST_JOURNAL: '1' },
      encoding: 'utf8',
    });
    assert.notEqual(crashed.status, 0);
    assert.ok(fs.readdirSync(contentDir).some((name) => name.endsWith('.tmp')));

    const result = spawnSync(process.execPath, [path.join(scriptDir, 'build_spec.mjs')], {
      cwd: temp, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readdirSync(versionDir).some((name) => name.endsWith('.tmp')), false);
    assert.equal(fs.readdirSync(contentDir).some((name) => name.endsWith('.tmp')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), expected.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
