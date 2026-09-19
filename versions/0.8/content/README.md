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

107 units: 1 `frontmatter/`, 100 numbered `sec-<number>/` (`sec-1`,
`sec-3.1`, `sec-5.3.3`, `sec-10.7`), and 6 named `named-<slug>/`
(`named-abstract`, `named-appendix-a` .. `named-appendix-d`). Plus:

- `scripts/locks/section-inventory.0.7.lock.json` is an independent,
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

Each unit directory contains exactly: `meta.js`, `body-1.md`, ..., `body-N.md`
(N >= 1). A body file IS Markdown — that is the point of the format: the
specification is a Markdown document, and holding it in JavaScript string
literals meant every code fence was written as escaped backticks. `meta.js`
is not Markdown; it is a static data file, and the `.js` extension marks
exactly that difference. A unit directory contains nothing else.

### `meta.js`

Every `meta.js` uses `export default { ... }` (JSON-style). The three shapes,
verbatim:

```js
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
```

The whole file must be byte-identical to `export default ` followed by the
value serialized as strict JSON (`JSON.stringify(value, null, 2)`) plus one
trailing newline: one key per line, 2-space indent, LF line endings, no
trailing semicolon. The payload after `export default ` is parsed as JSON
(`JSON.parse`), **not** evaluated as a JavaScript object literal — trailing
commas, comments, unquoted keys, and semicolons are never valid there
(unlike `body-<k>.md`, which is Markdown and holds no code at all).
Duplicate keys are rejected too: the builder compares the file byte-for-byte
against the canonical serialization above, and a repeated key makes the raw
file differ from it.

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
- `bodyParts` — the integer count of `body-*.md` files for the unit
  (N in `body-1.md` .. `body-N.md`). Always >= 1. Present on ALL units,
  including `frontmatter`, and always appended **last**. The builder
  accepts at most 4096 parts per unit and rejects larger values before reading
  body files.

### `body-<k>.md`

Each `body-<k>.md` is Markdown carrying one block per language, each
introduced by its own separator line:

```text
 >>>>> lang=en
 ...raw text chunk k for English...
 >>>>> lang=ru
 ...
 >>>>> lang=zh
 ...
```

The example above is indented by one space on purpose: a separator is
recognised only at the very start of a line, so an indented one is
ordinary content. That is also the escape hatch if a body ever has to
quote a separator literally.

A block runs from the line after its separator to the line before the next
separator, or to end of file for the last one. The block therefore keeps
its own trailing newline, and a chunk ending in a blank line keeps that
blank line.

**There is no escaping.** The content is stored as itself: a code fence is
written as a code fence, a backslash is a backslash, `${` is two ordinary
characters. This is why the format is Markdown rather than a string
literal — the specification is full of fenced examples, and every one of
them used to be spelled with escaped backticks.

The one thing the content may not contain is a line beginning
`>>>>> lang=`. That spelling was chosen because it is not syntax this
document uses: a Markdown heading marker would have competed with the
prose it delimits. A stray or duplicated separator is a build error, never
a silent block boundary.

The format itself names no languages and fixes no order — the decoded
result is a map. What it requires is that a language appear at most once
per file. That every source carries the same set, and that the set is
exactly `en`, `ru`, `zh`, is this specification's own rule layered on top.

The unit's full body text for a language is the **concatenation** of chunks
1..N, in order, with **no separator** between chunks.

**Release tokens.** Any unit body may contain the plain-ASCII tokens
`@@VERSION@@` and `@@DATE@@`; they are ordinary text here, so no
escaping is needed. At build time the builder substitutes them with the
`version` / `released` values from `release.js` in every language. A
surviving token in a spec output fails the build; README.source.md is never
substituted and may mention the tokens literally.

**Splitting rule (exact numbers).** Let `L` = max line count over the unit's
three language bodies.

- If `L <= 40`, `N = 1` (a single `body-1.md`).
- If `L > 40`, `N = ceil(L / 30)`.

