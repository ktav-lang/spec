
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
values alike — exactly as `\.` and `\:` already are: a quote
character has no structural meaning in a bare segment or an inline
value either, so the escape is simply redundant (but valid) there,
the same relationship `\.`/`\:` already have with inline values.

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

