>>>>> lang=en
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

## [0.8.0] — 2026-09-19

Normative text and conformance fixtures for 0.8.0, under
`versions/0.8/`. This is the current stable specification —
`versions.ktav` points `stable` and `latest` at 0.8.0; 0.7.1 remains
carried in the working tree as the previous stable release.

No change to what a document's lax entry point (`parse`/`loads`) does:
every 0.7.x document parses to the same Value, and every canonical
rendering is unchanged byte for byte.

### Breaking

- **§ 8.1 — a parser-conforming implementation must now also expose a
  strict parsing entry point** (`parse_strict` / `loads_strict`) and
  reject every fixture under `versions/0.8/tests/strict-lossy/` with
  `LossyScalar`, naming the exact `body`/`canonical` its oracle gives,
  while the lax entry point continues to accept the same input
  unchanged. No prior section required a strict entry point to exist
  at all, which is why this is a MINOR bump rather than a patch, unlike
  § 8.5 in 0.7.1 (which only made an existing § 8.1 obligation
  checkable). In practice no known implementation is affected: the
  Rust reference implementation's `parse_strict` already rejected
  every one of these forms before this corpus existed, and every
  binding built on it inherits that behaviour automatically. See
  Appendix E for the migration note.

### Added

- **Appendix E — Migration from 0.7.x.**
- **`versions/0.8/tests/strict-lossy/`** — 14 fixtures covering
  leading-zero, plus-signed, base-prefixed (hex/octal/binary), and
  underscored integers; negative zero; trailing-zero and exponent
  floats; the § 5.9.8 scientific-region boundary; and the same check
  inside an inline object, an inline array, a bare multi-line array
  item, and a top-level inline document.

## [0.7.1] — 2026-09-16

Editorial. No change to what a conforming parser or writer does: every
0.7.0 document parses to the same Value, and every canonical rendering
is unchanged byte for byte. Implementations pinned to 0.7.0 remain
conformant to the format; what changes is how a conformance run is
verified.

### Added

- **§ 8.5 — conformance runner contract**, and
  `versions/0.7/tests/manifest.json`: a machine-readable inventory of
  the corpus naming the closed set of category directories, the exact
  fixture count for each, and every fixture whose primary input must
  reach the implementation as raw bytes rather than decoded text.

  This adds no obligation. § 8.1 already requires a parser-conforming
  implementation to accept *every* fixture under `valid/`, and § 8.2
  the writer equivalent — § 8.5 only makes that "every" checkable.
  It exists because several independent runners were found reporting
  success while executing a truncated corpus, a previous version's
  corpus, or a fixture whose bytes had been altered by a lossy text
  decode before the implementation ever saw them. That is the reason
  this ships as a PATCH: the requirement is not new, only its
  verification is.

### Changed

- **§ 8.4** — a claim of parser- or writer-conformance is supported
  only by a corpus run performed by a runner satisfying § 8.5. § 8.5
  introduces no separate conformance level for runners: a runner is
  not an implementation and makes no claim of its own, so its
  requirements take effect as conditions on the evidence for an
  implementation's claim.

### Fixed

- **Appendix A** — the 0.7.0 entry was still headed "unreleased" after
  0.7.0 shipped; it now carries the release date.

## [0.7.0] — 2026-09-10

Normative text and conformance fixtures for 0.7.0, under
`versions/0.7/`. This is the current stable specification —
`versions.ktav` points `stable` and `latest` at 0.7.0.

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
>>>>> lang=ru
# Журнал изменений спецификации Ktav

**Languages:** [English](CHANGELOG.md) · **Русский** · [简体中文](CHANGELOG.zh.md)

История спецификации формата по всем версиям. Формат хранится в этом
репозитории в каталоге [`versions/`](versions/); каждая версия —
самодостаточная директория с собственным `spec.md` и `tests/`.

Версии следуют схеме `MAJOR.MINOR.PATCH`:

- `PATCH` — редакторские правки (исправление опечаток, уточнения).
- `MINOR` — обратно совместимые расширения.
- `MAJOR` — несовместимые изменения.

**Исключение для pre-1.0:** пока `MAJOR` равен `0`, `MINOR`-bump MAY
нести ломающее изменение вместо обязательного `MAJOR`-bump (именно
так 0.7.0 поступает относительно 0.6.x). После достижения `1.0`
ломающие изменения строго требуют `MAJOR`-bump, как указано выше.

Текущие указатели `stable` и `latest` — в [`README.md`](README.ru.md)
репозитория; машиночитаемый индекс — в [`versions.ktav`](versions.ktav).

## [0.8.0] — 2026-09-19

Нормативный текст и фикстуры соответствия для 0.8.0, под
`versions/0.8/`. Это текущая стабильная спецификация —
`versions.ktav` указывает `stable` и `latest` на 0.8.0; 0.7.1
остаётся в рабочем дереве как предыдущий стабильный релиз.

Нестрогая точка входа документа (`parse`/`loads`) не меняется: каждый
документ 0.7.x разбирается в то же Value, а каждая каноническая
запись остаётся побайтово прежней.

### Ломающее

- **§ 8.1 — parser-конформная реализация теперь также обязана
  предоставлять строгую точку входа для парсинга** (`parse_strict` /
  `loads_strict`) и отвергать каждую фикстуру из
  `versions/0.8/tests/strict-lossy/` с `LossyScalar`, называющим точные
  `body`/`canonical` из её оракула, при этом нестрогая точка входа
  продолжает принимать тот же ввод без изменений. Ни один предыдущий
  раздел не требовал наличия строгой точки входа вообще, поэтому это
  MINOR-версия, а не патч, в отличие от § 8.5 в 0.7.1 (которая лишь
  сделала проверяемым уже существующее обязательство § 8.1). На
  практике ни одна известная реализация не затронута: эталонная
  Rust-реализация в `parse_strict` уже отвергала каждую из этих форм до
  появления этого корпуса, а каждый биндинг, построенный на ней,
  наследует это поведение автоматически. См. Приложение E для заметки
  о миграции.

### Добавлено

- **Приложение E — Миграция с 0.7.x.**
- **`versions/0.8/tests/strict-lossy/`** — 14 фикстур, покрывающих
  целые с ведущим нулём, явным знаком `+`, префиксом основания
  (hex/octal/binary) и подчёркиваниями групп разрядов; отрицательный
  ноль; float с завершающим нулём и экспонентой; граничный случай
  § 5.9.8 научной записи; и ту же проверку внутри inline-object,
  inline-array, элемента многострочного массива и top-level
  inline-документа.

## [0.7.1] — 2026-09-16

Редакторский выпуск. Поведение конформного парсера и writer'а не
меняется: каждый документ 0.7.0 разбирается в то же значение, а каждая
каноническая запись остаётся побайтово прежней. Реализации, запиненные
на 0.7.0, остаются конформными формату; меняется то, как проверяется
прогон корпуса.

### Добавлено

- **§ 8.5 — контракт раннера конформанс-тестов** и
  `versions/0.7/tests/manifest.json`: машиночитаемый реестр корпуса,
  называющий замкнутый набор директорий категорий, точное число
  фикстур в каждой и каждую фикстуру, чей первичный ввод должен
  дойти до реализации сырыми байтами, а не декодированным текстом.

  Нового обязательства это не вводит. § 8.1 уже требует, чтобы
  парсер-конформная реализация принимала *каждую* фикстуру из
  `valid/`, а § 8.2 — writer-эквивалент; § 8.5 лишь делает это
  «каждую» проверяемым. Раздел появился потому, что несколько
  независимых раннеров были уличены в сообщении об успехе при
  усечённом корпусе, корпусе предыдущей версии или фикстуре, чьи
  байты были изменены лоссивым текстовым декодированием ещё до того,
  как реализация их увидела. Именно поэтому это PATCH: требование не
  новое — новой является только его проверка.

### Изменено

- **§ 8.4** — заявка на parser- или writer-конформанс подтверждается
  только прогоном корпуса раннером, удовлетворяющим § 8.5. Отдельного
  уровня конформанса для раннеров § 8.5 не вводит: раннер не является
  реализацией и не делает собственной заявки, поэтому его требования
  действуют как условия доказательности заявки реализации.

### Исправлено

- **Приложение A** — запись о 0.7.0 оставалась озаглавленной «не
  выпущено» уже после выхода 0.7.0; теперь она несёт дату выпуска.

## [0.7.0] — 2026-09-10

Нормативный текст и conformance-фикстуры для 0.7.0, в `versions/0.7/`.
Это текущая стабильная спецификация — `versions.ktav` указывает
`stable` и `latest` на 0.7.0.

### Ломающее

- **§ 3.3 — пробельные символы теперь фиксированный, исчерпывающе
  перечисленный набор из 25 кодовых точек (`MUST`), а не зависящее от
  реализации `MAY`.** Набор — свойство Unicode `White_Space` по
  состоянию на Unicode 6.3 (2013), зафиксированное явным списком, а не
  ссылкой на «текущую версию Unicode» — реализации MUST NOT
  делегировать встроенному в язык-хозяин примитиву Unicode-пробелов
  (проверено, что как минимум два мейнстрим-языка расходятся с этим
  списком в обе стороны). Не ломающее ни для одного выпущенного
  релиза 0.6.x Rust-ядра, которое уже распознавало полный набор;
  ломающее только для реализации, буквально воспринявшей старый
  `MAY` и оставшейся на ASCII-пробеле/табуляции.
- **§ 3.1 — обработка ведущего маркера порядка байтов теперь
  детерминирована.** Parser-conforming реализация MUST пропускать
  ровно один ведущий маркер порядка байтов (U+FEFF), если он
  является самой первой кодовой точкой документа, перед любым
  другим байтом; канонический писатель (§ 5.9) MUST NOT выводить
  ведущий маркер порядка байтов. Кодовая точка U+FEFF в любом
  другом месте документа — обычное содержимое: § 3.3 не относит её
  к пробельным символам. В 0.6.4 о маркере порядка байтов ничего не
  говорилось; недетерминированная формулировка `MAY skip` из
  черновика устранена.
- **§ 4 — обрезка сегмента ключа расширяется с ASCII-only на тот же
  набор из 25 кодовых точек**, устраняя действовавшее противоречие
  между § 3.3 (уже допускавшим Unicode-пробелы) и § 4 (требовавшим
  ASCII-only именно для ключей). Два ключа, различающиеся только
  не-ASCII пробельной кодовой точкой на обрезаемой границе, ранее
  различные при буквальном прочтении § 4, теперь сталкиваются как
  один и тот же ключ (§ 5.5). Фактическое поведение обрезки в
  эталонной Rust-реализации не меняется — она уже обрезала полный набор
  с версии 0.6.0; только нормативный текст догоняет код, так что это
  ломающее только для реализации, буквально следовавшей старому
  тексту § 4, а не фактическому поведению Rust-ядра.
- **§ 5.6 — stripped-форма многострочной строки (`( … )`) теперь
  обрезает замыкающие пробельные символы из каждой содержательной
  строки**, так же, как она уже поступала с ведущими пробелами каждой
  строки. Ранее `( … )` сохраняла замыкающие пробелы байт-в-байт, точно
  так же, как verbatim-форма `(( … ))` — команда редактора «убрать
  замыкающие пробелы при сохранении» могла незаметно испортить
  содержимое строки без видимого сигнала. `(( … ))` не затронута и
  остаётся полностью verbatim на обеих границах. Ломающее даже для
  Rust-ядра, которое ранее сохраняло замыкающие пробелы на каждой
  строке stripped-блока.
- **§ 5.9.0 (новый) — представимые Values теперь нормативно
  определены**, очерчивая домен, на котором действуют гарантии
  канонического эмиттера. Голый скалярный корень документа, пара
  Object с пустым именем, неконечный Float (NaN / ±Infinity), String
  с байтом `CR` или коллизией stripped-формы и любое составное Value,
  содержащее непредставимое Value на любой глубине, непредставимы, и
  writer-conforming реализация MUST отклонять их с ошибкой, не выпуская
  частичного вывода. Ранее § 5.9 оставлял не определёнными программно
  создаваемые случаи скалярного корня, пустого имени ключа и неконечного
  Float; для порождаемых парсером String с `CR` и коллизиями § 5.9.7 уже
  содержал разрешительное, но неоднозначное правило, допускавшее
  произвольный или lossy вывод. Абстрактный программный Float-носитель
  теперь отделён от заявленного конечного парсируемого/канонического
  домена Float. Носитель MUST различать NaN, +Infinity и -Infinity, чтобы три
  фикстуры `NonFiniteFloat` можно было подать и отклонить. Эти sentinel
  относятся только к программным случаям; String с `CR` и коллизиями
  порождаются парсером и отдельно покрываются
  `parseable-unrepresentable/`.
  Эталонное Rust-ядро уже отклоняет скалярные корни и String с
  `CR`; закрытие оставшихся там пробелов отслеживается отдельно.
