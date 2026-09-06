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

0.7.0: § 3.3 whitespace changes from an implementation-defined `MAY` to
a fixed, exhaustively-enumerated 25-code-point `MUST` (§ 3.3); § 4's
key-segment trimming widens from ASCII-only to the same fixed set, resolving
a standing internal contradiction; the `\uXXXX` escape (§ 3.7.1) and
quoted keys (§ 5.3.3, delimiters `"` / `'` / `` ` ``) are added; and
the `(…)` multi-line string form now also strips trailing whitespace from
every content line — `(…)` already removed each line's shared leading
indent (§ 5.6). The five universal breaking changes are: a leading U+FEFF
is stripped from the document; `(…)` no longer preserves trailing
whitespace on content lines; a leading unescaped `"`, `'`, or `` ` ``
in a key segment opens a quoted segment instead of being ordinary key
content (so an Object pair `"port": 1` names `port`, not `"port"`);
a recognised escape in an inline scalar forces String before keyword or
numeric classification (so `1\.0` is String, not Float); and a float
literal that is non-finite in the declared Float domain falls back to String
instead of producing a non-finite Float (§ 5.2 rule 14). Separately, an
implementation that literally followed old § 3.3 / § 4 wording and trimmed
only the specified ASCII whitespace has a conditional migration review for
the other members of the 25-code-point set at structural, blank-line,
comment, root-dispatch, separator, scalar/key-edge, and stripped-block
content positions; this is not one of the five universal changes. Also,
the 0.7.0 binary64 minimum and `roundTiesToEven` can change values for a
previously conforming narrower-domain implementation (for example, binary32
rounds `16777217.0` to `16777216.0`); this is an implementation-dependent
numeric migration hazard, not a universal sixth change.

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
**MAY** in this document are to be interpreted as described in RFC 2119,
as clarified by RFC 8174, when, and only when, they appear in all
capitals. Lowercase uses of these words are ordinary English and do not
carry requirement-level meaning.

## 3. Lexical Structure

### 3.1 Character Set

A Ktav document is a sequence of Unicode code points encoded as UTF-8.
Implementations MUST reject documents that are not valid UTF-8, with
an `InvalidUtf8` error (§ 6.15). A parser-conforming implementation
MUST skip exactly one leading byte-order mark (U+FEFF) if it is the
very first code point of the document, before any other byte; the
canonical writer (§ 5.9) MUST NOT emit a leading byte-order mark. A
U+FEFF code point anywhere else in the document is ordinary content —
§ 3.3 does not classify it as whitespace.

### 3.2 Lines

A line terminator is one of three byte sequences:

- `LF` (`0x0A`)
- `CR` (`0x0D`)
- `CR LF` (`0x0D 0x0A`)

Implementations MUST treat all three as equivalent line terminators.
A document MAY have a final line without a trailing terminator.

A `CR` byte never appears as a content byte at parse time: it is
always a terminator (alone or paired with a following `LF`). A
String value can carry a `CR` byte via the `\r` escape sequence, or
via the generic `\uXXXX` escape naming code point 000D, inside an
inline scalar (§ 3.7, § 3.7.1, § 5.8); such a Value is not
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
(two ASCII `#` bytes). The rest of the line is the comment line. The
comment body ends immediately before the line terminator and excludes it:
CRLF, LF, and CR are never comment-body bytes. Comments produce no Value
and are ignored.

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
begins an **escape sequence**. The following **fourteen** escape
sequences are recognised; each is replaced by the indicated byte or
code point before further classification (§ 5.2 for values) or
key-segment splitting (§ 4 for keys). A position consumed by any
recognised escape — named or `\uXXXX` — is never re-examined as a
structural delimiter (dotted-path dot, pair-separator colon, inline
comma/brace/bracket, quoted-segment delimiter): this holds uniformly,
regardless of which of the fourteen forms produced the decoded byte.

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
| `\"`     | `"` (literal double quote) |
| `\'`     | `'` (literal single quote) |
| `` \` `` | `` ` `` (literal backtick) |
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

The three quote escapes (`\"`, `\'`, `` \` ``) exist for the quoted
key form (§ 5.3.3): inside a `<quoted-segment>`, only the segment's
own opening delimiter is structural (its first unescaped occurrence
closes the segment); the two other quote characters are ordinary
content there and need no escape. `\"` / `\'` / `` \` `` are
recognised uniformly in every context where escapes are recognised
at all — bare key segments, quoted key segments, and inline scalar
values alike. In an inline value a recognised escape has no structural
effect, but it is not semantically redundant: § 5.2 classifies any
body containing a recognised escape as String, even when the decoded
body would otherwise be a keyword or numeric literal. This applies
equally to `\.` and `\:` in values.

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
consistency with the other twelve named forms) and use `\uXXXX` only
for code points with no named escape. When `\uXXXX` is emitted, the four hex
digits MUST be uppercase (`0-9A-F`) — parsing is case-insensitive
(§ 3.7.1 above), but two writer-conforming implementations emitting
the same code point MUST produce byte-identical output (§ 5.9's
determinism requirement).

## 4. Grammar

The grammar is presented in a semi-formal notation, one rule per line.
Terminals are in double quotes; `<name>` denotes a non-terminal;
`*` is zero-or-more, `+` is one-or-more, `?` is optional, `|` is
alternation. Within a terminal, `\"` denotes a literal double-quote
character and `\\` denotes a literal backslash — this notation is
used only where a terminal must itself contain a quote or backslash
byte (e.g. the quoted-segment delimiters, § 4). In every line and inline
production below, `ws` is line-bounded: it denotes a whitespace code
point from § 3.3 other than LF or CR; `(ws)` is zero or more such code
points, and `1*ws` is one or more. LF and CR are reserved for eol in
`<line-end>` and are not consumed by either ws form. This source-matching
rule does not change value trimming or the treatment of code points produced
by decoded escapes.

```
<document>      ::= <line>*
<line-end>      ::= eol | EOF
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" <comment-body> <line-end>
<comment-body>  ::= any-chars-until-line-end
<blank>         ::= (ws) <line-end>

<header-line>   ::= (ws) "{" (ws) <line-end>         ; object open
                  | (ws) "}" (ws) <line-end>         ; object close
                  | (ws) "[" (ws) <line-end>         ; array open
                  | (ws) "]" (ws) <line-end>         ; array close
                  | (ws) ")" (ws) <line-end>         ; multiline close (stripped)
                  | (ws) "))" (ws) <line-end>        ; multiline close (verbatim)
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

<pair-line>     ::= <key> ":"  <sep-end> <value-part-opt> <line-end> ; default, scalar dispatched per § 5.2
                  | <key> "::" <sep-end> <raw-line> <line-end>       ; literal String, no dispatch

<key>                ::= <raw-segment> ( <unescaped-dot> <raw-segment> )*
<raw-segment>        ::= (ws) <segment> (ws)
                         The maximal leading and trailing (ws) are trimmed
                         before dispatching to <quoted-segment> or <bare-segment>;
                         whitespace inside the dispatched segment is preserved.
<unescaped-dot>      ::= "." that is NOT preceded by an odd number of "\\"
<segment>            ::= <quoted-segment> | <bare-segment>
<bare-segment>       ::= <bare-first-token> <key-token>*
<bare-first-token>   ::= <key-escape> | <non-quote-key-char>
<key-token>          ::= <key-escape> | <key-char>
<non-quote-key-char> ::= <key-char> excluding "\"", "'", "`"
<key-escape>         ::= "\\" <escapable-byte>
                        | "\\" "u" <hex-digit> <hex-digit> <hex-digit> <hex-digit>
<escapable-byte>     ::= "\\" | "," | "}" | "]" | "{" | "[" | "n" | "r"
                        | "." | ":" | "\"" | "'" | "`"
<hex-digit>          ::= [0-9a-fA-F]

<quoted-segment> ::= "\"" <dq-token>* "\""       ; § 5.3.3
                  | "'" <sq-token>* "'"
                  | "`" <bt-token>* "`"
<dq-token>      ::= <key-escape> | <dq-char>
<sq-token>      ::= <key-escape> | <sq-char>
<bt-token>      ::= <key-escape> | <bt-char>
<dq-char>       ::= any UTF-8 code point except ASCII control bytes
                    < 0x20 other than tab/VT/FF, DEL (0x7F), LF, CR,
                    "\\" (escape lead), and "\"" (the delimiter itself)
<sq-char>       ::= same exclusions as <dq-char>, but excluding "'"
                    (its own delimiter) instead of "\""
<bt-char>       ::= same exclusions as <dq-char>, but excluding "`"
                    (its own delimiter) instead of "\""

<key-char>      ::= any UTF-8 code point except
                    ASCII control bytes < 0x20 other than the § 3.3
                    whitespace members (tab 0x09, VT 0x0B, FF 0x0C —
                    LF 0x0A and CR 0x0D are excluded separately below
                    as line terminators, not as control bytes),
                    DEL (0x7F),
                    line terminator (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\\" (backslash — now an escape lead, § 3.7),
                    "." (dot — now the path separator; use "\." for
                    a literal dot inside a segment)
                    (note: any whitespace code point (§ 3.3) is
                    allowed inside a key segment — only the trimmed
                    edges are removed, not interior occurrences — so
                    a key MAY contain internal whitespace such as
                    "first name: alice"; "#" is allowed; "##" two-byte
                    run only becomes a comment when at the start of
                    a trimmed line, § 3.4; a quote character — '"',
                    "'", or "`" — is an ordinary, unexcluded
                    <key-char> everywhere in a <bare-segment> EXCEPT
                    as its first code point — excluded there by
                    <bare-first-token> / <non-quote-key-char> above —
                    where it instead opens a <quoted-segment> —
                    § 5.3.3's positional rule)

                    Key-segment trimming: a key segment is **trimmed**
                    of leading and trailing whitespace (§ 3.3 — the
                    fixed 25-code-point set, not ASCII-only) before
                    classifying it as quoted or bare and validating it
                    against the corresponding rule above. Internal
                    whitespace inside a <bare-segment> is preserved
                    verbatim; a <quoted-segment>'s content (between its
                    delimiters) is never trimmed at all, at either edge
                    — trimming only ever removes whitespace OUTSIDE the
                    delimiters (§ 5.3.3). A segment that is empty after
                    trimming is an EmptyKey (§ 6.5). Two keys that
                    differ only by a whitespace code point at a
                    trimmed edge collide as the same key (§ 5.5) —
                    trimming happens before the duplicate-name check,
                    not after.

                    Key escape processing: the `<key-escape>` rule
                    processes the same fourteen escape sequences as
                    § 3.7, including `\uXXXX` (§ 3.7.1), identically
                    inside a <bare-segment> and inside a
                    <quoted-segment>. The backslash byte `\` is the
                    escape lead; `\.` produces a literal dot (does NOT
                    split a path segment); `\:` produces a literal
                    colon (does NOT act as the pair separator); `\"`,
                    `\'`, `` \` `` each produce their literal quote
                    byte (does NOT close a <quoted-segment> — only an
                    UNESCAPED occurrence of a segment's own delimiter
                    closes it, § 5.3.3); `\\` produces a literal
                    backslash; `\uXXXX` produces the named code point
                    and is likewise never re-examined as a structural
                    delimiter, regardless of which code point it
                    decodes to — the `<key-char>` / `<dq-char>` /
                    `<sq-char>` / `<bt-char>` exclusions above apply
                    only to raw, unescaped bytes; a decoded `\uXXXX`
                    code point (including a control code point such as
                    `U+0000`) is accepted as key content and is
                    subject only to the surrogate rule of § 3.7.1. Any
                    other `\X` form in a key is a `BadEscapeSequence`
                    error (§ 6.13).

                    The pair separator is the first **unescaped** `:`
                    (or `::`) scanning left-to-right, treating the
                    content of any <quoted-segment> encountered along
                    the way as opaque: scanning does not stop at a `:`
                    that falls between a segment's opening delimiter
                    and its own matching unescaped closing delimiter,
                    exactly as it already does not stop at an escaped
                    `\:` in a <bare-segment>. If a quote character
                    opens a segment (§ 5.3.3's positional rule) and no
                    matching unescaped closing delimiter is found
                    before end-of-line, scanning simply reaches
                    end-of-line without ever finding a separator —
                    identically to a line containing no `:` at all;
                    see § 5.3.3 for how this is diagnosed depending on
                    context. An escaped colon `\:` in a <bare-segment>
                    is part of the key segment, not a separator.

                    Dotted-path segmentation splits only on
                    **unescaped** `.` bytes, with the same
                    quoted-segment opacity: a `.` between a segment's
                    opening and closing delimiter is ordinary content,
                    never a path separator, and needs no escape there
                    (contrast a <bare-segment>, where `\.` is required
                    for a literal dot). A `\.` inside a <bare-segment>
                    is a literal dot within the current segment.

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
                      which of the fourteen forms produced the byte
                    - `"a.b": v`    → key "a.b", value "v" (flat, no
                                       nesting — same Value as `a\.b: v`
                                       above; § 5.3.3)
                    - `a."b.c".d: v` → path ["a", "b.c", "d"], value "v"
                                       ({"a": {"b.c": {"d": "v"}}}) —
                                       contrast `x.y\.z: v` above: the
                                       middle segment is quoted instead
                                       of bare-with-escape, same result

<sep-end>       ::= 1*ws | &line-end              ; ≥1 whitespace code point, or the line end
<raw-line>      ::= any-chars-until-line-end       ; source bytes before line end
                    ; semantic raw String body: trim trailing § 3.3 whitespace;
                    ; the maximal leading run was already consumed by <sep-end>
<value-part-opt> ::= <value-start> | ""             ; value-part is optional; "" ⇒ empty String
<value-start>   ::= "{" (ws) "}" (ws)                ; empty inline object
                  | "[" (ws) "]" (ws)                ; empty inline array
                  | "{" (ws) <inline-pair-list> (ws) "}" ; inline object (§ 5.8)
                  | "[" (ws) <inline-item-list> (ws) "]" ; inline array (§ 5.8)
                  | "{" (ws) &line-end                ; open object (multi-line body)
                  | "[" (ws) &line-end                ; open array (multi-line body)
                  | "(" (ws) &line-end                ; open multiline string (stripped)
                  | "((" (ws) &line-end               ; open multiline string (verbatim)
                  | "()" (ws)                        ; empty inline (yields "")
                  | "(())" (ws)                      ; empty inline (yields "")
                  | <scalar-body>                    ; scalar value, dispatched per § 5.2

<scalar-body>   ::= (ws) any-chars-until-line-end
                    ; trimmed; interpreted per § 5.2

<array-item-line> ::= <item-literal> | <item-inline> | <item-value>
<item-literal>  ::= (ws) "::" <sep-end> <raw-line> <line-end> ; raw string item
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) <line-end>
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) <line-end>
                  | (ws) "{}" (ws) <line-end>
                  | (ws) "[]" (ws) <line-end>
<item-value>    ::= <value-start> <line-end>

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) "::" (ws) <inline-raw-scalar> (ws)
                     | <key> (ws) <plain-inline-separator> (ws) <inline-value-opt> (ws)
<plain-inline-separator> ::= ":" !":"

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value-opt> ::= <inline-value> | ""

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-raw-scalar> ::= sequence of bytes after the raw marker,
                        terminated by the first unescaped "," / "}" /
                        "]" or by <line-end> (which is an error per
                        § 6.11); surrounding whitespace is trimmed from
                        this sequence before § 3.7 escape processing,
                        and the resulting bytes are the literal String
                        body. This production does NOT dispatch through
                        <inline-value> or <inline-scalar>; an initial
                        "{" or "[" is literal data.
<inline-scalar>    ::= sequence of bytes terminated by an unescaped
                       "," / "}" / "]" or by <line-end> (which is
                       an error per § 6.11); escape sequences per
                       § 3.7 are processed; surrounding whitespace
                       is trimmed before dispatch to § 5.2

<multiline-content-line> ::= any line within an open <multiline>
                             followed by <line-end>;
                             the terminator (")" or "))") ends the block
```

Notes on the notation:

- `(ws)` stands for zero or more line-bounded `ws` code points defined
  above; LF and CR are excluded.
- `1*ws` stands for **one or more** of those same line-bounded code points.
- `!` is a zero-width negative lookahead: `!X` succeeds only when `X`
  does not match at the current position, and consumes nothing.
- `<sep-end>` stands for "at least one line-bounded whitespace code point,
  or the end of the line". After a separator it MUST consume the whole
  immediately following contiguous run of such whitespace code points (the
  maximal run); the remaining bytes form the body. This also applies to a
  raw-marker array item, so both spaces in `::  x` belong to `<sep-end>`
  and the value is `x`, not ` x`. It is used after the multi-line pair
  separators (`:`, `::`). Writing `key:value` (no whitespace, no EOL
  after the separator) is a syntax error in the multi-line pair form — see
  § 6.10. Inline-compound pairs (§ 5.8) do not require whitespace after
  `:` / `::`.
- For array-item dispatch, after trimming, a leading `::` commits to
  `<item-literal>` before `<item-value>` is considered. If `<sep-end>`
  is absent (for example, the sole line `::x`), the parser MUST report
  `MissingSeparatorSpace` and MUST NOT fall back to scalar `<item-value>`.
- `&line-end` is a zero-width positive lookahead for `<line-end>`; it
  matches either eol or EOF without consuming it. Every line production
  consumes exactly one `<line-end>`, so a final line need not have a
  terminator byte. EOF is a terminal zero-byte marker: it may terminate only
  the final line production and the `<line-end>` at EOF may be consumed at
  most once; this prevents `<line>*` from repeating a zero-width `blank`
  production when `(ws)=0` at EOF.
- `any-chars-until-line-end` denotes zero or more source bytes and stops
  before (without consuming) `<line-end>`; the enclosing line production
  consumes it. The zero-length case permits an empty `<comment-body>`.
  `<raw-line>` is a line-bounded alias for the same zero-or-more form;
  its zero-length case permits an empty raw-marker `<item-literal>` or
  raw pair value.
- At an inline-pair position, the parser MUST recognise the two-byte raw
  marker `::` before the one-byte plain separator `:`. Equivalently,
  `<plain-inline-separator>` is inapplicable when the next byte is `:`;
  `::` can never be parsed as a plain `:` followed by a value. After
  `::`, the parser uses the dedicated `<inline-raw-scalar>` production,
  not `<inline-value>` or `<inline-scalar>`: it consumes through the
  first unescaped delimiter, processes escapes, and treats an initial
  `{` or `[` as literal content. The `::` marker therefore cannot
  open or recurse into a compound.
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
  expects the String `"9223372036854775808"`. § 8.1 / § 8.2 and
  `versions/0.7/tests/boundary-fixtures.json` define, at the level
  of individual leaves, exactly where and how a wider-domain
  implementation MAY legitimately diverge from a minimum-domain
  fixture oracle. The canonical textual form of an Integer
  is a base-10
  decimal string with no underscores and no leading zeros (except
  the literal `0`); a leading `+` is dropped; signed-zero literals
  (`+0`, `-0`) normalise to `0`. The canonical form is used by
  writer-conforming implementations (§ 5.9).
- **Float** — an abstract numeric scalar carrier. A programmatic Value MAY
  carry a finite or non-finite IEEE-style value; the carrier MUST
  distinguish NaN, +Infinity, and -Infinity so writer-conformance tests
  can supply the § 5.9.0 fixture for each sentinel. These sentinels are
  outside the parseable and canonical Float domains. A Float produced by
  parsing MUST be finite and belong to the implementation's **declared
  Float domain**. That declaration MUST include the finite
  values admitted as Ktav Floats, the decimal-conversion and rounding
  semantics used to parse and render them, and a deterministic conversion
  policy. Every non-zero finite Float admitted to the declared Ktav Float domain
  MUST have at least one finite decimal candidate `(s, D, k)` whose exact
  decimal value reparses under those declared semantics to exactly that
  Float (§ 5.9.8). Positive and negative zero are admitted separately by
  the zero rule in § 5.9.8. A wider host representation MAY contain non-zero
  finite values with no such candidate (for example, exact-rational `1/3`),
  but such a value is outside the declared Ktav Float domain and MUST NOT be admitted
  as a Ktav Float. The implementation MUST support at least the range and
  precision of IEEE 754 binary64 and MAY support a wider representation
  (e.g. arbitrary-precision decimal). For the minimum binary64 domain,
  converting a decimal float literal (§ 3.6) MUST follow IEEE 754's
  `roundTiesToEven` rounding-direction attribute, and the representation
  MUST include subnormal (gradual-underflow) values down to binary64's
  smallest positive subnormal (2^-1074 ≈ 4.9406564584124654 × 10^-324).
  An implementation that flushes subnormals to zero early, or rounds ties
  away from even, does not meet this floor even though it never produces a
  non-finite Float. The internal representation beyond the declared
  domain is implementation-defined. The canonical textual form (§ 5.9)
  MUST be used by writer-conforming implementations. The Value does **not**
  preserve the textual form as written; underscores, the choice of `e`
  vs `E`, and leading-`+` signs are not part of the Value model.
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
   an Object root. Because phase 1 reuses § 4's separator-scanning
   rule verbatim rather than a separate implementation, it inherits
   that rule's quote-awareness for free — a quoted-segment's
   content stays opaque to the scan even on this UNDECIDED first
   line, with no separate logic to keep in sync. Phase 2 is uniform
   validation: once the Object
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
handled per § 5.3 / § 5.4 / § 5.8 as raw Strings. Rules 1–4 (the
multi-line Object/Array/string openers) never apply to an inline
scalar body either: § 5.8.5 already dispatches an inline value's
leading `{`/`[` to nested-compound parsing before § 5.2 is ever
reached, and a lone inline `(` token or `((` token is an ordinary
String containing one ASCII byte (`"("`) or two ASCII bytes
(`"(("`), respectively, not a multi-line opener, since an inline
compound cannot continue onto a later line.

For rules 6–9, a body beginning with `{` or `[` is scanned with the
quote-aware, escape-aware delimiter rules of § 5.8. A closer is
**matching** only when it is unescaped and returns the compound's
delimiter depth to zero. If an invalid escape is encountered while
scanning for that closer, the result is `BadEscapeSequence` (§ 6.13),
which takes precedence over a missing closer. This precedence applies
before deciding between rules 8 and 9.
An unterminated quoted key remains quote-opaque and is diagnosed per
§ 6.16 as `UnterminatedInlineCompound`, even if an otherwise bad
escape occurs inside that unclosed quoted segment.
The scan is also scalar-aware: dispatch is decided once from the first
non-whitespace byte. If that byte is neither `{` nor `[`, later
`{`, `}`, `[`, and `]` bytes follow the inline-scalar delimiter
rules of § 5.8.5 rather than changing nested compound depth. A raw-marker
body is opaque to this dispatch: after `::`, § 5.8's
`<inline-raw-scalar>` treats those bytes as literal data and never enters
this compound scan.

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
8. If the body starts with `{` and a matching `}` occurs on the same
   line, but the body has non-whitespace content after that closer or
   has another structural defect inside the closed compound →
   `MalformedInlineCompound` (§ 6.12).
9. If the body starts with `{` and no matching `}` occurs on the same
   line → unterminated inline object — error (§ 6.11). The analogous
   rule applies to `[` and `]`: a same-line matching `]` followed by
   content, or enclosing any other structural defect, is
   `MalformedInlineCompound`; no same-line matching `]` is
   `UnterminatedInlineCompound`.
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
    its numeric value is finite in the implementation's declared
    Float domain (§ 5): Float carrying the numeric value parsed
    from the body. The declared-domain check includes § 5's requirement
    that every admitted non-zero finite Float have a finite decimal
    candidate that round-trips exactly under the declared conversion
    semantics; positive and negative zero are admitted separately by the
    zero rule of § 5.9.8.
    The internal representation is implementation-defined (see § 5
    description of Float); the canonical textual form is specified in
    § 5.9.8. A literal whose
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
of the trimmed, escape-processed byte sequence plus a retained
contained-recognised-escape provenance flag — the flag is part of the
classifier's input, not a license to re-run classification against
escape-produced bytes
as if they were raw, unescaped source: § 3.7's provenance rule (an
escape's output is never re-examined as structural) applies here too,
so a body like `\{value\}` classifies by the literal characters
`{value}` under rule 15 (String), not by re-entering these rules at
the decoded `{`. More generally: an inline scalar body containing at
least one recognised escape sequence (§ 3.7) is always classified as
String (rule 15), regardless of what its decoded bytes would otherwise
resemble — a body like `\u0031` (decoding to the single digit `1`) or
`\u0074rue` (decoding to `true`) is `String("1")` / `String("true")`,
never `Integer` or `Bool`. This closes an ambiguity § 3.7's provenance
rule alone left open: that rule's enumeration of "structural" bytes
(the delimiters `.`, `:`, `,`, `{`, `}`, `[`, `]`) does not by itself
say whether an *escaped* digit, letter, or parenthesis is likewise
exempt from rule 5's parenthesis shortcuts and rules 10–14's
keyword/numeric detection —
this sentence makes that exemption explicit and total: the presence of
any recognised escape sequence anywhere in the body is sufficient to
force String, full stop.
Two parser-conforming implementations that support
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
  (`<segment> ( <unescaped-dot> <segment> )*`, § 4). Each segment is
  either a `<bare-segment>` (`<bare-first-token> <key-token>*`, § 4)
  or, as of 0.7.0, a
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
  After `<sep-end>` consumes the maximal leading separator whitespace,
  trailing § 3.3 whitespace immediately before EOL or EOF is trimmed from
  the semantic raw String body. `<raw-line>` may still match those source
  bytes syntactically. A verbatim multi-line String (`((` ... `))`) is
  the form for preserving leading or trailing edge whitespace.
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

#### 5.3.1 Key Validation

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

#### 5.3.2 Dotted-Key Expansion

A pair `a.b.c: v` is semantically equivalent to a nested chain of
single-segment pairs: `a:` opens an Object containing `b:` opens an
Object containing `c: v`. Each intermediate name MUST resolve to an
Object. This equivalence is exact and applies regardless of how many
other pairs — dotted or plain — appear between two pairs that share a
dotted prefix: `a.b: 1` / `c: 2` / `a.d: 3` is exactly equivalent to
writing `a: {b: 1}` / `c: 2` / `a: {d: 3}` with the two `a` blocks
merged into one, in the order of `a`'s first appearance —
`{a: {b: 1, d: 3}, c: 2}`. An intervening sibling pair (`c: 2` above)
does not close the synthetic Object or invalidate a later pair that
reopens it.

Two directions of conflict both resolve to `KeyPathConflict` (§ 6.3),
because both amount to the same thing — a name being an Object in one
place and a leaf in another:

- A dotted-key pair whose path passes through a name that already
  holds a non-Object leaf Value — set either by an earlier plain pair
  (`a: 1` then `a.b: 2`) or by an earlier dotted pair that reached a
  conflicting depth — errors, since the dotted form needs that name
  to be an Object.
- Symmetrically, a plain (non-dotted) pair whose key names an Object
  already established by an earlier dotted-key pair (`a.b: 1` then
  `a: 2`) also errors: a plain pair always assigns its value directly
  as a leaf, and an Object cannot be silently overwritten by one.

The reverse of both is unrestricted and not a conflict: a dotted-key
pair extending into an Object that already exists — whether that
Object was itself created by an earlier dotted-key pair, or written
explicitly as `a: {...}` or `a: {}` — merges into it. `a: {x: 1}`
followed later by `a.y: 2` produces `{a: {x: 1, y: 2}}`, the same as
if `a.y: 2` had appeared adjacent to `a`'s own block; an explicit
Object is not "closed" against later dotted-key extension any more
than a synthetic one is.

Dotted keys are expanded the same way inside inline objects
(§ 5.8): `{a.b: 1, a.c: 2}` produces `{a: {b: 1, c: 2}}`.

#### 5.3.3 Quoted Keys

A key segment MAY be written as a `<quoted-segment>` (§ 4) instead of
a `<bare-segment>`: opened by `"`, `'`, or `` ` ``, running to the
first unescaped occurrence of that SAME character, which closes it.
Quoting is optional and purely a writer's convenience — it changes no
Value that a bare, escaped spelling could not already produce (§ 5.5
below) — offered because a segment needing several of `.` / `:` / `,`
/ `{` / `}` / `[` / `]` escaped is harder to read than the same
content quoted once.

- **Keys only.** Quoting (this whole § 5.3.3) applies only to key
  segments — § 4's `<key>` production. A quote character in any VALUE
  position — an inline scalar, a multi-line string, an array item —
  is ordinary content with no special meaning: it never opens a
  `<quoted-segment>`, is never a delimiter, and is never stripped or
  unwrapped there. `{a: "b"}` is the pair `a` mapped to the
  three-character String `"b"` (quote, `b`, quote — an ordinary bare
  inline scalar, per § 5.2's existing scalar-typing rules), not an
  unwrapped String `b`: 0.7.0 does not add JSON-style value quoting.
  This is NOT the same as saying the value-escaping rules are
  unchanged, though: § 3.7's three quote escapes (`\"`, `\'`,
  `` \` ``) are recognised in every escape-aware context alike,
  inline scalar values included, exactly as `\.` / `\:` already were
  — so an inline value's escape processing must now also accept all
  three quote-escape spellings, each decoding to its literal quote
  character. What is unchanged is only that raw, unescaped quote
  characters in a value still carry no structural meaning and are
  never delimiters.
- **Positional rule.** A quote character opens a `<quoted-segment>`
  if and only if it is the first code point of a segment's raw text
  *after* the same edge-whitespace trimming § 4 already applies to
  every segment. This positional test is re-applied fresh at the
  start of EVERY segment, with no exception — including a segment
  that immediately follows an unescaped dot: the dot still starts a
  new segment (§ 5.3.2), and a quote character sitting right after it
  is that new segment's own first code point, so it opens a
  `<quoted-segment>` there exactly as it would at the very start of
  the whole key. This is why `a."b.c".d: 1` is the three-segment path
  `["a", "b.c", "d"]` (§ 4's dotted-path example; the "Per-segment
  participation in dotted paths" bullet below) rather than stopping
  at two segments. Anywhere a quote character is NOT the first code
  point of a segment — mid-segment, or after other non-whitespace
  content within the same segment — it is an ordinary `<key-char>`,
  exactly as in every version before 0.7.0's quoted-key addition:
  `don't: 1` and `a"b: 1` are unaffected, and `port": 1` is still the
  five-character bare key `port"`.
- **Content is not trimmed.** Unlike a `<bare-segment>`, whitespace
  immediately inside a `<quoted-segment>`'s delimiters is ordinary
  content, preserved verbatim at both edges: `" a "` decodes to the
  three-code-point key space-`a`-space (not the one-character key
  `a`). This is why an all-whitespace quoted segment (`" "`) is a
  valid one-space key, not an `EmptyKey` (§ 6.5) — contrast a
  `<bare-segment>` of only whitespace, which trims to nothing and IS
  `EmptyKey`.
- **Escaping inside the delimiters.** The full fourteen-entry escape
  table (§ 3.7) applies identically to `<dq-token>` / `<sq-token>` /
  `<bt-token>` and to `<bare-segment>`'s `<key-token>` — there is no
  separate, smaller table for quoted content. The practical
  difference is which raw bytes are structural: inside a
  `<quoted-segment>`, `.` / `:` / `,` / `{` / `}` / `[` / `]` and the
  two quote characters OTHER than the segment's own delimiter are all
  ordinary content and need no escape at all (though their named
  escapes — `\.`, `\:`, etc. — still work if used, decoding to the
  same literal byte, exactly as `\.`/`\:` are already harmlessly valid
  inside an inline scalar value where dot and colon are not
  structural either); only the delimiter itself is structural, and
  only within its own segment — `` `it's "quoted"` `` is the
  unambiguous thirteen-code-point content `it's "quoted"`, because
  the terminator is fixed by the *opening* backtick: neither `'` nor
  `"` closes it. A raw control byte or DEL is forbidden inside
  a `<quoted-segment>` exactly as inside a `<bare-segment>` (§ 4's
  `<dq-char>` / `<sq-char>` / `<bt-char>` exclusions) — quoting
  relaxes which STRUCTURAL bytes need escaping, not the format's
  separate "no invisible bytes in keys" rule; a control byte or DEL is
  still only representable via `\uXXXX`.
- **Nothing may follow the closer within the same segment.** After a
  `<quoted-segment>`'s closing delimiter, only whitespace (already
  consumed by trimming — see § 4) may appear before the next
  `<unescaped-dot>` or the pair separator. Any other content there —
  `"a"b: 1`, `"a" "b": 1` — is an `InvalidKey` error (§ 6.4): there is
  no form combining quoted content with further bare or quoted
  content inside one segment; write two dotted segments instead
  (`"a"."b": 1`) if two distinct pieces are intended.
- **Unterminated quoted segments.** If a quote character opens a
  segment and no matching unescaped closing delimiter is found before
  end-of-line, § 4's separator-scanning rule simply finds no
  separator on that line at all — indistinguishable, at the scanning
  level, from a line containing no `:` anywhere. Bracket-balance
  scanning is likewise quote-opaque (the "Inline pairs" bullet
  below): an in-progress quoted segment swallows everything up to
  end-of-line, colons and brackets alike. Every line falls into
  exactly one of the following three contexts, and the outcome is
  determined entirely by which one:
  1. **Ordinary multi-line pair line, inside an already-established
     Object.** Every line dispatched as a pair line under § 5.1
     rule 8 — inside an already-established Object, including the
     top-level Object body once established — requires a separator;
     finding none is always an error. When the specific reason is an
     unterminated quoted segment, the diagnosis is the more specific
     `UnterminatedQuotedKey` (§ 6.16) rather than the generic
     `MissingSeparator` (§ 6.6) that a plain colon-free line would
     raise.
  2. **Inline key position, inside `{...}` (§ 5.8.2) — including a
     first content line that itself begins with `{` or `[`**, which
     § 5.0.1 rules 2–5 route by leading bracket/brace before rule 6's
     pair-candidate test is ever tried. Here the outcome turns on
     bracket-balance, not on separator-scanning: an unterminated
     quoted segment makes everything from the opening quote to
     end-of-line opaque to bracket-balance counting too, so a `}` /
     `]` that appears only *inside* the unterminated segment's reach
     does not count as a matching closer. `{"a: 1}` therefore does not
     close under rule 2 (the unterminated `"` swallows the rest of the
     line, closing brace included) and is not a lone `{` under rule 4
     either; it falls to § 5.0.1's note after rules 2–5, diagnosed as
     `UnterminatedInlineCompound` (§ 6.11) — never
     `MalformedInlineCompound` (§ 6.12 applies only to a structural
     defect INSIDE an already-closed compound, and this compound
     never closes: the swallowed closer means no matching `}` / `]`
     was found on the line at all) and never `UnterminatedQuotedKey`
     (§ 6.16 excludes this context explicitly): the compound-level
     defect is what a reader can actually see and fix, and there is
     no separate "the key inside was also unterminated" defect to
     name on top of it. This is an existing diagnostic path,
     unmodified by quoted keys; quoting only adds one more way a
     line can fail to bracket-balance, alongside an
     already-unterminated `{` / `[` with no quoting involved at all.
  3. **The document's still-undecided first content line, when that
     line does NOT begin with `{` or `[`** (§ 5.0.1) — a first line
     that DOES begin with `{` or `[` is context 2 above, never this
     one. Rule 6's phase-1 test is purely about whether a separator
     exists; finding none for any reason — no colon at all, or an
     unterminated quoted segment swallowing the rest of the line — is
     simply not a pair candidate, exactly as today. Root-kind
     detection falls through to rule 7: the line is an ordinary
     Array-root String item, quote character and all, with no error.
     `'tis the season` (no colon anywhere) is unaffected by quoting at
     all; `'tis the season: fa` — which before 0.7.0's quoted-key
     addition parses as an Object with the bare key `'tis the season`
     (an unescaped `'` was always an ordinary `<key-char>`) — is a
     root-Array String item under the new grammar instead (a breaking
     change; see Appendix A). A String array item that happens to need
     a leading quote character AND an unescaped colon to remain
     unambiguous on re-read can always use the raw-marker form
     (`:: 'tis the season: fa`, § 5.4 rule 1) — the existing escape
     hatch for exactly this class of ambiguity, unchanged by this
     addition.
- **Per-segment participation in dotted paths.** Quoting applies per
  segment, not to the whole key: `a."b.c".d: 1` is the three-segment
  path `["a", "b.c", "d"]`, expanding (§ 5.3.2) to
  `{a: {"b.c": {d: 1}}}` — the dot inside the quoted middle segment is
  ordinary content and does not itself split further, exactly as
  `\.` already keeps a dot inside a bare segment from splitting.
- **Equality is on decoded content.** § 5.5's `DuplicateKey` check
  compares the fully decoded effective key, independent of which form
  produced it: a pair keyed `"a.b"` and a pair keyed `a\.b` in the
  same Object name the same single-segment key `a.b` and collide.
- **Inline pairs.** `<inline-pair>` (§ 5.8.2) uses the same `<key>`
  production, so quoted keys are recognised identically inside inline
  objects: `{"a}b": 1, c: 2}` is `{"a}b": 1, "c": 2}` — the `}` inside
  the quoted key is ordinary content, not the inline object's closing
  brace, because it is read while still inside the `<quoted-segment>`
  before the key-position scan ever reaches the position where an
  inline-object-closing `}` would be recognised. This is the same
  opacity the separator/dot scan already has (§ 4) applied to the
  bracket-balance test every "is this line a **closed** inline
  compound, or **unterminated**" determination already performs — the
  first-content-line shape test of § 5.0.1 rules 2–3, and the general
  balanced-content check behind `UnterminatedInlineCompound` /
  `MalformedInlineCompound` (§ 5.8.5, § 6.11, § 6.12) — all of which
  already treat an escaped bracket (`\{`, `\}`, `\[`, `\]`) as
  non-structural; a bracket inside a quoted key segment is opaque to
  bracket-balance counting for the identical reason an escaped one is:
  it is read as ordinary content, before the scan reaches a position
  where it could be recognised as a structural delimiter at all. A
  top-level `{"a}b": 1, c: 2}` is therefore still `§ 5.0.1` rule 2's
  closed inline object (the `}` inside the quoted key does not
  prematurely close it), and its canonical form is the fully expanded
  root-level pair list of § 5.9.3, exactly as any other top-level
  inline object's would be.

  The same opacity applies to the **comma** that splits an inline
  compound's body into elements/pairs (§ 5.8, § 5.8.3, § 6.12) — not
  only to bracket-balance detection above. A comma between a
  `<quoted-segment>`'s opening and closing delimiter is ordinary
  content, not an element/pair separator, for the identical reason a
  bracket inside one is not a structural delimiter: it is read as
  ordinary content before the comma-splitting scan ever reaches a
  position where a `,` could be recognised as structural. `{"a,b": 1,
  c: 2}` is therefore unambiguously exactly two pairs — key `a,b`
  mapped to `1`, and key `c` mapped to `2` — never three
  comma-delimited fields; the comma inside the quoted key does not
  count as a pair separator, and so cannot itself introduce a leading
  comma, an empty inline-array item, or a "two or more consecutive
  commas" defect (§ 6.12) — it was never a splitting position to
  begin with.

### 5.4 Array-Item Lines

An array-item line introduces one Value inside the innermost open
Array (or the top-level Array, § 5.0.1). The forms are:

1. **Raw-marker item** — any trimmed array-item line beginning with
   `::` commits to raw-marker syntax before any other item
   classification. The body after `::` is a literal String (no type
   inference). `<sep-end>` rules apply: whitespace or EOL after `::`
   is required, and the maximal contiguous run of following whitespace
   belongs to `<sep-end>` (so `::  x` has value `x`). If the
   required separator-end is absent, as in `::x`, the result is
   `MissingSeparatorSpace`; the line MUST NOT fall through to scalar
   classification.
   The syntactic `<raw-line>` may include trailing § 3.3 whitespace,
   but after `<sep-end>` consumes the maximal leading run, trailing § 3.3
   whitespace immediately before EOL or EOF is trimmed from the semantic
   String body. Use a verbatim multi-line String (`((` ... `))`) to
   preserve edge whitespace.
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
- **Verbatim form (`(( … ))`)**: every line between the opener and the
  closer — including a blank line and a whitespace-only line — is a
  content line. The parser joins them byte-for-byte with single `\n`
  bytes; no whitespace stripping — leading or trailing — is performed on
  any line, and no line is dropped as having "no effect" the way an
  ordinary blank line elsewhere in the document does (§ 5.1 rule 1):
  inside a verbatim block, a blank line contributes an empty string to
  the joined result, exactly as it already does for the stripped form.

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
{a: 1, b: 2,}
[1, 2, 3]
[1, 2, 3,]
```

The second Object and the fourth Array show the permitted single
trailing comma; the comma is syntax, not an inline comment.

#### 5.8.1 Whitespace

Whitespace is optional everywhere inside an inline compound:

```
{a: 1, b: 2}
{ a : 1 , b : 2 }
{a:1,b:2}
```

All three forms parse to the same Value. None is canonical writer
output: a writer emits a non-empty compound in multi-line form (§ 5.9.3).

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

The raw `::` branch of an inline pair is not an inline value: it uses
the dedicated raw-scalar production of § 4, consumes to the containing
unescaped delimiter, processes escapes, and treats a leading `{` or
`[` as literal content. The dispatch rules below apply only after a
plain `:` separator.

When an inline scalar begins with `(` or `((`, these leading parentheses
remain ordinary content inside inline compounds, not multi-line string
openers. The raw body runs until the first unescaped inline terminator (`,`,
`}`, or `]`). Surrounding whitespace is then trimmed from the raw bytes,
and escape processing is performed according to § 5.8.1 and § 3.7. For a lone
`(` or lone `((` immediately before a terminator (e.g. `{a: (, b: 1}` or
`{a: ((, b: 1}`), the result is `String("(")` or `String("((")`,
respectively. If no inline terminator occurs before the end of the line, the
outer inline compound yields `UnterminatedInlineCompound` (§ 6.11).
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
that § 5.9.7 excludes. The canonical form is byte-deterministic within
a declared domain: for any given representable Value, writer-conforming
implementations that declare the same Value domain, including the same
Integer/Float domains and Float decimal-conversion and rounding
semantics, MUST produce the same byte sequence. Each implementation
MUST use its declared domain and conversion policy deterministically.
Implementations with different declared domains or conversion semantics
MAY produce different canonical bytes where those declarations lead to
different Values or candidate choices; this is not a relaxation of
determinism within a shared declaration. A
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
  node-representable: § 4's grammar guarantees a non-empty
  `<bare-segment>`, and a `<quoted-segment>`'s non-emptiness is
  enforced separately, by § 6.5's `EmptyKey` check rather than by
  § 4's grammar (a `<quoted-segment>` can be grammatically empty) —
  either way, no document can produce a pair with an empty key
  segment (the parse-side counterpart is the `EmptyKey` error,
  § 6.5).
- **Array:** every item of V is node-representable.
- **Float:** The abstract programmatic Float carrier may carry NaN,
  +Infinity, and -Infinity as distinct sentinels, but those sentinels are
  not node-representable. A Float V is node-representable only when it is
  finite — neither NaN nor ±Infinity — and belongs to the declared Ktav
  Float domain of § 5. Consequently, if V is non-zero,
  it has at least one finite decimal candidate that round-trips exactly
  under the domain's declared conversion semantics (§ 5.9.8). Positive
  and negative zero are admitted separately by § 5.9.8's zero rule. A
  wider host representation may contain a non-zero finite exact value with no such
  candidate (for example, exact-rational `1/3`); that value is outside the
  Ktav Float domain and is not an additional writer error case. No literal
  grammar of § 3.6 produces a non-finite Float (an overflowing literal
  falls through to String at § 5.2 rule 14), and § 5.9.8 defines no
  canonical textual form for one.
- **String:** V is node-representable under § 5.9.7's rules (no
  `CR` byte, and none of the pathological multi-line collision
  cases defined there).
- **Null, Bool, Integer**: always
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
`CR` byte enters a String through an inline-compound `\r` escape or
the generic `\uXXXX` escape naming code point 000D (§ 3.7, § 3.7.1).
Such a document is accepted by a parser-conforming
implementation, while serialising the resulting Value MUST fail —
which is why non-representable Values sit outside the round-trip
identity of § 8.3.

Each non-representability case above has a stable **reason code**,
normative regardless of how any given implementation's API surfaces
it. Every `.json` file in `versions/0.7/tests/unrepresentable/`
and `versions/0.7/tests/parseable-unrepresentable/` MUST be a JSON object
with exactly these three fields and no others:

- `value`: a recursively valid JSON mapping of the Value. JSON objects
  map to Objects and arrays to Arrays; JSON null, booleans, and strings
  map to the corresponding scalar kinds. An ordinary JSON number maps
  to Integer when its lexical token contains none of `.`, `e`, or
  `E`, and to Float otherwise, including `-0.0`; it MUST be finite.
- `unrepresentable_reason`: exactly one of the seven reason codes in
  the table below.
- `note`: a non-empty explanatory String.

Only the following category-specific file sets and reason codes are allowed:

- `unrepresentable/` contains one `<name>.json` per fixture and no
  other files. Its reason MUST be `ScalarRoot`, `EmptyKeyName`, or
  `NonFiniteFloat`; these Values are programmatic-only.
- `parseable-unrepresentable/` contains one `<name>.ktav` plus one
  `<name>.json` per fixture and no other files. Its reason MUST be one
  of the parser-producible String cases `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision`, or `LeadingWhitespaceCollision`.
  A canonical-output file MUST NOT be present.

The `value` mapping MUST be checked recursively. An empty Object key
is the witness for the `EmptyKeyName` case. A String or Object key
MUST NOT contain a lone surrogate. An unrepresentable fixture that
encodes a non-finite Float MUST use the sentinel object with exactly one
field, `{"$float": "NaN"}`, `{"$float": "Infinity"}`, or
`{"$float": "-Infinity"}`; no other shape is a valid sentinel. This
fixture-encoding sentinel is permitted only in `unrepresentable/`. The
sentinel denotes a programmatic value in the abstract Float carrier,
not a parsed Float, a canonical Float, or a node-representable Float. The
three spellings MUST remain distinct so a writer-conformance implementation
can supply and reject each one. The
rule does not reserve the key name: a parser-produced Object MAY contain
a literal `$float` key like any other key, and its `value` root MUST
be an Object or Array.
A reason code is valid for a fixture only when
its case occurs somewhere in the Value tree, except `ScalarRoot`,
which requires that the root itself is a scalar. The root MUST be an
Object or Array for every other reason code. These checks MUST NOT infer
meaning from a fixture filename. For the three collision reason codes,
segments are separated by LF; a String containing no LF has one segment.

The parser and writer obligations for `parseable-unrepresentable/` are
specified separately by § 8.1 and § 8.2.

A writer-conforming implementation's own error type MAY take any shape
(exception class, error enum, tagged union, ...) — only the code names
and the case each identifies are normative, not the API through which a
caller observes them:

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

The three `NonFiniteFloat` fixtures separately cover NaN, positive
Infinity, and negative Infinity.

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

A pair separator is selected by the kind/content of its value. The writer
MUST test the following branches in order; exactly one branch applies:

- **Non-String scalar pair:** emit the key, the plain `: ` separator with
  exactly one ASCII U+0020 SPACE, and the canonical scalar body. Null emits
  `null`; Bool emits `true` or `false`, using the exact § 5.2 keyword
  spellings; Integer and Float use the canonical bodies of § 5.9.8. This
  branch never uses the raw marker `::`.

- **`key:` (no body after the colon):** when the value is the
  empty String `""`.
- **`key: <bytes>` (plain separator + exactly one ASCII U+0020 SPACE +
  String body):**
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
- **`key:: <bytes>` (raw-marker String pair):** when the bytes are a physically
  safe non-empty one-line String under § 5.9.7 — with no `LF` or `CR`,
  leading/trailing whitespace, or ASCII control byte other than `TAB` —
  that would otherwise be reinterpreted by § 5.2
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

An array-item form is selected by the kind/content of its value. The writer
MUST test the following branches in order; exactly one branch applies:

- **Bare non-String scalar item:** emit the canonical scalar body on its own
  line at the current indent, with no raw marker. Null emits `null`; Bool
  emits `true` or `false`, using the exact § 5.2 keyword spellings;
  Integer and Float use the canonical bodies of § 5.9.8. This branch is
  selected before every String and compound branch below and is not subject
  to the first-item Array-root safeguards of the bare String branch.
- **Empty String item:** emit the raw-marker line `::` with no body at the
  current indent.
- **Bare String item:** `<bytes>` on its own line at the current
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
  it is one for root detection). Independently of the pair-candidate
  test, the bare form is also not used — regardless of whether that
  test applies — when the item is the first item of an Array root and
  the body begins with U+FEFF (§ 5.9.12): bare form would place the
  raw 3-byte UTF-8 encoding of U+FEFF at byte offset 0 of the
  document, which § 3.1 requires a conformant reader to strip as a
  metadata byte-order mark, silently losing the code point on
  re-parse. Only the Array root's
  first item is exposed to § 5.0.1's root-kind detection; every
  other item position is dispatched directly as an array-item line
  regardless of its shape (§ 5.1 rules 7–8), so neither exclusion
  applies there.
- **Raw-marker String item:** `:: <bytes>` — after `::`, `<sep-end>` consumes
  the maximal contiguous run of line-bounded whitespace before the body;
  thus `::  x` has body `x`, not ` x`. This branch applies only when the
  body is a physically safe non-empty one-line String under § 5.9.7 — with
  no `LF` or `CR`, leading/trailing whitespace, or ASCII control byte other
  than `TAB`. The body would otherwise
  be reinterpreted by § 5.2 as a number, keyword, an inline
  compound, a multi-line-string opener (a body of exactly `(` or
  `((`), or (via § 5.7's shortcuts) the empty String, or would
  otherwise collide with a line-level structural token (a body of
  exactly `}` or `]`, or starting with `##` or with the two-byte
  sequence `::`), or (when the
  item is the first item of an Array root) would otherwise satisfy
  § 5.0.1 rule 6's phase-1 pair-candidate test as described above, or
  (likewise only for the first item of an Array root) begins with
  U+FEFF (§ 5.9.12).
  The raw-marker form
  itself is immune to both of these first-item hazards: a line
  beginning `::` has
  no key segment before the separator, so it never matches
  `<pair-line>`'s grammar and is read as this Array's first item
  (§ 5.0.1 rule 7) without needing the root-wrap of § 5.9.3, and its
  content begins only after the literal `:: ` prefix, never at byte
  offset 0.
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

The writer MUST test the following branches in order; the first matching
branch determines the result or form-selection path:

- **Contains a `CR` byte (`0x0D`):** the Value is **not
  representable** in canonical form. A `CR` byte in a String can
  only be produced through the `\r` escape or the generic `\uXXXX`
  escape naming code point 000D, inside an inline compound
  (§ 3.7, § 3.7.1), and canonical form never emits inline
  compounds for non-empty scalars. A writer-conforming
  implementation MUST reject such a Value with an error rather
  than serialise it; it is outside the scope of the round-trip
  property of § 8.3. Portable documents SHOULD NOT rely on `CR`
  bytes in String values.
- **Requires multi-line representation:** when *body* contains `LF`,
  has leading or trailing whitespace (§ 3.3), or contains an ASCII
  control byte in `0x00`–`0x1F` other than `0x09` `TAB`, `0x0A`
  `LF`, and `0x0D` `CR` (which the preceding branch rejects), select
  multi-line representation and apply the collision and
  representability checks below. Subject to those checks, use verbatim
  form `((` … `))`: emit the opener on the value line (preceded by
  `key: ` for a pair, or alone for an item) at the current indent,
  split *body* on `LF`, emit every resulting segment as one line at
  **indent 0**, and emit the closer `))` on its own line at the current
  indent. Verbatim body segments have no writer-added indentation,
  because verbatim form preserves bytes exactly. The checks below
  override this default by requiring stripped form or rejection where
  applicable.
- **Empty String (`""`):** emit as `key:` (no body after the
  colon) for a pair, or `::` (no body) for an array item.
- **Physically safe non-empty one-line String:** this branch applies
  only when no preceding branch matched. The writer MUST then apply the
  exhaustive rule for the actual syntactic position. For a pair, apply
  § 5.9.5: use plain `key: <body>` only when its dispatch conditions
  hold, and otherwise use raw-marker `key:: <body>`. For an array item,
  apply § 5.9.6: use bare `<body>` only when the same plain-form
  dispatch conditions hold and none of the item-position hazards apply,
  and otherwise use raw-marker `:: <body>`. These delegated rules
  include numeric and `null` / `true` / `false` collisions, `{` /
  `[` prefixes, the `(` / `((` / `()` / `(())` dispatch forms,
  item bodies exactly `}` or `]`, item bodies starting with `##` or
  `::`, and the first-Array-root-item pair-shape and U+FEFF hazards.
  They are exhaustive within this branch; this section MUST NOT select
  plain or bare form where § 5.9.5 or § 5.9.6 requires a raw marker.

For example, String bodies `" x"` and `"x "` select the multi-line
branch and round-trip through verbatim form, whereas `"{abc"` reaches
the physically safe one-line branch and uses `key:: {abc` in a pair or
`:: {abc` in an array-item position because its `{` prefix collides
with compound dispatch.

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
- **Float:** the declared Float domain includes the decimal-conversion
  and rounding semantics used by parsing and writing, and its conversion
  policy MUST be deterministic. Every non-zero finite Float admitted to
  the Ktav Value model MUST have at least one finite decimal candidate
  `(s, D, k)` that round-trips exactly under those semantics. Positive
  and negative zero are admitted separately by the zero rule below. A
  host representation's non-zero finite value without such a candidate
  (for example exact-rational `1/3`) is outside the declared Ktav Float domain,
  rather than an additional writer error case. For the minimum binary64 domain, the
  declared rounding semantics MUST be IEEE 754 `roundTiesToEven`. The chosen textual form matches one of the two
  alternatives of § 3.6:
  - `sign? digits "." digits ("e" sign? digits)?`
  - `sign? digits "e" sign? digits`

  For each non-zero finite Float V, define a **normalised decimal
  candidate** as a tuple `(s, D, k)`: `s` is `+1` or `-1` and
  matches V's sign; `D` is a non-empty sequence of ASCII decimal
  digits whose first and last digits are non-zero; and `k` is an
  integer decimal exponent. Its exact decimal value is
  `s × integer(D) × 10^k`. A candidate qualifies when parsing that
  exact value with the implementation's declared Float domain and its
  required rounding rule produces exactly V.

  Choose a qualifying candidate with the fewest digits in `D`. For
  IEEE 754 binary64, this is the shortest decimal that round-trips to
  the same binary64 under roundTiesToEven. If several candidates have
  that minimum digit count, choose the one whose exact decimal value is
  nearest to V; if the distance ties, prefer an even final digit of
  `D`; if still tied, choose the smaller pair `(D, k)`, comparing
  `D` bytewise first and then `k` as a signed integer. This selection
  is normative and deterministic. A Ryu / Grisu / Steele-White-class
  algorithm MAY be used to find it.

  Zero is handled separately from this candidate rule: positive zero
  emits as `0.0` and negative zero as `-0.0`. Unlike Integer `-0`,
  which normalises to `0`, Float preserves the sign of zero.

  For a non-zero V, after choosing `(s, D, k)`, let `n` be the number
  of digits in `D` and `abs` the absolute numeric value of V. If
  `0 < abs < 1e-2` or `abs >= 1e7`, use scientific form; otherwise
  use decimal form.

  In scientific form, the adjusted exponent is `E = k + n - 1`.
  Emit the first digit of `D`, followed by `.` and the remaining
  digits only when `n > 1`, then lowercase `e` and E in base 10.
  E has a minus sign only when negative, no plus sign, and no leading
  zeroes. Prefix `-` when `s = -1`. This gives exactly one digit
  before any decimal point and no redundant mantissa or exponent zeroes.

  In decimal form, let `p = n + k` and place the point as follows:
  if `p <= 0`, emit `0.`, then `-p` zeroes, then D; if
  `0 < p < n`, insert `.` after the first p digits of D; if
  `p >= n`, emit D, then `p - n` zeroes, then `.0`. Prefix `-`
  when `s = -1`. Thus every decimal-form Float contains a point,
  including a whole-valued Float.

  The thresholds are exact. The corresponding canonical examples are
  `0.01`, `1e-3`, `1.5e-3`, `-1e-3`, `9999999.0`, `1e7`, and
  `120000000.0` → `1.2e8`.

  Two writer-conforming implementations declaring the same Value domain,
  the same Float representation, and the same decimal-conversion and
  rounding semantics MUST produce identical output for the same Value.
  The test fixtures `*.canonical.ktav` assume binary64 semantics;
  implementations declaring a different domain or conversion semantics
  MAY produce different output only where those declarations yield a
  different Value or candidate.

#### 5.9.9 Keywords

`null`, `true`, `false` — lowercase, exactly as shown.

#### 5.9.10 Keys

A key segment is emitted after escape processing and the trimming
rule of § 4. Internal whitespace is preserved. Dotted keys are NOT
re-expanded: a Value parsed from `a.b.c: 1` is indistinguishable
in the Value model from one parsed from `a: { b: { c: 1 } }`, and
the canonical writer chooses the explicit nested form (not the
dotted form).

A key segment is emitted in one of two forms — **bare** or
**quoted** (§ 5.3.3) — decided by one rule: emit **bare** (the
re-escape recipe below) unless (a) bare form would require escaping
at least one byte that a `<quoted-segment>` (§ 4) admits as literal,
unescaped content — the structural bytes `.`, `:`, `,`, `{`, `}`,
`[`, `]` (bullet 1 below, excluding `\`, LF, and CR), or `(` / `)` (part of
bullet 2 below, since neither opens a multi-line string at a
key-segment position) — or an edge-whitespace escape (bullet 3
below) for a byte a `<quoted-segment>` admits raw at that edge
position — true for tab, VT, FF, and any non-ASCII § 3.3 whitespace
code point, but not for LF or CR, which a `<quoted-segment>` never
admits raw at all, edge or interior (§ 4's `<dq-char>` /
`<sq-char>` / `<bt-char>` exclude them everywhere; see the exemption
below); or (b) the segment's decoded content begins with `"`, `'`,
or `` ` `` (a leading quote character in bare form would be misread
as opening a `<quoted-segment>` on re-parse, so it always forces
quoted form even though nothing else in the segment needs escaping);
or (c) this segment is the first segment of the root Object's
first-serialized key (§ 5.9.3) and its decoded content begins with
U+FEFF — bare form would then place the raw 3-byte UTF-8 encoding of
U+FEFF at byte offset 0 of the entire document, indistinguishable
from the metadata byte-order mark that § 3.1 requires a conformant
reader to strip before any key is even recognised, silently losing
the code point on re-parse; quoted form's opening `"` occupies byte
offset 0 instead, so the U+FEFF is never mistaken for a BOM and
needs no escape of its own once quoting moves it off that position
(§ 5.9.12 states this guard generally, alongside the analogous
Array-root-first-item case); or (d) this segment is the key's first
segment and its decoded content begins with the two-byte sequence
`##` — this is not an escaping requirement at all, unlike (a)–(c):
no bare-form escape changes the RAW first two bytes § 5.1 rule 2
inspects on re-read, so no amount of escaping elsewhere in the
segment prevents a raw `##`-prefixed bare line from being dispatched
as a comment; quoted form's opening `"` is the only way to avoid
that collision, since it is the only form whose first byte is never
`#`. A need to escape
a literal backslash, LF, CR, a control byte, or DEL — bullet 1's
`\\`/`\n`/`\r` entries and the control-byte/DEL part of bullet 2,
at any position in the segment, including its first or last byte —
does NOT by itself trigger quoted form: a `<quoted-segment>` excludes
and escapes each of these exactly as a `<bare-segment>` does
(§ 4's `<dq-char>` / `<sq-char>` / `<bt-char>`, § 5.3.3), so quoting
buys nothing for them, and bare remains the simpler, equally-escaped
choice — an edge LF or CR falls under this exemption, not under
(a)'s edge-whitespace disjunct above. Otherwise (quoted form selected) the delimiter is `"` unconditionally
— the choice of delimiter is fixed, not content-dependent, so the
writer never needs to scan the content against all three candidates
first. Either form parses back to the same key (§ 5.3.3), but which
one the writer emits is not a free choice: it is fully determined by
this rule, with no discretion left once the content is known (§ 5.9's
determinism requirement).

When bare form is selected, the writer MUST re-escape every code
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

A canonical writer never actually reaches this recipe for a
`##`-prefixed key's first segment: form-selection rule (d) above
already routes it to quoted form before bare form is even
considered, because no escape within bullets 1-3 changes the raw
first two bytes of the emitted line. `\u0023#a\:b` (escaping
only the leading `#`, per the original bare-form recipe this
replaces) remains a valid, decodable, non-canonical INPUT spelling
for the key `##a:b` — a parser MUST still accept it — but it is
never the canonical OUTPUT: the canonical form of any key whose
content begins with `##` is always quoted, `"##a:b"`, per (d), not
`\u0023#a\:b`.

When quoted form is selected, the writer emits the segment's decoded
content between two `"` characters, escaping only:

- a raw `"` in the content, as `\"` — the only byte structural
  inside a quoted segment, since `"` is the fixed delimiter;
- `\` (backslash), as `\\` — backslash is always the escape lead,
  in both forms;
- LF / CR, as `\n` / `\r` — a key MUST remain single-line;
- any other control byte below `0x20` that is not a § 3.3
  whitespace member, or DEL, as `\uXXXX` — quoting relaxes which
  STRUCTURAL bytes need escaping, not the format's separate
  prohibition on raw invisible, non-whitespace bytes in a key
  (§ 5.3.3). A control byte that IS a § 3.3 whitespace member (tab,
  VT, FF) is excluded from this bullet for the same reason it is
  excluded from bare form's analogous bullet above: § 4's
  `<dq-char>` / `<sq-char>` / `<bt-char>` already admit it raw, so
  it needs no `\uXXXX` escape here, whether it occurs at an edge or
  in the interior of the segment (see the edge-whitespace point
  below, which is not limited to non-control whitespace).

`.`, `:`, `,`, `{`, `}`, `[`, `]`, `(`, `)`, `'`, and `` ` `` need no
escaping in quoted form, and neither does edge whitespace: a
`<quoted-segment>`'s content is never trimmed on re-parse (§ 5.3.3),
so bare form's bullet above — escaping edge whitespace to survive
re-parse trimming — has nothing to guard against here. A leading
`##` likewise needs no escaping of its own in quoted form: the line
begins with `"`, not `#`, so § 5.1 rule 2's comment hazard never
arises for a quoted key in the first place.

This ensures that the canonical output round-trips in either form:
unescaped dots in a canonical bare key are path separators only,
structural bytes never appear raw outside a quoted segment's
delimiters, no edge whitespace is lost to re-parse trimming, and a
quoted segment's own delimiter never appears raw inside it. A key
segment containing a literal `.` or `:` — a structural byte needing
escape in bare form — is therefore always emitted quoted instead,
per the form-selection rule above; a key segment containing only a
literal `\`, LF, CR, a control byte, or DEL is NOT — bare form
escapes those identically and quoting would not remove the escape.

Examples: the key `a.b` (a literal dot) is emitted as `"a.b"` (not
`a\.b` — quoting is preferred once any STRUCTURAL escape would
otherwise be needed); the key `a:b` is emitted as `"a:b"`; the key
`hello` (no escape needed, does not begin with a quote character) is
emitted bare, unchanged; the key `path\to` (a literal backslash, no
structural byte) is emitted bare as `path\\to`, unchanged from
before this addition — quoting it (`"path\\to"`) would need the
identical `\\` escape for no benefit; the key `"port"` (six
characters: a leading and a trailing `"`) is emitted as `"\"port\""`
(quoted is forced by the leading `"` alone, even though the interior
needs only the one escape for the delimiter's own two occurrences);
the key U+FEFF followed by `host` (five code points), when it is the
root Object's first-serialized key, is emitted as `"` immediately
followed by a raw U+FEFF and then `host"` (quoted by rule (c) above;
the U+FEFF itself is emitted raw, needing no escape, since quoting
alone already moves it off byte offset 0) —
but the identical five-code-point key at any OTHER pair position
(not the document's first-serialized key) is emitted bare and
unchanged, since only the root's first-serialized key's first
segment can ever land at byte offset 0 (§ 5.9.12).

#### 5.9.11 Order

Object pairs are emitted in insertion order — the order in which
they appear in the parsed input, or the order in which the Value
was constructed. Implementations MUST preserve and emit this order.
Array items are emitted in natural array order.

#### 5.9.12 First-output-byte guard

§ 3.1 requires a conformant reader to strip exactly one leading
U+FEFF — decoded from the raw 3-byte UTF-8 sequence `EF BB BF` — if
and only if it is the very first code point of the entire document,
and requires the canonical writer to never emit a leading
byte-order mark. These two rules interact badly with ordinary
content: if the writer ever placed the raw 3-byte encoding of
U+FEFF at byte offset 0 of otherwise-ordinary output, a conformant
reader would strip it as a metadata BOM per § 3.1, silently losing
that code point on re-parse — a canonicalisation that would not be
idempotent or round-trip-safe. This can only happen at two
positions; nowhere else in canonical output can a Value's own
content reach byte offset 0, since every other position is preceded
by at least one byte of surrounding structure (a parent key, a
separator, a line terminator, indentation, a compound opener, or an
array-item marker).

- **Root Object, first-serialized key.** If the root is a non-empty
  Object and the first segment of its first-serialized key's decoded
  content begins with U+FEFF, § 5.9.10's form-selection rule forces
  quoted form for that segment (rule (c)). The segment is then
  written `"…"`, so byte offset 0 of the document is `"` (`0x22`),
  never the raw encoding of U+FEFF; the U+FEFF itself appears later
  in the byte stream, as ordinary quoted content, and needs no
  escape of its own (§ 5.3.3 permits U+FEFF raw inside a
  `<quoted-segment>` — it is neither a control byte nor DEL).
- **Root Array, first item.** If the root is a non-empty Array and
  its first item is a String whose canonical form would otherwise be
  the bare, one-line form of § 5.9.7 with content beginning with
  U+FEFF, the writer MUST instead use the raw-marker form
  (`:: <body>`, § 5.9.6) for that one item, even though § 5.9.7's
  ordinary bare-form conditions are otherwise satisfied. The
  raw-marker's own two bytes (`::`) occupy byte offset 0, so the
  item's content — including the leading U+FEFF, carried through
  unescaped since the raw-marker form applies no escape processing
  (§ 5.4 rule 1: "literal String, no type inference") — begins only
  after `:: `, never at byte offset 0.

Both cases are narrow, form-selection overrides: they change which
of two already-normative forms the writer must pick for the one
position (the root's first-serialized key, or its first item) whose
content the format ever places at byte offset 0. They do not add a
new non-representability case to § 5.9.0 — a key or first-item
String beginning with U+FEFF remains representable — and they do
not apply to any other key or item position, since no other
position's content can ever reach byte offset 0 of the document.

## 6. Errors

A conforming parser MUST detect and report each of the error
categories below for inputs that exhibit the relevant defect. Source-
content parse errors MUST carry, at minimum, a 1-based source line
number and a half-open byte-offset Span `[start, end)` covering the
offending region. This location requirement does not apply to `Io`
errors (§ 6.8); their location MAY be absent or implementation-defined.

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

A dotted-key path that passes through a name already holding a
non-Object leaf, or a plain (non-dotted) pair whose key names an
Object already established by an earlier dotted-key pair, is a
`KeyPathConflict` error (§ 5.3.2). Reopening a synthetic-prefix
sub-Object — via a later dotted-key pair sharing the same prefix,
after any number of intervening sibling pairs — is NOT a conflict;
see § 5.3.2's merge semantics.

### 6.4 Invalid Key

A key segment containing a forbidden character is an `InvalidKey`
error. This also covers a quoted segment (§ 5.3.3) that closes
correctly but is followed — before the next `<unescaped-dot>` or the
pair separator — by anything other than whitespace (`"a"b: 1`), and
a raw control byte or DEL occurring unescaped inside a quoted
segment (§ 4's `<dq-char>` / `<sq-char>` / `<bt-char>` exclusions,
same prohibition as in a bare segment).

### 6.5 Empty Key

A key segment that is empty after trimming — whether the entire key
(a pair line with nothing before the separator) or one segment of a
dotted key (e.g. `a..b`) — is an `EmptyKey` error (§ 5.3.1). This
includes an empty quoted segment (`""`, `''`, ` `` `) — but NOT a
quoted segment containing only whitespace (`" "`), since a
`<quoted-segment>`'s content is never trimmed (§ 5.3.3).

### 6.6 Missing Separator

A line dispatched to pair-line mode that contains no
**unescaped** `:` separator is a `MissingSeparator` error. This
applies inside the body of an open multi-line Object, or at the
top level when the root is an Object. When the specific reason no
separator was found is an unterminated quoted key segment (§ 5.3.3),
the more specific `UnterminatedQuotedKey` (§ 6.16) is reported
instead.

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
The same rule applies to an array-item line whose trimmed content begins
with `::`: `::x` commits to the raw-marker form and is
`MissingSeparatorSpace`, never a scalar fallback.

Inline-compound pairs (§ 5.8) do NOT require whitespace after the
separator and so do NOT raise this error.

### 6.11 Unterminated Inline Compound

A `{` or `[` appearing in a value-position is an
`UnterminatedInlineCompound` error when its quote-aware structural
scan finds no matching `}` / `]` on the same line and encounters no
invalid escape (§ 5.8). If a
same-line matching closer is present, the candidate is closed for
classification: content after that closer and other structural defects
inside it are `MalformedInlineCompound` (§ 6.12), not
`UnterminatedInlineCompound`. If that scan encounters a
`BadEscapeSequence` before a matching closer, `BadEscapeSequence`
takes precedence over the missing closer.
An unterminated quoted key is governed by § 6.16 instead: that
diagnosis takes precedence over a bad escape inside the unclosed
quoted segment.

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
- Non-whitespace content after the same-line matching closer of a
  value-position compound (e.g. `x: {a: 1} junk` or
  `x: [1] junk`). The closer makes the compound closed; the trailing
  bytes are therefore malformed content, not an unterminated compound.

Empty pair values (`{a:}`, `{a::}`) are NOT a defect — they yield
an empty String per § 5.8.2.

### 6.13 Bad Escape Sequence

A `\X` form inside an inline scalar value or a key (§ 3.7) where
`X` is not one of `\`, `,`, `}`, `]`, `{`, `[`, `n`, `r`, `.`, `:`,
`"`, `'`, `` ` ``, `u` is a `BadEscapeSequence` error. End-of-line
directly after a
backslash (i.e. `\` with no following byte before the line
terminator) is also a `BadEscapeSequence` error — the inline scalar
context never crosses a line boundary (§ 3.2).

A `\u` not immediately followed by exactly four hexadecimal digits
(§ 3.7.1) is also a `BadEscapeSequence` error, as is a lone
surrogate — a high surrogate not immediately followed by a valid
low-surrogate `\uXXXX` escape, or a low surrogate not immediately
preceded by a high-surrogate `\uXXXX` escape.

For precedence against `UnterminatedInlineCompound`, an inline
compound is scanned left to right with its quote-aware, escape-aware
delimiter rules. If an invalid escape is encountered before a matching
same-line closer, `BadEscapeSequence` is reported immediately and
takes precedence over the missing closer. If no invalid escape is
encountered, the absence of a same-line matching closer is
`UnterminatedInlineCompound`; escaped delimiters remain opaque during
the scan. An unterminated quoted key is the exception: it remains
quote-opaque and is diagnosed as `UnterminatedInlineCompound` per
§ 6.16, including when an otherwise bad escape occurs inside that
unclosed quoted segment.

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

### 6.15 Invalid UTF-8

A document whose raw bytes are not valid UTF-8 (§ 3.1, § 9.3) is an
`InvalidUtf8` error. This check happens before any line-oriented or
grammar-level processing — a document that fails it MUST NOT also be
diagnosed with any other category in this section, since none of the
byte-oriented rules those categories depend on (line terminators,
`<key-char>`, escape sequences, ...) are well-defined over a byte
sequence that isn't valid UTF-8 to begin with. The error span SHOULD
point at the byte offset of the first invalid sequence.

### 6.16 Unterminated Quoted Key

A quote character (`"`, `'`, or `` ` ``) that opens a `<quoted-segment>`
(§ 5.3.3 — it is the first code point of a key segment after
trimming) with no matching unescaped closing delimiter of the same
character before end-of-line is an `UnterminatedQuotedKey` error,
reported on any line dispatched as a pair line (§ 5.1 rule 8) —
that is, an ordinary multi-line pair line, inside an established
Object or the top-level Object body, where finding a separator is
the only requirement and no enclosing bracket needs its own
same-line closer. This diagnosis takes precedence over the generic
`MissingSeparator` (§ 6.6) that a colon-free line would otherwise
raise, mirroring how an unterminated `[` / `{` already takes
precedence over a generic pair-candidate read at § 5.0.1 rule 6.

This category does NOT cover an inline-pair position (§ 5.8.2): an
unclosed quoted key there (e.g. `{"a: 1}`, or `obj: {"a: 1}`)
necessarily swallows the rest of the line — including whatever would
have been the enclosing compound's own closing `}` / `]` — so the
compound itself never bracket-balances, and never closes at all. The
balanced-content check behind `UnterminatedInlineCompound` (§ 6.11)
is already quote-opaque for exactly this reason (§ 5.3.3's "Inline
pairs" bullet), and reports exactly that category instead — never
`UnterminatedQuotedKey`, and never `MalformedInlineCompound` (§ 6.12
applies only to a structural defect INSIDE an already-CLOSED
compound; a compound whose only candidate closer was swallowed by
the unterminated quote never closes, so § 6.12 categorically does
not apply here, not merely as an alternative reading) — since the
compound-level defect is what a reader can actually see and fix (add
the missing quote-closer, which is also the only way to give the
compound its missing `}` / `]`); there is no separate "the key
inside was also unterminated" defect to name on top of it. This also
never applies
to the document's first content line itself, whether or not that
line begins with `{` / `[`: § 5.0.1 rule 6 uses this same
separator-scanning rule for its own phase-1 shape test on a line NOT
starting with `{` / `[`, so on that UNDECIDED first line the same
underlying fact — no separator found — is not an error at all: it
is simply not a pair candidate, and root-kind detection falls
through to an Array root with this line as a String item (§ 5.3.3,
§ 5.0.1 rule 7); a first line that DOES begin with `{` / `[` follows
the bracket-balance path above instead, per § 5.3.3's "Unterminated
quoted segments" bullet.

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
literal_hex:: 0xFF
```

`color` is `Integer(16772608)` (0xFFEE00 decimal),
`permissions` is `Integer(493)` (0o755 decimal),
`mask` is `Integer(240)` (0b11110000 decimal),
`million` is `Integer(1000000)`, `ratio` is `Float(0.5)`,
`sci` is `Float(1.5e-3)`, `big` is
`String("99999999999999999999")` on the minimum i64 domain
(it overflows i64; a wider integer domain MAY produce Integer here),
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
literal_true:: true
literal_zero:: 0
literal_hex:: 0xFF
literal_path:: /usr/local/bin
literal_comma_only:: just,a,comma,separated,plain,string
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
`path\to` — a literal backslash, written `\\`. Since 0.7.0, the
canonical writer (§ 5.9.10) prefers **quoted** form over
bare-with-escape whenever a structural byte (here `.` or `:`) would
otherwise need escaping, so the first three canonicalise to:

```
"example.com": prod
"a:b": v
deep: {
    "example.com": 1
}
```

`path\\to: x` is unchanged in canonical form — escaping only a literal
backslash does not switch the form (§ 10.7), since quoting would not
remove the need for that escape. All four still round-trip (§ 8.3);
only the byte shape of the first three changed from 0.6.x's
bare-with-escape output.

### 7.10 Quoted Keys

```
"cache:redis": enabled
'say "hi": now': ok
```

`"cache:redis"` writes the key `cache:redis` directly in quoted form —
equivalent to the bare-escaped `cache\:redis` of § 7.9, but without a
backslash sitting inline (§ 10.7). `'say "hi": now'` writes the key
`say "hi": now`: the single-quote delimiter needs no escape for the
embedded `"` characters (self-escaping, § 10.7) or the embedded `:`
(only the segment's own delimiter is structural inside a
`<quoted-segment>`, § 3.7). Both keys contain a `:`, so bare form
would need `\:` and the canonical writer (§ 5.9.10) keeps them quoted;
the canonical delimiter is always `"`, so the second key's embedded
double quotes are re-escaped as `\"` in canonical output:

```
"cache:redis": enabled
"say \"hi\": now": ok
```

## 8. Compliance

An implementation may claim **Ktav 0.7.0 compliance** at one or more
of the following levels.

### 8.1 Parser-conforming

A parser-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement in this
  document that pertains to parsing.
- Accepts every fixture under `versions/0.7/tests/valid/` and
  produces a Value equivalent to the corresponding `name.json`
  oracle. In every JSON Value oracle, the number token's lexical shape
  fixes the Value kind: a token containing none of `.`, `e`, or `E`
  denotes Integer; a token containing any of them denotes Float,
  including `-0.0`. At an ordinary numeric leaf, the oracle token is
  interpreted, or comparison-coerced, in the tested implementation's
  declared Integer or Float domain, and equivalence is tested in that
  domain. Thus an ordinary Float token such as `3.14` does not require
  a wider decimal implementation to manufacture binary64's rounded
  value. A manifest exemption applies only when the source Ktav literal,
  interpreted in the tested implementation's declared domain, diverges
  in value or kind from the minimum-domain oracle token because it
  crosses that leaf's named boundary. If no such divergence occurs, the
  listed leaf MUST match normally; the exemption never extends to any
  other leaf.
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
- Accepts every `<name>.ktav` under
  `versions/0.7/tests/parseable-unrepresentable/` and produces the
  sibling JSON's `value`. These inputs cover the parser-produced
  `CRByte`, `BothFormsRequired`, `TrailingWhitespaceCollision`,
  and `LeadingWhitespaceCollision` cases; the category has no
  canonical-output files because its writer result MUST be rejection.

### 8.2 Writer-conforming

A writer-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement of § 5.9.
- For each fixture under `versions/0.7/tests/valid/`, produces —
  when given the Value parsed from `name.ktav` — a byte-exact
  output equal to `name.canonical.ktav`, except for the contribution
  of a leaf that
  [`versions/0.7/tests/boundary-fixtures.json`](tests/boundary-fixtures.json)
  lists for that fixture. Under § 8.1,
  every ordinary, non-exempt field MUST match its JSON oracle in the
  tested implementation's declared domain; an ordinary numeric field
  is not required to hold a universal minimum-domain Value. A listed
  boundary leaf MAY hold a different Value only when the tested source
  literal crosses that leaf's named boundary and the implementation
  supports a wider domain along that boundary class. Every other field
  MUST match normally, and its contribution MUST remain byte-exactly
  the same as the canonical output. For an exempt leaf, this corpus
  does not pin the exact bytes of its own contribution: they MUST be
  the correct canonical form (§ 5.9) for the Value the implementation
  actually holds there, internally consistent and deterministic for
  its domain. An implementation supporting only the minimum domain
  MUST match every `valid/` fixture's `.canonical.ktav` exactly,
  in full, including every listed boundary leaf.
- For each fixture under `versions/0.7/tests/unrepresentable/`,
  rejects the Value described by `name.json["value"]` with the
  reason code named in `name.json["unrepresentable_reason"]`
  (§ 5.9.0) — via whatever error-reporting shape its own API uses;
  the code names are normative, the surfacing mechanism is not. Each
  JSON object MUST contain exactly `value`,
  `unrepresentable_reason`, and non-empty `note`, with no extra
  fields; the Value mapping and the exact `$float` sentinel shape are
  defined by § 5.9.0. The reason code MUST have a recursive witness in
  the Value tree, rather than being inferred from the filename. For
  NonFiniteFloat, the $float sentinel is supplied through the abstract
  programmatic Float carrier, is outside the parser and canonical domains,
  and MUST preserve the distinction between NaN, +Infinity, and -Infinity.
- For each fixture under
  `versions/0.7/tests/parseable-unrepresentable/`, when given
  `name.json["value"]`, rejects that Value with the reason code
  named in `name.json["unrepresentable_reason"]`. These
  fixtures are pairs, not valid triples, and MUST NOT have a canonical
  output file.

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
flag, but MUST treat a document as 0.7.0 by default unless the
caller explicitly selects a different target version — this
specification defines no in-document version marker.

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
UTF-8 sequences with an explicit `InvalidUtf8` error (§ 6.15) rather
than silently substituting replacement characters.

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
a generic Unicode form, `\uXXXX` (§ 3.7.1), for the rare case of
needing to name an arbitrary code point by number rather than typing it
directly, and three more named escapes — `\"`, `\'`, `` \` `` —
for the quote characters that quoted keys (§ 5.3.3) use as delimiters,
giving thirteen named escape forms plus one generic Unicode form,
fourteen forms in total — most byte values are still written literally,
since they need no escape at all.

The bracket pair-set is full and symmetric: `\}` / `\{` and
`\]` / `\[`. `\{` and `\[` are only ambiguity-relevant as the
*first* byte of an inline scalar value (an unescaped `{` or `[`
there opens a nested compound), but having all four forms removes
a "may I escape this here?" question for the writer and gives a
clean rule: every inline structural delimiter has an escape form.

Tab (`0x09`) and other low-ASCII control bytes other than `LF` and
`CR` (which already have their own dedicated escapes, `\n` and `\r`)
intentionally have no **dedicated named** escape — no letter is worth
reserving for a byte that is legal as a literal in the first place.
Tab is a permitted literal byte in keys and scalars (§ 4); control
bytes are content data. A String containing such a byte is
representable through verbatim multi-line form (§ 5.6, § 5.9.7), or,
since 0.7.0, inline via `\uXXXX` (§ 3.7.1), which can name any of
them by number — there is no need for a dedicated named escape for
each one when the multi-line form preserves the byte exactly and
`\uXXXX` covers the inline case generically. A raw `CR` byte is a
separate case, not covered by either mechanism: it is never
representable as String content at all (§ 5.9.7), since a bare `CR`
is always a line terminator (§ 3.2) and can enter a String's logical
content only through the `\r` escape or the generic `\uXXXX` escape
naming code point 000D.

Multi-line scalars and multi-line strings have no escape processing
at all — the lexical layout makes escape unnecessary in those
contexts. (Keys gained escape processing in 0.6.0; see § 3.7.)

### 10.5 Why is `{a:}` valid but `[,a]` an error?

The two cases look symmetric — an empty inline value, either as
the value of a key in an Object or as an item in an Array — but
are treated differently (§ 5.8.2 and § 5.8.3): `{a:}` yields a
key `a` mapped to the empty String, while `[,a]` is a
`MalformedInlineCompound` error. The text `["", a]` does not
represent an empty String item: the two quote bytes are ordinary inline
scalar content, so that item is a String whose body is two quote bytes,
not String("").

The valid inline spelling `[(), a]` is different: `()` is the exact
empty-String shortcut dispatched by § 5.2 rule 5 after inline-scalar
collection. It is not the canonical writer form, however. For the
root Value [empty String, "a"], § 5.9.3 emits Array-root items directly
at indent 0: the first raw-marker item safely establishes an Array root,
so no bracket wrapper is needed. The canonical output is:

```text
::
a
```

The asymmetry is deliberate. An empty pair value is anchored by
an explicit key, so the "explicitly empty field for key X" intent
is unambiguous; the form is concise and useful for representing,
e.g., environment variables set to the empty string. An empty
array item has no such anchor, so the form `[,a]` is more likely
a typo (a leading or doubled comma) than a deliberate empty-string
item. Requiring the canonical raw-marker item form for an intentional
empty String makes the intent explicit and catches the common typo at
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
with the same declared Value domain, Integer/Float domains, and Float
decimal-conversion and rounding semantics MUST produce the same bytes for
the same Value, so diffs over generated files are stable. Implementations
with different declarations MAY differ where those declarations produce
different Values or canonical candidates; each implementation MUST apply
its own declared conversion policy deterministically.

The conformance suite tests both directions: input variety via
`name.ktav` fixtures (reader-side), output determinism via
`name.canonical.ktav` fixtures (writer-side), and equivalence to
`name.json` oracles (Value model).

### 10.7 Why quoted keys, and why three quote characters?

0.6.0's key-escaping design (§ 3.7, § 4) made every key representable,
but a key needing several structural bytes escaped — `service\:
abc`, `a\.b\.c\:d` — reads worse exactly where escaping is needed
most: the backslashes sit inline with nothing marking where the key
starts or ends. Quoted keys (§ 5.3.3) are sugar over the same escape
mechanism, not a replacement for it: any quoted key already had a
bare, escaped spelling that produces the identical Value (§ 5.5); a
document using no quote characters at all parses exactly as before.

Three delimiters, not the one or two most formats offer, because
self-escaping (a segment's own delimiter needs `\"` / `\'` / `` \` ``
to appear literally inside it; the two OTHER quote characters need no
escape at all, § 3.7) means the choice of delimiter is a convenience
for a human AUTHOR writing input by hand, not a representational
limit: an author whose key contains `"` may simply write it with `'`
or `` ` `` instead, needing zero escapes for it. This choice belongs
to the author, not to the canonical writer: § 5.9.10 (see also below)
fixes the canonical delimiter at `"` unconditionally, regardless of
content, so a writer-conforming implementation never has — or
exercises — this choice. A design offering only `"` (JSON5's key
quoting) would force
a choice between escaping the delimiter or accepting the smaller
"needs no escape" set; three delimiters make "pick one the content
doesn't contain" available for any content using at most two of the
three quote characters, without adding a second escape mechanism —
self-escape is the SAME `<key-escape>` rule bare segments already
use, just with three more named forms in the same table (§ 10.4).

Quoting is per-segment (§ 5.3.3), not whole-key: `a."b.c".d: 1` and
`"a.b.c.d": 1` (a single, longer, fully quoted key) are different
Values (three segments vs. one), matching how a dotted path already
means three distinct nested pairs — quoting one segment does not
collapse the path any more than escaping one segment's dot would.
This mirrors TOML's dotted-key quoting rather than treating a leading
quote character as quoting the rest of the line: the latter would
make `a."b.c".d` silently reparse as the bare four-segment path
`a`, `"b`, `c"`, `d` for anyone expecting the former — a worse
failure mode than a clean parse error, since it silently misparses
rather than rejecting; contrast the explicit `InvalidKey` (§ 6.4)
that a genuinely malformed key like `"a"b: 1` (content after a
quoted segment's closing delimiter that is neither `.` nor the pair
separator) already produces.

The canonical writer (§ 5.9.10) prefers quoted form the moment a
STRUCTURAL escape (or an edge-whitespace hazard) would otherwise be
needed, or the key's first segment begins with `##` (a routing rule
with no escape trade-off at all — see § 5.9.10 rule (d)), rather
than leaving bare-with-escape as an equally valid canonical choice
for the escape-driven cases: a determinism requirement (§ 5.9)
means the writer has no discretion either way, so the rule may as
well pick the more readable of the two — which was the entire
motivation for the feature. An escape quoting cannot remove — a
literal backslash, LF, CR, a control byte, or DEL — does not switch
the form, since paying for two delimiter characters would buy
nothing there. The one fixed delimiter (`"`) keeps the
rule content-independent: nothing here weighs which of the three
quote characters would need fewer escapes for a given key, since
self-escaping makes that comparison unnecessary for correctness and
the format already favours simple, uniform rules over marginally
shorter output (§ 10.4).

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
- **Breaking:** § 3.1 — leading byte-order mark handling is
  deterministic: a parser-conforming implementation MUST skip exactly
  one leading U+FEFF if it is the very first code point of the
  document, before any other byte; the canonical writer (§ 5.9)
  MUST NOT emit a leading byte-order mark. A U+FEFF anywhere else in
  the document is ordinary content (§ 3.3 does not classify it as
  whitespace). Unspecified in 0.6.4.
- **Added:** § 6.15 `InvalidUtf8` — a new error category for
  documents whose raw bytes are not valid UTF-8 (§ 3.1 already
  required rejecting them; § 6 previously had no matching category
  name for that rejection). The check happens before any
  line-oriented or grammar-level processing; the error span SHOULD
  point at the byte offset of the first invalid sequence.
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
  key beginning with `##` is always emitted in quoted form (never
  bare-with-escape), since no bare-form escape changes the raw
  first two bytes a comment-dispatch check on re-read inspects.
- **Changed:** `<key-char>` (§ 4) now admits raw VT (`0x0B`) and FF
  (`0x0C`) as literal key content, matching the § 3.3 widening —
  previously only tab was exempted from the control-byte exclusion.
  Non-breaking: this only accepts documents previously rejected as
  `InvalidKey`, no previously-valid document's meaning changes.
- **Breaking:** § 5.9.0 (new) defines **representable Values** —
  the domain over which the canonical writer's guarantees operate.
  The bare scalar document root, an Object pair with an empty name, and
  a non-finite Float (NaN / ±Infinity) are unrepresentable values that
  can only be constructed programmatically: the parser cannot produce
  them. Separately, the parser can produce Values that are parseable but
  unrepresentable under § 5.9.7: a String containing a `CR` byte or
  one of the multi-line collision cases. The
  `unrepresentable/` fixtures cover the programmatic-only reason codes
  `ScalarRoot`, `EmptyKeyName`, and `NonFiniteFloat`; the
  `parseable-unrepresentable/` fixtures cover parser-produced
  `CRByte`, `LeadingWhitespaceCollision`,
  `TrailingWhitespaceCollision`, and `BothFormsRequired`. A
  compound containing any non-representable Value at any depth is also
  unrepresentable. A writer-conforming implementation MUST reject every
  such Value with an error, emitting no partial output; § 8 therefore
  excludes parser-produced unrepresentable Values from its round-trip
  identity. The Rust reference core already rejects scalar roots and
  `CR`-bearing Strings; closing the remaining gaps there is tracked
  separately.
- **Changed:** § 5.9.8 — the Float notation threshold now reads
  `0 < abs < 1e-2` (was `abs < 1e-2`), which taken literally would
  have demanded scientific notation for zero. The canonical form of
  zero is `0.0` / `-0.0` — decimal, never scientific, sign
  preserved (unlike an Integer's `-0` → `0`). This matches the Rust
  reference core's existing behaviour; only the normative text
  changes. New fixtures `float/positive_zero` and
  `float/negative_zero` lock it in.
- **Changed:** § 8.1 (with § 5's Integer definition) — fixture
  ordinary numeric-token equivalence is evaluated in the tested
  implementation's declared Integer/Float domain, not against a universal
  minimum-domain Value. A wider implementation MAY diverge from a fixture
  oracle only where a named boundary leaf is crossed (e.g.
  `i64_overflow_to_string.json`), without forfeiting
  parser-conformance. Previously an arbitrary-precision
  implementation — explicitly permitted by § 5 — failed § 8.1 on
  that fixture as written.
- **Changed:** § 8.2 (with § 5.9.5) — the writer-conforming
  byte-exact requirement gets the mirror-image numeric-domain
  caveat to § 8.1's: exactly on the leaves `boundary-fixtures.json`
  names, a wider-domain implementation's parsed Value may
  legitimately differ, and its output MAY differ from the fixture's
  fixed `canonical.ktav`, provided that output is the correct
  canonical form (§ 5.9) for the Value it actually holds. Previously
  an arbitrary-precision implementation — explicitly permitted by
  § 5 — failed § 8.2 on `i64_overflow_to_string` as written: it
  parses the body as an Integer and would canonically write it
  bare (no raw marker), which the fixture's fixed `canonical.ktav`
  forbids.
- **Changed:** § 5.9's byte-determinism guarantee is scoped to
  writer-conforming implementations sharing the declared Value domain,
  Integer/Float domains, and Float decimal-conversion and rounding
  semantics. Each implementation MUST apply its declared conversion
  policy deterministically; implementations with different declarations
  MAY differ where those declarations produce different Values or
  canonical candidates.
- **Breaking:** the Float bullet of § 5 and rule 14 of § 5.2 — the
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
  (finite) is an ordinary Float, not a String-fallback case. The declared
  Float domain now also includes its decimal-conversion and rounding
  semantics and MUST use a deterministic conversion policy; every non-zero
  finite Float admitted to Ktav Value MUST have a finite (s, D, k) decimal
  candidate that round-trips exactly under that policy. Positive and negative
  zero (+0.0 and -0.0) are admitted separately by the zero rule. An unsupported exact-rational
  value such as 1/3 is outside the Ktav Float domain, not a new writer-error
  case. The minimum binary64 conversion uses roundTiesToEven.
- **Breaking:** § 3.7 and § 5.2 — any recognised escape in an inline
  scalar now forces String before keyword or numeric classification. In
  0.6.x a body such as `1\.0` could decode and classify as Float; in
  0.7.0 it is String. This includes `\.` and `\:`, even where the
  decoded byte has no structural role; the escape is therefore not
  semantically redundant in a value. Fixture
  `valid/inline/escape/recognized_escape_forces_string_number.*` locks
  this in.
- **Added:** Quoted keys (§ 5.3.3) — a key segment MAY be written
  `"…"`, `'…'`, or `` `…` `` instead of bare; inside the delimiters,
  `.`, `:`, `,`, `{`, `}`, `[`, `]`, and the two OTHER quote
  characters are ordinary content needing no escape, and content is
  never trimmed. Three new named escapes, `\"` / `\'` / `` \` ``
  (§ 3.7), let a segment's own delimiter appear literally inside it —
  the escape table grows from eleven entries to fourteen. These same
  three escapes are also recognised inside inline scalar **values**,
  not only keys: `\"` / `\'` / `` \` `` now decode to a literal quote
  byte there too, in every context the ten pre-0.7.0 escapes already
  applied to (previously each was a `BadEscapeSequence`, § 6.13, in
  every context, values included). A quote character has no
  structural role in an inline value — it is never a delimiter and is
  never stripped, escaped or not — so the escape is valid but
  semantically significant there: its presence forces String under § 5.2,
  exactly as `\.` / `\:` do in values. A new
  `<escapable-byte>` alternative and `<quoted-segment>` production
  (§ 4) are added to the grammar; `<bare-segment>` is also narrowed,
  not left untouched — its first token now comes from the new
  `<bare-first-token>`, which excludes an unescaped leading `"` / `'`
  / `` ` `` (§ 4), so this IS a change to an existing production, not
  purely additive. The one behavior change this narrowing introduces —
  a key or segment beginning with a quote character — is captured
  separately in the Breaking entry below, not claimed here. A related
  side effect outside key
  canonicalization: § 5.9.6's Array-root first-item bare-form test
  shares this same quote-aware separator scan, so a first item such as
  `'tis the season: fa` — whose only `:` now scans as inside an
  unterminated quoted segment rather than as an unescaped separator —
  no longer needs the `::` raw marker forced in canonical form, unlike
  before quoted keys existed (see
  `valid/quoted_keys/unterminated_leading_quote_falls_back_to_array_item.canonical.ktav`).
  The canonical writer (§ 5.9.10) now
  prefers quoted form (delimiter `"`) over bare-with-escape whenever
  escaping a structural byte (`.` `:` `,` `{` `}` `[` `]`), `(` / `)`,
  or edge whitespace would otherwise be needed, or the key's first
  segment begins with `##` (routed to quoted form unconditionally —
  not an escape trade-off, since no bare-form escape changes the
  raw first two bytes a comment-dispatch check on re-read inspects)
  (escaping only a backslash, LF, CR, a control byte, or DEL does NOT
  switch the form, since quoting does not remove that escape) — this
  changes the canonical bytes of every key previously requiring
  `\.` / `\:` / a bracket / comma / paren escape, or beginning with
  `##` (e.g. `a\.b: 1` now canonicalises to `"a.b": 1`, not
  `a\.b: 1`); existing `valid/key_escaping/*.canonical.ktav`
  fixtures update accordingly (tracked separately from this text
  change). New error category
  `UnterminatedQuotedKey` (§ 6.16), reported when a quote opens a key
  segment with no matching closer before end-of-line on any line
  already known to be a pair line; `InvalidKey` (§ 6.4) and
  `EmptyKey` (§ 6.5) each gain one new triggering case (§ 6.4, § 6.5).
- **Breaking:** A line whose first content — after § 4's key-segment
  trimming — begins with `"`, `'`, or `` ` `` no longer necessarily
  parses the way it did before quoted keys (§ 5.3.3, § 10.7): the
  quote character now opens a `<quoted-segment>` there instead of
  being ordinary literal content. A key that already began AND ended
  with the same quote character silently reads as a shorter key with
  the delimiters stripped (`"port": 1` now names `port`, not
  `"port"`); a leading quote character with no matching closer before
  end-of-line either falls through to an unaffected Array-root String
  item (root kind not yet decided) or raises the new
  `UnterminatedQuotedKey` (root kind already Object) — see § 5.3.3 for
  the exact, context-dependent rule and the `::` raw-marker escape
  hatch (§ 5.4 rule 1) already available for an Array item that needs
  an unambiguous leading quote character. No document whose keys
  avoid a leading `"` / `'` / `` ` `` is affected in any way.
- **Added:** § 5.9.12 (new) — a first-output-byte guard preventing
  the canonical writer from ever placing the raw 3-byte UTF-8
  encoding of U+FEFF at byte offset 0 of the document, which § 3.1's
  leading-BOM-strip rule would otherwise silently consume on
  re-parse. This closes a gap between § 3.1 (added earlier in this
  same release) and §§ 5.9.0 / 5.9.10's key-representability rules,
  which did not previously account for the interaction: a key or
  Array-root first item beginning with U+FEFF was representable but
  not round-trip-safe in canonical form. Affects exactly two
  positions: a root Object's first-serialized key beginning with
  U+FEFF is now forced into quoted form (§ 5.9.10 rule (c)); a root
  Array's first item being a bare-form String beginning with U+FEFF
  is now forced into raw-marker (`::`) form (§ 5.9.6). New fixtures
  `valid/bom_boundary/*`.

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
  (§ 5.9.8). On the minimum i64 domain, big-integer overflow falls
  back to String; a wider integer domain MAY retain such a literal as
  Integer, subject to §§ 5.2 and 8.1.
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

### 0.1.1 — 2026-05-10

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

The Rust reference implementation already trimmed the full
25-code-point set at key-segment edges in every 0.6.x release. For Rust,
and for implementations whose 0.6.x behaviour already matched that
trim, the § 3.3 / § 4 clarification is non-breaking: apart from documents
that rely on any of the five breaking forms below, and apart from the
implementation-dependent numeric migration hazard described below,
previously round-tripping documents retain their meaning under 0.7.0.

An implementation that followed the old § 3.3 / § 4 wording literally and
trimmed only its specified ASCII whitespace has an additional
**document-behaviour** change. A document that relies on one of the other
members of the 25-code-point set at structural, blank-line, comment, or
root-dispatch positions; around separators; at scalar or key edges; or on
content lines in a stripped `(…)` block can parse differently or produce a
different value or error under 0.7.0. Such documents require migration review
across all of those sites, not merely an implementation-code update.

Five breaking changes apply to every implementation, Rust included.
The value/key-edge trimming clarification above remains separately
scoped: it changes documents only for implementations that did not
already implement the 0.6.x Rust-compatible trim.

There is also an implementation-dependent numeric migration hazard. The
0.7.0 minimum Float domain requires binary64 range and precision and
`roundTiesToEven`. An implementation that was conforming under 0.6.x with
a narrower domain, such as binary32, may therefore parse an old literal
differently when it adopts 0.7.0; for example, binary32 cannot represent
`16777217.0` exactly and rounds it to `16777216.0`. This is not a sixth
universal breaking change: it applies only to a previously conforming
narrower-domain implementation, not to one that already used binary64 or
wider semantics.

1. **A leading byte-order mark (U+FEFF) is now stripped from the document.**
   A 0.7.0-conforming parser MUST skip exactly one U+FEFF when it is the
   document's first code point, and a canonical writer MUST NOT emit one.
   In 0.6.x this behavior was unspecified, so a document that relied on a
   leading U+FEFF as content needs migration: move it away from the document
   start or revise the expected value. A U+FEFF anywhere else remains ordinary
   content.
2. **`(…)` multi-line strings no longer preserve trailing whitespace
   (§ 3.3 — any of the 25 code points, not just space/tab) on each
   content line.** If a document relies on trailing whitespace inside
   a `(…)` block being preserved verbatim, switch that block to
   `((…))`, which keeps both edges byte-for-byte in both 0.6.x and
   0.7.0.
3. **A key segment's leading, unescaped `"`, `'`, or `` ` `` now opens
   a quoted segment (§ 5.3.3, § 10.7) instead of being ordinary key
   content.** In 0.6.x, an Object pair whose key began with one of
   these three characters kept that character as literal key text —
   e.g. `"port": 1` named the key `"port"`, quotes included. In
   0.7.0, the same line either names the shorter key `port` (if a
   matching closing quote character is also present before the pair
   separator) or, if there is no matching closer, either raises
   `UnterminatedQuotedKey` (§ 6.16, when the root is already known to
   be an Object) or falls through to a root-level Array String item
   (§ 5.3.3 gives the exact, context-dependent rule). **To keep a
   0.6.x document's old meaning**, escape that leading quote
   character — `\"`, `\'`, `` \` ``, or `\uXXXX` — so it reads as
   ordinary bare key content rather than a quoted-segment opener.
   In 0.6.x, the `::` raw-marker form (§ 5.4 rule 1) was the explicit way
   to force a root-level Array item to be read as a literal String when it
   deliberately used a matched pair of quote characters around a body with
   a pair-shaped colon (e.g. `:: "a: b"`). Without the marker, 0.6.x root
   detection would mistake `"a: b"` for an Object pair because the colon
   is followed by separator whitespace. In 0.7.0, the matched quoted-segment
   scan recognizes the whole item directly, so the raw marker is no longer
   needed: `"a: b"` has the same literal String meaning.

4. **A recognised escape in an inline scalar now forces String before
   keyword or numeric classification (§ 3.7, § 5.2).** In 0.6.x, a
   body such as `1\.0` could decode and then classify as Float; in
   0.7.0 it is String. This applies to every recognised escape, including
   `\.`, `\:`, and the three quote escapes `\"`, `\'`, and
   `` \` ``, even when the decoded byte has no structural role.
5. **A float literal that is non-finite in the declared Float domain now
   falls back to String (§ 5.2 rule 14).** In 0.6.x, a literal such as
   `1e9999` could become a non-finite Float on a binary64 backend; in
   0.7.0 it is String. Finite underflow to signed zero remains Float.

Additionally, `\uXXXX` is a new, purely additive escape (§ 3.7.1) —
no existing document's meaning changes because of it.
