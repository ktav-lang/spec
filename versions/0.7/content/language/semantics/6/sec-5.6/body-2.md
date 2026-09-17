>>>>> lang=en
  Prior to 0.7, trailing whitespace on each line was preserved
  verbatim, identically to the verbatim form below — this made an
  editor's "trim trailing whitespace on save" silently mutate string
  content with no visible signal. As of 0.7, the stripped form's name
  matches its behaviour on both edges of each line.
- **Verbatim form (`(( … ))`)**: every line between the opener and the
  closer — including a blank line and a whitespace-only line — is a
  content line. The parser joins them byte-for-byte with single `\n`
  bytes; no whitespace stripping — leading or trailing — is performed on
  any line, and no line is dropped as having "no effect" the way an
  ordinary blank line elsewhere in the document does (§ 5.1 rule 1):
  inside a verbatim block, a blank line contributes an empty string to
  the joined result, exactly as it already does for the stripped form.

A multi-line string body MUST NOT cross another compound boundary:
the opener line and closer line are unambiguously paired by the
LIFO parser stack.

>>>>> lang=ru
  До 0.7 замыкающий пробел в каждой строке сохранялся verbatim, точно
  так же, как в verbatim-форме ниже — из-за этого команда редактора
  «убрать замыкающие пробелы при сохранении» могла незаметно испортить
  содержимое строки без видимого сигнала. Начиная с 0.7, поведение
  stripped-формы на обеих границах строки соответствует её названию.
- **Verbatim (`(( … ))`)**: каждая строка между строкой-опенером и
  строкой-закрытием — включая пустую строку и строку, состоящую только
  из пробельных кодовых точек, — является содержательной строкой.
  Парсер соединяет их байт-в-байт через одиночные `\n`-байты; обрезка
  пробелов — ни ведущих, ни замыкающих — не выполняется ни для одной
  строки, и никакая строка не отбрасывается по принципу «без эффекта»,
  как обычная пустая строка в остальной части документа (§ 5.1
  правило 1): внутри verbatim-блока пустая строка вносит пустую строку
  в результат объединения — точно так же, как она уже делает это для
  stripped-формы.

Тело многострочной строки MUST NOT пересекать границу другого
составного значения: строка-опенер и строка-закрытие однозначно
спариваются через LIFO-стек парсера.

>>>>> lang=zh
  0.7 之前,每行的尾部空白会被逐字节保留,与下方的 verbatim 形式
  完全一致 —— 这导致编辑器的「保存时去除尾部空白」功能可能在毫无
  提示的情况下悄悄改变字符串内容。自 0.7 起,stripped 形式在两侧
  边界上的行为均与其名称相符。
- **verbatim (`(( … ))`)**:开启行与关闭行之间的每一行 —— 包括空白行
  和仅由空白码点组成的行 —— 都是内容行。解析器将它们逐字节以单个
  `\n` 连接;不对任何一行做空白剥除 —— 无论前导还是尾部;也没有任何
  行会像文档其他位置的普通空白行那样,因「无效果」而被丢弃
  (§ 5.1 规则 1):在 verbatim 块内,空白行向连接结果贡献一个空字符串,
  与它在 stripped 形式中的既有行为完全一致。

多行字符串体 MUST NOT 跨越另一个复合值的边界:开启行与关闭行通过
解析器的 LIFO 栈无歧义地配对。

