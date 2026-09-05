# Ktav Specification Changelog

**Languages:** **English** · [Русский](CHANGELOG.ru.md) · [简体中文](CHANGELOG.zh.md)

History of the format specification across all versions. The format is
hosted in this repository under [`versions/`](versions/); each version
is a self-contained directory with its own `spec.md` and `tests/`.

Versions follow `MAJOR.MINOR.PATCH`:

- `PATCH` — editorial (typo fixes, clarifications).
- `MINOR` — backward-compatible extensions.
- `MAJOR` — breaking changes.

**Pre-1.0 exception:** while `MAJOR` is `0`, a `MINOR` bump MAY carry
a breaking change instead of requiring a `MAJOR` bump (0.7.0 does
this over 0.6.x). Once the format reaches `1.0`, breaking changes
strictly require a `MAJOR` bump as stated above.

See the repository [`README.md`](README.md) for current `stable` and
`latest` pointers, or [`versions.ktav`](versions.ktav) for the
machine-readable index.

## Unreleased

Draft normative text and conformance fixtures for 0.7.0, under
`versions/0.7/`. Not yet the current stable specification — `versions.ktav`
still points `stable` and `latest` at 0.6.4 until this is actually released.

### Breaking

- **§ 3.3 — whitespace is now a fixed, exhaustively enumerated
  25-code-point set (`MUST`), not an implementation-defined `MAY`.**
  The set is Unicode's `White_Space` property as of Unicode 6.3 (2013),
  frozen by explicit list rather than by reference to "the current
  version of Unicode" — implementations MUST NOT delegate to a host
  language's built-in Unicode-whitespace primitive (verified to disagree
  with this list in both directions across at least two mainstream
  language runtimes). Non-breaking against every shipped 0.6.x Rust
  core, which already recognised the full set; breaking only for an
  implementation that took the old `MAY` at face value and stuck to
  ASCII space/tab.
- **§ 3.1 — leading-BOM handling is now deterministic.** A
  parser-conforming implementation MUST skip exactly one leading
  byte-order mark (U+FEFF) if it is the very first code point of the
  document, before any other byte; the canonical writer (§ 5.9)
  MUST NOT emit a leading byte-order mark. A U+FEFF anywhere else in
  the document is ordinary content — § 3.3 does not classify it as
  whitespace. 0.6.4 was silent on the byte-order mark; an earlier
  draft's non-deterministic `MAY skip` wording is gone.
- **§ 4 — key-segment trimming widens from ASCII-only to the same
  25-code-point set**, resolving a standing contradiction between § 3.3
  (which already permitted Unicode whitespace) and § 4 (which mandated
  ASCII-only specifically for keys). Two keys differing only by a
  non-ASCII whitespace code point at a trimmed edge, previously distinct
  under a literal reading of § 4, now collide as the same key (§ 5.5).
  The Rust reference implementation's actual trimming behaviour does not
  change — it has trimmed the full set since 0.6.0; only the normative
  text catches up to it, so this is breaking only for an implementation
  that followed the old § 4 text literally rather than matching the
  Rust core's actual behaviour.
- **§ 5.6 — the stripped multi-line string form (`( … )`) now strips
  trailing whitespace from each content line**, matching what it already
  did to each line's leading whitespace. Previously `( … )` preserved
  trailing whitespace byte-for-byte, identically to the verbatim form
  `(( … ))` — an editor's "trim trailing whitespace on save" could
  silently mutate string content with no visible signal. `(( … ))` is
  unaffected and remains fully verbatim on both edges. Breaking even
  for the Rust core, which previously preserved trailing whitespace on
  every line of a stripped-form block.
- **§ 5.9.0 (new) — representable Values are now normatively
  defined**, delimiting the domain over which the canonical writer's
  guarantees operate. A bare scalar document root, an Object pair with
  an empty name, a non-finite Float (NaN / ±Infinity), a String bearing
  a `CR` byte or a stripped-form collision, and any compound containing
  a non-representable Value at any depth are not representable, and a
  writer-conforming implementation MUST reject them with an error,
  emitting no partial output. Previously § 5.9 left the programmatic-only
  scalar-root, empty-key, and non-finite-Float cases undefined; for
  parser-produced `CR`-bearing and collision Strings, § 5.9.7 already had
  a permissive but ambiguous rule that allowed arbitrary or lossy output.
  The abstract programmatic Float carrier is now distinct from the
  declared finite parseable/canonical Float domain: it MUST distinguish
  NaN, +Infinity, and -Infinity so the
  three `NonFiniteFloat` fixtures can be supplied and rejected. Those
  sentinels are programmatic-only; `CR`-bearing and collision Strings are
  parser-produced cases covered separately by `parseable-unrepresentable/`.
  The Rust reference core already rejects scalar roots and `CR`-bearing
  Strings; closing the remaining gaps there is tracked separately.
