import assert from 'node:assert/strict';
import { langSeparator } from '../../build_spec/shared.mjs';
import fs from 'node:fs';
import path from 'node:path';

import {
  README_SOURCE_FILE,
  hasLoneSurrogate,
} from '../../build_spec.mjs';

import {
  LAST,
  baseFixtures,
  bodySource,
  bodyWithOneInteriorBlank,
  metaJs,
  sameLanguageBodies,
  splitBody,
  symlinksSupported,
  unitMeta,
  validate,
  write,
} from '../helpers.mjs';

// ---- body-N.js raw-source shape scanner (round 19, finding 1) ----

export async function body1MdWithATextBeforeTheFirstSeparatorIsRejected() {
  // The old format's guard was "this file must not be executable code".
  // Markdown cannot be executed, so the guard that replaces it is about
  // the format's one real ambiguity: where does the first block begin?
  const stray =
    'stray prose that belongs to no language\n' +
    langSeparator('en') + '\na\n' +
    langSeparator('ru') + '\nb\n' +
    langSeparator('zh') + '\nc\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.md'), stray)),
    (e) => /unit "sec-1": body-1\.md: must begin with a ">>>>> lang=" separator/.test(e.message)
  );
}

export async function body1MdWithADuplicateLanguageBlockIsRejected() {
  const duplicated =
    langSeparator('en') + '\na\n' +
    langSeparator('ru') + '\nb\n' +
    langSeparator('en') + '\nagain\n' +
    langSeparator('zh') + '\nc\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.md'), duplicated)),
    (e) => /unit "sec-1": body-1\.md: duplicate separator ">>>>> lang=en"/.test(e.message)
  );
}

export async function body1MdWithASeparatorThatIsNotAloneOnItsLineIsRejected() {
  // ">>>>> lang=en" followed by more text on the same line is content, not
  // a separator, and taking it for one would silently swallow the rest of
  // that line into nothing.
  const inline =
    langSeparator('en') + ' and more\na\n' +
    langSeparator('ru') + '\nb\n' +
    langSeparator('zh') + '\nc\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.md'), inline)),
    (e) => /unit "sec-1": body-1\.md: unexpected language block\(s\) en and more/.test(e.message)
  );
}

export async function body1MdCarriesBackticksAndBackslashesVerbatim() {
  // The whole point of the format: a specification full of code fences
  // needs no escaping at all. What goes in comes out, byte for byte.
  const RAW = {
    en: 'fence:\n```ktav\na: 1\n```\nbackslash \\ dollar ${ done\n',
    ru: 'забор:\n```ktav\na: 1\n```\nслэш \\ доллар ${ конец\n',
    zh: '围栏:\n```ktav\na: 1\n```\n反斜杠 \\ 美元 ${ 结束\n',
  };
  const bodyText =
    langSeparator('en') + '\n' + RAW.en +
    langSeparator('ru') + '\n' + RAW.ru +
    langSeparator('zh') + '\n' + RAW.zh;
  const { units } = await validate(baseFixtures(), null, (c) =>
    write(path.join(c, 'sec-1', 'body-1.md'), bodyText));
  const part = units.get('sec-1').parts[0];
  assert.equal(part.en, RAW.en);
  assert.equal(part.ru, RAW.ru);
  assert.equal(part.zh, RAW.zh);
}

export async function metaJsTitleWithAnEmbeddedNewlineIsRejected() {
  const fx = baseFixtures();
  fx[1].meta = unitMeta('named');
  fx[1].meta.title = { en: 'Abstract', ru: 'Анно\nтация', zh: '摘要' };
  await assert.rejects(
    validate(fx),
    (e) => /unit "named-abstract": title\.ru must be single-line \(CR\/LF not allowed\)/.test(e.message)
  );
}

// ---- manifest.js / meta.js are JSON data, never executed (round 20, finding 1) ----

