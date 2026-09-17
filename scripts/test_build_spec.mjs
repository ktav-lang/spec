// test_build_spec.mjs — adversarial node:test suite for scripts/build_spec.mjs
// Run: node --test scripts/test_build_spec.mjs
// Builds self-contained fixtures in temp dirs; the only real-repo inputs are
// the three content READMEs (README.md / README.ru.md / README.zh.md), read
// by the README acceptance test.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import {
  validateContentDir,
  hasLoneSurrogate,
  firstByteDiff,
  lineNumberAtByte,
  lineAtByte,
  formatMismatchDiagnostic,
  buildBuffers,
  checkBuildOutputs,
  writeBuildOutputs,
  defaultSectionInventoryLockPath,
  LANGS,
  OUT_FILES,
  README_FILES,
  README_SOURCE_FILE,
  validateMeta,
  findHeadings,
  splitPlan,
  MAX_BODY_PARTS,
  recoverBuildOutputTransaction,
  checkHandwrittenVersionReferences,
  writeSectionInventoryLock,
} from './build_spec.mjs';

import { installGenerator } from './test_build_spec/helpers.mjs';

import * as references from './test_build_spec/references.mjs';
import * as rawSource from './test_build_spec/markdown/raw-source.mjs';
import * as locks from './test_build_spec/locks.mjs';
import * as transactions from './test_build_spec/transactions.mjs';

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

function escTemplate(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function bodyJs(en, ru, zh) {
  return 'export default {\n' +
    '  en: `' + escTemplate(en) + '`,\n' +
    '  ru: `' + escTemplate(ru) + '`,\n' +
    '  zh: `' + escTemplate(zh) + '`,\n' +
    '};\n';
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
// READMEs) must be consistent with this, per versions/0.7/content/release.js.
const REAL_RELEASE = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'versions', '0.7', 'content', 'release.js'), 'utf8')
    .replace(/^export default /, ''));

const HANDWRITTEN_ROOT_FILES = [
  'versions.ktav',
  'README.md', 'README.ru.md', 'README.zh.md',
  'CHANGELOG.md', 'CHANGELOG.ru.md', 'CHANGELOG.zh.md',
];

// Appendix A's entry for the current version. Not a root file — it lives
// in a content unit, and meta is never token-substituted, which is
// exactly why it needs checking rather than generating.
const APPENDIX_META_REL =
  `versions/0.7/content/sec-${REAL_RELEASE.version}/meta.js`;

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
  const manifestRel = 'versions/0.7/content/manifest.js';
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
    bodyJs('# content README\n', '# content README\n', '# content README\n'));
  for (const u of unitDefs) {
    const ud = path.join(dir, 'content', u.name);
    write(path.join(ud, 'meta.js'), metaJs(u.meta));
    const bodies = u.bodies || [['text.\n\n', 'текст.\n\n', '文本。\n\n']];
    bodies.forEach((b, i) => {
      write(path.join(ud, `body-${i + 1}.js`), bodyJs(b[0], b[1], b[2]));
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

test('well-formed minimal fixture passes cleanly', async () => {
  const { manifest } = await validate(baseFixtures());
  assert.deepEqual(manifest, ['frontmatter', 'named-abstract', 'sec-1']);
});

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

test('release token substitution renders version and date in every language', async () => {
  const { bufs } = await buildInTemp(tokenFixtures());
  for (const lang of LANGS) {
    assert.equal(bufs[lang].includes('@@VERSION@@'), false);
    assert.equal(bufs[lang].includes('@@DATE@@'), false);
  }
  assert.equal(bufs.en.includes('**Version:** 4.5.6\n'), true);
  assert.equal(bufs.en.includes('**Date:** 2020-06-01\n'), true);
  assert.equal(bufs.ru.includes('**Версия:** 4.5.6\n'), true);
  assert.equal(bufs.ru.includes('**Дата:** 2020-06-01\n'), true);
  assert.equal(bufs.zh.includes('**版本:** 4.5.6\n'), true);
  assert.equal(bufs.zh.includes('**日期:** 2020-06-01\n'), true);
});

test('release token substitution applies in non-frontmatter unit bodies too', async () => {
  const fx = baseFixtures();
  fx[2].bodies = [['end. @@VERSION@@\n', 'конец. @@VERSION@@\n', '结束。 @@VERSION@@\n']];
  const { bufs } = await buildInTemp(fx);
  assert.equal(bufs.en.includes('## 1. Intro\nend. 4.5.6\n'), true);
  assert.equal(bufs.en.includes('@@VERSION@@'), false);
});

test('README.source.js passes release tokens through verbatim (no substitution)', async () => {
  const { readmeBufs } = await buildInTemp(baseFixtures(), (content) => {
    write(path.join(content, README_SOURCE_FILE),
      bodyJs('# content README @@VERSION@@\n', '# r\n', '# r\n'));
  });
  assert.equal(readmeBufs.en.includes('@@VERSION@@'), true);
  assert.equal(readmeBufs.en.includes(TEST_RELEASE.version), false);
});

test('a release token surviving via a meta title fails the build', async () => {
  const fx = baseFixtures();
  fx[1].meta = unitMeta('named', { title: { en: 'Intro @@VERSION@@', ru: 'Введение', zh: '引言' } });
  await assert.rejects(
    buildInTemp(fx),
    /built spec\.md still contains release placeholder @@VERSION@@/
  );
});

test('validateContentDir rejects a missing release.js', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (content) => {
      fs.rmSync(path.join(content, 'release.js'));
    }),
    /release\.js/
  );
});

test('validateContentDir rejects a non-canonical release.js serialization', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (content) => {
      write(path.join(content, 'release.js'),
        'export default ' + JSON.stringify(TEST_RELEASE, null, 4) + '\n');
    }),
    /canonical serialization/
  );
});

test('validateContentDir rejects malformed release.js shapes', async () => {
  const badValues = [
    { version: '4.5.6', released: '2020-06-01', extra: 'x' },
    { released: '2020-06-01', version: '4.5.6' },
    { version: '1.2', released: '2020-06-01' },
    { version: '4.5.6', released: '2020-6-1' },
    { version: 456, released: '2020-06-01' },
  ];
  for (const value of badValues) {
    await assert.rejects(
      validate(baseFixtures(), null, (content) => {
        write(path.join(content, 'release.js'),
          'export default ' + JSON.stringify(value, null, 2) + '\n');
      }),
      /release\.js/,
      JSON.stringify(value)
    );
  }
});

test('section inventory lock version must match release.js version', async () => {
  const fixtures = baseFixtures();
  const manifest = fixtures.map((u) => u.name);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-lockver-'));
  try {
    makeContent(dir, fixtures, manifest);
    const lockPath = path.join(dir, 'section-inventory.lock.json');
    write(lockPath, JSON.stringify({
      format: 'ktav-section-inventory',
      units: lockUnits(fixtures, manifest),
      version: '9.9.9',
    }, null, 2) + '\n');
    await assert.rejects(
      validateContentDir(path.join(dir, 'content'), { sectionInventoryLockPath: lockPath }),
      (e) => e.message.includes('"9.9.9"') && e.message.includes('"4.5.6"')
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('unit bodies reject injected ATX headings independently in EN, RU and ZH', async () => {
  for (const langIndex of [0, 1, 2]) {
    const fx = baseFixtures();
    const body = ['body.\n\n', 'body.\n\n', 'body.\n\n'];
    body[langIndex] += '## 1. Intro\n\n';
    fx[1].bodies = [body];
    await assert.rejects(
      validate(fx),
      (e) => new RegExp(
        `unit "named-abstract": ${LANGS[langIndex]}: unit body contains an ATX heading`
      ).test(e.message),
      `${LANGS[langIndex]} injected heading must be rejected`
    );
  }
});

test('unit bodies reject injected Setext H1 and H2 headings', async () => {
  for (const underline of ['===', '---']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`Injected title\n${underline}\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      (e) => /unit "named-abstract": en: unit body contains a Setext heading/.test(e.message)
    );
  }
});

test('a single dash uses Setext precedence over an empty list marker', async () => {
  for (const body of [
    'Root paragraph\n-\n\n',
    '> Blockquote paragraph\n> -\n\n',
    '- List paragraph\n  -\n\n',
    'Root paragraph\n+\n---\n\n',
    'Root paragraph\n*\n---\n\n',
    'Root paragraph\n1.\n---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading/,
      body
    );
  }
});

test('only an empty list marker gets Setext precedence over an active paragraph', async () => {
  for (const body of [
    'Root paragraph\n- content\n---\n\n',
    'Root paragraph\n+ content\n---\n\n',
    'Root paragraph\n* content\n---\n\n',
    'Root paragraph\n1. content\n---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  const realListHeading = baseFixtures();
  realListHeading[1].bodies = [sameLanguageBodies([
    'Root paragraph\n- ## real list heading\n\n',
  ])[0]];
  await assert.rejects(
    validate(realListHeading),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );
});

test('Setext precedence applies only to truly empty markers in the active container', async () => {
  for (const body of [
    'Root paragraph\n- ## list heading\n\n',
    'Root paragraph\n  - ## nested list heading\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }

  for (const marker of ['+', '*', '1.']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `Root paragraph\n${marker}\n===\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading/,
      marker
    );
  }
});

test('a Unicode separator is content, not ASCII blank, before a Setext underline', async () => {
  for (const separator of ['\u2028', '\u00a0']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `- list paragraph\n${separator}\n===\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading/,
      `U+${separator.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
    );
  }
});

test('ATX-looking lines inside backtick and tilde fences are accepted', async () => {
  const fenced =
    '```text\n' +
    '# inside backticks\n' +
    'Setext inside backticks\n' +
    '---\n' +
    '```\n\n' +
    '~~~text\n' +
    '## inside tildes\n' +
    'Setext inside tildes\n' +
    '===\n' +
    '~~~\n\n';
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies([fenced])[0]];
  await assert.doesNotReject(validate(fx));
});

test('a standalone thematic break is not treated as a Setext heading', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies(['---\n\n'])[0]];
  await assert.doesNotReject(validate(fx));
});

