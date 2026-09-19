// Structural checks over the CONTENT SOURCES, next to the structural
// checks `check_translation_parity.py` already runs over the generated
// documents.
//
// The division of labour matters. The Python checker reads spec.md and
// its translations and compares § references, fenced blocks and RFC 2119
// keywords per section. That is a good gate and it misses a whole class:
// `releases/sec-0.5.0` once kept every cross-reference and every keyword
// while reducing thirteen of its fourteen bullets to stubs, and the
// checker passed. These checks read the sources instead, where a defect
// can be pointed at a file and a line rather than at a rendered section.
//
// Four checks, each earned by a defect that reached the corpus:
//
//   parts-aligned    part k must hold the same fragment in every
//                    language; the acceptance of the shared-cut work
//                    rests on it.
//   list-parity      the bullets must survive translation.
//   indent-shapes    text pasted at a depth no construct justifies.
//   unwrapped        a translation paragraph left as one long line.
//
// Usage: node scripts/check_sources.mjs <content-dir> [--verbose]
//        exit 0 when clean, 1 with a report on stderr otherwise.

import fs from 'node:fs';
import path from 'node:path';

import { LANGS } from './build_spec.mjs';
import { validateBodySourceShape } from './build_spec/units/containers.mjs';

const FENCE_RE = /^\s*(```|~~~)/u;
const WIDE_CP_RE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/u;

/// Display width, counting East Asian wide code points as two columns —
/// which is how they occupy a terminal and a side-by-side diff.
function displayWidth(line) {
  let width = 0;
  for (const ch of line) width += WIDE_CP_RE.test(ch) ? 2 : 1;
  return width;
}

/// Lines outside fenced blocks. Inside a fence, indentation and line
/// breaks are content, not formatting, and none of these checks apply.
function proseLines(text) {
  const rows = [];
  let inFence = false;
  text.split('\n').forEach((line, i) => {
    if (FENCE_RE.test(line)) { inFence = !inFence; return; }
    if (!inFence) rows.push({ number: i + 1, line });
  });
  return rows;
}

const LIST_MARKER_RE = /^(\s*)(\d+\.[ \t]+|[-*+][ \t]+)/u;

// ---------------------------------------------------------------- parts

const FENCE_BLOCK_RE = /^(```|~~~)[^\n]*\n([\s\S]*?)^\1[^\n]*$/gmu;
const SECTION_REF_RE = /§\s*([\d.]+[\d])/gu;
const ERROR_NAME_RE = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/gu;

