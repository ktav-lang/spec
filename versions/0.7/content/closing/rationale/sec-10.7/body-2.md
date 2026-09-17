>>>>> lang=en
Three delimiters, not the one or two most formats offer, because
self-escaping (a segment's own delimiter needs `\"` / `\'` / `` \` ``
to appear literally inside it; the two OTHER quote characters need no
escape at all, § 3.7) means the choice of delimiter is a convenience
for a human AUTHOR writing input by hand, not a representational
limit: an author whose key contains `"` may simply write it with `'`
or `` ` `` instead, needing zero escapes for it. This choice belongs
to the author, not to the canonical writer: § 5.9.10 (see also below)
fixes the canonical delimiter at `"` unconditionally, regardless of
content, so a writer-conforming implementation never has — or
exercises — this choice. A design offering only `"` (JSON5's key
quoting) would force
a choice between escaping the delimiter or accepting the smaller
"needs no escape" set; three delimiters make "pick one the content
doesn't contain" available for any content using at most two of the
three quote characters, without adding a second escape mechanism —
self-escape is the SAME `<key-escape>` rule bare segments already
use, just with three more named forms in the same table (§ 10.4).

Quoting is per-segment (§ 5.3.3), not whole-key: `a."b.c".d: 1` and
`"a.b.c.d": 1` (a single, longer, fully quoted key) are different
Values (three segments vs. one), matching how a dotted path already
means three distinct nested pairs — quoting one segment does not
collapse the path any more than escaping one segment's dot would.
This mirrors TOML's dotted-key quoting rather than treating a leading
quote character as quoting the rest of the line: the latter would
make `a."b.c".d` silently reparse as the bare four-segment path
`a`, `"b`, `c"`, `d` for anyone expecting the former — a worse
failure mode than a clean parse error, since it silently misparses
rather than rejecting; contrast the explicit `InvalidKey` (§ 6.4)
that a genuinely malformed key like `"a"b: 1` (content after a
quoted segment's closing delimiter that is neither `.` nor the pair
separator) already produces.

>>>>> lang=ru
Три разделителя, а не один или два, которые предлагает большинство
форматов, потому что самоэкранирование (собственному разделителю
сегмента нужно `\"` / `\'` / `` \` ``, чтобы появиться в нём буквально;
два ДРУГИХ символа кавычек вовсе не нуждаются в экранировании,
§ 3.7) означает, что выбор разделителя — это удобство для человека,
АВТОРА, пишущего вход вручную, а не ограничение представимости: автор,
чей ключ содержит `"`, может просто написать его с `'` или `` ` ``
вместо этого, не нуждаясь ни в одном экранировании для неё. Этот
выбор принадлежит автору, а не каноническому писателю: § 5.9.10
(см. также ниже) фиксирует канонический разделитель как `"`
безусловно, независимо от содержимого, так что writer-conforming
реализация никогда не имеет — и не осуществляет — этого выбора.
Дизайн, предлагающий только `"` (квотирование ключей JSON5), вынудил
бы выбирать между экранированием разделителя и принятием меньшего
множества «не нуждается в экранировании»; три разделителя делают
доступным «выбрать тот, которого нет в содержимом» для любого
содержимого, использующего не более двух из трёх символов кавычек,
без добавления второго механизма экранирования — самоэкранирование —
это ТО ЖЕ САМОЕ правило `<key-escape>`, которое уже используют голые
сегменты, просто с тремя дополнительными именованными формами в той
же таблице (§ 10.4).

Квотирование — посегментное (§ 5.3.3), а не для всего ключа целиком:
`a."b.c".d: 1` и `"a.b.c.d": 1` (один, более длинный, полностью
квотированный ключ) — разные Value (три сегмента против одного),
что соответствует тому, что точечный путь уже означает три различные
вложенные пары — квотирование одного сегмента не схлопывает путь
ничуть не больше, чем это сделало бы экранирование точки одного
сегмента. Это отражает квотирование точечных ключей TOML, а не
трактовку ведущего символа кавычки как квотирования остатка строки —
последнее заставило бы `a."b.c".d` незаметно переразобраться как
голый четырёхсегментный путь `a`, `"b`, `c"`, `d` для всякого,
ожидающего первого, — худший режим отказа, чем чистая ошибка разбора,
поскольку он незаметно неверно разбирает, а не отклоняет; сравните с
явной `InvalidKey` (§ 6.4), которую уже порождает по-настоящему
искажённый ключ вроде `"a"b: 1` (содержимое после закрывающего
разделителя квотированного сегмента, не являющееся ни точкой, ни
разделителем пары).

>>>>> lang=zh
之所以是三个分隔符,而不是大多数格式提供的一个或两个,是因为
自我 escape(段自身的分隔符要以字面形式出现,需要
`\"` / `\'` / `` \` ``;另外两个引号字符则完全不需要 escape,
§ 3.7)意味着分隔符的选择只是方便手写输入的人类**作者**,而不是
表示能力的限制:键中含有 `"` 的作者完全可以改用 `'` 或 `` ` ``
书写,为此不需要任何 escape。这个选择属于作者,而不属于规范
writer:§ 5.9.10(另见下文)将规范分隔符无条件固定为 `"`,与
内容无关,因此 writer-conforming 实现从来没有 —— 也不会行使
—— 这一选择权。只提供 `"` 的设计(JSON5 的键加引号)会迫使人在
「转义分隔符」与「接受更小的『无需 escape』集合」之间二选一;三个
分隔符使得对于最多使用三种引号字符中两种的任何内容,都能「挑一个
内容里没有的」,而无需增加第二套 escape 机制 —— 自我 escape 正是
裸段已经使用的同一条 `<key-escape>` 规则,只是同一张表里多了三种
命名形式(§ 10.4)。

加引号是按段进行的(§ 5.3.3),而不是针对整个键:`a."b.c".d: 1`
与 `"a.b.c.d": 1`(一个更长的、整体加引号的单一键)是不同的
Value(三段对一段),这与点分路径本就表示三个不同的嵌套 pair
相一致 —— 给一个段加引号并不会像给该段的点加 escape 那样把路径
折叠起来,二者程度相同(即都不会折叠)。这与 TOML 对点分键加
引号的方式相呼应,而不是把行首的引号字符当作给整行剩余部分加
引号:后一种做法会让 `a."b.c".d` 对期望前一种语义的人来说,悄悄
被重新解析为裸的四段路径 `a`、`"b`、`c"`、`d` —— 这比一个干净的
解析错误更糟,因为它是悄悄地解析错误,而不是直接拒绝;相比之下,
像 `"a"b: 1` 这样真正畸形的键(quoted 段关闭分隔符之后的内容既
不是点也不是对分隔符)已经会产生明确的 `InvalidKey`(§ 6.4)。

