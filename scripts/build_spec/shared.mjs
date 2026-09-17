import path from 'node:path';

export const LANGS = ['en', 'ru', 'zh'];
export const OUT_FILES = { en: 'spec.md', ru: 'spec.ru.md', zh: 'spec.zh.md' };
export const README_FILES = { en: 'README.md', ru: 'README.ru.md', zh: 'README.zh.md' };
export const README_SOURCE_FILE = 'README.source.js';
export const RELEASE_FILE = 'release.js';
export const VERSION_TOKEN = '@@VERSION@@';
export const DATE_TOKEN = '@@DATE@@';
export const SECTION_INVENTORY_LOCK_FILE = 'section-inventory.0.7.lock.json';

const NUMBERED_HEADING_PREFIX_RE = /^\d+(?:\.\d+)*/u;
const UNICODE_WORD_CODE_POINT_RE = /^[\p{L}\p{N}_]/u;

const BODY_LINE_LIMIT = 40;
const BODY_TARGET_LINES = 30;
// The split rule targets roughly 30 lines per file. This cap still permits
// about 122,880 body lines, but prevents metadata from driving an unbounded
// body-file loop before the files themselves have been inspected.
export const MAX_BODY_PARTS = 4096;

export function defaultSectionInventoryLockPath(contentDir) {
  return path.resolve(
    contentDir, '..', '..', '..', 'scripts', 'locks', SECTION_INVENTORY_LOCK_FILE);
}


export { BODY_LINE_LIMIT, BODY_TARGET_LINES, NUMBERED_HEADING_PREFIX_RE, UNICODE_WORD_CODE_POINT_RE };