/// Items that are never translated, so their position is comparable
/// across languages: code blocks, § references and error names.
function untranslatedItems(text) {
  const counts = new Map();
  const add = (kind, value) => {
    const key = `${kind}:${value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const m of text.matchAll(FENCE_BLOCK_RE)) add('fence', m[2].trim());
  for (const m of text.matchAll(SECTION_REF_RE)) add('section', m[1]);
  for (const m of text.matchAll(ERROR_NAME_RE)) add('error', m[1]);
  return counts;
}

/// MISALIGNMENT — the same item sitting in part 1 of English and part 2
/// of Russian. That means the cut points drifted apart and the files are
/// slices rather than translations. A differing NUMBER of mentions inside
/// the same part is a prose question, not a split defect, and is reported
/// separately by the caller rather than failing the build.
function checkPartsAligned(units, problems, notes) {
  for (const { unit, parts } of units) {
    if (parts.length < 2) continue;
    const placement = new Map();
    parts.forEach((blocks, partIndex) => {
      for (const lang of LANGS) {
        for (const [key, count] of untranslatedItems(blocks[lang])) {
          if (!placement.has(key)) placement.set(key, new Map());
          const byLang = placement.get(key);
          if (!byLang.has(lang)) byLang.set(lang, new Map());
          byLang.get(lang).set(partIndex, count);
        }
      }
    });

    for (const [key, byLang] of placement) {
      const present = [...byLang.keys()];
      if (present.length < 2) continue;
      const partsOf = (lang) => [...byLang.get(lang).keys()].sort((a, b) => a - b);
      const reference = partsOf(present[0]);
      for (const lang of present.slice(1)) {
        if (JSON.stringify(partsOf(lang)) !== JSON.stringify(reference)) {
          problems.push(`${unit}: ${key} sits in different parts across languages (` +
            present.map((l) => `${l}=${partsOf(l).map((p) => p + 1).join('+')}`).join(', ') +
            '); the parts are slices, not translations');
          break;
        }
      }
      for (const partIndex of reference) {
        const counts = present.map((lang) => byLang.get(lang).get(partIndex) ?? 0);
        if (new Set(counts).size > 1) {
          notes.push(`${unit} part ${partIndex + 1}: ${key} mentioned ` +
            present.map((l, i) => `${l}=${counts[i]}`).join(' ') +
            ' — same part, different count; a prose question, not a split defect');
        }
      }
    }
  }
}

// ----------------------------------------------------------------- list

/// Bullets and numbered items must survive translation. This is the check
/// the rendered-document parity gate cannot make: it compares sections,
/// and a section keeps its § references and keywords even when its list
/// has been reduced to stubs.
function checkListParity(units, problems) {
  for (const { unit, parts } of units) {
    parts.forEach((blocks, partIndex) => {
      const count = (text, re) => proseLines(text).filter((r) => re.test(r.line)).length;
      for (const [kind, re] of [['bullet', /^\s*[-*+][ \t]/u], ['ordered', /^\s*\d+\.[ \t]/u]]) {
        const values = LANGS.map((lang) => count(blocks[lang], re));
        if (new Set(values).size > 1) {
          problems.push(`${unit} part ${partIndex + 1}: ${kind} count differs (` +
            LANGS.map((l, i) => `${l}=${values[i]}`).join(' ') +
            '); a translation dropped or invented list items');
        }
      }
    });
  }
}

// --------------------------------------------------------------- indent

/// An indent the translation uses that English never does, MINUS indents
/// justified by a list marker in the translation's own block.
///
/// That exemption is the whole check. Russian wraps a bullet English fits
/// on one line, so it legitimately uses a continuation indent English had
/// no occasion for. Two stricter designs were tried and rejected:
/// requiring a continuation to match its marker's column flags deliberate
/// table alignment, and flags a paragraph that correctly returns to an
/// outer level after a nested list.
function checkIndentShapes(units, problems) {
  for (const { unit, parts } of units) {
    parts.forEach((blocks, partIndex) => {
      const shape = (text) => {
        const indents = new Set();
        const markerIndents = new Set();
        for (const { line } of proseLines(text)) {
          if (line.trim() === '') continue;
          indents.add(line.length - line.trimStart().length);
          const m = LIST_MARKER_RE.exec(line);
          if (m) markerIndents.add(m[1].length + m[2].length);
        }
        return { indents, markerIndents };
      };
      const en = shape(blocks.en);
      for (const lang of LANGS) {
        if (lang === 'en') continue;
        const t = shape(blocks[lang]);
        for (const indent of t.indents) {
          if (en.indents.has(indent) || t.markerIndents.has(indent)) continue;
          problems.push(`${unit} part ${partIndex + 1}: ${lang} indents by ${indent}, ` +
            `which English never uses and no list marker in the block justifies`);
        }
      }
    });
  }
}

// ------------------------------------------------------------ unwrapped

/// A translation line far wider than the widest English line in the same
/// file — the shape of a paragraph edited by substitution and never
/// re-wrapped.
///
/// Relative on purpose. An absolute column limit does not survive contact
/// with this corpus: grammar productions and aligned example tables run
/// past ninety columns in ALL THREE languages, legitimately, so any gate
/// that catches the real defects also catches them. Measured against the
/// 0.7 corpus, the relative rule finds five genuine unwrapped paragraphs
/// and nothing else.
const WIDTH_RATIO = 1.4;
const WIDTH_MARGIN = 20;

function checkUnwrapped(units, problems) {
  for (const { unit, parts } of units) {
    parts.forEach((blocks, partIndex) => {
      const widest = (text) => proseLines(text)
        .reduce((max, r) => Math.max(max, displayWidth(r.line)), 0);
      const enMax = widest(blocks.en);
      if (enMax === 0) return;
      for (const lang of LANGS) {
        if (lang === 'en') continue;
        for (const { number, line } of proseLines(blocks[lang])) {
          const width = displayWidth(line);
          if (width > enMax * WIDTH_RATIO && width > enMax + WIDTH_MARGIN) {
            problems.push(`${unit} part ${partIndex + 1}: ${lang} line ${number} is ` +
              `${width} columns against an English maximum of ${enMax}; ` +
              're-wrap it, the paragraph was edited without re-wrapping');
          }
        }
      }
    });
  }
}

// ------------------------------------------------------------------ cli

export function readUnits(contentDir) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(contentDir, 'manifest.js'), 'utf8').replace('export default ', ''));
  return manifest.map((unit) => {
    const dir = path.join(contentDir, ...unit.split('/'));
    const names = fs.readdirSync(dir)
      .filter((n) => /^body-\d+\.md$/u.test(n))
      .sort((a, b) => Number(a.slice(5, -3)) - Number(b.slice(5, -3)));
    const parts = names.map((name) => validateBodySourceShape(
      unit, 1, fs.readFileSync(path.join(dir, name), 'utf8'), `${unit}/${name}`));
    return { unit, parts };
  });
}

export function checkSources(units) {
  const problems = [];
  const notes = [];
  checkPartsAligned(units, problems, notes);
  checkListParity(units, problems);
  checkIndentShapes(units, problems);
  checkUnwrapped(units, problems);
  return { problems, notes };
}

function cli() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const contentDir = args.find((a) => !a.startsWith('--'));
  if (contentDir === undefined) {
    process.stderr.write('usage: node scripts/check_sources.mjs <content-dir> [--verbose]\n');
    process.exit(2);
  }
  const units = readUnits(path.resolve(contentDir));
  const { problems, notes } = checkSources(units);
  const files = units.reduce((n, u) => n + u.parts.length, 0);

  if (verbose || notes.length > 0) {
    for (const note of notes) process.stdout.write(`note: ${note}\n`);
  }
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`check_sources: ${problem}\n`);
    process.stderr.write(`check_sources: FAIL — ${problems.length} problem(s) ` +
      `across ${units.length} unit(s), ${files} body file(s)\n`);
    process.exit(1);
  }
  process.stdout.write(`check_sources: PASS — ${units.length} unit(s), ${files} body file(s), ` +
    `${notes.length} note(s)\n`);
  process.exit(0);
}

const invokedDirectly = process.argv[1] !== undefined &&
  path.resolve(process.argv[1]).endsWith(`${path.sep}check_sources.mjs`);
if (invokedDirectly) cli();
