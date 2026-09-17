// Depth limits. Deeply nested list markers, lazy continuations, fences
// and containers must stay bounded and must not lose the frame state
// they were tracking on the way down.

import { findHeadings } from '../../build_spec.mjs';
import { baseFixtures, sameLanguageBodies, validate } from '../helpers.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

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
