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

## 未发布

`versions/0.7/` 下 0.7.0 的规范性文本草案与 conformance fixture。尚非
当前稳定规范 —— `versions.ktav` 的 `stable` 与 `latest` 仍指向 0.6.4,
直到正式发布。

### 破坏性

- **§ 5.6 —— 多行字符串 stripped 形式(`( … )`)现在会逐行去除尾部
  空白**,这与它此前已对每行前导空白所做的处理一致。此前 `( … )` 会
  逐字节保留尾部空白,与 verbatim 形式 `(( … ))` 完全一致 —— 编辑器的
  「保存时去除尾部空白」功能可能因此在毫无提示的情况下悄悄改变字符串
  内容。`(( … ))` 不受影响,两侧边界仍完全 verbatim。

### 变更

- **§ 3.3 —— 空白现在是固定的、穷举列出的 25 码点集合(`MUST`),
  而非依赖具体实现的 `MAY`。** 该集合是 Unicode 6.3(2013)版本时的
  `White_Space` 属性,以显式列表而非引用「当前版本的 Unicode」的方式
  固定下来 —— 实现 MUST NOT 委托给宿主语言内置的 Unicode 空白判定
  原语(已验证至少两种主流语言运行时在两个方向上均与此列表存在分歧)。
- **§ 4 —— 键段修剪从仅 ASCII 扩展到同一 25 码点集合**,解决了
  § 3.3(此前已允许 Unicode 空白)与 § 4(此前专门要求键使用仅 ASCII)
  之间原本存在的矛盾。Rust 参考实现的实际修剪行为并未改变 —— 自 0.6.0
  起它就已经修剪完整集合;改变的只是规范文本追上了代码。
- **§ 6.13 `BadEscapeSequence`** —— 扩展以覆盖不合法的 `\uXXXX` 形式
  (少于四位十六进制数字)与孤立代理项,与既有的未识别 `\X` 情形并列。

### 新增

- **`\uXXXX` escape(新增 § 3.7.1)** —— 恰好四位十六进制数字,基本
  多文种平面之外的码点使用代理对,孤立代理项被拒绝为
  `BadEscapeSequence`。在已有十个 escape 被识别之处(inline 标量与键)
  同样被识别;不在多行标量、多行字符串内容或注释中处理。对 escape 表
  纯属新增 —— 已有任何一个 escape 序列的含义均未改变。
- **附录 D —— 从 0.6.x 迁移到 0.7.0 的指南。**

## [0.6.4] —— 2026-08-23

### 变更

- **Float 规范化现在明确规定表示边界。** writer 先选择最短的
  round-trip 十进制形式,再在 `abs < 1e-2` 或 `abs >= 1e7` 时必须使用
  科学形式,其余情况使用十进制形式。§ 5.9.8 现在明确记录边界值和
  示例,消除了 `-0.001` 与 `1.5e-3` 之间的矛盾。
- **当前稳定规范为 0.6.4。** 这是编辑澄清与 conformance fixture
  发布;目录仍为 `versions/0.6/`。

## [0.6.0] —— 2026-06-01

针对性的破坏性变更:键现在处理 escape 序列。两个新 escape(`\.`
与 `\:`)使在键名中使用字面点与冒号成为可能 —— 诸如
`example.com`、`1.0` 或 `a:b` 这类在 0.5.0 中无法表达的键。

### 破坏性

