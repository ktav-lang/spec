>>>>> lang=en
- **`boundary-fixtures.json`** *(0.7+, not a fixture category)* — a
  leaf-level list of individual Object fields, inside otherwise-normal
  `valid/` fixtures, known to probe a numeric-domain boundary (spec
  § 5.2, § 8.1, § 8.2), e.g. an i64-overflow or Float-overflow
  literal, tagged with which axis it probes (`integer_range`,
  `float_range`, `float_underflow`, `float_precision`). It lives at
  the `tests/` root, not inside `valid/`, specifically so a runner
  enumerating `valid/**/*.json` as fixtures never mistakes it for one.
  Listing a leaf there doesn't say what a wider-domain implementation's
  output must be at that field — only that an implementation is exempt
  from matching it byte-for-byte, and only if it genuinely supports a
  domain wider than the minimum along that specific axis; every other
  field of the same fixture, and every fixture or field not listed,
  carries no exemption for any implementation.
- **`valid/`** — parseable documents. Each case is a
  `<name>.ktav` + `<name>.json` + `<name>.canonical.ktav` triple:
  `.ktav` is the input; `.json` is the expected parsed `Value`,
  mapped 1:1 (`Null`→`null`, `Bool`→`bool`, `String`→`string`,
  `Array`→`array`, `Object`→`object`). A JSON number token with no
  `.`, `e`, or `E` denotes Integer; one containing any of them denotes
  Float, including `-0.0`. Every other scalar stays a string and `::`
  forces a literal string. `.canonical.ktav` is the expected byte-exact
  writer output for that same `Value`. Object field order is
  significant.
- **`invalid/`** — documents a conforming parser MUST reject. Each
  case is a `<name>.ktav` + `<name>.json` pair; the `.json` names the
  expected error category in its `expected_error` field.
- **`unrepresentable/`** *(0.7+)* — `Value`s a conforming writer MUST
  refuse to serialise rather than emit lossy or partial output. These
  programmatic-only cases have one `<name>.json` each, with exactly
  `value`, `unrepresentable_reason`, and non-empty `note`; the Value
  mapping and exact `$float` sentinel shape are defined by § 5.9.0. The
  `$float` sentinel is contextual to this fixture encoding and does not
  reserve `$float` as a parser Object key name. For `NonFiniteFloat`, it
  denotes the abstract programmatic Float carrier, not a parsed or
  canonical Float, and is outside node-representability.
  Only `ScalarRoot`, `EmptyKeyName`, and `NonFiniteFloat` are allowed.
  The reason code MUST have a recursive witness and MUST NOT be inferred
  from the filename.
- **`parseable-unrepresentable/`** *(0.7+)* — parser-produced Values
  which a conforming writer MUST refuse. Each case is a
  `<name>.ktav` + `<name>.json` pair; parsing the input MUST produce the
  JSON `value`, and writing it MUST fail with the named reason code.
  Only the String reasons `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision`, and `LeadingWhitespaceCollision` are
  allowed. These are intentionally pairs, with no other files and no
  canonical-output file.
- **`strict-lossy/`** *(0.8+)* — scalars whose lexical form the lax
  entry point (`parse`/`loads`) accepts and silently canonicalises,
  but which the strict entry point (`parse_strict`/`loads_strict`)
  MUST reject with `LossyScalar`. Each case is a `<name>.ktav` +
  `<name>.json` pair; the `.json` gives both the lax parse's `lax_value`
  and the exact `body`/`canonical` the strict rejection MUST name.

>>>>> lang=ru
- **`boundary-fixtures.json`** *(0.7+, не фикстурная категория)* —
  список на уровне отдельных листов — отдельных полей `Object` внутри
  обычных фикстур `valid/` — про которые известно, что они зондируют
  границу числового домена (спека § 5.2, § 8.1, § 8.2), например
  i64-переполняющий или Float-переполняющий литерал, помеченный тем,
  какую ось он зондирует (`integer_range`, `float_range`,
  `float_underflow`, `float_precision`). Он лежит в корне `tests/`,
  а не внутри `valid/`, специально для того, чтобы runner,
  перечисляющий `valid/**/*.json` как фикстуры, никогда не принял его
  за таковую. Перечисление листа там не говорит, каким должен быть
  вывод реализации с более широким доменом в этом поле — только то,
  что реализация освобождена от побайтового совпадения с ним, и то
  лишь если она действительно поддерживает домен шире минимума вдоль
  этой конкретной оси; все остальные поля той же фикстуры, а также
  каждая не перечисленная там фикстура или поле, никакого освобождения
  ни для одной реализации не несут.
- **`valid/`** — парсящиеся документы. Каждый случай — тройка
  `<name>.ktav` + `<name>.json` + `<name>.canonical.ktav`: `.ktav` —
  вход; `.json` — ожидаемый разобранный `Value`, отображённый 1:1
  (`Null`→`null`, `Bool`→`bool`, `String`→`string`, `Array`→`array`,
  `Object`→`object`). JSON-токен числа без `.`, `e` и `E` обозначает
  Integer; токен с любым из них обозначает Float, включая `-0.0`.
  Любой другой скаляр остаётся строкой, а `::` форсит литеральную строку.
  `.canonical.ktav` — ожидаемый байт-точный вывод writer'а для того
  же `Value`. Порядок полей объекта значим.
- **`invalid/`** — документы, которые conforming-парсер MUST
  отклонить. Каждый случай — пара `<name>.ktav` + `<name>.json`;
  `.json` называет ожидаемую категорию ошибки в поле
  `expected_error`.
