// The release drift check: `checkHandwrittenVersionReferences` proves the
// root READMEs and CHANGELOGs carry the current-version anchors by judging
// the freshly built root-doc buffers, never the artifacts on disk, and
// reads from here the files nobody generates -- versions.ktav and Appendix
// A's meta.js -- proving they agree with release.js. These cases run it
// against the real repository first, then against a temp copy with one
// file made stale at a time.

import {
  checkHandwrittenVersionReferences,
  writeSectionInventoryLock,
} from '../../build_spec.mjs';
import * as references from './references.mjs';
import test from 'node:test';

test('checkHandwrittenVersionReferences accepts the real repo hand-maintained files', (t) => references.checkHandwrittenVersionReferencesAcceptsTheRealRepoHandMaintainedFiles(t));

test('checkHandwrittenVersionReferences rejects a stale versions.ktav stable.version', (t) => references.checkHandwrittenVersionReferencesRejectsAStaleVersionsKtavStableVersion(t));

test('checkHandwrittenVersionReferences rejects stable pointing at versions/0.6', (t) => references.checkHandwrittenVersionReferencesRejectsStablePointingAtVersions06(t));

test('checkHandwrittenVersionReferences rejects a stale latest.version', (t) => references.checkHandwrittenVersionReferencesRejectsAStaleLatestVersion(t));

test('checkHandwrittenVersionReferences names only the stale README', (t) => references.checkHandwrittenVersionReferencesNamesOnlyTheStaleReadme(t));

test('checkHandwrittenVersionReferences rejects a missing versions.ktav', (t) => references.checkHandwrittenVersionReferencesRejectsAMissingVersionsKtav(t));

test('checkHandwrittenVersionReferences collects all disagreements at once', (t) => references.checkHandwrittenVersionReferencesCollectsAllDisagreementsAtOnce(t));

test('checkHandwrittenVersionReferences rejects unparseable versions.ktav', (t) => references.checkHandwrittenVersionReferencesRejectsUnparseableVersionsKtav(t));

test('checkHandwrittenVersionReferences rejects a CHANGELOG still reading unreleased', (t) => references.checkHandwrittenVersionReferencesRejectsAChangelogStillReadingUnreleased(t));

test('checkHandwrittenVersionReferences rejects an Appendix A heading still reading unreleased', (t) => references.checkHandwrittenVersionReferencesRejectsAnAppendixAHeadingStillReadingUnreleased(t));

test('checkHandwrittenVersionReferences rejects an Appendix A number that disagrees', (t) => references.checkHandwrittenVersionReferencesRejectsAnAppendixANumberThatDisagrees(t));

test('writeSectionInventoryLock writes nothing when the lock is already current', (t) => references.writeSectionInventoryLockWritesNothingWhenTheLockIsAlreadyCurrent(t));

test('writeSectionInventoryLock records a unit the lock was missing', (t) => references.writeSectionInventoryLockRecordsAUnitTheLockWasMissing(t));

test('checkHandwrittenVersionReferences rejects a missing Appendix A unit', (t) => references.checkHandwrittenVersionReferencesRejectsAMissingAppendixAUnit(t));
