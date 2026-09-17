export default {
  en: `
A Ktav document is a sequence of lines that together describe a
hierarchical object or array. Typical use is application
configuration, where the document is written by humans, read by
programs, and diffed in version control.

The format's guiding principle is:

> **Every rule is local. Every line's meaning either is self-evident or
> depends only on visible brackets above it.**

This rules out indentation-significant whitespace (YAML),
trailing-comma arithmetic (JSON), anchors and aliases (YAML), schema
directives, and heredoc markers that cross many lines.

Compared with 0.1.x, version 0.7.0:

- Drops the typed markers \`:i\` and \`:f\`. Numbers, booleans and \`null\`
  are inferred from the lexical form of the scalar instead. The raw
  marker \`::\` is kept to force a literal String when the textual form
  would otherwise match a number / keyword.
- Adds inline compounds — \`{key: value, key2: value}\` and
  \`[v1, v2, v3]\` — usable as a value or as the entire document.
- Replaces single \`#\` comments with **double \`##\`** comments that
  occupy a whole line. A single \`#\` is now an ordinary character.

Compared with 0.5.0, version 0.7.0:

- Keys now process the full escape-sequence set (§ 3.7). Two new
  escapes — \`\\.\` (literal dot) and \`\\:\` (literal colon) — allow
  key segments to contain characters that were previously structural.
  **Breaking:** a literal backslash in a key now requires \`\\\\\`.

`,
  ru: `
Документ Ktav — это последовательность строк, которые вместе
описывают иерархический объект или массив. Типичное применение —
конфигурация приложений: документ пишется людьми, читается
программами и диффится в системе контроля версий.

Руководящий принцип формата:

> **Каждое правило локально. Смысл каждой строки либо самоочевиден,
> либо зависит только от видимых скобок выше.**

Это исключает значимые отступы (YAML), запятые-разделители (JSON),
якоря и алиасы (YAML), схемные директивы и heredoc-маркеры,
пересекающие много строк.

По сравнению с 0.1.x, версия 0.7.0:

- Убирает типизированные маркеры \`:i\` и \`:f\`. Числа, булевы и \`null\`
  выводятся из лексической формы скаляра. Сырой маркер \`::\` сохранён
  для принудительной String, когда форма иначе совпадала бы с числом
  или ключевым словом.
- Добавляет однострочные составные значения — \`{key: value, key2: value}\`
  и \`[v1, v2, v3]\` — пригодные как значение или как весь документ.
- Заменяет одиночные \`#\` комментарии на **двойные \`##\`** комментарии,
  занимающие отдельную строку. Одиночный \`#\` теперь обычный символ.

По сравнению с 0.5.0, версия 0.7.0:

- Ключи теперь обрабатывают полный набор escape-последовательностей
  (§ 3.7). Два новых escape — \`\\.\` (литеральная точка) и \`\\:\`
  (литеральное двоеточие) — позволяют сегментам ключей содержать
  символы, которые ранее были структурными. **Ломающее:** литеральный
  обратный слэш в ключе теперь требует \`\\\\\`.

`,
  zh: `
Ktav 文档是一系列行,共同描述一个层级化对象或数组。典型用途是应用
程序配置:由人书写、被程序读取、在版本控制中差异比较。

格式的指导原则:

> **每条规则都是局部的。每一行的含义要么自明,要么仅依赖于上方
> 可见的括号。**

这排除了缩进敏感(YAML)、尾部逗号约束(JSON)、锚点与别名(YAML)、
跨多行的 heredoc 标记等。

相比 0.1.x,版本 0.7.0:

- 移除了类型标记 \`:i\` 和 \`:f\`。数字、布尔、\`null\` 从标量字面形式
  推断。\`::\` 原始标记保留用于在需要时强制为 String。
- 新增**单行复合值**(inline compounds)—— \`{key: value, key2: value}\`
  与 \`[v1, v2, v3]\`,可作为值,也可作为整个文档。
- 将单 \`#\` 注释改为**双 \`##\`** 注释,且必须独占一行。单 \`#\`
  现在是普通字符。

相比 0.5.0,版本 0.7.0:

- 键现在处理完整的 escape 序列集(§ 3.7)。两个新 escape —— \`\\.\`
  (字面点)与 \`\\:\`(字面冒号)—— 允许键段包含先前为结构性的字符。
  **破坏性:** 键中的字面反斜杠现在需要 \`\\\\\`。

`,
};
