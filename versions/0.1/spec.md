# Ktav — The Written Configuration Format

**Languages:** **English** · [Русский](spec.ru.md) · [简体中文](spec.zh.md)
**Version:** 0.1.0
**Date:** 2026-04-22

## Abstract

Ktav is a plain-text configuration format designed so that every line
either stands on its own or depends only on explicit, visible brackets.
It offers JSON-shape (scalars, arrays, objects, `null`, booleans) with
none of JSON's punctuation: no quotes around strings, no commas, no
escape sequences. Nested keys use a dotted path; multi-line strings
and literals use small, visible opt-in markers.

This document specifies the syntax and semantics of the format at
version 0.1.0. Implementations in any programming language may claim
"Ktav 0.1.0 compliance" iff they satisfy every normative statement
below.

## 1. Introduction

A Ktav document is a sequence of lines that together describe a
hierarchical object. Typical use is application configuration, where
the document is written by humans, read by programs, and diffed in
version control.

The format's guiding principle is:

> **Every rule is local. Every line's meaning either is self-evident or
> depends only on visible brackets above it.**

This rules out indentation-significant whitespace (YAML), trailing-comma
arithmetic (JSON), anchors and aliases (YAML), schema directives, and
heredoc markers that cross many lines.

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

Lines are separated by either LF (`\n`) or CRLF (`\r\n`). The line
separator is not part of a line's content. Trailing content of the
final line need not be followed by a line separator.

### 3.3 Whitespace

"ASCII whitespace" in this document means any of the bytes matching
`U+0009` (tab), `U+000A` (LF), `U+000B` (VT), `U+000C` (FF),
`U+000D` (CR), `U+0020` (space). Only these are significant; other
Unicode whitespace characters are treated as ordinary content.

"Trim" means removing leading and trailing ASCII whitespace.

### 3.4 Comments

A line whose trimmed content begins with the character `#` (U+0023) is
a comment. The remainder of the line is ignored.

```text
# this is a comment
    # leading whitespace is allowed before '#'
```

Inline comments — a `#` following other content on the same line —
are **NOT** recognized. A `#` that is not at the start of a trimmed
line is ordinary content (typically part of a value).

### 3.5 Blank Lines

A line whose trimmed content is empty is a blank line. Blank lines
carry no structural meaning except within a multi-line string (§ 5.6),
where they appear verbatim in the content.

## 4. Grammar

The grammar is presented in a semi-formal notation, one rule per line.
Terminals are in double quotes; `<name>` denotes a non-terminal;
`*` is zero-or-more, `?` is optional, `|` is alternation.

```
<document>      ::= <line>*
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "#" (any-chars until line-end)
<blank>         ::= (ws)

<header-line>   ::= (ws) "{" (ws) eol                ; object open
                  | (ws) "}" (ws) eol                ; object close
                  | (ws) "[" (ws) eol                ; array open
                  | (ws) "]" (ws) eol                ; array close
                  | (ws) ")" (ws) eol                ; multiline close (stripped)
                  | (ws) "))" (ws) eol               ; multiline close (verbatim)

<pair-line>     ::= <key> ":"  <sep-end> <value-part-opt> eol    ; default, String
                  | <key> "::" <sep-end> <value-part-opt> eol    ; literal String
                  | <key> ":i" <sep-end> <integer-body>   eol    ; typed Integer
                  | <key> ":f" <sep-end> <float-body>     eol    ; typed Float
<key>           ::= <segment> ("." <segment>)*
<segment>       ::= <key-char>+
<key-char>      ::= any character except ASCII whitespace (§ 3.3),
                    "[", "]", "{", "}", ":", "#"

<sep-end>       ::= 1*ws | &eol                    ; ≥1 whitespace byte, or the line end
<value-part-opt> ::= <value-start> | ""             ; value-part is optional; "" ⇒ empty String
<value-start>   ::= "{" (ws) "}" (ws)                ; empty inline object
                  | "[" (ws) "]" (ws)                ; empty inline array
                  | "{" (ws)                         ; open object
                  | "[" (ws)                         ; open array
                  | "(" (ws)                         ; open multiline (stripped)
                  | "((" (ws)                        ; open multiline (verbatim)
                  | "()" (ws)                        ; empty inline (yields "")
                  | "(())" (ws)                      ; empty inline (yields "")
                  | <scalar-body>                    ; scalar value

<scalar-body>   ::= (ws) any-chars-until-eol
                    ; trimmed; interpreted per §5.2

<integer-body>  ::= ("+" | "-")? 1*DIGIT
<float-body>    ::= ("+" | "-")? 1*DIGIT "." 1*DIGIT
                    ( ("e" | "E") ("+" | "-")? 1*DIGIT )?

<array-item-line> ::= <item-literal> | <item-typed-int>
                    | <item-typed-float> | <item-value>
<item-literal>  ::= (ws) "::" <sep-end> <any-chars>? eol   ; raw string item
<item-typed-int>   ::= (ws) ":i" <sep-end> <integer-body> eol ; typed Integer item
<item-typed-float> ::= (ws) ":f" <sep-end> <float-body>   eol ; typed Float item
<item-value>    ::= <value-start> eol                  ; value at array position

<multiline-content-line> ::= any line within an open <multiline>;
                             the terminator (")" or "))") ends the block
```