export async function manifestJsWithAnImportPrefixIsRejectedBeforeAnyCodeExecutes() {
  // The import target deliberately does not exist: if the builder ever
  // executed this file, the failure would be a module-not-found error, not
  // the shape error -- proving the shape check fires BEFORE any import.
  const evilManifest =
    "import fs from './module-that-does-not-exist.js';\n" +
    'export default ' + JSON.stringify(['frontmatter', 'named-abstract', 'sec-1']) + ';\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'manifest.js'), evilManifest)),
    (e) =>
      /manifest\.js must start with exactly "export default "/.test(e.message) &&
      !/Cannot find module|module-that-does-not-exist|ERR_MODULE_NOT_FOUND/.test(e.message)
  );
}

export async function manifestJsThatIsASymlinkIsRejectedAsNotARegularFileBeforeAnyRead(t) {
  if (!symlinksSupported()) {
    t.skip('symlink creation unavailable without privileges (Windows without admin/Developer Mode); this test MUST run on POSIX CI');
    return;
  }
  // The target's content would fail every content check; getting the
  // file-type error instead proves the target was never opened.
  await assert.rejects(
    validate(baseFixtures(), null, (c) => {
      const outside = path.join(c, '..', 'outside-manifest.js');
      fs.writeFileSync(outside, 'totally not JavaScript\n');
      fs.rmSync(path.join(c, 'manifest.js'));
      fs.symlinkSync(outside, path.join(c, 'manifest.js'), 'file');
    }),
    (e) =>
      /manifest\.js is not a regular file/.test(e.message) &&
      !/must start with exactly|JSON\.parse failed/.test(e.message)
  );
}

export async function metaJsWithAnImportPrefixIsRejectedBeforeAnyCodeExecutes() {
  const evilMeta =
    "import en from './evil.js';\n" +
    'export default ' + JSON.stringify(unitMeta('named')) + ';\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), evilMeta)),
    (e) =>
      /meta\.js must start with exactly "export default "/.test(e.message) &&
      !/Cannot find module|evil\.js|ERR_MODULE_NOT_FOUND/.test(e.message)
  );
}

export async function metaJsWithAComputedTitleValueIsRejectedAtJSONParseNotAtALaterRuntimeShapeCheck() {
  const evilMeta =
    'export default {\n' +
    '  "kind": "named",\n' +
    '  "number": null,\n' +
    '  "level": 2,\n' +
    '  "title": { "en": "Ab" + "stract", "ru": "Аннотация", "zh": "摘要" },\n' +
    '  "bodyParts": 1\n' +
    '}\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), evilMeta)),
    (e) =>
      /meta\.js is not "export default " \+ JSON \+ "\\n": JSON\.parse failed/.test(e.message) &&
      !/title keys must be exactly|title\.en/.test(e.message)
  );
}

export async function metaJsWithoutExactlyOneTrailingNewlineIsRejected() {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'),
        'export default ' + JSON.stringify(unitMeta('named')) + '\n\n')),
    (e) => /must be byte-identical to the canonical serialization/.test(e.message)
  );
}

// ---- canonical byte form, strict UTF-8, lone surrogates (round 21) ----

