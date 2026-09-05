// test_build_spec.mjs — adversarial node:test suite for scripts/build_spec.mjs
// Run: node --test scripts/test_build_spec.mjs
// Builds self-contained fixtures in temp dirs; the only real-repo inputs are
// the three content READMEs (README.md / README.ru.md / README.zh.md), read
// by the README acceptance test.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
} from './build_spec.mjs';

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
function makeContent(dir, unitDefs, manifestNames) {
  write(path.join(dir, 'content', 'package.json'), '{\n  "type": "module"\n}\n');
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
        version: '0.7.0',
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
  await assert.rejects(
    validate(lazyOrdered),
    /unit "named-abstract": en: unit body contains a Setext heading/
  );
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
      version: '0.7.0',
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

test('write build restores missing generated content READMEs from README.source.js', async () => {
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
        version: '0.7.0',
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
});

test('write build rejects a specification destination symlink without touching its target', async (t) => {
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
});

test('check build rejects a generated spec file symlink before reading its target', async (t) => {
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
});

test('check build reports a missing generated output deterministically', async () => {
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
});

test('write build rejects a generated README directory before creating temporary outputs', async () => {
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
});

test('failed atomic rename preserves the destination and cleans its temporary file', async () => {
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
});

test('a later output rename rolls back all six outputs and cleans temps and backups', async () => {
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
});

test('rollback preserves an unrestorable backup and continues restoring other outputs', async () => {
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
});

test('backup cleanup failure never rolls back committed six-output build', async () => {
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
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('write build rejects a specification directory symlink before creating temporary outputs', async (t) => {
  if (!directoryLinksSupported()) {
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
});

test('check build rejects a specification directory symlink before reading generated outputs', async (t) => {
  if (!directoryLinksSupported()) {
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
});

test('write build rejects a content directory symlink before creating temporary outputs', async (t) => {
  if (!directoryLinksSupported()) {
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
});

test('write build rejects a symlinked ancestor of a write root', async (t) => {
  if (!directoryLinksSupported()) {
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
});

test('write build requires contentDir to be the resolved content child of specDir', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-write-root-shape-'));
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
});

// ---- body-N.js raw-source shape scanner (round 19, finding 1) ----

test('body-1.js with an import prefix is rejected before any code executes', async () => {
  // The import target deliberately does not exist: if the builder ever
  // executed this file, the failure would be a module-not-found error, not
  // the shape error -- proving the shape check fires BEFORE dynamic import.
  const evilBody =
    "import x from './module-that-does-not-exist.js';\n" +
    'export default {\n' +
    '  en: `a\n`,\n' +
    '  ru: `b\n`,\n' +
    '  zh: `c\n`,\n' +
    '};\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), evilBody)),
    (e) =>
      /unit "sec-1": body-1\.js: must start with exactly "export default \{\\n  en: `"/.test(e.message) &&
      !/cannot load body-1\.js|Cannot find module|module-that-does-not-exist/.test(e.message)
  );
});

test('body-1.js with a raw unescaped ${...} interpolation is rejected', async () => {
  const evilBody =
    'export default {\n' +
    '  en: `value is ${location} here\n`,\n' +
    '  ru: `b\n`,\n' +
    '  zh: `c\n`,\n' +
    '};\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), evilBody)),
    (e) =>
      /unit "sec-1": body-1\.js: unescaped "\$\{" \(template interpolation\) in en/.test(e.message)
  );
});

test('body-1.js with plain double-quoted string fields is rejected (only the exact template-literal shape is accepted)', async () => {
  const evilBody =
    'export default {\n' +
    '  en: "plain string",\n' +
    '  ru: `b\n`,\n' +
    '  zh: `c\n`,\n' +
    '};\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), evilBody)),
    (e) =>
      /unit "sec-1": body-1\.js: must start with exactly "export default \{\\n  en: `"/.test(e.message)
  );
});

test('body-1.js with correctly escaped backslash, backtick and ${ decodes round-trip to the original text', async () => {
  const RAW = {
    en: 'backslash \\ backtick ` interpolation ${ done\n',
    ru: 'слэш \\ кавычка ` доллар ${ конец\n',
    zh: '反斜杠 \\ 反引号 ` 美元 ${ 结束\n',
  };
  // Hand-written escaped form (the documented write-side rule: \\ first,
  // then \`, then \${), independent of the helpers in this file.
  const ESC = {
    en: 'backslash \\\\ backtick \\` interpolation \\${ done\n',
    ru: 'слэш \\\\ кавычка \\` доллар \\${ конец\n',
    zh: '反斜杠 \\\\ 反引号 \\` 美元 \\${ 结束\n',
  };
  const bodyText =
    'export default {\n' +
    '  en: `' + ESC.en + '`,\n' +
    '  ru: `' + ESC.ru + '`,\n' +
    '  zh: `' + ESC.zh + '`,\n' +
    '};\n';
  const { units } = await validate(baseFixtures(), null, (c) =>
    write(path.join(c, 'sec-1', 'body-1.js'), bodyText));
  const part = units.get('sec-1').parts[0];
  assert.equal(part.en, RAW.en);
  assert.equal(part.ru, RAW.ru);
  assert.equal(part.zh, RAW.zh);
});

test('meta.js title with an embedded newline is rejected', async () => {
  const fx = baseFixtures();
  fx[1].meta = unitMeta('named');
  fx[1].meta.title = { en: 'Abstract', ru: 'Анно\nтация', zh: '摘要' };
  await assert.rejects(
    validate(fx),
    (e) => /unit "named-abstract": title\.ru must be single-line \(CR\/LF not allowed\)/.test(e.message)
  );
});

// ---- manifest.js / meta.js are JSON data, never executed (round 20, finding 1) ----

test('manifest.js with an import prefix is rejected before any code executes', async () => {
  // The import target deliberately does not exist: if the builder ever
  // executed this file, the failure would be a module-not-found error, not
  // the shape error -- proving the shape check fires BEFORE any import.
  const evilManifest =
    "import fs from './module-that-does-not-exist.js';\n" +
    'export default ' + JSON.stringify(['frontmatter', 'named-abstract', 'sec-1']) + ';\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'manifest.js'), evilManifest)),
    (e) =>
      /manifest\.js must start with exactly "export default "/.test(e.message) &&
      !/Cannot find module|module-that-does-not-exist|ERR_MODULE_NOT_FOUND/.test(e.message)
  );
});

test('manifest.js that is a symlink is rejected as not a regular file before any read', async (t) => {
  if (!symlinksSupported()) {
    t.skip('symlink creation unavailable without privileges (Windows without admin/Developer Mode); this test MUST run on POSIX CI');
    return;
  }
  // The target's content would fail every content check; getting the
  // file-type error instead proves the target was never opened.
  await assert.rejects(
    validate(baseFixtures(), null, (c) => {
      const outside = path.join(c, '..', 'outside-manifest.js');
      fs.writeFileSync(outside, 'totally not JavaScript\n');
      fs.rmSync(path.join(c, 'manifest.js'));
      fs.symlinkSync(outside, path.join(c, 'manifest.js'), 'file');
    }),
    (e) =>
      /manifest\.js is not a regular file/.test(e.message) &&
      !/must start with exactly|JSON\.parse failed/.test(e.message)
  );
});

test('meta.js with an import prefix is rejected before any code executes', async () => {
  const evilMeta =
    "import en from './evil.js';\n" +
    'export default ' + JSON.stringify(unitMeta('named')) + ';\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), evilMeta)),
    (e) =>
      /meta\.js must start with exactly "export default "/.test(e.message) &&
      !/Cannot find module|evil\.js|ERR_MODULE_NOT_FOUND/.test(e.message)
  );
});

test('meta.js with a computed title value is rejected at JSON parse, not at a later runtime-shape check', async () => {
  const evilMeta =
    'export default {\n' +
    '  "kind": "named",\n' +
    '  "number": null,\n' +
    '  "level": 2,\n' +
    '  "title": { "en": "Ab" + "stract", "ru": "Аннотация", "zh": "摘要" },\n' +
    '  "bodyParts": 1\n' +
    '}\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), evilMeta)),
    (e) =>
      /meta\.js is not "export default " \+ JSON \+ "\\n": JSON\.parse failed/.test(e.message) &&
      !/title keys must be exactly|title\.en/.test(e.message)
  );
});

