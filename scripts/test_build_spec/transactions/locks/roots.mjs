// The write roots themselves. A specification directory, a content
// directory or any ancestor of either may not be a symlink, and
// contentDir must resolve to the real content child of specDir --
// each checked BEFORE a temporary output is created, so a rejected
// build never touches the tree it was pointed at.

import {
  buildBuffers,
  checkBuildOutputs,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import {
  baseFixtures,
  directoryLinksSupported,
  makeContent,
  makeDirectoryLink,
  write,
} from '../../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function writeBuildRejectsASpecificationDirectorySymlinkBeforeCreatingTemporaryOutputs(t) {  if (!directoryLinksSupported()) {
    t.skip('directory symlink/junction creation unavailable; this test MUST run when directory links are supported');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-root-link-'));
  try {
    const realVersionDir = path.join(temp, 'real-version');
    const versionDir = path.join(temp, 'version-link');
    makeContent(realVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    makeDirectoryLink(realVersionDir, versionDir);
    const contentDir = path.join(versionDir, 'content');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /specDir path component .* is a symlink or junction/.test(e.message)
    );
    assert.deepEqual(
      fs.readdirSync(realVersionDir).filter((name) => name.endsWith('.tmp')),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function checkBuildRejectsASpecificationDirectorySymlinkBeforeReadingGeneratedOutputs(t) {  if (!directoryLinksSupported()) {
    t.skip('directory symlink/junction creation unavailable; this test MUST run when directory links are supported');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-check-root-link-'));
  try {
    const realVersionDir = path.join(temp, 'real-version');
    const versionDir = path.join(temp, 'version-link');
    makeContent(realVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    makeDirectoryLink(realVersionDir, versionDir);
    const contentDir = path.join(versionDir, 'content');
    const build = await buildBuffers(path.join(realVersionDir, 'content'));

    assert.throws(
      () => checkBuildOutputs(versionDir, contentDir, build),
      (e) => /specDir path component .* is a symlink or junction/.test(e.message)
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRejectsAContentDirectorySymlinkBeforeCreatingTemporaryOutputs(t) {  if (!directoryLinksSupported()) {
    t.skip('directory symlink/junction creation unavailable; this test MUST run when directory links are supported');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-content-link-'));
  try {
    const sourceVersionDir = path.join(temp, 'source-version');
    const versionDir = path.join(temp, 'version');
    makeContent(sourceVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    fs.mkdirSync(versionDir);
    makeDirectoryLink(path.join(sourceVersionDir, 'content'), path.join(versionDir, 'content'));
    const contentDir = path.join(versionDir, 'content');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /contentDir path component .* is a symlink or junction/.test(e.message)
    );
    assert.deepEqual(
      fs.readdirSync(versionDir).filter((name) => name.endsWith('.tmp')),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRejectsASymlinkedAncestorOfAWriteRoot(t) {  if (!directoryLinksSupported()) {
    t.skip('directory symlink/junction creation unavailable; this test MUST run when directory links are supported');
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-ancestor-link-'));
  try {
    const realRepo = path.join(temp, 'real-repo');
    const repoLink = path.join(temp, 'repo-link');
    const realVersionDir = path.join(realRepo, 'versions', '0.7');
    makeContent(realVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    makeDirectoryLink(realRepo, repoLink);
    const versionDir = path.join(repoLink, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /specDir path component .* is a symlink or junction/.test(e.message)
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export async function writeBuildRequiresContentDirToBeTheResolvedContentChildOfSpecDir() {  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-root-shape-'));
  try {
    const versionDir = path.join(temp, 'version');
    const otherVersionDir = path.join(temp, 'other-version');
    makeContent(versionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    makeContent(otherVersionDir, baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1']);
    const contentDir = path.join(otherVersionDir, 'content');
    const build = await buildBuffers(contentDir);

    assert.throws(
      () => writeBuildOutputs(versionDir, contentDir, build),
      (e) => /contentDir .* must resolve to the expected child .* of specDir/.test(e.message)
    );
    assert.deepEqual(
      fs.readdirSync(versionDir).filter((name) => name.endsWith('.tmp')),
      []
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
