# Ktav — 书面配置格式

**Languages:** [English](spec.md) · [Русский](spec.ru.md) · **简体中文**

> **Informative translation.** 本翻译仅供参考。本规范的规范性版本
> 是同目录下的英文文件 [`spec.md`](spec.md)。如本中文翻译与英文
> 原文有冲突,以英文原文为准。

**版本:** 0.1.0
**日期:** 2026-04-22

## 摘要

Ktav 是一种纯文本配置格式,其设计使得每一行要么独立成立,要么仅依赖
于其上方可见的显式括号。它提供了 JSON 的形态(标量、数组、对象、
`null`、布尔值),却不含 JSON 的标点:字符串不加引号,不使用逗号,
没有转义序列。嵌套的键使用点分路径;多行字符串与字面量则使用微小且
可见的显式标记。

本文档规定了该格式在 0.1.0 版本下的语法与语义。任何编程语言的实现,
当且仅当其满足以下每一条规范性陈述时,方可声称「Ktav 0.1.0 compliance」。

## 1. 引言

Ktav 文档是一系列行,共同描述一个层级化的对象。典型用途是应用程序
配置,即由人编写、由程序读取并在版本控制中进行 diff 的文档。

本格式的指导原则是:

> **每条规则都是局部的。每一行的含义要么不言自明,要么仅依赖于其
> 上方可见的括号。**

这排除了依赖缩进的空白(YAML)、逗号分隔式的算术(JSON)、锚点与
别名(YAML)、模式指令以及跨越多行的 heredoc 标记。

## 2. 约定

本文档中的关键词 **MUST**、**MUST NOT**、**SHOULD**、**SHOULD NOT** 与
**MAY**,当以全大写形式出现时,按 RFC 2119 所述解释。这些词的小写
使用则视作普通英语。

## 3. 词法结构

### 3.1 字符集

Ktav 文档是以 UTF-8 编码的 Unicode 码点序列。实现 MUST 拒绝不是有效
UTF-8 的文档。

### 3.2 行

行之间由 LF (`\n`) 或 CRLF (`\r\n`) 分隔。行分隔符不属于行的内容。
最后一行的尾部内容无需后接行分隔符。

### 3.3 空白字符

本文档中的「ASCII 空白」指与下列字节之一相匹配的字符:
`U+0009` (tab)、`U+000A` (LF)、`U+000B` (VT)、`U+000C` (FF)、
`U+000D` (CR)、`U+0020` (space)。仅这些具有意义;其他 Unicode 空白
字符视作普通内容。

「Trim」指移除行首与行尾的 ASCII 空白。

### 3.4 注释

若一行经 trim 后的内容以字符 `#` (U+0023) 开头,则该行为注释。该行其
余部分被忽略。

```text
# this is a comment
    # leading whitespace is allowed before '#'
```

内联注释 —— 即与其他内容同在一行、位于内容之后的 `#` —— **NOT**
被识别。不位于经 trim 后行首的 `#` 视为普通内容(通常是值的一部分)。

### 3.5 空行

若一行经 trim 后的内容为空,则该行为空行。除在多行字符串内(§ 5.6)
空行会按字面出现于内容中之外,空行不承载任何结构意义。

## 4. 语法

语法以半形式化记法给出,每行一条规则。终结符用双引号;`<name>` 表示
非终结符;`*` 表示零或多次,`?` 表示可选,`|` 表示选择。

