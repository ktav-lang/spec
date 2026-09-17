export default {
  en: `
An inline pair is \`key: value\` or \`key:: value\`. The semantics
follow § 5.3:

- Plain \`:\` dispatches the value through § 5.2 (type inference).
- Raw \`::\` interprets the value as a literal String (no inference,
  but **escape sequences ARE processed** per § 3.7).

Empty value (\`{a:}\`, \`{a::}\`) is an empty String — this is
deliberate: an explicitly empty pair value is semantically
meaningful (an "explicitly empty" field), and the form is concise.

`,
  ru: `
Inline-пара — \`key: value\` или \`key:: value\`. Семантика по § 5.3:

- Обычный \`:\` диспетчеризует значение через § 5.2.
- Сырой \`::\` интерпретирует значение как литеральную String (без
  вывода типа, но **escape-последовательности ОБРАБАТЫВАЮТСЯ** по
  § 3.7).

Пустое значение (\`{a:}\`, \`{a::}\`) — пустая String. Это намеренно:
явно пустое значение пары семантически осмысленно («явно пустое»
поле), и форма компактна.

`,
  zh: `
inline 对为 \`key: value\` 或 \`key:: value\`。语义同 § 5.3:

- 普通 \`:\` 通过 § 5.2 分发。
- 原始 \`::\` 视值为字面 String,但**escape 序列仍被处理**(§ 3.7)。

空值(\`{a:}\`、\`{a::}\`)是空 String。这是有意为之:显式的空对值
在语义上是有意义的(「显式为空」字段),形式也很紧凑。

`,
};
