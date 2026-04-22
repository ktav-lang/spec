# Ktav Conformance Test Suite

**Languages:** **English** · [Русский](README.ru.md) · [简体中文](README.zh.md)

A language-agnostic test suite for Ktav parsers. Every conformant
implementation should run this suite against its parser and pass every
test.

## Layout

```
tests/
├── valid/
│   ├── <category>/
│   │   ├── <name>.ktav        Input document.
│   │   └── <name>.json        Expected Value, serialized as JSON.
└── invalid/
    ├── <name>.ktav            Input document.
    └── <name>.json            { "error": "<category>" } — expected failure.
```

## JSON oracle

Ktav's `Value` maps to JSON directly — no wrapper objects:

| Ktav `Value`            | JSON                                   |
|-------------------------|----------------------------------------|
| `Null`                  | `null`                                 |
| `Bool(true)`            | `true`                                 |
| `Bool(false)`           | `false`                                |
| `String(s)`             | `"s"`                                  |
| `Integer(s)`            | *JSON number, no decimal point* — e.g. `8080`, `-100`, `0`, `99999999999999999999` |
| `Float(s)`              | *JSON number with a decimal point* — e.g. `0.5`, `-1.5`, `0.0`, `1.5e-10`, `2.5E+8` |
| `Array([v1, v2, …])`    | `[ v1, v2, … ]`                        |
| `Object([(k1, v1), …])` | `{ "k1": v1, … }`                      |

**Plain scalars (`:`-pair values) stay as strings at the Value
level** in Ktav — typing is delegated to the consumer (e.g. serde on
the Rust side). A test expected output of `"port": "8080"` is
correct for `port: 8080` (plain), not `"port": 8080`.

**Integer vs Float is distinguished by the decimal point.** The
oracle writes `Integer(s)` as `s` without a decimal point, and
`Float(s)` as `s` with one — Float bodies are required by the
grammar to contain `.`, so there is no ambiguity: `Float("0")` does
not exist (it would fail `InvalidTypedScalar`), and `Integer` always
lacks the decimal point.

**Precision.** For numbers that exceed i64/f64 range (e.g.
`integer_large` has a 20-digit integer), implementations that parse
their oracle `.json` MUST either use an arbitrary-precision number
parser, or compare numerically via the Value-level textual form
preserved by the Integer/Float variants. Implementations without
that capability can fall back to comparing Value trees
round-trip-equally: parse the oracle with the same implementation's
own Ktav serializer-to-JSON path, then compare as JSON structures.

### Example

```text
# foo.ktav
port:i 8080
ratio:f 0.5
version: 1.2
```

```json
{
  "port": 8080,
  "ratio": 0.5,
  "version": "1.2"
}
```

## How implementations use it

1. Parse `<name>.ktav` with your implementation, producing an
   in-memory Value.
2. Serialize that Value to JSON using your implementation's canonical
   serialization (**preserving object field insertion order**).
3. Compare byte-equivalent, or at least structurally-equivalent under
   ordered-object semantics, against `<name>.json`.

For `invalid/*`, step 1 must return an error, and the error's category
should match the one declared in `<name>.json` under `"error"`.

## Error categories

These match section 6 of the spec:

- `UnbalancedBracket` — closing `}`/`]` without a matching open, or
  EOF reached while a compound/multi-line is open.
- `MismatchedBracket` — closing `}` for an open `[` or vice versa.
- `DuplicateName` — duplicate key within an object.
- `PathConflict` — dotted-key expansion conflicting with existing
  scalar.
- `InvalidKey` — key containing forbidden characters.
- `EmptyKey` — empty string before first `:` on a pair line.
- `OrphanLine` — non-colon, non-closer line inside an object.
- `InlineNonEmptyCompound` — inline `{...}` / `[...]` with content.
- `InvalidTypedScalar` — body of a `:i` / `:f` typed marker does not
  match the required integer / float grammar.
- `MissingSeparatorSpace` — a pair separator (`:`, `::`, `:i`, `:f`)
  or array-item marker (`::`, `:i`, `:f`) is glued to its body with no
  whitespace and no EOL in between (§ 6.10).

## Running against the Rust implementation

See [`ktav-lang/rust`](https://github.com/ktav-lang/rust) — its test
suite consumes this directory as a git submodule (or a copy) and
runs every pair.

## Contributing a new test

Preferred flow:

1. Write the `.ktav` file with a focused scenario — one concept per
   test.
2. Feed it through any conformant implementation, capture the
   canonical-JSON output, save as `<name>.json` (or, for invalid
   inputs, capture the error category and write `{"error":"<cat>"}`).
3. Open a PR. The CI on each implementation will verify that it
   agrees with the oracle.

Name tests descriptively — `empty_list.ktav`, not `t1.ktav`.
