import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { LANGS, README_SOURCE_FILE, validateContentDir } from '../build_spec.mjs';
import {
  TEST_RELEASE, baseFixtures, bodyJs, buildInTemp, lockUnits, makeContent, tokenFixtures, unitMeta, validate, write,
} from './helpers.mjs';

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

