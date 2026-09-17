export default {
  en: `
0.6.0's key-escaping design (§ 3.7, § 4) made every key representable,
but a key needing several structural bytes escaped — \`service\\:
abc\`, \`a\\.b\\.c\\:d\` — reads worse exactly where escaping is needed
most: the backslashes sit inline with nothing marking where the key
starts or ends. Quoted keys (§ 5.3.3) are sugar over the same escape
mechanism, not a replacement for it: any quoted key already had a
bare, escaped spelling that produces the identical Value (§ 5.5); a
document using no quote characters at all parses exactly as before.

Three delimiters, not the one or two most formats offer, because
self-escaping (a segment's own delimiter needs \`\\"\` / \`\\'\` / \`\` \\\` \`\`
to appear literally inside it; the two OTHER quote characters need no
escape at all, § 3.7) means the choice of delimiter is a convenience
for a human AUTHOR writing input by hand, not a representational
limit: an author whose key contains \`"\` may simply write it with \`'\`
or \`\` \` \`\` instead, needing zero escapes for it. This choice belongs
to the author, not to the canonical writer: § 5.9.10 (see also below)
fixes the canonical delimiter at \`"\` unconditionally, regardless of
content, so a writer-conforming implementation never has — or
exercises — this choice. A design offering only \`"\` (JSON5's key
quoting) would force
a choice between escaping the delimiter or accepting the smaller
"needs no escape" set; three delimiters make "pick one the content
doesn't contain" available for any content using at most two of the
three quote characters, without adding a second escape mechanism —
self-escape is the SAME \`<key-escape>\` rule bare segments already
use, just with three more named forms in the same table (§ 10.4).

Quoting is per-segment (§ 5.3.3), not whole-key: \`a."b.c".d: 1\` and
\`"a.b.c.d": 1\` (a single, longer, fully quoted key) are different
Values (three segments vs. one), matching how a dotted path already
means three distinct nested pairs — quoting one segment does not
collapse the path any more than escaping one segment's dot would.
This mirrors TOML's dotted-key quoting rather than treating a leading
quote character as quoting the rest of the line: the latter would
make \`a."b.c".d\` silently reparse as the bare four-segment path
\`a\`, \`"b\`, \`c"\`, \`d\` for anyone expecting the former — a worse
failure mode than a clean parse error, since it silently misparses
rather than rejecting; contrast the explicit \`InvalidKey\` (§ 6.4)
that a genuinely malformed key like \`"a"b: 1\` (content after a
quoted segment's closing delimiter that is neither \`.\` nor the pair
separator) already produces.

The canonical writer (§ 5.9.10) prefers quoted form the moment a
STRUCTURAL escape (or an edge-whitespace hazard) would otherwise be
needed, or the key's first segment begins with \`##\` (a routing rule
with no escape trade-off at all — see § 5.9.10 rule (d)), rather
than leaving bare-with-escape as an equally valid canonical choice
for the escape-driven cases: a determinism requirement (§ 5.9)
means the writer has no discretion either way, so the rule may as
well pick the more readable of the two — which was the entire
motivation for the feature. An escape quoting cannot remove — a
literal backslash, LF, CR, a control byte, or DEL — does not switch
the form, since paying for two delimiter characters would buy
nothing there. The one fixed delimiter (\`"\`) keeps the
rule content-independent: nothing here weighs which of the three
quote characters would need fewer escapes for a given key, since
self-escaping makes that comparison unnecessary for correctness and
the format already favours simple, uniform rules over marginally
shorter output (§ 10.4).

`,
  ru: `
Дизайн экранирования ключей 0.6.0 (§ 3.7, § 4) сделал представимым
любой ключ, но ключ, которому нужно экранировать несколько
структурных байтов — \`service\\: abc\`, \`a\\.b\\.c\\:d\` — читается хуже
именно там, где экранирование нужнее всего: обратные слэши стоят
внутри строки, никак не отмечая, где ключ начинается или
заканчивается. Квотированные ключи (§ 5.3.3) — это синтаксический
сахар поверх того же самого механизма экранирования, а не его замена:
у любого квотированного ключа уже было голое экранированное
написание, порождающее идентичное Value (§ 5.5); документ, не
использующий вовсе никаких символов кавычек, разбирается в точности
как раньше.

Три разделителя, а не один или два, которые предлагает большинство
форматов, потому что самоэкранирование (собственному разделителю
сегмента нужно \`\\"\` / \`\\'\` / \`\` \\\` \`\`, чтобы появиться в нём буквально;
два ДРУГИХ символа кавычек вовсе не нуждаются в экранировании,
§ 3.7) означает, что выбор разделителя — это удобство для человека,
АВТОРА, пишущего вход вручную, а не ограничение представимости: автор,
чей ключ содержит \`"\`, может просто написать его с \`'\` или \`\` \` \`\`
вместо этого, не нуждаясь ни в одном экранировании для неё. Этот
выбор принадлежит автору, а не каноническому писателю: § 5.9.10
(см. также ниже) фиксирует канонический разделитель как \`"\`
безусловно, независимо от содержимого, так что writer-conforming
реализация никогда не имеет — и не осуществляет — этого выбора.
Дизайн, предлагающий только \`"\` (квотирование ключей JSON5), вынудил
бы выбирать между экранированием разделителя и принятием меньшего
множества «не нуждается в экранировании»; три разделителя делают
доступным «выбрать тот, которого нет в содержимом» для любого
содержимого, использующего не более двух из трёх символов кавычек,
без добавления второго механизма экранирования — самоэкранирование —
это ТО ЖЕ САМОЕ правило \`<key-escape>\`, которое уже используют голые
сегменты, просто с тремя дополнительными именованными формами в той
же таблице (§ 10.4).

Квотирование — посегментное (§ 5.3.3), а не для всего ключа целиком:
\`a."b.c".d: 1\` и \`"a.b.c.d": 1\` (один, более длинный, полностью
квотированный ключ) — разные Value (три сегмента против одного),
что соответствует тому, что точечный путь уже означает три различные
вложенные пары — квотирование одного сегмента не схлопывает путь
ничуть не больше, чем это сделало бы экранирование точки одного
сегмента. Это отражает квотирование точечных ключей TOML, а не
трактовку ведущего символа кавычки как квотирования остатка строки —
последнее заставило бы \`a."b.c".d\` незаметно переразобраться как
голый четырёхсегментный путь \`a\`, \`"b\`, \`c"\`, \`d\` для всякого,
ожидающего первого, — худший режим отказа, чем чистая ошибка разбора,
поскольку он незаметно неверно разбирает, а не отклоняет; сравните с
явной \`InvalidKey\` (§ 6.4), которую уже порождает по-настоящему
искажённый ключ вроде \`"a"b: 1\` (содержимое после закрывающего
разделителя квотированного сегмента, не являющееся ни точкой, ни
разделителем пары).

Канонический писатель (§ 5.9.10) предпочитает квотированную форму
в тот момент, когда иначе потребовалось бы СТРУКТУРНОЕ экранирование
(или опасность краевого пробела), либо когда первый сегмент ключа
начинается с \`##\` (правило маршрутизации без какого-либо компромисса
по экранированию — см. § 5.9.10, пункт (d)), а не оставляет
голую-форму-с-экранированием равноценным каноническим выбором для
случаев, вызванных экранированием: требование детерминизма (§ 5.9)
означает, что у писателя нет свободы
выбора ни в одну, ни в другую сторону, так что правило вполне может
выбрать более читаемый из двух вариантов — что и было всей мотивацией
этой функции. Экранирование, которое квотирование не может убрать —
литеральный обратный слэш, LF, CR, управляющий байт или DEL — не
переключает форму, поскольку платить за два символа разделителя
здесь ничего бы не дало. Единственный фиксированный разделитель (\`"\`)
сохраняет правило независимым от содержимого: здесь ничто не взвешивает,
какому из трёх символов кавычек потребовалось бы меньше экранирований
для данного ключа, поскольку самоэкранирование делает это сравнение
ненужным для корректности, а формат уже предпочитает простые,
единообразные правила незначительно более короткому выводу (§ 10.4).

`,
  zh: `
0.6.0 的键 escape 设计(§ 3.7、§ 4)让每个键都变得可表示,但一个
需要 escape 好几个结构性字节的键 —— \`service\\: abc\`、
\`a\\.b\\.c\\:d\` —— 恰恰在最需要 escape 的地方可读性最差:反斜杠
夹在行内,没有任何标记指出键从哪里开始、到哪里结束。带引号的键
(§ 5.3.3)是同一 escape 机制之上的语法糖,而不是替代品:任何
带引号的键早就有一个能产生相同 Value 的裸转义写法(§ 5.5);完全
不使用任何引号字符的文档,解析结果与之前完全一样。

之所以是三个分隔符,而不是大多数格式提供的一个或两个,是因为
自我 escape(段自身的分隔符要以字面形式出现,需要
\`\\"\` / \`\\'\` / \`\` \\\` \`\`;另外两个引号字符则完全不需要 escape,
§ 3.7)意味着分隔符的选择只是方便手写输入的人类**作者**,而不是
表示能力的限制:键中含有 \`"\` 的作者完全可以改用 \`'\` 或 \`\` \` \`\`
书写,为此不需要任何 escape。这个选择属于作者,而不属于规范
writer:§ 5.9.10(另见下文)将规范分隔符无条件固定为 \`"\`,与
内容无关,因此 writer-conforming 实现从来没有 —— 也不会行使
—— 这一选择权。只提供 \`"\` 的设计(JSON5 的键加引号)会迫使人在
「转义分隔符」与「接受更小的『无需 escape』集合」之间二选一;三个
分隔符使得对于最多使用三种引号字符中两种的任何内容,都能「挑一个
内容里没有的」,而无需增加第二套 escape 机制 —— 自我 escape 正是
裸段已经使用的同一条 \`<key-escape>\` 规则,只是同一张表里多了三种
命名形式(§ 10.4)。

加引号是按段进行的(§ 5.3.3),而不是针对整个键:\`a."b.c".d: 1\`
与 \`"a.b.c.d": 1\`(一个更长的、整体加引号的单一键)是不同的
Value(三段对一段),这与点分路径本就表示三个不同的嵌套 pair
相一致 —— 给一个段加引号并不会像给该段的点加 escape 那样把路径
折叠起来,二者程度相同(即都不会折叠)。这与 TOML 对点分键加
引号的方式相呼应,而不是把行首的引号字符当作给整行剩余部分加
引号:后一种做法会让 \`a."b.c".d\` 对期望前一种语义的人来说,悄悄
被重新解析为裸的四段路径 \`a\`、\`"b\`、\`c"\`、\`d\` —— 这比一个干净的
解析错误更糟,因为它是悄悄地解析错误,而不是直接拒绝;相比之下,
像 \`"a"b: 1\` 这样真正畸形的键(quoted 段关闭分隔符之后的内容既
不是点也不是对分隔符)已经会产生明确的 \`InvalidKey\`(§ 6.4)。

规范 writer(§ 5.9.10)一旦另需 STRUCTURAL escape(或边缘空白
隐患),或键的首段以 \`##\` 开头(一条路由规则,完全不涉及
escape 上的权衡 —— 见 § 5.9.10 规则 (d)),就会优先选用
quoted 形式,而不是在 escape 驱动的情形下把
bare-with-escape 留作同样有效的规范选择:确定性要求(§ 5.9)
意味着 writer 在两个方向上都没有自由裁量权,所以这条规则不妨
选择两者中更易读的一个 —— 这正是该特性的全部动机所在。加引号
无法去除的 escape —— 字面反斜杠、LF、CR、控制字节或 DEL —— 不会
切换形式,因为为两个分隔符字符付出代价在这里毫无收益。唯一固定
的分隔符(\`"\`)使规则与内容无关:这里不权衡三种引号字符中哪一种
对给定的键需要更少的 escape,因为自我 escape 使这种比较对正确性
而言变得没有必要,而且该格式本就更看重简单、统一的规则,而非
略微更短的输出(§ 10.4)。

`,
};
