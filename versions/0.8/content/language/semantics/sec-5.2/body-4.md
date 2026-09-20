>>>>> lang=en
1. If the body is exactly `{` → open a new Object scope (multi-line).
2. If the body is exactly `[` → open a new Array scope (multi-line).
3. If the body is exactly `(` → open a multi-line string (stripped
   form, § 5.6).
4. If the body is exactly `((` → open a multi-line string (verbatim
   form, § 5.6).
5. If the body is `()` or `(())` → empty String.
6. If the body matches the **closed-inline-object** shape `{ … }`
   with balanced delimiters and a matching `}` at the end of the
   body → produce the inline Object per § 5.8.
7. If the body matches the **closed-inline-array** shape `[ … ]` →
   produce the inline Array per § 5.8.
8. If the body starts with `{` and a matching `}` occurs on the same
   line, but the body has non-whitespace content after that closer or
   has another structural defect inside the closed compound →
   `MalformedInlineCompound` (§ 6.12).
9. If the body starts with `{` and no matching `}` occurs on the same
   line → unterminated inline object — error (§ 6.11). The analogous
   rule applies to `[` and `]`: a same-line matching `]` followed by
   non-whitespace content, or enclosing any other structural defect, is
   `MalformedInlineCompound`; no same-line matching `]` is
   `UnterminatedInlineCompound`.
10. If the body is exactly `null` → Null.
11. If the body is exactly `true` → Bool `true`.
12. If the body is exactly `false` → Bool `false`.
13. If the body matches the **integer literal** grammar (§ 3.6) and
    its digit run does **not** begin with a redundant leading zero,
    and its numeric value fits at least the i64 range
    (-2^63 .. 2^63 - 1, i.e. -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807): Integer carrying the integer value.
    The canonical textual form is the base-10 decimal normalisation
    described in § 5 (and § 5.9.8). Implementations MAY support a
    wider integer range (e.g. arbitrary precision / `bignum`); a
    value that exceeds the implementation's supported range falls
    through to rule 15 (String). To guarantee interoperability, a
    portable document SHOULD NOT rely on Integer-typing for values
    outside the i64 range; a 0.8.0-conformant parser running on a
    strictly-i64 backend MUST place such overflow bodies into rule 15.
    A **redundant leading zero** is a base-10 digit run whose first
    digit is `0` while at least one further digit follows, with or
    without a sign and ignoring underscore separators: `01234`,
    `-045`, `00`, `0_7`. Such a body is never an Integer; it falls
    through to rule 15 and is a String carrying the digits exactly as
    written. Inferring `1234` from `01234` would destroy the
    difference between the identifier `01234` — a postal code, a
    phone number, an account number — and the quantity `1234`, and no
    later stage can restore it, which is why this is the one numeric
    spelling § 5.2 refuses rather than canonicalises. The exception is
    confined to base 10: in `0x1A`, `0o755` and `0b1010` the `0`
    belongs to the base prefix and is not a redundant digit, and a
    body of exactly `0` has no further digit to make it redundant.
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
    binary64 backend given `1e9999`, which overflows to infinity —
    falls through to rule 15 (String), exactly as an out-of-range
    Integer literal does under rule 13. The grammar of § 3.6 can
    express magnitudes beyond what any Float domain holds finite,
    but no such literal is ever classified as Float: a
    0.8.0-conformant parser MUST NOT produce a non-finite Float via
    this rule — which is what makes § 5.9.0's "no literal grammar
    of § 3.6 produces a non-finite Float" claim true. Underflow to
    ±0.0 (e.g. `1e-9999` on binary64) is not a fallback case: zero
    is finite, so such a literal is an ordinary Float.
    Rule 13's redundant-leading-zero exception applies here too, to
    the digits before the decimal point — or before the exponent in
    the point-less alternative: `01.5` and `05e3` are Strings, while
    `0.5`, whose integer part is exactly `0`, is an ordinary Float.
15. Otherwise → String whose content is the body, as written.

>>>>> lang=ru
1. Если тело — в точности `{` → открыть новый Object scope
   (многострочный).
2. Если тело — в точности `[` → открыть новый Array scope
   (многострочный).
3. Если тело — в точности `(` → открыть многострочную строку
   (stripped, § 5.6).
4. Если тело — в точности `((` → открыть многострочную строку
   (verbatim, § 5.6).
