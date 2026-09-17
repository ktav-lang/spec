export default {
  en: `
In a multi-line pair line, the separator \`:\` / \`::\` MUST be followed
by at least one whitespace code point or end-of-line. A glued form
(\`key:value\` / \`key::value\`) is a \`MissingSeparatorSpace\` error.
The same rule applies to an array-item line whose trimmed content begins
with \`::\`: \`::x\` commits to the raw-marker form and is
\`MissingSeparatorSpace\`, never a scalar fallback.

Inline-compound pairs (§ 5.8) do NOT require whitespace after the
separator and so do NOT raise this error.

`,
  ru: `
В многострочной pair line разделитель \`:\` / \`::\` MUST сопровождаться
как минимум одной пробельной кодовой точкой или концом строки. Склеенная
форма (\`key:value\` / \`key::value\`) является ошибкой \`MissingSeparatorSpace\`.
То же правило действует для строки array-item, чьё обрезанное содержимое
начинается с \`::\`: \`::x\` фиксируется как raw-marker и является
\`MissingSeparatorSpace\`, а не откатом к скаляру.

Inline-пары (§ 5.8) НЕ требуют пробела и НЕ дают этой ошибки.

`,
  zh: `
多行 pair line 内,\`:\` / \`::\` MUST 后接至少一个空白码点或行末。
粘连形式(\`key:value\` / \`key::value\`)是 \`MissingSeparatorSpace\` 错误。
同一规则适用于 trim 后以 \`::\` 开头的 array-item line:\`::x\` 一旦
确定为 raw-marker 形式即是 \`MissingSeparatorSpace\`,绝不能回退为标量。

inline 对(§ 5.8)**不**要求且**不**报此错误。

`,
};
