#!/usr/bin/env node
// build_spec.mjs — assembles versions/0.7/spec{,.ru,.zh}.md from per-section
// content units in versions/0.7/content/ (manifest.js + unit dirs). Unit bodies
// come from body-1.js..body-N.js parts (N = meta.bodyParts), each exporting
// { en, ru, zh } strings. Each body-*.js is shape-checked on its raw source
// text before dynamic import: only the exact documented literal-object shape
// is ever executed.
// Node ESM, built-ins only. Usage:
//   node scripts/build_spec.mjs            write the three spec files
//   node scripts/build_spec.mjs --check    verify outputs byte-identical, no writes
//   node scripts/build_spec.mjs -h|--help  usage
//
// Importable API (no build on import):
//   validateContentDir(contentDir)  -> async closed-world validation; throws Error
//   buildBuffers(contentDir)        -> async { bufs, totalLen, manifest }
//   validateMeta(unit, meta), LANGS, OUT_FILES

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LANGS = ['en', 'ru', 'zh'];
export const OUT_FILES = { en: 'spec.md', ru: 'spec.ru.md', zh: 'spec.zh.md' };

function fail(msg) {
  throw new Error(msg);
}

function failUnit(unit, problem) {
  fail(`unit "${unit}": ${problem}`);
}

export function validateMeta(unit, meta) {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    failUnit(unit, 'meta.js default export is not an object');
  }
  if (meta.kind !== 'frontmatter' && meta.kind !== 'numbered' && meta.kind !== 'named') {
    failUnit(unit, `bad kind ${JSON.stringify(meta.kind)}`);
  }
  if (!Number.isInteger(meta.bodyParts) || meta.bodyParts < 1) {
    failUnit(unit, `bad bodyParts ${JSON.stringify(meta.bodyParts)}`);
  }
  const allowedKeys = meta.kind === 'numbered'
    ? ['kind', 'number', 'sep', 'level', 'title', 'bodyParts']
    : ['kind', 'number', 'level', 'title', 'bodyParts'];
  const keySet = Object.keys(meta).sort();
  const wantSet = [...allowedKeys].sort();
  if (keySet.length !== wantSet.length || keySet.some((k, i) => k !== wantSet[i])) {
    const extra = keySet.filter((k) => !wantSet.includes(k));
    const missing = wantSet.filter((k) => !keySet.includes(k));
    const bits = [];
    if (extra.length) bits.push(`unexpected key(s) ${extra.map((k) => JSON.stringify(k)).join(', ')}`);
    if (missing.length) bits.push(`missing key(s) ${missing.map((k) => JSON.stringify(k)).join(', ')}`);
    failUnit(unit, `meta.js keys must be exactly {${wantSet.map((k) => JSON.stringify(k)).join(', ')}}; got ${bits.join('; ')}`);
  }
  if (meta.kind === 'frontmatter') {
    if (meta.number !== null || meta.level !== null || meta.title !== null) {
      failUnit(unit, 'frontmatter must have number/level/title all null');
    }
    return;
  }
  const lvl = meta.level;
  if (!Number.isInteger(lvl) || lvl < 1 || lvl > 6) {
    failUnit(unit, `bad level ${JSON.stringify(lvl)}`);
  }
  if (meta.kind === 'numbered') {
    if (typeof meta.number !== 'string' || !/^\d+(\.\d+)*$/.test(meta.number)) {
      failUnit(unit, `bad number ${JSON.stringify(meta.number)}`);
    }
    if (unit !== 'sec-' + meta.number) {
      failUnit(unit, `unit name does not match sec-${meta.number}`);
    }
    if (meta.sep !== '. ' && meta.sep !== ' ') {
      failUnit(unit, `bad sep ${JSON.stringify(meta.sep)} (must be ". " or " ")`);
    }
  } else { // named
    if (meta.number !== null) failUnit(unit, 'named unit must have number === null');
    if (lvl < 2) failUnit(unit, `named unit level must be 2..6, got ${lvl}`);
    if (!unit.startsWith('named-')) failUnit(unit, 'named unit dir must start with "named-"');
  }
  const t = meta.title;
  if (typeof t !== 'object' || t === null) failUnit(unit, 'missing title object');
  const tKeySet = Object.keys(t).sort();
  const tWantSet = [...LANGS].sort();
  if (tKeySet.length !== tWantSet.length || tKeySet.some((k, i) => k !== tWantSet[i])) {
    const extra = tKeySet.filter((k) => !tWantSet.includes(k));
    const missing = tWantSet.filter((k) => !tKeySet.includes(k));
    const bits = [];
    if (extra.length) bits.push(`unexpected key(s) ${extra.map((k) => JSON.stringify(k)).join(', ')}`);
    if (missing.length) bits.push(`missing key(s) ${missing.map((k) => JSON.stringify(k)).join(', ')}`);
    failUnit(unit, `title keys must be exactly {en, ru, zh}; got ${bits.join('; ')}`);
  }
  for (const lang of LANGS) {
    if (typeof t[lang] !== 'string' || t[lang].length === 0) {
      failUnit(unit, `missing/empty title.${lang}`);
    }
    if (t[lang].includes('\n') || t[lang].includes('\r')) {
      failUnit(unit, `title.${lang} must be single-line (CR/LF not allowed)`);
    }
  }
}

