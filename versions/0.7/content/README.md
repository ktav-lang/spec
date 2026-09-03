# versions/0.7/content/ — spec content units

**Languages:** **English** · [Русский](README.ru.md) · [简体中文](README.zh.md)

## What this directory is

This directory is the **per-section source of truth** for
`versions/0.7/spec.md`, `versions/0.7/spec.ru.md`, and
`versions/0.7/spec.zh.md`.

- The three `.md` files at `versions/0.7/` are **generated artifacts**. They
  remain committed in the repo so the spec is directly readable on GitHub,
  but they must **never be hand-edited**: a hand edit is overwritten by the
  next build and makes `node scripts/build_spec.mjs --check` fail.
- The **content units** in this directory (one folder per section) are what
  humans edit.
- `scripts/check_translation_parity.py` continues to run against the
  generated `.md` files as an after-the-fact structural gate;
  `node scripts/build_spec.mjs --check` is the byte-exact gate.

## Current inventory

103 units: 1 `frontmatter/`, 97 numbered `sec-<number>/` (`sec-1`,
`sec-3.1`, `sec-5.3.3`, `sec-10.7`), and 5 named `named-<slug>/`
(`named-abstract`, `named-appendix-a` .. `named-appendix-d`). Plus:

- `manifest.js` — the ordered list of units (see below).
- `package.json` — `{"type":"module"}`. This is **required**: `build_spec.mjs`
  dynamically imports the unit `meta.js` files, and without a nearby
  `package.json` with `"type": "module"` Node would treat `.js` files as
  CommonJS. (The repo root has no `package.json`.)

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

## Unit contents

Each unit directory contains exactly: `meta.js`, `body-1.js`, ..., `body-N.js`
(N >= 1). There are **no** `.md` files under `content/` — zero, except this
README.md itself.

### `meta.js`

Every `meta.js` uses `export default { ... }` (JSON-style). The three shapes,
verbatim:

```js
// frontmatter/meta.js
export default { "kind": "frontmatter", "number": null, "level": null, "title": null, "bodyParts": 1 };

// sec-3.1/meta.js
export default {
  "kind": "numbered",
  "number": "3.1",
  "sep": " ",
  "level": 3,
  "title": { "en": "...", "ru": "...", "zh": "..." },
  "bodyParts": 1
};

// named-appendix-a/meta.js
export default {
  "kind": "named",
  "number": null,
  "level": 2,
  "title": { "en": "...", "ru": "...", "zh": "..." },
  "bodyParts": 1
};
```

Field meanings:

- `kind` — `frontmatter`, `numbered`, or `named`.
- `number` — the section number as a string (`"3.1"`), `null` for
  non-numbered units and frontmatter.
- `level` — the heading `#` count (`##` = 2). `null` for frontmatter.
- `title` — the heading text in each language, **without** the leading
  number and separator; the generator re-attaches them.
- `sep` — the separator actually used between number and title. **Why it
  exists:** the spec's heading convention deliberately mixes
  `## 1. Introduction` (top-level numbered sections, dot + space) with
  `### 3.1 Character Set` (deeper subsections, space only). The generator
  must reproduce each heading byte-exactly, so the actual separator is
  recorded per unit. Only `". "` and `" "` are legal. The extraction script
  enforces that all three languages use the same `sep` for a unit.
- `bodyParts` — the integer count of `body-*.js` files for the unit
  (N in `body-1.js` .. `body-N.js`). Always >= 1. Present on ALL units,
  including `frontmatter`, and always appended **last**.

### `body-<k>.js`

Each `body-<k>.js` has exactly this shape (2-space indent, template
literals, real multi-line prose inside, no added whitespace inside the
literals, trailing newline after `};`):

```js
export default {
  en: `...raw text chunk k for English...`,
  ru: `...`,
  zh: `...`,
};
```

The unit's full body text for a language is the **concatenation** of chunks
1..N, in order, with **no separator** between chunks.

**Escaping rule (mechanical, in this exact order).** To embed raw text `t`
in a template literal:

