export default {
  en: `
- Lines terminated by \`LF\` (\`0x0A\`) only — never \`CR\` or \`CR LF\`.
  No \`CR\` byte ever appears in canonical output.
- Indentation is exactly four ASCII spaces per nesting level
  (no tabs, no two-space indent).
- The document ends with a single trailing \`LF\`, except an empty
  document (root is an empty Object with no pairs), which emits
  zero bytes.

`,
  ru: `
- Строки терминируются только \`LF\` (\`0x0A\`), никогда \`CR\` или
  \`CR LF\`. Байт \`CR\` никогда не появляется в каноническом выводе.
- Отступ — ровно четыре ASCII-пробела на уровень вложенности
  (никаких табов, никаких двух пробелов).
- Документ завершается одиночным замыкающим \`LF\`, за исключением
  пустого документа (корень — пустой Object без пар), который
  выдаёт ноль байтов.

`,
  zh: `
- 行仅以 \`LF\` (\`0x0A\`) 终止;绝不使用 \`CR\` 或 \`CR LF\`。规范输出中
  绝不出现 \`CR\` 字节。
- 缩进为每个嵌套级别恰好 4 个 ASCII 空格(无制表符)。
- 文档以单个尾部 \`LF\` 结束,空文档(根为无对的空 Object)除外,
  其输出零字节。

`,
};
