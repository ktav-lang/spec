import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { fail, utf8Strict } from '../units/decode.mjs';
import {
  PROCESS_INCARNATION,
  TRANSACTION_LOCK_CANDIDATE_PREFIX,
  TRANSACTION_LOCK_CLAIM_FORMAT,
  TRANSACTION_LOCK_CLAIM_KEYS,
  TRANSACTION_LOCK_CLAIM_PREFIX,
  TRANSACTION_LOCK_CLAIM_VERSION,
  TRANSACTION_LOCK_FILE,
  TRANSACTION_LOCK_FORMAT,
  TRANSACTION_LOCK_KEYS,
  TRANSACTION_LOCK_LEASE_PREFIX,
  TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE,
  TRANSACTION_LOCK_OWNER_PREFIX,
  TRANSACTION_LOCK_QUARANTINE_PREFIX,
  TRANSACTION_LOCK_RELEASE_PREFIX,
  TRANSACTION_LOCK_UNVERIFIED_INCARNATION,
  TRANSACTION_LOCK_VERSION,
  TRANSACTION_NONCE_RE,
  exactObjectKeys,
  hashBytes,
  lstatRegularOrMissing,
  readRegularBytes,
  rememberRecoverableArtifact,
  removeExactRegular,
  removeOwnedLockRecordBestEffort,
  removePrivateRegularBestEffort,
  syncDirectory,
  writeAllSync,
} from './journal.mjs';
import { setClaimCreationTime } from './cleanup.mjs';

function windowsProcessStart(pid) {
  try {
    const startTime = execFileSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; ` +
      'if ($null -eq $p) { exit 3 }; ' +
      '[Console]::Out.Write($p.StartTime.ToUniversalTime().Ticks)',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^\d+$/u.test(startTime) ? startTime : null;
  } catch (e) {
    return e.status === 3 ? { dead: true } : null;
  }
}

function processStartIncarnation(pid) {
  let startTime;
  if (process.platform === 'linux') {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const close = stat.lastIndexOf(')');
      if (close === -1) return null;
      const fields = stat.slice(close + 2).trim().split(/\s+/u);
      startTime = fields[19];
    } catch {
      return null;
    }
  } else if (process.platform === 'win32') {
    startTime = windowsProcessStart(pid);
    if (startTime === null || startTime?.dead === true) return null;
  } else {
    return null;
  }
  try {
    if (!/^\d+$/u.test(startTime)) return null;
    return createHash('sha256').update(`${process.platform}:${pid}:${startTime}`).digest('hex').slice(0, 32);
  } catch {
    return null;
  }
}

function observedProcessIncarnation(pid, options = {}) {
  if (options.processIncarnation !== undefined) {
    const value = typeof options.processIncarnation === 'function'
      ? options.processIncarnation(pid) : options.processIncarnation;
    if (value === null) return null;
    if (typeof value !== 'string' || !TRANSACTION_NONCE_RE.test(value)) {
      fail('transaction process-incarnation hook returned an invalid token');
    }
    return value;
  }
  return pid === process.pid ? PROCESS_INCARNATION : processStartIncarnation(pid);
}

function lockCandidatePath(specDir, owner) {
  return path.join(specDir, `${TRANSACTION_LOCK_CANDIDATE_PREFIX}${owner.nonce}`);
}

function lockCandidateTempPath(specDir, owner) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_CANDIDATE_PREFIX}${owner.pid}.${owner.incarnation}.${owner.nonce}.tmp`);
}

function lockOwnerPath(specDir, owner) {
  return path.join(specDir, `${TRANSACTION_LOCK_OWNER_PREFIX}${owner.nonce}`);
}

function lockLeasePath(specDir, owner) {
  return path.join(specDir, `${TRANSACTION_LOCK_LEASE_PREFIX}${owner.nonce}`);
}

