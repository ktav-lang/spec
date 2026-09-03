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
  node-representable: § 4 requires every key segment to contain at
  least one \`<key-token>\`, so no document can produce such a pair
  (the parse-side counterpart is the \`EmptyKey\` error, § 6.5).
- **Array:** every item of V is node-representable.
- **Float:** V is finite — neither NaN nor ±Infinity. No literal
  grammar of § 3.6 produces a non-finite Float (an overflowing
  literal falls through to String at § 5.2 rule 14), and § 5.9.8
  defines no canonical textual form for one.
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
it. \`versions/0.7/tests/unrepresentable/\` fixtures (§ 8.2) name the
expected reason code for a given Value; a writer-conforming
implementation's own error type MAY take any shape (exception class,
error enum, tagged union, ...) — only the code names and the case
each identifies are normative, not the API through which a caller
observes them:

| Reason code                   | Case                                                                                          |
|--------------------------------|-------------------------------------------------------------------------------------------------|
| \`ScalarRoot\`                  | The document root is not an Object or an Array.                                                 |
| \`EmptyKeyName\`                | An Object pair's name is the empty string.                                                      |
| \`NonFiniteFloat\`              | A Float is NaN or ±Infinity.                                                                     |
| \`CRByte\`                      | A String contains a \`CR\` byte (§ 5.9.7).                                                         |
| \`BothFormsRequired\`           | A String's multi-line body needs both forms — a segment trimming to \`))\` and a segment trimming to \`)\` (§ 5.9.7). |
| \`TrailingWhitespaceCollision\` | A segment trims to \`))\` and some content line has trailing whitespace (§ 5.9.7).                 |
| \`LeadingWhitespaceCollision\`  | A segment trims to \`))\` and every non-blank segment shares leading whitespace at the same position (§ 5.9.7). |

When a Value violates more than one case at once, the checks are
ordered: the document-root constraint (Object-or-Array) is evaluated
first, and only if it passes is node-representability checked
recursively. If node-representability then finds more than one
applicable violation — whether on the Value itself, on an Object
pair's key, or among descendants (e.g. a String satisfying two
collision rules at once, an Object with both an empty key and a
separately non-representable child, or two Array items each
non-representable for a different reason) — an implementation MAY
report any one of the applicable reason codes: this specification
does not mandate a specific traversal order or a deterministic
"first" violation — that question belongs to the still-open
structured-error contract (rust#12).

Of these, \`NonFiniteFloat\` has no fixture under the ordinary
\`<name>.json\` schema every other reason code uses: JSON, the format
that schema is written in, has no portable literal for NaN or
Infinity (implementations that accept the bare tokens \`NaN\` /
\`Infinity\` as an extension disagree on round-tripping them). To still
pin this case with a machine-checkable fixture,
\`versions/0.7/tests/unrepresentable/non_finite_float.json\` uses one
normative escape hatch inside its \`"value"\` field: a Float that would
otherwise have no JSON encoding is written as the tagged object
\`{"$float": "NaN"}\`, \`{"$float": "Infinity"}\`, or
\`{"$float": "-Infinity"}\` in place of an ordinary JSON number. The key
name \`$float\` is reserved within \`unrepresentable/\` fixture \`"value"\`
trees: an ordinary JSON Object that happens to have exactly this shape
(a single key literally named \`$float\`) can never occur there for any
other reason — no other reason code, and no fixture under \`valid/\`,
ever needs this sentinel, since every other Value § 5 defines has a
direct JSON mapping. A future \`unrepresentable/\` fixture MUST NOT use
a literal Object with a \`$float\` key for any purpose other than this
sentinel.

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
  § 4 требует, чтобы каждый сегмент ключа содержал хотя бы один
  \`<key-token>\`, поэтому никакой документ не может породить такую
  пару (парсинг-эквивалент — ошибка \`EmptyKey\`, § 6.5).
- **Array:** каждый элемент V узлово-представим.
- **Float:** V конечно — ни NaN, ни ±Infinity. Ни одна грамматика
  литералов § 3.6 не порождает неконечный Float (переполняющий
  литерал проваливается в String в § 5.2, правило 14), и § 5.9.8
  не определяет канонической текстовой формы для него.
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
того, как конкретная реализация выражает его в своём API. Фикстуры
\`versions/0.7/tests/unrepresentable/\` (§ 8.2) называют ожидаемый код
причины для данного Value; собственный тип ошибки
writer-conforming реализации MAY иметь любую форму (класс
исключения, error enum, tagged union...) — нормативны только имена
кодов и то, какой случай каждый из них обозначает, а не API, через
который вызывающий код их наблюдает:

| Код причины                    | Случай                                                                                          |
|---------------------------------|---------------------------------------------------------------------------------------------------|
| \`ScalarRoot\`                    | Корень документа — не Object и не Array.                                                          |
| \`EmptyKeyName\`                  | Имя пары Object — пустая строка.                                                                   |
| \`NonFiniteFloat\`                | Float — NaN или ±Infinity.                                                                          |
| \`CRByte\`                        | String содержит байт \`CR\` (§ 5.9.7).                                                                |
| \`BothFormsRequired\`             | Multi-line тело String требует обеих форм — сегмент, обрезающийся до \`))\`, и сегмент, обрезающийся до \`)\` (§ 5.9.7). |
| \`TrailingWhitespaceCollision\`   | Сегмент обрезается до \`))\`, и на какой-то содержательной строке есть хвостовой пробел (§ 5.9.7).    |
| \`LeadingWhitespaceCollision\`    | Сегмент обрезается до \`))\`, и каждый непустой сегмент разделяет ведущий пробел на одной и той же позиции (§ 5.9.7). |

Когда Value нарушает сразу несколько случаев, проверки упорядочены:
сначала проверяется корневое ограничение на вид (Object или Array),
и только если оно выполнено, рекурсивно проверяется узловая
представимость. Если узловая представимость затем обнаруживает
более одного применимого нарушения — на самом Value, на ключе пары
Object или среди потомков (например, String, удовлетворяющий сразу
двум правилам коллизий; Object одновременно с пустым ключом и
отдельно непредставимым потомком; или два элемента Array, каждый
непредставим по своей причине), — реализация MAY сообщить о любом
одном из применимых кодов причины: настоящая спецификация не
предписывает конкретный порядок обхода или детерминированное
«первое» нарушение — этот вопрос относится к всё ещё открытому
контракту структурированных ошибок (rust#12).

Из них у \`NonFiniteFloat\` фикстуры нет при обычной схеме
\`<name>.json\`, которую использует любой другой код причины: у JSON
— формата, в котором написана эта схема, — нет портируемого
литерала для NaN или Infinity (реализации, принимающие голые токены
\`NaN\` / \`Infinity\` как расширение, расходятся в их round-trip'е).
Чтобы всё же закрепить этот случай машинопроверяемой фикстурой,
\`versions/0.7/tests/unrepresentable/non_finite_float.json\`
использует один нормативный обходной путь внутри своего поля
\`"value"\`: Float, который иначе не имел бы кодирования в JSON,
записывается как tagged-объект \`{"$float": "NaN"}\`,
\`{"$float": "Infinity"}\` или \`{"$float": "-Infinity"}\` вместо
обычного JSON-числа. Имя ключа \`$float\` зарезервировано внутри
деревьев \`"value"\` фикстур \`unrepresentable/\`: обычный JSON-объект,
случайно имеющий ровно такую форму (единственный ключ, буквально
названный \`$float\`), не может встретиться там по какой-либо иной
причине — никакой другой код причины и никакая фикстура под
\`valid/\` в этом сентинеле никогда не нуждаются, поскольку каждый
прочий Value, определяемый § 5, имеет прямое отображение в JSON.
Будущая фикстура \`unrepresentable/\` MUST NOT использовать
литеральный объект с ключом \`$float\` ни для какой иной цели, кроме
этого сентинела.

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
  节点不可表示:§ 4 要求每个键段至少含一个 \`<key-token>\`,因此
  任何文档都不能产生这样的对(解析侧对应 \`EmptyKey\` 错误,
  § 6.5)。
- **Array:** V 的每一项都节点可表示。
- **Float:** V 是有限的 —— 既非 NaN 也非 ±Infinity。§ 3.6 的任何
  字面量语法都不产生非有限 Float(溢出字面量在 § 5.2 规则 14
  回退为 String),且 § 5.9.8 未为其定义规范文本形式。
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
\`versions/0.7/tests/unrepresentable/\` 下的 fixture(§ 8.2)为给定
Value 指明期望的原因代码;writer-conforming 实现自身的错误类型
MAY 采用任意形式(异常类、error enum、tagged union 等)——
规范性的只是代码名称及其各自标识的情形,而非调用方借以观察到
它们的 API:

| 原因代码                        | 情形                                                                                     |
|-----------------------------------|--------------------------------------------------------------------------------------------|
| \`ScalarRoot\`                      | 文档根既非 Object 也非 Array。                                                              |
| \`EmptyKeyName\`                    | Object 某对的名为空字符串。                                                                  |
| \`NonFiniteFloat\`                  | Float 为 NaN 或 ±Infinity。                                                                  |
| \`CRByte\`                          | String 含 \`CR\` 字节(§ 5.9.7)。                                                              |
| \`BothFormsRequired\`               | String 的多行体同时需要两种形式 —— 一个修剪后为 \`))\` 的段,以及一个修剪后为 \`)\` 的段(§ 5.9.7)。 |
| \`TrailingWhitespaceCollision\`     | 某段修剪后为 \`))\`,且某内容行存在尾部空白(§ 5.9.7)。                                          |
| \`LeadingWhitespaceCollision\`      | 某段修剪后为 \`))\`,且每个非空段在同一位置共享前导空白(§ 5.9.7)。                              |

当一个 Value 同时违反多种情形时,检查有先后:先评估文档根约束
(Object 或 Array),仅在其通过后才递归评估节点可表示性。若节点
可表示性随后发现多于一个适用的违反 —— 无论是在 Value 自身、
Object 对的键上,还是在后代中(例如一个 String 同时满足两条
冲突规则,一个 Object 同时有空键和另一处
不可表示的子节点,或两个 Array 项各自因不同原因不可表示)
—— 实现 MAY 报告其中任意一个适用的原因代码:本规范不规定
具体的遍历顺序或确定性的「首个」违反;该问题属于仍未解决的
结构化错误契约(rust#12)。

其中 \`NonFiniteFloat\` 在其余原因代码共用的普通 \`<name>.json\`
schema 下没有对应 fixture:作为该 schema 书写格式的 JSON 本身
没有可移植的 NaN 或 Infinity 字面量(接受裸 \`NaN\` /
\`Infinity\` 标记作为扩展的实现,对其 round-trip 行为也不一致)。
为了仍以可机检的 fixture 固定此情形,
\`versions/0.7/tests/unrepresentable/non_finite_float.json\` 在其
\`"value"\` 字段内使用一个规范性的逃生通道:一个原本没有 JSON
编码的 Float,以带标签的对象 \`{"$float": "NaN"}\`、
\`{"$float": "Infinity"}\` 或 \`{"$float": "-Infinity"}\` 的形式
替代普通 JSON 数字写出。键名 \`$float\` 在 \`unrepresentable/\`
fixture 的 \`"value"\` 树内被保留:一个恰好具有此形状(单个键字面名
为 \`$float\`)的普通 JSON Object 不可能因任何其他原因出现在那里
—— 没有其他原因代码,也没有 \`valid/\` 下的任何 fixture 需要此
哨兵,因为 § 5 定义的每个其他 Value 都有直接的 JSON 映射。未来的
\`unrepresentable/\` fixture MUST NOT 将带 \`$float\` 键的字面
Object 用于此哨兵之外的任何用途。

`,
};
