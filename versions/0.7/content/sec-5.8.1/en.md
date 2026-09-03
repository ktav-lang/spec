
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

