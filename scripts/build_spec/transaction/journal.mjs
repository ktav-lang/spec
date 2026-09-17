import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { fail, utf8Strict } from '../units/decode.mjs';
import { LANGS, OUT_FILES, README_FILES } from '../shared.mjs';
import {
  lockCandidatePath,
  lockClaimEqual,
  lockIdentityEqual,
  lockIncarnationForOwner,
  lockLeasePath,
  lockOwnerPath,
  processStartIncarnation,
  readLock,
  readLockClaim,
} from './lock.mjs';

const TRANSACTION_JOURNAL_FILE = '.build-spec.transaction.json';
const TRANSACTION_JOURNAL_TMP_FILE = '.build-spec.transaction.json.tmp';
const TRANSACTION_LOCK_FILE = '.build-spec.transaction.lock';
const TRANSACTION_LOCK_CANDIDATE_PREFIX = `${TRANSACTION_LOCK_FILE}.candidate.`;
const TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE = `${TRANSACTION_LOCK_FILE}.candidate`;
const TRANSACTION_LOCK_OWNER_PREFIX = `${TRANSACTION_LOCK_FILE}.owner.`;
const TRANSACTION_LOCK_CLAIM_PREFIX = `${TRANSACTION_LOCK_FILE}.claim.`;
const TRANSACTION_LOCK_LEASE_PREFIX = `${TRANSACTION_LOCK_FILE}.lease.`;
const TRANSACTION_LOCK_RELEASE_PREFIX = `${TRANSACTION_LOCK_FILE}.release.`;
const TRANSACTION_LOCK_QUARANTINE_PREFIX = `${TRANSACTION_LOCK_FILE}.quarantine.`;
const TRANSACTION_FORMAT = 'ktav-build-output-transaction';
const TRANSACTION_LOCK_FORMAT = 'ktav-build-output-lock';
const TRANSACTION_LOCK_CLAIM_FORMAT = 'ktav-build-output-lock-claim';
const TRANSACTION_VERSION = 2;
const TRANSACTION_LOCK_VERSION = 3;
const TRANSACTION_LOCK_CLAIM_VERSION = 1;
const TRANSACTION_LOCK_LEASE_MS = 60_000;
const TRANSACTION_NONCE_RE = /^[0-9a-f]{32}$/u;
const TRANSACTION_LOCK_UNVERIFIED_INCARNATION = '00000000000000000000000000000000';
const TRANSACTION_DIGEST_RE = /^[0-9a-f]{64}$/u;
const RECOVERABLE_OWNER_KEYS = new Set();
const RECOVERABLE_ARTIFACTS = new Map();
const TRANSACTION_OUTPUTS = LANGS.flatMap((lang) => [
  { root: 'spec', name: OUT_FILES[lang] },
  { root: 'content', name: README_FILES[lang] },
]);
const TRANSACTION_OUTPUT_NAMES = new Set(TRANSACTION_OUTPUTS.map(({ name }) => name));
const TRANSACTION_STATE_KEYS = [
  'format', 'version', 'nonce', 'durability', 'phase',
  'backupIndex', 'installIndex', 'cleanupIndex', 'rollbackIndex', 'outputs',
];
const TRANSACTION_OUTPUT_KEYS = [
  'root', 'name', 'existed', 'oldLength', 'oldSha256', 'newLength', 'newSha256',
];
const TRANSACTION_LOCK_KEYS = ['format', 'version', 'pid', 'incarnation', 'nonce', 'leaseUntil'];
const TRANSACTION_LOCK_CLAIM_KEYS = [
  'format', 'version', 'pid', 'incarnation', 'nonce', 'createdAt', 'target',
];
// A missing OS start-time source is explicitly recorded as unverified. It is
// never treated as a reusable incarnation while the PID is live.
const PROCESS_INCARNATION = processStartIncarnation(process.pid);

function transactionJournalPath(specDir) {
  return path.join(specDir, TRANSACTION_JOURNAL_FILE);
}

function transactionLockPath(specDir) {
  return path.join(specDir, TRANSACTION_LOCK_FILE);
}

function transactionJournalTmpPath(specDir) {
  return path.join(specDir, TRANSACTION_JOURNAL_TMP_FILE);
}

