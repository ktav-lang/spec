>>>>> lang=en
## Conformance test suite

Every version ships a language-agnostic test suite under
[`versions/<v>/tests/`](versions/0.8/tests/). The 0.8.0 corpus
has five fixture categories (`valid/`, `invalid/`, `unrepresentable/`,
`parseable-unrepresentable/`, and `strict-lossy/`) plus one top-level
metadata file. Older corpora carry fewer — the 0.7.1 suite has only the
first four; the 0.6.4 suite, at the `v0.6.4` tag, has only `valid/` and
`invalid/`. A conformance runner MUST walk every fixture
category present in the version it targets — silently skipping one it
doesn't recognise reports false-green, which is worse than having no
fixtures for it at all.

>>>>> lang=ru
## Набор тестов соответствия

Каждая версия поставляется с языконезависимым набором тестов в
[`versions/<v>/tests/`](versions/0.8/tests/). В корпусе 0.8.0
есть пять фикстурных категорий (`valid/`, `invalid/`, `unrepresentable/`,
`parseable-unrepresentable/` и `strict-lossy/`) плюс один
верхнеуровневый файл метаданных. В более старых корпусах категорий
меньше — в наборе 0.7.1 есть только первые четыре; в наборе 0.6.4,
доступном по тегу `v0.6.4`, есть только `valid/` и `invalid/`. Runner
соответствия MUST обходить каждую фикстурную категорию, присутствующую в
целевой версии — молчаливый пропуск незнакомой категории даёт ложно-зелёный
результат, что хуже, чем полное отсутствие фикстур для неё.

>>>>> lang=zh
## 一致性测试套件

每个版本都附带一份与语言无关的测试套件，位于
[`versions/<v>/tests/`](versions/0.8/tests/)。0.8.0 语料库有五个
fixture 类别(`valid/`、`invalid/`、`unrepresentable/`、
`parseable-unrepresentable/` 和 `strict-lossy/`)外加一个顶层元数据
文件。更早的语料库类别更少——0.7.1 套件只有前四个;位于 `v0.6.4`
标签的 0.6.4 套件只有 `valid/` 与 `invalid/`。
一致性 runner MUST 遍历目标版本中
存在的每个 fixture 类别——静默跳过不认识的类别会得到假绿色结果,比该
类别完全没有 fixture 还糟。

