>>>>> lang=en
## Why Ktav

| Feature                                              | JSON | YAML | TOML | Ktav |
|------------------------------------------------------|:----:|:----:|:----:|:----:|
| Bare strings (no mandatory quoting)                  |  ✗   |  ~   |  ✗   |  ✓   |
| Comma-free lists                                     |  ✗   |  ✓   |  ✓   |  ✓   |
| Whitespace-insensitive (no indentation pitfalls)     |  ✓   |  ✗   |  ✓   |  ✓   |
| Human-writable multi-line strings                    |  ✗   |  ~   |  ~   |  ✓   |
| Native comments                                      |  ✗   |  ✓   |  ✓   |  ✓   |
| Dotted keys for flat edits                           |  ✗   |  ✗   |  ✓   |  ✓   |
| One parser, small spec                               |  ✓   |  ✗   |  ~   |  ✓   |

> ✓ = feature present · ✗ = absent · ~ = partial

Ktav keeps JSON's shape (you always know what a document means) but
strips the syntax that makes JSON hostile to write by hand. It keeps
TOML's dotted keys (handy for flat edits and CLI overrides) but drops
TOML's two-dimensional table-vs-inline split.

>>>>> lang=ru
## Зачем Ktav

| Свойство                                             | JSON | YAML | TOML | Ktav |
|------------------------------------------------------|:----:|:----:|:----:|:----:|
| Строки без обязательных кавычек                      |  ✗   |  ~   |  ✗   |  ✓   |
| Списки без разделителей (никаких запятых)            |  ✗   |  ✓   |  ✓   |  ✓   |
| Нечувствительность к пробелам / отступам             |  ✓   |  ✗   |  ✓   |  ✓   |
| Удобные для человека многострочные строки            |  ✗   |  ~   |  ~   |  ✓   |
| Встроенные комментарии                               |  ✗   |  ✓   |  ✓   |  ✓   |
| Точечные ключи для плоских правок                    |  ✗   |  ✗   |  ✓   |  ✓   |
| Один парсер, небольшая спецификация                  |  ✓   |  ✗   |  ~   |  ✓   |

> ✓ = свойство есть · ✗ = нет · ~ = частично

Ktav сохраняет форму JSON (вы всегда знаете, что означает документ),
но отбрасывает синтаксис, делающий JSON враждебным для ручного
написания. Сохраняет точечные ключи TOML (удобно для плоских правок
и CLI-переопределений), но отказывается от двухмерного деления TOML
на таблицы и inline.

>>>>> lang=zh
## 为什么选 Ktav

| 特性                                           | JSON | YAML | TOML | Ktav |
|------------------------------------------------|:----:|:----:|:----:|:----:|
| 无需强制引号的裸字符串                         |  ✗   |  ~   |  ✗   |  ✓   |
| 无逗号的列表                                   |  ✗   |  ✓   |  ✓   |  ✓   |
| 空白不敏感(不存在缩进陷阱)                   |  ✓   |  ✗   |  ✓   |  ✓   |
| 便于手写的多行字符串                           |  ✗   |  ~   |  ~   |  ✓   |
| 原生注释                                       |  ✗   |  ✓   |  ✓   |  ✓   |
| 支持点分键做平铺式编辑                         |  ✗   |  ✗   |  ✓   |  ✓   |
| 单一解析器、规范精简                           |  ✓   |  ✗   |  ~   |  ✓   |

> ✓ = 具备该特性 · ✗ = 不具备 · ~ = 部分具备

Ktav 保留了 JSON 的形态（你始终清楚一个文档意味着什么），却抛弃了
令 JSON 手写起来刺眼的语法。它借鉴了 TOML 的点分键（便于平铺式编辑
与 CLI 覆盖），又摒弃了 TOML 把内容拆成表格与 inline 两种维度的做法。

