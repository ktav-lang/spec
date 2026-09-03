
The parser MUST classify each line after trimming, applying rules in
this exact order:

1. If the trimmed line is empty → blank line; no effect except where
   stated (§ 5.6, multiline).
2. If the trimmed line begins with `##` → comment; ignored (§ 3.4),
   except where stated (§ 5.6, multiline) — `##` is ordinary content
   inside an open multi-line string, not a comment marker.
3. **If the parser is inside an open multi-line string** (§ 5.6): if
   the trimmed line equals the block's terminator, the multi-line
   string is closed; otherwise the raw (untrimmed) line is added to
   the content of the multi-line string.
4. If this is the document's first content line, the root kind is
   set as in § 5.0.1; processing then proceeds with the same line
   under the chosen-kind dispatch (rules 5–8).
5. If the trimmed line is exactly `}` → close the innermost open
   Object, otherwise error (§ 6.1).
6. If the trimmed line is exactly `]` → close the innermost open
   Array, otherwise error (§ 6.1).
7. If the innermost open compound is an Array, or there is no open
   compound and the root is an Array (§ 5.0.1): treat the line as
   an **array-item line** (§ 5.4).
8. If the innermost open compound is an Object, or there is no open
   compound and the root is an Object (§ 5.0.1): treat the line as
   a **pair line** (§ 5.3).

