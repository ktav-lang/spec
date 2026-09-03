// test_build_spec.mjs — adversarial node:test suite for scripts/build_spec.mjs
// Run: node --test scripts/test_build_spec.mjs
// Builds self-contained fixtures in temp dirs; no real repo content needed.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateContentDir } from './build_spec.mjs';

function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function metaJs(obj) {
  return 'export default ' + JSON.stringify(obj) + ';\n';
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
    'export default ' + JSON.stringify(manifestNames) + ';\n');
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
