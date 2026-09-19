// Tests for the source-level structural checks.
//
// Each check exists because a real defect got past everything else, so
// each test reconstructs that defect. A check that only ever sees a
// correct corpus proves nothing — a function returning an empty list
// unconditionally passes that bar too.
//
// Usage: node scripts/test_check_sources.mjs

import { checkSources } from './check_sources.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

/// One unit, given as `parts[partIndex][lang]`.
const unit = (name, parts) => [{ unit: name, parts }];
const same = (text) => ({ en: text, ru: text, zh: text });

const run = (units) => checkSources(units);

test('a clean unit produces no problems', () => {
  const { problems } = run(unit('sec-1', [{
    en: '- one\n- two\n',
    ru: '- один\n- два\n',
    zh: '- 一\n- 二\n',
  }]));
  assert.deepEqual(problems, []);
});

test('a dropped bullet is caught — the defect the rendered-document gate misses', () => {
  // releases/sec-0.5.0 kept every § reference and every RFC 2119 keyword
  // while reducing thirteen of fourteen bullets to stubs, and the parity
  // checker passed it.
  const { problems } = run(unit('releases/sec-0.5.0', [{
    en: '- alpha (§ 5.8)\n- beta (§ 3.7)\n- gamma (§ 3.6)\n',
    ru: '- альфа (§ 5.8)\n- бета (§ 3.7)\n- гамма (§ 3.6)\n',
    zh: '- 甲 (§ 5.8)\n- 乙 (§ 3.7)\n',
  }]));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /bullet count differs \(en=3 ru=3 zh=2\)/);
  assert.match(problems[0], /dropped or invented list items/);
});

test('an item landing in a different part across languages is caught', () => {
  const { problems } = run(unit('sec-5.9', [
    { en: 'see § 5.2 here\n', ru: 'ничего\n', zh: '无\n' },
    { en: 'tail\n', ru: 'см. § 5.2 здесь\n', zh: '见 § 5.2\n' },
  ]));
  assert.ok(problems.some((p) => /sits in different parts across languages/.test(p)),
    `expected a misalignment, got ${JSON.stringify(problems)}`);
});

test('the same item counted differently inside one part is a note, not a failure', () => {
  // § 5.9.5's English says "§ 5.2's own guarantee, § 5.2, is about..." —
  // a redundant appositive. The translations render it once and are
  // correct. Failing the build on that would punish the right answer.
  //
  // Two parts, because this note is a by-product of the alignment
  // analysis and alignment only means something across parts. A
  // corpus-wide count comparison would be a different check with
  // different noise, and nothing has been measured about that.
  const { problems, notes } = run(unit('sec-5.9.5', [
    { en: 'lead\n', ru: 'начало\n', zh: '开头\n' },
    { en: 'per § 5.2 and § 5.2 again\n', ru: 'по § 5.2\n', zh: '按 § 5.2\n' },
  ]));
  assert.deepEqual(problems, []);
  assert.equal(notes.length, 1, `expected one note, got ${JSON.stringify(notes)}`);
  assert.match(notes[0], /same part, different count/);
});

test('text pasted at a depth nothing justifies is caught', () => {
  const { problems } = run(unit('sec-5.0.1', [{
    en: '1. item\n   continued at three\n',
    ru: '1. пункт\n  продолжение на двух\n',
    zh: '1. 条目\n   续行三格\n',
  }]));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /ru indents by 2, which English never uses/);
});

test('a translation wrapping where English did not is NOT a defect', () => {
  // Russian runs longer and wraps a bullet English fits on one line, so
  // it uses a continuation indent English had no occasion for. An earlier
  // design flagged exactly this and was wrong.
  // Widths are kept comparable on purpose: this test is about the INDENT
  // rule's exemption, and an English line much shorter than the Russian
  // one would trip the separate width rule and prove nothing about it.
  const { problems } = run(unit('closing/sec-11', [{
    en: '- RFC 2119 — Key words for use in RFCs to Indicate Requirement Levels\n',
    ru: '- RFC 2119 — ключевые слова для использования в RFC для\n  обозначения уровней требований\n',
    zh: '- RFC 2119 —— 用于 RFC 中表示需求级别的关键词\n',
  }]));
  assert.deepEqual(problems, []);
});

test('an unwrapped translation paragraph is caught', () => {
  const { problems } = run(unit('errors/sec-6.3', [{
    en: 'a short line\nand another short line\n',
    ru: `${'о'.repeat(120)}\n`,
    zh: 'короткая\n',
  }]));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /ru line 1 is 120 columns against an English maximum of 22/);
});

test('a wide line that is wide in English too is NOT a defect', () => {
  // Grammar productions and aligned example tables run past ninety
  // columns in all three languages, legitimately. This is why the width
  // rule is relative and not an absolute column limit.
  const wide = `<pair-line> ::= <key> ":" ${'x'.repeat(70)}\n`;
  const { problems } = run(unit('language/sec-4', [{ en: wide, ru: wide, zh: wide }]));
  assert.deepEqual(problems, []);
});

test('fenced blocks are exempt from every check', () => {
  // Inside a fence, indentation and line length are content.
  const fenced = '```text\n' + `${' '.repeat(9)}${'y'.repeat(200)}\n` + '```\n';
  const { problems } = run(unit('language/sec-4', [
    { en: 'intro\n' + fenced, ru: 'вступление\n' + fenced, zh: '引言\n' + fenced },
  ]));
  assert.deepEqual(problems, []);
});

test('a single-part unit is never checked for alignment', () => {
  const { problems } = run(unit('sec-1', [{
    en: '§ 5.2 twice: § 5.2\n', ru: '§ 5.2\n', zh: '§ 5.2\n',
  }]));
  assert.equal(problems.filter((p) => /different parts/.test(p)).length, 0);
});