function transactionArtifactName(name) {
  if (name === TRANSACTION_JOURNAL_FILE || name === TRANSACTION_JOURNAL_TMP_FILE) return true;
  return [...TRANSACTION_OUTPUT_NAMES].some((output) => {
    const escaped = output.replaceAll('.', '\\.');
    return new RegExp(`^\\.${escaped}\\.[0-9a-f]{32}(?:\\.[0-9a-f]{64})?\\.(?:tmp|bak)$`).test(name);
  });
}

function transactionArtifactPaths(specDir, contentDir) {
  const result = [];
  for (const directory of [specDir, contentDir]) {
    let entries;
    try { entries = fs.readdirSync(directory); } catch { continue; }
    for (const name of entries) {
      if (transactionArtifactName(name)) result.push(path.join(directory, name));
    }
  }
  return result;
}

function transactionOutputArtifactInfo(specDir, contentDir, filePath) {
  const directory = path.dirname(filePath);
  const name = path.basename(filePath);
  for (let index = 0; index < TRANSACTION_OUTPUTS.length; index++) {
    const output = TRANSACTION_OUTPUTS[index];
    const expectedDir = output.root === 'spec' ? specDir : contentDir;
    if (directory !== expectedDir) continue;
    const match = new RegExp(`^\\.${output.name.replaceAll('.', '\\.')}` +
      `\\.([0-9a-f]{32})(?:\\.([0-9a-f]{64}))?\\.(tmp|bak)$`, 'u').exec(name);
    if (match !== null) {
      return { index, nonce: match[1], digest: match[2] || null, kind: match[3] };
    }
  }
  return null;
}

function pendingTransactionPaths(specDir, contentDir) {
  const result = [];
  for (const directory of [specDir, contentDir]) {
    let entries;
    try { entries = fs.readdirSync(directory); } catch { continue; }
    for (const name of entries) {
      if (name === TRANSACTION_LOCK_FILE ||
          name === TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE ||
          name === `${TRANSACTION_LOCK_FILE}.claim` ||
          name === `${TRANSACTION_LOCK_FILE}.lease` ||
          name.startsWith(TRANSACTION_LOCK_CANDIDATE_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_OWNER_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_CLAIM_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_LEASE_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_RELEASE_PREFIX) ||
          name.startsWith(TRANSACTION_LOCK_QUARANTINE_PREFIX) || transactionArtifactName(name)) {
        result.push(path.join(directory, name));
      }
    }
  }
  return result;
}

function hashBytes(data) {
  return createHash('sha256').update(data).digest('hex');
}

function lstatRegularOrMissing(filePath, label) {
  let stat;
  try { stat = fs.lstatSync(filePath); } catch (e) {
    if (e.code === 'ENOENT') return null;
    fail(`cannot inspect ${label} ${filePath}: ${e.message}`);
  }
  if (!stat.isFile()) {
    const kind = stat.isSymbolicLink() ? 'symlink' : 'special file';
    fail(`cannot use ${label} ${filePath}: it is not a regular file (${kind})`);
  }
  return stat;
}

function readRegularBytes(filePath, label) {
  if (lstatRegularOrMissing(filePath, label) === null) return null;
  try { return fs.readFileSync(filePath); } catch (e) {
    fail(`cannot read ${label} ${filePath}: ${e.message}`);
  }
}

function directorySyncSupport() {
  return process.platform === 'win32' ? 'file-only-platform-limited' : 'directory-fsync';
}

