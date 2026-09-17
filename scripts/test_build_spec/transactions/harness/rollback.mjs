// Rollback. A failed atomic rename preserves the destination and cleans
// its temporary; a later rename rolls back all six outputs; an
// unrestorable backup is preserved rather than discarded while the other
// outputs still roll back; and a committed build is never rolled back
// just because its backup cleanup failed.

import {
  LANGS,
  OUT_FILES,
  README_FILES,
  buildBuffers,
  recoverBuildOutputTransaction,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import { baseFixtures, makeContent, write } from '../../helpers.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
