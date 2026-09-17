>>>>> lang=en

Ktav values are written by humans. Heavy escape rules are a
correctness footgun. The 0.5.0 escape set was the minimal closed
set for inline scalars. 0.6.0 extends it to keys with `\.` and
`\:`, giving ten named escapes — every structurally significant
byte in inline form (`,`, `}`, `]`, `{`, `[`), the key-structural
bytes (`.`, `:`), the literal backslash (`\\`), plus two
convenience escapes (`\n`, `\r`) for embedded newlines. 0.7.0 adds
a generic Unicode form, `\uXXXX` (§ 3.7.1), for the rare case of
needing to name an arbitrary code point by number rather than typing it
directly, and three more named escapes — `\"`, `\'`, `` \` `` —
for the quote characters that quoted keys (§ 5.3.3) use as delimiters,
giving thirteen named escape forms plus one generic Unicode form,
fourteen forms in total — most byte values are still written literally,
since they need no escape at all.

The bracket pair-set is full and symmetric: `\}` / `\{` and
`\]` / `\[`. `\{` and `\[` are only ambiguity-relevant as the
*first* byte of an inline scalar value (an unescaped `{` or `[`
there opens a nested compound), but having all four forms removes
a "may I escape this here?" question for the writer and gives a
clean rule: every inline structural delimiter has an escape form.

>>>>> lang=ru

Значения Ktav пишутся людьми. Тяжёлые правила экранирования — это
ловушка для корректности. Набор escape-последовательностей 0.5.0 был
минимальным замкнутым набором для inline-скаляров. 0.6.0 расширяет
его на ключи с `\.` и `\:`, давая десять именованных escape —
каждый структурно значимый байт в inline-форме (`,`, `}`, `]`,
`{`, `[`), структурные байты ключа (`.`, `:`), литеральный обратный
слэш (`\\`), плюс два удобных escape (`\n`, `\r`) для встроенных
переводов строки. 0.7.0 добавляет обобщённую Unicode-форму, `\uXXXX`
(§ 3.7.1), — для редкого случая, когда произвольную кодовую точку
нужно назвать числом, а не набирать напрямую, — и ещё три именованных
escape — `\"`, `\'`, `` \` `` — для символов кавычек, которые
квотированные ключи (§ 5.3.3) используют как разделители, что даёт
тринадцать именованных escape-форм плюс одну обобщённую Unicode-форму,
всего четырнадцать форм; большинство значений байтов по-прежнему
пишутся буквально, поскольку им вообще не нужно экранирование.

Скобочный парный набор полон и симметричен: `\}` / `\{` и
`\]` / `\[`. `\{` и `\[` релевантны для неоднозначности только как
*первый* байт inline-скалярного значения (неэкранированные `{` или
`[` в этой позиции открывают вложенное составное), но наличие всех
четырёх форм снимает с пишущего вопрос «можно ли это экранировать
здесь?» и даёт чистое правило: у каждого inline-структурного
разделителя есть escape-форма.

>>>>> lang=zh

Ktav 的值由人书写。繁重的 escape 规则是正确性上的陷阱。0.5.0 的 escape 集是
inline 标量的最小闭合集。0.6.0 通过 `\.` 与 `\:` 将其扩展到键,共十个命名
escape —— inline 形式中每个结构上有意义的字节(`,`、`}`、`]`、`{`、`[`)、键结构
字节(`.`、`:`)、字面反斜杠(`\\`),外加两个用于嵌入换行的便利 escape(`\n`、
`\r`)。0.7.0 增加一种通用 Unicode 形式 `\uXXXX`(§ 3.7.1),用于需要按编号指称任意码点而非直接
键入的少见情形,以及再增加三个命名 escape —— `\"`、`\'`、`` \` `` —— 用于 quoted
键(§ 5.3.3)用作分隔符的引号字符,共计十三个命名 escape 形式,加上一种通用 Unicode 形式,总计十四种形式 —— 大多数
字节值仍按字面书写,因为它们根本无需 escape。

括号 escape 集完整且对称: `\}` / `\{` 与 `\]` / `\[`。`\{` 与 `\[` 只有作为
inline 标量值的*第一个*字节时才与歧义相关(未转义的 `{` 或 `[` 在那里会打开嵌套
复合值),但拥有全部四种形式免除了写入器的「这里要不要 escape?」疑问,并给出一条
干净的规则:每个 inline 结构分隔符都有 escape 形式。

制表符(`0x09`)与除 `LF` 和 `CR` 之外的其他低 ASCII 控制字节(`LF` 与
`CR` 已有各自的专用 escape, `\n` 与 `\r`)刻意**没有专门的命名** escape
—— 没有任何字母值得为一个本来就能作为字面量合法出现的字节而保留。制表符在
键与标量中是允许的字面字节(§ 4);控制字节是内容数据。包含此类字节的 String
可通过 verbatim 多行形式表示(§ 5.6、§ 5.9.7),自 0.7.0 起也可通过 `\uXXXX`
(§ 3.7.1)以 inline 方式表示,它能按编号指称其中任意一个 —— 多行形式能精确
保留字节,`\uXXXX` 又以通用方式覆盖 inline 情形,为每个控制字节单设专门命名
escape 并无必要。裸的 `CR` 字节是另一回事,上述两种机制都覆盖不到:它根本不能
作为 String 内容表示(§ 5.9.7),因为裸 `CR` 永远是行终止符(§ 3.2),只能通过
`\r` escape 或指称码点 000D 的通用 `\uXXXX` escape 进入 String 的逻辑内容。

