>>>>> lang=en
- **Inline compounds** — `{key: value, key2: value}` and
  `[v1, v2, v3]`, with optional trailing comma, allowed as values,
  as array items, or as the entire document (§ 5.8). Whitespace
  inside is optional everywhere.
- **Escape sequences** — eight in total: `\\`, `\,`, `\}`, `\]`,
  `\{`, `\[`, `\n`, `\r` inside inline scalar values (§ 3.7).
  The bracket-pair set is full and symmetric. Any other `\X`
  form is a `BadEscapeSequence` error.
- **Number literal grammar** covering `0x` hex, `0o` octal, `0b`
  binary, decimal, with underscore digit separators (§ 3.6).
  Integer Value carries an integer value; Float Value carries a
  numeric value. Big-integer overflow falls back to String.
  Implementations MUST support at least the i64 range for
  Integer; wider ranges (bignum) are permitted (§ 5.2 rule 13).
- **Canonical form (§ 5.9)** — a normative writer output for every
  Value, used by writer-conforming implementations and verified by
  `*.canonical.ktav` fixtures. The canonical form is
  byte-deterministic: any two writer-conforming implementations
  produce identical output for the same Value.
- **Triple-test conformance suite** — every valid fixture has three
  files: `name.ktav` (input as written, with comments / inline /
  hex / `_` underscores / multiple forms), `name.json` (Value
  oracle), `name.canonical.ktav` (writer oracle — the canonical
  form of the parsed Value).
- **Top-level inline compounds** — a document whose first content
  line is a closed inline `{...}` or `[...]` is a root-level inline
  Object / Array (§ 5.0.1 rules 2–3).
- **Spaces and tabs in key segments are allowed** (§ 4 `<key-char>`).
  A key may contain internal whitespace such as `first name`; only
  the structural delimiters and ASCII control bytes are excluded.
- **Mid-value `{` / `[` is literal** (§ 5.8.5). A `{` or `[` byte
  that is NOT the first non-whitespace byte of an inline value is
  a literal character; it does not open a nested compound. Example:
  `{a: hello{world, b: x}` yields `{a: "hello{world", b: "x"}`.
- **Error categories** — `UnterminatedInlineCompound` (§ 6.11),
  `MalformedInlineCompound` (§ 6.12), `BadEscapeSequence` (§ 6.13).
  `MalformedInlineCompound` covers leading commas, consecutive
  commas, empty array items, and other structural defects inside a
  closed inline compound that aren't already an Unterminated error.
- **§ 6.14 `OrphanLineAfterTopLevelInline`** — a distinct error
  category for content after a top-level inline root or after the
  matching close of a lone-`{` / lone-`[` root opener. Previously
  this was lumped with `MissingSeparator`.
- **Appendix B: Migration guide** from 0.1.x to 0.5.0 — typed
  markers, comments, bare-number typing, and root-Array form.
- **Compliance split** — § 8 now defines parser-conforming (§ 8.1),
  writer-conforming (§ 8.2), and a round-trip property (§ 8.3).
  Implementations may claim either or both.

>>>>> lang=ru
- **Inline-составные** — `{key: value, key2: value}` и
  `[v1, v2, v3]`, с опциональной замыкающей запятой (§ 5.8).
- **Escape-последовательности** — восемь штук: `\\`, `\,`, `\}`,
  `\]`, `\{`, `\[`, `\n`, `\r` внутри inline-скалярных значений
  (§ 3.7).
- **Грамматика числовых литералов** — `0x` hex, `0o` octal, `0b`
  binary, decimal, с подчёркиваниями (§ 3.6). Integer несёт
  целочисленное значение; Float несёт числовое значение.
  Big-integer-переполнение проваливается в String.
- **Каноническая форма (§ 5.9)** — нормативный вывод writer'а
  для каждого Value, используемый writer-conforming реализациями
  и проверяемый `*.canonical.ktav` фикстурами. Каноническая
  форма байт-детерминирована.
- **Triple-test conformance suite** — каждая valid фикстура имеет
  три файла: `name.ktav` (вход как написал автор, с комментариями
  / inline / hex / `_` / разными формами), `name.json`
  (Value-оракул), `name.canonical.ktav` (writer-оракул).
- **Top-level inline compounds** — документ, у которого первая
  содержательная строка — замкнутый inline `{...}` или `[...]`,
  становится корневым inline Object / Array (§ 5.0.1 правила 2–3).
- **Пробелы и табуляция допустимы в сегментах ключа**
  (§ 4 `<key-char>`).
- **Средне-значимый `{` / `[` литерален** (§ 5.8.5).
- **Категории ошибок** — `UnterminatedInlineCompound` (§ 6.11),
  `MalformedInlineCompound` (§ 6.12), `BadEscapeSequence`
  (§ 6.13).
- **§ 6.14 `OrphanLineAfterTopLevelInline`** — отдельная
  категория ошибок для содержимого после top-level inline корня
  или после строки закрытия одиночного `{` / `[` корневого
  опенера. Ранее это попадало под `MissingSeparator`.
- **Приложение B: Миграционный гайд** с 0.1.x на 0.5.0.
- **Разделение Compliance** — § 8 теперь определяет
  parser-conforming (§ 8.1), writer-conforming (§ 8.2) и
  свойство round-trip (§ 8.3). Реализации могут заявлять любое
  из них.

>>>>> lang=zh
- **Inline 复合值** —— `{key: value, key2: value}` 与
  `[v1, v2, v3]`,可选尾部逗号(§ 5.8)。
- **八个 Escape 序列** —— `\\`、`\,`、`\}`、`\]`、`\{`、`\[`、
  `\n`、`\r` 在 inline 标量值内(§ 3.7)。
- **数字字面量语法**(§ 3.6)。Integer 携带整数值;Float 携带
  数值。大整数溢出回退为 String。
- **规范形式(§ 5.9)** —— 每个 Value 的规范 writer 输出,由
  writer-conforming 实现使用,由 `*.canonical.ktav` fixture
  验证。规范形式字节确定。
- **三元测试套件** —— 每个 valid fixture 含三个文件:
  `name.ktav`(输入)、`name.json`(Value oracle)、
  `name.canonical.ktav`(writer oracle)。
- **顶层 inline 复合值** —— 文档首条内容行为闭合 inline 时,
  即为根级 inline Object / Array(§ 5.0.1 规则 2–3)。
- **键段中允许空格与制表符**(§ 4 `<key-char>`)。
- **值中间的 `{` / `[` 字面化**(§ 5.8.5)。
- **错误类别** —— `UnterminatedInlineCompound`(§ 6.11)、
  `MalformedInlineCompound`(§ 6.12)、`BadEscapeSequence`
  (§ 6.13)。
- **§ 6.14 `OrphanLineAfterTopLevelInline`** —— 独立错误类别。
- **附录 B:迁移指南** 从 0.1.x 到 0.5.0。
- **合规性拆分** —— § 8 现在定义 parser-conforming(§ 8.1)、
  writer-conforming(§ 8.2)与 round-trip 性质(§ 8.3)。

