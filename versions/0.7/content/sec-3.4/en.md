
A **comment** is a line whose first non-whitespace code points are `##`
(two ASCII `#` bytes). The rest of the line, up to and including the
line terminator, is the comment body. Comments produce no Value and
are ignored.

A single `#` byte has no special meaning: `#-prefixed` text on a line
without a leading `##` is an ordinary scalar / key character.

Comments MUST occupy their own line; trailing comments at the end of
a content line are not supported. Since comments are recognised only
at the start of a trimmed line, the literal byte pair `##` in the
middle of a value, key, or other content is just two `#` characters
and needs no escape — there is no `\#` escape sequence in 0.7.0.

