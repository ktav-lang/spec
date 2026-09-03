
- **Breaking:** Keys now process escape sequences (§ 3.7). The
  backslash byte `\` is the escape lead in keys; `\.` produces a
  literal dot (not a path separator); `\:` produces a literal colon
  (not a pair separator); `\\` produces a literal backslash. A
  literal backslash in a key that was bare in 0.5.0 now requires
  `\\`. Two new escape sequences (`\.`, `\:`) are added to the
  § 3.7 table (now ten total).
- **Breaking:** The `<key>` / `<segment>` / `<key-char>` grammar
  productions (§ 4) are now escape-aware. The dotted-path separator
  splits only on **unescaped** `.`; the pair separator is the first
  **unescaped** `:` / `::`. Backslash and dot are excluded from
  `<key-char>` and handled via `<key-escape>`.
- **Changed:** § 3.7 escape-sequence list extended from eight to ten
  entries: `\\`, `\,`, `\}`, `\]`, `\{`, `\[`, `\n`, `\r`, `\.`,
  `\:`. The `\.` and `\:` forms are no longer `BadEscapeSequence`.
- **Changed:** "Keys" removed from the "escape sequences are NOT
  processed in" list (§ 3.7). Keys now DO process escapes — same
  set as inline scalars.
- **Changed:** § 5.9.10 (canonical key emission) — the writer MUST
  re-escape `\`, `.`, and `:` inside a key segment so that the
  output round-trips.
- **Changed:** § 6.13 `BadEscapeSequence` — updated to list ten
  valid escape characters (added `.` and `:`).

