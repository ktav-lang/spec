export default {
  en: `# versions/0.7/content/ — spec content units

**Languages:** **English** · [Русский](README.ru.md) · [简体中文](README.zh.md)

## What this directory is

This directory is the **per-section source of truth** for
\`versions/0.7/spec.md\`, \`versions/0.7/spec.ru.md\`, and
\`versions/0.7/spec.zh.md\`.

- The three \`.md\` files at \`versions/0.7/\` are **generated artifacts**. They
  remain committed in the repo so the spec is directly readable on GitHub,
  but they must **never be hand-edited**: a hand edit is overwritten by the
  next build and makes \`node scripts/build_spec.mjs --check\` fail.
- The **content units** in this directory (one folder per section) are what
  humans edit.
- \`scripts/check_translation_parity.py\` continues to run against the
  generated \`.md\` files as an after-the-fact structural gate;
  \`node scripts/build_spec.mjs --check\` is the byte-exact gate.

## Current inventory

103 units: 1 \`frontmatter/\`, 97 numbered \`sec-<number>/\` (\`sec-1\`,
\`sec-3.1\`, \`sec-5.3.3\`, \`sec-10.7\`), and 5 named \`named-<slug>/\`
(\`named-abstract\`, \`named-appendix-a\` .. \`named-appendix-d\`). Plus:

- \`scripts/locks/section-inventory.0.7.lock.json\` is an independent,
  versioned ordered inventory. The builder requires it in normal CLI runs
  and rejects manifest order or membership drift against it.
- \`README.source.js\` is the single \`{ en, ru, zh }\` source object for the
  three README files in this directory. The builder statically validates it
  and generates \`README.md\`, \`README.ru.md\`, and \`README.zh.md\` from it.
- \`manifest.js\` — the ordered list of units (see below).
- \`package.json\` — \`{"type":"module"}\`. Historical: it was required back when
  \`build_spec.mjs\` dynamically imported \`meta.js\`/\`body-*.js\` as ES modules.
  Since the closed-world hardening that stopped executing any content source
  (nothing under \`content/\` is ever dynamic-\`import()\`ed anymore — \`manifest.js\`
  and \`meta.js\` are read as UTF-8 text and \`JSON.parse\`d, \`body-*.js\` is
  statically shape-scanned and decoded), this file is no longer functionally
  required, but is kept in place and still allowed at the top level.

## Folder naming convention

- **Numbered sections**: \`sec-<number>\`, where \`<number>\` is the exact
  section number as it appears in the heading: \`sec-1\`, \`sec-5.3.3\`.
- **Unnumbered sections** (level >= 2 headings without a number):
  \`named-<slug>\`. The slug is derived from the **English heading text only**
  (so it is language-independent):
  1. cut at the first \`.\` if present ("Appendix A. Changes" -> "Appendix A");
  2. lowercase;
  3. replace every run of characters outside \`[a-z0-9]\` with a single \`-\`;
  4. trim leading/trailing \`-\`.

  Examples: "Abstract" -> \`abstract\`; "Appendix D. Migration from 0.6.x" ->
  \`appendix-d\`.
- **\`frontmatter/\`** is the special unit holding everything before the first
  section heading: the h1 title line, the \`**Languages:**\` / \`**Version:**\` /
  \`**Date:**\` field block, and — in the \`ru\`/\`zh\` body strings only — the
  informative-translation disclaimer blockquote. The h1 title lives **inside**
  the frontmatter body content, verbatim; \`frontmatter\` has no heading of its
  own.

## Unit contents

Each unit directory contains exactly: \`meta.js\`, \`body-1.js\`, ..., \`body-N.js\`
(N >= 1). The only \`.md\` files under \`content/\` are the three root READMEs
(\`README.md\`, \`README.ru.md\`, \`README.zh.md\`); Markdown is forbidden
entirely inside unit directories.

### \`meta.js\`

Every \`meta.js\` uses \`export default { ... }\` (JSON-style). The three shapes,
verbatim:

\`\`\`js
// frontmatter/meta.js
export default {
  "kind": "frontmatter",
  "number": null,
  "level": null,
  "title": null,
  "bodyParts": 1
}

// sec-3.1/meta.js
export default {
  "kind": "numbered",
  "number": "3.1",
  "sep": " ",
  "level": 3,
  "title": {
    "en": "...",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}

// named-appendix-a/meta.js
export default {
  "kind": "named",
  "number": null,
  "level": 2,
  "title": {
    "en": "...",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
\`\`\`

The whole file must be byte-identical to \`export default \` followed by the
value serialized as strict JSON (\`JSON.stringify(value, null, 2)\`) plus one
trailing newline: one key per line, 2-space indent, LF line endings, no
trailing semicolon. The payload after \`export default \` is parsed as JSON
(\`JSON.parse\`), **not** evaluated as a JavaScript object literal — trailing
commas, comments, unquoted keys, and semicolons are never valid there
(unlike \`body-<k>.js\`, which is JS source, just narrowly restricted).
Duplicate keys are rejected too: the builder compares the file byte-for-byte
against the canonical serialization above, and a repeated key makes the raw
file differ from it.

Field meanings:

- \`kind\` — \`frontmatter\`, \`numbered\`, or \`named\`.
- \`number\` — the section number as a string (\`"3.1"\`), \`null\` for
  non-numbered units and frontmatter.
- \`level\` — the heading \`#\` count (\`##\` = 2). \`null\` for frontmatter.
- \`title\` — the heading text in each language, **without** the leading
  number and separator; the generator re-attaches them.
- \`sep\` — the separator actually used between number and title. **Why it
  exists:** the spec's heading convention deliberately mixes
  \`## 1. Introduction\` (top-level numbered sections, dot + space) with
  \`### 3.1 Character Set\` (deeper subsections, space only). The generator
  must reproduce each heading byte-exactly, so the actual separator is
  recorded per unit. Only \`". "\` and \`" "\` are legal. The extraction script
  enforces that all three languages use the same \`sep\` for a unit.
- \`bodyParts\` — the integer count of \`body-*.js\` files for the unit
  (N in \`body-1.js\` .. \`body-N.js\`). Always >= 1. Present on ALL units,
  including \`frontmatter\`, and always appended **last**.

### \`body-<k>.js\`

Each \`body-<k>.js\` has exactly this shape (2-space indent, template
literals, real multi-line prose inside, no added whitespace inside the
literals, trailing newline after \`};\`):

\`\`\`js
export default {
  en: \`...raw text chunk k for English...\`,
  ru: \`...\`,
  zh: \`...\`,
};
\`\`\`

The unit's full body text for a language is the **concatenation** of chunks
1..N, in order, with **no separator** between chunks.

**Escaping rule (mechanical, in this exact order).** To embed raw text \`t\`
in a template literal:

1. replace every \`\\\` with \`\\\\\`;
2. replace every backtick with \`\` \\\` \`\`;
3. replace every \`\${\` with \`\\\${\`;

then wrap the result in backticks. Backslashes must be replaced **first**,
or you double-escape them. **Never retype content by hand — script this
transformation.**

**Splitting rule (exact numbers).** Let \`L\` = max line count over the unit's
three language bodies.

- If \`L <= 120\`, \`N = 1\` (a single \`body-1.js\`).
- If \`L > 120\`, \`N = ceil(L / 100)\`.

Each language is split **independently** into N chunks by cutting only at
blank-line boundaries (an empty line — never mid-line), choosing the N-1 cut
points as the blank lines closest to the proportional target offsets
\`i*L/N\` for \`i = 1..N-1\`. If a language lacks enough distinct interior blank
lines for N-1 cut points, equidistant ties choose the earlier blank boundary,
and N for the **whole unit** is reduced to
(available cut points + 1) rather than failing. Semantic alignment of parts
across languages is **not** a goal — this is file-size hygiene only.

## Body files (critical for byte-exactness)

The unit body in each language is the concatenation of \`body-1.js\` ..
\`body-N.js\` string values, in order, with **no separator inserted between
chunks**. The generator inserts nothing between units either, so
blank-line separation lives at the END of the **last chunk of the unit**:

- Every unit **except the last unit's** ends with exactly ONE blank line,
  i.e. the last chunk's string ends with \`"\\n\\n"\`.
- The **last unit in manifest order** ends with a single final newline and
  no trailing blank line (\`"\\n"\`), as the last bytes of its last chunk.
- The frontmatter body ends with the one blank line before the first
  section heading.

When a unit is split into multiple chunks, those trailing bytes simply live
at the end of the LAST chunk — earlier chunks carry no special trailing
whitespace of their own beyond what the split produced.

Getting this wrong is the #1 way to make \`--check\` fail.

## \`manifest.js\`

An explicit **ordered** array of the 103 folder names in true document
order. It starts \`["frontmatter", "named-abstract", "sec-1", ...]\` and ends
\`[..., "named-appendix-d"]\`. It is **never sorted alphabetically**:
\`"sec-10.7"\` must come after \`"sec-2"\`, and named sections sit at their real
document positions. The independent lock at
\`scripts/locks/section-inventory.0.7.lock.json\` stores one deterministic
record per manifest entry, in manifest order. Each record has exactly
\`{ unit, kind, number, level, sep }\`; absent structural values are \`null\`.
The \`kind\`, \`number\`, \`level\`, and \`sep\` values MUST match the
corresponding \`meta.js\` fields. Titles and body prose remain editable and are
not locked. Both files MUST be updated together when a section is intentionally
added or removed; manifest-only or hierarchy-metadata changes are rejected.

## README source object

\`README.source.js\` has the same narrow static template-object shape as a body
part: exactly \`en\`, \`ru\`, and \`zh\`, with no executable code. Its three strings
are the sole source for the three README files. The generated files are still
committed for browsing, but hand-editing any one of them makes \`--check\` fail.

## How the generator builds a file

\`scripts/build_spec.mjs\` walks the manifest in order. For each unit it reads
\`manifest.js\`/\`meta.js\` as strict UTF-8 text and \`JSON.parse\`s the payload after
\`export default \`, then statically shape-scans and decodes \`body-1.js\` ..
\`body-N.js\` **in order** (no code under \`content/\` is ever executed), then:

- for \`frontmatter\`: emit the concatenation of the \`en\` / \`ru\` / \`zh\`
  strings of \`body-1\` .. \`body-N\`, verbatim;
- for every other unit: emit
  \`'#'.repeat(level) + ' ' + (numbered ? number + sep : '') + title[lang] + '\\n'\`,
  then the concatenated body strings;
- concatenate.

The same run writes the three content READMEs from \`README.source.js\`; in
\`--check\` mode it compares those files byte-for-byte as well as the three
generated specification files.

Commands:

\`\`\`sh
node scripts/build_spec.mjs          # writes the 3 spec .md files and 3 content READMEs
node scripts/build_spec.mjs --check  # verifies byte-identity, writes nothing
node --test scripts/test_build_spec.mjs  # adversarial builder test suite (negative paths)
\`\`\`

\`--check\` validates the inventory lock, regenerates all six files in memory,
and byte-compares them against the committed files. On success: exit 0 and
**completely silent**.
On divergence: exit 1 with a diagnostic naming the unit, language, and line
of the first differing byte. It writes nothing. Write mode stages all six
temporary outputs and recoverable backups before replacement; a caught I/O
failure during replacement restores every destination, including originally
missing files, and removes staging artifacts. This is not a process-kill
durability guarantee.

\`node --test scripts/test_build_spec.mjs\` runs the builder's adversarial
(negative-path) test suite: it feeds deliberately malformed content trees
to the validator and asserts each closed-world invariant documented in
this README is rejected.

Recommended workflow: edit unit files -> run \`node scripts/build_spec.mjs\`
-> verify \`git diff\` on the three \`.md\` files shows exactly what you
intended -> run \`scripts/check_translation_parity.py\` -> commit the unit
changes and the regenerated \`.md\` files **together**.

## How to add a new section

Example (fictional): adding top-level-style section \`## 9.9 Widget Frobnication\`
with subsection \`### 9.9.1 Widget Modes\`, using space-only separators.

Steps:

1. Create the folders, \`meta.js\` (with \`"bodyParts": 1\`), and \`body-1.js\`
   per unit (mind the trailing-blank-line rule above).
2. Insert both folder names into \`manifest.js\` and the lock's \`units\` array at
   the correct document positions (after the unit preceding section 9.9).
3. Run \`node scripts/build_spec.mjs\`, check the \`git diff\`, run the parity
   checker, then commit units + regenerated \`.md\` files together.

\`sec-9.9/meta.js\`:

\`\`\`js
export default {
  "kind": "numbered",
  "number": "9.9",
  "sep": " ",
  "level": 2,
  "title": {
    "en": "Widget Frobnication",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
\`\`\`

Note: \`sep\` depends on the heading text the author writes. For a
dot-style heading \`## 9.9. Widget Frobnication\` it would be \`". "\`;
for \`## 9.9 Widget Frobnication\` it is \`" "\`. Record what you actually
wrote, and be consistent. For the subsection \`### 9.9.1 Widget Modes\`,
\`sec-9.9.1/meta.js\` is the same shape with \`"number": "9.9.1"\`, \`"level": 3\`.

\`sec-9.9/body-1.js\` (fictional placeholder content), marking where the
trailing newline rules apply:

\`\`\`js
// sec-9.9/body-1.js  (last unit in manifest order? then en must end "\\n", else "\\n\\n")
export default {
  en: \`Frobnicate the widget.

(body of 9.9)
\`,
  ru: \`...\`,
  zh: \`...\`,
};
\`\`\`

The trailing blank line before the next unit's heading is the LAST bytes of
the LAST chunk of the unit (here \`body-1.js\`, since \`"bodyParts": 1\`): the
\`en\` string above ends \`"\\n\\n"\` (exactly one blank line) unless 9.9 is the
last unit in manifest order, in which case it ends with a single \`"\\n"\`.
Earlier chunks (in a multi-chunk unit) carry no such trailing bytes.

## History / bootstrap

This layout was created by a one-time mechanical migration, recorded in
\`scripts/archive/extract_content_units.py\`: it sliced the then-current
three \`.md\` files into units by line-range byte-slicing (no text was
retyped) and verified byte-identical reconstruction. It was later extended
to emit the current \`body-*.js\` schema directly — \`meta.js\` with
\`bodyParts\` plus \`body-1..N\` per unit. The script is kept for provenance
only, not as a routine tool: it refuses to overwrite an existing
\`content/\` and has no override flag. Rebuilding from scratch means
manually deleting \`content/\` first as a separate, deliberate action. The
**ongoing** workflow is the opposite direction: edit units, then
\`build_spec.mjs\` regenerates the \`.md\` files.

## Out of scope

CI already runs \`node scripts/build_spec.mjs --check\` and
\`node --test scripts/test_build_spec.mjs\` in \`.github/workflows\` on every
push/PR.
`,
  ru: `# versions/0.7/content/ — исходники спецификации по секциям

**Languages:** [English](README.md) · **Русский** · [简体中文](README.zh.md)

## Что это за директория

Эта директория — **источник истины по секциям** для
\`versions/0.7/spec.md\`, \`versions/0.7/spec.ru.md\` и
\`versions/0.7/spec.zh.md\`.

- Три файла \`.md\` в \`versions/0.7/\` — **сгенерированные артефакты**. Они
  остаются в репозитории, чтобы спецификацию можно было читать на GitHub
  напрямую, но их **нельзя редактировать вручную**: ручная правка будет
  перезаписана следующей сборкой и уронит
  \`node scripts/build_spec.mjs --check\`.
- **Юниты контента** в этой директории (одна папка на секцию) — то, что
  редактируют люди.
- \`scripts/check_translation_parity.py\` продолжает прогоняться по
  сгенерированным файлам \`.md\` как последующий структурный гейт;
  \`node scripts/build_spec.mjs --check\` — гейт точности байт-в-байт.

## Текущий состав

103 юнита: 1 \`frontmatter/\`, 97 нумерованных \`sec-<number>/\` (\`sec-1\`,
\`sec-3.1\`, \`sec-5.3.3\`, \`sec-10.7\`) и 5 именованных \`named-<slug>/\`
(\`named-abstract\`, \`named-appendix-a\` .. \`named-appendix-d\`). Плюс:

- \`scripts/locks/section-inventory.0.7.lock.json\` — независимый
  версионированный упорядоченный inventory. Builder требует его при обычном
  CLI-запуске и отвергает расхождение состава или порядка с manifest.
- \`README.source.js\` — единый source object \`{ en, ru, zh }\` для трёх README
  этой директории. Builder статически проверяет его и генерирует
  \`README.md\`, \`README.ru.md\` и \`README.zh.md\`.
- \`manifest.js\` — упорядоченный список юнитов (см. ниже).
- \`package.json\` — \`{"type":"module"}\`. Исторически: был нужен, пока
  \`build_spec.mjs\` динамически импортировал \`meta.js\`/\`body-*.js\` как
  ES-модули. После закрытия closed-world (ничего под \`content/\` больше не
  исполняется — \`manifest.js\` и \`meta.js\` читаются как UTF-8-текст и
  разбираются через \`JSON.parse\`, \`body-*.js\` статически сканируется и
  декодируется), файл функционально больше не обязателен, но оставлен на
  месте и по-прежнему разрешён на верхнем уровне.

## Соглашение об именовании папок

- **Нумерованные секции**: \`sec-<number>\`, где \`<number>\` — точный номер
  секции, как он стоит в заголовке: \`sec-1\`, \`sec-5.3.3\`.
- **Ненумерованные секции** (заголовки уровня >= 2 без номера):
  \`named-<slug>\`. Слаг выводится **только из английского текста
  заголовка** (то есть не зависит от языка):
  1. отсечь на первой \`.\`, если есть ("Appendix A. Changes" ->
     "Appendix A");
  2. нижний регистр;
  3. заменить каждую серию символов вне \`[a-z0-9]\` одним \`-\`;
  4. обрезать \`-\` по краям.

  Примеры: "Abstract" -> \`abstract\`; "Appendix D. Migration from 0.6.x" ->
  \`appendix-d\`.
- **\`frontmatter/\`** — специальный юнит, хранящий всё до первого
  заголовка секции: строку заголовка h1, блок полей \`**Languages:**\` /
  \`**Version:**\` / \`**Date:**\` и — только в строках \`ru\`/\`zh\` тела —
  информационную цитату-дисклеймер о переводе. Заголовок h1 лежит
  **внутри** содержимого тела frontmatter, дословно; у самого
  \`frontmatter\` своего заголовка нет.

## Состав юнита

Каждая директория юнита содержит ровно: \`meta.js\`, \`body-1.js\`, ...,
\`body-N.js\` (N >= 1). Файлы \`.md\` под \`content/\` — только три корневых
README (\`README.md\`, \`README.ru.md\`, \`README.zh.md\`); внутри директорий
юнитов Markdown запрещён полностью.

### \`meta.js\`

Каждый \`meta.js\` использует \`export default { ... }\` (в стиле JSON). Три
формы, дословно:

\`\`\`js
// frontmatter/meta.js
export default {
  "kind": "frontmatter",
  "number": null,
  "level": null,
  "title": null,
  "bodyParts": 1
}

// sec-3.1/meta.js
export default {
  "kind": "numbered",
  "number": "3.1",
  "sep": " ",
  "level": 3,
  "title": {
    "en": "...",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}

// named-appendix-a/meta.js
export default {
  "kind": "named",
  "number": null,
  "level": 2,
  "title": {
    "en": "...",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
\`\`\`

Файл целиком должен быть байт-в-байт идентичен \`export default \`, за которым
следует значение, сериализованное как строгий JSON
(\`JSON.stringify(value, null, 2)\`), плюс один завершающий перевод строки:
один ключ на строку, отступ в 2 пробела, переводы строк LF, без завершающей
точки с запятой. Payload после \`export default \` разбирается как JSON
(\`JSON.parse\`), а **не** вычисляется как литерал объекта JavaScript —
завершающие запятые, комментарии, ключи без кавычек и точки с запятой там
никогда не допустимы (в отличие от \`body-<k>.js\`, который является
исходником на JS, лишь узко ограниченным). Дубликаты ключей тоже
отвергаются: сборщик сравнивает файл байт-в-байт с канонической
сериализацией выше, и повторный ключ делает файл отличным от неё.

Значения полей:

- \`kind\` — \`frontmatter\`, \`numbered\` или \`named\`.
- \`number\` — номер секции строкой (\`"3.1"\`), \`null\` для ненумерованных
  юнитов и frontmatter.
- \`level\` — количество \`#\` в заголовке (\`##\` = 2). \`null\` для
  frontmatter.
- \`title\` — текст заголовка на каждом языке, **без** ведущего номера и
  разделителя; генератор пристыковывает их сам.
- \`sep\` — разделитель, реально использованный между номером и
  заголовком. **Зачем он существует:** соглашение о заголовках спеки
  намеренно смешивает \`## 1. Introduction\` (нумерованные секции
  верхнего уровня, точка + пробел) с \`### 3.1 Character Set\` (более
  глубокие подсекции, только пробел). Генератор должен воспроизвести
  каждый заголовок байт-в-байт, поэтому фактический разделитель
  записывается на каждый юнит. Легальны только \`". "\` и \`" "\`.
  Скрипт извлечения требует, чтобы все три языка использовали один и
  тот же \`sep\` для юнита.
- \`bodyParts\` — целое число файлов \`body-*.js\` юнита (N в
  \`body-1.js\` .. \`body-N.js\`). Всегда >= 1. Есть у ВСЕХ юнитов, включая
  \`frontmatter\`, и всегда приписывается **последним**.

### \`body-<k>.js\`

Каждый \`body-<k>.js\` имеет ровно такую форму (отступ в 2 пробела,
шаблонные литералы (template literal), настоящий многострочный текст
внутри, без лишних пробелов внутри литералов, завершающий перевод
строки после \`};\`):

\`\`\`js
export default {
  en: \`...raw text chunk k for English...\`,
  ru: \`...\`,
  zh: \`...\`,
};
\`\`\`

Полный текст тела юнита на языке — это **конкатенация** кусков 1..N по
порядку, **без разделителя** между кусками.

**Правило экранирования (механическое, строго в этом порядке).** Чтобы
вложить сырой текст \`t\` в шаблонный литерал:

1. заменить каждую \`\\\` на \`\\\\\`;
2. заменить каждый backtick на \`\` \\\` \`\`;
3. заменить каждый \`\${\` на \`\\\${\`;

и только затем обернуть результат в backticks. Обратные косые надо
заменять **первыми**, иначе получится двойное экранирование. **Никогда
не перенабирайте содержимое вручную — автоматизируйте это
преобразование.**

**Правило разбиения (точные числа).** Пусть \`L\` — максимум числа строк
по трём языковым телам юнита.

- Если \`L <= 120\`, то \`N = 1\` (один \`body-1.js\`).
- Если \`L > 120\`, то \`N = ceil(L / 100)\`.

Каждый язык разбивается **независимо** на N кусков, разрезами только по
границам пустых строк (пустая строка — никогда посреди строки), причём
N-1 точек разреза выбираются как пустые строки, ближайшие к
пропорциональным целевым смещениям \`i*L/N\` для \`i = 1..N-1\`; при равном расстоянии
выбирается более ранняя граница пустой строки. Если у
языка не хватает различных внутренних пустых строк для N-1 точек
разреза, N для **всего юнита** уменьшается до (доступных точек
разреза + 1), а не падает с ошибкой. Семантическое выравнивание кусков
между языками **не** является целью — это только гигиена размера
файлов.

## Файлы тела (критично для точности байт-в-байт)

Тело юнита на каждом языке — конкатенация строковых значений
\`body-1.js\` .. \`body-N.js\` по порядку, **без вставленного разделителя
между кусками**. Генератор не вставляет ничего и между юнитами, поэтому
пустая строка-разделитель живёт в КОНЦЕ **последнего куска юнита**:

- Каждый юнит **кроме последнего** заканчивается ровно ОДНОЙ пустой
  строкой, то есть строка последнего куска заканчивается \`"\\n\\n"\`.
- **Последний юнит в порядке манифеста** заканчивается одним финальным
  переводом строки без завершающей пустой строки (\`"\\n"\`) — последними
  байтами своего последнего куска.
- Тело frontmatter заканчивается одной пустой строкой перед первым
  заголовком секции.

Когда юнит разбит на несколько кусков, эти завершающие байты просто
живут в конце ПОСЛЕДНЕГО куска — более ранние куски не несут своего
особого завершающего пробела сверх того, что дало разбиение.

Ошибиться здесь — способ №1 уронить \`--check\`.

## \`manifest.js\`

Явный **упорядоченный** массив из 103 имён папок в настоящем порядке
документа. Он начинается \`["frontmatter", "named-abstract", "sec-1",
...]\` и заканчивается \`[..., "named-appendix-d"]\`. Он **никогда не
сортируется по алфавиту**: \`"sec-10.7"\` должен идти после \`"sec-2"\`, а
именованные секции стоят на своих реальных позициях в документе. Независимый
lock \`scripts/locks/section-inventory.0.7.lock.json\` хранит по одной
детерминированной записи на элемент manifest в его порядке. Каждая запись имеет
ровно поля \`{ unit, kind, number, level, sep }\`; отсутствующие структурные
значения равны \`null\`. Значения \`kind\`, \`number\`, \`level\` и \`sep\`
MUST совпадать с соответствующими полями \`meta.js\`. Заголовки и текст тела
остаются редактируемыми и lock-ом не защищаются. При намеренном добавлении или
удалении секции оба файла MUST обновляться вместе; изменения только manifest
или иерархических meta-полей отвергаются.

## Исходный объект README

\`README.source.js\` — единый source object \`{ en, ru, zh }\` для трёх README в
этой директории. Builder статически проверяет его и генерирует из него
\`README.md\`, \`README.ru.md\` и \`README.zh.md\`; ручное изменение любого README
делает \`--check\` ошибочным.

## Как генератор собирает файл

\`scripts/build_spec.mjs\` идёт по манифесту по порядку. Для каждого
юнита он читает \`manifest.js\`/\`meta.js\` как строгий UTF-8-текст и разбирает payload
после \`export default \` через \`JSON.parse\`, затем статически сканирует и
декодирует \`body-1.js\` .. \`body-N.js\` **по порядку** (код под \`content/\`
никогда не исполняется), затем:

- для \`frontmatter\`: вывести конкатенацию строк \`en\` / \`ru\` / \`zh\` из
  \`body-1\` .. \`body-N\`, дословно;
- для любого другого юнита: вывести
  \`'#'.repeat(level) + ' ' + (numbered ? number + sep : '') + title[lang] + '\\n'\`,
  затем конкатенацию строк тела;
- конкатенировать.

Команды:

\`\`\`sh
node scripts/build_spec.mjs          # writes the 3 spec .md files and 3 content READMEs
node scripts/build_spec.mjs --check  # verifies byte-identity, writes nothing
node --test scripts/test_build_spec.mjs  # adversarial builder test suite (negative paths)
\`\`\`

\`--check\` проверяет inventory lock, регенерирует все шесть файлов в памяти и
побайтово сравнивает их с закоммиченными: три файла спецификации и три content
README. При успехе: код выхода 0 и **полная тишина**. При
расхождении: код выхода 1 с диагностикой, называющей юнит, язык и
строку первого различающегося байта. Ничего не пишет. В режиме записи сборщик
сначала подготавливает все шесть временных файлов и восстанавливаемые backup,
а затем заменяет назначения; пойманная ошибка I/O при замене откатывает все
назначения, включая изначально отсутствовавшие, и удаляет служебные файлы.
Это не гарантия атомарности при убийстве процесса.

\`node --test scripts/test_build_spec.mjs\` запускает adversarial-набор
тестов сборщика (негативные сценарии): он скармливает валидатору
специально искажённые деревья контента и проверяет, что каждое
closed-world-свойство, задокументированное в этом README, отвергается.

Рекомендуемый рабочий процесс: правите файлы юнитов -> запускаете
\`node scripts/build_spec.mjs\` -> проверяете по \`git diff\`, что изменения
трёх файлов \`.md\` — ровно то, что вы имели в виду -> запускаете
\`scripts/check_translation_parity.py\` -> коммитите изменения юнитов и
регенерированные файлы \`.md\` **вместе**.

## Как добавить новую секцию

Пример (вымышленный): добавляем секцию в стиле верхнего уровня
\`## 9.9 Widget Frobnication\` с подсекцией \`### 9.9.1 Widget Modes\` с
разделителями только из пробела.

Шаги:

1. Создайте папки, \`meta.js\` (с \`"bodyParts": 1\`) и \`body-1.js\` на
   каждый юнит (помните правило завершающей пустой строки выше).
2. Вставьте оба имени папок в \`manifest.js\` и массив \`units\` inventory lock
   на правильные позиции документа (после юнита, предшествующего секции 9.9).
3. Запустите \`node scripts/build_spec.mjs\`, посмотрите \`git diff\`,
   прогоните проверку паритета, затем коммитьте юниты и регенерированные
   файлы \`.md\` вместе.

\`sec-9.9/meta.js\`:

\`\`\`js
export default {
  "kind": "numbered",
  "number": "9.9",
  "sep": " ",
  "level": 2,
  "title": {
    "en": "Widget Frobnication",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
\`\`\`

Примечание: \`sep\` зависит от текста заголовка, который пишет автор. Для
заголовка с точкой \`## 9.9. Widget Frobnication\` это было бы \`". "\`;
для \`## 9.9 Widget Frobnication\` — \`" "\`. Записывайте то, что вы
действительно написали, и будьте последовательны. Для подсекции
\`### 9.9.1 Widget Modes\` файл \`sec-9.9.1/meta.js\` той же формы, но с
\`"number": "9.9.1"\`, \`"level": 3\`.

\`sec-9.9/body-1.js\` (вымышленное содержимое-заполнитель) с пометками,
где действуют правила завершающего перевода строки:

\`\`\`js
// sec-9.9/body-1.js  (last unit in manifest order? then en must end "\\n", else "\\n\\n")
export default {
  en: \`Frobnicate the widget.

(body of 9.9)
\`,
  ru: \`...\`,
  zh: \`...\`,
};
\`\`\`

Завершающая пустая строка перед заголовком следующего юнита — это
ПОСЛЕДНИЕ байты ПОСЛЕДНЕГО куска юнита (здесь \`body-1.js\`, поскольку
\`"bodyParts": 1\`): строка \`en\` выше заканчивается \`"\\n\\n"\` (ровно одна
пустая строка), если только 9.9 не последний юнит в порядке манифеста —
тогда она заканчивается одним \`"\\n"\`. Более ранние куски (в юните из
нескольких кусков) таких завершающих байтов не несут.

## История / бутстрап

Эта структура была создана одноразовой механической миграцией,
записанной в \`scripts/archive/extract_content_units.py\`: она нарезала
три тогдашних файла \`.md\` на юниты побайтовым нарезанием по диапазонам
строк (никакой текст не перенабирался) и проверила байт-в-байт
идентичную реконструкцию. Позднее скрипт был расширен, чтобы выдавать
сразу текущую схему \`body-*.js\` — \`meta.js\` с \`bodyParts\` плюс
\`body-1..N\` на юнит. Скрипт сохранён только для происхождения, не как
штатный инструмент: он отказывается перезаписывать существующий
\`content/\` и не имеет флага переопределения. Пересборка с нуля означает
ручное удаление \`content/\` первым, отдельным осознанным действием.
**Текущий** рабочий процесс — обратное направление: правите юниты, и
\`build_spec.mjs\` регенерирует файлы \`.md\`.

## Вне охвата

CI уже запускает \`node scripts/build_spec.mjs --check\` и
\`node --test scripts/test_build_spec.mjs\` в \`.github/workflows\` на каждый
push/PR.
`,
  zh: `# versions/0.7/content/ —— 规范内容单元

**Languages:** [English](README.md) · [Русский](README.ru.md) · **简体中文**

## 这个目录是什么

本目录是 \`versions/0.7/spec.md\`、\`versions/0.7/spec.ru.md\` 与
\`versions/0.7/spec.zh.md\` 的**逐节来源(源头)**。

- \`versions/0.7/\` 下的三个 \`.md\` 文件是**生成的构件**。它们仍保留在
  仓库中,以便在 GitHub 上直接阅读规范,但**切勿手动编辑**:手工
  改动会被下一次构建覆盖,并使 \`node scripts/build_spec.mjs --check\`
  失败。
- 本目录中的**内容单元**(每节一个文件夹)才是人来编辑的对象。
- \`scripts/check_translation_parity.py\` 仍继续对生成的 \`.md\` 文件
  运行,作为事后结构关卡;\`node scripts/build_spec.mjs --check\` 才是
  逐字节关卡。

## 当前清单

共 103 个单元:1 个 \`frontmatter/\`、97 个带编号的 \`sec-<number>/\`
(\`sec-1\`、\`sec-3.1\`、\`sec-5.3.3\`、\`sec-10.7\`),以及 5 个命名的
\`named-<slug>/\`(\`named-abstract\`、\`named-appendix-a\` ..
\`named-appendix-d\`)。另有:

- \`scripts/locks/section-inventory.0.7.lock.json\` —— 独立的、有版本的有序
  inventory。Builder 在普通 CLI 运行中必须读取它,并拒绝与 manifest 的成员
  或顺序发生漂移。
- \`README.source.js\` —— 本目录三个 README 共用的 \`{ en, ru, zh }\` source
  object。Builder 会静态检查它并据此生成 \`README.md\`、\`README.ru.md\` 和
  \`README.zh.md\`。
- \`manifest.js\` —— 单元的有序列表(见下文)。
- \`package.json\` —— \`{"type":"module"}\`。历史遗留:曾用于
  \`build_spec.mjs\` 把 \`meta.js\`/\`body-*.js\` 当作 ES 模块动态导入的阶段。
  在完成 closed-world 加固后(\`content/\` 下再无任何代码被执行——
  \`manifest.js\` 与 \`meta.js\` 作为 UTF-8 文本读取并通过 \`JSON.parse\` 解析,
  \`body-*.js\` 经静态扫描后解码),此文件已不再是功能上必需的,但仍保留
  在原位,顶层仍允许它存在。

## 文件夹命名约定

- **带编号的节**:\`sec-<number>\`,其中 \`<number>\` 是标题中出现的
  确切节号:\`sec-1\`、\`sec-5.3.3\`。
- **不带编号的节**(没有编号的 >= 2 级标题):\`named-<slug>\`。slug
  **仅由英文标题文本**派生(因此与语言无关):
  1. 如有 \`.\`,在第一个 \`.\` 处截断("Appendix A. Changes" ->
     "Appendix A");
  2. 转小写;
  3. 把每一段 \`[a-z0-9]\` 之外的连续字符替换为单个 \`-\`;
  4. 去除首尾的 \`-\`。

  例:"Abstract" -> \`abstract\`;"Appendix D. Migration from 0.6.x" ->
  \`appendix-d\`。
- **\`frontmatter/\`** 是特殊单元,保存第一个节标题之前的全部内容:
  h1 标题行、\`**Languages:**\` / \`**Version:**\` / \`**Date:**\` 字段块,
  以及——仅在 \`ru\`/\`zh\` 正文串中——关于译文的信息性免责声明
  blockquote。h1 标题**位于**frontmatter 正文内容之内,原样保留;
  \`frontmatter\` 自身没有标题。

## 单元内容

每个单元目录恰好包含:\`meta.js\`、\`body-1.js\`、……、\`body-N.js\`
(N >= 1)。\`content/\` 下的 \`.md\` 文件只有三个根 README(\`README.md\`、
\`README.ru.md\`、\`README.zh.md\`);单元目录内完全禁止 \`.md\` 文件。

### \`meta.js\`

每个 \`meta.js\` 使用 \`export default { ... }\`(JSON 风格)。三种形态,
逐字如下:

\`\`\`js
// frontmatter/meta.js
export default {
  "kind": "frontmatter",
  "number": null,
  "level": null,
  "title": null,
  "bodyParts": 1
}

// sec-3.1/meta.js
export default {
  "kind": "numbered",
  "number": "3.1",
  "sep": " ",
  "level": 3,
  "title": {
    "en": "...",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}

// named-appendix-a/meta.js
export default {
  "kind": "named",
  "number": null,
  "level": 2,
  "title": {
    "en": "...",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
\`\`\`

整个文件必须逐字节等于 \`export default \` 加上以严格 JSON 序列化的值
（\`JSON.stringify(value, null, 2)\`）再加单个末尾换行：每行一个键、
2 空格缩进、LF 换行、无末尾分号。\`export default \` 之后的 payload 是作为
JSON（\`JSON.parse\`）解析的，**不是**作为 JavaScript 对象字面量求值——
末尾逗号、注释、不带引号的键以及分号在那里永远不合法（与 \`body-<k>.js\`
不同，后者是 JS 源码，只是受到严格限制）。重复的键同样会被拒绝：构建器
将文件与上面的规范序列化逐字节比较，重复键会使原始文件与它不一致。

字段含义:

- \`kind\` —— \`frontmatter\`、\`numbered\` 或 \`named\`。
- \`number\` —— 以字符串表示的节号(\`"3.1"\`),非编号单元与
  frontmatter 为 \`null\`。
- \`level\` —— 标题中 \`#\` 的数量(\`##\` = 2)。frontmatter 为 \`null\`。
- \`title\` —— 每种语言的标题文本,**不含**前导编号与分隔符;生成器
  会重新拼接上去。
- \`sep\` —— 编号与标题之间实际使用的分隔符。**它为何存在:**规范
  的标题约定有意混用 \`## 1. Introduction\`(顶层编号节,点 + 空格)
  与 \`### 3.1 Character Set\`(更深的子节,仅空格)。生成器必须逐字节
  复现每个标题,因此实际分隔符按单元记录。只有 \`". "\` 与 \`" "\` 合法。
  抽取脚本强制同一单元的三种语言使用相同的 \`sep\`。
- \`bodyParts\` —— 该单元 \`body-*.js\` 文件的整数个数(\`body-1.js\` ..
  \`body-N.js\` 中的 N)。总是 >= 1。所有单元(包括 \`frontmatter\`)都
  有,且总是排在**最后**。

### \`body-<k>.js\`

每个 \`body-<k>.js\` 恰好是如下形态(2 空格缩进、模板字面量
(template literal)、字面量内是真正的多行正文、字面量内不添加额外
空白、\`};\` 之后有换行):

\`\`\`js
export default {
  en: \`...raw text chunk k for English...\`,
  ru: \`...\`,
  zh: \`...\`,
};
\`\`\`

某语言单元的完整正文,是该语言第 1..N 块按顺序的**拼接**,块与块
之间**没有分隔符**。

**转义规则(机械操作,严格按此顺序)。**要把原始文本 \`t\` 嵌入模板
字面量:

1. 把每个 \`\\\` 替换为 \`\\\\\`;
2. 把每个反引号替换为 \`\` \\\` \`\`;
3. 把每个 \`\${\` 替换为 \`\\\${\`;

然后把结果用反引号包裹。反斜杠必须**最先**替换,否则会被双重转义。
**切勿手工重新键入内容——请用脚本完成这一变换。**

**拆分规则(精确数字)。**令 \`L\` 为该单元三种语言正文行数的最大值。

- 若 \`L <= 120\`,则 \`N = 1\`(单个 \`body-1.js\`)。
- 若 \`L > 120\`,则 \`N = ceil(L / 100)\`。

每种语言**独立**拆成 N 块,只允许在空行边界处切割(空行——绝不在
行中间),并选取距比例目标偏移 \`i*L/N\`(\`i = 1..N-1\`)最近的空行作为
N-1 个切割点;如果距离相等,则选择较早的空行边界。若某语言的内部空行不足以提供 N-1 个切割点,则把
**整个单元**的 N 降为(可用切割点数 + 1),而不是失败。各语言之间
分块语义对齐**不是**目标——这只是文件大小的卫生措施。

## 正文文件(对逐字节精确性至关重要)

每个语言的单元正文,是 \`body-1.js\` .. \`body-N.js\` 字符串值按顺序的
拼接,**块之间不插入任何分隔符**。生成器在单元之间也不插入任何
内容,因此空行分隔位于单元**最后一块的末尾**:

- 除最后一个单元外,每个单元都恰好以一行空行结尾,即最后一块的
  字符串以 \`"\\n\\n"\` 结束。
- **manifest 顺序中的最后一个单元**以单个末尾换行结束、不带末尾
  空行(\`"\\n"\`),作为其最后一块的最后几个字节。
- frontmatter 正文以第一个节标题之前的那一行空行结尾。

当单元被拆为多块时,这些末尾字节就放在最后一块的末尾——更早的
块除了拆分产生的空白外,不带有自己的特殊末尾空白。

弄错这一点,是让 \`--check\` 失败的头号方式。

## \`manifest.js\`

按真实文档顺序排列的 103 个文件夹名的显式**有序**数组。它以
\`["frontmatter", "named-abstract", "sec-1", ...]\` 开头,以
\`[..., "named-appendix-d"]\` 结尾。它**绝不按字母序排序**:
\`"sec-10.7"\` 必须排在 \`"sec-2"\` 之后,命名节也处于它们在文档中的
真实位置。独立的 lock \`scripts/locks/section-inventory.0.7.lock.json\`
按 manifest 顺序为每个单元保存一条确定性的结构记录。每条记录严格包含
\`{ unit, kind, number, level, sep }\`;缺少的结构值使用 \`null\`。
\`kind\`、\`number\`、\`level\` 和 \`sep\` MUST 与对应的 \`meta.js\`
字段一致。标题文字和正文仍可编辑,不受 lock 保护。有意新增或删除章节时,
两个文件 MUST 同时更新;仅修改 manifest 或层级 meta 字段会被拒绝。

## README 源对象

\`README.source.js\` 是本目录三个 README 共用的 \`{ en, ru, zh }\` source
object。Builder 会静态检查它并据此生成 \`README.md\`、\`README.ru.md\` 和
\`README.zh.md\`;手动修改任何一个 README 都会使 \`--check\` 失败。

## 生成器如何构建文件

\`scripts/build_spec.mjs\` 按顺序遍历 manifest。对每个单元,它以
严格的 UTF-8 读取 \`manifest.js\`/\`meta.js\`,并对 \`export default \` 之后的
payload 执行 \`JSON.parse\`,然后**按顺序**静态扫描并解码 \`body-1.js\` ..
\`body-N.js\`(\`content/\` 下的代码从不被执行),然后:

- 对 \`frontmatter\`:输出 \`body-1\` .. \`body-N\` 的 \`en\` / \`ru\` / \`zh\`
  字符串的拼接,原样;
- 对其他任何单元:输出
  \`'#'.repeat(level) + ' ' + (numbered ? number + sep : '') + title[lang] + '\\n'\`,
  然后输出正文字符串的拼接;
- 整体拼接。

命令:

\`\`\`sh
node scripts/build_spec.mjs          # writes the 3 spec .md files and 3 content READMEs
node scripts/build_spec.mjs --check  # verifies byte-identity, writes nothing
node --test scripts/test_build_spec.mjs  # adversarial builder test suite (negative paths)
\`\`\`

\`--check\` 会验证 inventory lock,在内存中重新生成全部六个文件,并与
已提交的文件逐字节比较:三个规范文件与三个 content README。成功时:
退出码 0 且**完全静默**。出现分歧时:退出码 1,并给出诊断
信息,指出第一个不同字节所在的单元、语言和行。它不写任何文件。写入模式
会先准备全部六个临时文件和可恢复的备份,再替换目标;替换阶段发生可捕获
的 I/O 错误时,会恢复所有目标(包括原本不存在的文件)并清理临时文件。
这不保证进程被终止时的原子性。

\`node --test scripts/test_build_spec.mjs\` 运行构建器的对抗性测试套件
(负面路径):它向验证器提供故意损坏的内容树,断言本 README 中记载的每一条
closed-world 不变量都会被拒绝。

推荐工作流:编辑单元文件 -> 运行 \`node scripts/build_spec.mjs\` ->
核对三个 \`.md\` 文件的 \`git diff\` 是否与你的意图完全一致 -> 运行
\`scripts/check_translation_parity.py\` -> 把单元改动与重新生成的
\`.md\` 文件**一起**提交。

## 如何新增一节

示例(虚构):新增顶层风格的节 \`## 9.9 Widget Frobnication\` 与子节
\`### 9.9.1 Widget Modes\`,分隔符只用空格。

步骤:

1. 创建各单元的文件夹、\`meta.js\`(含 \`"bodyParts": 1\`)与
   \`body-1.js\`(注意上面的末尾空行规则)。
2. 把两个文件夹名按正确的文档位置插入 \`manifest.js\` 与 inventory
   lock 的 \`units\` 数组(位于紧邻 9.9 之前的单元之后)。
3. 运行 \`node scripts/build_spec.mjs\`,检查 \`git diff\`,运行对等性
   检查,然后把单元与重新生成的 \`.md\` 文件一起提交。

\`sec-9.9/meta.js\`:

\`\`\`js
export default {
  "kind": "numbered",
  "number": "9.9",
  "sep": " ",
  "level": 2,
  "title": {
    "en": "Widget Frobnication",
    "ru": "...",
    "zh": "..."
  },
  "bodyParts": 1
}
\`\`\`

注意:\`sep\` 取决于作者写出的标题文本。对于带点的标题
\`## 9.9. Widget Frobnication\`,它是 \`". "\`;对于
\`## 9.9 Widget Frobnication\`,则是 \`" "\`。记录你实际写下的形式,并
保持一致。对于子节 \`### 9.9.1 Widget Modes\`,\`sec-9.9.1/meta.js\` 形态
相同,只是 \`"number": "9.9.1"\`、\`"level": 3\`。

\`sec-9.9/body-1.js\`(虚构占位内容),并标出末尾换行规则适用的位置:

\`\`\`js
// sec-9.9/body-1.js  (last unit in manifest order? then en must end "\\n", else "\\n\\n")
export default {
  en: \`Frobnicate the widget.

(body of 9.9)
\`,
  ru: \`...\`,
  zh: \`...\`,
};
\`\`\`

下一个单元标题之前的末尾空行,是该单元最后一块(此处 \`body-1.js\`,
因为 \`"bodyParts": 1\`)的最后几个字节:上面 \`en\` 字符串以 \`"\\n\\n"\`
结尾(恰好一行空行),除非 9.9 是 manifest 顺序中的最后一个单元——
那它以单个 \`"\\n"\` 结尾。多块单元中更早的块不携带这类末尾字节。

## 历史 / 引导

这套布局由一次性的机械迁移创建,记录在
\`scripts/archive/extract_content_units.py\` 中:它按行范围逐字节切分
当时的三个 \`.md\` 文件成单元(未重新键入任何文本),并验证了重建
结果逐字节一致。后来该脚本被扩展为直接生成当前的 \`body-*.js\` 模式
——每个单元有带 \`bodyParts\` 的 \`meta.js\` 加 \`body-1..N\`。该脚本
仅作为出处留档,不是常规工具:它拒绝覆盖已存在的 \`content/\`,且
没有覆盖标志。从零重建意味着先手动删除 \`content/\`,作为单独的、
有意的动作。**日常**工作流是反方向:编辑单元,然后由
\`build_spec.mjs\` 重新生成 \`.md\` 文件。

## 范围之外

CI 已在 \`.github/workflows\` 中于每次 push/PR 时运行
\`node scripts/build_spec.mjs --check\` 与
\`node --test scripts/test_build_spec.mjs\`。
`,
};