function validateBodyPart(unit, k, mod) {
  const d = mod.default;
  if (typeof d !== 'object' || d === null || Array.isArray(d)) {
    failUnit(unit, `body-${k}.js default export is not an object`);
  }
  const keys = Object.keys(d);
  const extra = keys.filter((k2) => !LANGS.includes(k2));
  const missing = LANGS.filter((l) => !keys.includes(l));
  if (extra.length || missing.length || keys.length !== LANGS.length) {
    const bits = [];
    if (extra.length) bits.push(`unexpected key(s) ${extra.map((k2) => JSON.stringify(k2)).join(', ')}`);
    if (missing.length) bits.push(`missing key(s) ${missing.map((k2) => JSON.stringify(k2)).join(', ')}`);
    failUnit(unit, `body-${k}.js must have exactly the keys {en, ru, zh}` +
      (bits.length ? `; got ${bits.join('; ')}` : ''));
  }
  for (const l of LANGS) {
    if (typeof d[l] !== 'string') failUnit(unit, `body-${k}.js field ${l} is not a string`);
  }
}

// Proves `src` (the raw UTF-8 text of a body-N.js file, read via
// fs.readFileSync BEFORE any dynamic import) is EXACTLY:
//   export default {\n  en: `...`,\n  ru: `...`,\n  zh: `...`,\n};\n
// with each `...` a template-literal body where every backslash, backtick,
// and "${" has been escaped per content/README.md's rule (\\, \`, \${, in
// that priority order at write time). Returns the DECODED { en, ru, zh }
// strings for defense-in-depth comparison against the dynamic import's
// actual runtime value -- this function never executes the file's code.
function validateBodySourceShape(unit, k, src) {
  const HEADER = 'export default {\n  en: `';
  if (!src.startsWith(HEADER)) {
    failUnit(unit, `body-${k}.js: must start with exactly ${JSON.stringify(HEADER)}`);
  }
  let i = HEADER.length;

  // Scans forward from `i` (just after an opening backtick) for the next
  // UNESCAPED backtick, decoding escapes as it goes and rejecting any
  // unescaped "${" (real template interpolation) along the way. A single
  // backslash ALWAYS escapes exactly the next character in this grammar
  // (the writer only ever emits \\, \`, or \${) -- so a simple greedy
  // "see backslash, consume it plus the next char as one decoded unit"
  // scan is correct and unambiguous; no backslash-run parity counting is
  // needed because the writer fully resolves \\ first, then \`, then \${,
  // in that fixed order, so escape units never overlap ambiguously.
  function scanTemplateBody(fieldName) {
    let decoded = '';
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') {
        const next = src[i + 1];
        if (next === '\\') decoded += '\\';
        else if (next === '`') decoded += '`';
        else if (next === '$') decoded += '$'; // the following "{" is ordinary, appended next iteration
        else failUnit(unit, `body-${k}.js: unrecognised escape "\\${next}" in ${fieldName} at offset ${i} (only \\\\, \\\`, and \\$ are valid)`);
        i += 2;
        continue;
      }
      if (c === '`') {
        return { end: i, decoded };
      }
      if (c === '$' && src[i + 1] === '{') {
        failUnit(unit, `body-${k}.js: unescaped "\${" (template interpolation) in ${fieldName} at offset ${i} -- interpolation is never allowed, escape it as "\\\${"`);
      }
      decoded += c;
      i += 1;
    }
    failUnit(unit, `body-${k}.js: unterminated template literal in ${fieldName} (no closing backtick found)`);
  }

  const en = scanTemplateBody('en');
  i = en.end + 1;

  const SEP1 = ',\n  ru: `';
  if (src.slice(i, i + SEP1.length) !== SEP1) {
    failUnit(unit, `body-${k}.js: expected exactly ${JSON.stringify(SEP1)} after the en field, at offset ${i}`);
  }
  i += SEP1.length;

  const ru = scanTemplateBody('ru');
  i = ru.end + 1;

  const SEP2 = ',\n  zh: `';
  if (src.slice(i, i + SEP2.length) !== SEP2) {
    failUnit(unit, `body-${k}.js: expected exactly ${JSON.stringify(SEP2)} after the ru field, at offset ${i}`);
  }
  i += SEP2.length;

  const zh = scanTemplateBody('zh');
  i = zh.end + 1;

  const TAIL = ',\n};\n';
  if (src.slice(i) !== TAIL) {
    failUnit(unit, `body-${k}.js: expected exactly ${JSON.stringify(TAIL)} after the zh field followed immediately by end-of-file, found ${JSON.stringify(src.slice(i, i + 20))}`);
  }

  return { en: en.decoded, ru: ru.decoded, zh: zh.decoded };
}

