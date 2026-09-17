>>>>> lang=en
- **Object:** every pair's name is a non-empty string, and every
  pair's value is node-representable. An empty name is not
  node-representable: § 4's grammar guarantees a non-empty
  `<bare-segment>`, and a `<quoted-segment>`'s non-emptiness is
  enforced separately, by § 6.5's `EmptyKey` check rather than by
  § 4's grammar (a `<quoted-segment>` can be grammatically empty) —
  either way, no document can produce a pair with an empty key
  segment (the parse-side counterpart is the `EmptyKey` error,
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
  candidate (for example, exact-rational `1/3`); that value is outside the
  Ktav Float domain and is not an additional writer error case. No literal
  grammar of § 3.6 produces a non-finite Float (an overflowing literal
  falls through to String at § 5.2 rule 14), and § 5.9.8 defines no
  canonical textual form for one.
- **String:** V is node-representable under § 5.9.7's rules (no
  `CR` byte, and none of the pathological multi-line collision
  cases defined there).
- **Null, Bool, Integer**: always
  node-representable.

Node-representability recurses through every Object pair's value and
every Array item, at any depth, without re-imposing the root-kind
constraint: a String or Integer nested inside a representable Object
is node-representable on its own terms — it is never itself required
to be an Object or an Array. Only the outermost Value handed to a
writer is subject to the root-kind constraint.

>>>>> lang=ru
- **Object:** имя каждой пары — непустая строка, и значение каждой
  пары узлово-представимо. Пустое имя узлово-непредставимо:
  грамматика § 4 гарантирует непустой `<bare-segment>`, а непустота
  `<quoted-segment>` обеспечивается отдельно, проверкой `EmptyKey`
  из § 6.5, а не грамматикой § 4 (`<quoted-segment>` грамматически
  может быть пустым) — в любом случае никакой документ не может
  породить пару с пустым сегментом ключа (парсинг-эквивалент —
  ошибка `EmptyKey`, § 6.5).
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
  значение без такого кандидата (например, точную рациональ `1/3`); такое
  значение находится вне домена Ktav Float и не образует дополнительного
  случая ошибки writer. Ни одна грамматика литералов § 3.6 не порождает неконечный Float
  (переполняющий литерал проваливается в String в § 5.2, правило 14), и
  § 5.9.8 не определяет канонической текстовой формы для него.
- **String:** V узлово-представимо по правилам § 5.9.7 (нет байта
  `CR` и ни одного из определённых там патологических случаев
  коллизий multi-line формы).
- **Null, Bool, Integer**: всегда
  узлово-представимы.

Узловая представимость рекурсивно проходит через значение каждой
пары Object и каждый элемент Array, на любой глубине, повторно не
навязывая корневое ограничение на вид: String или Integer внутри
представимого Object узлово-представимы сами по себе — от них
никогда не требуется быть Object или Array. Корневое ограничение на
вид применяется только к самому внешнему Value, передаваемому
writer'у.

>>>>> lang=zh
- **Object:** 每对的名是非空字符串,且每对的值节点可表示。空名
  节点不可表示:§ 4 的语法保证 `<bare-segment>` 非空,而
  `<quoted-segment>` 的非空则由 § 6.5 的 `EmptyKey` 检查单独保证,
  而非由 § 4 的语法保证(`<quoted-segment>` 在语法上可以为空)——
  无论如何,任何文档都不能产生带有空键段的对(解析侧对应
  `EmptyKey` 错误,§ 6.5)。
- **Array:** V 的每一项都节点可表示。
- **Float:** 抽象的程序化 Float 载体可以携带 NaN、+Infinity 与
  -Infinity 这三个彼此不同的 sentinel,但这些 sentinel 不具备节点可
  表示性。Float V 只有在有限(既非 NaN 也非 ±Infinity)且属于 § 5
  声明的 Ktav Float 域时才节点可表示。因此对于非零 V,它至少有一个
  按该域
  声明的转换语义精确 round-trip 的有限十进制候选(§ 5.9.8)。正零
  与负零按 § 5.9.8 的零规则单独接纳。更宽的主机表示可能含有
  没有这种候选的非零有限精确值(例如精确有理数 `1/3`);该值在 Ktav
  Float 域之外,不构成额外的 writer 错误情形。§ 3.6 的任何字面量
  语法都不产生非有限 Float(溢出字面量在 § 5.2 规则 14 回退为
  String),且 § 5.9.8 未为其定义规范文本形式。
- **String:** V 按 § 5.9.7 的规则节点可表示(无 `CR` 字节,且
  不属于该节定义的病态多行碰撞情形)。
- **Null、Bool、Integer**:始终节点可表示。

节点可表示性递归经过 Object 每对的值与 Array 的每一项,深度不限,
且**不**重新施加上述根类型约束:可表示 Object 内部的 String 或
Integer 按其自身类型节点可表示 —— 从不要求它们本身是 Object 或
Array。只有交给 writer 的最外层 Value 才受根类型约束。

