
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

