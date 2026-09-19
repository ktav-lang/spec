>>>>> lang=en
# Contributing to Ktav

**Languages:** **English** · [Русский](CONTRIBUTING.ru.md) · [简体中文](CONTRIBUTING.zh.md)

Thanks for looking. Ktav is a small format on purpose — the bar for
accepting changes is deliberately high, and that bar is **not** "would
this be a nice feature." The bar is: **does this change make Ktav
smaller, simpler, or more coherent?**

This document covers (1) what belongs in the spec, (2) what doesn't,
(3) how the version/release process works, and (4) how to submit.

## What belongs here

This repository is the format itself. Three kinds of change land here:

### 1. Editorial — `PATCH` bump

Fixes that do not change what a conforming parser does. Typos,
reworded paragraphs, clearer examples, better test names, new
*conformance* tests (new angles on existing rules — not new rules).

Ship a PR directly. One-line description in the commit, updated
version in `versions/<v>/spec.md` header and `CHANGELOG.md`.

### 2. Additive — `MINOR` bump

Backward-compatible extensions. A new keyword, a new primitive form,
a new multi-line-string variant — something old parsers would reject
but whose absence doesn't break existing documents.

Open an issue first. The issue must answer, in order:

1. **What does this let users do that they currently can't?** Show a
   real config, not a synthetic example.
2. **What's the cost?** Every rule added is a rule every implementer
   has to get right, and a rule every reader has to know.
3. **Can the same thing be expressed within the existing grammar?**
   If yes, that's usually the better answer.

Additions ship as a new `versions/<x>.(y+1)/` directory with its own
spec and tests. The previous version stays frozen — implementations
continue to pin to whichever version they support.

### 3. Breaking — `MAJOR` bump

A change in grammar or semantics that makes some previously-valid
document invalid, or changes its meaning. These are rare. Same
process as additive, plus a migration note that describes what
changes and why.

Breaking changes land in a new `versions/(x+1).0/` directory.
Previous majors remain published forever — implementations targeting
them are not obsoleted.

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

1. **Locality.** A line's meaning must not depend on a declaration
   elsewhere in the file, or in another file.
2. **One sentence.** The new rule must be statable in one sentence
   of the specification. If it takes a paragraph, it's probably
   actually two rules.
3. **No whitespace sensitivity** (other than line breaks). Ktav is
   line-based; column alignment never carries meaning.
4. **No magic types.** Unmarked text matching the §5.2 numeric-literal
   rules and falling within the implementation's numeric domain classifies
   as Integer or Float, including noncanonical accepted spellings; consumers
   own domain and schema semantics (via serde, schema, or code), and other
   text remains String.
5. **Explicit over clever.** `::` is verbose on purpose — the rare
   case where you need a literal should be the one that costs
   extra characters, not the common case.

A proposal that sacrifices any of these needs a correspondingly
large justification.

## Versioning, concretely

```
x . y . z
│   │   └── PATCH — editorial; parsers unaffected
│   └────── MINOR — additive; old docs still valid
└────────── MAJOR — breaking
```

- `versions/<x>.<y>/` is the source of truth for that version.
- `CHANGELOG.md` at the repo root tracks history across all versions.
- `versions.ktav` is the machine-readable index.
- Each release is marked with a git tag carrying the **full**
  `MAJOR.MINOR.PATCH`: `v0.1.0`, `v0.1.1`, `v0.2.0`, … The directory
  name (`versions/0.1/`) drops the PATCH component by convention — a
  PATCH bump updates the directory in place, not next to it — but the
  version string everywhere else stays three-part.

## Submitting

1. Fork, branch, commit with a descriptive message (English or
   Russian both accepted).
2. If the change touches `versions/<v>/`, update the header version
   and add a `CHANGELOG.md` entry under the right heading.
3. Add a conformance test in `versions/<v>/tests/` — either under
   `valid/` (new shape parses correctly) or `invalid/` (new
   constraint rejects the right input). One test per concept.
4. Open a PR referencing the issue (for additive/breaking changes).
   Editorial PRs don't need a prior issue.
5. CI in downstream implementations will check that its parser still
   agrees with the updated test suite.

## Review

Maintainers look for:

- Does the change pass the five principles above?
- Is there a test that would fail if someone implemented it wrong?
- Is the one-sentence rule actually one sentence?
- Does the example read well out of context?

Small, surgical PRs merge fast. Large "while I'm here" refactors of
the spec text get pushed back — break them up.

## Language policy

