>>>>> lang=en
The whole file must be byte-identical to `export default ` followed by the
value serialized as strict JSON (`JSON.stringify(value, null, 2)`) plus one
trailing newline: one key per line, 2-space indent, LF line endings, no
trailing semicolon. The payload after `export default ` is parsed as JSON
(`JSON.parse`), **not** evaluated as a JavaScript object literal — trailing
commas, comments, unquoted keys, and semicolons are never valid there
(unlike `body-<k>.md`, which is Markdown and holds no code at all).
Duplicate keys are rejected too: the builder compares the file byte-for-byte
against the canonical serialization above, and a repeated key makes the raw
file differ from it.

Field meanings:

- `kind` — `frontmatter`, `numbered`, or `named`.
- `number` — the section number as a string (`"3.1"`), `null` for
  non-numbered units and frontmatter.
- `level` — the heading `#` count (`##` = 2). `null` for frontmatter.
- `title` — the heading text in each language, **without** the leading
  number and separator; the generator re-attaches them.
- `sep` — the separator actually used between number and title. **Why it
  exists:** the spec's heading convention deliberately mixes
  `## 1. Introduction` (top-level numbered sections, dot + space) with
  `### 3.1 Character Set` (deeper subsections, space only). The generator
  must reproduce each heading byte-exactly, so the actual separator is
  recorded per unit. Only `". "` and `" "` are legal. The extraction script
  enforces that all three languages use the same `sep` for a unit.
- `bodyParts` — the integer count of `body-*.md` files for the unit
  (N in `body-1.md` .. `body-N.md`). Always >= 1. Present on ALL units,
  including `frontmatter`, and always appended **last**. The builder
  accepts at most @@MAX_BODY_PARTS@@ parts per unit and rejects larger values before reading
  body files.

>>>>> lang=ru
Файл целиком должен быть байт-в-байт идентичен `export default `, за которым
следует значение, сериализованное как строгий JSON
(`JSON.stringify(value, null, 2)`), плюс один завершающий перевод строки:
один ключ на строку, отступ в 2 пробела, переводы строк LF, без завершающей
точки с запятой. Payload после `export default ` разбирается как JSON
(`JSON.parse`), а **не** вычисляется как литерал объекта JavaScript —
завершающие запятые, комментарии, ключи без кавычек и точки с запятой там
никогда не допустимы (в отличие от `body-<k>.md`, который является Markdown и не содержит кода — прежняя формулировка про JS-исходник устарела; см.
исходником на JS, лишь узко ограниченным). Дубликаты ключей тоже
отвергаются: сборщик сравнивает файл байт-в-байт с канонической
сериализацией выше, и повторный ключ делает файл отличным от неё.

Значения полей:

- `kind` — `frontmatter`, `numbered` или `named`.
- `number` — номер секции строкой (`"3.1"`), `null` для ненумерованных
  юнитов и frontmatter.
- `level` — количество `#` в заголовке (`##` = 2). `null` для
  frontmatter.
- `title` — текст заголовка на каждом языке, **без** ведущего номера и
  разделителя; генератор пристыковывает их сам.
- `sep` — разделитель, реально использованный между номером и
  заголовком. **Зачем он существует:** соглашение о заголовках спеки
  намеренно смешивает `## 1. Introduction` (нумерованные секции
  верхнего уровня, точка + пробел) с `### 3.1 Character Set` (более
  глубокие подсекции, только пробел). Генератор должен воспроизвести
  каждый заголовок байт-в-байт, поэтому фактический разделитель
  записывается на каждый юнит. Легальны только `". "` и `" "`.
  Скрипт извлечения требует, чтобы все три языка использовали один и
  тот же `sep` для юнита.
- `bodyParts` — целое число файлов `body-*.md` юнита (N в
  `body-1.md` .. `body-N.md`). Всегда >= 1. Есть у ВСЕХ юнитов, включая
  `frontmatter`, и всегда приписывается **последним**. Сборщик принимает
  не более @@MAX_BODY_PARTS@@ частей на юнит и отвергает большие значения до чтения файлов
  тела.

>>>>> lang=zh
整个文件必须逐字节等于 `export default ` 加上以严格 JSON 序列化的值
（`JSON.stringify(value, null, 2)`）再加单个末尾换行：每行一个键、
2 空格缩进、LF 换行、无末尾分号。`export default ` 之后的 payload 是作为
JSON（`JSON.parse`）解析的，**不是**作为 JavaScript 对象字面量求值——
末尾逗号、注释、不带引号的键以及分号在那里永远不合法（与 `body-<k>.md`
不同，后者是 JS 源码，只是受到严格限制）。重复的键同样会被拒绝：构建器
将文件与上面的规范序列化逐字节比较，重复键会使原始文件与它不一致。

字段含义:

- `kind` —— `frontmatter`、`numbered` 或 `named`。
- `number` —— 以字符串表示的节号(`"3.1"`),非编号单元与
  frontmatter 为 `null`。
- `level` —— 标题中 `#` 的数量(`##` = 2)。frontmatter 为 `null`。
- `title` —— 每种语言的标题文本,**不含**前导编号与分隔符;生成器
  会重新拼接上去。
- `sep` —— 编号与标题之间实际使用的分隔符。**它为何存在:**规范
  的标题约定有意混用 `## 1. Introduction`(顶层编号节,点 + 空格)
  与 `### 3.1 Character Set`(更深的子节,仅空格)。生成器必须逐字节
  复现每个标题,因此实际分隔符按单元记录。只有 `". "` 与 `" "` 合法。
  抽取脚本强制同一单元的三种语言使用相同的 `sep`。
- `bodyParts` —— 该单元 `body-*.md` 文件的整数个数(`body-1.md` ..
  `body-N.md` 中的 N)。总是 >= 1。所有单元(包括 `frontmatter`)都
  有,且总是排在**最后**。构建器每个单元最多接受 @@MAX_BODY_PARTS@@ 个部分，并在
  读取正文文件前拒绝更大的值。

