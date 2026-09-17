>>>>> lang=en

The Value model of § 5 is broader than the set of Values for which a
canonical Ktav serialisation exists: a Value constructed
programmatically, outside the parser, may fall outside it. A Value V
is **representable** — the property § 5.9's canonical-serialisation
contract requires — if and only if both of the following hold:

- V is an Object or an Array. A bare scalar root is not
  representable: § 5.0.1 establishes the root kind from the first
  content line, and no scalar has a canonical form that could serve
  as a document root.
- V is **node-representable**.

**Node-representability** — the recursive, per-kind check applied to
every Value in a non-root position (an Object pair's value, an
Array's item). A Value is **node-representable** if and only if, by
kind:

>>>>> lang=ru

Модель Value из § 5 шире множества Values, для которых существует
каноническая Ktav-сериализация: Value, сконструированное
программно, вне парсера, может оказаться вне его. Value V является
**представимым** (representable) — свойство, которого требует
контракт канонической сериализации § 5.9, — тогда и только тогда,
когда выполнены оба условия:

- V — Object или Array. Голый скалярный корень непредставим:
  § 5.0.1 устанавливает вид корня по первой содержательной строке,
  и ни у одного скаляра нет канонической формы, которая могла бы
  служить корнем документа.
- V **узлово-представимо** (node-representable).

**Узловая представимость** (node-representability) — рекурсивная
проверка по виду Value, применяемая к каждому Value в некорневой
позиции (значению пары Object или элементу Array). Value является
**узлово-представимым** тогда и только тогда, когда по его виду:

>>>>> lang=zh

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
  节点不可表示:§ 4 的语法保证 `<bare-segment>` 非空,而
  `<quoted-segment>` 的非空则由 § 6.5 的 `EmptyKey` 检查单独保证,
  而非由 § 4 的语法保证(`<quoted-segment>` 在语法上可以为空)——
  无论如何,任何文档都不能产生带有空键段的对(解析侧对应
  `EmptyKey` 错误,§ 6.5)。
- **Array:** V 的每一项都节点可表示。
- **Float:** 抽象的程序化 Float 载体可以携带 NaN、+Infinity 与
  -Infinity 这三个彼此不同的 sentinel,但这些 sentinel 不具备节点可
  表示性。Float V 只有在有限(既非 NaN 也非 ±Infinity)且属于 § 5
  声明的 Ktav Float 域时才节点可表示。因此对于非零 V,它至少有一个
  按该域
  声明的转换语义精确 round-trip 的有限十进制候选(§ 5.9.8)。正零
  与负零按 § 5.9.8 的零规则单独接纳。更宽的主机表示可能含有
  没有这种候选的非零有限精确值(例如精确有理数 `1/3`);该值在 Ktav
  Float 域之外,不构成额外的 writer 错误情形。§ 3.6 的任何字面量
  语法都不产生非有限 Float(溢出字面量在 § 5.2 规则 14 回退为
  String),且 § 5.9.8 未为其定义规范文本形式。
- **String:** V 按 § 5.9.7 的规则节点可表示(无 `CR` 字节,且
  不属于该节定义的病态多行碰撞情形)。
- **Null、Bool、Integer**:始终节点可表示。

