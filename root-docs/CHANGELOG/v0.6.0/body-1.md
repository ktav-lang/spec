>>>>> lang=en
## [0.6.0] — 2026-06-01

Targeted breaking change: keys now process escape sequences. Two new
escapes (`\.` and `\:`) make it possible to use literal dots and
colons inside key names — keys like `example.com`, `1.0`, or `a:b`
that were impossible to express in 0.5.0.

### Breaking

- **Keys now process escape sequences** (§ 3.7). The backslash byte
  `\` is the escape lead inside keys, just as it already was inside
  inline scalar values. `\.` produces a literal dot (NOT a path
  separator); `\:` produces a literal colon (NOT the pair
  separator); `\\` produces a literal backslash. A literal
  backslash in a key that was bare in 0.5.0 now requires `\\`.
  Rare in practice; documents that did not embed `\` in keys
  parse identically under 0.6.0.
- **The `<key>` / `<segment>` / `<key-char>` grammar productions**
  (§ 4) are now escape-aware. The dotted-path separator splits only
  on **unescaped** `.`; the pair separator is the first
  **unescaped** `:` / `::`. Backslash and dot are excluded from
  `<key-char>` and handled via a new `<key-escape>` production.

### Added

>>>>> lang=ru
## [0.6.0] — 2026-06-01

Точечное ломающее изменение: ключи теперь обрабатывают
escape-последовательности. Два новых escape (`\.` и `\:`) делают
возможным использование литеральных точек и двоеточий внутри имён
ключей — такие ключи как `example.com`, `1.0` или `a:b`, которые
невозможно было выразить в 0.5.0.

### Ломающие

- **Ключи теперь обрабатывают escape-последовательности** (§ 3.7).
  Обратный слэш `\` является escape-лидом в ключах — так же, как
  уже был в inline-скалярных значениях. `\.` даёт литеральную точку
  (НЕ разделитель пути); `\:` даёт литеральное двоеточие (НЕ
  разделитель пары); `\\` даёт литеральный обратный слэш. Литеральный
  обратный слэш в ключе, который был обычным байтом в 0.5.0, теперь
  требует `\\`. На практике это редкость; документы, не
  содержащие `\` в ключах, разбираются одинаково под 0.6.0.
- **Грамматические правила `<key>` / `<segment>` / `<key-char>`**
  (§ 4) теперь осведомлены об escape. Разделитель точечного пути
  разбивает только по **неэкранированным** `.`; разделитель пары —
  первое **неэкранированное** `:` / `::`. Обратный слэш и точка
  исключены из `<key-char>` и обрабатываются через новое правило
  `<key-escape>`.

### Добавлено

>>>>> lang=zh
## [0.6.0] —— 2026-06-01

针对性的破坏性变更:键现在处理 escape 序列。两个新 escape(`\.`
与 `\:`)使在键名中使用字面点与冒号成为可能 —— 诸如
`example.com`、`1.0` 或 `a:b` 这类在 0.5.0 中无法表达的键。

### 破坏性

- **键现在处理 escape 序列**(§ 3.7)。反斜杠 `\` 在键中为 escape
  前导 —— 正如它已经在 inline 标量值内的作用一样。`\.` 产生字面点
  (非路径分隔符);`\:` 产生字面冒号(非对分隔符);`\\` 产生字面
  反斜杠。在 0.5.0 中作为普通字节的键内字面反斜杠现在需要 `\\`。
  实践中较罕见;键中未含 `\` 的文档在 0.6.0 下解析方式不变。
- **`<key>` / `<segment>` / `<key-char>` 语法产生式**(§ 4)现在
  escape 感知。点分路径分隔仅在**未 escape** 的 `.` 处进行;对分
  隔符为首个**未 escape** 的 `:` / `::`。反斜杠与点从 `<key-char>`
  中排除,改由新的 `<key-escape>` 处理。

### 新增

