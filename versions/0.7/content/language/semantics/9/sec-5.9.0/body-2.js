export default {
  en: `- **Object:** every pair's name is a non-empty string, and every
  pair's value is node-representable. An empty name is not
  node-representable: § 4's grammar guarantees a non-empty
  \`<bare-segment>\`, and a \`<quoted-segment>\`'s non-emptiness is
  enforced separately, by § 6.5's \`EmptyKey\` check rather than by
  § 4's grammar (a \`<quoted-segment>\` can be grammatically empty) —
  either way, no document can produce a pair with an empty key
  segment (the parse-side counterpart is the \`EmptyKey\` error,
  § 6.5).
- **Array:** every item of V is node-representable.
- **Float:** The abstract programmatic Float carrier may carry NaN,
  +Infinity, and -Infinity as distinct sentinels, but those sentinels are
  not node-representable. A Float V is node-representable only when it is
  finite — neither NaN nor ±Infinity — and belongs to the declared Ktav
  Float domain of § 5. Consequently, if V is non-zero,
  it has at least one finite decimal candidate that round-trips exactly
  under the domain's declared conversion semantics (§ 5.9.8). Positive
  and negative zero are admitted separately by § 5.9.8's zero rule. A
  wider host representation may contain a non-zero finite exact value with no such
  candidate (for example, exact-rational \`1/3\`); that value is outside the
  Ktav Float domain and is not an additional writer error case. No literal
  grammar of § 3.6 produces a non-finite Float (an overflowing literal
  falls through to String at § 5.2 rule 14), and § 5.9.8 defines no
  canonical textual form for one.
- **String:** V is node-representable under § 5.9.7's rules (no
  \`CR\` byte, and none of the pathological multi-line collision
  cases defined there).
- **Null, Bool, Integer**: always
  node-representable.

Node-representability recurses through every Object pair's value and
every Array item, at any depth, without re-imposing the root-kind
constraint: a String or Integer nested inside a representable Object
is node-representable on its own terms — it is never itself required
to be an Object or an Array. Only the outermost Value handed to a
writer is subject to the root-kind constraint.

`,
  ru: `- **Object:** имя каждой пары — непустая строка, и значение каждой
  пары узлово-представимо. Пустое имя узлово-непредставимо:
  грамматика § 4 гарантирует непустой \`<bare-segment>\`, а непустота
  \`<quoted-segment>\` обеспечивается отдельно, проверкой \`EmptyKey\`
  из § 6.5, а не грамматикой § 4 (\`<quoted-segment>\` грамматически
  может быть пустым) — в любом случае никакой документ не может
  породить пару с пустым сегментом ключа (парсинг-эквивалент —
  ошибка \`EmptyKey\`, § 6.5).
- **Array:** каждый элемент V узлово-представим.
- **Float:** Абстрактный программный Float-носитель может содержать NaN,
  +Infinity и -Infinity как различные sentinel, но такие sentinel
  узлово-непредставимы. Float V узлово-представим только если он конечен —
  ни NaN, ни ±Infinity — и принадлежит заявленному в § 5 домену Ktav
  Float. Поэтому для ненулевого V он имеет
  хотя бы один конечный десятичный кандидат, точно проходящий round-trip
  с заявленной семантикой преобразования домена (§ 5.9.8). Положительный
  и отрицательный ноль допускаются отдельно по правилу нуля § 5.9.8.
  Более широкое представление хоста может содержать ненулевое конечное точное
  значение без такого кандидата (например, точную рациональ \`1/3\`); такое
  значение находится вне домена Ktav Float и не образует дополнительного
  случая ошибки writer. Ни одна грамматика литералов § 3.6 не порождает неконечный Float
  (переполняющий литерал проваливается в String в § 5.2, правило 14), и
  § 5.9.8 не определяет канонической текстовой формы для него.
- **String:** V узлово-представимо по правилам § 5.9.7 (нет байта
  \`CR\` и ни одного из определённых там патологических случаев
  коллизий multi-line формы).
- **Null, Bool, Integer**: всегда
  узлово-представимы.

`,
  zh: `节点可表示性递归经过 Object 每对的值与 Array 的每一项,深度不限,
且**不**重新施加上述根类型约束:可表示 Object 内部的 String 或
Integer 按其自身类型节点可表示 —— 从不要求它们本身是 Object 或
Array。只有交给 writer 的最外层 Value 才受根类型约束。

writer-conforming 实现 MUST 按 § 5.9 以错误拒绝不可表示的
Value —— 且 MUST 不输出其任何部分:先输出部分内容再失败不是被
允许的行为。

可表示性有意窄于可解析性。解析永远不会产生标量根(§ 5.0.1)或
空对名(§ 4、§ 6.5),任何字面量语法也不产生非有限 Float(§ 3.6)
—— 但解析可能产生被 § 5.9.7 排除的 String,因为 \`CR\` 字节经由
inline 复合值的 \`\\r\` escape,或指称码点 000D 的通用 \`\\uXXXX\`
escape(§ 3.7、§ 3.7.1)进入 String。这样的文档被
parser-conforming 实现接受,而序列化所得 Value 则 MUST 失败 ——
这正是不可表示 Value 处于 § 8.3 round-trip 恒等式之外的原因。

`,
};
