import fs from 'node:fs';
import path from 'node:path';

import { LANGS, OUT_FILES, README_FILES, README_SOURCE_FILE } from './shared.mjs';
import { fail } from './units/decode.mjs';
import { assertRegularDestination } from './content.mjs';
import {
  TRANSACTION_FORMAT,
  TRANSACTION_OUTPUTS,
  TRANSACTION_VERSION,
  directorySyncSupport,
  ensureAbsent,
  hashBytes,
  lstatRegularOrMissing,
  outputPaths,
  readRegularBytes,
  rememberOwnerRecovery,
  removeJournal,
  syncDirectory,
  syncOutputDirectories,
  transactionJournalPath,
  transactionOutputBytes,
  validateJournalState,
  verifyNew,
  verifyOld,
  writeAllSync,
  writeJournalSnapshot,
} from './transaction/journal.mjs';
import {
  beginRollback,
  cleanReclaimedOwnerMarkers,
  cleanupPreJournalArtifacts,
  rollbackTransaction,
} from './transaction/rollback.mjs';
import {
  acquireTransactionLock,
  recoverBuildOutputTransactionLocked,
  releaseTransactionLock,
  transactionLockGuard,
  transactionLockOwnershipGuard,
} from './transaction/acquire.mjs';

function resolvedWriteRoot(root, label) {
  const absolute = path.resolve(root);
  const components = [];
  let current = absolute;
  while (true) {
    components.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  for (const component of components.reverse()) {
    let stat;
    try {
      stat = fs.lstatSync(component);
    } catch (e) {
      fail(`cannot inspect ${label} path component ${component}: ${e.message}`);
    }
    if (stat.isSymbolicLink()) {
      fail(`${label} path component ${component} is a symlink or junction; write roots and their ancestors must be real directories`);
    }
    if (!stat.isDirectory()) {
      fail(`${label} path component ${component} is not a directory`);
    }
  }

  try {
    return fs.realpathSync(absolute);
  } catch (e) {
    fail(`cannot resolve ${label} ${absolute}: ${e.message}`);
  }
}

function validateWriteRoots(specDir, contentDir) {
  const resolvedSpecDir = resolvedWriteRoot(specDir, 'specDir');
  const resolvedContentDir = resolvedWriteRoot(contentDir, 'contentDir');
  if (path.relative(resolvedSpecDir, resolvedContentDir) !== 'content') {
    fail(`contentDir ${path.resolve(contentDir)} must resolve to the expected child ${path.join(resolvedSpecDir, 'content')} of specDir ${resolvedSpecDir}`);
  }
}

export function writeBuildOutputs(specDir, contentDir, { bufs, readmeBufs }, options = {}) {
  const resolvedSpecDir = path.resolve(specDir);
  const resolvedContentDir = path.resolve(contentDir);
  validateWriteRoots(resolvedSpecDir, resolvedContentDir);
  const writeOptions = {
    ...options, reclaimedOwners: options.reclaimedOwners || [], resumeCurrentOwner: true,
  };
  const owner = writeOptions.lockHeld
    ? writeOptions.owner || null
    : acquireTransactionLock(resolvedSpecDir, writeOptions);
  const { renameSync = fs.renameSync, unlinkSync = fs.unlinkSync } = writeOptions;
  const writeSync = writeOptions.writeSync || fs.writeSync;
  const guard = transactionLockGuard(resolvedSpecDir, owner, { ...writeOptions, writeSync });
  const ownershipGuard = transactionLockOwnershipGuard(resolvedSpecDir, owner, {
    ...writeOptions, writeSync,
  });
  let state = null;
  let firstJournalPublished = false;
  let retainLockForRecovery = false;
  const temporaryPaths = [];
  try {
    recoverBuildOutputTransactionLocked(resolvedSpecDir, resolvedContentDir, {
      ...writeOptions, owner, writeSync,
      expectedOutputBytes: transactionOutputBytes(bufs, readmeBufs),
    });

    const dataFor = (index) => {
      const { root, name } = TRANSACTION_OUTPUTS[index];
      return Buffer.from(root === 'spec' ? bufs[LANGS.find((lang) => OUT_FILES[lang] === name)]
        : readmeBufs[LANGS.find((lang) => README_FILES[lang] === name)]);
    };
    state = {
      format: TRANSACTION_FORMAT,
      version: TRANSACTION_VERSION,
      nonce: owner.nonce,
      durability: directorySyncSupport(),
      phase: 'prepared',
      backupIndex: 0,
      installIndex: 0,
      cleanupIndex: 0,
      rollbackIndex: 0,
      outputs: TRANSACTION_OUTPUTS.map(({ root, name }, index) => {
        const destination = root === 'spec' ? path.join(resolvedSpecDir, name) : path.join(resolvedContentDir, name);
        const existed = assertRegularDestination(destination);
        const old = existed ? readRegularBytes(destination, 'original output') : null;
        const data = dataFor(index);
        return {
          root, name, existed,
          oldLength: old === null ? null : old.length,
          oldSha256: old === null ? null : hashBytes(old),
          newLength: data.length,
          newSha256: hashBytes(data),
        };
      }),
    };
    validateJournalState(state, resolvedSpecDir, resolvedContentDir);

    // Every temporary is created with an exact nonce-derived name and is
    // fsynced before the first journal snapshot becomes publishable.
    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      ensureAbsent(paths.temp, 'transaction temporary');
      guard();
      const fd = fs.openSync(paths.temp, 'wx', 0o600);
      temporaryPaths.push(paths.temp);
      try {
        const data = dataFor(index);
        writeAllSync(fd, data, writeSync);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      verifyNew(state.outputs[index], readRegularBytes(paths.temp, 'transaction temporary'), 'transaction temporary');
    }
    if (process.env.KTAV_BUILD_SPEC_CRASH_BEFORE_FIRST_JOURNAL === '1' ||
        process.env.KTAV_BUILD_SPEC_CRASH_BEFORE_JOURNAL === '1' ||
        process.env.KTAV_BUILD_SPEC_CRASH_POINT === 'before-first-journal') {
      process.kill(process.pid, 'SIGKILL');
    }
    writeJournalSnapshot(resolvedSpecDir, state, false, writeSync, guard);
    firstJournalPublished = true;
    cleanReclaimedOwnerMarkers(resolvedSpecDir, writeOptions);

    state.phase = 'backing-up';
    writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const item = state.outputs[index];
      if (!item.existed) continue;
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      validateWriteRoots(resolvedSpecDir, resolvedContentDir);
      verifyOld(item, readRegularBytes(paths.destination, 'original output'), 'original output');
      ensureAbsent(paths.backup, 'transaction backup');
      guard();
      renameSync(paths.destination, paths.backup);
      verifyOld(item, readRegularBytes(paths.backup, 'transaction backup'), 'transaction backup');
      if (readRegularBytes(paths.destination, 'transaction destination') !== null) {
        fail(`backup left a destination behind at ${paths.destination}; ambiguous data was left untouched`);
      }
      if (process.env.KTAV_BUILD_SPEC_CRASH_AFTER_RENAME === `backup:${index}`) process.kill(process.pid, 'SIGKILL');
      syncDirectory(path.dirname(paths.destination));
      state.backupIndex++;
      writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    }

    state.phase = 'installing';
    writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const item = state.outputs[index];
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      validateWriteRoots(resolvedSpecDir, resolvedContentDir);
      verifyNew(item, readRegularBytes(paths.temp, 'transaction temporary'), 'transaction temporary');
      ensureAbsent(paths.destination, 'transaction destination');
      guard();
      renameSync(paths.temp, paths.destination);
      verifyNew(item, readRegularBytes(paths.destination, 'installed transaction output'), 'installed transaction output');
      if (process.env.KTAV_BUILD_SPEC_CRASH_AFTER_RENAME === `install:${index}`) process.kill(process.pid, 'SIGKILL');
      syncDirectory(path.dirname(paths.destination));
      state.installIndex++;
      writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    }

    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      verifyNew(state.outputs[index], readRegularBytes(paths.destination, 'installed transaction output'), 'installed transaction output');
      if (readRegularBytes(paths.temp, 'transaction temporary') !== null) {
        fail(`temporary remained after install at ${paths.temp}; ambiguous data was left untouched`);
      }
    }
    syncOutputDirectories(resolvedSpecDir, resolvedContentDir);
    // This is the durable direction switch. No pre-commit recovery may keep
    // new bytes after this snapshot is published.
    state.phase = 'committed';
    writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);

    state.phase = 'cleaning';
    writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
    const cleanupErrors = [];
    let cleanupBlocked = false;
    for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
      const paths = outputPaths(resolvedSpecDir, resolvedContentDir, state, index);
      try {
        const backup = readRegularBytes(paths.backup, 'transaction backup');
        if (backup !== null) {
          verifyOld(state.outputs[index], backup, 'transaction backup');
          validateWriteRoots(resolvedSpecDir, resolvedContentDir);
          guard();
          unlinkSync(paths.backup);
          if (readRegularBytes(paths.backup, 'transaction backup') !== null) {
            fail(`backup remained after cleanup at ${paths.backup}`);
          }
        }
        syncOutputDirectories(resolvedSpecDir, resolvedContentDir);
        if (!cleanupBlocked) {
          state.cleanupIndex = index + 1;
          writeJournalSnapshot(resolvedSpecDir, state, true, writeSync, guard);
        }
      } catch (error) {
        cleanupBlocked = true;
        cleanupErrors.push(`${paths.backup}: ${error.message}`);
      }
    }
    if (cleanupErrors.length) {
      const cleanupError = new Error(`outputs committed; backup cleanup failed: ${cleanupErrors.join('; ')}`);
      cleanupError.code = 'KTAV_BACKUP_CLEANUP_FAILED';
      throw cleanupError;
    }
    guard();
    removeJournal(transactionJournalPath(resolvedSpecDir), resolvedSpecDir);
  } catch (error) {
    let journalPublished = firstJournalPublished;
    if (!journalPublished) {
      try {
        journalPublished = lstatRegularOrMissing(
          transactionJournalPath(resolvedSpecDir), 'transaction journal') !== null;
      } catch { /* preserve the original error */ }
    }
    if (!journalPublished) {
      const cleaned = cleanupPreJournalArtifacts(
        resolvedSpecDir, temporaryPaths, writeOptions, ownershipGuard);
      if (!cleaned && state !== null) {
        try {
          // If private staging could not be removed, publish its exact derived
          // names so the normal rollback/recovery path can dispose of it.
          writeJournalSnapshot(resolvedSpecDir, state, false, writeSync, guard,
            writeOptions.unlinkSync || fs.unlinkSync);
          journalPublished = true;
        } catch {
          // Keep the owner lock when both cleanup and journal publication fail.
          // Its nonce is the exact provenance for a same-process retry and a
          // later dead-owner reclaim.
          retainLockForRecovery = true;
          rememberOwnerRecovery(resolvedSpecDir, owner);
          cleanupPreJournalArtifacts(
            resolvedSpecDir, temporaryPaths, writeOptions, ownershipGuard);
        }
      }
      if (!journalPublished) throw error;
    }
    if (state === null) throw error;
    if (state.phase === 'committed' || state.phase === 'cleaning') throw error;
    const rollbackErrors = [];
    try {
      const journalExists = lstatRegularOrMissing(transactionJournalPath(resolvedSpecDir), 'transaction journal') !== null;
      beginRollback(resolvedSpecDir, resolvedContentDir, state, journalExists, writeSync, guard);
      rollbackErrors.push(...rollbackTransaction(
        resolvedSpecDir, resolvedContentDir, state, writeSync, guard,
        writeOptions.unlinkSync || fs.unlinkSync));
      if (rollbackErrors.length === 0) {
        guard();
        removeJournal(transactionJournalPath(resolvedSpecDir), resolvedSpecDir);
      }
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError.message);
    }
    const detail = rollbackErrors.length ? `; rollback failed: ${rollbackErrors.join('; ')}` : '';
    const transactionError = new Error(`build output transaction failed: ${error.message}${detail}`, { cause: error });
    transactionError.code = error.code;
    throw transactionError;
  } finally {
    if (owner !== null && !retainLockForRecovery) {
      releaseTransactionLock(resolvedSpecDir, owner, writeOptions);
    }
  }
}

