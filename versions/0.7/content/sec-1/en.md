
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

