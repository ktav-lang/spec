
A multi-line string is opened by a value-start of `(` (stripped form)
or `((` (verbatim form) on a line that contains no other content
after the opener and its optional trailing whitespace. The closer is
a line whose trimmed content is exactly `)` (for stripped) or `))`
(for verbatim).

- **Stripped form (`( … )`)**: the parser computes the **common
  leading whitespace** across non-blank content lines — the longest
  prefix, measured in whitespace code points (§ 3.3) rather than
  bytes, that is identical code-point-for-code-point across every
  non-blank line's own leading run (a line starting with a tab and a
  line starting with a space share no common prefix at all, even
  though both begin with *some* whitespace code point, because the
  code points themselves differ at position 0) — and removes that
  shared prefix from each line, then removes trailing whitespace
  (§ 3.3) from each line. The lines are then joined by single `\n`
  bytes. Blank lines inside the block contribute empty strings to the
  joined result. A blank line containing only whitespace code points
  (per § 3.5) does NOT participate in the common-indent computation;
  it contributes an empty content line to the joined result.

  Prior to 0.7, trailing whitespace on each line was preserved
  verbatim, identically to the verbatim form below — this made an
  editor's "trim trailing whitespace on save" silently mutate string
  content with no visible signal. As of 0.7, the stripped form's name
  matches its behaviour on both edges of each line.
- **Verbatim form (`(( … ))`)**: every line between the opener and the
  closer — including a blank line and a whitespace-only line — is a
  content line. The parser joins them byte-for-byte with single `\n`
  bytes; no whitespace stripping — leading or trailing — is performed on
  any line, and no line is dropped as having "no effect" the way an
  ordinary blank line elsewhere in the document does (§ 5.1 rule 1):
  inside a verbatim block, a blank line contributes an empty string to
  the joined result, exactly as it already does for the stripped form.

A multi-line string body MUST NOT cross another compound boundary:
the opener line and closer line are unambiguously paired by the
LIFO parser stack.

