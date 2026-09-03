
A pair separator is selected by the kind/content of its value:

- **`key:` (no body after the colon):** when the value is the
  empty String `""`.
- **`key: <bytes>` (plain separator + one space + scalar body):**
  when the value is a non-empty bare String whose body (a)
  contains no `LF` and no `CR` byte, (b) has no leading or
  trailing whitespace (§ 3.3 — the fixed 25-code-point set, not
  ASCII-only), (c) contains no ASCII control byte
  (0x00–0x1F other than 0x09 `TAB`), (d) does not match the
  integer or float literal grammar of § 3.6 — regardless of
  whether its numeric value fits the implementation's own
  supported domain (§ 5) — and is not exactly `null`, `true`, or
  `false`, (e) does not
  start with `{` or `[` (which would cause § 5.2 to dispatch
  the body as an inline compound rather than a String), and
  (f) is not exactly `()`, `(())`, `(`, or `((` (the first two
  are § 5.7's empty-compound shortcuts, reinterpreted as the
  empty String rather than this literal body; the last two are
  a multi-line-string opener per § 4's `<value-start>` grammar,
  reinterpreted as opening a block rather than a one-byte or
  two-byte String — the same class of hazard as (e) above, and
  resolved the same way, via the raw marker below). Condition (d)
  is deliberately domain-independent: a String whose body merely
  *looks* like a number to a wider-domain reader — e.g.
  `9223372036854775808`, a String on a minimum (i64) domain but a
  valid Integer literal on a wider one — still needs the raw
  marker below, precisely so that a reader with a different
  numeric domain does not silently reclassify it (§ 5.2's own
  same-kind guarantee, § 5.2, is about domain-*consistent*
  classification; the canonical writer of a String must not
  depend on which domain happens to be doing the writing).
- **`key:: <bytes>` (raw marker):** when the bytes are a non-empty
  one-line String that would otherwise be reinterpreted by § 5.2
  if emitted with plain `:` — either as matching the integer or
  float literal grammar of § 3.6 (regardless of whether the value
  fits the writer's own numeric domain), as exactly `null` /
  `true` / `false`, as an inline compound (a body starting
  with `{` or `[`), as a multi-line-string opener (a body of
  exactly `(` or `((`), as the empty String via § 5.7's shortcuts
  (a body of exactly `()` or `(())`), or any other non-String
  classification.
- **`key: <multi-line>`:** when the value is a String containing
  `LF`, leading/trailing whitespace, or any control byte other
  than `LF` / `TAB` (and not `CR`, which is not representable —
  see § 5.9.7).
- **`key: <compound>`:** when the value is a non-empty Object or
  Array (per § 5.9.4) or an empty `{}` / `[]`.

