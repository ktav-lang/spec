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
reached, and a lone inline \`(\` token or \`((\` token is an ordinary
String containing one ASCII byte (\`"("\`) or two ASCII bytes
(\`"(("\`), respectively, not a multi-line opener, since an inline
compound cannot continue onto a later line.

For rules 6–9, a body beginning with \`{\` or \`[\` is scanned with the
quote-aware, escape-aware delimiter rules of § 5.8. A closer is
**matching** only when it is unescaped and returns the compound's
delimiter depth to zero. If an invalid escape is encountered while
scanning for that closer, the result is \`BadEscapeSequence\` (§ 6.13),
which takes precedence over a missing closer. This precedence applies
before deciding between rules 8 and 9.
An unterminated quoted key remains quote-opaque and is diagnosed per
§ 6.16 as \`UnterminatedInlineCompound\`, even if an otherwise bad
escape occurs inside that unclosed quoted segment.
The scan is also scalar-aware: dispatch is decided once from the first
non-whitespace byte. If that byte is neither \`{\` nor \`[\`, later
\`{\`, \`}\`, \`[\`, and \`]\` bytes follow the inline-scalar delimiter
rules of § 5.8.5 rather than changing nested compound depth. A raw-marker
body is opaque to this dispatch: after \`::\`, § 5.8's
\`<inline-raw-scalar>\` treats those bytes as literal data and never enters
this compound scan.

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
8. If the body starts with \`{\` and a matching \`}\` occurs on the same
   line, but the body has non-whitespace content after that closer or
   has another structural defect inside the closed compound →
   \`MalformedInlineCompound\` (§ 6.12).
9. If the body starts with \`{\` and no matching \`}\` occurs on the same
   line → unterminated inline object — error (§ 6.11). The analogous
   rule applies to \`[\` and \`]\`: a same-line matching \`]\` followed by
   content, or enclosing any other structural defect, is
   \`MalformedInlineCompound\`; no same-line matching \`]\` is
   \`UnterminatedInlineCompound\`.
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
    its numeric value is finite in the implementation's declared
    Float domain (§ 5): Float carrying the numeric value parsed
    from the body. The declared-domain check includes § 5's requirement
    that every admitted non-zero finite Float have a finite decimal
    candidate that round-trips exactly under the declared conversion
    semantics; positive and negative zero are admitted separately by the
    zero rule of § 5.9.8.
    The internal representation is implementation-defined (see § 5
    description of Float); the canonical textual form is specified in
    § 5.9.8. A literal whose
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
будет достигнут § 5.2, а одиночный inline-токен \`(\` или \`((\` —
обычная String, содержащая соответственно один ASCII-байт
(\`"("\`) или два ASCII-байта (\`"(("\`), а не многострочный опенер,
поскольку inline-составное не может продолжаться на следующей строке.

Для правил 6–9 тело, начинающееся с \`{\` или \`[\`, сканируется с учётом
кавычек, escape и глубины разделителей по § 5.8. Закрывающий разделитель
считается **соответствующим**, только если он не escape-нут и возвращает
глубину составного к нулю. Если при поиске этого разделителя встречается
недопустимая escape-последовательность, результатом является
\`BadEscapeSequence\` (§ 6.13), имеющая приоритет над отсутствующим
закрывающим разделителем. Этот приоритет применяется до выбора между
правилами 8 и 9.
Незакрытый quoted-ключ остаётся непрозрачным для кавычек и
диагностируется по § 6.16 как \`UnterminatedInlineCompound\`, даже если внутри этого
незакрытого quoted-сегмента встречается иная ошибочная escape-последовательность.
Сканирование также учитывает скалярный режим: диспетчеризация выбирается
один раз по первому непробельному байту. Если этот байт не является \`{\`
или \`[\`, последующие байты \`{\`, \`}\`, \`[\` и \`]\` подчиняются
правилам разделителей inline-скаляра из § 5.8.5, а не меняют глубину
вложенного составного. Тело с raw-маркером непрозрачно для этой
диспетчеризации: после \`::\` \`<inline-raw-scalar>\` из § 5.8 считает эти
байты литеральными данными и никогда не входит в это сканирование.

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
8. Если тело начинается с \`{\`, и соответствующая \`}\` встречается на
   той же строке, но после неё в теле есть непустое содержимое, либо
   внутри замкнутого составного есть другой структурный дефект →
   \`MalformedInlineCompound\` (§ 6.12).
9. Если тело начинается с \`{\`, но на той же строке нет соответствующей
   \`}\` → незакрытый inline-объект — ошибка (§ 6.11). Аналогично для
   \`[\` и \`]\`: \`]\`, за которым следует содержимое, или другой
   структурный дефект внутри замкнутого составного, означает
   \`MalformedInlineCompound\`; отсутствие соответствующей \`]\` на той
   же строке означает \`UnterminatedInlineCompound\`.
10. Если тело — в точности \`null\` → Null.
11. Если тело — в точности \`true\` → Bool \`true\`.
12. Если тело — в точности \`false\` → Bool \`false\`.
13. Если тело соответствует грамматике **integer literal** (§ 3.6)
    и числовое значение помещается как минимум в диапазон i64
    (-2^63 .. 2^63 - 1, т.е. -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807): Integer, несущий это числовое значение.
    Его канонический текст — десятичная нормализация по § 5.
    Реализации MAY поддерживать
    более широкий диапазон (например, произвольная точность /
    \`bignum\`); значение, превышающее поддерживаемый реализацией
    диапазон, проваливается в правило 15 (String). Для гарантии
    интероперабельности переносимый документ SHOULD NOT полагаться
    на Integer-типизацию вне i64-диапазона; 0.7.0-конформный парсер
    на строго-i64 бэкенде MUST помещать такие переполняющие тела в
    правило 15.
14. Если тело соответствует грамматике **float literal** (§ 3.6) и
    его числовое значение конечно в заявленном реализацией домене
    Float (§ 5): Float, несущий числовое значение, разобранное из
    тела. Проверка заявленного домена включает требование § 5, чтобы
    каждый допускаемый ненулевой конечный Float имел конечный десятичный
    кандидат, точно проходящий round-trip с заявленной семантикой
    преобразования; положительный и отрицательный ноль допускаются
    отдельно по правилу нуля § 5.9.8. Внутреннее представление определяется
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

`,
  zh: `
给定**标量体** —— 经 trim 后的文本,来自 pair-line 在 \`:\` 之后,
或来自 inline 标量在 escape 处理(§ 3.7)之后,或来自无标记的
array-item line。解析器按顺序分类;首个匹配规则胜出。\`::\` 之后的体
**不**经 § 5.2;按 § 5.3 / § 5.4 / § 5.8 当作原始 String 处理。规则
1–4(多行 Object/Array/字符串开启符)同样从不适用于 inline 标量体:
§ 5.8.5 已在到达 § 5.2 之前,将 inline 值开头的 \`{\`/\`[\` 分发给嵌套
复合值解析;而 inline 位置上单独出现的 \`(\` 标记或 \`((\` 标记是
普通 String,分别包含一个 ASCII 字节(\`"("\`)或两个 ASCII 字节
(\`"(("\`),而非多行开启符,因为 inline 复合值无法延续到下一行。

对于规则 6–9,以 \`{\` 或 \`[\` 开头的体按 § 5.8 的 quote-aware、escape-aware
分隔符规则扫描。只有未 escape 且使复合值分隔符深度回到零的闭合符才是
**匹配**闭合符。如果在扫描该闭合符时遇到无效 escape,结果为
\`BadEscapeSequence\`(§ 6.13),其优先级高于缺失闭合符。该优先级在决定
规则 8 或 9 之前适用。
未终止的 quoted 键保持引号不透明, 并按 § 6.16 诊断为
\`UnterminatedInlineCompound\`,即使该未闭合 quoted 段内部还出现了其他错误 escape。
扫描还必须感知标量模式:根据首个非空白字节只作一次分发决定。
如果该字节既不是 \`{\` 也不是 \`[\`,后续的 \`{\`、\`}\`、\`[\` 与 \`]\`
按 § 5.8.5 的 inline 标量分隔符规则处理,而不是改变嵌套复合深度。
raw-marker 体对这种分发是不透明的:在 \`::\` 之后,§ 5.8 的
\`<inline-raw-scalar>\` 将这些字节视为字面数据,从不进入此复合扫描。

1. 体恰为 \`{\` → 打开新的 Object scope(多行)。
2. 体恰为 \`[\` → 打开新的 Array scope(多行)。
3. 体恰为 \`(\` → 打开多行字符串(stripped,§ 5.6)。
4. 体恰为 \`((\` → 打开多行字符串(verbatim,§ 5.6)。
5. 体为 \`()\` 或 \`(())\` → 空 String。
6. 体匹配**闭合 inline 对象** \`{ … }\` → 按 § 5.8 产出 inline Object。
7. 体匹配**闭合 inline 数组** \`[ … ]\` → 按 § 5.8 产出 inline Array。
8. 体以 \`{\` 开头,且同一行出现匹配的 \`}\`,但该闭合符之后还有
   非空白内容,或闭合复合值内部存在其他结构缺陷 →
   \`MalformedInlineCompound\`(§ 6.12)。
9. 体以 \`{\` 开头,且同一行没有匹配的 \`}\` → 未终止 inline 对象错误
   (§ 6.11)。\`[\`/\`]\` 同理:匹配的 \`]\` 后还有内容,或闭合复合值内部有
   其他结构缺陷,是 \`MalformedInlineCompound\`;同一行没有匹配的 \`]\`
   则是 \`UnterminatedInlineCompound\`。
10. 体恰为 \`null\` → Null。
11. 体恰为 \`true\` → Bool \`true\`。
12. 体恰为 \`false\` → Bool \`false\`。
13. 若体匹配**整数字面量**语法(§ 3.6)且数值至少落在 i64 范围内
    (-2^63 .. 2^63 - 1,即 -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807):Integer,携带该数值。其规范文本是
    § 5 所述的十进制归一化。实现 MAY 支持更宽范围(例如 bignum / 任意精度);
    超出实现支持范围的值回退到规则 15(String)。为保证互操作,
    可移植文档 SHOULD NOT 依赖于 i64 范围之外的 Integer 类型化;
    运行于严格 i64 后端的 0.7.0 兼容解析器 MUST 将这类溢出体归入
    规则 15。
14. 若体匹配**浮点字面量**语法(§ 3.6)且其数值在实现所声明的
    Float 域(§ 5)内有限:Float,携带从体解析的数值。声明域的检查
    还包括 § 5 的要求:每个被接纳的非零有限 Float 都必须有一个有限
    十进制候选,并按声明的转换语义精确 round-trip;正零与负零按
    § 5.9.8 的零规则单独接纳。内部表示
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

`,
};
