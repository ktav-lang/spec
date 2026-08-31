# Ktav Specification Changelog

**Languages:** **English** · [Русский](CHANGELOG.ru.md) · [简体中文](CHANGELOG.zh.md)

History of the format specification across all versions. The format is
hosted in this repository under [`versions/`](versions/); each version
is a self-contained directory with its own `spec.md` and `tests/`.

Versions follow `MAJOR.MINOR.PATCH`:

- `PATCH` — editorial (typo fixes, clarifications).
- `MINOR` — backward-compatible extensions.
- `MAJOR` — breaking changes.

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
  an empty name, a non-finite Float (NaN / ±Infinity), and any compound
  containing a non-representable Value at any depth are not
  representable, and a writer-conforming implementation MUST reject
  them with an error, emitting no partial output. Previously § 5.9
  left these programmatic-only cases undefined. The Rust reference
  core already rejects scalar roots and `CR`-bearing Strings; closing
  the remaining gaps there is tracked separately.

### Changed

- **§ 6.13 `BadEscapeSequence`** — extended to cover malformed `\uXXXX`
  forms (fewer than four hex digits) and lone surrogates, alongside the
  existing unrecognised-`\X` case.
- **§ 5.9.10's key re-escape rule** now enumerates every code point
  `<key-char>` excludes (not just `\`/`.`/`:`) and requires `\uXXXX` for
  edge whitespace and for structural bytes with no named form (`(`, `)`,
  DEL, control bytes). Keys containing `(`, `)`, DEL, or a control code
  point are emittable in canonical form for the first time.
  Also newly documented (a pre-existing hazard, not new
  behaviour): a key beginning with `##` MUST have the first `#`
  escaped as `\u0023`, or the canonical line is silently read as
  a comment.
- **`<key-char>` (§ 4)** now admits raw VT (`0x0B`) and FF (`0x0C`) as
  literal key content, matching the § 3.3 widening. Non-breaking — only
  accepts documents previously rejected as `InvalidKey`.
- **§ 5.9 / § 8.3** now define the round-trip guarantee over
  *representable* Values only (§ 5.9.7's narrow set of String values —
  a `CR` byte, or one of a few pathological multi-line stripped-form
  collisions). A writer-conforming implementation MUST reject a
  non-representable Value with an error rather than serialise it;
  previously § 5.9.7 separately allowed any implementation-chosen or
  lossy encoding for the same Values, which was incompatible with
  § 5.9's byte-determinism requirement.
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
- **§ 8.1 (with § 5's Integer definition) — fixture equivalence is
  defined at the minimum-required numeric domain** (i64 Integer,
  binary64 Float). An implementation supporting a wider domain MAY
  diverge from a fixture oracle exactly where that fixture probes the
  minimum-domain boundary (e.g. `i64_overflow_to_string.json`), without
  forfeiting parser-conformance. Previously an arbitrary-precision
  implementation — explicitly permitted by § 5 — failed § 8.1 on that
  fixture as written.
- **§ 8.2 (with § 5.9.5) — the writer-conforming byte-exact fixture
  requirement now carries the numeric-domain caveat mirroring
  § 8.1.** On exactly the boundary-probing fixtures § 8.1 names, the
  Value a wider-domain implementation parses from `name.ktav` may
  legitimately differ from the minimum-domain Value the fixture's
  `.json` oracle describes, so its output MAY differ from the
  fixture's fixed `canonical.ktav` — provided that output is the
  correct canonical form (§ 5.9) for the Value it actually holds.
  Previously an arbitrary-precision implementation — explicitly
  permitted by § 5 — failed § 8.2 on `i64_overflow_to_string` as
  written: it parses the body as an Integer and would canonically
  write it bare (no raw marker), which the fixture's fixed
  `canonical.ktav` forbids.
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
  named reason code.** Seven reason codes: `ScalarRoot`,
  `EmptyKeyName`, `NonFiniteFloat`, `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision`, `LeadingWhitespaceCollision` — six
  have a fixture; `NonFiniteFloat` is documented in prose only
  (JSON, the fixture oracle format, has no portable NaN/Infinity
  literal). The API shape a writer uses to report the rejection is
  implementation-defined; only the code names are normative. README
  (en/ru/zh) documents the new category and the existing `valid/` /
  `invalid/` ones in the same place, and states runners MUST walk
  every category present rather than silently skip an unrecognised
  one. Does not close rust#5 or rust#12 — those need corresponding
  work in the `rust` core and the six language bindings, tracked
  separately.

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
  **representable** Value (§ 5.9.7), not every Value outright.
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
  writer-side escape (escape the leading `#`) as the actual mechanism
  preventing the collision.
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
  the old blanket `MUST`. The guarantee now holds unconditionally only
  outside the closed set of fixtures named in the new
  `versions/0.7/tests/valid/boundary-fixtures.json` manifest.
- **New `versions/0.7/tests/valid/boundary-fixtures.json` manifest**
  gives the numeric-domain divergence § 8.1 / § 8.2 permit a
  machine-readable contract: exactly the fixture paths listed as its
  keys may diverge from their `.json` / `.canonical.ktav` oracle, and
  only to the `wider_domain_kind` / `wider_domain_value` /
  `wider_domain_canonical` the entry names — not to an arbitrary
  "wider-domain-correct" value a runner would have to re-derive
  itself. § 8.1 and § 8.2 now reference this manifest instead of
  describing the exception in prose.
- **§ 5 — the binary64 floor now specifies conversion semantics, not
  just range and precision.** Converting a decimal float literal to
  the minimum binary64 representation MUST use IEEE 754
  `roundTiesToEven`, and the minimum representation MUST support
  subnormal (gradual-underflow) values. Seven new fixtures cover the
  floor: `max_finite`, `min_positive_normal`, `min_positive_subnormal`
  (unambiguous at any supported domain), plus four boundary-dependent
  fixtures added to the new manifest —
  `just_above_max_finite_to_string` (finite in a wider decimal domain,
  overflows to String at binary64), `negative_underflow_to_negative_zero`
  and `half_min_subnormal_underflow_to_zero` (both finite in a wider
  domain, underflow to `±0.0` at binary64), and `decimal_rounding_tie`
  (`9007199254740993.0`, exactly halfway between two binary64 values;
  binary64 rounds to the even neighbour `9007199254740992.0`, a wider
  decimal domain keeps the literal exactly). All seven independently
  verified against the Rust reference parser/writer.
- **§ 5.9.0 — the "more than one violation" allowance now covers the
  current node and an Object's key, not only descendants.** The old
  wording ("among a Value's descendants") left a String satisfying two
  collision rules at once, or an Object with both an empty key and a
  separately non-representable child, technically uncovered, since a
  key is not itself a Value descendant.
- **`versions/0.7/tests/unrepresentable/non_finite_float.json`** — the
  one reason code (`NonFiniteFloat`) that plain JSON cannot encode a
  fixture for now has one, via a normative `{"$float": "NaN"|
  "Infinity"|"-Infinity"}` sentinel reserved for exactly this case.
  README documents the sentinel alongside the rest of the
  `unrepresentable/` schema.

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
  canonical form (§ 5.9.7).

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
