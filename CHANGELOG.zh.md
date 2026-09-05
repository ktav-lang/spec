# Ktav 规范变更日志

**Languages:** [English](CHANGELOG.md) · [Русский](CHANGELOG.ru.md) · **简体中文**

记录各版本格式规范的历史。规范存放于本仓库的 [`versions/`](versions/)
目录下;每个版本为独立目录,包含各自的 `spec.md` 与 `tests/`。

版本遵循 `MAJOR.MINOR.PATCH` 方案:

- `PATCH` —— 编辑性修订(修正拼写、澄清表述)。
- `MINOR` —— 向后兼容的扩展。
- `MAJOR` —— 破坏性变更。

**pre-1.0 例外:** 当 `MAJOR` 为 `0` 时,`MINOR` 递进 MAY 携带破坏性
变更,而不必强制 `MAJOR` 递进(0.7.0 相对 0.6.x 正是如此)。一旦格式
达到 `1.0`,破坏性变更将严格要求 `MAJOR` 递进,如上所述。

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
- **§ 3.1 —— 前导字节顺序标记的处理现在是确定性的。** 若字节顺序
  标记(U+FEFF)是文档的第一个码点、位于任何其他字节之前,
  parser-conforming 实现 MUST 跳过恰好一个这样的前导字节顺序标记;
  规范写入器(§ 5.9)MUST NOT 输出前导字节顺序标记。文档中任何其他
  位置的 U+FEFF 码点都是普通内容 —— § 3.3 未将其归类为空白。
  0.6.4 对字节顺序标记没有任何规定;早期草案中非确定性的
  `MAY skip` 措辞已移除。
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
  非有限 Float(NaN / ±Infinity)、含 `CR` 字节或 stripped 形式碰撞
  的 String,以及任意深度包含不可表示 Value 的任何复合值均不可表示,
  writer-conforming 实现 MUST 以错误拒绝它们,不输出任何部分内容。
  此前 § 5.9 未定义这些仅经编程方式出现的情形。Rust 参考核心已
  拒绝标量根与含 `CR` 的 String;弥补其余缺口另行跟踪。
- **键中的前导引号字符现在会开启 `<quoted-segment>`
  (§ 5.3.3、§ 10.7)。** 某行的首个内容 —— 经 § 4 的键段修剪后 ——
  以 `"`、`'` 或 `` ` `` 开头时,不再必然按引入 quoted keys 之前的
  方式解析:一个原本以同一引号字符开头且结尾的键,现在会被静默
  读作去掉分隔符的更短的键(`"port": 1` 现在命名为 `port`,而非
  `"port"`);行末前没有匹配闭合符的前导引号字符,要么落入不受
  影响的 Array 根 String 项(根类型尚未确定),要么触发新的
  `UnterminatedQuotedKey`(根类型已是 Object)—— 具体的、依赖
  上下文的规则,以及为需要无歧义前导引号字符的 Array 项提供的
  `::` raw 标记逃生舱(§ 5.4 规则 1),见 § 5.3.3。任何键不以 `"` /
  `'` / `` ` `` 开头的文档均不受影响。
- **§ 3.7 / § 5.2 —— inline 标量中的任何已识别 escape 现在会在关键字
  或数字分类之前强制为 String。** 像 `1\.0` 这样的 body 在 0.6.x
  中可以先解码再定型为 Float,在 0.7.0 中则是 String。该规则适用于
  每一个已识别的 escape,包括 `\.` / `\:` 以及三个引号 escape（三者）
  `\"` / `\'` / `` \` ``,即使解码出的字节不具有结构性作用。
- **§ 5(Float)/ § 5.2 规则 14 —— Float 域现在有规范性下限与
  溢出回退。** 实现 MUST 至少支持 IEEE 754 binary64 的范围与
  精度(MAY 支持更宽表示),且在实现 Float 域内解析值非有限的
  浮点字面量(如 binary64 上的 `1e9999`)回退为 String —— 与
  规则 13 中超出范围的 Integer 完全一致 —— 因此 0.7.0 兼容解析器
  MUST NOT 永远产生非有限 Float,这使 § 5.9.0「§ 3.6 的任何
  字面量语法都不产生非有限 Float」的断言真正成立。新 fixture
  `float/positive_overflow_to_string`、`float/negative_overflow_to_string`
  与 `float/underflow_to_zero` 将边界锁定;最后一个 fixture 记录
  下溢到 `0.0`(有限)是普通 Float,而非回退为 String 的情形。

