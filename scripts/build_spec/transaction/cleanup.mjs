import fs from 'node:fs';
import path from 'node:path';

import { fail } from '../units/decode.mjs';
import {
  TRANSACTION_LOCK_FILE,
  TRANSACTION_LOCK_LEASE_MS,
  TRANSACTION_LOCK_LEASE_PREFIX,
  TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE,
  TRANSACTION_LOCK_QUARANTINE_PREFIX,
  TRANSACTION_LOCK_RELEASE_PREFIX,
  TRANSACTION_LOCK_UNVERIFIED_INCARNATION,
  forgetRecoverableArtifact,
  hashBytes,
  lstatRegularOrMissing,
  readRegularBytes,
  recoverableArtifactBelongsToCurrentProcess,
  removeExactRegular,
} from './journal.mjs';
import {
  captureExactBytes,
  captureExactLockClaim,
  captureExactLockRecord,
  lockClaimIsActive,
  lockIdentityEqual,
  lockIsActive,
  lockReclaimerNonce,
  observedProcessIncarnation,
  ownerIsCurrentProcess,
  pidIsLive,
  quarantineDescriptor,
  readLock,
  readLockClaim,
  releaseQuarantineBelongsToOwner,
  rememberReclaimedOwner,
  removeReleaseOwnerArtifacts,
} from './lock.mjs';
import { lockArtifactEntries } from './acquire.mjs';

function cleanStaleLockLeaseTemps(specDir, now, options) {
  let entries;
  try { entries = fs.readdirSync(specDir); } catch { return; }
  const re = new RegExp(`^${TRANSACTION_LOCK_LEASE_PREFIX.replaceAll('.', '\\.')}` +
    `(\\d+)\\.([0-9a-f]{32})\\.([0-9a-f]{32})\\.tmp$`, 'u');
  const legacyRe = new RegExp(`^${TRANSACTION_LOCK_LEASE_PREFIX.replaceAll('.', '\\.')}` +
    `([0-9a-f]{32})\\.tmp$`, 'u');
  for (const name of entries) {
    const match = re.exec(name);
    const legacyMatch = legacyRe.exec(name);
    if (match === null && legacyMatch === null) continue;
    const filePath = path.join(specDir, name);
    const stat = lstatRegularOrMissing(filePath, 'unpublished transaction lock lease temporary');
    if (stat === null) continue;
    if (match !== null) {
      const pid = Number(match[1]);
      const incarnation = match[2];
      const live = pidIsLive(pid);
      const observed = live ? observedProcessIncarnation(pid, options) : null;
      if (live && (incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
          observed === null || observed === incarnation)) {
        if (!recoverableArtifactBelongsToCurrentProcess(filePath, options)) {
          fail('transaction lock lease publication is in progress; refusing concurrent write');
        }
        removeExactRegular(filePath, 'resumable unpublished transaction lock lease', specDir,
          options.unlinkSync || fs.unlinkSync);
        forgetRecoverableArtifact(filePath);
        continue;
      }
    } else {
      const owner = readLock(filePath, 'unpublished legacy transaction lock lease');
      if (lockIsActive(specDir, owner, now, options)) {
        fail(`transaction is owned by live process ${owner.pid}; refusing concurrent write`);
      }
    }
    removeExactRegular(filePath, 'stale unpublished transaction lock lease temporary', specDir,
      options.unlinkSync || fs.unlinkSync);
  }
}

function ownerHintFromCorruptSource(source) {
  const pidMatch = /"pid"\s*:\s*(\d+)/u.exec(source);
  const incarnationMatch = /"incarnation"\s*:\s*"([0-9a-f]{32})"/u.exec(source);
  if (pidMatch === null || incarnationMatch === null) return null;
  const pid = Number(pidMatch[1]);
  return Number.isSafeInteger(pid) && pid > 0
    ? { pid, incarnation: incarnationMatch[1] } : null;
}

function ownerHintIsLive(owner, options) {
  if (!pidIsLive(owner.pid)) return false;
  const observed = observedProcessIncarnation(owner.pid, options);
  return owner.incarnation === TRANSACTION_LOCK_UNVERIFIED_INCARNATION ||
    observed === null || observed === owner.incarnation;
}

function cleanMalformedLegacyQuarantine(specDir, quarantinePath, descriptor, options) {
  const source = readRegularBytes(quarantinePath, 'legacy transaction lock quarantine');
  if (source === null) return;
  if (hashBytes(source).slice(0, 16) !== descriptor.digest) {
    fail('legacy transaction lock quarantine name does not match its bytes; ambiguous data was left untouched');
  }
  const hint = ownerHintFromCorruptSource(source.toString('utf8'));
  if (hint === null) {
    fail('legacy transaction lock quarantine has no safe owner provenance; ambiguous data was left untouched');
  }
  if (ownerHintIsLive(hint, options)) {
    fail(`legacy transaction lock quarantine belongs to live process ${hint.pid}; refusing concurrent write`);
  }
  removeExactRegular(quarantinePath, 'legacy transaction lock quarantine', specDir);
}