5. Если тело — `()` или `(())` → пустая String.
6. Если тело соответствует форме **замкнутого inline-объекта**
   `{ … }` (балансированные разделители, соответствующая `}` в
   конце тела) → дать inline Object по § 5.8.
7. Если тело соответствует форме **замкнутого inline-массива**
   `[ … ]` → дать inline Array по § 5.8.
8. Если тело начинается с `{`, и соответствующая `}` встречается на
   той же строке, но после неё в теле есть непробельное содержимое, либо
   внутри замкнутого составного есть другой структурный дефект →
   `MalformedInlineCompound` (§ 6.12).
9. Если тело начинается с `{`, но на той же строке нет соответствующей
   `}` → незакрытый inline-объект — ошибка (§ 6.11). Аналогично для
   `[` и `]`: `]`, за которым следует непробельное содержимое, или другой
   структурный дефект внутри замкнутого составного, означает
   `MalformedInlineCompound`; отсутствие соответствующей `]` на той
   же строке означает `UnterminatedInlineCompound`.
10. Если тело — в точности `null` → Null.
11. Если тело — в точности `true` → Bool `true`.
12. Если тело — в точности `false` → Bool `false`.
13. Если тело соответствует грамматике **integer literal** (§ 3.6),
    его ряд цифр **не** начинается с избыточного ведущего нуля,
    и числовое значение помещается как минимум в диапазон i64
    (-2^63 .. 2^63 - 1, т.е. -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807): Integer, несущий это числовое значение.
    Его канонический текст — десятичная нормализация по § 5
    (и § 5.9.8). Реализации MAY поддерживать
    более широкий диапазон (например, произвольная точность /
    `bignum`); значение, превышающее поддерживаемый реализацией
    диапазон, проваливается в правило 15 (String). Для гарантии
    интероперабельности переносимый документ SHOULD NOT полагаться
    на Integer-типизацию вне i64-диапазона; 0.8.0-конформный парсер
    на строго-i64 бэкенде MUST помещать такие переполняющие тела в
    правило 15.
    **Избыточный ведущий ноль** — это ряд цифр по основанию 10, чья
    первая цифра `0`, при этом следует хотя бы ещё одна цифра, со
    знаком или без и без учёта разделителей-подчёркиваний: `01234`,
    `-045`, `00`, `0_7`. Такое тело никогда не является Integer; оно
    проваливается в правило 15 и становится String, несущей цифры
    ровно так, как они написаны. Вывод `1234` из `01234` уничтожил бы
    различие между идентификатором `01234` — почтовым индексом,
    номером телефона, номером счёта — и величиной `1234`, и ни одна
    последующая стадия его не восстановит; именно поэтому это
    единственное числовое написание, которое § 5.2 отвергает, а не
    канонизирует. Исключение ограничено основанием 10: в `0x1A`,
    `0o755` и `0b1010` `0` принадлежит префиксу основания и не
    является избыточной цифрой, а у тела ровно `0` нет следующей
    цифры, которая сделала бы его избыточным.
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
    `1e9999`, переполняющийся в бесконечность, — проваливается в
    правило 15 (String), в точности как выходящий за диапазон
    Integer-литерал в правиле 13. Грамматика § 3.6 может выражать
    величины, которые ни один домен Float не вмещает конечным
    значением, но такой литерал никогда не классифицируется как
    Float: 0.8.0-конформный парсер MUST NOT порождать неконечный
    Float через это правило — именно это делает истинным
    утверждение § 5.9.0 о том, что «ни одна грамматика литералов
    § 3.6 не порождает неконечный Float». Underflow в ±0.0
    (например, `1e-9999` на binary64) — не случай отката: ноль
    конечен, поэтому такой литерал — обычный Float.
    Исключение правила 13 для избыточного ведущего нуля действует и
    здесь — для цифр перед десятичной точкой, а в альтернативе без
    точки перед экспонентой: `01.5` и `05e3` — это String, тогда как
    `0.5`, чья целая часть — ровно `0`, — обычный Float.
15. Иначе → String, содержимое которой — тело как написано.