- **A leading quote character in a key now opens a `<quoted-segment>`
  (§ 5.3.3, § 10.7).** A line whose first content — after § 4's
  key-segment trimming — begins with `"`, `'`, or `` ` `` no longer
  necessarily parses the way it did before quoted keys: a key that
  already began AND ended with the same quote character silently
  reads as a shorter key with the delimiters stripped (`"port": 1`
  now names `port`, not `"port"`); a leading quote character with no
  matching closer before end-of-line either falls through to an
  unaffected Array-root String item (root kind not yet decided) or
  raises the new `UnterminatedQuotedKey` (root kind already Object) —
  see § 5.3.3 for the exact, context-dependent rule and the `::`
  raw-marker escape hatch (§ 5.4 rule 1) available for an Array item
  needing an unambiguous leading quote character. No document whose
  keys avoid a leading `"` / `'` / `` ` `` is affected.
- **§ 3.7 / § 5.2 — any recognised escape in an inline scalar now forces
  String before keyword or numeric classification.** A body such as
  `1\.0`, which 0.6.x could decode and then type as Float, is String in
  0.7.0. This applies to every recognised escape, including `\.` / `\:`
  and the three quote escapes `\"` / `\'` / `` \` ``, even when the
  decoded byte has no structural role.
- **§ 5 (Float) / § 5.2 rule 14 — the Float domain now has a
  normative floor and an overflow fallback.** Implementations MUST
  support at least the range and precision of IEEE 754 binary64
  (MAY support a wider representation), and a float literal whose
  parsed value is non-finite in the implementation's Float domain
  (e.g. `1e9999` on binary64) falls through to String exactly as an
  out-of-range Integer does under rule 13 — so a 0.7.0-conformant
  parser MUST NOT ever produce a non-finite Float, making § 5.9.0's
  "no literal grammar of § 3.6 produces a non-finite Float" claim
  actually true. New fixtures `float/positive_overflow_to_string`,
  `float/negative_overflow_to_string`, and
  `float/underflow_to_zero` lock the boundary in; the last
  documents that underflow to `0.0` (finite) is an ordinary Float,
  not a String-fallback case.

### Changed

- **§ 6.13 `BadEscapeSequence`** — extended to cover malformed `\uXXXX`
  forms (fewer than four hex digits) and lone surrogates, alongside the
  existing unrecognised-`\X` case.
- **§ 6.15 `InvalidUtf8` (new error category)** — documents that are
  not valid UTF-8 (§ 3.1, § 9.3) now have an explicit § 6 category
  name. § 3.1 already required rejecting them; this closes the gap
  where § 6 had no matching category for that rejection. The check
  happens before any line-oriented or grammar-level processing, and
  the error span SHOULD point at the byte offset of the first invalid
  sequence.
- **§ 5.9.10's key re-escape rule** now enumerates every code point
  `<key-char>` excludes (not just `\`/`.`/`:`) and requires `\uXXXX` for
  edge whitespace and for structural bytes with no named form (`(`, `)`,
  DEL, control bytes). Keys containing `(`, `)`, DEL, or a control code
  point are emittable in canonical form for the first time.
  Also newly documented (a pre-existing hazard, not new
  behaviour): a bare `\u0023` escape is accepted input for a key beginning
  with `##`, but the canonical writer MUST quote that key, for example
  `"##a:b": 1`, so the canonical line is not silently read as a comment.
- **`<key-char>` (§ 4)** now admits raw VT (`0x0B`) and FF (`0x0C`) as
  literal key content, matching the § 3.3 widening. Non-breaking — only
  accepts documents previously rejected as `InvalidKey`.
- **§ 5.9 / § 8.3** now define the round-trip guarantee over
  *representable* Values only. Strings containing a `CR` byte or one
  of the pathological multi-line stripped-form collisions are
  explicitly excluded from the representable domain by § 5.9.0. A
  writer-conforming implementation MUST reject a non-representable
  Value with an error rather than serialise it; previously § 5.9.7
  separately allowed any implementation-chosen or lossy encoding for
  the same Values, which was incompatible with § 5.9's byte-
  determinism requirement.
- **§ 5.9.6** — a root Array's first item, if its bare rendering would
  itself be recognised by § 5.0.1 rule 6 as a pair line (e.g.
  `host: localhost`, or a bare `a:`), now MUST use the raw-marker
  (`::`) form. Previously the canonical writer could produce such an
  item bare, and the resulting document's root re-parsed as an Object
  instead of the original Array — a round-trip failure specific to an
  Array root's first item (every other item position is unaffected).
