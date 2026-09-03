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
- **Float** — a numeric scalar carrying a numeric value. The
  implementation MUST support at least the range and precision of
  IEEE 754 binary64 and MAY support a wider representation (e.g.
  arbitrary-precision decimal). Converting a decimal float literal
  (§ 3.6) to this minimum binary64 representation MUST follow IEEE
  754's \`roundTiesToEven\` rounding-direction attribute, and the
  minimum representation MUST include subnormal (gradual-underflow)
  values down to binary64's smallest positive subnormal
  (2^-1074 ≈ 4.9406564584124654 × 10^-324) — an implementation that
  flushes subnormals to zero early, or rounds ties away from even,
  does not meet this floor even though it never produces a non-finite
  Float. The internal representation beyond
  that minimum is implementation-defined. The canonical
  textual form (§ 5.9) MUST be used by writer-conforming
  implementations. The Value does **not** preserve the textual form
  as written; underscores, the choice of \`e\` vs \`E\`, and leading-\`+\`
  signs are not part of the Value model.
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
- **Float** — числовой скаляр, несущий числовое значение.
  Реализация MUST поддерживать как минимум диапазон и точность
  IEEE 754 binary64 и MAY поддерживать более широкое представление
  (например, decimal произвольной точности). Преобразование decimal
  литерала с плавающей точкой (§ 3.6) в это минимальное binary64
  представление MUST следовать атрибуту направления округления
  IEEE 754 \`roundTiesToEven\`, и минимальное представление MUST
  включать субнормальные (gradual-underflow) значения вплоть до
  наименьшего положительного субнормального binary64
  (2^-1074 ≈ 4.9406564584124654 × 10^-324) — реализация, которая
  сбрасывает субнормальные в нуль раньше времени или округляет
  середины в сторону от чётного, не соответствует этому минимуму,
  даже если никогда не порождает неконечный Float. Внутреннее
  представление сверх этого минимума определяется реализацией.
  Каноническую текстовую форму (§ 5.9) MUST использовать
  реализации-эмиттеры. Value **не** сохраняет текстовую форму как
  написано; подчёркивания, выбор \`e\` vs \`E\` и ведущий \`+\` — не
  часть Value.
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
- **Float** —— 数值标量,携带数值。实现 MUST 至少支持 IEEE 754
  binary64 的范围与精度,且 MAY 支持更宽的表示(如任意精度
  decimal)。将 decimal 的 Float 字面量(§ 3.6)转换为此最小
  binary64 表示时,MUST 遵循 IEEE 754 的 \`roundTiesToEven\` 舍入
  方向属性,且该最小表示 MUST 包含次正规(gradual-underflow)值,
  一直下探到 binary64 的最小正次正规值 (2^-1074 ≈
  4.9406564584124654 × 10^-324) —— 一个过早将次正规值冲刷为零、
  或将中间值舍入到远离偶数一侧的实现,即便从不产生非有限的
  Float,也不满足此下限。超出该最小值的内部表示由实现定义。规范文本形式
  (§ 5.9) MUST 由 writer-conforming 实现使用。Value **不**保留
  写入的文本形式;下划线、\`e\` vs \`E\` 的选择、前导 \`+\` 不属于
  Value。
- **String** —— (可能为空的) UTF-8 字符串。
- **Array** —— 有序 Value 序列。
- **Object** —— 有序 (名, Value) 对序列,名为字符串。Object 内
  名字必须唯一(§ 5.5)。

解析文档产生的根 Value 是 **Object** 或 **Array**(均可为空)。
根的类型由文档的首条内容行决定 —— 见 § 5.0.1。

`,
};
