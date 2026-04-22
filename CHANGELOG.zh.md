# Ktav 规范变更日志

**Languages:** [English](CHANGELOG.md) · [Русский](CHANGELOG.ru.md) · **简体中文**

记录各版本格式规范的历史。规范存放于本仓库的 [`versions/`](versions/)
目录下;每个版本为独立目录,包含各自的 `spec.md` 与 `tests/`。

版本遵循 `MAJOR.MINOR.PATCH` 方案:

- `PATCH` —— 编辑性修订(修正拼写、澄清表述)。
- `MINOR` —— 向后兼容的扩展。
- `MAJOR` —— 破坏性变更。

当前的 `stable` 与 `latest` 指针见仓库 [`README.md`](README.zh.md);
机器可读索引见 [`versions.ktav`](versions.ktav)。

## [0.1.0] —— 2026-04-22

规范初始版本。定义了 Ktav 0.1.0 的词法结构、语法、语义、错误类别、
符合性要求与安全考量。

### 格式概览

- 隐式的顶层 Object。
- `key: value` 键值对;点分键(`a.b.c: 1`)展开为嵌套的 Object。
- `key:: value` 强制将值解释为字面量 String。
- 类型标量标记 `:i`(Integer)与 `:f`(Float) —— 既可用于 pair
  位置,也可作为 array-item 前缀。
- Integer 与 Float 的 Value 类型 —— 保留文本形式的数值字符串,
  以支持往返与任意精度。
- 关键字 `null`、`true`、`false`(严格小写)。
- 多行复合值 `{ ... }` 和 `[ ... ]`,闭合括号独占一行;空值 `{}` /
  `[]` 写作行内形式。
- 多行字符串 `( ... )`(剥除公共缩进)与 `(( ... ))`(原样保留)。
- 在数组中,`:: value` 作为元素前缀,表示字面量 String;
  `:i value` / `:f value` 作为 Integer / Float 元素。
- **分隔符后的强制空白**(§ 5.3 / § 5.4):每个键值对分隔符
  (`:`、`::`、`:i`、`:f`)与每个数组元素标记
  (`::`、`:i`、`:f`)**MUST** 后接至少一个 ASCII 空白字节,
  **或**该行结束。分隔符与 body 之间无空白的「粘连形式」属于
  `MissingSeparatorSpace` 错误(§ 6.10);错误示例文档:
  `key:value`、`port:i42`、`ratio:f0.5`。空值写法 `key:` / `key::`
  (分隔符后紧随 EOL)是合法的。
- 行首 `#` 为注释;不支持行内注释。

### 错误类别(§ 6)

`UnbalancedBracket`、`MismatchedBracket`、`DuplicateName`、
`PathConflict`、`InvalidKey`、`EmptyKey`、`OrphanLine`、
`InlineNonEmptyCompound`、`InvalidTypedScalar`、
`MissingSeparatorSpace`。

目录: [`versions/0.1/`](versions/0.1/).
