
The grammar is presented in a semi-formal notation, one rule per line.
Terminals are in double quotes; `<name>` denotes a non-terminal;
`*` is zero-or-more, `+` is one-or-more, `?` is optional, `|` is
alternation. Within a terminal, `\"` denotes a literal double-quote
character and `\\` denotes a literal backslash — this notation is
used only where a terminal must itself contain a quote or backslash
byte (e.g. the quoted-segment delimiters, § 4). `(ws)` stands for
zero or more whitespace code points (§ 3.3 — the fixed 25-code-point
set, not ASCII-only).

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

<key>                ::= <segment> ( <unescaped-dot> <segment> )*
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

