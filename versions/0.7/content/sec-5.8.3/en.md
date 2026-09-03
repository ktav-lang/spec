
An inline array item is any `<inline-value>`. The inline scalar
form is dispatched through § 5.2 after escape processing.

An **empty inline-array item** — a position where one item is
expected but no characters appear, e.g. the body between two
commas (`[a,, b]`) or directly after the opener (`[, a]`) — is
NOT an empty String. It is a `MalformedInlineCompound` error
(§ 6.12). The asymmetry with empty pair values (§ 5.8.2) is
deliberate; see § 10.5 for the rationale.

The single trailing comma immediately before the closing
delimiter (`[a, b,]`, `{a: 1, b: 2,}`) is a recognised trailing
comma, NOT an empty item, per § 5.8.

