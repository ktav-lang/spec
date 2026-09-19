>>>>> lang=en

No change to the lax entry point (`parse`/`loads`): every document that
parsed under 0.7.x parses to the same Value under 0.8.0, and every
canonical rendering is unchanged byte for byte.

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

Нестрогая точка входа (`parse`/`loads`) не меняется: каждый документ,
разбиравшийся в 0.7.x, разбирается в то же Value в 0.8.0, а каждая
каноническая запись остаётся побайтово прежней.

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

宽松入口(`parse`/`loads`)不变:每个在 0.7.x 中能解析的文档在
0.8.0 中解析为相同的 Value,每个规范化输出逐字节不变。

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