function syncDirectory(directory) {
  let fd;
  try {
    fd = fs.openSync(directory, 'r');
    fs.fsyncSync(fd);
    return true;
  } catch (e) {
    if (process.platform === 'win32' && ['EBADF', 'EISDIR', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(e.code)) return false;
    if (['EISDIR', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(e.code)) {
      throw new Error(`directory fsync is unavailable for ${directory}; refusing to claim durable transaction ordering`, { cause: e });
    }
    throw e;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function syncOutputDirectories(specDir, contentDir) {
  const syncedSpec = syncDirectory(specDir);
  const syncedContent = syncDirectory(contentDir);
  if ((!syncedSpec || !syncedContent) && process.platform !== 'win32') {
    fail('directory fsync is unavailable; refusing to claim durable transaction ordering');
  }
}

function writeAllSync(fd, data, writeSync = fs.writeSync) {
  let offset = 0;
  while (offset < data.length) {
    const written = writeSync(fd, data, offset, data.length - offset);
    if (!Number.isSafeInteger(written) || written <= 0) {
      fail(`synchronous write made zero progress at byte offset ${offset}`);
    }
    if (written > data.length - offset) {
      fail(`synchronous write exceeded the requested length at byte offset ${offset}`);
    }
    offset += written;
  }
}

function removeExactRegular(filePath, label, syncDir = null, unlinkSync = fs.unlinkSync) {
  if (lstatRegularOrMissing(filePath, label) === null) return false;
  unlinkSync(filePath);
  if (syncDir !== null) syncDirectory(syncDir);
  return true;
}

// Metadata files are private until their final record is published. Cleanup
// after a failed write must not depend on another fsync succeeding, otherwise
// the failed publication can poison the next acquisition attempt.
function removePrivateRegularBestEffort(filePath, unlinkSync = fs.unlinkSync) {
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isFile()) unlinkSync(filePath);
    return true;
  } catch {
    // Preserve the original metadata-write error. A non-regular replacement
    // is left untouched rather than being treated as our private temporary.
    return false;
  }
}

function removeOwnedLockRecordBestEffort(filePath, owner, claim = false,
                                        unlinkSync = fs.unlinkSync) {
  try {
    if (lstatRegularOrMissing(filePath, 'transaction lock artifact') === null) return true;
    const value = claim ? readLockClaim(filePath, 'transaction lock artifact')
      : readLock(filePath, 'transaction lock artifact');
    const owned = claim ? lockClaimEqual(value, owner) : lockIdentityEqual(value, owner);
    return !owned || removePrivateRegularBestEffort(filePath, unlinkSync);
  } catch {
    // Never remove an artifact whose ownership cannot be established.
    return false;
  }
}

function ownerRecoveryKey(specDir, owner) {
  return `${path.resolve(specDir)}:${owner.pid}:${owner.incarnation}:${owner.nonce}`;
}

function rememberOwnerRecovery(specDir, owner) {
  RECOVERABLE_OWNER_KEYS.add(ownerRecoveryKey(specDir, owner));
}

function forgetOwnerRecovery(specDir, owner) {
  RECOVERABLE_OWNER_KEYS.delete(ownerRecoveryKey(specDir, owner));
}

function ownerRecoveryPending(specDir, owner) {
  return RECOVERABLE_OWNER_KEYS.has(ownerRecoveryKey(specDir, owner));
}

function rememberRecoverableArtifact(filePath, owner) {
  RECOVERABLE_ARTIFACTS.set(path.resolve(filePath), {
    pid: owner.pid, incarnation: owner.incarnation, nonce: owner.nonce,
  });
}

function forgetRecoverableArtifact(filePath) {
  RECOVERABLE_ARTIFACTS.delete(path.resolve(filePath));
}

function recoverableArtifactPending(filePath) {
  return RECOVERABLE_ARTIFACTS.has(path.resolve(filePath));
}

function recoverableArtifactBelongsToCurrentProcess(filePath, options) {
  const owner = RECOVERABLE_ARTIFACTS.get(path.resolve(filePath));
  return owner !== undefined && owner.pid === process.pid &&
    owner.incarnation === lockIncarnationForOwner(options, process.pid);
}

function cleanRecoverableMetadata(specDir, options) {
  for (const [filePath, identity] of RECOVERABLE_ARTIFACTS) {
    if (path.dirname(filePath) !== path.resolve(specDir) ||
        identity.pid !== process.pid ||
        identity.incarnation !== lockIncarnationForOwner(options, process.pid)) continue;
    const name = path.basename(filePath);
    if (!name.includes(`${TRANSACTION_LOCK_FILE}.candidate.`) &&
        !name.includes(`${TRANSACTION_LOCK_FILE}.owner.`) &&
        !name.includes(`${TRANSACTION_LOCK_FILE}.claim.`) &&
        !name.includes(`${TRANSACTION_LOCK_FILE}.lease.`)) continue;
    try {
      const value = name.includes(`${TRANSACTION_LOCK_FILE}.claim.`)
        ? readLockClaim(filePath, 'resumable transaction lock claim')
        : readLock(filePath, 'resumable transaction lock artifact');
      if (value.pid !== identity.pid || value.incarnation !== identity.incarnation ||
          value.nonce !== identity.nonce) continue;
      removeExactRegular(filePath, 'resumable transaction lock artifact', specDir,
        options.unlinkSync || fs.unlinkSync);
      forgetRecoverableArtifact(filePath);
    } catch {
      // Leave a changed or unreadable replacement untouched.
    }
  }
}

function cleanupFailedLockOwnerArtifacts(specDir, owner, options = {}) {
  const unlinkSync = options.unlinkSync || fs.unlinkSync;
  for (const filePath of [
    lockCandidatePath(specDir, owner),
    lockOwnerPath(specDir, owner),
    lockLeasePath(specDir, owner),
    transactionLockPath(specDir),
  ]) {
    if (recoverableArtifactPending(filePath)) continue;
    if (!removeOwnedLockRecordBestEffort(filePath, owner, false, unlinkSync)) {
      rememberOwnerRecovery(specDir, owner);
    }
  }
}

function removeJournal(journalPath, specDir) {
  removeExactRegular(journalPath, 'transaction journal', specDir);
  syncDirectory(specDir);
}

function journalStateJson(state) {
  return JSON.stringify(state) + '\n';
}

function writeJournalSnapshot(specDir, state, journalExists, writeSync = fs.writeSync,
                              guard = null, unlinkSync = fs.unlinkSync) {
  const journalPath = transactionJournalPath(specDir);
  const tmpPath = transactionJournalTmpPath(specDir);
  if (guard !== null) guard();
  // A tmp file is never published. It is safe to replace only after lstat has
  // proved that it is a regular file under the already validated root.
  removeExactRegular(tmpPath, 'unpublished transaction journal temporary', specDir, unlinkSync);
  const fd = fs.openSync(tmpPath, 'wx', 0o600);
  try {
    const data = Buffer.from(journalStateJson(state), 'utf8');
    writeAllSync(fd, data, writeSync);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const written = readRegularBytes(tmpPath, 'unpublished transaction journal temporary');
  if (Buffer.compare(written, Buffer.from(journalStateJson(state), 'utf8')) !== 0) {
    fail('transaction journal temporary was not written completely; ambiguous data was left untouched');
  }
  fs.renameSync(tmpPath, journalPath);
  syncDirectory(specDir);
  if (!journalExists) lstatRegularOrMissing(journalPath, 'transaction journal');
}

function exactObjectKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && Object.keys(value).every((key, i) => key === keys[i]);
}

function validDigest(value) {
  return typeof value === 'string' && TRANSACTION_DIGEST_RE.test(value);
}

function validateJournalState(state, specDir, contentDir) {
  if (!exactObjectKeys(state, TRANSACTION_STATE_KEYS) ||
      state.format !== TRANSACTION_FORMAT || state.version !== TRANSACTION_VERSION ||
      !TRANSACTION_NONCE_RE.test(state.nonce) ||
      (state.durability !== 'directory-fsync' && state.durability !== 'file-only-platform-limited') ||
      !['prepared', 'backing-up', 'installing', 'committed', 'cleaning', 'rollback'].includes(state.phase) ||
      !Number.isSafeInteger(state.backupIndex) || !Number.isSafeInteger(state.installIndex) ||
      !Number.isSafeInteger(state.cleanupIndex) || !Number.isSafeInteger(state.rollbackIndex) ||
      !Array.isArray(state.outputs) || state.outputs.length !== TRANSACTION_OUTPUTS.length) {
    fail('transaction journal has an invalid schema; ambiguous data was left untouched');
  }
  const existingCount = TRANSACTION_OUTPUTS.filter(({ root, name }) => {
    const item = state.outputs.find((output) => output.root === root && output.name === name);
    return item?.existed === true;
  }).length;
  for (let i = 0; i < state.outputs.length; i++) {
    const item = state.outputs[i];
    const expected = TRANSACTION_OUTPUTS[i];
    if (!exactObjectKeys(item, TRANSACTION_OUTPUT_KEYS) || item.root !== expected.root ||
        item.name !== expected.name || typeof item.existed !== 'boolean' ||
        !Number.isSafeInteger(item.newLength) || item.newLength < 0 || !validDigest(item.newSha256) ||
        (item.existed
          ? (!Number.isSafeInteger(item.oldLength) || item.oldLength < 0 || !validDigest(item.oldSha256))
          : (item.oldLength !== null || item.oldSha256 !== null))) {
      fail('transaction journal has invalid or duplicate output records; ambiguous data was left untouched');
    }
  }
  const inRange = (n, max) => n >= 0 && n <= max;
  if (!inRange(state.backupIndex, existingCount) || !inRange(state.installIndex, 6) ||
      !inRange(state.cleanupIndex, 6) || !inRange(state.rollbackIndex, 6)) {
    fail('transaction journal has invalid phase indexes; ambiguous data was left untouched');
  }
  if (state.phase === 'prepared' &&
      (state.backupIndex !== 0 || state.installIndex !== 0 || state.cleanupIndex !== 0 || state.rollbackIndex !== 0)) {
    fail('transaction journal has invalid prepared ordering; ambiguous data was left untouched');
  }
  if (state.phase === 'backing-up' && (state.installIndex !== 0 || state.cleanupIndex !== 0 || state.rollbackIndex !== 0)) {
    fail('transaction journal has invalid backup ordering; ambiguous data was left untouched');
  }
  if (state.phase === 'installing' && (state.backupIndex !== existingCount || state.cleanupIndex !== 0 || state.rollbackIndex !== 0)) {
    fail('transaction journal has invalid install ordering; ambiguous data was left untouched');
  }
  if ((state.phase === 'committed' || state.phase === 'cleaning') &&
      (state.backupIndex !== existingCount || state.installIndex !== 6 || state.rollbackIndex !== 0)) {
    fail('transaction journal has invalid commit ordering; ambiguous data was left untouched');
  }
  if (state.phase === 'rollback' && state.rollbackIndex > 6) {
    fail('transaction journal has invalid rollback ordering; ambiguous data was left untouched');
  }
  // The journal contains no paths. These derived paths are checked here so a
  // later operation cannot accidentally acquire a path from untrusted data.
  for (let i = 0; i < TRANSACTION_OUTPUTS.length; i++) {
    const { root, name } = TRANSACTION_OUTPUTS[i];
    const directory = root === 'spec' ? specDir : contentDir;
    for (const suffix of ['tmp', 'bak']) {
      const candidateName = suffix === 'tmp'
        ? `.${name}.${state.nonce}.${state.outputs[i].newSha256}.tmp`
        : `.${name}.${state.nonce}.bak`;
      const candidate = path.join(directory, candidateName);
      if (path.dirname(candidate) !== directory || path.basename(candidate) !== candidateName) {
        fail('transaction journal derived an unexpected artifact path; ambiguous data was left untouched');
      }
    }
  }
}

function readTransactionJournal(specDir, contentDir) {
  const journalPath = transactionJournalPath(specDir);
  let source;
  try {
    lstatRegularOrMissing(journalPath, 'transaction journal');
    source = fs.readFileSync(journalPath);
  } catch (e) {
    fail(`cannot read transaction journal: ${e.message}; ambiguous data was left untouched`);
  }
  let state;
  try { state = JSON.parse(utf8Strict.decode(source)); } catch (e) {
    fail(`transaction journal is corrupt: ${e.message}; ambiguous data was left untouched`);
  }
  if (Buffer.compare(source, Buffer.from(journalStateJson(state), 'utf8')) !== 0) {
    fail('transaction journal is not a canonical complete snapshot; ambiguous data was left untouched');
  }
  validateJournalState(state, specDir, contentDir);
  return state;
}

function outputPaths(specDir, contentDir, state, index) {
  const { root, name } = TRANSACTION_OUTPUTS[index];
  const directory = root === 'spec' ? specDir : contentDir;
  return {
    destination: path.join(directory, name),
    temp: path.join(directory, `.${name}.${state.nonce}.${state.outputs[index].newSha256}.tmp`),
    backup: path.join(directory, `.${name}.${state.nonce}.bak`),
  };
}

function transactionOutputBytes(bufs, readmeBufs) {
  return TRANSACTION_OUTPUTS.map(({ root, name }) => Buffer.from(
    root === 'spec'
      ? bufs[LANGS.find((lang) => OUT_FILES[lang] === name)]
      : readmeBufs[LANGS.find((lang) => README_FILES[lang] === name)]));
}

function assertDigest(data, length, digest, label) {
  if (data === null || data.length !== length || hashBytes(data) !== digest) {
    fail(`${label} has an unexpected length or digest; ambiguous data was left untouched`);
  }
}

function ensureAbsent(filePath, label) {
  const stat = lstatRegularOrMissing(filePath, label);
  if (stat !== null) fail(`${label} ${filePath} already exists; ambiguous data was left untouched`);
}

function verifyNew(item, bytes, label) {
  assertDigest(bytes, item.newLength, item.newSha256, label);
}

function verifyOld(item, bytes, label) {
  if (!item.existed) fail(`${label} exists although the original was missing; ambiguous data was left untouched`);
  assertDigest(bytes, item.oldLength, item.oldSha256, label);
}

function cleanJournalTmpIfSafe(specDir, unlinkSync = fs.unlinkSync) {
  const tmp = transactionJournalTmpPath(specDir);
  removeExactRegular(tmp, 'unpublished transaction journal temporary', specDir, unlinkSync);
}


export { PROCESS_INCARNATION, RECOVERABLE_ARTIFACTS, RECOVERABLE_OWNER_KEYS, TRANSACTION_DIGEST_RE, TRANSACTION_FORMAT, TRANSACTION_JOURNAL_FILE, TRANSACTION_JOURNAL_TMP_FILE, TRANSACTION_LOCK_CANDIDATE_PREFIX, TRANSACTION_LOCK_CLAIM_FORMAT, TRANSACTION_LOCK_CLAIM_KEYS, TRANSACTION_LOCK_CLAIM_PREFIX, TRANSACTION_LOCK_CLAIM_VERSION, TRANSACTION_LOCK_FILE, TRANSACTION_LOCK_FORMAT, TRANSACTION_LOCK_KEYS, TRANSACTION_LOCK_LEASE_MS, TRANSACTION_LOCK_LEASE_PREFIX, TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE, TRANSACTION_LOCK_OWNER_PREFIX, TRANSACTION_LOCK_QUARANTINE_PREFIX, TRANSACTION_LOCK_RELEASE_PREFIX, TRANSACTION_LOCK_UNVERIFIED_INCARNATION, TRANSACTION_LOCK_VERSION, TRANSACTION_NONCE_RE, TRANSACTION_OUTPUTS, TRANSACTION_OUTPUT_KEYS, TRANSACTION_OUTPUT_NAMES, TRANSACTION_STATE_KEYS, TRANSACTION_VERSION, assertDigest, cleanJournalTmpIfSafe, cleanRecoverableMetadata, cleanupFailedLockOwnerArtifacts, directorySyncSupport, ensureAbsent, exactObjectKeys, forgetOwnerRecovery, forgetRecoverableArtifact, hashBytes, journalStateJson, lstatRegularOrMissing, outputPaths, ownerRecoveryKey, ownerRecoveryPending, pendingTransactionPaths, readRegularBytes, readTransactionJournal, recoverableArtifactBelongsToCurrentProcess, recoverableArtifactPending, rememberOwnerRecovery, rememberRecoverableArtifact, removeExactRegular, removeJournal, removeOwnedLockRecordBestEffort, removePrivateRegularBestEffort, syncDirectory, syncOutputDirectories, transactionArtifactName, transactionArtifactPaths, transactionJournalPath, transactionJournalTmpPath, transactionLockPath, transactionOutputArtifactInfo, transactionOutputBytes, validDigest, validateJournalState, verifyNew, verifyOld, writeAllSync, writeJournalSnapshot };
