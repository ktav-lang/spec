>>>>> lang=en
# Ktav Specification Changelog

**Languages:** **English** · [Русский](CHANGELOG.ru.md) · [简体中文](CHANGELOG.zh.md)

History of the format specification across all versions. The format is
hosted in this repository under [`versions/`](versions/); each version
is a self-contained directory with its own `spec.md` and `tests/`.

Versions follow `MAJOR.MINOR.PATCH`:

- `PATCH` — editorial (typo fixes, clarifications).
- `MINOR` — backward-compatible extensions.
- `MAJOR` — breaking changes.

**Pre-1.0 exception:** while `MAJOR` is `0`, a `MINOR` bump MAY carry
a breaking change instead of requiring a `MAJOR` bump (0.7.0 does
this over 0.6.x). Once the format reaches `1.0`, breaking changes
strictly require a `MAJOR` bump as stated above.

See the repository [`README.md`](README.md) for current `stable` and
`latest` pointers, or [`versions.ktav`](versions.ktav) for the
machine-readable index.

>>>>> lang=ru
# Журнал изменений спецификации Ktav

**Languages:** [English](CHANGELOG.md) · **Русский** · [简体中文](CHANGELOG.zh.md)

История спецификации формата по всем версиям. Формат хранится в этом
репозитории в каталоге [`versions/`](versions/); каждая версия —
самодостаточная директория с собственным `spec.md` и `tests/`.

Версии следуют схеме `MAJOR.MINOR.PATCH`:

- `PATCH` — редакторские правки (исправление опечаток, уточнения).
- `MINOR` — обратно совместимые расширения.
- `MAJOR` — несовместимые изменения.

**Исключение для pre-1.0:** пока `MAJOR` равен `0`, `MINOR`-bump MAY
нести ломающее изменение вместо обязательного `MAJOR`-bump (именно
так 0.7.0 поступает относительно 0.6.x). После достижения `1.0`
ломающие изменения строго требуют `MAJOR`-bump, как указано выше.

Текущие указатели `stable` и `latest` — в [`README.md`](README.ru.md)
репозитория; машиночитаемый индекс — в [`versions.ktav`](versions.ktav).

>>>>> lang=zh
# Ktav 规范变更日志

**Languages:** [English](CHANGELOG.md) · [Русский](CHANGELOG.ru.md) · **简体中文**

记录各版本格式规范的历史。规范存放于本仓库的 [`versions/`](versions/)
目录下;每个版本为独立目录,包含各自的 `spec.md` 与 `tests/`。

版本遵循 `MAJOR.MINOR.PATCH` 方案:

- `PATCH` —— 编辑性修订(修正拼写、澄清表述)。
- `MINOR` —— 向后兼容的扩展。
- `MAJOR` —— 破坏性变更。

**pre-1.0 例外:** 当 `MAJOR` 为 `0` 时,`MINOR` 递进 MAY 携带破坏性
变更,而不必强制 `MAJOR` 递进(0.7.0 相对 0.6.x 正是如此)。一旦格式
达到 `1.0`,破坏性变更将严格要求 `MAJOR` 递进,如上所述。

当前的 `stable` 与 `latest` 指针见仓库 [`README.md`](README.zh.md);
机器可读索引见 [`versions.ktav`](versions.ktav)。

