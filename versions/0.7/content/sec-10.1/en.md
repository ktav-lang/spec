
In versions 0.1.x through 0.3.x, the only way to obtain an Integer
or Float Value was to write the typed markers `key:i 5` /
`key:f 0.5`. The plain pair-form `key: 5` produced a String. The
markers were syntactically unique to Ktav, easy to forget, and
duplicated information the lexer already had (a string of digits
**is** a number).

0.5.0 removes the markers and infers numeric / keyword Values from
the lexical form of the scalar body. The raw marker `::` is kept as
the explicit "force String" override.

This is a strict-break change: documents written with `:i` / `:f`
in older versions parse differently in 0.5.0 (the `:i` / `:f` text
becomes part of the value or yields a `MissingSeparator` /
`MissingSeparatorSpace` error depending on whitespace). No
auto-migration is provided.

