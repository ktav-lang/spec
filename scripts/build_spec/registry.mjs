// ktav's own registry of every public Markdown file in this repository —
// project data, not engine logic. The classify/scan/lock machinery lives
// in @ktav-lang/polydoc; this file supplies what that machinery cannot
// know: which files fall in which category, and where this repository's
// release output and frozen-docs lock live.
//
//   generated  rebuilt from source units by build_spec and byte-checked
//              on every run. The list is derived, in expectedGeneratedPaths,
//              from what the builder actually builds, and the check proves
//              the explicit list never drifts from that derivation.
//   frozen     historical (0.7) artifacts no tool can regenerate. They are
//              pinned by scripts/locks/frozen-docs.lock.json, and editing
//              one is a deliberate act recorded by --write-frozen-lock.
//   internal   deliberately outside the output contract: sources (the
//              retired single-file README.source.md shape) and working
//              notes (docs/checkpoints, docs/reviews). Classified so they
//              are not mistaken for unregistered output; never checked.

import {
  checkDocsRegistry as polydocCheckDocsRegistry,
  classifyRegistered as polydocClassifyRegistered,
  defaultFrozenDocsLockPath as polydocDefaultFrozenDocsLockPath,
  expectedGeneratedPaths as polydocExpectedGeneratedPaths,
  writeFrozenDocsLock as polydocWriteFrozenDocsLock,
} from '@ktav-lang/polydoc';
import { RELEASE_PATH } from './drift.mjs';

export { internalEntryMatches, scanPublicMarkdown, frozenSha256 } from '@ktav-lang/polydoc';

const FROZEN_DOCS_LOCK_FILE = 'frozen-docs.lock.json';

export const DOCS_REGISTRY = {
  generated: [
    'README.md', 'README.ru.md', 'README.zh.md',
    'CHANGELOG.md', 'CHANGELOG.ru.md', 'CHANGELOG.zh.md',
    'CONTRIBUTING.md', 'CONTRIBUTING.ru.md', 'CONTRIBUTING.zh.md',
    'SECURITY.md', 'SECURITY.ru.md', 'SECURITY.zh.md',
    'versions/0.8/spec.md', 'versions/0.8/spec.ru.md', 'versions/0.8/spec.zh.md',
    'versions/0.8/content/README.md',
    'versions/0.8/content/README.ru.md',
    'versions/0.8/content/README.zh.md',
  ],
  frozen: [
    'versions/0.7/spec.md', 'versions/0.7/spec.ru.md', 'versions/0.7/spec.zh.md',
    'versions/0.7/content/README.md',
    'versions/0.7/content/README.ru.md',
    'versions/0.7/content/README.zh.md',
  ],
  internal: [
    'versions/*/content/README.source.md',
    'docs/checkpoints/',
    'docs/reviews/',
  ],
};

export function expectedGeneratedPaths() {
  return polydocExpectedGeneratedPaths(RELEASE_PATH);
}

export function classifyRegistered(rel) {
  return polydocClassifyRegistered(DOCS_REGISTRY, rel);
}

export function defaultFrozenDocsLockPath(repoRoot) {
  return polydocDefaultFrozenDocsLockPath(repoRoot, FROZEN_DOCS_LOCK_FILE);
}

export function checkDocsRegistry(repoRoot, lockPath = defaultFrozenDocsLockPath(repoRoot)) {
  return polydocCheckDocsRegistry(repoRoot, DOCS_REGISTRY, lockPath, RELEASE_PATH);
}

export async function writeFrozenDocsLock(repoRoot, lockPath) {
  return polydocWriteFrozenDocsLock(repoRoot, DOCS_REGISTRY, lockPath);
}
