
Parser-conforming 实现:

- 满足本文档所有与解析相关的规范性 MUST / MUST NOT 声明。
- 接受 `versions/0.7/tests/valid/` 下每个 fixture 并产生与对应
  `name.json` 等价的 Value。该等价性定义在 § 5 的最小必需数值域上
  (i64 Integer、binary64 Float)。
  [`versions/0.7/tests/boundary-fixtures.json`](tests/boundary-fixtures.json)
  列出已知探测数值域边界(§ 5.2)的各个对象字段(叶)—— 而非整个
  fixture:一个 fixture MAY 将依赖边界的叶与普通叶混合(例如
  `big_overflow_to_string` 的 `tiny` 字段在每个符合规范的域中都是
  普通的 `Integer(1)`,而其 `big` / `bigger` 字段则不是),且仅被
  列出的叶被豁免 —— 该 fixture 的其他每个字段 MUST 仍然精确匹配。
  每个条目指明一个 `boundary_class`:`integer_range`(超出强制的
  i64 范围)、`float_range`(在 binary64 上溢出为非有限值)、
  `float_underflow`(在 binary64 下溢为零)、或 `float_precision`
  (binary64 会对该值舍入或缩短,而更高精度的域则不会)。实现仅当
  其切实支持沿该叶特定 `boundary_class` *宽于最小域的域* 时,才
  豁免于对该叶的值进行匹配 —— 支持 BigInt 但仅 plain binary64 的
  实现在 `integer_range` 叶上豁免,而在任何 `float_*` 叶上不豁免;
  支持 Float 但仅 plain i64 的实现则相反;支持一个轴并不豁免其在
  另一个轴上的要求。对被豁免的叶,该语料并不固定其 Value 必须是
  什么 —— § 5.2 已陈述一般规则(域相同 ⇒ kind 相同,域不同 ⇒ MAY
  在被越过的边界处不同),而该 Value 就是实现自己对叶的体正确应用
  § 5 的规则 13–14 所产生的结果。`boundary-fixtures.json` 未列出
  叶的每个字段,在每个 fixture 中,对任何域的任何实现均不带任何
  豁免。
- 拒绝 `versions/0.7/tests/invalid/` 下每个 fixture,错误类别
  与 `name.json["expected_error"]` 一致。

