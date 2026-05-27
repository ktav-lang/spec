# Contributing to Ktav

**Languages:** **English** · [Русский](CONTRIBUTING.ru.md) · [简体中文](CONTRIBUTING.zh.md)

Thanks for looking. Ktav is a small format on purpose — the bar for
accepting changes is deliberately high, and that bar is **not** "would
this be a nice feature." The bar is: **does this change make Ktav
smaller, simpler, or more coherent?**

This document covers (1) what belongs in the spec, (2) what doesn't,
(3) how the version/release process works, and (4) how to submit.

## What belongs here

This repository is the format itself. Three kinds of change land here:

### 1. Editorial — `PATCH` bump

Fixes that do not change what a conforming parser does. Typos,
reworded paragraphs, clearer examples, better test names, new
*conformance* tests (new angles on existing rules — not new rules).

Ship a PR directly. One-line description in the commit, updated
version in `versions/<v>/spec.md` header and `CHANGELOG.md`.

### 2. Additive — `MINOR` bump

Backward-compatible extensions. A new keyword, a new primitive form,
a new multi-line-string variant — something old parsers would reject
but whose absence doesn't break existing documents.

Open an issue first. The issue must answer, in order:

1. **What does this let users do that they currently can't?** Show a
   real config, not a synthetic example.
2. **What's the cost?** Every rule added is a rule every implementer
   has to get right, and a rule every reader has to know.
3. **Can the same thing be expressed within the existing grammar?**
   If yes, that's usually the better answer.

Additions ship as a new `versions/<x>.(y+1)/` directory with its own
spec and tests. The previous version stays frozen — implementations
continue to pin to whichever version they support.

### 3. Breaking — `MAJOR` bump

A change in grammar or semantics that makes some previously-valid
document invalid, or changes its meaning. These are rare. Same
process as additive, plus a migration note that describes what
changes and why.

Breaking changes land in a new `versions/(x+1).0/` directory.
Previous majors remain published forever — implementations targeting
them are not obsoleted.

## What doesn't belong here

- **Parser tricks** — if it's not expressible in the spec document,
  it's an implementation concern. File it in the relevant
  implementation's repo (`ktav-lang/rust`, etc.).
- **Performance claims** — also implementation-level.
- **Integrations** (how Ktav talks to your favourite DI framework,
  schema validator, etc.) — downstream of the spec.
- **"Why not just use YAML / TOML / JSON"** threads — the README's
  comparison table is the whole answer we maintain.

## Design principles

Every proposal is weighed against these, in priority order:

1. **Locality.** A line's meaning must not depend on a declaration
   elsewhere in the file, or in another file.
2. **One sentence.** The new rule must be statable in one sentence
   of the specification. If it takes a paragraph, it's probably
   actually two rules.
3. **No whitespace sensitivity** (other than line breaks). Ktav is
   line-based; column alignment never carries meaning.
4. **No magic types.** Strings are strings; numbers are strings at
   the Value level. Typing is the consumer's job (via serde, via
   schema, via code).
5. **Explicit over clever.** `::` is verbose on purpose — the rare
   case where you need a literal should be the one that costs
   extra characters, not the common case.

A proposal that sacrifices any of these needs a correspondingly
large justification.

## Versioning, concretely

```
x . y . z
│   │   └── PATCH — editorial; parsers unaffected
│   └────── MINOR — additive; old docs still valid
└────────── MAJOR — breaking
```

- `versions/<x>.<y>/` is the source of truth for that version.
- `CHANGELOG.md` at the repo root tracks history across all versions.
- `versions.ktav` is the machine-readable index.
- Each release is marked with a git tag carrying the **full**
  `MAJOR.MINOR.PATCH`: `v0.1.0`, `v0.1.1`, `v0.2.0`, … The directory
  name (`versions/0.1/`) drops the PATCH component by convention — a
  PATCH bump updates the directory in place, not next to it — but the
  version string everywhere else stays three-part.

## Submitting

1. Fork, branch, commit with a descriptive message (English or
   Russian both accepted).
2. If the change touches `versions/<v>/`, update the header version
   and add a `CHANGELOG.md` entry under the right heading.
3. Add a conformance test in `versions/<v>/tests/` — either under
   `valid/` (new shape parses correctly) or `invalid/` (new
   constraint rejects the right input). One test per concept.
4. Open a PR referencing the issue (for additive/breaking changes).
   Editorial PRs don't need a prior issue.
5. CI in downstream implementations will check that its parser still
   agrees with the updated test suite.

## Review

Maintainers look for:

- Does the change pass the five principles above?
- Is there a test that would fail if someone implemented it wrong?
- Is the one-sentence rule actually one sentence?
- Does the example read well out of context?

Small, surgical PRs merge fast. Large "while I'm here" refactors of
the spec text get pushed back — break them up.

## Language policy

The `ktav-lang` organisation maintains every prose document in three
parallel languages: English (canonical), Russian, and Simplified
Chinese. File naming: `<name>.md` / `<name>.ru.md` / `<name>.zh.md`.
When you change any prose file, **update all three versions in the
same commit** — translation drift is the main failure mode of
multi-language docs. If you don't speak one of them, mark the
untouched files with `<!-- TODO: sync with <name>.md -->` at the top
and open the PR anyway; a maintainer or community contributor will
fill the gap before merge.

`versions/<v>/spec.md` is normatively English; RU / ZH translations
are informative (helpful to non-English readers, not a source of
authority). RFC 2119 keywords (MUST, SHOULD, MAY, …) stay in English
capitals across every translation — they are technical terms.

Full policy in the org-level
[`.github/AGENTS.md`](https://github.com/ktav-lang/.github/blob/main/AGENTS.md).

## License

By contributing, you agree that your contribution is dual-licensed
under **MIT OR Apache-2.0** at the user's option, same as the rest
of this repository.
