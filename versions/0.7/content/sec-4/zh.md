
语法以半形式化记法给出,每行一条规则。终结符放在双引号中;
`<名称>` 表示非终结符;`*` 表示零个或多个,`+` 表示一个或多个,
`?` 表示可选,`|` 表示候选。在终结符内部,`\"` 表示字面双引号
字符,`\\` 表示字面反斜杠 —— 这种记法仅用于终结符自身必须包含
引号或反斜杠字节的场合(例如 quoted-segment 的分隔符,§ 4)。
`(ws)` 表示零个或多个空白码点
(§ 3.3 —— 固定的 25 码点集合,不仅是 ASCII)。

```
<document>      ::= <line>*
<line>          ::= <comment> | <blank> | <header-line> | <pair-line>
                  | <array-item-line> | <multiline-content-line>

<comment>       ::= (ws) "##" (任意字节到行尾)
<blank>         ::= (ws)

<header-line>   ::= (ws) "{" (ws) eol                ; 对象开启
                  | (ws) "}" (ws) eol                ; 对象关闭
                  | (ws) "[" (ws) eol                ; 数组开启
                  | (ws) "]" (ws) eol                ; 数组关闭
                  | (ws) ")" (ws) eol                ; 多行关闭 (stripped)
                  | (ws) "))" (ws) eol               ; 多行关闭 (verbatim)
                    最后两个候选的上下文相关性:
                    它们仅在多行字符串块处于打开状态(§ 5.6)
                    且修剪后的行与该块自身的终止符一致时
                    才成立 —— stripped 形式对应 ")",
                    verbatim 形式对应 "))"。
                    在此类块之外 —— 或在块内
                    但与该块的终止符不匹配时 ——
                    仅由 ")" 或 "))" 构成的行根本不是 <header-line>:
                    它是普通文本,按 § 5.1 读取
                    (打开块内为规则 3;其余情况为数组项 /
                    对值文本 —— § 5.2、§ 5.4),
                    与 § 6.1 的表述一致。

<pair-line>     ::= <key> ":"  <sep-end> <value-part-opt> eol    ; 默认形式,标量按 § 5.2 分发
                  | <key> "::" <sep-end> <value-part-opt> eol    ; 字面 String

<key>                ::= <segment> ( <unescaped-dot> <segment> )*
<unescaped-dot>      ::= 非由奇数个 "\\" 前导的 "."
<segment>            ::= <quoted-segment> | <bare-segment>
<bare-segment>       ::= <bare-first-token> <key-token>*
<bare-first-token>   ::= <key-escape> | <non-quote-key-char>
<key-token>          ::= <key-escape> | <key-char>
<non-quote-key-char> ::= <key-char>,但排除 "\"", "'", "`"
<key-escape>         ::= "\\" <escapable-byte>
                        | "\\" "u" <hex-digit> <hex-digit> <hex-digit> <hex-digit>
<escapable-byte>     ::= "\\" | "," | "}" | "]" | "{" | "[" | "n" | "r"
                        | "." | ":" | "\"" | "'" | "`"
<hex-digit>          ::= [0-9a-fA-F]

<quoted-segment> ::= "\"" <dq-token>* "\""       ; § 5.3.3
                  | "'" <sq-token>* "'"
                  | "`" <bt-token>* "`"
<dq-token>      ::= <key-escape> | <dq-char>
<sq-token>      ::= <key-escape> | <sq-char>
<bt-token>      ::= <key-escape> | <bt-char>
<dq-char>       ::= 任意 UTF-8 码点,但排除 ASCII 控制字节 < 0x20
                    (制表符/VT/FF 除外)、DEL (0x7F)、LF、CR、
                    "\\"(escape 前导)以及 "\""(段自身的分隔符)
<sq-char>       ::= 与 <dq-char> 相同的排除项,但排除的是 "'"
                    (自身的分隔符)而非 "\""
<bt-char>       ::= 与 <dq-char> 相同的排除项,但排除的是 "`"
                    (自身的分隔符)而非 "\""