function cleanLegacyArtifact(specDir, filePath, label, now, options, claimFreshness = false) {
  const stat = lstatRegularOrMissing(filePath, label);
  if (stat === null) return;
  let owner;
  try {
    owner = readLock(filePath, label);
  } catch (error) {
    let source;
    try { source = fs.readFileSync(filePath); } catch (readError) {
      fail(`cannot read ${label}: ${readError.message}; ambiguous data was left untouched`);
    }
    const hint = ownerHintFromCorruptSource(source.toString('utf8'));
    if (hint !== null && !ownerHintIsLive(hint, options)) {
      const quarantinePath = path.join(specDir,
        `${TRANSACTION_LOCK_QUARANTINE_PREFIX}legacy.${lockReclaimerNonce(options)}.` +
        `${hashBytes(source).slice(0, 16)}`);
      const captured = captureExactBytes(
        specDir, filePath, source, quarantinePath, `stale ${label}`, options);
      if (captured === null) {
        fail(`${label} disappeared during cleanup; no transaction mutation was attempted`);
      }
      removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir);
      return;
    }
    fail(`${label} is corrupt; ambiguous data was left untouched`);
  }
  if (claimFreshness && now - Math.trunc(stat.mtimeMs) < TRANSACTION_LOCK_LEASE_MS) {
    fail('transaction lock reclaim is already in progress; refusing concurrent write');
  }
  if (lockIsActive(specDir, owner, now, options)) {
    fail(`transaction is owned by live process ${owner.pid}; refusing concurrent write`);
  }
  const captured = captureExactLockRecord(
    specDir, filePath, owner, options, `legacy-${path.basename(filePath)}`);
  if (captured === null) {
    fail(`${label} disappeared during cleanup; no transaction mutation was attempted`);
  }
  removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir);
}

function cleanLegacyFixedArtifacts(specDir, now, options) {
  cleanLegacyArtifact(specDir, path.join(specDir, TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE),
    'legacy transaction lock candidate', now, options);
  cleanLegacyArtifact(specDir, path.join(specDir, `${TRANSACTION_LOCK_FILE}.claim`),
    'legacy transaction lock claim', now, options, true);
  cleanLegacyArtifact(specDir, path.join(specDir, `${TRANSACTION_LOCK_FILE}.lease`),
    'legacy transaction lock lease', now, options);
}

