>>>>> lang=en
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
`CR` byte enters a String through an inline-compound `\r` escape or
the generic `\uXXXX` escape naming code point 000D (§ 3.7, § 3.7.1).
Such a document is accepted by a parser-conforming
implementation, while serialising the resulting Value MUST fail —
which is why non-representable Values sit outside the round-trip
identity of § 8.3.

Each non-representability case above has a stable **reason code**,
normative regardless of how any given implementation's API surfaces
it. Every `.json` file in `versions/0.7/tests/unrepresentable/`
and `versions/0.7/tests/parseable-unrepresentable/` MUST be a JSON object
with exactly these three fields and no others:

>>>>> lang=ru
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
она может дать String, исключаемый § 5.9.7, поскольку байт `CR`
попадает в String через inline-compound escape `\r` либо через
обобщённый escape `\uXXXX`, называющий кодовую точку 000D
(§ 3.7, § 3.7.1). Такой документ принимается parser-conforming
реализацией, в то время как
сериализация полученного Value MUST завершаться сбоем — вот почему
непредставимые Value находятся вне round-trip тождества § 8.3.

У каждого из перечисленных выше случаев непредставимости есть
устойчивый **код причины** (reason code), нормативный независимо от
того, как конкретная реализация выражает его в своём API. Каждый `.json`-файл
в `versions/0.7/tests/unrepresentable/` и
`versions/0.7/tests/parseable-unrepresentable/` MUST быть JSON-объектом
ровно с тремя полями и без каких-либо других:

>>>>> lang=zh
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
`versions/0.7/tests/unrepresentable/` 与
`versions/0.7/tests/parseable-unrepresentable/` 下的每个 `.json` 文件
MUST 是恰好包含以下三个字段且不含其他字段的 JSON 对象:

