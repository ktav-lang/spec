import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  checkHandwrittenVersionReferences,
  writeSectionInventoryLock,
} from '../build_spec.mjs';

import {
  APPENDIX_META_REL,
  REAL_RELEASE,
  TEST_RELEASE,
  baseFixtures,
  copyDriftCheckInputs,
  makeContent,
} from './helpers.mjs';

export async function checkHandwrittenVersionReferencesAcceptsTheRealRepoHandMaintainedFiles() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-ok-'));
  try {
    copyDriftCheckInputs(root);
    // This also proves historical 0.6.4 / 0.7.0 / 2026-08-23 mentions in the
    // real files never trip the check: only current-version anchors match.
    await assert.doesNotReject(() =>
      checkHandwrittenVersionReferences(root, REAL_RELEASE));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsAStaleVersionsKtavStableVersion() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-stable-'));
  try {
    copyDriftCheckInputs(root);
    const ktav = path.join(root, 'versions.ktav');
    fs.writeFileSync(ktav, fs.readFileSync(ktav, 'utf8')
      .replace('version: ' + REAL_RELEASE.version, 'version: 0.7.0'));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => e.message.includes('versions.ktav') &&
        e.message.includes('stable') &&
        e.message.includes('"0.7.0"') &&
        e.message.includes(JSON.stringify(REAL_RELEASE.version)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsStablePointingAtVersions06() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-path-'));
  try {
    copyDriftCheckInputs(root);
    const ktav = path.join(root, 'versions.ktav');
    fs.writeFileSync(ktav, fs.readFileSync(ktav, 'utf8')
      .replace('path: versions/0.7', 'path: versions/0.6'));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => /versions\.ktav: stable\.path is "versions\/0\.6"/u.test(e.message));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsAStaleLatestVersion() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-latest-'));
  try {
    copyDriftCheckInputs(root);
    const ktav = path.join(root, 'versions.ktav');
    // Only the `latest` block's version line: it directly follows `latest: {`.
    fs.writeFileSync(ktav, fs.readFileSync(ktav, 'utf8')
      .replace(/(latest: \{\n\s*version: )([^\n]+)/u,
        `$10.0.1`));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => e.message.includes('latest') &&
        e.message.includes('"0.0.1"') &&
        !/latest\.path/u.test(e.message));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesNamesOnlyTheStaleReadme() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-readme-'));
  try {
    copyDriftCheckInputs(root);
    const readme = path.join(root, 'README.md');
    fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8')
      .split('\n')
      .map((line) => line.includes('**Current stable:**')
        ? line.replaceAll(REAL_RELEASE.version, '0.7.0')
        : line)
      .join('\n'));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => {
        assert.ok(e.message.includes('README.md'), e.message);
        assert.ok(!e.message.includes('README.ru.md'), e.message);
        assert.ok(!e.message.includes('README.zh.md'), e.message);
        assert.ok(!e.message.includes('versions.ktav'), e.message);
        return true;
      });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsAMissingRequiredFile() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-missing-'));
  try {
    copyDriftCheckInputs(root);
    fs.rmSync(path.join(root, 'README.zh.md'));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => e.message.includes('README.zh.md'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesCollectsAllDisagreementsAtOnce() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-all-'));
  try {
    copyDriftCheckInputs(root);
    const ktav = path.join(root, 'versions.ktav');
    fs.writeFileSync(ktav, fs.readFileSync(ktav, 'utf8')
      .replaceAll('version: ' + REAL_RELEASE.version, 'version: 0.7.0'));
    const readme = path.join(root, 'README.md');
    fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8')
      .split('\n')
      .map((line) => line.includes('**Current stable:**')
        ? line.replaceAll(REAL_RELEASE.version, '0.7.0')
        : line)
      .join('\n'));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => {
        assert.ok(e.message.includes('stable'), e.message);
        assert.ok(e.message.includes('latest'), e.message);
        assert.ok(e.message.includes('README.md'), e.message);
        return true;
      });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsUnparseableVersionsKtav() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-parse-'));
  try {
    copyDriftCheckInputs(root);
    const ktav = path.join(root, 'versions.ktav');
    // Delete the closing brace line of the stable block (the first standalone "}").
    const text = fs.readFileSync(ktav, 'utf8');
    const firstClose = text.indexOf('\n}\n');
    assert.notEqual(firstClose, -1);
    fs.writeFileSync(ktav, text.slice(0, firstClose) + '\n' + text.slice(firstClose + 3));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => /versions\.ktav: cannot parse/u.test(e.message));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsAChangelogStillReadingUnreleased() {
  // The failure this reproduces actually shipped: specification 0.7.0
  // went out with its changelog entry undated while release.js already
  // carried the date, and 0.7.1 nearly repeated it.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-changelog-'));
  try {
    copyDriftCheckInputs(root);
    const file = path.join(root, 'CHANGELOG.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
      .replace(`## [${REAL_RELEASE.version}] — ${REAL_RELEASE.released}`,
        `## [${REAL_RELEASE.version}] — unreleased`));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => e.message.includes('CHANGELOG.md') &&
        e.message.includes(REAL_RELEASE.released));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsAnAppendixAHeadingStillReadingUnreleased() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-appendix-'));
  try {
    copyDriftCheckInputs(root);
    const file = path.join(root, APPENDIX_META_REL);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
      .replace(`"— ${REAL_RELEASE.released}"`, '"— unreleased"'));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => e.message.includes('meta.title.en') &&
        e.message.includes('unreleased'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsAnAppendixANumberThatDisagrees() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-appendix-number-'));
  try {
    copyDriftCheckInputs(root);
    const file = path.join(root, APPENDIX_META_REL);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
      .replace(`"number": "${REAL_RELEASE.version}"`, '"number": "9.9.9"'));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => e.message.includes('meta.number') && e.message.includes('9.9.9'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function writeSectionInventoryLockWritesNothingWhenTheLockIsAlreadyCurrent() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lockgen-current-'));
  try {
    const fixtures = baseFixtures();
    makeContent(dir, fixtures, fixtures.map((u) => u.name));
    const lockPath = path.join(dir, 'lock.json');
    await writeSectionInventoryLock(path.join(dir, 'content'), lockPath, TEST_RELEASE);
    const first = fs.readFileSync(lockPath, 'utf8');
    const firstMtime = fs.statSync(lockPath).mtimeMs;
    await writeSectionInventoryLock(path.join(dir, 'content'), lockPath, TEST_RELEASE);
    assert.equal(fs.readFileSync(lockPath, 'utf8'), first);
    assert.equal(fs.statSync(lockPath).mtimeMs, firstMtime,
      'a lock that is already current must not be rewritten at all');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function writeSectionInventoryLockRecordsAUnitTheLockWasMissing() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lockgen-add-'));
  try {
    const fixtures = baseFixtures();
    makeContent(dir, fixtures, fixtures.map((u) => u.name));
    const contentDir = path.join(dir, 'content');
    const lockPath = path.join(dir, 'lock.json');
    await writeSectionInventoryLock(contentDir, lockPath, TEST_RELEASE);

    const full = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const dropped = full.units.at(-1).unit;
    fs.writeFileSync(lockPath, JSON.stringify(
      { ...full, units: full.units.slice(0, -1) }, null, 2) + '\n');

    await writeSectionInventoryLock(contentDir, lockPath, TEST_RELEASE);
    const after = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    assert.ok(after.units.some((u) => u.unit === dropped),
      `regeneration must restore ${dropped}`);
    assert.equal(after.units.length, full.units.length);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function checkHandwrittenVersionReferencesRejectsAMissingAppendixAUnit() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-handwritten-appendix-missing-'));
  try {
    copyDriftCheckInputs(root);
    fs.rmSync(path.join(root, APPENDIX_META_REL));
    await assert.rejects(
      () => checkHandwrittenVersionReferences(root, REAL_RELEASE),
      (e) => e.message.includes('Appendix A has no unit'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
