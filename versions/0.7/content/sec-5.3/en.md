
A pair line takes the form:

```
key: value
key:: literal-string-value
```

where:

- `key` is one or more **segments** separated by unescaped dots
  (`<segment> ( <unescaped-dot> <segment> )*`, § 4). Each segment is
  either a `<bare-segment>` (`key-token+`) or, as of 0.7.0, a
  `<quoted-segment>` (§ 5.3.3) opened by `"`, `'`, or `` ` `` — the
  two forms may be mixed freely across the segments of one dotted
  key (`a."b.c".d: v`, § 5.3.3) and are validated per § 5.3.1. Each
  segment MUST be non-empty: after escape processing for a bare
  segment, or, for a quoted segment, as written between its
  delimiters (quoted content is never trimmed, § 5.3.3). A
  `<bare-segment>` is **escape-aware** (§ 3.7, § 4): `\` is
  the escape lead; `\.` produces a literal dot (not a path
  separator); `\:` produces a literal colon (not a pair separator);
  `\\` produces a literal backslash. Other `\X` forms are
  `BadEscapeSequence` errors. The `#` byte is allowed inside a
  segment. A line whose trimmed form *begins* with `##` is a
  different matter — and not a key-validation failure: § 5.1
  rule 2 consumes such a line as a comment (§ 3.4) unconditionally,
  before any pair-line processing begins, so it is never parsed as
  a pair line at all. Keeping `##`-prefixed keys parseable is a
  *writer* obligation (§ 5.9.10), not a parser-side error: a
  canonical writer avoids a raw `##` at the start of the emitted
  line by choosing quoted form for such a key's first segment —
  the line then starts with `"`, not `#`, so § 5.1 rule 2's
  comment dispatch never applies to it on re-read.
  The pair separator is the first **unescaped** `:` (or `::`)
  scanning left-to-right, treating the content of any quoted
  segment along the way as opaque — § 4 gives the exact quote-aware
  scanning rule (including how an unterminated quoted segment is
  handled); it is not restated here. This scanning rule — together
  with a non-empty prefix and `<sep-end>` for a plain `:` — is also
  the shape-only test § 5.0.1 rule 6 uses to detect a root Object;
  full key validation (§ 5.3.1) runs afterward, uniformly,
  regardless of which rule established the Object context.
- The plain `:` separator dispatches the value per § 5.2.
- The raw marker `::` interprets the body as a literal String —
  no type inference, no recursion into compounds. Escape sequences
  (§ 3.7) are NOT processed in a multi-line pair body (a body that
  is the whole rest of the line); they ARE processed in an inline
  pair body (§ 5.8).
- `<sep-end>` requires at least one whitespace code point or end-of-line
  after the separator. Writing `key:value` / `key::value` (no
  whitespace, body continues on the same line) is a
  `MissingSeparatorSpace` error (§ 6.10). The `<sep-end>` rule does
  NOT apply to inline pair separators (§ 5.8) where whitespace is
  optional everywhere. Separator checks precede key validation: for
  a dispatched pair line the order is `UnterminatedQuotedKey`
  (§ 6.16) when the reason no separator was found is an unterminated
  quoted key segment, else the generic `MissingSeparator` (§ 6.6) →
  `EmptyKey` for an empty prefix (§ 6.5) → `MissingSeparatorSpace`
  (§ 6.10) → key-segment validation (§ 5.3.1). A key defect does
  not preempt a separator defect: `b,c:1` inside an established
  Object reports `MissingSeparatorSpace`, not `InvalidKey`.

A pair whose value-part is the empty string (the line ends right
after the separator and its required whitespace, or right after
`<sep-end>` consumed the end-of-line) is a pair whose value is an
empty String. This is true for both plain `:` and raw `::`.