Notes on the notation:

- Inside a line, `(ws)` stands for zero or more ASCII-whitespace bytes.
- `1*ws` stands for **one or more** ASCII-whitespace bytes (same
  convention as `1*DIGIT`).
- `<sep-end>` stands for "at least one ASCII-whitespace byte, or the
  end of the line". It is used after every pair- and array-item
  separator (`:`, `::`, `:i`, `:f`). The EOL option lets a writer
  leave a value empty with `key:` (line ends right after the
  separator); the 1*ws option covers the normal `key: value`,
  `key:: literal`, `port:i 8080` forms. Writing `key:value` /
  `port:i42` (no whitespace, no EOL, non-blank continuation) is a
  syntax error — see § 6.10.
- `&eol` is a zero-width positive lookahead — it matches the end of
  line without consuming it, so the EOL is still the line terminator.
- An implementation MAY tolerate additional trailing whitespace on any
  line before the line separator.

## 5. Semantics

A compliant parser produces a **Value** for a conforming document.
Value is one of the following kinds: **Null, Bool, Integer, Float,
String, Array, Object**.

- **Null** — a single distinguished value.
- **Bool** — `true` or `false`.
- **Integer** — a numeric string in the form `[-]?[0-9]+`. The Value
  preserves the textual form exactly (no conversion to a machine
  integer at the Value level); the consumer is responsible for
  narrowing to the integer type their application requires.
- **Float** — a numeric string in the form
  `[-]?[0-9]+\.[0-9]+([eE][-+]?[0-9]+)?`. The Value preserves the
  textual form exactly.
- **String** — a (possibly empty) UTF-8 string.
- **Array** — an ordered sequence of Values.
- **Object** — an ordered sequence of (name, Value) pairs, names being
  strings. Name uniqueness is required within an Object (§ 5.5).

Integer and Float Values never arise implicitly from a plain `:`
pair — they appear only when the typed markers `:i` or `:f` are used
(§ 5.3, § 5.4). A plain scalar body of the form `8080` remains a
String, preserving 0.1.0's "everything is String until marked
otherwise" guarantee.

The root Value produced by parsing a document is always an Object
(possibly empty).

### 5.1 Dispatch per Line

The parser MUST classify each line after trimming, applying rules in
this exact order:

1. If the trimmed line is empty → blank line; no effect except
   where stated (§ 5.6, multiline).
2. If the trimmed line begins with `#` → comment; ignored.
3. **If the parser is inside an open multi-line string** (§ 5.6): if
   the trimmed line equals the block's terminator, the multi-line
   string is closed; otherwise the raw (untrimmed) line is added to
   the content of the multi-line string.
