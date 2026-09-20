>>>>> lang=en
- **Two new escape sequences** — `\.` → `.` and `\:` → `:` — in the
  § 3.7 escape table (now ten entries total: `\\`, `\,`, `\}`,
  `\]`, `\{`, `\[`, `\n`, `\r`, `\.`, `\:`). Applies to inline
  scalar values AND to keys.
- **Appendix C — migration guide** from 0.5.0 to 0.6.0.

### Changed

- "Keys" removed from the "escape sequences are NOT processed in"
  list (§ 3.7). Keys now DO process escapes — same set as inline
  scalars.
- § 5.9.10 (canonical key emission) — the writer MUST re-escape
  `\`, `.`, and `:` inside a key segment so that the canonical
  output round-trips through the parser.
- § 6.13 `BadEscapeSequence` — updated to list ten valid escape
  characters (added `.` and `:`).

### Versioning

`versions/0.6/` is a new top-level format directory. The 0.5.0
spec at `versions/0.5/` and the 0.1.x spec at `versions/0.1/`
remain in the repository for legacy parsers that wish to support
the older syntax in parallel.

Pre-1.0 versioning policy: a MINOR bump (0.5 → 0.6) carries a
breaking change in this version stream. Once the format reaches
1.0, breaking changes will require a MAJOR bump.

>>>>> lang=ru
- **Две новые escape-последовательности** — `\.` → `.` и `\:` → `:`
  — в таблицу § 3.7 (теперь десять в сумме: `\\`, `\,`, `\}`, `\]`,
  `\{`, `\[`, `\n`, `\r`, `\.`, `\:`). Применяется как к
  inline-скалярным значениям, так и к ключам.
- **Приложение C — миграционный гайд** с 0.5.0 на 0.6.0.

### Изменено

- «Ключи» удалены из списка «escape-последовательности НЕ
  обрабатываются в» (§ 3.7). Ключи теперь ОБРАБАТЫВАЮТ escape — тот
  же набор, что и inline-скаляры.
- § 5.9.10 (каноническая эмиссия ключей) — writer MUST
  ре-экранировать `\`, `.` и `:` внутри сегмента ключа, чтобы
  канонический вывод проходил round-trip через парсер.
- § 6.13 `BadEscapeSequence` — обновлён для перечисления десяти
  допустимых escape-символов (добавлены `.` и `:`).

### Версионирование

`versions/0.6/` — новая директория формата верхнего уровня.
Спецификации 0.5.0 в `versions/0.5/` и 0.1.x в `versions/0.1/`
остаются в репозитории для устаревших парсеров, желающих
параллельно поддерживать старый синтаксис.

Политика версионирования до 1.0: MINOR-инкремент (0.5 → 0.6) несёт
ломающее изменение в этой ветке версий. После выхода формата на
1.0 ломающие изменения будут требовать MAJOR-инкремента.

>>>>> lang=zh
- **两个新 escape 序列** —— `\.` → `.` 与 `\:` → `:` —— 加入 § 3.7
  表(现共十个:`\\`、`\,`、`\}`、`\]`、`\{`、`\[`、`\n`、`\r`、
  `\.`、`\:`)。适用于 inline 标量值与键。
- **附录 C —— 迁移指南** 从 0.5.0 到 0.6.0。

### 变更

- 从「escape 序列不在以下场景处理」列表(§ 3.7)中移除「键」。键
  现在处理 escape —— 与 inline 标量相同的集合。
- § 5.9.10(规范键输出)—— writer MUST 对键段中的 `\`、`.` 与 `:`
  重新 escape,以确保规范输出能通过解析器 round-trip。
- § 6.13 `BadEscapeSequence` —— 更新为列出十个有效 escape 字符
  (新增 `.` 与 `:`)。

### 版本控制

`versions/0.6/` 为新的顶层格式目录。`versions/0.5/` 处的 0.5.0
规范与 `versions/0.1/` 处的 0.1.x 规范保留在仓库中,以便希望并行
支持旧语法的旧解析器。

1.0 之前的版本策略:MINOR 增量(0.5 → 0.6)在该版本线中携带破坏性
变更。一旦格式发布到 1.0,破坏性变更将需要 MAJOR 增量。

