
0.6.0's key-escaping design (§ 3.7, § 4) made every key representable,
but a key needing several structural bytes escaped — `service\:
abc`, `a\.b\.c\:d` — reads worse exactly where escaping is needed
most: the backslashes sit inline with nothing marking where the key
starts or ends. Quoted keys (§ 5.3.3) are sugar over the same escape
mechanism, not a replacement for it: any quoted key already had a
bare, escaped spelling that produces the identical Value (§ 5.5); a
document using no quote characters at all parses exactly as before.

Three delimiters, not the one or two most formats offer, because
self-escaping (a segment's own delimiter needs `\"` / `\'` / `` \` ``
to appear literally inside it; the two OTHER quote characters need no
escape at all, § 3.7) means the choice of delimiter is a convenience
for a human AUTHOR writing input by hand, not a representational
limit: an author whose key contains `"` may simply write it with `'`
or `` ` `` instead, needing zero escapes for it. This choice belongs
to the author, not to the canonical writer: § 5.9.10 (see also below)
fixes the canonical delimiter at `"` unconditionally, regardless of
content, so a writer-conforming implementation never has — or
exercises — this choice. A design offering only `"` (JSON5's key
quoting) would force
a choice between escaping the delimiter or accepting the smaller
"needs no escape" set; three delimiters make "pick one the content
doesn't contain" available for any content using at most two of the
three quote characters, without adding a second escape mechanism —
self-escape is the SAME `<key-escape>` rule bare segments already
use, just with three more named forms in the same table (§ 10.4).

Quoting is per-segment (§ 5.3.3), not whole-key: `a."b.c".d: 1` and
`"a.b.c.d": 1` (a single, longer, fully quoted key) are different
Values (three segments vs. one), matching how a dotted path already
means three distinct nested pairs — quoting one segment does not
collapse the path any more than escaping one segment's dot would.
This mirrors TOML's dotted-key quoting rather than treating a leading
quote character as quoting the rest of the line: the latter would
make `a."b.c".d` silently reparse as the bare four-segment path
`a`, `"b`, `c"`, `d` for anyone expecting the former — a worse
failure mode than a clean parse error, since it silently misparses
rather than rejecting; contrast the explicit `InvalidKey` (§ 6.4)
that a genuinely malformed key like `"a"b: 1` (content after a
quoted segment's closing delimiter that is neither `.` nor the pair
separator) already produces.

The canonical writer (§ 5.9.10) prefers quoted form the moment a
STRUCTURAL escape (or an edge-whitespace hazard) would otherwise be
needed, or the key's first segment begins with `##` (a routing rule
with no escape trade-off at all — see § 5.9.10 rule (d)), rather
than leaving bare-with-escape as an equally valid canonical choice
for the escape-driven cases: a determinism requirement (§ 5.9)
means the writer has no discretion either way, so the rule may as
well pick the more readable of the two — which was the entire
motivation for the feature. An escape quoting cannot remove — a
literal backslash, LF, CR, a control byte, or DEL — does not switch
the form, since paying for two delimiter characters would buy
nothing there. The one fixed delimiter (`"`) keeps the
rule content-independent: nothing here weighs which of the three
quote characters would need fewer escapes for a given key, since
self-escaping makes that comparison unnecessary for correctness and
the format already favours simple, uniform rules over marginally
shorter output (§ 10.4).

