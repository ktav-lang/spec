import test from 'node:test';
import assert from 'node:assert/strict';

import { LANGS } from '../../build_spec.mjs';
import { baseFixtures, sameLanguageBodies, validate } from '../helpers.mjs';

test('unit bodies reject injected ATX headings independently in EN, RU and ZH', async () => {
  for (const langIndex of [0, 1, 2]) {
    const fx = baseFixtures();
    const body = ['body.\n\n', 'body.\n\n', 'body.\n\n'];
    body[langIndex] += '## 1. Intro\n\n';
    fx[1].bodies = [body];
    await assert.rejects(
      validate(fx),
      (e) => new RegExp(
        `unit "named-abstract": ${LANGS[langIndex]}: unit body contains an ATX heading`
      ).test(e.message),
      `${LANGS[langIndex]} injected heading must be rejected`
    );
  }
});

test('unit bodies reject injected Setext H1 and H2 headings', async () => {
  for (const underline of ['===', '---']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`Injected title\n${underline}\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      (e) => /unit "named-abstract": en: unit body contains a Setext heading/.test(e.message)
    );
  }
});

test('a single dash uses Setext precedence over an empty list marker', async () => {
  for (const body of [
    'Root paragraph\n-\n\n',
    '> Blockquote paragraph\n> -\n\n',
    '- List paragraph\n  -\n\n',
    'Root paragraph\n+\n---\n\n',
    'Root paragraph\n*\n---\n\n',
    'Root paragraph\n1.\n---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading/,
      body
    );
  }
});

test('only an empty list marker gets Setext precedence over an active paragraph', async () => {
  for (const body of [
    'Root paragraph\n- content\n---\n\n',
    'Root paragraph\n+ content\n---\n\n',
    'Root paragraph\n* content\n---\n\n',
    'Root paragraph\n1. content\n---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  const realListHeading = baseFixtures();
  realListHeading[1].bodies = [sameLanguageBodies([
    'Root paragraph\n- ## real list heading\n\n',
  ])[0]];
  await assert.rejects(
    validate(realListHeading),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );
});

test('Setext precedence applies only to truly empty markers in the active container', async () => {
  for (const body of [
    'Root paragraph\n- ## list heading\n\n',
    'Root paragraph\n  - ## nested list heading\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }

  for (const marker of ['+', '*', '1.']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `Root paragraph\n${marker}\n===\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading/,
      marker
    );
  }
});

test('a Unicode separator is content, not ASCII blank, before a Setext underline', async () => {
  for (const separator of ['\u2028', '\u00a0']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      `- list paragraph\n${separator}\n===\n\n`,
    ])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading/,
      `U+${separator.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
    );
  }
});

test('ATX-looking lines inside backtick and tilde fences are accepted', async () => {
  const fenced =
    '```text\n' +
    '# inside backticks\n' +
    'Setext inside backticks\n' +
    '---\n' +
    '```\n\n' +
    '~~~text\n' +
    '## inside tildes\n' +
    'Setext inside tildes\n' +
    '===\n' +
    '~~~\n\n';
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies([fenced])[0]];
  await assert.doesNotReject(validate(fx));
});

test('a standalone thematic break is not treated as a Setext heading', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies(['---\n\n'])[0]];
  await assert.doesNotReject(validate(fx));
});

test('unit heading checks normalize blockquote/list containers without treating indented code as prose', async () => {
  const rejected = [
    ['> ## injected\n\n', /unit "named-abstract": en: unit body contains an ATX heading/],
    ['> Title\n> ---\n\n', /unit "named-abstract": en: unit body contains a Setext heading/],
    ['- ## injected\n\n', /unit "named-abstract": en: unit body contains an ATX heading/],
    ['- Title\n  ---\n\n', /unit "named-abstract": en: unit body contains a Setext heading/],
  ];
  for (const [body, expected] of rejected) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(validate(fx), expected, JSON.stringify(body));
  }

  for (const body of [
    '\tindented code\n---\n\n',
    '    indented code\n---\n\n',
    '> text\n---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), JSON.stringify(body));
  }
});

