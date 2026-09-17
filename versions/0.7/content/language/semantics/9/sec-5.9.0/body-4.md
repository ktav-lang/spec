>>>>> lang=en
- `value`: a recursively valid JSON mapping of the Value. JSON objects
  map to Objects and arrays to Arrays; JSON null, booleans, and strings
  map to the corresponding scalar kinds. An ordinary JSON number maps
  to Integer when its lexical token contains none of `.`, `e`, or
  `E`, and to Float otherwise, including `-0.0`; it MUST be finite.
- `unrepresentable_reason`: exactly one of the seven reason codes in
  the table below.
- `note`: a non-empty explanatory String.

Only the following category-specific file sets and reason codes are allowed:

- `unrepresentable/` contains one `<name>.json` per fixture and no
  other files. Its reason MUST be `ScalarRoot`, `EmptyKeyName`, or
  `NonFiniteFloat`; these Values are programmatic-only.
- `parseable-unrepresentable/` contains one `<name>.ktav` plus one
  `<name>.json` per fixture and no other files. Its reason MUST be one
  of the parser-producible String cases `CRByte`, `BothFormsRequired`,
  `TrailingWhitespaceCollision`, or `LeadingWhitespaceCollision`.
  A canonical-output file MUST NOT be present.

>>>>> lang=ru
- `value`: рекурсивное JSON-отображение Value. JSON-объекты отображаются
  в Object, массивы — в Array, а null, bool и строки — в соответствующие
  скалярные виды. Обычное JSON-число отображается в Integer, если его
  лексический токен не содержит `.`, `e` или `E`, и во Float
  в противном случае, включая `-0.0`; оно MUST быть конечным.
- `unrepresentable_reason`: ровно один из семи кодов причины ниже.
- `note`: непустая поясняющая String.

Допустимы только следующие наборы файлов и коды причин для категорий:

- `unrepresentable/` содержит один `<name>.json` на фикстуру и никаких
  других файлов. Причина MUST быть `ScalarRoot`, `EmptyKeyName` или
  `NonFiniteFloat`; эти Values создаются только программно.
- `parseable-unrepresentable/` содержит один `<name>.ktav` и один
  `<name>.json` на фикстуру и никаких других файлов. Причина MUST быть
  одним из порождаемых парсером String-случаев: `CRByte`,
  `BothFormsRequired`, `TrailingWhitespaceCollision` или
  `LeadingWhitespaceCollision`. Canonical-output файл MUST NOT
  присутствовать.

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

