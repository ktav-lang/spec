>>>>> lang=en
## [0.8.0] — 2026-09-19

Normative text and conformance fixtures for 0.8.0, under
`versions/0.8/`. This is the current stable specification —
`versions.ktav` points `stable` and `latest` at 0.8.0; 0.7.1 remains
carried in the working tree as the previous stable release.

### Breaking

- **§ 5.2 — a decimal integer with a redundant leading zero is a String,
  not an Integer.** `zip: 01234` now parses to the String `"01234"`
  through *every* entry point, lax included; under 0.7.x it was
  `Integer(1234)` and the zero was gone for good. This is the change the
  0.8 line exists for: a postal code, a phone number or an account
  number written without a forced-string marker survives a parse and a
  write-back intact, because § 5.2 no longer infers a number when doing
  so would destroy the spelling. A **redundant leading zero** is a
  base-10 digit run whose first digit is `0` with at least one further
  digit, sign and underscores ignored (`01234`, `-045`, `00`, `0_7`);
  rule 14 applies the same exception to a float's integer part (`01.5`,
  `05e3`). Deliberately unaffected, and still inferred as numbers:
  `0` itself, `0.5`, the base-prefixed forms `0x1A`/`0o755`/`0b1010`
  (whose `0` belongs to the prefix), `1_000_000` and `+7`.
  A document that wants the numeric reading must drop the zero.
- **§ 8.1 — a parser-conforming implementation must now also expose a
  strict parsing entry point** (`parse_strict` / `loads_strict`) and
  reject every fixture under `versions/0.8/tests/strict-lossy/` with
  `LossyScalar`, naming the exact `body`/`canonical` its oracle gives,
  while the lax entry point continues to accept the same input
  unchanged. No prior section required a strict entry point to exist
  at all, which is why this is a MINOR bump rather than a patch, unlike
  § 8.5 in 0.7.1 (which only made an existing § 8.1 obligation
  checkable). In practice no known implementation is affected: the
  Rust reference implementation's `parse_strict` already rejected
  every one of these forms before this corpus existed, and every
  binding built on it inherits that behaviour automatically. See
  Appendix E for the migration note.

>>>>> lang=ru
## [0.8.0] — 2026-09-19

Нормативный текст и фикстуры соответствия для 0.8.0, под
`versions/0.8/`. Это текущая стабильная спецификация —
`versions.ktav` указывает `stable` и `latest` на 0.8.0; 0.7.1
остаётся в рабочем дереве как предыдущий стабильный релиз.

### Ломающее

- **§ 5.2 — десятичное целое с избыточным ведущим нулём это String, а
  не Integer.** `zip: 01234` теперь разбирается в String `"01234"`
  через *любую* точку входа, включая нестрогую; в 0.7.x это был
  `Integer(1234)`, и ноль исчезал безвозвратно. Это и есть изменение,
  ради которого существует линия 0.8: почтовый индекс, номер телефона
  или номер счёта, записанный без маркера принудительной строки,
  переживает разбор и обратную запись без искажений, потому что § 5.2
  больше не выводит число, если это уничтожило бы написание.
  **Избыточный ведущий ноль** — ряд цифр по основанию 10, чья первая
  цифра `0`, при этом следует хотя бы ещё одна цифра, без учёта знака
  и подчёркиваний (`01234`, `-045`, `00`, `0_7`); правило 14
  применяет то же исключение к целой части float (`01.5`, `05e3`).
  Намеренно не затронуты и по-прежнему выводятся как числа: сам `0`,
  `0.5`, формы с префиксом основания `0x1A`/`0o755`/`0b1010` (их `0`
  принадлежит префиксу), `1_000_000` и `+7`. Документу, которому нужно
  числовое чтение, следует убрать ноль.
- **§ 8.1 — parser-конформная реализация теперь также обязана
  предоставлять строгую точку входа для парсинга** (`parse_strict` /
  `loads_strict`) и отвергать каждую фикстуру из
  `versions/0.8/tests/strict-lossy/` с `LossyScalar`, называющим точные
  `body`/`canonical` из её оракула, при этом нестрогая точка входа
  продолжает принимать тот же ввод без изменений. Ни один предыдущий
  раздел не требовал наличия строгой точки входа вообще, поэтому это
  MINOR-версия, а не патч, в отличие от § 8.5 в 0.7.1 (которая лишь
  сделала проверяемым уже существующее обязательство § 8.1). На
  практике ни одна известная реализация не затронута: эталонная
  Rust-реализация в `parse_strict` уже отвергала каждую из этих форм до
  появления этого корпуса, а каждый биндинг, построенный на ней,
  наследует это поведение автоматически. См. Приложение E для заметки
  о миграции.

>>>>> lang=zh
## [0.8.0] —— 2026-09-19

0.8.0 的规范性文本与一致性 fixture,位于 `versions/0.8/`。这是当前
稳定规范——`versions.ktav` 将 `stable` 与 `latest` 指向 0.8.0;0.7.1
作为上一个稳定发布仍保留在工作树中。

### 破坏性变更

- **§ 5.2 —— 带冗余前导零的十进制整数是 String,而不是 Integer。**
  `zip: 01234` 现在通过*每一个*入口(包括宽松入口)都解析为 String
  `"01234"`;在 0.7.x 中它是 `Integer(1234)`,那个零就永久消失了。
  这正是 0.8 这条线存在的原因:未加强制字符串标记写下的邮政编码、
  电话号码或账号,能够完整地经历一次解析与回写,因为当推断数字会
  摧毁其书写形式时,§ 5.2 不再进行推断。**冗余前导零**指以 `0`
  开头且后面至少还有一位数字的十进制数字串,忽略符号与下划线
  (`01234`、`-045`、`00`、`0_7`);规则 14 对 float 的整数部分适用
  同一例外(`01.5`、`05e3`)。刻意不受影响、仍然被推断为数字的有:
  `0` 本身、`0.5`、带进制前缀的 `0x1A`/`0o755`/`0b1010`(其 `0`
  属于前缀)、`1_000_000` 与 `+7`。需要数字读法的文档应去掉那个零。
- **§ 8.1 —— parser 一致性实现现在还必须提供严格解析入口**
  (`parse_strict` / `loads_strict`),并对
  `versions/0.8/tests/strict-lossy/` 下每个 fixture 以 `LossyScalar`
  拒绝,该错误指明其 oracle 给出的精确 `body`/`canonical`;与此同时
  宽松入口继续原样接受同一输入。此前没有任何章节要求严格入口的存在,
  这就是它以 MINOR 版本而非 patch 发布的原因,不同于 0.7.1 中的
  § 8.5(它只是让已有的 § 8.1 义务变得可检验)。实际上没有任何已知
  实现受影响:Rust 参考实现的 `parse_strict` 在这一语料出现之前就已
  拒绝所有这些形式,而构建于其上的每个绑定都自动继承这一行为。迁移
  说明见附录 E。

