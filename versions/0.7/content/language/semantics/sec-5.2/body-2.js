export default {
  en: `The keyword forms \`null\`, \`true\`, \`false\` and the numeric literals
are matched **case-sensitively**. A body of \`True\`, \`NULL\`, \`False\`,
\`0xZZ\`, \`0o9\`, etc., is a String.

Scalar classification under this section is a deterministic function
of the trimmed, escape-processed byte sequence plus a retained
contained-recognised-escape provenance flag — the flag is part of the
classifier's input, not a license to re-run classification against
escape-produced bytes
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
exempt from rule 5's parenthesis shortcuts and rules 10–14's
keyword/numeric detection —
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
  ru: `Ключевые формы \`null\`, \`true\`, \`false\` и числовые литералы
сопоставляются **с учётом регистра**. Тело \`True\`, \`NULL\`, \`False\`,
\`0xZZ\`, \`0o9\` и т.д. — это String.

Классификация скаляра в этой секции — детерминированная функция
обрезанной, прошедшей escape-обработку байтовой последовательности
плюс сохранённого флага происхождения, отмечающего наличие
распознанной escape-последовательности в теле; этот флаг входит во вход
классификатора, а не разрешает заново прогонять
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
обнаружения по правилу 5 (скобочные shortcut'ы) и правилам 10–14
(ключевое слово/числа) — это предложение делает это освобождение явным и
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
  zh: `本节的标量分类是经 trim、经 escape 处理后的字节序列加上保留的
「体内含有已识别 escape」来源标志的确定性函数 —— 该标志是分类器
的输入,并不允许把 escape 产生的字节当作未经转义的原始
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
括号是否同样豁免于规则 5 的括号 shortcut 以及规则 10–14 的数字/关键词
检测 ——
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
