export default {
  en: `
An inline value may itself be an inline compound:

\`\`\`
{outer: {inner: {leaf: 1}}}
[ [1, 2], [3, 4] ]
{users: [ {name: alice}, {name: bob} ]}
\`\`\`

Nesting depth is implementation-defined. The specification sets no
normative depth limit. Portable documents SHOULD avoid pathologically
deep nesting; implementations MAY enforce a depth limit and reject
overly-deep input.

`,
  ru: `
Inline-значение может само быть inline-составным:

\`\`\`
{outer: {inner: {leaf: 1}}}
[ [1, 2], [3, 4] ]
{users: [ {name: alice}, {name: bob} ]}
\`\`\`

Глубина вложенности определяется реализацией. Спецификация не задаёт
нормативный предел глубины. Переносимые документы SHOULD избегать
патологически глубокой вложенности; реализации MAY применять предел
глубины и отклонять слишком глубокий ввод.

`,
  zh: `
inline 值可以自身是 inline 复合值:

\`\`\`
{outer: {inner: {leaf: 1}}}
[ [1, 2], [3, 4] ]
{users: [ {name: alice}, {name: bob} ]}
\`\`\`

嵌套深度是 implementation-defined。规范未设规范性深度限制。可移植
文档 SHOULD 避免病态的深度嵌套;实现 MAY 施加深度限制并拒绝过深
的输入。

`,
};
