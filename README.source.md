>>>>> lang=en
# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** **English** · [Русский](README.ru.md) · [简体中文](README.zh.md)

> **Version scope:** the feature overview and examples in this README follow
> Ktav 0.8.0, the current stable specification. Implementations still
> targeting 0.7.1 should read
> [`versions/0.7/spec.md`](versions/0.7/spec.md), still carried in the
> working tree; what changed between them is scoped in
> [Appendix E of the 0.8.0 specification](versions/0.8/spec.md).

**Playground:** convert JSON / YAML / TOML / INI ⇄ Ktav in your browser at **[ktav-lang.github.io](https://ktav-lang.github.io/)**.

> A plain configuration format. JSON-shape — scalars, arrays, objects,
> `null`, `true`, `false` — with none of JSON's punctuation in the
> common case: no quotes around strings, no commas outside one-line
> inline compounds, and a closed 14-entry escape table for literal bytes
> and explicit scalar classification. Dotted keys for nesting, visible
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

On the minimum required domain, the format types a scalar from the
*shape* of its body: a bare integer becomes an Integer, a bare decimal
becomes a Float, and everything else stays a String. No marker is
needed. Nothing that merely *looks* number-ish but isn't a bare number
(a version, a label) is coerced — and `::` forces a genuine bare number
to stay a literal string when you need that. On this minimum domain, a
bare integer outside i64, or a bare decimal that overflows to non-finite
on binary64, is kept as a String; a wider implementation MAY retain the
literal as Integer or Float. A decimal that *underflows in the tested
implementation's domain* still becomes a Float, rounded to signed
`0.0` in that domain, not a String; a wider domain in which it does
not underflow retains a non-zero Float. The abstract programmatic Float
carrier MUST distinguish NaN, +Infinity, and -Infinity so writer-conformance
tests can supply the three non-finite sentinels; those sentinels are outside
the parseable and canonical domains. Parsed Floats are finite members of the
declared Float domain. That domain includes its decimal-conversion and
rounding semantics and MUST admit only finite Float values. Every non-zero finite Float MUST have a finite decimal
representation that round-trips exactly; signed zeros are handled
separately and remain `0.0` / `-0.0`;
the minimum binary64 conversion uses `roundTiesToEven`. An unsupported
exact-rational value such as `1/3` is outside the declared Ktav Float domain
and is not a parseable or canonical Float.

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

A Ktav document's root is an Object or Array determined by its first
content line. Inside any object you have pairs; inside any array you have
items.

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
compounds — and the closed 14-entry escape table (§ 3.7) provides
literal-byte escapes and explicit scalar classification. The `::` marker
(in the separator
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

A key whose decoded text begins with `##` may use the bare input form
`\u0023#a\:b: 1`; the `\u0023` escape is accepted input. A canonical writer
MUST quote that key instead, for example `"##a:b": 1`, so the output cannot
be mistaken for a comment.

### Strings, straight

A non-compound scalar body is trimmed at both edges before it is
classified. A non-empty body that is not a keyword or numeric literal
is a String, so internal whitespace and punctuation remain part of the
value. No quoting means no quoting rules — paths, URLs, regexes, tokens
with punctuation all just work.

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
padded:   hello
```

Here `padded` has the String value `hello`: separator padding and body
edge whitespace are trimmed before classification. When a string would
collide with grammar (starts with `{` or `[`, equals a keyword like
`true`, or is exactly one of `(`, `((`, `()`, `(())`), prefix the
separator with `::`:

```text
literal_bracket:: [
keyword_as_string:: true
```

### Numbers, typed by form

A bare number is typed directly on the minimum required domain —
`port: 8080` gives you an Integer, `ratio: 0.5` a Float. The body's
shape decides: digits only → Integer; digits with a decimal point or
exponent → Float; anything else → String. At the minimum numeric
boundaries, an integer outside i64 or a decimal that overflows to
non-finite on binary64 is kept as a String instead of wrapping or
raising an error; a wider domain MAY classify that same boundary literal
as Integer or Float. A decimal that *underflows in the implementation's
domain* still becomes a Float, rounded to signed `0.0` in that domain;
a wider domain in which it does not underflow retains a non-zero Float.
The abstract programmatic Float carrier MUST distinguish NaN, +Infinity,
and -Infinity for writer-conformance; these sentinels are outside the
parseable and canonical domains. Parsed Floats are finite members of the
declared Float domain, which includes decimal-conversion and rounding
semantics; every admitted non-zero finite Float MUST have a finite decimal
candidate that round-trips exactly. Signed zeros are handled separately
and remain `0.0` / `-0.0`; minimum binary64 uses `roundTiesToEven`. A
finite host value without such a candidate, such as exact-rational `1/3`,
is outside the declared Ktav Float domain and is not a parseable or
canonical Float.

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
and binary64 (Float) are the portable minimum every implementation
guarantees — an implementation may support wider domains (arbitrary
precision / decimal), and a literal overflowing its own supported
domain falls back to a String. To keep a numeric-looking value as text
regardless of size, force it with `::`
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
content-line byte after line-ending normalization; it does not preserve
the bytes of the whole document.

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

- **Current stable:** [Ktav 0.8.0](versions/0.8/spec.md) — released 2026-09-19; this README's feature overview follows it.
- **Previous stable:** [Ktav 0.7.1](versions/0.7/spec.md) — released 2026-09-16.
- **Machine-readable index** of released/stable versions: [`versions.ktav`](versions.ktav).
- **History across versions:** [`CHANGELOG.md`](CHANGELOG.md).

## Conformance test suite

Every version ships a language-agnostic test suite under
[`versions/<v>/tests/`](versions/0.8/tests/). The 0.8.0 corpus
has five fixture categories (`valid/`, `invalid/`, `unrepresentable/`,
`parseable-unrepresentable/`, and `strict-lossy/`) plus one top-level
metadata file. Older corpora carry fewer — the 0.7.1 suite has only the
first four; the 0.6.4 suite, at the `v0.6.4` tag, has only `valid/` and
`invalid/`. A conformance runner MUST walk every fixture
category present in the version it targets — silently skipping one it
doesn't recognise reports false-green, which is worse than having no
fixtures for it at all.

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
  mapping and exact `$float` sentinel shape are defined by § 5.9.0. The
  `$float` sentinel is contextual to this fixture encoding and does not
  reserve `$float` as a parser Object key name. For `NonFiniteFloat`, it
  denotes the abstract programmatic Float carrier, not a parsed or
  canonical Float, and is outside node-representability.
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
- **`strict-lossy/`** *(0.8+)* — scalars whose lexical form the lax
  entry point (`parse`/`loads`) accepts and silently canonicalises,
  but which the strict entry point (`parse_strict`/`loads_strict`)
  MUST reject with `LossyScalar`. Each case is a `<name>.ktav` +
  `<name>.json` pair; the `.json` gives both the lax parse's `lax_value`
  and the exact `body`/`canonical` the strict rejection MUST name.

The versioned `scripts/locks/corpus-inventory.0.8.lock.json` maps every
corpus-relative 0.8 path in `valid/`, `invalid/`, `unrepresentable/`,
`parseable-unrepresentable/`, and `strict-lossy/`, plus
`boundary-fixtures.json`, to its SHA-256 digest. CI passes the matching
lock to `validate_corpus.py --corpus-inventory-lock`:

```sh
python scripts/validate_corpus.py versions/0.8/tests \
  --require-unrepresentable --require-boundary \
  --boundary-manifest-lock scripts/locks/boundary-fixtures.0.8.lock.json \
  --corpus-inventory-lock scripts/locks/corpus-inventory.0.8.lock.json
```

Each lock rejects additions, deletions, content drift, and unknown
top-level entries; it supplements rather than replaces semantic and schema
validation.

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
├── versions.ktav          machine-readable index of released/stable versions
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
│   └── locks/                             versioned corpus, boundary, and section-inventory lock files
│       ├── corpus-inventory.0.8.lock.json  (0.8 corpus paths + SHA-256)
│       ├── boundary-fixtures.0.8.lock.json (0.8 boundary leaves: fixture, path, class)
│       ├── section-inventory.0.8.lock.json (0.8 ordered sections + structural metadata)
│       ├── corpus-inventory.0.7.lock.json  (0.7 corpus paths + SHA-256; 0.7 still in the tree)
│       ├── boundary-fixtures.0.7.lock.json (0.7 boundary leaves: fixture, path, class)
│       └── section-inventory.0.7.lock.json (0.7 ordered sections + structural metadata)
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
| Java / JVM     | [`ktav-lang/java`](https://github.com/ktav-lang/java) | GitHub Releases (Maven Central pending)              |
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
0.8.0 stable); the language-agnostic `tests/` suite below runs
against all of them on every release.

Building a new implementation? Start with your target version's
[`spec.md`](versions/0.8/spec.md) (section 8 — Compliance) and run
the [`tests/`](versions/0.8/tests/) suite against your parser.

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
>>>>> lang=ru
# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** [English](README.md) · **Русский** · [简体中文](README.zh.md)

> **Область версии:** обзор возможностей и примеры в этом README
> следуют Ktav 0.8.0 — текущей стабильной спецификации. Реализациям,
> всё ещё нацеленным на 0.7.1, следует читать
> [`versions/0.7/spec.ru.md`](versions/0.7/spec.ru.md) — он всё ещё
> лежит в рабочем дереве; что изменилось между ними —
> описано в [Приложении E спецификации 0.8.0](versions/0.8/spec.ru.md).

**Песочница:** конвертация JSON / YAML / TOML / INI ⇄ Ktav прямо в браузере — **[ktav-lang.github.io](https://ktav-lang.github.io/)**.

> Простой формат конфигурации. Форма JSON — скаляры, массивы, объекты,
> `null`, `true`, `false` — без пунктуации JSON в обычном случае:
> без кавычек вокруг строк; запятые — только внутри однострочных
> inline-составных, а замкнутая таблица из 14 escape-последовательностей
> задаёт литеральные байты и явную классификацию скаляра.
> Точечные ключи для вложенности, видимые явные маркеры для литеральных
> и многострочных строк.

Этот репозиторий — **каноническая спецификация** формата Ktav.
Реализации на любом языке программирования должны соответствовать
той версии, на которую они ориентированы.

## На вкус

Один пример, задействующий все основные формы формата — пары `:`
(голое число типизируется по форме, всё остальное — String),
ключевое слово Bool, `::` (форсированная литеральная String),
точечные ключи, вложенные составные значения, многострочная строка.

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
## `::` делает строку литеральной — двоеточие внутри пароля сохраняется.
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

Разбирается в следующее значение (показано в виде JSON5 — с
комментариями и без кавычек в ключах для читаемости). Обратите
внимание на соответствие значений:

- `:` с голым целым телом (`20082`) — Integer; с голым десятичным
  (`0.7`) — Float; любое другое тело (`info`, regex, путь) — String,
  дословно, даже для цифроподобного содержимого.
- `: true` / `: false` / `: null` — ключевые Bool / Null.
- `::` — форсированная литеральная String, классификация не применяется.

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

### Числа типизируются по лексической форме

В минимальном обязательном домене формат определяет тип скаляра по
*форме* тела: голое целое становится Integer, голое десятичное — Float,
всё остальное остаётся String. Маркер не нужен. Ничто, что лишь
*похоже* на число, но не является голым числом (версия, метка), не
приводится — а `::` заставляет настоящее голое число остаться
литеральной строкой, когда это нужно. В этом минимальном домене голое
целое за пределами i64 или голое десятичное, переполняющееся до
non-finite на binary64, остаётся String; более широкий домен MAY
классифицировать такой пограничный литерал как Integer или Float.
Десятичное, которое уходит в *underflow в домене тестируемой реализации*,
всё равно становится Float, округлённым до знакового `0.0` в этом
домене, а не String; более широкий домен, в котором underflow не
происходит, сохраняет ненулевой Float. Абстрактный программный Float-носитель
MUST различать NaN, +Infinity и -Infinity, чтобы writer-conformance мог
подать три неконечных sentinel; они находятся вне парсируемого и
канонического доменов. Float, полученный парсингом, конечен и принадлежит
заявленному домену Float. Этот домен включает семантику decimal-преобразования
и округления и MUST допускать только конечные Float. Каждый ненулевой конечный Float MUST иметь конечное
десятичное представление, точно проходящее round-trip; знаковые нули
обрабатываются отдельно и сохраняются как `0.0` / `-0.0`; минимальное
binary64 использует `roundTiesToEven`.
Неподдерживаемое точное рациональное значение вроде `1/3` находится
вне заявленного домена Ktav Float и не является парсируемым или
каноническим Float.

```text
retries: 3
version: 1.2
build:: 0007
label: v1.2
```

```json5
{
  retries: 3,        // голое целое — Integer
  version: 1.2,      // голое десятичное — Float
  build: "0007",     // `::` — форсированная литеральная String
  label: "v1.2",     // не голое число — String
}
```

### С `::` — ключевые слова и скобки как обычные строки

Body, который иначе был бы классифицирован как ключевое слово
(`null`, `true`, `false`), пустое составное (`{}`, `[]`) или начало
составного (`{`, `[`), требует сырого маркера `::`, чтобы стать
обычной String.

```text
## Без `::` было бы Bool true — здесь это строка "true".
on_release:: true
## Начинается с `[` — `::` предотвращает "открытие массива".
regex::      [a-z]+
## IPv6-адрес — та же причина.
ipv6::       [::1]:8080
## Ключевое слово `null` как литеральная четырёхсимвольная строка.
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

## Девиз

> **Будь другом конфига, а не его экзаменатором. Конфиг неидеален —
> но он лучший из возможных.**

Каждое правило локально. Каждая строка либо стоит сама по себе, либо
зависит только от явных, видимых скобок выше. Никаких ловушек с
отступами, никаких забытых кавычек, никакой арифметики замыкающих
запятых.

## Зачем Ktav

| Свойство                                             | JSON | YAML | TOML | Ktav |
|------------------------------------------------------|:----:|:----:|:----:|:----:|
| Строки без обязательных кавычек                      |  ✗   |  ~   |  ✗   |  ✓   |
| Списки без разделителей (никаких запятых)            |  ✗   |  ✓   |  ✓   |  ✓   |
| Нечувствительность к пробелам / отступам             |  ✓   |  ✗   |  ✓   |  ✓   |
| Удобные для человека многострочные строки            |  ✗   |  ~   |  ~   |  ✓   |
| Встроенные комментарии                               |  ✗   |  ✓   |  ✓   |  ✓   |
| Точечные ключи для плоских правок                    |  ✗   |  ✗   |  ✓   |  ✓   |
| Один парсер, небольшая спецификация                  |  ✓   |  ✗   |  ~   |  ✓   |

> ✓ = свойство есть · ✗ = нет · ~ = частично

Ktav сохраняет форму JSON (вы всегда знаете, что означает документ),
но отбрасывает синтаксис, делающий JSON враждебным для ручного
написания. Сохраняет точечные ключи TOML (удобно для плоских правок
и CLI-переопределений), но отказывается от двухмерного деления TOML
на таблицы и inline.

## Правила на одном экране

Корень документа Ktav — это Object или Array, определяемый первой
содержательной строкой. Внутри любого объекта — пары; внутри любого
массива — элементы.

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

Это весь язык. В обычном случае не нужны ни запятые, ни кавычки —
запятые встречаются только как разделители внутри однострочных
inline-составных — а замкнутая таблица из 14 escape-последовательностей
задаёт escape для литеральных байтов и явную классификацию скаляра.
Маркер `::` (в разделителе для пар или в префиксе строки для элементов
массива) делает значение литеральной строкой.

### Точечные ключи

Ключами могут быть точечные пути. Эти два документа *идентичны*:

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

Точечные ключи свободно сочетаются с вложенной формой. Парсер строит
одно и то же дерево в обоих случаях. Полезно для:

- CLI/env-переопределений (`--set server.port=9090`).
- Частичных правок в небольших конфигах без реструктуризации.
- Файлов с плоской основой, обрастающих вложенными секциями по мере
  необходимости.

Ключ, чьё декодированное содержимое начинается с `##`, может использовать
bare-ввод `\u0023#a\:b: 1`; escape `\u0023` принимается как ввод. Но
canonical writer MUST заключить такой ключ в кавычки, например
`"##a:b": 1`, чтобы вывод нельзя было принять за комментарий.

### Строки напрямую

Тело скаляра, не являющееся составным, обрезается по обеим границам
до классификации. Непустое тело, не являющееся ключевым словом или
числовым литералом, — String; внутренние пробелы и пунктуация входят
в значение. Отсутствие кавычек означает отсутствие правил кавычек —
пути, URL, регулярки, токены с пунктуацией просто работают.

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
padded:   hello
```

Здесь `padded` имеет значение String `hello`: padding разделителя и
краевые пробелы тела обрезаются до классификации. Когда строка
конфликтовала бы с грамматикой (начинается с `{` или `[`, равна
ключевому слову вроде `true` или в точности равна одному из `(`, `((`,
`()` или `(())`), префиксуйте разделитель через `::`:

```text
literal_bracket:: [
keyword_as_string:: true
```

### Числа, типизированные по форме

В минимальном обязательном домене голое число типизируется сразу:
`port: 8080` даёт Integer, `ratio: 0.5` — Float. Решает форма тела:
только цифры → Integer; цифры с десятичной точкой или экспонентой →
Float; всё остальное → String. На минимальных числовых границах целое
за пределами i64 или десятичное, переполняющееся до non-finite на
binary64, остаётся String — без молчаливого переполнения и без
исключения при разборе; более широкий домен MAY классифицировать такой
пограничный литерал как Integer или Float. Десятичное, которое уходит
в *underflow в домене реализации*, всё равно становится Float,
округлённым до знакового `0.0` в этом домене; более широкий домен,
в котором underflow не происходит, сохраняет ненулевой Float. Абстрактный
программный Float-носитель MUST различать NaN, +Infinity и -Infinity для
writer-conformance; эти sentinel находятся вне парсируемого и канонического
доменов. Float, полученный парсингом, конечен и принадлежит заявленному
домену Float, который включает семантику decimal-преобразования и
округления; каждый
допускаемый ненулевой конечный Float MUST иметь конечный десятичный
кандидат, точно проходящий round-trip. Знаковые нули обрабатываются
отдельно и сохраняются как `0.0` / `-0.0`; минимальное binary64
использует `roundTiesToEven`. Конечное значение хост-представления без
такого кандидата, например точная рациональ `1/3`, находится вне
заявленного домена Ktav Float и не является парсируемым или каноническим
Float.

```text
port:    8080
ratio:   0.5
offset:  -100
eps:     1.5e-10
```

Числа — это Value, несущие числовое значение, а не текст, которым
они были записаны: при выводе используется нормализованная
каноническая форма (раздел 5.9.8 спецификации), так что `0.50`
возвращается как `0.5`, а `1e2` — как `100.0` (десятичная точка
остаётся даже для целочисленного Float, чтобы повторный разбор не
превратил его в Integer). Голое целое в пределах
гарантированного диапазона i64 переживает round-trip точно как
Integer; i64 (для Integer) и binary64 (для Float) — переносимый
минимум, который гарантирует каждая реализация. Реализация может
поддерживать и более широкие домены (произвольная точность /
десятичные числа), а переполняющий литерал за пределами собственного
поддерживаемого домена уходит в String.
Потребители на типизированных языках (Rust + serde, Go) сужают до
нужного нативного типа; чтобы оставить число-подобное значение
текстом любого размера, форсируйте его через `::`
(`zip:: 01007`).

### Многострочные строки

Две формы, разные цели:

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

`(` срезает общий ведущий отступ — пишите код/текст, который *читается*
в файле хорошо, а значение получается чистым. `((` сохраняет каждый
байты строк содержимого после нормализации переводов строк; байты всего
документа при этом не сохраняются.

### Ключевые слова

Только в нижнем регистре: `null`, `true`, `false`. Всё остальное —
`Null`, `TRUE`, `yes`, `on` — обычная строка. Никакого волшебного
приведения типов, никакого зависящего от версии списка ловушек.

```text
port: 8080
active: true
timeout: null
```

```json5
{
  port: 8080,     // голое целое → Integer
  active: true,   // ключевое слово → нативный JSON bool
  timeout: null,  // ключевое слово → нативный JSON null
}
```

## Полная спецификация

- **Текущая стабильная:** [Ktav 0.8.0](versions/0.8/spec.ru.md) — выпущена 2026-09-19; обзор возможностей этого README следует ей.
- **Предыдущая стабильная:** [Ktav 0.7.1](versions/0.7/spec.ru.md) — выпущена 2026-09-16.
- **Машиночитаемый индекс** выпущенных/стабильных версий: [`versions.ktav`](versions.ktav).
- **История версий:** [`CHANGELOG.ru.md`](CHANGELOG.ru.md).

## Набор тестов соответствия

Каждая версия поставляется с языконезависимым набором тестов в
[`versions/<v>/tests/`](versions/0.8/tests/). В корпусе 0.8.0
есть пять фикстурных категорий (`valid/`, `invalid/`, `unrepresentable/`,
`parseable-unrepresentable/` и `strict-lossy/`) плюс один
верхнеуровневый файл метаданных. В более старых корпусах категорий
меньше — в наборе 0.7.1 есть только первые четыре; в наборе 0.6.4,
доступном по тегу `v0.6.4`, есть только `valid/` и `invalid/`. Runner
соответствия MUST обходить каждую фикстурную категорию, присутствующую в
целевой версии — молчаливый пропуск незнакомой категории даёт ложно-зелёный
результат, что хуже, чем полное отсутствие фикстур для неё.

- **`boundary-fixtures.json`** *(0.7+, не фикстурная категория)* —
  список на уровне отдельных листов — отдельных полей `Object` внутри
  обычных фикстур `valid/` — про которые известно, что они зондируют
  границу числового домена (спека § 5.2, § 8.1, § 8.2), например
  i64-переполняющий или Float-переполняющий литерал, помеченный тем,
  какую ось он зондирует (`integer_range`, `float_range`,
  `float_underflow`, `float_precision`). Он лежит в корне `tests/`,
  а не внутри `valid/`, специально для того, чтобы runner,
  перечисляющий `valid/**/*.json` как фикстуры, никогда не принял его
  за таковую. Перечисление листа там не говорит, каким должен быть
  вывод реализации с более широким доменом в этом поле — только то,
  что реализация освобождена от побайтового совпадения с ним, и то
  лишь если она действительно поддерживает домен шире минимума вдоль
  этой конкретной оси; все остальные поля той же фикстуры, а также
  каждая не перечисленная там фикстура или поле, никакого освобождения
  ни для одной реализации не несут.
- **`valid/`** — парсящиеся документы. Каждый случай — тройка
  `<name>.ktav` + `<name>.json` + `<name>.canonical.ktav`: `.ktav` —
  вход; `.json` — ожидаемый разобранный `Value`, отображённый 1:1
  (`Null`→`null`, `Bool`→`bool`, `String`→`string`, `Array`→`array`,
  `Object`→`object`). JSON-токен числа без `.`, `e` и `E` обозначает
  Integer; токен с любым из них обозначает Float, включая `-0.0`.
  Любой другой скаляр остаётся строкой, а `::` форсит литеральную строку.
  `.canonical.ktav` — ожидаемый байт-точный вывод writer'а для того
  же `Value`. Порядок полей объекта значим.
- **`invalid/`** — документы, которые conforming-парсер MUST
  отклонить. Каждый случай — пара `<name>.ktav` + `<name>.json`;
  `.json` называет ожидаемую категорию ошибки в поле
  `expected_error`.
- **`unrepresentable/`** *(с 0.7)* — `Value`, которые
  conforming-writer MUST отказаться сериализовать вместо lossy или
  частичного вывода. Это случаи, создаваемые программно: для каждого
  есть единственный `<name>.json` ровно с полями `value`,
  `unrepresentable_reason` и непустым `note`; отображение Value и
  точная форма sentinel `$float` определены в § 5.9.0. Этот sentinel
  контекстен только этой кодировке фикстуры и не резервирует `$float` как
  имя ключа Object у парсера. Для `NonFiniteFloat` он обозначает
  абстрактный программный Float-носитель, а не Float, полученный парсингом,
  или канонический Float, и находится вне узловой представимости. Код причины MUST
  быть только `ScalarRoot`, `EmptyKeyName` или `NonFiniteFloat`,
  иметь рекурсивное свидетельство и MUST NOT выводиться из имени файла.
- **`parseable-unrepresentable/`** *(с 0.7)* — порождённые парсером
  Value, которые conforming-writer MUST отвергнуть. Каждый случай —
  пара `<name>.ktav` + `<name>.json`: парсинг MUST дать JSON `value`, а
  запись MUST завершиться отказом с указанным кодом причины. Это пары,
  допускающие только String-причины `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision` и `LeadingWhitespaceCollision`, без иных
  файлов и без canonical-output.
- **`strict-lossy/`** *(с 0.8)* — скаляры, чью лексическую форму
  нестрогая точка входа (`parse`/`loads`) принимает и молча
  канонизирует, но которую строгая точка входа
  (`parse_strict`/`loads_strict`) MUST отвергать с `LossyScalar`.
  Каждый случай — пара `<name>.ktav` + `<name>.json`; `.json` даёт и
  результат нестрогого парсинга (`lax_value`), и точные `body`/`canonical`,
  которые MUST называть строгий отказ.

Versioned `scripts/locks/corpus-inventory.0.8.lock.json`
отображает каждый относительный путь 0.8 в `valid/`, `invalid/`,
`unrepresentable/`, `parseable-unrepresentable/` и `strict-lossy/`, а
также `boundary-fixtures.json`, на его SHA-256. CI передаёт
соответствующий lock в `validate_corpus.py --corpus-inventory-lock`:

```sh
python scripts/validate_corpus.py versions/0.8/tests \
  --require-unrepresentable --require-boundary \
  --boundary-manifest-lock scripts/locks/boundary-fixtures.0.8.lock.json \
  --corpus-inventory-lock scripts/locks/corpus-inventory.0.8.lock.json
```

Каждый lock отвергает добавления, удаления, изменение содержимого и
неизвестные верхнеуровневые элементы; он дополняет, а не заменяет
semantic/schema checks.

Прохождение каждого теста из каждой категории, присутствующей в
наборе этой версии, — необходимое условие выпуска (release gate), но
само по себе недостаточное доказательство соответствия:
`boundary-fixtures.json` (0.7+) велит общему корпусу пропустить
точную побайтовую проверку Value на конкретных листах для реализации,
числовой домен которой шире минимума вдоль оси этого листа — спека
§ 8.1 / § 8.2 определяет, от чего на самом деле зависит корректность
такой реализации там (§ 5, § 5.9), и общий корпус это не проверяет.
Реализация, объявляющая более широкий числовой домен, MUST
дополнительно сверить собственное поведение с § 5 / § 5.9 для
заявленного домена — сверх того, что проверяет этот языконезависимый
набор тестов. Подключайте
директорию как git submodule (или копию).

## Схема версионирования

Версии спецификации используют `MAJOR.MINOR.PATCH`:

| Bump              | Смысл                                                                                              |
|-------------------|----------------------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)` | Редакторский — исправления опечаток, уточнения; соответствующие реализации не затрагиваются.       |
| `x.y → x.(y+1)`   | Обратно совместимое расширение (новое ключевое слово, новая примитивная форма).                    |
| `x.y → (x+1).0`   | Ломающее изменение грамматики или семантики.                                                       |

**Исключение для pre-1.0:** пока `MAJOR` равен `0`, `MINOR`-bump MAY
нести ломающее изменение вместо обязательного `MAJOR`-bump (именно
так 0.7.0 поступает относительно 0.6.x). После достижения `1.0`
ломающие изменения строго требуют `MAJOR`-bump, как указано в
таблице.

Внутри любого стабильного `MAJOR` реализация, ориентированная на
`x.0`, MUST разбирать каждый документ, валидный при любом более
позднем `x.y.z`, идентично — в пределах подмножества, которое она
поддерживает, — кроме pre-1.0 ломающего `MINOR`-bump из исключения
выше, на который эта гарантия не распространяется.

Директория каждой версии полностью самодостаточна: `spec.md`, набор
соответствия `tests/` и добавления по версиям. Реализации
привязываются к директории версии по пути.

## Структура

```
.
├── README.md              this file
├── versions.ktav          machine-readable index of released/stable versions
├── CHANGELOG.md           summary across versions
├── CONTRIBUTING.md        how to propose changes
├── LICENSE-MIT            MIT License
├── LICENSE-APACHE         Apache License 2.0
├── scripts/
│   ├── validate_corpus.py                 структурная валидация корпуса соответствия
│   ├── test_validate_corpus.py            модульные тесты для validate_corpus.py
│   ├── check_translation_parity.py        проверка паритета переводов EN/RU/ZH
│   ├── test_check_translation_parity.py   модульные тесты для check_translation_parity.py
│   ├── build_spec.mjs                     (0.7+) генерирует spec.md/.ru.md/.zh.md из content/
│   ├── test_build_spec.mjs                (0.7+) модульные тесты для build_spec.mjs (adversarial/негативные сценарии)
│   ├── archive/                           (0.7+) архивированный одноразовый бутстрап юнитов контента
│   │   └── extract_content_units.py         см. content/README.md; отказывается перезаписывать content/
│   └── locks/                             versioned lock-файлы корпуса, boundary и inventory секций
│       ├── corpus-inventory.0.8.lock.json  (0.8: пути корпуса + SHA-256)
│       ├── boundary-fixtures.0.8.lock.json (0.8: boundary-листья — fixture, path, class)
│       ├── section-inventory.0.8.lock.json (0.8: порядок секций + структурные поля)
│       ├── corpus-inventory.0.7.lock.json  (0.7: пути корпуса + SHA-256; 0.7 всё ещё в дереве)
│       ├── boundary-fixtures.0.7.lock.json (0.7: boundary-листья — fixture, path, class)
│       └── section-inventory.0.7.lock.json (0.7: порядок секций + структурные поля)
├── .github/workflows/     CI: проверка байт-идентичности content/ (0.7+), валидация корпуса,
│                          проверка паритета переводов и все три набора модульных тестов
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        ├── spec.ru.md     Russian translation of the spec
        ├── spec.zh.md     Chinese translation of the spec
        ├── content/       (0.7+) источник истины по секциям — см. content/README.md;
        │                  spec.md/.ru.md/.zh.md генерируются из него, вручную не редактируются
        └── tests/         language-agnostic conformance suite
            ├── valid/
            ├── invalid/
            ├── unrepresentable/   (0.7+)
            ├── parseable-unrepresentable/ (0.7+; пары без canonical output)
            └── boundary-fixtures.json   (0.7+) leaf-level numeric-
                        domain exemptions, not a fixture category
```

## Реализации

| Язык             | Репозиторий                                             | Установка                                            |
|------------------|---------------------------------------------------------|------------------------------------------------------|
| Rust (эталонная) | [`ktav-lang/rust`](https://github.com/ktav-lang/rust)   | `cargo add ktav`                                     |
| C# / .NET        | [`ktav-lang/csharp`](https://github.com/ktav-lang/csharp) | `dotnet add package Ktav`                          |
| Go               | [`ktav-lang/golang`](https://github.com/ktav-lang/golang) | `go get github.com/ktav-lang/golang`               |
| Java / JVM       | [`ktav-lang/java`](https://github.com/ktav-lang/java)   | GitHub Releases (публикация в Maven Central запланирована) |
| JS / TS          | [`ktav-lang/js`](https://github.com/ktav-lang/js)       | `npm install @ktav-lang/ktav`                        |
| PHP              | [`ktav-lang/php`](https://github.com/ktav-lang/php)     | `composer require ktav-lang/ktav`                    |
| Python           | [`ktav-lang/python`](https://github.com/ktav-lang/python) | `pip install ktav`                                 |

Rust crate — эталонный парсер, и каждый биндинг встраивает то же
ядро. Go, Java, PHP и C# потребляют его через сборку `ktav_cabi`
(C-ABI обёртка), набор функций которой растёт аддитивно от релиза к
релизу — в 0.6.4 добавлена `ktav_loads_strict` рядом с уже
существовавшими функциями. Python поставляет выделенное нативное
расширение на PyO3 вместо C ABI, а JS — несколько артефактов под
конкретные среды: WASM для браузеров, N-API для Node и вдобавок путь
через C ABI. Все они разбирают ту версию формата, которую
поддерживает ядро Rust (сейчас — стабильная 0.8.0); language-agnostic
набор `tests/` ниже прогоняется на всех из них при каждом релизе.

Строите новую реализацию? Начните со `spec.md` целевой версии
([`spec.ru.md`](versions/0.8/spec.ru.md), раздел 8 — Compliance)
и прогоните набор [`tests/`](versions/0.8/tests/) через свой парсер.

## Вклад

Редакторские правки в существующую версию — PR напрямую. Всё
остальное — сначала открывайте issue. См.
[`CONTRIBUTING.ru.md`](CONTRIBUTING.ru.md).

## Поддержите проект

У автора много идей, которые могут быть полезны IT во всём мире, — и
далеко не только для Ktav. Их реализация требует финансирования. Если
вы хотите помочь — пишите на **phpcraftdream@gmail.com**.

## Лицензия

Двойная лицензия **MIT OR Apache-2.0** на ваш выбор. См.
[LICENSE-MIT](LICENSE-MIT) и [LICENSE-APACHE](LICENSE-APACHE).
>>>>> lang=zh
# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** [English](README.md) · [Русский](README.ru.md) · **简体中文**

> **版本范围:** 本 README 的功能概览与示例遵循当前稳定规范 Ktav
> 0.8.0。仍以 0.7.1 为目标的实现请阅读
> [`versions/0.7/spec.zh.md`](versions/0.7/spec.zh.md)——它仍保留在
> 工作树中;两者之间的差异范围见
> [0.8.0 规范附录 E](versions/0.8/spec.zh.md)。

**演练场：** 在浏览器中互转 JSON / YAML / TOML / INI ⇄ Ktav — **[ktav-lang.github.io](https://ktav-lang.github.io/)**。

> 一种朴素的配置格式。沿用 JSON 的形态——标量、数组、对象、
> `null`、`true`、`false`——但不带 JSON 的任何标点。常见情形下
> 不用逗号、不用引号：逗号只出现在单行 inline 复合值内作分隔符，
> 封闭的 14 项转义表用于字面字节与显式的标量分类。以点分键
> 表达嵌套，以显式的可见标记声明字面字符串和多行字符串。

本仓库是 Ktav 格式的**规范正文**。任何编程语言的实现都应当符合
其所针对的版本。

## 尝一口

一个调动格式所有主要形式的例子 —— `:` 对(裸数字按形式定型,其余
皆为 String)、关键字 Bool、`::`(强制字面 String)、点分键、嵌套
复合值、多行字符串。

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
## `::` 强制字面字符串 —— 密码中的冒号 ':' 得以保留。
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

解析为下列 Value(以 JSON5 形式展示,带注释与无引号键以便阅读)。
注意各值的对应关系:

- `:` 跟裸整数 body(`20082`)—— Integer;跟裸小数 body(`0.7`)
  —— Float;其余任何 body(`info`、正则、路径)—— String,逐字
  保留,即便内容像数字。
- `: true` / `: false` / `: null` —— 关键字 Bool / Null。
- `::` —— 强制字面 String,不进行分类。

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

### 数字按词法形式定型

在最小必需数值域中,格式按 body 的*形状*定型:裸整数成为 Integer,
裸小数成为 Float,其余一切保持为 String。无需标记。任何只是*看起来*
像数字、却并非裸数字的内容(版本号、标签)都不会被转换 —— 而 `::`
可在需要时强制一个真正的裸数字保持为字面字符串。在该最小域中,
超出 i64 范围的裸整数,或者在 binary64 上溢出为非有限的裸小数,
反而保持为 String;更宽的实现 MAY 将该边界字面量分类为 Integer
或 Float。在*被测实现的域中下溢*的小数仍然成为 Float,并在该域中
舍入到带符号的 `0.0`,而非 String;若更宽的域中不发生下溢,则保留
非零 Float。抽象的程序化 Float 载体 MUST 区分 NaN、+Infinity 与
-Infinity,以便 writer-conformance 提供三个非有限 sentinel;这些
sentinel 位于可解析域与规范域之外。解析产生的 Float 是有限值,属于
声明的 Float 域。该域包括十进制转换与舍入语义,并 MUST 只接纳
有限 Float。每个非零有限 Float MUST 拥有可精确 round-trip 的有限
十进制表示;
带符号零另行处理,保持为 `0.0` / `-0.0`;最小 binary64 转换使用
`roundTiesToEven`。不支持的精确有理值(如 `1/3`)不属于声明的 Ktav
Float 域,也不是可解析或规范 Float。

```text
retries: 3
version: 1.2
build:: 0007
label: v1.2
```

```json5
{
  retries: 3,        // 裸整数 — Integer
  version: 1.2,      // 裸小数 — Float
  build: "0007",     // `::` — 强制字面 String
  label: "v1.2",     // 并非裸数字 — String
}
```

### 用 `::` —— 关键字与括号变成普通字符串

当 body 会被分类为关键字（`null`、`true`、`false`）、空复合值
（`{}`、`[]`）或开启复合值（`{`、`[`）时，需要用原始 `::` 标记才能
让它成为普通 String。

```text
## 若不用 `::` 会变成 Bool true —— 此处是字符串 "true"。
on_release:: true
## 以 `[` 开头 —— `::` 阻止"开启数组"的解释。
regex::      [a-z]+
## IPv6 地址字面量 —— 同理。
ipv6::       [::1]:8080
## `null` 关键字用作字面的四个字符的字符串。
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

## 格言

> **做配置的朋友，别做它的考官。配置并不完美——但已是最好的那一份。**

每条规则都是局部的。每一行要么独立成立，要么只依赖于它上方显式可见
的括号。不会踩到缩进陷阱，不会忘记引号，也没有尾随逗号的算术。

## 为什么选 Ktav

| 特性                                           | JSON | YAML | TOML | Ktav |
|------------------------------------------------|:----:|:----:|:----:|:----:|
| 无需强制引号的裸字符串                         |  ✗   |  ~   |  ✗   |  ✓   |
| 无逗号的列表                                   |  ✗   |  ✓   |  ✓   |  ✓   |
| 空白不敏感(不存在缩进陷阱)                   |  ✓   |  ✗   |  ✓   |  ✓   |
| 便于手写的多行字符串                           |  ✗   |  ~   |  ~   |  ✓   |
| 原生注释                                       |  ✗   |  ✓   |  ✓   |  ✓   |
| 支持点分键做平铺式编辑                         |  ✗   |  ✗   |  ✓   |  ✓   |
| 单一解析器、规范精简                           |  ✓   |  ✗   |  ~   |  ✓   |

> ✓ = 具备该特性 · ✗ = 不具备 · ~ = 部分具备

Ktav 保留了 JSON 的形态（你始终清楚一个文档意味着什么），却抛弃了
令 JSON 手写起来刺眼的语法。它借鉴了 TOML 的点分键（便于平铺式编辑
与 CLI 覆盖），又摒弃了 TOML 把内容拆成表格与 inline 两种维度的做法。

## 一屏看完的规则

Ktav 文档的根是由首条内容行决定的 Object 或 Array。任何对象里是键值对，
任何数组里是元素。

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

整个语言就这些。常见情形下无需逗号与引号 —— 逗号只作为单行
inline 复合值内的分隔符出现 —— 另有一条封闭的 14 项转义表,
用于字面字节与显式的标量分类。`::` 标记（出现在分隔符里
用于键值对，或行首前缀里用于数组元素）强制取字面字符串。

### 点分键

键可以是点分路径。下面这两份文档是*等价*的：

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

点分键可以与嵌套写法自由混用，解析器都会构造出同一棵树。常用场景：

- CLI/环境变量覆盖（`--set server.port=9090`）。
- 在小型配置中做局部修改而不重组结构。
- 起初扁平、根据需要再长出嵌套段落的文件。

解码后内容以 `##` 开头的键可以使用 bare 输入
`\u0023#a\:b: 1`;其中 `\u0023` escape 是可接受的输入。但规范 writer
MUST 改用引号包围该键,例如 `"##a:b": 1`,这样输出不会被误读为注释。

### 字符串，直给

非复合标量 body 在分类前会修剪两端。非空且不属于关键字或数字
字面量的 body 是 String,所以内部空白与标点都属于值。没有引号
意味着没有引号规则——路径、URL、正则、含标点的令牌都可以直接写。

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
padded:   hello
```

这里 `padded` 的 String 值是 `hello`:分隔符 padding 与 body 两端
空白会在分类前修剪。当字符串可能与语法冲突（以 `{` 或 `[` 开头、
等于 `true` 之类的关键字,或恰好等于 `(`、`((`、`()`、`(())` 之一）
时，将分隔符改为 `::`:

```text
literal_bracket:: [
keyword_as_string:: true
```

### 数字,按形式定型

在最小必需数值域中,裸数字会被直接定型:`port: 8080` 给你
Integer,`ratio: 0.5` 给你 Float。由 body 的形状决定:只有数字 →
Integer;带小数点或指数 → Float;其余一切 → String。在最小数值
边界上,超出 i64 范围的整数,或者在 binary64 上溢出为非有限的小数,
会保持为 String,而不是回绕或抛出错误;更宽的域 MAY 将同一边界
字面量分类为 Integer 或 Float。在*实现域中下溢*的小数仍然成为
Float,并在该域中舍入到带符号的 `0.0`;若更宽的域中不发生下溢,
则保留非零 Float。抽象的程序化 Float 载体 MUST 区分 NaN、+Infinity
与 -Infinity,供 writer-conformance 使用;这些 sentinel 位于可解析域
与规范域之外。解析产生的 Float 是有限值,属于声明的 Float 域,该域
包括十进制转换与舍入语义;每个被
接纳的非零有限 Float MUST 有一个可精确 round-trip 的有限十进制候选。
带符号零另行处理,保持为 `0.0` / `-0.0`;最小 binary64 转换使用
`roundTiesToEven`。主机表示中没有这种候选的有限值(例如精确有理数
`1/3`)位于声明的 Ktav Float 域之外,也不是可解析或规范 Float。

```text
port:    8080
ratio:   0.5
offset:  -100
eps:     1.5e-10
```

数字是携带数值的 Value,并不保留书写时的原文——写出时采用规范化
的规范形式（规范文档 5.9.8 节），因此 `0.50` 回来会变成 `0.5`,
`1e2` 变成 `100.0`(即便是整数值的 Float,小数点也保留,这样
重新解析不会把它变成 Integer)。保证范围内的裸整数作为 Integer 精确往返;
i64（对 Integer）与 binary64（对 Float）是每个实现都保证的可移植
最小域——实现可以支持更宽的域（任意精度/十进制），超出其自身
支持范围的溢出字面量会落入 String。类型化
语言的消费方（Rust + serde、Go）在自己那边收窄到所需的原生类型;
若要让看起来像数字的值——无论多大——保持为文本,用 `::` 强制
（`zip:: 01007`）。

### 多行字符串

两种形式，用途不同：

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

`(` 会剥除公共前导缩进——在文件里按可读的方式书写代码/文本，结果
依然干净。`((` 在换行符规范化后保留每个内容行的字节,但不保留整个
文档的字节。

### 关键字

仅小写：`null`、`true`、`false`。其它写法——`Null`、`TRUE`、`yes`、
`on`——都是普通字符串。不做任何类型魔法，也没有随版本漂移的「陷阱清单」。

```text
port: 8080
active: true
timeout: null
```

```json5
{
  port: 8080,     // 裸整数 → Integer
  active: true,   // 关键字 → 原生 JSON bool
  timeout: null,  // 关键字 → 原生 JSON null
}
```

## 完整规范

- **当前稳定版本：** [Ktav 0.8.0](versions/0.8/spec.zh.md) — 发布于 2026-09-19;本 README 的功能概览遵循该版本。
- **上一个稳定版本：** [Ktav 0.7.1](versions/0.7/spec.zh.md) — 发布于
  2026-09-16。
- **已发布/稳定版本的机器可读索引：** [`versions.ktav`](versions.ktav)。
- **跨版本的历史记录：** [`CHANGELOG.zh.md`](CHANGELOG.zh.md)。

## 一致性测试套件

每个版本都附带一份与语言无关的测试套件，位于
[`versions/<v>/tests/`](versions/0.8/tests/)。0.8.0 语料库有五个
fixture 类别(`valid/`、`invalid/`、`unrepresentable/`、
`parseable-unrepresentable/` 和 `strict-lossy/`)外加一个顶层元数据
文件。更早的语料库类别更少——0.7.1 套件只有前四个;位于 `v0.6.4`
标签的 0.6.4 套件只有 `valid/` 与 `invalid/`。
一致性 runner MUST 遍历目标版本中
存在的每个 fixture 类别——静默跳过不认识的类别会得到假绿色结果,比该
类别完全没有 fixture 还糟。

- **`boundary-fixtures.json`**（*0.7 起,并非 fixture 类别*）——一份
  叶级清单,列出本属正常 `valid/` fixture 内、已知会探测数值域边界的
  单个 Object 字段(spec § 5.2、§ 8.1、§ 8.2),例如 i64 溢出或 Float
  溢出的字面量,并标注它探测的轴(`integer_range`、`float_range`、
  `float_underflow`、`float_precision`)。它位于 `tests/` 根目录、
  而非 `valid/` 之内,正是为了让按 `valid/**/*.json` 枚举 fixture 的
  runner 永远不会把它误认为一个 fixture。在其中列出某个叶并不说明
  更宽域的实现在该字段处必须输出什么——只是说明实现豁免于逐字节
  匹配,且仅当它在该特定轴上确实支持宽于最小域的域;同一 fixture 的
  其他任何字段,以及未列出的任何 fixture 或字段,不对任何实现给予
  豁免。
- **`valid/`**——可解析的文档。每个用例是
  `<name>.ktav` + `<name>.json` + `<name>.canonical.ktav` 三元组：
  `.ktav` 是输入;`.json` 是期望解析出的 `Value`,按 1:1 映射
  (`Null`→`null`、`Bool`→`bool`、`String`→`string`、
  `Array`→`array`、`Object`→`object`)。不含 `.`、`e` 或 `E` 的 JSON
  数字 token 表示 Integer;含其中任一项的 token 表示 Float,包括
  `-0.0`。其余标量保持为字符串,`::` 强制字面字符串;
  `.canonical.ktav` 是该同一
  `Value` 期望的字节级精确 writer 输出。对象字段顺序是有意义的。
- **`invalid/`**——conforming 解析器 MUST 拒绝的文档。每个用例是
  `<name>.ktav` + `<name>.json` 一对;`.json` 在 `expected_error`
  字段中指明期望的错误类别。
- **`unrepresentable/`***(0.7 起)*——conforming writer MUST 拒绝
  序列化、而非输出 lossy 或部分内容的 `Value`。这些是只能编程
  构造的情形,每个用例只有一个 `<name>.json`,且恰好包含 `value`、
  `unrepresentable_reason` 与非空 `note`;Value 映射及 `$float`
  sentinel 的精确形状见 § 5.9.0。该 sentinel 仅限于此 fixture 编码的
  上下文,不会把 `$float` 保留为 parser Object 的键名。对于
  `NonFiniteFloat`,它表示抽象程序化 Float 载体,而不是解析所得或规范
  Float,并位于节点可表示性之外。原因代码 MUST
  在树中有递归见证,
  且只能是 `ScalarRoot`、`EmptyKeyName` 或 `NonFiniteFloat`,
  MUST NOT 从文件名推导。
- **`parseable-unrepresentable/`***(0.7 起)*——解析器产生、但
  conforming writer MUST 拒绝的 Value。每个用例是
  `<name>.ktav` + `<name>.json` 一对;解析输入 MUST 产生 JSON `value`,
  写出 MUST 以指定原因代码失败。只允许 String 原因 `CRByte`、
  `BothFormsRequired`、`TrailingWhitespaceCollision` 和
  `LeadingWhitespaceCollision`;这些是 pair 而非 triple,没有其他文件,
  也没有 canonical-output 文件。
- **`strict-lossy/`***(0.8 起)*——其词法形式被宽松入口
  (`parse`/`loads`)接受并悄悄规范化、但被严格入口
  (`parse_strict`/`loads_strict`)MUST 以 `LossyScalar` 拒绝的标量。
  每个用例是 `<name>.ktav` + `<name>.json` 一对;`.json` 同时给出
  宽松解析的结果(`lax_value`)与严格拒绝 MUST 指明的精确
  `body`/`canonical`。

Versioned `scripts/locks/corpus-inventory.0.8.lock.json` 将 0.8
`valid/`、`invalid/`、`unrepresentable/`、`parseable-unrepresentable/`、
`strict-lossy/` 中的每个 corpus-relative 文件路径及
`boundary-fixtures.json` 映射到其 SHA-256。CI 将对应的 lock
传给 `validate_corpus.py --corpus-inventory-lock`：

```sh
python scripts/validate_corpus.py versions/0.8/tests \
  --require-unrepresentable --require-boundary \
  --boundary-manifest-lock scripts/locks/boundary-fixtures.0.8.lock.json \
  --corpus-inventory-lock scripts/locks/corpus-inventory.0.8.lock.json
```

每个 lock 都会拒绝新增、删除、内容漂移与未知顶层条目;lock 补充而不取代
semantic/schema 检查。

通过该版本测试套件中每个存在类别的全部测试,是通过发布的必要门槛,
但本身并不足以证明合规:`boundary-fixtures.json`(0.7 起)告诉共享
语料库,对在该叶的轴上数值域宽于最小域的实现,跳过特定叶的精确
字节/Value 检查——spec § 8.1 / § 8.2 定义了这类实现在那里的正确性
实际取决于什么(§ 5、§ 5.9),而共享语料库并不验证它。声明更宽
数值域的实现 MUST 额外针对 § 5 / § 5.9 验证其自身在其所声称域上的
行为,超出本语言无关测试套件所检查的范围。可以把目录作为 git
submodule 引入(或直接拷贝)。

## 版本方案

规范版本采用 `MAJOR.MINOR.PATCH`：

| 递进                | 含义                                                                                   |
|---------------------|----------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)`   | 编辑性——错字修正、措辞澄清；符合规范的实现不受影响。                                   |
| `x.y → x.(y+1)`     | 向后兼容的扩展（新关键字、新的原始形式）。                                             |
| `x.y → (x+1).0`     | 语法或语义上的破坏性变更。                                                             |

**pre-1.0 例外：** 当 `MAJOR` 为 `0` 时，`MINOR` 递进 MAY 携带
破坏性变更，而不必强制 `MAJOR` 递进(0.7.0 相对 0.6.x 正是如此）。
一旦格式达到 `1.0`，破坏性变更将严格要求 `MAJOR` 递进，如上表
所述。

在任一稳定 `MAJOR` 内，面向 `x.0` 的实现 MUST 将任何在更晚 `x.y.z`
下有效的文档解析为与其支持子集等价的结果 —— 但上述 pre-1.0 例外
所允许的破坏性 `MINOR` 递进除外，此保证不跨此类递进成立。

每个版本的目录完全自包含：`spec.md`、一致性套件 `tests/` 以及该版本
专属的增补。实现按路径锁定到具体版本目录。

## 目录结构

```
.
├── README.md              this file
├── versions.ktav          machine-readable index of released/stable versions
├── CHANGELOG.md           summary across versions
├── CONTRIBUTING.md        how to propose changes
├── LICENSE-MIT            MIT License
├── LICENSE-APACHE         Apache License 2.0
├── scripts/
│   ├── validate_corpus.py                 一致性语料库的结构校验
│   ├── test_validate_corpus.py            validate_corpus.py 的单元测试
│   ├── check_translation_parity.py        EN/RU/ZH 翻译对等性检查工具
│   ├── test_check_translation_parity.py   check_translation_parity.py 的单元测试
│   ├── build_spec.mjs                     (0.7+) 从 content/ 生成 spec.md/.ru.md/.zh.md
│   ├── test_build_spec.mjs                (0.7+) build_spec.mjs 的对抗性单元测试(负面路径)
│   ├── archive/                           (0.7+) 已归档的一次性内容单元引导脚本
│   │   └── extract_content_units.py         见 content/README.md;拒绝覆盖已存在的 content/
│   └── locks/                             语料库、boundary 与 section inventory 的 versioned 锁文件
│       ├── corpus-inventory.0.8.lock.json  (0.8: 语料库路径 + SHA-256)
│       ├── boundary-fixtures.0.8.lock.json (0.8: 边界叶节点 — fixture、path、class)
│       ├── section-inventory.0.8.lock.json (0.8: 有序节列表 + 结构元数据)
│       ├── corpus-inventory.0.7.lock.json  (0.7: 语料库路径 + SHA-256;0.7 仍在工作树中)
│       ├── boundary-fixtures.0.7.lock.json (0.7: 边界叶节点 — fixture、path、class)
│       └── section-inventory.0.7.lock.json (0.7: 有序节列表 + 结构元数据)
├── .github/workflows/     CI:content/ 逐字节一致性检查(0.7 起)、语料库校验、
│                          翻译对等性检查,以及全部三套单元测试
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        ├── spec.ru.md     Russian translation of the spec
        ├── spec.zh.md     Chinese translation of the spec
        ├── content/       (0.7+) 逐节来源——见 content/README.md;
        │                  spec.md/.ru.md/.zh.md 由 content/ 生成,切勿手动编辑
        └── tests/         language-agnostic conformance suite
            ├── valid/
            ├── invalid/
            ├── unrepresentable/   (0.7+)
            ├── parseable-unrepresentable/ (0.7+; pair,无 canonical output)
            └── boundary-fixtures.json   (0.7+) leaf-level numeric-
                        domain exemptions, not a fixture category
```

## 实现

| 语言            | 仓库                                                    | 安装                                                  |
|-----------------|---------------------------------------------------------|-------------------------------------------------------|
| Rust(参考)    | [`ktav-lang/rust`](https://github.com/ktav-lang/rust)   | `cargo add ktav`                                      |
| C# / .NET       | [`ktav-lang/csharp`](https://github.com/ktav-lang/csharp) | `dotnet add package Ktav`                          |
| Go              | [`ktav-lang/golang`](https://github.com/ktav-lang/golang) | `go get github.com/ktav-lang/golang`               |
| Java / JVM      | [`ktav-lang/java`](https://github.com/ktav-lang/java)   | GitHub Releases（Maven Central 已规划）              |
| JS / TS         | [`ktav-lang/js`](https://github.com/ktav-lang/js)       | `npm install @ktav-lang/ktav`                         |
| PHP             | [`ktav-lang/php`](https://github.com/ktav-lang/php)     | `composer require ktav-lang/ktav`                     |
| Python          | [`ktav-lang/python`](https://github.com/ktav-lang/python) | `pip install ktav`                                  |

Rust crate 是参考解析器,每个绑定内嵌的都是同一个核心。Go、Java、
PHP 和 C# 通过预构建的 `ktav_cabi`(C-ABI 包装)使用它,其函数接口
在各版本间只做增量式扩展——0.6.4 新增了 `ktav_loads_strict`,已有
函数的签名保持不变。Python 附带专用的 PyO3 原生扩展而非 C ABI;
JS 则为不同运行时提供多种构件——浏览器用 WASM、Node 用 N-API,
另有 C ABI 路径——而非单一的绑定形态。它们解析的都是底层 Rust
核心所支持的格式版本(当前为稳定版 0.8.0);
下面与语言无关的
`tests/` 套件每次发布时都会针对所有实现运行。

打算写新实现?请先读目标版本的 `spec.md`
([`spec.zh.md`](versions/0.8/spec.zh.md) 的第 8 节 Compliance),
再让 [`tests/`](versions/0.8/tests/) 套件跑过你的解析器。

## 贡献

在已有版本内做编辑性修订——直接提 PR。其它改动——先开 issue。详见
[`CONTRIBUTING.zh.md`](CONTRIBUTING.zh.md)。

## 支持本项目

作者有许多构想,可能对全球 IT 广泛有益——不局限于 Ktav。实现这些
构想需要资金支持。如果您愿意提供帮助,请联系
**phpcraftdream@gmail.com**。

## 许可证

双重许可 **MIT OR Apache-2.0**,由您选择。见 [LICENSE-MIT](LICENSE-MIT)
与 [LICENSE-APACHE](LICENSE-APACHE)。
