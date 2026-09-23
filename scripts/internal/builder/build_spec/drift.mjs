import fs from 'node:fs';
import path from 'node:path';

import { LANGS } from './shared.mjs';
import { fail } from '@ktav-lang/polydoc';
import { readJsonDefault } from './content.mjs';

// The section-inventory lock writer is generic (see @ktav-lang/polydoc's
// content.mjs) — nothing here is ktav-specific about "rebuild the lock and
// report the delta". Only this file's own hand-maintained-file checks
// below are ktav's own release-consistency policy.
export { writeSectionInventoryLock } from '@ktav-lang/polydoc';

export function escapeRegExp(s) {
  return s.replace(/[.*+?${}()|[\]\\]/gu, '\\$&');
}

// rx('literal {V} and {D} template') -> (version, released) => RegExp.
// Literal segments are regex-escaped; the placeholders receive the escaped
// release values, so a version containing regex metacharacters stays literal.
function rx(template) {
  const segments = template.split(/(\{V\}|\{D\})/u);
  return (version, released) => new RegExp(segments.map((segment) =>
    segment === '{V}' ? escapeRegExp(version)
      : segment === '{D}' ? escapeRegExp(released)
        : escapeRegExp(segment)).join(''), 'mu');
}

// Root files carrying current-version references, checked against what
// release.js declares. Nothing here is ever rewritten by this script.
//
// The name is now only half true, and saying so beats letting it rot:
// `versions.ktav` is the last genuinely hand-maintained entry, and the
// only one still read from disk. README and CHANGELOG are generated from
// their `root-docs/<DOC>/` unit trees (see root_docs.mjs); their anchors
// are evaluated against the freshly assembled root-doc buffers passed in
// by the caller, never against disk, so the check validates exactly what
// will ship. A failure still means editing the SOURCE UNIT, since a fix
// applied to the artifact is overwritten by the next build and rejected
// by --check.
//
// Anchors are regexes pinned to the exact current-version shapes (path
// anchors, dates, banner lines), so historical-version mentions (0.6.x,
// older release dates) can never trip the check. If a deliberate prose
// change breaks an anchor, update the anchor consciously in the same
// commit. All disagreements are collected and reported together.
const HANDWRITTEN_FILES = ['versions.ktav'];

// The current version's CHANGELOG heading. Anchored to the exact date
// on purpose: the failure this catches is a release shipping with its
// entry still headed "unreleased" while release.js already carries the
// date. That happened to 0.7.0, which shipped that way, and nearly
// happened to 0.7.1 — both were caught by eye rather than by a tool.
// Enforcing the heading means the date in release.js and the date in
// the changelog can only move together.
const HANDWRITTEN_CHANGELOG_ANCHORS = {
  'CHANGELOG.md': [rx('^## [{V}] — {D}')],
  'CHANGELOG.ru.md': [rx('^## [{V}] — {D}')],
  // Chinese uses the full-width dash, matching the rest of that file.
  'CHANGELOG.zh.md': [rx('^## [{V}] —— {D}')],
};

const HANDWRITTEN_README_ANCHORS = {
  'README.md': [
    rx('^> Ktav {V}, the current stable specification.'),
    rx('Appendix E of the {V} specification](versions/0.8/spec.md)'),
    rx('^- **Current stable:** [Ktav {V}](versions/0.8/spec.md) — released {D};'),
    rx('The {V} corpus'),
  ],
  'README.ru.md': [
    rx('^> следуют Ktav {V} — текущей стабильной спецификации.'),
    rx('Приложении E спецификации {V}](versions/0.8/spec.ru.md)'),
    rx('^- **Текущая стабильная:** [Ktav {V}](versions/0.8/spec.ru.md) — выпущена {D};'),
    rx('В корпусе {V}'),
  ],
  'README.zh.md': [
    rx('^> {V}。'),
    rx('{V} 规范附录 E](versions/0.8/spec.zh.md)'),
    rx('^- **当前稳定版本：** [Ktav {V}](versions/0.8/spec.zh.md) — 发布于 {D};'),
    rx('{V} 语料库'),
  ],
};

const HANDWRITTEN_KEY_RE = /^\s*([A-Za-z_][A-Za-z0-9_-]*): (.+?)\s*$/u;

