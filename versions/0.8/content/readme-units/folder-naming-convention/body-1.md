>>>>> lang=en
## Folder naming convention

- **Numbered sections**: `sec-<number>`, where `<number>` is the exact
  section number as it appears in the heading: `sec-1`, `sec-5.3.3`.
- **Unnumbered sections** (level >= 2 headings without a number):
  `named-<slug>`. The slug is derived from the **English heading text only**
  (so it is language-independent):
  1. cut at the first `.` if present ("Appendix A. Changes" -> "Appendix A");
  2. lowercase;
  3. replace every run of characters outside `[a-z0-9]` with a single `-`;
  4. trim leading/trailing `-`.

  Examples: "Abstract" -> `abstract`; "Appendix D. Migration from 0.6.x" ->
  `appendix-d`.
- **`frontmatter/`** is the special unit holding everything before the first
  section heading: the h1 title line, the `**Languages:**` / `**Version:**` /
  `**Date:**` field block, and — in the `ru`/`zh` body strings only — the
  informative-translation disclaimer blockquote. The h1 title lives **inside**
  the frontmatter body content, verbatim; `frontmatter` has no heading of its
  own.

>>>>> lang=ru
## Соглашение об именовании папок

- **Нумерованные секции**: `sec-<number>`, где `<number>` — точный номер
  секции, как он стоит в заголовке: `sec-1`, `sec-5.3.3`.
- **Ненумерованные секции** (заголовки уровня >= 2 без номера):
  `named-<slug>`. Слаг выводится **только из английского текста
  заголовка** (то есть не зависит от языка):
  1. отсечь на первой `.`, если есть ("Appendix A. Changes" ->
     "Appendix A");
  2. нижний регистр;
  3. заменить каждую серию символов вне `[a-z0-9]` одним `-`;
  4. обрезать `-` по краям.

  Примеры: "Abstract" -> `abstract`; "Appendix D. Migration from 0.6.x" ->
  `appendix-d`.
- **`frontmatter/`** — специальный юнит, хранящий всё до первого
  заголовка секции: строку заголовка h1, блок полей `**Languages:**` /
  `**Version:**` / `**Date:**` и — только в строках `ru`/`zh` тела —
  информационную цитату-дисклеймер о переводе. Заголовок h1 лежит
  **внутри** содержимого тела frontmatter, дословно; у самого
  `frontmatter` своего заголовка нет.

>>>>> lang=zh
## 文件夹命名约定

- **带编号的节**:`sec-<number>`,其中 `<number>` 是标题中出现的
  确切节号:`sec-1`、`sec-5.3.3`。
- **不带编号的节**(没有编号的 >= 2 级标题):`named-<slug>`。slug
  **仅由英文标题文本**派生(因此与语言无关):
  1. 如有 `.`,在第一个 `.` 处截断("Appendix A. Changes" ->
     "Appendix A");
  2. 转小写;
  3. 把每一段 `[a-z0-9]` 之外的连续字符替换为单个 `-`;
  4. 去除首尾的 `-`。

  例:"Abstract" -> `abstract`;"Appendix D. Migration from 0.6.x" ->
  `appendix-d`。
- **`frontmatter/`** 是特殊单元,保存第一个节标题之前的全部内容:
  h1 标题行、`**Languages:**` / `**Version:**` / `**Date:**` 字段块,
  以及——仅在 `ru`/`zh` 正文串中——关于译文的信息性免责声明
  blockquote。h1 标题**位于**frontmatter 正文内容之内,原样保留;
  `frontmatter` 自身没有标题。

