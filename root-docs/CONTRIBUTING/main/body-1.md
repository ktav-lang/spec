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

