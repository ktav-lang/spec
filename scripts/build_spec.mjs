#!/usr/bin/env node
// build_spec.mjs — assembles versions/0.7/spec{,.ru,.zh}.md from per-section
// content units in versions/0.7/content/ (manifest.js + unit dirs). Unit bodies
// come from body-1.js..body-N.js parts (N = meta.bodyParts), each exporting
// { en, ru, zh } strings.
// Node ESM, built-ins only. Usage:
//   node scripts/build_spec.mjs            write the three spec files
//   node scripts/build_spec.mjs --check    verify outputs byte-identical, no writes
//   node scripts/build_spec.mjs -h|--help  usage

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const specDir = path.join(root, 'versions', '0.7');
const contentDir = path.join(specDir, 'content');

const LANGS = ['en', 'ru', 'zh'];
const OUT_FILES = { en: 'spec.md', ru: 'spec.ru.md', zh: 'spec.zh.md' };

function fail(msg) {
  process.stderr.write(`build_spec: ${msg}\n`);
  process.exit(1);
}

function usage() {
  process.stdout.write(
    'Usage: node scripts/build_spec.mjs [--check | -h | --help]\n' +
    '  (default)   write versions/0.7/spec.md, spec.ru.md, spec.zh.md\n' +
    '  --check     verify outputs are byte-identical; write nothing; silent on success\n'
  );
}

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) { usage(); process.exit(0); }
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  usage();
  process.exit(1);
}
const checkMode = args.length === 1;

if (!fs.existsSync(contentDir)) fail(`content dir not found: ${contentDir}`);

const manifestPath = path.join(contentDir, 'manifest.js');
if (!fs.existsSync(manifestPath)) fail(`manifest not found: ${manifestPath}`);

const manifest = (await import(pathToFileURL(manifestPath))).default;
if (!Array.isArray(manifest) || manifest.length === 0 ||
    !manifest.every((n) => typeof n === 'string' && n.length > 0) ||
    new Set(manifest).size !== manifest.length) {
  fail('manifest.js must export a non-empty array of unique non-empty strings');
}

function failUnit(unit, problem) {
  fail(`unit "${unit}": ${problem}`);
}

function validateMeta(unit, meta) {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    failUnit(unit, 'meta.js default export is not an object');
  }
  if (meta.kind !== 'frontmatter' && meta.kind !== 'numbered' && meta.kind !== 'named') {
    failUnit(unit, `bad kind ${JSON.stringify(meta.kind)}`);
  }
  if (!Number.isInteger(meta.bodyParts) || meta.bodyParts < 1) {
    failUnit(unit, `bad bodyParts ${JSON.stringify(meta.bodyParts)}`);
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
  for (const lang of LANGS) {
    if (typeof t[lang] !== 'string' || t[lang].length === 0) {
      failUnit(unit, `missing/empty title.${lang}`);
    }
  }
}

// outputs[lang] = Buffer; pieces[lang] = [{unit, start, end}] byte bookkeeping
const outputs = { en: [], ru: [], zh: [] };
const pieces = { en: [], ru: [], zh: [] };

const lens = { en: 0, ru: 0, zh: 0 }; // cumulative byte offsets

for (const unit of manifest) {
  const unitDir = path.join(contentDir, unit);
  const meta = (await import(pathToFileURL(path.join(unitDir, 'meta.js')))).default;
  validateMeta(unit, meta);
  const parts = [];
  for (let k = 1; k <= meta.bodyParts; k++) {
    let mod;
    try {
      mod = await import(pathToFileURL(path.join(unitDir, `body-${k}.js`)));
    } catch (e) {
      failUnit(unit, `cannot load body-${k}.js: ${e.message}`);
    }
    const d = mod.default;
    if (typeof d !== 'object' || d === null || Array.isArray(d)) {
      failUnit(unit, `body-${k}.js default export is not an object`);
    }
    for (const l of LANGS) {
      if (typeof d[l] !== 'string') failUnit(unit, `body-${k}.js missing string field ${l}`);
    }
    parts.push(d);
  }
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

function unitForLine(lang, offset) {
  for (const p of pieces[lang]) {
    if (offset >= p.start && offset < p.end) return p.unit;
  }
  return pieces[lang].length ? pieces[lang][pieces[lang].length - 1].unit : '?';
}

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
    const unit = unitForLine(lang, diff);
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
