
A key segment MAY be written as a `<quoted-segment>` (§ 4) instead of
a `<bare-segment>`: opened by `"`, `'`, or `` ` ``, running to the
first unescaped occurrence of that SAME character, which closes it.
Quoting is optional and purely a writer's convenience — it changes no
Value that a bare, escaped spelling could not already produce (§ 5.5
below) — offered because a segment needing several of `.` / `:` / `,`
/ `{` / `}` / `[` / `]` escaped is harder to read than the same
content quoted once.

- **Keys only.** Quoting (this whole § 5.3.3) applies only to key
  segments — § 4's `<key>` production. A quote character in any VALUE
  position — an inline scalar, a multi-line string, an array item —
  is ordinary content with no special meaning: it never opens a
  `<quoted-segment>`, is never a delimiter, and is never stripped or
  unwrapped there. `{a: "b"}` is the pair `a` mapped to the
  three-character String `"b"` (quote, `b`, quote — an ordinary bare
  inline scalar, per § 5.2's existing scalar-typing rules), not an
  unwrapped String `b`: 0.7.0 does not add JSON-style value quoting.
  This is NOT the same as saying the value-escaping rules are
  unchanged, though: § 3.7's three quote escapes (`\"`, `\'`,
  `` \` ``) are recognised in every escape-aware context alike,
  inline scalar values included, exactly as `\.` / `\:` already were
  — so an inline value's escape processing must now also accept all
  three quote-escape spellings, each decoding to its literal quote
  character. What is unchanged is only that raw, unescaped quote
  characters in a value still carry no structural meaning and are
  never delimiters.
- **Positional rule.** A quote character opens a `<quoted-segment>`
  if and only if it is the first code point of a segment's raw text
  *after* the same edge-whitespace trimming § 4 already applies to
  every segment. This positional test is re-applied fresh at the
  start of EVERY segment, with no exception — including a segment
  that immediately follows an unescaped dot: the dot still starts a
  new segment (§ 5.3.2), and a quote character sitting right after it
  is that new segment's own first code point, so it opens a
  `<quoted-segment>` there exactly as it would at the very start of
  the whole key. This is why `a."b.c".d: 1` is the three-segment path
  `["a", "b.c", "d"]` (§ 4's dotted-path example; the "Per-segment
  participation in dotted paths" bullet below) rather than stopping
  at two segments. Anywhere a quote character is NOT the first code
  point of a segment — mid-segment, or after other non-whitespace
  content within the same segment — it is an ordinary `<key-char>`,
  exactly as in every version before 0.7.0's quoted-key addition:
  `don't: 1` and `a"b: 1` are unaffected, and `port": 1` is still the
  five-character bare key `port"`.
- **Content is not trimmed.** Unlike a `<bare-segment>`, whitespace
  immediately inside a `<quoted-segment>`'s delimiters is ordinary
  content, preserved verbatim at both edges: `" a "` decodes to the
  three-code-point key space-`a`-space (not the one-character key
  `a`). This is why an all-whitespace quoted segment (`" "`) is a
  valid one-space key, not an `EmptyKey` (§ 6.5) — contrast a
  `<bare-segment>` of only whitespace, which trims to nothing and IS
  `EmptyKey`.
- **Escaping inside the delimiters.** The full fourteen-entry escape
  table (§ 3.7) applies identically to `<dq-token>` / `<sq-token>` /
  `<bt-token>` and to `<bare-segment>`'s `<key-token>` — there is no
  separate, smaller table for quoted content. The practical
  difference is which raw bytes are structural: inside a
  `<quoted-segment>`, `.` / `:` / `,` / `{` / `}` / `[` / `]` and the
  two quote characters OTHER than the segment's own delimiter are all
  ordinary content and need no escape at all (though their named
  escapes — `\.`, `\:`, etc. — still work if used, decoding to the
  same literal byte, exactly as `\.`/`\:` are already harmlessly valid
  inside an inline scalar value where dot and colon are not
  structural either); only the delimiter itself is structural, and
  only within its own segment — `` `it's "quoted"` `` is the
  unambiguous thirteen-code-point content `it's "quoted"`, because
  the terminator is fixed by the *opening* backtick: neither `'` nor
  `"` closes it. A raw control byte or DEL is forbidden inside
  a `<quoted-segment>` exactly as inside a `<bare-segment>` (§ 4's
  `<dq-char>` / `<sq-char>` / `<bt-char>` exclusions) — quoting
  relaxes which STRUCTURAL bytes need escaping, not the format's
  separate "no invisible bytes in keys" rule; a control byte or DEL is
  still only representable via `\uXXXX`.