test('meta.js without exactly one trailing newline is rejected', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'),
        'export default ' + JSON.stringify(unitMeta('named')) + '\n\n')),
    (e) => /must be byte-identical to the canonical serialization/.test(e.message)
  );
});

// ---- canonical byte form, strict UTF-8, lone surrogates (round 21) ----

test('README-documented sec-9.9 meta.js example is accepted verbatim in EN, RU and ZH (docs and builder agree)', async (t) => {
  // Acceptance test for the three content READMEs (round 22, finding 3):
  // the example documented in EACH language copy is copied byte-for-byte out
  // of that real file and must pass the real validator unchanged; previously
  // only the EN README was validated, so a drift introduced into the RU or
  // ZH copy alone would have gone unnoticed.
  const READMES = [
    ['en', 'README.md'],
    ['ru', 'README.ru.md'],
    ['zh', 'README.zh.md'],
  ];
  for (const [lang, readmeName] of READMES) {
    await t.test(`${readmeName}: documented sec-9.9/meta.js example is accepted verbatim`, async () => {
      const readme = fs.readFileSync(
        new URL('../versions/0.7/content/' + readmeName, import.meta.url), 'utf8');
      const m = readme.match(/`sec-9\.9\/meta\.js`:\s*\n+```js\n([\s\S]*?)```/);
      assert.ok(m, `sec-9.9/meta.js example not found in ${readmeName}`);
      const documented = m[1];
      assert.ok(documented.startsWith('export default {\n'));
      assert.ok(documented.endsWith('}\n'), 'example must end with a single newline and no semicolon');
      assert.ok(!documented.includes(';'), 'meta.js example must not contain a semicolon');
      const fx = [
        { name: 'frontmatter', meta: unitMeta('frontmatter'), bodies: [['# Frontmatter\n\nfm.\n\n', '# Frontmatter\n\nфм.\n\n', '# Frontmatter\n\n前言。\n\n']] },
        { name: 'sec-9.9', meta: unitMeta('numbered', { __num: '9.9' }), bodies: [LAST] },
      ];
      const { units } = await validate(fx, ['frontmatter', 'sec-9.9'], (c) =>
        write(path.join(c, 'sec-9.9', 'meta.js'), documented));
      const meta = units.get('sec-9.9').meta;
      assert.equal(meta.number, '9.9');
      assert.equal(meta.title.en, 'Widget Frobnication');
    });
  }
});

