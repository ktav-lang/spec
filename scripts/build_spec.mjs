#!/usr/bin/env node
// build_spec.mjs — assembles versions/0.8/spec{,.ru,.zh}.md from per-section
// content units in versions/0.8/content/ (manifest.js + unit dirs). Unit bodies
// come from body-1.js..body-N.js parts (N = meta.bodyParts), each holding
// { en, ru, zh } strings. No content file is ever executed: body-*.js is
// decoded by a raw-source scanner without running its code, and manifest.js /
// meta.js are decoded as strict UTF-8 and parsed as JSON, and must be
// byte-identical to the canonical serialization (`export default ` +
// JSON.stringify(value, null, 2) + one newline). release.js is the single
// release declaration (version + release date), read the same canonical way.
// Unit bodies may carry the plain tokens @@VERSION@@ / @@DATE@@; both are
// substituted with the release.js values at build time on the decoded text,
// and the build fails if a token survives into any of the three spec
// outputs. README.source.js is documentation, is never substituted, and may
// mention the tokens literally. The section-inventory
// lock's version must equal release.version.
// Node ESM, built-ins only. Usage:
//   node scripts/build_spec.mjs            write the three spec files and READMEs
//   node scripts/build_spec.mjs --check    verify outputs byte-identical, no writes
//   node scripts/build_spec.mjs -h|--help  usage
//
// Importable API (no build on import):
//   validateContentDir(contentDir)  -> async closed-world validation; throws Error
//   buildBuffers(contentDir)        -> async { bufs, totalLen, manifest, readmeBufs }
//   buildRootDocs(repoRoot)         -> Map(doc -> Map(lang -> Buffer))
//   validateMeta(unit, meta), LANGS, OUT_FILES, hasLoneSurrogate(str),
//   firstByteDiff(existing, expected), lineNumberAtByte(buf, offset),
//   lineAtByte(buf, offset), formatMismatchDiagnostic(...),
//   writeBuildOutputs(..., { renameSync, unlinkSync }), defaultSectionInventoryLockPath(contentDir)

//
// Implementation lives in ./build_spec/ — this entry keeps the CLI and
// re-exports the importable API.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { fail } from '@ktav-lang/polydoc';
import { LANGS, OUT_FILES, defaultSectionInventoryLockPath } from './build_spec/shared.mjs';
import { buildBuffers, readRelease } from './build_spec/content.mjs';
import { buildRootDocs, checkRootDocs, writeRootDocs } from './build_spec/root_docs.mjs';
import { pendingTransactionPaths } from '@ktav-lang/polydoc';
import { recoverBuildOutputTransaction } from '@ktav-lang/polydoc';
import {
  checkBuildOutputs,
  validateWriteRoots,
  writeBuildOutputs,
} from '@ktav-lang/polydoc';
import { checkHandwrittenVersionReferences, writeSectionInventoryLock } from './build_spec/drift.mjs';
import {
  checkDocsRegistry,
  defaultFrozenDocsLockPath,
  writeFrozenDocsLock,
} from './build_spec/registry.mjs';