- **Nothing may follow the closer within the same segment.** After a
  `<quoted-segment>`'s closing delimiter, only whitespace (already
  consumed by trimming — see § 4) may appear before the next
  `<unescaped-dot>` or the pair separator. Any other content there —
  `"a"b: 1`, `"a" "b": 1` — is an `InvalidKey` error (§ 6.4): there is
  no form combining quoted content with further bare or quoted
  content inside one segment; write two dotted segments instead
  (`"a"."b": 1`) if two distinct pieces are intended.
- **Unterminated quoted segments.** If a quote character opens a
  segment and no matching unescaped closing delimiter is found before
  end-of-line, § 4's separator-scanning rule simply finds no
  separator on that line at all — indistinguishable, at the scanning
  level, from a line containing no `:` anywhere. Bracket-balance
  scanning is likewise quote-opaque (the "Inline pairs" bullet
  below): an in-progress quoted segment swallows everything up to
  end-of-line, colons and brackets alike. Every line falls into
  exactly one of the following three contexts, and the outcome is
  determined entirely by which one:
  1. **Ordinary multi-line pair line, inside an already-established
     Object.** Every line dispatched as a pair line under § 5.1
     rule 8 — inside an already-established Object, including the
     top-level Object body once established — requires a separator;
     finding none is always an error. When the specific reason is an
     unterminated quoted segment, the diagnosis is the more specific
     `UnterminatedQuotedKey` (§ 6.16) rather than the generic
     `MissingSeparator` (§ 6.6) that a plain colon-free line would
     raise.
  2. **Inline key position, inside `{...}` (§ 5.8.2) — including a
     first content line that itself begins with `{` or `[`**, which
     § 5.0.1 rules 2–5 route by leading bracket/brace before rule 6's
     pair-candidate test is ever tried. Here the outcome turns on
     bracket-balance, not on separator-scanning: an unterminated
     quoted segment makes everything from the opening quote to
     end-of-line opaque to bracket-balance counting too, so a `}` /
     `]` that appears only *inside* the unterminated segment's reach
     does not count as a matching closer. `{"a: 1}` therefore does not
     close under rule 2 (the unterminated `"` swallows the rest of the
     line, closing brace included) and is not a lone `{` under rule 4
     either; it falls to § 5.0.1's note after rules 2–5, diagnosed as
     `UnterminatedInlineCompound` (§ 6.11) — never
     `MalformedInlineCompound` (§ 6.12 applies only to a structural
     defect INSIDE an already-closed compound, and this compound
     never closes: the swallowed closer means no matching `}` / `]`
     was found on the line at all) and never `UnterminatedQuotedKey`
     (§ 6.16 excludes this context explicitly): the compound-level
     defect is what a reader can actually see and fix, and there is
     no separate "the key inside was also unterminated" defect to
     name on top of it. This is an existing diagnostic path,
     unmodified by quoted keys; quoting only adds one more way a
     line can fail to bracket-balance, alongside an
     already-unterminated `{` / `[` with no quoting involved at all.
  3. **The document's still-undecided first content line, when that
     line does NOT begin with `{` or `[`** (§ 5.0.1) — a first line
     that DOES begin with `{` or `[` is context 2 above, never this
     one. Rule 6's phase-1 test is purely about whether a separator
     exists; finding none for any reason — no colon at all, or an
     unterminated quoted segment swallowing the rest of the line — is
     simply not a pair candidate, exactly as today. Root-kind
     detection falls through to rule 7: the line is an ordinary
     Array-root String item, quote character and all, with no error.
     `'tis the season` (no colon anywhere) is unaffected by quoting at
     all; `'tis the season: fa` — which before 0.7.0's quoted-key
     addition parses as an Object with the bare key `'tis the season`
     (an unescaped `'` was always an ordinary `<key-char>`) — is a
     root-Array String item under the new grammar instead (a breaking
     change; see Appendix A). A String array item that happens to need
     a leading quote character AND an unescaped colon to remain
     unambiguous on re-read can always use the raw-marker form
     (`:: 'tis the season: fa`, § 5.4 rule 1) — the existing escape
     hatch for exactly this class of ambiguity, unchanged by this
     addition.
