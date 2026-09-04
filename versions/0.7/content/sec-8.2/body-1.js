export default {
  en: `
A writer-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement of § 5.9.
- For each fixture under \`versions/0.7/tests/valid/\`, produces —
  when given the Value parsed from \`name.ktav\` — a byte-exact
  output equal to \`name.canonical.ktav\`, UNLESS the implementation
  supports a domain wider than the minimum along the \`boundary_class\`
  of one or more leaves
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  lists for that fixture — per § 8.1, such an implementation may hold
  a different Value at that leaf's path than the minimum-domain
  \`.json\` oracle describes there (e.g. \`i64_overflow_to_string\`'s
  \`/overflow\` field held as an Integer, not a String), while every
  other field of the same fixture still holds its minimum-domain
  Value and MUST still appear in the output exactly as the
  minimum-domain writer would render it. For such a fixture, this
  corpus does not pin the exact byte sequence for the exempt leaf's
  own contribution to the output: it MUST be the correct canonical
  form (§ 5.9) for the Value the implementation actually holds there
  (e.g. an Integer value is canonically written bare, without the raw
  marker, § 5.9.5), internally consistent and deterministic for its
  own domain — but which exact bytes that is for a domain other than
  the minimum is not something this shared, language-agnostic corpus
  verifies. An implementation supporting only the minimum domain MUST
  match every \`valid/\` fixture's \`.canonical.ktav\` exactly, in full,
  including every field \`boundary-fixtures.json\` lists a leaf for.
- For each fixture under \`versions/0.7/tests/unrepresentable/\`,
  rejects the Value described by \`name.json["value"]\` with the
  reason code named in \`name.json["unrepresentable_reason"]\`
  (§ 5.9.0) — via whatever error-reporting shape its own API uses;
  the code names are normative, the surfacing mechanism is not. Each
  JSON object MUST contain exactly \`value\`,
  \`unrepresentable_reason\`, and non-empty \`note\`, with no extra
  fields; the Value mapping and the exact \`$float\` sentinel shape are
  defined by § 5.9.0. The reason code MUST have a recursive witness in
  the Value tree, rather than being inferred from the filename.
- For each fixture under
  \`versions/0.7/tests/parseable-unrepresentable/\`, accepts the
  sibling \`name.ktav\` as a parser-conforming implementation and
  produces \`name.json["value"]\`, then rejects that Value as a
  writer-conforming implementation with the named reason code. These
  fixtures are pairs, not valid triples, and MUST NOT have a canonical
  output file.

The canonical form is defined in § 5.9.

`,
  ru: `
Writer-conforming реализация:

- Удовлетворяет каждому нормативному MUST / MUST NOT в § 5.9.
- Для каждой фикстуры из \`versions/0.7/tests/valid/\` выдаёт —
  при подаче Value, разобранного из \`name.ktav\` — байт-точный
  вывод, равный \`name.canonical.ktav\`, кроме случая, когда
  реализация поддерживает домен более широкий, чем минимальный,
  вдоль \`boundary_class\` одного или нескольких листьев, которые
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  перечисляет для этой фикстуры, — согласно § 8.1 такая реализация
  может владеть иным Value по пути этого листа, чем описывает
  минимально-доменный \`.json\` оракул (например, поле \`/overflow\`
  \`i64_overflow_to_string\`, удерживаемое как Integer, а не String),
  при этом каждое прочее поле той же фикстуры по-прежнему удерживает
  своё минимально-доменное Value и MUST появляться в выводе в точности
  так, как его отрисовал бы минимально-доменный writer. Для такой
  фикстуры этот корпус не фиксирует точную байтовую
  последовательность собственного вклада освобождённого листа в
  вывод: он MUST быть правильной канонической формой (§ 5.9) того
  Value, которым реализация действительно владеет там (например,
  значение Integer записывается канонически голым, без
  raw-маркера, § 5.9.5), внутренне согласованным и детерминированным
  для её собственного домена, — но какие именно это байты для домена,
  отличного от минимального, этот общий, не зависящий от языка
  корпус не проверяет. Реализация, поддерживающая только минимальный
  домен, MUST совпасть с \`.canonical.ktav\` каждой фикстуры \`valid/\`
  в точности и в полном объёме, включая каждое поле, для которого
  \`boundary-fixtures.json\` перечисляет лист.
- Для каждой фикстуры из \`versions/0.7/tests/unrepresentable/\`
  отклоняет Value, описанное в \`name.json["value"]\`, с кодом
  причины, указанным в \`name.json["unrepresentable_reason"]\`
  (§ 5.9.0) — через любую форму отчёта об ошибке своего API;
  нормативны имена кодов, а не механизм их предъявления. Каждый
  JSON-объект MUST содержать ровно \`value\`,
  \`unrepresentable_reason\` и непустой \`note\`, без лишних полей;
  отображение Value и точная форма sentinel \`$float\` определены в
  § 5.9.0. Код причины MUST иметь рекурсивное свидетельство в дереве
  Value, а не выводиться из имени файла.
- Для каждой фикстуры из
  \`versions/0.7/tests/parseable-unrepresentable/\` принимает соседний
  \`name.ktav\` как parser-conforming реализация и даёт
  \`name.json["value"]\`, после чего writer-conforming реализация
  отвергает этот Value с указанным кодом. Это пары, а не valid-тройки;
  у них MUST NOT быть canonical-output файла.

Каноническая форма определена в § 5.9.

`,
  zh: `
Writer-conforming 实现:

- 满足 § 5.9 所有规范性 MUST / MUST NOT 声明。
- 对 \`versions/0.7/tests/valid/\` 下每个 fixture,在给定从
  \`name.ktav\` 解析的 Value 时,产生与 \`name.canonical.ktav\`
  字节相同的输出,UNLESS 该实现沿一个或多个叶的 \`boundary_class\`
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  为该 fixture 所列出的条目,支持宽于最小域的域 —— 依 § 8.1,
  这样的实现在该叶的路径处可能持有不同于最小域 \`.json\` oracle 所
  描述的 Value(例如 \`i64_overflow_to_string\` 的 \`/overflow\`
  字段被持有为 Integer 而非 String),而同一 fixture 的其他每个
  字段仍持有最小域 Value,且 MUST 仍按最小域 writer 将其渲染的
  方式精确出现在输出中。恰对此类 fixture,该语料同样不固定被豁免
  叶自身对输出贡献的确切字节序列:它 MUST 是实现实际持有的 Value
  的正确规范形式(§ 5.9)(例如 Integer 值以不带 raw 标记的裸形式
  规范写出,§ 5.9.5),并对其自身的域保持内部一致与确定 —— 但对
  最小域之外的域,那究竟是哪些确切字节,并不是这个共享的、语言
  无关的语料所验证的。仅支持最小域的实现 MUST 与每个 \`valid/\`
  fixture 的 \`.canonical.ktav\` 精确、完整地匹配,包括
  \`boundary-fixtures.json\` 为其列出叶的每个字段。
- 对 \`versions/0.7/tests/unrepresentable/\` 下每个 fixture,以
  \`name.json["unrepresentable_reason"]\` 中指明的原因代码
  (§ 5.9.0)拒绝 \`name.json["value"]\` 所描述的 Value —— 可通过
  其自身 API 的任意错误报告形式;规范性的是代码名称,而非呈现
  机制。每个 JSON Object MUST 恰好包含 \`value\`,
  \`unrepresentable_reason\` 与非空 \`note\`,不得有额外字段;
  Value 映射与 \`$float\` sentinel 的精确形状见 § 5.9.0。原因代码
  MUST 在 Value 树中有递归见证,而不得从文件名推导。
- 对 \`versions/0.7/tests/parseable-unrepresentable/\` 下每个
  fixture,parser-conforming 实现接受 sibling \`name.ktav\` 并产生
  \`name.json["value"]\`,随后 writer-conforming 实现以指定原因代码
  拒绝该 Value。这些 fixture 是 pair 而非 valid triple,MUST NOT
  带有 canonical-output 文件。

规范形式定义见 § 5.9。

`,
};
