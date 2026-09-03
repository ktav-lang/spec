export default {
  en: `
A line dispatched to pair-line mode that contains no
**unescaped** \`:\` separator is a \`MissingSeparator\` error. This
applies inside the body of an open multi-line Object, or at the
top level when the root is an Object. When the specific reason no
separator was found is an unterminated quoted key segment (§ 5.3.3),
the more specific \`UnterminatedQuotedKey\` (§ 6.16) is reported
instead.

`,
  ru: `
\`MissingSeparator\` — строка в pair-line-режиме без
**неэкранированного** \`:\`-разделителя. Применимо внутри тела
открытого многострочного Object или на верхнем уровне, когда
корень — Object.

`,
  zh: `
\`MissingSeparator\` —— 派发到 pair-line 模式但无**未 escape** 的 \`:\` 分隔符的行。
适用于打开的多行 Object 体内,或顶层根为 Object 时。

`,
};
