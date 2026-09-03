export default {
  en: `
A parser-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement in this
  document that pertains to parsing.
- Accepts every fixture under \`versions/0.7/tests/valid/\` and
  produces a Value equivalent to the corresponding \`name.json\`
  oracle. That equivalence is defined at the minimum-required
  numeric domain of § 5 (i64 Integer, binary64 Float).
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  lists the individual Object fields (leaves) known to probe a
  numeric-domain boundary (§ 5.2) — not whole fixtures: a fixture MAY
  mix boundary-dependent leaves with ordinary ones (e.g.
  \`big_overflow_to_string\`'s \`tiny\` field is an ordinary \`Integer(1)\`
  in every conforming domain, while its \`big\` / \`bigger\` fields are
  not), and only a listed leaf is exempt — every other field of that
  same fixture MUST still match exactly. Each entry names a
  \`boundary_class\`: \`integer_range\` (exceeds the mandatory i64 range),
  \`float_range\` (overflows to non-finite on binary64),
  \`float_underflow\` (underflows to zero on binary64), or
  \`float_precision\` (binary64 rounds or shortens the value where a
  higher-precision domain would not). An implementation is exempt from
  matching a listed leaf's value only if it genuinely supports a
  domain wider than the minimum *along that leaf's specific
  \`boundary_class\`* — a BigInt-but-plain-binary64 implementation is
  exempt on \`integer_range\` leaves but not on any \`float_*\` leaf, and
  a wide-Float-but-plain-i64 implementation is exempt the other way
  around; supporting one axis does not exempt an implementation on the
  other. For an exempt leaf, this corpus does not pin what its Value
  must be — § 5.2 already states the general rule (same domain ⇒ same
  kind, differing domain ⇒ MAY differ at the crossed boundary), and
  that Value is what the implementation's own correct application of
  § 5's rules 13–14 to the leaf's body produces. Every field not
  listed in \`boundary-fixtures.json\`, in every fixture, carries no
  exemption for any implementation of any domain.
- Rejects every fixture under \`versions/0.7/tests/invalid/\` with
  the error category named in \`name.json["expected_error"]\`.

`,
  ru: `
Parser-conforming реализация:

- Удовлетворяет каждому нормативному MUST / MUST NOT в этом
  документе, относящемуся к парсингу.
- Принимает каждую фикстуру из \`versions/0.7/tests/valid/\` и даёт
  Value, эквивалентное соответствующему \`name.json\` оракулу. Эта
  эквивалентность определяется на минимально требуемом числовом
  домене § 5 (Integer i64, Float binary64).
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  перечисляет отдельные поля Object (листья), известные как
  boundary-probing — зондирующие границу числового домена (§ 5.2), —
  а не целые фикстуры: фикстура MAY смешивать зависящие от границы
  листья с обычными (например, поле \`tiny\` у \`big_overflow_to_string\`
  — обычный \`Integer(1)\` в каждом конформном домене, тогда как его
  поля \`big\` / \`bigger\` — нет), и освобождён только перечисленный
  лист — каждое прочее поле той же фикстуры MUST по-прежнему
  совпадать в точности. Каждая запись называет \`boundary_class\`:
  \`integer_range\` (превышает обязательный диапазон i64),
  \`float_range\` (переполняется до не-конечного на binary64),
  \`float_underflow\` (уходит в underflow до нуля на binary64) или
  \`float_precision\` (binary64 округляет или укорачивает значение там,
  где домен более высокой точности — нет). Реализация освобождена от
  совпадения со значением перечисленного листа, только если она
  реально поддерживает более широкий домен, чем минимальный, *вдоль
  конкретного \`boundary_class\` этого листа* — реализация с BigInt, но
  с обычным binary64 освобождена на листьях \`integer_range\`, но не на
  каком-либо листе \`float_*\`, а реализация с широким Float, но с
  обычным i64 освобождена наоборот; поддержка одной оси не
  освобождает реализацию вдоль другой. Для освобождённого листа этот
  корпус не фиксирует, каким должен быть его Value — § 5.2 уже
  формулирует общее правило (тот же домен ⇒ тот же kind,
  различающийся домен ⇒ MAY различаться на пересечённой границе), а
  этот Value — то, что производит собственное корректное применение
  правил 13–14 § 5 реализацией к телу листа. Каждое поле, не
  перечисленное в \`boundary-fixtures.json\`, в каждой фикстуре не
  несёт никакого освобождения ни для какой реализации какого бы то
  ни было домена.
- Отвергает каждую фикстуру из \`versions/0.7/tests/invalid/\` с
  категорией ошибки, указанной в \`name.json["expected_error"]\`.

`,
  zh: `
Parser-conforming 实现:

- 满足本文档所有与解析相关的规范性 MUST / MUST NOT 声明。
- 接受 \`versions/0.7/tests/valid/\` 下每个 fixture 并产生与对应
  \`name.json\` 等价的 Value。该等价性定义在 § 5 的最小必需数值域上
  (i64 Integer、binary64 Float)。
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  列出已知探测数值域边界(§ 5.2)的各个对象字段(叶)—— 而非整个
  fixture:一个 fixture MAY 将依赖边界的叶与普通叶混合(例如
  \`big_overflow_to_string\` 的 \`tiny\` 字段在每个符合规范的域中都是
  普通的 \`Integer(1)\`,而其 \`big\` / \`bigger\` 字段则不是),且仅被
  列出的叶被豁免 —— 该 fixture 的其他每个字段 MUST 仍然精确匹配。
  每个条目指明一个 \`boundary_class\`:\`integer_range\`(超出强制的
  i64 范围)、\`float_range\`(在 binary64 上溢出为非有限值)、
  \`float_underflow\`(在 binary64 下溢为零)、或 \`float_precision\`
  (binary64 会对该值舍入或缩短,而更高精度的域则不会)。实现仅当
  其切实支持沿该叶特定 \`boundary_class\` *宽于最小域的域* 时,才
  豁免于对该叶的值进行匹配 —— 支持 BigInt 但仅 plain binary64 的
  实现在 \`integer_range\` 叶上豁免,而在任何 \`float_*\` 叶上不豁免;
  支持 Float 但仅 plain i64 的实现则相反;支持一个轴并不豁免其在
  另一个轴上的要求。对被豁免的叶,该语料并不固定其 Value 必须是
  什么 —— § 5.2 已陈述一般规则(域相同 ⇒ kind 相同,域不同 ⇒ MAY
  在被越过的边界处不同),而该 Value 就是实现自己对叶的体正确应用
  § 5 的规则 13–14 所产生的结果。\`boundary-fixtures.json\` 未列出
  叶的每个字段,在每个 fixture 中,对任何域的任何实现均不带任何
  豁免。
- 拒绝 \`versions/0.7/tests/invalid/\` 下每个 fixture,错误类别
  与 \`name.json["expected_error"]\` 一致。

`,
};
