export default {
  en: `
- **Breaking:** Keys now process escape sequences (§ 3.7). The
  backslash byte \`\\\` is the escape lead in keys; \`\\.\` produces a
  literal dot (not a path separator); \`\\:\` produces a literal colon
  (not a pair separator); \`\\\\\` produces a literal backslash. A
  literal backslash in a key that was bare in 0.5.0 now requires
  \`\\\\\`. Two new escape sequences (\`\\.\`, \`\\:\`) are added to the
  § 3.7 table (now ten total).
- **Breaking:** The \`<key>\` / \`<segment>\` / \`<key-char>\` grammar
  productions (§ 4) are now escape-aware. The dotted-path separator
  splits only on **unescaped** \`.\`; the pair separator is the first
  **unescaped** \`:\` / \`::\`. Backslash and dot are excluded from
  \`<key-char>\` and handled via \`<key-escape>\`.
- **Changed:** § 3.7 escape-sequence list extended from eight to ten
  entries: \`\\\\\`, \`\\,\`, \`\\}\`, \`\\]\`, \`\\{\`, \`\\[\`, \`\\n\`, \`\\r\`, \`\\.\`,
  \`\\:\`. The \`\\.\` and \`\\:\` forms are no longer \`BadEscapeSequence\`.
- **Changed:** "Keys" removed from the "escape sequences are NOT
  processed in" list (§ 3.7). Keys now DO process escapes — same
  set as inline scalars.
- **Changed:** § 5.9.10 (canonical key emission) — the writer MUST
  re-escape \`\\\`, \`.\`, and \`:\` inside a key segment so that the
  output round-trips.
- **Changed:** § 6.13 \`BadEscapeSequence\` — updated to list ten
  valid escape characters (added \`.\` and \`:\`).

`,
  ru: `
- **Ломающее:** Ключи теперь обрабатывают escape-последовательности
  (§ 3.7). Обратный слэш \`\\\` является escape-лидом в ключах; \`\\.\`
  даёт литеральную точку (не разделитель пути); \`\\:\` даёт
  литеральное двоеточие (не разделитель пары); \`\\\\\` даёт литеральный
  обратный слэш. Литеральный обратный слэш в ключе, который был
  обычным байтом в 0.5.0, теперь требует \`\\\\\`. Добавлены две новые
  escape-последовательности (\`\\.\`, \`\\:\`) в таблицу § 3.7 (теперь
  десять всего).
- **Ломающее:** Грамматические правила \`<key>\` / \`<segment>\` /
  \`<key-char>\` (§ 4) теперь осведомлены об escape. Разделитель
  точечного пути разбивает только по **неэкранированным** \`.\`;
  разделитель пары — первое **неэкранированное** \`:\` / \`::\`.
  Обратный слэш и точка исключены из \`<key-char>\` и обрабатываются
  через \`<key-escape>\`.
- **Изменено:** Список escape-последовательностей § 3.7 расширен с
  восьми до десяти: \`\\\\\`, \`\\,\`, \`\\}\`, \`\\]\`, \`\\{\`, \`\\[\`, \`\\n\`, \`\\r\`,
  \`\\.\`, \`\\:\`. Формы \`\\.\` и \`\\:\` больше не являются \`BadEscapeSequence\`.
- **Изменено:** «Ключи» удалены из списка «escape-последовательности
  НЕ обрабатываются в» (§ 3.7). Ключи теперь ОБРАБАТЫВАЮТ escape —
  тот же набор, что и inline-скаляры.
- **Изменено:** § 5.9.10 (каноническая эмиссия ключей) — writer MUST
  ре-экранировать \`\\\`, \`.\` и \`:\` внутри сегмента ключа для
  обеспечения round-trip.
- **Изменено:** § 6.13 \`BadEscapeSequence\` — обновлён для перечисления
  десяти допустимых escape-символов (добавлены \`.\` и \`:\`).

`,
  zh: `
- **破坏性:** 键现在处理 escape 序列(§ 3.7)。反斜杠 \`\\\` 在键中
  为 escape 前导;\`\\.\` 产生字面点(非路径分隔符);\`\\:\` 产生字面冒
  号(非对分隔符);\`\\\\\` 产生字面反斜杠。0.5.0 中键内的字面反斜杠
  现在需要 \`\\\\\`。新增两个 escape 序列(\`\\.\`、\`\\:\`)至 § 3.7 表
  (共计十个)。
- **破坏性:** \`<key>\` / \`<segment>\` / \`<key-char>\` 语法产生式(§ 4)
  现在 escape 感知。点分路径分隔仅在**未 escape** 的 \`.\` 处进行;
  对分隔符为首个**未 escape** 的 \`:\` / \`::\`。反斜杠与点从
  \`<key-char>\` 中排除,改由 \`<key-escape>\` 处理。
- **变更:** § 3.7 escape 序列列表从八个扩展为十个:\`\\\\\`、\`\\,\`、
  \`\\}\`、\`\\]\`、\`\\{\`、\`\\[\`、\`\\n\`、\`\\r\`、\`\\.\`、\`\\:\`。\`\\.\` 与 \`\\:\`
  不再是 \`BadEscapeSequence\`。
- **变更:** 从「escape 序列不在以下场景处理」列表(§ 3.7)中移除
  「键」。键现在处理 escape —— 与 inline 标量相同的集合。
- **变更:** § 5.9.10(规范键输出)—— writer MUST 对键段中的 \`\\\`、
  \`.\` 与 \`:\` 重新 escape 以确保 round-trip。
- **变更:** § 6.13 \`BadEscapeSequence\` —— 更新为列出十个有效
  escape 字符(新增 \`.\` 与 \`:\`)。

`,
};
