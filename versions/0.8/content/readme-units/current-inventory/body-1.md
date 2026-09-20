>>>>> lang=en
## Current inventory

@@UNIT_COUNT@@ units: 1 `frontmatter/`, @@NUMBERED_UNIT_COUNT@@ numbered `sec-<number>/` (`sec-1`,
`sec-3.1`, `sec-5.3.3`, `sec-10.7`), and @@NAMED_UNIT_COUNT@@ named `named-<slug>/`
(`named-abstract`, `named-appendix-a` .. `named-appendix-d`). Plus:

- `scripts/locks/section-inventory.0.8.lock.json` is an independent,
  versioned ordered inventory. The builder requires it in normal CLI runs
  and rejects manifest order or membership drift against it.
- `README.source.md` is the single `{ en, ru, zh }` source object for the
  three README files in this directory. The builder statically validates it
  and generates `README.md`, `README.ru.md`, and `README.zh.md` from it.
- `release.js` is the single release declaration: `version` + `released`
  (see below). It has the same canonical `export default` + JSON shape as
  `meta.js` and is the one place the current version and release date are
  written.
- `manifest.js` — the ordered list of units (see below).
- `package.json` — `{"type":"module"}`. Historical: it was required back when
  `build_spec.mjs` dynamically imported `meta.js`/`body-*.md` as ES modules.
  Since the closed-world hardening that stopped executing any content source
  (nothing under `content/` is ever dynamic-`import()`ed anymore — `manifest.js`
  and `meta.js` are read as UTF-8 text and `JSON.parse`d, `body-*.md` is
  statically shape-scanned and decoded), this file is no longer functionally
  required, but is kept in place and still allowed at the top level.

>>>>> lang=ru
## Текущий состав

@@UNIT_COUNT@@ юнитов: 1 `frontmatter/`, @@NUMBERED_UNIT_COUNT@@ нумерованных `sec-<number>/` (`sec-1`,
`sec-3.1`, `sec-5.3.3`, `sec-10.7`) и @@NAMED_UNIT_COUNT@@ именованных `named-<slug>/`
(`named-abstract`, `named-appendix-a` .. `named-appendix-d`). Плюс:

- `scripts/locks/section-inventory.0.8.lock.json` — независимый
  версионированный упорядоченный inventory. Builder требует его при обычном
  CLI-запуске и отвергает расхождение состава или порядка с manifest.
- `README.source.md` — единый source object `{ en, ru, zh }` для трёх README
  этой директории. Builder статически проверяет его и генерирует
  `README.md`, `README.ru.md` и `README.zh.md`.
- `release.js` — единственное объявление релиза: `version` + `released`
  (см. ниже). У него та же каноническая форма `export default` + JSON, что
  и у `meta.js`, и это единственное место, где записаны текущие версия и
  дата релиза.
- `manifest.js` — упорядоченный список юнитов (см. ниже).
- `package.json` — `{"type":"module"}`. Исторически: был нужен, пока
  `build_spec.mjs` динамически импортировал `meta.js`/`body-*.md` как
  ES-модули. После закрытия closed-world (ничего под `content/` больше не
  исполняется — `manifest.js` и `meta.js` читаются как UTF-8-текст и
  разбираются через `JSON.parse`, `body-*.md` статически сканируется и
  декодируется), файл функционально больше не обязателен, но оставлен на
  месте и по-прежнему разрешён на верхнем уровне.

>>>>> lang=zh
## 当前清单

共 @@UNIT_COUNT@@ 个单元:1 个 `frontmatter/`、@@NUMBERED_UNIT_COUNT@@ 个带编号的 `sec-<number>/`
(`sec-1`、`sec-3.1`、`sec-5.3.3`、`sec-10.7`),以及 @@NAMED_UNIT_COUNT@@ 个命名的
`named-<slug>/`(`named-abstract`、`named-appendix-a` ..
`named-appendix-d`)。另有:

- `scripts/locks/section-inventory.0.8.lock.json` —— 独立的、有版本的有序
  inventory。Builder 在普通 CLI 运行中必须读取它,并拒绝与 manifest 的成员
  或顺序发生漂移。
- `README.source.md` —— 本目录三个 README 共用的 `{ en, ru, zh }` source
  object。Builder 会静态检查它并据此生成 `README.md`、`README.ru.md` 和
  `README.zh.md`。
- `release.js` —— 唯一的发布声明:`version` + `released`(见下文)。
  它与 `meta.js` 一样采用规范的 `export default` + JSON 形态,是唯一
  写有当前版本号与发布日期的地方。
- `manifest.js` —— 单元的有序列表(见下文)。
- `package.json` —— `{"type":"module"}`。历史遗留:曾用于
  `build_spec.mjs` 把 `meta.js`/`body-*.md` 当作 ES 模块动态导入的阶段。
  在完成 closed-world 加固后(`content/` 下再无任何代码被执行——
  `manifest.js` 与 `meta.js` 作为 UTF-8 文本读取并通过 `JSON.parse` 解析,
  `body-*.md` 经静态扫描后解码),此文件已不再是功能上必需的,但仍保留
  在原位,顶层仍允许它存在。

