
The two cases look symmetric — an empty inline value, either as
the value of a key in an Object or as an item in an Array — but
are treated differently (§ 5.8.2 and § 5.8.3): `{a:}` yields a
key `a` mapped to the empty String, while `[,a]` is a
`MalformedInlineCompound` error.

The asymmetry is deliberate. An empty pair value is anchored by
an explicit key, so the "explicitly empty field for key X" intent
is unambiguous; the form is concise and useful for representing,
e.g., environment variables set to the empty string. An empty
array item has no such anchor, so the form `[,a]` is more likely
a typo (a leading or doubled comma) than a deliberate empty-string
item. Forcing the writer to use `["", a]` for an intentional empty
String makes the intent explicit and catches the common typo at
parse time.

