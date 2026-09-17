export default {
  en: `
A Ktav document is a sequence of Unicode code points encoded as UTF-8.
Implementations MUST reject documents that are not valid UTF-8, with
an \`InvalidUtf8\` error (§ 6.15). A parser-conforming implementation
MUST skip exactly one leading byte-order mark (U+FEFF) if it is the
very first code point of the document, before any other byte; the
canonical writer (§ 5.9) MUST NOT emit a leading byte-order mark. A
U+FEFF code point anywhere else in the document is ordinary content —
§ 3.3 does not classify it as whitespace.

`,
  ru: `
Документ Ktav — последовательность Unicode-кодовых точек,
закодированная в UTF-8. Реализации MUST отвергать документы, не
являющиеся корректным UTF-8, с ошибкой \`InvalidUtf8\` (§ 6.15).
Parser-conforming реализация MUST пропускать ровно один ведущий
маркер порядка байтов (U+FEFF), если он является самой первой
кодовой точкой документа, перед любым другим байтом; канонический
писатель (§ 5.9) MUST NOT выводить ведущий маркер порядка байтов.
Кодовая точка U+FEFF в любом другом месте документа — обычное
содержимое: § 3.3 не относит её к пробельным символам.

`,
  zh: `
Ktav 文档是以 UTF-8 编码的 Unicode 码点序列。实现 MUST 以
\`InvalidUtf8\` 错误(§ 6.15)拒绝非 UTF-8 文档。若字节顺序标记
(U+FEFF)是文档的第一个码点、位于任何其他字节之前,parser-conforming
实现 MUST 跳过恰好一个这样的前导字节顺序标记;规范写入器(§ 5.9)
MUST NOT 输出前导字节顺序标记。文档中任何其他位置的 U+FEFF
码点都是普通内容 —— § 3.3 未将其归类为空白。

`,
};
