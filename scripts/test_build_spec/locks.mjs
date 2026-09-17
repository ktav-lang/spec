import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import {
  buildBuffers,
  checkBuildOutputs,
  recoverBuildOutputTransaction,
  writeBuildOutputs,
  LANGS,
  OUT_FILES,
  README_FILES,
  README_SOURCE_FILE,
} from '../build_spec.mjs';

import {
  baseFixtures,
  copyDriftCheckInputs,
  directoryLinksSupported,
  makeContent,
  makeDirectoryLink,
  symlinksSupported,
  write,
} from './helpers.mjs';

function escTemplate(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function bodyJs(en, ru, zh) {
  return 'export default {\n' +
    '  en: `' + escTemplate(en) + '`,\n' +
    '  ru: `' + escTemplate(ru) + '`,\n' +
    '  zh: `' + escTemplate(zh) + '`,\n' +
    '};\n';
}

export async function aLiveCooperativeLockBlocksASecondWriterWithoutTouchingOutputs() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-live-lock-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const lockPath = path.join(versionDir, '.build-spec.transaction.lock');
    const lock = {
      format: 'ktav-build-output-lock', version: 3, pid: process.pid,
      incarnation: '0123456789abcdef0123456789abcdef',
      nonce: '0123456789abcdef0123456789abcdef',
      leaseUntil: Date.now() + 60_000,
    };
    write(lockPath, JSON.stringify(lock) + '\n');
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      /owned by live process/
    );
    assert.deepEqual(JSON.parse(fs.readFileSync(lockPath, 'utf8')), lock);
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function aDeadOwnerLockIsReclaimedBeforeDeterministicRecoveryAndWrite() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-stale-lock-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify({
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'fedcba9876543210fedcba9876543210',
      nonce: 'fedcba9876543210fedcba9876543210',
      leaseUntil: 0,
    }) + '\n');
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function sameNonceReclaimIntentAuthorizesPreJournalTemporaryCleanup() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-reclaim-intent-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const stale = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
    };
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(stale) + '\n');
    const data = build.bufs.en;
    const tempPath = path.join(versionDir,
      `.${OUT_FILES.en}.${stale.nonce}.${createHash('sha256').update(data).digest('hex')}.tmp`);
    write(tempPath, data);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        onStaleLockClaimed() { throw new Error('simulated interruption'); },
      }),
      /simulated interruption/
    );
    assert.equal(fs.existsSync(tempPath), true);
    assert.ok(fs.readdirSync(versionDir).some((name) =>
      name.startsWith('.build-spec.transaction.lock.release.reclaim.')));

    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
    assert.equal(fs.existsSync(tempPath), false);
    assert.equal(fs.readdirSync(versionDir).some((name) =>
      name.startsWith('.build-spec.transaction.lock.release.')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), data);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function reclaimIntentForOneOwnerNeverAuthorizesAnotherNonceTemporary() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-reclaim-nonce-mismatch-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const stale = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', leaseUntil: 0,
    };
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(stale) + '\n');
    const data = Buffer.from('unrelated temporary bytes', 'utf8');
    const otherNonce = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const tempPath = path.join(versionDir,
      `.${OUT_FILES.en}.${otherNonce}.${createHash('sha256').update(data).digest('hex')}.tmp`);
    write(tempPath, data);

    assert.throws(
      () => recoverBuildOutputTransaction(versionDir, contentDir),
      /no provably dead owner|no matching reclaim intent/
    );
    assert.deepEqual(fs.readFileSync(tempPath), data);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function legacyPreJournalTemporaryWithUnknownProvenanceFailsConservatively() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-reclaim-legacy-provenance-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const stale = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
    };
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(stale) + '\n');
    const tempPath = path.join(versionDir, `.${OUT_FILES.en}.${stale.nonce}.tmp`);
    write(tempPath, 'legacy temporary bytes');

    assert.throws(
      () => recoverBuildOutputTransaction(versionDir, contentDir),
      /has no derived digest/
    );
    assert.equal(fs.existsSync(tempPath), true);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function aLivePIDWithAnUnrelatedIncarnationBlocksWhileAnExpiredLeaseIsReclaimable() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lock-incarnation-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    const lockPath = path.join(versionDir, '.build-spec.transaction.lock');
    const fixedNow = 10_000;
    const unrelated = {
      format: 'ktav-build-output-lock', version: 3, pid: process.pid,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: fixedNow + 60_000,
    };
    write(lockPath, JSON.stringify(unrelated) + '\n');
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, { now: fixedNow }),
      /owned by live process/
    );
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);

    const stale = { ...unrelated, leaseUntil: fixedNow - 1 };
    write(lockPath, JSON.stringify(stale) + '\n');
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build, { now: fixedNow }));
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function anExpiredLeaseNeverReclaimsALiveMatchingIncarnation() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-live-incarnation-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const incarnation = '1234567890abcdef1234567890abcdef';
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify({
      format: 'ktav-build-output-lock', version: 3, pid: process.pid,
      incarnation, nonce: 'abcdefabcdefabcdefabcdefabcdefab', leaseUntil: 999,
    }) + '\n');
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        now: 10_000,
        processIncarnation: () => incarnation,
      }),
      /owned by live process/
    );
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function anUnavailableProcessIncarnationNeverReclaimsALivePID() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-unverified-incarnation-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const owner = {
      format: 'ktav-build-output-lock', version: 3, pid: process.pid,
      incarnation: '00000000000000000000000000000000',
      nonce: 'abcdefabcdefabcdefabcdefabcdefab', leaseUntil: 1,
    };
    write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify(owner) + '\n');
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        now: 10_000,
        processIncarnation: () => null,
      }),
      /owned by live process/
    );
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(versionDir, '.build-spec.transaction.lock'), 'utf8')),
      owner
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

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