test('unit heading checks normalize blockquote/list containers without treating indented code as prose', async () => {
  const rejected = [
    ['> ## injected\n\n', /unit "named-abstract": en: unit body contains an ATX heading/],
    ['> Title\n> ---\n\n', /unit "named-abstract": en: unit body contains a Setext heading/],
    ['- ## injected\n\n', /unit "named-abstract": en: unit body contains an ATX heading/],
    ['- Title\n  ---\n\n', /unit "named-abstract": en: unit body contains a Setext heading/],
  ];
  for (const [body, expected] of rejected) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(validate(fx), expected, JSON.stringify(body));
  }

  for (const body of [
    '\tindented code\n---\n\n',
    '    indented code\n---\n\n',
    '> text\n---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), JSON.stringify(body));
  }
});

test('heading checks recursively normalize blockquote and list containers in either order', async () => {
  const rejected = [
    '> - ## nested',
    '- > ## nested',
    '> - > - ## deeply nested',
    '- > - > ## deeply nested',
    '> - Title\n>   ---',
    '- > Title\n  > ---',
    '  - Title\n    ---',
  ];
  for (const body of rejected) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${body}\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains (?:an ATX|a Setext) heading/,
      body
    );
  }
});

test('fences are scoped to their container and reprocess lines that leave it', async () => {
  for (const body of [
    '- ```text\n  # inside the list fence\n  ```\n\n',
    '> - ```text\n>   # inside the nested fence\n>   ```\n\n',
    '```text\n> ## blockquote marker is root-fence code\n' +
      '- ## list marker is root-fence code\n' +
      '1. ## ordered marker is root-fence code\n' +
      '> ```\n' +
      '# still root-fence code\n```\n\n',
    '> ```text\n> > ## deeper quote marker is code\n' +
      '> > ```\n> # still quote-fence code\n' +
      '> - ## nested list marker is code\n> ```\n\n',
    '- ```text\n  > ## nested quote marker is code\n' +
      '  - ```\n  # still list-fence code\n' +
      '  - ## nested list marker is code\n  ```\n\n',
    '> - ```text\n>   > ## marker after quote/list continuation is code\n' +
      '>   - ## list marker after continuation is code\n>   ```\n\n',
    '- > ```text\n  > > ## marker after list/quote continuation is code\n' +
      '  > 1. ## ordered marker after continuation is code\n  > ```\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  for (const body of [
    '- ```text\n  # inside the list fence\n# root heading escapes the fence\n',
    '> ```text\n> # inside the quote fence\n# root heading escapes the fence\n',
    '> - ```text\n>   # inside the nested fence\n> - # sibling heading escapes the fence\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }
});

test('list-contained fences survive unindented blank lines and preserve frame state', async () => {
  for (const blanks of ['', '\n', '\n\n']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      '- ```text\n' + blanks +
      '  # still inside the list fence\n' +
      '  ```\n\n',
    ])[0]];
    await assert.doesNotReject(validate(fx), JSON.stringify(blanks));
  }

  const escaping = baseFixtures();
  escaping[1].bodies = [sameLanguageBodies([
    '- ```text\n\n' +
    '# root heading escapes the list fence\n',
  ])[0]];
  await assert.rejects(
    validate(escaping),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );
});

test('unquoted blank lines end quote fences but quoted blank lines do not', async () => {
  const unquotedBlank = baseFixtures();
  unquotedBlank[1].bodies = [sameLanguageBodies([
    '> ```text\n' +
    '> code\n' +
    '\n' +
    '# heading after the quote fence\n',
  ])[0]];
  await assert.rejects(
    validate(unquotedBlank),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );

  const quotedBlank = baseFixtures();
  quotedBlank[1].bodies = [sameLanguageBodies([
    '> ```text\n' +
    '> code\n' +
    '> \n' +
    '> # inside the quote fence\n' +
    '> ```\n\n',
  ])[0]];
  await assert.doesNotReject(validate(quotedBlank));
});

