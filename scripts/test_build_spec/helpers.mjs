import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildBuffers, README_SOURCE_FILE, validateContentDir } from '../build_spec.mjs';
import { bodyFileName, langSeparator } from '../build_spec/shared.mjs';

function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function metaJs(obj) {
  return 'export default ' + JSON.stringify(obj, null, 2) + '\n';
}

function permutations(items) {
  if (items.length <= 1) return [items];
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) result.push([items[i], ...tail]);
  }
  return result;
}

function withKeyOrder(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

// Body sources are Markdown: one `>>>>> lang=` block per language, no escaping at
// all. A block owns its trailing newline, so text that already ends in
// one is written through untouched.
function bodySource(en, ru, zh) {
  let out = '';
  for (const [lang, text] of [['en', en], ['ru', ru], ['zh', zh]]) {
    out += langSeparator(lang) + '\n' + text;
    if (text.length > 0 && !text.endsWith('\n')) out += '\n';
  }
  return out;
}

// kind: 'frontmatter' | 'named' | 'numbered'
function unitMeta(kind, opts = {}) {
  const { __num, ...rest } = opts;
  if (kind === 'frontmatter') {
    return { kind: 'frontmatter', number: null, level: null, title: null, bodyParts: 1, ...rest };
  }
  if (kind === 'named') {
    return {
      kind: 'named', number: null, level: 2,
      title: { en: 'Abstract', ru: 'Аннотация', zh: '摘要' },
      bodyParts: 1, ...rest,
    };
  }
  return {
    kind: 'numbered', number: __num || '1', sep: '. ', level: 2,
    title: { en: 'Intro', ru: 'Введение', zh: '引言' },
    bodyParts: 1, ...rest,
  };
}

// unit defs: { name, meta, bodies: [[en,ru,zh], ...] }
const TEST_RELEASE = { version: '4.5.6', released: '2020-06-01' };

// The real repo's hand-maintained root files (versions.ktav + the three root
// READMEs) must be consistent with this, per versions/0.8/content/release.js.
const REAL_RELEASE = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'versions', '0.8', 'content', 'release.js'), 'utf8')
    .replace(/^export default /, ''));

// What a real repository root holds, for fixtures that run the CLI over
// a temp copy. `versions.ktav` is the only genuinely hand-written entry
// left; README and CHANGELOG are now generated from their `.source.md`,
// and the sources must be copied WITH them. An artifact arriving without
// its source is precisely the state the builder refuses — correctly, and
// this list going stale is what made it refuse a fixture.
const HANDWRITTEN_ROOT_FILES = [
  'versions.ktav',
  'README.source.md',
  'README.md', 'README.ru.md', 'README.zh.md',
  'CHANGELOG.source.md',
  'CHANGELOG.md', 'CHANGELOG.ru.md', 'CHANGELOG.zh.md',
];

// Appendix A's entry for the current version. Not a root file — it lives
// in a content unit, and meta is never token-substituted, which is
// exactly why it needs checking rather than generating.
//
// The unit sits inside a group directory, so its LOCATION comes from the
// manifest. Only its NAME is fixed.
const REAL_MANIFEST = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'versions', '0.8', 'content', 'manifest.js'), 'utf8')
    .replace(/^export default /, ''));

const APPENDIX_UNIT = REAL_MANIFEST.find(
  (unit) => unit.slice(unit.lastIndexOf('/') + 1) === `sec-${REAL_RELEASE.version}`);

const APPENDIX_META_REL = `versions/0.8/content/${APPENDIX_UNIT}/meta.js`;

function copyHandwrittenRootFiles(root) {
  for (const rel of HANDWRITTEN_ROOT_FILES) {
    fs.copyFileSync(path.join(process.cwd(), rel), path.join(root, rel));
  }
}

