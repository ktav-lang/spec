import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import {
  buildBuffers,
  writeBuildOutputs,
  checkBuildOutputs,
  recoverBuildOutputTransaction,
  LANGS,
  OUT_FILES,
  README_FILES,
  README_SOURCE_FILE,
} from '../build_spec.mjs';

import {
  baseFixtures,
  bodyJs,
  makeContent,
  lockUnits,
  realReleaseJs,
  copyHandwrittenRootFiles,
  write,
  installGenerator,
  symlinksSupported,
  REAL_RELEASE,
  TEST_RELEASE,
} from './helpers.mjs';

export async function writeBuildRestoresMissingGeneratedContentReadmesFromReadmeSourceJs() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-readme-write-'));
  try {
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    const manifest = fixtures.map((u) => u.name);
    const expected = { en: '# EN README\n', ru: '# RU README\n', zh: '# ZH README\n' };
    makeContent(versionDir, fixtures, manifest);
    write(path.join(contentDir, README_SOURCE_FILE),
      bodyJs(expected.en, expected.ru, expected.zh));
    write(path.join(temp, 'scripts', 'locks', 'section-inventory.0.7.lock.json'),
      JSON.stringify({
        format: 'ktav-section-inventory',
        units: lockUnits(fixtures, manifest),
        version: TEST_RELEASE.version,
      }, null, 2) + '\n');
    for (const lang of LANGS) fs.rmSync(path.join(contentDir, README_FILES[lang]));

    const build = await buildBuffers(contentDir, { requireSectionInventoryLock: true });
    writeBuildOutputs(versionDir, contentDir, build);

    for (const lang of LANGS) {
      assert.equal(
        fs.readFileSync(path.join(contentDir, README_FILES[lang]), 'utf8'),
        expected[lang]
      );
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRejectsASpecificationDestinationSymlinkWithoutTouchingItsTarget(t) {
  if (!symlinksSupported()) {
    t.skip('symlink creation unavailable without privileges (Windows without admin/Developer Mode); this test MUST run on POSIX CI');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-symlink-'));
  try {
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const outside = path.join(temp, 'outside-spec.md');
    write(outside, 'must remain unchanged\n');
    fs.symlinkSync(outside, path.join(versionDir, 'spec.md'), 'file');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /output destination .*spec\.md.*not a regular file \(symlink/.test(e.message)
    );
    assert.equal(fs.readFileSync(outside, 'utf8'), 'must remain unchanged\n');
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.ru.md')), false);

    // The generated content README goes through the same writer and must
    // receive the same lstat protection as the specification outputs.
    fs.unlinkSync(path.join(versionDir, 'spec.md'));
    const outsideReadme = path.join(temp, 'outside-readme.md');
    write(outsideReadme, 'README target must remain unchanged\n');
    fs.rmSync(path.join(contentDir, 'README.md'));
    fs.symlinkSync(outsideReadme, path.join(contentDir, 'README.md'), 'file');
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /output destination .*README\.md.*not a regular file \(symlink/.test(e.message)
    );
    assert.equal(fs.readFileSync(outsideReadme, 'utf8'), 'README target must remain unchanged\n');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function checkBuildRejectsAGeneratedSpecFileSymlinkBeforeReadingItsTarget(t) {
  if (!symlinksSupported()) {
    t.skip('symlink creation unavailable without privileges (Windows without admin/Developer Mode); this test MUST run on POSIX CI');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-check-file-link-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const outside = path.join(temp, 'outside-spec.md');
    write(outside, 'must remain unchanged\n');
    fs.rmSync(path.join(versionDir, 'spec.md'), { force: true });
    fs.symlinkSync(outside, path.join(versionDir, 'spec.md'), 'file');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => checkBuildOutputs(versionDir, contentDir, build),
      (e) => /check: cannot compare spec\.md \(en\).*output comparison target .*spec\.md.*not a regular file \(symlink/.test(e.message)
    );
    assert.equal(fs.readFileSync(outside, 'utf8'), 'must remain unchanged\n');

    // README outputs are comparison targets too; check mode must lstat them
    // before reading, just like generated specification files.
    fs.unlinkSync(path.join(versionDir, 'spec.md'));
    writeBuildOutputs(versionDir, contentDir, build);
    const outsideReadme = path.join(temp, 'outside-readme.md');
    write(outsideReadme, 'README target must remain unchanged\n');
    fs.rmSync(path.join(contentDir, 'README.md'));
    fs.symlinkSync(outsideReadme, path.join(contentDir, 'README.md'), 'file');
    assert.throws(
      () => checkBuildOutputs(versionDir, contentDir, build),
      (e) => /check: cannot compare README\.md \(en\).*output comparison target .*README\.md.*not a regular file \(symlink/.test(e.message)
    );
    assert.equal(fs.readFileSync(outsideReadme, 'utf8'), 'README target must remain unchanged\n');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function checkBuildReportsAMissingGeneratedOutputDeterministically() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-check-missing-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    fs.rmSync(path.join(versionDir, 'spec.md'), { force: true });
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => checkBuildOutputs(versionDir, contentDir, build),
      (e) => /check: MISMATCH in spec\.md \(en\): output file missing at .*spec\.md; expected \d+ bytes/.test(e.message)
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRejectsAGeneratedReadmeDirectoryBeforeCreatingTemporaryOutputs() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-special-'));
  try {
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    fs.rmSync(path.join(contentDir, 'README.md'));
    fs.mkdirSync(path.join(contentDir, 'README.md'));

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /output destination .*README\.md.*not a regular file \(special file/.test(e.message)
    );
    assert.equal(fs.existsSync(path.join(versionDir, 'spec.md')), false);
    const leftovers = fs.readdirSync(contentDir).filter((name) => name.endsWith('.tmp'));
    assert.deepEqual(leftovers, []);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function failedAtomicRenamePreservesTheDestinationAndCleansItsTemporaryFile() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-rename-failure-'));
  try {
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const original = Buffer.from('original specification bytes\n');
    write(path.join(versionDir, 'spec.md'), original);
    const build = await buildBuffers(contentDir);
    let attempts = 0;
    const failure = new Error('injected atomic rename failure');
    failure.code = 'EACCES';

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        renameSync() {
          attempts++;
          throw failure;
        },
      }),
      /injected atomic rename failure/
    );
    assert.equal(attempts, 1);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), original);
    assert.deepEqual(
      fs.readdirSync(versionDir).filter((name) => name.endsWith('.tmp')),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function aLaterOutputRenameRollsBackAllSixOutputsAndCleansTempsAndBackups() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-transaction-rollback-'));
  try {
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const destinations = LANGS.flatMap((lang) => [
      path.join(versionDir, OUT_FILES[lang]),
      path.join(contentDir, README_FILES[lang]),
    ]);
    const originals = new Map(destinations.map((destination) => [
      destination,
      destination.startsWith(contentDir)
        ? Buffer.from(`original ${path.basename(destination)}\n`)
        : null,
    ]));
    for (const [destination, bytes] of originals) {
      if (bytes !== null) write(destination, bytes);
    }

    const failure = new Error('injected later output rename failure');
    failure.code = 'EIO';
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        renameSync(source, destination) {
          if (path.basename(destination) === 'README.ru.md') throw failure;
          fs.renameSync(source, destination);
        },
      }),
      /build output transaction failed: injected later output rename failure/
    );

    for (const [destination, bytes] of originals) {
      if (bytes === null) {
        assert.equal(fs.existsSync(destination), false, destination);
      } else {
        assert.deepEqual(fs.readFileSync(destination), bytes, destination);
      }
    }
    for (const directory of [versionDir, contentDir]) {
      assert.deepEqual(
        fs.readdirSync(directory).filter((name) => name.endsWith('.tmp') || name.endsWith('.bak')),
        []
      );
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function rollbackPreservesAnUnrestorableBackupAndContinuesRestoringOtherOutputs() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-rollback-obstruction-'));
  try {
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const destinations = LANGS.flatMap((lang) => [
      path.join(versionDir, OUT_FILES[lang]),
      path.join(contentDir, README_FILES[lang]),
    ]);
    const originals = new Map(destinations.map((destination) => [
      destination,
      Buffer.from(`recoverable ${path.basename(destination)}\n`),
    ]));
    for (const [destination, bytes] of originals) write(destination, bytes);

    const failure = new Error('injected rollback trigger');
    failure.code = 'EIO';
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        renameSync(source, destination) {
          if (path.basename(destination) === 'README.ru.md') {
            fs.rmSync(path.join(versionDir, 'spec.md'));
            fs.mkdirSync(path.join(versionDir, 'spec.md'));
            throw failure;
          }
          fs.renameSync(source, destination);
        },
      }),
      (error) => error.code === 'EIO' &&
        /could not restore backup .*\.spec\.md\.[^\\/]+\.bak/.test(error.message)
    );

    assert.deepEqual(
      fs.readFileSync(path.join(contentDir, 'README.ru.md')),
      originals.get(path.join(contentDir, 'README.ru.md'))
    );
    assert.equal(fs.statSync(path.join(versionDir, 'spec.md')).isDirectory(), true);
    const backupPaths = [versionDir, contentDir]
      .flatMap((directory) => fs.readdirSync(directory)
        .filter((name) => name.endsWith('.bak'))
        .map((name) => path.join(directory, name)));
    assert.equal(backupPaths.length, 1);
    assert.deepEqual(fs.readFileSync(backupPaths[0]), originals.get(path.join(versionDir, 'spec.md')));
    assert.deepEqual(
      [versionDir, contentDir].flatMap((directory) => fs.readdirSync(directory)
        .filter((name) => name.endsWith('.tmp') || (name.endsWith('.bak') && path.join(directory, name) !== backupPaths[0]))),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function backupCleanupFailureNeverRollsBackCommittedSixOutputBuild() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-cleanup-failure-'));
  try {
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    for (const lang of LANGS) {
      write(path.join(versionDir, OUT_FILES[lang]), `old ${OUT_FILES[lang]}\n`);
      write(path.join(contentDir, README_FILES[lang]), `old ${README_FILES[lang]}\n`);
    }

    const failure = new Error('injected backup cleanup failure');
    failure.code = 'EACCES';
    let cleanupAttempts = 0;
    let failedBackup = null;
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        unlinkSync(backupPath) {
          if (!backupPath.endsWith('.bak')) {
            fs.unlinkSync(backupPath);
            return;
          }
          cleanupAttempts++;
          if (cleanupAttempts === 2) {
            failedBackup = backupPath;
            throw failure;
          }
          fs.unlinkSync(backupPath);
        },
      }),
      (error) => error.code === 'KTAV_BACKUP_CLEANUP_FAILED' &&
        /outputs committed; backup cleanup failed: .*injected backup cleanup failure/.test(error.message)
    );
    assert.equal(cleanupAttempts, 6);

    for (const lang of LANGS) {
      assert.deepEqual(fs.readFileSync(path.join(versionDir, OUT_FILES[lang])), build.bufs[lang]);
      assert.deepEqual(
        fs.readFileSync(path.join(contentDir, README_FILES[lang])),
        build.readmeBufs[lang]
      );
    }
    const leftovers = [versionDir, contentDir]
      .flatMap((directory) => fs.readdirSync(directory)
        .filter((name) => name.endsWith('.tmp') || name.endsWith('.bak'))
        .map((name) => path.join(directory, name)))
      .sort();
    assert.deepEqual(leftovers, [failedBackup].sort());

    // The commit marker is already durable when cleanup fails. Recovery must
    // therefore retain new bytes and finish only the remaining cleanup.
    recoverBuildOutputTransaction(versionDir, contentDir);
    for (const lang of LANGS) {
      assert.deepEqual(fs.readFileSync(path.join(versionDir, OUT_FILES[lang])), build.bufs[lang]);
      assert.deepEqual(fs.readFileSync(path.join(contentDir, README_FILES[lang])), build.readmeBufs[lang]);
    }
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json')), false);
    assert.deepEqual(
      [versionDir, contentDir].flatMap((directory) => fs.readdirSync(directory)
        .filter((name) => name.endsWith('.tmp') || name.endsWith('.bak'))),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function aChildProcessDeathAfterBackupOrInstallRenameIsRecoveredOnTheNextInvocation() {
  const scriptUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'build_spec.mjs')).href;
  const run = (versionDir, contentDir, crashPoint = null, recover = false, writeAfterRecover = true) => {
    const source = `
      import { buildBuffers, writeBuildOutputs, recoverBuildOutputTransaction } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      ${recover ? 'recoverBuildOutputTransaction(versionDir, contentDir);' : ''}
      ${writeAfterRecover ? 'const build = await buildBuffers(contentDir);\n      writeBuildOutputs(versionDir, contentDir, build);' : ''}
    `;
    const env = { ...process.env };
    if (crashPoint !== null) env.KTAV_BUILD_SPEC_CRASH_AFTER_RENAME = crashPoint;
    else delete env.KTAV_BUILD_SPEC_CRASH_AFTER_RENAME;
    return spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      env,
      encoding: 'utf8',
    });
  };

  for (const [label, crashPoint] of [['backup', 'backup:2'], ['install', 'install:3']]) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ktav-write-crash-${label}-`));
    try {
      const versionDir = path.join(temp, 'versions', '0.7');
      const contentDir = path.join(versionDir, 'content');
      const fixtures = baseFixtures();
      makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
      const initial = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, initial);

      const crashed = run(versionDir, contentDir, crashPoint);
      assert.notEqual(crashed.status, 0, `${label} child unexpectedly completed`);
      assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json')), true);

      const recovered = run(versionDir, contentDir, null, true, false);
      assert.equal(recovered.status, 0, recovered.stderr);
      assert.equal(fs.readdirSync(versionDir).some((name) =>
        name.startsWith('.build-spec.transaction.lock.release.reclaim.')), false);
      const rewritten = run(versionDir, contentDir);
      assert.equal(rewritten.status, 0, rewritten.stderr);
      for (const lang of LANGS) {
        assert.deepEqual(fs.readFileSync(path.join(versionDir, OUT_FILES[lang])), initial.bufs[lang]);
        assert.deepEqual(fs.readFileSync(path.join(contentDir, README_FILES[lang])), initial.readmeBufs[lang]);
      }
      for (const directory of [versionDir, contentDir]) {
        assert.deepEqual(
          fs.readdirSync(directory).filter((name) =>
            name === '.build-spec.transaction.json' || name.endsWith('.tmp') || name.endsWith('.bak')),
          []
        );
      }
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}

export async function allTransactionFileWritesPreserveOffsetsAcrossShortWrites() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-short-write-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    let calls = 0;
    let observedCandidateOnly = false;
    const shortWrite = (fd, buffer, offset, length) => {
      calls++;
      if (!observedCandidateOnly) {
        assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), false);
        observedCandidateOnly = true;
      }
      return fs.writeSync(fd, buffer, offset, Math.min(length, 3));
    };

    writeBuildOutputs(versionDir, contentDir, build, { writeSync: shortWrite });
    assert.ok(calls > 20, `expected short writes at every transaction write site, got ${calls}`);
    for (const lang of LANGS) {
      assert.deepEqual(fs.readFileSync(path.join(versionDir, OUT_FILES[lang])), build.bufs[lang]);
      assert.deepEqual(fs.readFileSync(path.join(contentDir, README_FILES[lang])), build.readmeBufs[lang]);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function aZeroProgressTransactionWriteIsRejected() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-zero-write-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, { writeSync: () => 0 }),
      /zero progress/
    );
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function aPartialOutputTemporaryIsDisposableBeforeTheFirstJournalAndRecoveryIsRepeatable() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-partial-output-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    let failed = false;
    const writeSync = (fd, data, offset, length) => {
      if (!failed && offset === 0 && Buffer.compare(data, build.bufs.en) === 0) {
        failed = true;
        fs.writeSync(fd, data, offset, 1);
        const error = new Error('injected output EIO');
        error.code = 'EIO';
        throw error;
      }
      return fs.writeSync(fd, data, offset, length);
    };

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, { writeSync }),
      /injected output EIO/
    );
    assert.equal(failed, true);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json')), false);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json.tmp')), false);
    assert.deepEqual(
      [versionDir, contentDir].flatMap((directory) => fs.readdirSync(directory)
        .filter((name) => name.endsWith('.tmp'))),
      []
    );

    assert.doesNotThrow(() => recoverBuildOutputTransaction(versionDir, contentDir));
    assert.doesNotThrow(() => recoverBuildOutputTransaction(versionDir, contentDir));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function partialOutputStagingKeepsJournalProvenanceWhenCleanupIsTransientlyUnavailable() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-partial-output-journal-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    let outputFailed = false;
    let tempUnlinkFailures = 0;
    const options = {
      writeSync(fd, data, offset, length) {
        if (!outputFailed && offset === 0 && Buffer.compare(data, build.bufs.en) === 0) {
          outputFailed = true;
          fs.writeSync(fd, data, offset, 1);
          const error = new Error('injected output EIO');
          error.code = 'EIO';
          throw error;
        }
        return fs.writeSync(fd, data, offset, length);
      },
      unlinkSync(filePath) {
        if (filePath.endsWith('.tmp') && tempUnlinkFailures < 2) {
          tempUnlinkFailures++;
          const error = new Error('injected temporary cleanup EIO');
          error.code = 'EIO';
          throw error;
        }
        fs.unlinkSync(filePath);
      },
    };

    assert.throws(() => writeBuildOutputs(versionDir, contentDir, build, options), /injected output EIO/);
    assert.equal(outputFailed, true);
    assert.equal(tempUnlinkFailures, 2);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json')), true);
    assert.equal(
      [versionDir, contentDir].some((directory) => fs.readdirSync(directory).some((name) => name.endsWith('.tmp'))),
      true
    );

    assert.doesNotThrow(() => recoverBuildOutputTransaction(versionDir, contentDir));
    assert.doesNotThrow(() => recoverBuildOutputTransaction(versionDir, contentDir));
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function partialOutputOutputCleanupAndJournalPublicationFailuresRetainRetryProvenance() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-partial-output-all-failures-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    const build = await buildBuffers(contentDir);
    let outputFailed = false;
    let journalFailed = false;
    const options = {
      writeSync(fd, data, offset, length) {
        if (!outputFailed && offset === 0 && Buffer.compare(data, build.bufs.en) === 0) {
          outputFailed = true;
          fs.writeSync(fd, data, offset, 1);
          const error = new Error('injected output EIO');
          error.code = 'EIO';
          throw error;
        }
        if (!journalFailed && offset === 0 &&
            data.includes(Buffer.from('ktav-build-output-transaction'))) {
          journalFailed = true;
          fs.writeSync(fd, data, offset, 1);
          const error = new Error('injected journal EIO');
          error.code = 'EIO';
          throw error;
        }
        return fs.writeSync(fd, data, offset, length);
      },
      unlinkSync(filePath) {
        if (path.basename(filePath).startsWith('.spec.md.') && filePath.endsWith('.tmp')) {
          const error = new Error('injected output unlink EACCES');
          error.code = 'EACCES';
          throw error;
        }
        fs.unlinkSync(filePath);
      },
    };

    assert.throws(() => writeBuildOutputs(versionDir, contentDir, build, options), /injected output EIO/);
    assert.equal(outputFailed, true);
    assert.equal(journalFailed, true);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), true);
    assert.equal(fs.readdirSync(versionDir).some((name) => name.startsWith('.spec.md.') && name.endsWith('.tmp')), true);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.json')), false);

    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function partialCandidateClaimAndLeaseMetadataResumesAfterInitialCleanupFailure() {
  const cases = [
    ['candidate', 'candidate'],
    ['claim', 'claim'],
    ['lease', 'lease'],
  ];
  for (const [family, mode] of cases) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ktav-${family}-partial-resume-`));
    try {
      const versionDir = path.join(temp, 'version');
      const contentDir = path.join(versionDir, 'content');
      const fixtures = baseFixtures();
      makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
      const build = await buildBuffers(contentDir);
      if (mode === 'claim') {
        write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify({
          format: 'ktav-build-output-lock', version: 3, pid: 999999999,
          incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
        }) + '\n');
      }
      let metadataWrite = 0;
      let metadataFailed = false;
      let cleanupFailed = false;
      const options = {
        processIncarnation: '11111111111111111111111111111111',
        writeSync(fd, data, offset, length) {
          const isClaim = data.includes(Buffer.from('ktav-build-output-lock-claim'));
          const isMetadata = data.includes(Buffer.from('ktav-build-output-lock'));
          if (isMetadata) metadataWrite++;
          const failNow = !metadataFailed &&
            ((mode === 'candidate' && metadataWrite === 1 && !isClaim) ||
             (mode === 'claim' && isClaim) ||
             (mode === 'lease' && metadataWrite === 2));
          if (failNow) {
            metadataFailed = true;
            fs.writeSync(fd, data, offset, 1);
            const error = new Error(`injected ${family} metadata EIO`);
            error.code = 'EIO';
            throw error;
          }
          return fs.writeSync(fd, data, offset, length);
        },
        unlinkSync(filePath) {
          const name = path.basename(filePath);
          if (!cleanupFailed && name.startsWith(`.build-spec.transaction.lock.${mode}.`) && name.endsWith('.tmp')) {
            cleanupFailed = true;
            const error = new Error(`injected ${family} cleanup EACCES`);
            error.code = 'EACCES';
            throw error;
          }
          fs.unlinkSync(filePath);
        },
      };

      assert.throws(() => writeBuildOutputs(versionDir, contentDir, build, options),
        new RegExp(`injected ${family} metadata EIO`));
      assert.equal(metadataFailed, true);
      assert.equal(cleanupFailed, true);
      assert.ok(fs.readdirSync(versionDir).some((name) =>
        name.startsWith(`.build-spec.transaction.lock.${mode}.`) && name.endsWith('.tmp')));

      assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build, options));
      assert.equal(fs.readdirSync(versionDir).some((name) => name.startsWith('.build-spec.transaction.lock.')), false);
      assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}

