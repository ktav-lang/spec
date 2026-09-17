export default {
  en: `  The same opacity applies to the **comma** that splits an inline
  compound's body into elements/pairs (§ 5.8, § 5.8.3, § 6.12) — not
  only to bracket-balance detection above. A comma between a
  \`<quoted-segment>\`'s opening and closing delimiter is ordinary
  content, not an element/pair separator, for the identical reason a
  bracket inside one is not a structural delimiter: it is read as
  ordinary content before the comma-splitting scan ever reaches a
  position where a \`,\` could be recognised as structural. \`{"a,b": 1,
  c: 2}\` is therefore unambiguously exactly two pairs — key \`a,b\`
  mapped to \`1\`, and key \`c\` mapped to \`2\` — never three
  comma-delimited fields; the comma inside the quoted key does not
  count as a pair separator, and so cannot itself introduce a leading
  comma, an empty inline-array item, or a "two or more consecutive
  commas" defect (§ 6.12) — it was never a splitting position to
  begin with.

`,
  ru: `  Та же непрозрачность применяется к **запятой**, разделяющей тело
  inline-составного на элементы/пары (§ 5.8, § 5.8.3, § 6.12) — не
  только к обнаружению баланса скобок выше. Запятая между открывающим
  и закрывающим разделителями \`<quoted-segment>\` — обычное
  содержимое, а не разделитель элемента/пары, по той же причине, по
  которой скобка внутри него не является структурным разделителем:
  она читается как обычное содержимое до того, как сканирование,
  разбивающее по запятым, вообще достигает позиции, где \`,\` могла бы
  быть распознана как структурная. \`{"a,b": 1, c: 2}\` поэтому
  однозначно ровно две пары — ключ \`a,b\`, отображённый на \`1\`, и
  ключ \`c\`, отображённый на \`2\`, — никогда не три поля, разделённых
  запятыми; запятая внутри квотированного ключа не считается
  разделителем пар и потому сама не может ввести ни ведущую запятую,
  ни пустой элемент inline-массива, ни дефект «две или более подряд
  идущих запятых» (§ 6.12) — она никогда и не была позицией
  разделения.

`,
  zh: `  同样的不透明性也适用于把 inline 复合值的 body 拆分为
  元素/pair 的**逗号**(§ 5.8、§ 5.8.3、§ 6.12)—— 不仅限于上面的
  括号平衡检测。\`<quoted-segment>\` 开启与关闭分隔符之间的逗号是
  普通内容,不是元素/pair 分隔符,原因与其内部的括号不是结构性
  分隔符相同:它作为普通内容被读取,早于按逗号拆分的扫描到达本可
  将 \`,\` 识别为结构性的位置。\`{"a,b": 1, c: 2}\` 因此明确恰好是
  两个 pair —— 键 \`a,b\` 映射到 \`1\`,键 \`c\` 映射到 \`2\` —— 绝不是
  三个以逗号分隔的字段;quoted 键内的逗号不算作 pair 分隔符,因此
  它本身也不能引入前导逗号、空的 inline 数组项,或「两个及以上
  连续逗号」缺陷(§ 6.12)—— 它从来就不是一个拆分位置。

`,
};
