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

