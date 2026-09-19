// A MAINTENANCE TOOL, not a gate. It rewrites files, so CI never runs
// it. Reach for it when a translation edit changes that language's line
// count, moves a shared paragraph boundary, and leaves the OTHER
// languages' parts disagreeing with the mandate. The builder refuses to
// build until that is resolved; this resolves it. It came up twice during
// the 0.7.1 translation work, which is why it is a tool and not a note in
// someone's shell history.
//
// Re-cut every unit's body files to whatever the generator currently
// mandates, and update meta.js to match.
//
// The split is not a choice: `validateBodySplitting` computes the part
// count AND the exact cut offsets and fails the build when the files
// disagree. So this tool asks the generator for its own plan rather than
// reimplementing the rule — a private copy of that formula is exactly what
// went stale when the cut points became shared across languages.
//
// Concatenation is unchanged by construction, which is why the generated
// specification stays byte-identical however the parts are redrawn.
//
// Usage: node recut_bodies.mjs <content-dir> [--write]

import fs from 'node:fs';
import path from 'node:path';

import { LANGS } from './build_spec.mjs';
import { bodySplitPlan } from './build_spec/content.mjs';
import { bodyFileName, langSeparator } from './build_spec/shared.mjs';
import { validateBodySourceShape } from './build_spec/units/containers.mjs';

const CONTENT = path.resolve(process.argv[2]);
const WRITE = process.argv.includes('--write');

function encodeBody(blocks) {
  let out = '';
  for (const lang of LANGS) {
    const text = blocks[lang];
    out += langSeparator(lang) + '\n' + text;
    if (text.length > 0 && !text.endsWith('\n')) out += '\n';
  }
  return out;
}

const bodyNames = (dir) => fs.readdirSync(dir)
  .filter((n) => /^body-\d+\.md$/.test(n))
  .sort((a, b) => Number(a.slice(5, -3)) - Number(b.slice(5, -3)));

const manifest = JSON.parse(
  fs.readFileSync(path.join(CONTENT, 'manifest.js'), 'utf8').replace('export default ', ''));

let changed = 0;
let added = 0;
let removed = 0;

for (const unit of manifest) {
  const dir = path.join(CONTENT, ...unit.split('/'));
  const names = bodyNames(dir);
  const joined = Object.fromEntries(LANGS.map((l) => [l, '']));
  for (const name of names) {
    const blocks = validateBodySourceShape(unit, 1, fs.readFileSync(path.join(dir, name), 'utf8'),
      `${unit}/${name}`);
    for (const lang of LANGS) joined[lang] += blocks[lang];
  }

  const plan = bodySplitPlan([joined]);
  const partCount = plan.partCount;

  const slices = Object.fromEntries(LANGS.map((lang) => {
    const cuts = [0, ...plan.plans[lang].cuts, joined[lang].length];
    return [lang, cuts.slice(0, -1).map((start, i) => joined[lang].slice(start, cuts[i + 1]))];
  }));
  for (const lang of LANGS) {
    if (slices[lang].length !== partCount) {
      throw new Error(`${unit}: ${lang} produced ${slices[lang].length} parts, mandate is ${partCount}`);
    }
    if (slices[lang].join('') !== joined[lang]) {
      throw new Error(`${unit}: ${lang} re-slice does not concatenate back to the original`);
    }
  }

  if (names.length !== partCount) changed++;
  for (let i = 0; i < partCount; i++) {
    const target = path.join(dir, bodyFileName(i + 1));
    const next = encodeBody(Object.fromEntries(LANGS.map((l) => [l, slices[l][i]])));
    const existed = fs.existsSync(target);
    if (!existed) added++;
    if (!existed || fs.readFileSync(target, 'utf8') !== next) {
      if (WRITE) fs.writeFileSync(target, next);
    }
  }
  for (const name of names) {
    if (Number(name.slice(5, -3)) > partCount) {
      removed++;
      if (WRITE) fs.rmSync(path.join(dir, name));
    }
  }

  const metaPath = path.join(dir, 'meta.js');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8').replace('export default ', ''));
  if (meta.bodyParts !== partCount) {
    meta.bodyParts = partCount;
    if (WRITE) fs.writeFileSync(metaPath, 'export default ' + JSON.stringify(meta, null, 2) + '\n');
  }
}

console.log(`${WRITE ? 'rewrote' : 'DRY RUN:'} ` +
            `${changed} unit(s) change part count, ${added} body file(s) added, ${removed} removed`);