export async function aCrashAfterCapturingMalformedLegacyBytesIsRecoveredByTheNextWrite() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-legacy-quarantine-recovery-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const source = Buffer.from(
      'garbage {"pid":999999999,"incarnation":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"', 'utf8');
    const legacyPath = path.join(versionDir, '.build-spec.transaction.lock.candidate');
    write(legacyPath, source);
    let quarantinePath;

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        onLockRecordCaptured({ quarantinePath: capturedPath }) {
          quarantinePath = capturedPath;
          throw new Error('simulated interruption');
        },
      }),
      /simulated interruption/
    );
    const digest = createHash('sha256').update(source).digest('hex').slice(0, 16);
    assert.ok(quarantinePath);
    assert.equal(path.dirname(quarantinePath), versionDir);
    assert.match(
      path.basename(quarantinePath),
      new RegExp(`^\\.build-spec\\.transaction\\.lock\\.quarantine\\.legacy\\.[0-9a-f]{32}\\.${digest}$`, 'u')
    );
    assert.equal(fs.existsSync(legacyPath), false);
    assert.deepEqual(fs.readFileSync(quarantinePath), source);

    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
    assert.equal(fs.existsSync(quarantinePath), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function releaseAndQuarantineNamespaceAcceptsEveryEmittedLegacyFamily() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-release-namespace-'));
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
    for (const [index, phase] of [
      'stale-claim', 'quarantine-cleanup', 'target-missing', 'target-changed',
      'target-replaced', 'reclaim-complete', 'acquisition-cleanup', 'owner-live',
    ].entries()) {
      const claim = {
        format: 'ktav-build-output-lock-claim', version: 1,
        pid: 999999999, incarnation: 'cccccccccccccccccccccccccccccccc',
        nonce: `${(index + 1).toString(16).padStart(32, '0')}`, createdAt: 0, target: owner,
      };
      const reclaimerNonce = `${(index + 9).toString(16).padStart(32, '0')}`;
      write(path.join(versionDir,
        `.build-spec.transaction.lock.quarantine.claim.${reclaimerNonce}.` +
        `${owner.nonce}.${claim.nonce}.${phase}`), JSON.stringify(claim) + '\n');
    }
    write(path.join(versionDir, `.build-spec.transaction.lock.release.${owner.nonce}`),
      JSON.stringify(owner) + '\n');
    for (const kind of ['legacy-claim', 'legacy-lease']) {
      write(path.join(versionDir, `.build-spec.transaction.lock.release.${owner.nonce}.${kind}`),
        JSON.stringify(owner) + '\n');
    }
    writeBuildOutputs(versionDir, contentDir, build);
    assert.equal(fs.readdirSync(versionDir).some((name) =>
      name.startsWith('.build-spec.transaction.lock.')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function releaseAndQuarantineMetadataSymlinksAreRejectedBeforeTheirTargetsAreRead(t) {  if (!symlinksSupported()) {
    t.skip('symlink creation unavailable; this test MUST run on POSIX CI');
    return;
  }
  const cases = [
    {
      artifact(owner) {
        return `.build-spec.transaction.lock.release.${owner.nonce}`;
      },
      contents(owner) { return owner; },
      diagnostic: /transaction lock release claim .*not a regular file \(symlink/,
    },
    {
      artifact(owner, claim) {
        return `.build-spec.transaction.lock.quarantine.claim.dddddddddddddddddddddddddddddddd.` +
          `${owner.nonce}.${claim.nonce}.stale-claim`;
      },
      contents(_owner, claim) { return claim; },
      diagnostic: /transaction lock claim quarantine .*not a regular file \(symlink/,
    },
  ];
  for (const [index, fixture] of cases.entries()) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ktav-metadata-symlink-${index}-`));
    try {
      const versionDir = path.join(temp, 'version');
      const contentDir = path.join(versionDir, 'content');
      makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
      const owner = {
        format: 'ktav-build-output-lock', version: 3, pid: 999999999,
        incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
      };
      const claim = {
        format: 'ktav-build-output-lock-claim', version: 1, pid: 999999999,
        incarnation: 'cccccccccccccccccccccccccccccccc',
        nonce: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', createdAt: 0, target: owner,
      };
      const targetPath = path.join(temp, `outside-${index}.json`);
      const artifactPath = path.join(versionDir, fixture.artifact(owner, claim));
      write(targetPath, JSON.stringify(fixture.contents(owner, claim)) + '\n');
      fs.symlinkSync(targetPath, artifactPath, 'file');
      const originalReadFileSync = fs.readFileSync;
      let artifactOpened = false;
      fs.readFileSync = function (filePath, ...args) {
        if (path.resolve(filePath) === path.resolve(artifactPath)) artifactOpened = true;
        return originalReadFileSync.call(this, filePath, ...args);
      };
      try {
        assert.throws(
          () => recoverBuildOutputTransaction(versionDir, contentDir),
          fixture.diagnostic
        );
      } finally {
        fs.readFileSync = originalReadFileSync;
      }
      assert.equal(artifactOpened, false);
      assert.equal(fs.lstatSync(artifactPath).isSymbolicLink(), true);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}

export async function releaseMetadataFIFOIsRejectedWithoutOpeningIt(t) {  if (process.platform === 'win32') {
    t.skip('POSIX-only FIFO regression');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-metadata-fifo-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const artifactPath = path.join(versionDir,
      '.build-spec.transaction.lock.release.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const made = spawnSync('mkfifo', [artifactPath], { encoding: 'utf8' });
    assert.equal(made.status, 0, made.stderr);
    const originalReadFileSync = fs.readFileSync;
    let artifactOpened = false;
    fs.readFileSync = function (filePath, ...args) {
      if (path.resolve(filePath) === path.resolve(artifactPath)) artifactOpened = true;
      return originalReadFileSync.call(this, filePath, ...args);
    };
    try {
      assert.throws(
        () => recoverBuildOutputTransaction(versionDir, contentDir),
        /transaction lock release claim .*not a regular file \(special file/
      );
    } finally {
      fs.readFileSync = originalReadFileSync;
    }
    assert.equal(artifactOpened, false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function releaseRecoveryRemovesAnOrphanFinalLeaseAfterOwnerCapture() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-orphan-final-lease-'));
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
    write(path.join(versionDir, `.build-spec.transaction.lock.release.${owner.nonce}`), JSON.stringify(owner) + '\n');
    write(path.join(versionDir, `.build-spec.transaction.lock.release.${owner.nonce}.owner`), JSON.stringify(owner) + '\n');
    write(path.join(versionDir, `.build-spec.transaction.lock.lease.${owner.nonce}`), JSON.stringify(owner) + '\n');
    writeBuildOutputs(versionDir, contentDir, build);
    const names = fs.readdirSync(versionDir);
    assert.equal(names.some((name) => name.includes(owner.nonce)), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function crashBeforeFirstJournalPublicationRecoversDerivedOutputTemporariesImmediately() {  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-prejournal-recovery-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const source = `
      import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      const build = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, build);
    `;
    const env = { ...process.env, KTAV_BUILD_SPEC_CRASH_BEFORE_FIRST_JOURNAL: '1' };
    const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], { env, encoding: 'utf8' });
    assert.notEqual(crashed.status, 0);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json')), false);
    const firstTemp = fs.readdirSync(versionDir).find((name) =>
      /^\.spec\.md\.[0-9a-f]{32}\.[0-9a-f]{64}\.tmp$/u.test(name));
    assert.ok(firstTemp);
    // Model an interrupted first write after the owner has died: the exact
    // derived name remains, but its bytes no longer match the filename digest.
    fs.truncateSync(path.join(versionDir, firstTemp), 1);
    recoverBuildOutputTransaction(versionDir, contentDir);
    assert.equal(fs.readdirSync(versionDir).some((name) => name.endsWith('.tmp')), false);
    assert.equal(fs.readdirSync(versionDir).some((name) =>
      name.startsWith('.build-spec.transaction.lock.release.reclaim.')), false);
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function crashRecoveryRestoresDistinctOldBytesBeforeALaterFullWriteInstallsNewBytes() {  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-distinct-recovery-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const oldBuild = await buildBuffers(contentDir);
    writeBuildOutputs(versionDir, contentDir, oldBuild);
    write(path.join(contentDir, 'named-abstract', 'body-1.js'),
      bodyJs('distinct new body.\n\n', 'новое тело.\n\n', '新的正文。\n\n'));
    const newBuild = await buildBuffers(contentDir);
    const source = `
      import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      const build = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, build);
    `;
    const env = { ...process.env, KTAV_BUILD_SPEC_CRASH_AFTER_RENAME: 'install:3' };
    const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], { env, encoding: 'utf8' });
    assert.notEqual(crashed.status, 0);
    const journal = JSON.parse(fs.readFileSync(path.join(versionDir, '.build-spec.transaction.json'), 'utf8'));
    assert.equal(journal.phase, 'installing');
    assert.match(journal.nonce, /^[0-9a-f]{32}$/);
    assert.equal(journal.outputs.length, 6);
    assert.equal(journal.outputs.some((item) => Object.keys(item).some((key) => /path/i.test(key))), false);

    // Recover immediately, before asking the builder to perform another full write.
    recoverBuildOutputTransaction(versionDir, contentDir);
    for (const lang of LANGS) {
      assert.deepEqual(fs.readFileSync(path.join(versionDir, OUT_FILES[lang])), oldBuild.bufs[lang]);
      assert.deepEqual(fs.readFileSync(path.join(contentDir, README_FILES[lang])), oldBuild.readmeBufs[lang]);
    }
    writeBuildOutputs(versionDir, contentDir, newBuild);
    for (const lang of LANGS) {
      assert.deepEqual(fs.readFileSync(path.join(versionDir, OUT_FILES[lang])), newBuild.bufs[lang]);
      assert.deepEqual(fs.readFileSync(path.join(contentDir, README_FILES[lang])), newBuild.readmeBufs[lang]);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function distinctByteCrashMatrixCoversBackupAndInstallOffsetsIncludingMissingDestinations() {  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const runCase = async (label, crashPoint, missingIndexes = []) => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ktav-matrix-${label}-`));
    try {
      const versionDir = path.join(temp, 'version');
      const contentDir = path.join(versionDir, 'content');
      const fixtures = baseFixtures();
      makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
      const oldBuild = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, oldBuild);
      write(path.join(contentDir, 'named-abstract', 'body-1.js'),
        bodyJs(`matrix en body ${label}.\n\n`, `matrix ru body ${label}.\n\n`, `matrix zh body ${label}.\n\n`));
      write(path.join(contentDir, README_SOURCE_FILE), bodyJs(
        `# Matrix EN README ${label}\n`, `# Matrix RU README ${label}\n`, `# Matrix ZH README ${label}\n`));
      const newBuild = await buildBuffers(contentDir);
      const destinations = LANGS.flatMap((lang) => [
        path.join(versionDir, OUT_FILES[lang]), path.join(contentDir, README_FILES[lang]),
      ]);
      const oldBytes = LANGS.flatMap((lang) => [oldBuild.bufs[lang], oldBuild.readmeBufs[lang]]);
      const newBytes = LANGS.flatMap((lang) => [newBuild.bufs[lang], newBuild.readmeBufs[lang]]);
      assert.equal(new Set(newBytes.map((bytes) => bytes.toString('hex'))).size, 6);
      for (const index of missingIndexes) fs.unlinkSync(destinations[index]);
      const source = `
        import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
        const versionDir = ${JSON.stringify(versionDir)};
        const contentDir = ${JSON.stringify(contentDir)};
        const build = await buildBuffers(contentDir);
        writeBuildOutputs(versionDir, contentDir, build);
      `;
      const env = { ...process.env, KTAV_BUILD_SPEC_CRASH_AFTER_RENAME: crashPoint };
      const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], { env, encoding: 'utf8' });
      assert.notEqual(crashed.status, 0, `${label} child unexpectedly completed`);
      recoverBuildOutputTransaction(versionDir, contentDir);
      for (let index = 0; index < destinations.length; index++) {
        if (missingIndexes.includes(index)) assert.equal(fs.existsSync(destinations[index]), false, destinations[index]);
        else assert.deepEqual(fs.readFileSync(destinations[index]), oldBytes[index], destinations[index]);
      }
      writeBuildOutputs(versionDir, contentDir, newBuild);
      for (let index = 0; index < destinations.length; index++) {
        assert.deepEqual(fs.readFileSync(destinations[index]), newBytes[index], destinations[index]);
      }
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  };

  for (const phase of ['backup', 'install']) {
    for (let index = 0; index < 6; index++) await runCase(`${phase}-${index}`, `${phase}:${index}`);
  }
  await runCase('backup-missing', 'backup:1', [0]);
  await runCase('install-missing', 'install:3', [0, 3]);
}