```
<document>      ::= <line>*
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "#" (any-chars until line-end)
<blank>         ::= (ws)

<header-line>   ::= (ws) "{" (ws) eol                ; object open
                  | (ws) "}" (ws) eol                ; object close
                  | (ws) "[" (ws) eol                ; array open
                  | (ws) "]" (ws) eol                ; array close
                  | (ws) ")" (ws) eol                ; multiline close (stripped)
                  | (ws) "))" (ws) eol               ; multiline close (verbatim)

<pair-line>     ::= <key> ":"  <sep-end> <value-part-opt> eol    ; default, String
                  | <key> "::" <sep-end> <value-part-opt> eol    ; literal String
                  | <key> ":i" <sep-end> <integer-body>   eol    ; typed Integer
                  | <key> ":f" <sep-end> <float-body>     eol    ; typed Float
<key>           ::= <segment> ("." <segment>)*
<segment>       ::= <key-char>+
<key-char>      ::= any character except ASCII whitespace (§ 3.3),
                    "[", "]", "{", "}", ":", "#"

<sep-end>       ::= 1*ws | &eol                    ; ≥1 whitespace byte, or the line end
<value-part-opt> ::= <value-start> | ""             ; value-part is optional; "" ⇒ empty String
<value-start>   ::= "{" (ws) "}" (ws)                ; empty inline object
                  | "[" (ws) "]" (ws)                ; empty inline array
                  | "{" (ws)                         ; open object
                  | "[" (ws)                         ; open array
                  | "(" (ws)                         ; open multiline (stripped)
                  | "((" (ws)                        ; open multiline (verbatim)
                  | "()" (ws)                        ; empty inline (yields "")
                  | "(())" (ws)                      ; empty inline (yields "")
                  | <scalar-body>                    ; scalar value

<scalar-body>   ::= (ws) any-chars-until-eol
                    ; trimmed; interpreted per §5.2

<integer-body>  ::= ("+" | "-")? 1*DIGIT
<float-body>    ::= ("+" | "-")? 1*DIGIT "." 1*DIGIT
                    ( ("e" | "E") ("+" | "-")? 1*DIGIT )?

<array-item-line> ::= <item-literal> | <item-typed-int>
                    | <item-typed-float> | <item-value>
<item-literal>  ::= (ws) "::" <sep-end> <any-chars>? eol   ; raw string item
<item-typed-int>   ::= (ws) ":i" <sep-end> <integer-body> eol ; typed Integer item
<item-typed-float> ::= (ws) ":f" <sep-end> <float-body>   eol ; typed Float item
<item-value>    ::= <value-start> eol                  ; value at array position

<multiline-content-line> ::= any line within an open <multiline>;
                             the terminator (")" or "))") ends the block
```

关于该记法的说明:

- 行中 `(ws)` 表示零或多个 ASCII 空白字节。
- `1*ws` 表示**一个或多个** ASCII 空白字节(与 `1*DIGIT` 同一套约定)。
- `<sep-end>` 表示「至少一个 ASCII 空白字节,或该行结束」。它用于
  每个键值对分隔符与数组元素标记之后(`:`、`::`、`:i`、`:f`)。EOL
  分支允许作者以 `key:` 形式留下空值(一行在分隔符后立即结束);
  `1*ws` 分支覆盖常见的 `key: value`、`key:: literal`、`port:i 8080`
  等形式。写成 `key:value` / `port:i42`(既无空白,也无 EOL,分
  隔符后紧跟非空白内容)是语法错误 —— 见 § 6.10。
- `&eol` 是一个零宽度的 positive lookahead:它匹配行尾但不消耗,
  从而让 EOL 仍然作为行结束符发挥作用。
- 实现 MAY 容忍任意行在行分隔符之前的额外尾部空白。

## 5. 语义

符合规范的解析器为合规文档产生一个 **Value**。Value 为下列之一:
**Null、Bool、Integer、Float、String、Array、Object**。

- **Null** —— 单一的特异值。
- **Bool** —— `true` 或 `false`。
- **Integer** —— 形如 `[-]?[0-9]+` 的数值字符串。Value 完整保留
  其文本形式(在 Value 层不进行向机器整型的转换);将其收窄到
  应用所需的整型类型,是消费方的责任。
- **Float** —— 形如 `[-]?[0-9]+\.[0-9]+([eE][-+]?[0-9]+)?` 的数值
  字符串。Value 完整保留其文本形式。
- **String** —— 一个(可能为空的)UTF-8 字符串。
- **Array** —— Value 的有序序列。
- **Object** —— (name, Value) 对的有序序列,其中 name 为字符串。
  Object 内部要求 name 的唯一性(§ 5.5)。

Integer 与 Float 从不由普通 `:` 对隐式产生 —— 它们只在使用类型
标记 `:i` 或 `:f` 时出现(§ 5.3、§ 5.4)。形如 `8080` 的普通标量
body 仍为 String,以保留 0.1.0「一切都是 String,除非被显式标记」
的约束。

解析文档所产生的根 Value 是 **Object** 或 **Array**(均可为空)。
根的类型由文档的**首条内容行**决定 —— 见 § 5.0.1。

### 5.0.1 顶层类型的判定(在 0.1.1 中新增)

「首条内容行」即既非空白(§ 5.1 规则 1)亦非注释(§ 5.1 规则 2)
的第一行。根的类型按此行进行判定:

1. 若文档**无内容行**(空文档,或仅含空白/注释)→ 根为空 **Object**。
   这保留了 0.1.0 一致性解析器对仅注释与空文档输入的行为。
2. 若首条内容行经 trim 后含 `:` 分隔符,使其按 § 5.3 被分类为
   **pair line**(即 `key: …` / `key:: …` / `key:i …` / `key:f …`,
   含点分键)→ 根为 **Object**。
3. 否则,若首条内容行按 § 5.4 被识别为 **array-item line**
   (裸标量、`:: …` / `:i …` / `:f …` 类型标记项、开启嵌套复合的
   单独 `{` 或 `[`,或多行开启符 `(` / `((`)→ 根为 **Array**。
