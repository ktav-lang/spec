export default {
  en: `
- Multi-line strings (\`(\`/\`((\` openers). An inline compound is by
  definition single-line; a multi-line opener inside it would
  require continuation onto subsequent lines, which is impossible
  by § 3.2.
- Multi-line scope changes. A \`{\` or \`[\` byte at the start of an
  inline value opens a *nested inline compound* that MUST close on
  the same line; a \`{\` / \`[\` not followed by a matching closer is a
  \`UnterminatedInlineCompound\` error.

If a \`(\` or \`((\` byte appears as the first non-whitespace code point of an
inline scalar value, it is treated as the start of an inline scalar
(per § 5.8.1). Because no inline terminator (\`,\`, \`}\`, \`]\`) follows
on the same line, this raises \`UnterminatedInlineCompound\` (§ 6.11).
When an inline terminator instead follows immediately on the same
line (e.g. \`{a: (, b: 1}\`), the value is complete before end-of-line
and is read as the ordinary one-byte String \`"("\` — not an error;
the \`UnterminatedInlineCompound\` case above is specifically the
common situation where nothing else appears on the line after the
\`(\`/\`((\`. Multi-line string openers are not permitted inside inline
compounds.

The following document is therefore an error:

\`\`\`
key: {a: (
    body
)}
\`\`\`

A \`{\` or \`[\` byte that is **NOT** the first non-whitespace code point of
an inline value (i.e. it appears mid-scalar) is a literal character
and does NOT open a nested compound. The decision is made once,
when the parser begins reading an inline value: if the first
non-whitespace code point is \`{\` or \`[\`, the value is a nested compound;
otherwise the value is an inline scalar that runs to the next
unescaped \`,\` / \`}\` / \`]\` (or end-of-line, which is an error per
§ 6.11). Inside that inline scalar, additional \`{\` or \`[\` bytes are
literal data and have no structural meaning. Example:

\`\`\`
{a: hello{world, b: x}
\`\`\`

yields \`{a: "hello{world", b: "x"}\`. The outer \`}\` closes the
outer object; the mid-value \`{\` in \`hello{world\` is part of the
String value. The same reasoning applies to \`[\` mid-value. Use
\`\\{\` or \`\\[\` (§ 3.7) only when the literal bracket would be the
first byte of the inline value.

`,
  ru: `
- Многострочные строки (\`(\`/\`((\` опенеры).
- Многострочные изменения области. \`{\` / \`[\` байт в начале
  inline-значения открывает *вложенное inline-составное*, которое
  MUST закрыться на той же строке.

Если байт \`(\` или \`((\` является первой непробельной кодовой точкой значения inline-скаляра, он трактуется как начало inline-скаляра (согласно § 5.8.1). Поскольку на той же строке не следует ни один inline-терминатор (\`,\`, \`}\`, \`]\`), возникает ошибка \`UnterminatedInlineCompound\` (§ 6.11). Если же inline-терминатор следует сразу же на той же строке (например, \`{a: (, b: 1}\`), значение завершается до конца строки и читается как обычная однобайтовая String \`"("\` — это не ошибка; описанный выше случай \`UnterminatedInlineCompound\` — это именно типичная ситуация, когда после \`(\`/\`((\` на строке больше ничего нет. Многострочные строковые опенеры внутри inline-составных не разрешены.

Поэтому следующий документ является ошибкой:

\`\`\`
key: {a: (
    body
)}
\`\`\`

Байт \`{\` или \`[\`, который **НЕ** является первой непробельной
кодовой точкой inline-значения (то есть находится в середине
скаляра), — литеральный символ и НЕ открывает вложенное составное.
Решение принимается один раз, когда парсер начинает читать
inline-значение: если первая непробельная кодовая точка — \`{\` или
\`[\`, значение — вложенное
составное; иначе значение — inline-скаляр, тянущийся до следующего
неэкранированного \`,\` / \`}\` / \`]\` (либо до конца строки, что —
ошибка по § 6.11). Внутри этого скаляра дополнительные байты \`{\`
или \`[\` — литеральные данные без структурного значения. Пример:

\`\`\`
{a: hello{world, b: x}
\`\`\`

даёт \`{a: "hello{world", b: "x"}\`. Внешний \`}\` закрывает внешний
объект; средне-значимый \`{\` в \`hello{world\` — часть String.
Аналогично для \`[\` в середине значения. \`\\{\` или \`\\[\` (§ 3.7)
нужны только когда литеральная скобка должна быть первым байтом
inline-значения.

`,
  zh: `
- 多行字符串(\`(\` / \`((\` 开启符)。
- 多行作用域变更。\`{\` / \`[\` 作为 inline 值首字符开启 *嵌套 inline
  复合值*,MUST 在同行关闭。

若 \`(\` 或 \`((\` 字节作为 inline 标量值的第一个非空白码点出现,它被视为一个 inline 标量的开始(依 § 5.8.1)。由于同一行上没有跟随任何 inline 终止符(\`,\`、\`}\`、\`]\`),这会引发 \`UnterminatedInlineCompound\`(§ 6.11)。而当 inline 终止符紧接着出现在同一行时(例如 \`{a: (, b: 1}\`),值在行末之前已经完整,会被读作普通的单字节 String \`"("\` —— 这不是错误;上述 \`UnterminatedInlineCompound\` 情形特指 \`(\`/\`((\` 之后该行再无其他内容的常见情况。多行字符串开启符不允许出现在 inline 复合值内。

因此,以下文档是一个错误:

\`\`\`
key: {a: (
    body
)}
\`\`\`

**不**是 inline 值首个非空白码点的 \`{\` / \`[\` 是字面字符,**不**
打开嵌套复合值。解析器在开始读取 inline 值时做一次性决定:首个
非空白码点为 \`{\` / \`[\` 时,值为嵌套复合值;否则值为 inline 标量,
延伸至下个未转义的 \`,\` / \`}\` / \`]\`(或行末 —— § 6.11 错误)。在该
inline 标量内,后续的 \`{\` / \`[\` 字节均为字面数据,无结构意义。例:

\`\`\`
{a: hello{world, b: x}
\`\`\`

得到 \`{a: "hello{world", b: "x"}\`。外层 \`}\` 关闭外层对象;\`hello{world\`
中部的 \`{\` 是 String 的一部分。\`[\` 在值的中部亦同。\`\\{\` / \`\\[\`
(§ 3.7)仅在字面括号需作为 inline 值首字节时使用。

`,
};