export async function writeBuildPreservesTheMissingBackupRecoveryErrorWithoutMutatingTheRemainingOutputs() {  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-missing-backup-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const initial = await buildBuffers(contentDir);
    writeBuildOutputs(versionDir, contentDir, initial);
    for (const lang of LANGS) {
      write(path.join(versionDir, OUT_FILES[lang]), Buffer.from(`old spec ${lang}\n`));
      write(path.join(contentDir, README_FILES[lang]), Buffer.from(`old readme ${lang}\n`));
    }
    const source = `
      import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      const build = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, build);
    `;
    const env = { ...process.env, KTAV_BUILD_SPEC_CRASH_AFTER_RENAME: 'backup:0' };
    const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], { env, encoding: 'utf8' });
    assert.notEqual(crashed.status, 0);
    const backup = fs.readdirSync(versionDir).find((name) => name.endsWith('.bak'));
    assert.ok(backup);
    fs.unlinkSync(path.join(versionDir, backup));
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, initial),
      (error) => /missing transaction backup|ambiguous/.test(error.message) &&
        !(error instanceof TypeError)
    );
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRejectsASpecificationDirectorySymlinkBeforeCreatingTemporaryOutputs(t) {  if (!directoryLinksSupported()) {
    t.skip('directory symlink/junction creation unavailable; this test MUST run when directory links are supported');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-root-link-'));
  try {
    const realVersionDir = path.join(temp, 'real-version');
    const versionDir = path.join(temp, 'version-link');
    makeContent(realVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    makeDirectoryLink(realVersionDir, versionDir);
    const contentDir = path.join(versionDir, 'content');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /specDir path component .* is a symlink or junction/.test(e.message)
    );
    assert.deepEqual(
      fs.readdirSync(realVersionDir).filter((name) => name.endsWith('.tmp')),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function checkBuildRejectsASpecificationDirectorySymlinkBeforeReadingGeneratedOutputs(t) {  if (!directoryLinksSupported()) {
    t.skip('directory symlink/junction creation unavailable; this test MUST run when directory links are supported');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-check-root-link-'));
  try {
    const realVersionDir = path.join(temp, 'real-version');
    const versionDir = path.join(temp, 'version-link');
    makeContent(realVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    makeDirectoryLink(realVersionDir, versionDir);
    const contentDir = path.join(versionDir, 'content');
    const build = await buildBuffers(path.join(realVersionDir, 'content'));

    assert.throws(
      () => checkBuildOutputs(versionDir, contentDir, build),
      (e) => /specDir path component .* is a symlink or junction/.test(e.message)
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRejectsAContentDirectorySymlinkBeforeCreatingTemporaryOutputs(t) {  if (!directoryLinksSupported()) {
    t.skip('directory symlink/junction creation unavailable; this test MUST run when directory links are supported');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-content-link-'));
  try {
    const sourceVersionDir = path.join(temp, 'source-version');
    const versionDir = path.join(temp, 'version');
    makeContent(sourceVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    fs.mkdirSync(versionDir);
    makeDirectoryLink(path.join(sourceVersionDir, 'content'), path.join(versionDir, 'content'));
    const contentDir = path.join(versionDir, 'content');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /contentDir path component .* is a symlink or junction/.test(e.message)
    );
    assert.deepEqual(
      fs.readdirSync(versionDir).filter((name) => name.endsWith('.tmp')),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRejectsASymlinkedAncestorOfAWriteRoot(t) {  if (!directoryLinksSupported()) {
    t.skip('directory symlink/junction creation unavailable; this test MUST run when directory links are supported');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-ancestor-link-'));
  try {
    const realRepo = path.join(temp, 'real-repo');
    const repoLink = path.join(temp, 'repo-link');
    const realVersionDir = path.join(realRepo, 'versions', '0.7');
    makeContent(realVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    makeDirectoryLink(realRepo, repoLink);
    const versionDir = path.join(repoLink, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /specDir path component .* is a symlink or junction/.test(e.message)
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRequiresContentDirToBeTheResolvedContentChildOfSpecDir() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-root-shape-'));
  try {
    const versionDir = path.join(temp, 'version');
    const otherVersionDir = path.join(temp, 'other-version');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    makeContent(otherVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const contentDir = path.join(otherVersionDir, 'content');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /contentDir .* must resolve to the expected child .* of specDir/.test(e.message)
    );
    assert.deepEqual(
      fs.readdirSync(versionDir).filter((name) => name.endsWith('.tmp')),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