function lockLeaseTmpPath(specDir, owner) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_LEASE_PREFIX}${owner.pid}.${owner.incarnation}.${owner.nonce}.tmp`);
}

function lockReleasePath(specDir, owner) {
  return path.join(specDir, `${TRANSACTION_LOCK_RELEASE_PREFIX}${owner.nonce}`);
}

function lockClaimTmpPath(specDir, target, claim) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_CLAIM_PREFIX}${claim.pid}.${claim.incarnation}.${target.nonce}.${claim.nonce}.tmp`);
}

function lockClaimPathForTarget(specDir, target) {
  return path.join(specDir, `${TRANSACTION_LOCK_CLAIM_PREFIX}${target.nonce}`);
}

function lockReclaimerNonce(options = {}) {
  const nonce = options.reclaimerNonce;
  if (nonce !== undefined) {
    if (!TRANSACTION_NONCE_RE.test(nonce)) fail('transaction reclaimer hook returned an invalid token');
    return nonce;
  }
  return randomBytes(16).toString('hex');
}

function lockClaimQuarantinePath(specDir, claim, options, phase) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_QUARANTINE_PREFIX}claim.${lockReclaimerNonce(options)}.` +
    `${claim.target.nonce}.${claim.nonce}.${phase}`);
}

function lockRecordQuarantinePath(specDir, record, options, kind) {
  return path.join(specDir,
    `${TRANSACTION_LOCK_QUARANTINE_PREFIX}${kind}.${lockReclaimerNonce(options)}.${record.nonce}`);
}

const TRANSACTION_LOCK_QUARANTINE_PHASES = new Set([
  'stale-claim', 'quarantine-cleanup', 'target-missing', 'target-changed',
  'target-replaced',
  'reclaim-complete', 'acquisition-cleanup', 'owner-live',
]);

function quarantineRecordKindIsDerived(kind) {
  if (new Set([
    'stale-claim', 'acquisition-cleanup', 'release-claim', 'release-complete',
    `legacy-${TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE}`,
    `legacy-${TRANSACTION_LOCK_FILE}.claim`,
    `legacy-${TRANSACTION_LOCK_FILE}.lease`,
  ]).has(kind)) return true;
  if (/^reclaim-(?:owner|legacy)-[0-9a-f]{8}$/u.test(kind) ||
      /^quarantine-cleanup-[0-9a-f]{8}$/u.test(kind)) return true;
  const releaseCleanup = /^release-cleanup-(.*)$/u.exec(kind);
  if (releaseCleanup === null) return false;
  const escapedReleasePrefix = TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.');
  return new RegExp(
    `^${escapedReleasePrefix}(?:[0-9a-f]{32}\\.(?:candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)|` +
    `reclaim\\.[0-9a-f]{32}\\.[0-9a-f]{32})$`, 'u').test(releaseCleanup[1]);
}

function quarantineDescriptor(name) {
  const escapedPrefix = TRANSACTION_LOCK_QUARANTINE_PREFIX.replaceAll('.', '\\.');
  const claim = new RegExp(
    `^${escapedPrefix}claim\\.([0-9a-f]{32})\\.([0-9a-f]{32})\\.([0-9a-f]{32})\\.` +
    `(${[...TRANSACTION_LOCK_QUARANTINE_PHASES].join('|')})$`, 'u').exec(name);
  if (claim !== null) {
    return {
      type: 'claim', reclaimerNonce: claim[1], targetNonce: claim[2], claimNonce: claim[3],
      phase: claim[4],
    };
  }
  const legacy = new RegExp(
    `^${escapedPrefix}legacy\\.([0-9a-f]{32})\\.([0-9a-f]{16})$`, 'u').exec(name);
  if (legacy !== null) {
    return { type: 'legacy', reclaimerNonce: legacy[1], digest: legacy[2] };
  }
  const record = new RegExp(
    `^${escapedPrefix}(.+)\\.([0-9a-f]{32})\\.([0-9a-f]{32})$`, 'u').exec(name);
  if (record !== null && quarantineRecordKindIsDerived(record[1])) {
    return { type: 'record', kind: record[1], reclaimerNonce: record[2], recordNonce: record[3] };
  }
  return null;
}

function releaseQuarantineBelongsToOwner(descriptor, owner) {
  if (descriptor?.type !== 'record') return false;
  if (descriptor.kind === 'release-claim' || descriptor.kind === 'release-complete') {
    return descriptor.reclaimerNonce.length === 32 && descriptor.recordNonce === owner.nonce;
  }
  const cleanup = /^release-cleanup-(.*)$/u.exec(descriptor.kind);
  if (cleanup === null) return false;
  const sourceName = cleanup[1];
  const source = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `([0-9a-f]{32})\\.(?:candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)$`, 'u'
  ).exec(sourceName);
  const reclaim = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `reclaim\\.([0-9a-f]{32})\\.[0-9a-f]{32}$`, 'u'
  ).exec(sourceName);
  return (source !== null && source[1] === owner.nonce) ||
    (reclaim !== null && reclaim[1] === owner.nonce);
}

function lockNow(now) {
  const value = typeof now === 'function' ? now() : now === undefined ? Date.now() : now;
  if (!Number.isSafeInteger(value) || value < 0) fail('transaction lock clock returned an invalid timestamp');
  return value;
}

function lockJson(value) {
  return JSON.stringify(value) + '\n';
}

function lockIdentityEqual(left, right) {
  return left.format === right.format && left.version === right.version &&
    left.pid === right.pid && left.incarnation === right.incarnation && left.nonce === right.nonce;
}

function lockClaimEqual(left, right) {
  return lockIdentityEqual(left.target, right.target) &&
    left.pid === right.pid && left.incarnation === right.incarnation &&
    left.nonce === right.nonce && left.createdAt === right.createdAt;
}

function lockIncarnationForOwner(options = {}, pid = process.pid) {
  return observedProcessIncarnation(pid, options) || TRANSACTION_LOCK_UNVERIFIED_INCARNATION;
}

function ownerIsCurrentProcess(owner, options = {}) {
  return owner.pid === process.pid &&
    owner.incarnation === lockIncarnationForOwner(options, process.pid);
}

function rememberReclaimedOwner(options, owner) {
  if (!Array.isArray(options.reclaimedOwners)) return;
  if (!options.reclaimedOwners.some((candidate) => lockIdentityEqual(candidate, owner))) {
    options.reclaimedOwners.push({ ...owner });
  }
}

function pidIsLive(pid) {
  if (process.platform === 'win32' && pid !== process.pid) {
    const processStart = windowsProcessStart(pid);
    if (processStart?.dead === true) return false;
    if (typeof processStart === 'string') return true;
    const incarnation = processStartIncarnation(pid);
    if (incarnation === null) {
      try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; }
    }
    return true;
  }
  try { process.kill(pid, 0); return true; } catch (e) {
    return e.code !== 'ESRCH';
  }
}

function readLock(lockPath, label = 'transaction lock') {
  const source = readLockMetadataBytes(lockPath, label);
  let value;
  try {
    value = JSON.parse(utf8Strict.decode(source));
  } catch (e) {
    fail(`${label} is corrupt: ${e.message}; no transaction mutation was attempted`);
  }
  if (Buffer.compare(source, Buffer.from(lockJson(value), 'utf8')) !== 0) {
    fail(`${label} is not a canonical complete record; no transaction mutation was attempted`);
  }
  if (!exactObjectKeys(value, TRANSACTION_LOCK_KEYS) || value.format !== TRANSACTION_LOCK_FORMAT ||
      value.version !== TRANSACTION_LOCK_VERSION || !Number.isSafeInteger(value.pid) || value.pid < 1 ||
      typeof value.incarnation !== 'string' || !TRANSACTION_NONCE_RE.test(value.incarnation) ||
      !TRANSACTION_NONCE_RE.test(value.nonce) || !Number.isSafeInteger(value.leaseUntil) || value.leaseUntil < 0) {
    fail(`${label} has an invalid schema; no transaction mutation was attempted`);
  }
  return value;
}

function readLockMetadataBytes(filePath, label) {
  if (lstatRegularOrMissing(filePath, label) === null) {
    const error = new Error(
      `${label} disappeared before it could be read; no transaction mutation was attempted`);
    error.code = 'ENOENT';
    throw error;
  }
  try {
    return fs.readFileSync(filePath);
  } catch (e) {
    const error = new Error(
      `${label} cannot be read: ${e.message}; no transaction mutation was attempted`,
      { cause: e });
    error.code = e.code;
    throw error;
  }
}

function readLockClaim(claimPath, label = 'transaction lock claim') {
  const source = readLockMetadataBytes(claimPath, label);
  let value;
  try {
    value = JSON.parse(utf8Strict.decode(source));
  } catch (e) {
    fail(`${label} is corrupt: ${e.message}; no transaction mutation was attempted`);
  }
  if (Buffer.compare(source, Buffer.from(lockJson(value), 'utf8')) !== 0 ||
      !exactObjectKeys(value, TRANSACTION_LOCK_CLAIM_KEYS) ||
      value.format !== TRANSACTION_LOCK_CLAIM_FORMAT ||
      value.version !== TRANSACTION_LOCK_CLAIM_VERSION ||
      !Number.isSafeInteger(value.pid) || value.pid < 1 ||
      typeof value.incarnation !== 'string' || !TRANSACTION_NONCE_RE.test(value.incarnation) ||
      !TRANSACTION_NONCE_RE.test(value.nonce) ||
      !Number.isSafeInteger(value.createdAt) || value.createdAt < 0 ||
      value.target === null || typeof value.target !== 'object' ||
      !exactObjectKeys(value.target, TRANSACTION_LOCK_KEYS)) {
    fail(`${label} has an invalid schema; no transaction mutation was attempted`);
  }
  // Reuse the lock validator for the target without trusting any path from it.
  if (value.target.format !== TRANSACTION_LOCK_FORMAT ||
      value.target.version !== TRANSACTION_LOCK_VERSION ||
      !Number.isSafeInteger(value.target.pid) || value.target.pid < 1 ||
      typeof value.target.incarnation !== 'string' || !TRANSACTION_NONCE_RE.test(value.target.incarnation) ||
      !TRANSACTION_NONCE_RE.test(value.target.nonce) ||
      !Number.isSafeInteger(value.target.leaseUntil) || value.target.leaseUntil < 0) {
    fail(`${label} has an invalid target schema; no transaction mutation was attempted`);
  }
  return value;
}

function lockIsActive(specDir, lock, now, options = {}) {
  if (!pidIsLive(lock.pid)) return false;
  const leasePath = lockLeasePath(specDir, lock);
  const lease = lstatRegularOrMissing(leasePath, 'transaction lock lease') === null
    ? null : readLock(leasePath, 'transaction lock lease');
  if (lease !== null && !lockIdentityEqual(lease, lock)) {
    fail('transaction lock lease belongs to a different incarnation; no transaction mutation was attempted');
  }
  const leaseUntil = lease === null ? lock.leaseUntil : lease.leaseUntil;
  if (leaseUntil >= now) return true;
  const observed = observedProcessIncarnation(lock.pid, options);
  // An expired lease is not a death detector. A live matching incarnation is
  // still the owner, and an unknown incarnation is handled conservatively.
  return lock.incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
    observed === null || observed === lock.incarnation;
}

function lockClaimIsActive(claim, now, options) {
  if (!pidIsLive(claim.pid)) return false;
  const observed = observedProcessIncarnation(claim.pid, options);
  return claim.incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
    observed === null || observed === claim.incarnation;
}

function writeLockRecord(specDir, finalPath, tmpPath, value, label, writeSync,
                         unlinkSync = fs.unlinkSync) {
  let published = false;
  try {
    removeExactRegular(tmpPath, `unpublished ${label} temporary`, specDir);
    const fd = fs.openSync(tmpPath, 'wx', 0o600);
    try {
      writeAllSync(fd, Buffer.from(lockJson(value), 'utf8'), writeSync);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const written = readRegularBytes(tmpPath, `unpublished ${label} temporary`);
    if (Buffer.compare(written, Buffer.from(lockJson(value), 'utf8')) !== 0) {
      fail(`${label} temporary was not written completely; no transaction mutation was attempted`);
    }
    if (label === 'transaction lock claim') readLockClaim(tmpPath, label);
    else readLock(tmpPath, label);
    // A hard link is the cross-platform no-replace publication primitive for
    // a regular file. rename() would overwrite a concurrent fresh claim on
    // POSIX, destroying the serialization guarantee.
    try {
      fs.linkSync(tmpPath, finalPath);
    } catch (e) {
      if (e.code === 'EEXIST') {
        if (!removePrivateRegularBestEffort(tmpPath, unlinkSync)) {
          rememberRecoverableArtifact(tmpPath, value);
        }
        return false;
      }
      throw e;
    }
    published = true;
    removeExactRegular(tmpPath, `unpublished ${label} temporary`, specDir);
    syncDirectory(specDir);
    return true;
  } catch (error) {
    if (!removePrivateRegularBestEffort(tmpPath, unlinkSync)) {
      rememberRecoverableArtifact(tmpPath, value);
    }
    if (published && label === 'transaction lock claim') {
      if (!removeOwnedLockRecordBestEffort(finalPath, value, true, unlinkSync)) {
        rememberRecoverableArtifact(finalPath, value);
      }
    }
    throw error;
  }
}

function publishLockClaim(specDir, target, now, options) {
  const claimPath = lockClaimPathForTarget(specDir, target);
  const existing = lstatRegularOrMissing(claimPath, 'transaction lock claim');
  if (existing !== null) {
    let claim = null;
    let legacyOwner = null;
    try {
      claim = readLockClaim(claimPath);
    } catch (error) {
      try {
        legacyOwner = readLock(claimPath, 'transaction lock claim');
      } catch {
        throw error;
      }
      if (lockIsActive(specDir, legacyOwner, now, options)) {
        fail(`transaction is owned by live process ${legacyOwner.pid}; refusing concurrent write`);
      }
    }
    if (claim !== null && !lockIdentityEqual(claim.target, target)) {
      fail('transaction lock claim targets a different owner; ambiguous data was left untouched');
    }
    if (claim !== null && lockClaimIsActive(claim, now, options)) {
      fail(`transaction lock reclaim is already in progress by live process ${claim.pid}`);
    }
    const captured = claim === null
      ? captureExactLockRecord(specDir, claimPath, legacyOwner, options, 'stale-claim')
      : captureExactLockClaim(specDir, claimPath, claim, options, 'stale-claim');
    if (captured !== null) {
      removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir);
    }
  }

  const claim = {
    format: TRANSACTION_LOCK_CLAIM_FORMAT,
    version: TRANSACTION_LOCK_CLAIM_VERSION,
    pid: process.pid,
    incarnation: lockIncarnationForOwner(options),
    nonce: randomBytes(16).toString('hex'),
    createdAt: now,
    target,
  };
  const tmpPath = lockClaimTmpPath(specDir, target, claim);
  if (!writeLockRecord(specDir, claimPath, tmpPath, claim, 'transaction lock claim',
    options.writeSync || fs.writeSync, options.unlinkSync || fs.unlinkSync)) return null;
  try {
    setClaimCreationTime(claimPath, now);
  } catch (error) {
    if (!removeOwnedLockRecordBestEffort(claimPath, claim, true,
      options.unlinkSync || fs.unlinkSync)) {
      rememberRecoverableArtifact(claimPath, claim);
    }
    throw error;
  }
  return { path: claimPath, record: claim };
}

function restoreCapturedLock(specDir, capturedPath, targetPath) {
  if (lstatRegularOrMissing(targetPath, 'replacement transaction lock') !== null) {
    fail('transaction lock replacement appeared while restoring the captured record; ambiguous data was left untouched');
  }
  try {
    fs.linkSync(capturedPath, targetPath);
  } catch (e) {
    if (e.code === 'EEXIST') {
      fail('transaction lock replacement appeared while restoring the captured record; ambiguous data was left untouched');
    }
    throw e;
  }
  removeExactRegular(capturedPath, 'transaction lock captured record', specDir);
  syncDirectory(specDir);
}

function captureExactRecord(specDir, sourcePath, expected, quarantinePath, label,
                            readRecord, equalRecord, beforeCapture = null, afterCapture = null) {
  if (lstatRegularOrMissing(sourcePath, label) === null) return null;
  if (lstatRegularOrMissing(quarantinePath, 'transaction quarantine record') !== null) {
    fail('transaction quarantine record already exists; ambiguous data was left untouched');
  }
  const observed = readRecord(sourcePath, label);
  if (!equalRecord(observed, expected)) {
    fail(`${label} changed; refusing to remove another record`);
  }
  if (typeof beforeCapture === 'function') beforeCapture({ sourcePath, quarantinePath, record: expected });
  try {
    fs.renameSync(sourcePath, quarantinePath);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  try {
    const captured = readRecord(quarantinePath, 'transaction quarantine record');
    if (!equalRecord(captured, expected)) {
      restoreCapturedLock(specDir, quarantinePath, sourcePath);
      fail(`${label} replacement was captured; no transaction mutation was attempted`);
    }
  } catch (error) {
    if (lstatRegularOrMissing(quarantinePath, 'transaction quarantine record') !== null &&
        lstatRegularOrMissing(sourcePath, label) === null) {
      restoreCapturedLock(specDir, quarantinePath, sourcePath);
    }
    throw error;
  }
  if (typeof afterCapture === 'function') {
    afterCapture({ sourcePath, quarantinePath, record: expected });
  }
  return { quarantinePath, sourcePath };
}

function captureExactLockClaim(specDir, claimPath, expected, options, phase) {
  return captureExactRecord(
    specDir, claimPath, expected,
    lockClaimQuarantinePath(specDir, expected, options, phase),
    'transaction lock claim',
    readLockClaim, lockClaimEqual,
    options.onLockClaimBeforeCapture || options.onReclaimerClaimBeforeCapture,
    options.onLockClaimCaptured || options.onReclaimerClaimCaptured);
}

function captureExactLockRecord(specDir, recordPath, expected, options, kind) {
  return captureExactRecord(
    specDir, recordPath, expected,
    lockRecordQuarantinePath(specDir, expected, options, kind),
    'transaction lock record',
    readLock, lockIdentityEqual,
    options.onLockRecordBeforeCapture, options.onLockRecordCaptured);
}

function captureExactBytes(specDir, sourcePath, expected, quarantinePath, label, options) {
  if (lstatRegularOrMissing(sourcePath, label) === null) return null;
  if (lstatRegularOrMissing(quarantinePath, 'transaction quarantine record') !== null) {
    fail('transaction quarantine record already exists; ambiguous data was left untouched');
  }
  const before = readRegularBytes(sourcePath, label);
  if (before === null || Buffer.compare(before, expected) !== 0) {
    fail(`${label} changed; refusing to remove another record`);
  }
  const hook = options.onLockRecordBeforeCapture;
  if (typeof hook === 'function') hook({ sourcePath, quarantinePath, record: expected });
  try {
    fs.renameSync(sourcePath, quarantinePath);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  const captured = readRegularBytes(quarantinePath, 'transaction quarantine record');
  if (captured === null || Buffer.compare(captured, expected) !== 0) {
    restoreCapturedLock(specDir, quarantinePath, sourcePath);
    fail(`${label} replacement was captured; no transaction mutation was attempted`);
  }
  if (typeof options.onLockRecordCaptured === 'function') {
    options.onLockRecordCaptured({ sourcePath, quarantinePath, record: expected });
  }
  return { quarantinePath, sourcePath };
}

function discardExactLockClaim(specDir, claimPath, expected, options, phase) {
  const captured = captureExactLockClaim(specDir, claimPath, expected, options, phase);
  if (captured === null) return false;
  removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
    options.unlinkSync || fs.unlinkSync);
  return true;
}

function removeExactOwnerArtifacts(specDir, owner, claimPath, reclaimPath, options) {
  const escapedPrefix = TRANSACTION_LOCK_FILE.replaceAll('.', '\\.');
  const escapedNonce = owner.nonce;
  const re = new RegExp(
    `^${escapedPrefix}\\.(?:candidate|owner|claim|lease)\\.(?:${escapedNonce}|\\d+\\.[0-9a-f]{32}\\.${escapedNonce}(?:\\.tmp)?)$`, 'u');
  const releaseRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}${escapedNonce}(?:\\..+)?$`, 'u');
  let entries;
  try { entries = fs.readdirSync(specDir); } catch { return; }
  const captured = [];
  try {
    for (const name of entries) {
      if (!re.test(name) && !releaseRe.test(name)) continue;
      const filePath = path.join(specDir, name);
      if (filePath === reclaimPath || filePath === claimPath) continue;
      const expected = readLock(filePath, 'stale transaction lock owner artifact');
      if (!lockIdentityEqual(expected, owner)) {
        fail('stale transaction lock owner artifact belongs to a different incarnation; ambiguous data was left untouched');
      }
      const suffix = hashBytes(Buffer.from(name, 'utf8')).slice(0, 8);
      const artifact = captureExactLockRecord(
        specDir, filePath, owner, options, `reclaim-owner-${suffix}`);
      if (artifact === null) {
        fail('stale transaction lock owner artifact disappeared during cleanup; no transaction mutation was attempted');
      }
      captured.push(artifact);
    }
  } catch (error) {
    for (const artifact of captured.reverse()) {
      if (lstatRegularOrMissing(artifact.quarantinePath, 'transaction quarantine record') !== null &&
          lstatRegularOrMissing(artifact.sourcePath, 'stale transaction lock owner artifact') === null) {
        restoreCapturedLock(specDir, artifact.quarantinePath, artifact.sourcePath);
      }
    }
    throw error;
  }
  for (const artifact of captured) {
    removeExactRegular(artifact.quarantinePath, 'transaction quarantine record', specDir);
  }
  for (const legacyName of [
    `${TRANSACTION_LOCK_FILE}.claim`, `${TRANSACTION_LOCK_FILE}.lease`,
  ]) {
    const filePath = path.join(specDir, legacyName);
    if (lstatRegularOrMissing(filePath, 'legacy transaction lock artifact') === null) continue;
    try {
      const value = readLock(filePath, 'legacy transaction lock artifact');
      if (lockIdentityEqual(value, owner)) {
        const suffix = hashBytes(Buffer.from(legacyName, 'utf8')).slice(0, 8);
        const capturedLegacy = captureExactLockRecord(
          specDir, filePath, owner, options, `reclaim-legacy-${suffix}`);
        if (capturedLegacy === null) {
          fail('legacy transaction lock artifact disappeared during cleanup; no transaction mutation was attempted');
        }
        removeExactRegular(capturedLegacy.quarantinePath, 'transaction quarantine record', specDir,
          options.unlinkSync || fs.unlinkSync);
      }
    } catch {
      // Ambiguous legacy artifacts are left for conservative recovery.
    }
  }
}

