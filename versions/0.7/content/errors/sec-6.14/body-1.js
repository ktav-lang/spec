export default {
  en: `
A non-blank, non-comment line that appears after a top-level inline
compound (§ 5.0.1 rules 2–3) or after the matching close line of a
lone-\`{\` / lone-\`[\` root opener (§ 5.0.1 rules 4–5) — where the
root Value has already been fully constructed — is an
\`OrphanLineAfterTopLevelInline\` error.

The category is distinct from \`MissingSeparator\` (§ 6.6) because no
further content is permitted at all, regardless of whether the
trailing line would otherwise parse as a pair, an item, or a bare
scalar. The error span SHOULD point at the offending line.

Rationale: the root kind is fixed by the first content line, and a
top-level inline root has its entire Value on that single line.
Allowing further content would either silently extend the root
(ambiguous, no clean rule for how) or change the root kind
retroactively (forbidden by § 5.0.1). The error gives a precise
explanation for documents that mistakenly continue past the root.

`,
  ru: `
Непустая не-комментарная строка, появляющаяся после top-level
inline-составного (§ 5.0.1 правила 2–3) или после строки закрытия
lone-\`{\` / lone-\`[\` корневого опенера (§ 5.0.1 правила 4–5) — где
корневое Value уже полностью построено — это ошибка
\`OrphanLineAfterTopLevelInline\`.

Категория отдельна от \`MissingSeparator\` (§ 6.6), потому что
вообще никакое дальнейшее содержание не допускается, независимо
от того, могла бы хвостовая строка распарситься как пара,
элемент или голый скаляр. Span ошибки SHOULD указывать на
offending строку.

Обоснование: тип корня фиксируется первой содержательной строкой, а
top-level inline-корень имеет всё своё Value на этой единственной
строке. Разрешение дальнейшего содержания либо неявно расширяло бы
корень (неоднозначно, чёткого правила для этого нет), либо задним
числом меняло бы тип корня (запрещено § 5.0.1). Эта ошибка даёт
точное объяснение для документов, которые по ошибке продолжаются
после корня.

`,
  zh: `
出现在顶层 inline 复合值之后(§ 5.0.1 规则 2–3)或在 lone-\`{\` /
lone-\`[\` 根开启符(§ 5.0.1 规则 4–5)的匹配关闭行之后的非空白
非注释行 —— 此时根 Value 已被完全构建 —— 为
\`OrphanLineAfterTopLevelInline\` 错误。

该类别独立于 \`MissingSeparator\`(§ 6.6),因为根本不允许任何后续
内容,无论该后续行本应被解析为对、项或裸标量。错误 span SHOULD
指向 offending 行。

理由:根类型由首条内容行固定,而 top-level inline 根的整个 Value
都在这唯一一行上。允许后续内容要么会隐式扩展根(存在歧义,没有
明确规则说明如何扩展),要么会追溯性地改变根类型(§ 5.0.1 禁止此
做法)。该错误为误在根之后继续书写内容的文档提供了准确的说明。

`,
};
