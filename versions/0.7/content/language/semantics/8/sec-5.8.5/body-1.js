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

The raw \`::\` branch of an inline pair is not an inline value: it uses
the dedicated raw-scalar production of § 4, consumes to the containing
unescaped delimiter, processes escapes, and treats a leading \`{\` or
\`[\` as literal content. The dispatch rules below apply only after a
plain \`:\` separator.

When an inline scalar begins with \`(\` or \`((\`, these leading parentheses
remain ordinary content inside inline compounds, not multi-line string
openers. The raw body runs until the first unescaped inline terminator (\`,\`,
\`}\`, or \`]\`). Surrounding whitespace is then trimmed from the raw bytes,
and escape processing is performed according to § 5.8.1 and § 3.7. For a lone
\`(\` or lone \`((\` immediately before a terminator (e.g. \`{a: (, b: 1}\` or
\`{a: ((, b: 1}\`), the result is \`String("(")\` or \`String("((")\`,
respectively. If no inline terminator occurs before the end of the line, the
outer inline compound yields \`UnterminatedInlineCompound\` (§ 6.11).
Multi-line string openers are not permitted inside inline compounds.

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
- Многострочные строки (\`(\`/\`((\` — опенеры). Inline-составное по
  определению однострочно; многострочный опенер внутри него потребовал
  бы продолжения на последующих строках, что невозможно по § 3.2.
- Многострочные изменения области. Байт \`{\` или \`[\` в начале
  inline-значения открывает *вложенное inline-составное*, которое
  MUST закрыться на той же строке; \`{\` / \`[\`, за которыми не
  следует соответствующая закрывающая скобка, вызывают ошибку
  \`UnterminatedInlineCompound\`.

Raw-ветка \`::\` inline-пары не является inline-значением: она использует
специальную raw-scalar-продукцию § 4, идёт до содержащего
неэкранированного разделителя, обрабатывает escape и считает начальные
\`{\` или \`[\` литеральными данными. Следующие правила диспетчеризации
применяются только после обычного разделителя \`:\`.

Если inline-скаляр начинается с \`(\` или \`((\`, эти ведущие скобки остаются
обычным содержимым внутри inline-составных, а не многострочными строковыми
опенерами. Raw body продолжается до первого неэкранированного
inline-терминатора (\`,\`, \`}\` или \`]\`).
Пробельные кодовые точки с обоих краёв raw body обрезаются на уровне сырых
байтов, а обработка escape выполняется согласно § 5.8.1 и § 3.7. Для
одиночного \`(\` или одиночного \`((\`, непосредственно стоящего перед
терминатором (например, \`{a: (, b: 1}\` или \`{a: ((, b: 1}\`),
результатом будут \`String("(")\` или \`String("((")\`, соответственно.
Если до конца строки inline-терминатор отсутствует, внешний inline-составной
даёт ошибку \`UnterminatedInlineCompound\` (§ 6.11).
Многострочные строковые опенеры внутри inline-составных не разрешены.

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
- 多行字符串(\`(\` / \`((\` 开启符)。Inline 复合值按定义是单行的;
  其中的多行开启符需要延续到后续行,这根据 § 3.2 不可能。
- 多行作用域变更。\`{\` / \`[\` 字节位于 inline 值开头时开启
  *嵌套 inline 复合值*,其 MUST 在同行闭合;若 \`{\` / \`[\` 后没有
  匹配的闭合符,则为 \`UnterminatedInlineCompound\` 错误。

inline pair 的 raw \`::\` 分支不是 inline value:它使用 § 4 的专用
raw-scalar 产生式,延伸到包含它的第一个未转义分隔符,处理 escape,
并将初始 \`{\` 或 \`[\` 视为字面内容。下列分发规则仅在普通
\`:\` 分隔符之后适用。

当 inline 标量以 \`(\` 或 \`((\` 开始时,这些前导括号在 inline 复合值内
仍是普通内容,而不是多行字符串开启符。raw body 延续到第一个未转义的
inline 终止符(\`,\`、\`}\` 或 \`]\`)。随后在原始字节上修剪周围空白,
并按照 § 5.8.1 和 § 3.7 执行 escape 处理。对于紧邻终止符之前的单独
\`(\` 或单独 \`((\`(例如 \`{a: (, b: 1}\` 或
\`{a: ((, b: 1}\`),结果分别为 \`String("(")\` 和
\`String("((")\`。
如果直到行末都没有出现 inline 终止符,外层 inline 复合值则给出
\`UnterminatedInlineCompound\`(§ 6.11)错误。
多行字符串开启符不允许出现在 inline 复合值内。

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
