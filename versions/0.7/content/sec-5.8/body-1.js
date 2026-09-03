export default {
  en: `
An **inline compound** is an Object or Array written on a single
line. The body of an inline compound is bounded by \`{\` / \`}\` for
Objects or \`[\` / \`]\` for Arrays. Items inside are separated by \`,\`
bytes. A trailing comma is permitted before the closing delimiter:

\`\`\`
{a: 1, b: 2}
{a: 1, b: 2,}        ; trailing comma OK
[1, 2, 3]
[1, 2, 3,]
\`\`\`

`,
  ru: `
**Inline-составное** — это Object или Array, записанный на одной
строке. Тело inline-составного ограничено \`{\` / \`}\` для Object или
\`[\` / \`]\` для Array. Элементы внутри разделены \`,\`-байтами.
Замыкающая запятая допускается перед закрывающим разделителем:

\`\`\`
{a: 1, b: 2}
{a: 1, b: 2,}        ; замыкающая запятая OK
[1, 2, 3]
[1, 2, 3,]
\`\`\`

`,
  zh: `
**inline 复合值**是写在单行上的 Object 或 Array。Object 由 \`{\` /
\`}\` 包围,Array 由 \`[\` / \`]\` 包围。内部元素以 \`,\` 分隔。尾部逗号
允许:

\`\`\`
{a: 1, b: 2}
{a: 1, b: 2,}        ; 尾部逗号 OK
[1, 2, 3]
[1, 2, 3,]
\`\`\`

`,
};
