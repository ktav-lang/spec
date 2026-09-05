# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** [English](README.md) · [Русский](README.ru.md) · **简体中文**

> **草案范围:** 本 README 的功能概览与示例遵循尚未发布的 Ktav 0.7.0
> 草案。稳定的 0.6.4 实现应使用 [0.6.4 规范](versions/0.6/spec.zh.md)
> 与其[一致性套件](versions/0.6/tests/);草案差异范围见
> [0.7.0 规范附录 D](versions/0.7/spec.zh.md)。

**演练场：** 在浏览器中互转 JSON / YAML / TOML / INI ⇄ Ktav — **[ktav-lang.github.io](https://ktav-lang.github.io/)**。

> 一种朴素的配置格式。沿用 JSON 的形态——标量、数组、对象、
> `null`、`true`、`false`——但不带 JSON 的任何标点。常见情形下
> 不用逗号、不用引号：逗号只出现在单行 inline 复合值内作分隔符，
> 封闭的 14 项转义表用于字面字节与显式的标量分类。以点分键
> 表达嵌套，以显式的可见标记声明字面字符串和多行字符串。

本仓库是 Ktav 格式的**规范正文**。任何编程语言的实现都应当符合
其所针对的版本。

## 尝一口

一个调动格式所有主要形式的例子 —— `:` 对(裸数字按形式定型,其余
皆为 String)、关键字 Bool、`::`(强制字面 String)、点分键、嵌套
复合值、多行字符串。

```text
## A config for a SOCKS5 rotator.
port: 20082
log_level: info
debug: true

banned_patterns: [
    .*\.onion:\d+
    .*\.local
]

upstreams: [
    {
        host: a.example
        port: 1080
        weight: 0.7
        timeouts: {
            read: 30
            write: 10
        }
    }
    {
        host: b.example
        port: 1080
        weight: 0.3
    }
]

## Dotted keys — flat alternative to nesting.
node.host: a.example
node.port: 1080
## `::` 强制字面字符串 —— 密码中的冒号 ':' 得以保留。
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

解析为下列 Value(以 JSON5 形式展示,带注释与无引号键以便阅读)。
注意各值的对应关系:

- `:` 跟裸整数 body(`20082`)—— Integer;跟裸小数 body(`0.7`)
  —— Float;其余任何 body(`info`、正则、路径)—— String,逐字
  保留,即便内容像数字。
- `: true` / `: false` / `: null` —— 关键字 Bool / Null。
- `::` —— 强制字面 String,不进行分类。

```json5
{
  port: 20082,
  log_level: "info",
  debug: true,

  banned_patterns: [
    ".*\\.onion:\\d+",
    ".*\\.local",
  ],

  upstreams: [
    {
      host: "a.example",
      port: 1080,
      weight: 0.7,
      timeouts: { read: 30, write: 10 },
    },
    {
      host: "b.example",
      port: 1080,
      weight: 0.3,
    },
  ],

  node: {
    host: "a.example",
    port: 1080,
    auth: "p@ss:word",
  },

  motd: "Welcome to the node.\nPlease behave.",
}
```

### 数字按词法形式定型

在最小必需数值域中,格式按 body 的*形状*定型:裸整数成为 Integer,
裸小数成为 Float,其余一切保持为 String。无需标记。任何只是*看起来*
像数字、却并非裸数字的内容(版本号、标签)都不会被转换 —— 而 `::`
可在需要时强制一个真正的裸数字保持为字面字符串。在该最小域中,
超出 i64 范围的裸整数,或者在 binary64 上溢出为非有限的裸小数,
反而保持为 String;更宽的实现 MAY 将该边界字面量分类为 Integer
或 Float。在*被测实现的域中下溢*的小数仍然成为 Float,并在该域中
舍入到带符号的 `0.0`,而非 String;若更宽的域中不发生下溢,则保留
非零 Float。声明的 Float 域包括十进制转换与舍入语义,并 MUST 只接纳
有限 Float。每个非零有限 Float MUST 拥有可精确 round-trip 的有限
十进制表示;
带符号零另行处理,保持为 `0.0` / `-0.0`;最小 binary64 转换使用
`roundTiesToEven`。不支持的精确有理值(如 `1/3`)不属于 Ktav Float 域。

```text
retries: 3
version: 1.2
build:: 0007
label: v1.2
```

```json5
{
  retries: 3,        // 裸整数 — Integer
  version: 1.2,      // 裸小数 — Float
  build: "0007",     // `::` — 强制字面 String
  label: "v1.2",     // 并非裸数字 — String
}
```

### 用 `::` —— 关键字与括号变成普通字符串

当 body 会被分类为关键字（`null`、`true`、`false`）、空复合值
（`{}`、`[]`）或开启复合值（`{`、`[`）时，需要用原始 `::` 标记才能
让它成为普通 String。

```text
## 若不用 `::` 会变成 Bool true —— 此处是字符串 "true"。
on_release:: true
## 以 `[` 开头 —— `::` 阻止"开启数组"的解释。
regex::      [a-z]+
## IPv6 地址字面量 —— 同理。
ipv6::       [::1]:8080
## `null` 关键字用作字面的四个字符的字符串。
placeholder:: null
```

```json5
{
  on_release: "true",
  regex: "[a-z]+",
  ipv6: "[::1]:8080",
  placeholder: "null",
}
```

## 格言

> **做配置的朋友，别做它的考官。配置并不完美——但已是最好的那一份。**

每条规则都是局部的。每一行要么独立成立，要么只依赖于它上方显式可见
的括号。不会踩到缩进陷阱，不会忘记引号，也没有尾随逗号的算术。

## 为什么选 Ktav

| 特性                                           | JSON | YAML | TOML | Ktav |
|------------------------------------------------|:----:|:----:|:----:|:----:|
| 无需强制引号的裸字符串                         |  ✗   |  ~   |  ✗   |  ✓   |
| 无逗号的列表                                   |  ✗   |  ✓   |  ✓   |  ✓   |
| 空白不敏感(不存在缩进陷阱)                   |  ✓   |  ✗   |  ✓   |  ✓   |
| 便于手写的多行字符串                           |  ✗   |  ~   |  ~   |  ✓   |
| 原生注释                                       |  ✗   |  ✓   |  ✓   |  ✓   |
| 支持点分键做平铺式编辑                         |  ✗   |  ✗   |  ✓   |  ✓   |
| 单一解析器、规范精简                           |  ✓   |  ✗   |  ~   |  ✓   |

> ✓ = 具备该特性 · ✗ = 不具备 · ~ = 部分具备

Ktav 保留了 JSON 的形态（你始终清楚一个文档意味着什么），却抛弃了
令 JSON 手写起来刺眼的语法。它借鉴了 TOML 的点分键（便于平铺式编辑
与 CLI 覆盖），又摒弃了 TOML 把内容拆成表格与 inline 两种维度的做法。

## 一屏看完的规则

Ktav 文档的根是由首条内容行决定的 Object 或 Array。任何对象里是键值对，
任何数组里是元素。

```text
## comment             — any line starting with '##'
key: value             — scalar pair; bare number → Integer/Float,
                         any other body → String
key:: value            — scalar pair; value is ALWAYS a literal string
key: { ... }           — multi-line object; `}` closes on its own line
key: [ ... ]           — multi-line array; `]` closes on its own line
key: { a: 1, b: 2 }    — inline object, one line, comma-separated
key: [ 1, 2 ]          — inline array, one line, comma-separated
key: {}   /   key: []  — empty compound, inline
key: ( ... )           — multi-line string; common indent stripped
key: (( ... ))         — multi-line string; verbatim (no stripping)
value                  — inside an array: bare item (typed by form)
:: value               — inside an array: literal-string item
```

整个语言就这些。常见情形下无需逗号与引号 —— 逗号只作为单行
inline 复合值内的分隔符出现 —— 另有一条封闭的 14 项转义表,
用于字面字节与显式的标量分类。`::` 标记（出现在分隔符里
用于键值对，或行首前缀里用于数组元素）强制取字面字符串。

### 点分键

键可以是点分路径。下面这两份文档是*等价*的：

```text
server.host: 127.0.0.1
server.port: 8080
```

```text
server: {
    host: 127.0.0.1
    port: 8080
}
```

点分键可以与嵌套写法自由混用，解析器都会构造出同一棵树。常用场景：

- CLI/环境变量覆盖（`--set server.port=9090`）。
- 在小型配置中做局部修改而不重组结构。
- 起初扁平、根据需要再长出嵌套段落的文件。

解码后内容以 `##` 开头的键可以使用 bare 输入
`\u0023#a\:b: 1`;其中 `\u0023` escape 是可接受的输入。但规范 writer
MUST 改用引号包围该键,例如 `"##a:b": 1`,这样输出不会被误读为注释。

### 字符串，直给

非复合标量 body 在分类前会修剪两端。非空且不属于关键字或数字
字面量的 body 是 String,所以内部空白与标点都属于值。没有引号
意味着没有引号规则——路径、URL、正则、含标点的令牌都可以直接写。

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
padded:   hello
```

这里 `padded` 的 String 值是 `hello`:分隔符 padding 与 body 两端
空白会在分类前修剪。当字符串可能与语法冲突（以 `{` 或 `[` 开头、
等于 `true` 之类的关键字,或恰好等于 `(`、`((`、`()`、`(())` 之一）
时，将分隔符改为 `::`:

```text
literal_bracket:: [
keyword_as_string:: true
```

### 数字,按形式定型

在最小必需数值域中,裸数字会被直接定型:`port: 8080` 给你
Integer,`ratio: 0.5` 给你 Float。由 body 的形状决定:只有数字 →
Integer;带小数点或指数 → Float;其余一切 → String。在最小数值
边界上,超出 i64 范围的整数,或者在 binary64 上溢出为非有限的小数,
会保持为 String,而不是回绕或抛出错误;更宽的域 MAY 将同一边界
字面量分类为 Integer 或 Float。在*实现域中下溢*的小数仍然成为
Float,并在该域中舍入到带符号的 `0.0`;若更宽的域中不发生下溢,
则保留非零 Float。声明的 Float 域包括十进制转换与舍入语义;每个被
接纳的非零有限 Float MUST 有一个可精确 round-trip 的有限十进制候选。
带符号零另行处理,保持为 `0.0` / `-0.0`;最小 binary64 转换使用
`roundTiesToEven`。主机表示中没有这种候选的有限值(例如精确有理数
`1/3`)不是 Ktav Float。

```text
port:    8080
ratio:   0.5
offset:  -100
eps:     1.5e-10
```

数字是携带数值的 Value,并不保留书写时的原文——写出时采用规范化
的规范形式（规范文档 5.9.8 节），因此 `0.50` 回来会变成 `0.5`,
`1e2` 变成 `100.0`(即便是整数值的 Float,小数点也保留,这样
重新解析不会把它变成 Integer)。保证范围内的裸整数作为 Integer 精确往返;
i64（对 Integer）与 binary64（对 Float）是每个实现都保证的可移植
最小域——实现可以支持更宽的域（任意精度/十进制），超出其自身
支持范围的溢出字面量会落入 String。类型化
语言的消费方（Rust + serde、Go）在自己那边收窄到所需的原生类型;
若要让看起来像数字的值——无论多大——保持为文本,用 `::` 强制
（`zip:: 01007`）。

### 多行字符串

两种形式，用途不同：

```text
stripped: (
    line 1
    line 2
        relative indent preserved
)

verbatim: ((
    line 1
        exact leading whitespace preserved
    line 3
))
```

`(` 会剥除公共前导缩进——在文件里按可读的方式书写代码/文本，结果
依然干净。`((` 在换行符规范化后保留每个内容行的字节,但不保留整个
文档的字节。

### 关键字

仅小写：`null`、`true`、`false`。其它写法——`Null`、`TRUE`、`yes`、
`on`——都是普通字符串。不做任何类型魔法，也没有随版本漂移的「陷阱清单」。

```text
port: 8080
active: true
timeout: null
```

```json5
{
  port: 8080,     // 裸整数 → Integer
  active: true,   // 关键字 → 原生 JSON bool
  timeout: null,  // 关键字 → 原生 JSON null
}
```

## 完整规范

- **本文描述的草案：** [Ktav 0.7.0](versions/0.7/spec.zh.md) — 尚未发布;本 README 的功能概览遵循该草案。
- **当前稳定版本：** [Ktav 0.6.4](versions/0.6/spec.zh.md) — 发布于 2026-08-23;稳定语义与 fixture 请使用此版本。
- **所有版本的机器可读索引：** [`versions.ktav`](versions.ktav)。
- **跨版本的历史记录：** [`CHANGELOG.md`](CHANGELOG.md)。

## 一致性测试套件

每个版本都附带一份与语言无关的测试套件，位于
[`versions/<v>/tests/`](versions/0.6/tests/)。尚未发布的 0.7.0 草案有四个
fixture 类别(`valid/`、`invalid/`、`unrepresentable/` 和
`parseable-unrepresentable/`)外加一个顶层元数据文件。稳定的 0.6.4
语料库只有 `valid/` 与 `invalid/`。一致性 runner MUST 遍历目标版本中
存在的每个 fixture 类别——静默跳过不认识的类别会得到假绿色结果,比该
类别完全没有 fixture 还糟。

- **`boundary-fixtures.json`**（*0.7 起,并非 fixture 类别*）——一份
  叶级清单,列出本属正常 `valid/` fixture 内、已知会探测数值域边界的
  单个 Object 字段(spec § 5.2、§ 8.1、§ 8.2),例如 i64 溢出或 Float
  溢出的字面量,并标注它探测的轴(`integer_range`、`float_range`、
  `float_underflow`、`float_precision`)。它位于 `tests/` 根目录、
  而非 `valid/` 之内,正是为了让按 `valid/**/*.json` 枚举 fixture 的
  runner 永远不会把它误认为一个 fixture。在其中列出某个叶并不说明
  更宽域的实现在该字段处必须输出什么——只是说明实现豁免于逐字节
  匹配,且仅当它在该特定轴上确实支持宽于最小域的域;同一 fixture 的
  其他任何字段,以及未列出的任何 fixture 或字段,不对任何实现给予
  豁免。
- **`valid/`**——可解析的文档。每个用例是
  `<name>.ktav` + `<name>.json` + `<name>.canonical.ktav` 三元组：
  `.ktav` 是输入;`.json` 是期望解析出的 `Value`,按 1:1 映射
  (`Null`→`null`、`Bool`→`bool`、`String`→`string`、
  `Array`→`array`、`Object`→`object`)。不含 `.`、`e` 或 `E` 的 JSON
  数字 token 表示 Integer;含其中任一项的 token 表示 Float,包括
  `-0.0`。其余标量保持为字符串,`::` 强制字面字符串;
  `.canonical.ktav` 是该同一
  `Value` 期望的字节级精确 writer 输出。对象字段顺序是有意义的。
- **`invalid/`**——conforming 解析器 MUST 拒绝的文档。每个用例是
  `<name>.ktav` + `<name>.json` 一对;`.json` 在 `expected_error`
  字段中指明期望的错误类别。
- **`unrepresentable/`***(0.7 起)*——conforming writer MUST 拒绝
  序列化、而非输出 lossy 或部分内容的 `Value`。这些是只能编程
  构造的情形,每个用例只有一个 `<name>.json`,且恰好包含 `value`、
  `unrepresentable_reason` 与非空 `note`;Value 映射及 `$float`
  sentinel 的精确形状见 § 5.9.0。该 sentinel 仅限于此 fixture 编码的
  上下文,不会把 `$float` 保留为 parser Object 的键名。原因代码 MUST
  在树中有递归见证,
  且只能是 `ScalarRoot`、`EmptyKeyName` 或 `NonFiniteFloat`,
  MUST NOT 从文件名推导。
- **`parseable-unrepresentable/`***(0.7 起)*——解析器产生、但
  conforming writer MUST 拒绝的 Value。每个用例是
  `<name>.ktav` + `<name>.json` 一对;解析输入 MUST 产生 JSON `value`,
  写出 MUST 以指定原因代码失败。只允许 String 原因 `CRByte`、
  `BothFormsRequired`、`TrailingWhitespaceCollision` 和
  `LeadingWhitespaceCollision`;这些是 pair 而非 triple,没有其他文件,
  也没有 canonical-output 文件。

Versioned `scripts/locks/corpus-inventory.0.7.lock.json` 将 `valid/`、
`invalid/`、`unrepresentable/`、`parseable-unrepresentable/` 中的每个
corpus-relative 文件路径及 `boundary-fixtures.json` 映射到其 SHA-256。
CI 将其传给 `validate_corpus.py --corpus-inventory-lock`,后者拒绝新增、
删除、内容漂移与未知顶层条目;lock 补充而不取代 semantic/schema 检查。

通过该版本测试套件中每个存在类别的全部测试,是通过发布的必要门槛,
但本身并不足以证明合规:`boundary-fixtures.json`(0.7 起)告诉共享
语料库,对在该叶的轴上数值域宽于最小域的实现,跳过特定叶的精确
字节/Value 检查——spec § 8.1 / § 8.2 定义了这类实现在那里的正确性
实际取决于什么(§ 5、§ 5.9),而共享语料库并不验证它。声明更宽
数值域的实现 MUST 额外针对 § 5 / § 5.9 验证其自身在其所声称域上的
行为,超出本语言无关测试套件所检查的范围。可以把目录作为 git
submodule 引入(或直接拷贝)。

## 版本方案

规范版本采用 `MAJOR.MINOR.PATCH`：

| 递进                | 含义                                                                                   |
|---------------------|----------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)`   | 编辑性——错字修正、措辞澄清；符合规范的实现不受影响。                                   |
| `x.y → x.(y+1)`     | 向后兼容的扩展（新关键字、新的原始形式）。                                             |
| `x.y → (x+1).0`     | 语法或语义上的破坏性变更。                                                             |

**pre-1.0 例外：** 当 `MAJOR` 为 `0` 时，`MINOR` 递进 MAY 携带
破坏性变更，而不必强制 `MAJOR` 递进(0.7.0 相对 0.6.x 正是如此）。
一旦格式达到 `1.0`，破坏性变更将严格要求 `MAJOR` 递进，如上表
所述。

在任一稳定 `MAJOR` 内，面向 `x.0` 的实现 MUST 将任何在更晚 `x.y.z`
下有效的文档解析为与其支持子集等价的结果 —— 但上述 pre-1.0 例外
所允许的破坏性 `MINOR` 递进除外，此保证不跨此类递进成立。

每个版本的目录完全自包含：`spec.md`、一致性套件 `tests/` 以及该版本
专属的增补。实现按路径锁定到具体版本目录。

## 目录结构

```
.
├── README.md              this file
├── versions.ktav          machine-readable index of versions
├── CHANGELOG.md           summary across versions
├── CONTRIBUTING.md        how to propose changes
├── LICENSE-MIT            MIT License
├── LICENSE-APACHE         Apache License 2.0
├── scripts/
│   ├── validate_corpus.py                 一致性语料库的结构校验
│   ├── test_validate_corpus.py            validate_corpus.py 的单元测试
│   ├── check_translation_parity.py        EN/RU/ZH 翻译对等性检查工具
│   ├── test_check_translation_parity.py   check_translation_parity.py 的单元测试
│   ├── build_spec.mjs                     (0.7+) 从 content/ 生成 spec.md/.ru.md/.zh.md
│   ├── test_build_spec.mjs                (0.7+) build_spec.mjs 的对抗性单元测试(负面路径)
│   ├── archive/                           (0.7+) 已归档的一次性内容单元引导脚本
│   │   └── extract_content_units.py         见 content/README.md;拒绝覆盖已存在的 content/
│   └── locks/                             boundary、完整语料与 section inventory 的 versioned 锁文件
├── .github/workflows/     CI:content/ 逐字节一致性检查(0.7 起)、语料库校验、
│                          翻译对等性检查,以及全部三套单元测试
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        ├── spec.ru.md     Russian translation of the spec
        ├── spec.zh.md     Chinese translation of the spec
        ├── content/       (0.7+) 逐节来源——见 content/README.md;
        │                  spec.md/.ru.md/.zh.md 由 content/ 生成,切勿手动编辑
        └── tests/         language-agnostic conformance suite
            ├── valid/
            ├── invalid/
            ├── unrepresentable/   (0.7+)
            ├── parseable-unrepresentable/ (0.7+; pair,无 canonical output)
            └── boundary-fixtures.json   (0.7+) leaf-level numeric-
                        domain exemptions, not a fixture category
```

## 实现

| 语言            | 仓库                                                    | 安装                                                  |
|-----------------|---------------------------------------------------------|-------------------------------------------------------|
| Rust(参考)    | [`ktav-lang/rust`](https://github.com/ktav-lang/rust)   | `cargo add ktav`                                      |
| C# / .NET       | [`ktav-lang/csharp`](https://github.com/ktav-lang/csharp) | `dotnet add package Ktav`                          |
| Go              | [`ktav-lang/golang`](https://github.com/ktav-lang/golang) | `go get github.com/ktav-lang/golang`               |
| Java / JVM      | [`ktav-lang/java`](https://github.com/ktav-lang/java)   | `io.github.ktav-lang:ktav`(Maven Central)             |
| JS / TS         | [`ktav-lang/js`](https://github.com/ktav-lang/js)       | `npm install @ktav-lang/ktav`                         |
| PHP             | [`ktav-lang/php`](https://github.com/ktav-lang/php)     | `composer require ktav-lang/ktav`                     |
| Python          | [`ktav-lang/python`](https://github.com/ktav-lang/python) | `pip install ktav`                                  |

Rust crate 是参考解析器,每个绑定内嵌的都是同一个核心。Go、Java、
PHP 和 C# 通过预构建的 `ktav_cabi`(C-ABI 包装)使用它,其函数接口
在各版本间只做增量式扩展——0.6.4 新增了 `ktav_loads_strict`,已有
函数的签名保持不变。Python 附带专用的 PyO3 原生扩展而非 C ABI;
JS 则为不同运行时提供多种构件——浏览器用 WASM、Node 用 N-API,
另有 C ABI 路径——而非单一的绑定形态。它们解析的都是底层 Rust
核心所支持的格式版本(当前为稳定版 0.6.4);
下面与语言无关的
`tests/` 套件每次发布时都会针对所有实现运行。

打算写新实现?请先读目标版本的 `spec.md`
([`spec.zh.md`](versions/0.6/spec.zh.md) 的第 8 节 Compliance),
再让 [`tests/`](versions/0.6/tests/) 套件跑过你的解析器。

## 贡献

在已有版本内做编辑性修订——直接提 PR。其它改动——先开 issue。详见
[`CONTRIBUTING.zh.md`](CONTRIBUTING.zh.md)。

## 支持本项目

作者有许多构想,可能对全球 IT 广泛有益——不局限于 Ktav。实现这些
构想需要资金支持。如果您愿意提供帮助,请联系
**phpcraftdream@gmail.com**。

## 许可证

双重许可 **MIT OR Apache-2.0**,由您选择。见 [LICENSE-MIT](LICENSE-MIT)
与 [LICENSE-APACHE](LICENSE-APACHE)。
