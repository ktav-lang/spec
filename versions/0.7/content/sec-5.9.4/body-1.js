export default {
  en: `
- **Object value (non-empty):** \`key: {\` followed by a newline,
  followed by each pair on its own line at indent level + 1,
  followed by a closing \`}\` on its own line at the current indent
  level.
- **Array value (non-empty):** \`key: [\` followed by a newline,
  followed by each item on its own line at indent level + 1,
  followed by a closing \`]\` on its own line at the current indent
  level.
- **Empty Object value:** \`key: {}\` on a single line.
- **Empty Array value:** \`key: []\` on a single line.
- Inline compounds (other than empty \`{}\` / \`[]\`) are NEVER
  emitted in canonical form. Inline compounds in the input are
  valid syntactic sugar; the canonical form is always multi-line.

`,
  ru: `
- **Object value (непустой):** \`key: {\` плюс новая строка, затем
  каждая пара на своей строке на уровне отступа + 1, затем
  закрывающая \`}\` на своей строке на текущем уровне отступа.
- **Array value (непустой):** \`key: [\` плюс новая строка, затем
  каждый элемент на своей строке на уровне отступа + 1, затем
  закрывающая \`]\` на своей строке на текущем уровне отступа.
- **Пустой Object value:** \`key: {}\` одной строкой.
- **Пустой Array value:** \`key: []\` одной строкой.
- Inline-составные (кроме пустых \`{}\` / \`[]\`) НИКОГДА не выводятся
  в канонической форме.

`,
  zh: `
- **非空 Object 值:** \`key: {\` 后接换行、每对在缩进 + 1 的行上、
  关闭 \`}\` 在当前缩进的自身行上。
- **非空 Array 值:** \`key: [\` 后接换行、每项在缩进 + 1 的行上、
  关闭 \`]\` 在当前缩进的自身行上。
- **空 Object 值:** \`key: {}\` 单行。
- **空 Array 值:** \`key: []\` 单行。
- 除空 \`{}\` / \`[]\` 外,inline 复合值**绝不**以规范形式输出。

`,
};