// Line-based parser for exactly the versions.ktav file shape: `##`-comment
// lines and blanks are skipped; top-level named blocks `name: {` are closed
// by a lone `}`; the top-level `all: [` list is closed by a lone `]` and
// contains indented `{` ... `}` entries; inside blocks and entries lines are
// `key: value`. This is NOT a general Ktav parser.
function parseVersionsKtav(text, disagreements) {
  const blocks = new Map();
  const allEntries = [];
  let blockName = null;
  let block = null;
  let inAll = false;
  let entry = null;
  const cannotParse = (lineNo, line) =>
    disagreements.push(`versions.ktav: cannot parse line ${lineNo}: ${JSON.stringify(line)}`);
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed.startsWith('##')) continue;
    if (inAll) {
      if (trimmed === ']') { inAll = false; continue; }
      if (trimmed === '{') { entry = {}; continue; }
      if (trimmed === '}') {
        if (entry === null) cannotParse(lineNo, lines[i]);
        else { allEntries.push(entry); entry = null; }
        continue;
      }
      const keyMatch = HANDWRITTEN_KEY_RE.exec(lines[i]);
      if (keyMatch !== null && entry !== null) { entry[keyMatch[1]] = keyMatch[2]; continue; }
      cannotParse(lineNo, lines[i]);
    } else if (blockName !== null) {
      if (trimmed === '}') {
        blocks.set(blockName, block);
        blockName = null;
        block = null;
        continue;
      }
      // A nested `name: {` block start is never valid inside a block.
      if (/^[A-Za-z_][A-Za-z0-9_-]*: \{$/u.test(trimmed)) {
        cannotParse(lineNo, lines[i]);
        continue;
      }
      const keyMatch = HANDWRITTEN_KEY_RE.exec(lines[i]);
      if (keyMatch !== null) { block[keyMatch[1]] = keyMatch[2]; continue; }
      cannotParse(lineNo, lines[i]);
    } else {
      const blockMatch = /^([A-Za-z_][A-Za-z0-9_-]*): \{$/u.exec(trimmed);
      if (blockMatch !== null) { blockName = blockMatch[1]; block = {}; continue; }
      if (trimmed === 'all: [') { inAll = true; continue; }
      cannotParse(lineNo, lines[i]);
    }
  }
  if (blockName !== null) {
    disagreements.push(`versions.ktav: cannot parse: block "${blockName}" is not closed by a "}" line`);
  }
  if (inAll) {
    disagreements.push('versions.ktav: cannot parse: the "all" list is not closed by a "]" line');
  }
  return { blocks, allEntries };
}

const RELEASE_PATH = 'versions/0.8';

function checkVersionsKtav(text, release, disagreements) {
  const { blocks, allEntries } = parseVersionsKtav(text, disagreements);
  for (const name of ['stable', 'latest']) {
    const block = blocks.get(name);
    if (block === undefined) {
      disagreements.push(`versions.ktav: block "${name}" is missing`);
      continue;
    }
    if (block.path !== RELEASE_PATH) {
      disagreements.push(`versions.ktav: ${name}.path is ${JSON.stringify(block.path)}, expected ${JSON.stringify(RELEASE_PATH)} (release.js)`);
    }
    if (block.version !== release.version) {
      disagreements.push(`versions.ktav: ${name}.version is ${JSON.stringify(block.version)}, expected ${JSON.stringify(release.version)} (release.js)`);
    }
    if (name === 'stable' && block.released !== release.released) {
      disagreements.push(`versions.ktav: stable.released is ${JSON.stringify(block.released)}, expected ${JSON.stringify(release.released)} (release.js)`);
    }
  }
  const current = allEntries.filter((e) => e.path === RELEASE_PATH);
  if (current.length === 0) {
    disagreements.push(`versions.ktav: the "all" list has no entry with path ${JSON.stringify(RELEASE_PATH)}`);
  }
  for (const e of current) {
    if (e.version !== release.version) {
      disagreements.push(`versions.ktav: "all" entry with path ${JSON.stringify(RELEASE_PATH)} has version ${JSON.stringify(e.version)}, expected ${JSON.stringify(release.version)} (release.js)`);
    }
    if (e.released !== undefined && e.released !== release.released) {
      disagreements.push(`versions.ktav: "all" entry with path ${JSON.stringify(RELEASE_PATH)} has released ${JSON.stringify(e.released)}, expected ${JSON.stringify(release.released)} (release.js)`);
    }
  }
  // Entries anchored to other paths are historical and are ignored entirely.
}

// Appendix A's entry for the current version lives in a content unit's
// meta.js, and meta is deliberately never token-substituted: those
// headings are historical records, so a released version's date must
// stay put when the next one ships. That exemption is what let 0.7.0
// go out with its appendix entry still reading "unreleased" — the
// substitution machinery could not have caught it, and nothing else
// was looking. This check is the "nothing else" part.
//
// The title is the date alone; the version comes from the unit's
// directory name and its `number` field.
const APPENDIX_TITLE = {
  en: (released) => `— ${released}`,
  ru: (released) => `— ${released}`,
  zh: (released) => `—— ${released}`,
};

// A unit whose name is a bare version — `sec-0.7.1` — is an Appendix A
// entry. Synthetic content directories in the test suite use names like
// `sec-1`, so this is also how the check recognises a tree that has no
// Appendix A to check.
const APPENDIX_UNIT_RE = /^sec-\d+\.\d+\.\d+$/u;

