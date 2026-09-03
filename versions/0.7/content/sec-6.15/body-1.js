export default {
  en: `
A document whose raw bytes are not valid UTF-8 (§ 3.1, § 9.3) is an
\`InvalidUtf8\` error. This check happens before any line-oriented or
grammar-level processing — a document that fails it MUST NOT also be
diagnosed with any other category in this section, since none of the
byte-oriented rules those categories depend on (line terminators,
\`<key-char>\`, escape sequences, ...) are well-defined over a byte
sequence that isn't valid UTF-8 to begin with. The error span SHOULD
point at the byte offset of the first invalid sequence.

`,
  ru: `
Документ, чьи сырые байты не являются валидным UTF-8 (§ 3.1, § 9.3),
— это ошибка \`InvalidUtf8\`. Эта проверка происходит до какой-либо
построчной или грамматической обработки — документ, не прошедший
её, MUST NOT также диагностироваться никакой другой категорией из
этого раздела, поскольку ни одно из байт-ориентированных правил, от
которых зависят эти категории (терминаторы строк, \`<key-char>\`,
escape-последовательности, ...), не определено над байтовой
последовательностью, которая изначально не является валидным UTF-8.
Span ошибки SHOULD указывать на байтовое смещение первой невалидной
последовательности.

`,
  zh: `
原始字节不是有效 UTF-8(§ 3.1、§ 9.3)的文档是 \`InvalidUtf8\` 错误。
此检查发生在任何逐行或语法层处理之前 —— 未通过此检查的文档
MUST NOT 再被诊断为本节中的任何其他类别,因为这些类别所依赖的
逐字节规则(行终止符、\`<key-char>\`、escape 序列……)在一个本身
就不是有效 UTF-8 的字节序列上都没有良好定义。错误 span SHOULD
指向第一个无效序列的字节偏移量。

`,
};
