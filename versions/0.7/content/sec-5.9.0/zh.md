
§ 5 的 Value 模型宽于存在规范 Ktav 序列化的 Value 集合:在解析器
之外以编程方式构造的 Value 可能落在其外。Value V 为**可表示**
(representable)—— § 5.9 规范序列化契约所要求的性质 —— 当且仅当
以下两条同时成立:

- V 是 Object 或 Array。裸标量根不可表示:§ 5.0.1 由首条内容行
  判定根类型,而任何标量都没有可充当文档根的规范形式。
- V 为**节点可表示**(node-representable)。

**节点可表示性**(node-representability)是按 Value 类型递归的
检查,适用于每个处于非根位置的 Value(Object 某对的值、Array
的某项)。Value 为**节点可表示**,当且仅当按其类型:

- **Object:** 每对的名是非空字符串,且每对的值节点可表示。空名
  节点不可表示:§ 4 要求每个键段至少含一个 `<key-token>`,因此
  任何文档都不能产生这样的对(解析侧对应 `EmptyKey` 错误,
  § 6.5)。
- **Array:** V 的每一项都节点可表示。
- **Float:** V 是有限的 —— 既非 NaN 也非 ±Infinity。§ 3.6 的任何
  字面量语法都不产生非有限 Float(溢出字面量在 § 5.2 规则 14
  回退为 String),且 § 5.9.8 未为其定义规范文本形式。
- **String:** V 按 § 5.9.7 的规则节点可表示(无 `CR` 字节,且
  不属于该节定义的病态多行碰撞情形)。
- **Null、Bool、Integer** 及所有其他 String:始终节点可表示。

节点可表示性递归经过 Object 每对的值与 Array 的每一项,深度不限,
且**不**重新施加上述根类型约束:可表示 Object 内部的 String 或
Integer 按其自身类型节点可表示 —— 从不要求它们本身是 Object 或
Array。只有交给 writer 的最外层 Value 才受根类型约束。

writer-conforming 实现 MUST 按 § 5.9 以错误拒绝不可表示的
Value —— 且 MUST 不输出其任何部分:先输出部分内容再失败不是被
允许的行为。

可表示性有意窄于可解析性。解析永远不会产生标量根(§ 5.0.1)或
空对名(§ 4、§ 6.5),任何字面量语法也不产生非有限 Float(§ 3.6)
—— 但解析可能产生被 § 5.9.7 排除的 String,因为 `CR` 字节经由
inline 复合值的 `\r` escape,或指称码点 000D 的通用 `\uXXXX`
escape(§ 3.7、§ 3.7.1)进入 String。这样的文档被
parser-conforming 实现接受,而序列化所得 Value 则 MUST 失败 ——
这正是不可表示 Value 处于 § 8.3 round-trip 恒等式之外的原因。

上述每种不可表示情形都有一个稳定的**原因代码**(reason code),
无论具体实现在自身 API 中如何呈现,该代码都是规范性的。
`versions/0.7/tests/unrepresentable/` 下的 fixture(§ 8.2)为给定
Value 指明期望的原因代码;writer-conforming 实现自身的错误类型
MAY 采用任意形式(异常类、error enum、tagged union 等)——
规范性的只是代码名称及其各自标识的情形,而非调用方借以观察到
它们的 API:

| 原因代码                        | 情形                                                                                     |
|-----------------------------------|--------------------------------------------------------------------------------------------|
| `ScalarRoot`                      | 文档根既非 Object 也非 Array。                                                              |
| `EmptyKeyName`                    | Object 某对的名为空字符串。                                                                  |
| `NonFiniteFloat`                  | Float 为 NaN 或 ±Infinity。                                                                  |
| `CRByte`                          | String 含 `CR` 字节(§ 5.9.7)。                                                              |
| `BothFormsRequired`               | String 的多行体同时需要两种形式 —— 一个修剪后为 `))` 的段,以及一个修剪后为 `)` 的段(§ 5.9.7)。 |
| `TrailingWhitespaceCollision`     | 某段修剪后为 `))`,且某内容行存在尾部空白(§ 5.9.7)。                                          |
| `LeadingWhitespaceCollision`      | 某段修剪后为 `))`,且每个非空段在同一位置共享前导空白(§ 5.9.7)。                              |

当一个 Value 同时违反多种情形时,检查有先后:先评估文档根约束
(Object 或 Array),仅在其通过后才递归评估节点可表示性。若节点
可表示性随后发现多于一个适用的违反 —— 无论是在 Value 自身、
Object 对的键上,还是在后代中(例如一个 String 同时满足两条
冲突规则,一个 Object 同时有空键和另一处
不可表示的子节点,或两个 Array 项各自因不同原因不可表示)
—— 实现 MAY 报告其中任意一个适用的原因代码:本规范不规定
具体的遍历顺序或确定性的「首个」违反;该问题属于仍未解决的
结构化错误契约(rust#12)。

其中 `NonFiniteFloat` 在其余原因代码共用的普通 `<name>.json`
schema 下没有对应 fixture:作为该 schema 书写格式的 JSON 本身
没有可移植的 NaN 或 Infinity 字面量(接受裸 `NaN` /
`Infinity` 标记作为扩展的实现,对其 round-trip 行为也不一致)。
为了仍以可机检的 fixture 固定此情形,
`versions/0.7/tests/unrepresentable/non_finite_float.json` 在其
`"value"` 字段内使用一个规范性的逃生通道:一个原本没有 JSON
编码的 Float,以带标签的对象 `{"$float": "NaN"}`、
`{"$float": "Infinity"}` 或 `{"$float": "-Infinity"}` 的形式
替代普通 JSON 数字写出。键名 `$float` 在 `unrepresentable/`
fixture 的 `"value"` 树内被保留:一个恰好具有此形状(单个键字面名
为 `$float`)的普通 JSON Object 不可能因任何其他原因出现在那里
—— 没有其他原因代码,也没有 `valid/` 下的任何 fixture 需要此
哨兵,因为 § 5 定义的每个其他 Value 都有直接的 JSON 映射。未来的
`unrepresentable/` fixture MUST NOT 将带 `$float` 键的字面
Object 用于此哨兵之外的任何用途。

