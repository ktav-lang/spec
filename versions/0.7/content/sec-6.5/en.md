
A key segment that is empty after trimming — whether the entire key
(a pair line with nothing before the separator) or one segment of a
dotted key (e.g. `a..b`) — is an `EmptyKey` error (§ 5.3.1). This
includes an empty quoted segment (`""`, `''`, ` `` `) — but NOT a
quoted segment containing only whitespace (`" "`), since a
`<quoted-segment>`'s content is never trimmed (§ 5.3.3).