export async function readmeDocumentedSec99MetaJsExampleIsAcceptedVerbatimInENRUAndZHDocsAndBuilderAgree(t) {
  // Acceptance test for the three content READMEs (round 22, finding 3):
  // the example documented in EACH language copy is copied byte-for-byte out
  // of that real file and must pass the real validator unchanged; previously
  // only the EN README was validated, so a drift introduced into the RU or
  // ZH copy alone would have gone unnoticed.
  const READMES = [
    ['en', 'README.md'],
    ['ru', 'README.ru.md'],
    ['zh', 'README.zh.md'],
  ];
  for (const [lang, readmeName] of READMES) {
    await t.test(`${readmeName}: documented sec-9.9/meta.js example is accepted verbatim`, async () => {
      const readme = fs.readFileSync(
        new URL('../../../versions/0.7/content/' + readmeName, import.meta.url), 'utf8');
      const m = readme.match(/`sec-9\.9\/meta\.js`:\s*\n+```js\n([\s\S]*?)```/);
      assert.ok(m, `sec-9.9/meta.js example not found in ${readmeName}`);
      const documented = m[1];
      assert.ok(documented.startsWith('export default {\n'));
      assert.ok(documented.endsWith('}\n'), 'example must end with a single newline and no semicolon');
      assert.ok(!documented.includes(';'), 'meta.js example must not contain a semicolon');
      const fx = [
        { name: 'frontmatter', meta: unitMeta('frontmatter'), bodies: [['# Frontmatter\n\nfm.\n\n', '# Frontmatter\n\nфм.\n\n', '# Frontmatter\n\n前言。\n\n']] },
        { name: 'sec-9.9', meta: unitMeta('numbered', { __num: '9.9' }), bodies: [LAST] },
      ];
      const { units } = await validate(fx, ['frontmatter', 'sec-9.9'], (c) =>
        write(path.join(c, 'sec-9.9', 'meta.js'), documented));
      const meta = units.get('sec-9.9').meta;
      assert.equal(meta.number, '9.9');
      assert.equal(meta.title.en, 'Widget Frobnication');
    });
  }
}

// Extracts one top-level object member (from its `  "key": {` opening line
// through the matching `  },` line) as a contiguous, canonically-formatted
// block from a metaJs()-style canonical serialization.
function topLevelObjectMember(canonical, key) {
  const open = '  "' + key + '": {\n';
  const close = '  },\n';
  const start = canonical.indexOf(open);
  assert.ok(start !== -1, `canonical fixture must contain member "${key}"`);
  const end = canonical.indexOf(close, start);
  assert.ok(end !== -1, `member "${key}" must be closed by ${JSON.stringify(close)}`);
  return canonical.slice(start, end + close.length);
}

export async function metaJsWithADuplicateTopLevelKeyIsRejectedByTheCanonicalByteCheck() {
  // Single-factor fixture (round 22, finding 2): the previous version wrote
  // both duplicated "title" objects inline on one line each, so the source
  // was ALREADY non-canonical for formatting reasons alone and this test
  // would have passed even if duplicate-key detection broke. The fixture is
  // now built by splicing one extra, canonically-formatted "title" member
  // block into the canonical serialization of a valid meta object, so that
  // removing either duplicated member restores exactly canonical bytes and
  // the duplicate key is the ONLY reason the source can be rejected.
  const effective = unitMeta('named');
  const stale = {
    ...effective,
    title: { en: 'stale English title', ru: 'устаревший заголовок', zh: '过期标题' },
  };
  const canonical = metaJs(effective); // what the canonical check compares against (JSON.parse keeps the last value)
  const staleBlock = topLevelObjectMember(metaJs(stale), 'title');
  const effectiveBlock = topLevelObjectMember(canonical, 'title');
  const duplicated = canonical.replace(effectiveBlock, staleBlock + effectiveBlock);
  // Isolation proof: deleting exactly one of the two duplicated members
  // restores a perfectly canonical file (either one).
  assert.equal(duplicated.replace(staleBlock, ''), canonical);
  assert.equal(duplicated.replace(effectiveBlock, ''), metaJs(stale));
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), duplicated)),
    (e) => /must be byte-identical to the canonical serialization/.test(e.message) &&
      /first difference at byte offset \d+/.test(e.message) &&
      !/title keys must be exactly/.test(e.message)
  );
}

export async function metaJsWithADuplicateKeyNestedInsideTitleIsRejectedByTheCanonicalByteCheck() {
  const dupTitle =
    'export default {\n' +
    '  "kind": "named",\n' +
    '  "number": null,\n' +
    '  "level": 2,\n' +
    '  "title": {\n' +
    '    "en": "stale English title",\n' +
    '    "en": "effective English title",\n' +
    '    "ru": "Аннотация",\n' +
    '    "zh": "摘要"\n' +
    '  },\n' +
    '  "bodyParts": 1\n' +
    '}\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), dupTitle)),
    (e) => /must be byte-identical to the canonical serialization/.test(e.message) &&
      !/title keys must be exactly|missing key/.test(e.message)
  );
}

