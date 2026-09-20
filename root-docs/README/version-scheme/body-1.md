>>>>> lang=en
## Version scheme

Spec versions use `MAJOR.MINOR.PATCH`:

| Bump              | Means                                                                                        |
|-------------------|----------------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)` | Editorial — typo fixes, clarifications; conforming implementations are unaffected.           |
| `x.y → x.(y+1)`   | Backward-compatible extension (new keyword, new primitive form).                             |
| `x.y → (x+1).0`   | Breaking change in grammar or semantics.                                                     |

**Pre-1.0 exception:** while `MAJOR` is `0`, a `MINOR` bump MAY carry
a breaking change instead of requiring a `MAJOR` bump (0.7.0 does
this over 0.6.x). Once the format reaches `1.0`, breaking changes
strictly require a `MAJOR` bump as the table states.

Within any stable `MAJOR`, an implementation targeting `x.0` MUST
parse every document valid under any later `x.y.z` identically up to
the subset it supports — except across a pre-1.0 breaking `MINOR`
bump per the exception above, where this guarantee does not hold.

Each version's directory is fully self-contained: `spec.md`, a
`tests/` conformance suite, and per-version addenda. Implementations
pin to a version directory by path.

>>>>> lang=ru
## Схема версионирования

Версии спецификации используют `MAJOR.MINOR.PATCH`:

| Bump              | Смысл                                                                                              |
|-------------------|----------------------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)` | Редакторский — исправления опечаток, уточнения; соответствующие реализации не затрагиваются.       |
| `x.y → x.(y+1)`   | Обратно совместимое расширение (новое ключевое слово, новая примитивная форма).                    |
| `x.y → (x+1).0`   | Ломающее изменение грамматики или семантики.                                                       |

**Исключение для pre-1.0:** пока `MAJOR` равен `0`, `MINOR`-bump MAY
нести ломающее изменение вместо обязательного `MAJOR`-bump (именно
так 0.7.0 поступает относительно 0.6.x). После достижения `1.0`
ломающие изменения строго требуют `MAJOR`-bump, как указано в
таблице.

Внутри любого стабильного `MAJOR` реализация, ориентированная на
`x.0`, MUST разбирать каждый документ, валидный при любом более
позднем `x.y.z`, идентично — в пределах подмножества, которое она
поддерживает, — кроме pre-1.0 ломающего `MINOR`-bump из исключения
выше, на который эта гарантия не распространяется.

Директория каждой версии полностью самодостаточна: `spec.md`, набор
соответствия `tests/` и добавления по версиям. Реализации
привязываются к директории версии по пути.

>>>>> lang=zh
## 版本方案

规范版本采用 `MAJOR.MINOR.PATCH`：

| 递进                | 含义                                                                                   |
|---------------------|----------------------------------------------------------------------------------------|
| `x.y → x.y.(z+1)`   | 编辑性——错字修正、措辞澄清；符合规范的实现不受影响。                                   |
| `x.y → x.(y+1)`     | 向后兼容的扩展（新关键字、新的原始形式）。                                             |
| `x.y → (x+1).0`     | 语法或语义上的破坏性变更。                                                             |

**pre-1.0 例外：** 当 `MAJOR` 为 `0` 时，`MINOR` 递进 MAY 携带
破坏性变更，而不必强制 `MAJOR` 递进(0.7.0 相对 0.6.x 正是如此）。
一旦格式达到 `1.0`，破坏性变更将严格要求 `MAJOR` 递进，如上表
所述。

在任一稳定 `MAJOR` 内，面向 `x.0` 的实现 MUST 将任何在更晚 `x.y.z`
下有效的文档解析为与其支持子集等价的结果 —— 但上述 pre-1.0 例外
所允许的破坏性 `MINOR` 递进除外，此保证不跨此类递进成立。

每个版本的目录完全自包含：`spec.md`、一致性套件 `tests/` 以及该版本
专属的增补。实现按路径锁定到具体版本目录。

