
Ktav values are written by humans. Heavy escape rules are a
correctness footgun. The 0.5.0 escape set was the minimal closed
set for inline scalars. 0.6.0 extends it to keys with `\.` and
`\:`, giving ten named escapes — every structurally significant
byte in inline form (`,`, `}`, `]`, `{`, `[`), the key-structural
bytes (`.`, `:`), the literal backslash (`\\`), plus two
convenience escapes (`\n`, `\r`) for embedded newlines. 0.7.0 adds
an eleventh, `\uXXXX` (§ 3.7.1), for the rare case of needing to
name an arbitrary code point by number rather than typing it
directly, and three more — `\"`, `\'`, `` \` `` — for the quote
characters that quoted keys (§ 5.3.3) use as delimiters, giving
fourteen named escapes in total — most byte values are still
written literally, since they need no escape at all.

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

