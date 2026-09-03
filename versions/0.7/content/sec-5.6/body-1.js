export default {
  en: `
A multi-line string is opened by a value-start of \`(\` (stripped form)
or \`((\` (verbatim form) on a line that contains no other content
after the opener and its optional trailing whitespace. The closer is
a line whose trimmed content is exactly \`)\` (for stripped) or \`))\`
(for verbatim).

- **Stripped form (\`( … )\`)**: the parser computes the **common
  leading whitespace** across non-blank content lines — the longest
  prefix, measured in whitespace code points (§ 3.3) rather than
  bytes, that is identical code-point-for-code-point across every
  non-blank line's own leading run (a line starting with a tab and a
  line starting with a space share no common prefix at all, even
  though both begin with *some* whitespace code point, because the
  code points themselves differ at position 0) — and removes that
  shared prefix from each line, then removes trailing whitespace
  (§ 3.3) from each line. The lines are then joined by single \`\\n\`
  bytes. Blank lines inside the block contribute empty strings to the
  joined result. A blank line containing only whitespace code points
  (per § 3.5) does NOT participate in the common-indent computation;
  it contributes an empty content line to the joined result.

  Prior to 0.7, trailing whitespace on each line was preserved
  verbatim, identically to the verbatim form below — this made an
  editor's "trim trailing whitespace on save" silently mutate string
  content with no visible signal. As of 0.7, the stripped form's name
  matches its behaviour on both edges of each line.
- **Verbatim form (\`(( … ))\`)**: every line between the opener and the
  closer — including a blank line and a whitespace-only line — is a
  content line. The parser joins them byte-for-byte with single \`\\n\`
  bytes; no whitespace stripping — leading or trailing — is performed on
  any line, and no line is dropped as having "no effect" the way an
  ordinary blank line elsewhere in the document does (§ 5.1 rule 1):
  inside a verbatim block, a blank line contributes an empty string to
  the joined result, exactly as it already does for the stripped form.

A multi-line string body MUST NOT cross another compound boundary:
the opener line and closer line are unambiguously paired by the
LIFO parser stack.

`,
  ru: `
Многострочная строка открывается значением-начало \`(\` (stripped) или
\`((\` (verbatim) на строке, не содержащей других непробельных
кодовых точек после опенера. Закрывающая строка — строка, обрезанная содержимое
которой в точности \`)\` (для stripped) или \`))\` (для verbatim).

- **Stripped (\`( … )\`)**: парсер вычисляет **общий ведущий пробел**
  среди непустых содержательных строк — самый длинный префикс,
  измеряемый в пробельных кодовых точках (§ 3.3), а не в байтах,
  который совпадает кодовая точка за кодовой точкой во ведущей
  части каждой непустой строки (строка, начинающаяся с табуляции,
  и строка, начинающаяся с пробела, не имеют общего префикса
  вовсе, даже если обе начинаются с *какой-то* пробельной кодовой
  точки, поскольку сами кодовые точки различаются в позиции 0) —
  и удаляет этот общий префикс из каждой строки, затем удаляет
  замыкающий пробел (§ 3.3) из каждой строки. Затем строки соединяются одиночными \`\\n\`-байтами.
  Пустые строки внутри блока вносят пустые строки в результат
  объединения. Пустая строка, состоящая только из пробельных
  кодовых точек (по § 3.5), НЕ участвует в вычислении общего
  отступа; она вносит
  пустую содержательную строку в результат объединения.

  До 0.7 замыкающий пробел в каждой строке сохранялся verbatim, точно
  так же, как в verbatim-форме ниже — из-за этого команда редактора
  «убрать замыкающие пробелы при сохранении» могла незаметно испортить
  содержимое строки без видимого сигнала. Начиная с 0.7, поведение
  stripped-формы на обеих границах строки соответствует её названию.
- **Verbatim (\`(( … ))\`)**: каждая строка между строкой-опенером и
  строкой-закрытием — включая пустую строку и строку, состоящую только
  из пробельных кодовых точек, — является содержательной строкой.
  Парсер соединяет их байт-в-байт через одиночные \`\\n\`-байты; обрезка
  пробелов — ни ведущих, ни замыкающих — не выполняется ни для одной
  строки, и никакая строка не отбрасывается по принципу «без эффекта»,
  как обычная пустая строка в остальной части документа (§ 5.1
  правило 1): внутри verbatim-блока пустая строка вносит пустую строку
  в результат объединения — точно так же, как она уже делает это для
  stripped-формы.

Тело многострочной строки MUST NOT пересекать границу другого
составного значения: строка-опенер и строка-закрытие однозначно
спариваются через LIFO-стек парсера.

`,
  zh: `
多行字符串由 value-start \`(\`(stripped 形式)或 \`((\`(verbatim 形式)
开启,开启行在开启符及其可选的尾部空白之后不含任何其他内容。关闭行
则是其 trim 后内容恰为 \`)\`(stripped 形式)或 \`))\`(verbatim 形式)
的行。

- **stripped (\`( … )\`)**:计算非空内容行的**公共前导空白** —— 以
  空白码点(§ 3.3)而非字节衡量的最长前缀,要求在每个非空行自身
  的前导部分逐码点相同(以制表符开头的行与以空格开头的行没有
  任何公共前缀,即使两者都以*某个*空白码点开头,因为它们在位置
  0 处的码点本身不同)—— 并从每行去除该公共前缀,随后从每行去除
  尾部空白(§ 3.3);各行以单个 \`\\n\` 连接。块内的空白
  行作为空字符串贡献到连接结果。仅由空白码点组成的空行(依据
  § 3.5)**不**参与公共缩进的计算;它对连接结果贡献一个空的
  内容行。

  0.7 之前,每行的尾部空白会被逐字节保留,与下方的 verbatim 形式
  完全一致 —— 这导致编辑器的「保存时去除尾部空白」功能可能在毫无
  提示的情况下悄悄改变字符串内容。自 0.7 起,stripped 形式在两侧
  边界上的行为均与其名称相符。
- **verbatim (\`(( … ))\`)**:开启行与关闭行之间的每一行 —— 包括空白行
  和仅由空白码点组成的行 —— 都是内容行。解析器将它们逐字节以单个
  \`\\n\` 连接;不对任何一行做空白剥除 —— 无论前导还是尾部;也没有任何
  行会像文档其他位置的普通空白行那样,因「无效果」而被丢弃
  (§ 5.1 规则 1):在 verbatim 块内,空白行向连接结果贡献一个空字符串,
  与它在 stripped 形式中的既有行为完全一致。

多行字符串体 MUST NOT 跨越另一个复合值的边界:开启行与关闭行通过
解析器的 LIFO 栈无歧义地配对。

`,
};
