import {
  validateContentDir as polydocValidateContentDir,
  buildBuffers as polydocBuildBuffers,
} from '@ktav-lang/polydoc';
import { defaultSectionInventoryLockPath } from './shared.mjs';

export {
  substituteReleaseTokens,
  derivedFacts,
  substituteDerivedFacts,
  splitPlan,
  validateUnitTerminalNewlines,
  DERIVED_TOKEN_RE,
  LOCK_ROOT_KEYS,
  LOCK_UNIT_KEYS,
  RELEASE_DATE_RE,
  RELEASE_KEY_ORDER,
  RELEASE_VERSION_RE,
  TOP_LEVEL_ALLOWED_FILES,
  assertRegularDestination,
  bodySplitPlan,
  readCanonicalJson,
  readJsonDefault,
  readRelease,
  structuralMeta,
  validateBodySplitting,
  validateSectionInventoryLock,
} from '@ktav-lang/polydoc';

// requireSectionInventoryLock (or an explicit sectionInventoryLockPath) used
// to auto-derive scripts/locks/section-inventory.0.8.lock.json when the path
// was omitted — a ktav-specific filename polydoc has no reason to know.
// This wrapper restores exactly that default for the two entry points that
// used it, so every existing caller (build_spec.mjs's cli() and several
// tests) keeps working unchanged.
function withDefaultLockPath(contentDir, options) {
  if (!options.requireSectionInventoryLock && options.sectionInventoryLockPath === undefined) {
    return options;
  }
  return {
    ...options,
    sectionInventoryLockPath: options.sectionInventoryLockPath ??
      defaultSectionInventoryLockPath(contentDir),
  };
}

export async function validateContentDir(contentDir, options = {}) {
  return polydocValidateContentDir(contentDir, withDefaultLockPath(contentDir, options));
}

export async function buildBuffers(contentDir, options = {}) {
  return polydocBuildBuffers(contentDir, withDefaultLockPath(contentDir, options));
}