4. If the trimmed line is exactly `}` → close the innermost open
   Object, otherwise error (§ 6.1).
5. If the trimmed line is exactly `]` → close the innermost open
   Array, otherwise error (§ 6.1).
6. If the innermost open compound is an Array:
   treat the line as an **array-item line** (§ 5.4).
7. Otherwise (innermost open compound is an Object, or the top-level):
   treat the line as a **pair line** (§ 5.3).

### 5.2 Scalar Value Interpretation

Given a scalar body — the trimmed text of a pair-line body after a
plain `:` separator, or of an array-item line that uses no marker —
the parser classifies it as follows. Rules are applied in order; the
first matching rule wins. Bodies after `::`, `:i`, or `:f` are **not**
dispatched through § 5.2; they are handled by § 5.2.1 (typed markers)
and by the raw-string clauses of § 5.3 and § 5.4.

1. If the body is exactly `{` → open a new Object scope.
2. If the body is exactly `[` → open a new Array scope.
3. If the body starts with `{`: if it also ends with `}` and the text
   between is empty (or whitespace), the value is an empty Object;
   otherwise it is an error (inline non-empty objects are NOT valid
   at version 0.1.0).
4. If the body starts with `[`: similarly, empty Array if the body is
   `[]` (or `[` followed by whitespace and `]`); else error.
5. If the body is exactly `(` → open a multi-line string (stripped
   form, § 5.6).
6. If the body is exactly `((` → open a multi-line string (verbatim
   form, § 5.6).
7. If the body is `()` or `(())` → empty String.
8. If the body is exactly `null` → Null.
9. If the body is exactly `true` → Bool `true`.
10. If the body is exactly `false` → Bool `false`.
11. Otherwise → String whose content is the body, as-is (already
    trimmed).

The keyword forms `null`, `true`, `false` are matched **case-sensitively**.
A body of `True`, `NULL`, `False`, etc., is a String.

#### 5.2.1 Typed-Scalar Interpretation

When a line uses the typed markers `:i` or `:f` (in pair form, § 5.3,
or in array-item form, § 5.4), the body is **not** dispatched through
the classification of § 5.2. Typed-scalar bodies are interpreted as
follows.

**Typed-integer body** (marker `:i`):

- The body, after trimming, MUST match `integer-body` of § 4:
  one optional sign (`+` or `-`), followed by one or more decimal
  digits. No other characters are permitted — in particular, no
  decimal point, no exponent, no leading/trailing whitespace within
  the digits, and no thousands separators.
- On match, the parser produces a Value of kind **Integer** whose
  textual form is the body with any leading `+` removed. A leading
  `-` is preserved. A body of `0` or `-0` yields `"0"` and `"-0"`
  respectively (the parser does not normalize the sign of zero).
- On no-match — including an empty body, a body with non-digit
  characters, a body containing a decimal point, or a body that
  attempts to open a compound (`{`, `[`) or a multi-line string
  (`(`, `((`) — the parser MUST emit an **InvalidTypedScalar** error
  (§ 6.9).

**Typed-float body** (marker `:f`):

- The body, after trimming, MUST match `float-body` of § 4:
  one optional sign on the mantissa (`+` or `-`), one or more digits,
  a required `.`, one or more digits, and an optional exponent
  (`e` or `E`, optional sign, one or more digits).
- On match, the parser produces a Value of kind **Float** whose
  textual form is the body with any leading `+` on the mantissa
  removed. The sign inside the exponent (if present) is preserved
  as written; the exponent letter (`e` vs `E`) is preserved as
  written.
- On no-match — including an empty body, a body without a decimal
  point (e.g. `42`), a body with non-digit characters, or a body
  attempting to open a compound or multi-line — the parser MUST emit
  an **InvalidTypedScalar** error (§ 6.9).

Typed markers do **NOT** open compounds or multi-line strings. The
body `{`, `[`, `(`, `((` is an error for any typed pair or item, even
though those bodies are meaningful after a plain `:` separator.

