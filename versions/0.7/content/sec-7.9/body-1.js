export default {
  en: `
\`\`\`
example\\.com: prod
a\\:b: v
deep.example\\.com: 1
path\\\\to: x
\`\`\`

\`example\\.com\` is the single key \`example.com\` — the \`\\.\` is a literal
dot, not a path separator. \`a\\:b\` is the key \`a:b\` (literal colon).
\`deep.example\\.com\` nests under \`deep\` with the leaf key \`example.com\`
(the first dot splits; the escaped dot does not). \`path\\\\to\` is the key
\`path\\to\` — a literal backslash, written \`\\\\\`. Since 0.7.0, the
canonical writer (§ 5.9.10) prefers **quoted** form over
bare-with-escape whenever a structural byte (here \`.\` or \`:\`) would
otherwise need escaping, so the first three canonicalise to:

\`\`\`
"example.com": prod
"a:b": v
deep: {
    "example.com": 1
}
\`\`\`

\`path\\\\to: x\` is unchanged in canonical form — escaping only a literal
backslash does not switch the form (§ 10.7), since quoting would not
remove the need for that escape. All four still round-trip (§ 8.3);
only the byte shape of the first three changed from 0.6.x's
bare-with-escape output.

`,
  ru: `
\`\`\`
example\\.com: prod
a\\:b: v
deep.example\\.com: 1
path\\\\to: x
\`\`\`

\`example\\.com\` — это единый ключ \`example.com\`: \`\\.\` является
литеральной точкой, а не разделителем пути. \`a\\:b\` — это ключ \`a:b\`
(литеральное двоеточие). \`deep.example\\.com\` вкладывается под
\`deep\` с листовым ключом \`example.com\` (первая точка делит путь;
экранированная — нет). \`path\\\\to\` — это ключ \`path\\to\`,
литеральный обратный слэш, записанный как \`\\\\\`. Начиная с 0.7.0,
канонический писатель (§ 5.9.10) предпочитает **квотированную**
форму голой-форме-с-экранированием всякий раз, когда иначе потребовалось
бы экранировать структурный байт (здесь \`.\` или \`:\`), так что первые
три канонизируются в:

\`\`\`
"example.com": prod
"a:b": v
deep: {
    "example.com": 1
}
\`\`\`

\`path\\\\to: x\` в канонической форме не меняется: экранирование только
литерального обратного слэша не переключает форму (§ 10.7), поскольку
квотирование не устранило бы необходимость в этом экранировании. Все
четыре по-прежнему выдерживают round-trip (§ 8.3); изменилась лишь
байтовая форма первых трёх по сравнению с bare-with-escape выводом
версии 0.6.x.

`,
  zh: `
\`\`\`
example\\.com: prod
a\\:b: v
deep.example\\.com: 1
path\\\\to: x
\`\`\`

\`example\\.com\` 是单个键 \`example.com\` —— \`\\.\` 是字面点,不是路径分隔
符。\`a\\:b\` 是键 \`a:b\`(字面冒号)。\`deep.example\\.com\` 嵌套在
\`deep\` 下,叶键为 \`example.com\`(第一个点分割路径;escape 后的点
不分割)。\`path\\\\to\` 是键 \`path\\to\` —— 字面反斜杠,写作 \`\\\\\`。自
0.7.0 起,规范 writer(§ 5.9.10)只要另需对结构性字节(这里是 \`.\`
或 \`:\`)做 escape,就会优先选用**quoted** 形式而非 bare-with-escape,
因此前三个的规范形式为:

\`\`\`
"example.com": prod
"a:b": v
deep: {
    "example.com": 1
}
\`\`\`

\`path\\\\to: x\` 的规范形式不变:只 escape 字面反斜杠并不会切换形式
(§ 10.7),因为加引号并不能省去这个 escape。四者仍然都能
round-trip(§ 8.3);只是前三者的字节形态相对 0.6.x 的
bare-with-escape 输出发生了变化。

`,
};
