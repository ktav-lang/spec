export default {
  en: `
A pair line takes the form:

\`\`\`
key: value
key:: literal-string-value
\`\`\`

where:

- \`key\` is one or more **segments** separated by unescaped dots
  (\`<segment> ( <unescaped-dot> <segment> )*\`, § 4). Each segment is
  either a \`<bare-segment>\` (\`key-token+\`) or, as of 0.7.0, a
  \`<quoted-segment>\` (§ 5.3.3) opened by \`"\`, \`'\`, or \`\` \` \`\` — the
  two forms may be mixed freely across the segments of one dotted
  key (\`a."b.c".d: v\`, § 5.3.3) and are validated per § 5.3.1. Each
  segment MUST be non-empty: after escape processing for a bare
  segment, or, for a quoted segment, as written between its
  delimiters (quoted content is never trimmed, § 5.3.3). A
  \`<bare-segment>\` is **escape-aware** (§ 3.7, § 4): \`\\\` is
  the escape lead; \`\\.\` produces a literal dot (not a path
  separator); \`\\:\` produces a literal colon (not a pair separator);
  \`\\\\\` produces a literal backslash. Other \`\\X\` forms are
  \`BadEscapeSequence\` errors. The \`#\` byte is allowed inside a
  segment. A line whose trimmed form *begins* with \`##\` is a
  different matter — and not a key-validation failure: § 5.1
  rule 2 consumes such a line as a comment (§ 3.4) unconditionally,
  before any pair-line processing begins, so it is never parsed as
  a pair line at all. Keeping \`##\`-prefixed keys parseable is a
  *writer* obligation (§ 5.9.10), not a parser-side error: a
  canonical writer avoids a raw \`##\` at the start of the emitted
  line by choosing quoted form for such a key's first segment —
  the line then starts with \`"\`, not \`#\`, so § 5.1 rule 2's
  comment dispatch never applies to it on re-read.
  The pair separator is the first **unescaped** \`:\` (or \`::\`)
  scanning left-to-right, treating the content of any quoted
  segment along the way as opaque — § 4 gives the exact quote-aware
  scanning rule (including how an unterminated quoted segment is
  handled); it is not restated here. This scanning rule — together
  with a non-empty prefix and \`<sep-end>\` for a plain \`:\` — is also
  the shape-only test § 5.0.1 rule 6 uses to detect a root Object;
  full key validation (§ 5.3.1) runs afterward, uniformly,
  regardless of which rule established the Object context.
- The plain \`:\` separator dispatches the value per § 5.2.
- The raw marker \`::\` interprets the body as a literal String —
  no type inference, no recursion into compounds. Escape sequences
  (§ 3.7) are NOT processed in a multi-line pair body (a body that
  is the whole rest of the line); they ARE processed in an inline
  pair body (§ 5.8).
- \`<sep-end>\` requires at least one whitespace code point or end-of-line
  after the separator. Writing \`key:value\` / \`key::value\` (no
  whitespace, body continues on the same line) is a
  \`MissingSeparatorSpace\` error (§ 6.10). The \`<sep-end>\` rule does
  NOT apply to inline pair separators (§ 5.8) where whitespace is
  optional everywhere. Separator checks precede key validation: for
  a dispatched pair line the order is \`UnterminatedQuotedKey\`
  (§ 6.16) when the reason no separator was found is an unterminated
  quoted key segment, else the generic \`MissingSeparator\` (§ 6.6) →
  \`EmptyKey\` for an empty prefix (§ 6.5) → \`MissingSeparatorSpace\`
  (§ 6.10) → key-segment validation (§ 5.3.1). A key defect does
  not preempt a separator defect: \`b,c:1\` inside an established
  Object reports \`MissingSeparatorSpace\`, not \`InvalidKey\`.

A pair whose value-part is the empty string (the line ends right
after the separator and its required whitespace, or right after
\`<sep-end>\` consumed the end-of-line) is a pair whose value is an
empty String. This is true for both plain \`:\` and raw \`::\`.

`,
  ru: `
Pair line имеет форму:

\`\`\`
key: value
key:: literal-string-value
\`\`\`

где:

- \`key\` — один или более **сегментов**, разделённых
  неэкранированными точками (\`key-token+\`). Каждый сегмент MUST
  быть непустым после обработки escape. Ключ **осведомлён об escape**
  (§ 3.7, § 4): \`\\\` является escape-лидом; \`\\.\` даёт литеральную
  точку (не разделитель пути); \`\\:\` даёт литеральное двоеточие (не
  разделитель пары); \`\\\\\` даёт литеральный обратный слэш. Прочие
  формы \`\\X\` — ошибки \`BadEscapeSequence\`. Байт \`#\` внутри
  сегмента разрешён. Строка, чья обрезанная форма *начинается*
  с \`##\`, — другое дело, и это не ошибка валидации ключа: § 5.1
  правило 2 безусловно потребляет такую строку как комментарий
  (§ 3.4) до начала любой обработки pair line, поэтому она вообще
  не разбирается как pair line. Сохранение разбираемости ключей
  с префиксом \`##\` — обязанность *писателя* (§ 5.9.10), а не
  парсерная ошибка: канонический писатель избегает сырого \`##\` в
  начале выводимой строки, выбирая для первого сегмента такого
  ключа квотированную форму — строка тогда начинается с \`"\`, а не
  с \`#\`, поэтому диспетчеризация комментария по § 5.1 правилу 2 к
  ней при повторном чтении вообще не применяется. Разделитель пары —
  первое **неэкранированное** \`:\` (или \`::\`) при сканировании
  слева направо. Это правило сканирования — вместе с непустым
  префиксом и \`<sep-end>\` для обычного \`:\` — является также
  тестом «только форма», которым § 5.0.1 правило 6 детектирует
  корневой Object; полная валидация ключа (§ 5.3.1) выполняется
  после, единообразно, независимо от того, каким правилом
  установлен контекст Object.
- Обычный \`:\`-разделитель диспетчеризует значение по § 5.2.
- Сырой маркер \`::\` интерпретирует тело как литеральную String —
  без вывода типа, без рекурсии в составные. Escape-последовательности
  (§ 3.7) НЕ обрабатываются в теле многострочной пары (тело —
  весь остаток строки); они ОБРАБАТЫВАЮТСЯ в теле inline-пары
  (§ 5.8).
- \`<sep-end>\` требует как минимум одну пробельную кодовую точку
  или конец строки после разделителя. Запись \`key:value\` / \`key::value\` (без
  пробела, тело продолжается на той же строке) — ошибка
  \`MissingSeparatorSpace\` (§ 6.10). Правило \`<sep-end>\` НЕ
  применяется к разделителям inline-пар (§ 5.8), где пробелы
  опциональны везде. Проверки разделителя предшествуют валидации
  ключа: для строки, разобранной как pair line, порядок таков:
  \`MissingSeparator\` (§ 6.6) → \`EmptyKey\` для пустого префикса
  (§ 6.5) → \`MissingSeparatorSpace\` (§ 6.10) → валидация
  сегментов ключа (§ 5.3.1). Дефект ключа не вытесняет дефект
  разделителя: \`b,c:1\` внутри уже установленного Object даёт
  \`MissingSeparatorSpace\`, а не \`InvalidKey\`.

Пара, чья \`value-part\` — пустая строка (строка заканчивается сразу
после разделителя и обязательного пробела, либо сразу после того,
как \`<sep-end>\` поглотил конец строки), — это пара, чьё значение
является пустой String. Это верно как для обычного \`:\`, так и для
сырого \`::\`.

`,
  zh: `
形式:

\`\`\`
key: value
key:: literal-string-value
\`\`\`

其中:

- \`key\` 由一个或多个以未 escape 的点分隔的**段**组成
  (\`key-token+\`)。每个段在 escape 处理后 MUST 非空。键是
  **escape 感知**的(§ 3.7、§ 4):\`\\\` 是 escape 前导;\`\\.\` 产生
  字面点(非路径分隔符);\`\\:\` 产生字面冒号(非 pair 分隔符);
  \`\\\\\` 产生字面反斜杠。其他 \`\\X\` 形式为 \`BadEscapeSequence\`
  错误。\`#\` 字节在段内允许。trim 后以 \`##\` *起始*的行则是另一
  回事 —— 且并非键校验失败:§ 5.1 规则 2 在任何 pair 行处理开始
  之前,即无条件将此类行按注释(§ 3.4)消费,因此它根本不会被
  解析为 pair 行。保持 \`##\` 前缀键可解析是*写入器*的义务
  (§ 5.9.10),而非解析器侧错误:规范写入器通过为此类键的首段选择
  quoted 形式来避免输出行以裸 \`##\` 起始 —— 该行随后以 \`"\` 而非
  \`#\` 起始,重读时 § 5.1 规则 2 的注释分发便不再适用于它。pair 分隔符是
  从左到右扫描时第一个**未 escape** 的 \`:\`(或 \`::\`)。该扫描
  规则 —— 连同非空前缀与普通 \`:\` 的 \`<sep-end>\` —— 也是
  § 5.0.1 规则 6 用以判定根 Object 的仅形状测试;完整键校验
  (§ 5.3.1)在其后统一进行,与确立 Object 上下文的规则无关。
- 普通 \`:\` 分隔符按 § 5.2 分发值。
- 原始标记 \`::\` 将体解释为字面 String —— 无类型推断,不递归
  进入复合值。escape 序列(§ 3.7)在多行 pair 体中(体为该行剩余
  的全部内容)不被处理;它们在 inline pair 体中(§ 5.8)被处理。
- \`<sep-end>\` 要求分隔符之后至少一个空白码点或行末。书写
  \`key:value\` / \`key::value\`(无空白,体在同一行继续)是
  \`MissingSeparatorSpace\` 错误(§ 6.10)。\`<sep-end>\` 规则**不**
  适用于 inline pair 分隔符(§ 5.8),那里空白处处可选。分隔符
  检查先于键校验:对已分发的 pair 行,顺序为 \`MissingSeparator\`
  (§ 6.6)→ 空前缀的 \`EmptyKey\`(§ 6.5)→
  \`MissingSeparatorSpace\`(§ 6.10)→ 键段校验(§ 5.3.1)。键缺陷
  不会抢占分隔符缺陷:既有 Object 内的 \`b,c:1\` 报告
  \`MissingSeparatorSpace\`,而非 \`InvalidKey\`。

其 \`value-part\` 为空的 pair(该行恰好在分隔符及其必需的空白之后
结束,或恰好在 \`<sep-end>\` 吸收行末之后结束),其值即为空 String。
这对普通 \`:\` 与原始 \`::\` 均成立。

`,
};