const TOP_LEVEL_ALLOWED_FILES = new Set([
  'README.md', 'README.ru.md', 'README.zh.md', 'manifest.js', 'package.json',
]);

async function importDefault(p) {
  return (await import(pathToFileURL(p))).default;
}

// Closed-world validation of a content dir. Throws Error on first violation.
// Returns { manifest, units } where units is a Map unit -> { meta, parts }.
export async function validateContentDir(contentDir) {
  const manifestPath = path.join(contentDir, 'manifest.js');
  if (!fs.existsSync(manifestPath)) fail(`manifest not found: ${manifestPath}`);

  const manifest = await importDefault(manifestPath);
  if (!Array.isArray(manifest) || manifest.length === 0 ||
      !manifest.every((n) => typeof n === 'string' && n.length > 0) ||
      new Set(manifest).size !== manifest.length) {
    fail('manifest.js must export a non-empty array of unique non-empty strings');
  }

  const entries = fs.readdirSync(contentDir, { withFileTypes: true });
  const manifestSet = new Set(manifest);

  // 1. Top-level allowlist + 2. exact directory-set match.
  const actualDirs = new Set();
  const actualFiles = new Set();
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (!manifestSet.has(ent.name)) {
        fail(`unexpected directory under content/: "${ent.name}" (not in manifest.js)`);
      }
      actualDirs.add(ent.name);
    } else if (ent.isFile()) {
      if (!TOP_LEVEL_ALLOWED_FILES.has(ent.name)) {
        fail(`unexpected file under content/: "${ent.name}"`);
      }
      actualFiles.add(ent.name);
    } else {
      fail(`unexpected entry under content/: "${ent.name}"`);
    }
  }
  for (const name of manifest) {
    if (!actualDirs.has(name)) {
      fail(`manifest lists unit "${name}" but its directory is missing under content/`);
    }
  }

  // 2b. The three per-language READMEs are required, not merely permitted:
  // the content model is trilingual and its documentation ships in all
  // three languages (README.md / README.ru.md / README.zh.md).
  for (const name of ['README.md', 'README.ru.md', 'README.zh.md']) {
    if (!actualFiles.has(name)) {
      fail(`required file "${name}" is missing under content/ (all three per-language READMEs are mandatory)`);
    }
  }

  // 3. Frontmatter invariant.
  if (manifest[0] !== 'frontmatter') {
    fail(`manifest.js must start with "frontmatter"; got ${JSON.stringify(manifest[0])}`);
  }

  const units = new Map();
  let frontmatterUnit = null;

  for (let idx = 0; idx < manifest.length; idx++) {
    const unit = manifest[idx];
    const unitDir = path.join(contentDir, unit);
    const isLast = idx === manifest.length - 1;

    // 4. Exact per-unit file set (before dynamic import so our message wins).
    // Every entry must be a REGULAR file: a symlink named meta.js/body-N.js
    // would otherwise pass the name allowlist and its target would be loaded
    // by dynamic import(), possibly outside the unit or outside content/.
    const unitEntries = fs.readdirSync(unitDir, { withFileTypes: true });
    for (const ent of unitEntries) {
      if (ent.isDirectory()) {
        failUnit(unit, `subdirectory "${ent.name}" is not allowed inside a unit directory`);
      }
      if (!ent.isFile()) {
        failUnit(unit, `entry "${ent.name}" is not a regular file (symlinks, FIFOs, devices and other special entries are not allowed inside a unit directory)`);
      }
    }
    const present = new Set(unitEntries.map((e) => e.name));
    if (!present.has('meta.js')) {
      failUnit(unit, 'missing meta.js');
    }
    const expected = new Set(['meta.js']);
    for (const name of present) {
      if (/^body-\d+\.js$/.test(name)) expected.add(name);
    }
    for (const name of present) {
      if (expected.has(name)) continue;
      if (/\.md$/.test(name) && ['en', 'ru', 'zh'].includes(name.slice(0, -3))) {
        failUnit(unit, `legacy per-language file ${name} is not allowed under content/; edit body-*.js instead`);
      }
      failUnit(unit, `unexpected file ${name} in unit directory`);
    }

    const meta = await importDefault(path.join(unitDir, 'meta.js'));
    validateMeta(unit, meta);

    if (meta.kind === 'frontmatter') {
      if (idx !== 0) {
        failUnit(unit, `frontmatter unit must be manifest[0], found at index ${idx}`);
      }
      if (frontmatterUnit) {
        failUnit(unit, `duplicate frontmatter unit (already seen in "${frontmatterUnit}")`);
      }
      frontmatterUnit = unit;
    }

    // exact body file count
    const bodyFiles = unitEntries
      .map((e) => e.name)
      .filter((n) => /^body-\d+\.js$/.test(n));
    if (bodyFiles.length !== meta.bodyParts) {
      for (let k = 1; k <= meta.bodyParts; k++) {
        if (!bodyFiles.includes(`body-${k}.js`)) {
          failUnit(unit, `missing body-${k}.js (meta.bodyParts is ${meta.bodyParts})`);
        }
      }
      for (const n of bodyFiles) {
        const num = Number(n.slice(5, -3));
        if (num > meta.bodyParts) {
          failUnit(unit, `unexpected extra file ${n} beyond meta.bodyParts ${meta.bodyParts}`);
        }
      }
      const odd = bodyFiles.filter((n) => {
        const num = Number(n.slice(5, -3));
        return num < 1 || num > meta.bodyParts;
      });
      if (odd.length) {
        failUnit(unit, `unexpected body file(s) ${odd.join(', ')} (body files must be body-1.js..body-${meta.bodyParts}.js)`);
      }
      failUnit(unit, `expected exactly ${meta.bodyParts} body file(s), found ${bodyFiles.length}`);
    }

    const parts = [];
    for (let k = 1; k <= meta.bodyParts; k++) {
      const bodyPath = path.join(unitDir, `body-${k}.js`);

      // Read and shape-validate the raw source BEFORE any dynamic import:
      // a body file that is not exactly the documented literal-object shape
      // is rejected here, so its code is never executed, not even transiently.
      let src;
      try {
        src = fs.readFileSync(bodyPath, 'utf8');
      } catch (e) {
        failUnit(unit, `cannot read body-${k}.js: ${e.message}`);
      }
      const decoded = validateBodySourceShape(unit, k, src);

      let mod;
      try {
        mod = await import(pathToFileURL(bodyPath));
      } catch (e) {
        failUnit(unit, `cannot load body-${k}.js: ${e.message}`);
      }
      validateBodyPart(unit, k, mod);

      // Defense-in-depth: the statically decoded text must equal the
      // runtime-evaluated text, character for character.
      for (const lang of LANGS) {
        if (mod.default[lang] !== decoded[lang]) {
          failUnit(unit, `body-${k}.js: statically decoded ${lang} text does not match the runtime-evaluated text (source-shape scanner vs dynamic import mismatch)`);
        }
      }
      parts.push(mod.default);
    }

    // 6. Terminal-newline invariant (per language).
    // Non-last units must end with EXACTLY two trailing LFs ("\n\n"), i.e.
    // exactly one blank line; a run of 3+ trailing LFs is also rejected.
    // Exception: empty "container" sections whose whole body is exactly "\n" in every
    // language (heading immediately followed by subsections — the lone "\n"
    // supplies the blank line). The last unit must end with a single "\n".
    const last = parts[parts.length - 1];
    for (const lang of LANGS) {
      const s = last[lang];
      if (isLast) {
        if (s.endsWith('\n\n')) {
          failUnit(unit, `${lang}: last unit's final chunk must end with a single "\\n" but ends with "\\n\\n" (trailing blank line)`);
        } else if (!s.endsWith('\n')) {
          failUnit(unit, `${lang}: last unit's final chunk must end with "\\n"`);
        }
      } else if (!s.endsWith('\n\n') || s.endsWith('\n\n\n')) {
        const wholeBody = parts.map((p) => p[lang]).join('');
        const container = wholeBody === '\n' && LANGS.every((l) => parts.map((p) => p[l]).join('') === '\n');
        if (container) continue;
        const shape = s.endsWith('\n\n\n')
          ? '"\\n\\n\\n" or more (two or more trailing blank lines)'
          : s.endsWith('\n') ? '"\\n" (single newline)' : 'no trailing newline';
        failUnit(unit, `${lang}: non-last unit's final chunk must end with "\\n\\n" (exactly one blank line; only whole-body "\\n" container sections are exempt), got ${shape}`);
      }
    }

    units.set(unit, { meta, parts });
  }

  return { manifest, units };
}

