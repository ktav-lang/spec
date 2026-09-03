
A writer-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement of § 5.9.
- For each fixture under `versions/0.7/tests/valid/`, produces —
  when given the Value parsed from `name.ktav` — a byte-exact
  output equal to `name.canonical.ktav`, UNLESS the implementation
  supports a domain wider than the minimum along the `boundary_class`
  of one or more leaves
  [`versions/0.7/tests/boundary-fixtures.json`](tests/boundary-fixtures.json)
  lists for that fixture — per § 8.1, such an implementation may hold
  a different Value at that leaf's path than the minimum-domain
  `.json` oracle describes there (e.g. `i64_overflow_to_string`'s
  `/overflow` field held as an Integer, not a String), while every
  other field of the same fixture still holds its minimum-domain
  Value and MUST still appear in the output exactly as the
  minimum-domain writer would render it. For such a fixture, this
  corpus does not pin the exact byte sequence for the exempt leaf's
  own contribution to the output: it MUST be the correct canonical
  form (§ 5.9) for the Value the implementation actually holds there
  (e.g. an Integer value is canonically written bare, without the raw
  marker, § 5.9.5), internally consistent and deterministic for its
  own domain — but which exact bytes that is for a domain other than
  the minimum is not something this shared, language-agnostic corpus
  verifies. An implementation supporting only the minimum domain MUST
  match every `valid/` fixture's `.canonical.ktav` exactly, in full,
  including every field `boundary-fixtures.json` lists a leaf for.
- For each fixture under `versions/0.7/tests/unrepresentable/`,
  rejects the Value described by `name.json["value"]` with the
  reason code named in `name.json["unrepresentable_reason"]`
  (§ 5.9.0) — via whatever error-reporting shape its own API uses;
  the code names are normative, the surfacing mechanism is not.

The canonical form is defined in § 5.9.

