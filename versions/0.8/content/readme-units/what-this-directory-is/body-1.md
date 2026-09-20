>>>>> lang=en
## What this directory is

This directory is the **per-section source of truth** for
`versions/0.8/spec.md`, `versions/0.8/spec.ru.md`, and
`versions/0.8/spec.zh.md`.

- The three `.md` files at `versions/0.8/` are **generated artifacts**. They
  remain committed in the repo so the spec is directly readable on GitHub,
  but they must **never be hand-edited**: a hand edit is overwritten by the
  next build and makes `node scripts/build_spec.mjs --check` fail.
- The **content units** in this directory (one folder per section) are what
  humans edit.
- `scripts/check_translation_parity.py` continues to run against the
  generated `.md` files as an after-the-fact structural gate;
  `node scripts/build_spec.mjs --check` is the byte-exact gate.

>>>>> lang=ru
## Что это за директория

Эта директория — **источник истины по секциям** для
`versions/0.8/spec.md`, `versions/0.8/spec.ru.md` и
`versions/0.8/spec.zh.md`.

- Три файла `.md` в `versions/0.8/` — **сгенерированные артефакты**. Они
  остаются в репозитории, чтобы спецификацию можно было читать на GitHub
  напрямую, но их **нельзя редактировать вручную**: ручная правка будет
  перезаписана следующей сборкой и уронит
  `node scripts/build_spec.mjs --check`.
- **Юниты контента** в этой директории (одна папка на секцию) — то, что
  редактируют люди.
- `scripts/check_translation_parity.py` продолжает прогоняться по
  сгенерированным файлам `.md` как последующий структурный гейт;
  `node scripts/build_spec.mjs --check` — гейт точности байт-в-байт.

>>>>> lang=zh
## 这个目录是什么

本目录是 `versions/0.8/spec.md`、`versions/0.8/spec.ru.md` 与
`versions/0.8/spec.zh.md` 的**逐节来源(源头)**。

- `versions/0.8/` 下的三个 `.md` 文件是**生成的构件**。它们仍保留在
  仓库中,以便在 GitHub 上直接阅读规范,但**切勿手动编辑**:手工
  改动会被下一次构建覆盖,并使 `node scripts/build_spec.mjs --check`
  失败。
- 本目录中的**内容单元**(每节一个文件夹)才是人来编辑的对象。
- `scripts/check_translation_parity.py` 仍继续对生成的 `.md` 文件
  运行,作为事后结构关卡;`node scripts/build_spec.mjs --check` 才是
  逐字节关卡。