- **Ведущий символ кавычки в ключе теперь открывает
  `<quoted-segment>` (§ 5.3.3, § 10.7).** Строка, чьё первое
  содержимое — после обрезки сегмента ключа из § 4 — начинается с
  `"`, `'` или `` ` ``, больше не обязательно парсится так же, как до
  введения quoted keys: ключ, уже начинавшийся И заканчивавшийся тем
  же символом кавычки, теперь молча читается как более короткий ключ
  с отброшенными разделителями (`"port": 1` теперь именует `port`, а
  не `"port"`); ведущий символ кавычки без парного закрывающего до
  конца строки либо проваливается в незатронутый элемент-String
  корневого Array (тип корня ещё не определён), либо порождает новую
  `UnterminatedQuotedKey` (тип корня уже Object) — точное,
  контекстно-зависимое правило и escape-лазейку в виде raw-маркера
  `::` (§ 5.4 правило 1) для элемента Array, которому нужен
  однозначный ведущий символ кавычки, см. в § 5.3.3. Ни один
  документ, чьи ключи избегают ведущего `"` / `'` / `` ` ``, не
  затронут.
- **§ 3.7 / § 5.2 — любой распознанный escape в inline-скаляре теперь
  фиксирует String до классификации ключевого слова или числа.** Тело
  вроде `1\.0`, которое в 0.6.x могло декодироваться и затем
  типизироваться как Float, в 0.7.0 является String. Это относится ко
  всем распознанным escape, включая `\.` / `\:` и три escape кавычек
  `\"` / `\'` / `` \` ``, даже когда декодированный байт не имеет
  структурной роли.
- **§ 5 (Float) / § 5.2 правило 14 — домен Float теперь имеет
  нормативный минимум и откат при переполнении.** Реализации MUST
  поддерживать как минимум диапазон и точность IEEE 754 binary64
  (MAY поддерживать более широкое представление), а float-литерал,
  чьё разобранное значение неконечно в домене Float реализации
  (например, `1e9999` на binary64), проваливается в String — в
  точности как выходящий за диапазон Integer в правиле 13 —
  поэтому 0.7.0-конформный парсер MUST NOT когда-либо порождать
  неконечный Float, что делает истинным утверждение § 5.9.0 о том,
  что «ни одна грамматика литералов § 3.6 не порождает неконечный
  Float». Новые фикстуры `float/positive_overflow_to_string`,
  `float/negative_overflow_to_string` и `float/underflow_to_zero`
  фиксируют границу; последняя документирует, что underflow в
  `0.0` (конечный) — обычный Float, а не случай отката к String.

### Изменено

- **§ 6.13 `BadEscapeSequence`** — расширена для покрытия некорректных
  форм `\uXXXX` (менее четырёх hex-цифр) и одиноких суррогатов, наряду
  с существующим случаем нераспознанного `\X`.
- **§ 6.15 `InvalidUtf8` (новая категория ошибок)** — документы, не
  являющиеся корректным UTF-8 (§ 3.1, § 9.3), теперь имеют явное
  имя категории в § 6. § 3.1 уже требовал отвергать их; это
  закрывает пробел, при котором у этого отказа в § 6 не было
  соответствующей категории. Проверка выполняется до какой-либо
  построчной или грамматической обработки; диапазон ошибки SHOULD
  указывать на байтовое смещение первой некорректной
  последовательности.
- **Правило ре-экранирования ключей в § 5.9.10** теперь перечисляет
  каждую кодовую точку, исключаемую `<key-char>` (не только `\`/`.`/`:`),
  и требует `\uXXXX` для пограничного пробела и структурных байтов без
  именованной формы (`(`, `)`, DEL, управляющие байты). Ключи,
  содержащие `(`, `)`, DEL или управляющую кодовую точку, впервые
  становятся выводимыми в канонической форме.
  Также впервые задокументировано (существовавшая ранее
  опасность, не новое поведение): bare-форма `\u0023` принимается как
  ввод для ключа, начинающегося с `##`, но canonical writer MUST
  использовать кавычки, например `"##a:b": 1`, чтобы каноническая
  строка не была молча прочитана как комментарий.
- **`<key-char>` (§ 4)** теперь допускает сырые VT (`0x0B`) и FF
  (`0x0C`) как буквальное содержимое ключа, в соответствии с
  расширением § 3.3. Не ломающее — принимает только документы, ранее
  отвергавшиеся как `InvalidKey`.
- **§ 5.9 / § 8.3** теперь определяют гарантию round-trip только для
  **представимых** (representable) Value. Строки с байтом `CR` или с
  одной из патологических коллизий stripped multi-line формы явно
  исключены § 5.9.0 из множества представимых и являются
  непредставимыми. Реализация-эмиттер MUST отклонять непредставимое
  Value с ошибкой, а не сериализовать его; ранее § 5.9.7 отдельно
  разрешал произвольную или lossy кодировку для тех же Value, что было
  несовместимо с требованием байт-детерминизма из § 5.9.
- **§ 5.9.6** — первый элемент корневого Array, если его голая
  форма сама была бы распознана правилом 6 из § 5.0.1 как
  строка-пара (например, `host: localhost` или голое `a:`), теперь
  MUST использовать raw-маркерную (`::`) форму. Ранее канонический
  эмиттер мог выдать такой элемент голым, и результирующий документ
  при повторном парсинге давал корень-Object вместо исходного
  Array — сбой round-trip, специфичный именно для первого элемента
  корневого Array (любая другая позиция элемента не затронута).
- **§ 5.9.8 — канонизация нуля Float уточнена.** Порог формы записи
  теперь читается как `0 < abs < 1e-2` (было `abs < 1e-2`), что при
  буквальном прочтении требовало бы научной записи для нуля.
  Каноническая форма нуля — `0.0` / `-0.0` — десятичная, никогда
  научная, со сохранением знака (в отличие от `-0` у Integer →
  `0`). Это соответствует существующему поведению эталонного
  Rust-ядра; меняется только нормативный текст. Новые фикстуры
  `float/positive_zero` и `float/negative_zero` фиксируют это.
- **§ 8.1 (вместе с определением Integer в § 5) — обычная числовая
  эквивалентность фикстур интерпретируется или приводится для
  сравнения в заявленном Integer- или Float-домене тестируемой
  реализации, а не относительно универсального Value минимального
  домена.** Поэтому обычный Float-токен вроде `3.14` не требует от
  реализации с более широким decimal-доменом искусственно
  воспроизводить округлённое значение binary64. Освобождение
  manifest применяется только когда исходный Ktav-литерал в заявленном
  домене тестируемой реализации расходится по значению или kind с
  токеном оракула минимального домена из-за пересечения названной
  границы этого листа. Если такого расхождения нет, перечисленный
  лист MUST совпадать обычным образом; освобождение никогда не
  распространяется на другой лист.
- **§ 8.2 (вместе с § 5.9.5) — байт-точное требование
  writer-conforming-реализации к фикстурам следует тому же правилу
  домена.** Каждое обычное, не освобождённое поле MUST совпадать с
  JSON-оракулом в заявленном домене тестируемой реализации; обычное
  числовое поле не обязано содержать универсальное Value минимального
  домена. Перечисленный граничный лист MAY отличаться только если
  исходный Ktav-литерал пересекает названную для него границу в
  тестируемом домене и реализация поддерживает более широкий домен
  вдоль этого класса границы. Каждое прочее поле MUST совпадать
  обычно, а его вклад MUST оставаться байт-точно равным
  `canonical.ktav` фикстуры. Это исправляет прежнее прочтение § 8.2,
  при котором реализация с произвольной точностью проваливала
  `i64_overflow_to_string` лишь потому, что сохраняла тело как Integer
  и записывала его голым.
- **§ 5.9.10 — канонический writer теперь предпочитает quoted-форму
  при экранировании структурного байта.** writer предпочитает
  quoted-сегмент ключа (разделитель `"`) форме bare-с-экранированием
  всякий раз, когда потребовалось бы экранировать структурный байт
  (`.` `:` `,` `{` `}` `[` `]`), `(` / `)`, `##`-префикс или
  граничный пробел (экранирование только обратного слеша, LF, CR,
  управляющего байта или DEL форму не переключает, поскольку quoting
  это экранирование не убирает). Это меняет канонические байты
  каждого ключа, ранее требовавшего экранирования `\.` / `\:` /
  скобки / запятой / круглой скобки, либо экранирования
  `##`-префикса — например, `a\.b: 1` теперь канонизируется в
  `"a.b": 1`, а не в `a\.b: 1`; существующие фикстуры
  `valid/key_escaping/*.canonical.ktav` обновляются соответственно
  (отслеживается отдельно от этого изменения текста).

### Добавлено

- **Escape-последовательность `\uXXXX` (новый § 3.7.1)** — ровно четыре
  hex-цифры, суррогатные пары для кодовых точек выше Basic Multilingual
  Plane, одинокие суррогаты отклоняются как `BadEscapeSequence`.
  Распознаётся везде, где распознаются уже существующие десять escape
  (inline-скаляры и ключи); не обрабатывается в многострочных скалярах,
  содержимом многострочных строк или комментариях. Чисто аддитивное
  дополнение таблицы escape — смысл ни одной существующей
  escape-последовательности не меняется.
