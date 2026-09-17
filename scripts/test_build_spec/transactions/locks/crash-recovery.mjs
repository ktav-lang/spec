// Crash recovery of the six outputs. A crash before the first journal
// publication must leave derived temporaries removable immediately; a
// crash after it must restore the exact old bytes, at every backup and
// install offset, including destinations that did not exist.

import {
  LANGS,
  OUT_FILES,
  README_FILES,
  README_SOURCE_FILE,
  buildBuffers,
  recoverBuildOutputTransaction,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import { baseFixtures, bodySource, makeContent, write } from '../../helpers.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function crashBeforeFirstJournalPublicationRecoversDerivedOutputTemporariesImmediately() {  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-prejournal-recovery-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const source = `
      import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      const build = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, build);
    `;
    const env = { ...process.env, KTAV_BUILD_SPEC_CRASH_BEFORE_FIRST_JOURNAL: '1' };
    const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], { env, encoding: 'utf8' });
    assert.notEqual(crashed.status, 0);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json')), false);
    const firstTemp = fs.readdirSync(versionDir).find((name) =>
      /^\.spec\.md\.[0-9a-f]{32}\.[0-9a-f]{64}\.tmp$/u.test(name));
    assert.ok(firstTemp);
    // Model an interrupted first write after the owner has died: the exact
    // derived name remains, but its bytes no longer match the filename digest.
    fs.truncateSync(path.join(versionDir, firstTemp), 1);
    recoverBuildOutputTransaction(versionDir, contentDir);
    assert.equal(fs.readdirSync(versionDir).some((name) => name.endsWith('.tmp')), false);
    assert.equal(fs.readdirSync(versionDir).some((name) =>
      name.startsWith('.build-spec.transaction.lock.release.reclaim.')), false);
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function crashRecoveryRestoresDistinctOldBytesBeforeALaterFullWriteInstallsNewBytes() {  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-distinct-recovery-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const oldBuild = await buildBuffers(contentDir);
    writeBuildOutputs(versionDir, contentDir, oldBuild);
    write(path.join(contentDir, 'named-abstract', 'body-1.md'),
      bodySource('distinct new body.\n\n', 'новое тело.\n\n', '新的正文。\n\n'));
    const newBuild = await buildBuffers(contentDir);
    const source = `
      import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      const build = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, build);
    `;
    const env = { ...process.env, KTAV_BUILD_SPEC_CRASH_AFTER_RENAME: 'install:3' };
    const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], { env, encoding: 'utf8' });
    assert.notEqual(crashed.status, 0);
    const journal = JSON.parse(fs.readFileSync(path.join(versionDir, '.build-spec.transaction.json'), 'utf8'));
    assert.equal(journal.phase, 'installing');
    assert.match(journal.nonce, /^[0-9a-f]{32}$/);
    assert.equal(journal.outputs.length, 6);
    assert.equal(journal.outputs.some((item) => Object.keys(item).some((key) => /path/i.test(key))), false);

    // Recover immediately, before asking the builder to perform another full write.
    recoverBuildOutputTransaction(versionDir, contentDir);
    for (const lang of LANGS) {
      assert.deepEqual(fs.readFileSync(path.join(versionDir, OUT_FILES[lang])), oldBuild.bufs[lang]);
      assert.deepEqual(fs.readFileSync(path.join(contentDir, README_FILES[lang])), oldBuild.readmeBufs[lang]);
    }
    writeBuildOutputs(versionDir, contentDir, newBuild);
    for (const lang of LANGS) {
      assert.deepEqual(fs.readFileSync(path.join(versionDir, OUT_FILES[lang])), newBuild.bufs[lang]);
      assert.deepEqual(fs.readFileSync(path.join(contentDir, README_FILES[lang])), newBuild.readmeBufs[lang]);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function distinctByteCrashMatrixCoversBackupAndInstallOffsetsIncludingMissingDestinations() {  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const runCase = async (label, crashPoint, missingIndexes = []) => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ktav-matrix-${label}-`));
    try {
      const versionDir = path.join(temp, 'version');
      const contentDir = path.join(versionDir, 'content');
      const fixtures = baseFixtures();
      makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
      const oldBuild = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, oldBuild);
      write(path.join(contentDir, 'named-abstract', 'body-1.md'),
        bodySource(`matrix en body ${label}.\n\n`, `matrix ru body ${label}.\n\n`, `matrix zh body ${label}.\n\n`));
      write(path.join(contentDir, README_SOURCE_FILE), bodySource(
        `# Matrix EN README ${label}\n`, `# Matrix RU README ${label}\n`, `# Matrix ZH README ${label}\n`));
      const newBuild = await buildBuffers(contentDir);
      const destinations = LANGS.flatMap((lang) => [
        path.join(versionDir, OUT_FILES[lang]), path.join(contentDir, README_FILES[lang]),
      ]);
      const oldBytes = LANGS.flatMap((lang) => [oldBuild.bufs[lang], oldBuild.readmeBufs[lang]]);
      const newBytes = LANGS.flatMap((lang) => [newBuild.bufs[lang], newBuild.readmeBufs[lang]]);
      assert.equal(new Set(newBytes.map((bytes) => bytes.toString('hex'))).size, 6);
      for (const index of missingIndexes) fs.unlinkSync(destinations[index]);
      const source = `
        import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
        const versionDir = ${JSON.stringify(versionDir)};
        const contentDir = ${JSON.stringify(contentDir)};
        const build = await buildBuffers(contentDir);
        writeBuildOutputs(versionDir, contentDir, build);
      `;
      const env = { ...process.env, KTAV_BUILD_SPEC_CRASH_AFTER_RENAME: crashPoint };
      const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], { env, encoding: 'utf8' });
      assert.notEqual(crashed.status, 0, `${label} child unexpectedly completed`);
      recoverBuildOutputTransaction(versionDir, contentDir);
      for (let index = 0; index < destinations.length; index++) {
        if (missingIndexes.includes(index)) assert.equal(fs.existsSync(destinations[index]), false, destinations[index]);
        else assert.deepEqual(fs.readFileSync(destinations[index]), oldBytes[index], destinations[index]);
      }
      writeBuildOutputs(versionDir, contentDir, newBuild);
      for (let index = 0; index < destinations.length; index++) {
        assert.deepEqual(fs.readFileSync(destinations[index]), newBytes[index], destinations[index]);
      }
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  };

  for (const phase of ['backup', 'install']) {
    for (let index = 0; index < 6; index++) await runCase(`${phase}-${index}`, `${phase}:${index}`);
  }
  await runCase('backup-missing', 'backup:1', [0]);
  await runCase('install-missing', 'install:3', [0, 3]);
}

export async function writeBuildPreservesTheMissingBackupRecoveryErrorWithoutMutatingTheRemainingOutputs() {  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-missing-backup-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const initial = await buildBuffers(contentDir);
    writeBuildOutputs(versionDir, contentDir, initial);
    for (const lang of LANGS) {
      write(path.join(versionDir, OUT_FILES[lang]), Buffer.from(`old spec ${lang}\n`));
      write(path.join(contentDir, README_FILES[lang]), Buffer.from(`old readme ${lang}\n`));
    }
    const source = `
      import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      const build = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, build);
    `;
    const env = { ...process.env, KTAV_BUILD_SPEC_CRASH_AFTER_RENAME: 'backup:0' };
    const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], { env, encoding: 'utf8' });
    assert.notEqual(crashed.status, 0);
    const backup = fs.readdirSync(versionDir).find((name) => name.endsWith('.bak'));
    assert.ok(backup);
    fs.unlinkSync(path.join(versionDir, backup));
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, initial),
      (error) => /missing transaction backup|ambiguous/.test(error.message) &&
        !(error instanceof TypeError)
    );
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