- **`unrepresentable/`** *(с 0.7)* — `Value`, которые
  conforming-writer MUST отказаться сериализовать вместо lossy или
  частичного вывода. Это случаи, создаваемые программно: для каждого
  есть единственный `<name>.json` ровно с полями `value`,
  `unrepresentable_reason` и непустым `note`; отображение Value и
  точная форма sentinel `$float` определены в § 5.9.0. Этот sentinel
  контекстен только этой кодировке фикстуры и не резервирует `$float` как
  имя ключа Object у парсера. Для `NonFiniteFloat` он обозначает
  абстрактный программный Float-носитель, а не Float, полученный парсингом,
  или канонический Float, и находится вне узловой представимости. Код причины MUST
  быть только `ScalarRoot`, `EmptyKeyName` или `NonFiniteFloat`,
  иметь рекурсивное свидетельство и MUST NOT выводиться из имени файла.
- **`parseable-unrepresentable/`** *(с 0.7)* — порождённые парсером
  Value, которые conforming-writer MUST отвергнуть. Каждый случай —
  пара `<name>.ktav` + `<name>.json`: парсинг MUST дать JSON `value`, а
  запись MUST завершиться отказом с указанным кодом причины. Это пары,
  допускающие только String-причины `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision` и `LeadingWhitespaceCollision`, без иных
  файлов и без canonical-output.
- **`strict-lossy/`** *(с 0.8)* — скаляры, чью лексическую форму
  нестрогая точка входа (`parse`/`loads`) принимает и молча
  канонизирует, но которую строгая точка входа
  (`parse_strict`/`loads_strict`) MUST отвергать с `LossyScalar`.
  Каждый случай — пара `<name>.ktav` + `<name>.json`; `.json` даёт и
  результат нестрогого парсинга (`lax_value`), и точные `body`/`canonical`,
  которые MUST называть строгий отказ.

>>>>> lang=zh
- **`boundary-fixtures.json`**（*0.7 起,并非 fixture 类别*）——一份
  叶级清单,列出本属正常 `valid/` fixture 内、已知会探测数值域边界的
  单个 Object 字段(spec § 5.2、§ 8.1、§ 8.2),例如 i64 溢出或 Float
  溢出的字面量,并标注它探测的轴(`integer_range`、`float_range`、
  `float_underflow`、`float_precision`)。它位于 `tests/` 根目录、
  而非 `valid/` 之内,正是为了让按 `valid/**/*.json` 枚举 fixture 的
  runner 永远不会把它误认为一个 fixture。在其中列出某个叶并不说明
  更宽域的实现在该字段处必须输出什么——只是说明实现豁免于逐字节
  匹配,且仅当它在该特定轴上确实支持宽于最小域的域;同一 fixture 的
  其他任何字段,以及未列出的任何 fixture 或字段,不对任何实现给予
  豁免。
- **`valid/`**——可解析的文档。每个用例是
  `<name>.ktav` + `<name>.json` + `<name>.canonical.ktav` 三元组：
  `.ktav` 是输入;`.json` 是期望解析出的 `Value`,按 1:1 映射
  (`Null`→`null`、`Bool`→`bool`、`String`→`string`、
  `Array`→`array`、`Object`→`object`)。不含 `.`、`e` 或 `E` 的 JSON
  数字 token 表示 Integer;含其中任一项的 token 表示 Float,包括
  `-0.0`。其余标量保持为字符串,`::` 强制字面字符串;
  `.canonical.ktav` 是该同一
  `Value` 期望的字节级精确 writer 输出。对象字段顺序是有意义的。
- **`invalid/`**——conforming 解析器 MUST 拒绝的文档。每个用例是
  `<name>.ktav` + `<name>.json` 一对;`.json` 在 `expected_error`
  字段中指明期望的错误类别。
- **`unrepresentable/`***(0.7 起)*——conforming writer MUST 拒绝
  序列化、而非输出 lossy 或部分内容的 `Value`。这些是只能编程
  构造的情形,每个用例只有一个 `<name>.json`,且恰好包含 `value`、
  `unrepresentable_reason` 与非空 `note`;Value 映射及 `$float`
  sentinel 的精确形状见 § 5.9.0。该 sentinel 仅限于此 fixture 编码的
  上下文,不会把 `$float` 保留为 parser Object 的键名。对于
  `NonFiniteFloat`,它表示抽象程序化 Float 载体,而不是解析所得或规范
  Float,并位于节点可表示性之外。原因代码 MUST
  在树中有递归见证,
  且只能是 `ScalarRoot`、`EmptyKeyName` 或 `NonFiniteFloat`,
  MUST NOT 从文件名推导。
- **`parseable-unrepresentable/`***(0.7 起)*——解析器产生、但
  conforming writer MUST 拒绝的 Value。每个用例是
  `<name>.ktav` + `<name>.json` 一对;解析输入 MUST 产生 JSON `value`,
  写出 MUST 以指定原因代码失败。只允许 String 原因 `CRByte`、
  `BothFormsRequired`、`TrailingWhitespaceCollision` 和
  `LeadingWhitespaceCollision`;这些是 pair 而非 triple,没有其他文件,
  也没有 canonical-output 文件。
- **`strict-lossy/`***(0.8 起)*——其词法形式被宽松入口
  (`parse`/`loads`)接受并悄悄规范化、但被严格入口
  (`parse_strict`/`loads_strict`)MUST 以 `LossyScalar` 拒绝的标量。
  每个用例是 `<name>.ktav` + `<name>.json` 一对;`.json` 同时给出
  宽松解析的结果(`lax_value`)与严格拒绝 MUST 指明的精确
  `body`/`canonical`。

