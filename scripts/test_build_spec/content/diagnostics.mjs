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
  bodySource,
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
import { langSeparator } from '../../build_spec/shared.mjs';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('the README source is held to the same language set as a unit body', async () => {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, README_SOURCE_FILE),
        langSeparator('en') + '\na\n' +
        langSeparator('ru') + '\nb\n' +
        langSeparator('zh') + '\nc\n' +
        langSeparator('de') + '\nd\n')),
    (e) => /unit "content": README\.source\.md: unexpected language block\(s\) de/.test(e.message)
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
      write(path.join(c, 'sec-1', 'body-2.md'), bodySource('x\n', 'y\n', 'z\n'))),
    (e) => /unit "sec-1": unexpected extra file body-2\.md beyond meta\.bodyParts 1/.test(e.message)
  );
});

test('meta.bodyParts=2 but body-2.js missing', async () => {
  const fx = baseFixtures();
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  await assert.rejects(
    validate(fx),
    (e) => /unit "sec-1": missing body-2\.md \(meta\.bodyParts is 2\)/.test(e.message)
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

test('bodyParts rejects needless splitting of a unit at the line limit', async () => {
  const fx = baseFixtures();
  // Exactly BODY_LINE_LIMIT lines: at the limit, not over it, so the
  // mandate is one part however many blank boundaries are available.
  const body = bodyWithOneInteriorBlank(40, 19);
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
  // Sixty lines mandate two parts, so there is exactly one cut to place,
  // and its proportional target is line 30 — equidistant from the two
  // blank boundaries at 29 and 31.
  const body = bodyWithInteriorBlanks(60, [28, 30]);
  const cuts = interiorBlankCutOffsets(body);
  assert.equal(cuts.length, 2);
  assert.equal(body.slice(0, cuts[0]).split('\n').length - 1, 29);
  assert.equal(body.slice(0, cuts[1]).split('\n').length - 1, 31);
  const parts = splitBody(body, cuts[0]);
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = sameLanguageBodies(parts);

  const result = await validate(fx);
  assert.equal(result.units.get('sec-1').parts[0].en, parts[0]);
});

test('every language cuts at the same paragraph boundary, not its own proportional one', async () => {
  // The languages are deliberately lopsided: 130 lines against 80, the
  // same ratio English and Chinese actually have. Under a per-language
  // rule the short one's proportional target lands on its SECOND
  // boundary; under the shared rule it takes the same boundary INDEX as
  // the others, which is the first. That is what makes part k the same
  // fragment in every language instead of three unrelated slices.
  const fx = baseFixtures();
  const en = bodyWithOneInteriorBlank(130, 64);
  const ru = bodyWithInteriorBlanks(80, [29, 59]);
  const zh = bodyWithOneInteriorBlank(130, 64);
  const ruCuts = interiorBlankCutOffsets(ru);
  assert.equal(ruCuts.length, 2, 'the short language must offer a choice of boundary');

  const enParts = splitBody(en, interiorBlankCutOffsets(en)[0]);
  const zhParts = splitBody(zh, interiorBlankCutOffsets(zh)[0]);
  const ruParts = splitBody(ru, ruCuts[0]);
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = zipLanguageBodies(enParts, ruParts, zhParts);

  const result = await validate(fx);
  assert.equal(result.units.get('sec-1').parts[0].ru, ruParts[0]);

  // ...and cutting the short language at its own proportional boundary,
  // which the previous rule mandated, is now rejected.
  const wrong = baseFixtures();
  wrong[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  wrong[2].bodies = zipLanguageBodies(enParts, splitBody(ru, ruCuts[1]), zhParts);
  await assert.rejects(
    validate(wrong),
    (e) => /ru: body parts must use the mandated blank-line cut points/.test(e.message)
  );
});

test('a body part holds the same paragraph count in every language', async () => {
  // The property the shared cut exists for: open body-k.md and the three
  // blocks are translations of each other.
  const fx = baseFixtures();
  const en = bodyWithInteriorBlanks(130, [43, 87]);
  const ru = bodyWithInteriorBlanks(150, [49, 99]);
  const zh = bodyWithInteriorBlanks(70, [23, 47]);
  const cut = (body, i) => interiorBlankCutOffsets(body)[i];
  const three = (body) => [
    body.slice(0, cut(body, 0)),
    body.slice(cut(body, 0), cut(body, 1)),
    body.slice(cut(body, 1)),
  ];
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 3 });
  fx[2].bodies = zipLanguageBodies(three(en), three(ru), three(zh));

  const result = await validate(fx);
  const parts = result.units.get('sec-1').parts;
  assert.equal(parts.length, 3);
  const paragraphs = (text) => text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  for (const part of parts) {
    assert.equal(paragraphs(part.ru), paragraphs(part.en), 'ru and en must hold the same fragment');
    assert.equal(paragraphs(part.zh), paragraphs(part.en), 'zh and en must hold the same fragment');
  }
});

test('a translation with fewer paragraph boundaries is named, not silently mis-cut', async () => {
  // The shared cut is a paragraph-boundary INDEX, so it only means
  // anything while every language has that boundary. Here Russian has one
  // interior blank and English has three, and the mandated cut falls on
  // English's SECOND — an index Russian does not have. The builder must
  // say the paragraph structure diverged; looking the index up anyway
  // yields `undefined` and surfaces much later as an unreadable offset.
  const fx = baseFixtures();
  const en = bodyWithInteriorBlanks(130, [10, 65, 120]);
  const zh = bodyWithInteriorBlanks(130, [10, 65, 120]);
  const ru = bodyWithOneInteriorBlank(40, 19);
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = zipLanguageBodies(
    splitBody(en, interiorBlankCutOffsets(en)[1]),
    splitBody(ru, interiorBlankCutOffsets(ru)[0]),
    splitBody(zh, interiorBlankCutOffsets(zh)[1]));

  await assert.rejects(
    validate(fx),
    (e) => /ru: has 1 paragraph boundary\/boundaries but the shared cut points need 2 \(chosen in en\)/
      .test(e.message)
  );
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
