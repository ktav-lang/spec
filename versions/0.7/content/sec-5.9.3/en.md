
- **Empty Object root:** the canonical form is the empty file
  (zero bytes). No `{}` is emitted. (Parses back per § 5.0.1
  rule 1 — no content lines.)
- **Empty Array root:** the canonical form is the single line
  `[]` followed by an `LF`. (Parses back per § 5.0.1 rule 3 —
  closed inline array `[ ]` on the first content line.)
- **Object root with pairs:** each pair occupies its own line at
  indent level 0; no opening or closing brace at the root.
- **Array root with items:** each item occupies its own line at
  indent level 0; no opening or closing bracket at the root
  **unless** the first item, rendered on its own line(s) at
  indent 0, would itself be detected by § 5.0.1 as establishing a
  different root. This happens in two shapes:
  - the first item is a non-empty Object / Array, whose own
    canonical rendering opens with a lone `{` or `[` on its own
    line (§ 5.9.6) — matching § 5.0.1 rule 4 or rule 5; or
  - the first item is an **empty** Object / Array, whose canonical
    rendering is the single closed-inline line `{}` or `[]`
    (§ 5.9.6) — matching § 5.0.1 rule 2 or rule 3.
  In either case the writer wraps the root in explicit brackets:
  `[` on its own line at indent 0, each item at indent + 1
  (4 spaces), and `]` on its own line at indent 0. This forces the
  parse to take § 5.0.1 rule 5 (lone `[` → multi-line Array root)
  with the original first item — compound or empty-compound alike —
  nested one level in.

The choice between an Object root and an Array root is determined
by the Value's kind, and parses back per § 5.0.1.

Note: an Object pair line cannot be mistaken for a closed-inline or
lone-opener root line (it always has a `:` separator); only Array
roots whose first item is itself a compound (empty or not) require
the wrap. A separate hazard — an Array root's first item whose bare
rendering would itself be recognised as a pair line (§ 5.0.1 rule 6)
— is resolved not by this wrap but by forcing the raw-marker form
for that one item instead (§ 5.9.6).

