export default {
  en: `
A document whose first (and only) content line is a closed inline
compound:

\`\`\`
{host: localhost, port: 8080, tags: [a, b, c]}
\`\`\`

The root Value IS that inline Object — no enclosing braces are
needed at the document level; the inline form is the document.
Same applies to a top-level inline Array:

\`\`\`
[1, 2, 3, 4]
\`\`\`

`,
  ru: `
Документ, у которого первая (и единственная) содержательная строка —
закрытое inline-составное значение:

\`\`\`
{host: localhost, port: 8080, tags: [a, b, c]}
\`\`\`

Корневое Value — это и есть данный inline-объект: на уровне
документа не нужны никакие обрамляющие скобки; inline-форма и есть
документ. То же относится к top-level inline-массиву:

\`\`\`
[1, 2, 3, 4]
\`\`\`

`,
  zh: `
首个(且唯一的)内容行是一个闭合 inline 复合值的文档:

\`\`\`
{host: localhost, port: 8080, tags: [a, b, c]}
\`\`\`

根 Value 就是该 inline Object —— 文档层不需要任何外层括号;
inline 形式本身就是文档。顶层的 inline Array 同理:

\`\`\`
[1, 2, 3, 4]
\`\`\`

`,
};
