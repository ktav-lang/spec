
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
consistency with the other thirteen named forms) and use `\uXXXX` only
for code points with no named escape. When `\uXXXX` is emitted, the four hex
digits MUST be uppercase (`0-9A-F`) — parsing is case-insensitive
(§ 3.7.1 above), but two writer-conforming implementations emitting
the same code point MUST produce byte-identical output (§ 5.9's
determinism requirement).