test('a normalized empty blockquote line clears the active paragraph', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies([
    '> Paragraph\n> \n> ---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(fx));
});

test('list padding consumes one to four spaces but leaves five-plus as indented code', async () => {
  for (const spaces of [1, 2, 3, 4]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`-${' '.repeat(spaces)}## injected\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      `${spaces} spaces`
    );
  }
  for (const spaces of [5, 6]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`-${' '.repeat(spaces)}## indented code\n\n`])[0]];
    await assert.doesNotReject(validate(fx), `${spaces} spaces`);
  }
  for (const body of [
    '-\t## tab-padded heading\n\n',
    '>\t## tab-padded blockquote heading\n\n',
    '- \t## tab-padded heading\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }
});

test('list fence padding expands tabs from the absolute parent column', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies([
    '  -\t```text\n' +
    '\t# inside the list fence\n' +
    '\t```\n' +
    '  - ## heading after the fence\n\n',
  ])[0]];
  await assert.rejects(
    validate(fx),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );

  const noFalseRed = baseFixtures();
  noFalseRed[1].bodies = [sameLanguageBodies([
    '  -\t```text\n' +
    '\t# inside the list fence\n' +
    '\t```\n\n',
  ])[0]];
  await assert.doesNotReject(validate(noFalseRed));
});

test('active paragraphs survive non-interrupting indented and lazy continuation lines', async () => {
  for (const body of [
    'Root paragraph\n    indented continuation\n---\n\n',
    '- List paragraph\nlazy continuation\n  ---\n\n',
    '> Paragraph\nlazy continuation\n> ---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading/,
      body
    );
  }

  const interrupted = baseFixtures();
  interrupted[1].bodies = [sameLanguageBodies([
    'Root paragraph\n- content\n---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(interrupted));

  const lazyOrdered = baseFixtures();
  lazyOrdered[1].bodies = [sameLanguageBodies([
    '> Paragraph\n2. lazy continuation\n> ---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(lazyOrdered));
});

test('ordered list interruption follows the CommonMark start-number rule', async () => {
  const nonInterrupting = baseFixtures();
  nonInterrupting[1].bodies = [sameLanguageBodies([
    'paragraph remains active\n2. ## accepted paragraph content\n\n',
  ])[0]];
  await assert.doesNotReject(validate(nonInterrupting));

  const interrupting = baseFixtures();
  interrupting[1].bodies = [sameLanguageBodies([
    'paragraph remains active\n1. ## injected list heading\n\n',
  ])[0]];
  await assert.rejects(
    validate(interrupting),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );

  for (const body of [
    'paragraph remains active\n01. ## injected list heading\n\n',
    'paragraph remains active\n000000001. ## injected list heading\n\n',
  ]) {
    const leadingZero = baseFixtures();
    leadingZero[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(leadingZero),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }

  const nonOneWithLeadingZero = baseFixtures();
  nonOneWithLeadingZero[1].bodies = [sameLanguageBodies([
    'paragraph remains active\n000000002. ## paragraph content\n\n',
  ])[0]];
  await assert.doesNotReject(validate(nonOneWithLeadingZero));

  const sibling = baseFixtures();
  sibling[1].bodies = [sameLanguageBodies([
    '1. first\n2. # hidden in the next list item\n\n',
  ])[0]];
  await assert.rejects(
    validate(sibling),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );
});

test('Setext and block-start lines do not become lazy continuations after an interrupted list', async () => {
  const directList = baseFixtures();
  directList[1].bodies = [sameLanguageBodies([
    '- item\n===\n\n',
  ])[0]];
  await assert.doesNotReject(validate(directList));

  const falseRed = baseFixtures();
  falseRed[1].bodies = [sameLanguageBodies([
    'text\n+ item\n===\n\n',
  ])[0]];
  await assert.doesNotReject(validate(falseRed));

  const lazyQuote = baseFixtures();
  lazyQuote[1].bodies = [sameLanguageBodies([
    '> Paragraph\n2. lazy continuation\n> ---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(lazyQuote));

  for (const body of [
    '> 1. first\n> 2. # hidden\n\n',
    '> prose\n2. # heading\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }
});

test('Setext-looking lazy continuation preserves its open list container', async () => {
  const hiddenHeading = baseFixtures();
  hiddenHeading[1].bodies = [sameLanguageBodies([
    '- text\n===\n    # injected heading\n\n',
  ])[0]];
  await assert.rejects(
    validate(hiddenHeading),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );

  const indentedCode = baseFixtures();
  indentedCode[1].bodies = [sameLanguageBodies([
    '- text\n===\n      # list-item indented code\n\n',
  ])[0]];
  await assert.doesNotReject(validate(indentedCode));
});

test('tab-expanded container columns remain absolute and fenced tab content stays opaque', async () => {
  for (const body of [
    '  -\t```text\n' +
      '\t# inside the list fence\n' +
      '\t```\n' +
      '  - ## heading after the fence\n\n',
    '>  -\t```text\n' +
      '> \t# inside the nested fence\n' +
      '> \t```\n' +
      '>  - ## heading after the fence\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }

  const fenced = baseFixtures();
  fenced[1].bodies = [sameLanguageBodies([
    '```text\n\t# tabbed code\n```\n\n',
  ])[0]];
  await assert.doesNotReject(validate(fenced));
});

test('tabs after blockquote markers preserve CommonMark heading boundaries', async () => {
  for (const body of [
    '>\t# injected heading\n\n',
    '> \tTitle\n> \t---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains (?:an ATX|a Setext) heading/,
      body
    );
  }

  for (const body of [
    '>\tordinary continuation\n\n',
    '> \t---\n\n',
    '> -\t```text\n> \t# nested fence content\n> \t```\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }
});

test('all seven CommonMark HTML block opener families are forbidden outside fences', async () => {
  for (const [opener, type] of [
    ['<script>', 1],
    ['<textarea>', 1],
    ['<!-- comment -->', 2],
    ['<?processing-instruction>', 3],
    ['<!DOCTYPE html>', 4],
    ['<!doctype html>', 4],
    ['<![CDATA[data]]>', 5],
    ['<div>', 6],
    ['<div', 6],
    ['</table', 6],
    ['<h1', 6],
    ['<frame>', 6],
    ['<frameset>', 6],
    ['<noframes>', 6],
    ['<optgroup>', 6],
    ['<option>', 6],
    ['<param>', 6],
    ['<param/>', 6],
    ['<param />', 6],
    ['<span>', 7],
    ['<span title=">">', 7],
    ['<x-widget data-id="42" enabled>', 7],
    ["<x-widget data-id='42' path=/docs />", 7],
    ['</x-widget   >', 7],
    ['<div>type 6 remains prefix-based</div>', 6],
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${opener}\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      new RegExp(
        `unit "named-abstract": en: unit body contains a raw HTML block opener ` +
        `\\(CommonMark type ${type}\\)`
      ),
      opener
    );
  }

  const fenced = baseFixtures();
  fenced[1].bodies = [sameLanguageBodies([
    '```html\n<div>allowed in a confirmed fence</div>\n```\n\n',
  ])[0]];
  await assert.doesNotReject(validate(fenced));

  for (const prose of ['<div/x', '<div/extra>', '<param/extra>']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${prose}\n\n`])[0]];
    await assert.doesNotReject(validate(fx), prose);
  }

  const multiline = baseFixtures();
  multiline[1].bodies = [sameLanguageBodies([
    '<h1\n# hidden heading\n\n',
  ])[0]];
  await assert.rejects(
    validate(multiline),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 6\)/
  );
});

test('CommonMark HTML type 7 requires a standalone syntactically complete tag', async () => {
  for (const prose of [
    '<https://example.com>',
    '<person@example.com>',
    '<foo.bar>',
    '<span>inline prose</span>',
    '<x-widget bad==value>',
    '<x-widget title="unterminated>',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${prose}\n\n`])[0]];
    await assert.doesNotReject(validate(fx), prose);
  }
});

test('CommonMark HTML type 7 continues an active paragraph but interrupts at block start', async () => {
  for (const prose of ['<span>', '</span>', '<x-widget enabled>']) {
    const continuation = baseFixtures();
    continuation[1].bodies = [sameLanguageBodies([
      `paragraph\n${prose}\n\n`,
    ])[0]];
    await assert.doesNotReject(validate(continuation), prose);

    const blockStart = baseFixtures();
    blockStart[1].bodies = [sameLanguageBodies([`${prose}\n\n`])[0]];
    await assert.rejects(
      validate(blockStart),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      prose
    );
  }

  for (const body of [
    '- paragraph\n<span>\n\n',
    '> paragraph\n<span>\n\n',
  ]) {
    const continuation = baseFixtures();
    continuation[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(continuation), body);
  }
});

test('link reference definitions do not create type 7 paragraph context', async () => {
  for (const definition of [
    '[ref]: /url',
    ' [with-title]: <https://example.com/a b> "title"',
    '[escaped\\]]: /url',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${definition}\n<span>\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      definition
    );
  }

  const listDefinition = baseFixtures();
  listDefinition[1].bodies = [sameLanguageBodies([
    '- paragraph\n- [ref]: /url\n  <span>\n\n',
  ])[0]];
  await assert.rejects(
    validate(listDefinition),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/
  );

  for (const prose of [
    'inline [ref]: /url',
    '[]: /url',
    '[ref]: /url trailing prose',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${prose}\n<span>\n\n`])[0]];
    await assert.doesNotReject(validate(fx), prose);
  }
});

test('link reference definitions follow CommonMark 0.31.2 multiline and boundary rules', async () => {
  for (const body of [
    '[ref]: /url\n  "title"\n<span>\n\n',
    '[ref]:\n/url\n<span>\n\n',
    '[ref]:\n  /url\n  "title"\n<span>\n\n',
    '> [ref]:\n>   /url\n>   "title"\n> <span>\n\n',
    '- [ref]:\n  /url\n  "title"\n  <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }

  const multilineLabel = baseFixtures();
  multilineLabel[1].bodies = [sameLanguageBodies([
    '[\nfoo\n]: /url\n<span>\n\n',
  ])[0]];
  await assert.rejects(
    validate(multilineLabel),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/
  );

  for (const body of [
    'Foo\n[bar]: /baz\n[bar]\n\n',
    'Foo\n[bar]: /baz\n<span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  for (const body of [
    'Foo\n- [bar]: /baz\n<span>\n\n',
    '> Foo\n> - [bar]: /baz\n> <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }

  for (const body of [
    '- Foo\n  [bar]: /baz\n  <span>\n\n',
    '> Foo\n> [bar]: /baz\n> <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  for (const body of [
    '[ref]: /url\\ x\n<span>\n\n',
    `[ref]: /url${String.fromCharCode(0x7f)}\n<span>\n\n`,
    `[ref]: a${'('.repeat(33)}${')'.repeat(33)}\n<span>\n\n`,
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  for (const nesting of [32]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `[ref]: a${'('.repeat(nesting)}${')'.repeat(nesting)}\n<span>\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/
    );
  }

  for (const count of [499, 500, 999]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `[${'😀'.repeat(count)}]: /url\n<span>\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      `${count} Unicode code points`
    );
  }

  for (const count of [1000]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `[${'😀'.repeat(count)}]: /url\n<span>\n\n`,
    ])[0]];
    await assert.doesNotReject(validate(fx), `${count} Unicode code points`);
  }
});

test('speculative link definitions replay every buffered line when they roll back', async () => {
  for (const body of [
    '[\n# injected\n] not-a-definition\n\n',
    "[ref]: /url '\n# injected\n\n",
    '> [ref]:\n# injected\n\n',
    "[ref]: /url '\n# injected",
    '[\n# injected',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading outside a fenced code block/,
      body
    );
  }

  const setext = baseFixtures();
  setext[1].bodies = [sameLanguageBodies([
    '[\nTitle\n] not-a-definition\n---\n\n',
  ])[0]];
  await assert.rejects(
    validate(setext),
    /unit "named-abstract": en: unit body contains a Setext heading outside a fenced code block/
  );

  const html = baseFixtures();
  html[1].bodies = [sameLanguageBodies([
    '[\n<div>\n] not-a-definition\n\n',
  ])[0]];
  await assert.rejects(
    validate(html),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 6\)/
  );
});

test('link reference definitions allow lazy continuation inside containers', async () => {
  for (const body of [
    '> [ref]:\n/url\n> <span>\n\n',
    '- [ref]:\n/url\n  <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }
});

test('thematic breaks take precedence over list items in every container', async () => {
  for (const body of [
    '* item\n* * *\n  <span>\n\n',
    '> * item\n> * * *\n>   <span>\n\n',
    '- outer\n  * item\n  * * *\n    <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }
});

test('link-label limits count source code points before tab expansion', async () => {
  const exactly999 = baseFixtures();
  exactly999[1].bodies = [sameLanguageBodies([
    `[x\t${'a'.repeat(997)}]: /url\n<span>\n\n`,
  ])[0]];
  await assert.rejects(
    validate(exactly999),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/
  );

  const exactly1000 = baseFixtures();
  exactly1000[1].bodies = [sameLanguageBodies([
    `[x\t${'a'.repeat(998)}]: /url\n<span>\n\n`,
  ])[0]];
  await assert.doesNotReject(validate(exactly1000));
});

test('thematic breaks close a list before following indented code', async () => {
  for (const body of [
    '- item\n---\n    # code, not a heading\n\n',
    '- item\n---\n    <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }
});

test('thematic breaks are checked after every nested list marker', () => {
  for (const body of [
    '- * * *\n      # indented code\n',
    '> - * * *\n>       # indented code\n',
    '- > * * *\n      >       # indented code\n',
    '> - > * * *\n>       >       # indented code\n',
  ]) {
    assert.deepEqual(findHeadings(body), [], body);
  }
});

test('speculative link definitions stop at paragraph-interrupting block openers', async () => {
  for (const body of [
    '[ref]: /url "\n# injected\n"\n\n',
    '[\n# injected\n]: /url\n\n',
    '[ref]: /url "\n```\n# hidden\n```\n"\n# injected\n\n',
    '[ref]: /url "\n---\nTitle\n---\n"\n\n',
    '[ref]: /url "\n> # injected\n"\n\n',
    '[ref]: /url "\n- # injected\n"\n\n',
    '[ref]: /url "\n<script>\n"\n\n',
    '[ref]: /url "\n<!-- comment -->\n"\n\n',
    '[ref]: /url "\n<?pi>\n"\n\n',
    '[ref]: /url "\n<!DOCTYPE html>\n"\n\n',
    '[ref]: /url "\n<![CDATA[data]]>\n"\n\n',
    '[ref]: /url "\n<div>\n"\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(validate(fx), body);
  }

  const type7 = baseFixtures();
  type7[1].bodies = [sameLanguageBodies([
    '[ref]: /url "\n<span>\n"\n\n',
  ])[0]];
  await assert.doesNotReject(validate(type7));
});

test('Setext underlines interrupt only incomplete link reference definitions', async () => {
  for (const [body, level] of [
    ['[\n===\n]: /url\n\n', 1],
    ['[\n---\n]: /url\n\n', 2],
    ['[ref]:\n===\n\n', null],
    ['[ref]: /url "\n===\n"\n\n', null],
    ['[ref]:\n---\n\n', null],
    ['[ref]: /url "\n---\n"\n\n', null],
  ]) {
    if (level !== null) assert.equal(findHeadings(body)[0]?.level, level);
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading outside a fenced code block/,
      body
    );
  }

  // CommonMark example 216: the destination completes the definition, so the
  // following underline is ordinary paragraph content rather than a heading.
  for (const body of [
    '[foo]: /url\n===\n[foo]\n\n',
    '[foo]: /url\n---\n[foo]\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }
});

test('suppressed Setext interruption completes lazy link definitions before type-7 HTML', async () => {
  for (const body of [
    '- [ref]:\n===\n<span>\n\n',
    '> - [ref]:\n===\n<span>\n\n',
    '- > [ref]:\n===\n<span>\n\n',
    '> - > [ref]:\n===\n<span>\n\n',
  ]) {
    const headings = findHeadings(body);
    assert.equal(headings.length, 1, body);
    assert.equal(headings[0].type, 'HTML', body);
    assert.equal(headings[0].htmlType, 7, body);
    assert.equal(headings[0].line, 3, body);
    assert.equal(headings[0].container, 'root', body);

    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }
});

test('large unterminated link-definition rollback is iterative and non-variadic', () => {
  const source = fs.readFileSync(new URL('./build_spec/units/containers.mjs', import.meta.url), 'utf8');
  const rollback = source.match(
    /const rollbackLinkDefinition = \(\) => \{[\s\S]*?\n  \};/
  )?.[0];
  assert.ok(rollback, 'rollback implementation should remain locally inspectable');
  assert.doesNotMatch(rollback, /\.\.\./, 'rollback must not use spread arguments');
  assert.match(rollback, /queue\[linkDefinition\.startCursor\]\.skipLinkDefinition/,
    'rollback must rewind by cursor instead of rebuilding the queue');

  const body = '[ref]: /url "\n' + 'title line\n'.repeat(256);
  assert.deepEqual(findHeadings(body), []);
});

test('link definition continuations allow indented code and preserve tab remainders', async () => {
  const indented = baseFixtures();
  indented[1].bodies = [sameLanguageBodies([
    '[ref]:\n    /url\n    "title"\n---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(indented));

  const tabbedBlockquote = baseFixtures();
  tabbedBlockquote[1].bodies = [sameLanguageBodies([
    '>\t[ref]: /url\n> ---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(tabbedBlockquote));
});

test('CommonMark NUL preprocessing applies only to U+0000 in destinations', async () => {
  const nul = baseFixtures();
  nul[1].bodies = [sameLanguageBodies([
    `[ref]: a${String.fromCharCode(0)}b\n---\n\n`,
  ])[0]];
  await assert.doesNotReject(validate(nul));

  for (const control of [1, 0x7f]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `[ref]: a${String.fromCharCode(control)}b\n---\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading outside a fenced code block/,
      `U+${control.toString(16).toUpperCase().padStart(4, '0')}`
    );
  }
});

test('an invalid maybe-title candidate does not roll back its completed definition', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies([
    '[ref]: /url\n"title" trailing\n\n',
  ])[0]];
  await assert.doesNotReject(validate(fx));
});

test('fence marker lengths follow CommonMark 4-backtick/3-backtick behavior', async () => {
  for (const body of [
    '````md\n### inside\n```\n````\n\n',
    '```md\n### inside\n````\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx));
  }
});

test('frontmatter rejects an extra ATX heading after its intended h1', async () => {
  const fx = baseFixtures();
  const body = '# Frontmatter\n\n## injected\n\n';
  fx[0].bodies = [sameLanguageBodies([body])[0]];
  await assert.rejects(
    validate(fx),
    /unit "frontmatter": en: frontmatter must contain exactly one ATX level-1 heading and no other ATX\/Setext heading \(found 2\)/
  );
});

test('frontmatter rejects an extra Setext heading after its intended h1', async () => {
  const fx = baseFixtures();
  fx[0].bodies = [sameLanguageBodies(['# Frontmatter\n\nInjected title\n---\n\n'])[0]];
  await assert.rejects(
    validate(fx),
    /unit "frontmatter": en: frontmatter must contain exactly one ATX level-1 heading and no other ATX\/Setext heading \(found 2\)/
  );
});

test('frontmatter rejects a sole Setext H1 in place of its required ATX H1', async () => {
  const fx = baseFixtures();
  fx[0].bodies = [sameLanguageBodies(['Frontmatter\n===\n\n'])[0]];
  await assert.rejects(
    validate(fx),
    /unit "frontmatter": en: frontmatter must contain exactly one ATX level-1 heading and no other ATX\/Setext heading \(found 1\)/
  );
});

test('meta.js enforces the documented top-level and nested property order', () => {
  const cases = [
    {
      kind: 'frontmatter',
      unit: 'frontmatter',
      value: unitMeta('frontmatter'),
      keys: ['kind', 'number', 'level', 'title', 'bodyParts'],
    },
    {
      kind: 'numbered',
      unit: 'sec-1',
      value: unitMeta('numbered', { __num: '1' }),
      keys: ['kind', 'number', 'sep', 'level', 'title', 'bodyParts'],
    },
    {
      kind: 'named',
      unit: 'named-order',
      value: unitMeta('named'),
      keys: ['kind', 'number', 'level', 'title', 'bodyParts'],
    },
  ];

  for (const { value, unit, keys } of cases) {
    for (const order of permutations(keys)) {
      const candidate = withKeyOrder(value, order);
      if (order.every((key, i) => key === keys[i])) {
        assert.doesNotThrow(() => validateMeta(unit, candidate));
      } else {
        assert.throws(
          () => validateMeta(unit, candidate),
          /meta\.js keys must be in documented order/
        );
      }
    }
  }

  for (const { value, unit } of cases.slice(1)) {
    for (const order of permutations(['en', 'ru', 'zh'])) {
      const candidate = {
        ...value,
        title: withKeyOrder(value.title, order),
      };
      if (order.join() === 'en,ru,zh') {
        assert.doesNotThrow(() => validateMeta(unit, candidate));
      } else {
        assert.throws(
          () => validateMeta(unit, candidate),
          /title keys must be in documented order/
        );
      }
    }
  }
});

test('production-shaped content uses the default section inventory lock under repo/scripts', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-production-path-'));
  try {
    const repoRoot = path.join(temp, 'repo');
    const versionDir = path.join(repoRoot, 'versions', '0.7');
    const contentDir = path.join(versionDir, 'content');
    const manifest = ['frontmatter', 'named-abstract', 'sec-1'];
    makeContent(versionDir, baseFixtures(), manifest);
    const lockPath = path.join(repoRoot, 'scripts', 'locks', 'section-inventory.0.7.lock.json');
    write(lockPath, JSON.stringify({
      format: 'ktav-section-inventory',
      units: lockUnits(baseFixtures(), manifest),
      version: TEST_RELEASE.version,
    }, null, 2) + '\n');

    assert.equal(defaultSectionInventoryLockPath(contentDir), lockPath);
    const result = await validateContentDir(contentDir, { requireSectionInventoryLock: true });
    assert.deepEqual(result.manifest, manifest);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('section inventory lock rejects deleting a unit and its manifest entry together', async () => {
  const original = ['frontmatter', 'named-abstract', 'sec-1'];
  await assert.rejects(
    validate(baseFixtures(), ['frontmatter', 'named-abstract'], (c) =>
      fs.rmSync(path.join(c, 'sec-1'), { recursive: true }), { lock: original }),
    (e) => /section-inventory\.lock\.json does not match manifest\.js at index 2/.test(e.message)
  );
});

test('section inventory lock rejects hierarchy metadata mutations', async () => {
  for (const field of ['level', 'kind', 'number', 'sep']) {
    const fx = baseFixtures();
    const records = lockUnits(fx, fx.map((unit) => unit.name));
    records[2][field] = field === 'level' ? 3
      : field === 'kind' ? 'named'
        : field === 'number' ? '3.1' : ' ';
    await assert.rejects(
      validate(fx, null, null, { lock: records }),
      (e) => new RegExp(
        `(?:structural record for unit "sec-1" differs from meta\\.js field "${field}"|units\\[2\\] has invalid|units\\[2\\] must use null)`
      ).test(e.message)
    );
  }
});

test('section inventory lock leaves title prose unlocked', async () => {
  const fx = baseFixtures();
  const records = lockUnits(fx, fx.map((unit) => unit.name));
  fx[2].meta.title.en = 'Renamed prose title';
  await assert.doesNotReject(validate(fx, null, null, { lock: records }));
});

test('generated heading classification rejects numbered syntax in unlocked named titles', async () => {
  const fx = baseFixtures();
  const records = lockUnits(fx, fx.map((unit) => unit.name));
  fx[1].meta.title = { en: '99 Review', ru: '99 Review', zh: '99 Review' };
  await assert.rejects(
    validate(fx, null, null, { lock: records }),
    /unit "named-abstract": en: named title must not match numbered-heading syntax/
  );
});

test('named titles reject every numbered-heading prefix shape but allow prose', async () => {
  const numberedTitles = [
    '99',
    '99 Review',
    '99-Review',
    '99.Review',
    '99:Review',
    '99/Review',
    '9.9',
    '9.9 Review',
    '9.9-Review',
    '9.9.Review',
    '9.9:Review',
    '9.9/Review',
    '2026',
    '2026 Review',
    '2026-Review',
    '2026.Review',
    '2026:Review',
    '2026/Review',
  ];
  for (const title of numberedTitles) {
    const fx = baseFixtures();
    const records = lockUnits(fx, fx.map((unit) => unit.name));
    fx[1].meta.title = { en: title, ru: title, zh: title };
    await assert.rejects(
      validate(fx, null, null, { lock: records }),
      /unit "named-abstract": en: named title must not match numbered-heading syntax/,
      title
    );
  }

  for (const title of [
    'Review 99',
    '99Review',
    '99_Review',
    '2026\u041e\u0431\u0437\u043e\u0440',
    '2026\u6982\u89c8',
  ]) {
    const fx = baseFixtures();
    const records = lockUnits(fx, fx.map((unit) => unit.name));
    fx[1].meta.title = { en: title, ru: title, zh: title };
    await assert.doesNotReject(
      validate(fx, null, null, { lock: records }),
      title
    );
  }
});

test('README source object rejects a non-canonical shape', async () => {
  const expected = 'unit "content": README.source.js: expected exactly ' +
    JSON.stringify(',\n};\n') +
    ' after the zh field followed immediately by end-of-file, found ' +
    JSON.stringify(',\n  de: `d\n`,\n};\n'.slice(0, 20));
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, README_SOURCE_FILE),
        'export default {\n' +
        '  en: `a\n`,\n' +
        '  ru: `b\n`,\n' +
        '  zh: `c\n`,\n' +
        '  de: `d\n`,\n' +
        '};\n')),
    (e) => e.message === expected
  );
});

test('first byte diff and line number are correct at offset zero and after newlines', () => {
  assert.equal(firstByteDiff(Buffer.from('x\nsecond\n'), Buffer.from('y\nsecond\n')), 0);
  assert.equal(firstByteDiff(Buffer.from('first\nX\n'), Buffer.from('first\nY\n')), 6);
  assert.equal(firstByteDiff(Buffer.from('same\n'), Buffer.from('same\n')), -1);
  assert.equal(firstByteDiff(Buffer.from('same'), Buffer.from('same\n')), 4);
  assert.equal(lineNumberAtByte(Buffer.from('x\nsecond\n'), 0), 1);
  assert.equal(lineNumberAtByte(Buffer.from('first\nY\n'), 6), 2);
  assert.equal(lineNumberAtByte(Buffer.from('same'), 4), 1);
  assert.equal(lineAtByte(Buffer.from('first\nsecond\n'), 0), JSON.stringify('first'));
  assert.equal(lineAtByte(Buffer.from('first\nsecond\n'), 6), JSON.stringify('second'));
});

test('spec mismatch diagnostic excerpts the differing line after a newline', () => {
  const existing = Buffer.from('first\nactual line\n');
  const generated = Buffer.from('first\nexpected line\n');
  const diff = firstByteDiff(existing, generated);
  assert.equal(diff, 6);
  assert.equal(
    formatMismatchDiagnostic('spec.md', 'en', existing, generated, diff, 'sec-1'),
    'build_spec --check: MISMATCH in spec.md (en) at byte offset 6, line 2, unit "sec-1":\n' +
    '  generated: "expected line"\n' +
    '  existing:  "actual line"\n'
  );
});

test('orphan unit directory not listed in manifest', async () => {
  await assert.rejects(
    validate(baseFixtures(), null,
      (c) => fs.mkdirSync(path.join(c, 'sec-2'))),
    (e) => /unexpected directory under content\/: "sec-2" \(not in manifest\.js\)/.test(e.message)
  );
});

test('manifest entry with no corresponding directory', async () => {
  await assert.rejects(
    validate(baseFixtures(), ['frontmatter', 'named-abstract', 'sec-1', 'sec-9']),
    (e) => /manifest lists unit "sec-9" but its directory is missing/.test(e.message)
  );
});

test('extra body-2.js while meta.bodyParts is 1', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-2.js'), bodyJs('x\n', 'y\n', 'z\n'))),
    (e) => /unit "sec-1": unexpected extra file body-2\.js beyond meta\.bodyParts 1/.test(e.message)
  );
});

test('meta.bodyParts=2 but body-2.js missing', async () => {
  const fx = baseFixtures();
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  await assert.rejects(
    validate(fx),
    (e) => /unit "sec-1": missing body-2\.js \(meta\.bodyParts is 2\)/.test(e.message)
  );
});

test('bodyParts accepts safe existing values and rejects invalid or excessive counts before file iteration', () => {
  assert.doesNotThrow(() => validateMeta('sec-1', unitMeta('numbered', { __num: '1', bodyParts: 1 })));
  assert.doesNotThrow(() => validateMeta('sec-1', unitMeta('numbered', { __num: '1', bodyParts: 4 })));
  for (const value of [0, -1, Number.MAX_SAFE_INTEGER + 1, 1e308, MAX_BODY_PARTS + 1]) {
    assert.throws(
      () => validateMeta('sec-1', unitMeta('numbered', { __num: '1', bodyParts: value })),
      (e) => /bad bodyParts/.test(e.message) &&
        (value === 1e308 || value === MAX_BODY_PARTS + 1
          ? /safe integer between 1 and/.test(e.message)
          : true)
    );
  }
});

test('bodyParts rejects needless splitting of a unit with at most 120 lines', async () => {
  const fx = baseFixtures();
  const body = bodyWithOneInteriorBlank(120, 59);
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = sameLanguageBodies(splitBody(body, body.indexOf('\n\n') + 2));
  await assert.rejects(
    validate(fx),
    (e) => /unit "sec-1": bodyParts 2 does not match the mandated split count 1/.test(e.message)
  );
});

test('body parts accept the mandated two-way blank-line split', async () => {
  const fx = baseFixtures();
  const body = bodyWithOneInteriorBlank(130, 64);
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = sameLanguageBodies(splitBody(body, body.indexOf('\n\n') + 2));
  const result = await validate(fx);
  assert.equal(result.units.get('sec-1').parts.length, 2);
});

test('splitPlan scales to the maximum part count with dense blank boundaries', () => {
  const lineCount = MAX_BODY_PARTS;
  const partCount = MAX_BODY_PARTS;
  const body = '\n'.repeat(lineCount);
  const plan = splitPlan(body, partCount, lineCount);
  assert.equal(plan.lineCount, lineCount);
  assert.equal(plan.blankLineCount, lineCount - 1);
  assert.equal(plan.cuts.length, partCount - 1);
  assert.equal(new Set(plan.cuts).size, partCount - 1);
  assert.deepEqual(plan.cuts.slice(0, 3), [1, 2, 3]);
  assert.equal(plan.cuts.at(-1), body.length - 1);
});

test('equidistant split tie chooses the earlier blank boundary', async () => {
  const fx = baseFixtures();
  const body = bodyWithInteriorBlanks(130, [63, 65]);
  const cuts = interiorBlankCutOffsets(body);
  assert.equal(cuts.length, 2);
  assert.equal(body.slice(0, cuts[0]).split('\n').length - 1, 64);
  assert.equal(body.slice(0, cuts[1]).split('\n').length - 1, 66);
  const parts = splitBody(body, cuts[0]);
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = sameLanguageBodies(parts);

  const result = await validate(fx);
  assert.equal(result.units.get('sec-1').parts[0].en, parts[0]);
});

test('all languages use the maximum body line count for proportional cut targets', async () => {
  const fx = baseFixtures();
  const en = bodyWithOneInteriorBlank(130, 64);
  const ru = bodyWithInteriorBlanks(80, [29, 59]);
  const zh = bodyWithOneInteriorBlank(130, 64);
  const enParts = splitBody(en, interiorBlankCutOffsets(en)[0]);
  const ruParts = splitBody(ru, interiorBlankCutOffsets(ru)[1]);
  const zhParts = splitBody(zh, interiorBlankCutOffsets(zh)[0]);
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = zipLanguageBodies(enParts, ruParts, zhParts);

  const result = await validate(fx);
  assert.equal(result.units.get('sec-1').parts[0].ru, ruParts[0]);
});

test('cut selection reserves enough later blanks to preserve the mandated part count', async () => {
  const fx = baseFixtures();
  const body = bodyWithInteriorBlanks(210, [59, 74]);
  const [firstCut, secondCut] = interiorBlankCutOffsets(body);
  const parts = [
    body.slice(0, firstCut),
    body.slice(firstCut, secondCut),
    body.slice(secondCut),
  ];
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 3 });
  fx[2].bodies = sameLanguageBodies(parts);

  const result = await validate(fx);
  assert.equal(result.units.get('sec-1').parts.length, 3);
});

test('body parts reject a mid-paragraph cut even when the body has a valid blank boundary', async () => {
  const fx = baseFixtures();
  const body = bodyWithOneInteriorBlank(130, 64);
  const firstLineCuts = [...body.matchAll(/\n/g)][19].index + 1;
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = sameLanguageBodies(splitBody(body, firstLineCuts));
  await assert.rejects(
    validate(fx),
    (e) => /unit "sec-1": en: body parts must use the mandated blank-line cut points/.test(e.message)
  );
});

test('body parts reject a mid-word cut even when the body has a valid blank boundary', async () => {
  const fx = baseFixtures();
  const body = bodyWithOneInteriorBlank(130, 64);
  const word = body.indexOf('paragraph-20');
  const midWordCut = word + 'paragraph-2'.length;
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = sameLanguageBodies(splitBody(body, midWordCut));
  await assert.rejects(
    validate(fx),
    (e) => /unit "sec-1": en: body parts must use the mandated blank-line cut points/.test(e.message)
  );
});

test('deeply nested list markers remain bounded on one short line', () => {
  const markerCount = 128;
  const body = '- '.repeat(markerCount) + 'leaf\n';
  assert.deepEqual(findHeadings(body), []);
});

test('deep active-list lazy continuations reuse the active frame state', () => {
  const markerCount = 128;
  const continuationCount = 128;
  const body = '- '.repeat(markerCount) + 'paragraph\n' +
    'lazy continuation\n'.repeat(continuationCount);
  assert.deepEqual(findHeadings(body), []);
});

test('deep list fences reuse their list-only classification across blank lines', () => {
  const markerCount = 128;
  const blankCount = 128;
  const markers = '- '.repeat(markerCount);
  const body = markers + '```\n' + '\n'.repeat(blankCount) +
    markers + '```\n';
  assert.deepEqual(findHeadings(body), []);
});

test('deeply nested fenced containers preserve hidden and visible headings', () => {
  const markerCount = 128;
  const markers = '> '.repeat(markerCount);
  const body =
    markers + '```\n' +
    markers + '# hidden\n' +
    markers + '```\n' +
    '# visible\n';
  assert.deepEqual(findHeadings(body), [{
    level: 1,
    raw: '# visible',
    container: 'root',
    type: 'ATX',
    line: 4,
  }]);
});

test('adjacent content units reject an unclosed fence at every container depth', async () => {
  for (const body of [
    '~~~\ncode\n\n',
    '- ~~~\n  code\n\n',
    '- - ~~~\n    code\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body ends with an unclosed fenced code block/,
      body
    );
  }
});

test('closed fences remain valid at every content-unit container depth', async () => {
  for (const body of [
    '~~~\ncode\n~~~\n\n',
    '- ~~~\n  code\n  ~~~\n\n',
    '> ~~~\n> code\n> ~~~\n\n',
    '> - ~~~\n>   code\n>   ~~~\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }
});

test('legacy en.md/ru.md/zh.md without body files', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) => {
      for (const f of ['en.md', 'ru.md', 'zh.md']) {
        write(path.join(c, 'sec-1', f), 'Hello\n');
      }
    }),
    (e) => /unit "sec-1": legacy per-language file en\.md is not allowed under content\/; edit body-\*\.js instead/.test(e.message)
  );
});

test('legacy en.md/ru.md/zh.md alongside correct body files', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) => {
      for (const f of ['en.md', 'ru.md', 'zh.md']) {
        write(path.join(c, 'named-abstract', f), 'Hello\n');
      }
    }),
    (e) => /unit "named-abstract": legacy per-language file en\.md/.test(e.message)
  );
});

test('two units both with kind frontmatter', async () => {
  const fx = baseFixtures();
  fx[1].meta = unitMeta('frontmatter');
  fx[1].bodies = [['fm2.\n\n', 'фм2.\n\n', '前言2。\n\n']];
  await assert.rejects(
    validate(fx),
    (e) => /unit "named-abstract": frontmatter unit must be manifest\[0\], found at index 1/.test(e.message)
  );
});

test('manifest[0] is not "frontmatter"', async () => {
  const fx = baseFixtures();
  const reordered = [fx[2], fx[0], fx[1]];
  await assert.rejects(
    validate(reordered),
    (e) => /manifest\.js must start with "frontmatter"; got "sec-1"/.test(e.message)
  );
});

test('non-last unit ru final chunk ends "\\n" instead of "\\n\\n" (per-language)', async () => {
  const fx = baseFixtures();
  fx[0].bodies = [['# Frontmatter\n\nfm.\n\n', '# Frontmatter\n\nфм.\n', '# Frontmatter\n\n前言。\n\n']];
  await assert.rejects(
    validate(fx),
    (e) => /unit "frontmatter": ru: non-last unit's final chunk must end with "\\n\\n"/.test(e.message)
  );
});

test('last unit final chunk ends "\\n\\n" in en (ru/zh correct)', async () => {
  const fx = baseFixtures();
  fx[2].bodies = [['end.\n\n', 'конец.\n', '结束。\n']];
  await assert.rejects(
    validate(fx),
    (e) => /unit "sec-1": en: last unit's final chunk must end with a single "\\n" but ends with "\\n\\n"/.test(e.message)
  );
});

test('stray top-level file TODO.txt is rejected', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) => write(path.join(c, 'TODO.txt'), 'x\n')),
    (e) => /unexpected file under content\/: "TODO\.txt"/.test(e.message)
  );
});

test('rogue top-level directory is rejected', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) => fs.mkdirSync(path.join(c, 'rogue'))),
    (e) => /unexpected directory under content\/: "rogue"/.test(e.message)
  );
});

test('meta.js with an extra key is rejected', async () => {
  const fx = baseFixtures();
  fx[1].meta = { ...unitMeta('named'), altText: { en: 'x', ru: 'y', zh: 'z' } };
  await assert.rejects(
    validate(fx),
    (e) => /unit "named-abstract": meta\.js keys must be exactly .*unexpected key\(s\) "altText"/.test(e.message)
  );
});

test('body-1.js with a 4th key is rejected', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), bodyJs('a\n', 'b\n', 'c\n').replace('};', '  de: "d",\n};'))),
    (e) => /unit "sec-1": body-1\.js: expected exactly ",\\n\};\\n" after the zh field/.test(e.message)
  );
});

