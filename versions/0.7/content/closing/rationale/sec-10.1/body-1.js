export default {
  en: `
In versions 0.1.x through 0.3.x, the only way to obtain an Integer
or Float Value was to write the typed markers \`key:i 5\` /
\`key:f 0.5\`. The plain pair-form \`key: 5\` produced a String. The
markers were syntactically unique to Ktav, easy to forget, and
duplicated information the lexer already had (a string of digits
**is** a number).

0.5.0 removes the markers and infers numeric / keyword Values from
the lexical form of the scalar body. The raw marker \`::\` is kept as
the explicit "force String" override.

This is a strict-break change: documents written with \`:i\` / \`:f\`
in older versions parse differently in 0.5.0 (the \`:i\` / \`:f\` text
becomes part of the value or yields a \`MissingSeparator\` /
\`MissingSeparatorSpace\` error depending on whitespace). No
auto-migration is provided.

`,
  ru: `
В версиях 0.1.x–0.3.x единственным способом получить Value вида
Integer или Float было написать типизированные маркеры \`key:i 5\` /
\`key:f 0.5\`. Обычная парная форма \`key: 5\` давала String. Маркеры
были синтаксически уникальны для Ktav, их легко было забыть, и они
дублировали информацию, которой лексический анализатор уже
располагал (последовательность цифр **и есть** число).

0.5.0 убирает маркеры и выводит числовые / ключевые Values из
лексической формы тела скаляра. Сырой маркер \`::\` сохранён как
явное переопределение, принудительно задающее String.

Это строго-ломающее изменение: документы, написанные с \`:i\` / \`:f\`
в старых версиях, разбираются в 0.5.0 иначе (текст \`:i\` / \`:f\`
становится частью значения или даёт ошибку \`MissingSeparator\` /
\`MissingSeparatorSpace\` в зависимости от пробелов). Автоматическая
миграция не предусмотрена.

`,
  zh: `
在 0.1.x 到 0.3.x 版本中,获得 Integer 或 Float Value 的唯一方式是书写类型标记
\`key:i 5\` / \`key:f 0.5\`。普通 pair 形式 \`key: 5\` 产生 String。这些标记在语法上是
Ktav 独有的,容易忘记,并且重复了词法层面已经掌握的信息(一串数字**就是**数字)。

0.5.0 移除了这些标记,改为从标量体的词法形式推断数字/关键词 Value。raw 标记 \`::\`
保留为显式的「强制 String」覆盖。

这是一次 strict-break 变更:旧版本中以 \`:i\` / \`:f\` 书写的文档在 0.5.0 中解析结果
不同(\`:i\` / \`:f\` 文本成为值的一部分,或依空白情况产生 \`MissingSeparator\` /
\`MissingSeparatorSpace\` 错误)。不提供自动迁移。

`,
};
