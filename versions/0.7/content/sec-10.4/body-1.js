export default {
  en: `
Ktav values are written by humans. Heavy escape rules are a
correctness footgun. The 0.5.0 escape set was the minimal closed
set for inline scalars. 0.6.0 extends it to keys with \`\\.\` and
\`\\:\`, giving ten named escapes — every structurally significant
byte in inline form (\`,\`, \`}\`, \`]\`, \`{\`, \`[\`), the key-structural
bytes (\`.\`, \`:\`), the literal backslash (\`\\\\\`), plus two
convenience escapes (\`\\n\`, \`\\r\`) for embedded newlines. 0.7.0 adds
an eleventh, \`\\uXXXX\` (§ 3.7.1), for the rare case of needing to
name an arbitrary code point by number rather than typing it
directly, and three more — \`\\"\`, \`\\'\`, \`\` \\\` \`\` — for the quote
characters that quoted keys (§ 5.3.3) use as delimiters, giving
fourteen named escapes in total — most byte values are still
written literally, since they need no escape at all.

The bracket pair-set is full and symmetric: \`\\}\` / \`\\{\` and
\`\\]\` / \`\\[\`. \`\\{\` and \`\\[\` are only ambiguity-relevant as the
*first* byte of an inline scalar value (an unescaped \`{\` or \`[\`
there opens a nested compound), but having all four forms removes
a "may I escape this here?" question for the writer and gives a
clean rule: every inline structural delimiter has an escape form.

Tab (\`0x09\`) and other low-ASCII control bytes other than \`LF\` and
\`CR\` (which already have their own dedicated escapes, \`\\n\` and \`\\r\`)
intentionally have no **dedicated named** escape — no letter is worth
reserving for a byte that is legal as a literal in the first place.
Tab is a permitted literal byte in keys and scalars (§ 4); control
bytes are content data. A String containing such a byte is
representable through verbatim multi-line form (§ 5.6, § 5.9.7), or,
since 0.7.0, inline via \`\\uXXXX\` (§ 3.7.1), which can name any of
them by number — there is no need for a dedicated named escape for
each one when the multi-line form preserves the byte exactly and
\`\\uXXXX\` covers the inline case generically. A raw \`CR\` byte is a
separate case, not covered by either mechanism: it is never
representable as String content at all (§ 5.9.7), since a bare \`CR\`
is always a line terminator (§ 3.2) and can enter a String's logical
content only through the \`\\r\` escape or the generic \`\\uXXXX\` escape
naming code point 000D.

Multi-line scalars and multi-line strings have no escape processing
at all — the lexical layout makes escape unnecessary in those
contexts. (Keys gained escape processing in 0.6.0; see § 3.7.)

`,
  ru: `
Значения Ktav пишутся людьми. Тяжёлые правила экранирования — это
ловушка для корректности. Набор escape-последовательностей 0.5.0 был
минимальным замкнутым набором для inline-скаляров. 0.6.0 расширяет
его на ключи с \`\\.\` и \`\\:\`, давая десять именованных escape —
каждый структурно значимый байт в inline-форме (\`,\`, \`}\`, \`]\`,
\`{\`, \`[\`), структурные байты ключа (\`.\`, \`:\`), литеральный обратный
слэш (\`\\\\\`), плюс два удобных escape (\`\\n\`, \`\\r\`) для встроенных
переводов строки. 0.7.0 добавляет одиннадцатый, \`\\uXXXX\`
(§ 3.7.1), — для редкого случая, когда произвольную кодовую точку
нужно назвать числом, а не набирать напрямую, — и ещё три —
\`\\"\`, \`\\'\`, \`\` \\\` \`\` — для символов кавычек, которые квотированные
ключи (§ 5.3.3) используют как разделители, что даёт четырнадцать
именованных escape в сумме; большинство значений байтов по-прежнему
пишутся буквально, поскольку им вообще не нужно экранирование.

Скобочный парный набор полон и симметричен: \`\\}\` / \`\\{\` и
\`\\]\` / \`\\[\`. \`\\{\` и \`\\[\` релевантны для неоднозначности только как
*первый* байт inline-скалярного значения (неэкранированные \`{\` или
\`[\` в этой позиции открывают вложенное составное), но наличие всех
четырёх форм снимает с пишущего вопрос «можно ли это экранировать
здесь?» и даёт чистое правило: у каждого inline-структурного
разделителя есть escape-форма.

Табуляция (\`0x09\`) и другие управляющие байты нижней части ASCII,
кроме \`LF\` и \`CR\` (у которых уже есть собственные выделенные
escape-последовательности, \`\\n\` и \`\\r\`), намеренно не имеют
**выделенной именованной** escape-последовательности — ни одну букву
не стоит резервировать для байта, который и так допустим как литерал.
Табуляция — допустимый литеральный байт в ключах и скалярах (§ 4);
управляющие байты — это содержательные данные. String, содержащая
такой байт, представима через verbatim-многострочную форму
(§ 5.6, § 5.9.7), а с 0.7.0 — inline через \`\\uXXXX\` (§ 3.7.1),
которым можно назвать любой из них числом — отдельная именованная
escape-последовательность для каждого не нужна: многострочная форма
сохраняет байт в точности, а \`\\uXXXX\` покрывает inline-случай в
общем виде. Отдельный случай — «сырой» байт \`CR\`: он вообще не
представим как содержимое String (§ 5.9.7), поскольку голый \`CR\` —
это всегда завершитель строки (§ 3.2) и может попасть в логическое
содержимое String только через escape \`\\r\` либо через обобщённый
escape \`\\uXXXX\`, называющий кодовую точку 000D.

Многострочные скаляры и многострочные строки вообще не обрабатывают
escape-последовательности — лексическая структура делает
экранирование в этих контекстах ненужным. (Ключи получили обработку
escape-последовательностей в 0.6.0; см. § 3.7.)

`,
  zh: `
Ktav 的值由人书写。繁重的 escape 规则是正确性上的陷阱。0.5.0 的 escape 集是
inline 标量的最小闭合集。0.6.0 通过 \`\\.\` 与 \`\\:\` 将其扩展到键,共十个命名
escape —— inline 形式中每个结构上有意义的字节(\`,\`、\`}\`、\`]\`、\`{\`、\`[\`)、键结构
字节(\`.\`、\`:\`)、字面反斜杠(\`\\\\\`),外加两个用于嵌入换行的便利 escape(\`\\n\`、
\`\\r\`)。0.7.0 增加第十一个 \`\\uXXXX\`(§ 3.7.1),用于需要按编号指称任意码点而非直接
键入的少见情形,以及再增加三个 —— \`\\"\`、\`\\'\`、\`\` \\\` \`\` —— 用于 quoted
键(§ 5.3.3)用作分隔符的引号字符,总计十四个命名 escape —— 大多数
字节值仍按字面书写,因为它们根本无需 escape。

括号 escape 集完整且对称: \`\\}\` / \`\\{\` 与 \`\\]\` / \`\\[\`。\`\\{\` 与 \`\\[\` 只有作为
inline 标量值的*第一个*字节时才与歧义相关(未转义的 \`{\` 或 \`[\` 在那里会打开嵌套
复合值),但拥有全部四种形式免除了写入器的「这里要不要 escape?」疑问,并给出一条
干净的规则:每个 inline 结构分隔符都有 escape 形式。

制表符(\`0x09\`)与除 \`LF\` 和 \`CR\` 之外的其他低 ASCII 控制字节(\`LF\` 与
\`CR\` 已有各自的专用 escape, \`\\n\` 与 \`\\r\`)刻意**没有专门的命名** escape
—— 没有任何字母值得为一个本来就能作为字面量合法出现的字节而保留。制表符在
键与标量中是允许的字面字节(§ 4);控制字节是内容数据。包含此类字节的 String
可通过 verbatim 多行形式表示(§ 5.6、§ 5.9.7),自 0.7.0 起也可通过 \`\\uXXXX\`
(§ 3.7.1)以 inline 方式表示,它能按编号指称其中任意一个 —— 多行形式能精确
保留字节,\`\\uXXXX\` 又以通用方式覆盖 inline 情形,为每个控制字节单设专门命名
escape 并无必要。裸的 \`CR\` 字节是另一回事,上述两种机制都覆盖不到:它根本不能
作为 String 内容表示(§ 5.9.7),因为裸 \`CR\` 永远是行终止符(§ 3.2),只能通过
\`\\r\` escape 或指称码点 000D 的通用 \`\\uXXXX\` escape 进入 String 的逻辑内容。

多行标量值与多行字符串完全不做 escape 处理 —— 词法布局使 escape 在这些上下文中
没有必要。(键在 0.6.0 获得了 escape 处理;见 § 3.7。)

`,
};