test('body-1.js with a missing key is rejected', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'),
        'export default {\n  en: `a\n`,\n  ru: `b\n`,\n};\n')),
    (e) => /unit "sec-1": body-1\.js: expected exactly ",\\n  zh: `" after the ru field/.test(e.message)
  );
});

test('unit directory without meta.js is rejected', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) => fs.rmSync(path.join(c, 'sec-1', 'meta.js'))),
    (e) => /unit "sec-1": missing meta\.js/.test(e.message)
  );
});

test('oddly-numbered stray body-0.js is named in the error', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-0.js'), bodyJs('x\n', 'y\n', 'z\n'))),
    (e) => /unit "sec-1": unexpected body file\(s\) body-0\.js/.test(e.message)
  );
});

test('zero-padded body aliases are rejected instead of satisfying body membership', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) => {
      fs.renameSync(path.join(c, 'sec-1', 'body-1.js'), path.join(c, 'sec-1', 'body-01.js'));
    }),
    (e) => /unit "sec-1": unexpected body file\(s\) body-01\.js/.test(e.message)
  );
});

test('subdirectory inside a unit dir is rejected', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) => fs.mkdirSync(path.join(c, 'sec-1', 'nested'))),
    (e) => /unit "sec-1": subdirectory "nested" is not allowed/.test(e.message)
  );
});

