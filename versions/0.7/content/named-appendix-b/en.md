
Three breaking changes must be addressed when migrating a 0.1.x
document to 0.5.0:

1. **Typed markers removed.** Replace `:i 42` / `:f 3.14` with
   bare `42` / `3.14`. To keep the literal as a String, write
   `:: 42`.
2. **Comments use `##`.** Replace `# comment` lines with
   `## comment`. A single `#` byte at line start has no special
   meaning in 0.5.0 and would be parsed as part of a content
   line.
3. **Bare numbers are typed.** `port: 8080` produces
   `Integer(8080)` in 0.5.0, not `String("8080")`. If a consumer
   expects the value as a String, change the source to
   `port:: 8080`.

A fourth, narrower change applies only to documents that exploited
the 0.1.1 lone-`{` / lone-`[` root-Array shape:

4. **Lone `{` / `[` on the first content line is now the root,
   not a single Array item.** In 0.1.1 a document beginning with
   a lone `{` produced a root Array containing one Object; in
   0.5.0 the lone `{` opens the root Object directly. JSONL-style
   documents (multiple top-level objects on consecutive lines)
   are no longer accepted. Wrap them in an explicit `[` / `]`
   array.

A document using only quoted-style values, explicit String form
(`key:: value`), and explicit array brackets is broadly compatible
across both versions.

