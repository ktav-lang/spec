>>>>> lang=en
- **Parser divergence:** two spec-conformant implementations accept /
  reject the same input differently. An attacker who knows which
  side a consumer is on can smuggle data past a validator written in
  the other.
- **Oracle errors:** a `.json` oracle in `versions/0.7/tests/valid/`
  that doesn't match what the spec actually mandates — implementations
  calibrated against it drift from the real grammar.
- **Under-specified behaviour:** a corner of the grammar the spec
  leaves ambiguous, and you can show that real implementations take
  opposite calls on it.
- **Missing invariants:** a property the spec implies but never
  states (e.g. an error class, a bound, a determinism guarantee).

Issues that are **not** security problems here — please use regular
issues for these:

- Clarity / phrasing of the spec prose.
- Requests to extend the format with new features — those go through
  the normal RFC-style discussion process.
- Bugs in a specific implementation — report to that binding's repo
  (`ktav-lang/rust`, `ktav-lang/python`, `ktav-lang/js`,
  `ktav-lang/golang`, …).
>>>>> lang=ru
- **Parser divergence:** две spec-совместимые реализации принимают /
  отклоняют один и тот же вход по-разному. Атакующий, знающий на
  какой стороне потребитель, может пронести данные мимо валидатора,
  написанного на другой.
- **Ошибки оракла:** `.json`-оракл в `versions/0.7/tests/valid/`, не
  соответствующий тому, что спека реально требует — калиброванные по
  нему реализации дрейфуют от настоящей грамматики.
- **Недоопределённое поведение:** уголок грамматики, оставленный
  спекой неоднозначным, при условии, что реальные реализации
  принимают по нему противоположные решения.
- **Потерянные инварианты:** свойство, которое спека подразумевает, но
  нигде явно не утверждает (например, класс ошибки, ограничение,
  гарантия детерминизма).

Что **не** считается проблемой безопасности здесь — пожалуйста,
используйте обычные issue:

- Ясность / формулировка prose спеки.
- Запросы на расширение формата новыми фичами — через обычный
  RFC-подобный процесс обсуждения.
- Баги в конкретной реализации — репортите в соответствующий репо
  биндинга (`ktav-lang/rust`, `ktav-lang/python`, `ktav-lang/js`,
  `ktav-lang/golang`, …).
>>>>> lang=zh
- **Parser divergence（解析器分歧）:** 两个符合规范的实现对相同输入
  接受 / 拒绝不一致。知道使用方站在哪一边的攻击者可以让数据绕过
  写在另一边的校验。
- **Oracle 错误:** `versions/0.7/tests/valid/` 中的 `.json` oracle
  与规范实际要求不符 —— 以它为基准校准的实现会偏离真正的语法。
- **未充分规定的行为:** 规范留有歧义的语法角落，并且你能证明真实
  实现对此做出相反选择。
- **缺失的不变量:** 规范暗示但从未明确陈述的性质（如错误类别、
  边界、确定性保证）。

以下**不**算本仓库的安全问题 —— 请走普通 issue:

- 规范 prose 的清晰度 / 措辞。
- 用新特性扩展格式的请求 —— 走正常的 RFC 风格讨论流程。
- 特定实现中的 bug —— 报告到该绑定的仓库
  （`ktav-lang/rust`、`ktav-lang/python`、`ktav-lang/js`、
  `ktav-lang/golang`，……）。
