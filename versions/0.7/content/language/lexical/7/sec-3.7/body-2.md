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

The three quote escapes (`\"`, `\'`, `` \` ``) exist for the quoted
key form (§ 5.3.3): inside a `<quoted-segment>`, only the segment's
own opening delimiter is structural (its first unescaped occurrence
closes the segment); the two other quote characters are ordinary
content there and need no escape. `\"` / `\'` / `` \` `` are
recognised uniformly in every context where escapes are recognised
at all — bare key segments, quoted key segments, and inline scalar
values alike. In an inline value a recognised escape has no structural
effect, but it is not semantically redundant: § 5.2 classifies any
body containing a recognised escape as String, even when the decoded
body would otherwise be a keyword or numeric literal. This applies
equally to `\.` and `\:` in values.

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

三个引号 escape(`\"`、`\'`、`` \` ``)是为了支持带引号的键形式
(§ 5.3.3)而存在:在 `<quoted-segment>` 内部,只有该段自身的
开启分隔符是结构性的(其第一次未转义出现即关闭该段);另外两种
引号字符在其中是普通内容,无需转义。`\"` / `\'` / `` \` `` 在
每一个识别 escape 的上下文中都一致地被识别 —— 无论是裸键段、
带引号的键段,还是 inline 标量值。inline 值中的已识别 escape 没有
结构性作用,但在语义上并非多余:§ 5.2 将任何含有已识别 escape 的体
分类为 String,即使解码后的体本来会像关键字或数字字面量。这同样
适用于值中的 `\.` 与 `\:`。

其他任何 `\X` 形式(包括 `\#`、`\t`、`\<空格>`、
`\<其他任意>`)是 `BadEscapeSequence` 错误(§ 6.13)。
`\uXXXX` 的具体有效性规则见下文 § 3.7.1。

