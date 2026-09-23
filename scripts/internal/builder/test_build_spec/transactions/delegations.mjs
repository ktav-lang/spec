// The six-output build is transactional, and its cases live in
// ../transactions.mjs and ../locks.mjs because they need the crash and
// lock-reclaim harnesses. This file is only the registration list: one
// line per case, so the suite's order and names stay visible in one
// place instead of being buried inside the harness modules.

import { write } from '../helpers.mjs';
import * as locks from './locks.mjs';
import * as transactions from './harness.mjs';
import test from 'node:test';

test('write build restores missing generated content READMEs from README.source.md', (t) => transactions.writeBuildRestoresMissingGeneratedContentReadmesFromReadmeSourceJs(t));

test('write build rejects a specification destination symlink without touching its target', (t) => transactions.writeBuildRejectsASpecificationDestinationSymlinkWithoutTouchingItsTarget(t));

test('check build rejects a generated spec file symlink before reading its target', (t) => transactions.checkBuildRejectsAGeneratedSpecFileSymlinkBeforeReadingItsTarget(t));

test('check build reports a missing generated output deterministically', (t) => transactions.checkBuildReportsAMissingGeneratedOutputDeterministically(t));

test('write build rejects a generated README directory before creating temporary outputs', (t) => transactions.writeBuildRejectsAGeneratedReadmeDirectoryBeforeCreatingTemporaryOutputs(t));

test('failed atomic rename preserves the destination and cleans its temporary file', (t) => transactions.failedAtomicRenamePreservesTheDestinationAndCleansItsTemporaryFile(t));

test('a later output rename rolls back all six outputs and cleans temps and backups', (t) => transactions.aLaterOutputRenameRollsBackAllSixOutputsAndCleansTempsAndBackups(t));

test('rollback preserves an unrestorable backup and continues restoring other outputs', (t) => transactions.rollbackPreservesAnUnrestorableBackupAndContinuesRestoringOtherOutputs(t));

test('backup cleanup failure never rolls back committed six-output build', (t) => transactions.backupCleanupFailureNeverRollsBackCommittedSixOutputBuild(t));

test('a child-process death after backup or install rename is recovered on the next invocation', (t) => transactions.aChildProcessDeathAfterBackupOrInstallRenameIsRecoveredOnTheNextInvocation(t));

test('all transaction file writes preserve offsets across short writes', (t) => transactions.allTransactionFileWritesPreserveOffsetsAcrossShortWrites(t));

test('a zero-progress transaction write is rejected', (t) => transactions.aZeroProgressTransactionWriteIsRejected(t));

test('a partial output temporary is disposable before the first journal and recovery is repeatable', (t) => transactions.aPartialOutputTemporaryIsDisposableBeforeTheFirstJournalAndRecoveryIsRepeatable(t));

test('partial output staging keeps journal provenance when cleanup is transiently unavailable', (t) => transactions.partialOutputStagingKeepsJournalProvenanceWhenCleanupIsTransientlyUnavailable(t));

test('partial output, output cleanup, and journal publication failures retain retry provenance', (t) => transactions.partialOutputOutputCleanupAndJournalPublicationFailuresRetainRetryProvenance(t));

test('partial candidate, claim, and lease metadata resumes after initial cleanup failure', (t) => transactions.partialCandidateClaimAndLeaseMetadataResumesAfterInitialCleanupFailure(t));

test('candidate, claim, and lease write failures clean private metadata before retry', (t) => transactions.candidateClaimAndLeaseWriteFailuresCleanPrivateMetadataBeforeRetry(t));

test('published transaction journal contains only exact derived records and rejects crafted paths', (t) => transactions.publishedTransactionJournalContainsOnlyExactDerivedRecordsAndRejectsCraftedPaths(t));

test('recovery cleans an unpublished journal tmp but never treats it as a journal', (t) => transactions.recoveryCleansAnUnpublishedJournalTmpButNeverTreatsItAsAJournal(t));

test('--check reports pending transaction artifacts without removing or rewriting them', (t) => transactions.checkReportsPendingTransactionArtifactsWithoutRemovingOrRewritingThem(t));

test('normal CLI write recovers pre-journal outputs before closed-world validation', (t) => transactions.normalCliWriteRecoversPreJournalOutputsBeforeClosedWorldValidation(t));
test('a live cooperative lock blocks a second writer without touching outputs', (t) => locks.aLiveCooperativeLockBlocksASecondWriterWithoutTouchingOutputs(t));

test('a dead owner lock is reclaimed before deterministic recovery and write', (t) => locks.aDeadOwnerLockIsReclaimedBeforeDeterministicRecoveryAndWrite(t));

test('same-nonce reclaim intent authorizes pre-journal temporary cleanup', (t) => locks.sameNonceReclaimIntentAuthorizesPreJournalTemporaryCleanup(t));

test('reclaim intent for one owner never authorizes another nonce temporary', (t) => locks.reclaimIntentForOneOwnerNeverAuthorizesAnotherNonceTemporary(t));

test('legacy pre-journal temporary with unknown provenance fails conservatively', (t) => locks.legacyPreJournalTemporaryWithUnknownProvenanceFailsConservatively(t));

test('a live PID with an unrelated incarnation blocks while an expired lease is reclaimable', (t) => locks.aLivePIDWithAnUnrelatedIncarnationBlocksWhileAnExpiredLeaseIsReclaimable(t));

