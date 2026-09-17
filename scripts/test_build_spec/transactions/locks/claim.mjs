// The claim: how a lock candidate becomes the lock. A crash-created
// complete candidate is recovered without ever being exposed as final,
// a torn candidate is discarded only once its owner is proven dead, and
// two reclaimers interleaving through capture hooks must not lose it.

import { buildBuffers, writeBuildOutputs } from '../../../build_spec.mjs';
import { baseFixtures, makeContent, write } from '../../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function aCrashCreatedCompleteLockCandidateIsRecoveredWithoutExposingItAsTheFinalLock() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lock-candidate-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    const fixedNow = 20_000;
    write(path.join(versionDir, '.build-spec.transaction.lock.candidate'), JSON.stringify({
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'cccccccccccccccccccccccccccccccc',
      nonce: 'dddddddddddddddddddddddddddddddd', leaseUntil: fixedNow - 1,
    }) + '\n');
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build, { now: fixedNow }));
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock.candidate')), false);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function aTornOwnerSpecificCandidateIsDiscardedAfterItsOwnerIsProvenDead() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lock-torn-candidate-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const candidate = path.join(
      versionDir,
      '.build-spec.transaction.lock.candidate.999999999.cccccccccccccccccccccccccccccccc.dddddddddddddddddddddddddddddddd.tmp'
    );
    write(candidate, '{"format":"ktav-build-output-lock"');
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
    assert.equal(fs.existsSync(candidate), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function claimFreshnessIsIndependentOfTheStaleTargetMtime() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lock-claim-freshness-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const owner = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
    };
    const lockPath = path.join(versionDir, '.build-spec.transaction.lock');
    const claimPath = path.join(versionDir, `.build-spec.transaction.lock.claim.${owner.nonce}`);
    write(lockPath, JSON.stringify(owner) + '\n');
    write(claimPath, JSON.stringify(owner) + '\n');
    const fixedNow = 50_000;
    fs.utimesSync(lockPath, 1, 1);
    fs.utimesSync(claimPath, fixedNow / 1000, fixedNow / 1000);
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, { now: fixedNow }),
      /reclaim is already in progress/
    );
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
    assert.equal(fs.existsSync(lockPath), true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function aReclaimerCannotRemoveAReplacementLockFromAStaleIncarnationInterleaving() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lock-interleave-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    const stale = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      nonce: 'ffffffffffffffffffffffffffffffff', leaseUntil: 0,
    };
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(stale) + '\n');
    const replacement = {
      format: 'ktav-build-output-lock', version: 3, pid: process.pid,
      incarnation: '11111111111111111111111111111111',
      nonce: '22222222222222222222222222222222', leaseUntil: Date.now() + 60_000,
    };
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        onStaleLockClaimed() {
          write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(replacement) + '\n');
        },
      }),
      /owned by live process/
    );
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(versionDir, '.build-spec.transaction.lock'), 'utf8')),
      replacement
    );
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function twoReclaimersInterleaveThroughCaptureHooksWithoutLosingTheClaim() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lock-two-reclaimers-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const stale = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      nonce: 'ffffffffffffffffffffffffffffffff', leaseUntil: 0,
    };
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(stale) + '\n');
    let secondRan = false;
    writeBuildOutputs(versionDir, contentDir, build, {
      processIncarnation: '11111111111111111111111111111111',
      onLockClaimPublished() {
        if (secondRan) return;
        secondRan = true;
        writeBuildOutputs(versionDir, contentDir, build, {
          processIncarnation: '22222222222222222222222222222222',
        });
      },
    });
    assert.equal(secondRan, true);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
    assert.equal(fs.readdirSync(versionDir).some((name) => name.includes('.quarantine.')), false);
    assert.equal(fs.readdirSync(versionDir).some((name) => name.startsWith('.build-spec.transaction.lock.claim.')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function claimCaptureRestoresAReplacementInsteadOfDeletingIt() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lock-claim-capture-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const owner = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
    };
    const claimPath = path.join(versionDir, `.build-spec.transaction.lock.claim.${owner.nonce}`);
    const staleClaim = {
      format: 'ktav-build-output-lock-claim', version: 1, pid: 999999999,
      incarnation: 'cccccccccccccccccccccccccccccccc',
      nonce: 'dddddddddddddddddddddddddddddddd', createdAt: 0, target: owner,
    };
    const replacement = {
      ...staleClaim, pid: process.pid, incarnation: '11111111111111111111111111111111',
      nonce: '22222222222222222222222222222222',
    };
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(owner) + '\n');
    write(claimPath, JSON.stringify(staleClaim) + '\n');
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        processIncarnation: '33333333333333333333333333333333',
        onLockClaimBeforeCapture() {
          write(claimPath, JSON.stringify(replacement) + '\n');
        },
      }),
      /replacement was captured/
    );
    assert.deepEqual(JSON.parse(fs.readFileSync(claimPath, 'utf8')), replacement);
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function sameProcessClaimQuarantineCleanupResumesAfterOneUnlinkFailure() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lock-claim-resume-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify({
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
    }) + '\n');
    const lockPath = path.join(versionDir, '.build-spec.transaction.lock');
    let failed = false;
    const options = {
      processIncarnation: '11111111111111111111111111111111',
      onLockClaimPublished() {
        fs.unlinkSync(lockPath);
      },
      unlinkSync(filePath) {
        if (!failed && path.basename(filePath).includes('.quarantine.claim.')) {
          failed = true;
          const error = new Error('injected claim quarantine EIO');
          error.code = 'EIO';
          throw error;
        }
        fs.unlinkSync(filePath);
      },
    };

    assert.throws(() => writeBuildOutputs(versionDir, contentDir, build, options), /claim quarantine EIO/);
    assert.equal(failed, true);
    assert.equal(fs.readdirSync(versionDir).some((name) => name.includes('.quarantine.claim.')), true);

    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build, options));
    assert.equal(fs.readdirSync(versionDir).some((name) => name.startsWith('.build-spec.transaction.lock.')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
