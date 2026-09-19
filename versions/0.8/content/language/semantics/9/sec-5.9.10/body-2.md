>>>>> lang=en
A key segment is emitted in one of two forms — **bare** or
**quoted** (§ 5.3.3) — decided by one rule: emit **bare** (the
re-escape recipe below) unless (a) bare form would require escaping
at least one byte that a `<quoted-segment>` (§ 4) admits as literal,
unescaped content — the structural bytes `.`, `:`, `,`, `{`, `}`,
`[`, `]` (bullet 1 below, excluding `\`, LF, and CR), or `(` / `)` (part of
bullet 2 below, since neither opens a multi-line string at a
key-segment position) — or an edge-whitespace escape (bullet 3
below) for a byte a `<quoted-segment>` admits raw at that edge
position — true for tab, VT, FF, and any non-ASCII § 3.3 whitespace
code point, but not for LF or CR, which a `<quoted-segment>` never
admits raw at all, edge or interior (§ 4's `<dq-char>` /
`<sq-char>` / `<bt-char>` exclude them everywhere; see the exemption
below); or (b) the segment's decoded content begins with `"`, `'`,
or `` ` `` (a leading quote character in bare form would be misread
as opening a `<quoted-segment>` on re-parse, so it always forces
quoted form even though nothing else in the segment needs escaping);
or (c) this segment is the first segment of the root Object's
first-serialized key (§ 5.9.3) and its decoded content begins with
U+FEFF — bare form would then place the raw 3-byte UTF-8 encoding of
U+FEFF at byte offset 0 of the entire document, indistinguishable
from the metadata byte-order mark that § 3.1 requires a conformant
reader to strip before any key is even recognised, silently losing
the code point on re-parse; quoted form's opening `"` occupies byte
offset 0 instead, so the U+FEFF is never mistaken for a BOM and
needs no escape of its own once quoting moves it off that position
(§ 5.9.12 states this guard generally, alongside the analogous
Array-root-first-item case); or (d) this segment is the key's first
segment and its decoded content begins with the two-byte sequence
`##` — this is not an escaping requirement at all, unlike (a)–(c):
no bare-form escape changes the RAW first two bytes § 5.1 rule 2
inspects on re-read, so no amount of escaping elsewhere in the
segment prevents a raw `##`-prefixed bare line from being dispatched
as a comment; quoted form's opening `"` is the only way to avoid
that collision, since it is the only form whose first byte is never
`#`. A need to escape
a literal backslash, LF, CR, a control byte, or DEL — bullet 1's
`\\`/`\n`/`\r` entries and the control-byte/DEL part of bullet 2,
at any position in the segment, including its first or last byte —
does NOT by itself trigger quoted form: a `<quoted-segment>` excludes
and escapes each of these exactly as a `<bare-segment>` does
(§ 4's `<dq-char>` / `<sq-char>` / `<bt-char>`, § 5.3.3), so quoting
buys nothing for them, and bare remains the simpler, equally-escaped
choice — an edge LF or CR falls under this exemption, not under
(a)'s edge-whitespace disjunct above. Otherwise (quoted form selected) the delimiter is `"` unconditionally
— the choice of delimiter is fixed, not content-dependent, so the
writer never needs to scan the content against all three candidates
first. Either form parses back to the same key (§ 5.3.3), but which
one the writer emits is not a free choice: it is fully determined by
this rule, with no discretion left once the content is known (§ 5.9's
determinism requirement).

>>>>> lang=ru
Сегмент ключа выводится в одной из двух форм — **голой** или
**квотированной** (§ 5.3.3) — по единому правилу: выводить **голой**
(рецепт ре-экранирования ниже), если только (a) голая форма не
потребовала бы экранировать хотя бы один байт, который
`<quoted-segment>` (§ 4) допускает как литеральное, неэкранированное
содержимое, — структурные байты `.`, `:`, `,`, `{`, `}`, `[`, `]`
(пункт 1 ниже, исключая `\`, LF и CR), либо `(` / `)` (часть пункта 2
ниже, поскольку ни один из них не открывает многострочную строку на
позиции сегмента ключа), — либо экранирование краевого пробела
(пункт 3 ниже) для байта, который `<quoted-segment>` допускает
сырым именно в этой краевой позиции, — это верно для табуляции, VT,
FF и любой не-ASCII пробельной кодовой точки § 3.3, но не для LF
или CR, которые `<quoted-segment>` вообще никогда не допускает
сырыми — ни на границе, ни внутри (`<dq-char>` / `<sq-char>` /
`<bt-char>` § 4 исключают их везде; см. исключение ниже);
либо (b) декодированное содержимое сегмента начинается с `"`, `'`
или `` ` `` (ведущий символ кавычки в голой форме был бы неверно
прочитан как открывающий `<quoted-segment>` при повторном парсинге,
поэтому он всегда вынуждает квотированную форму, даже если больше
ничего в сегменте не нуждается в экранировании); либо (c) этот
сегмент — первый сегмент первого сериализуемого ключа корневого
Object (§ 5.9.3), и его декодированное содержимое начинается с
U+FEFF — голая форма тогда разместила бы сырую 3-байтовую
UTF-8-кодировку U+FEFF на байтовом смещении 0 всего документа,
неотличимо от метаданного маркера порядка байтов, который § 3.1
требует от conforming-читателя снимать ещё до распознавания хотя бы
одного ключа, незаметно теряя эту кодовую точку при повторном
парсинге; открывающая `"` квотированной формы занимает байтовое
смещение 0 вместо этого, так что U+FEFF никогда не принимается за
BOM и не нуждается в собственном экранировании, как только
квотирование убирает её с этой позиции (§ 5.9.12 формулирует эту
защиту в общем виде, наряду с аналогичным случаем первого элемента
корня-Array); либо (d) этот сегмент — первый сегмент ключа, и его
декодированное содержимое начинается с двухбайтовой
последовательности `##` — это вообще не требование экранирования,
в отличие от (a)–(c): никакое экранирование в голой форме не меняет
СЫРЫЕ первые два байта, которые правило 2 § 5.1 проверяет при
повторном чтении, поэтому никакое экранирование где-либо ещё в
сегменте не предотвращает диспетчеризацию сырой `##`-строки в голой
форме как комментария; открывающая `"` квотированной формы — единственный
способ избежать этой коллизии, поскольку это единственная форма,
чей первый байт никогда не `#`. Необходимость экранировать литеральный обратный слэш,
LF, CR, управляющий байт или DEL — записи `\\`/`\n`/`\r` пункта 1 и
часть пункта 2 про управляющий байт/DEL, в любой позиции сегмента,
включая первый или последний байт, — сама по себе НЕ включает
квотированную форму: `<quoted-segment>` исключает и экранирует
каждый из них точно так же, как и `<bare-segment>` (`<dq-char>` /
`<sq-char>` / `<bt-char>` § 4, § 5.3.3), так что квотирование ничего
не даёт для них, и голая форма остаётся более простым, одинаково
экранированным выбором — краевые LF или CR подпадают именно под это
исключение, а не под краевой-пробельный дизъюнкт правила (a) выше.
Иначе (выбрана квотированная форма)
разделитель — безусловно `"` — выбор разделителя фиксирован, а не
зависит от содержимого, так что writer никогда не должен сначала
сканировать содержимое на предмет всех трёх кандидатов. Обе формы
разбираются обратно в один и тот же ключ (§ 5.3.3), но какую из них
выводит writer — не свободный выбор: он полностью определяется этим
правилом, без остающейся свободы после того, как содержимое
известно (требование детерминизма § 5.9).

>>>>> lang=zh
键段以两种形式之一输出 —— **裸** 或 **quoted**(§ 5.3.3)——
由单一规则决定:输出**裸**形式(下面的重新 escape 方案),除非
(a) 裸形式将需要对至少一个 `<quoted-segment>`(§ 4)允许作为
字面、未 escape 内容的字节做 escape —— 结构性字节 `.`、`:`、
`,`、`{`、`}`、`[`、`]`(下面第 1 条,不含 `\`、LF、CR),或
`(` / `)`(下面第 2 条的一部分,因为二者在键段位置都不会打开
多行字符串)—— 或边缘空白的 escape(下面第 3 条),仅当该字节是
`<quoted-segment>` 在该边缘位置本就允许裸出现的字节时才适用 ——
这对制表符、VT、FF 以及任何非 ASCII 的 § 3.3 空白码点成立,但对
LF 或 CR 不成立,因为 `<quoted-segment>` 无论在边缘还是内部都
从不允许它们裸出现(§ 4 的 `<dq-char>` / `<sq-char>` /
`<bt-char>` 在任何位置都排除它们;见下面的豁免说明);或 (b) 该段
解码后的内容以 `"`、`'`
或 `` ` `` 开头(裸形式下的前导引号字符在重解析时会被误读为
开启 `<quoted-segment>`,因此它总是强制使用 quoted 形式,即使
段中其他内容都不需要 escape);或 (c) 该段是根 Object 首个
序列化键的第一段(§ 5.9.3),且其解码内容以 U+FEFF 开头 ——
裸形式届时会把 U+FEFF 的原始 3 字节 UTF-8 编码放在整个文档的
字节偏移 0 处,与 § 3.1 要求 conforming 读取器在识别任何键之前
就剥离的元数据字节顺序标记无法区分,导致在重解析时悄悄丢失该
码点;quoted 形式的开启 `"` 则占据字节偏移 0,因此 U+FEFF 永远
不会被误认为 BOM,一旦 quoting 把它移出该位置,它自身也无需
escape(§ 5.9.12 一般性地陈述了这一防护,以及根-Array 首项的
类似情形);或 (d) 该段是键的第一段,且其解码内容以两字节序列
`##` 开头 —— 这完全不是一个 escape 需求,不同于 (a)-(c):没有任何
裸形式的 escape 会改变 § 5.1 规则 2 在重读时检查的原始前两个
字节,因此无论段中其他位置如何 escape,都无法阻止一个以裸 `##`
开头的行在重读时被分发为注释;quoted 形式的开启 `"` 是唯一能
避免这一冲突的方式,因为它是唯一首字节永远不是 `#` 的形式。
需要 escape 字面反斜杠、LF、CR、控制字节或 DEL ——
第 1 条的 `\\`/`\n`/`\r` 条目以及第 2 条中控制字节/DEL 的部分,
无论出现在段内哪个位置,包括其首字节或末字节 —— 本身并不触发
quoted 形式:`<quoted-segment>` 排除并 escape
它们的方式与 `<bare-segment>` 完全相同(§ 4 的 `<dq-char>` /
`<sq-char>` / `<bt-char>`,§ 5.3.3),所以加引号对它们没有任何
好处,裸形式仍是同样需要 escape 但更简单的选择 —— 边缘的 LF 或
CR 正属于这一豁免,而不属于上面规则 (a) 的边缘空白析取项。否则(选择
quoted 形式)分隔符无条件为 `"` —— 分隔符的选择是固定的,不依赖
内容,因此 writer 无需先针对全部三个候选扫描内容。两种形式都能
解析回同一个键(§ 5.3.3),但 writer 输出哪一种并非自由选择:
一旦内容已知,完全由本规则决定,不留任何余地(§ 5.9 的确定性
要求)。

