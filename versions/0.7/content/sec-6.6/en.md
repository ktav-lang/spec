
A line dispatched to pair-line mode that contains no
**unescaped** `:` separator is a `MissingSeparator` error. This
applies inside the body of an open multi-line Object, or at the
top level when the root is an Object. When the specific reason no
separator was found is an unterminated quoted key segment (§ 5.3.3),
the more specific `UnterminatedQuotedKey` (§ 6.16) is reported
instead.