4. 否则(首条内容行为裸闭合 `}` / `]`,或不可分类)→ 错误
   (§ 6.1)。

根类型由首条内容行**固定**。其后行按 § 5.1 规则 7/8 依所选类型
进行分发:

- 在顶层 **Array** 中,任何非空白、非注释的行都是 array-item line
  (§ 5.4)。看起来*像*键值对的行(例如 `host: localhost`)按
  § 5.4 规则 11 即为裸 scalar String,**不会**被隐式重新归类为
  pair。若想使带冒号的 scalar 更明确,可使用 raw marker 形式
  (`:: host: localhost`)。
- 在顶层 **Object** 中,每行都是 pair line(§ 5.3)。无 `:` 的
  裸 scalar 会触发 `MissingSeparator` 错误。

> 设计理由:裸顶层 Array 让文档可以表达诸如记录列表或不带外层键
> 的扁平项列表。形式与 Object 的内联括号 `{…}` 不对称(根 Array
> 不要求 `[…]` 括号),但减少嵌套深度的好处大于对称性的考量。
> 根上的空 Array 无法表达,会归一化为空 Object;实现 MAY 按其
> 习惯处理空文档。

### 5.1 逐行分发

解析器 MUST 在 trim 之后对每行进行分类,严格按以下顺序应用规则:

1. 若经 trim 后的行为空 → 空行;除另有规定外无任何效果(§ 5.6,
   多行)。
2. 若经 trim 后的行以 `#` 开头 → 注释;忽略。
3. **若解析器处于某个开启的多行字符串之中**(§ 5.6):若经 trim 后的
   行恰等于该块的终止符,则多行字符串关闭;否则将原始(未 trim 的)
   行加入多行字符串的内容。
4. 若经 trim 后的行是文档的首条内容行,根类型按 § 5.0.1 设置;
   随后以该行进入对应类型的分发(规则 5–9)。
5. 若经 trim 后的行恰为 `}` → 关闭最内层开启的 Object,否则报错
   (§ 6.1)。
6. 若经 trim 后的行恰为 `]` → 关闭最内层开启的 Array,否则报错
   (§ 6.1)。
7. 若最内层开启的复合类型是 Array,**或**没有开启的复合且根类型为
   Array(§ 5.0.1):将该行视为 **array-item line**(§ 5.4)。
8. 若最内层开启的复合类型是 Object,**或**没有开启的复合且根类型
   为 Object(§ 5.0.1):将该行视为 **pair line**(§ 5.3)。
9. (不可达 —— 仅为完整性保留。)

### 5.2 标量值解释

给定一个标量 body —— pair 行在普通 `:` 分隔符之后经 trim 的 body,
或未使用任何标记的 array-item 行经 trim 的 body —— 解析器按如下
方式对其进行分类。规则按顺序应用;首条匹配者胜出。`::`、`:i`、
`:f` 之后的 body **不**经过 § 5.2 派发,它们分别由 § 5.2.1(类型
标记)和 § 5.3 / § 5.4 的 raw-string 子句处理。

1. 若 body 恰为 `{` → 开启新的 Object scope。
2. 若 body 恰为 `[` → 开启新的 Array scope。
3. 若 body 以 `{` 开头:若它也以 `}` 结尾且两者之间的文本为空(或为
   空白),则值为空 Object;否则为错误(inline 非空对象在 0.1.0
   版本下 NOT 有效)。
4. 若 body 以 `[` 开头:类似地,若 body 为 `[]`(或 `[` 后跟空白再跟
   `]`)则为空 Array;否则为错误。
5. 若 body 恰为 `(` → 开启多行字符串(stripped 形式,§ 5.6)。
6. 若 body 恰为 `((` → 开启多行字符串(verbatim 形式,§ 5.6)。
7. 若 body 为 `()` 或 `(())` → 空 String。
8. 若 body 恰为 `null` → Null。
9. 若 body 恰为 `true` → Bool `true`。
10. 若 body 恰为 `false` → Bool `false`。
11. 否则 → String,其内容即该 body 本身(已 trim)。

关键字形式 `null`、`true`、`false` **区分大小写**地匹配。形如 `True`、
`NULL`、`False` 等的 body 为 String。

#### 5.2.1 类型标量的解释

当一行使用类型标记 `:i` 或 `:f`(pair 形式,§ 5.3;或 array-item
形式,§ 5.4)时,其 body **不**经过 § 5.2 的分类派发。类型标量的
body 按以下方式解释。

**类型整数 body**(标记 `:i`):