// Root files PLUS the Appendix A unit. Kept separate from
// copyHandwrittenRootFiles because some tests build a synthetic
// content/ directory in the same temp root and then run the real
// builder over it: dropping the real sec-<version> unit in there makes
// closed-world validation reject it as a directory not in manifest.js.
// Only the drift-check tests want both.
function copyDriftCheckInputs(root) {
  copyHandwrittenRootFiles(root);
  const metaDest = path.join(root, APPENDIX_META_REL);
  fs.mkdirSync(path.dirname(metaDest), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), APPENDIX_META_REL), metaDest);
  // The appendix check first asks the manifest whether this tree has an
  // Appendix A at all — that is how synthetic content directories opt
  // out. Copy the real one so these tests are checking the real
  // behaviour rather than the opt-out path.
  const manifestRel = 'versions/0.8/content/manifest.js';
  fs.copyFileSync(path.join(process.cwd(), manifestRel), path.join(root, manifestRel));
}

function realReleaseJs() {
  return 'export default ' + JSON.stringify(REAL_RELEASE, null, 2) + '\n';
}

function makeContent(dir, unitDefs, manifestNames) {
  write(path.join(dir, 'content', 'package.json'), '{\n  "type": "module"\n}\n');
  write(path.join(dir, 'content', 'release.js'),
    'export default ' + JSON.stringify(TEST_RELEASE, null, 2) + '\n');
  for (const readme of ['README.md', 'README.ru.md', 'README.zh.md']) {
    write(path.join(dir, 'content', readme), '# content README\n');
  }
  write(path.join(dir, 'content', README_SOURCE_FILE),
    bodySource('# content README\n', '# content README\n', '# content README\n'));
  for (const u of unitDefs) {
    const ud = path.join(dir, 'content', u.name);
    write(path.join(ud, 'meta.js'), metaJs(u.meta));
    const bodies = u.bodies || [['text.\n\n', 'текст.\n\n', '文本。\n\n']];
    bodies.forEach((b, i) => {
      write(path.join(ud, bodyFileName(i + 1)), bodySource(b[0], b[1], b[2]));
    });
    for (const extra of u.extraFiles || []) {
      write(path.join(ud, extra.name), extra.content);
    }
  }
  write(path.join(dir, 'content', 'manifest.js'),
    'export default ' + JSON.stringify(manifestNames, null, 2) + '\n');
}

function lockUnits(unitDefs, manifestNames) {
  const byName = new Map(unitDefs.map((unit) => [unit.name, unit.meta]));
  return manifestNames.map((unit) => {
    const meta = byName.get(unit);
    return {
      unit,
      kind: meta.kind,
      number: meta.number,
      level: meta.level,
      sep: meta.kind === 'numbered' ? meta.sep : null,
    };
  });
}

const LAST = ['end.\n', 'конец.\n', '结束。\n'];
const MID = ['mid.\n\n', 'середина.\n\n', '中间。\n\n'];

function baseFixtures() {
  return [
    { name: 'frontmatter', meta: unitMeta('frontmatter'), bodies: [['# Frontmatter\n\nfm.\n\n', '# Frontmatter\n\nфм.\n\n', '# Frontmatter\n\n前言。\n\n']] },
    { name: 'named-abstract', meta: unitMeta('named'), bodies: [MID] },
    { name: 'sec-1', meta: unitMeta('numbered', { __num: '1' }), bodies: [LAST] },
  ];
}

