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
