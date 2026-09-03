
```
color: 0xFFEE00
permissions: 0o755
mask: 0b1111_0000
million: 1_000_000
ratio: 0.5
sci: 1.5e-3
big: 99999999999999999999
literal_hex:: 0xFF
```

`color` is `Integer(16772608)` (0xFFEE00 decimal),
`permissions` is `Integer(493)` (0o755 decimal),
`mask` is `Integer(240)` (0b11110000 decimal),
`million` is `Integer(1000000)`, `ratio` is `Float(0.5)`,
`sci` is `Float(1.5e-3)`, `big` is
`String("99999999999999999999")` (overflows i64),
`literal_hex` is `String("0xFF")` (raw marker).

The canonical writer (§ 5.9.8) emits each Integer in base-10
decimal (e.g. `color: 16772608`) and each Float in canonical
notation (e.g. `sci: 1.5e-3`). The hex / octal / binary / underscored
input forms are accepted by the parser but never emitted by the
canonical writer.

