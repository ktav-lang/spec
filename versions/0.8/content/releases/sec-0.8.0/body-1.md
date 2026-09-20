>>>>> lang=en

Two changes: one alters the Value a document parses to, the other adds
an obligation on a parser-conforming implementation.

- **§ 5.2 — a redundant leading zero is no longer a number.** Rules
  13–14 send a base-10 digit run whose first digit is `0` with at least
  one further digit (`01234`, `-045`, `00`, `0_7`, and a float's
  integer part in `01.5`, `05e3`) to rule 15 instead: it is a String
  carrying the digits as written. `zip: 01234` was `Integer(1234)` and
  is now `"01234"`, through every entry point. `0`, `0.5`, `0x1A`,
  `0o755`, `0b1010`, `1_000_000` and `+7` are unaffected. Canonical
  renderings do not change — the writer keys the `::` marker to § 3.6's
  grammar, which is untouched. See Appendix E.
- **§ 8.1 — new obligation.** A parser-conforming implementation must
  now also expose a strict parsing entry point (`parse_strict` /
  `loads_strict`) and, for each fixture under
  `versions/0.8/tests/strict-lossy/`, reject it with `LossyScalar`
  naming the exact `body`/`canonical` given in the fixture's oracle,
  while the lax entry point continues to accept the same input and
  produce the oracle's `lax_value` unchanged. Unlike § 8.5 in 0.7.1,
  this is a genuine new obligation, not a checkability clarification
  of an existing one — no prior section required a strict entry point
  to exist at all — which is why it ships as a MINOR version rather
  than a patch. In practice no known implementation is affected: the
  Rust reference implementation's `parse_strict` already rejected
  every one of these forms before this corpus existed, and every
  binding built on it inherits that behaviour automatically, since
  none of them reimplement scalar classification independently. See
  Appendix E for the migration note.
- **Appendix E — new.** Migration guide from 0.7.x.

>>>>> lang=ru

Два изменения: одно меняет Value, в которое разбирается документ,
другое добавляет обязанность parser-конформной реализации.

- **§ 5.2 — избыточный ведущий ноль больше не число.** Правила 13–14
  отправляют ряд цифр по основанию 10, чья первая цифра `0`, при этом
  следует хотя бы ещё одна цифра (`01234`, `-045`, `00`, `0_7`, а также
  целая часть float в `01.5`, `05e3`), в правило 15: это String,
  несущая цифры как написано. `zip: 01234` был `Integer(1234)`, а
  теперь `"01234"` — через любую точку входа. `0`, `0.5`, `0x1A`,
  `0o755`, `0b1010`, `1_000_000` и `+7` не затронуты. Канонические
  записи не меняются: писатель привязывает маркер `::` к грамматике
  § 3.6, которая не тронута. См. Приложение E.
- **§ 8.1 — новое обязательство.** Parser-конформная реализация
  теперь также обязана предоставлять строгую точку входа
  (`parse_strict` / `loads_strict`) и для каждой фикстуры из
  `versions/0.8/tests/strict-lossy/` отвергать её с `LossyScalar`,
  называющим точные `body`/`canonical` из оракула фикстуры, при этом
  нестрогая точка входа продолжает принимать тот же ввод и давать
  `lax_value` оракула без изменений. В отличие от § 8.5 в 0.7.1, это
  настоящее новое обязательство, а не уточнение проверяемости уже
  существующего — ни один предыдущий раздел не требовал наличия
  строгой точки входа вообще, — поэтому это выходит как MINOR-версия,
  а не патч. На практике ни одна известная реализация не затронута:
  эталонная Rust-реализация в `parse_strict` уже отвергала каждую из
  этих форм до появления этого корпуса, а каждый биндинг, построенный
  на ней, наследует это поведение автоматически, поскольку ни один из
  них не переопределяет классификацию скаляров самостоятельно. См.
  Приложение E для заметки о миграции.
- **Приложение E — новое.** Руководство по миграции с 0.7.x.

>>>>> lang=zh

两项变更:一项改变文档解析所得的 Value,另一项为 parser 一致性实现
增加义务。

- **§ 5.2 —— 冗余前导零不再是数字。** 规则 13–14 会把以 `0` 开头且
  后面至少还有一位数字的十进制数字串(`01234`、`-045`、`00`、`0_7`,
  以及 `01.5`、`05e3` 中 float 的整数部分)改送到规则 15:它是一个
  按书写原样携带这些数字的 String。`zip: 01234` 曾是
  `Integer(1234)`,现在是 `"01234"` —— 通过每一个入口。`0`、`0.5`、
  `0x1A`、`0o755`、`0b1010`、`1_000_000` 与 `+7` 不受影响。规范化
  输出不变 —— 写出器把 `::` 标记绑定到未被触动的 § 3.6 语法。
  见附录 E。
- **§ 8.1 —— 新增义务。** parser 一致性实现现在还必须提供严格解析
  入口(`parse_strict` / `loads_strict`),并且对
  `versions/0.8/tests/strict-lossy/` 下每个 fixture,以 `LossyScalar`
  拒绝它,该错误指明 fixture oracle 中给出的精确 `body`/`canonical`;
  与此同时宽松入口继续接受同一输入,并产生 oracle 的 `lax_value`,
  不变。与 0.7.1 中的 § 8.5 不同,这是真正的新义务,而非对已有义务
  可检验性的澄清 —— 此前没有任何章节要求严格入口的存在 —— 这就是
  它以 MINOR 版本而非 patch 发布的原因。实际上没有任何已知实现受
  影响:Rust 参考实现的 `parse_strict` 在这一语料出现之前就已拒绝
  所有这些形式,而构建于其上的每个绑定都自动继承这一行为,因为它们
  都没有自行重新实现标量分类。迁移说明见附录 E。
- **附录 E —— 新增。** 从 0.7.x 迁移的指南。

