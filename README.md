# Ktav (כְּתָב)

**Languages:** **English** · [Русский](README.ru.md) · [简体中文](README.zh.md)

> A plain configuration format. JSON-shape — scalars, arrays, objects,
> `null`, `true`, `false` — with none of JSON's punctuation. No quotes
> around strings, no commas, no escape table. Dotted keys for nesting,
> visible opt-in markers for literal and multi-line strings.

This repository is the **canonical specification** of the Ktav format.
Implementations in any programming language are expected to conform to
the version they target.

## A taste

One example that exercises every major form the format offers —
default `:` (String), keyword Bool, typed `:i` (Integer) and `:f`
(Float), raw `::` (literal String), dotted keys, nested compounds,
and a multi-line string.

```text
# A config for a SOCKS5 rotator.
port:i 20082
log_level: info
debug: true

banned_patterns: [
    .*\.onion:\d+
    .*\.local
]

upstreams: [
    {
        host: a.example
        port:i 1080
        weight:f 0.7
        timeouts: {
            read:i 30
            write:i 10
        }
    }
    {
        host: b.example
        port:i 1080
        weight:f 0.3
    }
]

# Dotted keys — flat alternative to nesting.
node.host: a.example
node.port:i 1080
# `::` forces a literal string — keeps the ':' inside the password.
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

Parses to this value (shown as JSON5 — comments and unquoted keys for
readability). Note how the markers map:

- `:` — default String, stays a string at Value level even for digit
  content (`log_level: "info"`, `banned_patterns[0]: "…"`).
- `: true` / `: false` / `: null` — Bool / Null keywords.
- `:i` — Integer as native JSON number.
- `:f` — Float as native JSON number (with decimal point).
- `::` — raw String, no classification applied.

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

### Without `:i` / `:f` — numbers stay strings

The format never auto-detects number-looking bodies; typing is
explicit and opt-in. Without a marker, every scalar is a String at
the Value level. Consumers that want native numbers either mark the
value with `:i` / `:f` or cast at their own boundary (Rust + serde
does this automatically through `FromStr`).

```text
retries: 3
version: 1.2
ratio:f 0.5
count:i 42
```

```json5
{
  retries: "3",      // plain `:` — String
  version: "1.2",    // plain `:` — String
  ratio: 0.5,        // :f — native JSON number
  count: 42,         // :i — native JSON number
}
```

### With `::` — keywords and brackets as plain strings

A body that would otherwise be classified as a keyword (`null`,
`true`, `false`), an empty compound (`{}`, `[]`), or start a compound
(`{`, `[`) needs the raw `::` marker to come out as a plain String.

```text
# Would be Bool true without `::` — here it's the string "true".
on_release:: true
# Starts with `[` — `::` prevents "open array" interpretation.
regex::      [a-z]+
# IPv6 address literal — same reason.
ipv6::       [::1]:8080
# `null` keyword used as a literal four-char string.
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
# comment              — any line starting with '#'
key: value             — scalar pair; value is a String (default)
key:: value            — scalar pair; value is ALWAYS a literal string
key:i value            — scalar pair; value is an Integer (digits only)
key:f value            — scalar pair; value is a Float (needs decimal)
key: { ... }           — multi-line object; `}` closes on its own line
key: [ ... ]           — multi-line array; `]` closes on its own line
key: {}   /   key: []  — empty compound, inline
key: ( ... )           — multi-line string; common indent stripped
key: (( ... ))         — multi-line string; verbatim (no stripping)
:: value               — inside an array: literal-string item
:i value               — inside an array: Integer item
:f value               — inside an array: Float item
```

That's the whole language. No commas, no quotes, no escape table — the
only "escape" is the `::` marker, and it lives in the separator (for
pairs) or as a line prefix (for array items).

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

### Numbers, when you want them

By default a numeric-looking value is a string — `port: 8080` gives
you `"8080"`. Typed-language consumers (Rust + serde, Go) cast that
to a real number at their boundary without any format cooperation.

For dynamic-language consumers (JS, PHP, Python), opt into typed
values with `:i` (Integer) or `:f` (Float):

```text
port:i   8080
ratio:f  0.5
offset:i -100
eps:f    1.5e-10
```

Values are still preserved as their textual form at the Value level
— `Integer("8080")`, `Float("0.5")` — so 40-digit integers survive
round-trip and `1.2` is never accidentally coerced into a Number.
The consumer narrows to the native type it wants.

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
  port: "8080",   // plain `:` — String, not a number
  active: true,   // keyword → native JSON bool
  timeout: null,  // keyword → native JSON null
}
```

## Full specification

- **Current stable:** [Ktav 0.1.0](versions/0.1/spec.md) — released 2026-04-22.
- **Machine-readable index** of all versions: [`versions.ktav`](versions.ktav).
- **History across versions:** [`CHANGELOG.md`](CHANGELOG.md).

## Conformance test suite

Every version ships a language-agnostic test suite under
[`versions/<v>/tests/`](versions/0.1/tests/). Pairs of
`<name>.ktav` + `<name>.json` — the `.json` is the expected `Value`,
mapped 1:1 for plain scalars (`Null`→`null`, `Bool`→`bool`,
`String`→`string`, `Array`→`array`, `Object`→`object`; plain-`:`
numeric bodies stay as strings at Value level). Typed scalars
(`:i` / `:f`) are encoded as native JSON numbers — `8080` for
Integer, `0.5` for Float — distinguished by the presence of a
decimal point. See [`versions/0.1/tests/README.md`](versions/0.1/tests/README.md)
for the full oracle. Object field order is significant.

An implementation conforms to a version if it passes every test in
that version's suite. Consume the directory as a git submodule (or
copy it); see [`versions/0.1/tests/README.md`](versions/0.1/tests/README.md).

## Version scheme

Spec versions use `MAJOR.MINOR.PATCH`:

| Bump              | Means                                                                                        |
|-------------------|----------------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)` | Editorial — typo fixes, clarifications; conforming implementations are unaffected.           |
| `x.y → x.(y+1)`   | Backward-compatible extension (new keyword, new primitive form).                             |
| `x.y → (x+1).0`   | Breaking change in grammar or semantics.                                                     |

Within any stable `MAJOR`, an implementation targeting `x.0` MUST
parse every document valid under any later `x.y.z` identically up to
the subset it supports.

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
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        └── tests/         language-agnostic conformance suite
            ├── README.md
            ├── valid/
            └── invalid/
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

The Rust crate is the reference parser; every other binding ships a
prebuilt `ktav_cabi` (the C ABI wrapper) and exposes the same Ktav
0.1 surface — the language-agnostic `tests/` suite below runs against
all of them on every release.

Building a new implementation? Start with your target version's
[`spec.md`](versions/0.1/spec.md) (section 8 — Compliance) and run
the [`tests/`](versions/0.1/tests/) suite against your parser.

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
