# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** [English](README.md) · [Русский](README.ru.md) · **简体中文**

**演练场：** 在浏览器中互转 JSON / YAML / TOML / INI ⇄ Ktav — **[ktav-lang.github.io](https://ktav-lang.github.io/)**。

> 一种朴素的配置格式。沿用 JSON 的形态——标量、数组、对象、
> `null`、`true`、`false`——但不带 JSON 的任何标点。字符串不加引号，
> 不用逗号，没有转义表。以点分键表达嵌套，以显式的可见标记声明
> 字面字符串和多行字符串。

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

格式按 body 的*形状*定型:裸整数成为 Integer,裸小数成为 Float,
其余一切保持为 String。无需标记。任何只是*看起来*像数字、却并非
裸数字的内容(版本号、标签)都不会被转换 —— 而 `::` 可在需要时
强制一个真正的裸数字保持为字面字符串。两个边界例外:超出保证的
i64 范围的裸整数,或者在 binary64 上溢出为非有限的裸小数,反而
保持为 String——若值放不下,仅凭形状并不能让它成为数字。而
*下溢*的小数(太接近零而无法表示)仍然成为 Float,舍入到带符号
的 `0.0`,而非 String。

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

Ktav 文档是一个隐式的顶层对象。任何对象里是键值对，任何数组里是元素。

```text
## comment             — any line starting with '##'
key: value             — scalar pair; bare number → Integer/Float,
                         any other body → String
key:: value            — scalar pair; value is ALWAYS a literal string
key: { ... }           — multi-line object; `}` closes on its own line
key: [ ... ]           — multi-line array; `]` closes on its own line
key: {}   /   key: []  — empty compound, inline
key: ( ... )           — multi-line string; common indent stripped
key: (( ... ))         — multi-line string; verbatim (no stripping)
value                  — inside an array: bare item (typed by form)
:: value               — inside an array: literal-string item
```

整个语言就这些。没有逗号、没有引号、没有转义表——唯一的「转义」
是 `::` 标记，它出现在分隔符里（用于键值对）或行首前缀里（用于数组
元素）。

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

### 字符串，直给

默认情况下值就是字符串。`:` 之后（再跨过一个填充空格）的内容，
原样构成字符串，一直到行尾。没有引号意味着没有引号规则——路径、
URL、正则、含标点的令牌都可以直接写。

```text
pattern: .*\.onion:\d+
url: https://example.com:8080/path?x=1
key: s3cret/with:colons and-dashes
```

当字符串可能与语法冲突（以 `{`、`[`、`(` 开头，或等于
`true` 之类的关键字）时，将分隔符改为 `::`：

```text
literal_bracket:: [
keyword_as_string:: true
```

### 数字,按形式定型

裸数字会被直接定型:`port: 8080` 给你 Integer,`ratio: 0.5` 给你
Float。由 body 的形状决定:只有数字 → Integer;带小数点或指数 →
Float;其余一切 → String——在数值边缘有两个例外:超出保证的
i64 范围的整数,或者在 binary64 上溢出为非有限的小数,会保持为
String,而不是回绕或抛出错误。而*下溢*的小数(太接近零而无法
表示)仍然成为 Float,舍入到带符号的 `0.0`——它不会退回为
String。

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
下限——实现可以支持更宽的域（任意精度/十进制），超出其所支持范围
的溢出字面量会落入 String。类型化
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
依然干净。`((` 逐字节保留，文档可以字节级往返。

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

- **当前稳定版本：** [Ktav 0.6.4](versions/0.6/spec.zh.md) — 发布于 2026-08-23。
- **所有版本的机器可读索引：** [`versions.ktav`](versions.ktav)。
- **跨版本的历史记录：** [`CHANGELOG.md`](CHANGELOG.md)。

## 一致性测试套件

每个版本都附带一份与语言无关的测试套件，位于
[`versions/<v>/tests/`](versions/0.6/tests/)，最多分为三个 fixture
类别外加一个顶层元数据文件。一致性 runner MUST 遍历目标版本中存在的
每个 fixture 类别——静默跳过
不认识的类别会得到假绿色结果，比该类别完全没有 fixture 还糟。

- **`boundary-fixtures.json`**（*0.7 起,并非 fixture 类别*）——一份
  已知会探测数值域边界的 `valid/` fixture 路径的扁平清单(spec
  § 5.2、§ 8.1、§ 8.2),例如 i64 溢出或 Float 溢出的字面量。它位于
  `tests/` 根目录、而非 `valid/` 之内,正是为了让按
  `valid/**/*.json` 枚举 fixture 的 runner 永远不会把它误认为一个
  fixture。在其中列出某个 fixture 并不说明更宽域的实现必须输出
  什么——只是说明这类实现豁免于逐字节匹配该 fixture 的
  `.json`/`.canonical.ktav`;最小域的实现仍 MUST 精确匹配它,与其他
  任何 fixture 一样。
- **`valid/`**——可解析的文档。每个用例是
  `<name>.ktav` + `<name>.json` + `<name>.canonical.ktav` 三元组：
  `.ktav` 是输入;`.json` 是期望解析出的 `Value`,按 1:1 映射
  (`Null`→`null`、`Bool`→`bool`、`String`→`string`、
  `Array`→`array`、`Object`→`object`——数字按词法形式定型,整数
  body 映射为 JSON 整数,小数 body 映射为 JSON 浮点数,其余标量
  保持为字符串,`::` 强制字面字符串);`.canonical.ktav` 是该同一
  `Value` 期望的字节级精确 writer 输出。对象字段顺序是有意义的。
- **`invalid/`**——conforming 解析器 MUST 拒绝的文档。每个用例是
  `<name>.ktav` + `<name>.json` 一对;`.json` 在 `expected_error`
  字段中指明期望的错误类别。
- **`unrepresentable/`***(0.7 起)*——conforming writer MUST 拒绝
  序列化、而非输出 lossy 或部分内容的 `Value`。没有 `.ktav` 输入:
  这些 `Value` 大多只能以编程方式构造,解析永远不会产生它们。每个
  用例是单一的 `<name>.json`,含三个字段:`value`(该 `Value`,
  与 `valid/` 相同的 JSON 映射,唯一例外是 `NonFiniteFloat`
  fixture:由于 plain JSON 没有这样的字面量,非有限 Float 写作
  `{"$float": "NaN"|"Infinity"|"-Infinity"}`——`$float` 是
  `unrepresentable/` 的 `value` 树内保留的键名,绝不会作为任何其他
  用途的字面 Object 字段)、
  `unrepresentable_reason`(规范
  定义的原因代码)以及 `note`(原因说明)。writer 用以报告拒绝的
  具体 API 形式(异常、error enum 等)是 implementation-defined;
  规范性的只是原因代码的名称。

若实现通过该版本套件中每个存在类别的全部测试,则视为符合该版本。
可以把目录作为 git submodule 引入(或直接拷贝)。

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
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        └── tests/         language-agnostic conformance suite
            ├── valid/
            ├── invalid/
            └── unrepresentable/   (0.7+)
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
