export default {
  en: `
A \`{\` or \`[\` appearing in a value-position is an
\`UnterminatedInlineCompound\` error when its quote-aware structural
scan finds no matching \`}\` / \`]\` on the same line and encounters no
invalid escape (§ 5.8). If a
same-line matching closer is present, the candidate is closed for
classification: content after that closer and other structural defects
inside it are \`MalformedInlineCompound\` (§ 6.12), not
\`UnterminatedInlineCompound\`. If that scan encounters a
\`BadEscapeSequence\` before a matching closer, \`BadEscapeSequence\`
takes precedence over the missing closer.
An unterminated quoted key is governed by § 6.16 instead: that
diagnosis takes precedence over a bad escape inside the unclosed
quoted segment.

`,
  ru: `
\`{\` или \`[\` в позиции значения — это ошибка
\`UnterminatedInlineCompound\`, если quote-aware structural scan не находит
на той же строке соответствующий \`}\` / \`]\` и не встречает недопустимую
escape-последовательность (§ 5.8). Если такой закрывающий
символ есть, кандидат считается закрытым для классификации:
содержимое после него и другие структурные дефекты внутри дают \`MalformedInlineCompound\` (§ 6.12), а не \`UnterminatedInlineCompound\`. Если
при этом сканировании до соответствующей закрывающей скобки встречается
\`BadEscapeSequence\`, эта ошибка имеет приоритет над отсутствующим закрытием.
Незакрытый quoted-ключ регулируется § 6.16: этот диагноз имеет приоритет
над ошибочной escape-последовательностью внутри незакрытого quoted-сегмента.

`,
  zh: `
值位置上出现的 \`{\` 或 \`[\`,若针对引号的结构扫描在同一行内没有找到匹配的 \`}\` / \`]\` 且未遇到无效 escape,则是
\`UnterminatedInlineCompound\` 错误(§ 5.8)。若存在同一行匹配的关闭符,则该候选值在分类时视为已关闭:关闭符后的内容以及其内部其他结构缺陷都是 \`MalformedInlineCompound\`(§ 6.12),而不是 \`UnterminatedInlineCompound\`。如果扫描在找到匹配关闭符之前遇到
\`BadEscapeSequence\`,则 \`BadEscapeSequence\` 优先于缺失关闭符。
未终止的 quoted 键改按 § 6.16 处理:该诊断优先于未闭合 quoted 段内部的错误 escape。

`,
};
