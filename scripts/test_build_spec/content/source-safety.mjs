// Content sources are data, never code. These cases pin that: an import
// prefix, a computed value, a raw `${...}` interpolation, a plain
// double-quoted field, a BOM, a raw CR, invalid UTF-8 and a lone
// surrogate are each rejected BEFORE anything is decoded or evaluated.

import { hasLoneSurrogate } from '../../build_spec.mjs';
import * as rawSource from '../markdown/raw-source.mjs';
import test from 'node:test';

test('body-1.js with an import prefix is rejected before any code executes', (t) => rawSource.body1JsWithAnImportPrefixIsRejectedBeforeAnyCodeExecutes(t));

test('body-1.js with a raw unescaped ${...} interpolation is rejected', (t) => rawSource.body1JsWithARawUnescapedInterpolationIsRejected(t));

test('body-1.js with plain double-quoted string fields is rejected (only the exact template-literal shape is accepted)', (t) => rawSource.body1JsWithPlainDoubleQuotedStringFieldsIsRejectedOnlyTheExactTemplateLiteralShapeIsAccepted(t));

test('body-1.js with correctly escaped backslash, backtick and ${ decodes round-trip to the original text', (t) => rawSource.body1JsWithCorrectlyEscapedBackslashBacktickAndDecodesRoundTripToTheOriginalText(t));

test('meta.js title with an embedded newline is rejected', (t) => rawSource.metaJsTitleWithAnEmbeddedNewlineIsRejected(t));

test('manifest.js with an import prefix is rejected before any code executes', (t) => rawSource.manifestJsWithAnImportPrefixIsRejectedBeforeAnyCodeExecutes(t));

test('manifest.js that is a symlink is rejected as not a regular file before any read', (t) => rawSource.manifestJsThatIsASymlinkIsRejectedAsNotARegularFileBeforeAnyRead(t));

test('meta.js with an import prefix is rejected before any code executes', (t) => rawSource.metaJsWithAnImportPrefixIsRejectedBeforeAnyCodeExecutes(t));

test('meta.js with a computed title value is rejected at JSON parse, not at a later runtime-shape check', (t) => rawSource.metaJsWithAComputedTitleValueIsRejectedAtJSONParseNotAtALaterRuntimeShapeCheck(t));

test('meta.js without exactly one trailing newline is rejected', (t) => rawSource.metaJsWithoutExactlyOneTrailingNewlineIsRejected(t));

test('README-documented sec-9.9 meta.js example is accepted verbatim in EN, RU and ZH (docs and builder agree)', (t) => rawSource.readmeDocumentedSec99MetaJsExampleIsAcceptedVerbatimInENRUAndZHDocsAndBuilderAgree(t));

test('meta.js with a duplicate top-level key is rejected by the canonical byte check', (t) => rawSource.metaJsWithADuplicateTopLevelKeyIsRejectedByTheCanonicalByteCheck(t));

test('meta.js with a duplicate key nested inside title is rejected by the canonical byte check', (t) => rawSource.metaJsWithADuplicateKeyNestedInsideTitleIsRejectedByTheCanonicalByteCheck(t));

test('meta.js with CRLF line endings is rejected (also closes round-21 finding 4)', (t) => rawSource.metaJsWithCRLFLineEndingsIsRejectedAlsoClosesRound21Finding4(t));

test('meta.js with a trailing tab or space before the final newline is rejected (finding 4)', (t) => rawSource.metaJsWithATrailingTabOrSpaceBeforeTheFinalNewlineIsRejectedFinding4(t));

test('meta.js with invalid UTF-8 bytes is rejected instead of silently decoded', (t) => rawSource.metaJsWithInvalidUTF8BytesIsRejectedInsteadOfSilentlyDecoded(t));

test('body-1.js with invalid UTF-8 bytes is rejected instead of silently decoded', (t) => rawSource.body1JsWithInvalidUTF8BytesIsRejectedInsteadOfSilentlyDecoded(t));

test('body-1.js with a simple raw CR is rejected before decoding', (t) => rawSource.body1JsWithASimpleRawCRIsRejectedBeforeDecoding(t));

test('body-1.js with raw CR in a 120-plus-line split is rejected before splitting', (t) => rawSource.body1JsWithRawCRInA120PlusLineSplitIsRejectedBeforeSplitting(t));

test('README.source.js with a raw CR is rejected before decoding', (t) => rawSource.readmeSourceJsWithARawCRIsRejectedBeforeDecoding(t));

test('meta.js title containing an unpaired surrogate escape is rejected as a lone surrogate', (t) => rawSource.metaJsTitleContainingAnUnpairedSurrogateEscapeIsRejectedAsALoneSurrogate(t));

test('hasLoneSurrogate flags unpaired surrogates and accepts valid surrogate pairs', (t) => rawSource.haslonesurrogateFlagsUnpairedSurrogatesAndAcceptsValidSurrogatePairs(t));

test('manifest.js with a UTF-8 BOM is rejected before decoding', (t) => rawSource.manifestJsWithAUTF8BOMIsRejectedBeforeDecoding(t));

test('meta.js with a UTF-8 BOM is rejected before decoding', (t) => rawSource.metaJsWithAUTF8BOMIsRejectedBeforeDecoding(t));

test('body-1.js with a UTF-8 BOM is rejected before decoding', (t) => rawSource.body1JsWithAUTF8BOMIsRejectedBeforeDecoding(t));

test('body field with bare \\$ escape before "5" is rejected as an unrecognised escape', (t) => rawSource.bodyFieldWithBareEscapeBefore5IsRejectedAsAnUnrecognisedEscape(t));

test('body field with bare \\$ escape before "x" is rejected as an unrecognised escape', (t) => rawSource.bodyFieldWithBareEscapeBeforeXIsRejectedAsAnUnrecognisedEscape(t));

test('body field with correctly escaped \\${ is accepted and decodes to the two literal characters "${"', (t) => rawSource.bodyFieldWithCorrectlyEscapedIsAcceptedAndDecodesToTheTwoLiteralCharacters(t));
