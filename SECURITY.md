# Security Policy

**Languages:** **English** · [Русский](SECURITY.ru.md) · [简体中文](SECURITY.zh.md)

## Supported versions

This repository contains the **specification** of the Ktav format and
the shared conformance suite. It ships no runtime and no compiled
artefact, so "security" here is narrow: we care about spec-level
defects that let implementations **diverge in ways an attacker could
exploit downstream**.

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅                 |
| older   | ❌ — upgrade first |

## Reporting a vulnerability

**Please do not open a public issue for security-relevant spec
problems.**

Email **phpcraftdream@gmail.com** with:

- A short description of the ambiguity or fixture error.
- A minimal Ktav snippet that two real implementations disagree on,
  or a fixture whose JSON oracle is wrong.
- Which implementations you tested against (e.g. `ktav-lang/rust`
  0.1.0, `ktav-lang/python` 0.1.0, your own reader) and how they
  disagree.
- Your disclosure timeline preference, if you have one.

You should get an acknowledgement within **72 hours**. A published
fix (spec wording clarification, fixture correction, new test case)
typically follows within **a week**, longer if implementations need
to catch up in lockstep.

## Scope

Issues that count as security-relevant for this repo:

- **Parser divergence:** two spec-conformant implementations accept /
  reject the same input differently. An attacker who knows which
  side a consumer is on can smuggle data past a validator written in
  the other.
- **Oracle errors:** a `.json` oracle in `versions/*/tests/valid/`
  that doesn't match what the spec actually mandates — implementations
  calibrated against it drift from the real grammar.
- **Under-specified behaviour:** a corner of the grammar the spec
  leaves ambiguous, and you can show that real implementations take
  opposite calls on it.
- **Missing invariants:** a property the spec implies but never
  states (e.g. an error class, a bound, a determinism guarantee).

Issues that are **not** security problems here — please use regular
issues for these:

- Clarity / phrasing of the spec prose.
- Requests to extend the format with new features — those go through
  the normal RFC-style discussion process.
- Bugs in a specific implementation — report to that binding's repo
  (`ktav-lang/rust`, `ktav-lang/python`, `ktav-lang/js`,
  `ktav-lang/golang`, …).