### 变更

- **§ 6.13 `BadEscapeSequence`** —— 扩展以覆盖不合法的 `\uXXXX` 形式
  (少于四位十六进制数字)与孤立代理项,与既有的未识别 `\X` 情形并列。
- **§ 6.15 `InvalidUtf8`(新增错误类别)** —— 原始字节不是有效 UTF-8
  (§ 3.1、§ 9.3)的文档现在有了显式的 § 6 类别名称。§ 3.1 已要求
  拒绝此类文档;这补上了该拒绝在 § 6 中没有对应类别名称的缺口。
  该检查在任何面向行的或文法级处理之前进行;错误 span SHOULD 指向
  第一个无效序列的字节偏移。
- **§ 5.9.10 的键重新 escape 规则** 现在列举 `<key-char>` 排除的每个
  码点(不仅是 `\`/`.`/`:`),并要求对边界空白与没有命名形式的结构
  字节(`(`、`)`、DEL、控制字节)使用 `\uXXXX`。含有 `(`、`)`、DEL
  或控制码点的键首次可在规范形式中输出。
  另外首次记录(此前就存在的风险,并非新行为):以 `##` 开头的键接受
  `\u0023` bare 形式作为输入,但规范 writer MUST 使用引号,例如
  `"##a:b": 1`,从而不会让规范输出的该行被悄悄读作注释。
- **`<key-char>`(§ 4)** 现在允许原始 VT(`0x0B`)与 FF(`0x0C`)
  作为字面键内容,与 § 3.3 的扩展一致。非破坏性 —— 仅接受此前被
  拒绝为 `InvalidKey` 的文档。
- **§ 5.9 / § 8.3** 现在仅对**可表示**(representable)的 Value
  定义 round-trip 保证。含 `CR` 字节或 stripped 多行形式的某种
  病态碰撞的 String,已由 § 5.9.7 明确排除在可表示域之外,属于
  不可表示 Value。writer-conforming 实现 MUST 以错误拒绝不可
  表示的 Value,而不是将其序列化;此前 § 5.9.7 单独允许为同一类
  Value 输出任意或 lossy 编码,这与 § 5.9 的字节确定性要求不兼容。
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
- **§ 8.1(连同 § 5 的 Integer 定义)——普通 fixture 的数值等价性
  在被测实现声明的 Integer 或 Float 域中解释,或转换到该域后比较,
  而不是相对于一个普遍适用的最小域 Value。** 因此普通 Float token
  (例如 `3.14`)不要求更宽的 decimal 实现伪造 binary64 的舍入值。
  只有当源 Ktav 字面量在被测实现声明的域中解释后,因越过该叶指明的
  边界而在值或 kind 上不同于最小域 oracle token 时,manifest 豁免才
  适用。若没有这种差异,列出的叶 MUST 正常匹配;豁免绝不扩展到其他叶。
- **§ 8.2(连同 § 5.9.5)—— writer-conforming 的逐字节 fixture
  要求遵循同一数值域规则。** 每个普通且未豁免的字段 MUST 在被测
  实现声明的域中与 JSON oracle 匹配;普通数值字段不要求持有一个普遍
  适用的最小域 Value。列出的边界叶 MAY 不同,仅当源 Ktav 字面量在
  被测域中越过该叶命名的边界,且实现沿该边界类支持更宽域时才可如此。
  其他每个字段 MUST 正常匹配,其贡献 MUST 与 fixture 的
  `canonical.ktav` 保持字节精确相同。这修正了 § 8.2 的旧读法:该读法
  会仅因任意精度实现将 `i64_overflow_to_string` 的 body 保留为
  Integer 并以裸形式写出,就判定其不合规。
- **§ 5.9.10 —— 规范 writer 现在在需要转义结构字节时优先选择
  quoted 形式。** 每当需要转义结构字节(`.` `:` `,` `{` `}` `[`
  `]`)、`(` / `)`、`##` 前缀或边界空白时,writer 现在优先选择
  quoted 键段(分隔符 `"`)而非 bare-加转义(仅需转义反斜杠、LF、
  CR、控制字节或 DEL 时不切换形式,因为 quoting 并不能省去该
  转义)。这改变了此前需要转义 `\.` / `\:` / 括号 / 逗号 / 圆括号,
  或需要转义 `##` 前缀的每一个键的规范字节 —— 例如,`a\.b: 1`
  现在规范化为 `"a.b": 1`,而非 `a\.b: 1`;既有的
  `valid/key_escaping/*.canonical.ktav` fixture 相应更新
  (与此文本改动分开跟踪)。

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
  fixture 的 Value。** 三个只能编程构造的原因码——`ScalarRoot`、
  `EmptyKeyName` 与 `NonFiniteFloat`——在此类别中都有 fixture。
  `NonFiniteFloat` 有三个 fixture:
  `versions/0.7/tests/unrepresentable/nan.json`、
  `versions/0.7/tests/unrepresentable/negative_infinity.json` 与
  `versions/0.7/tests/unrepresentable/positive_infinity.json`;每个都在
  unrepresentable fixture 的 JSON 编码中使用上下文限定的
  `{"$float": ...}` 哨兵,因为 JSON 没有可移植的 NaN/Infinity 字面量。
  该哨兵不会把 `$float` 保留为 parser Object 的键名。writer
  用以报告拒绝的 API 形式是 implementation-defined,规范性的只是
  代码名称。README(en/ru/zh)在既有 `valid/` / `invalid/` 旁记录了
  新类别,并要求 runner MUST 遍历每个存在的类别,而非静默跳过不
  认识的类别。不解决 rust#5 或 rust#12 —— 二者需要在 `rust` 核心
  与六个语言绑定中另行完成。
- **Quoted keys(§ 5.3.3)** —— 键段 MAY 写作 `"…"`、`'…'` 或
  `` `…` `` 以代替 bare 形式;在分隔符内部,`.`、`:`、`,`、`{`、
  `}`、`[`、`]` 以及另外两种引号字符均为普通内容,无需转义,且
  内容永不被修剪。三个新增的具名 escape,`\"` / `\'` / `` \` ``
  (§ 3.7),使得段自身的分隔符可以字面出现在段内 —— escape 表从
  十一项增至十四项。这三个 escape 同样在 inline 标量**值**中被识别,
  不仅限于键 —— `\"` / `\'` / `` \` `` 现在在值中也解码为字面引号
  字节(此前二者在任何上下文中——包括值——都是
  `BadEscapeSequence`);引号字符在值中仍无结构性作用,既不作为
  分隔符,也不会被剥离,无论是否转义。为语法新增
  `<quoted-segment>` 产生式,同时收窄了既有的 `<bare-segment>`
  产生式(bare 段的首个 token 现在排除未转义的引号字符开头)——
  并非纯属新增;此次收窄带来的唯一行为变化——已经以引号字符开头
  的键或段——已在上方单独的 Breaking 条目中说明,此处不再重复
  声称。新增错误类别 `UnterminatedQuotedKey`(§ 6.16),
  在已知为 pair line 的行上,当引号开启键段却在行末前没有匹配
  闭合符时报告;`InvalidKey`(§ 6.4)与 `EmptyKey`(§ 6.5)各自
  新增一种触发场景。
- **`parseable-unrepresentable/` 一致性类别(0.7 起)** —— parser 产生、但
  conforming writer MUST 拒绝的 Value 现在使用
  `<name>.ktav` / `<name>.json` 配对 fixture,并限定四个规范性 String
  原因码:`CRByte`、`BothFormsRequired`、`TrailingWhitespaceCollision`
  与 `LeadingWhitespaceCollision`。它区别于只能编程构造的
  `unrepresentable/`,不包含 canonical-output 文件。
- **语料库与节 inventory lock(0.7 起)** ——
  `scripts/locks/corpus-inventory.0.7.lock.json` 锁定每个语料路径及
  digest,而 `scripts/locks/section-inventory.0.7.lock.json` 锁定有序的
  content-unit manifest;builder 与语料校验器会拒绝未伴随有意 lock
  更新的新增、删除、漂移与顺序变化。
- **`versions/0.7/content/README.source.js` 是 README 的单一源对象**,
  为英文、俄文与中文 content README 提供 `{ en, ru, zh }`。Builder
  静态校验并解码它,再逐字节比较三个生成文件;各节 `content/` unit
  同样是生成规范文件的事实来源。

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
  § 5.9.10 的规则:`\u0023` bare 形式是可接受的输入,但规范 writer
  MUST 为该键使用引号,例如 `"##a:b": 1`,以防止该碰撞。
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
  而非 `InvalidKey`。仅当方括号/花括号是该行经 trim 后的首个非空白
  码点时适用;出现在行内其他位置时(如 `a{b: 1`)规则 6 照常生效,产生
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
- **§ 5.0.1 —— 括号优先级措辞改为「该行经 trim 后的首个非空白码点」**,
  原先「该行第一个字节」孤立地读会被理解为原始行,对 `  [bad]: 1`
  (括号前有前导空白)给出错误结论。该规则与 § 5.0.1 的所有规则一样
  作用于 trim 后的首条内容行;行为已针对参考解析器验证。新增 fixture
  `invalid/inline/leading_whitespace_bracket_before_separator` 锁定
  前导空白情形。规范的 ZH 翻译(与 RU 翻译)同步修正。
- **§ 5.9.8 —— 补回 RU 与 ZH 翻译中 binary64 段落缺失的最后一句**
  (「使用任意精度 decimal 的实现 MAY 产生不同输出,但仅限于其
  Value 域有所不同之处」);英文原文未变。
- **README(en/ru/zh)—— Layout 树不再列出并不存在的 `tests/README.md`,
  并补上 `unrepresentable/`(0.7+);绑定段落改为明确陈述 C ABI 函数
  接口自 0.1 起未变,且绑定解析底层 Rust 核心所支持的格式版本(当前
  为稳定版 0.6.4)**,取代含混的「相同的 Ktav 接口」。
- **§ 5.9.0 —— 可表示性谓词被拆分为文档根检查与新增的内部递归
  「节点可表示」（node-representable）检查。** 旧措辞是一条单一的
  扁平合取,按字面阅读会使普通的子标量(例如嵌套在 Object 中的
  String)不可表示,因为它作为独立的 Value 无法通过第一条
  (「V 是 Object 或 Array」)。现在只有交给 writer 的最外层 Value
  才受根类型约束;「节点可表示性」以任意深度递归穿过 Object 的
  pair 值与 Array 元素,而不会重复施加该约束。§ 5.9.0 现在还规定
  了同时违规时的优先级规则:文档根检查最先求值,而当节点可表示性
  在 Value 的后代中发现多于一个违规时,实现 MAY 报告其中任意一个
  (不强制遍历顺序;这属于仍未定案的 structured-error 契约,
  rust#12)。四个 `unrepresentable/` fixture 的裸 String 值此前
  同时触发 `ScalarRoot` 和预期的 String 专属代码(`cr_byte`、
  `both_forms_required`、`trailing_whitespace_collision`、
  `leading_whitespace_collision`),现已重新包装为 `{"s": <string>}`,
  使每个 fixture 精确检验其同名的原因代码。
- **§ 5.2 —— 跨实现的「相同 Value kind」`MUST` 现在限定于共享同一
  数值域的实现。** 无条件措辞与 § 5 / § 8.1 自身的加宽域许可相
  矛盾:仅支持 i64 的解析器与支持 bignum 的解析器会合法地把
  `9223372036854775808` 分类为不同结果(String 对 Integer),二者
  可以同时遵守各自的域规则却又违反旧的笼统 `MUST`。
- **§ 5 —— binary64 下限现在规定转换语义,而不仅是范围与精度。**
  把 decimal 的 Float 字面量转换为最小 binary64 表示 MUST 采用
  IEEE 754 的 `roundTiesToEven`,且最小表示 MUST 支持次正规
  (gradual-underflow)值。七个新 fixture 覆盖此下限:`max_finite` 与
  `min_positive_normal`(在任何支持的域下都无歧义),而
  `min_positive_subnormal` 也是依赖边界的(`float_precision`)
  fixture,以及加入新清单的另外四个依赖边界的 fixture ——
  `just_above_max_finite_to_string`(在更宽 decimal 域内有限,在
  binary64 上溢为 String)、`negative_underflow_to_negative_zero`
  与 `half_min_subnormal_underflow_to_zero`(二者在更宽域内有限,
  在 binary64 下溢为 `±0.0`),以及 `decimal_rounding_tie`
  (`9007199254740993.0`,恰好位于两个 binary64 值的正中;binary64
  舍入到偶数邻居 `9007199254740992.0`,更宽的 decimal 域则精确
  保留该字面量)。
- **§ 5.9.0 —— 「多于一个违反」许可现在覆盖当前节点与 Object 的
  键,而不仅是后代。** 旧措辞(「在 Value 的后代中」)使得同时满足
  两条冲突规则的 String,或同时有空键与另一处不可表示子节点的
  Object 在技术上未被覆盖 —— 键本身并不是 Value 的后代。
- **`versions/0.7/tests/unrepresentable/nan.json`、
  `negative_infinity.json` 与 `positive_infinity.json`** ——
  `NonFiniteFloat` 原因有三个 fixture,因为 plain JSON 无法编码 NaN
  或 Infinity。每个 fixture 仅在 unrepresentable fixture 的 JSON 编码
  中使用规范性 `{"$float": ...}` 上下文哨兵;它不会把 `$float` 保留为
  parser Object 的键名。README 在 `unrepresentable/` 其余 schema 之旁
  记录了该哨兵。
- **§ 5.2 不再把一般语义规则与 fixture 清单混为一谈。**
  同 kind 的 `MUST`(限定于相同数值域)现在作为关于解析器可能见到的
  每一份文档的规则来陈述;§ 8.1 / § 8.2 则单独指名 —— 仅对共享一致性
  语料库而言 —— 哪些 fixture 已知会探测此类边界。此前 § 5.2 自身声称
  语料库的 fixture 清单就是*格式*中域相关分歧的完整集合,这是
  错误的 —— 任意越域的体(如 `9223372036854775809`)跨越同一边界却
  并非具名 fixture。
- **`numbers/float/decimal_rounding_tie.canonical.ktav` 从 decimal
  形式修正为科学形式**(`9007199254740992.0` →
  `9.007199254740992e15`):§ 5.9.8 要求任何 `abs >= 1e7` 的非零
  Float 使用科学形式,而该值(约 9×10^15)远超此界。错误的 decimal
  形式此前是对照 `ktav::render::render()` 检验的,该函数并不应用
  § 5.9.8 的记法阈值;`ktav::emit_canonical()` 才是真正实现该阈值的
  函数,也是 writer-conforming 实现必须匹配的对象。已针对
  `emit_canonical()` 重新验证全部七个新 Float fixture,以及既有的
  `notation_boundaries` / `exponent` fixture —— 这是唯一的不匹配。
- **README(en/ru/zh)—— 修正两处数值模型错误。** Float 溢出为
  非有限值与 Integer 超出 i64 范围都会回退为 String,但 Float *下溢*
  不会:它舍入为有限的带符号 `0.0` 并保持为 Float,此前的措辞没有
  区分这一点。另外,`1e2` 的规范形式是 `100.0` 而非 `100` —— 裸的
  `100` 会重解析为 Integer,破坏 Float 的 round-trip;§ 5.9.8 的
  decimal 替代形式始终保留小数点。
- **§ 5.9.0 —— `$float` 哨兵仅限于 unrepresentable fixture 的
  JSON 编码**,并不是 parser Object 的保留键名;普通解析出的 Object
  可以使用 `$float` 作为键。
- **CHANGELOG —— 修正过时的 NonFiniteFloat fixture 引用**:现在列出
  当前的 `nan.json`、`negative_infinity.json` 与 `positive_infinity.json`,
  并删除「没有 fixture」的说法。
- **`boundary-fixtures.json`(`versions/0.7/tests/boundary-fixtures.json`,
  位于 `valid/` 之外,使以 `valid/**/*.json` 枚举 fixture 的 runner
  永远不会把它误认为 fixture)为 § 8.1 / § 8.2 所许可的数值域偏差
  提供了可机读契约,使拥有更宽数值域的实现可以偏离某些 fixture
  oracle 而不失去 conformance。** 该清单是叶级而非 fixture 级:每个
  条目指名一个 `fixture`、一个指向其内部具体叶的 JSON 指针 `path`
  (RFC 6901),以及一个 `boundary_class`(`integer_range` /
  `float_range` / `float_underflow` / `float_precision`),因此实现的
  豁免被限定在它真正支持更宽域的那个确切叶与轴上 —— 一个拥有更宽
  Integer 域但只有普通 binary64 Float 的实现仅在 `integer_range` 叶上
  豁免,反之亦然。叶级豁免意味着,若某 fixture 同时混有依赖数值域与
  普通字段,也只有部分被豁免:`big_overflow_to_string` 的 `big`/
  `bigger` 字段(超出 i64)被列入清单,而其 `tiny` 字段(在每个域中
  都是普通的 `Integer(1)`)仍需被检查。该清单还列出了
  `numbers/float/min_positive_subnormal` 的叶 —— 任意精度 decimal 域
  会完整保留其精确输入值,而 binary64 会将其缩短为 `5e-324`。更宽域
  的实现豁免于逐字节匹配所列的叶,不受该语料库固定的某个特定替代
  方案约束 —— 其在该处的正确性直接由 § 5 / § 5.9 管辖。§ 8.1 / § 8.2
  在叶级上引用此清单,取代以文字描述例外。
- **README —— 「通过测试套件」现在被表述为合规的必要条件而非充分
  条件。** 随着 `boundary-fixtures.json` 的叶现在被显式声明为由共享
  语料不对更宽域实现进行验证,README 中不加限定的「实现通过全部测试
  即合规」的说法不再准确 —— 这样的实现还必须对语料豁免的那些叶自行
  验证其 § 5 / § 5.9 行为。
- **RU/ZH § 5.9.3 —— 恢复缺失的空首项包裹情形。** 两个译本都只描述了
  非空复合值开启行的包裹(§ 5.0.1 规则 4/5),且 RU 明确声称仅在
  「首项为非空复合值时」才需要包裹,遗漏了英文原文中同等规范性的空
  复合值情形(规则 2/3,`{}` / `[]`)。严格依照 RU 或 ZH 文本构建的
  writer 会输出一个首项为空 Object/Array 的未包裹 Array 根,其重新
  解析时根 kind 错误 —— 这是译出算法中真正的 round-trip 缺陷,而不
  只是措辞缺口。
- **RU/ZH § 5.6 —— 恢复缺失的 LIFO 配对句子**(「多行字符串体
  MUST NOT 跨越另一个复合值的边界:开启行与关闭行通过解析器的 LIFO
  栈无歧义地配对。」),两个译本均完全缺失。
- **RU/ZH § 5.8.4 —— 移除捏造的「SHOULD 低于 64 层」深度限制。**
  英文原文未设定任何规范性深度限制,只说「SHOULD 避免病态的深度
  嵌套」 —— RU 和 ZH 各自编造了一个权威英文文本中并不存在的具体
  数字。

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

目录: [`versions/0.1/`](https://github.com/ktav-lang/spec/tree/1d5dc09/versions/0.1/) — 已从当前树中移除（`c9593e8`）；此链接指向该目录仍存在的最后一次提交。