The N-1 cut points are chosen **once, for the whole unit**, and applied to
every language. They are chosen as paragraph-boundary INDICES, not character
offsets: boundary `i` is the i-th blank line, and that is the same break in
every translation, so `body-k.md` holds the same fragment in all three
languages. The indices come from the language with the most lines, since the
size rule above is expressed in its lines; ties break on the declared
language order, so the choice is deterministic. Within that language the
N-1 boundaries closest to the proportional targets `i*L/N` are taken, and an
equidistant tie chooses the earlier one. If the unit has fewer interior
blank lines than N-1, N is reduced to (available boundaries + 1) rather than
failing.

Semantic alignment across languages IS the goal, and it is the reason the
cuts are shared. Splitting each language independently — the earlier rule —
put three unrelated slices in one file: Chinese runs about half the length
of English for the same meaning, so its proportional targets landed
elsewhere and its parts drifted away from the other two. Nothing was lost,
because the generator concatenates, but a body file could not be opened and
compared, which is the whole reason the sources are Markdown.

One consequence to expect: editing a translation can change its line count,
move a shared boundary, and leave the OTHER languages' parts disagreeing
with the mandate. The builder refuses the build until the unit is re-cut.
That is the rule working, not a fault.

## Body files (critical for byte-exactness)

The unit body in each language is the concatenation of `body-1.md` ..
`body-N.md` string values, in order, with **no separator inserted between
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

An explicit **ordered** array of the 107 folder names in true document
order. It starts `["frontmatter", "named-abstract", "sec-1", ...]` and ends
`[..., "named-appendix-d"]`. It is **never sorted alphabetically**:
`"sec-10.7"` must come after `"sec-2"`, and named sections sit at their real
document positions. The independent lock at
`scripts/locks/section-inventory.0.7.lock.json` stores one deterministic
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

## README source object

`README.source.md` has the same narrow static template-object shape as a body
part: exactly `en`, `ru`, and `zh`, with no executable code. Its three strings
are the sole source for the three README files. The generated files are still
committed for browsing, but hand-editing any one of them makes `--check` fail.

## Markdown safety contract

Unit body text MUST NOT contain a raw HTML block opener outside a confirmed
fenced code block. This closed-world rule covers all seven CommonMark HTML
block forms: `script/pre/style/textarea` tags, comments, processing instructions,
declarations, CDATA sections, the block-tag list, and other complete open or
close tags. Type 7 applies only when the line is a complete valid open or
closing tag plus optional whitespace, so autolinks,
malformed tag-like text, and inline-tag prose are not forbidden by that rule.
HTML-like text inside a confirmed fenced code block remains allowed.

## How the generator builds a file

`scripts/build_spec.mjs` walks the manifest in order. For each unit it reads
`manifest.js`/`meta.js` as strict UTF-8 text and `JSON.parse`s the payload after
`export default `, then statically shape-scans and decodes `body-1.md` ..
`body-N.md` **in order** (no code under `content/` is ever executed), then:

- for `frontmatter`: emit the concatenation of the `en` / `ru` / `zh`
  strings of `body-1` .. `body-N`, verbatim;
- for every other unit: emit
  `'#'.repeat(level) + ' ' + (numbered ? number + sep : '') + title[lang] + '\n'`,
  then the concatenated body strings;
- concatenate.

The same run writes the three content READMEs from `README.source.md`; in
`--check` mode it compares those files byte-for-byte as well as the three
generated specification files.

Commands:

```sh
node scripts/build_spec.mjs          # writes the 3 spec .md files and 3 content READMEs
node scripts/build_spec.mjs --check  # verifies byte-identity, writes nothing
node --test scripts/test_build_spec.mjs  # adversarial builder test suite (negative paths)
```

