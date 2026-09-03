export default {
  en: `
A line terminator is one of three byte sequences:

- \`LF\` (\`0x0A\`)
- \`CR\` (\`0x0D\`)
- \`CR LF\` (\`0x0D 0x0A\`)

Implementations MUST treat all three as equivalent line terminators.
A document MAY have a final line without a trailing terminator.

A \`CR\` byte never appears as a content byte at parse time: it is
always a terminator (alone or paired with a following \`LF\`). A
String value can carry a \`CR\` byte via the \`\\r\` escape sequence, or
via the generic \`\\uXXXX\` escape naming code point 000D, inside an
inline scalar (§ 3.7, § 3.7.1, § 5.8); such a Value is not
representable in canonical form (§ 5.9.7).

Inside an inline compound (§ 5.8), the parser MUST NOT cross a line
terminator: an unclosed inline compound at end-of-line is an error
(§ 6.11).

`,
  ru: `
Завершителем строки является одна из трёх байтовых последовательностей:

- \`LF\` (\`0x0A\`)
- \`CR\` (\`0x0D\`)
- \`CR LF\` (\`0x0D 0x0A\`)

Реализации MUST трактовать все три как эквивалентные завершители.
Документ MAY иметь последнюю строку без замыкающего завершителя.

Байт \`CR\` никогда не появляется как содержательный байт на этапе
разбора: он всегда является завершителем (один или в паре со следующим
\`LF\`). String-значение может нести байт \`CR\` через escape-
последовательность \`\\r\` либо через обобщённый escape \`\\uXXXX\`,
называющий кодовую точку 000D, внутри однострочного скаляра
(§ 3.7, § 3.7.1, § 5.8); такое Value не представимо в канонической
форме (§ 5.9.7).

Внутри однострочного составного значения (§ 5.8) парсер MUST NOT
пересекать завершитель строки: незакрытое однострочное составное в
конце строки — это ошибка (§ 6.11).

`,
  zh: `
行终止符是以下三种字节序列之一:

- \`LF\` (\`0x0A\`)
- \`CR\` (\`0x0D\`)
- \`CR LF\` (\`0x0D 0x0A\`)

实现 MUST 将这三者视为等价的行终止符。文档 MAY 最后一行没有终止符。

\`CR\` 字节在解析时绝不出现为内容字节:它始终是终止符(单独或与紧随的
\`LF\` 配对)。String 值能通过 inline 标量(§ 3.7、§ 3.7.1、§ 5.8)中的
\`\\r\` 转义序列,或指称码点 000D 的通用 \`\\uXXXX\` escape,携带 \`CR\`
字节;此类 Value 在规范形式中不可表示(§ 5.9.7)。

在单行复合值内(§ 5.8),解析器 MUST NOT 跨越行终止符:在行末未关闭
的单行复合值是错误(§ 6.11)。

`,
};
