# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** **English** · [Русский](README.ru.md) · [简体中文](README.zh.md)

**Playground:** convert JSON / YAML / TOML / INI ⇄ Ktav in your browser at **[ktav-lang.github.io](https://ktav-lang.github.io/)**.

> A plain configuration format. JSON-shape — scalars, arrays, objects,
> `null`, `true`, `false` — with none of JSON's punctuation in the
> common case: no quotes around strings, no commas outside one-line
> inline compounds, and a closed 10-entry escape table only for the
> rare byte that truly needs one. Dotted keys for nesting, visible
> opt-in markers for literal and multi-line strings.

This repository is the **canonical specification** of the Ktav format.
Implementations in any programming language are expected to conform to
the version they target.

## A taste

One example that exercises every major form the format offers —
`:` pairs (a bare number is typed by its form, everything else is a
String), keyword Bool, `::` (forced literal String), dotted keys,
nested compounds, and a multi-line string.

```text
## A config for a SOCKS5 rotator.
port: 20082
log_level: info
debug: true

banned_patterns: [
    .*\.onion:\d+
    .*\.local
]

upstreams: [
    {
        host: a.example
        port: 1080
        weight: 0.7
        timeouts: {
            read: 30
            write: 10
        }
    }
    {
        host: b.example
        port: 1080
        weight: 0.3
    }
]

## Dotted keys — flat alternative to nesting.
node.host: a.example
node.port: 1080
## `::` forces a literal string — keeps the ':' inside the password.
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

Parses to this value (shown as JSON5 — comments and unquoted keys for
readability). Note how the values map:

- `:` with a bare integer body (`20082`) — Integer; with a bare
  decimal body (`0.7`) — Float; any other body (`info`, a regex, a
  path) — String, verbatim, even for digit-ish content.
- `: true` / `: false` / `: null` — Bool / Null keywords.
- `::` — forced literal String, no classification applied.

```json5
{
  port: 20082,
  log_level: "info",
  debug: true,

  banned_patterns: [
    ".*\\.onion:\\d+",
    ".*\\.local",
  ],

  upstreams: [
    {
      host: "a.example",
      port: 1080,
      weight: 0.7,
      timeouts: { read: 30, write: 10 },
    },
    {
      host: "b.example",
      port: 1080,
      weight: 0.3,
    },
  ],

  node: {
    host: "a.example",
    port: 1080,
    auth: "p@ss:word",
  },

  motd: "Welcome to the node.\nPlease behave.",
}
```

### Numbers are typed by lexical form

The format types a scalar from the *shape* of its body: a bare
integer becomes an Integer, a bare decimal becomes a Float, and
everything else stays a String. No marker is needed. Nothing that
merely *looks* number-ish but isn't a bare number (a version, a
label) is coerced — and `::` forces a genuine bare number to stay a
literal string when you need that. Two boundary exceptions: a bare
integer outside the guaranteed i64 range, or a bare decimal that
overflows to non-finite on binary64, is kept as a String instead —
shape alone doesn't make it a number if the value can't fit. A
decimal that instead *underflows* (too close to zero to represent)
still becomes a Float, rounded to signed `0.0`, not a String.

```text
retries: 3
version: 1.2
build:: 0007
label: v1.2
```

```json5
{
  retries: 3,        // bare integer — Integer
  version: 1.2,      // bare decimal — Float
  build: "0007",     // `::` — forced literal String
  label: "v1.2",     // not a bare number — String
}
```

### With `::` — keywords and brackets as plain strings

A body that would otherwise be classified as a keyword (`null`,
`true`, `false`), an empty compound (`{}`, `[]`), or start a compound
(`{`, `[`) needs the raw `::` marker to come out as a plain String.

```text
## Would be Bool true without `::` — here it's the string "true".
on_release:: true
## Starts with `[` — `::` prevents "open array" interpretation.
regex::      [a-z]+
## IPv6 address literal — same reason.
ipv6::       [::1]:8080
## `null` keyword used as a literal four-char string.
placeholder:: null
```

```json5
{
  on_release: "true",
  regex: "[a-z]+",
  ipv6: "[::1]:8080",
  placeholder: "null",
}
```

## Motto

> **Be the config's friend, not its examiner. The config isn't perfect
> — but it's the best one.**

Every rule is local. Every line either stands on its own or depends
only on explicit, visible brackets above it. No indentation pitfalls,
no forgotten quotes, no trailing-comma arithmetic.

## Why Ktav

| Feature                                              | JSON | YAML | TOML | Ktav |
|------------------------------------------------------|:----:|:----:|:----:|:----:|
| Bare strings (no mandatory quoting)                  |  ✗   |  ~   |  ✗   |  ✓   |
| Comma-free lists                                     |  ✗   |  ✓   |  ✓   |  ✓   |
| Whitespace-insensitive (no indentation pitfalls)     |  ✓   |  ✗   |  ✓   |  ✓   |
| Human-writable multi-line strings                    |  ✗   |  ~   |  ~   |  ✓   |
| Native comments                                      |  ✗   |  ✓   |  ✓   |  ✓   |
| Dotted keys for flat edits                           |  ✗   |  ✗   |  ✓   |  ✓   |
| One parser, small spec                               |  ✓   |  ✗   |  ~   |  ✓   |

> ✓ = feature present · ✗ = absent · ~ = partial

Ktav keeps JSON's shape (you always know what a document means) but
strips the syntax that makes JSON hostile to write by hand. It keeps
TOML's dotted keys (handy for flat edits and CLI overrides) but drops
TOML's two-dimensional table-vs-inline split.

## The rules, in one screen

A Ktav document is an implicit top-level object. Inside any object you
have pairs; inside any array you have items.

```text
## comment             — any line starting with '##'
key: value             — scalar pair; bare number → Integer/Float,
                         any other body → String
key:: value            — scalar pair; value is ALWAYS a literal string
key: { ... }           — multi-line object; `}` closes on its own line
key: [ ... ]           — multi-line array; `]` closes on its own line
key: { a: 1, b: 2 }    — inline object, one line, comma-separated
key: [ 1, 2 ]          — inline array, one line, comma-separated
key: {}   /   key: []  — empty compound, inline
key: ( ... )           — multi-line string; common indent stripped
key: (( ... ))         — multi-line string; verbatim (no stripping)
value                  — inside an array: bare item (typed by form)
:: value               — inside an array: literal-string item
```

That's the whole language. No commas or quotes are required for the
common case — commas appear only as separators inside one-line inline
compounds — and the closed 10-entry escape table (§ 3.7) covers only
the rare byte that truly needs one. The `::` marker (in the separator
for pairs, or as a line prefix for array items) forces a literal
string.

### Dotted keys

Keys may be dotted paths. These two documents are *identical*:

```text
server.host: 127.0.0.1
server.port: 8080
```

```text
server: {
    host: 127.0.0.1
    port: 8080
}
```

Dotted keys mix freely with nested form. The parser builds the same
tree either way. Useful for:

- CLI/env overrides (`--set server.port=9090`).
- Partial edits in small configs without restructuring.
- Flat-first files that grow nested sections as needed.

### Strings, straight

A value is a string by default. Whatever follows the `:` (after one
space of padding) is the string, verbatim, up to the end of the line.
No quoting means no quoting rules — paths, URLs, regexes, tokens with
punctuation all just work.

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
```

When a string would collide with grammar (starts with `{`, `[`, `(`,
or equals a keyword like `true`), prefix the separator with `::`:

```text
literal_bracket:: [
keyword_as_string:: true
```

### Numbers, typed by form

A bare number is typed directly — `port: 8080` gives you an Integer,
`ratio: 0.5` a Float. The body's shape decides: digits only →
Integer; digits with a decimal point or exponent → Float; anything
else → String — with two exceptions at the numeric edges: an integer
outside the guaranteed i64 range, or a decimal that overflows to
non-finite on binary64, is kept as a String instead of wrapping or
raising an error. A decimal that *underflows* (too close to zero to
represent) still becomes a Float, rounded to signed `0.0` — it does
not fall back to a String.

```text
port:    8080
ratio:   0.5
offset:  -100
eps:     1.5e-10
```

Numbers are Values carrying a numeric value, not the text they were
written as — the writer emits a normalised canonical form (spec
section 5.9.8), so `0.50` comes back as `0.5` and `1e2` as `100.0`
(the decimal point stays even for a whole-number Float, so a
re-parse doesn't turn it into an Integer). A bare integer within the
guaranteed i64 range round-trips exactly as an Integer; i64 (Integer)
and binary64 (Float) are the portable floor every implementation
guarantees — an implementation may support wider domains (arbitrary
precision / decimal), and an overflowing literal beyond what it
supports falls back to a String. To keep a numeric-looking value as
text regardless of size, force it with `::`
(`zip:: 01007`).

### Multi-line strings

Two forms, different goals:

```text
stripped: (
    line 1
    line 2
        relative indent preserved
)

verbatim: ((
    line 1
        exact leading whitespace preserved
    line 3
))
```

`(` strips the common leading indent — write code/text that *reads*
well in the file, the value comes out clean. `((` preserves every
byte, so the document round-trips byte-for-byte.

### Keywords

Lowercase only: `null`, `true`, `false`. Anything else — `Null`,
`TRUE`, `yes`, `on` — is a plain string. No magic type coercion,
no versioned gotcha list.

```text
port: 8080
active: true
timeout: null
```

```json5
{
  port: 8080,     // bare integer → Integer
  active: true,   // keyword → native JSON bool
  timeout: null,  // keyword → native JSON null
}
```

## Full specification

- **Current stable:** [Ktav 0.6.4](versions/0.6/spec.md) — released 2026-08-23.
- **Machine-readable index** of all versions: [`versions.ktav`](versions.ktav).
- **History across versions:** [`CHANGELOG.md`](CHANGELOG.md).

## Conformance test suite

Every version ships a language-agnostic test suite under
[`versions/<v>/tests/`](versions/0.6/tests/), split into up to three
fixture categories plus one top-level metadata file. A conformance
runner MUST walk every fixture category present in the version it
targets — silently skipping one it doesn't recognise reports
false-green, which is worse than having no fixtures for it at all.

- **`boundary-fixtures.json`** *(0.7+, not a fixture category)* — a
  leaf-level list of individual Object fields, inside otherwise-normal
  `valid/` fixtures, known to probe a numeric-domain boundary (spec
  § 5.2, § 8.1, § 8.2), e.g. an i64-overflow or Float-overflow
  literal, tagged with which axis it probes (`integer_range`,
  `float_range`, `float_underflow`, `float_precision`). It lives at
  the `tests/` root, not inside `valid/`, specifically so a runner
  enumerating `valid/**/*.json` as fixtures never mistakes it for one.
  Listing a leaf there doesn't say what a wider-domain implementation's
  output must be at that field — only that an implementation is exempt
  from matching it byte-for-byte, and only if it genuinely supports a
  domain wider than the minimum along that specific axis; every other
  field of the same fixture, and every fixture or field not listed,
  carries no exemption for any implementation.
- **`valid/`** — parseable documents. Each case is a
  `<name>.ktav` + `<name>.json` + `<name>.canonical.ktav` triple:
  `.ktav` is the input; `.json` is the expected parsed `Value`,
  mapped 1:1 (`Null`→`null`, `Bool`→`bool`, `String`→`string`,
  `Array`→`array`, `Object`→`object`). A JSON number token with no
  `.`, `e`, or `E` denotes Integer; one containing any of them denotes
  Float, including `-0.0`. Every other scalar stays a string and `::`
  forces a literal string. `.canonical.ktav` is the expected byte-exact
  writer output for that same `Value`. Object field order is
  significant.
- **`invalid/`** — documents a conforming parser MUST reject. Each
  case is a `<name>.ktav` + `<name>.json` pair; the `.json` names the
  expected error category in its `expected_error` field.
- **`unrepresentable/`** *(0.7+)* — `Value`s a conforming writer MUST
  refuse to serialise rather than emit lossy or partial output. These
  programmatic-only cases have one `<name>.json` each, with exactly
  `value`, `unrepresentable_reason`, and non-empty `note`; the Value
  mapping and exact `$float` sentinel shape are defined by § 5.9.0.
  Only `ScalarRoot`, `EmptyKeyName`, and `NonFiniteFloat` are allowed.
  The reason code MUST have a recursive witness and MUST NOT be inferred
  from the filename.
- **`parseable-unrepresentable/`** *(0.7+)* — parser-produced Values
  which a conforming writer MUST refuse. Each case is a
  `<name>.ktav` + `<name>.json` pair; parsing the input MUST produce the
  JSON `value`, and writing it MUST fail with the named reason code.
  Only the String reasons `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision`, and `LeadingWhitespaceCollision` are
  allowed. These are intentionally pairs, with no other files and no
  canonical-output file.

The versioned `scripts/locks/corpus-inventory.0.7.lock.json` maps every
corpus-relative file path in `valid/`, `invalid/`, `unrepresentable/`, and
`parseable-unrepresentable/`, plus `boundary-fixtures.json`, to its SHA-256
digest. CI passes it to `validate_corpus.py --corpus-inventory-lock`, which
rejects additions, deletions, content drift, and unknown top-level entries;
the lock supplements rather than replaces semantic and schema validation.

Passing every test in every category present in that version's suite
is a necessary release gate, but not by itself sufficient proof of
conformance: `boundary-fixtures.json` (0.7+) tells the shared corpus
to skip an exact byte/Value check on specific leaves for an
implementation whose numeric domain is wider than the minimum along
that leaf's axis — spec § 8.1 / § 8.2 define what such an
implementation's correctness there actually depends on (§ 5, § 5.9),
and the shared corpus does not verify it. An implementation that
declares a wider numeric domain MUST additionally verify its own
behaviour against § 5 / § 5.9 for the domain it claims, beyond what
this language-agnostic suite checks. Consume the
directory as a git submodule (or copy it).

## Version scheme

Spec versions use `MAJOR.MINOR.PATCH`:

| Bump              | Means                                                                                        |
|-------------------|----------------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)` | Editorial — typo fixes, clarifications; conforming implementations are unaffected.           |
| `x.y → x.(y+1)`   | Backward-compatible extension (new keyword, new primitive form).                             |
| `x.y → (x+1).0`   | Breaking change in grammar or semantics.                                                     |

**Pre-1.0 exception:** while `MAJOR` is `0`, a `MINOR` bump MAY carry
a breaking change instead of requiring a `MAJOR` bump (0.7.0 does
this over 0.6.x). Once the format reaches `1.0`, breaking changes
strictly require a `MAJOR` bump as the table states.

Within any stable `MAJOR`, an implementation targeting `x.0` MUST
parse every document valid under any later `x.y.z` identically up to
the subset it supports — except across a pre-1.0 breaking `MINOR`
bump per the exception above, where this guarantee does not hold.

Each version's directory is fully self-contained: `spec.md`, a
`tests/` conformance suite, and per-version addenda. Implementations
pin to a version directory by path.

## Layout

```
.
├── README.md              this file
├── versions.ktav          machine-readable index of versions
├── CHANGELOG.md           summary across versions
├── CONTRIBUTING.md        how to propose changes
├── LICENSE-MIT            MIT License
├── LICENSE-APACHE         Apache License 2.0
├── scripts/
│   ├── validate_corpus.py                 structural validation of the conformance corpus
│   ├── test_validate_corpus.py            unit tests for validate_corpus.py
│   ├── check_translation_parity.py        EN/RU/ZH translation-parity checker
│   ├── test_check_translation_parity.py   unit tests for check_translation_parity.py
│   ├── build_spec.mjs                     (0.7+) generates spec.md/.ru.md/.zh.md from content/
│   ├── test_build_spec.mjs                (0.7+) adversarial unit tests for build_spec.mjs
│   ├── archive/                           (0.7+) archived one-time content-unit bootstrap
│   │   └── extract_content_units.py         see content/README.md; refuses to overwrite content/
│   └── locks/                             versioned boundary and corpus-inventory lock files
├── .github/workflows/     CI: content/ byte-identity check (0.7+), corpus validation,
│                          translation-parity check, and all three unit test suites
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        ├── spec.ru.md     Russian translation of the spec
        ├── spec.zh.md     Chinese translation of the spec
        ├── content/       (0.7+) per-section source of truth — see content/README.md;
        │                  spec.md/.ru.md/.zh.md are generated from this, never hand-edited
        └── tests/         language-agnostic conformance suite
            ├── valid/
            ├── invalid/
            ├── unrepresentable/   (0.7+)
            ├── parseable-unrepresentable/ (0.7+; pairs, no canonical output)
            └── boundary-fixtures.json   (0.7+) leaf-level numeric-
                        domain exemptions, not a fixture category
```

## Implementations

| Language       | Repo                                                  | Install                                              |
|----------------|-------------------------------------------------------|------------------------------------------------------|
| Rust (reference) | [`ktav-lang/rust`](https://github.com/ktav-lang/rust) | `cargo add ktav`                                     |
| C# / .NET      | [`ktav-lang/csharp`](https://github.com/ktav-lang/csharp) | `dotnet add package Ktav`                        |
| Go             | [`ktav-lang/golang`](https://github.com/ktav-lang/golang) | `go get github.com/ktav-lang/golang`             |
| Java / JVM     | [`ktav-lang/java`](https://github.com/ktav-lang/java) | `io.github.ktav-lang:ktav` on Maven Central          |
| JS / TS        | [`ktav-lang/js`](https://github.com/ktav-lang/js)     | `npm install @ktav-lang/ktav`                        |
| PHP            | [`ktav-lang/php`](https://github.com/ktav-lang/php)   | `composer require ktav-lang/ktav`                    |
| Python         | [`ktav-lang/python`](https://github.com/ktav-lang/python) | `pip install ktav`                                |

The Rust crate is the reference parser, and every binding embeds that
same core. Go, Java, PHP and C# consume it through a prebuilt
`ktav_cabi` (the C ABI wrapper), whose function surface has grown
additively across releases — 0.6.4 added `ktav_loads_strict`
alongside the existing functions. Python ships a dedicated PyO3
native extension rather than the C ABI, and JS ships several
runtime-specific artifacts — WASM for browsers, N-API for Node, plus
a C ABI path — instead of a single binding shape. All of them parse
whatever format version the underlying Rust core supports (currently
0.6.4 stable); the language-agnostic `tests/` suite below runs
against all of them on every release.

Building a new implementation? Start with your target version's
[`spec.md`](versions/0.6/spec.md) (section 8 — Compliance) and run
the [`tests/`](versions/0.6/tests/) suite against your parser.

## Contributing

Editorial fixes inside an existing version — PR directly. Anything
else — open an issue first. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Support the project

The author has many ideas that could be broadly useful to IT worldwide —
not limited to Ktav. Realizing them requires funding. If you'd like to
help, please reach out at **phpcraftdream@gmail.com**.

## License

Dual-licensed under **MIT OR Apache-2.0** at your option. See
[LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE).
