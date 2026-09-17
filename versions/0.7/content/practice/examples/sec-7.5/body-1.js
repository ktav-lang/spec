export default {
  en: `
\`\`\`
tags: [hello\\, world, line1\\nline2, contains\\}brace]
path: {win: C:\\\\Users\\\\alice, unix: /home/alice}
\`\`\`

\`tags[0]\` is \`String("hello, world")\` (comma escaped),
\`tags[1]\` is \`String("line1\\nline2")\` (with embedded newline),
\`tags[2]\` is \`String("contains}brace")\`. Both \`path\` values are
literal paths.

`,
  ru: `
\`\`\`
tags: [hello\\, world, line1\\nline2, contains\\}brace]
path: {win: C:\\\\Users\\\\alice, unix: /home/alice}
\`\`\`

\`tags[0]\` — \`String("hello, world")\` (запятая экранирована),
\`tags[1]\` — \`String("line1\\nline2")\` (со встроенным переводом
строки), \`tags[2]\` — \`String("contains}brace")\`. Оба значения
\`path\` — литеральные пути.

`,
  zh: `
\`\`\`
tags: [hello\\, world, line1\\nline2, contains\\}brace]
path: {win: C:\\\\Users\\\\alice, unix: /home/alice}
\`\`\`

\`tags[0]\` 是 \`String("hello, world")\`(逗号被 escape),
\`tags[1]\` 是 \`String("line1\\nline2")\`(内嵌换行),
\`tags[2]\` 是 \`String("contains}brace")\`。两个 \`path\` 值都是
字面路径。

`,
};
