export default {
  en: `
A \`\\X\` form inside an inline scalar value or a key (§ 3.7) where
\`X\` is not one of \`\\\`, \`,\`, \`}\`, \`]\`, \`{\`, \`[\`, \`n\`, \`r\`, \`.\`, \`:\`,
\`"\`, \`'\`, \`\` \` \`\`, \`u\` is a \`BadEscapeSequence\` error. End-of-line
directly after a
backslash (i.e. \`\\\` with no following byte before the line
terminator) is also a \`BadEscapeSequence\` error — the inline scalar
context never crosses a line boundary (§ 3.2).

A \`\\u\` not immediately followed by exactly four hexadecimal digits
(§ 3.7.1) is also a \`BadEscapeSequence\` error, as is a lone
surrogate — a high surrogate not immediately followed by a valid
low-surrogate \`\\uXXXX\` escape, or a low surrogate not immediately
preceded by a high-surrogate \`\\uXXXX\` escape.

For precedence against \`UnterminatedInlineCompound\`, an inline
compound is scanned left to right with its quote-aware, escape-aware
delimiter rules. If an invalid escape is encountered before a matching
same-line closer, \`BadEscapeSequence\` is reported immediately and
takes precedence over the missing closer. If no invalid escape is
encountered, the absence of a same-line matching closer is
\`UnterminatedInlineCompound\`; escaped delimiters remain opaque during
the scan. An unterminated quoted key is the exception: it remains
quote-opaque and is diagnosed as \`UnterminatedInlineCompound\` per
§ 6.16, including when an otherwise bad escape occurs inside that
unclosed quoted segment.

`,
  ru: `
\`BadEscapeSequence\` (§ 3.7). Форма \`\\X\` внутри inline-скалярного
значения или ключа, где \`X\` не является одним из \`\\\`, \`,\`, \`}\`, \`]\`,
\`{\`, \`[\`, \`n\`, \`r\`, \`.\`, \`:\`,
\`"\`, \`'\`, \`\` \` \`\`, \`u\` — ошибка \`BadEscapeSequence\`. Конец
строки сразу после обратного слэша (т.е. \`\\\` без следующего байта
до завершителя строки) — также ошибка \`BadEscapeSequence\`;
inline-скалярный контекст не пересекает границу строки (§ 3.2).

\`\\u\`, за которым сразу не следуют ровно четыре шестнадцатеричные
цифры (§ 3.7.1), — также ошибка \`BadEscapeSequence\`, как и одинокий
суррогат: высокий суррогат, за которым сразу не следует валидная
low-surrogate escape-последовательность \`\\uXXXX\`, либо низкий
суррогат, которому не предшествует непосредственно
high-surrogate escape-последовательность \`\\uXXXX\`.

Для приоритета относительно \`UnterminatedInlineCompound\` inline-составное
сканируется слева направо с учётом его quote-aware и escape-aware правил
разделителей. Если до соответствующего закрывающего символа на той же
строке встречается недопустимая escape-последовательность, немедленно
сообщается \`BadEscapeSequence\`, имеющая приоритет над отсутствующим
закрытием. Если недопустимой escape-последовательности нет, отсутствие
соответствующего закрывающего символа на той же строке означает
\`UnterminatedInlineCompound\`; экранированные разделители при этом
остаются непрозрачными. Незакрытый quoted-ключ является исключением:
он остаётся непрозрачным для кавычек и диагностируется как
\`UnterminatedInlineCompound\` по § 6.16, в том числе если внутри этого
незакрытого quoted-сегмента встречается иная ошибочная escape-последовательность.

`,
  zh: `
\`BadEscapeSequence\`(§ 3.7)。inline 标量值或键中的 \`\\X\` 形式,
其中 \`X\` 不是 \`\\\`、\`,\`、\`}\`、\`]\`、\`{\`、\`[\`、\`n\`、\`r\`、\`.\`、\`:\`、
\`"\`、\`'\`、\`\` \` \`\`、\`u\`
之一,为 \`BadEscapeSequence\` 错误。反斜杠后紧随行末(即 \`\\\` 与
行终止符之间无字节)亦为 \`BadEscapeSequence\` 错误 —— inline
标量上下文不跨越行边界(§ 3.2)。

\`\\u\` 之后没有紧跟恰好四位十六进制数字(§ 3.7.1),同样是
\`BadEscapeSequence\` 错误;孤立代理项也是 —— 即高代理项之后没有
紧跟合法的低代理项 \`\\uXXXX\` escape,或低代理项之前没有紧跟高
代理项。

关于与\`UnterminatedInlineCompound\`的优先级,inline 复合值按从左到右
扫描,并使用其 quote-aware、escape-aware 的分隔符规则。若在同一行找到
匹配闭合符之前遇到无效 escape,立即报告\`BadEscapeSequence\`,其优先级
高于缺失闭合符。若未遇到无效 escape,同一行不存在匹配闭合符才表示
\`UnterminatedInlineCompound\`;扫描期间被 escape 的分隔符保持不透明。
未终止的 quoted 键是例外:它保持引号不透明,并按 § 6.16 诊断为
\`UnterminatedInlineCompound\`,即使该未闭合 quoted 段内部还出现其他错误 escape。

`,
};