### 5.3 Pair Lines

A pair line has the form `<key> <sep> <body>`, where `<sep>` is one
of `:`, `::`, `:i`, or `:f`.

- The portion before the first `:` is the **key**.
- **Separator `::`** — the value is a **raw string**: the body
  following the two colons, trimmed, is taken verbatim as a String.
  No scalar classification (§ 5.2) is applied.
- **Separator `:i`** — a **typed-integer pair** (§ 5.2.1). The body
  MUST match `integer-body` of § 4; on match, the Value is Integer;
  on no-match, the parser MUST emit an **InvalidTypedScalar** error
  (§ 6.9).
- **Separator `:f`** — a **typed-float pair** (§ 5.2.1). The body
  MUST match `float-body` of § 4; on match, the Value is Float; on
  no-match, the parser MUST emit an **InvalidTypedScalar** error
  (§ 6.9).
- Otherwise (separator `:`) the body is classified per § 5.2.

The separator is matched greedily and case-sensitively: `:i`, `:f`,
and `::` are recognized as the exact two-character tokens shown.
`:I`, `:F`, `:int`, `:integer`, `:float` are **NOT** recognized as
typed markers; a key followed by any of these either forms a plain
`:` pair (where the remainder of the separator becomes part of the
body) or — for sequences that would leave an empty key or otherwise
break pair-line structure — is a syntax error.

**Mandatory space after the separator.** Every pair separator —
`:`, `::`, `:i`, `:f` — MUST be followed by at least one ASCII
whitespace byte **or** by the end of the line. Writing `key:value`,
`key::value`, `port:i42`, or `ratio:f0.5` — separator glued to body
with no intervening whitespace — is a **MissingSeparatorSpace** error
(§ 6.10). The EOL alternative exists so that an empty value can be
written as `key:` / `key::` / `key:i` / `key:f` without a trailing
space that many editors silently strip (though `:i` / `:f` with an
empty body are still **InvalidTypedScalar** per § 5.2.1 — the marker
demands digits). The rule exists to keep the one-pair-per-line visual
regular: every value starts a fixed distance from its separator.

Example:

```text
# key: Bool true
key:  true
# key: String "true"
key:: true
# regex: String "[a-z]+"
regex:: [a-z]+
# addr: String "[::1]:8080"
addr:: [::1]:8080
# port: Integer "8080"
port:i 8080
# ratio: Float "0.5"
ratio:f 0.5
# offset: Integer "-100"
offset:i -100
# count: Integer "5" (leading '+' stripped)
count:i +5
# eps: Float "1.5e-10"
eps:f  1.5e-10
```

#### 5.3.1 Key Validation

A key MUST be a non-empty sequence of **segments** joined by `.`. Each
segment MUST be non-empty and MUST contain no ASCII whitespace and no
characters `[`, `]`, `{`, `}`, `:`, or `#`. A key violating these
constraints is a syntax error.

Implementations MAY choose to further restrict key segments (e.g. to
ASCII identifiers), but MUST NOT accept keys rejected above.

#### 5.3.2 Dotted-Key Expansion

A key `a.b.c` denotes a path through nested Objects. Writing
`a.b.c: v` is semantically equivalent to writing:

```text
a: {
    b: {
        c: v
    }
}
```

Multiple dotted pairs that share a common prefix coalesce into one
Object at that prefix:

```text
server.host: 127.0.0.1
server.port: 8080
```

produces an Object `{server: {host: "127.0.0.1", port: "8080"}}`.

If two pairs would disagree about a shared prefix (one expects it to
be a scalar, another expects it to be an Object), this is a **path
conflict** error (§ 6.3).

### 5.4 Array-Item Lines

Inside an open Array, non-closing lines are array items.

- If the trimmed line begins with `::`, the marker MUST be followed by
  at least one ASCII whitespace byte or by the end of the line (same
  `<sep-end>` rule as § 5.3); the remainder (skipping whitespace after
  `::`) is the String item verbatim. Classification (§ 5.2) is NOT
  applied. Writing `::value` (marker glued to body) is a
  **MissingSeparatorSpace** error (§ 6.10).
- If the trimmed line begins with `:i`, the marker MUST be followed by
  at least one ASCII whitespace byte; the remainder is a
  **typed-integer item**: its body is interpreted per § 5.2.1 as an
  Integer (or rejected with **InvalidTypedScalar**). `:i42` (glued)
  is a **MissingSeparatorSpace** error.
- If the trimmed line begins with `:f`, same rule — a required
  whitespace, the body is a **typed-float item** per § 5.2.1.
- Otherwise the trimmed line is classified per § 5.2 and the
  resulting Value becomes the next item of the Array.

Example:

```text
items: [
    # String "ok"
    ok
    # String "[literal]"
    :: [literal]
    # String "true"
    :: true
    # Bool true
    true
    # Null
    null
    # Integer "42"
    :i 42
    # Integer "-7"
    :i -7
    # Float "3.14"
    :f 3.14
    # opens nested Object
    {
        name: inner
    }
]
```

### 5.5 Duplicate Names

Within any single Object, each name MUST be unique. A duplicate — whether
coming from two plain pair lines with the same key or from dotted-key
expansion into an already-present name — is a syntax error (§ 6.2).

The conflict between a scalar and an Object at the same path is a
separate error (§ 6.3), not a duplicate-name error.

### 5.6 Multi-line Strings

A multi-line string is opened by either of the two value-start tokens:

- `(` alone on its line (after trim), or after `:` on a pair line —
  **stripped form**.
- `((` alone — **verbatim form**.

The block is closed by a line whose trimmed content is exactly:

- `)` for the stripped form, or
- `))` for the verbatim form.

While a multi-line string is open:

- The lines between the opener and the closer are collected as raw
  content (including their whitespace, comments, brackets — none of
  these are interpreted).
- The parser MUST NOT apply any other classification to these lines.

When the block closes:

- **Verbatim form** (`((` ... `))`): the resulting String is the
  content lines joined by single `\n` characters, with no
  modifications.
- **Stripped form** (`(` ... `)`): let *common* be the longest
  whitespace prefix that is a prefix of every non-blank content line.
  The resulting String is produced by:

  1. Removing *common* from the start of every non-blank line.
  2. Replacing each blank line by the empty string.
  3. Joining the resulting sequence with single `\n`.

#### 5.6.1 Closer-Content Restriction

A content line whose trimmed content is **exactly** the block's
terminator — `)` for a stripped block, `))` for a verbatim block —
ALWAYS closes the block. This is the only rule that applies to lines
inside an open multi-line string; there is no escape mechanism.

Consequences and workarounds:

- **Line with trimmed content `)` — goes as content** in a verbatim
  block (terminator is `))`, no collision). Use verbatim when the
  data contains solo-`)` lines:

  ```text
  body: ((
  hello
  )
  world
  ))
  ```

  Resulting String: `hello\n)\nworld`.

- **Line with trimmed content `))` — goes as content** in a stripped
  block (terminator is `)`). Use stripped when the data contains
  solo-`))` lines:

  ```text
  body: (
      hello
      ))
      world
  )
  ```

  Resulting String (after dedent): `hello\n))\nworld`.

- **Both** `)` and `))` appearing on their own lines in the same
  content is the one combination neither form can hold. A document
  with such data MUST either split it across adjacent multi-line
  values concatenated by the consumer, or load the value from an
  external file. This is a deliberate 0.1.0 trade-off — the format
  provides no escape sequences inside value content.

Trailing characters on a content line prevent the collision: a line
whose trimmed content is `) x`, `))suffix`, or any form that is not
**exactly** the terminator is content, not a closer.

### 5.7 Empty Compound Shortcuts

The forms `{}` and `[]` on a value line denote, respectively, an empty
Object and an empty Array. The forms `()` and `(())` denote an empty
String. Whitespace between the brackets is permitted for `{}` and `[]`
only. No other inline non-empty compound value is valid at version 0.1.0.

