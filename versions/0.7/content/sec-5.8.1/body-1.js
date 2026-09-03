export default {
  en: `
Whitespace is optional everywhere inside an inline compound:

\`\`\`
{a: 1, b: 2}         ; canonical
{ a : 1 , b : 2 }    ; same Value
{a:1,b:2}            ; same Value
\`\`\`

Whitespace is **trimmed** from both ends of each inline scalar value
before classification under § 5.2: \`{a:   hello  ,b:x}\` yields
\`{a: "hello", b: "x"}\`. The trimming rule applies uniformly to
inline scalar bodies after both the \`:\` separator and the \`::\`
raw-marker separator.

Whitespace trimming operates on the **raw bytes before escape
processing** (§ 3.7). Bytes produced by escape sequences (e.g. LF
from \`\\n\`, CR from \`\\r\`) are content and are not subject to further
trimming after escape replacement.

To preserve trailing/leading whitespace in a String value, escape the
first or last whitespace code point — see § 3.7. No \`\\<space>\` named
escape is defined, but \`\\uXXXX\` (§ 3.7.1) can name any whitespace
code point explicitly (e.g. the four-digit form naming U+0020, an
ordinary space), so a whitespace-preserving value CAN be expressed
in inline form as of
0.7.0; the verbatim multi-line form \`((…))\` remains the byte-exact
alternative for values needing more than edge preservation.

`,
  ru: `
Пробелы опциональны везде внутри inline-составного:

\`\`\`
{a: 1, b: 2}         ; канонично
{ a : 1 , b : 2 }    ; то же Value
{a:1,b:2}            ; то же Value
\`\`\`

Пробелы **обрезаются** с обоих концов каждого inline-скалярного
значения перед классификацией по § 5.2: \`{a:   hello  ,b:x}\` даёт
\`{a: "hello", b: "x"}\`. Правило обрезки применяется единообразно к
inline-скалярным телам как после разделителя \`:\`, так и после
raw-маркера \`::\`.

Обрезка пробелов работает на **сырых байтах до обработки escape**
(§ 3.7). Байты, произведённые escape-последовательностями
(например, LF из \`\\n\`, CR из \`\\r\`), являются содержимым и не
подвергаются дальнейшей обрезке после замены escape.

Чтобы сохранить замыкающий/ведущий пробел в значении String,
экранируйте первую или последнюю пробельную кодовую точку — см.
§ 3.7. Именованный escape \`\\<пробел>\` не определён, но \`\\uXXXX\`
(§ 3.7.1) может назвать любую пробельную кодовую точку явно
(например, четырёхзначная форма, называющая U+0020, обычный
пробел), так что значение с сохранением пробела МОЖЕТ быть
выражено в inline-форме начиная с 0.7.0; verbatim многострочная
форма \`((…))\` остаётся побайтово точной альтернативой для
значений, требующих больше, чем сохранение краёв.

`,
  zh: `
inline 复合值内空白处处可选:

\`\`\`
{a: 1, b: 2}         ; 规范
{ a : 1 , b : 2 }    ; 同一 Value
{a:1,b:2}            ; 同一 Value
\`\`\`

inline 标量值在按 § 5.2 分类前两侧空白被**修剪**:\`{a:   hello  ,b:x}\`
得到 \`{a: "hello", b: "x"}\`。修剪规则在 \`:\` 分隔符与 \`::\` raw 标记
分隔符之后同样统一适用于 inline 标量体。

空白修剪作用于 **escape 处理之前的原始字节**(§ 3.7)。由 escape
序列产生的字节(例如来自 \`\\n\` 的 LF、来自 \`\\r\` 的 CR)属于内容,
在 escape 替换后不再受进一步修剪。

要在 String 值中保留尾部/前导空白,请转义第一个或最后一个空白
码点 —— 见 § 3.7。虽然未定义命名 escape \`\\<空格>\`,但 \`\\uXXXX\`
(§ 3.7.1)可以显式命名任意空白码点(例如命名 U+0020 普通空格的
四位形式),因此自 0.7.0 起,保留空白的值可以用 inline 形式表达;
verbatim 多行形式 \`((…))\` 仍是需要超出边界保留的值的字节精确
替代方案。

`,
};
