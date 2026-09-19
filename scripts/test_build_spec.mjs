// test_build_spec.mjs — adversarial node:test suite for scripts/build_spec.mjs
// Run: node --test scripts/test_build_spec.mjs
// Builds self-contained fixtures in temp dirs; the only real-repo inputs are
// the three content READMEs (README.md / README.ru.md / README.zh.md), read
// by the README acceptance test.
//
// This file registers nothing itself. Importing a module runs its
// `test(...)` calls, so the order below IS the order the suite reports,
// and the whole inventory of what is covered fits on one screen:
//
//   content/    what a content directory may contain and what the builder
//               says when it may not
//   markdown/   the CommonMark rules a unit body must not break
//   drift/      the hand-maintained files nobody generates
//   transactions/ the six-output write, its crash recovery and its locks
//
// The shared fixture layer — the temp-directory content builder, the
// meta/body encoders, the platform probes — lives in
// test_build_spec/helpers.mjs and is imported by the modules that need
// it, not re-declared per file.

import './test_build_spec/content/release-tokens.mjs';
import './test_build_spec/content/root-docs.mjs';
import './test_build_spec/markdown/headings.mjs';
import './test_build_spec/markdown/html-and-links.mjs';
import './test_build_spec/content/structure.mjs';
import './test_build_spec/content/nesting.mjs';
import './test_build_spec/content/diagnostics.mjs';
import './test_build_spec/markdown/nesting.mjs';
import './test_build_spec/content/shape.mjs';
import './test_build_spec/transactions/delegations.mjs';
import './test_build_spec/content/source-safety.mjs';
import './test_build_spec/drift/handwritten.mjs';
