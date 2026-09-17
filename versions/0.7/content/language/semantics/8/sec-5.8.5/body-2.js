export default {
  en: `\`\`\`
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
  ru: `Поэтому следующий документ является ошибкой:

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
  zh: `**不**是 inline 值首个非空白码点的 \`{\` / \`[\` 是字面字符,**不**
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
