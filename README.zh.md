# Ktav (כְּתָב)

**Languages:** [English](README.md) · [Русский](README.ru.md) · **简体中文**

> 一种朴素的配置格式。沿用 JSON 的形态——标量、数组、对象、
> `null`、`true`、`false`——但不带 JSON 的任何标点。字符串不加引号，
> 不用逗号，没有转义表。以点分键表达嵌套，以显式的可见标记声明
> 字面字符串和多行字符串。

本仓库是 Ktav 格式的**规范正文**。任何编程语言的实现都应当符合
其所针对的版本。

## 尝一口

一个调动格式所有主要形式的例子 —— 默认 `:`(String)、关键字
Bool、类型标记 `:i`(Integer)与 `:f`(Float)、原始 `::`(字面
String)、点分键、嵌套复合值、多行字符串。

```text
# A config for a SOCKS5 rotator.
port:i 20082
log_level: info
debug: true

banned_patterns: [
    .*\.onion:\d+
    .*\.local
]

upstreams: [
    {
        host: a.example
        port:i 1080
        weight:f 0.7
        timeouts: {
            read:i 30
            write:i 10
        }
    }
    {
        host: b.example
        port:i 1080
        weight:f 0.3
    }
]

# Dotted keys — flat alternative to nesting.
node.host: a.example
node.port:i 1080
# `::` 强制字面字符串 —— 密码中的冒号 ':' 得以保留。
node.auth:: p@ss:word

motd: (
    Welcome to the node.
    Please behave.
)
```

解析为下列 Value(以 JSON5 形式展示,带注释与无引号键以便阅读)。
注意各标记的对应关系:

- `:` —— 默认 String,即使内容是数字,在 Value 层也保持为字符串
  (`log_level: "info"`、`banned_patterns[0]: "…"`)。
- `: true` / `: false` / `: null` —— 关键字 Bool / Null。
- `:i` —— Integer 作为原生 JSON number。
- `:f` —— Float 作为原生 JSON number(带小数点)。
- `::` —— 原始 String,不进行分类。

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

### 不用 `:i` / `:f` —— 数字保持为字符串

格式绝不自动检测看起来像数字的 body;类型标注是显式、可选的。
没有标记，每个标量在 Value 层都是 String。需要原生数字的消费方要么
用 `:i` / `:f` 标记该值，要么在自己的边界上做转换（Rust + serde
通过 `FromStr` 自动完成）。

```text
retries: 3
version: 1.2
ratio:f 0.5
count:i 42
```

```json5
{
  retries: "3",      // 普通 `:` — String
  version: "1.2",    // 普通 `:` — String
  ratio: 0.5,        // :f — 原生 JSON number
  count: 42,         // :i — 原生 JSON number
}
```

### 用 `::` —— 关键字与括号变成普通字符串

当 body 会被分类为关键字（`null`、`true`、`false`）、空复合值
（`{}`、`[]`）或开启复合值（`{`、`[`）时，需要用原始 `::` 标记才能
让它成为普通 String。

```text
# 若不用 `::` 会变成 Bool true —— 此处是字符串 "true"。
on_release:: true
# 以 `[` 开头 —— `::` 阻止"开启数组"的解释。
regex::      [a-z]+
# IPv6 地址字面量 —— 同理。
ipv6::       [::1]:8080
# `null` 关键字用作字面的四个字符的字符串。
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
# comment              — any line starting with '#'
key: value             — scalar pair; value is a String (default)
key:: value            — scalar pair; value is ALWAYS a literal string
key:i value            — scalar pair; value is an Integer (digits only)
key:f value            — scalar pair; value is a Float (needs decimal)
key: { ... }           — multi-line object; `}` closes on its own line
key: [ ... ]           — multi-line array; `]` closes on its own line
key: {}   /   key: []  — empty compound, inline
key: ( ... )           — multi-line string; common indent stripped
key: (( ... ))         — multi-line string; verbatim (no stripping)
:: value               — inside an array: literal-string item
:i value               — inside an array: Integer item
:f value               — inside an array: Float item
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

### 需要数字时再写数字

默认情况下，看起来像数字的值就是字符串：`port: 8080` 给你的是
`"8080"`。类型化语言的消费方（Rust + serde、Go）会在自己的边界上
将其转换成真正的数字，无需格式配合。

对于动态类型语言的消费方（JS、PHP、Python），通过 `:i`（Integer）
或 `:f`（Float）显式取用类型值：

```text
port:i   8080
ratio:f  0.5
offset:i -100
eps:f    1.5e-10
```

值在 Value 层仍然保留为文本形式——`Integer("8080")`、
`Float("0.5")`——因此 40 位整数可以往返存活，`1.2` 也不会被
意外强转成 Number。消费方在自己那边再收窄到所需的原生类型。

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
  port: "8080",   // 普通 `:` — String，不是数字
  active: true,   // 关键字 → 原生 JSON bool
  timeout: null,  // 关键字 → 原生 JSON null
}
```

