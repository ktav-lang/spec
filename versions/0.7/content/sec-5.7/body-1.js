export default {
  en: `
The four sequences \`{}\`, \`[]\`, \`()\`, \`(())\` may appear as a
value-start (per § 5.2 rules 5 and corresponding inline rules) and
denote:

| Sequence | Value |
|----------|-------|
| \`{}\`     | empty Object |
| \`[]\`     | empty Array |
| \`()\`     | empty String |
| \`(())\`   | empty String |

These exist so that an empty compound is expressible on a single
line.

`,
  ru: `
Четыре последовательности \`{}\`, \`[]\`, \`()\`, \`(())\` могут появиться
как value-start и обозначают:

| Последовательность | Value |
|----------|-------|
| \`{}\`     | пустой Object |
| \`[]\`     | пустой Array |
| \`()\`     | пустая String |
| \`(())\`   | пустая String |

Они существуют для того, чтобы пустое составное значение можно было
выразить одной строкой.

`,
  zh: `
四个序列 \`{}\`、\`[]\`、\`()\`、\`(())\` 可以作为 value-start 出现(依据
§ 5.2 规则 5 及相应的 inline 规则),并表示:

| 序列 | Value |
|----------|-------|
| \`{}\`     | 空 Object |
| \`[]\`     | 空 Array |
| \`()\`     | 空 String |
| \`(())\`   | 空 String |

这些形式的存在是为了让空复合值可以用单独一行表达。

`,
};