>>>>> lang=zh
1. 体恰为 `{` → 打开新的 Object scope(多行)。
2. 体恰为 `[` → 打开新的 Array scope(多行)。
3. 体恰为 `(` → 打开多行字符串(stripped,§ 5.6)。
4. 体恰为 `((` → 打开多行字符串(verbatim,§ 5.6)。
5. 体为 `()` 或 `(())` → 空 String。
6. 体匹配**闭合 inline 对象** `{ … }`(分隔符平衡,且体末尾有匹配
   的 `}`)→ 按 § 5.8 产出 inline Object。
7. 体匹配**闭合 inline 数组** `[ … ]` → 按 § 5.8 产出 inline Array。
8. 体以 `{` 开头,且同一行出现匹配的 `}`,但该闭合符之后还有
   非空白内容,或闭合复合值内部存在其他结构缺陷 →
   `MalformedInlineCompound`(§ 6.12)。
9. 体以 `{` 开头,且同一行没有匹配的 `}` → 未终止 inline 对象错误
   (§ 6.11)。`[`/`]` 同理:匹配的 `]` 后还有非空白内容,或闭合复合值内部有
   其他结构缺陷,是 `MalformedInlineCompound`;同一行没有匹配的 `]`
   则是 `UnterminatedInlineCompound`。
10. 体恰为 `null` → Null。
11. 体恰为 `true` → Bool `true`。
12. 体恰为 `false` → Bool `false`。
13. 若体匹配**整数字面量**语法(§ 3.6)、其数字串**不**以冗余前导零
    开头,且数值至少落在 i64 范围内
    (-2^63 .. 2^63 - 1,即 -9_223_372_036_854_775_808 ..
    9_223_372_036_854_775_807):Integer,携带该数值。其规范文本是
    § 5 所述的十进制归一化(及 § 5.9.8)。实现 MAY 支持更宽范围
    (例如 `bignum` / 任意精度);
    超出实现支持范围的值回退到规则 15(String)。为保证互操作,
    可移植文档 SHOULD NOT 依赖于 i64 范围之外的 Integer 类型化;
    运行于严格 i64 后端的 0.8.0 兼容解析器 MUST 将这类溢出体归入
    规则 15。
    **冗余前导零**指以 `0` 开头且后面至少还有一位数字的十进制数字串,
    无论有无符号、忽略下划线分隔符:`01234`、`-045`、`00`、`0_7`。
    此类体永远不是 Integer;它回退到规则 15,成为一个按书写原样携带
    这些数字的 String。从 `01234` 推断出 `1234` 会摧毁标识符
    `01234`(邮政编码、电话号码、账号)与数量 `1234` 之间的区别,而且
    后续任何阶段都无法恢复它 —— 这正是 § 5.2 拒绝而非规范化的唯一一种
    数字写法。该例外仅限十进制:在 `0x1A`、`0o755` 与 `0b1010` 中,
    `0` 属于进制前缀,并非冗余数字;而体恰为 `0` 时,其后没有另一位
    数字使其成为冗余。
14. 若体匹配**浮点字面量**语法(§ 3.6)且其数值在实现所声明的
    Float 域(§ 5)内有限:Float,携带从体解析的数值。声明域的检查
    还包括 § 5 的要求:每个被接纳的非零有限 Float 都必须有一个有限
    十进制候选,并按声明的转换语义精确 round-trip;正零与负零按
    § 5.9.8 的零规则单独接纳。内部表示
    由实现定义(见 § 5);规范文本形式见 § 5.9.8。解析值在该域内
    非有限的字面量 —— 例如 binary64 后端遇到 `1e9999`,溢出为
    无穷 —— 回退到规则 15(String),与规则 13 中超出范围的整数
    字面量完全一致。§ 3.6 的语法可以表达任何 Float 域都无法有限
    表示的量级,但这类字面量永远不会被分类为 Float:0.8.0 兼容
    解析器 MUST NOT 经由此规则产生非有限 Float —— 这正是
    § 5.9.0「§ 3.6 的任何字面量语法都不产生非有限 Float」这一
    断言为真的原因。下溢到 ±0.0(例如 binary64 上的 `1e-9999`)
    不属于回退情形:零是有限的,此类字面量就是普通的 Float。
    规则 13 的冗余前导零例外在此同样适用,作用于小数点之前的数字 ——
    在无小数点的那个备选式中则作用于指数之前的数字:`01.5` 与 `05e3`
    是 String,而整数部分恰为 `0` 的 `0.5` 是普通的 Float。
15. 否则 → String,内容为写入的体。