// Extracts one top-level object member (from its `  "key": {` opening line
// through the matching `  },` line) as a contiguous, canonically-formatted
// block from a metaJs()-style canonical serialization.
function topLevelObjectMember(canonical, key) {
  const open = '  "' + key + '": {\n';
  const close = '  },\n';
  const start = canonical.indexOf(open);
  assert.ok(start !== -1, `canonical fixture must contain member "${key}"`);
  const end = canonical.indexOf(close, start);
  assert.ok(end !== -1, `member "${key}" must be closed by ${JSON.stringify(close)}`);
  return canonical.slice(start, end + close.length);
}

test('meta.js with a duplicate top-level key is rejected by the canonical byte check', async () => {
  // Single-factor fixture (round 22, finding 2): the previous version wrote
  // both duplicated "title" objects inline on one line each, so the source
  // was ALREADY non-canonical for formatting reasons alone and this test
  // would have passed even if duplicate-key detection broke. The fixture is
  // now built by splicing one extra, canonically-formatted "title" member
  // block into the canonical serialization of a valid meta object, so that
  // removing either duplicated member restores exactly canonical bytes and
  // the duplicate key is the ONLY reason the source can be rejected.
  const effective = unitMeta('named');
  const stale = {
    ...effective,
    title: { en: 'stale English title', ru: 'устаревший заголовок', zh: '过期标题' },
  };
  const canonical = metaJs(effective); // what the canonical check compares against (JSON.parse keeps the last value)
  const staleBlock = topLevelObjectMember(metaJs(stale), 'title');
  const effectiveBlock = topLevelObjectMember(canonical, 'title');
  const duplicated = canonical.replace(effectiveBlock, staleBlock + effectiveBlock);
  // Isolation proof: deleting exactly one of the two duplicated members
  // restores a perfectly canonical file (either one).
  assert.equal(duplicated.replace(staleBlock, ''), canonical);
  assert.equal(duplicated.replace(effectiveBlock, ''), metaJs(stale));
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), duplicated)),
    (e) => /must be byte-identical to the canonical serialization/.test(e.message) &&
      /first difference at byte offset \d+/.test(e.message) &&
      !/title keys must be exactly/.test(e.message)
  );
});

