
A document whose raw bytes are not valid UTF-8 (§ 3.1, § 9.3) is an
`InvalidUtf8` error. This check happens before any line-oriented or
grammar-level processing — a document that fails it MUST NOT also be
diagnosed with any other category in this section, since none of the
byte-oriented rules those categories depend on (line terminators,
`<key-char>`, escape sequences, ...) are well-defined over a byte
sequence that isn't valid UTF-8 to begin with. The error span SHOULD
point at the byte offset of the first invalid sequence.

