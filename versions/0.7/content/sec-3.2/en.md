
A line terminator is one of three byte sequences:

- `LF` (`0x0A`)
- `CR` (`0x0D`)
- `CR LF` (`0x0D 0x0A`)

Implementations MUST treat all three as equivalent line terminators.
A document MAY have a final line without a trailing terminator.

A `CR` byte never appears as a content byte at parse time: it is
always a terminator (alone or paired with a following `LF`). A
String value can carry a `CR` byte via the `\r` escape sequence, or
via the generic `\uXXXX` escape naming code point 000D, inside an
inline scalar (§ 3.7, § 3.7.1, § 5.8); such a Value is not
representable in canonical form (§ 5.9.7).

Inside an inline compound (§ 5.8), the parser MUST NOT cross a line
terminator: an unclosed inline compound at end-of-line is an error
(§ 6.11).