async function validate(fixtures, manifest, mutate, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-test-'));
  try {
    makeContent(dir, fixtures, manifest || fixtures.map((u) => u.name));
    if (mutate) mutate(path.join(dir, 'content'));
    const validateOptions = {};
    if (options.lock) {
      const lockPath = path.join(dir, 'section-inventory.lock.json');
      write(lockPath, JSON.stringify({
        format: 'ktav-section-inventory',
        units: options.lock.map((unit) => typeof unit === 'string'
          ? lockUnits(fixtures, [unit])[0] : unit),
        version: TEST_RELEASE.version,
      }, null, 2) + '\n');
      validateOptions.sectionInventoryLockPath = lockPath;
    }
    return await validateContentDir(path.join(dir, 'content'), validateOptions);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

let symlinksSupportedCache = null;
function symlinksSupported() {
  if (symlinksSupportedCache === null) {
    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-symlink-probe-'));
    try {
      fs.symlinkSync('no-such-target', path.join(probeDir, 'probe'), 'file');
      symlinksSupportedCache = true;
    } catch {
      // Windows without admin/Developer Mode raises EPERM.
      symlinksSupportedCache = false;
    } finally {
      fs.rmSync(probeDir, { recursive: true, force: true });
    }
  }
  return symlinksSupportedCache;
}

let directoryLinksSupportedCache = null;
function directoryLinksSupported() {
  if (directoryLinksSupportedCache === null) {
    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-directory-link-probe-'));
    const target = path.join(probeDir, 'target');
    const link = path.join(probeDir, 'link');
    fs.mkdirSync(target);
    try {
      fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
      directoryLinksSupportedCache = true;
    } catch {
      // Windows without junction privileges may reject this even when files
      // can be created normally.
      directoryLinksSupportedCache = false;
    } finally {
      fs.rmSync(probeDir, { recursive: true, force: true });
    }
  }
  return directoryLinksSupportedCache;
}

function makeDirectoryLink(target, link) {
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

function bodyWithInteriorBlanks(lineCount, blankIndexes) {
  const lines = Array.from({ length: lineCount }, (_, i) =>
    `paragraph-${i + 1} carries content`);
  for (const blankIndex of blankIndexes) lines[blankIndex] = '';
  return lines.join('\n') + '\n';
}

function bodyWithOneInteriorBlank(lineCount, blankIndex) {
  return bodyWithInteriorBlanks(lineCount, [blankIndex]);
}

function interiorBlankCutOffsets(body) {
  const lines = body.split('\n');
  const cuts = [];
  let offset = 0;
  for (const line of lines.slice(0, -1)) {
    offset += line.length + 1;
    if (line === '' && offset < body.length) cuts.push(offset);
  }
  return cuts;
}

function splitBody(body, cut) {
  return [body.slice(0, cut), body.slice(cut)];
}

function sameLanguageBodies(parts) {
  return parts.map((part) => [part, part, part]);
}

function zipLanguageBodies(en, ru, zh) {
  return en.map((_, i) => [en[i], ru[i], zh[i]]);
}

async function buildInTemp(fixtures, mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-release-'));
  try {
    makeContent(dir, fixtures, fixtures.map((u) => u.name));
    if (mutate) mutate(path.join(dir, 'content'));
    return await buildBuffers(path.join(dir, 'content'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function tokenFixtures() {
  const fmBody = [
    '# Fm\n\n**Version:** @@VERSION@@\n**Date:** @@DATE@@\n\n',
    '# Fm\n\n**Версия:** @@VERSION@@\n**Дата:** @@DATE@@\n\n',
    '# Fm\n\n**版本:** @@VERSION@@\n**日期:** @@DATE@@\n\n',
  ];
  const fx = baseFixtures();
  fx[0].bodies = [fmBody];
  return fx;
}


// Copy the generator (hub + its ./build_spec/ module tree) into a synthetic
// repo's scripts/ directory so spawned CLI tests run the real, split code.
function installGenerator(scriptDir) {
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), 'scripts', 'build_spec.mjs'),
    path.join(scriptDir, 'build_spec.mjs'));
  fs.cpSync(path.join(process.cwd(), 'scripts', 'build_spec'),
    path.join(scriptDir, 'build_spec'), { recursive: true });
}

export { write, metaJs, permutations, withKeyOrder, bodySource, unitMeta, TEST_RELEASE, REAL_RELEASE, HANDWRITTEN_ROOT_FILES, APPENDIX_META_REL, copyHandwrittenRootFiles, copyDriftCheckInputs, realReleaseJs, makeContent, lockUnits, LAST, MID, baseFixtures, validate, symlinksSupportedCache, symlinksSupported, directoryLinksSupportedCache, directoryLinksSupported, makeDirectoryLink, bodyWithInteriorBlanks, bodyWithOneInteriorBlank, interiorBlankCutOffsets, splitBody, sameLanguageBodies, zipLanguageBodies, buildInTemp, installGenerator, tokenFixtures };
