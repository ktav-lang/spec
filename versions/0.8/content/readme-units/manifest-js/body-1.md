>>>>> lang=en
## `manifest.js`

An explicit **ordered** array of the @@UNIT_COUNT@@ folder names in true document
order. It starts `["frontmatter", "named-abstract", "sec-1", ...]` and ends
`[..., "named-appendix-d"]`. It is **never sorted alphabetically**:
`"sec-10.7"` must come after `"sec-2"`, and named sections sit at their real
document positions. The independent lock at
`scripts/locks/section-inventory.0.8.lock.json` stores one deterministic
record per manifest entry, in manifest order. Each record has exactly
`{ unit, kind, number, level, sep }`; absent structural values are `null`.
The `kind`, `number`, `level`, and `sep` values MUST match the
corresponding `meta.js` fields. Titles and body prose remain editable and are
not locked. Both files MUST be updated together when a section is intentionally
added or removed; manifest-only or hierarchy-metadata changes are rejected.

### `release.js`

`release.js` holds exactly `{ version, released }`, in that key order:
the current spec version and its release date. Like `meta.js`, the file
must be byte-identical to `export default ` +
`JSON.stringify(value, null, 2)` + one newline; any other serialization is
rejected. It is the single place the version and date are written, and it
feeds:

- the `**Version:**` / `**Date:**` lines in the frontmatter unit, via
  the `@@VERSION@@` / `@@DATE@@` token substitution described above;
- the section-inventory lock check: the builder validates the lock's
  `version` against it;
- `node scripts/build_spec.mjs` (write and `--check`) also validates that
  `versions.ktav` and the three root READMEs reference the current version
  and date exactly as `release.js` declares; any drift fails the build
  naming each disagreeing file.

>>>>> lang=ru
## `manifest.js`

Явный **упорядоченный** массив из @@UNIT_COUNT@@ имён папок в настоящем порядке
документа. Он начинается `["frontmatter", "named-abstract", "sec-1",
...]` и заканчивается `[..., "named-appendix-d"]`. Он **никогда не
сортируется по алфавиту**: `"sec-10.7"` должен идти после `"sec-2"`, а
именованные секции стоят на своих реальных позициях в документе. Независимый
lock `scripts/locks/section-inventory.0.8.lock.json` хранит по одной
детерминированной записи на элемент manifest в его порядке. Каждая запись имеет
ровно поля `{ unit, kind, number, level, sep }`; отсутствующие структурные
значения равны `null`. Значения `kind`, `number`, `level` и `sep`
MUST совпадать с соответствующими полями `meta.js`. Заголовки и текст тела
остаются редактируемыми и lock-ом не защищаются. При намеренном добавлении или
удалении секции оба файла MUST обновляться вместе; изменения только manifest
или иерархических meta-полей отвергаются.

### `release.js`

`release.js` содержит ровно `{ version, released }`, именно в этом
порядке ключей: текущую версию спецификации и дату её релиза. Как и
`meta.js`, файл должен быть байт-в-байт идентичен `export default ` +
`JSON.stringify(value, null, 2)` + один перевод строки; любая иная
сериализация отвергается. Это единственное место, где записаны версия и
дата; они питают:

- строки `**Version:**` / `**Date:**` юнита frontmatter — через
  подстановку токенов `@@VERSION@@` / `@@DATE@@`, описанную выше;
- проверку section-inventory lock: Builder сверяет `version` lock-а с ним;
- `node scripts/build_spec.mjs` (write и `--check`) также
  проверяет, что `versions.ktav` и три корневых README ссылаются на
  текущие версию и дату в точности как объявляет `release.js`; любое
  расхождение валит сборку, называя каждый расходящийся файл.

>>>>> lang=zh
## `manifest.js`

按真实文档顺序排列的 @@UNIT_COUNT@@ 个文件夹名的显式**有序**数组。它以
`["frontmatter", "named-abstract", "sec-1", ...]` 开头,以
`[..., "named-appendix-d"]` 结尾。它**绝不按字母序排序**:
`"sec-10.7"` 必须排在 `"sec-2"` 之后,命名节也处于它们在文档中的
真实位置。独立的 lock `scripts/locks/section-inventory.0.8.lock.json`
按 manifest 顺序为每个单元保存一条确定性的结构记录。每条记录严格包含
`{ unit, kind, number, level, sep }`;缺少的结构值使用 `null`。
`kind`、`number`、`level` 和 `sep` MUST 与对应的 `meta.js`
字段一致。标题文字和正文仍可编辑,不受 lock 保护。有意新增或删除章节时,
两个文件 MUST 同时更新;仅修改 manifest 或层级 meta 字段会被拒绝。

### `release.js`

`release.js` 恰好包含 `{ version, released }`,且键序正是如此:当前
规范版本号及其发布日期。与 `meta.js` 一样,该文件必须与 `export default `
+ `JSON.stringify(value, null, 2)` + 一个换行逐字节一致;任何其他序列化
都会被拒绝。它是唯一写有版本号与日期的地方,并供给:

- frontmatter 单元的 `**Version:**` / `**Date:**` 行——通过上文描述的
  `@@VERSION@@` / `@@DATE@@` 令牌替换;
- section-inventory lock 检查:Builder 用它校验 lock 的 `version`;
- `node scripts/build_spec.mjs`（write 与 `--check`）还会校验
  `versions.ktav` 与三个根目录 README 对当前版本和日期的引用与
  `release.js` 声明完全一致;任何漂移都会使构建失败,并逐个指出
  不一致的文件。

