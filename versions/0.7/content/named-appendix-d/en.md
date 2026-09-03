
The Rust reference implementation's actual parsing behaviour is
**unaffected** by the § 3.3 / § 4 whitespace change — it already
trimmed the full 25-code-point set in every 0.6.x release, so a
document that round-tripped correctly under 0.6.x round-trips
identically under 0.7.0. Only implementations that followed the old
§ 4 text literally (ASCII-only key trimming) rather than matching the
Rust core's actual behaviour need to change.

Two breaking changes apply to every implementation, Rust included:

1. **`(…)` multi-line strings no longer preserve trailing whitespace
   (§ 3.3 — any of the 25 code points, not just space/tab) on each
   content line.** If a document relies on trailing whitespace inside
   a `(…)` block being preserved verbatim, switch that block to
   `((…))`, which keeps both edges byte-for-byte in both 0.6.x and
   0.7.0.
2. **A key segment's leading, unescaped `"`, `'`, or `` ` `` now opens
   a quoted segment (§ 5.3.3, § 10.7) instead of being ordinary key
   content.** In 0.6.x, an Object pair whose key began with one of
   these three characters kept that character as literal key text —
   e.g. `"port": 1` named the key `"port"`, quotes included. In
   0.7.0, the same line either names the shorter key `port` (if a
   matching closing quote character is also present before the pair
   separator) or, if there is no matching closer, either raises
   `UnterminatedQuotedKey` (§ 6.16, when the root is already known to
   be an Object) or falls through to a root-level Array String item
   (§ 5.3.3 gives the exact, context-dependent rule). **To keep a
   0.6.x document's old meaning**, escape that leading quote
   character — `\"`, `\'`, `` \` ``, or `\uXXXX` — so it reads as
   ordinary bare key content rather than a quoted-segment opener. The
   `::` raw-marker form (§ 5.4 rule 1) remains the explicit way to
   force a root-level Array item to be read as a literal String when
   it deliberately starts with a matched pair of quote characters
   around a colon (e.g. `:: 'tis the season: fa`), unaffected by this
   quoted-segment scan.

Additionally, `\uXXXX` is a new, purely additive escape (§ 3.7.1) —
no existing document's meaning changes because of it.
