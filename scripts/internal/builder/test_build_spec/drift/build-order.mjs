// The order cli() runs its steps in: the handwritten-references drift check
// must judge the artifacts the current build is about to write, not the
// previous build's output still sitting on disk.
//
// In write mode `checkHandwrittenVersionReferences` runs after buildBuffers
// but BEFORE buildRootDocs, so it compares the stale generated
// README.md/CHANGELOG.md against the new release date — and an honest
// commit that bumps the date and syncs every source unit in one go fails
// the build. These two cases pin the honest path (a fully synced source
// tree must rebuild over the stale artifacts) and the dishonest one (a
// source unit left stale must still fail, and must still block writing).

import {
  REAL_RELEASE,
  baseFixtures,
  copyHandwrittenRootFiles,
  installGenerator,
  lockUnits,
  makeContent,
  realReleaseJs,
  write,
} from '../helpers.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

function buildTempRepo() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-build-order-'));
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
  return { temp, contentDir };
}

// The honest commit: release.js, versions.ktav and the CHANGELOG/README
// source units all move to the new date together. A plain replaceAll hits
// exactly the right places — the unit files carry the date only where the
// drift anchors live, and versions.ktav exactly twice.
function syncSourcesToNewDate(repo, newDate) {
  const old = REAL_RELEASE.released;
  for (const rel of [
    'versions.ktav',
    path.join('root-docs', 'CHANGELOG', 'v0.8.0', 'body-1.md'),
    path.join('root-docs', 'README', 'full-specification', 'body-1.md'),
  ]) {
    const p = path.join(repo, rel);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replaceAll(old, newDate));
  }
  const release = path.join(repo, 'versions', '0.8', 'content', 'release.js');
  fs.writeFileSync(release, fs.readFileSync(release, 'utf8').replaceAll(old, newDate));
}

function runBuildSpec(repo, args) {
  return spawnSync(process.execPath,
    [path.join(repo, 'scripts', 'build_spec.mjs'), ...args],
    { cwd: repo, encoding: 'utf8' });
}

test('a release-date bump synced into the source units rebuilds over the stale artifacts', () => {
  const { temp } = buildTempRepo();
  try {
    const first = runBuildSpec(temp, []);
    assert.equal(first.status, 0, `initial build failed: ${first.stderr}`);

    // The honest commit: release.js, versions.ktav and the CHANGELOG/README
    // source units all move to the new date together. The artifacts on disk
    // are still the previous build's output.
    syncSourcesToNewDate(temp, '2027-03-01');

    const second = runBuildSpec(temp, []);
    assert.equal(second.status, 0,
      `a fully synced source-tree change must rebuild, got exit ${second.status}:\n${second.stderr}`);

    // The buffers the check validated are the ones that got written.
    const changelog = fs.readFileSync(path.join(temp, 'CHANGELOG.md'), 'utf8');
    assert.ok(changelog.includes('[0.8.0] — 2027-03-01'),
      'the written CHANGELOG.md must carry the new date');
    const check = runBuildSpec(temp, ['--check']);
    assert.equal(check.status, 0, `--check after the rebuild must pass:\n${check.stderr}`);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a release-date bump that skips the source units still fails the build', () => {
  const { temp, contentDir } = buildTempRepo();
  try {
    const first = runBuildSpec(temp, []);
    assert.equal(first.status, 0, `initial build failed: ${first.stderr}`);

    // Dishonest bump: only release.js and versions.ktav move; the CHANGELOG
    // and README SOURCE units still carry the old date.
    const release = path.join(contentDir, 'release.js');
    fs.writeFileSync(release, fs.readFileSync(release, 'utf8').replaceAll(REAL_RELEASE.released, '2027-03-01'));
    const ktav = path.join(temp, 'versions.ktav');
    fs.writeFileSync(ktav, fs.readFileSync(ktav, 'utf8').replaceAll(REAL_RELEASE.released, '2027-03-01'));

    const second = runBuildSpec(temp, []);
    assert.notEqual(second.status, 0, 'a stale source unit must still fail the build');
    assert.match(second.stderr, /CHANGELOG\.md/, 'the changelog anchor failure must be named');
    assert.match(second.stderr, /README\.md/, 'the readme anchor failure must be named');
    // Nothing was written: the artifact still carries the old date.
    const changelog = fs.readFileSync(path.join(temp, 'CHANGELOG.md'), 'utf8');
    assert.ok(changelog.includes(`[0.8.0] — ${REAL_RELEASE.released}`),
      'a failed build must not rewrite the artifact');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
