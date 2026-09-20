>>>>> lang=en
`node --test scripts/test_build_spec.mjs` runs the builder's adversarial
(negative-path) test suite: it feeds deliberately malformed content trees
to the validator and asserts each closed-world invariant documented in
this README is rejected.

Recommended workflow: edit unit files -> run `node scripts/build_spec.mjs`
-> verify `git diff` on the three `.md` files shows exactly what you
intended -> run `python scripts/check_translation_parity.py versions/0.8/spec.md versions/0.8/spec.ru.md versions/0.8/spec.zh.md` -> commit the unit
changes and the regenerated `.md` files **together**.

>>>>> lang=ru
Рекомендуемый рабочий процесс: правите файлы юнитов -> запускаете
`node scripts/build_spec.mjs` -> проверяете по `git diff`, что изменения
трёх файлов `.md` — ровно то, что вы имели в виду -> запускаете
`python scripts/check_translation_parity.py versions/0.8/spec.md versions/0.8/spec.ru.md versions/0.8/spec.zh.md` -> коммитите изменения юнитов и
регенерированные файлы `.md` **вместе**.

>>>>> lang=zh
推荐工作流:编辑单元文件 -> 运行 `node scripts/build_spec.mjs` ->
核对三个 `.md` 文件的 `git diff` 是否与你的意图完全一致 -> 运行
`python scripts/check_translation_parity.py versions/0.8/spec.md versions/0.8/spec.ru.md versions/0.8/spec.zh.md` -> 把单元改动与重新生成的
`.md` 文件**一起**提交。