function captureReleaseOwnedArtifact(specDir, sourcePath, owner, kind) {
  if (lstatRegularOrMissing(sourcePath, 'transaction lock owner artifact') === null) return null;
  const capturePath = path.join(specDir,
    `${TRANSACTION_LOCK_RELEASE_PREFIX}${owner.nonce}.${kind}`);
  if (lstatRegularOrMissing(capturePath, 'transaction lock release artifact') !== null) {
    fail('transaction lock release artifact already exists; ambiguous data was left untouched');
  }
  const expected = readLock(sourcePath, 'transaction lock owner artifact');
  if (!lockIdentityEqual(expected, owner)) {
    fail('transaction lock owner artifact changed; refusing to remove another owner artifact');
  }
  fs.renameSync(sourcePath, capturePath);
  try {
    const captured = readLock(capturePath, 'transaction lock release artifact');
    if (!lockIdentityEqual(captured, owner)) {
      restoreCapturedLock(specDir, capturePath, sourcePath);
      fail('transaction lock owner artifact replacement was captured; no transaction mutation was attempted');
    }
  } catch (error) {
    if (lstatRegularOrMissing(capturePath, 'transaction lock release artifact') !== null) {
      restoreCapturedLock(specDir, capturePath, sourcePath);
    }
    throw error;
  }
  return { capturePath, sourcePath };
}