The `ktav-lang` organisation maintains every prose document in three
parallel languages: English (canonical), Russian, and Simplified
Chinese. File naming: `<name>.md` / `<name>.ru.md` / `<name>.zh.md`.
When you change any prose file, **update all three versions in the
same commit** — translation drift is the main failure mode of
multi-language docs. If you don't speak one of them, mark the
untouched files with `<!-- TODO: sync with <name>.md -->` at the top
and open the PR anyway; a maintainer or community contributor will
fill the gap before merge.

`versions/<v>/spec.md` is normatively English; RU / ZH translations
are informative (helpful to non-English readers, not a source of
authority). RFC 2119 keywords (MUST, SHOULD, MAY, …) stay in English
capitals across every translation — they are technical terms.

Full policy in the org-level
[`.github/AGENTS.md`](https://github.com/ktav-lang/.github/blob/main/AGENTS.md).

## License

By contributing, you agree that your contribution is dual-licensed
under **MIT OR Apache-2.0** at the user's option, same as the rest
of this repository.
>>>>> lang=ru
# Вклад в Ktav

**Languages:** [English](CONTRIBUTING.md) · **Русский** · [简体中文](CONTRIBUTING.zh.md)

Спасибо, что заглянули. Ktav — намеренно маленький формат, и планка
для принятия изменений сознательно поднята высоко. Эта планка — **не**
«было бы классно добавить». Планка такая: **делает ли это изменение
Ktav меньше, проще или целостнее?**

Документ описывает (1) что относится к спецификации, (2) что нет,
(3) как устроен процесс версионирования и релизов и (4) как подавать.

## Что уместно здесь

Этот репозиторий — сам формат. Здесь приземляются три вида изменений:

### 1. Редакторские — bump `PATCH`

Исправления, которые не меняют поведения соответствующего парсера.
Опечатки, переформулированные абзацы, более ясные примеры, лучшие
имена тестов, новые *conformance*-тесты (новые углы к существующим
правилам, а не новые правила).

Отправляйте PR напрямую. Однострочное описание в коммите, обновлённая
версия в заголовке `versions/<v>/spec.md` и в `CHANGELOG.md`.

### 2. Аддитивные — bump `MINOR`

Обратно совместимые расширения. Новое ключевое слово, новая
примитивная форма, новый вариант многострочной строки — то, что
старые парсеры отвергли бы, но отсутствие чего не ломает существующие
документы.

Сначала откройте issue. В issue нужно ответить, по порядку:

1. **Что это позволяет пользователям делать, чего они сейчас не могут?**
   Покажите реальный конфиг, не синтетический пример.
2. **Какова цена?** Каждое добавленное правило — это правило, которое
   должен верно реализовать каждый реализатор, и правило, которое
   должен знать каждый читатель.
3. **Можно ли выразить то же самое в существующей грамматике?** Если
   да — обычно это и есть правильный ответ.

Дополнения выходят как новая директория `versions/<x>.(y+1)/` с
собственной спецификацией и тестами. Предыдущая версия остаётся
замороженной — реализации продолжают закрепляться за той версией,
которую поддерживают.

### 3. Ломающие — bump `MAJOR`

Изменение грамматики или семантики, делающее некоторые
ранее-валидные документы невалидными или меняющее их смысл. Они
редки. Процесс тот же, что для аддитивных, плюс migration note,
описывающая, что меняется и почему.

Ломающие изменения приземляются в новой директории
`versions/(x+1).0/`. Предыдущие мажорные версии остаются
опубликованными навсегда — реализации, ориентированные на них, не
устаревают.

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

1. **Локальность.** Смысл строки не должен зависеть от объявления в
   другом месте файла или в другом файле.
2. **Одно предложение.** Новое правило должно формулироваться одним
   предложением спецификации. Если требуется абзац — это, скорее
   всего, два правила.
3. **Нечувствительность к пробелам** (кроме переносов строк). Ktav
   строчно-ориентирован; выравнивание по колонкам никогда не несёт
   смысла.
4. **Никаких магических типов.** Непомеченный текст, соответствующий
   правилам числовых литералов § 5.2 и попадающий в числовой домен
   реализации, классифицируется как Integer или Float, включая принятые
   неканонические записи; семантика домена и схемы принадлежит потребителю
   (через serde, схему или код), а остальной текст остаётся String.
5. **Явное предпочтительнее хитрого.** `::` многословен намеренно —
   редкий случай, когда нужен литерал, должен быть и тем, что стоит
   лишних символов, а не повседневным случаем.

Предложение, жертвующее любым из этих принципов, требует
соразмерно большого обоснования.

## Версионирование, конкретно

```
x . y . z
│   │   └── PATCH — editorial; parsers unaffected
│   └────── MINOR — additive; old docs still valid
└────────── MAJOR — breaking
```

- `versions/<x>.<y>/` — источник истины для данной версии.
- `CHANGELOG.md` в корне репозитория отслеживает историю по всем версиям.
- `versions.ktav` — машиночитаемый индекс.
- Каждый релиз помечается git-тегом с **полной**
  `MAJOR.MINOR.PATCH`: `v0.1.0`, `v0.1.1`, `v0.2.0`, … Имя директории
  (`versions/0.1/`) опускает PATCH по соглашению — PATCH-бамп
  обновляет ту же директорию, а не создаёт соседнюю, — но везде в
  остальных местах version string остаётся трёхсоставной.

## Подача

1. Fork, ветка, коммит с описательным сообщением (английский или
   русский оба принимаются).
2. Если изменение затрагивает `versions/<v>/`, обновите версию в
   заголовке и добавьте запись в `CHANGELOG.md` под правильным
   разделом.
3. Добавьте conformance-тест в `versions/<v>/tests/` — либо в
   `valid/` (новая форма парсится корректно), либо в `invalid/`
   (новое ограничение отклоняет правильный вход). Один тест — одна
   концепция.
4. Откройте PR со ссылкой на issue (для аддитивных/ломающих
   изменений). Редакторским PR предварительный issue не нужен.
5. CI в нижележащих реализациях проверит, что парсер по-прежнему
   согласуется с обновлённым набором тестов.

## Ревью

Майнтейнеры смотрят:

- Проходит ли изменение пять принципов выше?
- Есть ли тест, который падал бы при неправильной реализации?
- Правило из одного предложения — действительно одно предложение?
- Хорошо ли читается пример вне контекста?

Маленькие хирургические PR мержатся быстро. Большие рефакторинги
текста спецификации «раз уж я здесь» отклоняются — разбивайте их.

## Языковая политика

Организация `ktav-lang` ведёт каждый prose-документ в трёх
параллельных языках: английский (канонический), русский и
упрощённый китайский. Именование файлов:
`<name>.md` / `<name>.ru.md` / `<name>.zh.md`. Изменяя любой
prose-файл, **обновляйте все три версии в одном коммите** —
расхождение переводов это главная болячка многоязычных документов.
Если вы не владеете одним из языков, пометьте нетронутые файлы
комментарием `<!-- TODO: sync with <name>.md -->` в начале и
откройте PR как есть; мейнтейнер или участник сообщества закроет
пробел до мерджа.

`versions/<v>/spec.md` нормативен на английском; переводы RU / ZH —
**информативные** (полезны не-англоязычным читателям, но не
авторитетный источник). Ключевые слова RFC 2119 (MUST, SHOULD, MAY,
…) сохраняются в английских капсах во всех переводах — это
технические термины.

Полная политика — в org-level
[`.github/AGENTS.md`](https://github.com/ktav-lang/.github/blob/main/AGENTS.md).

## Лицензия

Внося вклад, вы соглашаетесь, что ваш вклад лицензируется под
двойной лицензией **MIT OR Apache-2.0** по выбору пользователя, так же
как и остальная часть репозитория.
>>>>> lang=zh
# 为 Ktav 做贡献

**Languages:** [English](CONTRIBUTING.md) · [Русский](CONTRIBUTING.ru.md) · **简体中文**

感谢关注。Ktav 是一份有意保持克制的小格式——接纳改动的门槛被
刻意抬高，而这道门槛**不是**「这个特性要是有就好了」。门槛是：
**这个改动是否让 Ktav 更小、更简单或更自洽？**

本文涵盖：(1) 什么应当进入规范，(2) 什么不应，(3) 版本与发布流程
是怎样运作的，以及 (4) 如何提交。

## 属于这里的内容

本仓库就是格式本身。进入仓库的改动分为三类：

### 1. 编辑性——`PATCH` 递进

不改变符合规范的解析器行为的修订：错字、重写的段落、更清楚的示例、
更好的测试命名、新的*一致性*测试（针对已有规则的新角度——而非新
规则）。

直接提 PR。提交信息一行概括，同时更新 `versions/<v>/spec.md` 头部
的版本号以及 `CHANGELOG.md`。

### 2. 新增性——`MINOR` 递进

向后兼容的扩展：一个新关键字、一种新的原始形式、一种新的多行字符串
变体——旧解析器会拒绝它，但缺失它不会破坏既有文档。

请先开 issue。该 issue 必须按顺序回答：

1. **它让用户能做哪些现在做不到的事？** 请出示真实的配置，而非
   合成示例。
2. **代价是什么？** 每新增一条规则，都是每个实现者都必须做对的
   规则，也是每个读者都必须知道的规则。
3. **能否用现有语法表达同一件事？** 如果能，那通常才是更好的答案。

新增以新目录 `versions/<x>.(y+1)/` 发布，附带自身的规范与测试。
上一版本保持冻结——实现继续锁定到它们所支持的版本。

### 3. 破坏性——`MAJOR` 递进

会让此前有效的文档变得无效、或改变其语义的语法/语义变更。这类改动
很罕见。流程与新增性一致，另加一份迁移说明，描述改了什么、为何而改。

破坏性变更落到新目录 `versions/(x+1).0/`。旧的主要版本将永久保留
发布——面向它们的实现不会被作废。

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

1. **局部性。** 一行的语义不得依赖于文件别处或其它文件里的声明。
2. **一句话可表述。** 新规则必须能用规范里的一个句子陈述完。
   如果要写一整段，它多半其实是两条规则。
3. **对空白不敏感**（换行除外）。Ktav 是以行为单位的；列对齐
   永远不承担语义。
4. **拒绝类型魔法。** 未标记文本只要符合 § 5.2 的数值字面量规则并
   落在实现的数值域内，就分类为 Integer 或 Float，包括被接受的非规范
   拼写；域语义与 Schema 语义由消费方负责（通过 serde、Schema 或代码），
   其它文本保持为 String。
5. **显式优于机巧。** `::` 刻意冗长——那种需要字面形式的罕见场景
   才应当付出额外字符，而不是让常见场景付出代价。

若提案牺牲了其中任何一条，就需要与之相称的重大理由。

## 版本管理，具体来说

```
x . y . z
│   │   └── PATCH — editorial; parsers unaffected
│   └────── MINOR — additive; old docs still valid
└────────── MAJOR — breaking
```

- `versions/<x>.<y>/` 是该版本的权威来源。
- 仓库根目录的 `CHANGELOG.md` 贯穿记录全部版本的历史。
- `versions.ktav` 是机器可读索引。
- 每次发布都打 git 标签，采用**完整**的 `MAJOR.MINOR.PATCH`：
  `v0.1.0`、`v0.1.1`、`v0.2.0` ……目录名(`versions/0.1/`)按约定
  省略 PATCH 分量——PATCH 递进是就地更新同一目录，而非新建相邻目
  录——但其它所有地方的版本字符串仍保持三段式。

## 提交

1. Fork、开分支，提交时写出描述性 commit 信息（英文或俄文均可）。
2. 若改动涉及 `versions/<v>/`，请同步更新头部版本号，并在
   `CHANGELOG.md` 对应标题下增加一条。
3. 在 `versions/<v>/tests/` 中添加一致性测试——要么放到 `valid/`
   （新写法能被正确解析），要么放到 `invalid/`（新约束能拒绝
   对应输入）。一个测试对应一个概念。
4. 开 PR 并引用 issue（新增/破坏性变更）。编辑性 PR 不需要先开
   issue。
5. 下游实现的 CI 会核对它们的解析器与更新后的测试套件是否仍然
   一致。

## 评审

维护者会关注：

- 改动是否通过了上文的五项原则？
- 是否有一条测试，会在有人实现错误时失败？
- 「一句话规则」是否真的是一句话？
- 示例脱离上下文时是否仍然可读？

细小、精确的 PR 合入很快。顺手而为的大规模规范文本重构会被退回
——请拆开。

## 语言政策

`ktav-lang` 组织下每一份 prose 文档都以三种平行语言维护：英语
（规范源）、俄语、简体中文。文件命名规则：
`<name>.md` / `<name>.ru.md` / `<name>.zh.md`。修改任何 prose 文件时，
**请在同一次提交中更新全部三种版本** —— 翻译漂移是多语言文档的头
号失败模式。如果您不通其中某一语种，请在未动过的版本顶部留下
`<!-- TODO: sync with <name>.md -->` 标记，然后照常提交 PR；维护
者或社区贡献者会在合入前补齐。

`versions/<v>/spec.md` 以英语版为规范源（normative）；俄语 / 中文
译本为**informative** —— 对非英语读者有帮助，但不作为权威依据。
RFC 2119 关键字（MUST、SHOULD、MAY ……）在所有译本中保持英语大写
—— 它们是技术术语，不是英文单词。

完整政策见组织级别的
[`.github/AGENTS.md`](https://github.com/ktav-lang/.github/blob/main/AGENTS.md)。

## 许可证

一旦贡献,您即同意您的贡献在双重许可 **MIT OR Apache-2.0** 下发布
(由用户选择),与本仓库的其余部分相同。