test('heading checks recursively normalize blockquote and list containers in either order', async () => {
  const rejected = [
    '> - ## nested',
    '- > ## nested',
    '> - > - ## deeply nested',
    '- > - > ## deeply nested',
    '> - Title\n>   ---',
    '- > Title\n  > ---',
    '  - Title\n    ---',
  ];
  for (const body of rejected) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`${body}\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains (?:an ATX|a Setext) heading/,
      body
    );
  }
});

test('fences are scoped to their container and reprocess lines that leave it', async () => {
  for (const body of [
    '- ```text\n  # inside the list fence\n  ```\n\n',
    '> - ```text\n>   # inside the nested fence\n>   ```\n\n',
    '```text\n> ## blockquote marker is root-fence code\n' +
      '- ## list marker is root-fence code\n' +
      '1. ## ordered marker is root-fence code\n' +
      '> ```\n' +
      '# still root-fence code\n```\n\n',
    '> ```text\n> > ## deeper quote marker is code\n' +
      '> > ```\n> # still quote-fence code\n' +
      '> - ## nested list marker is code\n> ```\n\n',
    '- ```text\n  > ## nested quote marker is code\n' +
      '  - ```\n  # still list-fence code\n' +
      '  - ## nested list marker is code\n  ```\n\n',
    '> - ```text\n>   > ## marker after quote/list continuation is code\n' +
      '>   - ## list marker after continuation is code\n>   ```\n\n',
    '- > ```text\n  > > ## marker after list/quote continuation is code\n' +
      '  > 1. ## ordered marker after continuation is code\n  > ```\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }

  for (const body of [
    '- ```text\n  # inside the list fence\n# root heading escapes the fence\n',
    '> ```text\n> # inside the quote fence\n# root heading escapes the fence\n',
    '> - ```text\n>   # inside the nested fence\n> - # sibling heading escapes the fence\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }
});

test('list-contained fences survive unindented blank lines and preserve frame state', async () => {
  for (const blanks of ['', '\n', '\n\n']) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([
      '- ```text\n' + blanks +
      '  # still inside the list fence\n' +
      '  ```\n\n',
    ])[0]];
    await assert.doesNotReject(validate(fx), JSON.stringify(blanks));
  }

  const escaping = baseFixtures();
  escaping[1].bodies = [sameLanguageBodies([
    '- ```text\n\n' +
    '# root heading escapes the list fence\n',
  ])[0]];
  await assert.rejects(
    validate(escaping),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );
});

test('unquoted blank lines end quote fences but quoted blank lines do not', async () => {
  const unquotedBlank = baseFixtures();
  unquotedBlank[1].bodies = [sameLanguageBodies([
    '> ```text\n' +
    '> code\n' +
    '\n' +
    '# heading after the quote fence\n',
  ])[0]];
  await assert.rejects(
    validate(unquotedBlank),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );

  const quotedBlank = baseFixtures();
  quotedBlank[1].bodies = [sameLanguageBodies([
    '> ```text\n' +
    '> code\n' +
    '> \n' +
    '> # inside the quote fence\n' +
    '> ```\n\n',
  ])[0]];
  await assert.doesNotReject(validate(quotedBlank));
});

test('a normalized empty blockquote line clears the active paragraph', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies([
    '> Paragraph\n> \n> ---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(fx));
});

test('list padding consumes one to four spaces but leaves five-plus as indented code', async () => {
  for (const spaces of [1, 2, 3, 4]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`-${' '.repeat(spaces)}## injected\n\n`])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      `${spaces} spaces`
    );
  }
  for (const spaces of [5, 6]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([`-${' '.repeat(spaces)}## indented code\n\n`])[0]];
    await assert.doesNotReject(validate(fx), `${spaces} spaces`);
  }
  for (const body of [
    '-\t## tab-padded heading\n\n',
    '>\t## tab-padded blockquote heading\n\n',
    '- \t## tab-padded heading\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }
});

test('list fence padding expands tabs from the absolute parent column', async () => {
  const fx = baseFixtures();
  fx[1].bodies = [sameLanguageBodies([
    '  -\t```text\n' +
    '\t# inside the list fence\n' +
    '\t```\n' +
    '  - ## heading after the fence\n\n',
  ])[0]];
  await assert.rejects(
    validate(fx),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );

  const noFalseRed = baseFixtures();
  noFalseRed[1].bodies = [sameLanguageBodies([
    '  -\t```text\n' +
    '\t# inside the list fence\n' +
    '\t```\n\n',
  ])[0]];
  await assert.doesNotReject(validate(noFalseRed));
});

test('active paragraphs survive non-interrupting indented and lazy continuation lines', async () => {
  for (const body of [
    'Root paragraph\n    indented continuation\n---\n\n',
    '- List paragraph\nlazy continuation\n  ---\n\n',
    '> Paragraph\nlazy continuation\n> ---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains a Setext heading/,
      body
    );
  }

  const interrupted = baseFixtures();
  interrupted[1].bodies = [sameLanguageBodies([
    'Root paragraph\n- content\n---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(interrupted));

  const lazyOrdered = baseFixtures();
  lazyOrdered[1].bodies = [sameLanguageBodies([
    '> Paragraph\n2. lazy continuation\n> ---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(lazyOrdered));
});

test('ordered list interruption follows the CommonMark start-number rule', async () => {
  const nonInterrupting = baseFixtures();
  nonInterrupting[1].bodies = [sameLanguageBodies([
    'paragraph remains active\n2. ## accepted paragraph content\n\n',
  ])[0]];
  await assert.doesNotReject(validate(nonInterrupting));

  const interrupting = baseFixtures();
  interrupting[1].bodies = [sameLanguageBodies([
    'paragraph remains active\n1. ## injected list heading\n\n',
  ])[0]];
  await assert.rejects(
    validate(interrupting),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );

  for (const body of [
    'paragraph remains active\n01. ## injected list heading\n\n',
    'paragraph remains active\n000000001. ## injected list heading\n\n',
  ]) {
    const leadingZero = baseFixtures();
    leadingZero[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(leadingZero),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }

  const nonOneWithLeadingZero = baseFixtures();
  nonOneWithLeadingZero[1].bodies = [sameLanguageBodies([
    'paragraph remains active\n000000002. ## paragraph content\n\n',
  ])[0]];
  await assert.doesNotReject(validate(nonOneWithLeadingZero));

  const sibling = baseFixtures();
  sibling[1].bodies = [sameLanguageBodies([
    '1. first\n2. # hidden in the next list item\n\n',
  ])[0]];
  await assert.rejects(
    validate(sibling),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );
});

test('Setext and block-start lines do not become lazy continuations after an interrupted list', async () => {
  const directList = baseFixtures();
  directList[1].bodies = [sameLanguageBodies([
    '- item\n===\n\n',
  ])[0]];
  await assert.doesNotReject(validate(directList));

  const falseRed = baseFixtures();
  falseRed[1].bodies = [sameLanguageBodies([
    'text\n+ item\n===\n\n',
  ])[0]];
  await assert.doesNotReject(validate(falseRed));

  const lazyQuote = baseFixtures();
  lazyQuote[1].bodies = [sameLanguageBodies([
    '> Paragraph\n2. lazy continuation\n> ---\n\n',
  ])[0]];
  await assert.doesNotReject(validate(lazyQuote));

  for (const body of [
    '> 1. first\n> 2. # hidden\n\n',
    '> prose\n2. # heading\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }
});

test('Setext-looking lazy continuation preserves its open list container', async () => {
  const hiddenHeading = baseFixtures();
  hiddenHeading[1].bodies = [sameLanguageBodies([
    '- text\n===\n    # injected heading\n\n',
  ])[0]];
  await assert.rejects(
    validate(hiddenHeading),
    /unit "named-abstract": en: unit body contains an ATX heading/
  );

  const indentedCode = baseFixtures();
  indentedCode[1].bodies = [sameLanguageBodies([
    '- text\n===\n      # list-item indented code\n\n',
  ])[0]];
  await assert.doesNotReject(validate(indentedCode));
});

test('tab-expanded container columns remain absolute and fenced tab content stays opaque', async () => {
  for (const body of [
    '  -\t```text\n' +
      '\t# inside the list fence\n' +
      '\t```\n' +
      '  - ## heading after the fence\n\n',
    '>  -\t```text\n' +
      '> \t# inside the nested fence\n' +
      '> \t```\n' +
      '>  - ## heading after the fence\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains an ATX heading/,
      body
    );
  }

  const fenced = baseFixtures();
  fenced[1].bodies = [sameLanguageBodies([
    '```text\n\t# tabbed code\n```\n\n',
  ])[0]];
  await assert.doesNotReject(validate(fenced));
});

test('tabs after blockquote markers preserve CommonMark heading boundaries', async () => {
  for (const body of [
    '>\t# injected heading\n\n',
    '> \tTitle\n> \t---\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.rejects(
      validate(fx),
      /unit "named-abstract": en: unit body contains (?:an ATX|a Setext) heading/,
      body
    );
  }

  for (const body of [
    '>\tordinary continuation\n\n',
    '> \t---\n\n',
    '> -\t```text\n> \t# nested fence content\n> \t```\n\n',
  ]) {
    const fx = baseFixtures();
    fx[1].bodies = [sameLanguageBodies([body])[0]];
    await assert.doesNotReject(validate(fx), body);
  }
});

