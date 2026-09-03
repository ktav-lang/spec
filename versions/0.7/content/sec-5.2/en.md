
Given a **scalar body** — the trimmed text obtained from a pair-line
body after a plain `:` separator, or the trimmed text of an inline
scalar after escape processing (§ 3.7), or the trimmed text of an
array-item line that uses no marker — the parser classifies it as
follows. Rules are applied in order; the first matching rule wins.
Bodies after `::` are **not** dispatched through § 5.2; they are
handled per § 5.3 / § 5.4 / § 5.8 as raw Strings.

1. If the body is exactly `{` → open a new Object scope (multi-line).
2. If the body is exactly `[` → open a new Array scope (multi-line).
3. If the body is exactly `(` → open a multi-line string (stripped
   form, § 5.6).
4. If the body is exactly `((` → open a multi-line string (verbatim
   form, § 5.6).
5. If the body is `()` or `(())` → empty String.
6. If the body matches the **closed-inline-object** shape `{ … }`
   with balanced delimiters and a matching `}` at the end of the
   body → produce the inline Object per § 5.8.
7. If the body matches the **closed-inline-array** shape `[ … ]` →
   produce the inline Array per § 5.8.
8. If the body starts with `{` but does not match rules 1 or 6
   (e.g. `{ a: 1`) → unterminated inline object — error (§ 6.11).
9. If the body starts with `[` but does not match rules 2 or 7 →
   unterminated inline array — error (§ 6.11).
10. If the body is exactly `null` → Null.
11. If the body is exactly `true` → Bool `true`.
12. If the body is exactly `false` → Bool `false`.
13. If the body matches the **integer literal** grammar (§ 3.6) and
    its numeric value fits at least the i64 range
    (-2^63 .. 2^63 - 1, i.e. -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807): Integer carrying the integer value.
    The canonical textual form is the base-10 decimal normalisation
    described in § 5 (and § 5.9.8). Implementations MAY support a
    wider integer range (e.g. arbitrary precision / `bignum`); a
    value that exceeds the implementation's supported range falls
    through to rule 15 (String). To guarantee interoperability, a
    portable document SHOULD NOT rely on Integer-typing for values
    outside the i64 range; a 0.7.0-conformant parser running on a
    strictly-i64 backend MUST place such overflow bodies into rule 15.
14. If the body matches the **float literal** grammar (§ 3.6) and
    its numeric value is finite in the implementation's supported
    Float domain (§ 5): Float carrying the numeric value parsed
    from the body. The internal representation is
    implementation-defined (see § 5 description of Float); the
    canonical textual form is specified in § 5.9.8. A literal whose
    parsed value would not be finite in that domain — e.g. a
    binary64 backend given `1e9999`, which overflows to infinity —
    falls through to rule 15 (String), exactly as an out-of-range
    Integer literal does under rule 13. The grammar of § 3.6 can
    express magnitudes beyond what any Float domain holds finite,
    but no such literal is ever classified as Float: a
    0.7.0-conformant parser MUST NOT produce a non-finite Float via
    this rule — which is what makes § 5.9.0's "no literal grammar
    of § 3.6 produces a non-finite Float" claim true. Underflow to
    ±0.0 (e.g. `1e-9999` on binary64) is not a fallback case: zero
    is finite, so such a literal is an ordinary Float.
15. Otherwise → String whose content is the body, as written.

The keyword forms `null`, `true`, `false` and the numeric literals
are matched **case-sensitively**. A body of `True`, `NULL`, `False`,
`0xZZ`, `0o9`, etc., is a String.

Scalar classification under this section is a deterministic function
of the trimmed, escape-processed byte sequence — determinism only,
not a license to re-run classification against escape-produced bytes
as if they were raw, unescaped source: § 3.7's provenance rule (an
escape's output is never re-examined as structural) applies here too,
so a body like `\{value\}` classifies by the literal characters
`{value}` under rule 15 (String), not by re-entering these rules at
the decoded `{`. More generally: an inline scalar body containing at
least one recognised escape sequence (§ 3.7) is always classified as
String (rule 15), regardless of what its decoded bytes would otherwise
resemble — a body like `\u0031` (decoding to the single digit `1`) or
`\u0074rue` (decoding to `true`) is `String("1")` / `String("true")`,
never `Integer` or `Bool`. This closes an ambiguity § 3.7's provenance
rule alone left open: that rule's enumeration of "structural" bytes
(the delimiters `.`, `:`, `,`, `{`, `}`, `[`, `]`) does not by itself
say whether an *escaped* digit, letter, or parenthesis is likewise
exempt from rules 10–14's number/keyword/paren-shortcut detection —
this sentence makes that exemption explicit and total: the presence of
any recognised escape sequence anywhere in the body is sufficient to
force String, full stop.
Two parser-conforming implementations that support
the same numeric domain MUST produce the same Value kind for the same
body. This is a general rule about every document a parser might see,
not just about the fixtures in § 8's conformance corpus. Where two
implementations' numeric domains differ, a body whose numeric value
crosses one implementation's domain boundary but not the other's MAY
classify differently between them — an out-of-range Integer or
non-finite-on-that-domain Float literal falls through to String under
rules 13–14 for the narrower domain but stays Integer or Float for the
wider one, for *any* body where this happens, not only for a
specifically named or enumerated one. This is not an exception to
determinism: it follows directly from each implementation correctly
applying its own domain's rules 13–14 to the same body, and the
same-kind guarantee itself is scoped to implementations of the same
domain from the start — it was never unconditional across domains.
§ 8.1 and § 8.2 separately name, for the shared conformance corpus
specifically, which fixtures are known to actually probe such a
boundary.

