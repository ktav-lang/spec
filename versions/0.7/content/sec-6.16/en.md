
A quote character (`"`, `'`, or `` ` ``) that opens a `<quoted-segment>`
(§ 5.3.3 — it is the first code point of a key segment after
trimming) with no matching unescaped closing delimiter of the same
character before end-of-line is an `UnterminatedQuotedKey` error,
reported on any line dispatched as a pair line (§ 5.1 rule 8) —
that is, an ordinary multi-line pair line, inside an established
Object or the top-level Object body, where finding a separator is
the only requirement and no enclosing bracket needs its own
same-line closer. This diagnosis takes precedence over the generic
`MissingSeparator` (§ 6.6) that a colon-free line would otherwise
raise, mirroring how an unterminated `[` / `{` already takes
precedence over a generic pair-candidate read at § 5.0.1 rule 6.

This category does NOT cover an inline-pair position (§ 5.8.2): an
unclosed quoted key there (e.g. `{"a: 1}`, or `obj: {"a: 1}`)
necessarily swallows the rest of the line — including whatever would
have been the enclosing compound's own closing `}` / `]` — so the
compound itself never bracket-balances, and never closes at all. The
balanced-content check behind `UnterminatedInlineCompound` (§ 6.11)
is already quote-opaque for exactly this reason (§ 5.3.3's "Inline
pairs" bullet), and reports exactly that category instead — never
`UnterminatedQuotedKey`, and never `MalformedInlineCompound` (§ 6.12
applies only to a structural defect INSIDE an already-CLOSED
compound; a compound whose only candidate closer was swallowed by
the unterminated quote never closes, so § 6.12 categorically does
not apply here, not merely as an alternative reading) — since the
compound-level defect is what a reader can actually see and fix (add
the missing quote-closer, which is also the only way to give the
compound its missing `}` / `]`); there is no separate "the key
inside was also unterminated" defect to name on top of it. This also
never applies
to the document's first content line itself, whether or not that
line begins with `{` / `[`: § 5.0.1 rule 6 uses this same
separator-scanning rule for its own phase-1 shape test on a line NOT
starting with `{` / `[`, so on that UNDECIDED first line the same
underlying fact — no separator found — is not an error at all: it
is simply not a pair candidate, and root-kind detection falls
through to an Array root with this line as a String item (§ 5.3.3,
§ 5.0.1 rule 7); a first line that DOES begin with `{` / `[` follows
the bracket-balance path above instead, per § 5.3.3's "Unterminated
quoted segments" bullet.