- body 经 trim 后 MUST 与 § 4 的 `integer-body` 匹配:一个可选的
  符号(`+` 或 `-`),随后为一个或多个十进制数字。不允许出现其它
  任何字符 —— 特别是,不得出现小数点、指数、数字之间的空白,或
  千分位分隔符。
- 匹配时,解析器产生类型为 **Integer** 的 Value,其文本形式为
  去除前导 `+` 之后的 body。前导 `-` 得以保留。body 为 `0` 或
  `-0` 时,分别产生 `"0"` 与 `"-0"`(解析器不对零的符号做归一化)。
- 不匹配时 —— 包括空 body、包含非数字字符的 body、含小数点的 body,
  或尝试开启复合(`{`、`[`)或多行字符串(`(`、`((`)的 body ——
  解析器 MUST 抛出 **InvalidTypedScalar** 错误(§ 6.9)。

**类型 float body**(标记 `:f`):

- body 经 trim 后 MUST 与 § 4 的 `float-body` 匹配:尾数的一个
  可选符号(`+` 或 `-`)、一个或多个数字、必需的 `.`、一个或多
  个数字,以及可选的指数部分(`e` 或 `E`、可选符号、一个或多个
  数字)。
- 匹配时,解析器产生类型为 **Float** 的 Value,其文本形式为去除
  尾数上前导 `+` 之后的 body。指数部分内部的符号(若存在)按原样
  保留;指数字母(`e` 对 `E`)按原样保留。
- 不匹配时 —— 包括空 body、没有小数点的 body(例如 `42`)、包含
  非数字字符的 body,或尝试开启复合或多行的 body —— 解析器 MUST
  抛出 **InvalidTypedScalar** 错误(§ 6.9)。

类型标记 **NOT** 开启复合或多行字符串。对任何类型对或元素而言,
body 为 `{`、`[`、`(`、`((` 均属错误,尽管这些 body 在普通 `:`
分隔符之后是有意义的。

### 5.3 Pair 行

pair 行形如 `<key> <sep> <body>`,其中 `<sep>` 为 `:`、`::`、`:i`
或 `:f` 之一。

- 首个 `:` 之前的部分为 **key**。
- **分隔符 `::`** —— 该值为 **原始字符串**:两个冒号之后经 trim 的
  body 按字面取作 String。不施加标量分类(§ 5.2)。
- **分隔符 `:i`** —— **类型整数对**(§ 5.2.1)。body MUST 与 § 4
  的 `integer-body` 匹配;匹配时 Value 为 Integer;不匹配时解析器
  MUST 抛出 **InvalidTypedScalar** 错误(§ 6.9)。
- **分隔符 `:f`** —— **类型 float 对**(§ 5.2.1)。body MUST 与
  § 4 的 `float-body` 匹配;匹配时 Value 为 Float;不匹配时解析
  器 MUST 抛出 **InvalidTypedScalar** 错误(§ 6.9)。
- 否则(分隔符 `:`),body 按 § 5.2 进行分类。

分隔符采取贪婪且区分大小写的匹配:`:i`、`:f` 与 `::` 被识别为所示
的精确双字符记号。`:I`、`:F`、`:int`、`:integer`、`:float` **NOT**
被识别为类型标记;key 后紧接其中之一者,要么构成普通 `:` 对
(分隔符的其余部分成为 body 的一部分),要么 —— 对于会留下空 key
或否则破坏 pair 行结构的序列 —— 构成语法错误。

**分隔符后的强制空白。** 每一个键值对分隔符 —— `:`、`::`、`:i`、
`:f` —— MUST 后接至少一个 ASCII 空白字节,**或**该行结束。写成
`key:value`、`key::value`、`port:i42` 或 `ratio:f0.5`(分隔符与
body 之间没有空白)属于 **MissingSeparatorSpace** 错误(§ 6.10)。
EOL 分支的存在是为了让空值可以写作 `key:` / `key::` / `key:i` /
`key:f`,无需末尾空格(许多编辑器会自动剥除末尾空白);不过
`:i` / `:f` 对空 body 仍按 § 5.2.1 判为 **InvalidTypedScalar**
—— 这两个标记要求必须有数字。该规则让每一行保持视觉上的规整:
每个值都从相对分隔符固定距离处开始。

示例:

```text
# key: Bool true
key:  true
# key: String "true"
key:: true
# regex: String "[a-z]+"
regex:: [a-z]+
# addr: String "[::1]:8080"
addr:: [::1]:8080
# port: Integer "8080"
port:i 8080
# ratio: Float "0.5"
ratio:f 0.5
# offset: Integer "-100"
offset:i -100
# count: Integer "5"(前导 '+' 已剥除)
count:i +5
# eps: Float "1.5e-10"
eps:f  1.5e-10
```

#### 5.3.1 键的校验

