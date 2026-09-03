
Let *body* be the byte sequence of a String Value.

- **Empty String (`""`):** emit as `key:` (no body after the
  colon) for a pair, or `::` (no body) for an array item.
- **One-line printable, no edge-whitespace, no numeric/keyword
  collision:** emit as `key: <body>` (pair) or `<body>` (item).
- **One-line, but matches the integer or float literal grammar of
  § 3.6 (regardless of whether the value fits the writer's own
  numeric domain — § 5) or is exactly `null` / `true` / `false`:**
  emit as `key:: <body>` (pair) or `:: <body>` (item), using the
  raw marker.
- **Contains `LF`, leading/trailing whitespace, or any control byte
  (`0x00`–`0x1F` other than `0x09` `TAB` and `0x0A` `LF`, and not
  `0x0D` `CR`, which the next bullet handles separately):** emit
  as verbatim multi-line `((` … `))`. The opener `((` is emitted
  on the value line (preceded by `key: ` for a pair, or alone for
  an item) at the current indent. The body is split on `LF`; each
  resulting segment is emitted as one line at **indent 0** (no
  leading whitespace — because verbatim form preserves bytes
  exactly, any indentation would be injected into the value). The
  closer `))` is emitted on its own line at the current indent.
- **Contains a `CR` byte (`0x0D`):** the Value is **not
  representable** in canonical form. A `CR` byte in a String can
  only be produced through the `\r` escape or the generic `\uXXXX`
  escape naming code point 000D, inside an inline compound
  (§ 3.7, § 3.7.1), and canonical form never emits inline
  compounds for non-empty scalars. A writer-conforming
  implementation MUST reject such a Value with an error rather
  than serialise it; it is outside the scope of the round-trip
  property of § 8.3. Portable documents SHOULD NOT rely on `CR`
  bytes in String values.

The canonical writer prefers verbatim multi-line form `((` … `))`
for strings requiring multi-line representation. If any segment of
the body (after splitting on `LF`), when trimmed of leading and
trailing whitespace (§ 3.3), is exactly `))` — matching § 5.6.1's
parser-side closer trigger, which trims a content line before
comparing it to `))` — verbatim form is impossible: the segment
would be misread as the closer regardless of any leading or
trailing whitespace of its own (e.g. a segment `"  ))"` collides
just as much as a bare `"))"`). In that case the canonical writer
MUST switch to stripped form `(` … `)` with no leading indent (the
writer emits body segments at indent 0 so the common-indent
computation yields zero). The closing `)` line is then at the
outer indent.

(Rationale: stripped form's `)` closer leaves `))` available as
content, which is the only way to represent that byte sequence in
a multi-line value — provided no segment also collides with the
`)` closer; see below.)

A String whose body would require both forms — containing a
segment that trims to exactly `))` (forcing the stripped-form
fallback above) AND a segment that trims to exactly `)` (which
would then collide with the stripped-form closer) — is not
representable in the canonical multi-line form. A writer-conforming
implementation MUST reject such a Value with an error rather than
serialise it; it is outside the scope of the round-trip property of
§ 8.3. Portable documents SHOULD NOT rely on such content.

As of 0.7.0, a body containing a segment that trims to exactly
`))` (forcing the stripped-form fallback above) that ALSO has
trailing whitespace (§ 3.3) on any content line is likewise not
representable: the stripped form now strips that trailing
whitespace on emission, so the fallback would silently lose it. A
writer-conforming implementation MUST reject such a Value with an
error rather than serialise it, exactly as for the
both-forms-required case above. Portable documents SHOULD NOT rely
on trailing whitespace inside a multi-line String body that also
requires a segment trimming to `))`.

Independently of the trailing-whitespace case above, a body forced
into stripped form (via a segment trimming to exactly `))`) where
every non-blank segment shares at least one leading whitespace code
point in the same position is likewise not representable: on
re-parse, § 5.6's minimum-leading-whitespace computation cannot
distinguish that shared leading whitespace from writer-added
structural indentation, and would strip it. This ambiguity in the
stripped form's parsing rule predates 0.7.0 — it is documented here
for the first time, alongside the other non-representable cases
this form already has. A writer-conforming implementation MUST
reject such a Value with an error rather than serialise it, exactly
as for the other cases above. Portable documents SHOULD NOT rely on
shared leading whitespace inside a multi-line String body that also
requires a segment trimming to `))`.

