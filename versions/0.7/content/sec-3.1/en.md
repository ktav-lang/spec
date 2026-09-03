
A Ktav document is a sequence of Unicode code points encoded as UTF-8.
Implementations MUST reject documents that are not valid UTF-8, with
an `InvalidUtf8` error (§ 6.15). A parser-conforming implementation
MUST skip exactly one leading byte-order mark (U+FEFF) if it is the
very first code point of the document, before any other byte; the
canonical writer (§ 5.9) MUST NOT emit a leading byte-order mark. A
U+FEFF code point anywhere else in the document is ordinary content —
§ 3.3 does not classify it as whitespace.