test('an expired lease never reclaims a live matching incarnation', (t) => locks.anExpiredLeaseNeverReclaimsALiveMatchingIncarnation(t));

test('an unavailable process incarnation never reclaims a live PID', (t) => locks.anUnavailableProcessIncarnationNeverReclaimsALivePID(t));

test('a crash-created complete lock candidate is recovered without exposing it as the final lock', (t) => locks.aCrashCreatedCompleteLockCandidateIsRecoveredWithoutExposingItAsTheFinalLock(t));

test('a torn owner-specific candidate is discarded after its owner is proven dead', (t) => locks.aTornOwnerSpecificCandidateIsDiscardedAfterItsOwnerIsProvenDead(t));

test('claim freshness is independent of the stale target mtime', (t) => locks.claimFreshnessIsIndependentOfTheStaleTargetMtime(t));

test('a reclaimer cannot remove a replacement lock from a stale-incarnation interleaving', (t) => locks.aReclaimerCannotRemoveAReplacementLockFromAStaleIncarnationInterleaving(t));

test('two reclaimers interleave through capture hooks without losing the claim', (t) => locks.twoReclaimersInterleaveThroughCaptureHooksWithoutLosingTheClaim(t));

test('claim capture restores a replacement instead of deleting it', (t) => locks.claimCaptureRestoresAReplacementInsteadOfDeletingIt(t));

test('same-process claim quarantine cleanup resumes after one unlink failure', (t) => locks.sameProcessClaimQuarantineCleanupResumesAfterOneUnlinkFailure(t));

test('release captures and restores a replacement before removing owner artifacts', (t) => locks.releaseCapturesAndRestoresAReplacementBeforeRemovingOwnerArtifacts(t));

test('an interrupted release capture is resumable by the same process', (t) => locks.anInterruptedReleaseCaptureIsResumableByTheSameProcess(t));

test('release cleanup resumes across every owner capture and nested quarantine boundary', (t) => locks.releaseCleanupResumesAcrossEveryOwnerCaptureAndNestedQuarantineBoundary(t));

test('nested release quarantine cleanup resumes in the same process', (t) => locks.nestedReleaseQuarantineCleanupResumesInTheSameProcess(t));

test('release claim quarantine cleanup resumes in the same process', (t) => locks.releaseClaimQuarantineCleanupResumesInTheSameProcess(t));

test('reclaim removes every exact old-owner artifact but preserves replacement artifacts', (t) => locks.reclaimRemovesEveryExactOldOwnerArtifactButPreservesReplacementArtifacts(t));

test('write mode conservatively removes torn legacy lock artifacts only after owner death', (t) => locks.writeModeConservativelyRemovesTornLegacyLockArtifactsOnlyAfterOwnerDeath(t));

test('a crash after capturing malformed legacy bytes is recovered by the next write', (t) => locks.aCrashAfterCapturingMalformedLegacyBytesIsRecoveredByTheNextWrite(t));

test('release and quarantine namespace accepts every emitted legacy family', (t) => locks.releaseAndQuarantineNamespaceAcceptsEveryEmittedLegacyFamily(t));

test('release and quarantine metadata symlinks are rejected before their targets are read', (t) => locks.releaseAndQuarantineMetadataSymlinksAreRejectedBeforeTheirTargetsAreRead(t));

test('release metadata FIFO is rejected without opening it', (t) => locks.releaseMetadataFIFOIsRejectedWithoutOpeningIt(t));

test('release recovery removes an orphan final lease after owner capture', (t) => locks.releaseRecoveryRemovesAnOrphanFinalLeaseAfterOwnerCapture(t));

test('crash before first journal publication recovers derived output temporaries immediately', (t) => locks.crashBeforeFirstJournalPublicationRecoversDerivedOutputTemporariesImmediately(t));

test('crash recovery restores distinct old bytes before a later full write installs new bytes', (t) => locks.crashRecoveryRestoresDistinctOldBytesBeforeALaterFullWriteInstallsNewBytes(t));

test('distinct-byte crash matrix covers backup and install offsets, including missing destinations', (t) => locks.distinctByteCrashMatrixCoversBackupAndInstallOffsetsIncludingMissingDestinations(t));

test('write build preserves the missing-backup recovery error without mutating the remaining outputs', (t) => locks.writeBuildPreservesTheMissingBackupRecoveryErrorWithoutMutatingTheRemainingOutputs(t));

test('write build rejects a specification directory symlink before creating temporary outputs', (t) => locks.writeBuildRejectsASpecificationDirectorySymlinkBeforeCreatingTemporaryOutputs(t));

test('check build rejects a specification directory symlink before reading generated outputs', (t) => locks.checkBuildRejectsASpecificationDirectorySymlinkBeforeReadingGeneratedOutputs(t));

test('write build rejects a content directory symlink before creating temporary outputs', (t) => locks.writeBuildRejectsAContentDirectorySymlinkBeforeCreatingTemporaryOutputs(t));

test('write build rejects a symlinked ancestor of a write root', (t) => locks.writeBuildRejectsASymlinkedAncestorOfAWriteRoot(t));

test('write build requires contentDir to be the resolved content child of specDir', (t) => locks.writeBuildRequiresContentDirToBeTheResolvedContentChildOfSpecDir(t));
