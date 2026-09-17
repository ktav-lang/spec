// Artifacts from older lock formats, and metadata that is not what it
// claims to be. Every emitted legacy family must be recognised by the
// release and quarantine namespace; a metadata symlink is rejected
// before its target is read and a FIFO before it is opened.

import {
  buildBuffers,
  recoverBuildOutputTransaction,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import { baseFixtures, makeContent, symlinksSupported, write } from '../../helpers.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function aCrashAfterCapturingMalformedLegacyBytesIsRecoveredByTheNextWrite() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-legacy-quarantine-recovery-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const source = Buffer.from(
      'garbage {"pid":999999999,"incarnation":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"', 'utf8');
    const legacyPath = path.join(versionDir, '.build-spec.transaction.lock.candidate');
    write(legacyPath, source);
    let quarantinePath;

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build, {
        onLockRecordCaptured({ quarantinePath: capturedPath }) {
          quarantinePath = capturedPath;
          throw new Error('simulated interruption');
        },
      }),
      /simulated interruption/
    );
    const digest = createHash('sha256').update(source).digest('hex').slice(0, 16);
    assert.ok(quarantinePath);
    assert.equal(path.dirname(quarantinePath), versionDir);
    assert.match(
      path.basename(quarantinePath),
      new RegExp(`^\\.build-spec\\.transaction\\.lock\\.quarantine\\.legacy\\.[0-9a-f]{32}\\.${digest}$`, 'u')
    );
    assert.equal(fs.existsSync(legacyPath), false);
    assert.deepEqual(fs.readFileSync(quarantinePath), source);

    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
    assert.equal(fs.existsSync(quarantinePath), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
    assert.doesNotThrow(() => writeBuildOutputs(versionDir, contentDir, build));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function releaseAndQuarantineNamespaceAcceptsEveryEmittedLegacyFamily() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-release-namespace-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const owner = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
    };
    for (const [index, phase] of [
      'stale-claim', 'quarantine-cleanup', 'target-missing', 'target-changed',
      'target-replaced', 'reclaim-complete', 'acquisition-cleanup', 'owner-live',
    ].entries()) {
      const claim = {
        format: 'ktav-build-output-lock-claim', version: 1,
        pid: 999999999, incarnation: 'cccccccccccccccccccccccccccccccc',
        nonce: `${(index + 1).toString(16).padStart(32, '0')}`, createdAt: 0, target: owner,
      };
      const reclaimerNonce = `${(index + 9).toString(16).padStart(32, '0')}`;
      write(path.join(versionDir,
        `.build-spec.transaction.lock.quarantine.claim.${reclaimerNonce}.` +
        `${owner.nonce}.${claim.nonce}.${phase}`), JSON.stringify(claim) + '\n');
    }
    write(path.join(versionDir, `.build-spec.transaction.lock.release.${owner.nonce}`),
      JSON.stringify(owner) + '\n');
    for (const kind of ['legacy-claim', 'legacy-lease']) {
      write(path.join(versionDir, `.build-spec.transaction.lock.release.${owner.nonce}.${kind}`),
        JSON.stringify(owner) + '\n');
    }
    writeBuildOutputs(versionDir, contentDir, build);
    assert.equal(fs.readdirSync(versionDir).some((name) =>
      name.startsWith('.build-spec.transaction.lock.')), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function releaseAndQuarantineMetadataSymlinksAreRejectedBeforeTheirTargetsAreRead(t) {  if (!symlinksSupported()) {
    t.skip('symlink creation unavailable; this test MUST run on POSIX CI');
    return;
  }
  const cases = [
    {
      artifact(owner) {
        return `.build-spec.transaction.lock.release.${owner.nonce}`;
      },
      contents(owner) { return owner; },
      diagnostic: /transaction lock release claim .*not a regular file \(symlink/,
    },
    {
      artifact(owner, claim) {
        return `.build-spec.transaction.lock.quarantine.claim.dddddddddddddddddddddddddddddddd.` +
          `${owner.nonce}.${claim.nonce}.stale-claim`;
      },
      contents(_owner, claim) { return claim; },
      diagnostic: /transaction lock claim quarantine .*not a regular file \(symlink/,
    },
  ];
  for (const [index, fixture] of cases.entries()) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), `ktav-metadata-symlink-${index}-`));
    try {
      const versionDir = path.join(temp, 'version');
      const contentDir = path.join(versionDir, 'content');
      makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
      const owner = {
        format: 'ktav-build-output-lock', version: 3, pid: 999999999,
        incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
      };
      const claim = {
        format: 'ktav-build-output-lock-claim', version: 1, pid: 999999999,
        incarnation: 'cccccccccccccccccccccccccccccccc',
        nonce: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', createdAt: 0, target: owner,
      };
      const targetPath = path.join(temp, `outside-${index}.json`);
      const artifactPath = path.join(versionDir, fixture.artifact(owner, claim));
      write(targetPath, JSON.stringify(fixture.contents(owner, claim)) + '\n');
      fs.symlinkSync(targetPath, artifactPath, 'file');
      const originalReadFileSync = fs.readFileSync;
      let artifactOpened = false;
      fs.readFileSync = function (filePath, ...args) {
        if (path.resolve(filePath) === path.resolve(artifactPath)) artifactOpened = true;
        return originalReadFileSync.call(this, filePath, ...args);
      };
      try {
        assert.throws(
          () => recoverBuildOutputTransaction(versionDir, contentDir),
          fixture.diagnostic
        );
      } finally {
        fs.readFileSync = originalReadFileSync;
      }
      assert.equal(artifactOpened, false);
      assert.equal(fs.lstatSync(artifactPath).isSymbolicLink(), true);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}

export async function releaseMetadataFIFOIsRejectedWithoutOpeningIt(t) {  if (process.platform === 'win32') {
    t.skip('POSIX-only FIFO regression');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-metadata-fifo-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const artifactPath = path.join(versionDir,
      '.build-spec.transaction.lock.release.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const made = spawnSync('mkfifo', [artifactPath], { encoding: 'utf8' });
    assert.equal(made.status, 0, made.stderr);
    const originalReadFileSync = fs.readFileSync;
    let artifactOpened = false;
    fs.readFileSync = function (filePath, ...args) {
      if (path.resolve(filePath) === path.resolve(artifactPath)) artifactOpened = true;
      return originalReadFileSync.call(this, filePath, ...args);
    };
    try {
      assert.throws(
        () => recoverBuildOutputTransaction(versionDir, contentDir),
        /transaction lock release claim .*not a regular file \(special file/
      );
    } finally {
      fs.readFileSync = originalReadFileSync;
    }
    assert.equal(artifactOpened, false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function releaseRecoveryRemovesAnOrphanFinalLeaseAfterOwnerCapture() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-orphan-final-lease-'));
  try {
    const versionDir = path.join(temp, 'version');
    const contentDir = path.join(versionDir, 'content');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const build = await buildBuffers(contentDir);
    const owner = {
      format: 'ktav-build-output-lock', version: 3, pid: 999999999,
      incarnation: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nonce: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', leaseUntil: 0,
    };
    write(path.join(versionDir, `.build-spec.transaction.lock.release.${owner.nonce}`), JSON.stringify(owner) + '\n');
    write(path.join(versionDir, `.build-spec.transaction.lock.release.${owner.nonce}.owner`), JSON.stringify(owner) + '\n');
    write(path.join(versionDir, `.build-spec.transaction.lock.lease.${owner.nonce}`), JSON.stringify(owner) + '\n');
    writeBuildOutputs(versionDir, contentDir, build);
    const names = fs.readdirSync(versionDir);
    assert.equal(names.some((name) => name.includes(owner.nonce)), false);
    assert.deepEqual(fs.readFileSync(path.join(versionDir, 'spec.md')), build.bufs.en);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