## 6. Errors

A compliant parser MUST produce a clearly identified error, stopping
before it emits an incorrect Value, in all of the following cases. The
error message SHOULD include the offending line number.

### 6.1 Unbalanced or Mismatched Brackets

The parser emits this error as one of two related codes, whose use is
fixed by the situation:

- **UnbalancedBracket** — a closer with no matching open, or EOF
  reached while any Object, Array, or multi-line String is still open.
- **MismatchedBracket** — a closer whose kind does not agree with the
  innermost open: a `}` closing an `[`-Array, or a `]` closing a
  `{`-Object.

Both are sub-categories of this section; the conformance test suite
carries whichever one the situation calls for in its `<name>.json`
oracle.

### 6.2 Duplicate Name

Two pair lines assigning the same name within the same Object (§ 5.5).

### 6.3 Path Conflict

Two pair lines disagree about the kind of a shared path: one treats it
as a non-Object value (scalar, Array), the other expects it to be an
Object (via dotted-key expansion or brace nesting). Example:

```text
a: 1
a.b: 2
```

The second line tries to descend into `"a"`, but `"a"` is already a
scalar. The reverse direction is also a path conflict:

```text
a.b: 1
a: 2
```

The second line tries to overwrite the Object `{b: 1}` with a scalar.

### 6.4 Invalid Key

A key whose segments fail the validation in § 5.3.1.

### 6.5 Empty Key

A pair line whose key portion is empty (before the first `:`) after
trimming.

### 6.6 Orphan Line

A non-blank, non-comment line inside an Object that does not contain
a `:` and is not a lone closer.

### 6.7 Inline Non-empty Compound

A value body starting with `{` or `[` that is not the exact opener
(`{` / `[`) or the empty form (`{}` / `[]`).

### 6.8 I/O Errors

Failures to read the underlying byte stream are reported as I/O errors
and are distinct from the errors above.

### 6.9 Invalid Typed Scalar

A typed-scalar marker (`:i` or `:f`) was used with a body that does
not match the marker's required grammar (§ 5.2.1). The body was not
a syntactically valid integer or float respectively, was empty, or
attempted to open a compound or multi-line string. Examples:

- `count:i abc` — body not numeric.
- `ratio:f 42` — body has no decimal point (an integer would parse,
  but the marker demands a float).
- `value:i 1.5` — body has a decimal point but the marker is integer.
- `x:i ` — empty body after the marker.
- `x:i {` — a typed marker cannot open a compound.
- `x:f (` — a typed marker cannot open a multi-line string.
- `x:i -` — sign alone, no digits.

The parser MUST reject such documents.

### 6.10 Missing Separator Space

A pair separator (`:`, `::`, `:i`, `:f`) or an array-item marker
(`::`, `:i`, `:f` at the start of a trimmed line) is glued directly
to its body, with no ASCII whitespace byte in between and the line
not ending right after the separator. The parser MUST reject such
documents (§ 5.3 and § 5.4, mandatory-space rule).

**Error examples — parser MUST reject each of these:**

- `key:value` — `:` followed by `v`, no space, no EOL.
- `pattern::[a-z]+` — `::` glued to `[a-z]+`.
- `port:i42` — `:i` glued to `42`.
- `ratio:f0.5` — `:f` glued to `0.5`.
- inside an Array: `::value`, `:i42`, `:f0.5` as item lines.

The **correct** forms of the same intents are `key: value`,
`pattern:: [a-z]+`, `port:i 42`, `ratio:f 0.5`, `:: value` (array),
`:i 42` (array), `:f 0.5` (array).

The rule does **not** forbid an empty body: `key:`, `key::`, `key:i`,
`key:f` (line ends immediately after the separator) are syntactically
legal — see § 5.3. For `:i` / `:f` the empty body still fails the
typed-body grammar and surfaces as **InvalidTypedScalar** (§ 6.9),
not as MissingSeparatorSpace.

