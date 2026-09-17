>>>>> lang=en

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

>>>>> lang=ru

Многострочная строка открывается значением-началом `(` (stripped) или
`((` (verbatim) на строке, не содержащей других непробельных
кодовых точек после опенера и его необязательного хвостового
пробела. Закрывающая строка — строка, обрезанная содержимое
которой в точности `)` (для stripped) или `))` (для verbatim).

- **Stripped (`( … )`)**: парсер вычисляет **общий ведущий пробел**
  среди непустых содержательных строк — самый длинный префикс,
  измеряемый в пробельных кодовых точках (§ 3.3), а не в байтах,
  который совпадает кодовая точка за кодовой точкой во ведущей
  части каждой непустой строки (строка, начинающаяся с табуляции,
  и строка, начинающаяся с пробела, не имеют общего префикса
  вовсе, даже если обе начинаются с *какой-то* пробельной кодовой
  точки, поскольку сами кодовые точки различаются в позиции 0) —
  и удаляет этот общий префикс из каждой строки, затем удаляет
  замыкающий пробел (§ 3.3) из каждой строки. Затем строки соединяются одиночными `\n`-байтами.
  Пустые строки внутри блока вносят пустые строки в результат
  объединения. Пустая строка, состоящая только из пробельных
  кодовых точек (по § 3.5), НЕ участвует в вычислении общего
  отступа; она вносит
  пустую содержательную строку в результат объединения.

>>>>> lang=zh

多行字符串由 value-start `(`(stripped 形式)或 `((`(verbatim 形式)
开启,开启行在开启符及其可选的尾部空白之后不含任何其他内容。关闭行
则是其 trim 后内容恰为 `)`(stripped 形式)或 `))`(verbatim 形式)
的行。

- **stripped (`( … )`)**:计算非空内容行的**公共前导空白** —— 以
  空白码点(§ 3.3)而非字节衡量的最长前缀,要求在每个非空行自身
  的前导部分逐码点相同(以制表符开头的行与以空格开头的行没有
  任何公共前缀,即使两者都以*某个*空白码点开头,因为它们在位置
  0 处的码点本身不同)—— 并从每行去除该公共前缀,随后从每行去除
  尾部空白(§ 3.3);各行以单个 `\n` 连接。块内的空白
  行作为空字符串贡献到连接结果。仅由空白码点组成的空行(依据
  § 3.5)**不**参与公共缩进的计算;它对连接结果贡献一个空的
  内容行。

