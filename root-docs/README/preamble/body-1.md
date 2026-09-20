>>>>> lang=en
# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** **English** · [Русский](README.ru.md) · [简体中文](README.zh.md)

> **Version scope:** the feature overview and examples in this README follow
> Ktav 0.8.0, the current stable specification. Implementations still
> targeting 0.7.1 should read
> [`versions/0.7/spec.md`](versions/0.7/spec.md), still carried in the
> working tree; what changed between them is scoped in
> [Appendix E of the 0.8.0 specification](versions/0.8/spec.md).

**Playground:** convert JSON / YAML / TOML / INI ⇄ Ktav in your browser at **[ktav-lang.github.io](https://ktav-lang.github.io/)**.

> A plain configuration format. JSON-shape — scalars, arrays, objects,
> `null`, `true`, `false` — with none of JSON's punctuation in the
> common case: no quotes around strings, no commas outside one-line
> inline compounds, and a closed 14-entry escape table for literal bytes
> and explicit scalar classification. Dotted keys for nesting, visible
> opt-in markers for literal and multi-line strings.

This repository is the **canonical specification** of the Ktav format.
Implementations in any programming language are expected to conform to
the version they target.

>>>>> lang=ru
# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** [English](README.md) · **Русский** · [简体中文](README.zh.md)

> **Область версии:** обзор возможностей и примеры в этом README
> следуют Ktav 0.8.0 — текущей стабильной спецификации. Реализациям,
> всё ещё нацеленным на 0.7.1, следует читать
> [`versions/0.7/spec.ru.md`](versions/0.7/spec.ru.md) — он всё ещё
> лежит в рабочем дереве; что изменилось между ними —
> описано в [Приложении E спецификации 0.8.0](versions/0.8/spec.ru.md).

**Песочница:** конвертация JSON / YAML / TOML / INI ⇄ Ktav прямо в браузере — **[ktav-lang.github.io](https://ktav-lang.github.io/)**.

> Простой формат конфигурации. Форма JSON — скаляры, массивы, объекты,
> `null`, `true`, `false` — без пунктуации JSON в обычном случае:
> без кавычек вокруг строк; запятые — только внутри однострочных
> inline-составных, а замкнутая таблица из 14 escape-последовательностей
> задаёт литеральные байты и явную классификацию скаляра.
> Точечные ключи для вложенности, видимые явные маркеры для литеральных
> и многострочных строк.

Этот репозиторий — **каноническая спецификация** формата Ktav.
Реализации на любом языке программирования должны соответствовать
той версии, на которую они ориентированы.

>>>>> lang=zh
# Ktav (כְּתָב)

[![Spec](https://img.shields.io/github/v/tag/ktav-lang/spec?style=flat-square&sort=semver&label=spec&color=7c3aed)](https://github.com/ktav-lang/spec/tags)
![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue?style=flat-square)
[![Playground](https://img.shields.io/badge/playground-try%20online-7c3aed?style=flat-square&logo=rocket&logoColor=white)](https://ktav-lang.github.io/)

**Languages:** [English](README.md) · [Русский](README.ru.md) · **简体中文**

> **版本范围:** 本 README 的功能概览与示例遵循当前稳定规范 Ktav
> 0.8.0。仍以 0.7.1 为目标的实现请阅读
> [`versions/0.7/spec.zh.md`](versions/0.7/spec.zh.md)——它仍保留在
> 工作树中;两者之间的差异范围见
> [0.8.0 规范附录 E](versions/0.8/spec.zh.md)。

**演练场：** 在浏览器中互转 JSON / YAML / TOML / INI ⇄ Ktav — **[ktav-lang.github.io](https://ktav-lang.github.io/)**。

> 一种朴素的配置格式。沿用 JSON 的形态——标量、数组、对象、
> `null`、`true`、`false`——但不带 JSON 的任何标点。常见情形下
> 不用逗号、不用引号：逗号只出现在单行 inline 复合值内作分隔符，
> 封闭的 14 项转义表用于字面字节与显式的标量分类。以点分键
> 表达嵌套，以显式的可见标记声明字面字符串和多行字符串。

本仓库是 Ktav 格式的**规范正文**。任何编程语言的实现都应当符合
其所针对的版本。

