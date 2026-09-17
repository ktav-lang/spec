// CommonMark's two hardest block families for a heading checker: HTML
// blocks (all seven opener types, including type 7's standalone-tag
// rule) and link reference definitions, whose multi-line speculative
// parse must roll back every buffered line when it fails.

import { findHeadings } from '../../build_spec.mjs';
import { baseFixtures, sameLanguageBodies, validate } from '../helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('all seven CommonMark HTML block opener families are forbidden outside fences', async () => {
  for (const [opener, type] of [
    ['<script>', 1],
    ['<textarea>', 1],
    ['<!-- comment -->', 2],
    ['<?processing-instruction>', 3],
    ['<!DOCTYPE html>', 4],
    ['<!doctype html>', 4],
    ['<![CDATA[data]]>', 5],
    ['<div>', 6],
    ['<div', 6],
    ['</table', 6],
    ['<h1', 6],
    ['<frame>', 6],
    ['<frameset>', 6],
    ['<noframes>', 6],
    ['<optgroup>', 6],
    ['<option>', 6],
    ['<param>', 6],
    ['<param/>', 6],
    ['<param />', 6],
    ['<span>', 7],
    ['<span title=">">', 7],
    ['<x-widget data-id="42" enabled>', 7],
    ["<x-widget data-id='42' path=/docs />", 7],
    ['</x-widget   >', 7],
    ['<div>type 6 remains prefix-based</div>', 6],
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${opener}\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      new RegExp(
        `unit "named-abstract": en: unit body contains a raw HTML block opener ` +
        `\\(CommonMark type ${type}\\)`
      ),
      opener
    );
  }

  const fenced = baseFixtures();
  fenced[1].bodies = [sameLanguageBodies([
    '```html\n<div>allowed in a confirmed fence</div>\n```\n\n',
  ])[0]];
  await assert.doesNotReject(validate(fenced));

  for (const prose of ['<div/x', '<div/extra>', '<param/extra>']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${prose}\n\n`])[0]];
    await assert.doesNotReject(validate(fx), prose);
  }

  const multiline = baseFixtures();
  multiline[1].bodies = [sameLanguageBodies([
    '<h1\n# hidden heading\n\n',
  ])[0]];
  await assert.rejects(
    validate(multiline),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 6\)/
  );
});

test('CommonMark HTML type 7 requires a standalone syntactically complete tag', async () => {
  for (const prose of [
    '<https://example.com>',
    '<person@example.com>',
    '<foo.bar>',
    '<span>inline prose</span>',
    '<x-widget bad==value>',
    '<x-widget title="unterminated>',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${prose}\n\n`])[0]];
    await assert.doesNotReject(validate(fx), prose);
  }
});

test('CommonMark HTML type 7 continues an active paragraph but interrupts at block start', async () => {
  for (const prose of ['<span>', '</span>', '<x-widget enabled>']) {
    const continuation = baseFixtures();
    continuation[1].bodies = [sameLanguageBodies([
      `paragraph\n${prose}\n\n`,
    ])[0]];
    await assert.doesNotReject(validate(continuation), prose);

    const blockStart = baseFixtures();
    blockStart[1].bodies = [sameLanguageBodies([`${prose}\n\n`])[0]];
    await assert.rejects(
      validate(blockStart),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      prose
    );
  }

  for (const body of [
    '- paragraph\n<span>\n\n',
    '> paragraph\n<span>\n\n',
  ]) {
    const continuation = baseFixtures();
    continuation[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(continuation), body);
  }
});