function readCheckTarget(destination, fileName, lang, expectedLength) {
  let stat;
  try {
    stat = fs.lstatSync(destination);
  } catch (e) {
    if (e.code === 'ENOENT') {
      fail(
        `build_spec --check: MISMATCH in ${fileName} (${lang}): ` +
        `output file missing at ${destination}; expected ${expectedLength} bytes`);
    }
    fail(`build_spec --check: cannot inspect comparison target ${destination}: ${e.message}`);
  }
  if (!stat.isFile()) {
    const kind = stat.isSymbolicLink() ? 'symlink' : 'special file';
    fail(
      `build_spec --check: cannot compare ${fileName} (${lang}): ` +
      `output comparison target ${destination} is not a regular file ` +
      `(${kind}; --check refuses to follow it)`);
  }
  try {
    return fs.readFileSync(destination);
  } catch (e) {
    fail(`build_spec --check: cannot read comparison target ${destination}: ${e.message}`);
  }
}

export function checkBuildOutputs(specDir, contentDir,
                                  { bufs, totalLen, pieces, readmeBufs }) {
  validateWriteRoots(specDir, contentDir);

  for (const lang of LANGS) {
    const outPath = path.join(specDir, OUT_FILES[lang]);
    const existing = readCheckTarget(outPath, OUT_FILES[lang], lang, totalLen[lang]);
    const diff = firstByteDiff(existing, bufs[lang]);
    if (diff !== -1) {
      const unit = unitForLine(pieces, lang, diff);
      fail(formatMismatchDiagnostic(
        OUT_FILES[lang], lang, existing, bufs[lang], diff, unit));
    }
  }

  for (const lang of LANGS) {
    const outPath = path.join(contentDir, README_FILES[lang]);
    const existing = readCheckTarget(
      outPath, README_FILES[lang], lang, readmeBufs[lang].length);
    const diff = firstByteDiff(existing, readmeBufs[lang]);
    if (diff !== -1) {
      fail(formatMismatchDiagnostic(
        README_FILES[lang], lang, existing, readmeBufs[lang], diff,
        README_SOURCE_FILE));
    }
  }
}

