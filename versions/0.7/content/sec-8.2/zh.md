
Writer-conforming 实现:

- 满足 § 5.9 所有规范性 MUST / MUST NOT 声明。
- 对 `versions/0.7/tests/valid/` 下每个 fixture,在给定从
  `name.ktav` 解析的 Value 时,产生与 `name.canonical.ktav`
  字节相同的输出,UNLESS 该实现沿一个或多个叶的 `boundary_class`
  [`versions/0.7/tests/boundary-fixtures.json`](tests/boundary-fixtures.json)
  为该 fixture 所列出的条目,支持宽于最小域的域 —— 依 § 8.1,
  这样的实现在该叶的路径处可能持有不同于最小域 `.json` oracle 所
  描述的 Value(例如 `i64_overflow_to_string` 的 `/overflow`
  字段被持有为 Integer 而非 String),而同一 fixture 的其他每个
  字段仍持有最小域 Value,且 MUST 仍按最小域 writer 将其渲染的
  方式精确出现在输出中。恰对此类 fixture,该语料同样不固定被豁免
  叶自身对输出贡献的确切字节序列:它 MUST 是实现实际持有的 Value
  的正确规范形式(§ 5.9)(例如 Integer 值以不带 raw 标记的裸形式
  规范写出,§ 5.9.5),并对其自身的域保持内部一致与确定 —— 但对
  最小域之外的域,那究竟是哪些确切字节,并不是这个共享的、语言
  无关的语料所验证的。仅支持最小域的实现 MUST 与每个 `valid/`
  fixture 的 `.canonical.ktav` 精确、完整地匹配,包括
  `boundary-fixtures.json` 为其列出叶的每个字段。
- 对 `versions/0.7/tests/unrepresentable/` 下每个 fixture,以
  `name.json["unrepresentable_reason"]` 中指明的原因代码
  (§ 5.9.0)拒绝 `name.json["value"]` 所描述的 Value —— 可通过
  其自身 API 的任意错误报告形式;规范性的是代码名称,而非呈现
  机制。

规范形式定义见 § 5.9。

