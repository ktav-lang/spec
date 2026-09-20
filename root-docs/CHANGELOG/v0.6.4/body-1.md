>>>>> lang=en
## [0.6.4] — 2026-08-23

### Changed

- **Float canonicalisation is now normative at the notation boundary.**
  The writer first uses the shortest round-tripping decimal for its Float
  representation, then MUST use scientific notation when `abs < 1e-2` or
  `abs >= 1e7`, and decimal notation otherwise. The exact boundary values
  and examples are now explicit in § 5.9.8, eliminating the former
  contradiction between `-0.001` and `1.5e-3`.
- **The current stable specification is 0.6.4.** This is an editorial
  clarification and conformance-fixture release; the directory remains
  `versions/0.6/`.

>>>>> lang=ru
## [0.6.4] — 2026-08-23

### Изменено

- **Канонизация Float теперь нормативно определяет границы записи.**
  Сначала выбирается кратчайшая round-trip-десятичная форма, затем
  научная запись обязательна при `abs < 1e-2` или `abs >= 1e7`, а
  десятичная — в остальных случаях. Граничные значения и примеры
  зафиксированы в § 5.9.8; прежнее противоречие между `-0.001` и
  `1.5e-3` устранено.
- **Текущей стабильной спецификацией стала 0.6.4.** Это редакционное
  уточнение и выпуск conformance-фикстур; каталог остаётся `versions/0.6/`.

>>>>> lang=zh
## [0.6.4] —— 2026-08-23

### 变更

- **Float 规范化现在明确规定表示边界。** writer 先选择最短的
  round-trip 十进制形式,再在 `abs < 1e-2` 或 `abs >= 1e7` 时必须使用
  科学形式,其余情况使用十进制形式。§ 5.9.8 现在明确记录边界值和
  示例,消除了 `-0.001` 与 `1.5e-3` 之间的矛盾。
- **当前稳定规范为 0.6.4。** 这是编辑澄清与 conformance fixture
  发布;目录仍为 `versions/0.6/`。