test('link reference definitions do not create type 7 paragraph context', async () => {
  for (const definition of [
    '[ref]: /url',
    ' [with-title]: <https://example.com/a b> "title"',
    '[escaped\\]]: /url',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${definition}\n<span>\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      definition
    );
  }

  const listDefinition = baseFixtures();
  listDefinition[1].bodies = [sameLanguageBodies([
    '- paragraph\n- [ref]: /url\n  <span>\n\n',
  ])[0]];
  await assert.rejects(
    validate(listDefinition),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/
  );

  for (const prose of [
    'inline [ref]: /url',
    '[]: /url',
    '[ref]: /url trailing prose',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${prose}\n<span>\n\n`])[0]];
    await assert.doesNotReject(validate(fx), prose);
  }
});

test('link reference definitions follow CommonMark 0.31.2 multiline and boundary rules', async () => {
  for (const body of [
    '[ref]: /url\n  "title"\n<span>\n\n',
    '[ref]:\n/url\n<span>\n\n',
    '[ref]:\n  /url\n  "title"\n<span>\n\n',
    '> [ref]:\n>   /url\n>   "title"\n> <span>\n\n',
    '- [ref]:\n  /url\n  "title"\n  <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }

  const multilineLabel = baseFixtures();
  multilineLabel[1].bodies = [sameLanguageBodies([
    '[\nfoo\n]: /url\n<span>\n\n',
  ])[0]];
  await assert.rejects(
    validate(multilineLabel),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/
  );

  for (const body of [
    'Foo\n[bar]: /baz\n[bar]\n\n',
    'Foo\n[bar]: /baz\n<span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  for (const body of [
    'Foo\n- [bar]: /baz\n<span>\n\n',
    '> Foo\n> - [bar]: /baz\n> <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }

  for (const body of [
    '- Foo\n  [bar]: /baz\n  <span>\n\n',
    '> Foo\n> [bar]: /baz\n> <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  for (const body of [
    '[ref]: /url\\ x\n<span>\n\n',
    `[ref]: /url${String.fromCharCode(0x7f)}\n<span>\n\n`,
    `[ref]: a${'('.repeat(33)}${')'.repeat(33)}\n<span>\n\n`,
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  for (const nesting of [32]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `[ref]: a${'('.repeat(nesting)}${')'.repeat(nesting)}\n<span>\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/
    );
  }

  for (const count of [499, 500, 999]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `[${'😀'.repeat(count)}]: /url\n<span>\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      `${count} Unicode code points`
    );
  }

  for (const count of [1000]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `[${'😀'.repeat(count)}]: /url\n<span>\n\n`,
    ])[0]];
    await assert.doesNotReject(validate(fx), `${count} Unicode code points`);
  }
});

test('speculative link definitions replay every buffered line when they roll back', async () => {
  for (const body of [
    '[\n# injected\n] not-a-definition\n\n',
    "[ref]: /url '\n# injected\n\n",
    '> [ref]:\n# injected\n\n',
    "[ref]: /url '\n# injected",
    '[\n# injected',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading outside a fenced code block/,
      body
    );
  }

  const setext = baseFixtures();
  setext[1].bodies = [sameLanguageBodies([
    '[\nTitle\n] not-a-definition\n---\n\n',
  ])[0]];
  await assert.rejects(
    validate(setext),
    /unit "named-abstract": en: unit body contains a Setext heading outside a fenced code block/
  );

  const html = baseFixtures();
  html[1].bodies = [sameLanguageBodies([
    '[\n<div>\n] not-a-definition\n\n',
  ])[0]];
  await assert.rejects(
    validate(html),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 6\)/
  );
});

test('link reference definitions allow lazy continuation inside containers', async () => {
  for (const body of [
    '> [ref]:\n/url\n> <span>\n\n',
    '- [ref]:\n/url\n  <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }
});

test('thematic breaks take precedence over list items in every container', async () => {
  for (const body of [
    '* item\n* * *\n  <span>\n\n',
    '> * item\n> * * *\n>   <span>\n\n',
    '- outer\n  * item\n  * * *\n    <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }
});

test('link-label limits count source code points before tab expansion', async () => {
  const exactly999 = baseFixtures();
  exactly999[1].bodies = [sameLanguageBodies([
    `[x\t${'a'.repeat(997)}]: /url\n<span>\n\n`,
  ])[0]];
  await assert.rejects(
    validate(exactly999),
    /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/
  );

  const exactly1000 = baseFixtures();
  exactly1000[1].bodies = [sameLanguageBodies([
    `[x\t${'a'.repeat(998)}]: /url\n<span>\n\n`,
  ])[0]];
  await assert.doesNotReject(validate(exactly1000));
});

test('thematic breaks close a list before following indented code', async () => {
  for (const body of [
    '- item\n---\n    # code, not a heading\n\n',
    '- item\n---\n    <span>\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }
});

test('thematic breaks are checked after every nested list marker', () => {
  for (const body of [
    '- * * *\n      # indented code\n',
    '> - * * *\n>       # indented code\n',
    '- > * * *\n      >       # indented code\n',
    '> - > * * *\n>       >       # indented code\n',
  ]) {
    assert.deepEqual(findHeadings(body), [], body);
  }
});

test('speculative link definitions stop at paragraph-interrupting block openers', async () => {
  for (const body of [
    '[ref]: /url "\n# injected\n"\n\n',
    '[\n# injected\n]: /url\n\n',
    '[ref]: /url "\n```\n# hidden\n```\n"\n# injected\n\n',
    '[ref]: /url "\n---\nTitle\n---\n"\n\n',
    '[ref]: /url "\n> # injected\n"\n\n',
    '[ref]: /url "\n- # injected\n"\n\n',
    '[ref]: /url "\n<script>\n"\n\n',
    '[ref]: /url "\n<!-- comment -->\n"\n\n',
    '[ref]: /url "\n<?pi>\n"\n\n',
    '[ref]: /url "\n<!DOCTYPE html>\n"\n\n',
    '[ref]: /url "\n<![CDATA[data]]>\n"\n\n',
    '[ref]: /url "\n<div>\n"\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(validate(fx), body);
  }

  const type7 = baseFixtures();
  type7[1].bodies = [sameLanguageBodies([
    '[ref]: /url "\n<span>\n"\n\n',
  ])[0]];
  await assert.doesNotReject(validate(type7));
});