export * from './build_spec/shared.mjs';
// units/decode.mjs, units/blocks.mjs, units/containers.mjs, transaction/*.mjs
// and outputs.mjs were pure `export {...} from '@ktav-lang/polydoc'` stubs —
// deleted; their exact export lists are re-exported directly here instead.
export {
  hasLoneSurrogate, validateMeta, decodeUtf8Strict, fail, failUnit,
  generatedHeadingLine, hasNumberedHeadingPrefix, rejectRawCarriageReturns,
  utf8Strict, validateBodyPart, validateGeneratedHeading,
} from '@ktav-lang/polydoc';
export {
  HTML_BLOCK_TAGS, advanceColumn, buildThematicBreakSuffix, canContinueParagraph,
  codePointWidth, columnAt, consumeBlockquoteMarker, consumeIndent,
  consumeListPadding, continueLinkReference, expandTabs, isAsciiControl,
  isAsciiDigit, isAsciiLetter, isAsciiPunctuation, isAttributeNameChar,
  isAttributeNameStart, isBlankLinkContinuation, isCompleteType7Tag,
  isEmptyListMarker, isFenceCloser, isSetextParagraphLine, isThematicBreak,
  isThematicBreakAt, isUnquotedAttributeValueChar, leadingColumns,
  parseAtxHeading, parseFenceOpener, parseHtmlBlockOpener, parseListMarker,
  parseSetextUnderline, scanLinkDestination, scanLinkLabel,
  scanLinkReferenceAfterLabel, scanLinkReferenceStart, scanLinkReferenceSuffix,
  scanLinkTitle, skipSpaceTabs, startsLinkTitle,
} from '@ktav-lang/polydoc';
export {
  findHeadings, cloneHeadingState, containerLabel, matchFenceContainer,
  newContainer, normalizeContainerLine, quoteChild, quoteChildren,
  resolveLinkDefinitionLine, restoreHeadingState, scanHeadings,
  sourceSliceAtExpandedPosition, validateBodySourceShape, validateUnitHeadings,
} from '@ktav-lang/polydoc';
export * from './build_spec/content.mjs';
export {
  PROCESS_INCARNATION, RECOVERABLE_ARTIFACTS, RECOVERABLE_OWNER_KEYS,
  TRANSACTION_DIGEST_RE, TRANSACTION_FORMAT, TRANSACTION_JOURNAL_FILE,
  TRANSACTION_JOURNAL_TMP_FILE, TRANSACTION_LOCK_CANDIDATE_PREFIX,
  TRANSACTION_LOCK_CLAIM_FORMAT, TRANSACTION_LOCK_CLAIM_KEYS,
  TRANSACTION_LOCK_CLAIM_PREFIX, TRANSACTION_LOCK_CLAIM_VERSION,
  TRANSACTION_LOCK_FILE, TRANSACTION_LOCK_FORMAT, TRANSACTION_LOCK_KEYS,
  TRANSACTION_LOCK_LEASE_MS, TRANSACTION_LOCK_LEASE_PREFIX,
  TRANSACTION_LOCK_LEGACY_CANDIDATE_FILE, TRANSACTION_LOCK_OWNER_PREFIX,
  TRANSACTION_LOCK_QUARANTINE_PREFIX, TRANSACTION_LOCK_RELEASE_PREFIX,
  TRANSACTION_LOCK_UNVERIFIED_INCARNATION, TRANSACTION_LOCK_VERSION,
  TRANSACTION_NONCE_RE, TRANSACTION_OUTPUT_KEYS, TRANSACTION_STATE_KEYS,
  TRANSACTION_VERSION, transactionOutputs, transactionOutputNames,
  assertDigest, cleanJournalTmpIfSafe, cleanRecoverableMetadata,
  cleanupFailedLockOwnerArtifacts, directorySyncSupport, ensureAbsent,
  exactObjectKeys, forgetOwnerRecovery, forgetRecoverableArtifact, hashBytes,
  journalStateJson, lstatRegularOrMissing, outputPaths, ownerRecoveryKey,
  ownerRecoveryPending, pendingTransactionPaths, readRegularBytes,
  readTransactionJournal, recoverableArtifactBelongsToCurrentProcess,
  recoverableArtifactPending, rememberOwnerRecovery, rememberRecoverableArtifact,
  removeExactRegular, removeJournal, removeOwnedLockRecordBestEffort,
  removePrivateRegularBestEffort, syncDirectory, syncOutputDirectories,
  transactionArtifactName, transactionArtifactPaths, transactionJournalPath,
  transactionJournalTmpPath, transactionLockPath, transactionOutputArtifactInfo,
  transactionOutputBytes, validDigest, validateJournalState, verifyNew,
  verifyOld, writeAllSync, writeJournalSnapshot,
} from '@ktav-lang/polydoc';
export {
  beginRollback, cleanReclaimedOwnerMarkers, cleanUnpublishedOutputTemps,
  cleanupPreJournalArtifacts, completeOne, recoverCommittedTransaction,
  rollbackOne, rollbackTransaction,
} from '@ktav-lang/polydoc';
export {
  TRANSACTION_LOCK_QUARANTINE_PHASES, captureExactBytes, captureExactLockClaim,
  captureExactLockRecord, captureExactRecord, captureReleaseOwnedArtifact,
  discardExactLockClaim, lockCandidatePath, lockCandidateTempPath,
  lockClaimEqual, lockClaimIsActive, lockClaimPathForTarget,
  lockClaimQuarantinePath, lockClaimTmpPath, lockIdentityEqual,
  lockIncarnationForOwner, lockIsActive, lockJson, lockLeasePath,
  lockLeaseTmpPath, lockNow, lockOwnerPath, lockReclaimerNonce,
  lockRecordQuarantinePath, lockReleasePath, observedProcessIncarnation,
  ownerIsCurrentProcess, pidIsLive, processStartIncarnation, publishLockClaim,
  quarantineDescriptor, quarantineRecordKindIsDerived, readLock, readLockClaim,
  readLockMetadataBytes, releaseQuarantineBelongsToOwner, rememberReclaimedOwner,
  removeExactOwnerArtifacts, removeReleaseOwnerArtifacts, restoreCapturedLock,
  windowsProcessStart, writeLockRecord,
} from '@ktav-lang/polydoc';
export {
  cleanExistingQuarantines, cleanExistingReleaseClaims, cleanLegacyArtifact,
  cleanLegacyFixedArtifacts, cleanMalformedLegacyQuarantine,
  cleanReleaseOwnerArtifacts, cleanStaleLockLeaseTemps, ownerHintFromCorruptSource,
  ownerHintIsLive, releaseArtifactEntriesForOwner, setClaimCreationTime,
} from '@ktav-lang/polydoc';
export {
  acquireTransactionLock, assertTransactionLockOwned, claimExactStaleFile,
  cleanExistingClaims, cleanStaleCandidateTemps, cleanStaleLockClaimTemps,
  lockArtifactEntries, publishLockCandidate, recoverBuildOutputTransaction,
  recoverBuildOutputTransactionLocked, releaseTransactionLock,
  removeCandidateIfOwned, transactionLockGuard, transactionLockOwnershipGuard,
  writeLockCandidate, writeLockLease,
} from '@ktav-lang/polydoc';
export {
  writeBuildOutputs, checkBuildOutputs, firstByteDiff, lineNumberAtByte,
  lineAtByte, formatMismatchDiagnostic, readCheckTarget, resolvedWriteRoot,
  unitForLine, validateWriteRoots,
} from '@ktav-lang/polydoc';
export * from './build_spec/root_docs.mjs';
export * from './build_spec/drift.mjs';
export * from './build_spec/registry.mjs';

