export default {
  en: `
Single \`#\` was reserved as the comment marker through 0.4.x.
However, \`#\` is a very common character in real-world configuration
values (hashtags, fragment identifiers, hex colors, password
separators, …). 0.5.0 doubles the marker to \`##\` and frees the
single \`#\` for use as an ordinary character.

Because the comment marker is recognised only at the start of a
trimmed line (§ 3.4), the literal two-byte sequence \`##\` in the
middle of a value or key is unambiguously two \`#\` characters — no
escape sequence is needed or defined. The 0.4.x-era \`#\\#\` escape
is gone with the rest of the single-\`#\` machinery; the design now
relies purely on positional disambiguation (line-start only) rather
than on an in-value escape.

`,
  ru: `
Одиночный \`#\` был зарезервирован как маркер комментария вплоть до
0.4.x. Однако \`#\` — очень частый символ в реальных конфигурационных
значениях (хэштеги, идентификаторы фрагментов, hex-цвета,
разделители паролей, …). 0.5.0 удваивает маркер до \`##\` и
освобождает одиночный \`#\` для использования как обычного символа.

Поскольку маркер комментария распознаётся только в начале
обрезанной строки (§ 3.4), литеральная двухбайтовая
последовательность \`##\` в середине значения или ключа — однозначно
два символа \`#\`; escape-последовательность не нужна и не определена.
Escape \`#\\#\` эпохи 0.4.x исчез вместе с остальным механизмом
одиночного \`#\`; дизайн теперь опирается чисто на различение по
позиции (только начало строки), а не на escape внутри значения.

`,
  zh: `
单一 \`#\` 在 0.4.x 及之前被保留为注释标记。然而 \`#\` 在现实配置值中极为常见(话题
标签、片段标识符、十六进制颜色、密码分隔符、……)。0.5.0 将标记加倍为 \`##\`,
把单一 \`#\` 释放为普通字符。

由于注释标记只在 trim 后的行首被识别(§ 3.4),值或键中间的字面两字节序列 \`##\`
无歧义地就是两个 \`#\` 字符 —— 不需要也不定义任何 escape 序列。0.4.x 时代的 \`#\\#\`
escape 随其余单 \`#\` 机制一同移除;设计现在完全依赖位置消歧(仅行首),而不是值内
escape。

`,
};