## 7. Examples

### 7.1 Minimal

```text
port: 20082

banned_patterns: [
    .*\.onion:\d+
]
```

The resulting Value is:

```
Object {
    "port":            String "20082",
    "banned_patterns": Array [
        String ".*\\.onion:\\d+"
    ]
}
```

### 7.2 Nested Objects, Arrays, Keywords

```text
server.host: 127.0.0.1
server.port: 8080
app.debug:   true
app.label:   null

http.methods: [
    GET
    POST
    DELETE
]
```

### 7.3 Raw Strings

```text
pattern::  [a-z]+
template:: {issue.id}.tpl
ipv6::     [::1]:8080

literals: [
    ok
    :: true
    :: null
    :: [::1]
]
```

### 7.4 Multi-line Strings

```text
stripped: (
    {
      "qwe": 1
    }
)

verbatim: ((
  -----BEGIN-----
  CONTENT
  -----END-----
))
```

After parsing, `stripped` is the 3-line string

```
{
  "qwe": 1
}
```

(the 4 leading spaces common to every content line removed), and
`verbatim` is the 3-line string

```
  -----BEGIN-----
  CONTENT
  -----END-----
```

(preserved exactly as written).

## 8. Compliance

A **Ktav 0.1.0 conformant parser** MUST:

- C-1. Accept every syntactically valid document defined by § 4 and
  produce the Value defined by § 5.
- C-2. Reject every input that violates the rules of §§ 4, 5, or 6,
  returning an error that identifies the category (§ 6) and, where
  meaningful, a line number.
- C-3. Match keywords (`null`, `true`, `false`) case-sensitively and
  only in the exact positions defined by § 5.2.
- C-4. Preserve the insertion order of Object fields across round-trip
  operations (parse, then re-emit) within its data model. (The text
  representation itself does not encode order explicitly — order comes
  from the sequence of pair lines.)
- C-5. Produce identical Values for two documents that differ only in
  ASCII whitespace outside of multi-line-string content, comments, and
  blank lines.

A **Ktav 0.1.0 conformant writer** (text producer) MUST:

- W-1. Produce output that a conformant parser deserializes to a Value
  equal to the input Value.
- W-2. Emit the raw-string marker `::` for any String value whose body,
  if emitted plainly, would be classified as a non-String by § 5.2 —
  including strings equal to `null`, `true`, `false`, `(`, `((`, `()`,
  `(())`, or starting with `{` or `[`.
- W-3. Emit multi-line strings in a form that preserves their content
  byte-for-byte across a subsequent parse (the verbatim form, or a
  stripped form whose dedent reproduces the original).

## 9. Security Considerations

Parsing user-supplied Ktav is subject to the usual text-parser concerns:

- **Resource exhaustion**: A conformant parser MAY impose limits on
  the depth of nested compounds, the total document size, and the
  maximum length of a single line, to protect against denial-of-service
  attacks. These limits, if any, MUST be documented by the
  implementation.
- **UTF-8 validation**: Implementations MUST reject non-UTF-8 input.
  They MUST NOT silently substitute replacement characters.
- **Identifier collisions**: Because Ktav keys are unquoted, special
  characters in keys are detected by § 5.3.1. An implementation MUST
  NOT relax these rules to allow, for example, quoted keys with
  arbitrary content — such a relaxation would change the semantics of
  the `:` separator.

The format has no include, import, reference, or macro facility by
design. Parsing one document has no side effects beyond what a parser
observes in the document's own bytes.

## 10. Rationale (Non-normative)

This section records the reasoning behind major choices so future
versions can revisit them with full context.

**Why no quotes.** Quotes are visual noise that triples the character
count of simple strings. Most scalar values (hostnames, paths,
numbers, identifiers) do not need any escaping; those that do need to
be marked are served by the `::` raw marker.

**Why no commas or indentation.** Commas are famously easy to forget.
Significant indentation is famously easy to miscount. Newlines
separate everything; the cost of "one field per line" is a line-break
that the reader was going to make anyway.

