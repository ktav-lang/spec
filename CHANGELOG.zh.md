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

- **§ 3.3 —— 空白现在是固定的、穷举列出的 25 码点集合(`MUST`),
  而非依赖具体实现的 `MAY`。** 该集合是 Unicode 6.3(2013)版本时的
  `White_Space` 属性,以显式列表而非引用「当前版本的 Unicode」的方式
  固定下来 —— 实现 MUST NOT 委托给宿主语言内置的 Unicode 空白判定
  原语(已验证至少两种主流语言运行时在两个方向上均与此列表存在分歧)。
  相对每一个已发布的 0.6.x Rust 核心版本均非破坏性,因为它已经识别
  完整集合;仅对字面理解旧 `MAY` 并停留在 ASCII 空格/制表符的实现是
  破坏性的。
- **§ 4 —— 键段修剪从仅 ASCII 扩展到同一 25 码点集合**,解决了
  § 3.3(此前已允许 Unicode 空白)与 § 4(此前专门要求键使用仅 ASCII)
  之间原本存在的矛盾。仅在被修剪边界处以非 ASCII 空白码点相区别的
  两个键,此前在字面理解 § 4 时是不同的键,现在会碰撞为同一个键
  (§ 5.5)。Rust 参考实现的实际修剪行为并未改变 —— 自 0.6.0
  起它就已经修剪完整集合;改变的只是规范文本追上了代码,因此这仅对
  字面遵循旧 § 4 文本、而非匹配 Rust 核心实际行为的实现是破坏性的。
- **§ 5.6 —— 多行字符串 stripped 形式(`( … )`)现在会逐行去除尾部
  空白**,这与它此前已对每行前导空白所做的处理一致。此前 `( … )` 会
  逐字节保留尾部空白,与 verbatim 形式 `(( … ))` 完全一致 —— 编辑器的
  「保存时去除尾部空白」功能可能因此在毫无提示的情况下悄悄改变字符串
  内容。`(( … ))` 不受影响,两侧边界仍完全 verbatim。即使对 Rust 核心
  也是破坏性的 —— 它此前在 stripped 块的每一行都保留尾部空白。
- **§ 5.9.0(新增)—— 可表示的 Value 现在被规范性定义**,划定了
  规范 writer 保证所作用的域。裸标量文档根、名为空的 Object 对、
  非有限 Float(NaN / ±Infinity),以及任意深度包含不可表示
  Value 的任何复合值均不可表示,writer-conforming 实现 MUST 以
  错误拒绝它们,不输出任何部分内容。此前 § 5.9 未定义这些仅经
  编程方式出现的情形。Rust 参考核心已拒绝标量根与含 `CR` 的
  String;弥补其余缺口另行跟踪。

### 变更

- **§ 6.13 `BadEscapeSequence`** —— 扩展以覆盖不合法的 `\uXXXX` 形式
  (少于四位十六进制数字)与孤立代理项,与既有的未识别 `\X` 情形并列。