键 MUST 是以 `.` 连接的 **segment** 的非空序列。每个 segment MUST 非空,
且 MUST 不含 ASCII 空白以及字符 `[`、`]`、`{`、`}`、`:`、`#`。违反
这些约束的键属于语法错误。

实现 MAY 进一步限制键 segment(例如限定为 ASCII 标识符),但 MUST NOT
接受上述规则所拒绝的键。

#### 5.3.2 点分键展开

键 `a.b.c` 表示穿越嵌套 Object 的路径。书写 `a.b.c: v` 在语义上等价
于:

```text
a: {
    b: {
        c: v
    }
}
```

具有公共前缀的多个点分对在该前缀处合并为一个 Object:

```text
server.host: 127.0.0.1
server.port: 8080
```

产生 Object `{server: {host: "127.0.0.1", port: "8080"}}`。

若两对点分键在公共前缀处发生分歧(一个期望它是标量,另一个期望它是
Object),这是一个 **path conflict** 错误(§ 6.3)。

### 5.4 Array-Item 行

在开启的 Array 内部,非关闭行即为数组项。

- 若经 trim 后的行以 `::` 开头,标记 MUST 后接至少一个 ASCII 空白
  字节或本行结束(与 § 5.3 相同的 `<sep-end>` 规则);其余部分(跳
  过 `::` 之后的空白)作为 String 项按字面取用。NOT 施加分类
  (§ 5.2)。写成 `::value`(标记与 body 相黏)属于
  **MissingSeparatorSpace** 错误(§ 6.10)。
- 若经 trim 后的行以 `:i` 开头,标记 MUST 后接至少一个 ASCII 空白
  字节;其余部分为 **类型整数项**:其 body 按 § 5.2.1 解释为
  Integer(或以 **InvalidTypedScalar** 被拒绝)。`:i42`(相黏)
  属于 **MissingSeparatorSpace** 错误。
- 若经 trim 后的行以 `:f` 开头,规则相同 —— 必须有空白,body 为
  按 § 5.2.1 解释的 **类型 float 项**。
- 否则,经 trim 后的行按 § 5.2 分类,所得 Value 成为 Array 的下一项。

示例:

```text
items: [
    # String "ok"
    ok
    # String "[literal]"
    :: [literal]
    # String "true"
    :: true
    # Bool true
    true
    # Null
    null
    # Integer "42"
    :i 42
    # Integer "-7"
    :i -7
    # Float "3.14"
    :f 3.14
    # 开启嵌套 Object
    {
        name: inner
    }
]
```

### 5.5 重复名称

在任一 Object 内部,每个 name MUST 唯一。重复 —— 无论源自两条使用
相同键的普通 pair 行,还是点分键展开进入已存在的名称 —— 都属于语法
错误(§ 6.2)。

同一路径上标量与 Object 之间的冲突是另一种错误(§ 6.3),并非重复
名称错误。

### 5.6 多行字符串

多行字符串由以下两个 value-start 记号之一开启:

- 经 trim 后单独出现在其行上、或在 pair 行的 `:` 之后出现的 `(` ——
  **stripped 形式**。
- 单独出现的 `((` —— **verbatim 形式**。

当一行经 trim 后的内容恰为下列之一时,块被关闭:

- stripped 形式下为 `)`,
- verbatim 形式下为 `))`。

当多行字符串处于开启状态时:

- 开启符与关闭符之间的行按原始内容被收集(包括其空白、注释、括号
  —— 这些都不作解释)。
- 解析器 MUST NOT 对这些行施加任何其他分类。

当块关闭时:

- **Verbatim 形式**(`((` ... `))`):所得 String 为各内容行以单个
  `\n` 字符连接而成,无任何修改。
- **Stripped 形式**(`(` ... `)`):设 *common* 为每一非空内容行的
  共同最长空白前缀。所得 String 通过以下步骤产生:

  1. 从每一非空行的开头移除 *common*。
  2. 将每一空行替换为空字符串。
  3. 以单个 `\n` 连接所得序列。

#### 5.6.1 「关闭符内容限制」

某一行内容经 trim 后**恰好等于**该块的终止符 —— stripped 块的终止
符为 `)`,verbatim 块的终止符为 `))` —— 则该行**始终**关闭该块。
这是多行字符串开启期间唯一适用于其行的规则;不存在任何 escape 机制。

结果与变通方案:

- **trimmed 内容为 `)` 的行 —— 在 verbatim 块中属于内容**(终止符
  是 `))`,无冲突)。若数据中出现单独的 `)` 行,请使用 verbatim 形式:

  ```text
  body: ((
  hello
  )
  world
  ))
  ```

  结果 String:`hello\n)\nworld`。

