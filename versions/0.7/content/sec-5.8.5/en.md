
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
When an inline terminator instead follows immediately on the same
line (e.g. `{a: (, b: 1}`), the value is complete before end-of-line
and is read as the ordinary one-byte String `"("` — not an error;
the `UnterminatedInlineCompound` case above is specifically the
common situation where nothing else appears on the line after the
`(`/`((`. Multi-line string openers are not permitted inside inline
compounds.

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

