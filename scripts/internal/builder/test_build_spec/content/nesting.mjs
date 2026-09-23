// A unit may live inside a group directory, so a manifest entry is a
// relative path rather than a bare name. These cases pin the shape that
// path is allowed to take — the point of the nesting is a smaller tree,
// not a wider door.

import assert from 'node:assert/strict';
import test from 'node:test';

import { baseFixtures, unitMeta, validate, write } from '../helpers.mjs';
import path from 'node:path';

function nestedFixtures() {
  const units = baseFixtures();
  units[2] = { ...units[2], name: 'language/grammar/sec-1' };
  return units;
}

test('a unit inside a group directory is accepted and keeps its own name', async () => {
  const { manifest, units } = await validate(nestedFixtures());
  assert.deepEqual(manifest, ['frontmatter', 'named-abstract', 'language/grammar/sec-1']);
  assert.ok(units.has('language/grammar/sec-1'));
});

test('a nested unit still has to be named sec-<number>', async () => {
  const units = baseFixtures();
  units[2] = { ...units[2], name: 'language/sec-9' };
  await assert.rejects(
    validate(units),
    /unit name does not match sec-1/,
    'the basename is the identity, so the group path cannot disguise a wrong number');
});

test('a group directory holds only unit directories, never files', async () => {
  await assert.rejects(
    validate(nestedFixtures(), null, (contentDir) =>
      write(path.join(contentDir, 'language', 'NOTES.md'), 'stray\n')),
    /unexpected file under content\/: "language\/NOTES\.md"/);
});

test('a directory the manifest never named is rejected at any depth', async () => {
  await assert.rejects(
    validate(nestedFixtures(), null, (contentDir) =>
      write(path.join(contentDir, 'language', 'rogue', 'meta.js'), 'export default {}\n')),
    /unexpected directory under content\/: "language\/rogue"/);
});

test('a manifest entry may not escape content/ or use a backslash', async () => {
  for (const [entry, why] of [
    ['../outside', /must not contain "\." or "\.\."/],
    ['./sec-1', /must not contain "\." or "\.\."/],
    ['/sec-1', /must be relative to content\/, not absolute/],
    ['language\\sec-1', /must use "\/" as its separator/],
    ['language//sec-1', /must not contain an empty path segment/],
  ]) {
    const units = baseFixtures();
    units[2] = { ...units[2], name: entry };
    await assert.rejects(validate(units), why, `entry ${JSON.stringify(entry)}`);
  }
});

test('a unit may not also be the parent of another unit', async () => {
  const units = baseFixtures();
  units[2] = { ...units[2], name: 'language' };
  units.push({
    name: 'language/sec-2',
    meta: unitMeta('numbered', { __num: '2' }),
    bodies: [['end.\n', 'конец.\n', '结束。\n']],
  });
  units[2] = {
    ...units[2],
    bodies: [['mid.\n\n', 'середина.\n\n', '中间。\n\n']],
  };
  await assert.rejects(
    validate(units),
    /is both a unit and the parent of another unit/);
});
