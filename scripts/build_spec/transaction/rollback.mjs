import fs from 'node:fs';
import path from 'node:path';

import { fail } from '../units/decode.mjs';
import {
  TRANSACTION_JOURNAL_FILE,
  TRANSACTION_LOCK_RELEASE_PREFIX,
  TRANSACTION_OUTPUTS,
  cleanJournalTmpIfSafe,
  ensureAbsent,
  lstatRegularOrMissing,
  outputPaths,
  readRegularBytes,
  removeExactRegular,
  removeJournal,
  syncDirectory,
  syncOutputDirectories,
  transactionJournalPath,
  transactionOutputArtifactInfo,
  verifyNew,
  verifyOld,
  writeJournalSnapshot,
} from './journal.mjs';
import {
  lockIdentityEqual,
  lockIsActive,
  lockNow,
  ownerIsCurrentProcess,
  readLock,
} from './lock.mjs';
import { lockArtifactEntries } from './acquire.mjs';
import { cleanReleaseOwnerArtifacts } from './cleanup.mjs';
import { validateWriteRoots } from '../outputs.mjs';

function cleanUnpublishedOutputTemps(specDir, contentDir, orphanPaths, options, guard) {
  const temps = [];
  for (const filePath of orphanPaths) {
    const info = transactionOutputArtifactInfo(specDir, contentDir, filePath);
    if (info === null) {
      fail(`found an unrecognized transaction artifact without ${TRANSACTION_JOURNAL_FILE}: ${filePath}; ambiguous data was left untouched`);
    }
    if (info.kind === 'bak') {
      fail(`found transaction backup without ${TRANSACTION_JOURNAL_FILE}: ${filePath}; backups are never removed without a journal`);
    }
    temps.push({ filePath, ...info });
  }
  if (temps.length === 0) return;
  const nonces = new Set(temps.map((temp) => temp.nonce));
  if (nonces.size !== 1) {
    fail(`unpublished transaction temporaries have ambiguous nonces: ${[...nonces].join(', ')}; data was left untouched`);
  }
  const tempNonce = nonces.values().next().value;
  const currentOwner = options.owner;
  const currentOwnerTemps = currentOwner !== null && currentOwner !== undefined &&
    ownerIsCurrentProcess(currentOwner, options)
    ? temps.filter((temp) => temp.nonce === currentOwner.nonce) : [];
  const reclaimedOwners = Array.isArray(options.reclaimedOwners)
    ? options.reclaimedOwners : [];
  const reclaimedTempOwners = reclaimedOwners.filter((owner) => owner.nonce === tempNonce);
  if (reclaimedTempOwners.length === 0 && currentOwnerTemps.length === 0) {
    fail(`unpublished transaction temporaries have no provably dead owner; data was left untouched`);
  }
  const reclaimRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `reclaim\\.([0-9a-f]{32})\\.[0-9a-f]{32}$`, 'u');
  const hasReclaimIntent = lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)
    .some((markerPath) => {
      const match = reclaimRe.exec(path.basename(markerPath));
      if (match === null) return false;
      const owner = (() => {
        try { return readLock(markerPath, 'transaction lock reclaim record'); } catch { return null; }
      })();
      return owner !== null && owner.nonce === tempNonce && owner.nonce === match[1] &&
        reclaimedTempOwners.some((candidate) => lockIdentityEqual(candidate, owner));
    });
  if (reclaimedTempOwners.length > 0 && !hasReclaimIntent && currentOwnerTemps.length === 0) {
    fail(`unpublished transaction temporaries have no matching reclaim intent; data was left untouched`);
  }
  for (const owner of reclaimedTempOwners) {
    if (lockIsActive(specDir, owner, lockNow(options.now), options)) {
      fail(`unpublished transaction temporary belongs to live process ${owner.pid}; data was left untouched`);
    }
  }
  for (const temp of temps) {
    if (temp.digest === null && !currentOwnerTemps.includes(temp)) {
      fail(`unpublished transaction temporary ${temp.filePath} has no derived digest; data was left untouched`);
    }
  }
  for (const temp of temps) {
    guard();
    removeExactRegular(temp.filePath, 'unpublished transaction output temporary',
      path.dirname(temp.filePath), options.unlinkSync || fs.unlinkSync);
  }
}