<key-char>      ::= 任意 UTF-8 码点,但不允许:
                    ASCII 控制字节 < 0x20(§ 3.3 的空白成员除外:
                    制表符 0x09、VT 0x0B、FF 0x0C —— LF 0x0A 与
                    CR 0x0D 在下面作为行终止符单独排除,而非作为
                    控制字节),
                    DEL (0x7F),
                    行终止符 (LF 0x0A, CR 0x0D),
                    "[", "]", "{", "}", "(", ")", ":", ",",
                    "\\"(反斜杠 —— 现为 escape 前导,§ 3.7),
                    "."(点 —— 现为路径分隔符;用 "\." 表示段内的
                    字面点)
                    (注意:任意空白码点(§ 3.3)
                    允许出现在键段内 ——
                    仅修剪的边界被移除,
                    内部出现不受影响 ——
                    因此键 MAY 包含内部空白,
                    例如 "first name: alice";
                    "#" 允许;
                    仅当位于修剪行的行首时,
                    "##" 两字节序列才成为注释标记,§ 3.4;
                    引号字符 —— '"'、"'" 或 "`" ——
                    在 <bare-segment> 内任何位置
                    都是普通的、未被排除的 <key-char>,
                    唯独作为其第一个码点时例外 ——
                    那里由上面的 <bare-first-token> /
                    <non-quote-key-char> 将其排除 ——
                    此时它转而开启一个 <quoted-segment> ——
                    见 § 5.3.3 的位置规则)

                    键段修剪:
                    键段在被分类为 quoted 还是 bare
                    并按上面对应规则校验之前,
                    先被**修剪**掉前后空白
                    (§ 3.3 —— 固定的 25 码点集合,不仅是 ASCII)。
                    <bare-segment> 内部空白 verbatim 保留;
                    <quoted-segment> 的内容
                    (位于其分隔符之间)完全不被修剪,两侧皆然 ——
                    修剪只移除分隔符之外的空白(§ 5.3.3)。
                    修剪后为空的段为 EmptyKey (§ 6.5)。
                    仅在被修剪的边界处以空白码点相区别的两个键,
                    视为同一个键而发生碰撞(§ 5.5)——
                    修剪发生在重复名检查之前,而非之后。

                    键 escape 处理:
                    `<key-escape>` 规则处理与 § 3.7
                    相同的十四个 escape 序列,包括 `\uXXXX`
                    (§ 3.7.1),在 <bare-segment> 内部与
                    <quoted-segment> 内部处理方式相同。
                    反斜杠字节 `\` 是 escape 前导;
                    `\.` 产生字面点(不分割路径段);
                    `\:` 产生字面冒号(不作为对分隔符);
                    `\"`、`\'`、`` \` `` 各自产生其字面引号字符
                    (不会关闭 <quoted-segment> ——
                    只有段自身分隔符的
                    **未 escape** 出现才会关闭它,§ 5.3.3);
                    `\\` 产生字面反斜杠;
                    `\uXXXX` 产生对应的码点,
                    同样永远不会被重新视为结构性分隔符,
                    无论它解码出的是哪个码点 ——
                    上面的 `<key-char>` / `<dq-char>` /
                    `<sq-char>` / `<bt-char>` 排除项
                    仅适用于原始、未 escape 的字节;
                    解码出的 `\uXXXX` 码点
                    (包括 `U+0000` 这样的控制码点)
                    作为键内容被接受,
                    仅受 § 3.7.1 代理规则的约束。
                    键中其他 `\X` 形式为 `BadEscapeSequence`
                    错误 (§ 6.13)。

                    对分隔符为从左到右扫描到的首个**未 escape** 的
                    `:`(或 `::`),并将沿途遇到的任意
                    <quoted-segment> 的内容视为不透明:
                    扫描不会在落于某段开启分隔符与其自身
                    未 escape 的关闭分隔符之间的 `:` 处停止 ——
                    正如它已经不会在 <bare-segment> 内
                    escape 后的 `\:` 处停止一样。
                    若引号字符开启了一个段
                    (§ 5.3.3 的位置规则),而在行末之前
                    未找到匹配的未 escape 关闭分隔符,
                    扫描就会径直到达行末而始终未找到分隔符 ——
                    与完全不含 `:` 的行等价;
                    这种情况依上下文如何诊断见 § 5.3.3。
                    <bare-segment> 内 escape 后的冒号 `\:`
                    属于键段,不是分隔符。

                    点分路径分割仅在**未 escape** 的 `.` 字节处
                    进行,同样对 <quoted-segment> 不透明:
                    落在段的开启与关闭分隔符之间的 `.` 是普通
                    内容,永远不是路径分隔符,在那里也不需要
                    转义(与 <bare-segment> 相反,后者的字面点
                    需要 `\.`)。<bare-segment> 内的 `\.` 是
                    当前段内的字面点。

                    示例:
                    - `a\.b: v`     → 键 "a.b",值 "v"(平坦,无嵌套)
                    - `a\:b: v`    → 键 "a:b",值 "v"
                    - `a\:: v`     → 键 "a:",值 "v"(escape 冒号,然后是普通的 `:` 分隔符)
                    - `x.y\.z: v`  → 路径 ["x", "y.z"],值 "v"
                                     ({"x": {"y.z": "v"}})
                    - `path\\to: v` → 键 "path\to",值 "v"
                    - 以 `\u` 加 `U+002E` 的四位十六进制数字写出的
                      键段,与上面的 `\.` 解码结果相同(平坦键,
                      无嵌套)—— § 3.7.1 中「任意已识别 escape 永远
                      不会被重新视为结构性分隔符」的规则,无论字节
                      来自十四种形式中的哪一种,均一致适用
                    - `"a.b": v`    → 键 "a.b",值 "v"(平坦,无嵌套
                                       —— 与上面 `a\.b: v` 的 Value
                                       相同;§ 5.3.3)
                    - `a."b.c".d: v` → 路径 ["a", "b.c", "d"],值
                                       "v"({"a": {"b.c": {"d": "v"}}})
                                       —— 与上面 `x.y\.z: v` 相比:
                                       中间段是 quoted 而非
                                       bare-with-escape,但结果相同

