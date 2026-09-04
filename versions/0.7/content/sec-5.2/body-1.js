export default {
  en: `
Given a **scalar body** — the trimmed text obtained from a pair-line
body after a plain \`:\` separator, or the trimmed text of an inline
scalar after escape processing (§ 3.7), or the trimmed text of an
array-item line that uses no marker — the parser classifies it as
follows. Rules are applied in order; the first matching rule wins.
Bodies after \`::\` are **not** dispatched through § 5.2; they are
handled per § 5.3 / § 5.4 / § 5.8 as raw Strings. Rules 1–4 (the
multi-line Object/Array/string openers) never apply to an inline
scalar body either: § 5.8.5 already dispatches an inline value's
leading \`{\`/\`[\` to nested-compound parsing before § 5.2 is ever
reached, and a lone \`(\`/\`((\` in inline position is an ordinary
one-byte String, not a multi-line opener, since an inline compound
cannot continue onto a later line.

1. If the body is exactly \`{\` → open a new Object scope (multi-line).
2. If the body is exactly \`[\` → open a new Array scope (multi-line).
3. If the body is exactly \`(\` → open a multi-line string (stripped
   form, § 5.6).
4. If the body is exactly \`((\` → open a multi-line string (verbatim
   form, § 5.6).
5. If the body is \`()\` or \`(())\` → empty String.
6. If the body matches the **closed-inline-object** shape \`{ … }\`
   with balanced delimiters and a matching \`}\` at the end of the
   body → produce the inline Object per § 5.8.
7. If the body matches the **closed-inline-array** shape \`[ … ]\` →
   produce the inline Array per § 5.8.
8. If the body starts with \`{\` but does not match rules 1 or 6
   (e.g. \`{ a: 1\`) → unterminated inline object — error (§ 6.11).
9. If the body starts with \`[\` but does not match rules 2 or 7 →
   unterminated inline array — error (§ 6.11).
10. If the body is exactly \`null\` → Null.
11. If the body is exactly \`true\` → Bool \`true\`.
12. If the body is exactly \`false\` → Bool \`false\`.
13. If the body matches the **integer literal** grammar (§ 3.6) and
    its numeric value fits at least the i64 range
    (-2^63 .. 2^63 - 1, i.e. -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807): Integer carrying the integer value.
    The canonical textual form is the base-10 decimal normalisation
    described in § 5 (and § 5.9.8). Implementations MAY support a
    wider integer range (e.g. arbitrary precision / \`bignum\`); a
    value that exceeds the implementation's supported range falls
    through to rule 15 (String). To guarantee interoperability, a
    portable document SHOULD NOT rely on Integer-typing for values
    outside the i64 range; a 0.7.0-conformant parser running on a
    strictly-i64 backend MUST place such overflow bodies into rule 15.
14. If the body matches the **float literal** grammar (§ 3.6) and
    its numeric value is finite in the implementation's supported
    Float domain (§ 5): Float carrying the numeric value parsed
    from the body. The internal representation is
    implementation-defined (see § 5 description of Float); the
    canonical textual form is specified in § 5.9.8. A literal whose
    parsed value would not be finite in that domain — e.g. a
    binary64 backend given \`1e9999\`, which overflows to infinity —
    falls through to rule 15 (String), exactly as an out-of-range
    Integer literal does under rule 13. The grammar of § 3.6 can
    express magnitudes beyond what any Float domain holds finite,
    but no such literal is ever classified as Float: a
    0.7.0-conformant parser MUST NOT produce a non-finite Float via
    this rule — which is what makes § 5.9.0's "no literal grammar
    of § 3.6 produces a non-finite Float" claim true. Underflow to
    ±0.0 (e.g. \`1e-9999\` on binary64) is not a fallback case: zero
    is finite, so such a literal is an ordinary Float.
15. Otherwise → String whose content is the body, as written.

The keyword forms \`null\`, \`true\`, \`false\` and the numeric literals
are matched **case-sensitively**. A body of \`True\`, \`NULL\`, \`False\`,
\`0xZZ\`, \`0o9\`, etc., is a String.

Scalar classification under this section is a deterministic function
of the trimmed, escape-processed byte sequence — determinism only,
not a license to re-run classification against escape-produced bytes
as if they were raw, unescaped source: § 3.7's provenance rule (an
escape's output is never re-examined as structural) applies here too,
so a body like \`\\{value\\}\` classifies by the literal characters
\`{value}\` under rule 15 (String), not by re-entering these rules at
the decoded \`{\`. More generally: an inline scalar body containing at
least one recognised escape sequence (§ 3.7) is always classified as
String (rule 15), regardless of what its decoded bytes would otherwise
resemble — a body like \`\\u0031\` (decoding to the single digit \`1\`) or
\`\\u0074rue\` (decoding to \`true\`) is \`String("1")\` / \`String("true")\`,
never \`Integer\` or \`Bool\`. This closes an ambiguity § 3.7's provenance
rule alone left open: that rule's enumeration of "structural" bytes
(the delimiters \`.\`, \`:\`, \`,\`, \`{\`, \`}\`, \`[\`, \`]\`) does not by itself
say whether an *escaped* digit, letter, or parenthesis is likewise
exempt from rules 10–14's number/keyword/paren-shortcut detection —
this sentence makes that exemption explicit and total: the presence of
any recognised escape sequence anywhere in the body is sufficient to
force String, full stop.
Two parser-conforming implementations that support
the same numeric domain MUST produce the same Value kind for the same
body. This is a general rule about every document a parser might see,
not just about the fixtures in § 8's conformance corpus. Where two
implementations' numeric domains differ, a body whose numeric value
crosses one implementation's domain boundary but not the other's MAY
classify differently between them — an out-of-range Integer or
non-finite-on-that-domain Float literal falls through to String under
rules 13–14 for the narrower domain but stays Integer or Float for the
wider one, for *any* body where this happens, not only for a
specifically named or enumerated one. This is not an exception to
determinism: it follows directly from each implementation correctly
applying its own domain's rules 13–14 to the same body, and the
same-kind guarantee itself is scoped to implementations of the same
domain from the start — it was never unconditional across domains.
§ 8.1 and § 8.2 separately name, for the shared conformance corpus
specifically, which fixtures are known to actually probe such a
boundary.

`,
  ru: `
Дано **скалярное тело** — обрезанный текст, полученный из тела
pair-line после \`:\`-разделителя, либо обрезанный текст inline-скаляра
после обработки escape (§ 3.7), либо обрезанный текст array-item-line
без маркера. Парсер классифицирует его так. Правила применяются по
порядку; побеждает первое совпавшее. Тела после \`::\` НЕ
диспетчеризуются через § 5.2; они обрабатываются по § 5.3 / § 5.4 /
§ 5.8 как сырые Strings. Правила 1–4 (открыватели многострочных
Object/Array/строки) также никогда не применяются к телу
inline-скаляра: § 5.8.5 уже диспетчеризует ведущий \`{\`/\`[\`
inline-значения во вложенный разбор составного до того, как вообще
будет достигнут § 5.2, а одиночный \`(\`/\`((\` в inline-позиции —
обычная однобайтовая String, а не многострочный опенер, поскольку
inline-составное не может продолжаться на следующей строке.

1. Если тело — в точности \`{\` → открыть новый Object scope
   (многострочный).
2. Если тело — в точности \`[\` → открыть новый Array scope
   (многострочный).
3. Если тело — в точности \`(\` → открыть многострочную строку
   (stripped, § 5.6).
4. Если тело — в точности \`((\` → открыть многострочную строку
   (verbatim, § 5.6).
5. Если тело — \`()\` или \`(())\` → пустая String.
6. Если тело соответствует форме **замкнутого inline-объекта**
   \`{ … }\` (балансированные разделители, соответствующая \`}\` в
   конце тела) → дать inline Object по § 5.8.
7. Если тело соответствует форме **замкнутого inline-массива**
   \`[ … ]\` → дать inline Array по § 5.8.
8. Если тело начинается с \`{\`, но не подпадает под правила 1 или 6
   → незакрытый inline-объект — ошибка (§ 6.11).
9. Если тело начинается с \`[\`, но не подпадает под правила 2 или 7
   → незакрытый inline-массив — ошибка (§ 6.11).
10. Если тело — в точности \`null\` → Null.
11. Если тело — в точности \`true\` → Bool \`true\`.
12. Если тело — в точности \`false\` → Bool \`false\`.
13. Если тело соответствует грамматике **integer literal** (§ 3.6)
    и числовое значение помещается как минимум в диапазон i64
    (-2^63 .. 2^63 - 1, т.е. -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807): Integer (текст Value = каноническая
    десятичная нормализация по § 5). Реализации MAY поддерживать
    более широкий диапазон (например, произвольная точность /
    \`bignum\`); значение, превышающее поддерживаемый реализацией
    диапазон, проваливается в правило 15 (String). Для гарантии
    интероперабельности переносимый документ SHOULD NOT полагаться
    на Integer-типизацию вне i64-диапазона; 0.7.0-конформный парсер
    на строго-i64 бэкенде MUST помещать такие переполняющие тела в
    правило 15.
14. Если тело соответствует грамматике **float literal** (§ 3.6) и
    его числовое значение конечно в поддерживаемом реализацией
    домене Float (§ 5): Float, несущий числовое значение,
    разобранное из тела. Внутреннее представление определяется
    реализацией (см. § 5); каноническая текстовая форма указана в
    § 5.9.8. Литерал, чьё разобранное значение не было бы конечным
    в этом домене — например, binary64-бэкенд, получивший
    \`1e9999\`, переполняющийся в бесконечность, — проваливается в
    правило 15 (String), в точности как выходящий за диапазон
    Integer-литерал в правиле 13. Грамматика § 3.6 может выражать
    величины, которые ни один домен Float не вмещает конечным
    значением, но такой литерал никогда не классифицируется как
    Float: 0.7.0-конформный парсер MUST NOT порождать неконечный
    Float через это правило — именно это делает истинным
    утверждение § 5.9.0 о том, что «ни одна грамматика литералов
    § 3.6 не порождает неконечный Float». Underflow в ±0.0
    (например, \`1e-9999\` на binary64) — не случай отката: ноль
    конечен, поэтому такой литерал — обычный Float.
15. Иначе → String, содержимое которой — тело как написано.

Ключевые формы \`null\`, \`true\`, \`false\` и числовые литералы
сопоставляются **с учётом регистра**. Тело \`True\`, \`NULL\`, \`False\`,
\`0xZZ\`, \`0o9\` и т.д. — это String.

Классификация скаляра в этой секции — детерминированная функция
обрезанной, прошедшей escape-обработку байтовой последовательности
— это только детерминизм, а не разрешение заново прогонять
классификацию против байтов, произведённых escape, как если бы
они были сырым, неэкранированным исходным текстом: правило
происхождения из § 3.7 (результат escape никогда не пересматривается
как структурный) действует и здесь, так что тело вида \`\\{value\\}\`
классифицируется по буквальным символам \`{value}\` согласно правилу
15 (String), а не через повторный вход в эти правила по
декодированной \`{\`. Более общо: inline-скалярное тело, содержащее
хотя бы одну распознанную escape-последовательность (§ 3.7), всегда
классифицируется как String (правило 15), независимо от того, на что
похожи его декодированные байты: тело вида \`\\u0031\` (декодируется в
единственную цифру \`1\`) или \`\\u0074rue\` (декодируется в \`true\`) — это
\`String("1")\` / \`String("true")\`, а не Integer и не Bool. Это закрывает
неоднозначность, которую само по себе оставляло открытым правило
происхождения из § 3.7: перечень «структурных» байтов в этом правиле
(разделители \`.\`, \`:\`, \`,\`, \`{\`, \`}\`, \`[\`, \`]\`) сам по себе не говорит,
освобождена ли *экранированная* цифра, буква или круглая скобка от
обнаружения по правилам 10–14 (числа/ключевого слова/скобочного
сокращения) — это предложение делает это освобождение явным и
тотальным: присутствие любой распознанной escape-последовательности в
любом месте тела достаточно, чтобы тело было String, точка. Две
реализации-парсера, конформные спецификации
и поддерживающие один и тот же числовой домен, MUST давать одинаковый
Value kind для одного и того же тела. Это общее правило о любом
документе, который может увидеть парсер, а не только о фикстурах
конформного корпуса § 8. Там, где числовые домены двух реализаций
различаются, тело, числовое значение которого пересекает границу
домена одной реализации, но не другой, MAY классифицироваться между
ними по-разному — выходящий за диапазон Integer- или неконечный на
этом домене Float-литерал проваливается в String по правилам 13–14
для более узкого домена, но остаётся Integer или Float для более
широкого, — для *любого* тела, где это происходит, а не только для
специально названного или перечисленного. Это не исключение из
детерминизма: оно напрямую следует из корректного применения каждой
реализацией правил 13–14 своего собственного домена к одному и тому
же телу, а сама гарантия одинакового kind изначально ограничена
реализациями одного и того же домена — она никогда не была
безусловной между доменами. § 8.1 и § 8.2 отдельно называют, уже
специально для общего конформного корпуса, какие фикстуры известны
как реально зондирующие такую границу.

`,
  zh: `
给定**标量体** —— 经 trim 后的文本,来自 pair-line 在 \`:\` 之后,
或来自 inline 标量在 escape 处理(§ 3.7)之后,或来自无标记的
array-item line。解析器按顺序分类;首个匹配规则胜出。\`::\` 之后的体
**不**经 § 5.2;按 § 5.3 / § 5.4 / § 5.8 当作原始 String 处理。规则
1–4(多行 Object/Array/字符串开启符)同样从不适用于 inline 标量体:
§ 5.8.5 已在到达 § 5.2 之前,将 inline 值开头的 \`{\`/\`[\` 分发给嵌套
复合值解析;而 inline 位置上单独出现的 \`(\`/\`((\` 是普通的单字节
String,而非多行开启符,因为 inline 复合值无法延续到下一行。

1. 体恰为 \`{\` → 打开新的 Object scope(多行)。
2. 体恰为 \`[\` → 打开新的 Array scope(多行)。
3. 体恰为 \`(\` → 打开多行字符串(stripped,§ 5.6)。
4. 体恰为 \`((\` → 打开多行字符串(verbatim,§ 5.6)。
5. 体为 \`()\` 或 \`(())\` → 空 String。
6. 体匹配**闭合 inline 对象** \`{ … }\` → 按 § 5.8 产出 inline Object。
7. 体匹配**闭合 inline 数组** \`[ … ]\` → 按 § 5.8 产出 inline Array。
8. 体以 \`{\` 开头但不符合规则 1 或 6 → 未终止 inline 对象错误
   (§ 6.11)。
9. 体以 \`[\` 开头但不符合规则 2 或 7 → 未终止 inline 数组错误。
10. 体恰为 \`null\` → Null。
11. 体恰为 \`true\` → Bool \`true\`。
12. 体恰为 \`false\` → Bool \`false\`。
13. 若体匹配**整数字面量**语法(§ 3.6)且数值至少落在 i64 范围内
    (-2^63 .. 2^63 - 1,即 -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807):Integer(Value 文本 = 规范十进制
    归一化)。实现 MAY 支持更宽范围(例如 bignum / 任意精度);
    超出实现支持范围的值回退到规则 15(String)。为保证互操作,
    可移植文档 SHOULD NOT 依赖于 i64 范围之外的 Integer 类型化;
    运行于严格 i64 后端的 0.7.0 兼容解析器 MUST 将这类溢出体归入
    规则 15。
14. 若体匹配**浮点字面量**语法(§ 3.6)且其数值在实现所支持的
    Float 域(§ 5)内有限:Float,携带从体解析的数值。内部表示
    由实现定义(见 § 5);规范文本形式见 § 5.9.8。解析值在该域内
    非有限的字面量 —— 例如 binary64 后端遇到 \`1e9999\`,溢出为
    无穷 —— 回退到规则 15(String),与规则 13 中超出范围的整数
    字面量完全一致。§ 3.6 的语法可以表达任何 Float 域都无法有限
    表示的量级,但这类字面量永远不会被分类为 Float:0.7.0 兼容
    解析器 MUST NOT 经由此规则产生非有限 Float —— 这正是
    § 5.9.0「§ 3.6 的任何字面量语法都不产生非有限 Float」这一
    断言为真的原因。下溢到 ±0.0(例如 binary64 上的 \`1e-9999\`)
    不属于回退情形:零是有限的,此类字面量就是普通的 Float。
15. 否则 → String,内容为写入的体。

关键词 \`null\`/\`true\`/\`false\` 与数字字面量**区分大小写**。\`True\`、
\`NULL\`、\`False\`、\`0xZZ\`、\`0o9\` 等形式为 String。

本节的标量分类是经 trim、经 escape 处理后字节序列的确定性函数 ——
这仅指确定性,并不允许把 escape 产生的字节当作未经转义的原始
源文本重新送入分类:§ 3.7 的来源规则(escape 的结果永远不会被
重新视为结构性内容)在此同样适用,因此形如 \`\\{value\\}\` 的体
按字面字符 \`{value}\` 依规则 15(String)分类,而不是在解码出的
\`{\` 处重新进入这些规则。更一般地:凡是含有至少一个已识别 escape
序列(§ 3.7)的 inline 标量体,一律分类为 String(规则 15),无论其
解码后的字节看起来像什么 —— 形如 \`\\u0031\`(解码为单个数字 \`1\`)或
\`\\u0074rue\`(解码为 \`true\`)的体是 \`String("1")\` /
\`String("true")\`,绝不是 Integer 或 Bool。这补上了 § 3.7 的来源规则
单独所未能消除的歧义:该规则对「结构性」字节的枚举(分隔符 \`.\`、
\`:\`、\`,\`、\`{\`、\`}\`、\`[\`、\`]\`)本身并未说明*被转义*的数字、字母或
括号是否同样豁免于规则 10–14 的数字/关键词/括号 shortcut 检测 ——
本句使该豁免明确且彻底:体中任何位置出现任一已识别 escape 序列,
即足以强制分类为 String,仅此而已。数值域相同的两个
parser-conforming 实现 MUST 对同一体产生相同的 Value kind。这是一条
关于解析器可能看到的每个文档的一般规则,而不仅限于 § 8 合规语料中
的 fixture。当两个实现的数值域不同时,一个数值越过其中一个实现的
域边界而不越过另一个的体 MAY 在二者之间分类不同 —— 超出范围的
Integer 或在该域上非有限的 Float 字面量,在较窄域下依规则 13–14
落入 String,在较宽域下则保持 Integer 或 Float;对发生此种情形的
*任何*体皆是如此,而不仅限于被特别指名或枚举的体。这不是确定性
规则的例外:它直接源于每个实现把自己的域的规则 13–14 正确地应用于
同一体,而同 kind 的保证本身就限定于同域的实现 —— 它从来不是跨域
无条件的。§ 8.1 与 § 8.2 另行指名,专就共享合规语料而言,哪些
fixture 已知确实探测这样的边界。

`,
};