test('symlink named body-1.js inside a unit dir is rejected', async (t) => {
  if (!symlinksSupported()) {
    t.skip('symlink creation unavailable without privileges (Windows without admin/Developer Mode); this test MUST run on POSIX CI');
    return;
  }
  await assert.rejects(
    validate(baseFixtures(), null, (c) => {
      const outside = path.join(c, '..', 'outside-body.js');
      fs.writeFileSync(outside, bodyJs('x\n', 'y\n', 'z\n'));
      fs.rmSync(path.join(c, 'sec-1', 'body-1.js'));
      fs.symlinkSync(outside, path.join(c, 'sec-1', 'body-1.js'), 'file');
    }),
    (e) => /unit "sec-1": entry "body-1\.js" is not a regular file/.test(e.message)
  );
});

test('symlink named meta.js inside a unit dir is rejected', async (t) => {
  if (!symlinksSupported()) {
    t.skip('symlink creation unavailable without privileges (Windows without admin/Developer Mode); this test MUST run on POSIX CI');
    return;
  }
  await assert.rejects(
    validate(baseFixtures(), null, (c) => {
      const outside = path.join(c, '..', 'outside-meta.js');
      fs.writeFileSync(outside, bodyJs('x\n', 'y\n', 'z\n'));
      fs.rmSync(path.join(c, 'sec-1', 'meta.js'));
      fs.symlinkSync(outside, path.join(c, 'sec-1', 'meta.js'), 'file');
    }),
    (e) => /unit "sec-1": entry "meta\.js" is not a regular file/.test(e.message)
  );
});

