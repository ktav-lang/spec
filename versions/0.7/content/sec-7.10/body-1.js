export default {
  en: `
\`\`\`
"cache:redis": enabled
'say "hi": now': ok
\`\`\`

\`"cache:redis"\` writes the key \`cache:redis\` directly in quoted form —
equivalent to the bare-escaped \`cache\\:redis\` of § 7.9, but without a
backslash sitting inline (§ 10.7). \`'say "hi": now'\` writes the key
\`say "hi": now\`: the single-quote delimiter needs no escape for the
embedded \`"\` characters (self-escaping, § 10.7) or the embedded \`:\`
(only the segment's own delimiter is structural inside a
\`<quoted-segment>\`, § 3.7). Both keys contain a \`:\`, so bare form
would need \`\\:\` and the canonical writer (§ 5.9.10) keeps them quoted;
the canonical delimiter is always \`"\`, so the second key's embedded
double quotes are re-escaped as \`\\"\` in canonical output:

\`\`\`
"cache:redis": enabled
"say \\"hi\\": now": ok
\`\`\`

`,
  ru: `
\`\`\`
"cache:redis": enabled
'say "hi": now': ok
\`\`\`

\`"cache:redis"\` записывает ключ \`cache:redis\` напрямую в
квотированной форме — эквивалентно bare-экранированному
\`cache\\:redis\` из § 7.9, но без обратного слэша, стоящего внутри
строки (§ 10.7). \`'say "hi": now'\` записывает ключ
\`say "hi": now\`: разделитель — одинарная кавычка — не требует
экранирования для встроенных символов \`"\` (самоэкранирование,
§ 10.7) или встроенного \`:\` (внутри \`<quoted-segment>\` структурен
только собственный разделитель сегмента, § 3.7). Оба ключа содержат
\`:\`, так что голая форма потребовала бы \`\\:\`, и канонический писатель
(§ 5.9.10) оставляет их квотированными; канонический разделитель
всегда \`"\`, так что встроенные двойные кавычки второго ключа
ре-экранируются как \`\\"\` в каноническом выводе:

\`\`\`
"cache:redis": enabled
"say \\"hi\\": now": ok
\`\`\`

`,
  zh: `
\`\`\`
"cache:redis": enabled
'say "hi": now': ok
\`\`\`

\`"cache:redis"\` 直接以 quoted 形式写出键 \`cache:redis\` ——
等价于 § 7.9 中裸转义的 \`cache\\:redis\`,但不需要在行内嵌入反斜杠
(§ 10.7)。\`'say "hi": now'\` 写出键 \`say "hi": now\`:单引号分隔符
对内嵌的 \`"\` 字符无需 escape(自我 escape,§ 10.7),对内嵌的 \`:\`
也无需 escape(在 \`<quoted-segment>\` 内部只有段自身的分隔符是
结构性的,§ 3.7)。这两个键都含有 \`:\`,因此裸形式将需要 \`\\:\`,
规范 writer(§ 5.9.10)会保持它们为 quoted 形式;规范分隔符始终是
\`"\`,因此第二个键内嵌的双引号在规范输出中被重新 escape 为 \`\\"\`:

\`\`\`
"cache:redis": enabled
"say \\"hi\\": now": ok
\`\`\`

`,
};
