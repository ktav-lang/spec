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
三个 `NonFiniteFloat` fixture 分别覆盖 NaN、正 Infinity 与负 Infinity。

