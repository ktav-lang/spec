export default {
  en: `The \`value\` mapping MUST be checked recursively. An empty Object key
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

`,
  ru: `Отображение \`value\` MUST проверяться рекурсивно. Пустое имя Object
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

`,
  zh: `| 原因代码                        | 情形                                                                                     |
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

`,
};
