
- **Integer:** base-10 decimal. Leading `+` is dropped. `-0` and
  `+0` emit as `0`. No underscores. No leading zeros (other than
  the literal `0`). The minus sign is preserved for negative
  values.
- **Float:** the chosen textual form matches one of the two
  alternatives of § 3.6:
  - `sign? digits "." digits ("e" sign? digits)?`
  - `sign? digits "e" sign? digits`

  Lowercase `e` only. Underscores stripped. The leading `+` on the
  mantissa is dropped. The leading `+` on the exponent is dropped
  (a positive exponent carries no sign).

  First compute the shortest decimal expansion that uniquely identifies
  the Value, using a Ryu / Grisu / Steele-White-class algorithm. For an
  IEEE 754 binary64 implementation, this is the shortest decimal that
  round-trips to the same binary64. Then choose its notation using this
  deterministic policy, where `abs` is the absolute numeric value:

  - if `0 < abs < 1e-2` or `abs >= 1e7`, use the exponent
    alternative;
  - otherwise, use the `digits "." digits` alternative.

  The threshold condition is never satisfied by `abs == 0`, which
  therefore always uses the decimal alternative: the canonical form
  of positive zero is `0.0` and of negative zero is `-0.0` —
  decimal, never scientific, with the sign preserved. Unlike an
  Integer's `-0`, which normalises to `0` (see the Integer bullet
  of § 5), a Float keeps the IEEE 754 sign distinction between
  `0.0` and `-0.0`.

  The thresholds are exact: `0.01` and `9999999.0` use decimal form,
  while `0.001`, `0.0015`, `-0.001`, and `10000000.0` use exponent
  form. Scientific output uses lowercase `e`, omits a positive exponent
  sign, and strips a trailing `.0` from the mantissa. Thus the examples
  are `0.01`, `1e-3`, `1.5e-3`, `-1e-3`, `9999999.0`, and `1e7`.

  Two writer-conforming implementations using the same Float
  representation (binary64) MUST produce identical output for the
  same Value. The test fixtures `*.canonical.ktav` assume binary64
  semantics; implementations using arbitrary-precision decimal MAY
  produce different output only where their Value domain differs.

