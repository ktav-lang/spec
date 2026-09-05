export default {
  en: `
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

- **Object:** every pair's name is a non-empty string, and every
  pair's value is node-representable. An empty name is not
  node-representable: § 4's grammar guarantees a non-empty
  \`<bare-segment>\`, and a \`<quoted-segment>\`'s non-emptiness is
  enforced separately, by § 6.5's \`EmptyKey\` check rather than by
  § 4's grammar (a \`<quoted-segment>\` can be grammatically empty) —
  either way, no document can produce a pair with an empty key
  segment (the parse-side counterpart is the \`EmptyKey\` error,
  § 6.5).
- **Array:** every item of V is node-representable.
- **Float:** V is finite — neither NaN nor ±Infinity — and belongs to
  the declared Ktav Float domain of § 5. Consequently, if V is non-zero,
  it has at least one finite decimal candidate that round-trips exactly
  under the domain's declared conversion semantics (§ 5.9.8). Positive
  and negative zero are admitted separately by § 5.9.8's zero rule. A
  wider host representation may contain a non-zero finite exact value with no such
  candidate (for example, exact-rational \`1/3\`); that value is outside the
  Ktav Float domain and is not an additional writer error case. No literal
  grammar of § 3.6 produces a non-finite Float (an overflowing literal
  falls through to String at § 5.2 rule 14), and § 5.9.8 defines no
  canonical textual form for one.
- **String:** V is node-representable under § 5.9.7's rules (no
  \`CR\` byte, and none of the pathological multi-line collision
  cases defined there).
- **Null, Bool, Integer**, and every other String: always
  node-representable.

Node-representability recurses through every Object pair's value and
every Array item, at any depth, without re-imposing the root-kind
constraint: a String or Integer nested inside a representable Object
is node-representable on its own terms — it is never itself required
to be an Object or an Array. Only the outermost Value handed to a
writer is subject to the root-kind constraint.

A writer-conforming implementation MUST reject a non-representable
Value with an error, per § 5.9 — and MUST do so without emitting any
part of it: partial output followed by a failure is not a permitted
behaviour.

Representability is deliberately narrower than parseability.
Parsing never yields a scalar root (§ 5.0.1) or an empty pair name
(§ 4, § 6.5), and no literal grammar yields a non-finite Float
(§ 3.6) — but it can yield a String that § 5.9.7 excludes, since a
\`CR\` byte enters a String through an inline-compound \`\\r\` escape or
the generic \`\\uXXXX\` escape naming code point 000D (§ 3.7, § 3.7.1).
Such a document is accepted by a parser-conforming
implementation, while serialising the resulting Value MUST fail —
which is why non-representable Values sit outside the round-trip
identity of § 8.3.

Each non-representability case above has a stable **reason code**,
normative regardless of how any given implementation's API surfaces
it. Every \`.json\` file in \`versions/0.7/tests/unrepresentable/\`
and \`versions/0.7/tests/parseable-unrepresentable/\` MUST be a JSON object
with exactly these three fields and no others:

`,
  ru: `
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

- **Object:** имя каждой пары — непустая строка, и значение каждой
  пары узлово-представимо. Пустое имя узлово-непредставимо:
  грамматика § 4 гарантирует непустой \`<bare-segment>\`, а непустота
  \`<quoted-segment>\` обеспечивается отдельно, проверкой \`EmptyKey\`
  из § 6.5, а не грамматикой § 4 (\`<quoted-segment>\` грамматически
  может быть пустым) — в любом случае никакой документ не может
  породить пару с пустым сегментом ключа (парсинг-эквивалент —
  ошибка \`EmptyKey\`, § 6.5).
- **Array:** каждый элемент V узлово-представим.
- **Float:** V конечен — ни NaN, ни ±Infinity — и принадлежит
  заявленному в § 5 домену Ktav Float. Поэтому для ненулевого V он имеет
  хотя бы один конечный десятичный кандидат, точно проходящий round-trip
  с заявленной семантикой преобразования домена (§ 5.9.8). Положительный
  и отрицательный ноль допускаются отдельно по правилу нуля § 5.9.8.
  Более широкое представление хоста может содержать ненулевое конечное точное
  значение без такого кандидата (например, точную рациональ \`1/3\`); такое
  значение находится вне домена Ktav Float и не образует дополнительного
  случая ошибки writer. Ни одна грамматика литералов § 3.6 не порождает неконечный Float
  (переполняющий литерал проваливается в String в § 5.2, правило 14), и
  § 5.9.8 не определяет канонической текстовой формы для него.
- **String:** V узлово-представимо по правилам § 5.9.7 (нет байта
  \`CR\` и ни одного из определённых там патологических случаев
  коллизий multi-line формы).
- **Null, Bool, Integer** и любое другое String: всегда
  узлово-представимы.

Узловая представимость рекурсивно проходит через значение каждой
пары Object и каждый элемент Array, на любой глубине, повторно не
навязывая корневое ограничение на вид: String или Integer внутри
представимого Object узлово-представимы сами по себе — от них
никогда не требуется быть Object или Array. Корневое ограничение на
вид применяется только к самому внешнему Value, передаваемому
эмиттеру.

Реализация-эмиттер MUST отклонять непредставимое Value с ошибкой,
согласно § 5.9 — и MUST делать это, не выпуская никакой его части:
частичный вывод с последующим сбоем не является разрешённым
поведением.

Представимость намеренно у́же parseability. Парсинг никогда не даёт
скалярного корня (§ 5.0.1) или пустого имени пары (§ 4, § 6.5), и
ни одна грамматика литералов не даёт неконечный Float (§ 3.6) — но
она может дать String, исключаемый § 5.9.7, поскольку байт \`CR\`
попадает в String через inline-compound escape \`\\r\` либо через
обобщённый escape \`\\uXXXX\`, называющий кодовую точку 000D
(§ 3.7, § 3.7.1). Такой документ принимается parser-conforming
реализацией, в то время как
сериализация полученного Value MUST завершаться сбоем — вот почему
непредставимые Value находятся вне round-trip тождества § 8.3.

У каждого из перечисленных выше случаев непредставимости есть
устойчивый **код причины** (reason code), нормативный независимо от
того, как конкретная реализация выражает его в своём API. Каждый \`.json\`-файл
в \`versions/0.7/tests/unrepresentable/\` и
\`versions/0.7/tests/parseable-unrepresentable/\` MUST быть JSON-объектом
ровно с тремя полями и без каких-либо других:

`,
  zh: `
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
  节点不可表示:§ 4 的语法保证 \`<bare-segment>\` 非空,而
  \`<quoted-segment>\` 的非空则由 § 6.5 的 \`EmptyKey\` 检查单独保证,
  而非由 § 4 的语法保证(\`<quoted-segment>\` 在语法上可以为空)——
  无论如何,任何文档都不能产生带有空键段的对(解析侧对应
  \`EmptyKey\` 错误,§ 6.5)。
- **Array:** V 的每一项都节点可表示。
- **Float:** V 是有限的 —— 既非 NaN 也非 ±Infinity —— 且属于
  § 5 声明的 Ktav Float 域。因此对于非零 V,它至少有一个按该域
  声明的转换语义精确 round-trip 的有限十进制候选(§ 5.9.8)。正零
  与负零按 § 5.9.8 的零规则单独接纳。更宽的主机表示可能含有
  没有这种候选的非零有限精确值(例如精确有理数 \`1/3\`);该值在 Ktav
  Float 域之外,不构成额外的 writer 错误情形。§ 3.6 的任何字面量
  语法都不产生非有限 Float(溢出字面量在 § 5.2 规则 14 回退为
  String),且 § 5.9.8 未为其定义规范文本形式。
- **String:** V 按 § 5.9.7 的规则节点可表示(无 \`CR\` 字节,且
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
—— 但解析可能产生被 § 5.9.7 排除的 String,因为 \`CR\` 字节经由
inline 复合值的 \`\\r\` escape,或指称码点 000D 的通用 \`\\uXXXX\`
escape(§ 3.7、§ 3.7.1)进入 String。这样的文档被
parser-conforming 实现接受,而序列化所得 Value 则 MUST 失败 ——
这正是不可表示 Value 处于 § 8.3 round-trip 恒等式之外的原因。

上述每种不可表示情形都有一个稳定的**原因代码**(reason code),
无论具体实现在自身 API 中如何呈现,该代码都是规范性的。
\`versions/0.7/tests/unrepresentable/\` 与
\`versions/0.7/tests/parseable-unrepresentable/\` 下的每个 \`.json\` 文件
MUST 是恰好包含以下三个字段且不含其他字段的 JSON 对象:

- \`value\`:递归有效的 Value JSON 映射。JSON Object 映射为 Object,
  数组映射为 Array,null、bool 与字符串映射为对应标量类型。普通
  JSON 数字的词法 token 不含 \`.\`、\`e\` 或 \`E\` 时映射为 Integer,
  否则映射为 Float,包括 \`-0.0\`;该数字 MUST 是有限值。
- \`unrepresentable_reason\`:下表七个原因代码之一且只能一个。
- \`note\`:非空的说明 String。

仅允许以下类别特定的文件集合与原因代码:

- \`unrepresentable/\` 每个 fixture 含一个 \`<name>.json\`,不得有
  其他文件。原因 MUST 是 \`ScalarRoot\`、\`EmptyKeyName\` 或
  \`NonFiniteFloat\`;这些 Value 只能以编程方式构造。
- \`parseable-unrepresentable/\` 每个 fixture 含一个 \`<name>.ktav\`
  和一个 \`<name>.json\`,不得有其他文件。原因 MUST 是 parser 可产生的
  String 情形 \`CRByte\`、\`BothFormsRequired\`、
  \`TrailingWhitespaceCollision\` 或 \`LeadingWhitespaceCollision\`。
  MUST NOT 存在 canonical-output 文件。

`,
};
