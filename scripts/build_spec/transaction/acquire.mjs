import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { fail } from '../units/decode.mjs';
import {
  TRANSACTION_JOURNAL_FILE,
  TRANSACTION_JOURNAL_TMP_FILE,
  TRANSACTION_LOCK_CANDIDATE_PREFIX,
  TRANSACTION_LOCK_CLAIM_PREFIX,
  TRANSACTION_LOCK_FORMAT,
  TRANSACTION_LOCK_LEASE_MS,
  TRANSACTION_LOCK_OWNER_PREFIX,
  TRANSACTION_LOCK_RELEASE_PREFIX,
  TRANSACTION_LOCK_UNVERIFIED_INCARNATION,
  TRANSACTION_LOCK_VERSION,
  cleanJournalTmpIfSafe,
  cleanRecoverableMetadata,
  cleanupFailedLockOwnerArtifacts,
  forgetOwnerRecovery,
  forgetRecoverableArtifact,
  lstatRegularOrMissing,
  ownerRecoveryPending,
  readRegularBytes,
  readTransactionJournal,
  recoverableArtifactBelongsToCurrentProcess,
  rememberOwnerRecovery,
  rememberRecoverableArtifact,
  removeExactRegular,
  removeJournal,
  removeOwnedLockRecordBestEffort,
  removePrivateRegularBestEffort,
  syncDirectory,
  transactionArtifactPaths,
  transactionJournalPath,
  transactionLockPath,
  writeAllSync,
} from './journal.mjs';
import {
  captureExactLockClaim,
  captureExactLockRecord,
  discardExactLockClaim,
  lockCandidatePath,
  lockCandidateTempPath,
  lockClaimIsActive,
  lockIdentityEqual,
  lockIncarnationForOwner,
  lockIsActive,
  lockJson,
  lockLeasePath,
  lockLeaseTmpPath,
  lockNow,
  lockOwnerPath,
  lockReleasePath,
  observedProcessIncarnation,
  ownerIsCurrentProcess,
  pidIsLive,
  publishLockClaim,
  readLock,
  readLockClaim,
  removeExactOwnerArtifacts,
  removeReleaseOwnerArtifacts,
  restoreCapturedLock,
} from './lock.mjs';
import {
  beginRollback,
  cleanReclaimedOwnerMarkers,
  cleanUnpublishedOutputTemps,
  recoverCommittedTransaction,
  rollbackTransaction,
} from './rollback.mjs';
import {
  cleanExistingQuarantines,
  cleanExistingReleaseClaims,
  cleanLegacyFixedArtifacts,
  cleanReleaseOwnerArtifacts,
  cleanStaleLockLeaseTemps,
} from './cleanup.mjs';
import { validateWriteRoots } from '../outputs.mjs';

