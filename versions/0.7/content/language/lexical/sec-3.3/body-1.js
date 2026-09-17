export default {
  en: `
A **whitespace** code point is one of the following twenty-five,
enumerated exhaustively — this is Unicode's \`White_Space\` property as
of Unicode 6.3 (2013), fixed here as a closed list rather than by
reference to "the current version of Unicode":

\`U+0009\`, \`U+000A\`, \`U+000B\`, \`U+000C\`, \`U+000D\`, \`U+0020\`, \`U+0085\`,
\`U+00A0\`, \`U+1680\`, \`U+2000\`–\`U+200A\`, \`U+2028\`, \`U+2029\`, \`U+202F\`,
\`U+205F\`, \`U+3000\`.

Implementations MUST recognise exactly this set, no more and no
fewer, wherever this specification says "whitespace" or "trimmed" —
never delegate to a host language's built-in Unicode-whitespace
primitive, even one that currently matches this list exactly (Rust's
\`char::is_whitespace()\` is \`White_Space\`-exact today): distinct
language runtimes disagree with this list in both directions (for
example, Python's \`str.isspace()\` additionally treats the ASCII
control bytes \`U+001C\`–\`U+001F\` as whitespace; JavaScript's \`\\s\`
regex class fails to recognise \`U+0085\`), and depending on a moving,
per-runtime definition would silently reintroduce the
cross-implementation identity gap this rule exists to close. \`LF\`
(\`U+000A\`) and \`CR\` (\`U+000D\`) are members of this set for
completeness, but are consumed by the line-terminator rules (§ 3.2)
before whitespace-trimming ever applies to them — they are never
treated as an ordinary in-line separator.

`,
  ru: `
**Пробельным** является ровно одно из следующих двадцати пяти кодовых
точек, перечисленных исчерпывающе — это свойство Unicode \`White_Space\`
по состоянию на Unicode 6.3 (2013), зафиксированное здесь закрытым
списком, а не ссылкой на «текущую версию Unicode»:

\`U+0009\`, \`U+000A\`, \`U+000B\`, \`U+000C\`, \`U+000D\`, \`U+0020\`, \`U+0085\`,
\`U+00A0\`, \`U+1680\`, \`U+2000\`–\`U+200A\`, \`U+2028\`, \`U+2029\`, \`U+202F\`,
\`U+205F\`, \`U+3000\`.

Реализации MUST распознавать ровно этот набор, не больше и не меньше,
везде, где эта спецификация говорит «пробельный» или «обрезанный» —
никогда не делегируя встроенному в язык-хозяин примитиву
Unicode-пробелов (например, \`\\s\`, \`isspace()\`, \`char::is_whitespace()\`):
разные языковые платформы расходятся с этим списком в обе стороны
(например, некоторые платформы дополнительно считают пробельными
ASCII-байты \`U+001C\`–\`U+001F\`; другие не распознают \`U+0085\`), и
зависимость от плавающего, специфичного для платформы определения
незаметно вернула бы разрыв идентичности между реализациями, для
устранения которого это правило и существует. \`LF\` (\`U+000A\`) и \`CR\`
(\`U+000D\`) входят в этот набор для полноты, но поглощаются правилами
завершения строки (§ 3.2) раньше, чем к ним вообще применяется
обрезка пробелов — они никогда не трактуются как обычный разделитель
внутри строки.

`,
  zh: `
**空白**码点恰好是以下二十五个之一,穷举列出 —— 这是 Unicode 6.3
(2013) 版本时的 \`White_Space\` 属性,在此以封闭列表的形式固定下来,
而非引用「当前版本的 Unicode」:

\`U+0009\`、\`U+000A\`、\`U+000B\`、\`U+000C\`、\`U+000D\`、\`U+0020\`、
\`U+0085\`、\`U+00A0\`、\`U+1680\`、\`U+2000\`–\`U+200A\`、\`U+2028\`、
\`U+2029\`、\`U+202F\`、\`U+205F\`、\`U+3000\`。

无论本规范在何处使用「空白」或「trim」一词,实现 MUST 恰好识别此
集合 —— 不多也不少 —— 绝不应委托给宿主语言内置的 Unicode 空白判定
原语(例如 \`\\s\`、\`isspace()\`、\`char::is_whitespace()\`):不同语言
运行时在两个方向上都与此列表存在分歧(例如,某些运行时额外将 ASCII
控制字节 \`U+001C\`–\`U+001F\` 视为空白;另一些则未能识别 \`U+0085\`),
依赖一个随运行时而变的定义会悄悄重新引入本规则本应消除的跨实现一致
性缺口。\`LF\`(\`U+000A\`)与 \`CR\`(\`U+000D\`)出于完整性被列入此集合,
但在空白 trim 生效之前,已被行终止符规则(§ 3.2)处理 —— 它们永远
不会被当作普通的行内分隔符。

`,
};