test('meta.js title with an extra 4th key is rejected', async () => {
  const fx = baseFixtures();
  fx[1].meta = unitMeta('named');
  fx[1].meta.title = { en: 'Abstract', ru: 'Аннотация', zh: '摘要', de: 'Zusammenfassung' };
  await assert.rejects(
    validate(fx),
    (e) => /unit "named-abstract": title keys must be exactly \{en, ru, zh\}; got unexpected key\(s\) "de"/.test(e.message)
  );
});

test('meta.js title missing a key is rejected', async () => {
  const fx = baseFixtures();
  fx[1].meta = unitMeta('named');
  fx[1].meta.title = { en: 'Abstract', ru: 'Аннотация' };
  await assert.rejects(
    validate(fx),
    (e) => /unit "named-abstract": title keys must be exactly \{en, ru, zh\}; got missing key\(s\) "zh"/.test(e.message)
  );
});

test('non-last unit en final chunk ends "\\n\\n\\n" (extra blank line) is rejected', async () => {
  const fx = baseFixtures();
  fx[0].bodies = [['# Frontmatter\n\nfm.\n\n\n', '# Frontmatter\n\nфм.\n\n', '# Frontmatter\n\n前言。\n\n']];
  await assert.rejects(
    validate(fx),
    (e) => /unit "frontmatter": en: non-last unit's final chunk must end with "\\n\\n".*got "\\n\\n\\n" or more/.test(e.message)
  );
});

