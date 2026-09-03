
- **Bare scalar item:** `<bytes>` on its own line at the current
  indent — when the body satisfies the same conditions as the
  `key: <bytes>` form of § 5.9.5 (including: does not start with
  `{` or `[`; is not exactly `(` or `((`), and — because an item
  line has no `key: ` prefix, making the entire line the body — is
  additionally not exactly `}` or `]`, does not start with the
  two-byte sequence `::`, and does not start
  with the two-byte sequence `##`. A bare `}` or `]` line is
  unconditionally read by § 5.1's line-dispatch rules as closing
  the innermost open Object/Array (raising `UnbalancedBracket`,
  § 6.1, when the innermost open compound is actually an Array/Object);
  a body starting with the two-byte sequence `::` matches
  `<item-literal>`'s raw-marker form (§ 4) — consuming everything
  from that point on as the raw-marker's own body, per `<sep-end>` —
  rather than being read as literal content that happens to begin
  with those two bytes (this excludes not just a body of exactly
  `::`, but any body starting with it, e.g. `:: x` or `::x`: both
  are captured by the raw-marker grammar — the former as a
  raw-marker item with body `x`, the latter as `MissingSeparatorSpace`
  — so neither can ever survive as bare content); a body
  starting with `##` is unconditionally read by § 5.1 rule 2 as a
  comment (§ 3.4), dropping the entire line silently rather than
  raising an error. When the item is the **first item of an Array
  root** (§ 5.9.3), the bare form is additionally not used if the
  body would itself satisfy § 5.0.1 rule 6's phase-1 pair-candidate
  test — a first unescaped `:` or `::` separator (§ 4's
  separator-scanning rule) with a non-empty raw prefix before it,
  where a plain `:` separator is satisfied by `<sep-end>`; the
  prefix is not required to be a grammatically valid key at this
  stage, exactly as rule 6 itself does not require one (a first
  item like `a,b: 1` is a pair candidate here for the same reason
  it is one for root detection). Independently of the pair-candidate
  test, the bare form is also not used — regardless of whether that
  test applies — when the item is the first item of an Array root and
  the body begins with U+FEFF (§ 5.9.12): bare form would place the
  raw 3-byte UTF-8 encoding of U+FEFF at byte offset 0 of the
  document, which § 3.1 requires a conformant reader to strip as a
  metadata byte-order mark, silently losing the code point on
  re-parse. Only the Array root's
  first item is exposed to § 5.0.1's root-kind detection; every
  other item position is dispatched directly as an array-item line
  regardless of its shape (§ 5.1 rules 7–8), so neither exclusion
  applies there.
- **Raw-marker item:** `:: <bytes>` — when the body would otherwise
  be reinterpreted by § 5.2 as a number, keyword, an inline
  compound, a multi-line-string opener (a body of exactly `(` or
  `((`), or (via § 5.7's shortcuts) the empty String, or would
  otherwise collide with a line-level structural token (a body of
  exactly `}` or `]`, or starting with `##` or with the two-byte
  sequence `::`), or (when the
  item is the first item of an Array root) would otherwise satisfy
  § 5.0.1 rule 6's phase-1 pair-candidate test as described above, or
  (likewise only for the first item of an Array root) begins with
  U+FEFF (§ 5.9.12).
  The raw-marker form
  itself is immune to both of these first-item hazards: a line
  beginning `::` has
  no key segment before the separator, so it never matches
  `<pair-line>`'s grammar and is read as this Array's first item
  (§ 5.0.1 rule 7) without needing the root-wrap of § 5.9.3, and its
  content begins only after the literal `:: ` prefix, never at byte
  offset 0.
- **Empty Object item:** `{}` on its own line.
- **Empty Array item:** `[]` on its own line.
- **Non-empty Object item:** `{` opening line, body lines at
  indent + 1, `}` closing line.
- **Non-empty Array item:** `[` opening line, body lines at
  indent + 1, `]` closing line.
- **Multi-line string item:** verbatim opener line `((` at the
  current indent, body lines emitted at indent 0 (because verbatim
  form preserves bytes exactly — any leading whitespace would be
  part of the String value), `))` closing line at the current
  indent. (Rationale: § 5.6 specifies verbatim joins content
  lines byte-for-byte. Adding indentation to body lines would
  inject whitespace code points into the parsed value.) Subject
  to § 5.9.7's stripped-form fallback when a body segment trims
  to exactly `))`.

