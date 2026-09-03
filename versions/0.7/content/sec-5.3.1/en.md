
Validation operates on the raw prefix up to the first unescaped
separator, however malformed the separator's surrounding whitespace
is (check ordering: § 5.3). Each segment of that prefix is either a
`<bare-segment>` or a `<quoted-segment>` (§ 4), identified
positionally (§ 5.3.3), and the two forms are validated differently:

- **Bare segment.** A segment that is empty after trimming yields
  an `EmptyKey` (§ 6.5) error; a segment containing a raw
  (unescaped) code point that `<key-char>` (§ 4) forbids yields an
  `InvalidKey` (§ 6.4) error; a malformed `\X` escape yields a
  `BadEscapeSequence` (§ 6.13) error.
- **Quoted segment (§ 5.3.3).** Its content is validated, unmodified
  by trimming — only the whitespace *outside* the delimiters is
  trimmed (§ 4); the content itself is checked as-is, so an
  all-whitespace segment (`" "`) is valid, not `EmptyKey`. The
  applicable character class is `<dq-char>` / `<sq-char>` /
  `<bt-char>` (§ 4) for the segment's own delimiter, not
  `<key-char>`: a raw control byte or DEL is still `InvalidKey`
  (§ 6.4), and a malformed `\X` escape is still `BadEscapeSequence`
  (§ 6.13), but which raw bytes are structural differs from a bare
  segment (§ 5.3.3). An empty quoted segment (`""`, `''`, ` `` `) is
  still `EmptyKey` (§ 6.5). Content other than whitespace following
  the closing delimiter, before the next `<unescaped-dot>` or the
  pair separator, is `InvalidKey` (§ 6.4) per § 5.3.3's "nothing may
  follow the closer" rule. An unterminated quoted segment (no
  matching unescaped closer before end-of-line) never reaches this
  section as a key-validation defect at all: § 4's separator scan
  finds no separator, and the line is diagnosed as
  `UnterminatedQuotedKey` (§ 6.16) or, on the document's undecided
  first content line, treated as no error at all — see § 5.3.3 and
  § 5.0.1 rule 6.

A segment beginning with `##` is none of these — it is not a key
validation failure; it is never parsed as a key at all. § 5.1
rule 2 dispatches any line whose trimmed form begins with `##` as
a comment (§ 3.4) before any key parsing begins, so such a line
can never reach this section. The collision is a *writer*
round-trip hazard, not a parser-side error: the canonical writer
MUST emit a `##`-prefixed key's first segment in quoted form
(§ 5.9.10) precisely so that the emitted line starts with `"`,
not `#`, and still parses as the intended pair on re-read.