- **trimmed 内容为 `))` 的行 —— 在 stripped 块中属于内容**(终止符
  是 `)`)。若数据中出现单独的 `))` 行,请使用 stripped 形式:

  ```text
  body: (
      hello
      ))
      world
  )
  ```

  结果 String(dedent 之后):`hello\n))\nworld`。

- 同一内容中**同时出现** `)` 与 `))` 各自单独占行 —— 这是任一形式
  都无法承载的唯一组合。此类数据的文档 MUST 将内容拆分为若干相邻的
  多行值、由消费方拼接,或从外部文件加载。这是 0.1.0 版本有意为之
  的权衡 —— 格式在值内容中不提供 escape 序列。

行上附加的任何字符都会消除冲突:trimmed 内容为 `) x`、`))suffix`
或其它任何**不完全等于**终止符的形式,仍属于内容,而非关闭。

### 5.7 空复合值的快捷形式

在值行中,`{}` 与 `[]` 分别表示空 Object 与空 Array。`()` 与 `(())`
表示空 String。允许在 `{}` 和 `[]` 的括号之间放置空白。除此之外,0.1.0 版本下不存在
其他有效的 inline 非空复合值。

## 6. 错误

符合规范的解析器 MUST 在以下所有情形产生明确标识的错误,并在输出
不正确的 Value 之前停止。错误消息 SHOULD 包含出错的行号。

### 6.1 不平衡或不匹配的括号 (UnbalancedBracket, MismatchedBracket)

解析器按情形,从两个相关的错误代码中选其一抛出:

- **UnbalancedBracket** —— 关闭符没有对应的开启,或在 Object、
  Array、多行 String 仍开启时到达 EOF。
- **MismatchedBracket** —— 关闭符与最内层开启符的种类不一致:
  `}` 关闭 `[`-Array,或 `]` 关闭 `{`-Object。

两者均为本节的子类别;一致性测试套件在 `<name>.json` oracle 中按
情形携带对应的错误代码。

### 6.2 重复名称 (DuplicateName)

同一 Object 内两条 pair 行为同一 name 赋值(§ 5.5)。

### 6.3 路径冲突 (PathConflict)

两条 pair 行对共享路径的类型产生分歧:一条将其视为非-Object 值
(标量、Array),另一条则期望其为 Object(通过点分键展开或花括号
嵌套)。示例:

```text
a: 1
a.b: 2
```

第二行试图深入 `"a"`,但 `"a"` 已经是一个标量。反向情况同样属于
路径冲突:

```text
a.b: 1
a: 2
```

第二行试图用标量覆盖 Object `{b: 1}`。

### 6.4 无效键 (InvalidKey)

某键的 segment 未通过 § 5.3.1 的校验。

### 6.5 空键 (EmptyKey)

某 pair 行经 trim 后其键部分(首个 `:` 之前)为空。

### 6.6 孤行 (OrphanLine)

Object 内部一条非空、非注释的行,既不含 `:`,也不是单独的关闭符。

### 6.7 Inline 非空复合值 (InlineNonEmptyCompound)

以 `{` 或 `[` 开头的值 body,既不是恰好的开启符(`{` / `[`),也不是
空形式(`{}` / `[]`)。

### 6.8 I/O 错误 (IO Errors)

读取底层字节流的失败被报告为 I/O 错误,与上述错误不同。

### 6.9 类型标量无效 (InvalidTypedScalar)

类型标记(`:i` 或 `:f`)所使用的 body 与该标记要求的语法不相匹配
(§ 5.2.1)。body 不是语法上合法的 integer 或 float,是空 body,或
试图开启复合值或多行字符串。示例:

- `count:i abc` —— body 非数字。
- `ratio:f 42` —— body 没有小数点(integer 会解析成功,但此标记
  要求 float)。
- `value:i 1.5` —— body 含小数点,但标记是 integer。
- `x:i ` —— 标记之后 body 为空。
- `x:i {` —— 类型标记不能开启复合值。
- `x:f (` —— 类型标记不能开启多行字符串。
- `x:i -` —— 仅有符号,没有数字。

解析器 MUST 拒绝此类文档。

### 6.10 分隔符后缺少空白 (MissingSeparatorSpace)

键值对分隔符(`:`、`::`、`:i`、`:f`)或数组元素标记(经 trim 后行
首出现的 `::`、`:i`、`:f`)与其 body 之间没有任何 ASCII 空白字节,
且该行在分隔符之后并未结束。解析器 MUST 拒绝此类文档(§ 5.3 与
§ 5.4,强制空白规则)。

**错误示例 —— 解析器 MUST 拒绝以下各条:**