- **Per-segment participation in dotted paths.** Quoting applies per
  segment, not to the whole key: `a."b.c".d: 1` is the three-segment
  path `["a", "b.c", "d"]`, expanding (§ 5.3.2) to
  `{a: {"b.c": {d: 1}}}` — the dot inside the quoted middle segment is
  ordinary content and does not itself split further, exactly as
  `\.` already keeps a dot inside a bare segment from splitting.
- **Equality is on decoded content.** § 5.5's `DuplicateKey` check
  compares the fully decoded effective key, independent of which form
  produced it: a pair keyed `"a.b"` and a pair keyed `a\.b` in the
  same Object name the same single-segment key `a.b` and collide.
- **Inline pairs.** `<inline-pair>` (§ 5.8.2) uses the same `<key>`
  production, so quoted keys are recognised identically inside inline
  objects: `{"a}b": 1, c: 2}` is `{"a}b": 1, "c": 2}` — the `}` inside
  the quoted key is ordinary content, not the inline object's closing
  brace, because it is read while still inside the `<quoted-segment>`
  before the key-position scan ever reaches the position where an
  inline-object-closing `}` would be recognised. This is the same
  opacity the separator/dot scan already has (§ 4) applied to the
  bracket-balance test every "is this line a **closed** inline
  compound, or **unterminated**" determination already performs — the
  first-content-line shape test of § 5.0.1 rules 2–3, and the general
  balanced-content check behind `UnterminatedInlineCompound` /
  `MalformedInlineCompound` (§ 5.8.5, § 6.11, § 6.12) — all of which
  already treat an escaped bracket (`\{`, `\}`, `\[`, `\]`) as
  non-structural; a bracket inside a quoted key segment is opaque to
  bracket-balance counting for the identical reason an escaped one is:
  it is read as ordinary content, before the scan reaches a position
  where it could be recognised as a structural delimiter at all. A
  top-level `{"a}b": 1, c: 2}` is therefore still `§ 5.0.1` rule 2's
  closed inline object (the `}` inside the quoted key does not
  prematurely close it), and its canonical form is the fully expanded
  root-level pair list of § 5.9.3, exactly as any other top-level
  inline object's would be.

  The same opacity applies to the **comma** that splits an inline
  compound's body into elements/pairs (§ 5.8, § 5.8.3, § 6.12) — not
  only to bracket-balance detection above. A comma between a
  `<quoted-segment>`'s opening and closing delimiter is ordinary
  content, not an element/pair separator, for the identical reason a
  bracket inside one is not a structural delimiter: it is read as
  ordinary content before the comma-splitting scan ever reaches a
  position where a `,` could be recognised as structural. `{"a,b": 1,
  c: 2}` is therefore unambiguously exactly two pairs — key `a,b`
  mapped to `1`, and key `c` mapped to `2` — never three
  comma-delimited fields; the comma inside the quoted key does not
  count as a pair separator, and so cannot itself introduce a leading
  comma, an empty inline-array item, or a "two or more consecutive
  commas" defect (§ 6.12) — it was never a splitting position to
  begin with.

