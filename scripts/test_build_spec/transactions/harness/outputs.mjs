// The six generated outputs as destinations: restoring the content
// READMEs from README.source.md, and refusing to write through a
// destination symlink, read through a generated-file symlink, or create
// temporaries beside a directory standing where a README should be.

import {
  LANGS,
  README_FILES,
  README_SOURCE_FILE,
  buildBuffers,
  checkBuildOutputs,
  writeBuildOutputs,
} from '../../../build_spec.mjs';
import {
  TEST_RELEASE,
  baseFixtures,
  bodySource,
  lockUnits,
  makeContent,
  symlinksSupported,
  write,
} from '../../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function writeBuildRestoresMissingGeneratedContentReadmesFromReadmeSourceJs() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-readme-write-'));
  try {
    const versionDir = path.join(temp, 'versions', '0.8');
    const contentDir = path.join(versionDir, 'content');
    const fixtures = baseFixtures();
    const manifest = fixtures.map((u) => u.name);
    const expected = { en: '# EN README\n', ru: '# RU README\n', zh: '# ZH README\n' };
    makeContent(versionDir, fixtures, manifest);
    write(path.join(contentDir, README_SOURCE_FILE),
      bodySource(expected.en, expected.ru, expected.zh));
    write(path.join(temp, 'scripts', 'locks', 'section-inventory.0.8.lock.json'),
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
    const versionDir = path.join(temp, 'versions', '0.8');
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
    const versionDir = path.join(temp, 'versions', '0.8');
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