- **Приложение D — гайд по миграции 0.6.x → 0.7.0.**
- **Категория соответствия `unrepresentable/` (spec#4) — коды причин
  для непредставимых Value теперь нормативны (§ 5.9.0), а § 8.2
  требует от writer-conforming реализации отклонять Value каждой
  фикстуры `versions/0.7/tests/unrepresentable/` с указанным кодом
  причины.** Три программно создаваемых кода причины — `ScalarRoot`,
  `EmptyKeyName` и `NonFiniteFloat` — представлены фикстурами в этой
  категории. Для `NonFiniteFloat` есть три
  фикстуры: `versions/0.7/tests/unrepresentable/nan.json`,
  `versions/0.7/tests/unrepresentable/negative_infinity.json` и
  `versions/0.7/tests/unrepresentable/positive_infinity.json`; каждая
  использует контекстный сентинел `{"$float": ...}` только в этой
  кодировке фикстуры, поскольку у JSON нет портируемого литерала
  NaN/Infinity. Сентинел не резервирует `$float` как имя ключа Object
  парсера. Форма API, которой writer сообщает об отказе, —
  implementation-defined, нормативны только имена кодов. README
  (en/ru/zh) документирует новую категорию рядом с уже
  существующими `valid/` / `invalid/` и заявляет, что runner'ы MUST
  обходить каждую присутствующую категорию, а не молча пропускать
  незнакомую. Не закрывает rust#5 и rust#12 — им нужна отдельная
  работа в ядре `rust` и шести биндингах, отслеживается отдельно.
- **Quoted keys (§ 5.3.3)** — сегмент ключа MAY быть записан как
  `"…"`, `'…'` или `` `…` `` вместо bare-формы; внутри разделителей
  `.`, `:`, `,`, `{`, `}`, `[`, `]` и два ДРУГИХ символа кавычки —
  обычное содержимое, не требующее экранирования, а содержимое
  никогда не обрезается. Три новых именованных escape, `\"` / `\'` /
  `` \` `` (§ 3.7), позволяют собственному разделителю сегмента
  встречаться в нём буквально — таблица escape вырастает с
  одиннадцати записей до четырнадцати. Эти же три escape также
  распознаются внутри inline-скалярных **значений**, а не только в
  ключах — `\"` / `\'` / `` \` `` теперь декодируются в буквальный
  байт кавычки и там тоже (раньше каждая была `BadEscapeSequence` в
  любом контексте, включая значения); символ кавычки по-прежнему не
  имеет структурной роли в значении — он никогда не является
  разделителем и никогда не обрезается, экранирован он или нет.
  Добавляет продукцию `<quoted-segment>` в грамматику и сужает
  существующую продукцию `<bare-segment>` (первый токен bare-сегмента
  теперь исключает неэкранированный ведущий символ кавычки) — это не
  чисто аддитивное изменение; единственное изменение поведения,
  вносимое этим сужением, — ключ или сегмент, уже начинающийся с
  символа кавычки, — вынесено отдельным пунктом выше (Breaking) и
  здесь не заявляется. Новая
  категория ошибок `UnterminatedQuotedKey` (§ 6.16) сообщается, когда
  кавычка открывает сегмент ключа без парного закрывающего до конца
  строки на строке, уже опознанной как pair line; `InvalidKey`
  (§ 6.4) и `EmptyKey` (§ 6.5) каждая получают по одному новому
  триггерящему случаю.
- **Категория соответствия `parseable-unrepresentable/` (0.7+)** —
  порождённые парсером Values, которые writer-conforming реализация MUST
  отклонять, теперь имеют пары `<name>.ktav` / `<name>.json` и четыре
  нормативных String-кода: `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision` и `LeadingWhitespaceCollision`. Эта
  категория отличается от создаваемой программно `unrepresentable/` и
  не содержит canonical-output файлов.
- **Locks inventory корпуса и секций (0.7+)** —
  `scripts/locks/corpus-inventory.0.7.lock.json` фиксирует каждый путь и
  digest корпуса, а `scripts/locks/section-inventory.0.7.lock.json` —
  упорядоченный манифест content-юнитов; builder и валидатор корпуса
  отвергают добавления, удаления, drift и изменения порядка вне
  преднамеренного обновления lock.
- **`versions/0.7/content/README.source.js` — единый source object** для
  английского, русского и китайского README контента. Builder статически
  проверяет и декодирует его, затем сравнивает все три сгенерированных
  файла побайтно; per-section `content/` units так же являются источником
  истины сгенерированных файлов спецификации.

### Исправлено

- **§ 5.0.1 правило 6 — детекция корня теперь явно на основе формы
  («кандидат в pair»).** Старая формулировка («pair line по § 5.3»)
  читалась так, будто ключ первой строки должен быть полностью
  грамматически валиден для выбора корня Object, что противоречило
  фикстурам `InvalidKey` из `tests/invalid/invalid_key/` (например,
  `a,b: 1` как весь документ). Правило 6 теперь задаёт двухфазный
  тест: фаза 1 — чисто лексическая проверка формы (первый
  неэкранированный `:` / `::` с непустым сырым префиксом, `<sep-end>`
  удовлетворён для обычного `:`); фаза 2 — единообразная валидация
  ключа по § 5.3 / § 5.3.1, идентичная любой pair line внутри
  установленного Object (§ 5.1 правило 8). В соответствии с
  reference-парсером, склеенная первая строка с обычным `:`
  (`a,b:1`) не является кандидатом в pair и проваливается в правило 7
  (одноэлементный Array), а склеенная строка с `::` кандидатом
  является и даёт `MissingSeparatorSpace`.
- **§ 5.3 / § 5.3.1 — убрана недостижимая claim про `InvalidKey` для
  `##`.** Правило 2 из § 5.1 безусловно потребляет любую строку, чья
  обрезанная форма начинается с `##`, как комментарий, до обработки
  pair line, поэтому сырая строка с `##`-префиксом структурно никогда
  не может достичь валидации ключа. Оба раздела теперь констатируют
  это и указывают на правило § 5.9.10: bare-форма `\u0023` принимается
  как ввод, но canonical writer MUST заключить ключ в кавычки, например
  `"##a:b": 1`, чтобы предотвратить коллизию.
- **§ 5.3 / § 5.3.1 — приоритет ошибок сделан явным:** для
  диспетчеризованной pair line проверки идут в порядке
  `MissingSeparator` (§ 6.6) → `EmptyKey` (§ 6.5, пустой префикс) →
  `MissingSeparatorSpace` (§ 6.10) → валидация сегмента ключа; дефект
  ключа (например, `b,c:1` внутри установленного Object) поэтому даёт
  `MissingSeparatorSpace`, а не `InvalidKey`, в соответствии с
  reference-парсером.
- **§ 5.0.1 — ведущий `[` / `{` имеет приоритет над детекцией
  кандидата в pair.** Первая содержательная строка, начинающаяся с
  `[` или `{` и не подходящая ни под одно из правил 2–5 (нет
  закрывателя, не одиночный опенер), диагностируется как искажённая
  или незакрытая попытка inline-составного (§ 5.2 правила 8–9) ещё до
  рассмотрения правила 6 — подтверждено против reference-парсера,
  который даёт `UnterminatedInlineCompound` для `[bad]: 1`, а не
  `InvalidKey`. Применяется, только когда скобка/фигурная скобка —
  первая непробельная кодовая точка строки после trim; в другом месте
  (`a{b: 1`) правило 6 работает как обычно и даёт `InvalidKey`. Фикстура
  `invalid_key/bracket_in_key` переименована в
  `invalid/inline/leading_bracket_before_separator` с исправленным
  `expected_error`.
- **README «Схема версионирования»** — компатибилити-MUST теперь
  явно не распространяется на pre-1.0 ломающий `MINOR`-bump
  (исключение, которое предыдущий абзац как раз разрешает):
  реализация, ориентированная на 0.6, не обязана разбирать документы
  0.7.x идентично. Прежняя формулировка прямо противоречила
  исключению строкой выше.
- **§ 4 grammar** — альтернативы `<header-line>` для `)` / `))`
  теперь несут примечание о контекстной зависимости: они действуют,
  только пока открыт многострочный строковый блок (§ 5.6) и обрезанная
  строка совпадает с собственным терминатором этого блока; в любом
  другом месте одиночная строка `)` / `))` — обычный текст (§ 5.1,
  § 5.2, § 5.4; § 6.1), а не структурный closer — в соответствии с
  § 6.1 и фикстурой `lone_paren_tokens`.
- **§ 10.6** — единая каноническая сериализация определена для
  каждого **представимого** Value (§ 5.9.0), а не для любого Value
  безусловно.
- **Приложение A, 0.5.0** — убран bullet «голый `CR` — это данные, не
  терминатор строки»: собственный § 3.2 спеки 0.5.0 утверждает
  обратное («байт `CR` никогда не появляется как байт содержимого при
  парсинге»), то есть bullet описывал изменение, которого никогда не
  было.
- **§ 5.0.1 — уточнена формулировка приоритета: «первая непробельная
  кодовая точка строки после trim»** вместо «первый байт строки», что
  в отрыве от контекста читалось как первый байт сырой строки и давало
  неверный ответ для `  [bad]: 1` (пробелы перед скобкой). Правило,
  как и все правила § 5.0.1, работает с обрезанной первой
  содержательной строкой; поведение подтверждено против
  reference-парсера. Новая фикстура
  `invalid/inline/leading_whitespace_bracket_before_separator`
  фиксирует случай с ведущими пробелами. Та же правка внесена в
  перевод спецификации (spec.ru.md).
- **§ 5.9.8 — в RU- и ZH-переводах восстановлено последнее предложение
  абзаца про binary64** («реализации, использующие decimal произвольной
  точности, MAY давать иной вывод только там, где их домен Value
  отличается»), отсутствовавшее в обоих; английский оригинал не
  менялся.
- **README (en/ru/zh) — дерево Layout больше не содержит
  несуществующего `tests/README.md` и показывает `unrepresentable/`
  (0.7+); абзац о биндингах теперь явно говорит, что набор функций
  C ABI не менялся с 0.1, а биндинги разбирают ту версию формата,
  которую поддерживает ядро Rust (сейчас — стабильная 0.6.4)**,
  вместо двусмысленного «тот же Ktav интерфейс».
- **§ 5.9.0 — предикат представимости разделён на проверку корня
  документа и новую внутреннюю рекурсивную проверку «узловой
  представимости» (node-representable).** Прежняя формулировка была
  единой плоской конъюнкцией bullet'ов по видам; прочитанная
  буквально, она делала обычный дочерний scalar (скажем, String,
  вложенный в Object) непредставимым, поскольку как Value сам по
  себе он проваливал самый первый bullet («V — это Object или
  Array»). Теперь ограничение на вид корня применяется только к
  самому внешнему Value, передаваемому writer'у; «узловая
  представимость» (node-representability) рекурсивно проходит через
  значения pair объекта Object и элементы Array на любой глубине,
  не навязывая это ограничение повторно. § 5.9.0 теперь также
  задаёт правило приоритета для одновременных нарушений: проверка
  корня документа выполняется первой, а когда узловая представимость
  находит среди потомков Value более одного нарушения, реализация
  MAY сообщить о любом одном из них (порядок обхода не предписан;
  это относится к всё ещё открытому контракту структурированных
  ошибок, rust#12). Четыре фикстуры `unrepresentable/`, чьё
  bare-String значение одновременно срабатывало и на `ScalarRoot`,
  и на задуманный String-специфичный код (`cr_byte`,
  `both_forms_required`, `trailing_whitespace_collision`,
  `leading_whitespace_collision`), переобёрнуты в `{"s": <string>}`,
  чтобы каждая теперь проверяла ровно свой одноимённый код причины.
- **§ 5.2 — межреализационный `MUST` «тот же Value kind» теперь
  ограничен реализациями с одним и тем же числовым доменом.**
  Безусловная формулировка противоречила собственному разрешению
  § 5 / § 8.1 на расширение домена: парсер только-i64 и парсер с
  поддержкой bignum законно классифицируют `9223372036854775808`
  по-разному (String против Integer), так что оба могли
  одновременно соблюдать свои доменные правила и нарушать старый
  безусловный `MUST`.
- **§ 5 — минимум binary64 теперь задаёт семантику преобразования,
  а не только диапазон и точность.** Преобразование десятичного
  float-литерала в минимальное binary64-представление MUST
  использовать `roundTiesToEven` из IEEE 754, а минимальное
  представление MUST поддерживать субнормальные (gradual-underflow)
  значения. Семь новых фикстур покрывают этот минимум:
  `max_finite` и `min_positive_normal` (однозначные при любом
  поддерживаемом домене), тогда как `min_positive_subnormal` — также
  зависящая от границы (`float_precision`) фикстура, наряду с четырьмя
  зависящими от границы фикстурами, добавленными в новый манифест, —
  `just_above_max_finite_to_string` (конечный в более широком
  decimal-домене, переполняется в String на binary64),
  `negative_underflow_to_negative_zero` и
  `half_min_subnormal_underflow_to_zero` (оба конечны в более
  широком домене, underflow в `±0.0` на binary64) и
  `decimal_rounding_tie` (`9007199254740993.0`, ровно посередине
  между двумя значениями binary64; binary64 округляет к чётному
  соседу `9007199254740992.0`, более широкий decimal-домен
  сохраняет литерал в точности).
- **§ 5.9.0 — разрешение «более одного нарушения» теперь покрывает
  текущий узел и ключ пары Object, а не только потомков.** Старая
  формулировка («среди потомков Value») оставляла технически
  непокрытыми String, удовлетворяющий сразу двум правилам
  коллизий, или Object с одновременно пустым ключом и отдельно
  непредставимым потомком: ключ сам по себе не является
  потомком-Value.
- **`versions/0.7/tests/unrepresentable/nan.json`,
  `negative_infinity.json` и `positive_infinity.json`** — причина
  `NonFiniteFloat` имеет три фикстуры, поскольку обычный JSON не может
  кодировать NaN или Infinity. Каждая использует нормативный сентинел
  `{"$float": ...}` только в JSON-кодировке unrepresentable-фикстуры;
  это контекстный sentinel, не резервирующий `$float` как имя ключа
  Object у парсера. README документирует сентинел рядом с остальной
  схемой `unrepresentable/`.
- **§ 5.2 больше не смешивает общее семантическое правило со списком
  фикстур.** «Одинаковый kind» `MUST` (ограниченный одинаковым
  числовым доменом) теперь сформулирован как правило о любом
  документе, который parser может увидеть; § 8.1 / § 8.2 отдельно
  называют — только для общего conformance-корпуса — какие фикстуры
  заведомо проверяют такую границу. Ранее сам § 5.2 утверждал, что
  список фикстур корпуса — полный набор зависящих от домена
  расхождений *формата*, что неверно: произвольное тело вне домена
  (например, `9223372036854775809`) пересекает ту же границу, не
  будучи именованной фикстурой.
- **`numbers/float/decimal_rounding_tie.canonical.ktav` исправлен с
  decimal- на научную запись** (`9007199254740992.0` →
  `9.007199254740992e15`): § 5.9.8 требует научную запись для любого
  ненулевого Float с `abs >= 1e7`, а это значение (~9×10^15) далеко
  за порогом. Неверная decimal-форма проверялась против
  `ktav::render::render()`, которая не применяет порог нотации
  § 5.9.8; `ktav::emit_canonical()` — функция, которая его реально
  реализует и которой должна соответствовать writer-conforming
  реализация. Все семь новых Float-фикстур, а также существовавшие
  ранее фикстуры `notation_boundaries` / `exponent`, перепроверены
  против `emit_canonical()` — это было единственное расхождение.
- **README (en/ru/zh) — исправлены две ошибки числовой модели.**
  Переполнение Float в не-конечное значение и выход Integer за
  границы i64 оба откатываются к String, но underflow Float — нет:
  он округляется до конечного знакового `0.0` и остаётся Float — прежняя формулировка этого не различала. Отдельно: каноническая форма
  `1e2` — `100.0`, а не `100` — «голое» `100` разобралось бы заново
  как Integer, ломая round-trip Float; decimal-альтернатива § 5.9.8
  всегда сохраняет десятичную точку.
- **§ 5.9.0 — сентинел `$float` контекстен JSON-кодировке
  unrepresentable-фикстуры**, а не зарезервированное имя ключа Object
  у парсера; обычные разобранные Object могут использовать `$float` как
  ключ.
- **CHANGELOG — исправлены устаревшие ссылки на фикстуру NonFiniteFloat**:
  теперь названы текущие `nan.json`, `negative_infinity.json` и
  `positive_infinity.json`, а утверждение об отсутствии фикстуры удалено.
- **`boundary-fixtures.json` (`versions/0.7/tests/boundary-fixtures.json`,
  вне `valid/`, чтобы runner, перечисляющий `valid/**/*.json` как
  фикстуры, никогда не принял его за одну из них) даёт
  машинопроверяемый контракт для расхождения числовых доменов,
  которое разрешают § 8.1 / § 8.2, позволяя реализации с более широким
  числовым доменом расходиться с некоторыми фикстурными oracle без
  потери conformance.** Манифест составлен на уровне листьев, а не
  фикстур: каждая запись называет `fixture`, JSON-указатель `path`
  (RFC 6901) на конкретный лист внутри неё и `boundary_class`
  (`integer_range` / `float_range` / `float_underflow` /
  `float_precision`), так что освобождение реализации ограничено тем
  точным листом и той осью, для которых она действительно поддерживает
  более широкий домен, — реализация с более широким доменом Integer,
  но с обычным binary64 Float освобождена только на листьях
  `integer_range`, и наоборот. Освобождение на уровне листьев означает,
  что фикстура, смешивающая зависящие от домена и обычные поля,
  освобождена лишь частично: поля `big`/`bigger` в
  `big_overflow_to_string` (выходящие за пределы i64) перечислены,
  а его поле `tiny` (обычный `Integer(1)` в любом домене) остаётся
  проверяемым. Манифест также перечисляет лист
  `numbers/float/min_positive_subnormal`, чьё точное входное значение
  decimal-домен с произвольной точностью сохраняет полностью, тогда
  как binary64 сокращает его до `5e-324`. Реализация с более широким
  доменом освобождена от побайтового совпадения с перечисленным
  листом, а не привязана к одной конкретной альтернативе,
  зафиксированной этим корпусом, — её корректность там регулируется
  напрямую § 5 / § 5.9. § 8.1 / § 8.2 ссылаются на этот манифест, на
  уровне листьев, вместо описания исключения прозой.
- **README — «проходит набор тестов» теперь заявлено как необходимое,
  но недостаточное условие соответствия.** Поскольку листья
  `boundary-fixtures.json` теперь явно не проверяются общим корпусом
  для реализации с более широким доменом, безоговорочная фраза README
  «реализация соответствует, если проходит каждый тест» стала
  неточной — такая реализация дополнительно должна сама проверять
  своё поведение по § 5 / § 5.9 для листьев, которые этот корпус
  освобождает.
- **RU/ZH § 5.9.3 — восстановлен пропущенный случай обёртки при пустом
  первом элементе.** Оба перевода описывали только обёртку
  непустого-составного-опенера (правила 4/5 § 5.0.1), а RU явно
  утверждала, что обёртка нужна «только для непустого составного»,
  опуская одинаково нормативный случай пустого составного из EN
  (правила 2/3, `{}` / `[]`). writer, построенный строго по тексту
  RU или ZH, выдал бы корень Array без обёртки, чей первый элемент —
  пустой Object/Array, который при повторном разборе даёт неверный
  kind корня, — настоящий round-trip-баг в переведённом алгоритме, а
  не просто пробел в формулировке.
- **RU/ZH § 5.6 — восстановлено пропущенное предложение о LIFO-спаривании**
  («Тело многострочной строки MUST NOT пересекать границу другого
  составного значения: строка-опенер и строка-закрытие однозначно
  спариваются через LIFO-стек парсера.»), полностью отсутствовавшее
  в обоих переводах.
- **RU/ZH § 5.8.4 — удалена выдуманная норма о глубине «SHOULD
  оставаться ниже 64 уровней».** EN не устанавливает никакого
  нормативного предела глубины и говорит лишь «SHOULD избегать
  патологически глубокой вложенности» — RU и ZH каждая придумала
  конкретное число, которого нет нигде в авторитетном тексте EN.

## [0.6.4] — 2026-08-23

### Изменено

- **Канонизация Float теперь нормативно определяет границы записи.**
  Сначала выбирается кратчайшая round-trip-десятичная форма, затем
  научная запись обязательна при `abs < 1e-2` или `abs >= 1e7`, а
  десятичная — в остальных случаях. Граничные значения и примеры
  зафиксированы в § 5.9.8; прежнее противоречие между `-0.001` и
  `1.5e-3` устранено.
- **Текущей стабильной спецификацией стала 0.6.4.** Это редакционное
  уточнение и выпуск conformance-фикстур; каталог остаётся `versions/0.6/`.

## [0.6.0] — 2026-06-01

Точечное ломающее изменение: ключи теперь обрабатывают
escape-последовательности. Два новых escape (`\.` и `\:`) делают
возможным использование литеральных точек и двоеточий внутри имён
ключей — такие ключи как `example.com`, `1.0` или `a:b`, которые
невозможно было выразить в 0.5.0.

### Ломающие

- **Ключи теперь обрабатывают escape-последовательности** (§ 3.7).
  Обратный слэш `\` является escape-лидом в ключах — так же, как
  уже был в inline-скалярных значениях. `\.` даёт литеральную точку
  (НЕ разделитель пути); `\:` даёт литеральное двоеточие (НЕ
  разделитель пары); `\\` даёт литеральный обратный слэш. Литеральный
  обратный слэш в ключе, который был обычным байтом в 0.5.0, теперь
  требует `\\`. На практике это редкость; документы, не
  содержащие `\` в ключах, разбираются одинаково под 0.6.0.
- **Грамматические правила `<key>` / `<segment>` / `<key-char>`**
  (§ 4) теперь осведомлены об escape. Разделитель точечного пути
  разбивает только по **неэкранированным** `.`; разделитель пары —
  первое **неэкранированное** `:` / `::`. Обратный слэш и точка
  исключены из `<key-char>` и обрабатываются через новое правило
  `<key-escape>`.

### Добавлено

- **Две новые escape-последовательности** — `\.` → `.` и `\:` → `:`
  — в таблицу § 3.7 (теперь десять в сумме: `\\`, `\,`, `\}`, `\]`,
  `\{`, `\[`, `\n`, `\r`, `\.`, `\:`). Применяется как к
  inline-скалярным значениям, так и к ключам.
- **Приложение C — миграционный гайд** с 0.5.0 на 0.6.0.

### Изменено

- «Ключи» удалены из списка «escape-последовательности НЕ
  обрабатываются в» (§ 3.7). Ключи теперь ОБРАБАТЫВАЮТ escape — тот
  же набор, что и inline-скаляры.
- § 5.9.10 (каноническая эмиссия ключей) — writer MUST
  ре-экранировать `\`, `.` и `:` внутри сегмента ключа, чтобы
  канонический вывод проходил round-trip через парсер.
- § 6.13 `BadEscapeSequence` — обновлён для перечисления десяти
  допустимых escape-символов (добавлены `.` и `:`).

### Версионирование

`versions/0.6/` — новая директория формата верхнего уровня.
Спецификации 0.5.0 в `versions/0.5/` и 0.1.x в `versions/0.1/`
остаются в репозитории для устаревших парсеров, желающих
параллельно поддерживать старый синтаксис.

Политика версионирования до 1.0: MINOR-инкремент (0.5 → 0.6) несёт
ломающее изменение в этой ветке версий. После выхода формата на
1.0 ломающие изменения будут требовать MAJOR-инкремента.


## [0.5.0] — 2026-05-28

Крупная ревизия языка. Три ломающих изменения плюс существенная
аддитивная поверхность для inline-форм. Реализациям, заявляющим
соответствие 0.5.0, нужен новый проход парсера — автоматической
миграции с 0.1.x нет.

### Ломающие

- **Удалены типизированные маркеры `:i` и `:f`.** Числа, булевы и
  `null` выводятся из лексической формы тела скаляра (§ 3.6,
  § 5.2). Сырой маркер `::` сохранён.
- **Комментарии теперь используют `##`** (два ASCII `#`-байта) и
  MUST занимать свою отдельную строку (§ 3.4).
- **Голое `port: 8080` теперь `Integer(8080)`**, а не
  `String("8080")`.
- **Одиночный `{` / `[` на первой содержательной строке — теперь
  многострочный корневой Object / Array** (§ 5.0.1 правила 4–5).
  Ранее (0.1.1) одиночный опенер на строке 1 давал одиночный
  Object / Array элемент внутри корневого Array. JSONL-стиль
  больше не принимается.
- **Float Values больше не несут текстовую форму**; применяется
  числовая канонизация (§ 3.6, § 5.2, § 5.9.8). Value-модель
  несёт числовое значение; канонический writer выдаёт
  детерминированную текстовую форму. Подчёркивания, выбор `e`
  vs `E`, и ведущий `+` не являются частью Value.
- **Сегменты ключей обрезаются от ведущих/хвостовых
  ASCII-пробелов** (§ 4). Пустой после обрезки сегмент — это
  `EmptyKey` (§ 6.5). Внутренние пробелы в сегменте сохраняются
  verbatim.
- **Завершители строк — `LF`, `CR` или `CR LF`** (§ 3.2). Все три
  эквивалентны. Байт `CR` никогда не появляется как содержимое на
  этапе разбора; чтобы вставить `CR` в String, используйте escape
  `\r` внутри inline-составного. Такие Value не представимы в
  канонической форме (§ 5.9.0).

### Добавлено

- **Inline-составные** — `{key: value, key2: value}` и
  `[v1, v2, v3]`, с опциональной замыкающей запятой (§ 5.8).
- **Escape-последовательности** — восемь штук: `\\`, `\,`, `\}`,
  `\]`, `\{`, `\[`, `\n`, `\r` внутри inline-скалярных значений
  (§ 3.7).
- **Грамматика числовых литералов** — `0x` hex, `0o` octal, `0b`
  binary, decimal, с подчёркиваниями (§ 3.6). Integer несёт
  целочисленное значение; Float несёт числовое значение.
  Big-integer-переполнение проваливается в String.
- **Каноническая форма (§ 5.9)** — нормативный вывод writer'а
  для каждого Value, используемый writer-conforming реализациями
  и проверяемый `*.canonical.ktav` фикстурами. Каноническая
  форма байт-детерминирована.
- **Triple-test conformance suite** — каждая valid фикстура имеет
  три файла: `name.ktav` (вход как написал автор, с комментариями
  / inline / hex / `_` / разными формами), `name.json`
  (Value-оракул), `name.canonical.ktav` (writer-оракул).
- **Top-level inline compounds** — документ, у которого первая
  содержательная строка — замкнутый inline `{...}` или `[...]`,
  становится корневым inline Object / Array (§ 5.0.1 правила 2–3).
- **Пробелы и табуляция допустимы в сегментах ключа**
  (§ 4 `<key-char>`).
- **Средне-значимый `{` / `[` литерален** (§ 5.8.5).
- **Категории ошибок** — `UnterminatedInlineCompound` (§ 6.11),
  `MalformedInlineCompound` (§ 6.12), `BadEscapeSequence`
  (§ 6.13).
- **§ 6.14 `OrphanLineAfterTopLevelInline`** — отдельная
  категория ошибок для содержимого после top-level inline корня
  или после строки закрытия одиночного `{` / `[` корневого
  опенера. Ранее это попадало под `MissingSeparator`.
- **Приложение B: Миграционный гайд** с 0.1.x на 0.5.0.
- **Разделение Compliance** — § 8 теперь определяет
  parser-conforming (§ 8.1), writer-conforming (§ 8.2) и
  свойство round-trip (§ 8.3). Реализации могут заявлять любое
  из них.

### Удалено

- Категории ошибок `InlineNonEmptyCompound` (была § 6.7) и
  `InvalidTypedScalar` (была § 6.9). Номера зарезервированы.
  Реализации MUST NOT эмиттить ошибки с этими метками для
  0.5.0-документов.

### Версионирование

`versions/0.5/` — новая директория формата верхнего уровня.
Спецификация 0.1.x в `versions/0.1/` остаётся в репозитории для
устаревших парсеров, желающих параллельно поддерживать старый
синтаксис.


## [0.1.1] — 2026-05-10

Обратносовместимое расширение: голые top-level Array.

### Добавлено

- **Top-level Array** — документ, у которого первая содержательная
  строка имеет форму array-item (голый скаляр, `:: text`, `:i 42`,
  `:f 3.14`, одиночный `{` / `[` или многострочный опенер `(` /
  `((`), теперь разбирается как корневой **Array**. Раньше корневое
  Value всегда было **Object**, поэтому голый скаляр в строке 1
  давал ошибку `MissingSeparator`. Новый § 5.0.1 описывает
  правила определения.
- Новые conformance-фикстуры в
  `versions/0.1/tests/valid/top_level_array/` и
  `versions/0.1/tests/invalid/top_level/`.

### Совместимость

Это изменение **строго аддитивно** для парсеров и документов:
любой документ, валидный в 0.1.0, остаётся валидным в 0.1.1 и
даёт то же Value (по-прежнему Object). Только входы, которые
0.1.0 отклонял как `MissingSeparator`, теперь принимаются как
Array. Документы, написанные под 0.1.1, могут не пройти под
строгим 0.1.0-парсером — это ожидаемая прямая
несовместимость новой возможности.

Реализации, поддерживающие 0.1.1, MUST реализовать определение по
§ 5.0.1; реализации, заявляющие соответствие лишь 0.1.0,
продолжают быть конформными (они корректны для 0.1.0-входов,
просто не имеют новой возможности).


## [0.1.0] — 2026-04-22

Первый выпуск спецификации. Определяет лексическую структуру,
грамматику, семантику, категории ошибок, требования соответствия и
соображения безопасности для Ktav 0.1.0.

### Формат вкратце

- Неявный Object верхнего уровня.
- Пары `key: value`; точечные ключи (`a.b.c: 1`) разворачиваются во
  вложенные Object-ы.
- `key:: value` принудительно задаёт литеральную String.
- Типовые скалярные маркеры `:i` (Integer) и `:f` (Float) — как в
  pair-позиции, так и в качестве префиксов array-item.
- Value-типы Integer и Float — числовые строки, сохраняющие
  текстовую форму для round-trip и произвольной точности.
- Ключевые слова `null`, `true`, `false` (только нижний регистр).
- Многострочные составные значения `{ ... }` и `[ ... ]` с закрывающей
  скобкой на отдельной строке; пустые `{}` / `[]` — инлайн.
- Многострочные строки `( ... )` (со снятием общего отступа) и
  `(( ... ))` (побайтово).
- `:: value` — префикс элемента массива для литеральной String внутри
  массивов; `:i value` / `:f value` — для элементов Integer / Float.
- **Обязательный пробел после разделителя** (§ 5.3 / § 5.4): каждый
  разделитель пары (`:`, `::`, `:i`, `:f`) и каждый маркер элемента
  массива (`::`, `:i`, `:f`) должен сопровождаться хотя бы одним
  ASCII-пробельным байтом **либо** концом строки. Склеенные формы —
  разделитель приклеен к body без пробела — являются ошибкой
  `MissingSeparatorSpace` (§ 6.10); примеры ошибочных документов:
  `key:value`, `port:i42`, `ratio:f0.5`. Пустое значение в виде
  `key:` или `key::` (EOL сразу за разделителем) допустимо.
- `#` в начале строки — комментарий; инлайн-комментарии не
  поддерживаются.

### Категории ошибок (§ 6)

`UnbalancedBracket`, `MismatchedBracket`, `DuplicateName`,
`PathConflict`, `InvalidKey`, `EmptyKey`, `OrphanLine`,
`InlineNonEmptyCompound`, `InvalidTypedScalar`, `MissingSeparatorSpace`.

Каталог: [`versions/0.1/`](https://github.com/ktav-lang/spec/tree/1d5dc09/versions/0.1/) — удалён из текущего дерева в `c9593e8`; ссылка ведёт на последний коммит, где он ещё существовал.
>>>>> lang=zh
# Ktav 规范变更日志

**Languages:** [English](CHANGELOG.md) · [Русский](CHANGELOG.ru.md) · **简体中文**

记录各版本格式规范的历史。规范存放于本仓库的 [`versions/`](versions/)
目录下;每个版本为独立目录,包含各自的 `spec.md` 与 `tests/`。

版本遵循 `MAJOR.MINOR.PATCH` 方案:

- `PATCH` —— 编辑性修订(修正拼写、澄清表述)。
- `MINOR` —— 向后兼容的扩展。
- `MAJOR` —— 破坏性变更。

**pre-1.0 例外:** 当 `MAJOR` 为 `0` 时,`MINOR` 递进 MAY 携带破坏性
变更,而不必强制 `MAJOR` 递进(0.7.0 相对 0.6.x 正是如此)。一旦格式
达到 `1.0`,破坏性变更将严格要求 `MAJOR` 递进,如上所述。

当前的 `stable` 与 `latest` 指针见仓库 [`README.md`](README.zh.md);
机器可读索引见 [`versions.ktav`](versions.ktav)。

## [0.8.0] —— 2026-09-19

0.8.0 的规范性文本与一致性 fixture,位于 `versions/0.8/`。这是当前
稳定规范——`versions.ktav` 将 `stable` 与 `latest` 指向 0.8.0;0.7.1
作为上一个稳定发布仍保留在工作树中。

文档的宽松入口(`parse`/`loads`)不变:每个 0.7.x 文档解析为相同的
Value,每个规范化输出逐字节不变。

### 破坏性变更

- **§ 8.1 —— parser 一致性实现现在还必须提供严格解析入口**
  (`parse_strict` / `loads_strict`),并对
  `versions/0.8/tests/strict-lossy/` 下每个 fixture 以 `LossyScalar`
  拒绝,该错误指明其 oracle 给出的精确 `body`/`canonical`;与此同时
  宽松入口继续原样接受同一输入。此前没有任何章节要求严格入口的存在,
  这就是它以 MINOR 版本而非 patch 发布的原因,不同于 0.7.1 中的
  § 8.5(它只是让已有的 § 8.1 义务变得可检验)。实际上没有任何已知
  实现受影响:Rust 参考实现的 `parse_strict` 在这一语料出现之前就已
  拒绝所有这些形式,而构建于其上的每个绑定都自动继承这一行为。迁移
  说明见附录 E。

### 新增

- **附录 E —— 从 0.7.x 迁移。**
- **`versions/0.8/tests/strict-lossy/`** —— 14 个 fixture,覆盖前导零、
  显式 `+` 号、带进制前缀(hex/octal/binary)以及数字分组下划线的
  整数;负零;带尾随零与指数的 float;§ 5.9.8 科学记数法边界情形;
  以及在 inline object、inline array、多行数组的裸元素和顶层 inline
  文档中的同一检查。

## [0.7.1] —— 2026-09-16

编辑性发布。一致性 parser 与 writer 的行为不变:每个 0.7.0 文档解析为
相同的 Value,每个规范化输出逐字节不变。固定在 0.7.0 的实现对该格式
仍然一致;改变的是如何验证一次语料库运行。

### 新增

- **§ 8.5 —— conformance 测试运行器契约**,以及
  `versions/0.7/tests/manifest.json`:语料库的机器可读清单,列明封闭
  的类别目录集合、每个类别的精确 fixture 数量,以及每个其主输入必须以
  原始字节而非解码文本到达实现的 fixture。

  这并未引入新的义务。§ 8.1 已要求 parser 一致性实现接受 `valid/` 下
  的*每一个* fixture,§ 8.2 为 writer 的对应要求——§ 8.5 只是让这个
  "每一个"变得可核查。该节之所以存在,是因为已发现多个独立运行器在
  执行被截断的语料库、上一版本的语料库,或其字节在实现看到之前已被
  有损文本解码改变的 fixture 时,仍报告成功。这也正是它作为 PATCH
  发布的理由:要求并非新增,新增的只是对它的核查。

### 变更

- **§ 8.4** —— 对 parser 或 writer 一致性的声明,仅由满足 § 8.5 的
  运行器所执行的语料库运行来支持。§ 8.5 不为运行器引入单独的一致性
  级别:运行器不是实现,自身不作出任何声明,因此其要求作为实现声明
  之证据的条件而生效。

### 修复

- **附录 A** —— 0.7.0 条目在 0.7.0 发布后仍标注为"未发布";现已改为
  发布日期。

## [0.7.0] —— 2026-09-10

`versions/0.7/` 下 0.7.0 的规范性文本与 conformance fixture。这是当前
稳定规范 —— `versions.ktav` 的 `stable` 与 `latest` 均指向 0.7.0。

### 破坏性

- **§ 3.3 —— 空白现在是固定的、穷举列出的 25 码点集合(`MUST`),
  而非依赖具体实现的 `MAY`。** 该集合是 Unicode 6.3(2013)版本时的
  `White_Space` 属性,以显式列表而非引用「当前版本的 Unicode」的方式
  固定下来 —— 实现 MUST NOT 委托给宿主语言内置的 Unicode 空白判定
  原语(已验证至少两种主流语言运行时在两个方向上均与此列表存在分歧)。
  相对每一个已发布的 0.6.x Rust 核心版本均非破坏性,因为它已经识别
  完整集合;仅对字面理解旧 `MAY` 并停留在 ASCII 空格/制表符的实现是
  破坏性的。
- **§ 3.1 —— 前导字节顺序标记的处理现在是确定性的。** 若字节顺序
  标记(U+FEFF)是文档的第一个码点、位于任何其他字节之前,
  parser-conforming 实现 MUST 跳过恰好一个这样的前导字节顺序标记;
  规范写入器(§ 5.9)MUST NOT 输出前导字节顺序标记。文档中任何其他
  位置的 U+FEFF 码点都是普通内容 —— § 3.3 未将其归类为空白。
  0.6.4 对字节顺序标记没有任何规定;早期草案中非确定性的
  `MAY skip` 措辞已移除。
- **§ 4 —— 键段修剪从仅 ASCII 扩展到同一 25 码点集合**,解决了
  § 3.3(此前已允许 Unicode 空白)与 § 4(此前专门要求键使用仅 ASCII)
  之间原本存在的矛盾。仅在被修剪边界处以非 ASCII 空白码点相区别的
  两个键,此前在字面理解 § 4 时是不同的键,现在会碰撞为同一个键
  (§ 5.5)。Rust 参考实现的实际修剪行为并未改变 —— 自 0.6.0
  起它就已经修剪完整集合;改变的只是规范文本追上了代码,因此这仅对
  字面遵循旧 § 4 文本、而非匹配 Rust 核心实际行为的实现是破坏性的。
- **§ 5.6 —— 多行字符串 stripped 形式(`( … )`)现在会逐行去除尾部
  空白**,这与它此前已对每行前导空白所做的处理一致。此前 `( … )` 会
  逐字节保留尾部空白,与 verbatim 形式 `(( … ))` 完全一致 —— 编辑器的
  「保存时去除尾部空白」功能可能因此在毫无提示的情况下悄悄改变字符串
  内容。`(( … ))` 不受影响,两侧边界仍完全 verbatim。即使对 Rust 核心
  也是破坏性的 —— 它此前在 stripped 块的每一行都保留尾部空白。
- **§ 5.9.0(新增)—— 可表示的 Value 现在被规范性定义**,划定了
  规范 writer 保证所作用的域。裸标量文档根、名为空的 Object 对、
  非有限 Float(NaN / ±Infinity)、含 `CR` 字节或 stripped 形式碰撞
  的 String,以及任意深度包含不可表示 Value 的任何复合值均不可表示,
  writer-conforming 实现 MUST 以错误拒绝它们,不输出任何部分内容。
  此前 § 5.9 未定义的仅是只能通过程序构造的标量根、空键名和非有限
  Float 情形;对于解析器产生的含 `CR` 或发生 collision 的 String,
  § 5.9.7 已有规定,但该规定过于宽松且含糊,允许任意或有损输出。
  现在抽象程序化 Float 载体已与声明的有限可解析/规范 Float 域区分开来。
  该载体 MUST 区分 NaN、+Infinity 与 -Infinity,以便三个
  `NonFiniteFloat` fixture 可以被提供并拒绝。这些 sentinel 仅属于
  程序化情形;含 `CR` 或 collision 的 String 由解析器产生,另由
  `parseable-unrepresentable/` 覆盖。Rust 参考核心已拒绝标量根与含
  `CR` 的 String;弥补其余缺口另行跟踪。
- **键中的前导引号字符现在会开启 `<quoted-segment>`
  (§ 5.3.3、§ 10.7)。** 某行的首个内容 —— 经 § 4 的键段修剪后 ——
  以 `"`、`'` 或 `` ` `` 开头时,不再必然按引入 quoted keys 之前的
  方式解析:一个原本以同一引号字符开头且结尾的键,现在会被静默
  读作去掉分隔符的更短的键(`"port": 1` 现在命名为 `port`,而非
  `"port"`);行末前没有匹配闭合符的前导引号字符,要么落入不受
  影响的 Array 根 String 项(根类型尚未确定),要么触发新的
  `UnterminatedQuotedKey`(根类型已是 Object)—— 具体的、依赖
  上下文的规则,以及为需要无歧义前导引号字符的 Array 项提供的
  `::` raw 标记逃生舱(§ 5.4 规则 1),见 § 5.3.3。任何键不以 `"` /
  `'` / `` ` `` 开头的文档均不受影响。
- **§ 3.7 / § 5.2 —— inline 标量中的任何已识别 escape 现在会在关键字
  或数字分类之前强制为 String。** 像 `1\.0` 这样的 body 在 0.6.x
  中可以先解码再定型为 Float,在 0.7.0 中则是 String。该规则适用于
  每一个已识别的 escape,包括 `\.` / `\:` 以及三个引号 escape（三者）
  `\"` / `\'` / `` \` ``,即使解码出的字节不具有结构性作用。
- **§ 5(Float)/ § 5.2 规则 14 —— Float 域现在有规范性下限与
  溢出回退。** 实现 MUST 至少支持 IEEE 754 binary64 的范围与
  精度(MAY 支持更宽表示),且在实现 Float 域内解析值非有限的
  浮点字面量(如 binary64 上的 `1e9999`)回退为 String —— 与
  规则 13 中超出范围的 Integer 完全一致 —— 因此 0.7.0 兼容解析器
  MUST NOT 永远产生非有限 Float,这使 § 5.9.0「§ 3.6 的任何
  字面量语法都不产生非有限 Float」的断言真正成立。新 fixture
  `float/positive_overflow_to_string`、`float/negative_overflow_to_string`
  与 `float/underflow_to_zero` 将边界锁定;最后一个 fixture 记录
  下溢到 `0.0`(有限)是普通 Float,而非回退为 String 的情形。

### 变更

- **§ 6.13 `BadEscapeSequence`** —— 扩展以覆盖不合法的 `\uXXXX` 形式
  (少于四位十六进制数字)与孤立代理项,与既有的未识别 `\X` 情形并列。
- **§ 6.15 `InvalidUtf8`(新增错误类别)** —— 原始字节不是有效 UTF-8
  (§ 3.1、§ 9.3)的文档现在有了显式的 § 6 类别名称。§ 3.1 已要求
  拒绝此类文档;这补上了该拒绝在 § 6 中没有对应类别名称的缺口。
  该检查在任何面向行的或文法级处理之前进行;错误 span SHOULD 指向
  第一个无效序列的字节偏移。
- **§ 5.9.10 的键重新 escape 规则** 现在列举 `<key-char>` 排除的每个
  码点(不仅是 `\`/`.`/`:`),并要求对边界空白与没有命名形式的结构
  字节(`(`、`)`、DEL、控制字节)使用 `\uXXXX`。含有 `(`、`)`、DEL
  或控制码点的键首次可在规范形式中输出。
  另外首次记录(此前就存在的风险,并非新行为):以 `##` 开头的键接受
  `\u0023` bare 形式作为输入,但规范 writer MUST 使用引号,例如
  `"##a:b": 1`,从而不会让规范输出的该行被悄悄读作注释。
- **`<key-char>`(§ 4)** 现在允许原始 VT(`0x0B`)与 FF(`0x0C`)
  作为字面键内容,与 § 3.3 的扩展一致。非破坏性 —— 仅接受此前被
  拒绝为 `InvalidKey` 的文档。
- **§ 5.9 / § 8.3** 现在仅对**可表示**(representable)的 Value
  定义 round-trip 保证。含 `CR` 字节或 stripped 多行形式的某种
  病态碰撞的 String,已由 § 5.9.0 明确排除在可表示域之外,属于
  不可表示 Value。writer-conforming 实现 MUST 以错误拒绝不可
  表示的 Value,而不是将其序列化;此前 § 5.9.7 单独允许为同一类
  Value 输出任意或 lossy 编码,这与 § 5.9 的字节确定性要求不兼容。
- **§ 5.9.6** —— 根 Array 的第一个项,若其裸形式本身会被 § 5.0.1
  规则 6 识别为 pair line(例如 `host: localhost`,或裸
  `a:`),现在 MUST 使用原始标记(`::`)形式。此前规范 writer 可能
  以裸形式输出该项,导致结果文档重解析时根变为 Object 而非原本的
  Array —— 这一 round-trip 失败专属于根 Array 的第一个项(其余
  任何项位置不受影响)。
- **§ 5.9.8 —— Float 零的规范化得到澄清。** 表示形式阈值现在为
  `0 < abs < 1e-2`(原为 `abs < 1e-2`),按字面理解后者会要求零
  使用科学形式。零的规范形式为 `0.0` / `-0.0` —— 十进制,绝非
  科学形式,符号保留(不同于 Integer 的 `-0` → `0`)。这与 Rust
  参考核心的既有行为一致;改变的只是规范文本。新 fixture
  `float/positive_zero` 与 `float/negative_zero` 将其锁定。
- **§ 8.1(连同 § 5 的 Integer 定义)——普通 fixture 的数值等价性
  在被测实现声明的 Integer 或 Float 域中解释,或转换到该域后比较,
  而不是相对于一个普遍适用的最小域 Value。** 因此普通 Float token
  (例如 `3.14`)不要求更宽的 decimal 实现伪造 binary64 的舍入值。
  只有当源 Ktav 字面量在被测实现声明的域中解释后,因越过该叶指明的
  边界而在值或 kind 上不同于最小域 oracle token 时,manifest 豁免才
  适用。若没有这种差异,列出的叶 MUST 正常匹配;豁免绝不扩展到其他叶。
- **§ 8.2(连同 § 5.9.5)—— writer-conforming 的逐字节 fixture
  要求遵循同一数值域规则。** 每个普通且未豁免的字段 MUST 在被测
  实现声明的域中与 JSON oracle 匹配;普通数值字段不要求持有一个普遍
  适用的最小域 Value。列出的边界叶 MAY 不同,仅当源 Ktav 字面量在
  被测域中越过该叶命名的边界,且实现沿该边界类支持更宽域时才可如此。
  其他每个字段 MUST 正常匹配,其贡献 MUST 与 fixture 的
  `canonical.ktav` 保持字节精确相同。这修正了 § 8.2 的旧读法:该读法
  会仅因任意精度实现将 `i64_overflow_to_string` 的 body 保留为
  Integer 并以裸形式写出,就判定其不合规。
- **§ 5.9.10 —— 规范 writer 现在在需要转义结构字节时优先选择
  quoted 形式。** 每当需要转义结构字节(`.` `:` `,` `{` `}` `[`
  `]`)、`(` / `)`、`##` 前缀或边界空白时,writer 现在优先选择
  quoted 键段(分隔符 `"`)而非 bare-加转义(仅需转义反斜杠、LF、
  CR、控制字节或 DEL 时不切换形式,因为 quoting 并不能省去该
  转义)。这改变了此前需要转义 `\.` / `\:` / 括号 / 逗号 / 圆括号,
  或需要转义 `##` 前缀的每一个键的规范字节 —— 例如,`a\.b: 1`
  现在规范化为 `"a.b": 1`,而非 `a\.b: 1`;既有的
  `valid/key_escaping/*.canonical.ktav` fixture 相应更新
  (与此文本改动分开跟踪)。

### 新增

- **`\uXXXX` escape(新增 § 3.7.1)** —— 恰好四位十六进制数字,基本
  多文种平面之外的码点使用代理对,孤立代理项被拒绝为
  `BadEscapeSequence`。在已有十个 escape 被识别之处(inline 标量与键)
  同样被识别;不在多行标量、多行字符串内容或注释中处理。对 escape 表
  纯属新增 —— 已有任何一个 escape 序列的含义均未改变。
- **附录 D —— 从 0.6.x 迁移到 0.7.0 的指南。**
- **`unrepresentable/` 一致性类别(spec#4)—— 不可表示 Value 的
  原因代码现已规范化(§ 5.9.0),§ 8.2 要求 writer-conforming 实现
  以指定原因代码拒绝 `versions/0.7/tests/unrepresentable/` 中每个
  fixture 的 Value。** 三个只能编程构造的原因码——`ScalarRoot`、
  `EmptyKeyName` 与 `NonFiniteFloat`——在此类别中都有 fixture。
  `NonFiniteFloat` 有三个 fixture:
  `versions/0.7/tests/unrepresentable/nan.json`、
  `versions/0.7/tests/unrepresentable/negative_infinity.json` 与
  `versions/0.7/tests/unrepresentable/positive_infinity.json`;每个都在
  unrepresentable fixture 的 JSON 编码中使用上下文限定的
  `{"$float": ...}` 哨兵,因为 JSON 没有可移植的 NaN/Infinity 字面量。
  该哨兵不会把 `$float` 保留为 parser Object 的键名。writer
  用以报告拒绝的 API 形式是 implementation-defined,规范性的只是
  代码名称。README(en/ru/zh)在既有 `valid/` / `invalid/` 旁记录了
  新类别,并要求 runner MUST 遍历每个存在的类别,而非静默跳过不
  认识的类别。不解决 rust#5 或 rust#12 —— 二者需要在 `rust` 核心
  与六个语言绑定中另行完成。
- **Quoted keys(§ 5.3.3)** —— 键段 MAY 写作 `"…"`、`'…'` 或
  `` `…` `` 以代替 bare 形式;在分隔符内部,`.`、`:`、`,`、`{`、
  `}`、`[`、`]` 以及另外两种引号字符均为普通内容,无需转义,且
  内容永不被修剪。三个新增的具名 escape,`\"` / `\'` / `` \` ``
  (§ 3.7),使得段自身的分隔符可以字面出现在段内 —— escape 表从
  十一项增至十四项。这三个 escape 同样在 inline 标量**值**中被识别,
  不仅限于键 —— `\"` / `\'` / `` \` `` 现在在值中也解码为字面引号
  字节(此前三者在任何上下文中——包括值——都是
  `BadEscapeSequence`);引号字符在值中仍无结构性作用,既不作为
  分隔符,也不会被剥离,无论是否转义。为语法新增
  `<quoted-segment>` 产生式,同时收窄了既有的 `<bare-segment>`
  产生式(bare 段的首个 token 现在排除未转义的引号字符开头)——
  并非纯属新增;此次收窄带来的唯一行为变化——已经以引号字符开头
  的键或段——已在上方单独的 Breaking 条目中说明,此处不再重复
  声称。新增错误类别 `UnterminatedQuotedKey`(§ 6.16),
  在已知为 pair line 的行上,当引号开启键段却在行末前没有匹配
  闭合符时报告;`InvalidKey`(§ 6.4)与 `EmptyKey`(§ 6.5)各自
  新增一种触发场景。
- **`parseable-unrepresentable/` 一致性类别(0.7 起)** —— parser 产生、但
  conforming writer MUST 拒绝的 Value 现在使用
  `<name>.ktav` / `<name>.json` 配对 fixture,并限定四个规范性 String
  原因码:`CRByte`、`BothFormsRequired`、`TrailingWhitespaceCollision`
  与 `LeadingWhitespaceCollision`。它区别于只能编程构造的
  `unrepresentable/`,不包含 canonical-output 文件。
- **语料库与节 inventory lock(0.7 起)** ——
  `scripts/locks/corpus-inventory.0.7.lock.json` 锁定每个语料路径及
  digest,而 `scripts/locks/section-inventory.0.7.lock.json` 锁定有序的
  content-unit manifest;builder 与语料校验器会拒绝未伴随有意 lock
  更新的新增、删除、漂移与顺序变化。
- **`versions/0.7/content/README.source.js` 是 README 的单一源对象**,
  为英文、俄文与中文 content README 提供 `{ en, ru, zh }`。Builder
  静态校验并解码它,再逐字节比较三个生成文件;各节 `content/` unit
  同样是生成规范文件的事实来源。

### 已修复

- **§ 5.0.1 规则 6 —— 根检测现在明确基于形状(「pair 候选」)。**
  旧措辞(「§ 5.3 下的 pair line」)读起来像是首行的键必须已经
  语法完全有效才能选出 Object 根,这与 `tests/invalid/invalid_key/`
  下的 `InvalidKey` fixture(例如整份文档就是 `a,b: 1`)相矛盾。
  规则 6 现在给出两阶段测试:阶段 1 是纯词法的形状检查(按 § 4
  分隔符扫描规则存在首个未 escape 的 `:` 或 `::`,其前有非空原始
  前缀,普通 `:` 满足 `<sep-end>`);阶段 2 是统一校验,与已建立
  Object 内任何 pair line 的校验(§ 5.1 规则 8)完全一致,按 § 5.3 /
  § 5.3.1 进行。与参考解析器一致:粘连的普通 `:` 首行(`a,b:1`)
  不是 pair 候选,落入规则 7(单项 Array);粘连的 `::` 行是 pair
  候选,报告 `MissingSeparatorSpace`。
- **§ 5.3 / § 5.3.1 —— 移除了针对裸 `##` 不可达的 `InvalidKey`
  声明。** § 5.1 规则 2 会无条件地把任何修剪后以 `##` 开头的行当作
  注释消费,发生在任何 pair line 处理之前,因此裸 `##` 前缀行在
  结构上永远无法到达键校验。两节现在都陈述了这一点,并指出
  § 5.9.10 的规则:`\u0023` bare 形式是可接受的输入,但规范 writer
  MUST 为该键使用引号,例如 `"##a:b": 1`,以防止该碰撞。
- **§ 5.3 / § 5.3.1 —— 错误优先级被明确化:** 对已分发的 pair
  line,检查顺序为 `MissingSeparator`(§ 6.6)→ 空前缀的
  `EmptyKey`(§ 6.5)→ `MissingSeparatorSpace`(§ 6.10)→ 键段校验;
  因此键缺陷(如既有 Object 内的 `b,c:1`)报告
  `MissingSeparatorSpace` 而非 `InvalidKey`,与参考解析器一致。
- **§ 5.0.1 —— 行首 `[` / `{` 优先于 pair 候选检测。** 若首条
  内容行以 `[` 或 `{` 开头,但不符合规则 2–5 中任何一条(无匹配
  闭合符,也非单独开启符),则诊断为格式错误或未闭合的 inline
  复合值尝试(§ 5.2 规则 8–9),该诊断先于规则 6 生效 —— 已针对
  参考解析器验证:`[bad]: 1` 报告 `UnterminatedInlineCompound`,
  而非 `InvalidKey`。仅当方括号/花括号是该行经 trim 后的首个非空白
  码点时适用;出现在行内其他位置时(如 `a{b: 1`)规则 6 照常生效,产生
  `InvalidKey`。fixture `invalid_key/bracket_in_key` 已重命名为
  `invalid/inline/leading_bracket_before_separator`,并修正了
  `expected_error`。
- **README「版本方案」**—— 跨版本兼容 MUST 现在明确不适用于
  pre-1.0 破坏性 `MINOR` 递进(即上一段刚刚允许的例外):面向 0.6
  的实现不需要以相同方式解析 0.7.x 文档。此前的措辞与上方的例外
  直接矛盾。
- **§ 4 语法** —— `<header-line>` 中 `)` / `))` 的分支现在带有
  上下文相关性说明:仅当多行字符串块处于打开状态(§ 5.6)且修剪后
  的行与该块自身的终止符一致时才成立;其他任何地方,单独一行
  `)` / `))` 都是普通文本(§ 5.1、§ 5.2、§ 5.4;§ 6.1),而非结构性
  闭合符 —— 与 § 6.1 及 `lone_paren_tokens` fixture 一致。
- **§ 10.6** —— 单一规范序列化的定义对象现在是每个**可表示**的
  Value(§ 5.9.0),而非无条件的每个 Value。
- **附录 A,0.5.0** —— 移除了「不紧跟 `LF` 的裸 `CR` 字节为内容,
  非行终止符」这一条:0.5.0 规范自身的 § 3.2 陈述的是相反的事实
  (「`CR` 字节在解析时绝不作为内容字节出现」),说明该条描述的是
  从未发生过的变更。
- **§ 5.0.1 —— 括号优先级措辞改为「该行经 trim 后的首个非空白码点」**,
  原先「该行第一个字节」孤立地读会被理解为原始行,对 `  [bad]: 1`
  (括号前有前导空白)给出错误结论。该规则与 § 5.0.1 的所有规则一样
  作用于 trim 后的首条内容行;行为已针对参考解析器验证。新增 fixture
  `invalid/inline/leading_whitespace_bracket_before_separator` 锁定
  前导空白情形。规范的 ZH 翻译(与 RU 翻译)同步修正。
- **§ 5.9.8 —— 补回 RU 与 ZH 翻译中 binary64 段落缺失的最后一句**
  (「使用任意精度 decimal 的实现 MAY 产生不同输出,但仅限于其
  Value 域有所不同之处」);英文原文未变。
- **README(en/ru/zh)—— Layout 树不再列出并不存在的 `tests/README.md`,
  并补上 `unrepresentable/`(0.7+);绑定段落改为明确陈述 C ABI 函数
  接口自 0.1 起未变,且绑定解析底层 Rust 核心所支持的格式版本(当前
  为稳定版 0.6.4)**,取代含混的「相同的 Ktav 接口」。
- **§ 5.9.0 —— 可表示性谓词被拆分为文档根检查与新增的内部递归
  「节点可表示」（node-representable）检查。** 旧措辞是一条单一的
  扁平合取,按字面阅读会使普通的子标量(例如嵌套在 Object 中的
  String)不可表示,因为它作为独立的 Value 无法通过第一条
  (「V 是 Object 或 Array」)。现在只有交给 writer 的最外层 Value
  才受根类型约束;「节点可表示性」以任意深度递归穿过 Object 的
  pair 值与 Array 元素,而不会重复施加该约束。§ 5.9.0 现在还规定
  了同时违规时的优先级规则:文档根检查最先求值,而当节点可表示性
  在 Value 的后代中发现多于一个违规时,实现 MAY 报告其中任意一个
  (不强制遍历顺序;这属于仍未定案的 structured-error 契约,
  rust#12)。四个 `unrepresentable/` fixture 的裸 String 值此前
  同时触发 `ScalarRoot` 和预期的 String 专属代码(`cr_byte`、
  `both_forms_required`、`trailing_whitespace_collision`、
  `leading_whitespace_collision`),现已重新包装为 `{"s": <string>}`,
  使每个 fixture 精确检验其同名的原因代码。
- **§ 5.2 —— 跨实现的「相同 Value kind」`MUST` 现在限定于共享同一
  数值域的实现。** 无条件措辞与 § 5 / § 8.1 自身的加宽域许可相
  矛盾:仅支持 i64 的解析器与支持 bignum 的解析器会合法地把
  `9223372036854775808` 分类为不同结果(String 对 Integer),二者
  可以同时遵守各自的域规则却又违反旧的笼统 `MUST`。
- **§ 5 —— binary64 下限现在规定转换语义,而不仅是范围与精度。**
  把 decimal 的 Float 字面量转换为最小 binary64 表示 MUST 采用
  IEEE 754 的 `roundTiesToEven`,且最小表示 MUST 支持次正规
  (gradual-underflow)值。七个新 fixture 覆盖此下限:`max_finite` 与
  `min_positive_normal`(在任何支持的域下都无歧义),而
  `min_positive_subnormal` 也是依赖边界的(`float_precision`)
  fixture,以及加入新清单的另外四个依赖边界的 fixture ——
  `just_above_max_finite_to_string`(在更宽 decimal 域内有限,在
  binary64 上溢为 String)、`negative_underflow_to_negative_zero`
  与 `half_min_subnormal_underflow_to_zero`(二者在更宽域内有限,
  在 binary64 下溢为 `±0.0`),以及 `decimal_rounding_tie`
  (`9007199254740993.0`,恰好位于两个 binary64 值的正中;binary64
  舍入到偶数邻居 `9007199254740992.0`,更宽的 decimal 域则精确
  保留该字面量)。
- **§ 5.9.0 —— 「多于一个违反」许可现在覆盖当前节点与 Object 的
  键,而不仅是后代。** 旧措辞(「在 Value 的后代中」)使得同时满足
  两条冲突规则的 String,或同时有空键与另一处不可表示子节点的
  Object 在技术上未被覆盖 —— 键本身并不是 Value 的后代。
- **`versions/0.7/tests/unrepresentable/nan.json`、
  `negative_infinity.json` 与 `positive_infinity.json`** ——
  `NonFiniteFloat` 原因有三个 fixture,因为 plain JSON 无法编码 NaN
  或 Infinity。每个 fixture 仅在 unrepresentable fixture 的 JSON 编码
  中使用规范性 `{"$float": ...}` 上下文哨兵;它不会把 `$float` 保留为
  parser Object 的键名。README 在 `unrepresentable/` 其余 schema 之旁
  记录了该哨兵。
- **§ 5.2 不再把一般语义规则与 fixture 清单混为一谈。**
  同 kind 的 `MUST`(限定于相同数值域)现在作为关于解析器可能见到的
  每一份文档的规则来陈述;§ 8.1 / § 8.2 则单独指名 —— 仅对共享一致性
  语料库而言 —— 哪些 fixture 已知会探测此类边界。此前 § 5.2 自身声称
  语料库的 fixture 清单就是*格式*中域相关分歧的完整集合,这是
  错误的 —— 任意越域的体(如 `9223372036854775809`)跨越同一边界却
  并非具名 fixture。
- **`numbers/float/decimal_rounding_tie.canonical.ktav` 从 decimal
  形式修正为科学形式**(`9007199254740992.0` →
  `9.007199254740992e15`):§ 5.9.8 要求任何 `abs >= 1e7` 的非零
  Float 使用科学形式,而该值(约 9×10^15)远超此界。错误的 decimal
  形式此前是对照 `ktav::render::render()` 检验的,该函数并不应用
  § 5.9.8 的记法阈值;`ktav::emit_canonical()` 才是真正实现该阈值的
  函数,也是 writer-conforming 实现必须匹配的对象。已针对
  `emit_canonical()` 重新验证全部七个新 Float fixture,以及既有的
  `notation_boundaries` / `exponent` fixture —— 这是唯一的不匹配。
- **README(en/ru/zh)—— 修正两处数值模型错误。** Float 溢出为
  非有限值与 Integer 超出 i64 范围都会回退为 String,但 Float *下溢*
  不会:它舍入为有限的带符号 `0.0` 并保持为 Float,此前的措辞没有
  区分这一点。另外,`1e2` 的规范形式是 `100.0` 而非 `100` —— 裸的
  `100` 会重解析为 Integer,破坏 Float 的 round-trip;§ 5.9.8 的
  decimal 替代形式始终保留小数点。
- **§ 5.9.0 —— `$float` 哨兵仅限于 unrepresentable fixture 的
  JSON 编码**,并不是 parser Object 的保留键名;普通解析出的 Object
  可以使用 `$float` 作为键。
- **CHANGELOG —— 修正过时的 NonFiniteFloat fixture 引用**:现在列出
  当前的 `nan.json`、`negative_infinity.json` 与 `positive_infinity.json`,
  并删除「没有 fixture」的说法。
- **`boundary-fixtures.json`(`versions/0.7/tests/boundary-fixtures.json`,
  位于 `valid/` 之外,使以 `valid/**/*.json` 枚举 fixture 的 runner
  永远不会把它误认为 fixture)为 § 8.1 / § 8.2 所许可的数值域偏差
  提供了可机读契约,使拥有更宽数值域的实现可以偏离某些 fixture
  oracle 而不失去 conformance。** 该清单是叶级而非 fixture 级:每个
  条目指名一个 `fixture`、一个指向其内部具体叶的 JSON 指针 `path`
  (RFC 6901),以及一个 `boundary_class`(`integer_range` /
  `float_range` / `float_underflow` / `float_precision`),因此实现的
  豁免被限定在它真正支持更宽域的那个确切叶与轴上 —— 一个拥有更宽
  Integer 域但只有普通 binary64 Float 的实现仅在 `integer_range` 叶上
  豁免,反之亦然。叶级豁免意味着,若某 fixture 同时混有依赖数值域与
  普通字段,也只有部分被豁免:`big_overflow_to_string` 的 `big`/
  `bigger` 字段(超出 i64)被列入清单,而其 `tiny` 字段(在每个域中
  都是普通的 `Integer(1)`)仍需被检查。该清单还列出了
  `numbers/float/min_positive_subnormal` 的叶 —— 任意精度 decimal 域
  会完整保留其精确输入值,而 binary64 会将其缩短为 `5e-324`。更宽域
  的实现豁免于逐字节匹配所列的叶,不受该语料库固定的某个特定替代
  方案约束 —— 其在该处的正确性直接由 § 5 / § 5.9 管辖。§ 8.1 / § 8.2
  在叶级上引用此清单,取代以文字描述例外。
- **README —— 「通过测试套件」现在被表述为合规的必要条件而非充分
  条件。** 随着 `boundary-fixtures.json` 的叶现在被显式声明为由共享
  语料不对更宽域实现进行验证,README 中不加限定的「实现通过全部测试
  即合规」的说法不再准确 —— 这样的实现还必须对语料豁免的那些叶自行
  验证其 § 5 / § 5.9 行为。
- **RU/ZH § 5.9.3 —— 恢复缺失的空首项包裹情形。** 两个译本都只描述了
  非空复合值开启行的包裹(§ 5.0.1 规则 4/5),且 RU 明确声称仅在
  「首项为非空复合值时」才需要包裹,遗漏了英文原文中同等规范性的空
  复合值情形(规则 2/3,`{}` / `[]`)。严格依照 RU 或 ZH 文本构建的
  writer 会输出一个首项为空 Object/Array 的未包裹 Array 根,其重新
  解析时根 kind 错误 —— 这是译出算法中真正的 round-trip 缺陷,而不
  只是措辞缺口。
- **RU/ZH § 5.6 —— 恢复缺失的 LIFO 配对句子**(「多行字符串体
  MUST NOT 跨越另一个复合值的边界:开启行与关闭行通过解析器的 LIFO
  栈无歧义地配对。」),两个译本均完全缺失。
- **RU/ZH § 5.8.4 —— 移除捏造的「SHOULD 低于 64 层」深度限制。**
  英文原文未设定任何规范性深度限制,只说「SHOULD 避免病态的深度
  嵌套」 —— RU 和 ZH 各自编造了一个权威英文文本中并不存在的具体
  数字。

## [0.6.4] —— 2026-08-23

### 变更

- **Float 规范化现在明确规定表示边界。** writer 先选择最短的
  round-trip 十进制形式,再在 `abs < 1e-2` 或 `abs >= 1e7` 时必须使用
  科学形式,其余情况使用十进制形式。§ 5.9.8 现在明确记录边界值和
  示例,消除了 `-0.001` 与 `1.5e-3` 之间的矛盾。
- **当前稳定规范为 0.6.4。** 这是编辑澄清与 conformance fixture
  发布;目录仍为 `versions/0.6/`。

## [0.6.0] —— 2026-06-01

针对性的破坏性变更:键现在处理 escape 序列。两个新 escape(`\.`
与 `\:`)使在键名中使用字面点与冒号成为可能 —— 诸如
`example.com`、`1.0` 或 `a:b` 这类在 0.5.0 中无法表达的键。

### 破坏性

- **键现在处理 escape 序列**(§ 3.7)。反斜杠 `\` 在键中为 escape
  前导 —— 正如它已经在 inline 标量值内的作用一样。`\.` 产生字面点
  (非路径分隔符);`\:` 产生字面冒号(非对分隔符);`\\` 产生字面
  反斜杠。在 0.5.0 中作为普通字节的键内字面反斜杠现在需要 `\\`。
  实践中较罕见;键中未含 `\` 的文档在 0.6.0 下解析方式不变。
- **`<key>` / `<segment>` / `<key-char>` 语法产生式**(§ 4)现在
  escape 感知。点分路径分隔仅在**未 escape** 的 `.` 处进行;对分
  隔符为首个**未 escape** 的 `:` / `::`。反斜杠与点从 `<key-char>`
  中排除,改由新的 `<key-escape>` 处理。

### 新增

- **两个新 escape 序列** —— `\.` → `.` 与 `\:` → `:` —— 加入 § 3.7
  表(现共十个:`\\`、`\,`、`\}`、`\]`、`\{`、`\[`、`\n`、`\r`、
  `\.`、`\:`)。适用于 inline 标量值与键。
- **附录 C —— 迁移指南** 从 0.5.0 到 0.6.0。

### 变更

- 从「escape 序列不在以下场景处理」列表(§ 3.7)中移除「键」。键
  现在处理 escape —— 与 inline 标量相同的集合。
- § 5.9.10(规范键输出)—— writer MUST 对键段中的 `\`、`.` 与 `:`
  重新 escape,以确保规范输出能通过解析器 round-trip。
- § 6.13 `BadEscapeSequence` —— 更新为列出十个有效 escape 字符
  (新增 `.` 与 `:`)。

### 版本控制

`versions/0.6/` 为新的顶层格式目录。`versions/0.5/` 处的 0.5.0
规范与 `versions/0.1/` 处的 0.1.x 规范保留在仓库中,以便希望并行
支持旧语法的旧解析器。

1.0 之前的版本策略:MINOR 增量(0.5 → 0.6)在该版本线中携带破坏性
变更。一旦格式发布到 1.0,破坏性变更将需要 MAJOR 增量。


## [0.5.0] —— 2026-05-28

语言的重大修订。三个破坏性变更与显著的 inline 形式增补面。
声明 0.5.0 兼容性的实现需要重写解析器 —— 没有从 0.1.x 的
自动迁移。

### 破坏性

- **移除类型标记 `:i` 与 `:f`。** 数字、布尔与 `null` 从标量
  字面形式推断(§ 3.6、§ 5.2)。`::` 原始标记保留。
- **注释改为 `##`** (两个 ASCII `#` 字节)且 MUST 独占一行
  (§ 3.4)。
- **裸 `port: 8080` 现在为 `Integer(8080)`**,而非
  `String("8080")`。
- **首条内容行的单独 `{` / `[` 现在为多行根 Object / Array**
  (§ 5.0.1 规则 4–5)。先前(0.1.1)首行的单独开启符产生
  根级 Array 内的单一 Object / Array 项;JSONL 式形式不再
  被接受。
- **Float Values 不再保留文本形式**;应用数值规范化(§ 3.6、
  § 5.2、§ 5.9.8)。Value 模型携带数值;规范 writer 输出
  确定性的文本形式。下划线、`e` vs `E` 的选择、前导 `+`
  均不属于 Value。
- **键段修剪前后 ASCII 空白**(§ 4)。修剪后为空的段是
  `EmptyKey`(§ 6.5)。段内空白 verbatim 保留。
- **行终止符是 `LF`、`CR` 或 `CR LF`**(§ 3.2)。三者等价。`CR`
  字节在解析时绝不作为内容出现;要在 String 中插入 `CR`,需在
  inline 复合值内使用 `\r` 转义。此类 Value 在规范形式中不可表示
  (§ 5.9.0)。

### 新增

- **Inline 复合值** —— `{key: value, key2: value}` 与
  `[v1, v2, v3]`,可选尾部逗号(§ 5.8)。
- **八个 Escape 序列** —— `\\`、`\,`、`\}`、`\]`、`\{`、`\[`、
  `\n`、`\r` 在 inline 标量值内(§ 3.7)。
- **数字字面量语法**(§ 3.6)。Integer 携带整数值;Float 携带
  数值。大整数溢出回退为 String。
- **规范形式(§ 5.9)** —— 每个 Value 的规范 writer 输出,由
  writer-conforming 实现使用,由 `*.canonical.ktav` fixture
  验证。规范形式字节确定。
- **三元测试套件** —— 每个 valid fixture 含三个文件:
  `name.ktav`(输入)、`name.json`(Value oracle)、
  `name.canonical.ktav`(writer oracle)。
- **顶层 inline 复合值** —— 文档首条内容行为闭合 inline 时,
  即为根级 inline Object / Array(§ 5.0.1 规则 2–3)。
- **键段中允许空格与制表符**(§ 4 `<key-char>`)。
- **值中间的 `{` / `[` 字面化**(§ 5.8.5)。
- **错误类别** —— `UnterminatedInlineCompound`(§ 6.11)、
  `MalformedInlineCompound`(§ 6.12)、`BadEscapeSequence`
  (§ 6.13)。
- **§ 6.14 `OrphanLineAfterTopLevelInline`** —— 独立错误类别。
- **附录 B:迁移指南** 从 0.1.x 到 0.5.0。
- **合规性拆分** —— § 8 现在定义 parser-conforming(§ 8.1)、
  writer-conforming(§ 8.2)与 round-trip 性质(§ 8.3)。

### 移除

- 错误类别 `InlineNonEmptyCompound`(原 § 6.7)与
  `InvalidTypedScalar`(原 § 6.9)。其编号保留。实现 MUST NOT
  对 0.5.0 文档输出标签为此名称的错误。

### 版本控制

`versions/0.5/` 为新的顶层格式目录。`versions/0.1/` 处的 0.1.x
规范保留在仓库中,以便希望并行支持旧语法的旧解析器。


## [0.1.1] —— 2026-05-10

向后兼容的扩展:裸顶层 Array。

### 新增

- **顶层 Array** —— 当文档的首条内容行为 array-item 形式(裸标量、
  `:: text`、`:i 42`、`:f 3.14`、单独的 `{` / `[`,或多行开启符
  `(` / `((`)时,该文档现被解析为根级 **Array**。此前根 Value
  始终为 **Object**,故首行为裸标量会产生 `MissingSeparator`
  错误。新的 § 5.0.1 规定了判定规则。
- 新增一致性 fixture:
  `versions/0.1/tests/valid/top_level_array/` 与
  `versions/0.1/tests/invalid/top_level/`。

### 兼容性

此改动对解析器与文档**严格累加**:任何在 0.1.0 中有效的文档在
0.1.1 中仍然有效并产生相同的 Value(仍为 Object)。只有此前
被 0.1.0 以 `MissingSeparator` 拒绝的输入,现在才被作为 Array
接受。针对 0.1.1 编写的文档在严格的 0.1.0 解析器下可能失败
—— 这是新功能预期的正向不兼容性。

支持 0.1.1 的实现 MUST 处理 § 5.0.1 的判定;仅声称 0.1.0
合规的实现继续保持合规(它们对 0.1.0 输入仍然正确,只是缺少
新功能)。


## [0.1.0] —— 2026-04-22

规范初始版本。定义了 Ktav 0.1.0 的词法结构、语法、语义、错误类别、
符合性要求与安全考量。

### 格式概览

- 隐式的顶层 Object。
- `key: value` 键值对;点分键(`a.b.c: 1`)展开为嵌套的 Object。
- `key:: value` 强制将值解释为字面量 String。
- 类型标量标记 `:i`(Integer)与 `:f`(Float) —— 既可用于 pair
  位置,也可作为 array-item 前缀。
- Integer 与 Float 的 Value 类型 —— 保留文本形式的数值字符串,
  以支持往返与任意精度。
- 关键字 `null`、`true`、`false`(严格小写)。
- 多行复合值 `{ ... }` 和 `[ ... ]`,闭合括号独占一行;空值 `{}` /
  `[]` 写作行内形式。
- 多行字符串 `( ... )`(剥除公共缩进)与 `(( ... ))`(原样保留)。
- 在数组中,`:: value` 作为元素前缀,表示字面量 String;
  `:i value` / `:f value` 作为 Integer / Float 元素。
- **分隔符后的强制空白**(§ 5.3 / § 5.4):每个键值对分隔符
  (`:`、`::`、`:i`、`:f`)与每个数组元素标记
  (`::`、`:i`、`:f`)**MUST** 后接至少一个 ASCII 空白字节,
  **或**该行结束。分隔符与 body 之间无空白的「粘连形式」属于
  `MissingSeparatorSpace` 错误(§ 6.10);错误示例文档:
  `key:value`、`port:i42`、`ratio:f0.5`。空值写法 `key:` / `key::`
  (分隔符后紧随 EOL)是合法的。
- 行首 `#` 为注释;不支持行内注释。

### 错误类别(§ 6)

`UnbalancedBracket`、`MismatchedBracket`、`DuplicateName`、
`PathConflict`、`InvalidKey`、`EmptyKey`、`OrphanLine`、
`InlineNonEmptyCompound`、`InvalidTypedScalar`、
`MissingSeparatorSpace`。

目录: [`versions/0.1/`](https://github.com/ktav-lang/spec/tree/1d5dc09/versions/0.1/) — 已从当前树中移除（`c9593e8`）；此链接指向该目录仍存在的最后一次提交。
