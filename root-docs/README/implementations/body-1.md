>>>>> lang=en
## Implementations

| Language       | Repo                                                  | Install                                              |
|----------------|-------------------------------------------------------|------------------------------------------------------|
| Rust (reference) | [`ktav-lang/rust`](https://github.com/ktav-lang/rust) | `cargo add ktav`                                     |
| C# / .NET      | [`ktav-lang/csharp`](https://github.com/ktav-lang/csharp) | `dotnet add package Ktav`                        |
| Go             | [`ktav-lang/golang`](https://github.com/ktav-lang/golang) | `go get github.com/ktav-lang/golang`             |
| Java / JVM     | [`ktav-lang/java`](https://github.com/ktav-lang/java) | GitHub Releases (Maven Central pending)              |
| JS / TS        | [`ktav-lang/js`](https://github.com/ktav-lang/js)     | `npm install @ktav-lang/ktav`                        |
| PHP            | [`ktav-lang/php`](https://github.com/ktav-lang/php)   | `composer require ktav-lang/ktav`                    |
| Python         | [`ktav-lang/python`](https://github.com/ktav-lang/python) | `pip install ktav`                                |

The Rust crate is the reference parser, and every binding embeds that
same core. Go, Java, PHP and C# consume it through a prebuilt
`ktav_cabi` (the C ABI wrapper), whose function surface has grown
additively across releases — 0.6.4 added `ktav_loads_strict`
alongside the existing functions. Python ships a dedicated PyO3
native extension rather than the C ABI, and JS ships several
runtime-specific artifacts — WASM for browsers, N-API for Node, plus
a C ABI path — instead of a single binding shape. All of them parse
whatever format version the underlying Rust core supports (currently
0.8.0 stable); the language-agnostic `tests/` suite below runs
against all of them on every release.

Building a new implementation? Start with your target version's
[`spec.md`](versions/0.8/spec.md) (section 8 — Compliance) and run
the [`tests/`](versions/0.8/tests/) suite against your parser.

>>>>> lang=ru
## Реализации

| Язык             | Репозиторий                                             | Установка                                            |
|------------------|---------------------------------------------------------|------------------------------------------------------|
| Rust (эталонная) | [`ktav-lang/rust`](https://github.com/ktav-lang/rust)   | `cargo add ktav`                                     |
| C# / .NET        | [`ktav-lang/csharp`](https://github.com/ktav-lang/csharp) | `dotnet add package Ktav`                          |
| Go               | [`ktav-lang/golang`](https://github.com/ktav-lang/golang) | `go get github.com/ktav-lang/golang`               |
| Java / JVM       | [`ktav-lang/java`](https://github.com/ktav-lang/java)   | GitHub Releases (публикация в Maven Central запланирована) |
| JS / TS          | [`ktav-lang/js`](https://github.com/ktav-lang/js)       | `npm install @ktav-lang/ktav`                        |
| PHP              | [`ktav-lang/php`](https://github.com/ktav-lang/php)     | `composer require ktav-lang/ktav`                    |
| Python           | [`ktav-lang/python`](https://github.com/ktav-lang/python) | `pip install ktav`                                 |

Rust crate — эталонный парсер, и каждый биндинг встраивает то же
ядро. Go, Java, PHP и C# потребляют его через сборку `ktav_cabi`
(C-ABI обёртка), набор функций которой растёт аддитивно от релиза к
релизу — в 0.6.4 добавлена `ktav_loads_strict` рядом с уже
существовавшими функциями. Python поставляет выделенное нативное
расширение на PyO3 вместо C ABI, а JS — несколько артефактов под
конкретные среды: WASM для браузеров, N-API для Node и вдобавок путь
через C ABI. Все они разбирают ту версию формата, которую
поддерживает ядро Rust (сейчас — стабильная 0.8.0); language-agnostic
набор `tests/` ниже прогоняется на всех из них при каждом релизе.

Строите новую реализацию? Начните со `spec.md` целевой версии
([`spec.ru.md`](versions/0.8/spec.ru.md), раздел 8 — Compliance)
и прогоните набор [`tests/`](versions/0.8/tests/) через свой парсер.

>>>>> lang=zh
## 实现

| 语言            | 仓库                                                    | 安装                                                  |
|-----------------|---------------------------------------------------------|-------------------------------------------------------|
| Rust(参考)    | [`ktav-lang/rust`](https://github.com/ktav-lang/rust)   | `cargo add ktav`                                      |
| C# / .NET       | [`ktav-lang/csharp`](https://github.com/ktav-lang/csharp) | `dotnet add package Ktav`                          |
| Go              | [`ktav-lang/golang`](https://github.com/ktav-lang/golang) | `go get github.com/ktav-lang/golang`               |
| Java / JVM      | [`ktav-lang/java`](https://github.com/ktav-lang/java)   | GitHub Releases（Maven Central 已规划）              |
| JS / TS         | [`ktav-lang/js`](https://github.com/ktav-lang/js)       | `npm install @ktav-lang/ktav`                         |
| PHP             | [`ktav-lang/php`](https://github.com/ktav-lang/php)     | `composer require ktav-lang/ktav`                     |
| Python          | [`ktav-lang/python`](https://github.com/ktav-lang/python) | `pip install ktav`                                  |

Rust crate 是参考解析器,每个绑定内嵌的都是同一个核心。Go、Java、
PHP 和 C# 通过预构建的 `ktav_cabi`(C-ABI 包装)使用它,其函数接口
在各版本间只做增量式扩展——0.6.4 新增了 `ktav_loads_strict`,已有
函数的签名保持不变。Python 附带专用的 PyO3 原生扩展而非 C ABI;
JS 则为不同运行时提供多种构件——浏览器用 WASM、Node 用 N-API,
另有 C ABI 路径——而非单一的绑定形态。它们解析的都是底层 Rust
核心所支持的格式版本(当前为稳定版 0.8.0);
下面与语言无关的
`tests/` 套件每次发布时都会针对所有实现运行。

打算写新实现?请先读目标版本的 `spec.md`
([`spec.zh.md`](versions/0.8/spec.zh.md) 的第 8 节 Compliance),
再让 [`tests/`](versions/0.8/tests/) 套件跑过你的解析器。

