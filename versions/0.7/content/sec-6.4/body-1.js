export default {
  en: `
A key segment containing a forbidden character is an \`InvalidKey\`
error. This also covers a quoted segment (§ 5.3.3) that closes
correctly but is followed — before the next \`<unescaped-dot>\` or the
pair separator — by anything other than whitespace (\`"a"b: 1\`), and
a raw control byte or DEL occurring unescaped inside a quoted
segment (§ 4's \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` exclusions,
same prohibition as in a bare segment).

`,
  ru: `
Сегмент ключа, содержащий запрещённую кодовую точку, — это ошибка
\`InvalidKey\`. Сюда же относится квотированный сегмент (§ 5.3.3),
который закрывается корректно, но за которым — перед следующей
\`<unescaped-dot>\` или разделителем пары — следует что-либо, кроме
пробела (\`"a"b: 1\`), а также сырой управляющий байт или DEL,
встретившийся неэкранированным внутри квотированного сегмента
(исключения \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` из § 4 — тот же
запрет, что и в голом сегменте).

`,
  zh: `
键段包含禁止的码点,是 \`InvalidKey\` 错误。这也涵盖了正确闭合、
但在其后 —— 下一个 \`<unescaped-dot>\` 或 pair 分隔符之前 —— 跟着
除空白以外任何内容的 quoted 段(\`"a"b: 1\`),以及在 quoted 段内部
未经 escape 出现的裸控制字节或 DEL(§ 4 的 \`<dq-char>\` /
\`<sq-char>\` / \`<bt-char>\` 排除规则,与裸段中的禁止相同)。

`,
};
