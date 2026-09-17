>>>>> lang=en
The `value` mapping MUST be checked recursively. An empty Object key
is the witness for the `EmptyKeyName` case. A String or Object key
MUST NOT contain a lone surrogate. An unrepresentable fixture that
encodes a non-finite Float MUST use the sentinel object with exactly one
field, `{"$float": "NaN"}`, `{"$float": "Infinity"}`, or
`{"$float": "-Infinity"}`; no other shape is a valid sentinel. This
fixture-encoding sentinel is permitted only in `unrepresentable/`. The
sentinel denotes a programmatic value in the abstract Float carrier,
not a parsed Float, a canonical Float, or a node-representable Float. The
three spellings MUST remain distinct so a writer-conformance implementation
can supply and reject each one. The
rule does not reserve the key name: a parser-produced Object MAY contain
a literal `$float` key like any other key, and its `value` root MUST
be an Object or Array.
A reason code is valid for a fixture only when
its case occurs somewhere in the Value tree, except `ScalarRoot`,
which requires that the root itself is a scalar. The root MUST be an
Object or Array for every other reason code. These checks MUST NOT infer
meaning from a fixture filename. For the three collision reason codes,
segments are separated by LF; a String containing no LF has one segment.

The parser and writer obligations for `parseable-unrepresentable/` are
specified separately by § 8.1 and § 8.2.

A writer-conforming implementation's own error type MAY take any shape
(exception class, error enum, tagged union, ...) — only the code names
and the case each identifies are normative, not the API through which a
caller observes them:

>>>>> lang=ru
Отображение `value` MUST проверяться рекурсивно. Пустое имя Object
является свидетельством случая `EmptyKeyName`. String или ключ Object
MUST NOT содержать одиночный surrogate. Непредставимая фикстура,
кодирующая неконечный Float, MUST использовать sentinel-объект ровно с
одним полем: `{"$float": "NaN"}`, `{"$float": "Infinity"}` или
`{"$float": "-Infinity"}`; никакая другая форма не является
допустимым sentinel. Этот sentinel обозначает программное значение
абстрактного Float-носителя, а не Float, полученный парсингом,
канонический Float или узлово-представимый Float. Три формы MUST
оставаться различными, чтобы writer-conforming реализация могла подать и
отвергнуть каждую из них. Этот sentinel как часть кодирования фикстуры
разрешён только в `unrepresentable/`. Правило не резервирует имя
ключа: порождённый парсером Object MAY содержать буквальный ключ
`$float`, как любой другой ключ, а его корень `value` MUST быть
Object или Array.
Код причины допустим для фикстуры, только если его случай
встречается где-либо в дереве Value, кроме `ScalarRoot`, для которого
скаляром должен быть сам корень. Для каждого другого кода корень MUST
быть Object или Array. Эти проверки MUST NOT выводить смысл из имени
фикстуры. Для трёх кодов причин коллизии сегменты разделяются LF;
String без LF содержит один сегмент.

Обязанности parser и writer для `parseable-unrepresentable/` раздельно
заданы в § 8.1 и § 8.2.

Собственный тип ошибки writer-conforming реализации MAY иметь любую
форму (класс исключения, error enum, tagged union...) — нормативны
только имена кодов и обозначенные ими случаи, а не API, через который
вызывающий код их наблюдает:

>>>>> lang=zh
`value` 映射 MUST 递归检查。Object 的空键是 `EmptyKeyName` 情形的
见证。String 或 Object 键 MUST NOT 含 lone surrogate。
编码非有限 Float 的不可表示 fixture MUST 使用恰好含一个字段的
sentinel Object:`{"$float": "NaN"}`、`{"$float": "Infinity"}`
或 `{"$float": "-Infinity"}`;其他形状都不是有效 sentinel。这个
fixture 编码 sentinel 表示抽象 Float 载体中的程序化值,而不是解析所得
的 Float、规范 Float 或节点可表示的 Float。三种写法 MUST 保持彼此
不同,以便 writer-conformance 实现能够提供并拒绝每一种。该 fixture
编码 sentinel 仅允许用于 `unrepresentable/`。该规则不保留
键名:parser 产生的 Object MAY 像使用其他键一样包含字面键
`$float`,且其 `value` 根 MUST 是 Object 或 Array。
只有当该原因情形出现在 Value 树中的某处时,
原因代码才对该 fixture 有效;`ScalarRoot` 例外,它要求根本身是
标量。其他每个原因的根 MUST 是 Object 或 Array。这些检查 MUST NOT
从 fixture 文件名推导含义。对三个 collision 原因代码,segment 以 LF
分隔;不含 LF 的 String 有一个 segment。

`parseable-unrepresentable/` 的 parser 与 writer 义务分别由
§ 8.1 与 § 8.2 规定。

writer-conforming 实现自身的错误类型 MAY 采用任意形式(异常类、
error enum、tagged union 等)——规范性的只是代码名称及其标识的
情形,而非调用方借以观察到它们的 API:

