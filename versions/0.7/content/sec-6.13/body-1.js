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

`,
};