function removeReleaseOwnerArtifacts(specDir, owner, options = {}) {
  const names = [
    [lockCandidatePath(specDir, owner), 'candidate'],
    [lockOwnerPath(specDir, owner), 'owner'],
    [lockClaimPathForTarget(specDir, owner), 'claim'],
    [lockLeasePath(specDir, owner), 'lease'],
    [path.join(specDir, `${TRANSACTION_LOCK_FILE}.claim`), 'legacy-claim'],
    [path.join(specDir, `${TRANSACTION_LOCK_FILE}.lease`), 'legacy-lease'],
  ];
  let entries;
  try { entries = fs.readdirSync(specDir); } catch { entries = []; }
  const tempRe = new RegExp(
    `^${TRANSACTION_LOCK_FILE.replaceAll('.', '\\.')}\\.(?:candidate|lease)\\.` +
    `\\d+\\.[0-9a-f]{32}\\.${owner.nonce}\\.tmp$`, 'u');
  for (const name of entries) {
    if (tempRe.test(name)) names.push([path.join(specDir, name), 'temporary']);
  }
  for (const [sourcePath, kind] of names) {
    const artifact = captureReleaseOwnedArtifact(specDir, sourcePath, owner, kind);
    if (artifact !== null) {
      removeExactRegular(artifact.capturePath, 'transaction lock release artifact', specDir,
        options.unlinkSync || fs.unlinkSync);
    }
  }
}


export { TRANSACTION_LOCK_QUARANTINE_PHASES, captureExactBytes, captureExactLockClaim, captureExactLockRecord, captureExactRecord, captureReleaseOwnedArtifact, discardExactLockClaim, lockCandidatePath, lockCandidateTempPath, lockClaimEqual, lockClaimIsActive, lockClaimPathForTarget, lockClaimQuarantinePath, lockClaimTmpPath, lockIdentityEqual, lockIncarnationForOwner, lockIsActive, lockJson, lockLeasePath, lockLeaseTmpPath, lockNow, lockOwnerPath, lockReclaimerNonce, lockRecordQuarantinePath, lockReleasePath, observedProcessIncarnation, ownerIsCurrentProcess, pidIsLive, processStartIncarnation, publishLockClaim, quarantineDescriptor, quarantineRecordKindIsDerived, readLock, readLockClaim, readLockMetadataBytes, releaseQuarantineBelongsToOwner, rememberReclaimedOwner, removeExactOwnerArtifacts, removeReleaseOwnerArtifacts, restoreCapturedLock, windowsProcessStart, writeLockRecord };