function claimExactStaleFile(specDir, targetPath, expected, now, options) {
  const claim = publishLockClaim(specDir, expected, now, options);
  if (claim === null) return false;
  const claimPath = claim.path;
  if (typeof options.onLockClaimPublished === 'function') {
    options.onLockClaimPublished(claim.record);
  }
  let current;
  try {
    current = readLock(targetPath, 'transaction lock candidate');
  } catch (error) {
    discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-missing');
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  if (!lockIdentityEqual(current, expected) || current.leaseUntil !== expected.leaseUntil) {
    discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-changed');
    return false;
  }

  const reclaimPath = path.join(specDir,
    `${TRANSACTION_LOCK_RELEASE_PREFIX}reclaim.${expected.nonce}.${claim.record.nonce}`);
  if (lstatRegularOrMissing(reclaimPath, 'transaction lock reclaim record') !== null) {
    fail('transaction lock reclaim record already exists; ambiguous data was left untouched');
  }
  try {
    fs.renameSync(targetPath, reclaimPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-missing');
      return false;
    }
    if (e.code === 'EEXIST') {
      discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-replaced');
      return false;
    }
    throw e;
  }
  const claimed = readLock(reclaimPath, 'transaction lock reclaim record');
  if (!lockIdentityEqual(claimed, expected) || claimed.leaseUntil !== expected.leaseUntil) {
    restoreCapturedLock(specDir, reclaimPath, targetPath);
    discardExactLockClaim(specDir, claimPath, claim.record, options, 'target-replaced');
    const replacement = readLock(targetPath, 'replacement transaction lock');
    if (lockIsActive(specDir, replacement, now, options)) {
      fail(`transaction is owned by live process ${replacement.pid}; refusing concurrent write`);
    }
    fail('transaction lock target changed during claim; no transaction mutation was attempted');
  }
  if (lockIsActive(specDir, claimed, now, options)) {
    restoreCapturedLock(specDir, reclaimPath, targetPath);
    discardExactLockClaim(specDir, claimPath, claim.record, options, 'owner-live');
    fail(`transaction is owned by live process ${claimed.pid}; refusing concurrent write`);
  }

  // Keep the reclaim marker durable before removing any owner-derived
  // artifacts. A crash after this point must leave enough provenance for a
  // later process to authorize pre-journal temporary cleanup.
  syncDirectory(specDir);

  const capturedClaim = captureExactLockClaim(specDir, claimPath, claim.record, options, 'reclaim-complete');
  if (capturedClaim === null) {
    restoreCapturedLock(specDir, reclaimPath, targetPath);
    fail('transaction lock claim disappeared during reclaim; no transaction mutation was attempted');
  }
  removeExactRegular(capturedClaim.quarantinePath, 'transaction quarantine record', specDir);
  removeExactOwnerArtifacts(specDir, expected, claimPath, reclaimPath, options);
  syncDirectory(specDir);
  return true;
}

function writeLockCandidate(specDir, owner, writeSync, unlinkSync = fs.unlinkSync) {
  const candidatePath = lockCandidatePath(specDir, owner);
  const tmpPath = lockCandidateTempPath(specDir, owner);
  let published = false;
  try {
    const fd = fs.openSync(tmpPath, 'wx', 0o600);
    try {
      const data = Buffer.from(lockJson(owner), 'utf8');
      writeAllSync(fd, data, writeSync);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const written = readRegularBytes(tmpPath, 'unpublished transaction lock candidate');
    if (Buffer.compare(written, Buffer.from(lockJson(owner), 'utf8')) !== 0) {
      fail('transaction lock candidate was not written completely; no transaction mutation was attempted');
    }
    readLock(tmpPath, 'transaction lock candidate');
    fs.renameSync(tmpPath, candidatePath);
    published = true;
    syncDirectory(specDir);
  } catch (error) {
    if (!removePrivateRegularBestEffort(tmpPath, unlinkSync)) {
      rememberRecoverableArtifact(tmpPath, owner);
    }
    if (published && !removeOwnedLockRecordBestEffort(candidatePath, owner, false, unlinkSync)) {
      rememberRecoverableArtifact(candidatePath, owner);
      rememberOwnerRecovery(specDir, owner);
    }
    throw error;
  }
}

function publishLockCandidate(specDir, owner) {
  const candidatePath = lockCandidatePath(specDir, owner);
  const lockPath = transactionLockPath(specDir);
  try {
    fs.linkSync(candidatePath, lockPath);
  } catch (e) {
    if (e.code === 'EEXIST') return false;
    throw e;
  }
  syncDirectory(specDir);
  const published = readLock(lockPath);
  if (!lockIdentityEqual(published, owner) || published.leaseUntil !== owner.leaseUntil) {
    fail('published transaction lock differs from its complete candidate; no transaction mutation was attempted');
  }
  fs.renameSync(candidatePath, lockOwnerPath(specDir, owner));
  syncDirectory(specDir);
  return true;
}

function removeCandidateIfOwned(specDir, owner) {
  for (const candidatePath of [lockCandidatePath(specDir, owner), lockOwnerPath(specDir, owner)]) {
    const candidate = lstatRegularOrMissing(candidatePath, 'transaction lock candidate');
    if (candidate === null) continue;
    try {
      const value = readLock(candidatePath, 'transaction lock candidate');
      if (lockIdentityEqual(value, owner) && value.leaseUntil === owner.leaseUntil) {
        removeExactRegular(candidatePath, 'transaction lock candidate', specDir);
      }
    } catch {
      // Never remove an artifact whose ownership cannot be established.
    }
  }
}

function writeLockLease(specDir, owner, writeSync, now, unlinkSync = fs.unlinkSync) {
  const refreshed = { ...owner, leaseUntil: now + TRANSACTION_LOCK_LEASE_MS };
  const tmpPath = lockLeaseTmpPath(specDir, owner);
  let published = false;
  try {
    removeExactRegular(tmpPath, 'unpublished transaction lock lease temporary', specDir);
    const fd = fs.openSync(tmpPath, 'wx', 0o600);
    try {
      const data = Buffer.from(lockJson(refreshed), 'utf8');
      writeAllSync(fd, data, writeSync);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const written = readRegularBytes(tmpPath, 'unpublished transaction lock lease temporary');
    if (Buffer.compare(written, Buffer.from(lockJson(refreshed), 'utf8')) !== 0) {
      fail('transaction lock lease temporary was not written completely; no transaction mutation was attempted');
    }
    readLock(tmpPath, 'transaction lock lease');
    fs.renameSync(tmpPath, lockLeasePath(specDir, owner));
    published = true;
    syncDirectory(specDir);
    owner.leaseUntil = refreshed.leaseUntil;
  } catch (error) {
    if (!removePrivateRegularBestEffort(tmpPath, unlinkSync)) {
      rememberRecoverableArtifact(tmpPath, owner);
    }
    if (published && !removeOwnedLockRecordBestEffort(lockLeasePath(specDir, owner), owner, false, unlinkSync)) {
      rememberRecoverableArtifact(lockLeasePath(specDir, owner), owner);
      rememberOwnerRecovery(specDir, owner);
    }
    throw error;
  }
}

function assertTransactionLockOwned(specDir, owner, now, options) {
  const current = readLock(transactionLockPath(specDir));
  if (!lockIdentityEqual(current, owner)) {
    fail('transaction lock ownership changed; refusing to mutate outputs');
  }
  if (!lockIsActive(specDir, current, now, options)) {
    fail('transaction lock lease expired; refusing to mutate outputs');
  }
}

function lockArtifactEntries(specDir, prefix, suffix = '') {
  let entries;
  try { entries = fs.readdirSync(specDir); } catch { return []; }
  return entries.filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .map((name) => path.join(specDir, name));
}

function cleanStaleCandidateTemps(specDir, now, options) {
  const re = new RegExp(`^${TRANSACTION_LOCK_CANDIDATE_PREFIX.replaceAll('.', '\\.')}` +
    `(\\d+)\\.([0-9a-f]{32})\\.([0-9a-f]{32})\\.tmp$`, 'u');
  for (const candidatePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_CANDIDATE_PREFIX, '.tmp')) {
    const name = path.basename(candidatePath);
    const match = re.exec(name);
    if (match === null) fail('transaction lock candidate temporary has an invalid owner name; no transaction mutation was attempted');
    const pid = Number(match[1]);
    const incarnation = match[2];
    const stat = lstatRegularOrMissing(candidatePath, 'unpublished transaction lock candidate');
    if (stat === null) continue;
    const live = pidIsLive(pid);
    const observed = live ? observedProcessIncarnation(pid, options) : null;
    if (live && (incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
        observed === null || observed === incarnation)) {
      if (!recoverableArtifactBelongsToCurrentProcess(candidatePath, options)) {
        fail(`transaction is owned by live process ${pid}; refusing concurrent write`);
      }
      removeExactRegular(candidatePath, 'resumable unpublished transaction lock candidate', specDir,
        options.unlinkSync || fs.unlinkSync);
      forgetRecoverableArtifact(candidatePath);
      continue;
    }
    if (!live || (observed !== null && incarnation !== TRANSACTION_LOCK_UNVERIFIED_INCARNATION &&
        observed !== incarnation)) {
      removeExactRegular(candidatePath, 'stale unpublished transaction lock candidate', specDir,
        options.unlinkSync || fs.unlinkSync);
    }
  }
}

function cleanExistingClaims(specDir, now, options) {
  for (const claimPath of lockArtifactEntries(specDir, TRANSACTION_LOCK_CLAIM_PREFIX)) {
    const stat = lstatRegularOrMissing(claimPath, 'transaction lock claim');
    if (stat === null) continue;
    let claim;
    let legacy = null;
    try {
      claim = readLockClaim(claimPath, 'transaction lock claim');
      if (lockClaimIsActive(claim, now, options)) {
        fail(`transaction lock reclaim is already in progress by live process ${claim.pid}`);
      }
    } catch (error) {
      try {
        legacy = readLock(claimPath, 'transaction lock claim');
      } catch {
        throw error;
      }
      if (now - Math.trunc(stat.mtimeMs) < TRANSACTION_LOCK_LEASE_MS) {
        fail('transaction lock reclaim is already in progress; refusing concurrent write');
      }
      if (lockIsActive(specDir, legacy, now, options)) {
        fail(`transaction is owned by live process ${legacy.pid}; refusing concurrent write`);
      }
      claim = null;
    }
    if (claim !== null && lockClaimIsActive(claim, now, options)) {
      fail(`transaction lock reclaim is already in progress by live process ${claim.pid}`);
    }
    const captured = claim === null
      ? captureExactLockRecord(specDir, claimPath, legacy, options, 'acquisition-cleanup')
      : captureExactLockClaim(specDir, claimPath, claim, options, 'acquisition-cleanup');
    if (captured === null) {
      fail('transaction lock claim disappeared during acquisition cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir);
  }
}

function cleanStaleLockClaimTemps(specDir, options) {
  const re = new RegExp(`^${TRANSACTION_LOCK_CLAIM_PREFIX.replaceAll('.', '\\.')}` +
    `(\\d+)\\.([0-9a-f]{32})\\.[0-9a-f]{32}\\.([0-9a-f]{32})\\.tmp$`, 'u');
  for (const claimPath of lockArtifactEntries(specDir, TRANSACTION_LOCK_CLAIM_PREFIX, '.tmp')) {
    const match = re.exec(path.basename(claimPath));
    if (match === null) {
      fail('transaction lock claim temporary has an invalid owner name; no transaction mutation was attempted');
    }
    const stat = lstatRegularOrMissing(claimPath, 'unpublished transaction lock claim');
    if (stat === null) continue;
    const pid = Number(match[1]);
    const incarnation = match[2];
    const live = pidIsLive(pid);
    const observed = live ? observedProcessIncarnation(pid, options) : null;
    if (live && (incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
        observed === null || observed === incarnation)) {
      if (!recoverableArtifactBelongsToCurrentProcess(claimPath, options)) {
        fail(`transaction lock reclaim is in progress by live process ${pid}`);
      }
      removeExactRegular(claimPath, 'resumable unpublished transaction lock claim', specDir,
        options.unlinkSync || fs.unlinkSync);
      forgetRecoverableArtifact(claimPath);
      continue;
    }
    removeExactRegular(claimPath, 'stale unpublished transaction lock claim', specDir,
      options.unlinkSync || fs.unlinkSync);
  }
}

function acquireTransactionLock(specDir, options = {}) {
  const lockPath = transactionLockPath(specDir);
  const now = lockNow(options.now);
  const writeSync = options.writeSync || fs.writeSync;
  const owner = { format: TRANSACTION_LOCK_FORMAT, version: TRANSACTION_LOCK_VERSION,
    pid: process.pid, incarnation: lockIncarnationForOwner(options),
    nonce: randomBytes(16).toString('hex'), leaseUntil: now + TRANSACTION_LOCK_LEASE_MS };
  const reclaimedOwners = options.reclaimedOwners || [];
  const lockOptions = { ...options, reclaimerNonce: owner.nonce, reclaimedOwners };
  let staleClaimed = false;
  for (;;) {
    cleanStaleLockLeaseTemps(specDir, now, lockOptions);
    cleanStaleLockClaimTemps(specDir, lockOptions);
    cleanStaleCandidateTemps(specDir, now, lockOptions);
    cleanRecoverableMetadata(specDir, lockOptions);
    cleanExistingQuarantines(specDir, now, lockOptions);
    cleanExistingClaims(specDir, now, lockOptions);
    cleanLegacyFixedArtifacts(specDir, now, lockOptions);
    cleanExistingReleaseClaims(specDir, now, lockOptions);

    const finalStat = lstatRegularOrMissing(lockPath, 'transaction lock');
    if (finalStat !== null) {
      const current = readLock(lockPath);
      if (lockIsActive(specDir, current, now, lockOptions)) {
        if (options.resumeCurrentOwner === true && ownerIsCurrentProcess(current, lockOptions) &&
            ownerRecoveryPending(specDir, current)) {
          return current;
        }
        fail(`transaction is owned by live process ${current.pid}; refusing concurrent write`);
      }
      if (!claimExactStaleFile(specDir, lockPath, current, now, lockOptions)) continue;
      reclaimedOwners.push(current);
      staleClaimed = true;
    }

    const candidates = [
      ...lockArtifactEntries(specDir, TRANSACTION_LOCK_CANDIDATE_PREFIX)
        .filter((candidatePath) => !candidatePath.endsWith('.tmp')),
      ...lockArtifactEntries(specDir, TRANSACTION_LOCK_OWNER_PREFIX),
    ];
    for (const candidatePath of candidates) {
      if (lstatRegularOrMissing(candidatePath, 'transaction lock candidate') === null) continue;
      const candidate = readLock(candidatePath, 'transaction lock candidate');
      if (lockIsActive(specDir, candidate, now, lockOptions)) {
        if (options.resumeCurrentOwner === true && ownerIsCurrentProcess(candidate, lockOptions) &&
            ownerRecoveryPending(specDir, candidate)) {
          if (!removeOwnedLockRecordBestEffort(candidatePath, candidate, false,
            options.unlinkSync || fs.unlinkSync)) {
            fail('resumable transaction lock candidate cleanup failed; no transaction mutation was attempted');
          }
          forgetOwnerRecovery(specDir, candidate);
          forgetRecoverableArtifact(candidatePath);
          continue;
        }
        fail(`transaction is owned by live process ${candidate.pid}; refusing concurrent write`);
      }
      if (!claimExactStaleFile(specDir, candidatePath, candidate, now, lockOptions)) continue;
      reclaimedOwners.push(candidate);
      staleClaimed = true;
    }

    if (typeof options.onStaleLockClaimed === 'function' && staleClaimed) {
      options.onStaleLockClaimed();
      staleClaimed = false;
    }
    try {
      writeLockCandidate(specDir, owner, writeSync, options.unlinkSync || fs.unlinkSync);
      if (!publishLockCandidate(specDir, owner)) {
        removeCandidateIfOwned(specDir, owner);
        continue;
      }
      writeLockLease(specDir, owner, writeSync, now, options.unlinkSync || fs.unlinkSync);
      return owner;
    } catch (e) {
      cleanupFailedLockOwnerArtifacts(specDir, owner, options);
      if (e.code !== 'EEXIST') throw e;
      continue;
    }
  }
}

function releaseTransactionLock(specDir, owner, options = {}) {
  const lockPath = transactionLockPath(specDir);
  const releasePath = lockReleasePath(specDir, owner);
  const releaseExists = lstatRegularOrMissing(releasePath, 'transaction lock release claim') !== null;
  if (releaseExists) {
    const captured = readLock(releasePath, 'transaction lock release claim');
    if (!lockIdentityEqual(captured, owner)) {
      fail('transaction lock release claim belongs to a different incarnation; ambiguous data was left untouched');
    }
    const current = lstatRegularOrMissing(lockPath, 'replacement transaction lock');
    if (current !== null) {
      const replacement = readLock(lockPath, 'replacement transaction lock');
      if (lockIdentityEqual(replacement, owner)) {
        fail('transaction lock release claim and fixed alias have the same owner; ambiguous data was left untouched');
      }
    }
    cleanReleaseOwnerArtifacts(specDir, owner, lockNow(options.now), {
      ...options, allowCurrentReleaseOwner: true,
    });
    const releaseOptions = { ...options, reclaimerNonce: owner.nonce };
    const capturedRelease = captureExactLockRecord(
      specDir, releasePath, owner, releaseOptions, 'release-complete');
    if (capturedRelease === null) {
      fail('transaction lock release claim disappeared during cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(capturedRelease.quarantinePath, 'transaction quarantine record', specDir,
      options.unlinkSync || fs.unlinkSync);
    syncDirectory(specDir);
    forgetOwnerRecovery(specDir, owner);
    return;
  }
  const current = readLock(lockPath);
  if (!lockIdentityEqual(current, owner)) {
    fail('transaction lock ownership changed; refusing to remove another owner lock');
  }
  const beforeReleaseRename = options.onReleaseValidated || options.onReleaseBeforeRename;
  if (typeof beforeReleaseRename === 'function') {
    beforeReleaseRename();
  }

  try {
    fs.renameSync(lockPath, releasePath);
  } catch (e) {
    if (e.code === 'ENOENT') fail('transaction lock disappeared before release; no transaction mutation was attempted');
    throw e;
  }
  const captured = readLock(releasePath, 'transaction lock release claim');
  if (!lockIdentityEqual(captured, owner)) {
    restoreCapturedLock(specDir, releasePath, lockPath);
    const replacement = readLock(lockPath, 'replacement transaction lock');
    if (lockIsActive(specDir, replacement, lockNow(options.now), options)) {
      fail(`transaction is owned by live process ${replacement.pid}; refusing concurrent write`);
    }
    fail('transaction lock replacement was captured during release; no transaction mutation was attempted');
  }

  const afterReleaseCapture = options.onReleaseCaptured || options.onReleaseBeforeArtifactCleanup;
  if (typeof afterReleaseCapture === 'function') {
    afterReleaseCapture();
  }

  // The fixed alias is now held in the owner-specific release claim. No
  // owner-derived artifact can be confused with a replacement nonce. Each
  // artifact is captured and validated again before its removal.
  removeReleaseOwnerArtifacts(specDir, owner, options);
  const releaseOptions = { ...options, reclaimerNonce: owner.nonce };
  const capturedRelease = captureExactLockRecord(
    specDir, releasePath, owner, releaseOptions, 'release-complete');
  if (capturedRelease === null) {
    fail('transaction lock release claim disappeared during cleanup; no transaction mutation was attempted');
  }
  removeExactRegular(capturedRelease.quarantinePath, 'transaction quarantine record', specDir,
    options.unlinkSync || fs.unlinkSync);
  syncDirectory(specDir);
  forgetOwnerRecovery(specDir, owner);
}

function transactionLockGuard(specDir, owner, options) {
  if (owner === null) fail('transaction mutation requires an owned cooperative lock');
  return () => {
    transactionLockOwnershipGuard(specDir, owner, options)();
    const now = lockNow(options.now);
    writeLockLease(specDir, owner, options.writeSync || fs.writeSync, now,
      options.unlinkSync || fs.unlinkSync);
    transactionLockOwnershipGuard(specDir, owner, options)();
  };
}

function transactionLockOwnershipGuard(specDir, owner, options) {
  if (owner === null) fail('transaction mutation requires an owned cooperative lock');
  return () => assertTransactionLockOwned(specDir, owner, lockNow(options.now), options);
}

function recoverBuildOutputTransactionLocked(specDir, contentDir, options = {}) {
  const guard = options.owner === null || options.owner === undefined
    ? () => fail('transaction recovery requires an owned cooperative lock')
    : transactionLockGuard(specDir, options.owner, options);
  const writeSync = options.writeSync || fs.writeSync;
  const journalPath = transactionJournalPath(specDir);
  const journal = lstatRegularOrMissing(journalPath, 'transaction journal');
  if (journal !== null) {
    const state = readTransactionJournal(specDir, contentDir);
    guard();
    cleanJournalTmpIfSafe(specDir, options.unlinkSync || fs.unlinkSync);
    if (state.phase === 'committed' || state.phase === 'cleaning') {
      recoverCommittedTransaction(specDir, contentDir, state, writeSync, guard,
        options.unlinkSync || fs.unlinkSync);
    } else {
      if (state.phase !== 'rollback') beginRollback(specDir, contentDir, state, true, writeSync, guard);
      const errors = rollbackTransaction(specDir, contentDir, state, writeSync, guard,
        options.unlinkSync || fs.unlinkSync);
      if (errors.length) fail(`transaction recovery rollback failed: ${errors.join('; ')}`);
      guard();
      removeJournal(journalPath, specDir);
    }
    cleanReclaimedOwnerMarkers(specDir, options);
    return;
  }
  guard();
  cleanJournalTmpIfSafe(specDir, options.unlinkSync || fs.unlinkSync);
  const orphans = transactionArtifactPaths(specDir, contentDir)
    .filter((filePath) => ![TRANSACTION_JOURNAL_FILE, TRANSACTION_JOURNAL_TMP_FILE].includes(path.basename(filePath)));
  cleanUnpublishedOutputTemps(specDir, contentDir, orphans, options, guard);
  cleanReclaimedOwnerMarkers(specDir, options);
}

// Recovery and writing share one cooperative lock. The lock is not a hostile
// process security boundary: a process with write access can replace files
// between lstat and rename. It prevents cooperating builders from racing by
// requiring a reliable process-incarnation token, a refreshed lease, and an
// ownership check immediately before every output mutation. Lease expiry is
// not a death detector: a live matching incarnation is never reclaimed. On
// platforms that cannot prove an incarnation, live ownership is retained and
// the builder fails safely rather than risking a paused writer.
export function recoverBuildOutputTransaction(specDir, contentDir, options = {}) {
  const resolvedSpecDir = path.resolve(specDir);
  const resolvedContentDir = path.resolve(contentDir);
  validateWriteRoots(resolvedSpecDir, resolvedContentDir);
  const recoveryOptions = { ...options, reclaimedOwners: options.reclaimedOwners || [] };
  let owner = null;
  if (recoveryOptions.lockHeld) owner = recoveryOptions.owner || null;
  else owner = acquireTransactionLock(resolvedSpecDir, recoveryOptions);
  try {
    recoverBuildOutputTransactionLocked(resolvedSpecDir, resolvedContentDir, {
      ...recoveryOptions, owner,
    });
  } finally {
    if (owner !== null) releaseTransactionLock(resolvedSpecDir, owner, recoveryOptions);
  }
}

export { acquireTransactionLock, assertTransactionLockOwned, claimExactStaleFile, cleanExistingClaims, cleanStaleCandidateTemps, cleanStaleLockClaimTemps, lockArtifactEntries, publishLockCandidate, recoverBuildOutputTransactionLocked, releaseTransactionLock, removeCandidateIfOwned, transactionLockGuard, transactionLockOwnershipGuard, writeLockCandidate, writeLockLease };
