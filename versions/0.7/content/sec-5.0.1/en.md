
The "first content line" is the first line that is neither blank
(§ 5.1 rule 1) nor a comment (§ 5.1 rule 2). The root kind is
established from this line as follows. Rules are applied in order;
the first matching rule wins.

1. If the document has **no content lines** (empty document, or only
   blank/comment lines) → root is an empty **Object**.
2. If the first content line trimmed is a **closed inline object**
   `{ … }` — a `{`, balanced inline content, and a matching `}` as
   the last non-whitespace code point of the trimmed line — → root **IS**
   that inline Object. The document MUST have no further content
   lines; any subsequent non-blank, non-comment line is an
   `OrphanLineAfterTopLevelInline` error (§ 6.14).
3. If the first content line trimmed is a **closed inline array**
   `[ … ]` — a `[`, balanced inline content, and a matching `]` as
   the last non-whitespace code point of the trimmed line — → root **IS**
   that inline Array. The document MUST have no further content
   lines; any subsequent non-blank, non-comment line is an
   `OrphanLineAfterTopLevelInline` error (§ 6.14).
4. If the first content line trimmed is a **lone `{`** (the opening
   brace, possibly preceded or followed by whitespace, with nothing
   else on the line) → root is a **multi-line Object** opened by
   this brace. Its matching `}` on a later line closes the root;
   any content after that matching close line is
   `OrphanLineAfterTopLevelInline` (§ 6.14).
5. If the first content line trimmed is a **lone `[`** → root is a
   **multi-line Array** opened by this bracket. Its matching `]`
   closes the root; content after the matching close is
   `OrphanLineAfterTopLevelInline` (§ 6.14).

   If the first content line trimmed begins with `[` or `{` but
   matches none of rules 2–5 above — the leading bracket/brace has
   no matching closer at the end of the line, and the line is not a
   lone opener either — it is diagnosed as a malformed or
   unterminated inline-compound attempt (§ 5.2 rules 8–9;
   `UnterminatedInlineCompound` / `MalformedInlineCompound`,
   § 6.11 / § 6.12). This diagnosis takes precedence over rule 6
   below: such a line is never treated as a pair candidate, even if
   it also contains an unescaped `:` later on (e.g. `[bad]: 1`).
   This precedence only applies when `[` or `{` is the first
   non-whitespace code point of the trimmed line — elsewhere in the
   line (e.g. `a{b: 1`) the byte is just an ordinary forbidden
   `<key-char>`, and rule 6 proceeds normally, yielding
   `InvalidKey` on validation.
6. Otherwise, if the first content line trimmed is a **pair
   candidate** — it has the *shape* of a pair line under § 5.3
   (`key: …` / `key:: …`, including dotted keys): a first
   **unescaped** `:` (or `::`) separator under § 4's
   separator-scanning rule, with a non-empty raw prefix before it,
   where the separator is either the `::` marker or a plain `:`
   satisfied by `<sep-end>` (whitespace or end-of-line after it) —
   → root is an **Object** with this line as its first pair.

   Detection is deliberately two-phase. Phase 1 (this rule) is a
   purely lexical, shape-only test: the prefix before the separator
   is NOT required to be a grammatically valid `<key>` (§ 4) at
   detection time, so a first line such as `a,b: 1` still selects
   an Object root. Because phase 1 reuses § 4's separator-scanning
   rule verbatim rather than a separate implementation, it inherits
   that rule's quote-awareness for free — a quoted-segment's
   content stays opaque to the scan even on this UNDECIDED first
   line, with no separate logic to keep in sync. Phase 2 is uniform
   validation: once the Object
   context exists, § 5.3 / § 5.3.1 validate the candidate's raw key
   prefix exactly as they validate every other pair line inside an
   established Object (§ 5.1 rule 8) — the same line then yields
   `InvalidKey` (§ 6.4), `EmptyKey` (§ 6.5), or `BadEscapeSequence`
   (§ 6.13) as appropriate. A glued plain-`:` line (e.g. `a,b:1`,
   no whitespace after the separator) is not a pair candidate and
   falls through to rule 7 (a bare-scalar array item); a glued `::`
   line is a pair candidate, and the glued form surfaces in
   phase 2 as `MissingSeparatorSpace` (§ 6.10).
7. Otherwise, if the first content line trimmed is recognised as an
   **array-item line** under § 5.4 other than rules 4 / 5 above
   (a bare scalar, a raw-marker item `:: …`, a multi-line string
   opener `(` / `((`, an empty-compound shortcut `{}` / `[]` /
   `()` / `(())`, or a closed inline compound that did not match
   rules 2 / 3) → root is an **Array** with this line as its first
   item.
8. Otherwise (a bare close `}` / `]` on the first content line, or
   otherwise unclassifiable) → `UnbalancedBracket` error (§ 6.1).

The root kind is **fixed** by the first content line. Subsequent
lines are dispatched per § 5.1 according to the chosen kind:

- Inside a top-level **Array**, every non-blank, non-comment line is
  an array-item line (§ 5.4). A line that looks like a pair (e.g.
  `host: localhost`) is just a bare scalar String per § 5.4 rule 9;
  there is no implicit re-classification back to a pair. Use the raw
  marker form to make a colon-bearing scalar unambiguous.
- Inside a top-level **Object**, every line is a pair line (§ 5.3).
  A bare scalar without `:` is a `MissingSeparator` error.

Note (vs. 0.1.1): rules 4 and 5 differ from earlier versions. In
0.1.1, a lone `{` or `[` as the first content line opened a single
Object / Array item inside a root-level Array. In 0.5.0+, the lone
opener is the root itself: a single multi-line Object / Array
spanning the document, with no enclosing Array. The JSONL-style
form (multiple top-level inline objects `{a:1}` followed by `{b:2}`
producing a root Array) is no longer accepted.

