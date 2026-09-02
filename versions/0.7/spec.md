# Ktav — The Written Configuration Format

**Languages:** **English** · [Русский](spec.ru.md) · [简体中文](spec.zh.md)
**Version:** 0.7.0
**Date:** (unreleased — 0.7 draft, normative text and fixtures only)

## Abstract

Ktav is a plain-text configuration format designed so that every line
either stands on its own or depends only on explicit, visible brackets.
It offers JSON-shape (scalars, arrays, objects, `null`, booleans) with
none of JSON's punctuation: no quotes around strings, no escape
sequences in the common case. Nested keys use a dotted path.
Multi-line strings and inline compounds use small, visible opt-in
markers.

This document specifies the syntax and semantics of the format at
version 0.7.0. Implementations in any programming language may claim
"Ktav 0.7.0 compliance" iff they satisfy every normative statement
below.

0.7.0: § 3.3 whitespace changes from an implementation-defined `MAY`
to a fixed, exhaustively-enumerated 25-code-point `MUST` (§ 3.3);
§ 4's key-segment trimming widens from ASCII-only to the same fixed
set, resolving a standing internal contradiction; adds the `\uXXXX`
escape (§ 3.7.1); the `(…)` multi-line string form now also strips
trailing whitespace from every content line — `(…)` already removed
each line's shared leading indent (§ 5.6). Two independently-scoped breaking
changes: value/key-edge trimming now covers the 19 non-ASCII
code points in the § 3.3 set in addition to space/tab — non-breaking
in practice against every 0.6.x Rust-core release, which already
trimmed the full set there; the `(…)` trailing-edge strip is
breaking even for the Rust core, which previously preserved
trailing whitespace (including plain ASCII space/tab) on every line
of a stripped-form block.

## 1. Introduction

A Ktav document is a sequence of lines that together describe a
hierarchical object or array. Typical use is application
configuration, where the document is written by humans, read by
programs, and diffed in version control.

The format's guiding principle is:

> **Every rule is local. Every line's meaning either is self-evident or
> depends only on visible brackets above it.**

This rules out indentation-significant whitespace (YAML),
trailing-comma arithmetic (JSON), anchors and aliases (YAML), schema
directives, and heredoc markers that cross many lines.

Compared with 0.1.x, version 0.7.0:

- Drops the typed markers `:i` and `:f`. Numbers, booleans and `null`
  are inferred from the lexical form of the scalar instead. The raw
  marker `::` is kept to force a literal String when the textual form
  would otherwise match a number / keyword.
- Adds inline compounds — `{key: value, key2: value}` and
  `[v1, v2, v3]` — usable as a value or as the entire document.
- Replaces single `#` comments with **double `##`** comments that
  occupy a whole line. A single `#` is now an ordinary character.

Compared with 0.5.0, version 0.7.0:

- Keys now process the full escape-sequence set (§ 3.7). Two new
  escapes — `\.` (literal dot) and `\:` (literal colon) — allow
  key segments to contain characters that were previously structural.
  **Breaking:** a literal backslash in a key now requires `\\`.

## 2. Conventions

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and
**MAY** in this document are to be interpreted as described in RFC 2119
when they appear in all capitals. A lowercase use of these words is
ordinary English.

## 3. Lexical Structure

### 3.1 Character Set

A Ktav document is a sequence of Unicode code points encoded as UTF-8.
Implementations MUST reject documents that are not valid UTF-8.

### 3.2 Lines

A line terminator is one of three byte sequences:

- `LF` (`0x0A`)
- `CR` (`0x0D`)
- `CR LF` (`0x0D 0x0A`)

Implementations MUST treat all three as equivalent line terminators.
A document MAY have a final line without a trailing terminator.

A `CR` byte never appears as a content byte at parse time: it is
always a terminator (alone or paired with a following `LF`). A
String value can carry a `CR` byte only via the `\r` escape sequence
inside an inline scalar (§ 3.7, § 5.8); such a Value is not
representable in canonical form (§ 5.9.7).

Inside an inline compound (§ 5.8), the parser MUST NOT cross a line
terminator: an unclosed inline compound at end-of-line is an error
(§ 6.11).

### 3.3 Whitespace

A **whitespace** code point is one of the following twenty-five,
enumerated exhaustively — this is Unicode's `White_Space` property as
of Unicode 6.3 (2013), fixed here as a closed list rather than by
reference to "the current version of Unicode":

`U+0009`, `U+000A`, `U+000B`, `U+000C`, `U+000D`, `U+0020`, `U+0085`,
`U+00A0`, `U+1680`, `U+2000`–`U+200A`, `U+2028`, `U+2029`, `U+202F`,
`U+205F`, `U+3000`.

Implementations MUST recognise exactly this set, no more and no
fewer, wherever this specification says "whitespace" or "trimmed" —
never delegate to a host language's built-in Unicode-whitespace
primitive, even one that currently matches this list exactly (Rust's
`char::is_whitespace()` is `White_Space`-exact today): distinct
language runtimes disagree with this list in both directions (for
example, Python's `str.isspace()` additionally treats the ASCII
control bytes `U+001C`–`U+001F` as whitespace; JavaScript's `\s`
regex class fails to recognise `U+0085`), and depending on a moving,
per-runtime definition would silently reintroduce the
cross-implementation identity gap this rule exists to close. `LF`
(`U+000A`) and `CR` (`U+000D`) are members of this set for
completeness, but are consumed by the line-terminator rules (§ 3.2)
before whitespace-trimming ever applies to them — they are never
treated as an ordinary in-line separator.

Whitespace at the beginning of a line is **indentation** and is
significant for human readability only — the parser ignores it
(except as a separator inside line tokens). Whitespace inside line
tokens and around inline-compound delimiters is optional everywhere
the grammar permits it (§ 4); implementations MAY emit canonical
formatting with explicit single-space separators.

This is the single definition of whitespace used throughout this
specification — for line-level structural recognition (comment
markers, blank lines, compound openers/closers, § 4's grammar
notation) exactly as much as for trimming the edges of key segments,
scalar values, and multi-line string content (§ 5.6). There is no
separate, narrower "structural" whitespace concept.

### 3.4 Comments

A **comment** is a line whose first non-whitespace code points are `##`
(two ASCII `#` bytes). The rest of the line, up to and including the
line terminator, is the comment body. Comments produce no Value and
are ignored.

A single `#` byte has no special meaning: `#-prefixed` text on a line
without a leading `##` is an ordinary scalar / key character.

Comments MUST occupy their own line; trailing comments at the end of
a content line are not supported. Since comments are recognised only
at the start of a trimmed line, the literal byte pair `##` in the
middle of a value, key, or other content is just two `#` characters
and needs no escape — there is no `\#` escape sequence in 0.7.0.

### 3.5 Blank Lines

A **blank line** is a line consisting only of whitespace code points.
Blank lines produce no Value and are ignored, with the exception of
content inside multi-line strings (§ 5.6).

### 3.6 Number Literals

An **integer literal** matches the following grammar (where `*` is
zero-or-more, `+` is one-or-more, `?` is optional, `|` is alternation):

```
integer        ::= sign? ( hex | oct | bin | dec )
sign           ::= "+" | "-"
hex            ::= "0x" hex_digit (("_")? hex_digit)*
oct            ::= "0o" oct_digit (("_")? oct_digit)*
bin            ::= "0b" bin_digit (("_")? bin_digit)*
dec            ::= dec_digit (("_")? dec_digit)*
hex_digit      ::= [0-9a-fA-F]
oct_digit      ::= [0-7]
bin_digit      ::= [0-1]
dec_digit      ::= [0-9]
```

Underscore separators are allowed **between** two consecutive digits.
A leading underscore, a trailing underscore, two consecutive
underscores, or an underscore directly after the base prefix
(`0x_`, `0o_`, `0b_`) make the literal **not** an integer; the textual
form falls through to String per § 5.2.

A **float literal** matches one of the following two alternatives:

```
float          ::= sign? dec_part "." dec_part exponent?
                 | sign? dec_part exponent
dec_part       ::= dec_digit (("_")? dec_digit)*
exponent       ::= ("e" | "E") sign? dec_part
```

The first alternative requires both a decimal point and digits on
each side of the point (an exponent is optional). The second
alternative requires an exponent (no decimal point). A pure run of
digits with no `.` and no exponent is an integer (above), not a float.
Forms like `1.`, `.5`, `1.2.3`, `1e`, `1e+` do not match either
alternative and fall through to String.

### 3.7 Escape Sequences

