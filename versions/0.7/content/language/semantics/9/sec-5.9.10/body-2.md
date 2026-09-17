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
若选择裸形式,writer MUST 对 `<key-char>`(§ 4)从原始内容中排除
的每个码点重新 escape,加上位于段首或段尾的任意 § 3.3 空白码点
(否则会被 § 4 的 trim 规则在重解析时移除):

