// Thin ktav-specific configuration layer over @ktav-lang/polydoc, the
// generic "assemble multi-language documents from per-section triple-
// translated source units" engine this file used to implement directly.
// configure() must run before any other polydoc export is used; every
// other build_spec/*.mjs module imports LANGS etc. from HERE (never
// directly from polydoc), which is what guarantees this runs first.
//
// Every export below is named explicitly, not `export *`: several sibling
// wrapper files (root_docs.mjs, registry.mjs) locally override a handful
// of polydoc exports with ktav-specific defaults, and a blanket re-export
// here would silently make those names AMBIGUOUS (and therefore undefined)
// at build_spec.mjs's own aggregate `export *` — ES modules resolve a
// name exported identically by every star-source, but drop it the moment
// two star-sources disagree on which binding it is.
import {
  configure,
  defaultSectionInventoryLockPath as polydocDefaultSectionInventoryLockPath,
  LANGS,
  OUT_FILES,
  README_FILES,
  README_SOURCE_FILE,
  BODY_FILE_RE,
  bodyFileName,
  LANG_SEPARATOR_RE,
  langSeparator,
  RELEASE_FILE,
  VERSION_TOKEN,
  DATE_TOKEN,
  MINOR_LINE_TOKEN,
  minorLineOf,
  MAX_BODY_PARTS,
  BODY_LINE_LIMIT,
  BODY_TARGET_LINES,
  NUMBERED_HEADING_PREFIX_RE,
  UNICODE_WORD_CODE_POINT_RE,
} from '@ktav-lang/polydoc';

configure({
  langs: ['en', 'ru', 'zh'],
  outFileNames: { en: 'spec.md', ru: 'spec.ru.md', zh: 'spec.zh.md' },
  readmeFileNames: { en: 'README.md', ru: 'README.ru.md', zh: 'README.zh.md' },
  sectionInventoryLockFormat: 'ktav-section-inventory',
  rootDocuments: ['README', 'CHANGELOG', 'CONTRIBUTING', 'SECURITY'],
});

export {
  LANGS,
  OUT_FILES,
  README_FILES,
  README_SOURCE_FILE,
  BODY_FILE_RE,
  bodyFileName,
  LANG_SEPARATOR_RE,
  langSeparator,
  RELEASE_FILE,
  VERSION_TOKEN,
  DATE_TOKEN,
  MINOR_LINE_TOKEN,
  minorLineOf,
  MAX_BODY_PARTS,
  BODY_LINE_LIMIT,
  BODY_TARGET_LINES,
  NUMBERED_HEADING_PREFIX_RE,
  UNICODE_WORD_CODE_POINT_RE,
};

// The lock's filename carries the spec's own current version, which
// polydoc has no reason to know.
export const SECTION_INVENTORY_LOCK_FILE = 'section-inventory.0.8.lock.json';

export function defaultSectionInventoryLockPath(contentDir) {
  return polydocDefaultSectionInventoryLockPath(contentDir, SECTION_INVENTORY_LOCK_FILE);
}
