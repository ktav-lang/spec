export default {
  en: `
A writer-conforming implementation:

- Satisfies every normative MUST / MUST NOT statement of § 5.9.
- For each fixture under \`versions/0.7/tests/valid/\`, produces —
  when given the Value parsed from \`name.ktav\` — a byte-exact
  output equal to \`name.canonical.ktav\`, except for the contribution
  of a leaf that
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  lists for that fixture. Under § 8.1,
  every ordinary, non-exempt field MUST match its JSON oracle in the
  tested implementation's declared domain; an ordinary numeric field
  is not required to hold a universal minimum-domain Value. A listed
  boundary leaf MAY hold a different Value only when the tested source
  literal crosses that leaf's named boundary and the implementation
  supports a wider domain along that boundary class. Every other field
  MUST match normally, and its contribution MUST remain byte-exactly
  the same as the canonical output. For an exempt leaf, this corpus
  does not pin the exact bytes of its own contribution: they MUST be
  the correct canonical form (§ 5.9) for the Value the implementation
  actually holds there, internally consistent and deterministic for
  its domain. An implementation supporting only the minimum domain
  MUST match every \`valid/\` fixture's \`.canonical.ktav\` exactly,
  in full, including every listed boundary leaf.
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
  \`versions/0.7/tests/parseable-unrepresentable/\`, when given
  \`name.json["value"]\`, rejects that Value with the reason code
  named in \`name.json["unrepresentable_reason"]\`. These
  fixtures are pairs, not valid triples, and MUST NOT have a canonical
  output file.

The canonical form is defined in § 5.9.

`,
  ru: `
Writer-conforming реализация:

- Удовлетворяет каждому нормативному MUST / MUST NOT в § 5.9.
- Для каждой фикстуры из \`versions/0.7/tests/valid/\` выдаёт —
  при подаче Value, разобранного из \`name.ktav\` — байт-точный
  вывод, равный \`name.canonical.ktav\`, кроме вклада листа, который
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  перечисляет для этой фикстуры. Согласно § 8.1 каждое обычное,
  не освобождённое поле MUST совпадать с JSON-оракулом в заявленном
  домене тестируемой реализации; обычное числовое поле не обязано
  содержать универсальное Value минимального домена. Перечисленный
  граничный лист MAY содержать иное Value только когда исходный
  литерал в домене тестируемой реализации пересекает названную для
  листа границу, а реализация поддерживает более широкий домен вдоль
  этого класса. Каждое другое поле MUST совпадать обычно, а его вклад
  MUST оставаться байт-точно равным canonical-output. Для освобождённого
  листа корпус не фиксирует точные байты его собственного вклада:
  они MUST быть правильной канонической формой (§ 5.9) фактически
  удерживаемого Value, внутренне согласованной и детерминированной для
  домена реализации. Реализация только с минимальным доменом MUST
  в полном объёме и в точности совпасть с \`.canonical.ktav\` каждой
  фикстуры \`valid/\`, включая каждый перечисленный граничный лист.
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
  \`versions/0.7/tests/parseable-unrepresentable/\` при подаче
  \`name.json["value"]\` отвергает этот Value с кодом причины из
  \`name.json["unrepresentable_reason"]\`. Это пары, а не valid-тройки;
  у них MUST NOT быть canonical-output файла.

Каноническая форма определена в § 5.9.

`,
  zh: `
Writer-conforming 实现:

- 满足 § 5.9 所有规范性 MUST / MUST NOT 声明。
- 对 \`versions/0.7/tests/valid/\` 下每个 fixture,在给定从
  \`name.ktav\` 解析的 Value 时,产生与 \`name.canonical.ktav\`
  字节相同的输出,但该 fixture 在
  [\`versions/0.7/tests/boundary-fixtures.json\`](tests/boundary-fixtures.json)
  中列出的叶自身贡献除外。依 § 8.1,每个普通且未豁免的字段 MUST
  在被测实现声明的域中与 JSON oracle 匹配;普通数值字段不要求持有
  一个普遍适用的最小域 Value。列出的边界叶 MAY 不同,仅当源字面量
  在被测域中越过该叶命名的边界,且实现沿该边界类支持更宽域时才可如此。
  其他每个字段 MUST 正常匹配,其贡献 MUST 与 canonical-output 保持
  字节精确相同。对于豁免叶,该语料不固定其自身贡献的确切字节:
  它们 MUST 是实现实际持有 Value 的正确规范形式(§ 5.9),并对该实现
  域保持内部一致与确定。仅支持最小域的实现 MUST 完整、精确匹配每个
  \`valid/\` fixture 的 \`.canonical.ktav\`,包括每个列出的边界叶。
- 对 \`versions/0.7/tests/unrepresentable/\` 下每个 fixture,以
  \`name.json["unrepresentable_reason"]\` 中指明的原因代码
  (§ 5.9.0)拒绝 \`name.json["value"]\` 所描述的 Value —— 可通过
  其自身 API 的任意错误报告形式;规范性的是代码名称,而非呈现
  机制。每个 JSON Object MUST 恰好包含 \`value\`,
  \`unrepresentable_reason\` 与非空 \`note\`,不得有额外字段;
  Value 映射与 \`$float\` sentinel 的精确形状见 § 5.9.0。原因代码
  MUST 在 Value 树中有递归见证,而不得从文件名推导。
- 对 \`versions/0.7/tests/parseable-unrepresentable/\` 下每个
  fixture,在给定 \`name.json["value"]\` 时,以
  \`name.json["unrepresentable_reason"]\` 指明的原因代码拒绝该
  Value。这些 fixture 是
  pair 而非 valid triple,MUST NOT
  带有 canonical-output 文件。

规范形式定义见 § 5.9。

`,
};
