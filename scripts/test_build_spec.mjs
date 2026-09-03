// test_build_spec.mjs — adversarial node:test suite for scripts/build_spec.mjs
// Run: node --test scripts/test_build_spec.mjs
// Builds self-contained fixtures in temp dirs; the one real-repo input is
// versions/0.7/content/README.md, read by the README acceptance test.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateContentDir, hasLoneSurrogate } from './build_spec.mjs';

function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function metaJs(obj) {
  return 'export default ' + JSON.stringify(obj, null, 2) + '\n';
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

const LAST = ['end.\n', 'конец.\n', '结束。\n'];
const MID = ['mid.\n\n', 'середина.\n\n', '中间。\n\n'];

function baseFixtures() {
  return [
    { name: 'frontmatter', meta: unitMeta('frontmatter'), bodies: [['fm.\n\n', 'фм.\n\n', '前言。\n\n']] },
    { name: 'named-abstract', meta: unitMeta('named'), bodies: [MID] },
    { name: 'sec-1', meta: unitMeta('numbered', { __num: '1' }), bodies: [LAST] },
  ];
}

async function validate(fixtures, manifest, mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktav-test-'));
  try {
    makeContent(dir, fixtures, manifest || fixtures.map((u) => u.name));
    if (mutate) mutate(path.join(dir, 'content'));
    return await validateContentDir(path.join(dir, 'content'));
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

test('well-formed minimal fixture passes cleanly', async () => {
  const { manifest } = await validate(baseFixtures());
  assert.deepEqual(manifest, ['frontmatter', 'named-abstract', 'sec-1']);
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
  fx[0].bodies = [['fm.\n\n', 'фм.\n', '前言。\n\n']];
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
  fx[0].bodies = [['fm.\n\n\n', 'фм.\n\n', '前言。\n\n']];
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

test('missing README.ru.md at content/ top level is rejected', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) => fs.rmSync(path.join(c, 'README.ru.md'))),
    (e) => /required file "README\.ru\.md" is missing under content\//.test(e.message)
  );
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

test('README-documented sec-9.9 meta.js example is accepted verbatim (docs and builder agree)', async () => {
  // Acceptance test for the content README: the example documented there is
  // copied byte-for-byte out of the real file and must pass the real
  // validator unchanged.
  const readme = fs.readFileSync(
    new URL('../versions/0.7/content/README.md', import.meta.url), 'utf8');
  const m = readme.match(/`sec-9\.9\/meta\.js`:\s*\n+```js\n([\s\S]*?)```/);
  assert.ok(m, 'sec-9.9/meta.js example not found in README.md');
  const documented = m[1];
  assert.ok(documented.startsWith('export default {\n'));
  assert.ok(documented.endsWith('}\n'), 'example must end with a single newline and no semicolon');
  assert.ok(!documented.includes(';'), 'meta.js example must not contain a semicolon');
  const fx = [
    { name: 'frontmatter', meta: unitMeta('frontmatter'), bodies: [['fm.\n\n', 'фм.\n\n', '前言。\n\n']] },
    { name: 'sec-9.9', meta: unitMeta('numbered', { __num: '9.9' }), bodies: [LAST] },
  ];
  const { units } = await validate(fx, ['frontmatter', 'sec-9.9'], (c) =>
    write(path.join(c, 'sec-9.9', 'meta.js'), documented));
  const meta = units.get('sec-9.9').meta;
  assert.equal(meta.number, '9.9');
  assert.equal(meta.title.en, 'Widget Frobnication');
});

test('meta.js with a duplicate top-level key is rejected by the canonical byte check', async () => {
  const dupMeta =
    'export default {\n' +
    '  "kind": "named",\n' +
    '  "number": null,\n' +
    '  "level": 2,\n' +
    '  "title": { "en": "A", "ru": "Б", "zh": "甲" },\n' +
    '  "title": { "en": "B", "ru": "В", "zh": "乙" },\n' +
    '  "bodyParts": 1\n' +
    '}\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), dupMeta)),
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
