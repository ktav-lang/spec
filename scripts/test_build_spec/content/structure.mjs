// Frontmatter's single-h1 rule, meta.js's documented property order, the
// section inventory lock, and the line between a numbered heading and a
// named one.

import {
  defaultSectionInventoryLockPath,
  validateContentDir,
  validateMeta,
} from '../../build_spec.mjs';
import {
  TEST_RELEASE,
  baseFixtures,
  lockUnits,
  makeContent,
  permutations,
  sameLanguageBodies,
  unitMeta,
  validate,
  withKeyOrder,
  write,
} from '../helpers.mjs';
import * as locks from '../transactions/locks.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

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
    const versionDir = path.join(repoRoot, 'versions', '0.8');
    const contentDir = path.join(versionDir, 'content');
    const manifest = ['frontmatter', 'named-abstract', 'sec-1'];
    makeContent(versionDir, baseFixtures(), manifest);
    const lockPath = path.join(repoRoot, 'scripts', 'locks', 'section-inventory.0.8.lock.json');
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