test('meta.js with a duplicate key nested inside title is rejected by the canonical byte check', async () => {
  const dupTitle =
    'export default {\n' +
    '  "kind": "named",\n' +
    '  "number": null,\n' +
    '  "level": 2,\n' +
    '  "title": {\n' +
    '    "en": "stale English title",\n' +
    '    "en": "effective English title",\n' +
    '    "ru": "Аннотация",\n' +
    '    "zh": "摘要"\n' +
    '  },\n' +
    '  "bodyParts": 1\n' +
    '}\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), dupTitle)),
    (e) => /must be byte-identical to the canonical serialization/.test(e.message) &&
      !/title keys must be exactly|missing key/.test(e.message)
  );
});

test('meta.js with CRLF line endings is rejected (also closes round-21 finding 4)', async () => {
  const crlf = metaJs(unitMeta('named')).replace(/\n/g, '\r\n');
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), crlf)),
    (e) => /must be byte-identical to the canonical serialization/.test(e.message)
  );
});

test('meta.js with a trailing tab or space before the final newline is rejected (finding 4)', async () => {
  const base = metaJs(unitMeta('named'));
  for (const [label, broken] of [
    ['tab', base.replace(/\}\n$/, '}\t\n')],
    ['space', base.replace(/\}\n$/, '} \n')],
  ]) {
    await assert.rejects(
      validate(baseFixtures(), null, (c) =>
        write(path.join(c, 'named-abstract', 'meta.js'), broken)),
      (e) => /must be byte-identical to the canonical serialization/.test(e.message),
      `trailing ${label} before the final newline must be rejected`
    );
  }
});

test('meta.js with invalid UTF-8 bytes is rejected instead of silently decoded', async () => {
  // A JS string cannot represent invalid UTF-8, so corrupt one continuation
  // byte of a multi-byte character at the raw Buffer level.
  const good = Buffer.from(metaJs(unitMeta('named')), 'utf8');
  const anchor = Buffer.from('Аннотация', 'utf8');
  const at = good.indexOf(anchor);
  assert.notEqual(at, -1);
  const broken = Buffer.from(good);
  broken[at + 1] = 0xFF; // 0xD0 0x90 ("А") -> 0xD0 0xFF: invalid continuation byte
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), broken)),
    (e) => /meta\.js is not valid UTF-8/.test(e.message)
  );
});

test('body-1.js with invalid UTF-8 bytes is rejected instead of silently decoded', async () => {
  const good = Buffer.from(bodyJs('x\n', 'ы\n', 'z\n'), 'utf8');
  const anchor = Buffer.from('ы', 'utf8');
  const at = good.indexOf(anchor);
  assert.notEqual(at, -1);
  const broken = Buffer.from(good);
  broken[at + 1] = 0x41; // 0xD1 0x8B ("ы") -> 0xD1 0x41: invalid continuation byte
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), broken)),
    (e) => /unit "sec-1": body-1\.js is not valid UTF-8/.test(e.message)
  );
});

test('body-1.js with a simple raw CR is rejected before decoding', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), bodyJs('end.\r\n', 'konets.\r\n', 'zhong.\r\n'))),
    (e) => /unit "sec-1": body-1\.js contains a raw carriage return \(CR, 0x0D\)/.test(e.message)
  );
});

test('body-1.js with raw CR in a 120-plus-line split is rejected before splitting', async () => {
  const fx = baseFixtures();
  const body = bodyWithOneInteriorBlank(130, 64).replace('paragraph-1', 'paragraph-1\r');
  const cut = body.indexOf('\n\n') + 2;
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = sameLanguageBodies(splitBody(body, cut));
  await assert.rejects(
    validate(fx),
    (e) => /unit "sec-1": body-1\.js contains a raw carriage return \(CR, 0x0D\)/.test(e.message)
  );
});

test('README.source.js with a raw CR is rejected before decoding', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, README_SOURCE_FILE), bodyJs('# content README\r\n', '# content README\r\n', '# content README\r\n'))),
    (e) => /README\.source\.js contains a raw carriage return \(CR, 0x0D\)/.test(e.message)
  );
});

