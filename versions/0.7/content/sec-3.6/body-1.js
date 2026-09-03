export default {
  en: `
An **integer literal** matches the following grammar (where \`*\` is
zero-or-more, \`+\` is one-or-more, \`?\` is optional, \`|\` is alternation):

\`\`\`
integer        ::= sign? ( hex | oct | bin | dec )
sign           ::= "+" | "-"
hex            ::= "0x" hex_digit (("_")? hex_digit)*
oct            ::= "0o" oct_digit (("_")? oct_digit)*
bin            ::= "0b" bin_digit (("_")? bin_digit)*
dec            ::= dec_digit (("_")? dec_digit)*
hex_digit      ::= [0-9a-fA-F]
oct_digit      ::= [0-7]
bin_digit      ::= [0-1]
dec_digit      ::= [0-9]
\`\`\`

Underscore separators are allowed **between** two consecutive digits.
A leading underscore, a trailing underscore, two consecutive
underscores, or an underscore directly after the base prefix
(\`0x_\`, \`0o_\`, \`0b_\`) make the literal **not** an integer; the textual
form falls through to String per § 5.2.

A **float literal** matches one of the following two alternatives:

\`\`\`
float          ::= sign? dec_part "." dec_part exponent?
                 | sign? dec_part exponent
dec_part       ::= dec_digit (("_")? dec_digit)*
exponent       ::= ("e" | "E") sign? dec_part
\`\`\`

The first alternative requires both a decimal point and digits on
each side of the point (an exponent is optional). The second
alternative requires an exponent (no decimal point). A pure run of
digits with no \`.\` and no exponent is an integer (above), not a float.
Forms like \`1.\`, \`.5\`, \`1.2.3\`, \`1e\`, \`1e+\` do not match either
alternative and fall through to String.

`,
  ru: `
**Целочисленный литерал** соответствует следующей грамматике (где \`*\`
означает ноль или более, \`+\` — один или более, \`?\` — необязательный,
\`|\` — альтернатива):

\`\`\`
integer        ::= sign? ( hex | oct | bin | dec )
sign           ::= "+" | "-"
hex            ::= "0x" hex_digit (("_")? hex_digit)*
oct            ::= "0o" oct_digit (("_")? oct_digit)*
bin            ::= "0b" bin_digit (("_")? bin_digit)*
dec            ::= dec_digit (("_")? dec_digit)*
hex_digit      ::= [0-9a-fA-F]
oct_digit      ::= [0-7]
bin_digit      ::= [0-1]
dec_digit      ::= [0-9]
\`\`\`

Подчёркивания-разделители допускаются **между** двумя последовательными
цифрами. Ведущее подчёркивание, замыкающее подчёркивание, два
последовательных подчёркивания или подчёркивание сразу после префикса
базы (\`0x_\`, \`0o_\`, \`0b_\`) делают литерал **не** целым числом;
текстовая форма проваливается в String по § 5.2.

**Float-литерал** соответствует одной из следующих двух альтернатив:

\`\`\`
float          ::= sign? dec_part "." dec_part exponent?
                 | sign? dec_part exponent
dec_part       ::= dec_digit (("_")? dec_digit)*
exponent       ::= ("e" | "E") sign? dec_part
\`\`\`

Первая альтернатива требует и десятичную точку, и цифры с обеих
сторон точки (экспонента опциональна). Вторая альтернатива требует
экспоненту (без десятичной точки). Чистая последовательность цифр
без \`.\` и без экспоненты — это integer (выше), не float. Формы
\`1.\`, \`.5\`, \`1.2.3\`, \`1e\`, \`1e+\` не соответствуют ни одной
альтернативе и проваливаются в String.

`,
  zh: `
**整数字面量**符合如下语法(\`*\` 零或多,\`+\` 一或多,\`?\` 可选,
\`|\` 选一):

\`\`\`
integer        ::= sign? ( hex | oct | bin | dec )
sign           ::= "+" | "-"
hex            ::= "0x" hex_digit (("_")? hex_digit)*
oct            ::= "0o" oct_digit (("_")? oct_digit)*
bin            ::= "0b" bin_digit (("_")? bin_digit)*
dec            ::= dec_digit (("_")? dec_digit)*
hex_digit      ::= [0-9a-fA-F]
oct_digit      ::= [0-7]
bin_digit      ::= [0-1]
dec_digit      ::= [0-9]
\`\`\`

下划线分隔符在两个相邻数字**之间**允许。前导下划线、尾部下划线、
两个连续下划线,以及紧跟基数前缀的下划线 (\`0x_\`, \`0o_\`, \`0b_\`),
使字面**不再**是整数;文本形式按 § 5.2 回退为 String。

**浮点字面量**符合以下两个候选之一:

\`\`\`
float          ::= sign? dec_part "." dec_part exponent?
                 | sign? dec_part exponent
dec_part       ::= dec_digit (("_")? dec_digit)*
exponent       ::= ("e" | "E") sign? dec_part
\`\`\`

第一个候选要求小数点以及点两侧的数字(指数可选)。第二个候选要求
指数(无小数点)。纯数字串(无 \`.\`、无指数)是整数(上),不是浮点。
\`1.\`、\`.5\`、\`1.2.3\`、\`1e\`、\`1e+\` 等形式不符合任一候选,回退为
String。

`,
};
