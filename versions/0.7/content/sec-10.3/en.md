
Single `#` was reserved as the comment marker through 0.4.x.
However, `#` is a very common character in real-world configuration
values (hashtags, fragment identifiers, hex colors, password
separators, …). 0.5.0 doubles the marker to `##` and frees the
single `#` for use as an ordinary character.

Because the comment marker is recognised only at the start of a
trimmed line (§ 3.4), the literal two-byte sequence `##` in the
middle of a value or key is unambiguously two `#` characters — no
escape sequence is needed or defined. The 0.4.x-era `#\#` escape
is gone with the rest of the single-`#` machinery; the design now
relies purely on positional disambiguation (line-start only) rather
than on an in-value escape.