test('Setext underlines interrupt only incomplete link reference definitions', async () => {
  for (const [body, level] of [
    ['[\n===\n]: /url\n\n', 1],
    ['[\n---\n]: /url\n\n', 2],
    ['[ref]:\n===\n\n', null],
    ['[ref]: /url "\n===\n"\n\n', null],
    ['[ref]:\n---\n\n', null],
    ['[ref]: /url "\n---\n"\n\n', null],
  ]) {
    if (level !== null) assert.equal(findHeadings(body)[0]?.level, level);
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading outside a fenced code block/,
      body
    );
  }

  // CommonMark example 216: the destination completes the definition, so the
  // following underline is ordinary paragraph content rather than a heading.
  for (const body of [
    '[foo]: /url\n===\n[foo]\n\n',
    '[foo]: /url\n---\n[foo]\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }
});

test('suppressed Setext interruption completes lazy link definitions before type-7 HTML', async () => {
  for (const body of [
    '- [ref]:\n===\n<span>\n\n',
    '> - [ref]:\n===\n<span>\n\n',
    '- > [ref]:\n===\n<span>\n\n',
    '> - > [ref]:\n===\n<span>\n\n',
  ]) {
    const headings = findHeadings(body);
    assert.equal(headings.length, 1, body);
    assert.equal(headings[0].type, 'HTML', body);
    assert.equal(headings[0].htmlType, 7, body);
    assert.equal(headings[0].line, 3, body);
    assert.equal(headings[0].container, 'root', body);

    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a raw HTML block opener \(CommonMark type 7\)/,
      body
    );
  }
});

test('large unterminated link-definition rollback is iterative and non-variadic', () => {
  // Reads the generator's SOURCE TEXT, so the path is anchored two
  // directories up at scripts/ rather than beside this file — the same
  // hop every module that moved down a level has had to account for.
  const source = fs.readFileSync(
    new URL('../../build_spec/units/containers.mjs', import.meta.url), 'utf8');
  const rollback = source.match(
    /const rollbackLinkDefinition = \(\) => \{[\s\S]*?\n  \};/
  )?.[0];
  assert.ok(rollback, 'rollback implementation should remain locally inspectable');
  assert.doesNotMatch(rollback, /\.\.\./, 'rollback must not use spread arguments');
  assert.match(rollback, /queue\[linkDefinition\.startCursor\]\.skipLinkDefinition/,
    'rollback must rewind by cursor instead of rebuilding the queue');

  const body = '[ref]: /url "\n' + 'title line\n'.repeat(256);
  assert.deepEqual(findHeadings(body), []);
});

test('link definition continuations allow indented code and preserve tab remainders', async () => {
  const indented = baseFixtures();
  indented[1].bodies = [sameLanguageBodies([
    '[ref]:\n    /url\n    "title"\n---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(indented));

  const tabbedBlockquote = baseFixtures();
  tabbedBlockquote[1].bodies = [sameLanguageBodies([
    '>\t[ref]: /url\n> ---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(tabbedBlockquote));
});

test('CommonMark NUL preprocessing applies only to U+0000 in destinations', async () => {
  const nul = baseFixtures();
  nul[1].bodies = [sameLanguageBodies([
    `[ref]: a${String.fromCharCode(0)}b\n---\n\n`,
  ])[0]];
  await assert.doesNotReject(validate(nul));

  for (const control of [1, 0x7f]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `[ref]: a${String.fromCharCode(control)}b\n---\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading outside a fenced code block/,
      `U+${control.toString(16).toUpperCase().padStart(4, '0')}`
    );
  }
});

test('an invalid maybe-title candidate does not roll back its completed definition', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies([
    '[ref]: /url\n"title" trailing\n\n',
  ])[0]];
  await assert.doesNotReject(validate(fx));
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
