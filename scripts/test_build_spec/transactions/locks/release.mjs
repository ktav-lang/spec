// Releasing a lock, and resuming that release after it is interrupted.
// A replacement lock is captured and restored before the owner's own
// artifacts are removed, and every quarantine boundary -- nested,
// claim-side, owner-side -- resumes in the same process.

import { buildBuffers, writeBuildOutputs } from '../../../build_spec.mjs';
import { baseFixtures, makeContent, write } from '../../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function releaseCapturesAndRestoresAReplacementBeforeRemovingOwnerArtifacts() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-release-interleave-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    let replacement;
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        onReleaseValidated() {
          replacement = {
            format: 'ktav-build-output-lock', version: 3, pid: process.pid,
            incarnation: '11111111111111111111111111111111',
            nonce: '22222222222222222222222222222222', leaseUntil: Date.now() + 60_000,
          };
          write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(replacement) + '\n');
        },
      }),
      /owned by live process/
    );
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(versionDir, '.build-spec.transaction.lock'), 'utf8')),
      replacement
    );
    const names = fs.readdirSync(versionDir);
    assert.ok(names.some((name) => name.startsWith('.build-spec.transaction.lock.owner.')));
    assert.ok(names.some((name) => name.startsWith('.build-spec.transaction.lock.lease.')));
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function anInterruptedReleaseCaptureIsResumableByTheSameProcess() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-release-resume-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    let interrupted = true;
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        onReleaseCaptured() {
          if (interrupted) {
            interrupted = false;
            throw new Error('simulated release interruption');
          }
        },
      }),
      /simulated release interruption/
    );
    assert.ok(fs.readdirSync(versionDir).some((name) =>
      /^\.build-spec\.transaction\.lock\.release\.[0-9a-f]{32}$/u.test(name)));
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
    assert.equal(fs.readdirSync(versionDir).some((name) =>
      name.startsWith('.build-spec.transaction.lock.')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function releaseCleanupResumesAcrossEveryOwnerCaptureAndNestedQuarantineBoundary() {  for (const boundary of ['owner', 'lease', 'release-complete']) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ktav-release-boundary-${boundary}-`));
    try {
      const versionDir = path.join(temp, 'version');
      const contentDir = path.join(versionDir, 'content');
      const fixtures = baseFixtures();
      makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
      const build = await buildBuffers(contentDir);
      let failed = false;
      const releaseOwner = /^\.build-spec\.transaction\.lock\.release\.[0-9a-f]{32}\.(owner|lease)$/u;
      const unlinkSync = (filePath) => {
        const name = path.basename(filePath);
        const matchesBoundary = boundary === 'release-complete'
          ? name.includes('.quarantine.release-complete.')
          : releaseOwner.test(name) && name.endsWith(`.${boundary}`);
        if (!failed && matchesBoundary) {
          failed = true;
          const error = new Error(`injected release ${boundary} EIO`);
          error.code = 'EIO';
          throw error;
        }
        fs.unlinkSync(filePath);
      };

      assert.throws(
        () => writeBuildOutputs(versionDir, contentDir, build, { unlinkSync }),
        new RegExp(`injected release ${boundary} EIO`)
      );
      assert.equal(failed, true);
      assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build, { unlinkSync }));
      assert.equal(fs.readdirSync(versionDir).some((name) => name.startsWith('.build-spec.transaction.lock.')), false);
      assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}

export async function nestedReleaseQuarantineCleanupResumesInTheSameProcess() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-release-nested-resume-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    let ownerFailure = true;
    let nestedFailure = true;
    const releaseOwner = /^\.build-spec\.transaction\.lock\.release\.[0-9a-f]{32}\.owner$/u;
    const unlinkSync = (filePath) => {
      const name = path.basename(filePath);
      if (ownerFailure && releaseOwner.test(name)) {
        ownerFailure = false;
        const error = new Error('injected nested owner EIO');
        error.code = 'EIO';
        throw error;
      }
      if (nestedFailure && name.includes('.quarantine.release-cleanup-')) {
        nestedFailure = false;
        const error = new Error('injected nested quarantine EIO');
        error.code = 'EIO';
        throw error;
      }
      fs.unlinkSync(filePath);
    };

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, { unlinkSync }),
      /injected nested owner EIO/
    );
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, { unlinkSync }),
      /injected nested quarantine EIO/
    );
    assert.ok(fs.readdirSync(versionDir).some((name) => name.includes('.quarantine.release-cleanup-')));
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build, { unlinkSync }));
    assert.equal(fs.readdirSync(versionDir).some((name) => name.startsWith('.build-spec.transaction.lock.')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function releaseClaimQuarantineCleanupResumesInTheSameProcess() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-release-claim-resume-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    let interrupted = true;
    let failed = true;
    const options = {
      onReleaseCaptured() {
        if (interrupted) {
          interrupted = false;
          throw new Error('injected release interruption');
        }
      },
      unlinkSync(filePath) {
        if (failed && path.basename(filePath).includes('.quarantine.release-claim.')) {
          failed = false;
          const error = new Error('injected release claim EIO');
          error.code = 'EIO';
          throw error;
        }
        fs.unlinkSync(filePath);
      },
    };

    assert.throws(() => writeBuildOutputs(versionDir, contentDir, build, options), /injected release interruption/);
    assert.throws(() => writeBuildOutputs(versionDir, contentDir, build, options), /injected release claim EIO/);
    assert.ok(fs.readdirSync(versionDir).some((name) => name.includes('.quarantine.release-claim.')));
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build, options));
    assert.equal(fs.readdirSync(versionDir).some((name) => name.startsWith('.build-spec.transaction.lock.')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function reclaimRemovesEveryExactOldOwnerArtifactButPreservesReplacementArtifacts() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-reclaim-artifacts-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const old = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
    };
    const replacement = {
      format: 'ktav-build-output-lock', version: 3, pid: process.pid,
      incarnation: 'cccccccccccccccccccccccccccccccc',
      nonce: 'dddddddddddddddddddddddddddddddd', leaseUntil: 0,
    };
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(old) + '\n');
    const oldArtifacts = [
      `.build-spec.transaction.lock.candidate.${old.nonce}`,
      `.build-spec.transaction.lock.owner.${old.nonce}`,
      `.build-spec.transaction.lock.lease.${old.nonce}`,
      `.build-spec.transaction.lock.claim.${old.nonce}`,
    ];
    for (const name of oldArtifacts) write(path.join(versionDir, name), JSON.stringify(old) + '\n');
    fs.utimesSync(path.join(versionDir, `.build-spec.transaction.lock.claim.${old.nonce}`), 1, 1);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        onStaleLockClaimed() {
          write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(replacement) + '\n');
          write(path.join(versionDir, `.build-spec.transaction.lock.owner.${replacement.nonce}`),
            JSON.stringify(replacement) + '\n');
          write(path.join(versionDir, `.build-spec.transaction.lock.lease.${replacement.nonce}`),
            JSON.stringify({ ...replacement, leaseUntil: Date.now() + 60_000 }) + '\n');
        },
      }),
      /owned by live process/
    );
    for (const name of oldArtifacts) assert.equal(fs.existsSync(path.join(versionDir, name)), false, name);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(versionDir, `.build-spec.transaction.lock.owner.${replacement.nonce}`), 'utf8')),
      replacement
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeModeConservativelyRemovesTornLegacyLockArtifactsOnlyAfterOwnerDeath() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-legacy-lock-recovery-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const hint = 'garbage {"pid":999999999,"incarnation":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"';
    for (const name of [
      '.build-spec.transaction.lock.candidate',
      '.build-spec.transaction.lock.claim',
      '.build-spec.transaction.lock.lease',
    ]) write(path.join(versionDir, name), hint);
    writeBuildOutputs(versionDir, contentDir, build);
    for (const name of [
      '.build-spec.transaction.lock.candidate',
      '.build-spec.transaction.lock.claim',
      '.build-spec.transaction.lock.lease',
    ]) assert.equal(fs.existsSync(path.join(versionDir, name)), false, name);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