## 完整规范

- **当前稳定版本：** [Ktav 0.1.0](versions/0.1/spec.zh.md) — 发布于 2026-04-22。
- **所有版本的机器可读索引：** [`versions.ktav`](versions.ktav)。
- **跨版本的历史记录：** [`CHANGELOG.md`](CHANGELOG.md)。

## 一致性测试套件

每个版本都附带一份与语言无关的测试套件，位于
[`versions/<v>/tests/`](versions/0.1/tests/)。成对的
`<name>.ktav` + `<name>.json`——其中 `.json` 是期望的 `Value`，
对普通标量按 1:1 映射（`Null`→`null`、`Bool`→`bool`、
`String`→`string`、`Array`→`array`、`Object`→`object`；普通 `:`
对的数值 body 在 Value 层保持为字符串）。类型标量（`:i` / `:f`）
以原生 JSON 数字编码——Integer 写为 `8080`，Float 写为 `0.5`——
通过是否包含小数点来区分。完整的预期输出见
[`versions/0.1/tests/README.zh.md`](versions/0.1/tests/README.zh.md)。
对象字段顺序是有意义的。

若实现通过某一版本套件中的全部测试，则视为符合该版本。可以把目录
作为 git submodule 引入（或直接拷贝），详见
[`versions/0.1/tests/README.zh.md`](versions/0.1/tests/README.zh.md)。

## 版本方案

规范版本采用 `MAJOR.MINOR.PATCH`：

| 递进                | 含义                                                                                   |
|---------------------|----------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)`   | 编辑性——错字修正、措辞澄清；符合规范的实现不受影响。                                   |
| `x.y → x.(y+1)`     | 向后兼容的扩展（新关键字、新的原始形式）。                                             |
| `x.y → (x+1).0`     | 语法或语义上的破坏性变更。                                                             |

在任一稳定 `MAJOR` 内，面向 `x.0` 的实现 MUST 将任何在更晚 `x.y.z`
下有效的文档解析为与其支持子集等价的结果。

每个版本的目录完全自包含：`spec.md`、一致性套件 `tests/` 以及该版本
专属的增补。实现按路径锁定到具体版本目录。

## 目录结构

```
.
├── README.md              this file
├── versions.ktav          machine-readable index of versions
├── CHANGELOG.md           summary across versions
├── CONTRIBUTING.md        how to propose changes
├── LICENSE                MIT
└── versions/
    └── <version>/
        ├── spec.md        the specification document
        └── tests/         language-agnostic conformance suite
            ├── README.md
            ├── valid/
            └── invalid/
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

Rust crate 是参考解析器;其他每个绑定都附带一份预构建的 `ktav_cabi`
(C-ABI 包装)并暴露相同的 Ktav 0.1 接口 —— 下面与语言无关的
`tests/` 套件每次发布时都会针对所有实现运行。

打算写新实现?请先读目标版本的 `spec.md`
([`spec.zh.md`](versions/0.1/spec.zh.md) 的第 8 节 Compliance),
再让 [`tests/`](versions/0.1/tests/) 套件跑过你的解析器。

## 贡献

在已有版本内做编辑性修订——直接提 PR。其它改动——先开 issue。详见
[`CONTRIBUTING.zh.md`](CONTRIBUTING.zh.md)。

## 支持本项目

作者有许多构想,可能对全球 IT 广泛有益——不局限于 Ktav。实现这些
构想需要资金支持。如果您愿意提供帮助,请联系
**phpcraftdream@gmail.com**。

## 许可证

MIT。见 [LICENSE](LICENSE)。
