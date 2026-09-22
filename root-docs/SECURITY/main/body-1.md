>>>>> lang=en
# Security Policy

**Languages:** **English** · [Русский](SECURITY.ru.md) · [简体中文](SECURITY.zh.md)

## Supported versions

This repository contains the **specification** of the Ktav format and
the shared conformance suite. It ships no runtime and no compiled
artefact, so "security" here is narrow: we care about spec-level
defects that let implementations **diverge in ways an attacker could
exploit downstream**.

| Version | Supported          |
|---------|--------------------|
| @@MINOR_LINE@@ | ✅ |
| earlier minor lines | ❌ — upgrade first |

Because Ktav is pre-1.0, support follows a latest-minor-only policy:
only the current @@MINOR_LINE@@ minor line is supported.

## Reporting a vulnerability

>>>>> lang=ru
# Политика безопасности

**Языки:** [English](SECURITY.md) · **Русский** · [简体中文](SECURITY.zh.md)

## Поддерживаемые версии

Этот репозиторий содержит **спецификацию** формата Ktav и общую
conformance-сьюту. Здесь нет рантайма и нет скомпилированного
артефакта, поэтому "безопасность" трактуется узко: нас интересуют
spec-дефекты, из-за которых реализации **расходятся так, что
атакующий может этим воспользоваться downstream**.

| Версия  | Поддерживается         |
|---------|------------------------|
| @@MINOR_LINE@@ | ✅ |
| более ранние minor-линии | ❌ — сперва обновитесь |

Поскольку Ktav ещё не достиг 1.0, действует политика поддержки только
последней minor-линии: поддерживается только текущая ветка @@MINOR_LINE@@.

## Сообщение об уязвимости

>>>>> lang=zh
# 安全策略

**语言:** [English](SECURITY.md) · [Русский](SECURITY.ru.md) · **简体中文**

## 支持的版本

本仓库包含 Ktav 格式**规范**与共享一致性套件。没有运行时、没有编译
产物，因此这里的"安全"范围很窄：我们关注的是会让实现**以可被
downstream 攻击者利用的方式产生分歧**的规范级缺陷。

| 版本    | 支持                   |
|---------|------------------------|
| @@MINOR_LINE@@ | ✅ |
| 更早的 minor 版本线 | ❌ —— 请先升级 |

由于 Ktav 尚未达到 1.0，支持遵循仅支持最新次版本线的政策：目前仅
支持 @@MINOR_LINE@@ 这一 minor 版本线。

## 上报漏洞

