
A pair `a.b.c: v` is semantically equivalent to a nested chain of
single-segment pairs: `a:` opens an Object containing `b:` opens an
Object containing `c: v`. Each intermediate name MUST resolve to an
Object. This equivalence is exact and applies regardless of how many
other pairs — dotted or plain — appear between two pairs that share a
dotted prefix: `a.b: 1` / `c: 2` / `a.d: 3` is exactly equivalent to
writing `a: {b: 1}` / `c: 2` / `a: {d: 3}` with the two `a` blocks
merged into one, in the order of `a`'s first appearance —
`{a: {b: 1, d: 3}, c: 2}`. An intervening sibling pair (`c: 2` above)
does not close the synthetic Object or invalidate a later pair that
reopens it.

Two directions of conflict both resolve to `KeyPathConflict` (§ 6.3),
because both amount to the same thing — a name being an Object in one
place and a leaf in another:

- A dotted-key pair whose path passes through a name that already
  holds a non-Object leaf Value — set either by an earlier plain pair
  (`a: 1` then `a.b: 2`) or by an earlier dotted pair that reached a
  conflicting depth — errors, since the dotted form needs that name
  to be an Object.
- Symmetrically, a plain (non-dotted) pair whose key names an Object
  already established by an earlier dotted-key pair (`a.b: 1` then
  `a: 2`) also errors: a plain pair always assigns its value directly
  as a leaf, and an Object cannot be silently overwritten by one.

The reverse of both is unrestricted and not a conflict: a dotted-key
pair extending into an Object that already exists — whether that
Object was itself created by an earlier dotted-key pair, or written
explicitly as `a: {...}` or `a: {}` — merges into it. `a: {x: 1}`
followed later by `a.y: 2` produces `{a: {x: 1, y: 2}}`, the same as
if `a.y: 2` had appeared adjacent to `a`'s own block; an explicit
Object is not "closed" against later dotted-key extension any more
than a synthetic one is.

Dotted keys are expanded the same way inside inline objects
(§ 5.8): `{a.b: 1, a.c: 2}` produces `{a: {b: 1, c: 2}}`.

