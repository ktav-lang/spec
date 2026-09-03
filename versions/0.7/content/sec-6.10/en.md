
In a multi-line pair line, the separator `:` / `::` MUST be followed
by at least one whitespace code point or end-of-line. A glued form
(`key:value` / `key::value`) is a `MissingSeparatorSpace` error.

Inline-compound pairs (§ 5.8) do NOT require whitespace after the
separator and so do NOT raise this error.

