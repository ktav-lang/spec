
- **Breaking:** § 3.3 whitespace changes from
  ASCII-mandatory-plus-Unicode-`MAY` to a fixed, exhaustively
  enumerated 25-code-point `MUST` (the Unicode `White_Space`
  property as of Unicode 6.3, frozen by explicit list rather than by
  reference). Implementations MUST NOT delegate to a host language's
  built-in Unicode-whitespace primitive — verified to disagree with
  this list in both directions across at least two mainstream
  language runtimes. Non-breaking against every shipped 0.6.x Rust
  core, which already recognised the full set via `char::is_whitespace()`
  (§ 3.3) — as with § 4's entry below, this is breaking only for an
  implementation that took the old `MAY` at face value and stuck to
  ASCII space/tab, rather than matching the Rust core's actual
  behaviour; only the normative text catches up to the code.
- **Breaking:** § 4's key-segment trimming widens from ASCII-only to
  the same fixed 25-code-point set (§ 3.3), resolving a standing
  contradiction between § 3.3 (which already permitted Unicode
  whitespace) and § 4 (which mandated ASCII-only for keys
  specifically) — the same category as the 0.5.0 entry's "Key
  segments are trimmed of leading and trailing ASCII whitespace",
  widened one step further. Two keys differing only by a non-ASCII
  whitespace code point at a trimmed edge, previously distinct under
  a literal reading of § 4, now collide as the same key (§ 5.5). The
  Rust reference implementation's actual trimming behaviour does not
  change — it already trimmed the full set since 0.6.0, so this is
  breaking only for an implementation that followed the old § 4 text
  literally rather than matching the Rust core's actual behaviour;
  only the normative text catches up to the code.
- **Breaking:** The `(…)` multi-line string form now strips trailing
  whitespace (§ 3.3) from each content line, matching what it already
  did to each line's leading whitespace. Previously `(…)` preserved
  trailing whitespace byte-for-byte, identically to `((…))` — an
  editor's "trim trailing whitespace on save" could silently mutate
  string content with no visible signal. `((…))` is unaffected and
  remains fully verbatim on both edges.
- **Added:** `\uXXXX` escape (§ 3.7.1) — exactly four hex digits,
  surrogate pairs for code points above the Basic Multilingual Plane,
  lone surrogates rejected as `BadEscapeSequence`. Recognised
  wherever the existing ten escapes are recognised (inline scalars
  and keys); not processed in multi-line scalars, multi-line string
  content, or comments. Purely additive to the escape table — no
  existing escape sequence's meaning changes.
- **Added:** § 3.1 — leading byte-order mark handling is
  deterministic: a parser-conforming implementation MUST skip exactly
  one leading U+FEFF if it is the very first code point of the
  document, before any other byte; the canonical writer (§ 5.9)
  MUST NOT emit a leading byte-order mark. A U+FEFF anywhere else in
  the document is ordinary content (§ 3.3 does not classify it as
  whitespace). Unspecified in 0.6.4.
- **Added:** § 6.15 `InvalidUtf8` — a new error category for
  documents whose raw bytes are not valid UTF-8 (§ 3.1 already
  required rejecting them; § 6 previously had no matching category
  name for that rejection). The check happens before any
  line-oriented or grammar-level processing; the error span SHOULD
  point at the byte offset of the first invalid sequence.
- **Changed:** § 6.13 `BadEscapeSequence` — extended to cover
  malformed `\uXXXX` forms (fewer than four hex digits) and lone
  surrogates, alongside the existing unrecognised-`\X` case.
- **Changed:** § 5.9.10's key re-escape rule now enumerates every
  code point `<key-char>` excludes (not just `\`/`.`/`:`) and
  requires `\uXXXX` for edge whitespace and for structural bytes
  with no named form (`(`, `)`, DEL, control bytes). Keys containing
  `(`, `)`, DEL, or a control code point — previously representable
  in the Value model but not emittable in canonical form at all —
  are emittable for the first time as of 0.7.0, via `\uXXXX`. Also
  newly documented (a pre-existing hazard, not new behaviour): a
  key beginning with `##` is always emitted in quoted form (never
  bare-with-escape), since no bare-form escape changes the raw
  first two bytes a comment-dispatch check on re-read inspects.
