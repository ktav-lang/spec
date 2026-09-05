export default {
  en: `
A compliant parser produces a **Value** for a conforming document.
Value is one of: **Null**, **Bool**, **Integer**, **Float**, **String**,
**Array**, **Object**.

- **Null** — a single distinguished value.
- **Bool** — \`true\` or \`false\`.
- **Integer** — a numeric scalar carrying an integer value. The
  implementation MUST support at least the i64 range
  (-2^63 .. 2^63 - 1) and MAY support a wider range (e.g. arbitrary
  precision). The \`valid/\` conformance fixtures (§ 8.1) assume this
  minimum i64 domain for scalar classification (§ 5.2 rule 13): an
  integer literal outside the i64 range is a String for a
  minimum-domain implementation, so \`i64_overflow_to_string.json\`
  expects the String \`"9223372036854775808"\`. § 8.1 / § 8.2 and
  \`versions/0.7/tests/boundary-fixtures.json\` define, at the level
  of individual leaves, exactly where and how a wider-domain
  implementation MAY legitimately diverge from a minimum-domain
  fixture oracle. The canonical textual form of an Integer
  is a base-10
  decimal string with no underscores and no leading zeros (except
  the literal \`0\`); a leading \`+\` is dropped; signed-zero literals
  (\`+0\`, \`-0\`) normalise to \`0\`. The canonical form is used by
  writer-conforming implementations (§ 5.9).
- **Float** — an abstract numeric scalar carrier. A programmatic Value MAY
  carry a finite or non-finite IEEE-style value; the carrier MUST
  distinguish NaN, +Infinity, and -Infinity so writer-conformance tests
  can supply the § 5.9.0 fixture for each sentinel. These sentinels are
  outside the parseable and canonical Float domains. A Float produced by
  parsing MUST be finite and belong to the implementation's **declared
  Float domain**. That declaration MUST include the finite
  values admitted as Ktav Floats, the decimal-conversion and rounding
  semantics used to parse and render them, and a deterministic conversion
  policy. Every non-zero finite Float admitted to the declared Ktav Float domain
  MUST have at least one finite decimal candidate \`(s, D, k)\` whose exact
  decimal value reparses under those declared semantics to exactly that
  Float (§ 5.9.8). Positive and negative zero are admitted separately by
  the zero rule in § 5.9.8. A wider host representation MAY contain non-zero
  finite values with no such candidate (for example, exact-rational \`1/3\`),
  but such a value is outside the declared Ktav Float domain and MUST NOT be admitted
  as a Ktav Float. The implementation MUST support at least the range and
  precision of IEEE 754 binary64 and MAY support a wider representation
  (e.g. arbitrary-precision decimal). For the minimum binary64 domain,
  converting a decimal float literal (§ 3.6) MUST follow IEEE 754's
  \`roundTiesToEven\` rounding-direction attribute, and the representation
  MUST include subnormal (gradual-underflow) values down to binary64's
  smallest positive subnormal (2^-1074 ≈ 4.9406564584124654 × 10^-324).
  An implementation that flushes subnormals to zero early, or rounds ties
  away from even, does not meet this floor even though it never produces a
  non-finite Float. The internal representation beyond the declared
  domain is implementation-defined. The canonical textual form (§ 5.9)
  MUST be used by writer-conforming implementations. The Value does **not**
  preserve the textual form as written; underscores, the choice of \`e\`
  vs \`E\`, and leading-\`+\` signs are not part of the Value model.
- **String** — a (possibly empty) UTF-8 string.
- **Array** — an ordered sequence of Values.
- **Object** — an ordered sequence of (name, Value) pairs, names
  being strings. Name uniqueness is required within an Object (§ 5.5).

The root Value produced by parsing a document is either an Object or
an Array (each possibly empty). The kind of the root is determined
by the first content line of the document — see § 5.0.1.

`,
  ru: `
Соответствующий парсер порождает **Value** для конформного документа.
Value — одно из: **Null**, **Bool**, **Integer**, **Float**, **String**,
**Array**, **Object**.

- **Null** — единственное выделенное значение.
- **Bool** — \`true\` или \`false\`.
- **Integer** — числовой скаляр, несущий целочисленное значение.
  Реализация MUST поддерживать как минимум диапазон i64
  (-2^63 .. 2^63 - 1) и MAY поддерживать более широкий (например,
  произвольную точность). Фикстуры conformance \`valid/\` (§ 8.1)
  предполагают этот минимальный i64-домен для скалярной
  классификации (§ 5.2, правило 13): целочисленный литерал вне
  i64-диапазона для реализации с минимальным доменом — это String,
  поэтому \`i64_overflow_to_string.json\` ожидает String
  \`"9223372036854775808"\`. § 8.1 / § 8.2 и
  \`versions/0.7/tests/boundary-fixtures.json\` определяют на уровне
  отдельных листьев, где именно и как реализация с более широким
  доменом MAY законно расходиться с oracle минимального домена.
  Каноническая текстовая форма Integer —
  десятичная строка по основанию 10 без подчёркиваний и без
  ведущих нулей (кроме литерала \`0\`); ведущий \`+\` отбрасывается;
  знаковые нули (\`+0\`, \`-0\`) нормализуются к \`0\`. Каноническая
  форма используется реализациями-эмиттерами (§ 5.9).
- **Float** — абстрактный числовой скалярный носитель. Программно
  сконструированное Value MAY нести конечное или неконечное значение в
  стиле IEEE; этот носитель MUST различать NaN, +Infinity и -Infinity,
  чтобы writer-conformance мог подать фикстуру § 5.9.0 для каждого
  sentinel. Эти sentinel находятся вне парсируемого и канонического
  домена Float. Float, порождённый парсингом, MUST быть конечным и
  принадлежать **заявленному домену Ktav Float** реализации.
  Реализация MUST поддерживать как минимум диапазон и точность
  IEEE 754 binary64 и MAY поддерживать более широкое представление
  (например, decimal произвольной точности). Её **заявленный домен Float**
  MUST включать конечные значения, допускаемые как Ktav Float, семантику
  decimal-преобразования и округления, используемую при разборе и выводе,
  а также детерминированную политику преобразования. Каждый ненулевой
  конечный Float, допускаемый в заявленный домен Ktav Float, MUST иметь хотя бы один
  конечный десятичный кандидат \`(s, D, k)\`, точное decimal-значение
  которого при повторном разборе с этой семантикой даёт в точности тот же
  Float (§ 5.9.8). Положительный и отрицательный ноль допускаются отдельно
  по правилу нуля из § 5.9.8. Более широкое представление MAY содержать
  ненулевые конечные значения без такого кандидата (например, точную
  рациональ \`1/3\`), но такое значение находится вне заявленного домена Ktav
  Float и MUST NOT
  допускаться как Ktav Float. Для минимального домена binary64 преобразование decimal
  float-литерала (§ 3.6) MUST следовать атрибуту направления округления
  IEEE 754 \`roundTiesToEven\`, а представление MUST включать
  субнормальные (gradual-underflow) значения вплоть до наименьшего
  положительного субнормального binary64 (2^-1074 ≈ 4.9406564584124654 ×
  10^-324). Реализация, которая преждевременно сбрасывает субнормальные
  в ноль или округляет середины от чётного, не соответствует этому
  минимуму, даже если никогда не порождает неконечный Float. Внутреннее
  представление сверх заявленного домена определяется реализацией.
  Каноническую текстовую форму (§ 5.9) MUST использовать реализации-
  эмиттеры. Value **не** сохраняет текстовую форму как написано;
  подчёркивания, выбор \`e\` vs \`E\` и ведущий \`+\` — не часть Value.
- **String** — (возможно пустая) UTF-8 строка.
- **Array** — упорядоченная последовательность Values.
- **Object** — упорядоченная последовательность пар (имя, Value),
  где имена — строки. Уникальность имён обязательна внутри Object
  (§ 5.5).

Корневое Value, получаемое разбором документа, — это либо Object,
либо Array (каждое возможно пустое). Тип корня определяется первой
содержательной строкой документа — см. § 5.0.1.

`,
  zh: `
合规解析器为合规文档产生一个 **Value**。Value 是以下之一:**Null**、
**Bool**、**Integer**、**Float**、**String**、**Array**、**Object**。

- **Null** —— 唯一的空值。
- **Bool** —— \`true\` 或 \`false\`。
- **Integer** —— 数值标量,携带整数值。实现 MUST 至少支持 i64
  范围 (-2^63 .. 2^63 - 1) 且 MAY 支持更宽范围(如任意精度)。
  \`valid/\` 合规 fixture(§ 8.1)假定这一最小 i64 域用于标量分类
  (§ 5.2 规则 13):超出 i64 范围的整数字面量对最小域实现而言是
  String,故 \`i64_overflow_to_string.json\` 期望 String
  \`"9223372036854775808"\`。§ 8.1 / § 8.2 与
  \`versions/0.7/tests/boundary-fixtures.json\` 在单个叶子的层面上
  定义了更宽域实现 MAY 在何处以及如何合法偏离最小域 fixture
  oracle。Integer 的规范文本形式为基-10
  十进制串,无下划线、无前导零
  (\`0\` 除外);前导 \`+\` 舍弃;有符号零 (\`+0\`, \`-0\`) 归一化为
  \`0\`。规范形式由 writer-conforming 实现使用(§ 5.9)。
- **Float** —— 抽象的数值标量载体。以编程方式构造的 Value MAY
  携带有限或非有限的 IEEE 风格值;该载体 MUST 区分 NaN、+Infinity
  与 -Infinity,以便 writer-conformance 能提供 § 5.9.0 中针对每个
  sentinel 的 fixture。这些 sentinel 位于可解析 Float 域与规范 Float
  域之外。解析产生的 Float MUST 是有限值,并属于实现**声明的
  Ktav Float 域**。该声明 MUST 包含作为 Ktav Float 所接纳的有限值、解析与输出所用的十进制
  转换与舍入语义,以及确定性的转换策略。每个被接纳进 Ktav Value
  模型的非零有限 Float MUST 至少有一个有限十进制候选 \`(s, D, k)\`,其
  精确十进制值按该声明的语义重新解析后恰好得到该 Float(§ 5.9.8)。
  正零与负零按 § 5.9.8 的零规则单独接纳。更宽的主机表示 MAY 含有不
  存在这种候选的非零有限值(例如精确有理数 \`1/3\`),但这种值在声明的 Ktav
  Float 域之外,MUST NOT 作为 Ktav Float 接纳。实现
  MUST 至少支持 IEEE 754 binary64 的范围与精度,且 MAY 支持更宽表示
  (如任意精度 decimal)。对最小 binary64 域,将 decimal Float 字面量
  (§ 3.6)转换时 MUST 遵循 IEEE 754 的 \`roundTiesToEven\` 舍入方向属性,
  且表示 MUST 包含次正规(gradual-underflow)值,一直到 binary64 最小正
  次正规值 (2^-1074 ≈ 4.9406564584124654 × 10^-324)。过早将次正规值
  冲刷为零或将中间值舍入到远离偶数一侧的实现,即便从不产生非有限
  Float,也不满足此下限。声明域之外的内部表示由实现定义。规范文本形式
  (§ 5.9) MUST 由 writer-conforming 实现使用。Value **不**保留写入的
  文本形式;下划线、\`e\` vs \`E\` 的选择、前导 \`+\` 不属于 Value。
- **String** —— (可能为空的) UTF-8 字符串。
- **Array** —— 有序 Value 序列。
- **Object** —— 有序 (名, Value) 对序列,名为字符串。Object 内
  名字必须唯一(§ 5.5)。

解析文档产生的根 Value 是 **Object** 或 **Array**(均可为空)。
根的类型由文档的首条内容行决定 —— 见 § 5.0.1。

`,
};
