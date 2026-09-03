
- **Object value (non-empty):** `key: {` followed by a newline,
  followed by each pair on its own line at indent level + 1,
  followed by a closing `}` on its own line at the current indent
  level.
- **Array value (non-empty):** `key: [` followed by a newline,
  followed by each item on its own line at indent level + 1,
  followed by a closing `]` on its own line at the current indent
  level.
- **Empty Object value:** `key: {}` on a single line.
- **Empty Array value:** `key: []` on a single line.
- Inline compounds (other than empty `{}` / `[]`) are NEVER
  emitted in canonical form. Inline compounds in the input are
  valid syntactic sugar; the canonical form is always multi-line.