export async function candidateClaimAndLeaseWriteFailuresCleanPrivateMetadataBeforeRetry() {
  const cases = [
    ['candidate', null],
    ['claim', 'claim'],
    ['lease', 'lease'],
  ];
  for (const [family, mode] of cases) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ktav-${family}-write-failure-`));
    try {
      const versionDir = path.join(temp, 'version');
      const contentDir = path.join(versionDir, 'content');
      const fixtures = baseFixtures();
      makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
      const build = await buildBuffers(contentDir);
      if (mode === 'claim') {
        write(path.join(versionDir, '.build-spec.transaction.lock'), JSON.stringify({
          format: 'ktav-build-output-lock', version: 3, pid: 999999999,
          incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
        }) + '\n');
      }

      let calls = 0;
      const failure = new Error(`injected ${family} metadata write failure`);
      assert.throws(
        () => writeBuildOutputs(versionDir, contentDir, build, {
          writeSync(fd, data, offset, length) {
            calls++;
            const failNow = mode === 'lease' ? calls === 2 : calls === 1;
            if (failNow) throw failure;
            return fs.writeSync(fd, data, offset, length);
          },
        }),
        new RegExp(`injected ${family} metadata write failure`)
      );
      assert.deepEqual(
        [versionDir, contentDir].flatMap((directory) => fs.readdirSync(directory)
          .filter((name) => name.startsWith('.build-spec.transaction.lock.') &&
            (name.includes('.tmp') || name.includes('.candidate.') || name.includes('.owner.') ||
             name.includes('.claim.') || name.includes('.lease.')))),
        []
      );
      assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), mode === 'claim');
      assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
      assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}

export async function publishedTransactionJournalContainsOnlyExactDerivedRecordsAndRejectsCraftedPaths() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-journal-schema-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const manifestPath = path.join(contentDir, 'manifest.js');
    const manifestBefore = fs.readFileSync(manifestPath);
    write(path.join(versionDir, '.build-spec.transaction.json'), JSON.stringify({
      format: 'ktav-build-output-transaction',
      version: 1,
      items: [{ destination: manifestPath, tempPath: manifestPath, backupPath: manifestPath }],
    }) + '\n');

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (error) => /invalid schema|invalid header|unsupported/.test(error.message) &&
        !(error instanceof TypeError)
    );
    assert.deepEqual(fs.readFileSync(manifestPath), manifestBefore);
    assert.equal(fs.existsSync(path.join(versionDir, '.build-spec.transaction.lock')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function recoveryCleansAnUnpublishedJournalTmpButNeverTreatsItAsAJournal() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-journal-torn-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const torn = path.join(versionDir, '.build-spec.transaction.json.tmp');
    write(torn, '{"phase":"installing"');
    recoverBuildOutputTransaction(versionDir, contentDir);
    assert.equal(fs.existsSync(torn), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function checkReportsPendingTransactionArtifactsWithoutRemovingOrRewritingThem() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-check-transaction-'));
  try {
    const scriptDir = path.join(temp, 'scripts');
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    installGenerator(scriptDir);
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    write(path.join(contentDir, 'release.js'), realReleaseJs());
    write(path.join(temp, 'scripts', 'locks', 'section-inventory.0.7.lock.json'),
      JSON.stringify({
        format: 'ktav-section-inventory',
        units: lockUnits(fixtures, fixtures.map((u) => u.name)),
        version: REAL_RELEASE.version,
      }, null, 2) + '\n');
    copyHandwrittenRootFiles(temp);
    const build = await buildBuffers(contentDir, { requireSectionInventoryLock: true });
    writeBuildOutputs(versionDir, contentDir, build);
    const torn = path.join(versionDir, '.build-spec.transaction.json.tmp');
    const lock = path.join(versionDir, '.build-spec.transaction.lock');
    write(torn, 'torn unpublished journal');
    write(lock, 'dead-owner lock must remain byte-identical\n');
    const before = new Map([torn, lock].map((file) => [file, fs.readFileSync(file)]));
    const result = spawnSync(process.execPath, [path.join(scriptDir, 'build_spec.mjs'), '--check'], {
      cwd: temp, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending\/interrupted transaction artifact/);
    for (const [file, bytes] of before) assert.deepEqual(fs.readFileSync(file), bytes, file);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function normalCliWriteRecoversPreJournalOutputsBeforeClosedWorldValidation() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-cli-prejournal-recovery-'));
  try {
    const scriptDir = path.join(temp, 'scripts');
    const versionDir = path.join(temp, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    fs.mkdirSync(path.join(scriptDir, 'locks'), { recursive: true });
    installGenerator(scriptDir);
    const fixtures = baseFixtures();
    makeContent(versionDir, fixtures, fixtures.map((u) => u.name));
    write(path.join(contentDir, 'release.js'), realReleaseJs());
    write(path.join(scriptDir, 'locks', 'section-inventory.0.7.lock.json'),
      JSON.stringify({
        format: 'ktav-section-inventory',
        units: lockUnits(fixtures, fixtures.map((u) => u.name)),
        version: REAL_RELEASE.version,
      }, null, 2) + '\n');
    copyHandwrittenRootFiles(temp);
    const expected = await buildBuffers(contentDir);
    const scriptUrl = pathToFileURL(path.join(scriptDir, 'build_spec.mjs')).href;
    const source = `
      import { buildBuffers, writeBuildOutputs } from ${JSON.stringify(scriptUrl)};
      const versionDir = ${JSON.stringify(versionDir)};
      const contentDir = ${JSON.stringify(contentDir)};
      const build = await buildBuffers(contentDir);
      writeBuildOutputs(versionDir, contentDir, build);
    `;
    const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: temp,
      env: { ...process.env, KTAV_BUILD_SPEC_CRASH_BEFORE_FIRST_JOURNAL: '1' },
      encoding: 'utf8',
    });
    assert.notEqual(crashed.status, 0);
    assert.ok(fs.readdirSync(contentDir).some((name) => name.endsWith('.tmp')));

    const result = spawnSync(process.execPath, [path.join(scriptDir, 'build_spec.mjs')], {
      cwd: temp, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readdirSync(versionDir).some((name) => name.endsWith('.tmp')), false);
    assert.equal(fs.readdirSync(contentDir).some((name) => name.endsWith('.tmp')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), expected.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

