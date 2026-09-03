
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