- `key:value` —— `:` 后紧跟 `v`,无空白、无 EOL。
- `pattern::[a-z]+` —— `::` 与 `[a-z]+` 相黏。
- `port:i42` —— `:i` 与 `42` 相黏。
- `ratio:f0.5` —— `:f` 与 `0.5` 相黏。
- 在 Array 中:`::value`、`:i42`、`:f0.5` 作为数组项行。

**正确**写法是:`key: value`、`pattern:: [a-z]+`、`port:i 42`、
`ratio:f 0.5`、`:: value`(数组)、`:i 42`(数组)、`:f 0.5`(数组)。

该规则**不**禁止空 body:`key:`、`key::`、`key:i`、`key:f`(在分隔
符之后该行立即结束)是语法合法的 —— 见 § 5.3。对 `:i` / `:f` 而言,
空 body 依然不满足类型 body 语法,会被作为 **InvalidTypedScalar**
(§ 6.9)而非 MissingSeparatorSpace 报出。

## 7. 示例

### 7.1 最简

```text
port: 20082

banned_patterns: [
    .*\.onion:\d+
]
```

所得 Value 为:

```
Object {
    "port":            String "20082",
    "banned_patterns": Array [
        String ".*\\.onion:\\d+"
    ]
}
```

### 7.2 嵌套对象、数组、关键字

```text
server.host: 127.0.0.1
server.port: 8080
app.debug:   true
app.label:   null

http.methods: [
    GET
    POST
    DELETE
]
```

### 7.3 原始字符串

```text
pattern::  [a-z]+
template:: {issue.id}.tpl
ipv6::     [::1]:8080

literals: [
    ok
    :: true
    :: null
    :: [::1]
]
```

### 7.4 多行字符串

```text
stripped: (
    {
      "qwe": 1
    }
)

verbatim: ((
  -----BEGIN-----
  CONTENT
  -----END-----
))
```

解析之后,`stripped` 是一段 3 行字符串

```
{
  "qwe": 1
}
```

(每一内容行共同的 4 个前导空格已被移除),而 `verbatim` 是一段 3 行
字符串

```
  -----BEGIN-----
  CONTENT
  -----END-----
```

(完全按书写原样保留)。

## 8. 合规性

**Ktav 0.1.0 conformant parser** MUST:

- C-1. 接受由 § 4 定义的每一语法有效的文档,并产生由 § 5 所定义的
  Value。
- C-2. 拒绝任何违反 §§ 4、5 或 6 规则的输入,返回能够标识错误类别
  (§ 6)、并在有意义时包含行号的错误。
- C-3. 以区分大小写的方式匹配关键字(`null`、`true`、`false`),且
  仅在 § 5.2 所定义的确切位置处进行匹配。
- C-4. 在其数据模型内,跨越 round-trip 操作(解析、再输出)保持
  Object 字段的插入顺序。(文本表示本身并不显式编码顺序 —— 顺序
  来自 pair 行的序列。)
- C-5. 对两份仅在多行字符串内容、注释与空行之外的 ASCII 空白上有所
  不同的文档,产生相同的 Value。

**Ktav 0.1.0 conformant writer**(文本生产者)MUST:

- W-1. 产生这样的输出:符合规范的解析器将其反序列化为与输入 Value
  相等的 Value。
- W-2. 对任何 String 值,若其 body 以普通方式输出时会被 § 5.2 归类
  为非-String —— 包括等于 `null`、`true`、`false`、`(`、`((`、`()`、
  `(())`,或以 `{` 或 `[` 开头的字符串 —— 则 MUST 输出原始字符串
  标记 `::`。
- W-3. 以某种能在后续解析中按字节保持其内容的形式输出多行字符串
  (verbatim 形式,或 dedent 能复现原件的 stripped 形式)。

## 9. 安全性考量

解析用户提供的 Ktav 面临文本解析器常见的问题:

- **资源耗尽**:符合规范的解析器 MAY 对嵌套复合值的深度、文档总大
  小以及单行最大长度施加限制,以防范拒绝服务攻击。这些限制(若存
  在)MUST 由实现予以文档化。
- **UTF-8 校验**:实现 MUST 拒绝非 UTF-8 的输入。MUST NOT 静默地
  替换为替代字符。
- **标识符冲突**:由于 Ktav 的键不加引号,键中的特殊字符由 § 5.3.1
  检测。实现 MUST NOT 放宽这些规则,例如允许带任意内容的加引号的
  键 —— 此类放宽会改变分隔符 `:` 的语义。

本格式在设计上不具有 include、import、reference 或 macro 等机制。
解析某个文档不会产生超出解析器对该文档自身字节观测之外的副作用。

## 10. 设计理据(非规范性)

本节记录主要选择背后的推理,以便后续版本可在完整上下文下予以重新
审视。