- **Changed:** `<key-char>` (§ 4) now admits raw VT (`0x0B`) and FF
  (`0x0C`) as literal key content, matching the § 3.3 widening —
  previously only tab was exempted from the control-byte exclusion.
  Non-breaking: this only accepts documents previously rejected as
  `InvalidKey`, no previously-valid document's meaning changes.
- **Breaking:** § 5.9.0 (new) defines **representable Values** —
  the domain over which the canonical writer's guarantees operate.
  A bare scalar document root, an Object pair with an empty name, a
  non-finite Float (NaN / ±Infinity), and any compound containing a
  non-representable Value at any depth are not representable, and a
  writer-conforming implementation MUST reject them with an error,
  emitting no partial output. Previously § 5.9 left these
  programmatic-only cases undefined. The Rust reference core
  already rejects scalar roots and `CR`-bearing Strings; closing
  the remaining gaps there is tracked separately.
- **Changed:** § 5.9.8 — the Float notation threshold now reads
  `0 < abs < 1e-2` (was `abs < 1e-2`), which taken literally would
  have demanded scientific notation for zero. The canonical form of
  zero is `0.0` / `-0.0` — decimal, never scientific, sign
  preserved (unlike an Integer's `-0` → `0`). This matches the Rust
  reference core's existing behaviour; only the normative text
  changes. New fixtures `float/positive_zero` and
  `float/negative_zero` lock it in.
- **Changed:** § 8.1 (with § 5's Integer definition) — fixture
  equivalence is defined at the minimum-required numeric domain
  (i64 Integer, binary64 Float). An implementation supporting a
  wider domain MAY diverge from a fixture oracle exactly where that
  fixture probes the minimum-domain boundary (e.g.
  `i64_overflow_to_string.json`), without forfeiting
  parser-conformance. Previously an arbitrary-precision
  implementation — explicitly permitted by § 5 — failed § 8.1 on
  that fixture as written.
- **Changed:** § 8.2 (with § 5.9.5) — the writer-conforming
  byte-exact requirement gets the mirror-image numeric-domain
  caveat to § 8.1's: exactly on the leaves `boundary-fixtures.json`
  names, a wider-domain implementation's parsed Value may
  legitimately differ, and its output MAY differ from the fixture's
  fixed `canonical.ktav`, provided that output is the correct
  canonical form (§ 5.9) for the Value it actually holds. Previously
  an arbitrary-precision implementation — explicitly permitted by
  § 5 — failed § 8.2 on `i64_overflow_to_string` as written: it
  parses the body as an Integer and would canonically write it
  bare (no raw marker), which the fixture's fixed `canonical.ktav`
  forbids.
- **Changed:** the Float bullet of § 5 and rule 14 of § 5.2 — the
  Float domain now has a normative floor (MUST support at least the
  range and precision of IEEE 754 binary64; MAY support a wider
  representation) and an overflow fallback mirroring Integer's rule
  13: a float literal that is not finite in the implementation's
  Float domain (e.g. `1e9999` on binary64) falls through to String,
  so a 0.7.0-conformant parser MUST NOT ever produce a non-finite
  Float — which is what makes § 5.9.0's claim that "no literal
  grammar of § 3.6 produces a non-finite Float" true. New fixtures
  `float/positive_overflow_to_string`,
  `float/negative_overflow_to_string`, and `float/underflow_to_zero`
  pin the boundary; the last documents that underflowing to `0.0`
  (finite) is an ordinary Float, not a String-fallback case.
- **Added:** Quoted keys (§ 5.3.3) — a key segment MAY be written
  `"…"`, `'…'`, or `` `…` `` instead of bare; inside the delimiters,
  `.`, `:`, `,`, `{`, `}`, `[`, `]`, and the two OTHER quote
  characters are ordinary content needing no escape, and content is
  never trimmed. Three new named escapes, `\"` / `\'` / `` \` ``
  (§ 3.7), let a segment's own delimiter appear literally inside it —
  the escape table grows from eleven entries to fourteen. These same
  three escapes are also recognised inside inline scalar **values**,
  not only keys: `\"` / `\'` / `` \` `` now decode to a literal quote
  byte there too, in every context the ten pre-0.7.0 escapes already
  applied to (previously each was a `BadEscapeSequence`, § 6.13, in
  every context, values included). A quote character has no
  structural role in an inline value — it is never a delimiter and is
  never stripped, escaped or not — so the escape is valid but
  redundant there, exactly as `\.` / `\:` already are in values. A new
  `<escapable-byte>` alternative and `<quoted-segment>` production
  (§ 4) are added to the grammar; `<bare-segment>` is also narrowed,
  not left untouched — its first token now comes from the new
  `<bare-first-token>`, which excludes an unescaped leading `"` / `'`
  / `` ` `` (§ 4), so this IS a change to an existing production, not
  purely additive. The one behavior change this narrowing introduces —
  a key or segment beginning with a quote character — is captured
  separately in the Breaking entry below, not claimed here. A related
  side effect outside key
  canonicalization: § 5.9.6's Array-root first-item bare-form test
  shares this same quote-aware separator scan, so a first item such as
  `'tis the season: fa` — whose only `:` now scans as inside an
  unterminated quoted segment rather than as an unescaped separator —
  no longer needs the `::` raw marker forced in canonical form, unlike
  before quoted keys existed (see
  `valid/quoted_keys/unterminated_leading_quote_falls_back_to_array_item.canonical.ktav`).
  The canonical writer (§ 5.9.10) now
  prefers quoted form (delimiter `"`) over bare-with-escape whenever
  escaping a structural byte (`.` `:` `,` `{` `}` `[` `]`), `(` / `)`,
  or edge whitespace would otherwise be needed, or the key's first
  segment begins with `##` (routed to quoted form unconditionally —
  not an escape trade-off, since no bare-form escape changes the
  raw first two bytes a comment-dispatch check on re-read inspects)
  (escaping only a backslash, LF, CR, a control byte, or DEL does NOT
  switch the form, since quoting does not remove that escape) — this
  changes the canonical bytes of every key previously requiring
  `\.` / `\:` / a bracket / comma / paren escape, or beginning with
  `##` (e.g. `a\.b: 1` now canonicalises to `"a.b": 1`, not
  `a\.b: 1`); existing `valid/key_escaping/*.canonical.ktav`
  fixtures update accordingly (tracked separately from this text
  change). New error category
  `UnterminatedQuotedKey` (§ 6.16), reported when a quote opens a key
  segment with no matching closer before end-of-line on any line
  already known to be a pair line; `InvalidKey` (§ 6.4) and
  `EmptyKey` (§ 6.5) each gain one new triggering case (§ 6.4, § 6.5).
- **Breaking:** A line whose first content — after § 4's key-segment
  trimming — begins with `"`, `'`, or `` ` `` no longer necessarily
  parses the way it did before quoted keys (§ 5.3.3, § 10.7): the
  quote character now opens a `<quoted-segment>` there instead of
  being ordinary literal content. A key that already began AND ended
  with the same quote character silently reads as a shorter key with
  the delimiters stripped (`"port": 1` now names `port`, not
  `"port"`); a leading quote character with no matching closer before
  end-of-line either falls through to an unaffected Array-root String
  item (root kind not yet decided) or raises the new
  `UnterminatedQuotedKey` (root kind already Object) — see § 5.3.3 for
  the exact, context-dependent rule and the `::` raw-marker escape
  hatch (§ 5.4 rule 1) already available for an Array item that needs
  an unambiguous leading quote character. No document whose keys
  avoid a leading `"` / `'` / `` ` `` is affected in any way.
- **Added:** § 5.9.12 (new) — a first-output-byte guard preventing
  the canonical writer from ever placing the raw 3-byte UTF-8
  encoding of U+FEFF at byte offset 0 of the document, which § 3.1's
  leading-BOM-strip rule would otherwise silently consume on
  re-parse. This closes a gap between § 3.1 (added earlier in this
  same release) and §§ 5.9.0 / 5.9.10's key-representability rules,
  which did not previously account for the interaction: a key or
  Array-root first item beginning with U+FEFF was representable but
  not round-trip-safe in canonical form. Affects exactly two
  positions: a root Object's first-serialized key beginning with
  U+FEFF is now forced into quoted form (§ 5.9.10 rule (c)); a root
  Array's first item being a bare-form String beginning with U+FEFF
  is now forced into raw-marker (`::`) form (§ 5.9.6). New fixtures
  `valid/bom_boundary/*`.

