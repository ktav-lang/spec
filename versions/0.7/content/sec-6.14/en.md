
A non-blank, non-comment line that appears after a top-level inline
compound (§ 5.0.1 rules 2–3) or after the matching close line of a
lone-`{` / lone-`[` root opener (§ 5.0.1 rules 4–5) — where the
root Value has already been fully constructed — is an
`OrphanLineAfterTopLevelInline` error.

The category is distinct from `MissingSeparator` (§ 6.6) because no
further content is permitted at all, regardless of whether the
trailing line would otherwise parse as a pair, an item, or a bare
scalar. The error span SHOULD point at the offending line.

Rationale: the root kind is fixed by the first content line, and a
top-level inline root has its entire Value on that single line.
Allowing further content would either silently extend the root
(ambiguous, no clean rule for how) or change the root kind
retroactively (forbidden by § 5.0.1). The error gives a precise
explanation for documents that mistakenly continue past the root.

