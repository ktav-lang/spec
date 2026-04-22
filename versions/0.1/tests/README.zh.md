# Ktav 一致性测试套件

**Languages:** [English](README.md) · [Русский](README.ru.md) · **简体中文**

一份与语言无关的 Ktav 解析器测试套件。任何符合规范的实现都应当对
自家解析器运行本套件并全部通过。

## 结构

```
tests/
├── valid/
│   ├── <category>/
│   │   ├── <name>.ktav        Input document.
│   │   └── <name>.json        Expected Value, serialized as JSON.
└── invalid/
    ├── <name>.ktav            Input document.
    └── <name>.json            { "error": "<category>" } — expected failure.
```

## JSON 预期输出

Ktav 的 `Value` 直接映射到 JSON —— 不使用包装对象:

| Ktav `Value`            | JSON                                   |
|-------------------------|----------------------------------------|
| `Null`                  | `null`                                 |
| `Bool(true)`            | `true`                                 |
| `Bool(false)`           | `false`                                |
| `String(s)`             | `"s"`                                  |
| `Integer(s)`            | *不带小数点的 JSON 数字* —— 例如 `8080`、`-100`、`0`、`99999999999999999999` |
| `Float(s)`              | *带小数点的 JSON 数字* —— 例如 `0.5`、`-1.5`、`0.0`、`1.5e-10`、`2.5E+8` |
| `Array([v1, v2, …])`    | `[ v1, v2, … ]`                        |
| `Object([(k1, v1), …])` | `{ "k1": v1, … }`                      |

**普通标量(`:` 对的值)在 Value 层保持为字符串** —— 类型处理
交给消费方(例如 Rust 侧的 serde)。对 `port: 8080`(普通对),
测试预期 `"port": "8080"` 才对,`"port": 8080` 则不对。

**Integer 与 Float 以小数点区分。** Oracle 将 `Integer(s)` 写作
不带小数点的 `s`,将 `Float(s)` 写作带小数点的 `s`。语法要求
Float 的 body 必须含 `.`,因此不存在歧义:`Float("0")` 不存在
(会抛出 `InvalidTypedScalar`),而 Integer 始终不含小数点。

**精度。** 对于超出 i64/f64 范围的数字(如 `integer_large` 中
20 位整数),解析 oracle `.json` 的实现 MUST 使用任意精度数字
解析器,或通过 Integer/Float 在 Value 层保留的文本形式进行
比较。无该能力的实现可按 round-trip 等价方式兜底:将 oracle
经由自身的 Ktav→JSON 路径再生成,然后比较 JSON 结构。

### 示例

```text
# foo.ktav
port:i 8080
ratio:f 0.5
version: 1.2
```

```json
{
  "port": 8080,
  "ratio": 0.5,
  "version": "1.2"
}
```

## 实现如何使用

1. 用你的实现解析 `<name>.ktav`，得到内存中的 Value。
2. 用你实现的规范化序列化将该 Value 输出为 JSON
   （**保留对象字段的插入顺序**）。
3. 与 `<name>.json` 做字节级比较——或至少在「对象字段有序」语义下
   做结构级比较。

对于 `invalid/*`，第 1 步必须返回错误，且错误的类别应当与
`<name>.json` 里 `"error"` 所声明的类别一致。

## 错误类别

与规范第 6 节对应：

- `UnbalancedBracket` — 没有配对开括号的 `}`/`]`，或在复合结构
  /多行字符串仍未闭合时到达 EOF。
- `MismatchedBracket` — 用 `}` 去关 `[`，或反之。
- `DuplicateName` — 同一对象内出现重复键。
- `PathConflict` — 点分键展开与既有标量发生冲突。
- `InvalidKey` — 键包含被禁止的字符。
- `EmptyKey` — 键值对行首个 `:` 之前为空字符串。
- `OrphanLine` — 对象内出现既非冒号对、又非关括号的行。
- `InlineNonEmptyCompound` — inline 的 `{...}` / `[...]` 里带有
  内容。
- `InvalidTypedScalar` — `:i` / `:f` 类型标记的 body 与所要求的
  integer / float 语法不匹配。
- `MissingSeparatorSpace` — 键值对分隔符(`:`、`::`、`:i`、`:f`)
  或数组元素标记(`::`、`:i`、`:f`)与 body 之间没有空白且不以
  EOL 结束(§ 6.10)。

## 对 Rust 实现运行

参见 [`ktav-lang/rust`](https://github.com/ktav-lang/rust)——它的
测试套件以 git submodule（或拷贝）的方式引入本目录并遍历每一对。

## 贡献新测试

推荐流程：

1. 写出 `.ktav` 文件，聚焦单一场景——一个测试一个概念。
2. 用任意一份符合规范的实现处理它，抓取其规范化 JSON 输出，保存为
   `<name>.json`（对于非法输入，则抓取错误类别并写入
   `{"error":"<cat>"}`）。
3. 发起 PR。每个实现的 CI 都会校验它与预期输出是否一致。

请为测试起具描述性的名字——`empty_list.ktav`，而不是 `t1.ktav`。
