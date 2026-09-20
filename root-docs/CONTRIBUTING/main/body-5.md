>>>>> lang=en
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

>>>>> lang=ru
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

>>>>> lang=zh
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