test('non-last unit zh final chunk ends "\\n\\n\\n\\n" (four LFs) is rejected', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [['mid.\n\n', 'середина.\n\n', '中间。\n\n\n\n']];
  await assert.rejects(
    validate(fx),
    (e) => /unit "named-abstract": zh: non-last unit's final chunk must end with "\\n\\n".*got "\\n\\n\\n" or more/.test(e.message)
  );
});

test('write build restores missing generated content READMEs from README.source.js', (t) => transactions.writeBuildRestoresMissingGeneratedContentReadmesFromReadmeSourceJs(t));

test('write build rejects a specification destination symlink without touching its target', (t) => transactions.writeBuildRejectsASpecificationDestinationSymlinkWithoutTouchingItsTarget(t));

test('check build rejects a generated spec file symlink before reading its target', (t) => transactions.checkBuildRejectsAGeneratedSpecFileSymlinkBeforeReadingItsTarget(t));

test('check build reports a missing generated output deterministically', (t) => transactions.checkBuildReportsAMissingGeneratedOutputDeterministically(t));

test('write build rejects a generated README directory before creating temporary outputs', (t) => transactions.writeBuildRejectsAGeneratedReadmeDirectoryBeforeCreatingTemporaryOutputs(t));

test('failed atomic rename preserves the destination and cleans its temporary file', (t) => transactions.failedAtomicRenamePreservesTheDestinationAndCleansItsTemporaryFile(t));

test('a later output rename rolls back all six outputs and cleans temps and backups', (t) => transactions.aLaterOutputRenameRollsBackAllSixOutputsAndCleansTempsAndBackups(t));

test('rollback preserves an unrestorable backup and continues restoring other outputs', (t) => transactions.rollbackPreservesAnUnrestorableBackupAndContinuesRestoringOtherOutputs(t));

test('backup cleanup failure never rolls back committed six-output build', (t) => transactions.backupCleanupFailureNeverRollsBackCommittedSixOutputBuild(t));

test('a child-process death after backup or install rename is recovered on the next invocation', (t) => transactions.aChildProcessDeathAfterBackupOrInstallRenameIsRecoveredOnTheNextInvocation(t));

test('all transaction file writes preserve offsets across short writes', (t) => transactions.allTransactionFileWritesPreserveOffsetsAcrossShortWrites(t));

test('a zero-progress transaction write is rejected', (t) => transactions.aZeroProgressTransactionWriteIsRejected(t));

test('a partial output temporary is disposable before the first journal and recovery is repeatable', (t) => transactions.aPartialOutputTemporaryIsDisposableBeforeTheFirstJournalAndRecoveryIsRepeatable(t));

test('partial output staging keeps journal provenance when cleanup is transiently unavailable', (t) => transactions.partialOutputStagingKeepsJournalProvenanceWhenCleanupIsTransientlyUnavailable(t));

test('partial output, output cleanup, and journal publication failures retain retry provenance', (t) => transactions.partialOutputOutputCleanupAndJournalPublicationFailuresRetainRetryProvenance(t));

test('partial candidate, claim, and lease metadata resumes after initial cleanup failure', (t) => transactions.partialCandidateClaimAndLeaseMetadataResumesAfterInitialCleanupFailure(t));

test('candidate, claim, and lease write failures clean private metadata before retry', (t) => transactions.candidateClaimAndLeaseWriteFailuresCleanPrivateMetadataBeforeRetry(t));

test('published transaction journal contains only exact derived records and rejects crafted paths', (t) => transactions.publishedTransactionJournalContainsOnlyExactDerivedRecordsAndRejectsCraftedPaths(t));

test('recovery cleans an unpublished journal tmp but never treats it as a journal', (t) => transactions.recoveryCleansAnUnpublishedJournalTmpButNeverTreatsItAsAJournal(t));

test('--check reports pending transaction artifacts without removing or rewriting them', (t) => transactions.checkReportsPendingTransactionArtifactsWithoutRemovingOrRewritingThem(t));

test('normal CLI write recovers pre-journal outputs before closed-world validation', (t) => transactions.normalCliWriteRecoversPreJournalOutputsBeforeClosedWorldValidation(t));
test('a live cooperative lock blocks a second writer without touching outputs', (t) => locks.aLiveCooperativeLockBlocksASecondWriterWithoutTouchingOutputs(t));

test('a dead owner lock is reclaimed before deterministic recovery and write', (t) => locks.aDeadOwnerLockIsReclaimedBeforeDeterministicRecoveryAndWrite(t));

test('same-nonce reclaim intent authorizes pre-journal temporary cleanup', (t) => locks.sameNonceReclaimIntentAuthorizesPreJournalTemporaryCleanup(t));

test('reclaim intent for one owner never authorizes another nonce temporary', (t) => locks.reclaimIntentForOneOwnerNeverAuthorizesAnotherNonceTemporary(t));

test('legacy pre-journal temporary with unknown provenance fails conservatively', (t) => locks.legacyPreJournalTemporaryWithUnknownProvenanceFailsConservatively(t));

test('a live PID with an unrelated incarnation blocks while an expired lease is reclaimable', (t) => locks.aLivePIDWithAnUnrelatedIncarnationBlocksWhileAnExpiredLeaseIsReclaimable(t));

test('an expired lease never reclaims a live matching incarnation', (t) => locks.anExpiredLeaseNeverReclaimsALiveMatchingIncarnation(t));

test('an unavailable process incarnation never reclaims a live PID', (t) => locks.anUnavailableProcessIncarnationNeverReclaimsALivePID(t));

test('a crash-created complete lock candidate is recovered without exposing it as the final lock', (t) => locks.aCrashCreatedCompleteLockCandidateIsRecoveredWithoutExposingItAsTheFinalLock(t));

test('a torn owner-specific candidate is discarded after its owner is proven dead', (t) => locks.aTornOwnerSpecificCandidateIsDiscardedAfterItsOwnerIsProvenDead(t));

test('claim freshness is independent of the stale target mtime', (t) => locks.claimFreshnessIsIndependentOfTheStaleTargetMtime(t));

test('a reclaimer cannot remove a replacement lock from a stale-incarnation interleaving', (t) => locks.aReclaimerCannotRemoveAReplacementLockFromAStaleIncarnationInterleaving(t));

test('two reclaimers interleave through capture hooks without losing the claim', (t) => locks.twoReclaimersInterleaveThroughCaptureHooksWithoutLosingTheClaim(t));

test('claim capture restores a replacement instead of deleting it', (t) => locks.claimCaptureRestoresAReplacementInsteadOfDeletingIt(t));

test('same-process claim quarantine cleanup resumes after one unlink failure', (t) => locks.sameProcessClaimQuarantineCleanupResumesAfterOneUnlinkFailure(t));

test('release captures and restores a replacement before removing owner artifacts', (t) => locks.releaseCapturesAndRestoresAReplacementBeforeRemovingOwnerArtifacts(t));

test('an interrupted release capture is resumable by the same process', (t) => locks.anInterruptedReleaseCaptureIsResumableByTheSameProcess(t));

test('release cleanup resumes across every owner capture and nested quarantine boundary', (t) => locks.releaseCleanupResumesAcrossEveryOwnerCaptureAndNestedQuarantineBoundary(t));

test('nested release quarantine cleanup resumes in the same process', (t) => locks.nestedReleaseQuarantineCleanupResumesInTheSameProcess(t));

test('release claim quarantine cleanup resumes in the same process', (t) => locks.releaseClaimQuarantineCleanupResumesInTheSameProcess(t));

test('reclaim removes every exact old-owner artifact but preserves replacement artifacts', (t) => locks.reclaimRemovesEveryExactOldOwnerArtifactButPreservesReplacementArtifacts(t));

test('write mode conservatively removes torn legacy lock artifacts only after owner death', (t) => locks.writeModeConservativelyRemovesTornLegacyLockArtifactsOnlyAfterOwnerDeath(t));

test('a crash after capturing malformed legacy bytes is recovered by the next write', (t) => locks.aCrashAfterCapturingMalformedLegacyBytesIsRecoveredByTheNextWrite(t));

test('release and quarantine namespace accepts every emitted legacy family', (t) => locks.releaseAndQuarantineNamespaceAcceptsEveryEmittedLegacyFamily(t));

test('release and quarantine metadata symlinks are rejected before their targets are read', (t) => locks.releaseAndQuarantineMetadataSymlinksAreRejectedBeforeTheirTargetsAreRead(t));

test('release metadata FIFO is rejected without opening it', (t) => locks.releaseMetadataFIFOIsRejectedWithoutOpeningIt(t));

test('release recovery removes an orphan final lease after owner capture', (t) => locks.releaseRecoveryRemovesAnOrphanFinalLeaseAfterOwnerCapture(t));

test('crash before first journal publication recovers derived output temporaries immediately', (t) => locks.crashBeforeFirstJournalPublicationRecoversDerivedOutputTemporariesImmediately(t));