function cleanupPreJournalArtifacts(specDir, temporaryPaths, options, guard) {
  const unlinkSync = options.unlinkSync || fs.unlinkSync;
  let cleaned = true;
  for (const temp of temporaryPaths) {
    try {
      guard();
      removeExactRegular(temp, 'transaction temporary', path.dirname(temp), unlinkSync);
    } catch {
      // Preserve the original write error; the next owner will retry exact names.
      cleaned = false;
    }
  }
  try {
    guard();
    cleanJournalTmpIfSafe(specDir, unlinkSync);
  } catch {
    // Preserve the original write error; the next owner will retry the journal tmp.
    cleaned = false;
  }
  return cleaned;
}

function cleanReclaimedOwnerMarkers(specDir, options) {
  if (!Array.isArray(options.reclaimedOwners) || options.reclaimedOwners.length === 0) return;
  const reclaimRe = new RegExp(
    `^${TRANSACTION_LOCK_RELEASE_PREFIX.replaceAll('.', '\\.')}` +
    `reclaim\\.([0-9a-f]{32})\\.[0-9a-f]{32}$`, 'u');
  for (const markerPath of lockArtifactEntries(specDir, TRANSACTION_LOCK_RELEASE_PREFIX)) {
    const match = reclaimRe.exec(path.basename(markerPath));
    if (match === null) continue;
    const owner = readLock(markerPath, 'transaction lock reclaim record');
    if (owner.nonce !== match[1]) {
      fail('transaction lock reclaim record name does not match its record; ambiguous data was left untouched');
    }
    if (!options.reclaimedOwners.some((candidate) => lockIdentityEqual(candidate, owner))) continue;
    cleanReleaseOwnerArtifacts(specDir, owner, lockNow(options.now), options);
  }
}

function beginRollback(specDir, contentDir, state, journalExists, writeSync, guard) {
  state.phase = 'rollback';
  state.rollbackIndex = 0;
  writeJournalSnapshot(specDir, state, journalExists, writeSync, guard);
}

function rollbackOne(specDir, contentDir, state, index, guard, unlinkSync = fs.unlinkSync) {
  const item = state.outputs[index];
  const paths = outputPaths(specDir, contentDir, state, index);
  const destination = readRegularBytes(paths.destination, 'transaction destination');
  const backup = readRegularBytes(paths.backup, 'transaction backup');
  const temporary = lstatRegularOrMissing(paths.temp, 'transaction temporary') !== null;

  if (backup !== null) {
    verifyOld(item, backup, 'transaction backup');
    if (destination !== null) {
      verifyNew(item, destination, 'installed transaction output');
      validateWriteRoots(specDir, contentDir);
      guard();
      removeExactRegular(paths.destination, 'installed transaction output', path.dirname(paths.destination));
    }
    ensureAbsent(paths.destination, 'transaction destination');
    lstatRegularOrMissing(paths.backup, 'transaction backup');
    validateWriteRoots(specDir, contentDir);
    guard();
    fs.renameSync(paths.backup, paths.destination);
    if (readRegularBytes(paths.destination, 'restored transaction destination') === null) {
      fail('restored transaction destination disappeared; ambiguous data was left untouched');
    }
    syncDirectory(path.dirname(paths.destination));
    verifyOld(item, readRegularBytes(paths.destination, 'restored transaction destination'), 'restored transaction destination');
  } else if (item.existed) {
    if (destination === null) {
      fail(`missing transaction backup for ${paths.destination}; ambiguous data was left untouched`);
    }
    verifyOld(item, destination, 'original transaction destination');
  } else if (destination !== null) {
    verifyNew(item, destination, 'installed transaction output');
    validateWriteRoots(specDir, contentDir);
    guard();
    removeExactRegular(paths.destination, 'installed transaction output', path.dirname(paths.destination));
  }

  if (temporary) {
    validateWriteRoots(specDir, contentDir);
    guard();
    removeExactRegular(paths.temp, 'transaction temporary', path.dirname(paths.temp), unlinkSync);
  }
}

