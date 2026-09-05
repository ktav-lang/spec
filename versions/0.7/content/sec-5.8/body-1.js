export default {
  en: `
An **inline compound** is an Object or Array written on a single
line. The body of an inline compound is bounded by \`{\` / \`}\` for
Objects or \`[\` / \`]\` for Arrays. Items inside are separated by \`,\`
bytes. A trailing comma is permitted before the closing delimiter:

\`\`\`
{a: 1, b: 2}
{a: 1, b: 2,}
[1, 2, 3]
[1, 2, 3,]
\`\`\`

The second Object and the fourth Array show the permitted single
trailing comma; the comma is syntax, not an inline comment.

`,
  ru: `
**Inline-составное** — это Object или Array, записанный на одной
строке. Тело inline-составного ограничено \`{\` / \`}\` для Object или
\`[\` / \`]\` для Array. Элементы внутри разделены \`,\`-байтами.
Замыкающая запятая допускается перед закрывающим разделителем:

\`\`\`
{a: 1, b: 2}
{a: 1, b: 2,}
[1, 2, 3]
[1, 2, 3,]
\`\`\`

Во втором Object и четвёртом Array показана допустимая одна
замыкающая запятая; запятая является синтаксисом, а не inline-комментарием.

`,
  zh: `
**inline 复合值**是写在单行上的 Object 或 Array。Object 由 \`{\` /
\`}\` 包围,Array 由 \`[\` / \`]\` 包围。内部元素以 \`,\` 分隔。尾部逗号
允许:

\`\`\`
{a: 1, b: 2}
{a: 1, b: 2,}
[1, 2, 3]
[1, 2, 3,]
\`\`\`

第二个 Object 与第四个 Array 展示允许的单个尾部逗号;该逗号是语法,
不是 inline 注释。

`,
};
