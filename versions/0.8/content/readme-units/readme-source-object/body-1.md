>>>>> lang=en
## README source object

`README.source.md` has the same narrow static template-object shape as a body
part: exactly `en`, `ru`, and `zh`, with no executable code. Its three strings
are the sole source for the three README files. The generated files are still
committed for browsing, but hand-editing any one of them makes `--check` fail.

>>>>> lang=ru
## Исходный объект README

`README.source.md` — единый source object `{ en, ru, zh }` для трёх README в
этой директории. Builder статически проверяет его и генерирует из него
`README.md`, `README.ru.md` и `README.zh.md`; ручное изменение любого README
делает `--check` ошибочным.

>>>>> lang=zh
## README 源对象

`README.source.md` 是本目录三个 README 共用的 `{ en, ru, zh }` source
object。Builder 会静态检查它并据此生成 `README.md`、`README.ru.md` 和
`README.zh.md`;手动修改任何一个 README 都会使 `--check` 失败。