// Assemble outputs without writing. Returns { bufs, totalLen, manifest, pieces }.
export async function buildBuffers(contentDir) {
  const { manifest, units } = await validateContentDir(contentDir);

  const outputs = { en: [], ru: [], zh: [] };
  const pieces = { en: [], ru: [], zh: [] };
  const lens = { en: 0, ru: 0, zh: 0 };

  for (const unit of manifest) {
    const { meta, parts } = units.get(unit);
    for (const lang of LANGS) {
      const body = Buffer.from(parts.map((p) => p[lang]).join(''), 'utf8');
      const arr = outputs[lang];
      if (meta.kind !== 'frontmatter') {
        const title = meta.title[lang];
        const headingLine =
          '#'.repeat(meta.level) + ' ' +
          (meta.kind === 'numbered' ? meta.number + meta.sep : '') + title;
        const hbuf = Buffer.from(headingLine + '\n', 'utf8');
        const start = lens[lang];
        arr.push(hbuf);
        lens[lang] = start + hbuf.length;
        pieces[lang].push({ unit, start, end: lens[lang] });
        arr.push(body);
        pieces[lang].push({ unit, start: lens[lang], end: lens[lang] + body.length });
        lens[lang] += body.length;
      } else {
        const start = lens[lang];
        arr.push(body);
        pieces[lang].push({ unit, start, end: start + body.length });
        lens[lang] += body.length;
      }
    }
  }

  const bufs = {};
  const totalLen = {};
  for (const lang of LANGS) {
    totalLen[lang] = outputs[lang].reduce((n, b) => n + b.length, 0);
    bufs[lang] = Buffer.concat(outputs[lang], totalLen[lang]);
  }
  return { bufs, totalLen, manifest, pieces };
}

