
An array-item line introduces one Value inside the innermost open
Array (or the top-level Array, § 5.0.1). The forms are:

1. **Raw-marker item** — `:: literal` — the body after `::` is a
   literal String (no type inference). `<sep-end>` rules apply
   (whitespace or EOL after `::` is required; glued forms are a
   `MissingSeparatorSpace` error).
2. **Closed-inline-object item** — `{ key: value, … }` on one line.
3. **Closed-inline-array item** — `[ v, v, … ]` on one line.
4. **Empty-inline-object item** — `{}`.
5. **Empty-inline-array item** — `[]`.
6. **Open compound** — a line whose trimmed content is `{`, `[`,
   `(`, or `((` (multi-line opener); pushes a new compound scope
   onto the parser stack.
7. **Empty-multiline-string item** — `()` or `(())`.
8. **Other item-value** — any non-marker body, dispatched through
   § 5.2 to produce the appropriate Value (keyword, number, or
   String).
9. **Bare-scalar item** — falls through rule 8 with a String result
   if no number / keyword form matched.