- **§ 5.9.10 的键重新 escape 规则** 现在列举 `<key-char>` 排除的每个
  码点(不仅是 `\`/`.`/`:`),并要求对边界空白与没有命名形式的结构
  字节(`(`、`)`、DEL、控制字节)使用 `\uXXXX`。含有 `(`、`)`、DEL
  或控制码点的键首次可在规范形式中输出。
  另外首次记录(此前就存在的风险,并非新行为):以 `##` 开头
  的键 MUST 将第一个 `#` escape 为 `\u0023`,否则规范输出的该行
  会被悄悄读作注释。
- **`<key-char>`(§ 4)** 现在允许原始 VT(`0x0B`)与 FF(`0x0C`)
  作为字面键内容,与 § 3.3 的扩展一致。非破坏性 —— 仅接受此前被
  拒绝为 `InvalidKey` 的文档。
- **§ 5.9 / § 8.3** 现在仅对**可表示**(representable)的 Value
  定义 round-trip 保证(§ 5.9.7 中的一小类 String 值 —— `CR`
  字节,或 stripped 多行形式的若干病态碰撞之一)。writer-conforming
  实现 MUST 以错误拒绝不可表示的 Value,而不是将其序列化;此前
  § 5.9.7 单独允许为同一类 Value 输出任意或 lossy 编码,这与
  § 5.9 的字节确定性要求不兼容。
- **§ 5.9.6** —— 根 Array 的第一个项,若其裸形式本身会被 § 5.0.1
  规则 6 识别为 pair line(例如 `host: localhost`,或裸
  `a:`),现在 MUST 使用原始标记(`::`)形式。此前规范 writer 可能
  以裸形式输出该项,导致结果文档重解析时根变为 Object 而非原本的
  Array —— 这一 round-trip 失败专属于根 Array 的第一个项(其余
  任何项位置不受影响)。
- **§ 5.9.8 —— Float 零的规范化得到澄清。** 表示形式阈值现在为
  `0 < abs < 1e-2`(原为 `abs < 1e-2`),按字面理解后者会要求零
  使用科学形式。零的规范形式为 `0.0` / `-0.0` —— 十进制,绝非
  科学形式,符号保留(不同于 Integer 的 `-0` → `0`)。这与 Rust
  参考核心的既有行为一致;改变的只是规范文本。新 fixture
  `float/positive_zero` 与 `float/negative_zero` 将其锁定。
- **§ 8.1(连同 § 5 的 Integer 定义)—— fixture 等价性定义在
  最小必需数值域上**(i64 Integer、binary64 Float)。支持更宽域
  的实现 MAY 恰好在 fixture 探测最小域边界之处偏离 fixture
  oracle(如 `i64_overflow_to_string.json`),而不丧失
  parser-conformance。此前 § 5 明确允许的任意精度实现会按原文本
  在该 fixture 上不满足 § 8.1。

### 新增

- **`\uXXXX` escape(新增 § 3.7.1)** —— 恰好四位十六进制数字,基本
  多文种平面之外的码点使用代理对,孤立代理项被拒绝为
  `BadEscapeSequence`。在已有十个 escape 被识别之处(inline 标量与键)
  同样被识别;不在多行标量、多行字符串内容或注释中处理。对 escape 表
  纯属新增 —— 已有任何一个 escape 序列的含义均未改变。
- **附录 D —— 从 0.6.x 迁移到 0.7.0 的指南。**
- **`unrepresentable/` 一致性类别(spec#4)—— 不可表示 Value 的
  原因代码现已规范化(§ 5.9.0),§ 8.2 要求 writer-conforming 实现
  以指定原因代码拒绝 `versions/0.7/tests/unrepresentable/` 中每个
  fixture 的 Value。** 七个原因代码:`ScalarRoot`、
  `EmptyKeyName`、`NonFiniteFloat`、`CRByte`、`BothFormsRequired`、
  `TrailingWhitespaceCollision`、`LeadingWhitespaceCollision` ——
  其中六个有 fixture;`NonFiniteFloat` 仅有文字说明(fixture
  oracle 所用的 JSON 格式没有可移植的 NaN/Infinity 字面量)。writer
  用以报告拒绝的 API 形式是 implementation-defined,规范性的只是
  代码名称。README(en/ru/zh)在既有 `valid/` / `invalid/` 旁记录了
  新类别,并要求 runner MUST 遍历每个存在的类别,而非静默跳过不
  认识的类别。不解决 rust#5 或 rust#12 —— 二者需要在 `rust` 核心
  与六个语言绑定中另行完成。

### 已修复

- **§ 5.0.1 规则 6 —— 根检测现在明确基于形状(「pair 候选」)。**
  旧措辞(「§ 5.3 下的 pair line」)读起来像是首行的键必须已经
  语法完全有效才能选出 Object 根,这与 `tests/invalid/invalid_key/`
  下的 `InvalidKey` fixture(例如整份文档就是 `a,b: 1`)相矛盾。
  规则 6 现在给出两阶段测试:阶段 1 是纯词法的形状检查(按 § 4
  分隔符扫描规则存在首个未 escape 的 `:` 或 `::`,其前有非空原始
  前缀,普通 `:` 满足 `<sep-end>`);阶段 2 是统一校验,与已建立
  Object 内任何 pair line 的校验(§ 5.1 规则 8)完全一致,按 § 5.3 /
  § 5.3.1 进行。与参考解析器一致:粘连的普通 `:` 首行(`a,b:1`)
  不是 pair 候选,落入规则 7(单项 Array);粘连的 `::` 行是 pair
  候选,报告 `MissingSeparatorSpace`。
- **§ 5.3 / § 5.3.1 —— 移除了针对裸 `##` 不可达的 `InvalidKey`
  声明。** § 5.1 规则 2 会无条件地把任何修剪后以 `##` 开头的行当作
  注释消费,发生在任何 pair line 处理之前,因此裸 `##` 前缀行在
  结构上永远无法到达键校验。两节现在都陈述了这一点,并指出
  § 5.9.10 的 writer 侧 escape(escape 首个 `#`)才是防止该碰撞的
  真正机制。
- **§ 5.3 / § 5.3.1 —— 错误优先级被明确化:** 对已分发的 pair
  line,检查顺序为 `MissingSeparator`(§ 6.6)→ 空前缀的
  `EmptyKey`(§ 6.5)→ `MissingSeparatorSpace`(§ 6.10)→ 键段校验;
  因此键缺陷(如既有 Object 内的 `b,c:1`)报告
  `MissingSeparatorSpace` 而非 `InvalidKey`,与参考解析器一致。
- **§ 5.0.1 —— 行首 `[` / `{` 优先于 pair 候选检测。** 若首条
  内容行以 `[` 或 `{` 开头,但不符合规则 2–5 中任何一条(无匹配
  闭合符,也非单独开启符),则诊断为格式错误或未闭合的 inline
  复合值尝试(§ 5.2 规则 8–9),该诊断先于规则 6 生效 —— 已针对
  参考解析器验证:`[bad]: 1` 报告 `UnterminatedInlineCompound`,
  而非 `InvalidKey`。仅当方括号/花括号是该行第一个字节时适用;
  出现在行内其他位置时(如 `a{b: 1`)规则 6 照常生效,产生
  `InvalidKey`。fixture `invalid_key/bracket_in_key` 已重命名为
  `invalid/inline/leading_bracket_before_separator`,并修正了
  `expected_error`。
- **README「版本方案」**—— 跨版本兼容 MUST 现在明确不适用于
  pre-1.0 破坏性 `MINOR` 递进(即上一段刚刚允许的例外):面向 0.6
  的实现不需要以相同方式解析 0.7.x 文档。此前的措辞与上方的例外
  直接矛盾。
- **§ 4 语法** —— `<header-line>` 中 `)` / `))` 的分支现在带有
  上下文相关性说明:仅当多行字符串块处于打开状态(§ 5.6)且修剪后
  的行与该块自身的终止符一致时才成立;其他任何地方,单独一行
  `)` / `))` 都是普通文本(§ 5.1、§ 5.2、§ 5.4;§ 6.1),而非结构性
  闭合符 —— 与 § 6.1 及 `lone_paren_tokens` fixture 一致。
- **§ 10.6** —— 单一规范序列化的定义对象现在是每个**可表示**的
  Value(§ 5.9.7),而非无条件的每个 Value。
- **附录 A,0.5.0** —— 移除了「不紧跟 `LF` 的裸 `CR` 字节为内容,
  非行终止符」这一条:0.5.0 规范自身的 § 3.2 陈述的是相反的事实
  (「`CR` 字节在解析时绝不作为内容字节出现」),说明该条描述的是
  从未发生过的变更。

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
