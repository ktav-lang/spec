export default {
  en: `
A key segment is emitted after escape processing and the trimming
rule of § 4. Internal whitespace is preserved. Dotted keys are NOT
re-expanded: a Value parsed from \`a.b.c: 1\` is indistinguishable
in the Value model from one parsed from \`a: { b: { c: 1 } }\`, and
the canonical writer chooses the explicit nested form (not the
dotted form).

A key segment is emitted in one of two forms — **bare** or
**quoted** (§ 5.3.3) — decided by one rule: emit **bare** (the
re-escape recipe below) unless (a) bare form would require escaping
at least one byte that a \`<quoted-segment>\` (§ 4) admits as literal,
unescaped content — the structural bytes \`.\`, \`:\`, \`,\`, \`{\`, \`}\`,
\`[\`, \`]\` (bullet 1 below, excluding \`\\\`, LF, and CR), or \`(\` / \`)\` (part of
bullet 2 below, since neither opens a multi-line string at a
key-segment position) — or an edge-whitespace escape (bullet 3
below) for a byte a \`<quoted-segment>\` admits raw at that edge
position — true for tab, VT, FF, and any non-ASCII § 3.3 whitespace
code point, but not for LF or CR, which a \`<quoted-segment>\` never
admits raw at all, edge or interior (§ 4's \`<dq-char>\` /
\`<sq-char>\` / \`<bt-char>\` exclude them everywhere; see the exemption
below); or (b) the segment's decoded content begins with \`"\`, \`'\`,
or \`\` \` \`\` (a leading quote character in bare form would be misread
as opening a \`<quoted-segment>\` on re-parse, so it always forces
quoted form even though nothing else in the segment needs escaping);
or (c) this segment is the first segment of the root Object's
first-serialized key (§ 5.9.3) and its decoded content begins with
U+FEFF — bare form would then place the raw 3-byte UTF-8 encoding of
U+FEFF at byte offset 0 of the entire document, indistinguishable
from the metadata byte-order mark that § 3.1 requires a conformant
reader to strip before any key is even recognised, silently losing
the code point on re-parse; quoted form's opening \`"\` occupies byte
offset 0 instead, so the U+FEFF is never mistaken for a BOM and
needs no escape of its own once quoting moves it off that position
(§ 5.9.12 states this guard generally, alongside the analogous
Array-root-first-item case); or (d) this segment is the key's first
segment and its decoded content begins with the two-byte sequence
\`##\` — this is not an escaping requirement at all, unlike (a)–(c):
no bare-form escape changes the RAW first two bytes § 5.1 rule 2
inspects on re-read, so no amount of escaping elsewhere in the
segment prevents a raw \`##\`-prefixed bare line from being dispatched
as a comment; quoted form's opening \`"\` is the only way to avoid
that collision, since it is the only form whose first byte is never
\`#\`. A need to escape
a literal backslash, LF, CR, a control byte, or DEL — bullet 1's
\`\\\\\`/\`\\n\`/\`\\r\` entries and the control-byte/DEL part of bullet 2,
at any position in the segment, including its first or last byte —
does NOT by itself trigger quoted form: a \`<quoted-segment>\` excludes
and escapes each of these exactly as a \`<bare-segment>\` does
(§ 4's \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\`, § 5.3.3), so quoting
buys nothing for them, and bare remains the simpler, equally-escaped
choice — an edge LF or CR falls under this exemption, not under
(a)'s edge-whitespace disjunct above. Otherwise (quoted form selected) the delimiter is \`"\` unconditionally
— the choice of delimiter is fixed, not content-dependent, so the
writer never needs to scan the content against all three candidates
first. Either form parses back to the same key (§ 5.3.3), but which
one the writer emits is not a free choice: it is fully determined by
this rule, with no discretion left once the content is known (§ 5.9's
determinism requirement).

When bare form is selected, the writer MUST re-escape every code
point that \`<key-char>\` (§ 4) excludes from raw content, plus any
§ 3.3 whitespace code point at the segment's first or last position
(which § 4's trimming rule would otherwise remove on re-parse):

- Bytes with a named escape (§ 3.7) use it: \`\\\` → \`\\\\\`, \`.\` → \`\\.\`,
  \`:\` → \`\\:\`, \`,\` → \`\\,\`, \`{\` → \`\\{\`, \`}\` → \`\\}\`, \`[\` → \`\\[\`,
  \`]\` → \`\\]\`, LF → \`\\n\`, CR → \`\\r\`.
- Everything else \`<key-char>\` excludes — \`(\`, \`)\`, DEL (\`0x7F\`),
  and any control byte below \`0x20\` that is not a § 3.3 whitespace
  member — has no named escape and MUST be emitted as \`\\uXXXX\`
  (§ 3.7.1).
- A § 3.3 whitespace code point at the first or last position of
  the segment MUST likewise be escaped rather than emitted
  literally, even though § 4 otherwise permits whitespace as
  ordinary interior key content: left unescaped, it would be
  silently trimmed away on re-parse, changing the key. Use the
  named form when one exists (LF and CR per bullet 1 above) and
  \`\\uXXXX\` otherwise — either form is immune to § 4's raw-byte
  trimming, since the trimmed text is the escape's own ASCII
  spelling (\`\\\`, then a letter or four hex digits), never the
  whitespace byte itself. Interior whitespace needs no escaping.

`,
  ru: `
Сегмент ключа выводится после обработки escape и применения trim
(§ 4). Внутренние пробелы сохраняются. Точечные ключи НЕ
разворачиваются обратно: Value, разобранное из \`a.b.c: 1\`,
неотличимо в модели Value от полученного из \`a: { b: { c: 1 } }\`, и
канонический эмиттер выбирает явную вложенную форму (а не точечную).

Сегмент ключа выводится в одной из двух форм — **голой** или
**квотированной** (§ 5.3.3) — по единому правилу: выводить **голой**
(рецепт ре-экранирования ниже), если только (a) голая форма не
потребовала бы экранировать хотя бы один байт, который
\`<quoted-segment>\` (§ 4) допускает как литеральное, неэкранированное
содержимое, — структурные байты \`.\`, \`:\`, \`,\`, \`{\`, \`}\`, \`[\`, \`]\`
(пункт 1 ниже, исключая \`\\\`, LF и CR), либо \`(\` / \`)\` (часть пункта 2
ниже, поскольку ни один из них не открывает многострочную строку на
позиции сегмента ключа), — либо экранирование краевого пробела
(пункт 3 ниже) для байта, который \`<quoted-segment>\` допускает
сырым именно в этой краевой позиции, — это верно для табуляции, VT,
FF и любой не-ASCII пробельной кодовой точки § 3.3, но не для LF
или CR, которые \`<quoted-segment>\` вообще никогда не допускает
сырыми — ни на границе, ни внутри (\`<dq-char>\` / \`<sq-char>\` /
\`<bt-char>\` § 4 исключают их везде; см. исключение ниже);
либо (b) декодированное содержимое сегмента начинается с \`"\`, \`'\`
или \`\` \` \`\` (ведущий символ кавычки в голой форме был бы неверно
прочитан как открывающий \`<quoted-segment>\` при повторном парсинге,
поэтому он всегда вынуждает квотированную форму, даже если больше
ничего в сегменте не нуждается в экранировании); либо (c) этот
сегмент — первый сегмент первого сериализуемого ключа корневого
Object (§ 5.9.3), и его декодированное содержимое начинается с
U+FEFF — голая форма тогда разместила бы сырую 3-байтовую
UTF-8-кодировку U+FEFF на байтовом смещении 0 всего документа,
неотличимо от метаданного маркера порядка байтов, который § 3.1
требует от conforming-читателя снимать ещё до распознавания хотя бы
одного ключа, незаметно теряя эту кодовую точку при повторном
парсинге; открывающая \`"\` квотированной формы занимает байтовое
смещение 0 вместо этого, так что U+FEFF никогда не принимается за
BOM и не нуждается в собственном экранировании, как только
квотирование убирает её с этой позиции (§ 5.9.12 формулирует эту
защиту в общем виде, наряду с аналогичным случаем первого элемента
корня-Array); либо (d) этот сегмент — первый сегмент ключа, и его
декодированное содержимое начинается с двухбайтовой
последовательности \`##\` — это вообще не требование экранирования,
в отличие от (a)–(c): никакое экранирование в голой форме не меняет
СЫРЫЕ первые два байта, которые правило 2 § 5.1 проверяет при
повторном чтении, поэтому никакое экранирование где-либо ещё в
сегменте не предотвращает диспетчеризацию сырой \`##\`-строки в голой
форме как комментария; открывающая \`"\` квотированной формы — единственный
способ избежать этой коллизии, поскольку это единственная форма,
чей первый байт никогда не \`#\`. Необходимость экранировать литеральный обратный слэш,
LF, CR, управляющий байт или DEL — записи \`\\\\\`/\`\\n\`/\`\\r\` пункта 1 и
часть пункта 2 про управляющий байт/DEL, в любой позиции сегмента,
включая первый или последний байт, — сама по себе НЕ включает
квотированную форму: \`<quoted-segment>\` исключает и экранирует
каждый из них точно так же, как и \`<bare-segment>\` (\`<dq-char>\` /
\`<sq-char>\` / \`<bt-char>\` § 4, § 5.3.3), так что квотирование ничего
не даёт для них, и голая форма остаётся более простым, одинаково
экранированным выбором — краевые LF или CR подпадают именно под это
исключение, а не под краевой-пробельный дизъюнкт правила (a) выше.
Иначе (выбрана квотированная форма)
разделитель — безусловно \`"\` — выбор разделителя фиксирован, а не
зависит от содержимого, так что writer никогда не должен сначала
сканировать содержимое на предмет всех трёх кандидатов. Обе формы
разбираются обратно в один и тот же ключ (§ 5.3.3), но какую из них
выводит writer — не свободный выбор: он полностью определяется этим
правилом, без остающейся свободы после того, как содержимое
известно (требование детерминизма § 5.9).

Если выбрана голая форма, writer MUST ре-экранировать каждую
кодовую точку, которую \`<key-char>\` (§ 4) исключает из сырого
содержимого, плюс любую пробельную кодовую точку § 3.3 на первой
или последней позиции сегмента (которую иначе удалило бы правило
trim из § 4 при повторном парсинге):

- Байты с именованным escape (§ 3.7) используют его: \`\\\` → \`\\\\\`,
  \`.\` → \`\\.\`, \`:\` → \`\\:\`, \`,\` → \`\\,\`, \`{\` → \`\\{\`, \`}\` → \`\\}\`,
  \`[\` → \`\\[\`, \`]\` → \`\\]\`, LF → \`\\n\`, CR → \`\\r\`.
- Всё остальное, что исключает \`<key-char>\` — \`(\`, \`)\`, DEL
  (\`0x7F\`), и любой управляющий байт ниже \`0x20\`, не являющийся
  элементом множества § 3.3 — не имеет именованного escape и
  MUST выводиться как \`\\uXXXX\` (§ 3.7.1).
- Пробельная кодовая точка § 3.3 на первой или последней позиции
  сегмента MUST аналогично экранироваться, а не выводиться
  буквально, даже несмотря на то, что § 4 в остальном разрешает
  пробел как обычное внутреннее содержимое ключа: без
  экранирования она была бы незаметно обрезана при повторном
  парсинге, изменив ключ. Используйте именованную форму, если
  она существует (LF и CR — по пункту 1 выше), и \`\\uXXXX\` в
  остальных случаях — обе формы защищены от обрезки по сырым
  байтам § 4, поскольку обрезаемым текстом является собственное
  ASCII-написание escape (\`\\\`, затем буква или четыре hex-цифры),
  а не сам пробельный байт. Внутренний пробел экранирования не
  требует.

`,
  zh: `
键段在 escape 处理与 § 4 trim 后输出。段内空白保留。点分键
**不**反展开:从 \`a.b.c: 1\` 解析得到的 Value 在 Value 模型中与
从 \`a: { b: { c: 1 } }\` 得到的不可区分,规范 writer 选择显式
嵌套形式(而非点分形式)。

键段以两种形式之一输出 —— **裸** 或 **quoted**(§ 5.3.3)——
由单一规则决定:输出**裸**形式(下面的重新 escape 方案),除非
(a) 裸形式将需要对至少一个 \`<quoted-segment>\`(§ 4)允许作为
字面、未 escape 内容的字节做 escape —— 结构性字节 \`.\`、\`:\`、
\`,\`、\`{\`、\`}\`、\`[\`、\`]\`(下面第 1 条,不含 \`\\\`、LF、CR),或
\`(\` / \`)\`(下面第 2 条的一部分,因为二者在键段位置都不会打开
多行字符串)—— 或边缘空白的 escape(下面第 3 条),仅当该字节是
\`<quoted-segment>\` 在该边缘位置本就允许裸出现的字节时才适用 ——
这对制表符、VT、FF 以及任何非 ASCII 的 § 3.3 空白码点成立,但对
LF 或 CR 不成立,因为 \`<quoted-segment>\` 无论在边缘还是内部都
从不允许它们裸出现(§ 4 的 \`<dq-char>\` / \`<sq-char>\` /
\`<bt-char>\` 在任何位置都排除它们;见下面的豁免说明);或 (b) 该段
解码后的内容以 \`"\`、\`'\`
或 \`\` \` \`\` 开头(裸形式下的前导引号字符在重解析时会被误读为
开启 \`<quoted-segment>\`,因此它总是强制使用 quoted 形式,即使
段中其他内容都不需要 escape);或 (c) 该段是根 Object 首个
序列化键的第一段(§ 5.9.3),且其解码内容以 U+FEFF 开头 ——
裸形式届时会把 U+FEFF 的原始 3 字节 UTF-8 编码放在整个文档的
字节偏移 0 处,与 § 3.1 要求 conforming 读取器在识别任何键之前
就剥离的元数据字节顺序标记无法区分,导致在重解析时悄悄丢失该
码点;quoted 形式的开启 \`"\` 则占据字节偏移 0,因此 U+FEFF 永远
不会被误认为 BOM,一旦 quoting 把它移出该位置,它自身也无需
escape(§ 5.9.12 一般性地陈述了这一防护,以及根-Array 首项的
类似情形);或 (d) 该段是键的第一段,且其解码内容以两字节序列
\`##\` 开头 —— 这完全不是一个 escape 需求,不同于 (a)-(c):没有任何
裸形式的 escape 会改变 § 5.1 规则 2 在重读时检查的原始前两个
字节,因此无论段中其他位置如何 escape,都无法阻止一个以裸 \`##\`
开头的行在重读时被分发为注释;quoted 形式的开启 \`"\` 是唯一能
避免这一冲突的方式,因为它是唯一首字节永远不是 \`#\` 的形式。
需要 escape 字面反斜杠、LF、CR、控制字节或 DEL ——
第 1 条的 \`\\\\\`/\`\\n\`/\`\\r\` 条目以及第 2 条中控制字节/DEL 的部分,
无论出现在段内哪个位置,包括其首字节或末字节 —— 本身并不触发
quoted 形式:\`<quoted-segment>\` 排除并 escape
它们的方式与 \`<bare-segment>\` 完全相同(§ 4 的 \`<dq-char>\` /
\`<sq-char>\` / \`<bt-char>\`,§ 5.3.3),所以加引号对它们没有任何
好处,裸形式仍是同样需要 escape 但更简单的选择 —— 边缘的 LF 或
CR 正属于这一豁免,而不属于上面规则 (a) 的边缘空白析取项。否则(选择
quoted 形式)分隔符无条件为 \`"\` —— 分隔符的选择是固定的,不依赖
内容,因此 writer 无需先针对全部三个候选扫描内容。两种形式都能
解析回同一个键(§ 5.3.3),但 writer 输出哪一种并非自由选择:
一旦内容已知,完全由本规则决定,不留任何余地(§ 5.9 的确定性
要求)。

若选择裸形式,writer MUST 对 \`<key-char>\`(§ 4)从原始内容中排除
的每个码点重新 escape,加上位于段首或段尾的任意 § 3.3 空白码点
(否则会被 § 4 的 trim 规则在重解析时移除):

- 有命名 escape(§ 3.7)的字节使用该 escape:\`\\\` → \`\\\\\`、
  \`.\` → \`\\.\`、\`:\` → \`\\:\`、\`,\` → \`\\,\`、\`{\` → \`\\{\`、\`}\` → \`\\}\`、
  \`[\` → \`\\[\`、\`]\` → \`\\]\`、LF → \`\\n\`、CR → \`\\r\`。
- \`<key-char>\` 排除的其余内容 —— \`(\`、\`)\`、DEL(\`0x7F\`),以及
  任何不属于 § 3.3 空白成员的 0x20 以下控制字节 —— 没有命名
  escape,MUST 以 \`\\uXXXX\`(§ 3.7.1)输出。
- 位于段首或段尾的 § 3.3 空白码点同样 MUST escape 而非字面
  输出,即使 § 4 在其他情况下允许空白作为普通的键内部内容:
  若不 escape,它会在重解析时被悄悄修剪掉,从而改变键。存在
  命名形式时使用命名形式(LF、CR —— 见上面第一条),否则使用
  \`\\uXXXX\`;两种形式都不受 § 4 原始字节修剪规则的影响,因为被
  修剪的是 escape 自身的 ASCII 拼写(\`\\\` 加字母或四位十六进制
  数字),而不是空白字节本身。内部空白无需 escape。

规范写入器实际上永远不会对 \`##\` 前缀键的首段执行这一方案:
上面的选形规则 (d) 已在考虑裸形式之前就将其导向 quoted 形式,
因为第 1-3 条中的任何 escape 都不会改变输出行的原始前两个
字节。\`\\u0023#a\\:b\`(仅 escape 开头的 \`#\`,即本条替代之前
的原裸形式方案)对键 \`##a:b\` 而言仍是一种有效、可解码的
非规范 INPUT 拼写 —— 解析器 MUST 仍然接受它 —— 但它绝不是
规范 OUTPUT:任何内容以 \`##\` 开头的键,其规范形式始终是
quoted 形式 \`"##a:b"\`(依据 (d)),而不是 \`\\u0023#a\\:b\`。

若选择 quoted 形式,writer 将段的解码内容输出在两个 \`"\` 字符
之间,只 escape:

- 内容中的裸 \`"\` —— 作为 \`\\"\` —— quoted 段内部唯一的结构性
  字节,因为 \`"\` 是固定分隔符;
- \`\\\`(反斜杠)—— 作为 \`\\\\\` —— 反斜杠在两种形式中始终是
  escape 前导;
- LF / CR —— 作为 \`\\n\` / \`\\r\` —— 键 MUST 保持单行;
- 任何其他不属于 § 3.3 空白成员的 0x20 以下控制字节,或 DEL
  —— 作为 \`\\uXXXX\` —— 加引号只放宽了对 STRUCTURAL 字节的
  escape 要求,并不放宽格式另一条「键中不允许裸不可见、非空白
  字节」的规则。属于 § 3.3 空白成员的控制字节(制表符、VT、
  FF)不在本条之列,原因与它不在上面裸形式对应条目之列相同:
  § 4 的 \`<dq-char>\` / \`<sq-char>\` / \`<bt-char>\` 已经允许它以
  裸形式出现,因此这里无需 \`\\uXXXX\` escape,不论它出现在段的
  边界还是内部(见下面关于边缘空白的说明,该说明并不限于非
  控制的空白)。

`,
};
