>>>>> lang=en
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
上述每种不可表示情形都有一个稳定的**原因代码**(reason code),
无论具体实现在自身 API 中如何呈现,该代码都是规范性的。
`versions/0.7/tests/unrepresentable/` 与
`versions/0.7/tests/parseable-unrepresentable/` 下的每个 `.json` 文件
MUST 是恰好包含以下三个字段且不含其他字段的 JSON 对象:

- `value`:递归有效的 Value JSON 映射。JSON Object 映射为 Object,
  数组映射为 Array,null、bool 与字符串映射为对应标量类型。普通
  JSON 数字的词法 token 不含 `.`、`e` 或 `E` 时映射为 Integer,
  否则映射为 Float,包括 `-0.0`;该数字 MUST 是有限值。
- `unrepresentable_reason`:下表七个原因代码之一且只能一个。
- `note`:非空的说明 String。

仅允许以下类别特定的文件集合与原因代码:

- `unrepresentable/` 每个 fixture 含一个 `<name>.json`,不得有
  其他文件。原因 MUST 是 `ScalarRoot`、`EmptyKeyName` 或
  `NonFiniteFloat`;这些 Value 只能以编程方式构造。
- `parseable-unrepresentable/` 每个 fixture 含一个 `<name>.ktav`
  和一个 `<name>.json`,不得有其他文件。原因 MUST 是 parser 可产生的
  String 情形 `CRByte`、`BothFormsRequired`、
  `TrailingWhitespaceCollision` 或 `LeadingWhitespaceCollision`。
  MUST NOT 存在 canonical-output 文件。

