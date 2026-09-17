export default {
  en: `
Two pairs in the same Object with the same effective key (after
dotted-key expansion, § 5.3.2) produce a \`DuplicateKey\` error
(§ 6.2). The error span SHOULD point at the offending key on the
duplicating line, not at the first occurrence. Implementations MAY
additionally include a span pointing at the first occurrence as
context.

`,
  ru: `
Две пары в одном Object с одинаковым эффективным ключом (после
разворачивания точечного ключа, § 5.3.2) порождают ошибку
\`DuplicateKey\` (§ 6.2). Span ошибки SHOULD указывать на дублирующий
ключ на дублирующей строке, не на первое вхождение. Реализации MAY
дополнительно включать span, указывающий на первое вхождение, как
контекст.

`,
  zh: `
同一 Object 中两个具有相同有效键(点分键展开后,§ 5.3.2)的对
产生 \`DuplicateKey\` 错误(§ 6.2)。错误 span SHOULD 指向重复行上
的键,而非首次出现处。实现 MAY 额外包含指向首次出现处的 span
作为上下文。

`,
};
