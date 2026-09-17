export default {
  en: `
\`\`\`
literal_true:: true
literal_zero:: 0
literal_hex:: 0xFF
literal_path:: /usr/local/bin
literal_comma_only:: just,a,comma,separated,plain,string
\`\`\`

All values above are Strings, not their inferred types. The raw
marker forces String dispatch unconditionally. Note that escape
processing does **not** apply in this multi-line raw form — \`\\n\`
inside the body is the two characters \`\\\` and \`n\`.

`,
  ru: `
\`\`\`
literal_true:: true
literal_zero:: 0
literal_hex:: 0xFF
literal_path:: /usr/local/bin
literal_comma_only:: just,a,comma,separated,plain,string
\`\`\`

Все значения выше — Strings, а не их выведенные типы. Raw-маркер
безусловно заставляет диспетчеризовать тело как String. Обратите
внимание: в этой многострочной raw-форме обработка
escape-последовательностей **не** выполняется — \`\\n\` внутри тела —
это два символа, \`\\\` и \`n\`.

`,
  zh: `
\`\`\`
literal_true:: true
literal_zero:: 0
literal_hex:: 0xFF
literal_path:: /usr/local/bin
literal_comma_only:: just,a,comma,separated,plain,string
\`\`\`

以上所有值都是 String,而非其推断出的类型。raw 标记无条件地
强制按 String 分发。注意:在这种多行 raw 形式中**不**进行
escape 处理 —— 体内的 \`\\n\` 是 \`\\\` 与 \`n\` 两个字符。

`,
};
