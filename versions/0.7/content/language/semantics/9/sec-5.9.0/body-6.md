>>>>> lang=en
| Reason code                   | Case                                                                                          |
|--------------------------------|-------------------------------------------------------------------------------------------------|
| `ScalarRoot`                  | The document root is not an Object or an Array.                                                 |
| `EmptyKeyName`                | An Object pair's name is the empty string.                                                      |
| `NonFiniteFloat`              | A Float is NaN or ±Infinity.                                                                     |
| `CRByte`                      | A String contains a `CR` byte (§ 5.9.7).                                                         |
| `BothFormsRequired`           | A String's multi-line body needs both forms — a segment trimming to `))` and a segment trimming to `)` (§ 5.9.7). |
| `TrailingWhitespaceCollision` | A segment trims to `))` and some content line has trailing whitespace (§ 5.9.7).                 |
| `LeadingWhitespaceCollision`  | A segment trims to `))` and every non-blank segment shares leading whitespace at the same position (§ 5.9.7). |

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

The three `NonFiniteFloat` fixtures separately cover NaN, positive
Infinity, and negative Infinity.

>>>>> lang=ru
| Код причины                    | Случай                                                                                          |
|---------------------------------|---------------------------------------------------------------------------------------------------|
| `ScalarRoot`                    | Корень документа — не Object и не Array.                                                          |
| `EmptyKeyName`                  | Имя пары Object — пустая строка.                                                                   |
| `NonFiniteFloat`                | Float — NaN или ±Infinity.                                                                          |
| `CRByte`                        | String содержит байт `CR` (§ 5.9.7).                                                                |
| `BothFormsRequired`             | Multi-line тело String требует обеих форм — сегмент, обрезающийся до `))`, и сегмент, обрезающийся до `)` (§ 5.9.7). |
| `TrailingWhitespaceCollision`   | Сегмент обрезается до `))`, и на какой-то содержательной строке есть хвостовой пробел (§ 5.9.7).    |
| `LeadingWhitespaceCollision`    | Сегмент обрезается до `))`, и каждый непустой сегмент разделяет ведущий пробел на одной и той же позиции (§ 5.9.7). |

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

Три фикстуры `NonFiniteFloat` отдельно покрывают NaN, положительную
и отрицательную Infinity.

>>>>> lang=zh
| 原因代码                        | 情形                                                                                     |
|-----------------------------------|--------------------------------------------------------------------------------------------|
| `ScalarRoot`                      | 文档根既非 Object 也非 Array。                                                              |
| `EmptyKeyName`                    | Object 某对的名为空字符串。                                                                  |
| `NonFiniteFloat`                  | Float 为 NaN 或 ±Infinity。                                                                  |
| `CRByte`                          | String 含 `CR` 字节(§ 5.9.7)。                                                              |
| `BothFormsRequired`               | String 的多行体同时需要两种形式 —— 一个修剪后为 `))` 的段,以及一个修剪后为 `)` 的段(§ 5.9.7)。 |
| `TrailingWhitespaceCollision`     | 某段修剪后为 `))`,且某内容行存在尾部空白(§ 5.9.7)。                                          |
| `LeadingWhitespaceCollision`      | 某段修剪后为 `))`,且每个非空段在同一位置共享前导空白(§ 5.9.7)。                              |

当一个 Value 同时违反多种情形时,检查有先后:先评估文档根约束
(Object 或 Array),仅在其通过后才递归评估节点可表示性。若节点
可表示性随后发现多于一个适用的违反 —— 无论是在 Value 自身、
Object 对的键上,还是在后代中(例如一个 String 同时满足两条
碰撞规则,一个 Object 同时有空键和另一处
不可表示的子节点,或两个 Array 项各自因不同原因不可表示)
—— 实现 MAY 报告其中任意一个适用的原因代码:本规范不规定
具体的遍历顺序或确定性的「首个」违反;该问题属于仍未解决的
结构化错误契约(rust#12)。

三个 `NonFiniteFloat` fixture 分别覆盖 NaN、正 Infinity 与负 Infinity。

