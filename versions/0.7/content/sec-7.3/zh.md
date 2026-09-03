
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

`color` 是 `Integer(16772608)`(0xFFEE00 的十进制),
`permissions` 是 `Integer(493)`(0o755 的十进制),
`mask` 是 `Integer(240)`(0b11110000 的十进制),
`million` 是 `Integer(1000000)`,`ratio` 是 `Float(0.5)`,
`sci` 是 `Float(1.5e-3)`,`big` 是
`String("99999999999999999999")`(溢出 i64),
`literal_hex` 是 `String("0xFF")`(raw 标记)。

规范写入器(§ 5.9.8)将每个 Integer 以基-10 十进制输出
(例如 `color: 16772608`),每个 Float 以规范文本形式输出
(例如 `sci: 1.5e-3`)。十六进制 / 八进制 / 二进制 / 带下划线的
输入形式被解析器接受,但规范写入器绝不输出。

