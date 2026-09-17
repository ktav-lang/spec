// Acquiring the cooperative write lock. A live lock blocks a second
// writer without touching outputs; a dead owner's lock is reclaimed
// first. Reclaim intent is scoped to one nonce, and liveness is decided
// by PID plus process incarnation, not by PID alone.

import {
  OUT_FILES,
  buildBuffers,
  recoverBuildOutputTransaction,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import { baseFixtures, makeContent, write } from '../../helpers.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
