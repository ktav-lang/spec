>>>>> lang=en
## History / bootstrap

This layout was created by a one-time mechanical migration, recorded in
`scripts/archive/extract_content_units.py`: it sliced the then-current
three `.md` files into units by line-range byte-slicing (no text was
retyped) and verified byte-identical reconstruction. It was later extended
to emit the current `body-*.md` schema directly — `meta.js` with
`bodyParts` plus `body-1..N` per unit. The script is kept for provenance
only, not as a routine tool: it refuses to overwrite an existing
`content/` and has no override flag. Rebuilding from scratch means
manually deleting `content/` first as a separate, deliberate action. The
**ongoing** workflow is the opposite direction: edit units, then
`build_spec.mjs` regenerates the `.md` files.

>>>>> lang=ru
## История / бутстрап

Эта структура была создана одноразовой механической миграцией,
записанной в `scripts/archive/extract_content_units.py`: она нарезала
три тогдашних файла `.md` на юниты побайтовым нарезанием по диапазонам
строк (никакой текст не перенабирался) и проверила байт-в-байт
идентичную реконструкцию. Позднее скрипт был расширен, чтобы выдавать
сразу текущую схему `body-*.md` — `meta.js` с `bodyParts` плюс
`body-1..N` на юнит. Скрипт сохранён только для происхождения, не как
штатный инструмент: он отказывается перезаписывать существующий
`content/` и не имеет флага переопределения. Пересборка с нуля означает
ручное удаление `content/` первым, отдельным осознанным действием.
**Текущий** рабочий процесс — обратное направление: правите юниты, и
`build_spec.mjs` регенерирует файлы `.md`.

>>>>> lang=zh
## 历史 / 引导

这套布局由一次性的机械迁移创建,记录在
`scripts/archive/extract_content_units.py` 中:它按行范围逐字节切分
当时的三个 `.md` 文件成单元(未重新键入任何文本),并验证了重建
结果逐字节一致。后来该脚本被扩展为直接生成当前的 `body-*.md` 模式
——每个单元有带 `bodyParts` 的 `meta.js` 加 `body-1..N`。该脚本
仅作为出处留档,不是常规工具:它拒绝覆盖已存在的 `content/`,且
没有覆盖标志。从零重建意味着先手动删除 `content/`,作为单独的、
有意的动作。**日常**工作流是反方向:编辑单元,然后由
`build_spec.mjs` 重新生成 `.md` 文件。

