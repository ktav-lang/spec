
- **Breaking:** Removed typed markers `:i` and `:f`. Numbers /
  booleans / `null` are inferred from the scalar body's lexical
  form (§ 3.6, § 5.2). The raw marker `::` is kept to force String.
- **Breaking:** Comments now use `##` (two ASCII `#` bytes) and MUST
  occupy their own line (§ 3.4). A single `#` byte has no special
  meaning. Trailing comments after a content line are not supported.
- **Breaking:** Lone `{` / `[` on the first content line is now a
  multi-line root Object / Array (§ 5.0.1 rules 4–5). Previously
  (0.1.1) this opened a single Object / Array item inside a
  root-level Array; the JSONL-style form (multiple top-level
  objects) is no longer accepted.
- **Breaking:** Float Values no longer preserve textual form;
  numeric canonicalisation applies (§ 3.6, § 5.2, § 5.9.8). The
  Value model carries a numeric value; the canonical writer emits
  a deterministic textual form.
- **Breaking:** Key segments are trimmed of leading and trailing
  ASCII whitespace (§ 4). A segment empty after trimming is
  `EmptyKey`.
- **Added:** Inline compounds — `{key: value, key2: value}` and
  `[v1, v2, v3]`, with optional trailing comma (§ 5.8). Inline
  form is usable as a value, as an array item, or as the entire
  document.
- **Added:** Eight escape sequences `\\`, `\,`, `\}`, `\]`, `\{`,
  `\[`, `\n`, `\r` inside inline scalar values (§ 3.7). Any other
  `\X` form is a `BadEscapeSequence` error.
- **Added:** Number literal grammar covering `0x` hex, `0o` octal,
  `0b` binary, decimal, with underscore separators between digits
  (§ 3.6). Integer Value carries an integer value; Float Value
  carries a numeric value; both have canonical textual forms
  (§ 5.9.8). Big-integer overflow falls back to String.
- **Added:** **Canonical form (§ 5.9)** — a normative writer
  output for every Value, used by writer-conforming
  implementations and verified by `*.canonical.ktav` fixtures.
- **Added:** **Triple-test conformance suite** — every valid
  fixture has three files: `name.ktav` (input), `name.json`
  (Value oracle), `name.canonical.ktav` (writer oracle).
- **Added:** `UnterminatedInlineCompound`, `MalformedInlineCompound`,
  `BadEscapeSequence` errors (§ 6.11, § 6.12, § 6.13).
- **Added:** `OrphanLineAfterTopLevelInline` error (§ 6.14) as a
  distinct error category, separate from `MissingSeparator`.
- **Added:** Appendix B — migration guide 0.1.x → 0.5.0.
- **Removed:** `InlineNonEmptyCompound` (§ 6.7),
  `InvalidTypedScalar` (§ 6.9) error categories. The numbers are
  reserved; implementations MUST NOT emit errors labelled with
  these names when parsing 0.5.0 documents.
- **Changed:** Top-level kind detection (§ 5.0.1) extended and
  rewritten — closed inline compounds on the first content line
  are root-level inline Object / Array; lone `{` / `[` is a
  multi-line root opener (see Breaking above).
- **Changed:** Compliance (§ 8) split into parser-conforming
  (§ 8.1), writer-conforming (§ 8.2), and the round-trip property
  (§ 8.3); implementations may claim either or both.