function releaseArtifactEntriesForOwner(specDir, owner, options = {}) {
  const escaped = owner.nonce;
  const re = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}${escaped}\\.` +
    `(candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)$`, 'u');
  const reclaimRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `reclaim\\.${escaped}\\.[0-9a-f]{32}$`, 'u');
  return lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)
    .filter((filePath) => {
      const name = path.basename(filePath);
      if (options.preserveReclaimMarker === true && reclaimRe.test(name)) return false;
      return re.test(name) || reclaimRe.test(name);
    });
}

function cleanReleaseOwnerArtifacts(specDir, owner, now, options) {
  const allowCurrentProcess = options.allowCurrentReleaseOwner === true &&
    ownerIsCurrentProcess(owner, options);
  if (lockIsActive(specDir, owner, now, options) && !allowCurrentProcess) {
    fail(`transaction is owned by live process ${owner.pid}; refusing concurrent write`);
  }
  removeReleaseOwnerArtifacts(specDir, owner, options);
  for (const filePath of releaseArtifactEntriesForOwner(specDir, owner, options)) {
    const observed = readLock(filePath, 'transaction lock release artifact');
    if (!lockIdentityEqual(observed, owner)) {
      fail('transaction lock release artifact belongs to a different incarnation; ambiguous data was left untouched');
    }
    if (lockIsActive(specDir, observed, now, options) && !allowCurrentProcess) {
      fail(`transaction is owned by live process ${observed.pid}; refusing concurrent write`);
    }
    const captured = captureExactLockRecord(
      specDir, filePath, owner, options, `release-cleanup-${path.basename(filePath)}`);
    if (captured === null) {
      fail('transaction lock release artifact disappeared during cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
      options.unlinkSync || fs.unlinkSync);
  }
}

function cleanExistingReleaseClaims(specDir, now, options) {
  const finalRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `([0-9a-f]{32})$`, 'u');
  const knownRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `(?:[0-9a-f]{32}\\.(?:candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)|` +
    `reclaim\\.[0-9a-f]{32}\\.[0-9a-f]{32})$`, 'u');
  for (const releasePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)) {
    const match = finalRe.exec(path.basename(releasePath));
    if (match === null) continue;
    const owner = readLock(releasePath, 'transaction lock release claim');
    if (owner.nonce !== match[1]) {
      fail('transaction lock release claim name does not match its record; ambiguous data was left untouched');
    }
    cleanReleaseOwnerArtifacts(specDir, owner, now, {
      ...options, allowCurrentReleaseOwner: true,
    });
    const captured = captureExactLockRecord(specDir, releasePath, owner, options, 'release-claim');
    if (captured === null) {
      fail('transaction lock release claim disappeared during cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
      options.unlinkSync || fs.unlinkSync);
  }

  // A crash can leave only owner-specific release captures. They are safe to
  // remove only when the captured owner is still the exact dead owner named by
  // the artifact; a replacement incarnation is never inferred from a nonce.
  for (const releasePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)) {
    const name = path.basename(releasePath);
    if (finalRe.test(name)) continue;
    const match = new RegExp(
      `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
      `([0-9a-f]{32})\\.(candidate|owner|claim|lease|legacy-claim|legacy-lease|temporary)$`, 'u').exec(name) ||
      new RegExp(
        `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
        `reclaim\\.([0-9a-f]{32})\\.([0-9a-f]{32})$`, 'u').exec(name);
    if (match === null) continue;
    const owner = readLock(releasePath, 'transaction lock release artifact');
    if (owner.nonce !== match[1]) {
      fail('transaction lock release artifact name does not match its record; ambiguous data was left untouched');
    }
    if (name.startsWith(`${TRANSACTION_LOCK_RELEASE_PREFIX}reclaim.`)) {
      rememberReclaimedOwner(options, owner);
    }
    const preserveMarker = name.startsWith(`${TRANSACTION_LOCK_RELEASE_PREFIX}reclaim.`);
    cleanReleaseOwnerArtifacts(specDir, owner, now, {
      ...options, preserveReclaimMarker: preserveMarker, allowCurrentReleaseOwner: true,
    });
  }
  for (const releasePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)) {
    if (!knownRe.test(path.basename(releasePath))) {
      fail('transaction lock release artifact has an invalid name; ambiguous data was left untouched');
    }
  }
}

function cleanExistingQuarantines(specDir, now, options) {
  for (const quarantinePath of lockArtifactEntries(specDir, TRANSACTION_LOCK_QUARANTINE_PREFIX)) {
    const name = path.basename(quarantinePath);
    const descriptor = quarantineDescriptor(name);
    if (descriptor === null) {
      fail('transaction quarantine record has an invalid derived name; ambiguous data was left untouched');
    }
    if (descriptor.type === 'legacy') {
      cleanMalformedLegacyQuarantine(specDir, quarantinePath, descriptor, options);
      continue;
    }
    if (descriptor.type === 'claim') {
      const claim = readLockClaim(quarantinePath, 'transaction lock claim quarantine');
      if (claim.target.nonce !== descriptor.targetNonce || claim.nonce !== descriptor.claimNonce) {
        fail('transaction lock claim quarantine name does not match its record; ambiguous data was left untouched');
      }
      const resumableClaim = ownerIsCurrentProcess(claim, options);
      if ((lockClaimIsActive(claim, now, options) && !resumableClaim) ||
          lockIsActive(specDir, claim.target, now, options)) {
        fail('transaction lock claim quarantine belongs to a live process; refusing concurrent write');
      }
      const captured = captureExactLockClaim(specDir, quarantinePath, claim, options, 'quarantine-cleanup');
      if (captured === null) {
        fail('transaction lock claim quarantine disappeared during cleanup; no transaction mutation was attempted');
      }
      removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
        options.unlinkSync || fs.unlinkSync);
      continue;
    }
    const record = readLock(quarantinePath, 'transaction lock record quarantine');
    if (record.nonce !== descriptor.recordNonce) {
      fail('transaction lock record quarantine name does not match its record; ambiguous data was left untouched');
    }
    const resumableRelease = releaseQuarantineBelongsToOwner(descriptor, record) &&
      ownerIsCurrentProcess(record, options);
    if (lockIsActive(specDir, record, now, options) && !resumableRelease) {
      fail('transaction lock record quarantine belongs to a live process; refusing concurrent write');
    }
    if (resumableRelease) {
      removeExactRegular(quarantinePath, 'transaction lock record quarantine', specDir,
        options.unlinkSync || fs.unlinkSync);
      continue;
    }
    const suffix = hashBytes(Buffer.from(name, 'utf8')).slice(0, 8);
    const cleanupOptions = {
      ...options, onLockRecordBeforeCapture: undefined, onLockRecordCaptured: undefined,
    };
    const captured = captureExactLockRecord(
      specDir, quarantinePath, record, cleanupOptions, `quarantine-cleanup-${suffix}`);
    if (captured === null) {
      fail('transaction lock record quarantine disappeared during cleanup; no transaction mutation was attempted');
    }
    removeExactRegular(captured.quarantinePath, 'transaction quarantine record', specDir,
      options.unlinkSync || fs.unlinkSync);
  }
}

function setClaimCreationTime(claimPath, now) {
  const seconds = now / 1000;
  try { fs.utimesSync(claimPath, seconds, seconds); } catch (e) {
    fail(`cannot timestamp transaction lock claim: ${e.message}`);
  }
}


export { cleanExistingQuarantines, cleanExistingReleaseClaims, cleanLegacyArtifact, cleanLegacyFixedArtifacts, cleanMalformedLegacyQuarantine, cleanReleaseOwnerArtifacts, cleanStaleLockLeaseTemps, ownerHintFromCorruptSource, ownerHintIsLive, releaseArtifactEntriesForOwner, setClaimCreationTime };