- **§ 5.9.8 — Float zero canonicalisation clarified.** The notation
  threshold now reads `0 < abs < 1e-2` (was `abs < 1e-2`), which taken
  literally would have demanded scientific notation for zero. The
  canonical form of zero is `0.0` / `-0.0` — decimal, never scientific,
  sign preserved (unlike an Integer's `-0` → `0`). This matches the
  Rust reference core's existing behaviour; only the normative text
  changes. New fixtures `float/positive_zero` and `float/negative_zero`
  lock it in.
- **§ 8.1 (with § 5's Integer definition) — ordinary fixture numeric
  equivalence is interpreted, or comparison-coerced, in the tested
  implementation's declared Integer or Float domain, not against a
  universal minimum-domain Value.** Thus an ordinary Float token such
  as `3.14` does not require a wider decimal implementation to
  manufacture binary64's rounded value. A manifest exemption applies
  only when the source Ktav literal, interpreted in the tested
  implementation's declared domain, diverges in value or kind from the
  minimum-domain oracle token because it crosses that leaf's named
  boundary. If no such divergence occurs, the listed leaf MUST match
  normally; the exemption never extends to another leaf.
- **§ 8.2 (with § 5.9.5) — the writer-conforming byte-exact fixture
  requirement follows the same domain rule.** Every ordinary,
  non-exempt field MUST match its JSON oracle in the tested
  implementation's declared domain; an ordinary numeric field is not
  required to hold a universal minimum-domain Value. A listed boundary
  leaf MAY differ only when the source Ktav literal crosses that leaf's
  named boundary in the tested domain and the implementation supports a
  wider domain along that boundary class. Every other field MUST match
  normally, and its contribution MUST remain byte-exactly equal to the
  fixture's `canonical.ktav`. This corrects the former § 8.2 reading
  under which an arbitrary-precision implementation failed on
  `i64_overflow_to_string` merely because it retained the body as an
  Integer and wrote it bare.
- **§ 5.9.10 — the canonical writer now prefers quoted form when
  escaping a structural byte.** The writer prefers a quoted key
  segment (delimiter `"`) over bare-with-escape whenever escaping a
  structural byte (`.` `:` `,` `{` `}` `[` `]`), `(` / `)`, a
  `##`-prefix, or edge whitespace would otherwise be needed (escaping
  only a backslash, LF, CR, a control byte, or DEL does not switch the
  form, since quoting does not remove that escape). This changes the
  canonical bytes of every key previously requiring a `\.` / `\:` /
  bracket / comma / paren escape, or a `##`-prefix escape — e.g.
  `a\.b: 1` now canonicalises to `"a.b": 1`, not `a\.b: 1`; existing
  `valid/key_escaping/*.canonical.ktav` fixtures update accordingly
  (tracked separately from this text change).

### Added

- **`\uXXXX` escape (new § 3.7.1)** — exactly four hex digits, surrogate
  pairs for code points above the Basic Multilingual Plane, lone
  surrogates rejected as `BadEscapeSequence`. Recognised wherever the
  existing ten escapes are recognised (inline scalars and keys); not
  processed in multi-line scalars, multi-line string content, or
  comments. Purely additive to the escape table — no existing escape
  sequence's meaning changes.
- **Appendix D — migration guide 0.6.x → 0.7.0.**
- **`unrepresentable/` conformance category (spec#4) — reason codes
  for non-representable Values are now normative (§ 5.9.0), and
  `§ 8.2` requires a writer-conforming implementation to reject each
  `versions/0.7/tests/unrepresentable/` fixture's Value with the
  named reason code.** The three programmatic-only reason codes
  `ScalarRoot`, `EmptyKeyName`, and `NonFiniteFloat` have fixtures in this
  category. `NonFiniteFloat` uses the three fixtures
  `versions/0.7/tests/unrepresentable/nan.json`,
  `versions/0.7/tests/unrepresentable/negative_infinity.json`, and
  `versions/0.7/tests/unrepresentable/positive_infinity.json`; each uses
  a contextual `{"$float": ...}` sentinel in this fixture encoding only,
  since JSON has no portable NaN/Infinity literal. The sentinel does not
  reserve `$float` as a parser Object key. The API shape a
  writer uses to report the rejection is
  implementation-defined; only the code names are normative. README
  (en/ru/zh) documents the new category and the existing `valid/` /
  `invalid/` ones in the same place, and states runners MUST walk
  every category present rather than silently skip an unrecognised
  one. Does not close rust#5 or rust#12 — those need corresponding
  work in the `rust` core and the six language bindings, tracked
  separately.
- **Quoted keys (§ 5.3.3)** — a key segment MAY be written `"…"`,
  `'…'`, or `` `…` `` instead of bare; inside the delimiters, `.`,
  `:`, `,`, `{`, `}`, `[`, `]`, and the two other quote characters are
  ordinary content needing no escape, and content is never trimmed.
  Three new named escapes, `\"` / `\'` / `` \` `` (§ 3.7), let a
  segment's own delimiter appear literally inside it — the escape
  table grows from eleven entries to fourteen. These same three
  escapes are also recognised inside inline scalar **values**, not
  only keys — `\"` / `\'` / `` \` `` now decode to a literal quote
  byte there too (previously each was `BadEscapeSequence` in every
  context, values included); a quote character still has no
  structural role in a value, so it is never a delimiter and is never
  stripped, escaped or not. Adds a `<quoted-segment>` production to
  the grammar and narrows the existing `<bare-segment>` production (a
  bare segment's first token now excludes an unescaped leading quote
  character) — not purely additive; the one behavior change this
  narrowing introduces — a key or segment already beginning with a
  quote character — is a separate Breaking entry above, not covered
  by this bullet. New error category `UnterminatedQuotedKey` (§ 6.16)
  is reported when a quote
  opens a key segment with no matching closer before end-of-line on a
  line already known to be a pair line; `InvalidKey` (§ 6.4) and
  `EmptyKey` (§ 6.5) each gain one new triggering case.
- **`parseable-unrepresentable/` conformance category (0.7+)** — parser-
  produced Values that a conforming writer MUST reject now have paired
  `<name>.ktav` / `<name>.json` fixtures and four normative String reason
  codes: `CRByte`, `BothFormsRequired`, `TrailingWhitespaceCollision`,
  and `LeadingWhitespaceCollision`. This category is distinct from the
  programmatic-only `unrepresentable/` category and has no canonical-output
  files.
- **Corpus and section inventory locks (0.7+)** —
  `scripts/locks/corpus-inventory.0.7.lock.json` locks every corpus path and
  digest, while `scripts/locks/section-inventory.0.7.lock.json` locks the
  ordered content-unit manifest; the builder and corpus validator reject
  additions, deletions, drift, and order changes outside an intentional
  lock update.
- **`versions/0.7/content/README.source.js` is the single README source
  object** for the English, Russian, and Chinese content READMEs. The
  builder statically validates and decodes it, then byte-compares all three
  generated files; the per-section `content/` units are likewise the source
  of truth for the generated specification files.

### Fixed

- **README "Version scheme"** — the cross-version parsing MUST now
  explicitly does not hold across a pre-1.0 breaking `MINOR` (the
  exception its preceding paragraph grants): an implementation
  targeting 0.6 is not required to parse 0.7.x documents identically.
  The previous wording contradicted the exception directly above it.
- **§ 4 grammar** — the `<header-line>` alternatives for `)` / `))`
  now carry a context-dependence note: they apply only while a
  multi-line string block is open (§ 5.6) and the trimmed line equals
  that block's own terminator; anywhere else a lone `)` / `))` line
  is ordinary text (§ 5.1, § 5.2, § 5.4; § 6.1), not a structural
  closer — matching § 6.1 and the `lone_paren_tokens` fixture.
- **§ 10.6** — a single canonical serialisation is defined for every
  **representable** Value (§ 5.9.0), not every Value outright.
- **Appendix A, 0.5.0** — removed the "bare `CR` is content, not a
  line terminator" bullet: the 0.5.0 spec's own § 3.2 states the
  opposite ("a `CR` byte never appears as a content byte at parse
  time"), so the bullet described a change that never happened.
- **§ 5.0.1 rule 6 — root-kind detection is now explicitly shape-based
  ("pair candidate").** The old wording ("a **pair line** under § 5.3")
  read as if the first line's key had to be fully grammatically valid
  before an Object root could be selected, contradicting the
  `InvalidKey` fixtures under `tests/invalid/invalid_key/` (e.g.
  `a,b: 1` as the entire document). Rule 6 now specifies a two-phase
  test: phase 1 is a purely lexical shape check (first unescaped `:` /
  `::` separator with a non-empty raw prefix, `<sep-end>` satisfied for
  a plain `:`); phase 2 is uniform § 5.3 / § 5.3.1 key validation,
  identical to any pair line inside an established Object (§ 5.1
  rule 8). Matching the reference parser, a glued plain-`:` first line
  (`a,b:1`) is not a pair candidate and falls to rule 7 (one-item
  Array), while a glued `::` line is a pair candidate and reports
  `MissingSeparatorSpace`.
- **§ 5.3 / § 5.3.1 — removed the unreachable `InvalidKey`-for-`##`
  claim.** § 5.1 rule 2 consumes any line whose trimmed form begins
  with `##` as a comment unconditionally, before pair-line processing,
  so a raw `##`-prefixed line can structurally never reach key
  validation. Both sections now state this and point to § 5.9.10's
  guidance: `\u0023` bare form is accepted input, but the canonical writer
  MUST quote the key, for example `"##a:b": 1`, to prevent the collision.
- **§ 5.3 / § 5.3.1 — error precedence made explicit:** for a
  dispatched pair line, checks run `MissingSeparator` (§ 6.6) →
  `EmptyKey` (§ 6.5, empty prefix) → `MissingSeparatorSpace` (§ 6.10)
  → key-segment validation; a key defect (e.g. `b,c:1` inside an
  established Object) therefore reports `MissingSeparatorSpace`, not
  `InvalidKey`, matching the reference parser.
- **§ 5.0.1 — a leading `[` / `{` pre-empts pair-candidate detection.**
  A first content line starting with `[` or `{` that matches none of
  rules 2–5 (no matching closer, not a lone opener) is diagnosed as
  an unterminated/malformed inline-compound attempt (§ 5.2 rules 8–9)
  before rule 6 is ever considered — confirmed against the reference
  parser, which reports `UnterminatedInlineCompound` for `[bad]: 1`,
  not `InvalidKey`. Only applies when the bracket/brace is the first
  non-whitespace code point of the trimmed line; elsewhere (`a{b: 1`)
  rule 6 proceeds normally and yields `InvalidKey`. Fixture
  `invalid_key/bracket_in_key` renamed to
  `invalid/inline/leading_bracket_before_separator` with its
  `expected_error` corrected to match.
- **§ 5.0.1 — the bracket-precedence sentence now reads "the first
  non-whitespace code point of the trimmed line"** (was "the line's
  first byte", which in isolation read as the raw, untrimmed line and
  gave the wrong answer for `  [bad]: 1` — leading whitespace before
  the bracket). The rule, like every rule in § 5.0.1, operates on the
  trimmed first content line; behaviour confirmed against the
  reference parser. New fixture
  `invalid/inline/leading_whitespace_bracket_before_separator` locks
  the leading-whitespace case in. The same correction applied to the
  RU and ZH translations of the paragraph.
- **§ 5.9.8 — restored to the RU and ZH translations the final
  sentence of the binary64 paragraph** ("implementations using
  arbitrary-precision decimal MAY produce different output only where
  their Value domain differs"), which both had dropped; EN unchanged.
- **README (en/ru/zh) — the Layout tree no longer lists a nonexistent
  `tests/README.md` and now shows `unrepresentable/` (0.7+); the
  bindings paragraph now states explicitly that the C ABI's function
  surface is unchanged since 0.1 and that bindings parse whatever
  format version the underlying Rust core supports (currently 0.6.4
  stable)**, instead of the ambiguous "Ktav 0.1 surface".
- **§ 5.9.0 — the representability predicate is split into the
  document-root check plus a new internal, recursive
  "node-representable" check.** The previous wording was a single
  flat conjunction of per-kind bullets; read literally, it made an
  ordinary child scalar (a String nested in an Object, say)
  non-representable, since as a Value in its own right it failed
  the very first bullet ("V is an Object or an Array"). Now only
  the outermost Value handed to a writer is subject to the
  root-kind constraint; "node-representability" recurses through
  Object pair values and Array items at any depth without
  re-imposing it. § 5.9.0 also now states a precedence rule for
  simultaneous violations: the document-root check is evaluated
  first, and when node-representability finds more than one
  violation among a Value's descendants an implementation MAY
  report any one of them (no traversal order is mandated; that
  belongs to the still-open structured-error contract, rust#12).
  The four `unrepresentable/` fixtures whose bare-String value
  tripped `ScalarRoot` and their intended String-specific code
  simultaneously (`cr_byte`, `both_forms_required`,
  `trailing_whitespace_collision`, `leading_whitespace_collision`)
  are rewrapped as `{"s": <string>}` so each now exercises exactly
  its named reason code.
- **§ 5.2 — the cross-implementation "same Value kind" `MUST` is now
  scoped to implementations sharing the same numeric domain.** The
  unconditional wording contradicted § 5 / § 8.1's own domain-widening
  allowance: an i64-only and a bignum-capable parser legitimately
  classify `9223372036854775808` differently (String vs. Integer), so
  both could simultaneously honour their own domain rules and violate
  the old blanket `MUST`.
- **§ 5 — the binary64 floor now specifies conversion semantics, not
  just range and precision.** Converting a decimal float literal to
  the minimum binary64 representation MUST use IEEE 754
  `roundTiesToEven`, and the minimum representation MUST support
  subnormal (gradual-underflow) values. Seven new fixtures cover the
  floor: `max_finite` and `min_positive_normal` (unambiguous at any
  supported domain), while `min_positive_subnormal` is a
  `float_precision` boundary-dependent fixture alongside four more
  boundary-dependent fixtures added to the new manifest —
  `just_above_max_finite_to_string` (finite in a wider decimal domain,
  overflows to String at binary64), `negative_underflow_to_negative_zero`
  and `half_min_subnormal_underflow_to_zero` (both finite in a wider
  domain, underflow to `±0.0` at binary64), and `decimal_rounding_tie`
  (`9007199254740993.0`, exactly halfway between two binary64 values;
  binary64 rounds to the even neighbour `9007199254740992.0`, a wider
  decimal domain keeps the literal exactly).
- **§ 5.9.0 — the "more than one violation" allowance now covers the
  current node and an Object's key, not only descendants.** The old
  wording ("among a Value's descendants") left a String satisfying two
  collision rules at once, or an Object with both an empty key and a
  separately non-representable child, technically uncovered, since a
  key is not itself a Value descendant.
- **`versions/0.7/tests/unrepresentable/nan.json`,
  `negative_infinity.json`, and `positive_infinity.json`** — the
  `NonFiniteFloat` reason has three fixtures because plain JSON cannot
  encode NaN or Infinity. Each uses a normative `{"$float": ...}`
  sentinel in the unrepresentable-fixture encoding only; it is contextual
  and does not reserve `$float` as a parser Object key. README documents
  the sentinel alongside the rest of the `unrepresentable/` schema.
- **§ 5.2 no longer conflates a general semantic rule with a fixture
  list.** The same-kind `MUST` (scoped to same numeric domain) is now
  stated as a rule about every document a parser might see; § 8.1 /
  § 8.2 separately name, for the shared conformance corpus only, which
  fixtures are known to probe such a boundary. Previously § 5.2 itself
  claimed the corpus's fixture list was the complete set of
  domain-dependent divergence in the *format*, which is false — an
  arbitrary out-of-domain body (e.g. `9223372036854775809`) crosses the
  same boundary without being a named fixture.
- **`numbers/float/decimal_rounding_tie.canonical.ktav` corrected from
  decimal to scientific notation** (`9007199254740992.0` →
  `9.007199254740992e15`): § 5.9.8 requires scientific notation for
  any nonzero Float with `abs >= 1e7`, which this value (~9×10^15)
  is far past. The wrong decimal form had been checked against
  `ktav::render::render()`, which does not apply § 5.9.8's notation
  threshold; `ktav::emit_canonical()` is the function that actually
  implements it, and is what a writer-conforming implementation must
  match. Re-verified all seven new Float fixtures, plus the
  pre-existing `notation_boundaries` / `exponent` fixtures, against
  `emit_canonical()` — this was the only mismatch.
- **README (en/ru/zh) — two numeric-model errors corrected.** Float
  overflow-to-non-finite and Integer out-of-i64-range both fall back
  to a String, but Float *underflow* does not: it rounds to a finite
  signed `0.0` and stays a Float, which the previous wording didn't
  distinguish. Separately, `1e2`'s canonical form is `100.0`, not
  `100` — a bare `100` would re-parse as an Integer, breaking the
  Float round-trip; § 5.9.8's decimal alternative always keeps the
  decimal point.
- **§ 5.9.0 — the `$float` sentinel is contextual to the
  unrepresentable-fixture JSON encoding**, not a reserved parser Object
  key name; ordinary parsed Objects may use `$float` as a key.
- **CHANGELOG — corrected stale NonFiniteFloat fixture references** to
  name the current `nan.json`, `negative_infinity.json`, and
  `positive_infinity.json` fixtures, and removed the claim that the reason
  had no fixture.
- **`boundary-fixtures.json` (`versions/0.7/tests/boundary-fixtures.json`,
  outside `valid/` so a runner enumerating `valid/**/*.json` never
  mistakes it for a fixture) gives the numeric-domain divergence
  § 8.1 / § 8.2 permit a machine-readable contract, letting a
  wider-numeric-domain implementation diverge from certain fixture
  oracles without failing conformance.** The manifest is leaf-level,
  not fixture-level: each entry names a `fixture`, a JSON Pointer
  `path` (RFC 6901) to one specific leaf inside it, and a
  `boundary_class` (`integer_range` / `float_range` /
  `float_underflow` / `float_precision`), so an implementation's
  exemption is scoped to the exact leaf and axis it actually supports
  a wider domain for — an implementation with a wider Integer domain
  but plain binary64 Float is exempt on `integer_range` leaves only,
  and vice versa. Leaf-level scoping means a fixture mixing
  boundary-dependent and ordinary fields is only partly exempt:
  `big_overflow_to_string`'s `big`/`bigger` fields (exceeding i64) are
  listed, but its `tiny` field (an ordinary `Integer(1)` in every
  domain) stays checked. The manifest also lists
  `numbers/float/min_positive_subnormal`'s leaf, whose exact input
  value an arbitrary-precision decimal domain keeps in full, where
  binary64 shortens it to `5e-324`. A wider-domain implementation is
  exempt from byte-matching a listed leaf, not bound to one specific
  alternative this corpus pins — its correctness there is governed by
  § 5 / § 5.9 directly. § 8.1 / § 8.2 reference this manifest, at the
  leaf level, instead of describing the exception in prose.
- **README — "passes the suite" is now stated as necessary but not
  sufficient for conformance.** With `boundary-fixtures.json` leaves
  now explicitly unverified by the shared corpus for a wider-domain
  implementation, README's unqualified "an implementation conforms if
  it passes every test" was no longer accurate — such an
  implementation additionally has to verify its own § 5 / § 5.9
  behaviour for the leaves this corpus exempts.
- **RU/ZH § 5.9.3 — restored the missing empty-first-item wrap case.**
  Both translations described only the non-empty-compound-opener wrap
  (§ 5.0.1 rules 4/5) and RU explicitly claimed wrapping was needed
  "only for a non-empty compound", omitting EN's equally-normative
  empty-compound case (rules 2/3, `{}` / `[]`). A writer built strictly
  from the RU or ZH text would emit an unwrapped Array root whose first
  item is an empty Object/Array, which re-parses with the wrong root
  kind — a real round-trip bug in the translated algorithm, not just a
  wording gap.
- **RU/ZH § 5.6 — restored the missing LIFO-pairing sentence** ("a
  multi-line string body MUST NOT cross another compound boundary: the
  opener and closer are unambiguously paired by the LIFO parser
  stack"), absent from both translations entirely.
- **RU/ZH § 5.8.4 — removed a fabricated "SHOULD stay below 64 levels"
  depth limit.** EN sets no normative depth limit and says only
  "SHOULD avoid pathologically deep nesting" — RU and ZH each invented
  a specific number not present anywhere in the authoritative EN text.

## [0.6.4] — 2026-08-23

### Changed

- **Float canonicalisation is now normative at the notation boundary.**
  The writer first uses the shortest round-tripping decimal for its Float
  representation, then MUST use scientific notation when `abs < 1e-2` or
  `abs >= 1e7`, and decimal notation otherwise. The exact boundary values
  and examples are now explicit in § 5.9.8, eliminating the former
  contradiction between `-0.001` and `1.5e-3`.
- **The current stable specification is 0.6.4.** This is an editorial
  clarification and conformance-fixture release; the directory remains
  `versions/0.6/`.

## [0.6.0] — 2026-06-01

Targeted breaking change: keys now process escape sequences. Two new
escapes (`\.` and `\:`) make it possible to use literal dots and
colons inside key names — keys like `example.com`, `1.0`, or `a:b`
that were impossible to express in 0.5.0.

### Breaking

- **Keys now process escape sequences** (§ 3.7). The backslash byte
  `\` is the escape lead inside keys, just as it already was inside
  inline scalar values. `\.` produces a literal dot (NOT a path
  separator); `\:` produces a literal colon (NOT the pair
  separator); `\\` produces a literal backslash. A literal
  backslash in a key that was bare in 0.5.0 now requires `\\`.
  Rare in practice; documents that did not embed `\` in keys
  parse identically under 0.6.0.
- **The `<key>` / `<segment>` / `<key-char>` grammar productions**
  (§ 4) are now escape-aware. The dotted-path separator splits only
  on **unescaped** `.`; the pair separator is the first
  **unescaped** `:` / `::`. Backslash and dot are excluded from
  `<key-char>` and handled via a new `<key-escape>` production.

### Added

- **Two new escape sequences** — `\.` → `.` and `\:` → `:` — in the
  § 3.7 escape table (now ten entries total: `\\`, `\,`, `\}`,
  `\]`, `\{`, `\[`, `\n`, `\r`, `\.`, `\:`). Applies to inline
  scalar values AND to keys.
- **Appendix C — migration guide** from 0.5.0 to 0.6.0.

### Changed

- "Keys" removed from the "escape sequences are NOT processed in"
  list (§ 3.7). Keys now DO process escapes — same set as inline
  scalars.
- § 5.9.10 (canonical key emission) — the writer MUST re-escape
  `\`, `.`, and `:` inside a key segment so that the canonical
  output round-trips through the parser.
- § 6.13 `BadEscapeSequence` — updated to list ten valid escape
  characters (added `.` and `:`).

### Versioning

`versions/0.6/` is a new top-level format directory. The 0.5.0
spec at `versions/0.5/` and the 0.1.x spec at `versions/0.1/`
remain in the repository for legacy parsers that wish to support
the older syntax in parallel.

Pre-1.0 versioning policy: a MINOR bump (0.5 → 0.6) carries a
breaking change in this version stream. Once the format reaches
1.0, breaking changes will require a MAJOR bump.


## [0.5.0] — 2026-05-28

Major language revision. Three breaking changes plus a substantial
additive surface for inline forms. Implementations claiming 0.5.0
compliance need a fresh parser pass — there is no automatic
migration from 0.1.x.

### Breaking

- **Typed markers `:i` and `:f` removed.** Numbers, booleans, and
  `null` are inferred from the lexical form of the scalar body
  (§ 3.6, § 5.2). The raw marker `::` is kept to force a literal
  String for cases where the form would otherwise match a number
  or keyword.
- **Comments now use `##`** (two ASCII `#` bytes) and MUST occupy
  their own line (§ 3.4). A single `#` byte has no special meaning;
  trailing comments after content on the same line are not
  supported.
- **Bare `port: 8080` is now `Integer(8080)`**, not `String("8080")`.
  This follows from removing the typed markers. To keep the value
  as a String, write `port:: 8080`.
- **Lone `{` / `[` on the first content line is now a multi-line
  root Object / Array** (§ 5.0.1 rules 4–5). Previously (0.1.1) a
  lone opener on line 1 produced a single Object / Array item
  inside a root-level Array. The 0.1.1 JSONL-style form (multiple
  top-level objects on consecutive lines producing a root Array)
  is no longer accepted.
- **Float Values no longer carry textual form**; numeric
  canonicalisation applies (§ 3.6, § 5.2, § 5.9.8). The Value
  model carries a numeric value; the canonical writer emits a
  deterministic textual form. Underscores, the choice of `e` vs
  `E`, and a leading `+` are not part of the Value.
- **Key segments are trimmed of leading and trailing ASCII
  whitespace** (§ 4). A segment empty after trimming is
  `EmptyKey` (§ 6.5). Internal whitespace within a segment is
  preserved verbatim.
- **Line terminators are `LF`, `CR`, or `CR LF`** (§ 3.2). All
  three are equivalent. A `CR` byte never appears as content at
  parse time; to embed `CR` in a String value, use the `\r` escape
  inside an inline compound. Such Values are not representable in
  canonical form (§ 5.9.0).

### Added

- **Inline compounds** — `{key: value, key2: value}` and
  `[v1, v2, v3]`, with optional trailing comma, allowed as values,
  as array items, or as the entire document (§ 5.8). Whitespace
  inside is optional everywhere.
- **Escape sequences** — eight in total: `\\`, `\,`, `\}`, `\]`,
  `\{`, `\[`, `\n`, `\r` inside inline scalar values (§ 3.7).
  The bracket-pair set is full and symmetric. Any other `\X`
  form is a `BadEscapeSequence` error.
- **Number literal grammar** covering `0x` hex, `0o` octal, `0b`
  binary, decimal, with underscore digit separators (§ 3.6).
  Integer Value carries an integer value; Float Value carries a
  numeric value. Big-integer overflow falls back to String.
  Implementations MUST support at least the i64 range for
  Integer; wider ranges (bignum) are permitted (§ 5.2 rule 13).
- **Canonical form (§ 5.9)** — a normative writer output for every
  Value, used by writer-conforming implementations and verified by
  `*.canonical.ktav` fixtures. The canonical form is
  byte-deterministic: any two writer-conforming implementations
  produce identical output for the same Value.
- **Triple-test conformance suite** — every valid fixture has three
  files: `name.ktav` (input as written, with comments / inline /
  hex / `_` underscores / multiple forms), `name.json` (Value
  oracle), `name.canonical.ktav` (writer oracle — the canonical
  form of the parsed Value).
- **Top-level inline compounds** — a document whose first content
  line is a closed inline `{...}` or `[...]` is a root-level inline
  Object / Array (§ 5.0.1 rules 2–3).
- **Spaces and tabs in key segments are allowed** (§ 4 `<key-char>`).
  A key may contain internal whitespace such as `first name`; only
  the structural delimiters and ASCII control bytes are excluded.
- **Mid-value `{` / `[` is literal** (§ 5.8.5). A `{` or `[` byte
  that is NOT the first non-whitespace byte of an inline value is
  a literal character; it does not open a nested compound. Example:
  `{a: hello{world, b: x}` yields `{a: "hello{world", b: "x"}`.
- **Error categories** — `UnterminatedInlineCompound` (§ 6.11),
  `MalformedInlineCompound` (§ 6.12), `BadEscapeSequence` (§ 6.13).
  `MalformedInlineCompound` covers leading commas, consecutive
  commas, empty array items, and other structural defects inside a
  closed inline compound that aren't already an Unterminated error.
- **§ 6.14 `OrphanLineAfterTopLevelInline`** — a distinct error
  category for content after a top-level inline root or after the
  matching close of a lone-`{` / lone-`[` root opener. Previously
  this was lumped with `MissingSeparator`.
- **Appendix B: Migration guide** from 0.1.x to 0.5.0 — typed
  markers, comments, bare-number typing, and root-Array form.
- **Compliance split** — § 8 now defines parser-conforming (§ 8.1),
  writer-conforming (§ 8.2), and a round-trip property (§ 8.3).
  Implementations may claim either or both.

### Removed

- Error categories `InlineNonEmptyCompound` (was § 6.7) and
  `InvalidTypedScalar` (was § 6.9). The numbers are reserved so
  older error catalogs don't renumber. Implementations MUST NOT
  emit errors labelled with these names when parsing 0.5.0
  documents.

### Versioning

`versions/0.5/` is a new top-level format directory. The 0.1.x
spec at `versions/0.1/` remains in the repository for legacy
parsers that wish to support the older syntax in parallel.


## [0.1.1] — 2026-05-10

Backward-compatible extension: bare top-level Arrays.

### Added

- **Top-level Array** — a document whose first content line is an
  array-item shape (bare scalar, `:: text`, `:i 42`, `:f 3.14`, lone
  `{` / `[`, or multi-line opener `(` / `((`) is now parsed as a
  root-level **Array**. Previously the root Value was always an
  **Object**, so a bare scalar at line 1 was a `MissingSeparator`
  error. New § 5.0.1 specifies the detection rule.
- New conformance fixtures under
  `versions/0.1/tests/valid/top_level_array/` and
  `versions/0.1/tests/invalid/top_level/`.

### Compatibility

This change is **strictly additive** for parsers and documents:
every document valid under 0.1.0 stays valid under 0.1.1 and produces
the same Value (still an Object). Only inputs that 0.1.0 rejected
as `MissingSeparator` are now accepted as Arrays. Documents written
against 0.1.1 may fail under a strict 0.1.0 parser — this is
expected forward incompatibility for new features.

Implementations supporting 0.1.1 MUST handle § 5.0.1 detection;
implementations claiming 0.1.0 compliance only continue to be
conforming (they remain bug-free for 0.1.0 inputs, only lacking the
new capability).


## [0.1.0] — 2026-04-22

Initial specification. Defines lexical structure, grammar, semantics,
error categories, compliance requirements, and security considerations
for Ktav 0.1.0.

### Format at a glance

- Implicit top-level Object.
- `key: value` pairs; dotted keys (`a.b.c: 1`) expand to nested
  Objects.
- `key:: value` forces a literal String.
- Typed-scalar markers `:i` (Integer) and `:f` (Float), both in
  pair position and as array-item prefixes.
- Integer and Float Value kinds — numeric strings that preserve
  textual form for round-trip and arbitrary precision.
- Keywords `null`, `true`, `false` (strict lowercase only).
- Multi-line compounds `{ ... }` and `[ ... ]` with closing bracket on
  its own line; empty `{}` / `[]` inline.
- Multi-line strings `( ... )` (stripped common indent) and
  `(( ... ))` (verbatim).
- `:: value` as an array-item prefix for literal Strings inside
  arrays; `:i value` / `:f value` for Integer / Float items.
- **Mandatory space after the separator** (§ 5.3 / § 5.4): every pair
  separator (`:`, `::`, `:i`, `:f`) and every array-item marker
  (`::`, `:i`, `:f`) MUST be followed by at least one ASCII-whitespace
  byte **or** by the end of the line. Glued forms — the separator
  welded to its body with no whitespace — are a `MissingSeparatorSpace`
  error (§ 6.10); example error documents: `key:value`, `port:i42`,
  `ratio:f0.5`. The empty-value forms `key:` / `key::` (EOL right after
  the separator) are legal.
- `#` at line start = comment; no inline comments.

### Error categories (§ 6)

`UnbalancedBracket`, `MismatchedBracket`, `DuplicateName`,
`PathConflict`, `InvalidKey`, `EmptyKey`, `OrphanLine`,
`InlineNonEmptyCompound`, `InvalidTypedScalar`, `MissingSeparatorSpace`.

Directory: [`versions/0.1/`](https://github.com/ktav-lang/spec/tree/1d5dc09/versions/0.1/) — removed from the current tree at `c9593e8`; this links to the last commit where it still existed.
