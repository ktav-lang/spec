
The format is intentionally permissive on input — comments, inline
compounds, numeric literals in multiple bases, underscores, mixed
escape styles — but **strict on output**. A single canonical
serialisation (§ 5.9) is defined for every **representable** Value.

This separation lets humans write Ktav in the form most natural
to them (compact inline, explicit multi-line, comments, mixed
bases) while machines exchange a deterministic byte sequence.
Byte-deterministic output also makes Ktav useful as a target for
generated configuration: any two writer-conforming implementations
operating on the same Value produce the same bytes, so diffs over
generated files are stable.

The conformance suite tests both directions: input variety via
`name.ktav` fixtures (reader-side), output determinism via
`name.canonical.ktav` fixtures (writer-side), and equivalence to
`name.json` oracles (Value model).