function checkAppendixHeading(root, release, disagreements) {
  const contentDir = path.join(root, RELEASE_PATH, 'content');
  let manifest;
  try {
    manifest = readJsonDefault(path.join(contentDir, 'manifest.js'));
  } catch {
    // No manifest here at all: nothing to check, and whatever is wrong
    // with this tree is reported by the builder's own validation.
    return;
  }
  const unitName = (u) => u.slice(u.lastIndexOf('/') + 1);
  if (!Array.isArray(manifest) || !manifest.some((u) => APPENDIX_UNIT_RE.test(unitName(u)))) {
    // This tree has no Appendix A. The real repository always does, and
    // losing every entry at once would already fail the section-inventory
    // lock, so nothing is silently skipped here that is not caught there.
    return;
  }

  // The unit may live in a group directory, so its location comes from
  // the manifest rather than from the name alone.
  const appendixUnit = manifest.find(
    (u) => typeof u === 'string' && unitName(u) === `sec-${release.version}`);
  const rel = `${RELEASE_PATH}/content/${appendixUnit ?? `sec-${release.version}`}/meta.js`;
  const metaPath = path.join(root, rel);
  let stat = null;
  try {
    stat = fs.lstatSync(metaPath);
  } catch {
    // treated as missing below
  }
  if (stat === null || !stat.isFile()) {
    disagreements.push(
      `${rel}: Appendix A has no unit for the current version ` +
      `(release.js declares ${JSON.stringify(release.version)}; ` +
      'every released version needs its own sec-<version> unit)');
    return;
  }

  let meta;
  try {
    meta = readJsonDefault(metaPath);
  } catch (e) {
    disagreements.push(`${rel}: could not be decoded: ${e.message}`);
    return;
  }

  if (meta.number !== release.version) {
    disagreements.push(
      `${rel}: meta.number is ${JSON.stringify(meta.number)}, ` +
      `expected ${JSON.stringify(release.version)} (release.js)`);
  }

  const title = meta.title;
  if (typeof title !== 'object' || title === null) {
    disagreements.push(`${rel}: meta.title must be an object of language strings`);
    return;
  }
  for (const lang of LANGS) {
    const expected = APPENDIX_TITLE[lang](release.released);
    if (title[lang] !== expected) {
      disagreements.push(
        `${rel}: meta.title.${lang} is ${JSON.stringify(title[lang])}, ` +
        `expected ${JSON.stringify(expected)} (release.js). A heading still ` +
        'reading "unreleased" after the release is exactly what this checks.');
    }
  }
}

export async function checkHandwrittenVersionReferences(root, release, rootDocs) {
  const disagreements = [];
  const contents = new Map();
  for (const rel of HANDWRITTEN_FILES) {
    const filePath = path.join(root, rel);
    let stat = null;
    try {
      stat = fs.lstatSync(filePath);
    } catch {
      // treated as missing below
    }
    if (stat === null || !stat.isFile()) {
      disagreements.push(`${rel}: required hand-maintained file is missing (no regular file at ${filePath})`);
      continue;
    }
    contents.set(rel, fs.readFileSync(filePath, 'utf8'));
  }
  if (contents.has('versions.ktav')) {
    checkVersionsKtav(contents.get('versions.ktav'), release, disagreements);
  }
  const allAnchors = {
    ...HANDWRITTEN_README_ANCHORS,
    ...HANDWRITTEN_CHANGELOG_ANCHORS,
  };
  for (const [rel, anchors] of Object.entries(allAnchors)) {
    const doc = rel.slice(0, rel.indexOf('.'));
    const rest = rel.slice(rel.indexOf('.') + 1, -3);
    const lang = LANGS.includes(rest) ? rest : 'en';
    const text = rootDocs.get(doc)?.get(lang)?.toString('utf8');
    // A missing doc means nothing was assembled for this tree; the
    // builder's own orphan-artifact rule and the byte-identity checks
    // cover that case, so skipping is correct here.
    if (text === undefined) continue;
    for (const anchor of anchors) {
      const pattern = anchor(release.version, release.released);
      if (!pattern.test(text)) {
        disagreements.push(
          `${rel}: no current-version reference matching /${pattern.source}/ ` +
          `(the current version per release.js is ${JSON.stringify(release.version)}; ` +
          'update the line in its root-docs source unit, or update the anchor in ' +
          'checkHandwrittenVersionReferences if the prose deliberately changed)');
      }
    }
  }
  checkAppendixHeading(root, release, disagreements);
  if (disagreements.length > 0) {
    fail('hand-maintained files disagree with release.js:\n' +
      disagreements.map((d) => `  ${d}`).join('\n'));
  }
}

export { APPENDIX_TITLE, APPENDIX_UNIT_RE, HANDWRITTEN_CHANGELOG_ANCHORS, HANDWRITTEN_FILES, HANDWRITTEN_KEY_RE, HANDWRITTEN_README_ANCHORS, RELEASE_PATH, checkAppendixHeading, checkVersionsKtav, parseVersionsKtav, rx };
