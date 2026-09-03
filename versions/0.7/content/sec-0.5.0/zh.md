
- **Breaking:** 移除类型标记 `:i`/`:f`。
- **Breaking:** 注释改为 `##`(两个 ASCII `#` 字节),且 MUST 独占
  一行(§ 3.4)。单个 `#` 字节没有特殊含义。不支持在内容行末尾追加
  注释。
- **Breaking:** 首条内容行单独的 `{` / `[` 现在为多行根
  Object / Array(§ 5.0.1 规则 4–5)。先前(0.1.1)此打开根级
  Array 内的单一 Object / Array 项;JSONL 式形式不再被接受。
- **Breaking:** Float Values 不再保留文本形式;应用数值规范化
  (§ 3.6、§ 5.2、§ 5.9.8)。
- **Breaking:** 键段修剪前后 ASCII 空白(§ 4)。
- **新增:** Inline 复合值(§ 5.8)。
- **新增:** 八个 escape 序列(§ 3.7)。
- **新增:** 数字字面量语法(§ 3.6)。
- **新增:** **规范形式(§ 5.9)** —— 每个 Value 的规范 writer
  输出,由 writer-conforming 实现使用,由 `*.canonical.ktav`
  fixture 验证。
- **新增:** **三元测试套件** —— 每个 valid fixture 有三个文件:
  `name.ktav`(输入)、`name.json`(Value oracle)、
  `name.canonical.ktav`(writer oracle)。
- **新增:** 错误 `UnterminatedInlineCompound`、
  `MalformedInlineCompound`、`BadEscapeSequence`
  (§ 6.11、§ 6.12、§ 6.13)。
- **新增:** 错误 `OrphanLineAfterTopLevelInline`(§ 6.14)作为
  独立类别,与 `MissingSeparator` 分开。
- **新增:** 附录 B —— 0.1.x → 0.5.0 迁移指南。
- **移除:** 错误类别 `InlineNonEmptyCompound`(§ 6.7)、
  `InvalidTypedScalar`(§ 6.9)。号码保留;实现 MUST NOT 对
  0.6.0 文档输出标签为此名称的错误。
- **变更:** Top-level kind detection(§ 5.0.1)扩展和重写。
- **变更:** 合规性(§ 8)拆分为 parser-conforming(§ 8.1)、
  writer-conforming(§ 8.2)与 round-trip 性质(§ 8.3)。

