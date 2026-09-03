
A `}` or `]` on a line that does not match the innermost open
Object/Array (§ 5.1 rules 5–6) is an `UnbalancedBracket` error. An
Object, Array, or multi-line string left open at end-of-file — its
matching `}`, `]`, `)`, or `))` never found — is an
`UnclosedCompound` error.

`)` and `))` are never close-tokens outside this second case: inside
an open multi-line string, a line that does not match that string's
own terminator (§ 5.6) is read as ordinary content (§ 5.1 rule 3),
not an error; outside any open multi-line string, `)` and `))` are
ordinary array-item or pair-value text (§ 5.2, § 5.4) like any other
line.