<sep-end>       ::= 1*ws | &eol                    ; ≥1 个空白码点,或行末
<value-part-opt> ::= <value-start> | ""             ; value-part 可选;"" ⇒ 空 String
<value-start>   ::= "{" (ws) "}" (ws)                ; 空 inline 对象
                  | "[" (ws) "]" (ws)                ; 空 inline 数组
                  | "{" (ws) <inline-pair-list> (ws) "}" ; inline 对象 (§ 5.8)
                  | "[" (ws) <inline-item-list> (ws) "]" ; inline 数组 (§ 5.8)
                  | "{" (ws) &eol                    ; 对象开启(多行 body)
                  | "[" (ws) &eol                    ; 数组开启(多行 body)
                  | "(" (ws) &eol                    ; 多行字符串开启 (stripped)
                  | "((" (ws) &eol                   ; 多行字符串开启 (verbatim)
                  | "()" (ws)                        ; 空 inline(得到 "")
                  | "(())" (ws)                      ; 空 inline(得到 "")
                  | <scalar-body>                    ; 标量值,按 § 5.2 分发

<scalar-body>   ::= (ws) any-chars-until-eol
                    ; 修剪;按 § 5.2 解释

<array-item-line> ::= <item-literal> | <item-inline> | <item-value>
<item-literal>  ::= (ws) "::" <sep-end> <any-chars>? eol   ; raw 字符串项
<item-inline>   ::= (ws) "{" (ws) <inline-pair-list> (ws) "}" (ws) eol
                  | (ws) "[" (ws) <inline-item-list> (ws) "]" (ws) eol
                  | (ws) "{}" (ws) eol
                  | (ws) "[]" (ws) eol
<item-value>    ::= <value-start> eol

<inline-pair-list> ::= <inline-pair> ( (ws) "," (ws) <inline-pair> )* ( (ws) "," )?
<inline-pair>      ::= <key> (ws) ":"  (ws) <inline-value> (ws)
                     | <key> (ws) "::" (ws) <inline-value> (ws)

<inline-item-list> ::= <inline-value> ( (ws) "," (ws) <inline-value> )* ( (ws) "," )?

<inline-value>     ::= "{" (ws) <inline-pair-list> (ws) "}"
                     | "[" (ws) <inline-item-list> (ws) "]"
                     | "{" (ws) "}"
                     | "[" (ws) "]"
                     | <inline-scalar>
<inline-scalar>    ::= 由未 escape 的 "," / "}" / "]" 或行末终止的
                       字节序列(行末情况按 § 6.11 为错误);
                       § 3.7 的 escape 序列被处理;周围空白在分发到
                       § 5.2 前被修剪

<multiline-content-line> ::= 打开的 <multiline> 内的任意行;
                             终止符 (")" 或 "))") 关闭该块
```

关于该记法的说明:

- `(ws)` 表示零个或多个空白码点(§ 3.3 —— 固定的 25 码点集合,
  不仅是 ASCII)。
- `1*ws` 表示**一个或多个**空白码点(§ 3.3)。
- `<sep-end>` 表示「至少一个空白码点,或行末」。它用在多行
  pair 分隔符(`:`、`::`)之后。写 `key:value`(分隔符后无空白、
  无行末)在多行 pair 形式中是语法错误 —— 见 § 6.10。inline
  复合值(§ 5.8)中的对不要求 `:` / `::` 之后有空白。
- `&eol` 是零宽正向先行断言 —— 它匹配行末而不消耗它,因此行末
  仍然是行终止符。
- `<inline-value>` 的各候选按 inline 值位置上**首个非空白码点**
  从左到右检查。若该字节为 `{`,值是嵌套 inline 对象(匹配前两条
  `{`-规则之一)且 MUST 在同一行以 `}` 关闭;若该字节为 `[`,
  则是嵌套 inline 数组。任何其他首字节使值成为 `<inline-scalar>`。
  决定一次性作出,位于 inline 值位置的开头;之后 inline 标量内的
  `{` 或 `[` 字节均为字面数据(§ 5.8.5)。