**为何无引号。** 引号是视觉噪声,它将简单字符串的字符数扩大到三倍。
大多数标量值(主机名、路径、数字、标识符)并不需要转义;那些需要
标记的情形,由 `::` 原始标记来处理。

**为何无逗号与缩进。** 逗号众所周知易被遗忘。显著的缩进众所周知易
数错。换行分隔一切;「每行一个字段」的代价仅是一次换行,而读者本
来也会做一次。

**为何仅小写关键字。** YAML 的大小写不敏感布尔值(`Yes`、`No`、
`True`、`False` —— 臭名昭著的「挪威问题」)是一类有据可查的 bug 来
源。将关键字严格限定为小写,彻底消除了这一类问题。

**为何采用 `::`。** 值内部的转义字符(`\n`、`\t` 等)迫使实现选择
并文档化一张完整的转义表 —— 这是一项没有尽头的义务。将转义决定放
到分隔符上(在 `:` 与 `::` 之间抉择)只是一个位的信息,并且不触碰
值的字节。

**为何以 `( ... )` 表示多行。** YAML 的 `|` / `>` 块标量指示符具有
众多修饰符(`|-`、`|+`、`>-`、`>+`、显式的缩进指示符)。Ktav 将
选择限制为两种:「stripped common indent」与「verbatim」。Verbatim
形式保证无损的 round-trip;stripped 形式服务于把带缩进的 JSON 或
代码块粘贴到配置中的常见情形。

**为何采用点分键。** 没有它们,用户会转而使用 YAML 式缩进。点分键
让每一行就地表明其完整地址 —— 「这是什么值,它属于何处?」 ——
而不需任何上下文账簿。

**为何设置类型标记,且只设两个。** 严格的 0.1.0 在 Value 层将所有
标量留作字符串,把类型化推迟到消费方。这对类型化语言(Rust +
serde、Go + marshal)的消费方效果良好,它们无需格式配合即可将
`"8080"` 转为 `u16`。但对于动态类型语言(JavaScript、PHP、Python)
的消费方,相同机制却迫使逐个字段手工转换 —— `Number(cfg.port)`、
`intval($cfg['port'])` —— 或者自备 schema 层。类型标记 `:i`
(Integer)与 `:f`(Float)正是为了弥合这一落差。

只设两个标记,是有意为之:

- **不设位宽**(`:i8`、`:u32`):PHP、Python、JavaScript 各自仅有
  一种整数类型(PHP `int` 为平台宽度;Python `int` 为任意精度;
  JavaScript `Number` 覆盖这两类)。位宽是类型化语言消费方关注
  的事,已经在那一侧由 serde / reflection 处理。
- **不设有无符号**(`:si`、`:ui`):出于相同原因。PHP、Python、
  JavaScript 均无原生的无符号整数类型。
- **不做自动检测**(`port: 8080` 悄然变为 Number):这是 JSON 走
  的路,结果悄然破坏了 `version: 1.2`(变成 Number,失去字符串
  解释)、`port: 0755`(前导零被吃掉)、以及
  `id: 99999999999999999`(JavaScript Number 精度损失)。显式
  标记 —— 仅在你想要一个数字的地方书写 —— 回避了这三类坑。
- **Value 以字符串存储。** Integer 与 Float 的 Value 类型持有的
  是文本形式,而非机器数字。这既保留了任意精度(一个 40 位整数
  可以往返存活),又让 `((` verbatim 的逐字节往返保证同样适用于
  类型值。消费方在自己的边界上做收窄。

## 11. 参考文献

- RFC 2119, *Key words for use in RFCs to Indicate Requirement
  Levels*, S. Bradner, March 1997.
- [JSON5 specification](https://json5.org/). Ktav borrows its overall
  shape from JSON5 while dropping quotes and commas.
- [TOML](https://toml.io/) and
  [YAML](https://yaml.org/) — formats whose design choices informed
  Ktav by contrast.

## 附录 A. 变更

0.1.0 版本为初始规范。0.1.0 内相对于预发布草案所作的变更如下:

- **新增**:pair 位置与 array-item 位置的类型标量标记 `:i`
  (Integer)与 `:f`(Float)。
- **新增**:Value 类型 `Integer` 与 `Float`(§ 5)。
- **新增**:错误类别 `InvalidTypedScalar`(§ 6.9)。
- **变更**:§ 4 语法与 § 5.2 标量解释以容纳新增标记;§ 5.3 Pair
  行与 § 5.4 Array-Item 行扩展出类型形式。

所有后续变更 —— 无论是跨版本还是版本内的编辑性修订 —— 均记录于
仓库层级的 [`CHANGELOG.md`](../../CHANGELOG.md) 中。