Inside an **inline scalar value** (the body of a pair value or array
item that appears inside an inline compound, § 5.8) and inside
**keys** (the key portion of a pair, § 5.3), a backslash byte `\`
begins an **escape sequence**. The following **eleven** escape
sequences are recognised; each is replaced by the indicated byte or
code point before further classification (§ 5.2 for values) or
key-segment splitting (§ 4 for keys). A position consumed by any
recognised escape — named or `\uXXXX` — is never re-examined as a
structural delimiter (dotted-path dot, pair-separator colon, inline
comma/brace/bracket): this holds uniformly, regardless of which of
the eleven forms produced the decoded byte.

| Sequence | Replacement |
|----------|-------------|
| `\\`     | `\` (one backslash byte) |
| `\,`     | `,` |
| `\}`     | `}` |
| `\]`     | `]` |
| `\{`     | `{` |
| `\[`     | `[` |
| `\n`     | LF (`0x0A`) |
| `\r`     | CR (`0x0D`) |
| `\.`     | `.` (literal dot — does NOT split a dotted key segment) |
| `\:`     | `:` (literal colon — does NOT act as the key/value separator) |
| `\uXXXX` | the Unicode code point `U+XXXX` — see below |

The four bracket-escape forms (`\}`, `\]`, `\{`, `\[`) exist for
symmetry: any byte that could open or close an inline compound has
an explicit literal form. `\{` and `\[` are most useful at the
*start* of an inline scalar value — where an unescaped `{` or `[`
would open a nested compound — but the parser accepts them
anywhere in the inline-scalar context.

The two key-oriented escapes (`\.`, `\:`) allow a key segment
to contain a literal dot or colon — characters that are otherwise
structural (dot separates path segments; colon separates the key
from its value). Example: `a\.b: v` produces the flat key `a.b`
with value `v` (no nesting); `a\:b: v` produces the key `a:b`.

Any other `\X` form (including `\#`, `\t`, `\ <space>`,
`\<any-other>`) is a `BadEscapeSequence` error (§ 6.13). See
§ 3.7.1 below for the specific validity rules of `\uXXXX`.

Escape sequences are NOT processed in:

- Multi-line scalar values (the body of a pair or array item that is
  the whole content of a line, § 5.3 / § 5.4).
- Multi-line string content (`(…)` and `((…))`, § 5.6) — content is
  verbatim.
- Comments (§ 3.4) — content is ignored.

In contexts without escape processing, the literal byte sequence
`\X` is two characters (`\` followed by `X`).

#### 3.7.1 Unicode Escapes (`\uXXXX`)

`\uXXXX` consists of the two bytes `\u` followed by **exactly four**
hexadecimal digits (`[0-9a-fA-F]`, case-insensitive), naming a
16-bit code unit by its hexadecimal value. Fewer than four hex
digits following `\u`, or a non-hex byte before the fourth digit, is
a `BadEscapeSequence` error (§ 6.13) — the escape is never partially
consumed. Exactly four digits are consumed; any further hex-looking
byte immediately after is ordinary content, not part of the escape:
an escape naming `U+0041` immediately followed by the literal digit
`1` decodes to `A1` — two characters, not a five-digit escape.

Code points outside the Basic Multilingual Plane (above `U+FFFF`) are
written as a **surrogate pair**: a high surrogate (`U+D800`–`U+DBFF`)
immediately followed by a low surrogate (`U+DC00`–`U+DFFF`), each as
its own `\uXXXX` escape, combined per the UTF-16 surrogate-pair
algorithm into a single code point. A high surrogate not immediately
followed by a valid low-surrogate `\uXXXX` escape, or a low surrogate
that does not immediately follow a high surrogate, is a **lone
surrogate** and is a `BadEscapeSequence` error — this specification
does not permit unpaired surrogates, unlike some other formats that
leave the case undefined. Code points immediately outside the
surrogate range (`U+D7FF` and `U+E000`) are ordinary code points, not
surrogates, and are valid on their own.

`\uXXXX` is recognised only where escape sequences are recognised at
all: inline scalar values and keys. It is **not** processed inside
multi-line scalar values, multi-line string content (`(…)` /
`((…))`, § 5.6), or comments — in those contexts the six bytes
`\`, `u`, and four following characters are literal content, exactly
as any other unrecognised-elsewhere escape form would be (§ 3.7,
"Escape sequences are NOT processed in", above).

A canonical writer emits ordinary Unicode content as UTF-8 directly;
it is under no obligation to represent any code point as `\uXXXX`
instead. In canonical output this discretion is exercised nowhere
except within a key segment (§ 5.9.10): a non-empty scalar's body is
never escaped in canonical form at all (§ 5.9.4, § 5.9.7), and
§ 5.9.10's own key-escaping algorithm has no discretion of its
own — every code point it requires escaped uses the named form when
one exists and `\uXXXX` otherwise, never a writer's choice between
the two. The SHOULD/MAY language below therefore describes a writer
producing hand-authored, non-canonical Ktav text, not the canonical
algorithm. Where such a writer chooses to escape a byte that also
has a named escape in the table above, it SHOULD prefer the named
form (`\.` over the `\uXXXX` form of the same code point, for
consistency with the existing ten) and use `\uXXXX` only for code
points with no named escape. When `\uXXXX` is emitted, the four hex
digits MUST be uppercase (`0-9A-F`) — parsing is case-insensitive
(§ 3.7.1 above), but two writer-conforming implementations emitting
the same code point MUST produce byte-identical output (§ 5.9's
determinism requirement).

## 4. Grammar

The grammar is presented in a semi-formal notation, one rule per line.
Terminals are in double quotes; `<name>` denotes a non-terminal;
`*` is zero-or-more, `+` is one-or-more, `?` is optional, `|` is
alternation. `(ws)` stands for zero or more whitespace code points
(§ 3.3 — the fixed 25-code-point set, not ASCII-only).

```
<document>      ::= <line>*
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" (any-chars until line-end)
<blank>         ::= (ws)

<header-line>   ::= (ws) "{" (ws) eol                ; object open
                  | (ws) "}" (ws) eol                ; object close
                  | (ws) "[" (ws) eol                ; array open
                  | (ws) "]" (ws) eol                ; array close
                  | (ws) ")" (ws) eol                ; multiline close (stripped)
                  | (ws) "))" (ws) eol               ; multiline close (verbatim)
                    Context-dependence of the last two alternatives:
                    they apply only while a multi-line string block
                    is open (§ 5.6) and the trimmed line equals that
                    block's own terminator — ")" for the stripped
                    form, "))" for the verbatim form. Outside such a
                    block — or inside one whose terminator the line
                    does not match — a line spelling just ")" or "))" is
                    NOT a <header-line> at all: it is ordinary text,
                    read per § 5.1 (rule 3 inside an open block;
                    array-item / pair-value text otherwise — § 5.2,
                    § 5.4), exactly as § 6.1 states.

<pair-line>     ::= <key> ":"  <sep-end> <value-part-opt> eol    ; default, scalar dispatched per § 5.2
                  | <key> "::" <sep-end> <value-part-opt> eol    ; literal String

<key>           ::= <segment> ( <unescaped-dot> <segment> )*
<unescaped-dot> ::= "." that is NOT preceded by an odd number of "\"
<segment>       ::= <key-token>+
<key-token>     ::= <key-escape> | <key-char>
<key-escape>    ::= "\" <escapable-byte>
                  | "\" "u" <hex-digit> <hex-digit> <hex-digit> <hex-digit>
<escapable-byte>::= "\" | "," | "}" | "]" | "{" | "[" | "n" | "r"
                   | "." | ":"
<hex-digit>     ::= [0-9a-fA-F]
<key-char>      ::= any UTF-8 code point except
                    ASCII control bytes < 0x20 other than the § 3.3
                    whitespace members (tab 0x09, VT 0x0B, FF 0x0C —
                    LF 0x0A and CR 0x0D are excluded separately below
                    as line terminators, not as control bytes),
                    DEL (0x7F),
                    line terminator (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\" (backslash — now an escape lead, § 3.7),
                    "." (dot — now the path separator; use "\." for
                    a literal dot inside a segment)
                    (note: any whitespace code point (§ 3.3) is
                    allowed inside a key segment — only the trimmed
                    edges are removed, not interior occurrences — so
                    a key MAY contain internal whitespace such as
                    "first name: alice"; "#" is allowed; "##" two-byte
                    run only becomes a comment when at the start of
                    a trimmed line, § 3.4)

                    Key-segment trimming: a key segment is **trimmed**
                    of leading and trailing whitespace (§ 3.3 — the
                    fixed 25-code-point set, not ASCII-only) before
                    validation against <key-token>+. Internal
                    whitespace inside the segment is preserved
                    verbatim. A segment that is empty after trimming
                    is an EmptyKey (§ 6.5). Two keys that differ only
                    by a whitespace code point at a trimmed edge
                    collide as the same key (§ 5.5) — trimming happens
                    before the duplicate-name check, not after.

                    Key escape processing: the `<key-escape>` rule
                    processes the same eleven escape sequences as
                    § 3.7, including `\uXXXX` (§ 3.7.1). The backslash
                    byte `\` is the escape lead; `\.` produces a
                    literal dot (does NOT split a path segment); `\:`
                    produces a literal colon (does NOT act as the pair
                    separator); `\\` produces a literal backslash;
                    `\uXXXX` produces the named code point and is
                    likewise never re-examined as a structural
                    delimiter, regardless of which code point it
                    decodes to — the `<key-char>` exclusions above
                    apply only to raw, unescaped bytes; a decoded
                    `\uXXXX` code point (including a control code
                    point such as `U+0000`) is accepted as key
                    content and is subject only to the surrogate
                    rule of § 3.7.1. Any other `\X` form in a key is a
                    `BadEscapeSequence` error (§ 6.13).

                    The pair separator is the first **unescaped** `:`
                    (or `::`) scanning left-to-right. An escaped colon
                    `\:` is part of the key segment, not a separator.

                    Dotted-path segmentation splits only on
                    **unescaped** `.` bytes. A `\.` inside the key is a
                    literal dot within the current segment.

                    Examples:
                    - `a\.b: v`     → key "a.b", value "v" (flat, no nesting)
                    - `a\:b: v`    → key "a:b", value "v"
                    - `a\:: v`     → key "a:", value "v" (escaped colon, then the plain `:` separator)
                    - `x.y\.z: v`  → path ["x", "y.z"], value "v"
                                     ({"x": {"y.z": "v"}})
                    - `path\\to: v` → key "path\to", value "v"
                    - a key segment spelling the dot as `\u` followed
                      by the four hex digits for `U+002E` decodes
                      identically to `\.` above (flat key, no
                      nesting) — § 3.7.1's rule that any recognised
                      escape is never re-examined as a structural
                      delimiter applies the same way regardless of
                      which of the eleven forms produced the byte

<sep-end>       ::= 1*ws | &eol                    ; ≥1 whitespace code point, or the line end
<value-part-opt> ::= <value-start> | ""             ; value-part is optional; "" ⇒ empty String
<value-start>   ::= "{" (ws) "}" (ws)                ; empty inline object
                  | "[" (ws) "]" (ws)                ; empty inline array
                  | "{" (ws) <inline-pair-list> (ws) "}" ; inline object (§ 5.8)
                  | "[" (ws) <inline-item-list> (ws) "]" ; inline array (§ 5.8)
                  | "{" (ws) &eol                    ; open object (multi-line body)
                  | "[" (ws) &eol                    ; open array (multi-line body)
                  | "(" (ws) &eol                    ; open multiline string (stripped)
                  | "((" (ws) &eol                   ; open multiline string (verbatim)
                  | "()" (ws)                        ; empty inline (yields "")
                  | "(())" (ws)                      ; empty inline (yields "")
                  | <scalar-body>                    ; scalar value, dispatched per § 5.2

<scalar-body>   ::= (ws) any-chars-until-eol
                    ; trimmed; interpreted per § 5.2

<array-item-line> ::= <item-literal> | <item-inline> | <item-value>
<item-literal>  ::= (ws) "::" <sep-end> <any-chars>? eol   ; raw string item
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) eol
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) eol
                  | (ws) "{}" (ws) eol
                  | (ws) "[]" (ws) eol
<item-value>    ::= <value-start> eol

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) ":"  (ws) <inline-value> (ws)
                     | <key> (ws) "::" (ws) <inline-value> (ws)

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-scalar>    ::= sequence of bytes terminated by an unescaped
                       "," / "}" / "]" or by end-of-line (which is
                       an error per § 6.11); escape sequences per
                       § 3.7 are processed; surrounding whitespace
                       is trimmed before dispatch to § 5.2

<multiline-content-line> ::= any line within an open <multiline>;
                             the terminator (")" or "))") ends the block
```

Notes on the notation:

- `(ws)` stands for zero or more whitespace code points (§ 3.3 — the
  fixed 25-code-point set, not ASCII-only).
- `1*ws` stands for **one or more** whitespace code points (§ 3.3).
- `<sep-end>` stands for "at least one whitespace code point, or the end of
  the line". It is used after the multi-line pair separators (`:`,
  `::`). Writing `key:value` (no whitespace, no EOL after the
  separator) is a syntax error in the multi-line pair form — see
  § 6.10. Inline-compound pairs (§ 5.8) do not require whitespace
  after `:` / `::`.
- `&eol` is a zero-width positive lookahead — it matches the end of
  line without consuming it, so the EOL is still the line terminator.
- The `<inline-value>` alternatives are checked **left-to-right** on
  the first non-whitespace code point of the inline-value position. If that
  byte is `{`, the value is a nested inline object (matching one of
  the first two `{`-rules) and MUST close with `}` on the same line;
  if the byte is `[`, it is a nested inline array. Any other first
  byte makes the value an `<inline-scalar>`. The decision is taken
  once, at the start of the inline-value position; subsequent `{`
  or `[` bytes inside the inline scalar are literal data (§ 5.8.5).

## 5. Semantics

A compliant parser produces a **Value** for a conforming document.
Value is one of: **Null**, **Bool**, **Integer**, **Float**, **String**,
**Array**, **Object**.

- **Null** — a single distinguished value.
- **Bool** — `true` or `false`.
- **Integer** — a numeric scalar carrying an integer value. The
  implementation MUST support at least the i64 range
  (-2^63 .. 2^63 - 1) and MAY support a wider range (e.g. arbitrary
  precision). The `valid/` conformance fixtures (§ 8.1) assume this
  minimum i64 domain for scalar classification (§ 5.2 rule 13): an
  integer literal outside the i64 range is a String for a
  minimum-domain implementation, so `i64_overflow_to_string.json`
  expects the String `"9223372036854775808"`. An implementation
  supporting a wider domain MAY instead produce the
  wider-domain-correct Integer for exactly such boundary-probing
  fixtures; it remains parser-conforming (§ 8.1) provided the
  divergence is confined to fixtures whose expected Value depends
  on the minimum-domain boundary, and is not an arbitrary or
  undocumented divergence. The canonical textual form of an Integer
  is a base-10
  decimal string with no underscores and no leading zeros (except
  the literal `0`); a leading `+` is dropped; signed-zero literals
  (`+0`, `-0`) normalise to `0`. The canonical form is used by
  writer-conforming implementations (§ 5.9).
- **Float** — a numeric scalar carrying a numeric value. The
  implementation MUST support at least the range and precision of
  IEEE 754 binary64 and MAY support a wider representation (e.g.
  arbitrary-precision decimal). Converting a decimal float literal
  (§ 3.6) to this minimum binary64 representation MUST follow IEEE
  754's `roundTiesToEven` rounding-direction attribute, and the
  minimum representation MUST include subnormal (gradual-underflow)
  values down to binary64's smallest positive subnormal
  (2^-1074 ≈ 4.9406564584124654 × 10^-324) — an implementation that
  flushes subnormals to zero early, or rounds ties away from even,
  does not meet this floor even though it never produces a non-finite
  Float. The internal representation beyond
  that minimum is implementation-defined. The canonical
  textual form (§ 5.9) MUST be used by writer-conforming
  implementations. The Value does **not** preserve the textual form
  as written; underscores, the choice of `e` vs `E`, and leading-`+`
  signs are not part of the Value model.
- **String** — a (possibly empty) UTF-8 string.
- **Array** — an ordered sequence of Values.
- **Object** — an ordered sequence of (name, Value) pairs, names
  being strings. Name uniqueness is required within an Object (§ 5.5).

The root Value produced by parsing a document is either an Object or
an Array (each possibly empty). The kind of the root is determined
by the first content line of the document — see § 5.0.1.

### 5.0.1 Top-Level Kind Detection

The "first content line" is the first line that is neither blank
(§ 5.1 rule 1) nor a comment (§ 5.1 rule 2). The root kind is
established from this line as follows. Rules are applied in order;
the first matching rule wins.

1. If the document has **no content lines** (empty document, or only
   blank/comment lines) → root is an empty **Object**.
2. If the first content line trimmed is a **closed inline object**
   `{ … }` — a `{`, balanced inline content, and a matching `}` as
   the last non-whitespace code point of the trimmed line — → root **IS**
   that inline Object. The document MUST have no further content
   lines; any subsequent non-blank, non-comment line is an
   `OrphanLineAfterTopLevelInline` error (§ 6.14).
3. If the first content line trimmed is a **closed inline array**
   `[ … ]` — a `[`, balanced inline content, and a matching `]` as
   the last non-whitespace code point of the trimmed line — → root **IS**
   that inline Array. The document MUST have no further content
   lines; any subsequent non-blank, non-comment line is an
   `OrphanLineAfterTopLevelInline` error (§ 6.14).
4. If the first content line trimmed is a **lone `{`** (the opening
   brace, possibly preceded or followed by whitespace, with nothing
   else on the line) → root is a **multi-line Object** opened by
   this brace. Its matching `}` on a later line closes the root;
   any content after that matching close line is
   `OrphanLineAfterTopLevelInline` (§ 6.14).
5. If the first content line trimmed is a **lone `[`** → root is a
   **multi-line Array** opened by this bracket. Its matching `]`
   closes the root; content after the matching close is
   `OrphanLineAfterTopLevelInline` (§ 6.14).

   If the first content line trimmed begins with `[` or `{` but
   matches none of rules 2–5 above — the leading bracket/brace has
   no matching closer at the end of the line, and the line is not a
   lone opener either — it is diagnosed as a malformed or
   unterminated inline-compound attempt (§ 5.2 rules 8–9;
   `UnterminatedInlineCompound` / `MalformedInlineCompound`,
   § 6.11 / § 6.12). This diagnosis takes precedence over rule 6
   below: such a line is never treated as a pair candidate, even if
   it also contains an unescaped `:` later on (e.g. `[bad]: 1`).
   This precedence only applies when `[` or `{` is the first
   non-whitespace code point of the trimmed line — elsewhere in the
   line (e.g. `a{b: 1`) the byte is just an ordinary forbidden
   `<key-char>`, and rule 6 proceeds normally, yielding
   `InvalidKey` on validation.
6. Otherwise, if the first content line trimmed is a **pair
   candidate** — it has the *shape* of a pair line under § 5.3
   (`key: …` / `key:: …`, including dotted keys): a first
   **unescaped** `:` (or `::`) separator under § 4's
   separator-scanning rule, with a non-empty raw prefix before it,
   where the separator is either the `::` marker or a plain `:`
   satisfied by `<sep-end>` (whitespace or end-of-line after it) —
   → root is an **Object** with this line as its first pair.

   Detection is deliberately two-phase. Phase 1 (this rule) is a
   purely lexical, shape-only test: the prefix before the separator
   is NOT required to be a grammatically valid `<key>` (§ 4) at
   detection time, so a first line such as `a,b: 1` still selects
   an Object root. Phase 2 is uniform validation: once the Object
   context exists, § 5.3 / § 5.3.1 validate the candidate's raw key
   prefix exactly as they validate every other pair line inside an
   established Object (§ 5.1 rule 8) — the same line then yields
   `InvalidKey` (§ 6.4), `EmptyKey` (§ 6.5), or `BadEscapeSequence`
   (§ 6.13) as appropriate. A glued plain-`:` line (e.g. `a,b:1`,
   no whitespace after the separator) is not a pair candidate and
   falls through to rule 7 (a bare-scalar array item); a glued `::`
   line is a pair candidate, and the glued form surfaces in
   phase 2 as `MissingSeparatorSpace` (§ 6.10).
7. Otherwise, if the first content line trimmed is recognised as an
   **array-item line** under § 5.4 other than rules 4 / 5 above
   (a bare scalar, a raw-marker item `:: …`, a multi-line string
   opener `(` / `((`, an empty-compound shortcut `{}` / `[]` /
   `()` / `(())`, or a closed inline compound that did not match
   rules 2 / 3) → root is an **Array** with this line as its first
   item.
8. Otherwise (a bare close `}` / `]` on the first content line, or
   otherwise unclassifiable) → `UnbalancedBracket` error (§ 6.1).

The root kind is **fixed** by the first content line. Subsequent
lines are dispatched per § 5.1 according to the chosen kind:

- Inside a top-level **Array**, every non-blank, non-comment line is
  an array-item line (§ 5.4). A line that looks like a pair (e.g.
  `host: localhost`) is just a bare scalar String per § 5.4 rule 9;
  there is no implicit re-classification back to a pair. Use the raw
  marker form to make a colon-bearing scalar unambiguous.
- Inside a top-level **Object**, every line is a pair line (§ 5.3).
  A bare scalar without `:` is a `MissingSeparator` error.

Note (vs. 0.1.1): rules 4 and 5 differ from earlier versions. In
0.1.1, a lone `{` or `[` as the first content line opened a single
Object / Array item inside a root-level Array. In 0.5.0+, the lone
opener is the root itself: a single multi-line Object / Array
spanning the document, with no enclosing Array. The JSONL-style
form (multiple top-level inline objects `{a:1}` followed by `{b:2}`
producing a root Array) is no longer accepted.

### 5.1 Dispatch per Line

The parser MUST classify each line after trimming, applying rules in
this exact order:

1. If the trimmed line is empty → blank line; no effect except where
   stated (§ 5.6, multiline).
2. If the trimmed line begins with `##` → comment; ignored (§ 3.4),
   except where stated (§ 5.6, multiline) — `##` is ordinary content
   inside an open multi-line string, not a comment marker.
3. **If the parser is inside an open multi-line string** (§ 5.6): if
   the trimmed line equals the block's terminator, the multi-line
   string is closed; otherwise the raw (untrimmed) line is added to
   the content of the multi-line string.
4. If this is the document's first content line, the root kind is
   set as in § 5.0.1; processing then proceeds with the same line
   under the chosen-kind dispatch (rules 5–8).
5. If the trimmed line is exactly `}` → close the innermost open
   Object, otherwise error (§ 6.1).
6. If the trimmed line is exactly `]` → close the innermost open
   Array, otherwise error (§ 6.1).
7. If the innermost open compound is an Array, or there is no open
   compound and the root is an Array (§ 5.0.1): treat the line as
   an **array-item line** (§ 5.4).
8. If the innermost open compound is an Object, or there is no open
   compound and the root is an Object (§ 5.0.1): treat the line as
   a **pair line** (§ 5.3).

### 5.2 Scalar Value Interpretation

Given a **scalar body** — the trimmed text obtained from a pair-line
body after a plain `:` separator, or the trimmed text of an inline
scalar after escape processing (§ 3.7), or the trimmed text of an
array-item line that uses no marker — the parser classifies it as
follows. Rules are applied in order; the first matching rule wins.
Bodies after `::` are **not** dispatched through § 5.2; they are
handled per § 5.3 / § 5.4 / § 5.8 as raw Strings.

1. If the body is exactly `{` → open a new Object scope (multi-line).
2. If the body is exactly `[` → open a new Array scope (multi-line).
3. If the body is exactly `(` → open a multi-line string (stripped
   form, § 5.6).
4. If the body is exactly `((` → open a multi-line string (verbatim
   form, § 5.6).
5. If the body is `()` or `(())` → empty String.
6. If the body matches the **closed-inline-object** shape `{ … }`
   with balanced delimiters and a matching `}` at the end of the
   body → produce the inline Object per § 5.8.
7. If the body matches the **closed-inline-array** shape `[ … ]` →
   produce the inline Array per § 5.8.
8. If the body starts with `{` but does not match rules 1 or 6
   (e.g. `{ a: 1`) → unterminated inline object — error (§ 6.11).
9. If the body starts with `[` but does not match rules 2 or 7 →
   unterminated inline array — error (§ 6.11).
10. If the body is exactly `null` → Null.
11. If the body is exactly `true` → Bool `true`.
12. If the body is exactly `false` → Bool `false`.
13. If the body matches the **integer literal** grammar (§ 3.6) and
    its numeric value fits at least the i64 range
    (-2^63 .. 2^63 - 1, i.e. -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807): Integer carrying the integer value.
    The canonical textual form is the base-10 decimal normalisation
    described in § 5 (and § 5.9.8). Implementations MAY support a
    wider integer range (e.g. arbitrary precision / `bignum`); a
    value that exceeds the implementation's supported range falls
    through to rule 15 (String). To guarantee interoperability, a
    portable document SHOULD NOT rely on Integer-typing for values
    outside the i64 range; a 0.7.0-conformant parser running on a
    strictly-i64 backend MUST place such overflow bodies into rule 15.
14. If the body matches the **float literal** grammar (§ 3.6) and
    its numeric value is finite in the implementation's supported
    Float domain (§ 5): Float carrying the numeric value parsed
    from the body. The internal representation is
    implementation-defined (see § 5 description of Float); the
    canonical textual form is specified in § 5.9.8. A literal whose
    parsed value would not be finite in that domain — e.g. a
    binary64 backend given `1e9999`, which overflows to infinity —
    falls through to rule 15 (String), exactly as an out-of-range
    Integer literal does under rule 13. The grammar of § 3.6 can
    express magnitudes beyond what any Float domain holds finite,
    but no such literal is ever classified as Float: a
    0.7.0-conformant parser MUST NOT produce a non-finite Float via
    this rule — which is what makes § 5.9.0's "no literal grammar
    of § 3.6 produces a non-finite Float" claim true. Underflow to
    ±0.0 (e.g. `1e-9999` on binary64) is not a fallback case: zero
    is finite, so such a literal is an ordinary Float.
15. Otherwise → String whose content is the body, as written.

The keyword forms `null`, `true`, `false` and the numeric literals
are matched **case-sensitively**. A body of `True`, `NULL`, `False`,
`0xZZ`, `0o9`, etc., is a String.

Scalar classification under this section is a deterministic function
of the trimmed, escape-processed byte sequence — determinism only,
not a license to re-run classification against escape-produced bytes
as if they were raw, unescaped source: § 3.7's provenance rule (an
escape's output is never re-examined as structural) applies here too,
so a body like `\{value\}` classifies by the literal characters
`{value}` under rule 15 (String), not by re-entering these rules at
the decoded `{`. Two parser-conforming implementations that support
the same numeric domain MUST produce the same Value kind for the same
body. This is a general rule about every document a parser might see,
not just about the fixtures in § 8's conformance corpus. Where two
implementations' numeric domains differ, a body whose numeric value
crosses one implementation's domain boundary but not the other's MAY
classify differently between them — an out-of-range Integer or
non-finite-on-that-domain Float literal falls through to String under
rules 13–14 for the narrower domain but stays Integer or Float for the
wider one, for *any* body where this happens, not only for a
specifically named or enumerated one. This is not an exception to
determinism: it follows directly from each implementation correctly
applying its own domain's rules 13–14 to the same body, and the
same-kind guarantee itself is scoped to implementations of the same
domain from the start — it was never unconditional across domains.
§ 8.1 and § 8.2 separately name, for the shared conformance corpus
specifically, which fixtures are known to actually probe such a
boundary.

### 5.3 Pair Lines

A pair line takes the form:

```
key: value
key:: literal-string-value
```

where:

- `key` is one or more **segments** separated by unescaped dots
  (`key-token+`). Each segment MUST be non-empty after escape
  processing. The key is **escape-aware** (§ 3.7, § 4): `\` is
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
  canonical writer escapes the leading `#` precisely because a raw
  `##` would make the line unparseable-as-intended on re-read.
  The pair separator is the first **unescaped** `:` (or `::`)
  scanning left-to-right. This scanning rule — together with a
  non-empty prefix and `<sep-end>` for a plain `:` — is also the
  shape-only test § 5.0.1 rule 6 uses to detect a root Object;
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
  a dispatched pair line the order is `MissingSeparator` (§ 6.6) →
  `EmptyKey` for an empty prefix (§ 6.5) → `MissingSeparatorSpace`
  (§ 6.10) → key-segment validation (§ 5.3.1). A key defect does
  not preempt a separator defect: `b,c:1` inside an established
  Object reports `MissingSeparatorSpace`, not `InvalidKey`.

A pair whose value-part is the empty string (the line ends right
after the separator and its required whitespace, or right after
`<sep-end>` consumed the end-of-line) is a pair whose value is an
empty String. This is true for both plain `:` and raw `::`.

#### 5.3.1 Key Validation

A key segment that is empty after trimming yields an `EmptyKey`
(§ 6.5) error; a segment containing a raw (unescaped) code point
that `<key-char>` (§ 4) forbids yields an `InvalidKey` (§ 6.4)
error; a malformed `\X` escape yields a `BadEscapeSequence`
(§ 6.13) error. Validation operates on the raw prefix up to the
first unescaped separator, however malformed the separator's
surrounding whitespace is (check ordering: § 5.3).

A segment beginning with `##` is none of these — it is not a key
validation failure; it is never parsed as a key at all. § 5.1
rule 2 dispatches any line whose trimmed form begins with `##` as
a comment (§ 3.4) before any key parsing begins, so such a line
can never reach this section. The collision is a *writer*
round-trip hazard, not a parser-side error: the canonical writer
MUST escape exactly the leading `#` of a `##`-prefixed key
segment (§ 5.9.10) precisely so that the line still parses as the
intended pair on re-read.

#### 5.3.2 Dotted-Key Expansion

A pair `a.b.c: v` is semantically equivalent to a nested chain of
single-segment pairs: `a:` opens an Object containing `b:` opens an
Object containing `c: v`. Each intermediate name MUST resolve to an
Object — if `a` is already a leaf (a non-Object Value), the dotted
form errors with `KeyPathConflict` (§ 6.3).

Dotted keys are expanded the same way inside inline objects
(§ 5.8): `{a.b: 1, a.c: 2}` produces `{a: {b: 1, c: 2}}`.

### 5.4 Array-Item Lines

An array-item line introduces one Value inside the innermost open
Array (or the top-level Array, § 5.0.1). The forms are:

1. **Raw-marker item** — `:: literal` — the body after `::` is a
   literal String (no type inference). `<sep-end>` rules apply
   (whitespace or EOL after `::` is required; glued forms are a
   `MissingSeparatorSpace` error).
2. **Closed-inline-object item** — `{ key: value, … }` on one line.
3. **Closed-inline-array item** — `[ v, v, … ]` on one line.
4. **Empty-inline-object item** — `{}`.
5. **Empty-inline-array item** — `[]`.
6. **Open compound** — a line whose trimmed content is `{`, `[`,
   `(`, or `((` (multi-line opener); pushes a new compound scope
   onto the parser stack.
7. **Empty-multiline-string item** — `()` or `(())`.
8. **Other item-value** — any non-marker body, dispatched through
   § 5.2 to produce the appropriate Value (keyword, number, or
   String).
9. **Bare-scalar item** — falls through rule 8 with a String result
   if no number / keyword form matched.

### 5.5 Duplicate Names

Two pairs in the same Object with the same effective key (after
dotted-key expansion, § 5.3.2) produce a `DuplicateKey` error
(§ 6.2). The error span SHOULD point at the offending key on the
duplicating line, not at the first occurrence. Implementations MAY
additionally include a span pointing at the first occurrence as
context.

### 5.6 Multi-line Strings

A multi-line string is opened by a value-start of `(` (stripped form)
or `((` (verbatim form) on a line that contains no other content
after the opener and its optional trailing whitespace. The closer is
a line whose trimmed content is exactly `)` (for stripped) or `))`
(for verbatim).

- **Stripped form (`( … )`)**: the parser computes the **common
  leading whitespace** across non-blank content lines — the longest
  prefix, measured in whitespace code points (§ 3.3) rather than
  bytes, that is identical code-point-for-code-point across every
  non-blank line's own leading run (a line starting with a tab and a
  line starting with a space share no common prefix at all, even
  though both begin with *some* whitespace code point, because the
  code points themselves differ at position 0) — and removes that
  shared prefix from each line, then removes trailing whitespace
  (§ 3.3) from each line. The lines are then joined by single `\n`
  bytes. Blank lines inside the block contribute empty strings to the
  joined result. A blank line containing only whitespace code points
  (per § 3.5) does NOT participate in the common-indent computation;
  it contributes an empty content line to the joined result.

  Prior to 0.7, trailing whitespace on each line was preserved
  verbatim, identically to the verbatim form below — this made an
  editor's "trim trailing whitespace on save" silently mutate string
  content with no visible signal. As of 0.7, the stripped form's name
  matches its behaviour on both edges of each line.
- **Verbatim form (`(( … ))`)**: the parser joins the content lines
  byte-for-byte with single `\n` bytes; no whitespace stripping —
  leading or trailing — is performed on any line.

A multi-line string body MUST NOT cross another compound boundary:
the opener line and closer line are unambiguously paired by the
LIFO parser stack.

#### 5.6.1 Closer-Content Restriction

Inside a stripped block, a content line whose trimmed text is
exactly `)` would be indistinguishable from the closer; the writer
MUST switch to verbatim form when such a line is required. The
analogous rule applies to `))` inside a verbatim block.

Parser behaviour is symmetric: if a content line inside a stripped
block trims to exactly `)`, the parser MUST close the block at
that line. The same applies to a line that trims to exactly `))`
inside a verbatim block. The writer-side rule above MUST therefore
be observed by any emitter: producing such content requires
switching the multi-line string to the other form, since the
parser has no way to distinguish a lone-`)` content line from the
stripped-form closer.

### 5.7 Empty-Compound Shortcuts

The four sequences `{}`, `[]`, `()`, `(())` may appear as a
value-start (per § 5.2 rules 5 and corresponding inline rules) and
denote:

| Sequence | Value |
|----------|-------|
| `{}`     | empty Object |
| `[]`     | empty Array |
| `()`     | empty String |
| `(())`   | empty String |

These exist so that an empty compound is expressible on a single
line.

### 5.8 Inline Compounds

An **inline compound** is an Object or Array written on a single
line. The body of an inline compound is bounded by `{` / `}` for
Objects or `[` / `]` for Arrays. Items inside are separated by `,`
bytes. A trailing comma is permitted before the closing delimiter:

```
{a: 1, b: 2}
{a: 1, b: 2,}        ; trailing comma OK
[1, 2, 3]
[1, 2, 3,]
```

#### 5.8.1 Whitespace

Whitespace is optional everywhere inside an inline compound:

```
{a: 1, b: 2}         ; canonical
{ a : 1 , b : 2 }    ; same Value
{a:1,b:2}            ; same Value
```

Whitespace is **trimmed** from both ends of each inline scalar value
before classification under § 5.2: `{a:   hello  ,b:x}` yields
`{a: "hello", b: "x"}`. The trimming rule applies uniformly to
inline scalar bodies after both the `:` separator and the `::`
raw-marker separator.

Whitespace trimming operates on the **raw bytes before escape
processing** (§ 3.7). Bytes produced by escape sequences (e.g. LF
from `\n`, CR from `\r`) are content and are not subject to further
trimming after escape replacement.

To preserve trailing/leading whitespace in a String value, escape the
first or last whitespace code point — see § 3.7. No `\<space>` named
escape is defined, but `\uXXXX` (§ 3.7.1) can name any whitespace
code point explicitly (e.g. the four-digit form naming U+0020, an
ordinary space), so a whitespace-preserving value CAN be expressed
in inline form as of
0.7.0; the verbatim multi-line form `((…))` remains the byte-exact
alternative for values needing more than edge preservation.

#### 5.8.2 Pairs

An inline pair is `key: value` or `key:: value`. The semantics
follow § 5.3:

- Plain `:` dispatches the value through § 5.2 (type inference).
- Raw `::` interprets the value as a literal String (no inference,
  but **escape sequences ARE processed** per § 3.7).

Empty value (`{a:}`, `{a::}`) is an empty String — this is
deliberate: an explicitly empty pair value is semantically
meaningful (an "explicitly empty" field), and the form is concise.

#### 5.8.3 Items

An inline array item is any `<inline-value>`. The inline scalar
form is dispatched through § 5.2 after escape processing.

An **empty inline-array item** — a position where one item is
expected but no characters appear, e.g. the body between two
commas (`[a,, b]`) or directly after the opener (`[, a]`) — is
NOT an empty String. It is a `MalformedInlineCompound` error
(§ 6.12). The asymmetry with empty pair values (§ 5.8.2) is
deliberate; see § 10.5 for the rationale.

The single trailing comma immediately before the closing
delimiter (`[a, b,]`, `{a: 1, b: 2,}`) is a recognised trailing
comma, NOT an empty item, per § 5.8.

#### 5.8.4 Nested Inline Compounds

An inline value may itself be an inline compound:

```
{outer: {inner: {leaf: 1}}}
[ [1, 2], [3, 4] ]
{users: [ {name: alice}, {name: bob} ]}
```

Nesting depth is implementation-defined. The specification sets no
normative depth limit. Portable documents SHOULD avoid pathologically
deep nesting; implementations MAY enforce a depth limit and reject
overly-deep input.

#### 5.8.5 What an Inline Compound May NOT Contain

- Multi-line strings (`(`/`((` openers). An inline compound is by
  definition single-line; a multi-line opener inside it would
  require continuation onto subsequent lines, which is impossible
  by § 3.2.
- Multi-line scope changes. A `{` or `[` byte at the start of an
  inline value opens a *nested inline compound* that MUST close on
  the same line; a `{` / `[` not followed by a matching closer is a
  `UnterminatedInlineCompound` error.

If a `(` or `((` byte appears as the first non-whitespace code point of an
inline scalar value, it is treated as the start of an inline scalar
(per § 5.8.1). Because no inline terminator (`,`, `}`, `]`) follows
on the same line, this raises `UnterminatedInlineCompound` (§ 6.11).
Multi-line string openers are not permitted inside inline compounds.

The following document is therefore an error:

```
key: {a: (
    body
)}
```

A `{` or `[` byte that is **NOT** the first non-whitespace code point of
an inline value (i.e. it appears mid-scalar) is a literal character
and does NOT open a nested compound. The decision is made once,
when the parser begins reading an inline value: if the first
non-whitespace code point is `{` or `[`, the value is a nested compound;
otherwise the value is an inline scalar that runs to the next
unescaped `,` / `}` / `]` (or end-of-line, which is an error per
§ 6.11). Inside that inline scalar, additional `{` or `[` bytes are
literal data and have no structural meaning. Example:

```
{a: hello{world, b: x}
```

yields `{a: "hello{world", b: "x"}`. The outer `}` closes the
outer object; the mid-value `{` in `hello{world` is part of the
String value. The same reasoning applies to `[` mid-value. Use
`\{` or `\[` (§ 3.7) only when the literal bracket would be the
first byte of the inline value.

#### 5.8.6 Detection at Top Level

A document whose first content line trimmed is `{ … }` or `[ … ]`
with balanced delimiters and a matching closer at the end of the
line is a **top-level inline compound** (§ 5.0.1 rules 2–3). The
inline body **IS** the document's root Value; no other content
lines are permitted.

### 5.9 Canonical Form

A **writer-conforming** implementation MUST emit a *canonical* Ktav
serialisation of any **representable** Value — § 5.9.0 defines which
Values are representable, subsuming the narrow set of String values
that § 5.9.7 excludes. The canonical form is byte-deterministic: for
any given representable Value, every writer-conforming
implementation MUST produce the same byte sequence. A
writer-conforming implementation MUST reject a non-representable
Value with an error, rather than serialise it — this requirement
applies uniformly to every non-representability rule of § 5.9.0,
not only to § 5.9.7's String exclusions: permitting an
implementation-chosen or lossy encoding for the same
non-representable Value would itself violate the byte-determinism
guarantee just stated.

#### 5.9.0 Representable Values

The Value model of § 5 is broader than the set of Values for which a
canonical Ktav serialisation exists: a Value constructed
programmatically, outside the parser, may fall outside it. A Value V
is **representable** — the property § 5.9's canonical-serialisation
contract requires — if and only if both of the following hold:

- V is an Object or an Array. A bare scalar root is not
  representable: § 5.0.1 establishes the root kind from the first
  content line, and no scalar has a canonical form that could serve
  as a document root.
- V is **node-representable**.

**Node-representability** — the recursive, per-kind check applied to
every Value in a non-root position (an Object pair's value, an
Array's item). A Value is **node-representable** if and only if, by
kind:

- **Object:** every pair's name is a non-empty string, and every
  pair's value is node-representable. An empty name is not
  node-representable: § 4 requires every key segment to contain at
  least one `<key-token>`, so no document can produce such a pair
  (the parse-side counterpart is the `EmptyKey` error, § 6.5).
- **Array:** every item of V is node-representable.
- **Float:** V is finite — neither NaN nor ±Infinity. No literal
  grammar of § 3.6 produces a non-finite Float (an overflowing
  literal falls through to String at § 5.2 rule 14), and § 5.9.8
  defines no canonical textual form for one.
- **String:** V is node-representable under § 5.9.7's rules (no
  `CR` byte, and none of the pathological multi-line collision
  cases defined there).
- **Null, Bool, Integer**, and every other String: always
  node-representable.

Node-representability recurses through every Object pair's value and
every Array item, at any depth, without re-imposing the root-kind
constraint: a String or Integer nested inside a representable Object
is node-representable on its own terms — it is never itself required
to be an Object or an Array. Only the outermost Value handed to a
writer is subject to the root-kind constraint.

A writer-conforming implementation MUST reject a non-representable
Value with an error, per § 5.9 — and MUST do so without emitting any
part of it: partial output followed by a failure is not a permitted
behaviour.

Representability is deliberately narrower than parseability.
Parsing never yields a scalar root (§ 5.0.1) or an empty pair name
(§ 4, § 6.5), and no literal grammar yields a non-finite Float
(§ 3.6) — but it can yield a String that § 5.9.7 excludes, since a
`CR` byte enters a String through an inline-compound `\r` escape
(§ 3.7). Such a document is accepted by a parser-conforming
implementation, while serialising the resulting Value MUST fail —
which is why non-representable Values sit outside the round-trip
identity of § 8.3.

Each non-representability case above has a stable **reason code**,
normative regardless of how any given implementation's API surfaces
it. `versions/0.7/tests/unrepresentable/` fixtures (§ 8.2) name the
expected reason code for a given Value; a writer-conforming
implementation's own error type MAY take any shape (exception class,
error enum, tagged union, ...) — only the code names and the case
each identifies are normative, not the API through which a caller
observes them:

| Reason code                   | Case                                                                                          |
|--------------------------------|-------------------------------------------------------------------------------------------------|
| `ScalarRoot`                  | The document root is not an Object or an Array.                                                 |
| `EmptyKeyName`                | An Object pair's name is the empty string.                                                      |
| `NonFiniteFloat`              | A Float is NaN or ±Infinity.                                                                     |
| `CRByte`                      | A String contains a `CR` byte (§ 5.9.7).                                                         |
| `BothFormsRequired`           | A String's multi-line body needs both forms — a segment trimming to `))` and a segment trimming to `)` (§ 5.9.7). |
| `TrailingWhitespaceCollision` | A segment trims to `))` and some content line has trailing whitespace (§ 5.9.7).                 |
| `LeadingWhitespaceCollision`  | A segment trims to `))` and every non-blank segment shares leading whitespace at the same position (§ 5.9.7). |

When a Value violates more than one case at once, the checks are
ordered: the document-root constraint (Object-or-Array) is evaluated
first, and only if it passes is node-representability checked
recursively. If node-representability then finds more than one
applicable violation — whether on the Value itself, on an Object
pair's key, or among descendants (e.g. a String satisfying two
collision rules at once, an Object with both an empty key and a
separately non-representable child, or two Array items each
non-representable for a different reason) — an implementation MAY
report any one of the applicable reason codes: this specification
does not mandate a specific traversal order or a deterministic
"first" violation — that question belongs to the still-open
structured-error contract (rust#12).

Of these, `NonFiniteFloat` has no fixture under the ordinary
`<name>.json` schema every other reason code uses: JSON, the format
that schema is written in, has no portable literal for NaN or
Infinity (implementations that accept the bare tokens `NaN` /
`Infinity` as an extension disagree on round-tripping them). To still
pin this case with a machine-checkable fixture,
`versions/0.7/tests/unrepresentable/non_finite_float.json` uses one
normative escape hatch inside its `"value"` field: a Float that would
otherwise have no JSON encoding is written as the tagged object
`{"$float": "NaN"}`, `{"$float": "Infinity"}`, or
`{"$float": "-Infinity"}` in place of an ordinary JSON number. The key
name `$float` is reserved within `unrepresentable/` fixture `"value"`
trees: an ordinary JSON Object that happens to have exactly this shape
(a single key literally named `$float`) can never occur there for any
other reason — no other reason code, and no fixture under `valid/`,
ever needs this sentinel, since every other Value § 5 defines has a
direct JSON mapping. A future `unrepresentable/` fixture MUST NOT use
a literal Object with a `$float` key for any purpose other than this
sentinel.

#### 5.9.1 Whitespace, indentation, line endings

- Lines terminated by `LF` (`0x0A`) only — never `CR` or `CR LF`.
  No `CR` byte ever appears in canonical output.
- Indentation is exactly four ASCII spaces per nesting level
  (no tabs, no two-space indent).
- The document ends with a single trailing `LF`, except an empty
  document (root is an empty Object with no pairs), which emits
  zero bytes.

#### 5.9.2 Comments

Comments (lines starting with `##`) are never emitted. Comments
present in the original input are not part of the Value model and
have no canonical representation.

#### 5.9.3 Document root

- **Empty Object root:** the canonical form is the empty file
  (zero bytes). No `{}` is emitted. (Parses back per § 5.0.1
  rule 1 — no content lines.)
- **Empty Array root:** the canonical form is the single line
  `[]` followed by an `LF`. (Parses back per § 5.0.1 rule 3 —
  closed inline array `[ ]` on the first content line.)
- **Object root with pairs:** each pair occupies its own line at
  indent level 0; no opening or closing brace at the root.
- **Array root with items:** each item occupies its own line at
  indent level 0; no opening or closing bracket at the root
  **unless** the first item, rendered on its own line(s) at
  indent 0, would itself be detected by § 5.0.1 as establishing a
  different root. This happens in two shapes:
  - the first item is a non-empty Object / Array, whose own
    canonical rendering opens with a lone `{` or `[` on its own
    line (§ 5.9.6) — matching § 5.0.1 rule 4 or rule 5; or
  - the first item is an **empty** Object / Array, whose canonical
    rendering is the single closed-inline line `{}` or `[]`
    (§ 5.9.6) — matching § 5.0.1 rule 2 or rule 3.
  In either case the writer wraps the root in explicit brackets:
  `[` on its own line at indent 0, each item at indent + 1
  (4 spaces), and `]` on its own line at indent 0. This forces the
  parse to take § 5.0.1 rule 5 (lone `[` → multi-line Array root)
  with the original first item — compound or empty-compound alike —
  nested one level in.

The choice between an Object root and an Array root is determined
by the Value's kind, and parses back per § 5.0.1.

Note: an Object pair line cannot be mistaken for a closed-inline or
lone-opener root line (it always has a `:` separator); only Array
roots whose first item is itself a compound (empty or not) require
the wrap. A separate hazard — an Array root's first item whose bare
rendering would itself be recognised as a pair line (§ 5.0.1 rule 6)
— is resolved not by this wrap but by forcing the raw-marker form
for that one item instead (§ 5.9.6).

#### 5.9.4 Compound values (non-root)

- **Object value (non-empty):** `key: {` followed by a newline,
  followed by each pair on its own line at indent level + 1,
  followed by a closing `}` on its own line at the current indent
  level.
- **Array value (non-empty):** `key: [` followed by a newline,
  followed by each item on its own line at indent level + 1,
  followed by a closing `]` on its own line at the current indent
  level.
- **Empty Object value:** `key: {}` on a single line.
- **Empty Array value:** `key: []` on a single line.
- Inline compounds (other than empty `{}` / `[]`) are NEVER
  emitted in canonical form. Inline compounds in the input are
  valid syntactic sugar; the canonical form is always multi-line.

#### 5.9.5 Pair separators

A pair separator is selected by the kind/content of its value:

- **`key:` (no body after the colon):** when the value is the
  empty String `""`.
- **`key: <bytes>` (plain separator + one space + scalar body):**
  when the value is a non-empty bare String whose body (a)
  contains no `LF` and no `CR` byte, (b) has no leading or
  trailing whitespace (§ 3.3 — the fixed 25-code-point set, not
  ASCII-only), (c) contains no ASCII control byte
  (0x00–0x1F other than 0x09 `TAB`), (d) does not match the
  integer or float literal grammar of § 3.6 — regardless of
  whether its numeric value fits the implementation's own
  supported domain (§ 5) — and is not exactly `null`, `true`, or
  `false`, (e) does not
  start with `{` or `[` (which would cause § 5.2 to dispatch
  the body as an inline compound rather than a String), and
  (f) is not exactly `()`, `(())`, `(`, or `((` (the first two
  are § 5.7's empty-compound shortcuts, reinterpreted as the
  empty String rather than this literal body; the last two are
  a multi-line-string opener per § 4's `<value-start>` grammar,
  reinterpreted as opening a block rather than a one-byte or
  two-byte String — the same class of hazard as (e) above, and
  resolved the same way, via the raw marker below). Condition (d)
  is deliberately domain-independent: a String whose body merely
  *looks* like a number to a wider-domain reader — e.g.
  `9223372036854775808`, a String on a minimum (i64) domain but a
  valid Integer literal on a wider one — still needs the raw
  marker below, precisely so that a reader with a different
  numeric domain does not silently reclassify it (§ 5.2's own
  same-kind guarantee, § 5.2, is about domain-*consistent*
  classification; the canonical writer of a String must not
  depend on which domain happens to be doing the writing).
- **`key:: <bytes>` (raw marker):** when the bytes are a non-empty
  one-line String that would otherwise be reinterpreted by § 5.2
  if emitted with plain `:` — either as matching the integer or
  float literal grammar of § 3.6 (regardless of whether the value
  fits the writer's own numeric domain), as exactly `null` /
  `true` / `false`, as an inline compound (a body starting
  with `{` or `[`), as a multi-line-string opener (a body of
  exactly `(` or `((`), as the empty String via § 5.7's shortcuts
  (a body of exactly `()` or `(())`), or any other non-String
  classification.
- **`key: <multi-line>`:** when the value is a String containing
  `LF`, leading/trailing whitespace, or any control byte other
  than `LF` / `TAB` (and not `CR`, which is not representable —
  see § 5.9.7).
- **`key: <compound>`:** when the value is a non-empty Object or
  Array (per § 5.9.4) or an empty `{}` / `[]`.

#### 5.9.6 Array-item markers

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
  it is one for root detection). Only the Array root's
  first item is exposed to § 5.0.1's root-kind detection; every
  other item position is dispatched directly as an array-item line
  regardless of its shape (§ 5.1 rules 7–8), so this exclusion does
  not apply there.
- **Raw-marker item:** `:: <bytes>` — when the body would otherwise
  be reinterpreted by § 5.2 as a number, keyword, an inline
  compound, a multi-line-string opener (a body of exactly `(` or
  `((`), or (via § 5.7's shortcuts) the empty String, or would
  otherwise collide with a line-level structural token (a body of
  exactly `}` or `]`, or starting with `##` or with the two-byte
  sequence `::`), or (when the
  item is the first item of an Array root) would otherwise satisfy
  § 5.0.1 rule 6's phase-1 pair-candidate test as described above.
  The raw-marker form
  itself is immune to this last hazard: a line beginning `::` has
  no key segment before the separator, so it never matches
  `<pair-line>`'s grammar and is read as this Array's first item
  (§ 5.0.1 rule 7) without needing the root-wrap of § 5.9.3.
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

#### 5.9.7 String form selection

Let *body* be the byte sequence of a String Value.

- **Empty String (`""`):** emit as `key:` (no body after the
  colon) for a pair, or `::` (no body) for an array item.
- **One-line printable, no edge-whitespace, no numeric/keyword
  collision:** emit as `key: <body>` (pair) or `<body>` (item).
- **One-line, but matches the integer or float literal grammar of
  § 3.6 (regardless of whether the value fits the writer's own
  numeric domain — § 5) or is exactly `null` / `true` / `false`:**
  emit as `key:: <body>` (pair) or `:: <body>` (item), using the
  raw marker.
- **Contains `LF`, leading/trailing whitespace, or any control byte
  (`0x00`–`0x1F` other than `0x09` `TAB` and `0x0A` `LF`, and not
  `0x0D` `CR`, which the next bullet handles separately):** emit
  as verbatim multi-line `((` … `))`. The opener `((` is emitted
  on the value line (preceded by `key: ` for a pair, or alone for
  an item) at the current indent. The body is split on `LF`; each
  resulting segment is emitted as one line at **indent 0** (no
  leading whitespace — because verbatim form preserves bytes
  exactly, any indentation would be injected into the value). The
  closer `))` is emitted on its own line at the current indent.
- **Contains a `CR` byte (`0x0D`):** the Value is **not
  representable** in canonical form. A `CR` byte in a String can
  only be produced through the `\r` escape inside an inline
  compound (§ 3.7), and canonical form never emits inline
  compounds for non-empty scalars. A writer-conforming
  implementation MUST reject such a Value with an error rather
  than serialise it; it is outside the scope of the round-trip
  property of § 8.3. Portable documents SHOULD NOT rely on `CR`
  bytes in String values.

The canonical writer prefers verbatim multi-line form `((` … `))`
for strings requiring multi-line representation. If any segment of
the body (after splitting on `LF`), when trimmed of leading and
trailing whitespace (§ 3.3), is exactly `))` — matching § 5.6.1's
parser-side closer trigger, which trims a content line before
comparing it to `))` — verbatim form is impossible: the segment
would be misread as the closer regardless of any leading or
trailing whitespace of its own (e.g. a segment `"  ))"` collides
just as much as a bare `"))"`). In that case the canonical writer
MUST switch to stripped form `(` … `)` with no leading indent (the
writer emits body segments at indent 0 so the common-indent
computation yields zero). The closing `)` line is then at the
outer indent.

(Rationale: stripped form's `)` closer leaves `))` available as
content, which is the only way to represent that byte sequence in
a multi-line value — provided no segment also collides with the
`)` closer; see below.)

A String whose body would require both forms — containing a
segment that trims to exactly `))` (forcing the stripped-form
fallback above) AND a segment that trims to exactly `)` (which
would then collide with the stripped-form closer) — is not
representable in the canonical multi-line form. A writer-conforming
implementation MUST reject such a Value with an error rather than
serialise it; it is outside the scope of the round-trip property of
§ 8.3. Portable documents SHOULD NOT rely on such content.

As of 0.7.0, a body containing a segment that trims to exactly
`))` (forcing the stripped-form fallback above) that ALSO has
trailing whitespace (§ 3.3) on any content line is likewise not
representable: the stripped form now strips that trailing
whitespace on emission, so the fallback would silently lose it. A
writer-conforming implementation MUST reject such a Value with an
error rather than serialise it, exactly as for the
both-forms-required case above. Portable documents SHOULD NOT rely
on trailing whitespace inside a multi-line String body that also
requires a segment trimming to `))`.

Independently of the trailing-whitespace case above, a body forced
into stripped form (via a segment trimming to exactly `))`) where
every non-blank segment shares at least one leading whitespace code
point in the same position is likewise not representable: on
re-parse, § 5.6's minimum-leading-whitespace computation cannot
distinguish that shared leading whitespace from writer-added
structural indentation, and would strip it. This ambiguity in the
stripped form's parsing rule predates 0.7.0 — it is documented here
for the first time, alongside the other non-representable cases
this form already has. A writer-conforming implementation MUST
reject such a Value with an error rather than serialise it, exactly
as for the other cases above. Portable documents SHOULD NOT rely on
shared leading whitespace inside a multi-line String body that also
requires a segment trimming to `))`.

#### 5.9.8 Number canonicalisation

- **Integer:** base-10 decimal. Leading `+` is dropped. `-0` and
  `+0` emit as `0`. No underscores. No leading zeros (other than
  the literal `0`). The minus sign is preserved for negative
  values.
- **Float:** the chosen textual form matches one of the two
  alternatives of § 3.6:
  - `sign? digits "." digits ("e" sign? digits)?`
  - `sign? digits "e" sign? digits`

  Lowercase `e` only. Underscores stripped. The leading `+` on the
  mantissa is dropped. The leading `+` on the exponent is dropped
  (a positive exponent carries no sign).

  First compute the shortest decimal expansion that uniquely identifies
  the Value, using a Ryu / Grisu / Steele-White-class algorithm. For an
  IEEE 754 binary64 implementation, this is the shortest decimal that
  round-trips to the same binary64. Then choose its notation using this
  deterministic policy, where `abs` is the absolute numeric value:

  - if `0 < abs < 1e-2` or `abs >= 1e7`, use the exponent
    alternative;
  - otherwise, use the `digits "." digits` alternative.

  The threshold condition is never satisfied by `abs == 0`, which
  therefore always uses the decimal alternative: the canonical form
  of positive zero is `0.0` and of negative zero is `-0.0` —
  decimal, never scientific, with the sign preserved. Unlike an
  Integer's `-0`, which normalises to `0` (see the Integer bullet
  of § 5), a Float keeps the IEEE 754 sign distinction between
  `0.0` and `-0.0`.

  The thresholds are exact: `0.01` and `9999999.0` use decimal form,
  while `0.001`, `0.0015`, `-0.001`, and `10000000.0` use exponent
  form. Scientific output uses lowercase `e`, omits a positive exponent
  sign, and strips a trailing `.0` from the mantissa. Thus the examples
  are `0.01`, `1e-3`, `1.5e-3`, `-1e-3`, `9999999.0`, and `1e7`.

  Two writer-conforming implementations using the same Float
  representation (binary64) MUST produce identical output for the
  same Value. The test fixtures `*.canonical.ktav` assume binary64
  semantics; implementations using arbitrary-precision decimal MAY
  produce different output only where their Value domain differs.

#### 5.9.9 Keywords

`null`, `true`, `false` — lowercase, exactly as shown.

#### 5.9.10 Keys

A key segment is emitted after escape processing and the trimming
rule of § 4. Internal whitespace is preserved. Dotted keys are NOT
re-expanded: a Value parsed from `a.b.c: 1` is indistinguishable
in the Value model from one parsed from `a: { b: { c: 1 } }`, and
the canonical writer chooses the explicit nested form (not the
dotted form).

When emitting a key segment, the writer MUST re-escape every code
point that `<key-char>` (§ 4) excludes from raw content, plus any
§ 3.3 whitespace code point at the segment's first or last position
(which § 4's trimming rule would otherwise remove on re-parse):

- Bytes with a named escape (§ 3.7) use it: `\` → `\\`, `.` → `\.`,
  `:` → `\:`, `,` → `\,`, `{` → `\{`, `}` → `\}`, `[` → `\[`,
  `]` → `\]`, LF → `\n`, CR → `\r`.
- Everything else `<key-char>` excludes — `(`, `)`, DEL (`0x7F`),
  and any control byte below `0x20` that is not a § 3.3 whitespace
  member — has no named escape and MUST be emitted as `\uXXXX`
  (§ 3.7.1).
- A § 3.3 whitespace code point at the first or last position of
  the segment MUST likewise be escaped rather than emitted
  literally, even though § 4 otherwise permits whitespace as
  ordinary interior key content: left unescaped, it would be
  silently trimmed away on re-parse, changing the key. Use the
  named form when one exists (LF and CR per bullet 1 above) and
  `\uXXXX` otherwise — either form is immune to § 4's raw-byte
  trimming, since the trimmed text is the escape's own ASCII
  spelling (`\`, then a letter or four hex digits), never the
  whitespace byte itself. Interior whitespace needs no escaping.
- If the key's raw text (the first segment, as written on the
  line) begins with the two-byte sequence `##`, the writer MUST
  additionally escape exactly the first `#` as `\u0023` — on
  top of, not instead of, whatever bullets 1–3 above already
  require for every other code point in the same segment. A
  structural byte or edge-whitespace code point elsewhere in a
  `##`-prefixed key is still escaped exactly as it would be in
  any other key: for example the key `##a:b` is emitted as
  `\u0023#a\:b` — the leading `#` escaped by this bullet, the `:`
  escaped by bullet 1 regardless of it. Left unescaped, the
  leading `##` makes § 5.1 rule 2 read the line as a comment
  (§ 3.4) and drop it silently — this hazard operates at the
  line-dispatch layer, above § 4's key-segment grammar entirely,
  so it applies even though `#` is itself an ordinary,
  unexcluded `<key-char>` that bullets 1–3 never require escaping
  on their own. Escaping exactly the first `#` is necessary and
  sufficient for this one hazard: the second `#` needs no escape
  of its own (once the first is escaped, the line no longer
  begins with `##`), so two writer-conforming implementations
  MUST produce the identical `\u0023#…` prefix, never `\u0023\u0023…` or any
  other variant.

This ensures that the canonical output round-trips: unescaped dots
in the canonical key are path separators only, structural bytes
never appear raw, and no edge whitespace is lost to re-parse
trimming. A key segment containing a literal `.`, `:`, or `\` emits
the escaped form so that re-parsing produces the same key.

Example: the key `a.b` (a single segment containing a literal dot)
is emitted as `a\.b`; the key `a:b` is emitted as `a\:b`.

#### 5.9.11 Order

Object pairs are emitted in insertion order — the order in which
they appear in the parsed input, or the order in which the Value
was constructed. Implementations MUST preserve and emit this order.
Array items are emitted in natural array order.

## 6. Errors

A conforming parser MUST detect and report each of the error
categories below for inputs that exhibit the relevant defect. The
error MUST carry, at minimum, a 1-based source line number and a
byte-offset Span covering the offending region.

### 6.1 Unbalanced or Mismatched Brackets

A `}` or `]` on a line that does not match the innermost open
Object/Array (§ 5.1 rules 5–6) is an `UnbalancedBracket` error. An
Object, Array, or multi-line string left open at end-of-file — its
matching `}`, `]`, `)`, or `))` never found — is an
`UnclosedCompound` error.

`)` and `))` are never close-tokens outside this second case: inside
an open multi-line string, a line that does not match that string's
own terminator (§ 5.6) is read as ordinary content (§ 5.1 rule 3),
not an error; outside any open multi-line string, `)` and `))` are
ordinary array-item or pair-value text (§ 5.2, § 5.4) like any other
line.

### 6.2 Duplicate Name

Two pairs in the same Object with the same effective key are a
`DuplicateKey` error (§ 5.5).

### 6.3 Path Conflict

A dotted-key path that re-enters an existing leaf, or that reopens a
synthetic-prefix sub-Object that has been closed by an intervening
sibling pair, is a `KeyPathConflict` error (§ 5.3.2).

### 6.4 Invalid Key

A key segment containing a forbidden character is an `InvalidKey`
error.

### 6.5 Empty Key

A pair line whose key portion (before `:`) is empty is an
`EmptyKey` error.

### 6.6 Missing Separator

A line dispatched to pair-line mode that contains no `:` separator
is a `MissingSeparator` error. This applies inside the body of an
open multi-line Object, or at the top level when the root is an
Object.

### 6.7 (RESERVED)

Previously: *Inline non-empty compound*. In 0.5.0+, inline non-empty
compounds are valid (§ 5.8). This number is reserved to avoid
renumbering older error catalogs. Implementations MUST NOT emit an
error labelled `InlineNonEmptyCompound` when parsing 0.7.0 documents.

### 6.8 I/O Errors

I/O failure while reading a document yields an `Io` error.

### 6.9 (RESERVED)

Previously: *Invalid typed scalar*. In 0.5.0+, typed markers `:i` /
`:f` no longer exist; this number is reserved. Implementations
MUST NOT emit an error labelled `InvalidTypedScalar` when parsing
0.7.0 documents.

### 6.10 Missing Separator Space

In a multi-line pair line, the separator `:` / `::` MUST be followed
by at least one whitespace code point or end-of-line. A glued form
(`key:value` / `key::value`) is a `MissingSeparatorSpace` error.

Inline-compound pairs (§ 5.8) do NOT require whitespace after the
separator and so do NOT raise this error.

### 6.11 Unterminated Inline Compound

A `{` or `[` appearing in a value-position not followed by a matching
`}` / `]` on the same line is an `UnterminatedInlineCompound` error
(§ 5.8).

### 6.12 Malformed Inline Compound

A structural defect inside a closed inline compound — one that is
not already classified as `UnterminatedInlineCompound` — is a
`MalformedInlineCompound` error. The defects covered are:

- A leading comma immediately after the opener (`{,a: 1}`,
  `[,1, 2]`).
- Two or more consecutive commas (`{a: 1,, b: 2}`, `[1,, 2]`).
- An empty inline-array item, i.e. a comma not preceded by a value
  (`[a,, b]`); the trailing comma exception of § 5.8 still applies
  to a single comma immediately before the closing delimiter.
- Other inline structural defects that do not raise
  `UnterminatedInlineCompound` (e.g. a missing pair separator
  inside an inline object: `{a 1, b: 2}`).

Empty pair values (`{a:}`, `{a::}`) are NOT a defect — they yield
an empty String per § 5.8.2.

### 6.13 Bad Escape Sequence

A `\X` form inside an inline scalar value or a key (§ 3.7) where
`X` is not one of `\`, `,`, `}`, `]`, `{`, `[`, `n`, `r`, `.`, `:`,
`u` is a `BadEscapeSequence` error. End-of-line directly after a
backslash (i.e. `\` with no following byte before the line
terminator) is also a `BadEscapeSequence` error — the inline scalar
context never crosses a line boundary (§ 3.2).

A `\u` not immediately followed by exactly four hexadecimal digits
(§ 3.7.1) is also a `BadEscapeSequence` error, as is a lone
surrogate — a high surrogate not immediately followed by a valid
low-surrogate `\uXXXX` escape, or a low surrogate not immediately
preceded by a high-surrogate `\uXXXX` escape.

### 6.14 Orphan Line After Top-Level Inline

A non-blank, non-comment line that appears after a top-level inline
compound (§ 5.0.1 rules 2–3) or after the matching close line of a
lone-`{` / lone-`[` root opener (§ 5.0.1 rules 4–5) — where the
root Value has already been fully constructed — is an
`OrphanLineAfterTopLevelInline` error.

The category is distinct from `MissingSeparator` (§ 6.6) because no
further content is permitted at all, regardless of whether the
trailing line would otherwise parse as a pair, an item, or a bare
scalar. The error span SHOULD point at the offending line.

Rationale: the root kind is fixed by the first content line, and a
top-level inline root has its entire Value on that single line.
Allowing further content would either silently extend the root
(ambiguous, no clean rule for how) or change the root kind
retroactively (forbidden by § 5.0.1). The error gives a precise
explanation for documents that mistakenly continue past the root.

## 7. Examples

### 7.1 Minimal

```
host: localhost
port: 8080
debug: true
```

→ `{host: "localhost", port: 8080, debug: true}` where `port` is
`Integer(8080)` and `debug` is `Bool(true)`.

### 7.2 Nested Objects, Arrays, Keywords

```
server: {
    host: 127.0.0.1
    port: 8080
    tls: true
}
admins: [
    alice
    bob
]
maintenance_window: null
```

Mixed multi-line objects, multi-line arrays, type-inferred scalars,
and `null`.

### 7.3 Numbers in Multiple Bases

```
color: 0xFFEE00
permissions: 0o755
mask: 0b1111_0000
million: 1_000_000
ratio: 0.5
sci: 1.5e-3
big: 99999999999999999999
forced_string: :: 0xFF
literal_hex: :: 0xFF
```

`color` is `Integer(16772608)` (0xFFEE00 decimal),
`permissions` is `Integer(493)` (0o755 decimal),
`mask` is `Integer(240)` (0b11110000 decimal),
`million` is `Integer(1000000)`, `ratio` is `Float(0.5)`,
`sci` is `Float(1.5e-3)`, `big` is
`String("99999999999999999999")` (overflows i64),
`literal_hex` is `String("0xFF")` (raw marker).

The canonical writer (§ 5.9.8) emits each Integer in base-10
decimal (e.g. `color: 16772608`) and each Float in canonical
notation (e.g. `sci: 1.5e-3`). The hex / octal / binary / underscored
input forms are accepted by the parser but never emitted by the
canonical writer.

### 7.4 Inline Compounds

```
endpoint: {host: api.example, port: 443, tls: true}
ports: [80, 443, 8080]
users: [{name: alice, age: 30}, {name: bob, age: 25,}]
```

`endpoint` is an inline Object; `ports` is an inline Array of three
integers; `users` is an inline Array of two inline Objects. The
trailing comma after `25` is allowed.

### 7.5 Escape Sequences in Inline Values

```
tags: [hello\, world, line1\nline2, contains\}brace]
path: {win: C:\\Users\\alice, unix: /home/alice}
```

`tags[0]` is `String("hello, world")` (comma escaped),
`tags[1]` is `String("line1\nline2")` (with embedded newline),
`tags[2]` is `String("contains}brace")`. Both `path` values are
literal paths.

### 7.6 Comments

```
## Sample configuration

## --- Network ---
host: localhost
port: 8080

## Authentication settings
auth: {
    enabled: true
    realm: production
}
```

Each `##`-prefixed line is a comment and ignored. A `#` byte that
is not at the start of a `##` pair is just a character.

### 7.7 Raw Strings

```
literal_true:  :: true
literal_zero:  :: 0
literal_hex:   :: 0xFF
literal_path:  :: /usr/local/bin
literal_comma_only: :: just,a,comma,separated,plain,string
```

All values above are Strings, not their inferred types. The raw
marker forces String dispatch unconditionally. Note that escape
processing does **not** apply in this multi-line raw form — `\n`
inside the body is the two characters `\` and `n`.

### 7.8 Top-Level Inline

A document whose first (and only) content line is a closed inline
compound:

```
{host: localhost, port: 8080, tags: [a, b, c]}
```

The root Value IS that inline Object — no enclosing braces are
needed at the document level; the inline form is the document.
Same applies to a top-level inline Array:

```
[1, 2, 3, 4]
```

### 7.9 Key Escaping

```
example\.com: prod
a\:b: v
deep.example\.com: 1
path\\to: x
```

`example\.com` is the single key `example.com` — the `\.` is a literal
dot, not a path separator. `a\:b` is the key `a:b` (literal colon).
`deep.example\.com` nests under `deep` with the leaf key `example.com`
(the first dot splits; the escaped dot does not). `path\\to` is the key
`path\to` — a literal backslash, written `\\`. The canonical writer
re-escapes `\`, `.`, and `:` inside a key segment (§ 5.9.10), so all of
these round-trip.

## 8. Compliance

An implementation may claim **Ktav 0.7.0 compliance** at one or more
of the following levels.

### 8.1 Parser-conforming

A parser-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement in this
  document that pertains to parsing.
- Accepts every fixture under `versions/0.7/tests/valid/` and
  produces a Value equivalent to the corresponding `name.json`
  oracle. That equivalence is defined at the minimum-required
  numeric domain of § 5 (i64 Integer, binary64 Float).
  [`versions/0.7/tests/boundary-fixtures.json`](tests/boundary-fixtures.json)
  lists the individual Object fields (leaves) known to probe a
  numeric-domain boundary (§ 5.2) — not whole fixtures: a fixture MAY
  mix boundary-dependent leaves with ordinary ones (e.g.
  `big_overflow_to_string`'s `tiny` field is an ordinary `Integer(1)`
  in every conforming domain, while its `big` / `bigger` fields are
  not), and only a listed leaf is exempt — every other field of that
  same fixture MUST still match exactly. Each entry names a
  `boundary_class`: `integer_range` (exceeds the mandatory i64 range),
  `float_range` (overflows to non-finite on binary64),
  `float_underflow` (underflows to zero on binary64), or
  `float_precision` (binary64 rounds or shortens the value where a
  higher-precision domain would not). An implementation is exempt from
  matching a listed leaf's value only if it genuinely supports a
  domain wider than the minimum *along that leaf's specific
  `boundary_class`* — a BigInt-but-plain-binary64 implementation is
  exempt on `integer_range` leaves but not on any `float_*` leaf, and
  a wide-Float-but-plain-i64 implementation is exempt the other way
  around; supporting one axis does not exempt an implementation on the
  other. For an exempt leaf, this corpus does not pin what its Value
  must be — § 5.2 already states the general rule (same domain ⇒ same
  kind, differing domain ⇒ MAY differ at the crossed boundary), and
  that Value is what the implementation's own correct application of
  § 5's rules 13–14 to the leaf's body produces. Every field not
  listed in `boundary-fixtures.json`, in every fixture, carries no
  exemption for any implementation of any domain.
- Rejects every fixture under `versions/0.7/tests/invalid/` with
  the error category named in `name.json["expected_error"]`.

### 8.2 Writer-conforming

A writer-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement of § 5.9.
- For each fixture under `versions/0.7/tests/valid/`, produces —
  when given the Value parsed from `name.ktav` — a byte-exact
  output equal to `name.canonical.ktav`, UNLESS the implementation
  supports a domain wider than the minimum along the `boundary_class`
  of one or more leaves
  [`versions/0.7/tests/boundary-fixtures.json`](tests/boundary-fixtures.json)
  lists for that fixture — per § 8.1, such an implementation may hold
  a different Value at that leaf's path than the minimum-domain
  `.json` oracle describes there (e.g. `i64_overflow_to_string`'s
  `/overflow` field held as an Integer, not a String), while every
  other field of the same fixture still holds its minimum-domain
  Value and MUST still appear in the output exactly as the
  minimum-domain writer would render it. For such a fixture, this
  corpus does not pin the exact byte sequence for the exempt leaf's
  own contribution to the output: it MUST be the correct canonical
  form (§ 5.9) for the Value the implementation actually holds there
  (e.g. an Integer value is canonically written bare, without the raw
  marker, § 5.9.5), internally consistent and deterministic for its
  own domain — but which exact bytes that is for a domain other than
  the minimum is not something this shared, language-agnostic corpus
  verifies. An implementation supporting only the minimum domain MUST
  match every `valid/` fixture's `.canonical.ktav` exactly, in full,
  including every field `boundary-fixtures.json` lists a leaf for.
- For each fixture under `versions/0.7/tests/unrepresentable/`,
  rejects the Value described by `name.json["value"]` with the
  reason code named in `name.json["unrepresentable_reason"]`
  (§ 5.9.0) — via whatever error-reporting shape its own API uses;
  the code names are normative, the surfacing mechanism is not.

The canonical form is defined in § 5.9.

### 8.3 Round-trip property

The following identity MUST hold for every **representable** Value V
(§ 5.9.0) producible by a parser-conforming implementation, when
emitted and re-parsed by writer- and parser-conforming
implementations of the same Value domain:

```
emit_canonical(parse(emit_canonical(V))) == emit_canonical(V)
```

That is: parsing canonical output and re-emitting it produces
byte-identical output. The canonical form is a fixed point of the
parse-emit cycle. A non-representable Value is outside the scope of
this identity: § 5.9's writer-conforming requirement is to reject
such a Value with an error rather than serialise it (§ 5.9.0).

### 8.4 Claims

Implementations MAY claim parser-only, writer-only, or both
levels of conformance. An implementation MAY support older Ktav
format versions in parallel (e.g. 0.1.1) under a configuration
flag, but the default behaviour for documents without a
version-pragma SHOULD be 0.7.0.

## 9. Security Considerations

### 9.1 Resource Exhaustion

A maliciously crafted document can request unbounded resources:

- Deeply nested compounds (`{a: {a: {a: …}}}`) can cause
  stack overflow in recursive parsers.
- Extremely long scalar bodies can cause unbounded memory growth.
- Pathological multi-line strings or inline compounds can cause
  quadratic-time parsing in naive implementations.

Implementations SHOULD impose configurable limits on:

- Maximum nesting depth (both multi-line and inline compounds).
- Maximum input length and maximum scalar length.
- Maximum total Value count.

No specific limits are mandated; implementations choose values
appropriate to their target environment.

### 9.2 Numeric Overflow

Integer literals that exceed the implementation's supported integer
range (which MUST be at least i64; see § 5.2 rule 13) MUST fall
back to String per § 5.2 rule 13 — they MUST NOT silently wrap or
raise an exception at parse time. The consumer of the Value is
responsible for choosing how to handle the textual form.

### 9.3 Encoding

Input MUST be valid UTF-8. Implementations MUST reject malformed
UTF-8 sequences with an explicit error rather than silently
substituting replacement characters.

## 10. Rationale (Non-normative)

### 10.1 Why drop typed markers (`:i`, `:f`)?

In versions 0.1.x through 0.3.x, the only way to obtain an Integer
or Float Value was to write the typed markers `key:i 5` /
`key:f 0.5`. The plain pair-form `key: 5` produced a String. The
markers were syntactically unique to Ktav, easy to forget, and
duplicated information the lexer already had (a string of digits
**is** a number).

0.5.0 removes the markers and infers numeric / keyword Values from
the lexical form of the scalar body. The raw marker `::` is kept as
the explicit "force String" override.

This is a strict-break change: documents written with `:i` / `:f`
in older versions parse differently in 0.5.0 (the `:i` / `:f` text
becomes part of the value or yields a `MissingSeparator` /
`MissingSeparatorSpace` error depending on whitespace). No
auto-migration is provided.

### 10.2 Why add inline compounds?

A common annoyance with the line-based form is that short objects
become verbose:

```
server: {
    host: localhost
    port: 8080
}
```

Four lines to say one thing. The inline form

```
server: {host: localhost, port: 8080}
```

is one line. The trade-off (commas as separators, mandatory closer
on the same line) is small enough that adding the option is a clear
win for compactness.

### 10.3 Why `##` for comments?

Single `#` was reserved as the comment marker through 0.4.x.
However, `#` is a very common character in real-world configuration
values (hashtags, fragment identifiers, hex colors, password
separators, …). 0.5.0 doubles the marker to `##` and frees the
single `#` for use as an ordinary character.

Because the comment marker is recognised only at the start of a
trimmed line (§ 3.4), the literal two-byte sequence `##` in the
middle of a value or key is unambiguously two `#` characters — no
escape sequence is needed or defined. The 0.4.x-era `#\#` escape
is gone with the rest of the single-`#` machinery; the design now
relies purely on positional disambiguation (line-start only) rather
than on an in-value escape.

### 10.4 Why minimal escape?

Ktav values are written by humans. Heavy escape rules are a
correctness footgun. The 0.5.0 escape set was the minimal closed
set for inline scalars. 0.6.0 extends it to keys with `\.` and
`\:`, giving ten named escapes — every structurally significant
byte in inline form (`,`, `}`, `]`, `{`, `[`), the key-structural
bytes (`.`, `:`), the literal backslash (`\\`), plus two
convenience escapes (`\n`, `\r`) for embedded newlines. 0.7.0 adds
an eleventh, `\uXXXX` (§ 3.7.1), for the rare case of needing to
name an arbitrary code point by number rather than typing it
directly — most byte values are still written literally, since
they need no escape at all.

The bracket pair-set is full and symmetric: `\}` / `\{` and
`\]` / `\[`. `\{` and `\[` are only ambiguity-relevant as the
*first* byte of an inline scalar value (an unescaped `{` or `[`
there opens a nested compound), but having all four forms removes
a "may I escape this here?" question for the writer and gives a
clean rule: every inline structural delimiter has an escape form.

Tab (`0x09`) and other low-ASCII control bytes intentionally have
no **dedicated named** escape (no `\t`) — no letter is worth
reserving for a byte that is legal as a literal in the first
place. Tab is a permitted literal byte in keys and scalars (§ 4);
control bytes are content data. A String containing such bytes is
representable through verbatim multi-line form (§ 5.6, § 5.9.7),
or, since 0.7.0, inline via `\uXXXX` (§ 3.7.1), which can name any
of them by number — there is no need for a dedicated named escape
for each one when the multi-line form preserves the byte exactly
and `\uXXXX` covers the inline case generically.

Multi-line scalars and multi-line strings have no escape processing
at all — the lexical layout makes escape unnecessary in those
contexts. (Keys gained escape processing in 0.6.0; see § 3.7.)

### 10.5 Why is `{a:}` valid but `[,a]` an error?

The two cases look symmetric — an empty inline value, either as
the value of a key in an Object or as an item in an Array — but
are treated differently (§ 5.8.2 and § 5.8.3): `{a:}` yields a
key `a` mapped to the empty String, while `[,a]` is a
`MalformedInlineCompound` error.

The asymmetry is deliberate. An empty pair value is anchored by
an explicit key, so the "explicitly empty field for key X" intent
is unambiguous; the form is concise and useful for representing,
e.g., environment variables set to the empty string. An empty
array item has no such anchor, so the form `[,a]` is more likely
a typo (a leading or doubled comma) than a deliberate empty-string
item. Forcing the writer to use `["", a]` for an intentional empty
String makes the intent explicit and catches the common typo at
parse time.

### 10.6 Why a canonical form?

The format is intentionally permissive on input — comments, inline
compounds, numeric literals in multiple bases, underscores, mixed
escape styles — but **strict on output**. A single canonical
serialisation (§ 5.9) is defined for every **representable** Value.

This separation lets humans write Ktav in the form most natural
to them (compact inline, explicit multi-line, comments, mixed
bases) while machines exchange a deterministic byte sequence.
Byte-deterministic output also makes Ktav useful as a target for
generated configuration: any two writer-conforming implementations
operating on the same Value produce the same bytes, so diffs over
generated files are stable.

The conformance suite tests both directions: input variety via
`name.ktav` fixtures (reader-side), output determinism via
`name.canonical.ktav` fixtures (writer-side), and equivalence to
`name.json` oracles (Value model).

## 11. References

- RFC 2119 — Key words for use in RFCs to Indicate Requirement Levels.
- RFC 8174 — Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words.
- RFC 3629 — UTF-8, a transformation format of ISO 10646.
- IETF JSON — RFC 8259.
- TOML — https://toml.io/.
- YAML — https://yaml.org/.

## Appendix A. Changes

### 0.7.0 — unreleased

- **Breaking:** § 3.3 whitespace changes from
  ASCII-mandatory-plus-Unicode-`MAY` to a fixed, exhaustively
  enumerated 25-code-point `MUST` (the Unicode `White_Space`
  property as of Unicode 6.3, frozen by explicit list rather than by
  reference). Implementations MUST NOT delegate to a host language's
  built-in Unicode-whitespace primitive — verified to disagree with
  this list in both directions across at least two mainstream
  language runtimes. Non-breaking against every shipped 0.6.x Rust
  core, which already recognised the full set via `char::is_whitespace()`
  (§ 3.3) — as with § 4's entry below, this is breaking only for an
  implementation that took the old `MAY` at face value and stuck to
  ASCII space/tab, rather than matching the Rust core's actual
  behaviour; only the normative text catches up to the code.
- **Breaking:** § 4's key-segment trimming widens from ASCII-only to
  the same fixed 25-code-point set (§ 3.3), resolving a standing
  contradiction between § 3.3 (which already permitted Unicode
  whitespace) and § 4 (which mandated ASCII-only for keys
  specifically) — the same category as the 0.5.0 entry's "Key
  segments are trimmed of leading and trailing ASCII whitespace",
  widened one step further. Two keys differing only by a non-ASCII
  whitespace code point at a trimmed edge, previously distinct under
  a literal reading of § 4, now collide as the same key (§ 5.5). The
  Rust reference implementation's actual trimming behaviour does not
  change — it already trimmed the full set since 0.6.0, so this is
  breaking only for an implementation that followed the old § 4 text
  literally rather than matching the Rust core's actual behaviour;
  only the normative text catches up to the code.
- **Breaking:** The `(…)` multi-line string form now strips trailing
  whitespace (§ 3.3) from each content line, matching what it already
  did to each line's leading whitespace. Previously `(…)` preserved
  trailing whitespace byte-for-byte, identically to `((…))` — an
  editor's "trim trailing whitespace on save" could silently mutate
  string content with no visible signal. `((…))` is unaffected and
  remains fully verbatim on both edges.
- **Added:** `\uXXXX` escape (§ 3.7.1) — exactly four hex digits,
  surrogate pairs for code points above the Basic Multilingual Plane,
  lone surrogates rejected as `BadEscapeSequence`. Recognised
  wherever the existing ten escapes are recognised (inline scalars
  and keys); not processed in multi-line scalars, multi-line string
  content, or comments. Purely additive to the escape table — no
  existing escape sequence's meaning changes.
- **Changed:** § 6.13 `BadEscapeSequence` — extended to cover
  malformed `\uXXXX` forms (fewer than four hex digits) and lone
  surrogates, alongside the existing unrecognised-`\X` case.
- **Changed:** § 5.9.10's key re-escape rule now enumerates every
  code point `<key-char>` excludes (not just `\`/`.`/`:`) and
  requires `\uXXXX` for edge whitespace and for structural bytes
  with no named form (`(`, `)`, DEL, control bytes). Keys containing
  `(`, `)`, DEL, or a control code point — previously representable
  in the Value model but not emittable in canonical form at all —
  are emittable for the first time as of 0.7.0, via `\uXXXX`. Also
  newly documented (a pre-existing hazard, not new behaviour): a
  key beginning with `##` MUST have the first `#` escaped as
  `\u0023`, or the canonical line is silently read as a comment.
- **Changed:** `<key-char>` (§ 4) now admits raw VT (`0x0B`) and FF
  (`0x0C`) as literal key content, matching the § 3.3 widening —
  previously only tab was exempted from the control-byte exclusion.
  Non-breaking: this only accepts documents previously rejected as
  `InvalidKey`, no previously-valid document's meaning changes.
- **Breaking:** § 5.9.0 (new) defines **representable Values** —
  the domain over which the canonical writer's guarantees operate.
  A bare scalar document root, an Object pair with an empty name, a
  non-finite Float (NaN / ±Infinity), and any compound containing a
  non-representable Value at any depth are not representable, and a
  writer-conforming implementation MUST reject them with an error,
  emitting no partial output. Previously § 5.9 left these
  programmatic-only cases undefined. The Rust reference core
  already rejects scalar roots and `CR`-bearing Strings; closing
  the remaining gaps there is tracked separately.
- **Changed:** § 5.9.8 — the Float notation threshold now reads
  `0 < abs < 1e-2` (was `abs < 1e-2`), which taken literally would
  have demanded scientific notation for zero. The canonical form of
  zero is `0.0` / `-0.0` — decimal, never scientific, sign
  preserved (unlike an Integer's `-0` → `0`). This matches the Rust
  reference core's existing behaviour; only the normative text
  changes. New fixtures `float/positive_zero` and
  `float/negative_zero` lock it in.
- **Changed:** § 8.1 (with § 5's Integer definition) — fixture
  equivalence is defined at the minimum-required numeric domain
  (i64 Integer, binary64 Float). An implementation supporting a
  wider domain MAY diverge from a fixture oracle exactly where that
  fixture probes the minimum-domain boundary (e.g.
  `i64_overflow_to_string.json`), without forfeiting
  parser-conformance. Previously an arbitrary-precision
  implementation — explicitly permitted by § 5 — failed § 8.1 on
  that fixture as written.
- **Changed:** § 8.2 (with § 5.9.5) — the writer-conforming
  byte-exact requirement gets the mirror-image numeric-domain
  caveat to § 8.1's: exactly on the boundary-probing fixtures § 8.1
  names, a wider-domain implementation's parsed Value may
  legitimately differ, and its output MAY differ from the fixture's
  fixed `canonical.ktav`, provided that output is the correct
  canonical form (§ 5.9) for the Value it actually holds. Previously
  an arbitrary-precision implementation — explicitly permitted by
  § 5 — failed § 8.2 on `i64_overflow_to_string` as written: it
  parses the body as an Integer and would canonically write it
  bare (no raw marker), which the fixture's fixed `canonical.ktav`
  forbids.
- **Changed:** the Float bullet of § 5 and rule 14 of § 5.2 — the
  Float domain now has a normative floor (MUST support at least the
  range and precision of IEEE 754 binary64; MAY support a wider
  representation) and an overflow fallback mirroring Integer's rule
  13: a float literal that is not finite in the implementation's
  Float domain (e.g. `1e9999` on binary64) falls through to String,
  so a 0.7.0-conformant parser MUST NOT ever produce a non-finite
  Float — which is what makes § 5.9.0's claim that "no literal
  grammar of § 3.6 produces a non-finite Float" true. New fixtures
  `float/positive_overflow_to_string`,
  `float/negative_overflow_to_string`, and `float/underflow_to_zero`
  pin the boundary; the last documents that underflowing to `0.0`
  (finite) is an ordinary Float, not a String-fallback case.

### 0.6.0 — 2026-06-01

- **Breaking:** Keys now process escape sequences (§ 3.7). The
  backslash byte `\` is the escape lead in keys; `\.` produces a
  literal dot (not a path separator); `\:` produces a literal colon
  (not a pair separator); `\\` produces a literal backslash. A
  literal backslash in a key that was bare in 0.5.0 now requires
  `\\`. Two new escape sequences (`\.`, `\:`) are added to the
  § 3.7 table (now ten total).
- **Breaking:** The `<key>` / `<segment>` / `<key-char>` grammar
  productions (§ 4) are now escape-aware. The dotted-path separator
  splits only on **unescaped** `.`; the pair separator is the first
  **unescaped** `:` / `::`. Backslash and dot are excluded from
  `<key-char>` and handled via `<key-escape>`.
- **Changed:** § 3.7 escape-sequence list extended from eight to ten
  entries: `\\`, `\,`, `\}`, `\]`, `\{`, `\[`, `\n`, `\r`, `\.`,
  `\:`. The `\.` and `\:` forms are no longer `BadEscapeSequence`.
- **Changed:** "Keys" removed from the "escape sequences are NOT
  processed in" list (§ 3.7). Keys now DO process escapes — same
  set as inline scalars.
- **Changed:** § 5.9.10 (canonical key emission) — the writer MUST
  re-escape `\`, `.`, and `:` inside a key segment so that the
  output round-trips.
- **Changed:** § 6.13 `BadEscapeSequence` — updated to list ten
  valid escape characters (added `.` and `:`).

### 0.5.0 — 2026-05-28

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

### 0.1.1 — 2026-05-08

- Added top-level Array as a recognised root kind (§ 5.0.1) — first-
  content-line array-item shapes (bare scalars, typed markers, lone
  `{` / `[`, multi-line openers) now produce a root-level Array
  instead of erroring. Strictly additive — every 0.1.0 document
  parses identically.

### 0.1.0 — 2026-04-22

- Initial specification.

## Appendix B. Migration from 0.1.x

Three breaking changes must be addressed when migrating a 0.1.x
document to 0.5.0:

1. **Typed markers removed.** Replace `:i 42` / `:f 3.14` with
   bare `42` / `3.14`. To keep the literal as a String, write
   `:: 42`.
2. **Comments use `##`.** Replace `# comment` lines with
   `## comment`. A single `#` byte at line start has no special
   meaning in 0.5.0 and would be parsed as part of a content
   line.
3. **Bare numbers are typed.** `port: 8080` produces
   `Integer(8080)` in 0.5.0, not `String("8080")`. If a consumer
   expects the value as a String, change the source to
   `port:: 8080`.

A fourth, narrower change applies only to documents that exploited
the 0.1.1 lone-`{` / lone-`[` root-Array shape:

4. **Lone `{` / `[` on the first content line is now the root,
   not a single Array item.** In 0.1.1 a document beginning with
   a lone `{` produced a root Array containing one Object; in
   0.5.0 the lone `{` opens the root Object directly. JSONL-style
   documents (multiple top-level objects on consecutive lines)
   are no longer accepted. Wrap them in an explicit `[` / `]`
   array.

A document using only quoted-style values, explicit String form
(`key:: value`), and explicit array brackets is broadly compatible
across both versions.

## Appendix C. Migration from 0.5.0

One breaking change must be addressed when migrating a 0.5.0
document to 0.6.0:

1. **Backslash in keys is now an escape lead.** In 0.5.0, a
   backslash byte `\` inside a key was a literal character. In
   0.6.0, `\` starts an escape sequence. If any key contains a
   literal backslash, replace `\` with `\\`. This is rare in
   practice — backslashes in key names are uncommon in
   configuration files.

Additionally, keys can now contain literal dots and colons via
`\.` and `\:`, enabling key names like `example.com` or `a:b`
that were previously impossible to express.

## Appendix D. Migration from 0.6.x

The Rust reference implementation's actual parsing behaviour is
**unaffected** by the § 3.3 / § 4 whitespace change — it already
trimmed the full 25-code-point set in every 0.6.x release, so a
document that round-tripped correctly under 0.6.x round-trips
identically under 0.7.0. Only implementations that followed the old
§ 4 text literally (ASCII-only key trimming) rather than matching the
Rust core's actual behaviour need to change.

One breaking change applies to every implementation, Rust included:

1. **`(…)` multi-line strings no longer preserve trailing whitespace
   (§ 3.3 — any of the 25 code points, not just space/tab) on each
   content line.** If a document relies on trailing whitespace inside
   a `(…)` block being preserved verbatim, switch that block to
   `((…))`, which keeps both edges byte-for-byte in both 0.6.x and
   0.7.0.

Additionally, `\uXXXX` is a new, purely additive escape (§ 3.7.1) —
no existing document's meaning changes because of it.
