
- Lines terminated by `LF` (`0x0A`) only — never `CR` or `CR LF`.
  No `CR` byte ever appears in canonical output.
- Indentation is exactly four ASCII spaces per nesting level
  (no tabs, no two-space indent).
- The document ends with a single trailing `LF`, except an empty
  document (root is an empty Object with no pairs), which emits
  zero bytes.

