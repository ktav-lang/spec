export default {
  en: `
\`\`\`
color: 0xFFEE00
permissions: 0o755
mask: 0b1111_0000
million: 1_000_000
ratio: 0.5
sci: 1.5e-3
big: 99999999999999999999
literal_hex:: 0xFF
\`\`\`

\`color\` is \`Integer(16772608)\` (0xFFEE00 decimal),
\`permissions\` is \`Integer(493)\` (0o755 decimal),
\`mask\` is \`Integer(240)\` (0b11110000 decimal),
\`million\` is \`Integer(1000000)\`, \`ratio\` is \`Float(0.5)\`,
\`sci\` is \`Float(1.5e-3)\`, \`big\` is
\`String("99999999999999999999")\` (overflows i64),
\`literal_hex\` is \`String("0xFF")\` (raw marker).

The canonical writer (§ 5.9.8) emits each Integer in base-10
decimal (e.g. \`color: 16772608\`) and each Float in canonical
notation (e.g. \`sci: 1.5e-3\`). The hex / octal / binary / underscored
input forms are accepted by the parser but never emitted by the
canonical writer.

`,
  ru: `
\`\`\`
color: 0xFFEE00
permissions: 0o755
mask: 0b1111_0000
million: 1_000_000
ratio: 0.5
sci: 1.5e-3
big: 99999999999999999999
literal_hex:: 0xFF
\`\`\`

\`color\` — \`Integer(16772608)\` (0xFFEE00 в десятичной записи),
\`permissions\` — \`Integer(493)\` (0o755 в десятичной записи),
\`mask\` — \`Integer(240)\` (0b11110000 в десятичной записи),
\`million\` — \`Integer(1000000)\`, \`ratio\` — \`Float(0.5)\`,
\`sci\` — \`Float(1.5e-3)\`, \`big\` —
\`String("99999999999999999999")\` (превышает диапазон i64),
\`literal_hex\` — \`String("0xFF")\` (raw-маркер).

Канонический писатель (§ 5.9.8) выводит каждое Integer в десятичной
записи по основанию 10 (например, \`color: 16772608\`), а каждое
Float — в канонической нотации (например, \`sci: 1.5e-3\`).
Шестнадцатеричные / восьмеричные / двоичные формы и формы
с подчёркиваниями принимаются парсером, но никогда не выводятся
каноническим писателем.

`,
  zh: `
\`\`\`
color: 0xFFEE00
permissions: 0o755
mask: 0b1111_0000
million: 1_000_000
ratio: 0.5
sci: 1.5e-3
big: 99999999999999999999
literal_hex:: 0xFF
\`\`\`

\`color\` 是 \`Integer(16772608)\`(0xFFEE00 的十进制),
\`permissions\` 是 \`Integer(493)\`(0o755 的十进制),
\`mask\` 是 \`Integer(240)\`(0b11110000 的十进制),
\`million\` 是 \`Integer(1000000)\`,\`ratio\` 是 \`Float(0.5)\`,
\`sci\` 是 \`Float(1.5e-3)\`,\`big\` 是
\`String("99999999999999999999")\`(溢出 i64),
\`literal_hex\` 是 \`String("0xFF")\`(raw 标记)。

规范写入器(§ 5.9.8)将每个 Integer 以基-10 十进制输出
(例如 \`color: 16772608\`),每个 Float 以规范文本形式输出
(例如 \`sci: 1.5e-3\`)。十六进制 / 八进制 / 二进制 / 带下划线的
输入形式被解析器接受,但规范写入器绝不输出。

`,
};
