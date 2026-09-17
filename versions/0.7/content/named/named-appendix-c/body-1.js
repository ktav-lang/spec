export default {
  en: `
One breaking change must be addressed when migrating a 0.5.0
document to 0.6.0:

1. **Backslash in keys is now an escape lead.** In 0.5.0, a
   backslash byte \`\\\` inside a key was a literal character. In
   0.6.0, \`\\\` starts an escape sequence. If any key contains a
   literal backslash, replace \`\\\` with \`\\\\\`. This is rare in
   practice — backslashes in key names are uncommon in
   configuration files.

Additionally, keys can now contain literal dots and colons via
\`\\.\` and \`\\:\`, enabling key names like \`example.com\` or \`a:b\`
that were previously impossible to express.

`,
  ru: `
Одно ломающее изменение требует внимания при миграции 0.5.0-документа
на 0.6.0:

1. **Обратный слэш в ключах теперь escape-лид.** В 0.5.0 байт
   обратной косой \`\\\` внутри ключа был литеральным символом. В 0.6.0
   \`\\\` начинает escape-последовательность. Если какой-либо ключ
   содержит литеральный обратный слэш, замените \`\\\` на \`\\\\\`. На
   практике это редкость — обратные слэши в именах ключей нетипичны
   для конфигурационных файлов.

Кроме того, ключи теперь могут содержать литеральные точки и
двоеточия через \`\\.\` и \`\\:\`, позволяя имена ключей вроде
\`example.com\` или \`a:b\`, которые ранее невозможно было выразить.

`,
  zh: `
一个破坏性变更需在 0.5.0 文档迁移到 0.6.0 时处理:

1. **键中的反斜杠现为 escape 前导。** 0.5.0 中键内的反斜杠 \`\\\`
   是字面字符;0.6.0 中 \`\\\` 开始一个 escape 序列。若任何键含字面
   反斜杠,将 \`\\\` 替换为 \`\\\\\`。实践中较罕见 —— 键名中的反斜杠在
   配置文件中并不常见。

此外,键现在可通过 \`\\.\` 与 \`\\:\` 包含字面点与冒号,从而表达诸如
\`example.com\` 或 \`a:b\` 之类先前无法表示的键名。

`,
};
