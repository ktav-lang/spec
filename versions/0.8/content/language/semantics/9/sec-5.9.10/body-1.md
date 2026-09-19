>>>>> lang=en

A key segment is emitted after escape processing and the trimming
rule of § 4. Internal whitespace is preserved. Dotted keys are NOT
re-expanded: a Value parsed from `a.b.c: 1` is indistinguishable
in the Value model from one parsed from `a: { b: { c: 1 } }`, and
the canonical writer chooses the explicit nested form (not the
dotted form).

>>>>> lang=ru

Сегмент ключа выводится после обработки escape и применения trim
(§ 4). Внутренние пробелы сохраняются. Точечные ключи НЕ
разворачиваются обратно: Value, разобранное из `a.b.c: 1`,
неотличимо в модели Value от полученного из `a: { b: { c: 1 } }`, и
канонический эмиттер выбирает явную вложенную форму (а не точечную).

>>>>> lang=zh

键段在 escape 处理与 § 4 trim 后输出。段内空白保留。点分键
**不**反展开:从 `a.b.c: 1` 解析得到的 Value 在 Value 模型中与
从 `a: { b: { c: 1 } }` 得到的不可区分,规范 writer 选择显式
嵌套形式(而非点分形式)。

