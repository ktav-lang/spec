export default {
  en: `- \`value\`: a recursively valid JSON mapping of the Value. JSON objects
  map to Objects and arrays to Arrays; JSON null, booleans, and strings
  map to the corresponding scalar kinds. An ordinary JSON number maps
  to Integer when its lexical token contains none of \`.\`, \`e\`, or
  \`E\`, and to Float otherwise, including \`-0.0\`; it MUST be finite.
- \`unrepresentable_reason\`: exactly one of the seven reason codes in
  the table below.
- \`note\`: a non-empty explanatory String.

Only the following category-specific file sets and reason codes are allowed:

- \`unrepresentable/\` contains one \`<name>.json\` per fixture and no
  other files. Its reason MUST be \`ScalarRoot\`, \`EmptyKeyName\`, or
  \`NonFiniteFloat\`; these Values are programmatic-only.
- \`parseable-unrepresentable/\` contains one \`<name>.ktav\` plus one
  \`<name>.json\` per fixture and no other files. Its reason MUST be one
  of the parser-producible String cases \`CRByte\`, \`BothFormsRequired\`,
  \`TrailingWhitespaceCollision\`, or \`LeadingWhitespaceCollision\`.
  A canonical-output file MUST NOT be present.

The \`value\` mapping MUST be checked recursively. An empty Object key
is the witness for the \`EmptyKeyName\` case. A String or Object key
MUST NOT contain a lone surrogate. An unrepresentable fixture that
encodes a non-finite Float MUST use the sentinel object with exactly one
field, \`{"$float": "NaN"}\`, \`{"$float": "Infinity"}\`, or
\`{"$float": "-Infinity"}\`; no other shape is a valid sentinel. This
fixture-encoding sentinel is permitted only in \`unrepresentable/\`. The
sentinel denotes a programmatic value in the abstract Float carrier,
not a parsed Float, a canonical Float, or a node-representable Float. The
three spellings MUST remain distinct so a writer-conformance implementation
can supply and reject each one. The
rule does not reserve the key name: a parser-produced Object MAY contain
a literal \`$float\` key like any other key, and its \`value\` root MUST
be an Object or Array.
A reason code is valid for a fixture only when
its case occurs somewhere in the Value tree, except \`ScalarRoot\`,
which requires that the root itself is a scalar. The root MUST be an
Object or Array for every other reason code. These checks MUST NOT infer
meaning from a fixture filename. For the three collision reason codes,
segments are separated by LF; a String containing no LF has one segment.

The parser and writer obligations for \`parseable-unrepresentable/\` are
specified separately by § 8.1 and § 8.2.

A writer-conforming implementation's own error type MAY take any shape
(exception class, error enum, tagged union, ...) — only the code names
and the case each identifies are normative, not the API through which a
caller observes them:

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

The three \`NonFiniteFloat\` fixtures separately cover NaN, positive
Infinity, and negative Infinity.

`,
  ru: `- \`value\`: рекурсивное JSON-отображение Value. JSON-объекты отображаются
  в Object, массивы — в Array, а null, bool и строки — в соответствующие
  скалярные виды. Обычное JSON-число отображается в Integer, если его
  лексический токен не содержит \`.\`, \`e\` или \`E\`, и во Float
  в противном случае, включая \`-0.0\`; оно MUST быть конечным.
- \`unrepresentable_reason\`: ровно один из семи кодов причины ниже.
- \`note\`: непустая поясняющая String.

Допустимы только следующие наборы файлов и коды причин для категорий:

- \`unrepresentable/\` содержит один \`<name>.json\` на фикстуру и никаких
  других файлов. Причина MUST быть \`ScalarRoot\`, \`EmptyKeyName\` или
  \`NonFiniteFloat\`; эти Values создаются только программно.
- \`parseable-unrepresentable/\` содержит один \`<name>.ktav\` и один
  \`<name>.json\` на фикстуру и никаких других файлов. Причина MUST быть
  одним из порождаемых парсером String-случаев: \`CRByte\`,
  \`BothFormsRequired\`, \`TrailingWhitespaceCollision\` или
  \`LeadingWhitespaceCollision\`. Canonical-output файл MUST NOT
  присутствовать.

Отображение \`value\` MUST проверяться рекурсивно. Пустое имя Object
является свидетельством случая \`EmptyKeyName\`. String или ключ Object
MUST NOT содержать одиночный surrogate. Непредставимая фикстура,
кодирующая неконечный Float, MUST использовать sentinel-объект ровно с
одним полем: \`{"$float": "NaN"}\`, \`{"$float": "Infinity"}\` или
\`{"$float": "-Infinity"}\`; никакая другая форма не является
допустимым sentinel. Этот sentinel обозначает программное значение
абстрактного Float-носителя, а не Float, полученный парсингом,
канонический Float или узлово-представимый Float. Три формы MUST
оставаться различными, чтобы writer-conforming реализация могла подать и
отвергнуть каждую из них. Этот sentinel как часть кодирования фикстуры
разрешён только в \`unrepresentable/\`. Правило не резервирует имя
ключа: порождённый парсером Object MAY содержать буквальный ключ
\`$float\`, как любой другой ключ, а его корень \`value\` MUST быть
Object или Array.
Код причины допустим только если его случай
встречается где-либо в дереве Value, кроме \`ScalarRoot\`, для которого
скаляром должен быть сам корень. Для каждого другого кода корень MUST
быть Object или Array. Эти проверки MUST NOT выводить смысл из имени
фикстуры. Для трёх кодов причин коллизии сегменты разделяются LF;
String без LF содержит один сегмент.

Обязанности parser и writer для \`parseable-unrepresentable/\` раздельно
заданы в § 8.1 и § 8.2.

Собственный тип ошибки writer-conforming реализации MAY иметь любую
форму (класс исключения, error enum, tagged union...) — нормативны
только имена кодов и обозначенные ими случаи, а не API, через который
вызывающий код их наблюдает:

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

Три фикстуры \`NonFiniteFloat\` отдельно покрывают NaN, положительную
и отрицательную Infinity.

`,
  zh: `\`value\` 映射 MUST 递归检查。Object 的空键是 \`EmptyKeyName\` 情形的
见证。String 或 Object 键 MUST NOT 含 lone surrogate。
编码非有限 Float 的不可表示 fixture MUST 使用恰好含一个字段的
sentinel Object:\`{"$float": "NaN"}\`、\`{"$float": "Infinity"}\`
或 \`{"$float": "-Infinity"}\`;其他形状都不是有效 sentinel。这个
fixture 编码 sentinel 表示抽象 Float 载体中的程序化值,而不是解析所得
的 Float、规范 Float 或节点可表示的 Float。三种写法 MUST 保持彼此
不同,以便 writer-conformance 实现能够提供并拒绝每一种。该 fixture
编码 sentinel 仅允许用于 \`unrepresentable/\`。该规则不保留
键名:parser 产生的 Object MAY 像使用其他键一样包含字面键
\`$float\`,且其 \`value\` 根 MUST 是 Object 或 Array。
只有当该原因情形出现在 Value 树中的某处时,
原因代码才对该 fixture 有效;\`ScalarRoot\` 例外,它要求根本身是
标量。其他每个原因的根 MUST 是 Object 或 Array。这些检查 MUST NOT
从 fixture 文件名推导含义。对三个 collision 原因代码,segment 以 LF
分隔;不含 LF 的 String 有一个 segment。

\`parseable-unrepresentable/\` 的 parser 与 writer 义务分别由
§ 8.1 与 § 8.2 规定。

writer-conforming 实现自身的错误类型 MAY 采用任意形式(异常类、
error enum、tagged union 等)——规范性的只是代码名称及其标识的
情形,而非调用方借以观察到它们的 API:

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

三个 \`NonFiniteFloat\` fixture 分别覆盖 NaN、正 Infinity 与负 Infinity。

`,
};