- **键现在处理 escape 序列**(§ 3.7)。反斜杠 `\` 在键中为 escape
  前导 —— 正如它已经在 inline 标量值内的作用一样。`\.` 产生字面点
  (非路径分隔符);`\:` 产生字面冒号(非对分隔符);`\\` 产生字面
  反斜杠。在 0.5.0 中作为普通字节的键内字面反斜杠现在需要 `\\`。
  实践中较罕见;键中未含 `\` 的文档在 0.6.0 下解析方式不变。
- **`<key>` / `<segment>` / `<key-char>` 语法产生式**(§ 4)现在
  escape 感知。点分路径分隔仅在**未 escape** 的 `.` 处进行;对分
  隔符为首个**未 escape** 的 `:` / `::`。反斜杠与点从 `<key-char>`
  中排除,改由新的 `<key-escape>` 处理。

### 新增

- **两个新 escape 序列** —— `\.` → `.` 与 `\:` → `:` —— 加入 § 3.7
  表(现共十个:`\\`、`\,`、`\}`、`\]`、`\{`、`\[`、`\n`、`\r`、
  `\.`、`\:`)。适用于 inline 标量值与键。
- **附录 C —— 迁移指南** 从 0.5.0 到 0.6.0。

### 变更

- 从「escape 序列不在以下场景处理」列表(§ 3.7)中移除「键」。键
  现在处理 escape —— 与 inline 标量相同的集合。
- § 5.9.10(规范键输出)—— writer MUST 对键段中的 `\`、`.` 与 `:`
  重新 escape,以确保规范输出能通过解析器 round-trip。
- § 6.13 `BadEscapeSequence` —— 更新为列出十个有效 escape 字符
  (新增 `.` 与 `:`)。

### 版本控制

`versions/0.6/` 为新的顶层格式目录。`versions/0.5/` 处的 0.5.0
规范与 `versions/0.1/` 处的 0.1.x 规范保留在仓库中,以便希望并行
支持旧语法的旧解析器。

1.0 之前的版本策略:MINOR 增量(0.5 → 0.6)在该版本线中携带破坏性
变更。一旦格式发布到 1.0,破坏性变更将需要 MAJOR 增量。


## [0.5.0] —— 2026-05-28

语言的重大修订。三个破坏性变更与显著的 inline 形式增补面。
声明 0.5.0 兼容性的实现需要重写解析器 —— 没有从 0.1.x 的
自动迁移。

### 破坏性

- **移除类型标记 `:i` 与 `:f`。** 数字、布尔与 `null` 从标量
  字面形式推断(§ 3.6、§ 5.2)。`::` 原始标记保留。
- **注释改为 `##`** (两个 ASCII `#` 字节)且 MUST 独占一行
  (§ 3.4)。
- **裸 `port: 8080` 现在为 `Integer(8080)`**,而非
  `String("8080")`。
- **首条内容行的单独 `{` / `[` 现在为多行根 Object / Array**
  (§ 5.0.1 规则 4–5)。先前(0.1.1)首行的单独开启符产生
  根级 Array 内的单一 Object / Array 项;JSONL 式形式不再
  被接受。
- **Float Values 不再保留文本形式**;应用数值规范化(§ 3.6、
  § 5.2、§ 5.9.8)。Value 模型携带数值;规范 writer 输出
  确定性的文本形式。下划线、`e` vs `E` 的选择、前导 `+`
  均不属于 Value。
- **键段修剪前后 ASCII 空白**(§ 4)。修剪后为空的段是
  `EmptyKey`(§ 6.5)。段内空白 verbatim 保留。
- **行终止符是 `LF`、`CR` 或 `CR LF`**(§ 3.2)。三者等价。`CR`
  字节在解析时绝不作为内容出现;要在 String 中插入 `CR`,需在
  inline 复合值内使用 `\r` 转义。此类 Value 在规范形式中不可表示
  (§ 5.9.7)。

### 新增

- **Inline 复合值** —— `{key: value, key2: value}` 与
  `[v1, v2, v3]`,可选尾部逗号(§ 5.8)。
- **八个 Escape 序列** —— `\\`、`\,`、`\}`、`\]`、`\{`、`\[`、
  `\n`、`\r` 在 inline 标量值内(§ 3.7)。
- **数字字面量语法**(§ 3.6)。Integer 携带整数值;Float 携带
  数值。大整数溢出回退为 String。
- **规范形式(§ 5.9)** —— 每个 Value 的规范 writer 输出,由
  writer-conforming 实现使用,由 `*.canonical.ktav` fixture
  验证。规范形式字节确定。
- **三元测试套件** —— 每个 valid fixture 含三个文件:
  `name.ktav`(输入)、`name.json`(Value oracle)、
  `name.canonical.ktav`(writer oracle)。
- **顶层 inline 复合值** —— 文档首条内容行为闭合 inline 时,
  即为根级 inline Object / Array(§ 5.0.1 规则 2–3)。
- **键段中允许空格与制表符**(§ 4 `<key-char>`)。
- **值中间的 `{` / `[` 字面化**(§ 5.8.5)。
- **错误类别** —— `UnterminatedInlineCompound`(§ 6.11)、
  `MalformedInlineCompound`(§ 6.12)、`BadEscapeSequence`
  (§ 6.13)。
- **§ 6.14 `OrphanLineAfterTopLevelInline`** —— 独立错误类别。
- **附录 B:迁移指南** 从 0.1.x 到 0.5.0。
- **合规性拆分** —— § 8 现在定义 parser-conforming(§ 8.1)、
  writer-conforming(§ 8.2)与 round-trip 性质(§ 8.3)。

### 移除

- 错误类别 `InlineNonEmptyCompound`(原 § 6.7)与
  `InvalidTypedScalar`(原 § 6.9)。其编号保留。实现 MUST NOT
  对 0.5.0 文档输出标签为此名称的错误。

### 版本控制

`versions/0.5/` 为新的顶层格式目录。`versions/0.1/` 处的 0.1.x
规范保留在仓库中,以便希望并行支持旧语法的旧解析器。


## [0.1.1] —— 2026-05-10

向后兼容的扩展:裸顶层 Array。

### 新增

- **顶层 Array** —— 当文档的首条内容行为 array-item 形式(裸标量、
  `:: text`、`:i 42`、`:f 3.14`、单独的 `{` / `[`,或多行开启符
  `(` / `((`)时,该文档现被解析为根级 **Array**。此前根 Value
  始终为 **Object**,故首行为裸标量会产生 `MissingSeparator`
  错误。新的 § 5.0.1 规定了判定规则。
- 新增一致性 fixture:
  `versions/0.1/tests/valid/top_level_array/` 与
  `versions/0.1/tests/invalid/top_level/`。

### 兼容性

此改动对解析器与文档**严格累加**:任何在 0.1.0 中有效的文档在
0.1.1 中仍然有效并产生相同的 Value(仍为 Object)。只有此前
被 0.1.0 以 `MissingSeparator` 拒绝的输入,现在才被作为 Array
接受。针对 0.1.1 编写的文档在严格的 0.1.0 解析器下可能失败
—— 这是新功能预期的正向不兼容性。

支持 0.1.1 的实现 MUST 处理 § 5.0.1 的判定;仅声称 0.1.0
合规的实现继续保持合规(它们对 0.1.0 输入仍然正确,只是缺少
新功能)。


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
