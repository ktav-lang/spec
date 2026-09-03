
合规解析器为合规文档产生一个 **Value**。Value 是以下之一:**Null**、
**Bool**、**Integer**、**Float**、**String**、**Array**、**Object**。

- **Null** —— 唯一的空值。
- **Bool** —— `true` 或 `false`。
- **Integer** —— 数值标量,携带整数值。实现 MUST 至少支持 i64
  范围 (-2^63 .. 2^63 - 1) 且 MAY 支持更宽范围(如任意精度)。
  `valid/` 合规 fixture(§ 8.1)假定这一最小 i64 域用于标量分类
  (§ 5.2 规则 13):超出 i64 范围的整数字面量对最小域实现而言是
  String,故 `i64_overflow_to_string.json` 期望 String
  `"9223372036854775808"`。§ 8.1 / § 8.2 与
  `versions/0.7/tests/boundary-fixtures.json` 在单个叶子的层面上
  定义了更宽域实现 MAY 在何处以及如何合法偏离最小域 fixture
  oracle。Integer 的规范文本形式为基-10
  十进制串,无下划线、无前导零
  (`0` 除外);前导 `+` 舍弃;有符号零 (`+0`, `-0`) 归一化为
  `0`。规范形式由 writer-conforming 实现使用(§ 5.9)。
- **Float** —— 数值标量,携带数值。实现 MUST 至少支持 IEEE 754
  binary64 的范围与精度,且 MAY 支持更宽的表示(如任意精度
  decimal)。将 decimal 的 Float 字面量(§ 3.6)转换为此最小
  binary64 表示时,MUST 遵循 IEEE 754 的 `roundTiesToEven` 舍入
  方向属性,且该最小表示 MUST 包含次正规(gradual-underflow)值,
  一直下探到 binary64 的最小正次正规值 (2^-1074 ≈
  4.9406564584124654 × 10^-324) —— 一个过早将次正规值冲刷为零、
  或将中间值舍入到远离偶数一侧的实现,即便从不产生非有限的
  Float,也不满足此下限。超出该最小值的内部表示由实现定义。规范文本形式
  (§ 5.9) MUST 由 writer-conforming 实现使用。Value **不**保留
  写入的文本形式;下划线、`e` vs `E` 的选择、前导 `+` 不属于
  Value。
- **String** —— (可能为空的) UTF-8 字符串。
- **Array** —— 有序 Value 序列。
- **Object** —— 有序 (名, Value) 对序列,名为字符串。Object 内
  名字必须唯一(§ 5.5)。

解析文档产生的根 Value 是 **Object** 或 **Array**(均可为空)。
根的类型由文档的首条内容行决定 —— 见 § 5.0.1。

