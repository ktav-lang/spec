
A parser-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement in this
  document that pertains to parsing.
- Accepts every fixture under `versions/0.7/tests/valid/` and
  produces a Value equivalent to the corresponding `name.json`
  oracle. That equivalence is defined at the minimum-required
  numeric domain of § 5 (i64 Integer, binary64 Float).
  [`versions/0.7/tests/boundary-fixtures.json`](tests/boundary-fixtures.json)
  lists the individual Object fields (leaves) known to probe a
  numeric-domain boundary (§ 5.2) — not whole fixtures: a fixture MAY
  mix boundary-dependent leaves with ordinary ones (e.g.
  `big_overflow_to_string`'s `tiny` field is an ordinary `Integer(1)`
  in every conforming domain, while its `big` / `bigger` fields are
  not), and only a listed leaf is exempt — every other field of that
  same fixture MUST still match exactly. Each entry names a
  `boundary_class`: `integer_range` (exceeds the mandatory i64 range),
  `float_range` (overflows to non-finite on binary64),
  `float_underflow` (underflows to zero on binary64), or
  `float_precision` (binary64 rounds or shortens the value where a
  higher-precision domain would not). An implementation is exempt from
  matching a listed leaf's value only if it genuinely supports a
  domain wider than the minimum *along that leaf's specific
  `boundary_class`* — a BigInt-but-plain-binary64 implementation is
  exempt on `integer_range` leaves but not on any `float_*` leaf, and
  a wide-Float-but-plain-i64 implementation is exempt the other way
  around; supporting one axis does not exempt an implementation on the
  other. For an exempt leaf, this corpus does not pin what its Value
  must be — § 5.2 already states the general rule (same domain ⇒ same
  kind, differing domain ⇒ MAY differ at the crossed boundary), and
  that Value is what the implementation's own correct application of
  § 5's rules 13–14 to the leaf's body produces. Every field not
  listed in `boundary-fixtures.json`, in every fixture, carries no
  exemption for any implementation of any domain.
- Rejects every fixture under `versions/0.7/tests/invalid/` with
  the error category named in `name.json["expected_error"]`.

