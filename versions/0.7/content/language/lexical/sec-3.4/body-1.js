export default {
  en: `
A **comment** is a line whose first non-whitespace code points are \`##\`
(two ASCII \`#\` bytes). The rest of the line is the comment line. The
comment body ends immediately before the line terminator and excludes it:
CRLF, LF, and CR are never comment-body bytes. Comments produce no Value
and are ignored.

A single \`#\` byte has no special meaning: \`#-prefixed\` text on a line
without a leading \`##\` is an ordinary scalar / key character.

Comments MUST occupy their own line; trailing comments at the end of
a content line are not supported. Since comments are recognised only
at the start of a trimmed line, the literal byte pair \`##\` in the
middle of a value, key, or other content is just two \`#\` characters
and needs no escape — there is no \`\\#\` escape sequence in 0.7.0.

`,
  ru: `
**Комментарий** — это строка, первые непробельные кодовые точки
которой — \`##\` (два ASCII \`#\`-байта). Остаток строки образует строку
комментария. Тело комментария заканчивается непосредственно перед
завершителем строки и не включает его: CRLF, LF и CR никогда не являются
байтами тела комментария. Комментарии не порождают Value и игнорируются.

Одиночный байт \`#\` не имеет специального значения: \`#-начинающийся\`
текст в строке без ведущего \`##\` — это обычный символ скаляра / ключа.

Комментарии MUST занимать свою отдельную строку; завершающие
комментарии в конце содержательной строки не поддерживаются.
Поскольку комментарий распознаётся только в начале обрезанной
строки, литеральная пара байтов \`##\` в середине значения, ключа
или иного содержимого — это просто два символа \`#\` и не требует
экранирования: escape-последовательности \`\\#\` в 0.7.0 нет.

`,
  zh: `
**注释**是其首个非空白码点为 \`##\`(两个 ASCII \`#\` 字节)的行。其余部分
构成注释行;注释体在行终止符之前立即结束且不包含行终止符:
CRLF、LF 与 CR 永远不是注释体字节。注释不产生 Value,被忽略。

单个 \`#\` 字节没有特殊含义:不以 \`##\` 开头的行中,\`#-prefixed\` 文本
是普通的标量 / 键字符。

注释 MUST 独占一行;不支持行末追加注释。由于注释仅在 trim 后行首
被识别,值、键或其他内容**中间**的字面字节对 \`##\` 仅是两个 \`#\`
字符,无需 escape —— 0.7.0 没有 \`\\#\` 转义序列。

`,
};
