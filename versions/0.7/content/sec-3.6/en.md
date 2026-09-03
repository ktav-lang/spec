
An **integer literal** matches the following grammar (where `*` is
zero-or-more, `+` is one-or-more, `?` is optional, `|` is alternation):

```
integer        ::= sign? ( hex | oct | bin | dec )
sign           ::= "+" | "-"
hex            ::= "0x" hex_digit (("_")? hex_digit)*
oct            ::= "0o" oct_digit (("_")? oct_digit)*
bin            ::= "0b" bin_digit (("_")? bin_digit)*
dec            ::= dec_digit (("_")? dec_digit)*
hex_digit      ::= [0-9a-fA-F]
oct_digit      ::= [0-7]
bin_digit      ::= [0-1]
dec_digit      ::= [0-9]
```

Underscore separators are allowed **between** two consecutive digits.
A leading underscore, a trailing underscore, two consecutive
underscores, or an underscore directly after the base prefix
(`0x_`, `0o_`, `0b_`) make the literal **not** an integer; the textual
form falls through to String per § 5.2.

A **float literal** matches one of the following two alternatives:

```
float          ::= sign? dec_part "." dec_part exponent?
                 | sign? dec_part exponent
dec_part       ::= dec_digit (("_")? dec_digit)*
exponent       ::= ("e" | "E") sign? dec_part
```

The first alternative requires both a decimal point and digits on
each side of the point (an exponent is optional). The second
alternative requires an exponent (no decimal point). A pure run of
digits with no `.` and no exponent is an integer (above), not a float.
Forms like `1.`, `.5`, `1.2.3`, `1e`, `1e+` do not match either
alternative and fall through to String.

