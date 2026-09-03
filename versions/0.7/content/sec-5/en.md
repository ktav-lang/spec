
A compliant parser produces a **Value** for a conforming document.
Value is one of: **Null**, **Bool**, **Integer**, **Float**, **String**,
**Array**, **Object**.

- **Null** — a single distinguished value.
- **Bool** — `true` or `false`.
- **Integer** — a numeric scalar carrying an integer value. The
  implementation MUST support at least the i64 range
  (-2^63 .. 2^63 - 1) and MAY support a wider range (e.g. arbitrary
  precision). The `valid/` conformance fixtures (§ 8.1) assume this
  minimum i64 domain for scalar classification (§ 5.2 rule 13): an
  integer literal outside the i64 range is a String for a
  minimum-domain implementation, so `i64_overflow_to_string.json`
  expects the String `"9223372036854775808"`. § 8.1 / § 8.2 and
  `versions/0.7/tests/boundary-fixtures.json` define, at the level
  of individual leaves, exactly where and how a wider-domain
  implementation MAY legitimately diverge from a minimum-domain
  fixture oracle. The canonical textual form of an Integer
  is a base-10
  decimal string with no underscores and no leading zeros (except
  the literal `0`); a leading `+` is dropped; signed-zero literals
  (`+0`, `-0`) normalise to `0`. The canonical form is used by
  writer-conforming implementations (§ 5.9).
- **Float** — a numeric scalar carrying a numeric value. The
  implementation MUST support at least the range and precision of
  IEEE 754 binary64 and MAY support a wider representation (e.g.
  arbitrary-precision decimal). Converting a decimal float literal
  (§ 3.6) to this minimum binary64 representation MUST follow IEEE
  754's `roundTiesToEven` rounding-direction attribute, and the
  minimum representation MUST include subnormal (gradual-underflow)
  values down to binary64's smallest positive subnormal
  (2^-1074 ≈ 4.9406564584124654 × 10^-324) — an implementation that
  flushes subnormals to zero early, or rounds ties away from even,
  does not meet this floor even though it never produces a non-finite
  Float. The internal representation beyond
  that minimum is implementation-defined. The canonical
  textual form (§ 5.9) MUST be used by writer-conforming
  implementations. The Value does **not** preserve the textual form
  as written; underscores, the choice of `e` vs `E`, and leading-`+`
  signs are not part of the Value model.
- **String** — a (possibly empty) UTF-8 string.
- **Array** — an ordered sequence of Values.
- **Object** — an ordered sequence of (name, Value) pairs, names
  being strings. Name uniqueness is required within an Object (§ 5.5).

The root Value produced by parsing a document is either an Object or
an Array (each possibly empty). The kind of the root is determined
by the first content line of the document — see § 5.0.1.