function unitForLine(pieces, lang, offset) {
  for (const p of pieces[lang]) {
    if (offset >= p.start && offset < p.end) return p.unit;
  }
  return pieces[lang].length ? pieces[lang][pieces[lang].length - 1].unit : '?';
}

function usage() {
  process.stdout.write(
    'Usage: node scripts/build_spec.mjs [--check | -h | --help]\n' +
    '  (default)   write versions/0.7/spec.md, spec.ru.md, spec.zh.md\n' +
    '  --check     verify outputs are byte-identical; write nothing; silent on success\n'
  );
}

async function cli() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptDir, '..');
  const specDir = path.join(root, 'versions', '0.7');
  const contentDir = path.join(specDir, 'content');

  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) { usage(); process.exit(0); }
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    usage();
    process.exit(1);
  }
  const checkMode = args.length === 1;

  if (!fs.existsSync(contentDir)) fail(`content dir not found: ${contentDir}`);

  let build;
  try {
    build = await buildBuffers(contentDir);
  } catch (e) {
    process.stderr.write(`build_spec: ${e.message}\n`);
    process.exit(1);
  }
  const { bufs, totalLen, manifest, pieces } = build;

  if (!checkMode) {
    for (const lang of LANGS) {
      const out = path.join(specDir, OUT_FILES[lang]);
      fs.writeFileSync(out, bufs[lang]);
    }
    process.stdout.write(
      `build_spec: assembled ${manifest.length} units -> ` +
      LANGS.map((l) => path.relative(root, path.join(specDir, OUT_FILES[l]))).join(', ') + '\n'
    );
    process.exit(0);
  }

  // --check mode: silent on success, first divergence diagnostic on stderr.
  for (const lang of LANGS) {
    const outPath = path.join(specDir, OUT_FILES[lang]);
    let existing;
    try {
      existing = fs.readFileSync(outPath);
    } catch {
      process.stderr.write(
        `build_spec --check: MISMATCH in ${OUT_FILES[lang]} (${lang}): ` +
        `output file missing at ${outPath}; expected ${totalLen[lang]} bytes\n`
      );
      process.exit(1);
    }
    const min = Math.min(existing.length, bufs[lang].length);
    let diff = -1;
    for (let i = 0; i < min; i++) {
      if (existing[i] !== bufs[lang][i]) { diff = i; break; }
    }
    if (diff === -1 && existing.length !== bufs[lang].length) diff = min;

    if (diff !== -1) {
      const lineNo = 1 + bufs[lang].slice(0, diff).reduce((n, b) => (b === 0x0a ? n + 1 : n), 0);
      const unit = unitForLine(pieces, lang, diff);
      const lineOf = (buf) => {
        let s = buf.slice(0, diff);
        let start = s.lastIndexOf(0x0a) + 1;
        let e = buf.indexOf(0x0a, diff);
        if (e === -1) e = buf.length;
        let line = buf.slice(start, e).toString('utf8');
        if (line.length > 160) line = line.slice(0, 160) + '…';
        return JSON.stringify(line);
      };
      const tail = diff >= bufs[lang].length
        ? ' (generated output is shorter; no byte here)'
        : diff >= existing.length
          ? ' (existing file is shorter; no byte here)'
          : '';
      process.stderr.write(
        `build_spec --check: MISMATCH in ${OUT_FILES[lang]} (${lang}) at byte offset ${diff}` +
        `${tail}, line ${lineNo}, unit "${unit}":\n` +
        `  generated: ${diff < bufs[lang].length ? lineOf(bufs[lang]) : '(no line)'}\n` +
        `  existing:  ${diff < existing.length ? lineOf(existing) : '(no line)'}\n`
      );
      process.exit(1);
    }
  }
  process.exit(0);
}

const isMain = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  cli().catch((e) => {
    process.stderr.write(`build_spec: ${e.message}\n`);
    process.exit(1);
  });
}
