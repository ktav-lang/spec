
A key segment is emitted after escape processing and the trimming
rule of § 4. Internal whitespace is preserved. Dotted keys are NOT
re-expanded: a Value parsed from `a.b.c: 1` is indistinguishable
in the Value model from one parsed from `a: { b: { c: 1 } }`, and
the canonical writer chooses the explicit nested form (not the
dotted form).

A key segment is emitted in one of two forms — **bare** or
**quoted** (§ 5.3.3) — decided by one rule: emit **bare** (the
re-escape recipe below) unless (a) bare form would require escaping
at least one byte that a `<quoted-segment>` (§ 4) admits as literal,
unescaped content — the structural bytes `.`, `:`, `,`, `{`, `}`,
`[`, `]` (bullet 1 below, excluding `\`, LF, and CR), or `(` / `)` (part of
bullet 2 below, since neither opens a multi-line string at a
key-segment position) — or an edge-whitespace escape (bullet 3
below); or (b) the segment's decoded content begins with `"`, `'`,
or `` ` `` (a leading quote character in bare form would be misread
as opening a `<quoted-segment>` on re-parse, so it always forces
quoted form even though nothing else in the segment needs escaping);
or (c) this segment is the first segment of the root Object's
first-serialized key (§ 5.9.3) and its decoded content begins with
U+FEFF — bare form would then place the raw 3-byte UTF-8 encoding of
U+FEFF at byte offset 0 of the entire document, indistinguishable
from the metadata byte-order mark that § 3.1 requires a conformant
reader to strip before any key is even recognised, silently losing
the code point on re-parse; quoted form's opening `"` occupies byte
offset 0 instead, so the U+FEFF is never mistaken for a BOM and
needs no escape of its own once quoting moves it off that position
(§ 5.9.12 states this guard generally, alongside the analogous
Array-root-first-item case); or (d) this segment is the key's first
segment and its decoded content begins with the two-byte sequence
`##` — this is not an escaping requirement at all, unlike (a)–(c):
no bare-form escape changes the RAW first two bytes § 5.1 rule 2
inspects on re-read, so no amount of escaping elsewhere in the
segment prevents a raw `##`-prefixed bare line from being dispatched
as a comment; quoted form's opening `"` is the only way to avoid
that collision, since it is the only form whose first byte is never
`#`. A need to escape
a literal backslash, LF, CR, a control byte, or DEL — bullet 1's
`\\`/`\n`/`\r` entries and the control-byte/DEL part of bullet 2 —
does NOT by itself trigger quoted form: a `<quoted-segment>` excludes
and escapes each of these exactly as a `<bare-segment>` does
(§ 4's `<dq-char>` / `<sq-char>` / `<bt-char>`, § 5.3.3), so quoting
buys nothing for them, and bare remains the simpler, equally-escaped
choice. Otherwise (quoted form selected) the delimiter is `"` unconditionally
— the choice of delimiter is fixed, not content-dependent, so the
writer never needs to scan the content against all three candidates
first. Either form parses back to the same key (§ 5.3.3), but which
one the writer emits is not a free choice: it is fully determined by
this rule, with no discretion left once the content is known (§ 5.9's
determinism requirement).

When bare form is selected, the writer MUST re-escape every code
point that `<key-char>` (§ 4) excludes from raw content, plus any
§ 3.3 whitespace code point at the segment's first or last position
(which § 4's trimming rule would otherwise remove on re-parse):

- Bytes with a named escape (§ 3.7) use it: `\` → `\\`, `.` → `\.`,
  `:` → `\:`, `,` → `\,`, `{` → `\{`, `}` → `\}`, `[` → `\[`,
  `]` → `\]`, LF → `\n`, CR → `\r`.
- Everything else `<key-char>` excludes — `(`, `)`, DEL (`0x7F`),
  and any control byte below `0x20` that is not a § 3.3 whitespace
  member — has no named escape and MUST be emitted as `\uXXXX`
  (§ 3.7.1).
- A § 3.3 whitespace code point at the first or last position of
  the segment MUST likewise be escaped rather than emitted
  literally, even though § 4 otherwise permits whitespace as
  ordinary interior key content: left unescaped, it would be
  silently trimmed away on re-parse, changing the key. Use the
  named form when one exists (LF and CR per bullet 1 above) and
  `\uXXXX` otherwise — either form is immune to § 4's raw-byte
  trimming, since the trimmed text is the escape's own ASCII
  spelling (`\`, then a letter or four hex digits), never the
  whitespace byte itself. Interior whitespace needs no escaping.

A canonical writer never actually reaches this recipe for a
`##`-prefixed key's first segment: form-selection rule (d) above
already routes it to quoted form before bare form is even
considered, because no escape within bullets 1-3 changes the raw
first two bytes of the emitted line. \u0023#a\:b (escaping
only the leading `#`, per the original bare-form recipe this
replaces) remains a valid, decodable, non-canonical INPUT spelling
for the key `##a:b` -- a parser MUST still accept it -- but it is
never the canonical OUTPUT: the canonical form of any key whose
content begins with `##` is always quoted, `"##a:b"`, per (d), not
\u0023#a\:b.

When quoted form is selected, the writer emits the segment's decoded
content between two `"` characters, escaping only:

- a raw `"` in the content, as `\"` — the only byte structural
  inside a quoted segment, since `"` is the fixed delimiter;
- `\` (backslash), as `\\` — backslash is always the escape lead,
  in both forms;
- LF / CR, as `\n` / `\r` — a key MUST remain single-line;
- any other control byte below `0x20` that is not a § 3.3
  whitespace member, or DEL, as `\uXXXX` — quoting relaxes which
  STRUCTURAL bytes need escaping, not the format's separate
  prohibition on raw invisible, non-whitespace bytes in a key
  (§ 5.3.3). A control byte that IS a § 3.3 whitespace member (tab,
  VT, FF) is excluded from this bullet for the same reason it is
  excluded from bare form's analogous bullet above: § 4's
  `<dq-char>` / `<sq-char>` / `<bt-char>` already admit it raw, so
  it needs no `\uXXXX` escape here, whether it occurs at an edge or
  in the interior of the segment (see the edge-whitespace point
  below, which is not limited to non-control whitespace).

`.`, `:`, `,`, `{`, `}`, `[`, `]`, `(`, `)`, `'`, and `` ` `` need no
escaping in quoted form, and neither does edge whitespace: a
`<quoted-segment>`'s content is never trimmed on re-parse (§ 5.3.3),
so bare form's bullet above — escaping edge whitespace to survive
re-parse trimming — has nothing to guard against here. A leading
`##` likewise needs no escaping of its own in quoted form: the line
begins with `"`, not `#`, so § 5.1 rule 2's comment hazard never
arises for a quoted key in the first place.

This ensures that the canonical output round-trips in either form:
unescaped dots in a canonical bare key are path separators only,
structural bytes never appear raw outside a quoted segment's
delimiters, no edge whitespace is lost to re-parse trimming, and a
quoted segment's own delimiter never appears raw inside it. A key
segment containing a literal `.` or `:` — a structural byte needing
escape in bare form — is therefore always emitted quoted instead,
per the form-selection rule above; a key segment containing only a
literal `\`, LF, CR, a control byte, or DEL is NOT — bare form
escapes those identically and quoting would not remove the escape.

Examples: the key `a.b` (a literal dot) is emitted as `"a.b"` (not
`a\.b` — quoting is preferred once any STRUCTURAL escape would
otherwise be needed); the key `a:b` is emitted as `"a:b"`; the key
`hello` (no escape needed, does not begin with a quote character) is
emitted bare, unchanged; the key `path\to` (a literal backslash, no
structural byte) is emitted bare as `path\\to`, unchanged from
before this addition — quoting it (`"path\\to"`) would need the
identical `\\` escape for no benefit; the key `"port"` (six
characters: a leading and a trailing `"`) is emitted as `"\"port\""`
(quoted is forced by the leading `"` alone, even though the interior
needs only the one escape for the delimiter's own two occurrences);
the key U+FEFF followed by `host` (five code points), when it is the
root Object's first-serialized key, is emitted as `"` immediately
followed by a raw U+FEFF and then `host"` (quoted by rule (c) above;
the U+FEFF itself is emitted raw, needing no escape, since quoting
alone already moves it off byte offset 0) —
but the identical five-code-point key at any OTHER pair position
(not the document's first-serialized key) is emitted bare and
unchanged, since only the root's first-serialized key's first
segment can ever land at byte offset 0 (§ 5.9.12).