test('crash recovery restores distinct old bytes before a later full write installs new bytes', (t) => locks.crashRecoveryRestoresDistinctOldBytesBeforeALaterFullWriteInstallsNewBytes(t));

test('distinct-byte crash matrix covers backup and install offsets, including missing destinations', (t) => locks.distinctByteCrashMatrixCoversBackupAndInstallOffsetsIncludingMissingDestinations(t));

test('write build preserves the missing-backup recovery error without mutating the remaining outputs', (t) => locks.writeBuildPreservesTheMissingBackupRecoveryErrorWithoutMutatingTheRemainingOutputs(t));

test('write build rejects a specification directory symlink before creating temporary outputs', (t) => locks.writeBuildRejectsASpecificationDirectorySymlinkBeforeCreatingTemporaryOutputs(t));

test('check build rejects a specification directory symlink before reading generated outputs', (t) => locks.checkBuildRejectsASpecificationDirectorySymlinkBeforeReadingGeneratedOutputs(t));

test('write build rejects a content directory symlink before creating temporary outputs', (t) => locks.writeBuildRejectsAContentDirectorySymlinkBeforeCreatingTemporaryOutputs(t));

test('write build rejects a symlinked ancestor of a write root', (t) => locks.writeBuildRejectsASymlinkedAncestorOfAWriteRoot(t));

test('write build requires contentDir to be the resolved content child of specDir', (t) => locks.writeBuildRequiresContentDirToBeTheResolvedContentChildOfSpecDir(t));

test('body-1.js with an import prefix is rejected before any code executes', (t) => rawSource.body1JsWithAnImportPrefixIsRejectedBeforeAnyCodeExecutes(t));

test('body-1.js with a raw unescaped ${...} interpolation is rejected', (t) => rawSource.body1JsWithARawUnescapedInterpolationIsRejected(t));

test('body-1.js with plain double-quoted string fields is rejected (only the exact template-literal shape is accepted)', (t) => rawSource.body1JsWithPlainDoubleQuotedStringFieldsIsRejectedOnlyTheExactTemplateLiteralShapeIsAccepted(t));

test('body-1.js with correctly escaped backslash, backtick and ${ decodes round-trip to the original text', (t) => rawSource.body1JsWithCorrectlyEscapedBackslashBacktickAndDecodesRoundTripToTheOriginalText(t));

test('meta.js title with an embedded newline is rejected', (t) => rawSource.metaJsTitleWithAnEmbeddedNewlineIsRejected(t));

test('manifest.js with an import prefix is rejected before any code executes', (t) => rawSource.manifestJsWithAnImportPrefixIsRejectedBeforeAnyCodeExecutes(t));

test('manifest.js that is a symlink is rejected as not a regular file before any read', (t) => rawSource.manifestJsThatIsASymlinkIsRejectedAsNotARegularFileBeforeAnyRead(t));

test('meta.js with an import prefix is rejected before any code executes', (t) => rawSource.metaJsWithAnImportPrefixIsRejectedBeforeAnyCodeExecutes(t));

test('meta.js with a computed title value is rejected at JSON parse, not at a later runtime-shape check', (t) => rawSource.metaJsWithAComputedTitleValueIsRejectedAtJSONParseNotAtALaterRuntimeShapeCheck(t));

test('meta.js without exactly one trailing newline is rejected', (t) => rawSource.metaJsWithoutExactlyOneTrailingNewlineIsRejected(t));

test('README-documented sec-9.9 meta.js example is accepted verbatim in EN, RU and ZH (docs and builder agree)', (t) => rawSource.readmeDocumentedSec99MetaJsExampleIsAcceptedVerbatimInENRUAndZHDocsAndBuilderAgree(t));

test('meta.js with a duplicate top-level key is rejected by the canonical byte check', (t) => rawSource.metaJsWithADuplicateTopLevelKeyIsRejectedByTheCanonicalByteCheck(t));

test('meta.js with a duplicate key nested inside title is rejected by the canonical byte check', (t) => rawSource.metaJsWithADuplicateKeyNestedInsideTitleIsRejectedByTheCanonicalByteCheck(t));

test('meta.js with CRLF line endings is rejected (also closes round-21 finding 4)', (t) => rawSource.metaJsWithCRLFLineEndingsIsRejectedAlsoClosesRound21Finding4(t));

test('meta.js with a trailing tab or space before the final newline is rejected (finding 4)', (t) => rawSource.metaJsWithATrailingTabOrSpaceBeforeTheFinalNewlineIsRejectedFinding4(t));

test('meta.js with invalid UTF-8 bytes is rejected instead of silently decoded', (t) => rawSource.metaJsWithInvalidUTF8BytesIsRejectedInsteadOfSilentlyDecoded(t));

test('body-1.js with invalid UTF-8 bytes is rejected instead of silently decoded', (t) => rawSource.body1JsWithInvalidUTF8BytesIsRejectedInsteadOfSilentlyDecoded(t));

test('body-1.js with a simple raw CR is rejected before decoding', (t) => rawSource.body1JsWithASimpleRawCRIsRejectedBeforeDecoding(t));

test('body-1.js with raw CR in a 120-plus-line split is rejected before splitting', (t) => rawSource.body1JsWithRawCRInA120PlusLineSplitIsRejectedBeforeSplitting(t));

test('README.source.js with a raw CR is rejected before decoding', (t) => rawSource.readmeSourceJsWithARawCRIsRejectedBeforeDecoding(t));

test('meta.js title containing an unpaired surrogate escape is rejected as a lone surrogate', (t) => rawSource.metaJsTitleContainingAnUnpairedSurrogateEscapeIsRejectedAsALoneSurrogate(t));

test('hasLoneSurrogate flags unpaired surrogates and accepts valid surrogate pairs', (t) => rawSource.haslonesurrogateFlagsUnpairedSurrogatesAndAcceptsValidSurrogatePairs(t));

test('manifest.js with a UTF-8 BOM is rejected before decoding', (t) => rawSource.manifestJsWithAUTF8BOMIsRejectedBeforeDecoding(t));

test('meta.js with a UTF-8 BOM is rejected before decoding', (t) => rawSource.metaJsWithAUTF8BOMIsRejectedBeforeDecoding(t));

test('body-1.js with a UTF-8 BOM is rejected before decoding', (t) => rawSource.body1JsWithAUTF8BOMIsRejectedBeforeDecoding(t));

test('body field with bare \\$ escape before "5" is rejected as an unrecognised escape', (t) => rawSource.bodyFieldWithBareEscapeBefore5IsRejectedAsAnUnrecognisedEscape(t));

test('body field with bare \\$ escape before "x" is rejected as an unrecognised escape', (t) => rawSource.bodyFieldWithBareEscapeBeforeXIsRejectedAsAnUnrecognisedEscape(t));

test('body field with correctly escaped \\${ is accepted and decodes to the two literal characters "${"', (t) => rawSource.bodyFieldWithCorrectlyEscapedIsAcceptedAndDecodesToTheTwoLiteralCharacters(t));
test('checkHandwrittenVersionReferences accepts the real repo hand-maintained files', (t) => references.checkHandwrittenVersionReferencesAcceptsTheRealRepoHandMaintainedFiles(t));

test('checkHandwrittenVersionReferences rejects a stale versions.ktav stable.version', (t) => references.checkHandwrittenVersionReferencesRejectsAStaleVersionsKtavStableVersion(t));

test('checkHandwrittenVersionReferences rejects stable pointing at versions/0.6', (t) => references.checkHandwrittenVersionReferencesRejectsStablePointingAtVersions06(t));

test('checkHandwrittenVersionReferences rejects a stale latest.version', (t) => references.checkHandwrittenVersionReferencesRejectsAStaleLatestVersion(t));

test('checkHandwrittenVersionReferences names only the stale README', (t) => references.checkHandwrittenVersionReferencesNamesOnlyTheStaleReadme(t));

test('checkHandwrittenVersionReferences rejects a missing required file', (t) => references.checkHandwrittenVersionReferencesRejectsAMissingRequiredFile(t));

test('checkHandwrittenVersionReferences collects all disagreements at once', (t) => references.checkHandwrittenVersionReferencesCollectsAllDisagreementsAtOnce(t));

test('checkHandwrittenVersionReferences rejects unparseable versions.ktav', (t) => references.checkHandwrittenVersionReferencesRejectsUnparseableVersionsKtav(t));

test('checkHandwrittenVersionReferences rejects a CHANGELOG still reading unreleased', (t) => references.checkHandwrittenVersionReferencesRejectsAChangelogStillReadingUnreleased(t));

test('checkHandwrittenVersionReferences rejects an Appendix A heading still reading unreleased', (t) => references.checkHandwrittenVersionReferencesRejectsAnAppendixAHeadingStillReadingUnreleased(t));

test('checkHandwrittenVersionReferences rejects an Appendix A number that disagrees', (t) => references.checkHandwrittenVersionReferencesRejectsAnAppendixANumberThatDisagrees(t));

test('writeSectionInventoryLock writes nothing when the lock is already current', (t) => references.writeSectionInventoryLockWritesNothingWhenTheLockIsAlreadyCurrent(t));

test('writeSectionInventoryLock records a unit the lock was missing', (t) => references.writeSectionInventoryLockRecordsAUnitTheLockWasMissing(t));

test('checkHandwrittenVersionReferences rejects a missing Appendix A unit', (t) => references.checkHandwrittenVersionReferencesRejectsAMissingAppendixAUnit(t));
