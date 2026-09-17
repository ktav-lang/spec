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
- `value`: рекурсивно валидное JSON-отображение Value. JSON-объекты
  отображаются в Object, массивы — в Array, а null, bool и строки — в
  соответствующие скалярные виды. Обычное JSON-число отображается в
  Integer, если его лексический токен не содержит `.`, `e` или `E`, и во
  Float в противном случае, включая `-0.0`; оно MUST быть конечным.
- `unrepresentable_reason`: ровно один из семи кодов причины
  в таблице ниже.
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