`--check` validates the inventory lock, regenerates all six files in memory,
and byte-compares them against the committed files. On success: exit 0 and
**completely silent**.
On divergence: exit 1 with a diagnostic naming the unit, language, and line
of the first differing byte. It writes nothing. Write mode stages all six
temporary outputs and recoverable backups before replacement. The transaction
journal is one atomically replaced, fsynced snapshot: it contains only a
validated nonce, digests, phase indexes, and the six known output identities;
all temporary and backup paths are derived by the builder. Before its durable
commit marker, recovery restores the exact old bytes; after it, recovery keeps
the exact new bytes and only finishes cleanup. A live cooperative lock rejects
a second writer. Linux and Windows owners derive their incarnation through
the same observable process-start path used by reclaimers; when that source
is unavailable, the owner records an unverified incarnation and a live PID
is never reclaimed. Lease expiry alone never reclaims a live matching
incarnation: only a proven-dead process or a provably different incarnation
may be reclaimed. Reclaim publishes a fresh owner-specific claim before
capturing the stale target and removes only artifacts for the exact old
owner. Release captures its alias in an owner-specific claim and restores a
replacement before removing any owner artifacts. Legacy fixed candidate,
claim, and lease files are cleaned only after conservative owner validation;
`--check` only reports them. If a pending journal, lock, or artifact exists,
`--check`
reports it and performs no recovery or cleanup. Directory fsync is unavailable
on some platforms (notably Windows), so those builds explicitly provide
file-only crash durability rather than claiming power-loss durability.

`node --test scripts/test_build_spec.mjs` runs the builder's adversarial
(negative-path) test suite: it feeds deliberately malformed content trees
to the validator and asserts each closed-world invariant documented in
this README is rejected.

Recommended workflow: edit unit files -> run `node scripts/build_spec.mjs`
-> verify `git diff` on the three `.md` files shows exactly what you
intended -> run `python scripts/check_translation_parity.py versions/0.7/spec.md versions/0.7/spec.ru.md versions/0.7/spec.zh.md` -> commit the unit
changes and the regenerated `.md` files **together**.

## How to add a new section

Example (fictional): adding top-level-style section `## 9.9 Widget Frobnication`
with subsection `### 9.9.1 Widget Modes`, using space-only separators.

Steps:

1. Create the folders, `meta.js` (with `"bodyParts": 1`), and `body-1.md`
   per unit (mind the trailing-blank-line rule above).
2. Insert both folder names into `manifest.js` and the lock's `units` array at
   the correct document positions (after the unit preceding section 9.9).
3. Run `node scripts/build_spec.mjs`, check the `git diff`, run the parity
   checker, then commit units + regenerated `.md` files together.

`sec-9.9/meta.js`:

```js
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
```

Note: `sep` depends on the heading text the author writes. For a
dot-style heading `## 9.9. Widget Frobnication` it would be `". "`;
for `## 9.9 Widget Frobnication` it is `" "`. Record what you actually
wrote, and be consistent. For the subsection `### 9.9.1 Widget Modes`,
`sec-9.9.1/meta.js` is the same shape with `"number": "9.9.1"`, `"level": 3`.

`sec-9.9/body-1.md` (fictional placeholder content), marking where the
trailing newline rules apply:

```js
// sec-9.9/body-1.md  (last unit in manifest order? then en must end "\n", else "\n\n")
export default {
  en: `Frobnicate the widget.

(body of 9.9)
`,
  ru: `...`,
  zh: `...`,
};
```

The trailing blank line before the next unit's heading is the LAST bytes of
the LAST chunk of the unit (here `body-1.md`, since `"bodyParts": 1`): the
`en` string above ends `"\n\n"` (exactly one blank line) unless 9.9 is the
last unit in manifest order, in which case it ends with a single `"\n"`.
Earlier chunks (in a multi-chunk unit) carry no such trailing bytes.

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

## Out of scope

CI already runs `node scripts/build_spec.mjs --check` and
`node --test scripts/test_build_spec.mjs` in `.github/workflows` on every
push/PR.
