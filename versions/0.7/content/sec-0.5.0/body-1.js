export default {
  en: `
- **Breaking:** Removed typed markers \`:i\` and \`:f\`. Numbers /
  booleans / \`null\` are inferred from the scalar body's lexical
  form (§ 3.6, § 5.2). The raw marker \`::\` is kept to force String.
- **Breaking:** Comments now use \`##\` (two ASCII \`#\` bytes) and MUST
  occupy their own line (§ 3.4). A single \`#\` byte has no special
  meaning. Trailing comments after a content line are not supported.
- **Breaking:** Lone \`{\` / \`[\` on the first content line is now a
  multi-line root Object / Array (§ 5.0.1 rules 4–5). Previously
  (0.1.1) this opened a single Object / Array item inside a
  root-level Array; the JSONL-style form (multiple top-level
  objects) is no longer accepted.
- **Breaking:** Float Values no longer preserve textual form;
  numeric canonicalisation applies (§ 3.6, § 5.2, § 5.9.8). The
  Value model carries a numeric value; the canonical writer emits
  a deterministic textual form.
- **Breaking:** Key segments are trimmed of leading and trailing
  ASCII whitespace (§ 4). A segment empty after trimming is
  \`EmptyKey\`.
- **Added:** Inline compounds — \`{key: value, key2: value}\` and
  \`[v1, v2, v3]\`, with optional trailing comma (§ 5.8). Inline
  form is usable as a value, as an array item, or as the entire
  document.
- **Added:** Eight escape sequences \`\\\\\`, \`\\,\`, \`\\}\`, \`\\]\`, \`\\{\`,
  \`\\[\`, \`\\n\`, \`\\r\` inside inline scalar values (§ 3.7). Any other
  \`\\X\` form is a \`BadEscapeSequence\` error.
- **Added:** Number literal grammar covering \`0x\` hex, \`0o\` octal,
  \`0b\` binary, decimal, with underscore separators between digits
  (§ 3.6). Integer Value carries an integer value; Float Value
  carries a numeric value; both have canonical textual forms
  (§ 5.9.8). On the minimum i64 domain, big-integer overflow falls
  back to String; a wider integer domain MAY retain such a literal as
  Integer, subject to §§ 5.2 and 8.1.
- **Added:** **Canonical form (§ 5.9)** — a normative writer
  output for every Value, used by writer-conforming
  implementations and verified by \`*.canonical.ktav\` fixtures.
- **Added:** **Triple-test conformance suite** — every valid
  fixture has three files: \`name.ktav\` (input), \`name.json\`
  (Value oracle), \`name.canonical.ktav\` (writer oracle).
- **Added:** \`UnterminatedInlineCompound\`, \`MalformedInlineCompound\`,
  \`BadEscapeSequence\` errors (§ 6.11, § 6.12, § 6.13).
- **Added:** \`OrphanLineAfterTopLevelInline\` error (§ 6.14) as a
  distinct error category, separate from \`MissingSeparator\`.
- **Added:** Appendix B — migration guide 0.1.x → 0.5.0.
- **Removed:** \`InlineNonEmptyCompound\` (§ 6.7),
  \`InvalidTypedScalar\` (§ 6.9) error categories. The numbers are
  reserved; implementations MUST NOT emit errors labelled with
  these names when parsing 0.5.0 documents.
- **Changed:** Top-level kind detection (§ 5.0.1) extended and
  rewritten — closed inline compounds on the first content line
  are root-level inline Object / Array; lone \`{\` / \`[\` is a
  multi-line root opener (see Breaking above).
- **Changed:** Compliance (§ 8) split into parser-conforming
  (§ 8.1), writer-conforming (§ 8.2), and the round-trip property
  (§ 8.3); implementations may claim either or both.

`,
  ru: `
- **Breaking:** Удалены типизированные маркеры \`:i\` и \`:f\`.
  Числа / булевы / \`null\` выводятся из лексической формы скаляра
  (§ 3.6, § 5.2). Сырой маркер \`::\` сохранён.
- **Breaking:** Комментарии теперь используют \`##\` и MUST занимать
  отдельную строку (§ 3.4).
- **Breaking:** Одиночный \`{\` / \`[\` на первой содержательной
  строке — теперь многострочный корневой Object / Array (§ 5.0.1
  правила 4–5). Ранее (0.1.1) это открывало одиночный Object /
  Array элемент внутри корневого Array; JSONL-стиль больше не
  принимается.
- **Breaking:** Float Values больше не сохраняют текстовую форму;
  применяется числовая канонизация (§ 3.6, § 5.2, § 5.9.8).
- **Breaking:** Сегменты ключей обрезаются от ведущих/хвостовых
  ASCII-пробелов (§ 4).
- **Добавлено:** Inline-составные (§ 5.8).
- **Добавлено:** Восемь escape-последовательностей (§ 3.7).
- **Добавлено:** Грамматика числовых литералов (§ 3.6). В минимальном
  i64-домене переполнение big-integer проваливается в String; более
  широкий целочисленный домен MAY сохранить такой литерал как Integer
  с учётом §§ 5.2 и 8.1.
- **Добавлено:** **Каноническая форма (§ 5.9)** — нормативный
  вывод эмиттера для каждого Value, используемый
  writer-conforming реализациями и проверяемый
  \`*.canonical.ktav\` фикстурами.
- **Добавлено:** **Triple-test conformance suite** — каждая valid
  фикстура имеет три файла: \`name.ktav\` (вход), \`name.json\`
  (Value-оракул), \`name.canonical.ktav\` (writer-оракул).
- **Добавлено:** Ошибки \`UnterminatedInlineCompound\`,
  \`MalformedInlineCompound\`, \`BadEscapeSequence\`
  (§ 6.11, § 6.12, § 6.13).
- **Добавлено:** Ошибка \`OrphanLineAfterTopLevelInline\` (§ 6.14)
  как отдельная категория, отдельно от \`MissingSeparator\`.
- **Добавлено:** Приложение B — миграция 0.1.x → 0.5.0.
- **Удалено:** Категории ошибок \`InlineNonEmptyCompound\` (§ 6.7),
  \`InvalidTypedScalar\` (§ 6.9). Номера зарезервированы;
  реализации MUST NOT эмиттить ошибки с этими метками для
  0.5.0-документов.
- **Изменено:** Top-level kind detection (§ 5.0.1) расширено и
  переписано — замкнутые inline-составные на первой
  содержательной строке — корневые inline Object / Array;
  одиночный \`{\` / \`[\` — многострочный корневой опенер.
- **Изменено:** Соответствие (§ 8) разделено на parser-conforming
  (§ 8.1), writer-conforming (§ 8.2) и свойство round-trip (§ 8.3);
  реализации могут заявлять любое из них.

`,
  zh: `
- **Breaking:** 移除类型标记 \`:i\`/\`:f\`。
- **Breaking:** 注释改为 \`##\`(两个 ASCII \`#\` 字节),且 MUST 独占
  一行(§ 3.4)。单个 \`#\` 字节没有特殊含义。不支持在内容行末尾追加
  注释。
- **Breaking:** 首条内容行单独的 \`{\` / \`[\` 现在为多行根
  Object / Array(§ 5.0.1 规则 4–5)。先前(0.1.1)此打开根级
  Array 内的单一 Object / Array 项;JSONL 式形式不再被接受。
- **Breaking:** Float Values 不再保留文本形式;应用数值规范化
  (§ 3.6、§ 5.2、§ 5.9.8)。
- **Breaking:** 键段修剪前后 ASCII 空白(§ 4)。
- **新增:** Inline 复合值(§ 5.8)。
- **新增:** 八个 escape 序列(§ 3.7)。
- **新增:** 数字字面量语法(§ 3.6)。在最小 i64 域上,大整数溢出回退为
  String;更宽的整数域 MAY 将该字面量保留为 Integer,但须遵守 §§ 5.2
  与 8.1。
- **新增:** **规范形式(§ 5.9)** —— 每个 Value 的规范 writer
  输出,由 writer-conforming 实现使用,由 \`*.canonical.ktav\`
  fixture 验证。
- **新增:** **三元测试套件** —— 每个 valid fixture 有三个文件:
  \`name.ktav\`(输入)、\`name.json\`(Value oracle)、
  \`name.canonical.ktav\`(writer oracle)。
- **新增:** 错误 \`UnterminatedInlineCompound\`、
  \`MalformedInlineCompound\`、\`BadEscapeSequence\`
  (§ 6.11、§ 6.12、§ 6.13)。
- **新增:** 错误 \`OrphanLineAfterTopLevelInline\`(§ 6.14)作为
  独立类别,与 \`MissingSeparator\` 分开。
- **新增:** 附录 B —— 0.1.x → 0.5.0 迁移指南。
- **移除:** 错误类别 \`InlineNonEmptyCompound\`(§ 6.7)、
  \`InvalidTypedScalar\`(§ 6.9)。号码保留;实现 MUST NOT 对
  0.5.0 文档输出标签为此名称的错误。
- **变更:** Top-level kind detection(§ 5.0.1)扩展和重写。
- **变更:** 合规性(§ 8)拆分为 parser-conforming(§ 8.1)、
  writer-conforming(§ 8.2)与 round-trip 性质(§ 8.3)。

`,
};
