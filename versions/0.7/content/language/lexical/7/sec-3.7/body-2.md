>>>>> lang=en
The four bracket-escape forms (`\}`, `\]`, `\{`, `\[`) exist for
symmetry: any byte that could open or close an inline compound has
an explicit literal form. `\{` and `\[` are most useful at the
*start* of an inline scalar value — where an unescaped `{` or `[`
would open a nested compound — but the parser accepts them
anywhere in the inline-scalar context.

The two key-oriented escapes (`\.`, `\:`) allow a key segment
to contain a literal dot or colon — characters that are otherwise
structural (dot separates path segments; colon separates the key
from its value). Example: `a\.b: v` produces the flat key `a.b`
with value `v` (no nesting); `a\:b: v` produces the key `a:b`.

>>>>> lang=ru
Четыре скобочных escape-формы (`\}`, `\]`, `\{`, `\[`) существуют
ради симметрии: у любого байта, который может открыть или закрыть
inline-составное, есть явная литеральная форма. `\{` и `\[` чаще
всего нужны в *начале* inline-скалярного значения — там
не-экранированные `{` / `[` открыли бы вложенное составное —
но парсер принимает их в любой позиции inline-скалярного контекста.

Два escape для ключей (`\.`, `\:`) позволяют сегменту ключа
содержать литеральную точку или двоеточие — символы, которые иначе
являются структурными (точка разделяет сегменты пути; двоеточие
разделяет ключ от значения). Пример: `a\.b: v` порождает плоский
ключ `a.b` со значением `v` (без вложенности); `a\:b: v` порождает
ключ `a:b`.

>>>>> lang=zh
四个括号转义形式(`\}`、`\]`、`\{`、`\[`)出于对称性而存在:任何
能够打开或关闭 inline 复合值的字节都有显式的字面形式。`\{` 与
`\[` 最有用的位置是 inline 标量值的*开头* —— 那里未转义的 `{`
或 `[` 会打开嵌套复合值 —— 但解析器在 inline 标量上下文的
任何位置都接受它们。

两个面向键的 escape(`\.`、`\:`)允许键段包含字面的点或冒号
—— 否则这些字符是结构性的(点分割路径段;冒号分割键与值)。例:
`a\.b: v` 产生平坦键 `a.b`,值 `v`(无嵌套);`a\:b: v` 产生键
`a:b`。