export async function metaJsWithCRLFLineEndingsIsRejectedAlsoClosesRound21Finding4() {
  const crlf = metaJs(unitMeta('named')).replace(/\n/g, '\r\n');
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), crlf)),
    (e) => /must be byte-identical to the canonical serialization/.test(e.message)
  );
}

export async function metaJsWithATrailingTabOrSpaceBeforeTheFinalNewlineIsRejectedFinding4() {
  const base = metaJs(unitMeta('named'));
  for (const [label, broken] of [
    ['tab', base.replace(/\}\n$/, '}\t\n')],
    ['space', base.replace(/\}\n$/, '} \n')],
  ]) {
    await assert.rejects(
      validate(baseFixtures(), null, (c) =>
        write(path.join(c, 'named-abstract', 'meta.js'), broken)),
      (e) => /must be byte-identical to the canonical serialization/.test(e.message),
      `trailing ${label} before the final newline must be rejected`
    );
  }
}

export async function metaJsWithInvalidUTF8BytesIsRejectedInsteadOfSilentlyDecoded() {
  // A JS string cannot represent invalid UTF-8, so corrupt one continuation
  // byte of a multi-byte character at the raw Buffer level.
  const good = Buffer.from(metaJs(unitMeta('named')), 'utf8');
  const anchor = Buffer.from('Аннотация', 'utf8');
  const at = good.indexOf(anchor);
  assert.notEqual(at, -1);
  const broken = Buffer.from(good);
  broken[at + 1] = 0xFF; // 0xD0 0x90 ("А") -> 0xD0 0xFF: invalid continuation byte
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), broken)),
    (e) => /meta\.js is not valid UTF-8/.test(e.message)
  );
}

export async function body1JsWithInvalidUTF8BytesIsRejectedInsteadOfSilentlyDecoded() {
  const good = Buffer.from(bodySource('x\n', 'ы\n', 'z\n'), 'utf8');
  const anchor = Buffer.from('ы', 'utf8');
  const at = good.indexOf(anchor);
  assert.notEqual(at, -1);
  const broken = Buffer.from(good);
  broken[at + 1] = 0x41; // 0xD1 0x8B ("ы") -> 0xD1 0x41: invalid continuation byte
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.md'), broken)),
    (e) => /unit "sec-1": body-1\.md is not valid UTF-8/.test(e.message)
  );
}

export async function body1JsWithASimpleRawCRIsRejectedBeforeDecoding() {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.md'), bodySource('end.\r\n', 'konets.\r\n', 'zhong.\r\n'))),
    (e) => /unit "sec-1": body-1\.md contains a raw carriage return \(CR, 0x0D\)/.test(e.message)
  );
}

export async function body1JsWithRawCRInA120PlusLineSplitIsRejectedBeforeSplitting() {
  const fx = baseFixtures();
  const body = bodyWithOneInteriorBlank(130, 64).replace('paragraph-1', 'paragraph-1\r');
  const cut = body.indexOf('\n\n') + 2;
  fx[2].meta = unitMeta('numbered', { __num: '1', bodyParts: 2 });
  fx[2].bodies = sameLanguageBodies(splitBody(body, cut));
  await assert.rejects(
    validate(fx),
    (e) => /unit "sec-1": body-1\.md contains a raw carriage return \(CR, 0x0D\)/.test(e.message)
  );
}

export async function readmeSourceJsWithARawCRIsRejectedBeforeDecoding() {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, README_SOURCE_FILE), bodySource('# content README\r\n', '# content README\r\n', '# content README\r\n'))),
    (e) => /README\.source\.md contains a raw carriage return \(CR, 0x0D\)/.test(e.message)
  );
}

