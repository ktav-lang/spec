export default {
  en: `
A key segment that is empty after trimming — whether the entire key
(a pair line with nothing before the separator) or one segment of a
dotted key (e.g. \`a..b\`) — is an \`EmptyKey\` error (§ 5.3.1). This
includes an empty quoted segment (\`""\`, \`''\`, \` \`\` \`) — but NOT a
quoted segment containing only whitespace (\`" "\`), since a
\`<quoted-segment>\`'s content is never trimmed (§ 5.3.3).

`,
  ru: `
Сегмент ключа, пустой после обрезки, — будь то весь ключ (строка
пары, в которой перед разделителем ничего нет) или один сегмент
точечного ключа (например, \`a..b\`) — является ошибкой \`EmptyKey\`
(§ 5.3.1). Сюда относится пустой квотированный сегмент (\`""\`, \`''\`,
\` \`\` \`) — но НЕ квотированный сегмент, содержащий только пробел
(\`" "\`), поскольку содержимое \`<quoted-segment>\` никогда не
обрезается (§ 5.3.3).

`,
  zh: `
修剪后为空的键段 —— 无论是整个键(pair 行中分隔符之前没有任何
内容),还是点分键的一个段(例如 \`a..b\`)—— 都是 \`EmptyKey\` 错误
(§ 5.3.1)。这包括空的 quoted 段(\`""\`、\`''\`、\` \`\` \`)—— 但**不**
包括仅含空白的 quoted 段(\`" "\`),因为 \`<quoted-segment>\` 的内容
从不被修剪(§ 5.3.3)。

`,
};
