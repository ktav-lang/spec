export default {
  en: `
A key segment MAY be written as a \`<quoted-segment>\` (§ 4) instead of
a \`<bare-segment>\`: opened by \`"\`, \`'\`, or \`\` \` \`\`, running to the
first unescaped occurrence of that SAME character, which closes it.
Quoting is optional and purely a writer's convenience — it changes no
Value that a bare, escaped spelling could not already produce (§ 5.5
below) — offered because a segment needing several of \`.\` / \`:\` / \`,\`
/ \`{\` / \`}\` / \`[\` / \`]\` escaped is harder to read than the same
content quoted once.

`,
  ru: `
Сегмент ключа MAY быть записан как \`<quoted-segment>\` (§ 4) вместо
\`<bare-segment>\`: открывается \`"\`, \`'\` или \`\` \` \`\`, продолжается до
первого неэкранированного вхождения ЭТОГО ЖЕ символа, который его
закрывает. Квотирование опционально и является чисто удобством
писателя — оно не меняет ни одного Value, которое уже не могло бы
произвести голое экранированное написание (§ 5.5 ниже), —
предлагается потому, что сегмент, которому нужно экранировать
несколько из \`.\` / \`:\` / \`,\` / \`{\` / \`}\` / \`[\` / \`]\`, читается хуже
того же содержимого, квотированного один раз.

`,
  zh: `
键段 MAY 写成 \`<quoted-segment>\`(§ 4)而非 \`<bare-segment>\`:由
\`"\`、\`'\` 或 \`\` \` \`\` 开启,一直延续到该同一字符的首次未 escape
出现处,由其关闭该段。加引号是可选的,纯粹是写入者的便利 —— 它
不会产生任何裸的、经过 escape 的写法本就无法产生的 Value(见下文
§ 5.5)—— 之所以提供,是因为一个需要对 \`.\` / \`:\` / \`,\` / \`{\` /
\`}\` / \`[\` / \`]\` 中好几个字符做 escape 的段,其可读性不如同一内容
只加一次引号。

`,
};
