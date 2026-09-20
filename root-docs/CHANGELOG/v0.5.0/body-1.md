>>>>> lang=en

## [0.5.0] — 2026-05-28

Major language revision. Three breaking changes plus a substantial
additive surface for inline forms. Implementations claiming 0.5.0
compliance need a fresh parser pass — there is no automatic
migration from 0.1.x.

### Breaking

- **Typed markers `:i` and `:f` removed.** Numbers, booleans, and
  `null` are inferred from the lexical form of the scalar body
  (§ 3.6, § 5.2). The raw marker `::` is kept to force a literal
  String for cases where the form would otherwise match a number
  or keyword.
- **Comments now use `##`** (two ASCII `#` bytes) and MUST occupy
  their own line (§ 3.4). A single `#` byte has no special meaning;
  trailing comments after content on the same line are not
  supported.
- **Bare `port: 8080` is now `Integer(8080)`**, not `String("8080")`.
  This follows from removing the typed markers. To keep the value
  as a String, write `port:: 8080`.
- **Lone `{` / `[` on the first content line is now a multi-line
  root Object / Array** (§ 5.0.1 rules 4–5). Previously (0.1.1) a
  lone opener on line 1 produced a single Object / Array item
  inside a root-level Array. The 0.1.1 JSONL-style form (multiple
  top-level objects on consecutive lines producing a root Array)
  is no longer accepted.
- **Float Values no longer carry textual form**; numeric
  canonicalisation applies (§ 3.6, § 5.2, § 5.9.8). The Value
  model carries a numeric value; the canonical writer emits a
  deterministic textual form. Underscores, the choice of `e` vs
  `E`, and a leading `+` are not part of the Value.
- **Key segments are trimmed of leading and trailing ASCII
  whitespace** (§ 4). A segment empty after trimming is
  `EmptyKey` (§ 6.5). Internal whitespace within a segment is
  preserved verbatim.
- **Line terminators are `LF`, `CR`, or `CR LF`** (§ 3.2). All
  three are equivalent. A `CR` byte never appears as content at
  parse time; to embed `CR` in a String value, use the `\r` escape
  inside an inline compound. Such Values are not representable in
  canonical form (§ 5.9.0).

>>>>> lang=ru

## [0.5.0] — 2026-05-28

Крупная ревизия языка. Три ломающих изменения плюс существенная
аддитивная поверхность для inline-форм. Реализациям, заявляющим
соответствие 0.5.0, нужен новый проход парсера — автоматической
миграции с 0.1.x нет.

### Ломающие

- **Удалены типизированные маркеры `:i` и `:f`.** Числа, булевы и
  `null` выводятся из лексической формы тела скаляра (§ 3.6,
  § 5.2). Сырой маркер `::` сохранён.
- **Комментарии теперь используют `##`** (два ASCII `#`-байта) и
  MUST занимать свою отдельную строку (§ 3.4).
- **Голое `port: 8080` теперь `Integer(8080)`**, а не
  `String("8080")`.
- **Одиночный `{` / `[` на первой содержательной строке — теперь
  многострочный корневой Object / Array** (§ 5.0.1 правила 4–5).
  Ранее (0.1.1) одиночный опенер на строке 1 давал одиночный
  Object / Array элемент внутри корневого Array. JSONL-стиль
  больше не принимается.
- **Float Values больше не несут текстовую форму**; применяется
  числовая канонизация (§ 3.6, § 5.2, § 5.9.8). Value-модель
  несёт числовое значение; канонический writer выдаёт
  детерминированную текстовую форму. Подчёркивания, выбор `e`
  vs `E`, и ведущий `+` не являются частью Value.
- **Сегменты ключей обрезаются от ведущих/хвостовых
  ASCII-пробелов** (§ 4). Пустой после обрезки сегмент — это
  `EmptyKey` (§ 6.5). Внутренние пробелы в сегменте сохраняются
  verbatim.
- **Завершители строк — `LF`, `CR` или `CR LF`** (§ 3.2). Все три
  эквивалентны. Байт `CR` никогда не появляется как содержимое на
  этапе разбора; чтобы вставить `CR` в String, используйте escape
  `\r` внутри inline-составного. Такие Value не представимы в
  канонической форме (§ 5.9.0).

>>>>> lang=zh

## [0.5.0] —— 2026-05-28

语言的重大修订。三个破坏性变更与显著的 inline 形式增补面。
声明 0.5.0 兼容性的实现需要重写解析器 —— 没有从 0.1.x 的
自动迁移。

### 破坏性

- **移除类型标记 `:i` 与 `:f`。** 数字、布尔与 `null` 从标量
  字面形式推断(§ 3.6、§ 5.2)。`::` 原始标记保留。
- **注释改为 `##`** (两个 ASCII `#` 字节)且 MUST 独占一行
  (§ 3.4)。
- **裸 `port: 8080` 现在为 `Integer(8080)`**,而非
  `String("8080")`。
- **首条内容行的单独 `{` / `[` 现在为多行根 Object / Array**
  (§ 5.0.1 规则 4–5)。先前(0.1.1)首行的单独开启符产生
  根级 Array 内的单一 Object / Array 项;JSONL 式形式不再
  被接受。
- **Float Values 不再保留文本形式**;应用数值规范化(§ 3.6、
  § 5.2、§ 5.9.8)。Value 模型携带数值;规范 writer 输出
  确定性的文本形式。下划线、`e` vs `E` 的选择、前导 `+`
  均不属于 Value。
- **键段修剪前后 ASCII 空白**(§ 4)。修剪后为空的段是
  `EmptyKey`(§ 6.5)。段内空白 verbatim 保留。
- **行终止符是 `LF`、`CR` 或 `CR LF`**(§ 3.2)。三者等价。`CR`
  字节在解析时绝不作为内容出现;要在 String 中插入 `CR`,需在
  inline 复合值内使用 `\r` 转义。此类 Value 在规范形式中不可表示
  (§ 5.9.0)。

