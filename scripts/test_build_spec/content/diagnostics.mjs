// What the builder SAYS when something is wrong: the first differing
// byte and its line number, the excerpted line, the named orphan unit
// or missing directory -- plus the body-part rules and the cut plan
// that decides where a long body is allowed to be split.

import {
  MAX_BODY_PARTS,
  README_SOURCE_FILE,
  firstByteDiff,
  formatMismatchDiagnostic,
  lineAtByte,
  lineNumberAtByte,
  splitPlan,
  validateMeta,
} from '../../build_spec.mjs';
import {
  baseFixtures,
  bodyJs,
  bodyWithInteriorBlanks,
  bodyWithOneInteriorBlank,
  interiorBlankCutOffsets,
  sameLanguageBodies,
  splitBody,
  unitMeta,
  validate,
  write,
  zipLanguageBodies,
} from '../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

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