export function firstByteDiff(existing, expected) {
  const min = Math.min(existing.length, expected.length);
  let diff = 0;
  while (diff < min && existing[diff] === expected[diff]) diff++;
  return diff < min || existing.length !== expected.length ? diff : -1;
}

export function lineNumberAtByte(buf, offset) {
  const end = Math.min(Math.max(offset, 0), buf.length);
  let line = 1;
  for (let i = 0; i < end; i++) {
    if (buf[i] === 0x0a) line++;
  }
  return line;
}

export function lineAtByte(buf, offset) {
  const at = Math.min(Math.max(offset, 0), buf.length);
  const start = at === 0 ? 0 : buf.lastIndexOf(0x0a, at - 1) + 1;
  let end = buf.indexOf(0x0a, at);
  if (end === -1) end = buf.length;
  let line = buf.slice(start, end).toString('utf8');
  if (line.length > 160) line = line.slice(0, 160) + '…';
  return JSON.stringify(line);
}

export function formatMismatchDiagnostic(fileName, lang, existing, generated, diff, unit) {
  const lineBuf = diff < generated.length ? generated : existing;
  const lineNo = lineNumberAtByte(lineBuf, diff);
  const tail = diff >= generated.length
    ? ' (generated output is shorter; no byte here)'
    : diff >= existing.length
      ? ' (existing file is shorter; no byte here)'
      : '';
  return (
    `build_spec --check: MISMATCH in ${fileName} (${lang}) at byte offset ${diff}` +
    `${tail}, line ${lineNo}, unit "${unit}":\n` +
    `  generated: ${diff < generated.length ? lineAtByte(generated, diff) : '(no line)'}\n` +
    `  existing:  ${diff < existing.length ? lineAtByte(existing, diff) : '(no line)'}\n`
  );
}

function unitForLine(pieces, lang, offset) {
  for (const p of pieces[lang]) {
    if (offset >= p.start && offset < p.end) return p.unit;
  }
  return pieces[lang].length ? pieces[lang][pieces[lang].length - 1].unit : '?';
}

export { readCheckTarget, resolvedWriteRoot, unitForLine, validateWriteRoots };
