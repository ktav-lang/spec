>>>>> lang=en
- Satisfies every normative MUST / MUST NOT statement of § 5.9.
- For each fixture under `versions/0.7/tests/valid/`, produces —
  when given the Value parsed from `name.ktav` — a byte-exact
  output equal to `name.canonical.ktav`, except for the contribution
  of a leaf that
  [`versions/0.7/tests/boundary-fixtures.json`](tests/boundary-fixtures.json)
  lists for that fixture. Under § 8.1,
  every ordinary, non-exempt field MUST match its JSON oracle in the
  tested implementation's declared domain; an ordinary numeric field
  is not required to hold a universal minimum-domain Value. A listed
  boundary leaf MAY hold a different Value only when the tested source
  literal crosses that leaf's named boundary and the implementation
  supports a wider domain along that boundary class. Every other field
  MUST match normally, and its contribution MUST remain byte-exactly
  the same as the canonical output. For an exempt leaf, this corpus
  does not pin the exact bytes of its own contribution: they MUST be
  the correct canonical form (§ 5.9) for the Value the implementation
  actually holds there, internally consistent and deterministic for
  its domain. An implementation supporting only the minimum domain
  MUST match every `valid/` fixture's `.canonical.ktav` exactly,
  in full, including every listed boundary leaf.
- For each fixture under `versions/0.7/tests/unrepresentable/`,
  rejects the Value described by `name.json["value"]` with the
  reason code named in `name.json["unrepresentable_reason"]`
  (§ 5.9.0) — via whatever error-reporting shape its own API uses;
  the code names are normative, the surfacing mechanism is not. Each
  JSON object MUST contain exactly `value`,
  `unrepresentable_reason`, and non-empty `note`, with no extra
  fields; the Value mapping and the exact `$float` sentinel shape are
  defined by § 5.9.0. The reason code MUST have a recursive witness in
  the Value tree, rather than being inferred from the filename. For
  NonFiniteFloat, the $float sentinel is supplied through the abstract
  programmatic Float carrier, is outside the parser and canonical domains,
  and MUST preserve the distinction between NaN, +Infinity, and -Infinity.
- For each fixture under
  `versions/0.7/tests/parseable-unrepresentable/`, when given
  `name.json["value"]`, rejects that Value with the reason code
  named in `name.json["unrepresentable_reason"]`. These
  fixtures are pairs, not valid triples, and MUST NOT have a canonical
  output file.

The canonical form is defined in § 5.9.

>>>>> lang=ru
Каноническая форма определена в § 5.9.

>>>>> lang=zh
规范形式定义见 § 5.9。