function usage() {
  process.stdout.write(
    'Usage: node scripts/build_spec.mjs [--check | --write-section-lock | --write-frozen-lock | -h | --help]\n' +
    '  (default)   write the three spec files and three content READMEs\n' +
    '  --check     verify outputs are byte-identical; write nothing; silent on success\n' +
    '  --write-section-lock\n' +
    '              regenerate scripts/locks/section-inventory.0.8.lock.json from\n' +
    '              content/, printing every added, removed and changed unit first.\n' +
    '              The lock exists so that adding or removing a section is a\n' +
    '              deliberate act: read the printed delta before committing it.\n' +
    '  --write-frozen-lock\n' +
    '              regenerate scripts/locks/frozen-docs.lock.json, printing every\n' +
    '              added, removed and changed hash first. The lock exists so that\n' +
    '              editing a frozen (historical) document is a deliberate act:\n' +
    '              read the printed delta before committing it.\n'
  );
}

async function cli() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptDir, '..');
  const specDir = path.join(root, 'versions', '0.8');
  const contentDir = path.join(specDir, 'content');

  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) { usage(); process.exit(0); }
  const KNOWN = new Set(['--check', '--write-section-lock', '--write-frozen-lock']);
  if (args.length > 1 || (args.length === 1 && !KNOWN.has(args[0]))) {
    usage();
    process.exit(1);
  }
  const checkMode = args[0] === '--check';
  const writeLockMode = args[0] === '--write-section-lock';

  if (writeLockMode) {
    if (!fs.existsSync(contentDir)) fail(`content dir not found: ${contentDir}`);
    const release = readRelease(contentDir);
    await writeSectionInventoryLock(
      contentDir, defaultSectionInventoryLockPath(contentDir), release);
    return;
  }

  if (args[0] === '--write-frozen-lock') {
    await writeFrozenDocsLock(root, defaultFrozenDocsLockPath(root));
    return;
  }

  if (!fs.existsSync(contentDir)) fail(`content dir not found: ${contentDir}`);

  let build;
  let rootDocs;
  try {
    // --check reads generated outputs, so reject linked roots before content
    // validation can traverse a directory outside the repository.
    validateWriteRoots(specDir, contentDir);
    if (checkMode) {
      const pending = pendingTransactionPaths(specDir, contentDir);
      if (pending.length) {
        fail(`build_spec --check: pending/interrupted transaction artifact(s): ${pending.join(', ')}; --check is read-only and will not recover or remove them`);
      }
    } else {
      // Recovery must run before content validation. Its own derived output
      // artifacts are outside the closed-world content namespace and may be
      // the only evidence needed to make the next validation possible.
      recoverBuildOutputTransaction(specDir, contentDir);
    }
    build = await buildBuffers(contentDir, {
      requireSectionInventoryLock: true,
      sectionInventoryLockPath: defaultSectionInventoryLockPath(contentDir),
    });
    // The four root documents are generated from their own triple sources.
    // Built here, after buildBuffers, so a content failure still reports first.
    rootDocs = buildRootDocs(root, { release: build.release });
    // Runs in BOTH write and --check modes, after buildRootDocs succeeds but
    // BEFORE any output writing/comparison, so a pending-transaction, lock or
    // root-doc source failure still reports first. The README/CHANGELOG
    // anchors validate the freshly assembled rootDocs buffers instead of the
    // stale artifacts on disk, so a source-tree change synced ahead of
    // regeneration is no longer rejected against the previous build's output.
    await checkHandwrittenVersionReferences(root, build.release, rootDocs);
    // Runs in BOTH modes, before any output writing/comparison: every public
    // Markdown file must be registered, and the frozen (historical) 0.7
    // documents must still match their frozen-docs lock hashes.
    const registryProblems = checkDocsRegistry(root, defaultFrozenDocsLockPath(root));
    if (registryProblems.length > 0) {
      fail('docs registry check failed:\n' +
        registryProblems.map((p) => `  ${p}`).join('\n'));
    }
  } catch (e) {
    process.stderr.write(`build_spec: ${e.message}\n`);
    process.exit(1);
  }
  const { bufs, totalLen, manifest, pieces, readmeBufs } = build;

  if (!checkMode) {
    writeBuildOutputs(specDir, contentDir, build);
    writeRootDocs(root, rootDocs);
    process.stdout.write(
      `build_spec: assembled ${manifest.length} units -> ` +
      LANGS.map((l) => path.relative(root, path.join(specDir, OUT_FILES[l]))).join(', ') + '\n'
    );
    process.exit(0);
  }

  // --check mode: silent on success, first divergence diagnostic on stderr.
  checkBuildOutputs(specDir, contentDir, build);
  const rootProblems = checkRootDocs(root, rootDocs);
  if (rootProblems.length > 0) {
    for (const problem of rootProblems) {
      process.stderr.write(`build_spec --check: ${problem}\n`);
    }
    process.exit(1);
  }
  process.exit(0);
}

const isMain = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  cli().catch((e) => {
    process.stderr.write(`build_spec: ${e.message}\n`);
    process.exit(1);
  });
}