export async function metaJsTitleContainingAnUnpairedSurrogateEscapeIsRejectedAsALoneSurrogate() {
  const fx = baseFixtures();
  fx[1].meta = unitMeta('named');
  fx[1].meta.title.ru = 'Аннотация \uD800 конец';
  // Canonical JSON.stringify escapes the lone surrogate as "\ud800", so the
  // file passes the canonical byte check and must then be rejected by the
  // dedicated lone-surrogate check in validateMeta.
  await assert.rejects(
    validate(fx),
    (e) => /title\.ru contains an unpaired UTF-16 surrogate/.test(e.message)
  );
}

export function haslonesurrogateFlagsUnpairedSurrogatesAndAcceptsValidSurrogatePairs() {
  assert.equal(hasLoneSurrogate('plain text'), false);
  assert.equal(hasLoneSurrogate('汉字 и буквы'), false);
  assert.equal(hasLoneSurrogate('a\uD800b'), true);
  assert.equal(hasLoneSurrogate('\uDC00'), true);
  assert.equal(hasLoneSurrogate('before\uDEAD'), true);
  assert.equal(hasLoneSurrogate('pair \uD83D\uDE00 done'), false);
  assert.equal(hasLoneSurrogate('汉字😀'), false);
}

// ---- UTF-8 BOM rejected at the raw-byte level (round 22, finding 1) ----
//
// TextDecoder's default ignoreBOM: false treats a leading BOM as an encoding
// signature and silently strips it from the decoded string; the BOM bytes are
// valid UTF-8, so the fatal decoder does not reject them either. Without a
// raw-byte check, a BOM-prefixed file would decode to exactly the canonical
// BOM-less string and pass both the prefix check and the canonical
// byte-identity check. The fixtures below prepend the BOM as RAW BYTES
// (never via a JS string literal) so the tests exercise the byte-level
// concern directly.

function withUtf8Bom(content) {
  return Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(content, 'utf8')]);
}

export async function manifestJsWithAUTF8BOMIsRejectedBeforeDecoding() {
  const canonicalManifest =
    'export default ' + JSON.stringify(['frontmatter', 'named-abstract', 'sec-1'], null, 2) + '\n';
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'manifest.js'), withUtf8Bom(canonicalManifest))),
    (e) => /manifest\.js starts with a UTF-8 byte-order mark/.test(e.message)
  );
}

export async function metaJsWithAUTF8BOMIsRejectedBeforeDecoding() {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'named-abstract', 'meta.js'), withUtf8Bom(metaJs(unitMeta('named'))))),
    (e) => /meta\.js starts with a UTF-8 byte-order mark/.test(e.message)
  );
}

export async function body1JsWithAUTF8BOMIsRejectedBeforeDecoding() {
  await assert.rejects(
    validate(baseFixtures(), null, (c) =>
      write(path.join(c, 'sec-1', 'body-1.md'), withUtf8Bom(bodySource('x\n', 'y\n', 'z\n')))),
    (e) => /unit "sec-1": body-1\.md starts with a UTF-8 byte-order mark/.test(e.message)
  );
}

// ---- escape grammar: "$" without "{" is not a valid escape (round 20, finding 3) ----

export async function bodyMdKeepsDollarBraceAndLoneBackslashAsOrdinaryText() {
  // The old format had to spell out an escape grammar because "${" began
  // an interpolation and "\\" began an escape. Markdown has neither, so
  // the rule that replaces three rejection cases is a single positive
  // one: these are just characters, and they come out as they went in.
  const RAW = {
    en: 'price is $5, cost \\${x} here, path C:\\temp\n',
    ru: 'цена $5, стоимость \\${y} тут, путь C:\\temp\n',
    zh: '价格 $5，费用 \\${z}，路径 C:\\temp\n',
  };
  const bodyText =
    langSeparator('en') + '\n' + RAW.en +
    langSeparator('ru') + '\n' + RAW.ru +
    langSeparator('zh') + '\n' + RAW.zh;
  const { units } = await validate(baseFixtures(), null, (c) =>
    write(path.join(c, 'sec-1', 'body-1.md'), bodyText));
  const part = units.get('sec-1').parts[0];
  assert.equal(part.en, RAW.en);
  assert.equal(part.ru, RAW.ru);
  assert.equal(part.zh, RAW.zh);
}

