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

`,
};
