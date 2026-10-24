# Ktav 0.9 — 诊断语料草案

本目录用于准备 0.9.0，并非已发布版本。语言及原有测试分类继承 0.8。新增诊断用例仅放在新版本中；0.8 保持不变。

## 源位置

源解析错误携带从 1 开始的行号及原始输入中的半开字节区间。计算偏移前不得删除 BOM，也不得规范化 LF、单独 CR 或 CRLF。CRLF 算一个换行符；换行符内部的位置属于该换行符结束的行。

`UnclosedCompound` 指向最内层未闭合的起始标记：行号为起始标记所在行，区间从起始标记延伸到 EOF。多行值的起始位置为 `(`，不是键名。

`InvalidUtf8` 检查优先于语法解析。区间从第一个错误序列开始，至少覆盖一个原始字节，且不得越过输入末尾。不同实现可以覆盖不同宽度的错误序列。原始字节用例不得经过有损解码。I/O 错误及 writer 拒绝不得携带虚构的源位置。

## 用例格式

保留 `invalid/<name>.ktav` / `<name>.json` 文件对。Oracle 可以增加 `expected_location`，且只能采用以下一种结构：

```json
{"line": 2, "start": 12, "end": 27}
```

```json
{"line": 3, "start": 33, "minimum_end": 34}
```

`line` 为正整数，其余字段为非负字节偏移。`end` 要求精确终点；`minimum_end` 要求终点不小于该值且不大于输入长度。两种终点字段互斥。Runner 必须检查每个声明的位置，不能只检查错误类别。`invalid/diagnostics09/` 中的所有用例都必须声明位置 oracle。

Manifest 记录全部新增用例，并将无效 UTF-8 标记为 `raw_bytes`。Rust owned parser、strict parser、thin event parser 及 formatter 检查有效 UTF-8 输入；`from_file` 检查无效字节输入。直接错误访问器和公开 envelope 转换必须一致；native C ABI 源操作遵循相同位置契约。

面向人的错误消息不是跨语言位置 oracle。现有十字段 error-envelope 格式不变；此次迁移补全位置，并使其与直接 Rust API 一致。
