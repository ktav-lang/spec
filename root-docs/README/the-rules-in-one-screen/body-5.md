>>>>> lang=en
Numbers are Values carrying a numeric value, not the text they were
written as — the writer emits a normalised canonical form (spec
section 5.9.8), so `0.50` comes back as `0.5` and `1e2` as `100.0`
(the decimal point stays even for a whole-number Float, so a
re-parse doesn't turn it into an Integer). A bare integer within the
guaranteed i64 range round-trips exactly as an Integer; i64 (Integer)
and binary64 (Float) are the portable minimum every implementation
guarantees — an implementation may support wider domains (arbitrary
precision / decimal), and a literal overflowing its own supported
domain falls back to a String. To keep a numeric-looking value as text
regardless of size, force it with `::`
(`zip:: 01007`).

### Multi-line strings

Two forms, different goals:

```text
stripped: (
    line 1
    line 2
        relative indent preserved
)

>>>>> lang=ru
Числа — это Value, несущие числовое значение, а не текст, которым
они были записаны: при выводе используется нормализованная
каноническая форма (раздел 5.9.8 спецификации), так что `0.50`
возвращается как `0.5`, а `1e2` — как `100.0` (десятичная точка
остаётся даже для целочисленного Float, чтобы повторный разбор не
превратил его в Integer). Голое целое в пределах
гарантированного диапазона i64 переживает round-trip точно как
Integer; i64 (для Integer) и binary64 (для Float) — переносимый
минимум, который гарантирует каждая реализация. Реализация может
поддерживать и более широкие домены (произвольная точность /
десятичные числа), а переполняющий литерал за пределами собственного
поддерживаемого домена уходит в String.
Потребители на типизированных языках (Rust + serde, Go) сужают до
нужного нативного типа; чтобы оставить число-подобное значение
текстом любого размера, форсируйте его через `::`
(`zip:: 01007`).

### Многострочные строки

Две формы, разные цели:

```text
stripped: (
    line 1
    line 2
        relative indent preserved
)

>>>>> lang=zh
数字是携带数值的 Value,并不保留书写时的原文——写出时采用规范化
的规范形式（规范文档 5.9.8 节），因此 `0.50` 回来会变成 `0.5`,
`1e2` 变成 `100.0`(即便是整数值的 Float,小数点也保留,这样
重新解析不会把它变成 Integer)。保证范围内的裸整数作为 Integer 精确往返;
i64（对 Integer）与 binary64（对 Float）是每个实现都保证的可移植
最小域——实现可以支持更宽的域（任意精度/十进制），超出其自身
支持范围的溢出字面量会落入 String。类型化
语言的消费方（Rust + serde、Go）在自己那边收窄到所需的原生类型;
若要让看起来像数字的值——无论多大——保持为文本,用 `::` 强制
（`zip:: 01007`）。

### 多行字符串

两种形式，用途不同：

```text
stripped: (
    line 1
    line 2
        relative indent preserved
)

