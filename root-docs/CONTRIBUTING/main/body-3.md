>>>>> lang=en
**Pre-1.0 exception:** while `MAJOR` is `0`, a breaking change MAY
instead land as a `MINOR` bump in a new `versions/0.(y+1)/` directory
(0.7.0 does this over 0.6.x) — there is no `0.x` to increment to
otherwise. Once the format reaches `1.0`, breaking changes strictly
require the new-`MAJOR`-directory process above.

## What doesn't belong here

- **Parser tricks** — if it's not expressible in the spec document,
  it's an implementation concern. File it in the relevant
  implementation's repo (`ktav-lang/rust`, etc.).
- **Performance claims** — also implementation-level.
- **Integrations** (how Ktav talks to your favourite DI framework,
  schema validator, etc.) — downstream of the spec.
- **"Why not just use YAML / TOML / JSON"** threads — the README's
  comparison table is the whole answer we maintain.

## Design principles

Every proposal is weighed against these, in priority order:

>>>>> lang=ru
**Исключение для pre-1.0:** пока `MAJOR` равен `0`, ломающее
изменение MAY вместо этого приземлиться как `MINOR`-bump в новой
директории `versions/0.(y+1)/` (именно так 0.7.0 поступает
относительно 0.6.x) — иначе увеличивать `0.x` было бы некуда. После
достижения `1.0` ломающие изменения строго требуют процесса с новой
директорией `MAJOR` выше.

## Что здесь неуместно

- **Трюки парсера** — если это нельзя выразить в документе
  спецификации, это забота реализации. Открывайте issue в репозитории
  соответствующей реализации (`ktav-lang/rust` и т. д.).
- **Утверждения о производительности** — тоже на уровне реализации.
- **Интеграции** (как Ktav общается с вашим любимым DI-фреймворком,
  валидатором схем и т. п.) — находятся за пределами спецификации.
- **Треды «почему бы не взять YAML / TOML / JSON»** — сравнительная
  таблица в README и есть весь поддерживаемый нами ответ.

## Принципы дизайна

Каждое предложение взвешивается по следующим принципам, в порядке
приоритета:

>>>>> lang=zh
**pre-1.0 例外：** 当 `MAJOR` 为 `0` 时，破坏性变更 MAY 改为以
`MINOR` 递进的形式落到新目录 `versions/0.(y+1)/`(0.7.0 相对
0.6.x 正是如此）—— 否则 `0.x` 将无处递增。一旦格式达到 `1.0`，
破坏性变更将严格要求上述新 `MAJOR` 目录流程。

## 不属于这里的内容

- **解析器的小把戏**——如果规范文档无法表达，就是实现层面的事。
  请到对应的实现仓库（`ktav-lang/rust` 等）去报告。
- **性能声称**——同样属于实现层面。
- **集成问题**（Ktav 如何配合你钟爱的 DI 框架、Schema 校验器等）
  ——属于规范下游。
- **「为什么不用 YAML / TOML / JSON」式讨论**——README 的对比表
  就是我们维护的全部回答。

## 设计原则

每份提案按以下原则依优先级衡量：