test('meta.js title containing an unpaired surrogate escape is rejected as a lone surrogate', async () => {
  const fx = baseFixtures();
  fx[1].meta = unitMeta('named');
  fx[1].meta.title.ru = 'Аннотация \uD800 конец';
  // Canonical JSON.stringify escapes the lone surrogate as "\ud800", so the
  // file passes the canonical byte check and must then be rejected by the
  // dedicated lone-surrogate check in validateMeta.
  await assert.rejects(
    validate(fx),
    (e) => /title\.ru contains an unpaired UTF-16 surrogate/.test(e.message)
  );
});

test('hasLoneSurrogate flags unpaired surrogates and accepts valid surrogate pairs', () => {
  assert.equal(hasLoneSurrogate('plain text'), false);
  assert.equal(hasLoneSurrogate('汉字 и буквы'), false);
  assert.equal(hasLoneSurrogate('a\uD800b'), true);
  assert.equal(hasLoneSurrogate('\uDC00'), true);
  assert.equal(hasLoneSurrogate('before\uDEAD'), true);
  assert.equal(hasLoneSurrogate('pair \uD83D\uDE00 done'), false);
  assert.equal(hasLoneSurrogate('汉字😀'), false);
});

// ---- UTF-8 BOM rejected at the raw-byte level (round 22, finding 1) ----
//
// TextDecoder's default ignoreBOM: false treats a leading BOM as an encoding
// signature and silently strips it from the decoded string; the BOM bytes are
// valid UTF-8, so the fatal decoder does not reject them either. Without a
// raw-byte check, a BOM-prefixed file would decode to exactly the canonical
// BOM-less string and pass both the prefix check and the canonical
// byte-identity check. The fixtures below prepend the BOM as RAW BYTES
// (never via a JS string literal) so the tests exercise the byte-level
// concern directly.

function withUtf8Bom(content) {
  return Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(content, 'utf8')]);
}

test('manifest.js with a UTF-8 BOM is rejected before decoding', async () => {
  const canonicalManifest =
    'export default ' + JSON.stringify(['frontmatter', 'named-abstract', 'sec-1'], null, 2) + '\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'manifest.js'), withUtf8Bom(canonicalManifest))),
    (e) => /manifest\.js starts with a UTF-8 byte-order mark/.test(e.message)
  );
});

test('meta.js with a UTF-8 BOM is rejected before decoding', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), withUtf8Bom(metaJs(unitMeta('named'))))),
    (e) => /meta\.js starts with a UTF-8 byte-order mark/.test(e.message)
  );
});

test('body-1.js with a UTF-8 BOM is rejected before decoding', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), withUtf8Bom(bodyJs('x\n', 'y\n', 'z\n')))),
    (e) => /unit "sec-1": body-1\.js starts with a UTF-8 byte-order mark/.test(e.message)
  );
});

// ---- escape grammar: "$" without "{" is not a valid escape (round 20, finding 3) ----

test('body field with bare \\$ escape before "5" is rejected as an unrecognised escape', async () => {
  const evilBody =
    'export default {\n' +
    '  en: `price is \\$5 here\n`,\n' +
    '  ru: `b\n`,\n' +
    '  zh: `c\n`,\n' +
    '};\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), evilBody)),
    (e) =>
      /unit "sec-1": body-1\.js: unrecognised escape "\\\$" in en/.test(e.message) &&
      /only \\\\, \\`, and \\\$\{ are valid\)/.test(e.message)
  );
});

test('body field with bare \\$ escape before "x" is rejected as an unrecognised escape', async () => {
  const evilBody =
    'export default {\n' +
    '  en: `a\n`,\n' +
    '  ru: `name \\$x here\n`,\n' +
    '  zh: `c\n`,\n' +
    '};\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.js'), evilBody)),
    (e) =>
      /unit "sec-1": body-1\.js: unrecognised escape "\\\$" in ru/.test(e.message)
  );
});

test('body field with correctly escaped \\${ is accepted and decodes to the two literal characters "${"', async () => {
  const bodyText =
    'export default {\n' +
    '  en: `cost \\${x\n`,\n' +
    '  ru: `цена \\${y\n`,\n' +
    '  zh: `价格 \\${z\n`,\n' +
    '};\n';
  const { units } = await validate(baseFixtures(), null, (c) =>
    write(path.join(c, 'sec-1', 'body-1.js'), bodyText));
  const part = units.get('sec-1').parts[0];
  assert.equal(part.en, 'cost ${x\n');
  assert.equal(part.ru, 'цена ${y\n');
  assert.equal(part.zh, '价格 ${z\n');
});
