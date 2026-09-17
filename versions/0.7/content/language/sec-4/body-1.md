>>>>> lang=en

The grammar is presented in a semi-formal notation, one rule per line.
Terminals are in double quotes; `<name>` denotes a non-terminal;
`*` is zero-or-more, `+` is one-or-more, `?` is optional, `|` is
alternation. Within a terminal, `\"` denotes a literal double-quote
character and `\\` denotes a literal backslash — this notation is
used only where a terminal must itself contain a quote or backslash
byte (e.g. the quoted-segment delimiters, § 4). In every line and inline
production below, `ws` is line-bounded: it denotes a whitespace code
point from § 3.3 other than LF or CR; `(ws)` is zero or more such code
points, and `1*ws` is one or more. LF and CR are reserved for eol in
`<line-end>` and are not consumed by either ws form. This source-matching
rule does not change value trimming or the treatment of code points produced
by decoded escapes.

```
<document>      ::= <line>*
<line-end>      ::= eol | EOF
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" <comment-body> <line-end>
<comment-body>  ::= any-chars-until-line-end
<blank>         ::= (ws) <line-end>

>>>>> lang=ru

Грамматика представлена в полуформальной нотации, по одному правилу на
строку. Терминалы — в двойных кавычках; `<имя>` обозначает
нетерминал; `*` — ноль или более, `+` — один или более, `?` —
необязательный, `|` — альтернатива. Внутри терминала `\"` обозначает
литеральный символ двойной кавычки, а `\\` — литеральный обратный
слэш — эта нотация используется только там, где терминал сам должен
содержать байт кавычки или обратного слэша (например, разделители
квотированного сегмента, § 4). Во всех приведённых ниже продукциях строк
и inline-формах `ws` ограничен строкой: он обозначает пробельную кодовую
точку из § 3.3, кроме LF и CR; `(ws)` означает ноль или более таких точек,
а `1*ws` — одну или более. LF и CR зарезервированы для eol внутри
`<line-end>` и не поглощаются ни одной формой ws. Это правило сопоставления
исходного текста не меняет обрезку значений или обработку кодовых точек,
полученных из декодированных escape-последовательностей.

```
<document>      ::= <line>*
<line-end>      ::= eol | EOF
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" <comment-body> <line-end>
<comment-body>  ::= any-chars-until-line-end
<blank>         ::= (ws) <line-end>

>>>>> lang=zh

语法以半形式化记法给出,每行一条规则。终结符放在双引号中;
`<名称>` 表示非终结符;`*` 表示零个或多个,`+` 表示一个或多个,
`?` 表示可选,`|` 表示候选。在终结符内部,`\"` 表示字面双引号
字符,`\\` 表示字面反斜杠 —— 这种记法仅用于终结符自身必须包含
引号或反斜杠字节的场合(例如 quoted-segment 的分隔符,§ 4)。
在下述所有行产生式和 inline 产生式中,`ws` 均受行边界限制:它表示
§ 3.3 空白码点中除 LF 和 CR 以外的成员;`(ws)` 表示零个或多个这类
码点,`1*ws` 表示一个或多个。LF 和 CR 保留给 `<line-end>` 中的 eol,
两种 ws 形式均不消耗它们。此源文本匹配规则不改变值修剪,也不改变由
decoded escape 产生的码点的处理。

```
<document>      ::= <line>*
<line-end>      ::= eol | EOF
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" <comment-body> <line-end>
<comment-body>  ::= any-chars-until-line-end
<blank>         ::= (ws) <line-end>