1. replace every `\` with `\\`;
2. replace every backtick with `` \` ``;
3. replace every `${` with `\${`;

then wrap the result in backticks. Backslashes must be replaced **first**,
or you double-escape them. **Never retype content by hand — script this
transformation.**

**Splitting rule (exact numbers).** Let `L` = max line count over the unit's
three language bodies.

- If `L <= 120`, `N = 1` (a single `body-1.js`).
- If `L > 120`, `N = ceil(L / 100)`.

Each language is split **independently** into N chunks by cutting only at
blank-line boundaries (an empty line — never mid-line), choosing the N-1 cut
points as the blank lines closest to the proportional target offsets
`i*L/N` for `i = 1..N-1`. If a language lacks enough distinct interior blank
lines for N-1 cut points, N for the **whole unit** is reduced to
(available cut points + 1) rather than failing. Semantic alignment of parts
across languages is **not** a goal — this is file-size hygiene only.

## Body files (critical for byte-exactness)

The unit body in each language is the concatenation of `body-1.js` ..
`body-N.js` string values, in order, with **no separator inserted between
chunks**. The generator inserts nothing between units either, so
blank-line separation lives at the END of the **last chunk of the unit**:

- Every unit **except the last unit's** ends with exactly ONE blank line,
  i.e. the last chunk's string ends with `"\n\n"`.
- The **last unit in manifest order** ends with a single final newline and
  no trailing blank line (`"\n"`), as the last bytes of its last chunk.
- The frontmatter body ends with the one blank line before the first
  section heading.

When a unit is split into multiple chunks, those trailing bytes simply live
at the end of the LAST chunk — earlier chunks carry no special trailing
whitespace of their own beyond what the split produced.

Getting this wrong is the #1 way to make `--check` fail.

## `manifest.js`

An explicit **ordered** array of the 103 folder names in true document
order. It starts `["frontmatter", "named-abstract", "sec-1", ...]` and ends
`[..., "named-appendix-d"]`. It is **never sorted alphabetically**:
`"sec-10.7"` must come after `"sec-2"`, and named sections sit at their real
document positions. When adding a unit, insert its name at the correct
position manually.

## How the generator builds a file

`scripts/build_spec.mjs` walks the manifest in order. For each unit it reads
`meta.bodyParts` from `meta.js` and dynamically imports `body-1.js` ..
`body-N.js` **in order**, then:

- for `frontmatter`: emit the concatenation of the `en` / `ru` / `zh`
  strings of `body-1` .. `body-N`, verbatim;
- for every other unit: emit
  `'#'.repeat(level) + ' ' + (numbered ? number + sep : '') + title[lang] + '\n'`,
  then the concatenated body strings;
- concatenate.

Commands:

```sh
node scripts/build_spec.mjs          # writes the 3 spec .md files
node scripts/build_spec.mjs --check  # verifies byte-identity, writes nothing
```

`--check` regenerates the three files in memory and byte-compares them
against the committed files. On success: exit 0 and **completely silent**.
On divergence: exit 1 with a diagnostic naming the unit, language, and line
of the first differing byte. It writes nothing.

Recommended workflow: edit unit files -> run `node scripts/build_spec.mjs`
-> verify `git diff` on the three `.md` files shows exactly what you
intended -> run `scripts/check_translation_parity.py` -> commit the unit
changes and the regenerated `.md` files **together**.

## How to add a new section

Example (fictional): adding top-level-style section `## 9.9 Widget Frobnication`
with subsection `### 9.9.1 Widget Modes`, using space-only separators.

Steps:

1. Create the folders, `meta.js` (with `"bodyParts": 1`), and `body-1.js`
   per unit (mind the trailing-blank-line rule above).
2. Insert both folder names into `manifest.js` at the correct document
   positions (after the unit preceding section 9.9).
3. Run `node scripts/build_spec.mjs`, check the `git diff`, run the parity
   checker, then commit units + regenerated `.md` files together.

`sec-9.9/meta.js`:

```js
export default {
  "kind": "numbered",
  "number": "9.9",
  "sep": " ",
  "level": 2,
  "title": { "en": "Widget Frobnication", "ru": "...", "zh": "..." },
  "bodyParts": 1
};
```

Note: `sep` depends on the heading text the author writes. For a
dot-style heading `## 9.9. Widget Frobnication` it would be `". "`;
for `## 9.9 Widget Frobnication` it is `" "`. Record what you actually
wrote, and be consistent. For the subsection `### 9.9.1 Widget Modes`,
`sec-9.9.1/meta.js` is the same shape with `"number": "9.9.1"`, `"level": 3`.

`sec-9.9/body-1.js` (fictional placeholder content), marking where the
trailing newline rules apply:

```js
// sec-9.9/body-1.js  (last unit in manifest order? then en must end "\n", else "\n\n")
export default {
  en: `Frobnicate the widget.

(body of 9.9)
`,
  ru: `...`,
  zh: `...`,
};
```

The trailing blank line before the next unit's heading is the LAST bytes of
the LAST chunk of the unit (here `body-1.js`, since `"bodyParts": 1`): the
`en` string above ends `"\n\n"` (exactly one blank line) unless 9.9 is the
last unit in manifest order, in which case it ends with a single `"\n"`.
Earlier chunks (in a multi-chunk unit) carry no such trailing bytes.

## History / bootstrap

This layout was created by a one-time mechanical migration, recorded in
`scripts/archive/extract_content_units.py`: it sliced the then-current
three `.md` files into units by line-range byte-slicing (no text was
retyped) and verified byte-identical reconstruction. It was later extended
to emit the current `body-*.js` schema directly — `meta.js` with
`bodyParts` plus `body-1..N` per unit. The script is kept for provenance
only, not as a routine tool: it refuses to overwrite an existing
`content/` and has no override flag. Rebuilding from scratch means
manually deleting `content/` first as a separate, deliberate action. The
**ongoing** workflow is the opposite direction: edit units, then
`build_spec.mjs` regenerates the `.md` files.

## Out of scope

CI already runs `node scripts/build_spec.mjs --check` in
`.github/workflows` on every push/PR.
