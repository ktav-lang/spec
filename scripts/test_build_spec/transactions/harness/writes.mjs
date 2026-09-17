// The write primitive underneath the transaction: every file write
// preserves its offset across a short write, and a write that makes zero
// progress is rejected rather than looped on.

import {
  LANGS,
  OUT_FILES,
  README_FILES,
  buildBuffers,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import { baseFixtures, makeContent, write } from '../../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
