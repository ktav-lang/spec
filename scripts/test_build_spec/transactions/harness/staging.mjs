// Staging, and what survives a failure partway through it. A partial
// output temporary must be disposable before the first journal and the
// disposal repeatable; when cleanup is only transiently unavailable the
// provenance that authorises a retry has to outlive the failure.

import {
  buildBuffers,
  recoverBuildOutputTransaction,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import { baseFixtures, makeContent, write } from '../../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