**Why lowercase-only keywords.** YAML's case-insensitive booleans
(`Yes`, `No`, `True`, `False` — the infamous "Norway problem") are a
well-documented source of bugs. Restricting keywords to exact
lowercase removes that class entirely.

**Why `::`.** Escape characters inside values (`\n`, `\t`, etc.) force
implementations to pick and document a full escape table — an
open-ended obligation. Placing the escape decision in the separator
(the choice between `:` and `::`) is a single bit of information and
does not touch the value's bytes.

**Why multi-line via `( ... )`.** YAML's `|` / `>` block scalar
indicators have many modifiers (`|-`, `|+`, `>-`, `>+`, explicit
indentation indicator). Ktav restricts the choice to two: "stripped
common indent" vs "verbatim". The verbatim form guarantees lossless
round-trip; the stripped form serves the common case of pasting an
indented JSON/code block into a configuration.

**Why dotted keys.** Without them, users resort to YAML-style
indentation. Dotted keys let every line state its full address locally
— "what is this value and where does it belong?" — without any
contextual accounting.

**Why typed markers, and only two.** Strict 0.1.0 leaves all scalars as
strings at the Value level, deferring typing to the consumer. This
works well for typed-language consumers (Rust + serde, Go + marshal),
which can convert `"8080"` to `u16` without format cooperation. In
dynamically-typed consumers (JavaScript, PHP, Python), the same
mechanism forces consumers to cast every numeric field manually —
`Number(cfg.port)`, `intval($cfg['port'])` — or to ship their own
schema layer. The typed markers `:i` (Integer) and `:f` (Float) close
this gap.

The choice of exactly two markers is deliberate:

- **No bit-widths** (`:i8`, `:u32`): PHP, Python, and JavaScript each
  have exactly one integer type (PHP `int` is platform-width; Python
  `int` is arbitrary-precision; JavaScript `Number` covers both).
  Bit-widths are the typed-language consumer's concern and are
  already handled there by serde / reflection.
- **No signedness** (`:si`, `:ui`): same reason. None of PHP, Python,
  or JavaScript has an unsigned integer type natively.
- **No auto-detection** (`port: 8080` silently becoming Number): this
  is the path JSON took, and it silently corrupts `version: 1.2`
  (becomes Number, loses the string interpretation), `port: 0755`
  (leading zero eaten), and `id: 99999999999999999` (JavaScript
  Number precision loss). Explicit markers — written only where you
  want a number — avoid all three.
- **Values stored as strings.** The Integer and Float Value kinds
  hold the textual form, not a machine number. This preserves
  arbitrary precision (a 40-digit integer survives round-trip) and
  keeps the byte-for-byte round-trip guarantee of `((` verbatim for
  typed values too. The consumer narrows at its own boundary.

## 11. References

- RFC 2119, *Key words for use in RFCs to Indicate Requirement
  Levels*, S. Bradner, March 1997.
- [JSON5 specification](https://json5.org/). Ktav borrows its overall
  shape from JSON5 while dropping quotes and commas.
- [TOML](https://toml.io/) and
  [YAML](https://yaml.org/) — formats whose design choices informed
  Ktav by contrast.

## Appendix A. Changes

Version 0.1.0 is the initial specification. Within 0.1.0 the
following changes apply relative to pre-release drafts:

- **Added**: typed-scalar markers `:i` (Integer) and `:f` (Float) in
  pair and array-item positions.
- **Added**: `Integer` and `Float` Value kinds (§ 5).
- **Added**: `InvalidTypedScalar` error category (§ 6.9).
- **Changed**: § 4 Grammar and § 5.2 Scalar interpretation to
  accommodate the new markers; § 5.3 Pair Lines and § 5.4 Array-Item
  Lines extended with typed forms.

All subsequent changes — both across versions and editorial fixes
within a version — are recorded in the repository-level
[`CHANGELOG.md`](../../CHANGELOG.md).
