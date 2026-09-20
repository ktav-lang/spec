>>>>> lang=en

## [0.1.1] — 2026-05-10

Backward-compatible extension: bare top-level Arrays.

### Added

- **Top-level Array** — a document whose first content line is an
  array-item shape (bare scalar, `:: text`, `:i 42`, `:f 3.14`, lone
  `{` / `[`, or multi-line opener `(` / `((`) is now parsed as a
  root-level **Array**. Previously the root Value was always an
  **Object**, so a bare scalar at line 1 was a `MissingSeparator`
  error. New § 5.0.1 specifies the detection rule.
- New conformance fixtures under
  `versions/0.1/tests/valid/top_level_array/` and
  `versions/0.1/tests/invalid/top_level/`.

### Compatibility

This change is **strictly additive** for parsers and documents:
every document valid under 0.1.0 stays valid under 0.1.1 and produces
the same Value (still an Object). Only inputs that 0.1.0 rejected
as `MissingSeparator` are now accepted as Arrays. Documents written
against 0.1.1 may fail under a strict 0.1.0 parser — this is
expected forward incompatibility for new features.

Implementations supporting 0.1.1 MUST handle § 5.0.1 detection;
implementations claiming 0.1.0 compliance only continue to be
conforming (they remain bug-free for 0.1.0 inputs, only lacking the
new capability).

>>>>> lang=ru

## [0.1.1] — 2026-05-10

Обратносовместимое расширение: голые top-level Array.

### Добавлено

- **Top-level Array** — документ, у которого первая содержательная
  строка имеет форму array-item (голый скаляр, `:: text`, `:i 42`,
  `:f 3.14`, одиночный `{` / `[` или многострочный опенер `(` /
  `((`), теперь разбирается как корневой **Array**. Раньше корневое
  Value всегда было **Object**, поэтому голый скаляр в строке 1
  давал ошибку `MissingSeparator`. Новый § 5.0.1 описывает
  правила определения.
- Новые conformance-фикстуры в
  `versions/0.1/tests/valid/top_level_array/` и
  `versions/0.1/tests/invalid/top_level/`.

### Совместимость

Это изменение **строго аддитивно** для парсеров и документов:
любой документ, валидный в 0.1.0, остаётся валидным в 0.1.1 и
даёт то же Value (по-прежнему Object). Только входы, которые
0.1.0 отклонял как `MissingSeparator`, теперь принимаются как
Array. Документы, написанные под 0.1.1, могут не пройти под
строгим 0.1.0-парсером — это ожидаемая прямая
несовместимость новой возможности.

Реализации, поддерживающие 0.1.1, MUST реализовать определение по
§ 5.0.1; реализации, заявляющие соответствие лишь 0.1.0,
продолжают быть конформными (они корректны для 0.1.0-входов,
просто не имеют новой возможности).

>>>>> lang=zh

## [0.1.1] —— 2026-05-10

向后兼容的扩展:裸顶层 Array。

### 新增

- **顶层 Array** —— 当文档的首条内容行为 array-item 形式(裸标量、
  `:: text`、`:i 42`、`:f 3.14`、单独的 `{` / `[`,或多行开启符
  `(` / `((`)时,该文档现被解析为根级 **Array**。此前根 Value
  始终为 **Object**,故首行为裸标量会产生 `MissingSeparator`
  错误。新的 § 5.0.1 规定了判定规则。
- 新增一致性 fixture:
  `versions/0.1/tests/valid/top_level_array/` 与
  `versions/0.1/tests/invalid/top_level/`。

### 兼容性

此改动对解析器与文档**严格累加**:任何在 0.1.0 中有效的文档在
0.1.1 中仍然有效并产生相同的 Value(仍为 Object)。只有此前
被 0.1.0 以 `MissingSeparator` 拒绝的输入,现在才被作为 Array
接受。针对 0.1.1 编写的文档在严格的 0.1.0 解析器下可能失败
—— 这是新功能预期的正向不兼容性。

支持 0.1.1 的实现 MUST 处理 § 5.0.1 的判定;仅声称 0.1.0
合规的实现继续保持合规(它们对 0.1.0 输入仍然正确,只是缺少
新功能)。

