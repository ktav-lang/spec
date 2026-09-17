export default {
  en: `
A \`}\` or \`]\` on a line that does not match the innermost open
Object/Array (§ 5.1 rules 5–6) is an \`UnbalancedBracket\` error. An
Object, Array, or multi-line string left open at end-of-file — its
matching \`}\`, \`]\`, \`)\`, or \`))\` never found — is an
\`UnclosedCompound\` error.

\`)\` and \`))\` are never close-tokens outside this second case: inside
an open multi-line string, a line that does not match that string's
own terminator (§ 5.6) is read as ordinary content (§ 5.1 rule 3),
not an error; outside any open multi-line string, \`)\` and \`))\` are
ordinary array-item or pair-value text (§ 5.2, § 5.4) like any other
line.

`,
  ru: `
\`}\` или \`]\` в строке, которая не соответствует самому внутреннему
открытому Object/Array (§ 5.1 правила 5–6), — это ошибка
\`UnbalancedBracket\`. Object, Array или многострочная строка,
оставшиеся открытыми к концу файла (соответствующая \`}\`, \`]\`, \`)\`
или \`))\` так и не найдена) — это ошибка \`UnclosedCompound\`.

\`)\` и \`))\` никогда не являются закрывающими токенами вне этого
второго случая: внутри открытой многострочной строки любая строка,
не совпадающая с её собственным терминатором (§ 5.6), читается как
обычное содержимое (§ 5.1 правило 3), а не как ошибка; вне любой
открытой многострочной строки \`)\` и \`))\` — обычный текст элемента
массива / значения пары (§ 5.2, § 5.4), как и любая другая строка.

`,
  zh: `
若某行上的 \`}\` 或 \`]\` 与最内层已开启的 Object/Array
(§ 5.1 规则 5–6)不匹配,则为 \`UnbalancedBracket\` 错误。
在文件末尾仍未关闭的 Object、Array 或多行字符串 —— 其匹配的
\`}\`、\`]\`、\`)\` 或 \`))\` 始终未被找到 —— 是 \`UnclosedCompound\`
错误。

在第二种情形之外,\`)\` 与 \`))\` 绝不是关闭符:在已开启的多行
字符串内,与该字符串自身的终止符(§ 5.6)不匹配的行被读作普通
内容(§ 5.1 规则 3),而不是错误;在任何已开启的多行字符串之外,
\`)\` 与 \`))\` 是普通的数组项 / 对值文本(§ 5.2、§ 5.4),与任何
其他行一样。

`,
};