function rollbackTransaction(specDir, contentDir, state, writeSync, guard, unlinkSync = fs.unlinkSync) {
  const errors = [];
  // Re-checking all six exact derived names makes rollback idempotent after a
  // crash between a restore and its snapshot. The cursor is informational;
  // actual bytes, not an untrusted cursor, decide every operation.
  state.rollbackIndex = 0;
  for (let index = TRANSACTION_OUTPUTS.length - 1; index >= 0; index--) {
    try {
      rollbackOne(specDir, contentDir, state, index, guard, unlinkSync);
      syncOutputDirectories(specDir, contentDir);
      state.rollbackIndex++;
      writeJournalSnapshot(specDir, state, true, writeSync, guard);
    } catch (e) {
      const backup = outputPaths(specDir, contentDir, state, index).backup;
      errors.push(`${TRANSACTION_OUTPUTS[index].root}/${TRANSACTION_OUTPUTS[index].name}: could not restore backup ${backup}: ${e.message}`);
    }
  }
  return errors;
}

function completeOne(specDir, contentDir, state, index, guard, unlinkSync = fs.unlinkSync) {
  const item = state.outputs[index];
  const paths = outputPaths(specDir, contentDir, state, index);
  let destination = readRegularBytes(paths.destination, 'transaction destination');
  const temporary = readRegularBytes(paths.temp, 'transaction temporary');
  if (destination === null) {
    if (temporary === null) fail(`missing committed output ${paths.destination}; ambiguous data was left untouched`);
    verifyNew(item, temporary, 'transaction temporary');
    ensureAbsent(paths.destination, 'transaction destination');
    validateWriteRoots(specDir, contentDir);
    guard();
    fs.renameSync(paths.temp, paths.destination);
    syncDirectory(path.dirname(paths.destination));
    destination = readRegularBytes(paths.destination, 'committed transaction destination');
  } else {
    verifyNew(item, destination, 'committed transaction destination');
    if (temporary !== null) fail(`both committed output and temporary exist for ${paths.destination}; ambiguous data was left untouched`);
  }
  verifyNew(item, destination, 'committed transaction destination');
  const backup = readRegularBytes(paths.backup, 'transaction backup');
  if (backup !== null) {
    verifyOld(item, backup, 'transaction backup');
    validateWriteRoots(specDir, contentDir);
    guard();
    removeExactRegular(paths.backup, 'transaction backup', path.dirname(paths.backup), unlinkSync);
  }
}

function recoverCommittedTransaction(specDir, contentDir, state, writeSync, guard, unlinkSync = fs.unlinkSync) {
  if (state.phase === 'committed') {
    state.phase = 'cleaning';
    state.cleanupIndex = 0;
    writeJournalSnapshot(specDir, state, true, writeSync, guard);
  }
  for (let index = state.cleanupIndex; index < TRANSACTION_OUTPUTS.length; index++) {
    completeOne(specDir, contentDir, state, index, guard, unlinkSync);
    syncOutputDirectories(specDir, contentDir);
    state.cleanupIndex = index + 1;
    writeJournalSnapshot(specDir, state, true, writeSync, guard);
  }
  guard();
  removeJournal(transactionJournalPath(specDir), specDir);
}


export { beginRollback, cleanReclaimedOwnerMarkers, cleanUnpublishedOutputTemps, cleanupPreJournalArtifacts, completeOne, recoverCommittedTransaction, rollbackOne, rollbackTransaction };
