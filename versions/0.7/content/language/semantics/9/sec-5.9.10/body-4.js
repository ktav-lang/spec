export default {
  en: `A canonical writer never actually reaches this recipe for a
\`##\`-prefixed key's first segment: form-selection rule (d) above
already routes it to quoted form before bare form is even
considered, because no escape within bullets 1-3 changes the raw
first two bytes of the emitted line. \`\\u0023#a\\:b\` (escaping
only the leading \`#\`, per the original bare-form recipe this
replaces) remains a valid, decodable, non-canonical INPUT spelling
for the key \`##a:b\` — a parser MUST still accept it — but it is
never the canonical OUTPUT: the canonical form of any key whose
content begins with \`##\` is always quoted, \`"##a:b"\`, per (d), not
\`\\u0023#a\\:b\`.

When quoted form is selected, the writer emits the segment's decoded
content between two \`"\` characters, escaping only:

- a raw \`"\` in the content, as \`\\"\` — the only byte structural
  inside a quoted segment, since \`"\` is the fixed delimiter;
- \`\\\` (backslash), as \`\\\\\` — backslash is always the escape lead,
  in both forms;
- LF / CR, as \`\\n\` / \`\\r\` — a key MUST remain single-line;
- any other control byte below \`0x20\` that is not a § 3.3
  whitespace member, or DEL, as \`\\uXXXX\` — quoting relaxes which
  STRUCTURAL bytes need escaping, not the format's separate
  prohibition on raw invisible, non-whitespace bytes in a key
  (§ 5.3.3). A control byte that IS a § 3.3 whitespace member (tab,
  VT, FF) is excluded from this bullet for the same reason it is
  excluded from bare form's analogous bullet above: § 4's
  \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` already admit it raw, so
  it needs no \`\\uXXXX\` escape here, whether it occurs at an edge or
  in the interior of the segment (see the edge-whitespace point
  below, which is not limited to non-control whitespace).

`,
  ru: `Канонический writer никогда фактически не доходит до этого
рецепта для первого сегмента ключа с префиксом \`##\`: правило (d)
выбора формы выше уже направляет его в квотированную форму до
того, как голая форма вообще рассматривается, поскольку ни одно
экранирование в пунктах 1-3 не меняет сырые первые два байта
выводимой строки. \`\\u0023#a\\:b\` (с экранированием только
ведущего \`#\`, по исходному рецепту голой формы, который эта
заметка заменяет) остаётся валидным, декодируемым неканоническим
написанием ВХОДА для ключа \`##a:b\` — парсер MUST по-прежнему
принимать его, — но это никогда не канонический ВЫВОД:
каноническая форма любого ключа, чьё содержимое начинается с
\`##\`, всегда квотированная, \`"##a:b"\`, по правилу (d), а не
\`\\u0023#a\\:b\`.

Если выбрана квотированная форма, writer выводит декодированное
содержимое сегмента между двумя символами \`"\`, экранируя только:

`,
  zh: `\`.\`、\`:\`、\`,\`、\`{\`、\`}\`、\`[\`、\`]\`、\`(\`、\`)\`、\`'\` 与 \`\` \` \`\` 在
quoted 形式中都无需 escape,边缘空白也是如此:\`<quoted-segment>\`
的内容在重解析时从不被修剪(§ 5.3.3),所以上面裸形式那一条
——为在重解析的修剪中幸存而 escape 边缘空白——在这里没有什么
需要防范的。开头的 \`##\` 在 quoted 形式中同样无需自身 escape:
该行以 \`"\` 开头,而非 \`#\`,因此 § 5.1 规则 2 的注释风险对
quoted 键根本不会出现。

`,
};
