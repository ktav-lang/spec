
§ 3.1 requires a conformant reader to strip exactly one leading
U+FEFF — decoded from the raw 3-byte UTF-8 sequence `EF BB BF` — if
and only if it is the very first code point of the entire document,
and requires the canonical writer to never emit a leading
byte-order mark. These two rules interact badly with ordinary
content: if the writer ever placed the raw 3-byte encoding of
U+FEFF at byte offset 0 of otherwise-ordinary output, a conformant
reader would strip it as a metadata BOM per § 3.1, silently losing
that code point on re-parse — a canonicalisation that would not be
idempotent or round-trip-safe. This can only happen at two
positions; nowhere else in canonical output can a Value's own
content reach byte offset 0, since every other position is preceded
by at least one byte of surrounding structure (a parent key, a
separator, a line terminator, indentation, a compound opener, or an
array-item marker).

- **Root Object, first-serialized key.** If the root is a non-empty
  Object and the first segment of its first-serialized key's decoded
  content begins with U+FEFF, § 5.9.10's form-selection rule forces
  quoted form for that segment (rule (c)). The segment is then
  written `"…"`, so byte offset 0 of the document is `"` (`0x22`),
  never the raw encoding of U+FEFF; the U+FEFF itself appears later
  in the byte stream, as ordinary quoted content, and needs no
  escape of its own (§ 5.3.3 permits U+FEFF raw inside a
  `<quoted-segment>` — it is neither a control byte nor DEL).
- **Root Array, first item.** If the root is a non-empty Array and
  its first item is a String whose canonical form would otherwise be
  the bare, one-line form of § 5.9.7 with content beginning with
  U+FEFF, the writer MUST instead use the raw-marker form
  (`:: <body>`, § 5.9.6) for that one item, even though § 5.9.7's
  ordinary bare-form conditions are otherwise satisfied. The
  raw-marker's own two bytes (`::`) occupy byte offset 0, so the
  item's content — including the leading U+FEFF, carried through
  unescaped since the raw-marker form applies no escape processing
  (§ 5.4 rule 1: "literal String, no type inference") — begins only
  after `:: `, never at byte offset 0.

Both cases are narrow, form-selection overrides: they change which
of two already-normative forms the writer must pick for the one
position (the root's first-serialized key, or its first item) whose
content the format ever places at byte offset 0. They do not add a
new non-representability case to § 5.9.0 — a key or first-item
String beginning with U+FEFF remains representable — and they do
not apply to any other key or item position, since no other
position's content can ever reach byte offset 0 of the document.

