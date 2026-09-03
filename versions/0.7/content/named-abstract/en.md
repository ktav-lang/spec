
Ktav is a plain-text configuration format designed so that every line
either stands on its own or depends only on explicit, visible brackets.
It offers JSON-shape (scalars, arrays, objects, `null`, booleans) with
none of JSON's punctuation: no quotes around strings, no escape
sequences in the common case. Nested keys use a dotted path.
Multi-line strings and inline compounds use small, visible opt-in
markers.

This document specifies the syntax and semantics of the format at
version 0.7.0. Implementations in any programming language may claim
"Ktav 0.7.0 compliance" iff they satisfy every normative statement
below.

0.7.0: § 3.3 whitespace changes from an implementation-defined `MAY`
to a fixed, exhaustively-enumerated 25-code-point `MUST` (§ 3.3);
§ 4's key-segment trimming widens from ASCII-only to the same fixed
set, resolving a standing internal contradiction; adds the `\uXXXX`
escape (§ 3.7.1) and quoted keys (§ 5.3.3, delimiters `"` / `'` /
`` ` ``); the `(…)` multi-line string form now also strips
trailing whitespace from every content line — `(…)` already removed
each line's shared leading indent (§ 5.6). Three independently-scoped
breaking changes: value/key-edge trimming now covers the 19 non-ASCII
code points in the § 3.3 set in addition to space/tab — non-breaking
in practice against every 0.6.x Rust-core release, which already
trimmed the full set there; the `(…)` trailing-edge strip is
breaking even for the Rust core, which previously preserved
trailing whitespace (including plain ASCII space/tab) on every line
of a stripped-form block; and a line whose first content begins with
an unescaped `"`, `'`, or `` ` `` no longer necessarily parses as
before — the quote character now opens a quoted segment there instead
of being ordinary content, so e.g. an Object pair `"port": 1` now
names the key `port`, not `"port"` (§ 5.3.3, § 10.7, Appendix D).

