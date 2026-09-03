
A structural defect inside a closed inline compound — one that is
not already classified as `UnterminatedInlineCompound` — is a
`MalformedInlineCompound` error. The defects covered are:

- A leading comma immediately after the opener (`{,a: 1}`,
  `[,1, 2]`).
- Two or more consecutive commas (`{a: 1,, b: 2}`, `[1,, 2]`).
- An empty inline-array item, i.e. a comma not preceded by a value
  (`[a,, b]`); the trailing comma exception of § 5.8 still applies
  to a single comma immediately before the closing delimiter.
- Other inline structural defects that do not raise
  `UnterminatedInlineCompound` (e.g. a missing pair separator
  inside an inline object: `{a 1, b: 2}`).

Empty pair values (`{a:}`, `{a::}`) are NOT a defect — they yield
an empty String per § 5.8.2.

