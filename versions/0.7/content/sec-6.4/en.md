
A key segment containing a forbidden character is an `InvalidKey`
error. This also covers a quoted segment (§ 5.3.3) that closes
correctly but is followed — before the next `<unescaped-dot>` or the
pair separator — by anything other than whitespace (`"a"b: 1`), and
a raw control byte or DEL occurring unescaped inside a quoted
segment (§ 4's `<dq-char>` / `<sq-char>` / `<bt-char>` exclusions,
same prohibition as in a bare segment).

