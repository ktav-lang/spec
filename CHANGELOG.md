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

Directory: [`versions/0.1/`](versions/0.1/).
