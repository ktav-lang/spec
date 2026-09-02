#!/usr/bin/env python3
r"""Check structural parity between the normative EN spec and its translations.

Purpose:
    This repo ships versions/<v>/spec.md (English, normative) alongside
    spec.ru.md and spec.zh.md (translations that are supposed to be fully
    normatively parallel). Several review rounds found translations silently
    DROPPING real normative content (whole paragraphs, MUST/MUST NOT
    sentences, code blocks) while superficially looking parallel (same
    heading count, same BNF grammar count). This script is a STRUCTURAL
    parity gate, not a translation-quality or meaning check: it does not
    know Russian or Chinese and cannot tell whether a translation is
    *correct*. It only compares, per numbered section, cheap countable
    proxies for normative content between EN and each translation:

      1. Counts of the RFC 2119 keywords MUST NOT, MUST, SHOULD NOT,
         SHOULD, MAY. This repo's convention keeps these keywords in
         literal English caps in every translation (verified by spot
         check), so a plain regex count works directly on all files
         without any translation-awareness. MUST NOT is counted before
         MUST (and SHOULD NOT before SHOULD) so the MUST inside "MUST
         NOT" is not also counted as a bare MUST.
      2. Counts of fenced (``` ... ```) code blocks, attributed to the
         section containing the block's OPENING fence.
      3. Section-inventory parity: the set of numbered section headings in
         a translation must exactly equal EN's. A section present in EN
         but missing from the translation is a failure; so is a section
         number present ONLY in the translation (added content EN does
         not have), and so is a section number appearing more than once
         in the translation (duplicate heading — e.g. two blocks both
         numbered 2.2 silently shadowing each other).
      4. Heading nesting level (count of leading '#') of each section,
         EN vs translation: a "## 5.3" demoted to "### 5.3" in a
         translation changes the document's structure.
      5. Content-loss counters per section, EN vs translation:
           - paragraph count: a paragraph is a maximal run of consecutive
             non-blank lines outside fences (fence delimiter lines, fence
             contents, and blank lines all end a block; a run containing
             list items still counts as one paragraph);
           - list-item count: lines outside fences matching
             "^\s*(?:[-*]|\d+\.)\s+";
           - table-row count: lines outside fences matching "^\s*|".
         Together these catch the deletion of an ordinary paragraph that
         contains no RFC 2119 keyword and no code fence.

    A mismatch in any metric for a section that exists in both files is a
    strong signal that normative content was dropped (or, more rarely,
    unnecessarily added) somewhere in that section during translation,
    and is worth a human look. It does not itself say what changed.

    Section scoping: a "section" is identified purely by the leading
    number in its heading (e.g. "## 5.3 Pair Lines" -> "5.3"), located
    independently by number in each file — the translated heading TEXT is
    never compared. A section's "text range" runs from its heading line up
    to (but not including) the NEXT heading line of ANY level, not the
    next heading at the same or shallower level. This means a "###"
    subsection's own content stops at the next "####" (or shallower)
    heading, and a parent "##" section's own range covers only whatever
    text sits before its first subsection heading. This is a deliberate
    simplification (per-immediate-section, not accumulating nested
    subsections' content into the parent) — it is simpler to implement
    correctly and is a reasonable approximation for a structural gate,
    since every line still belongs to exactly one section's range and gets
    checked somewhere.

    Heading lines are only recognized OUTSIDE fenced code blocks: this
    spec's own text embeds ktav example documents that use "##"-prefixed
    comment lines inside ``` fences (e.g. "## Sample configuration" is
    literal example content, not a markdown heading) — treating those as
    real headings would corrupt section ranges.

Usage:
    python scripts/check_translation_parity.py <en.md> <translation.md> [<translation2.md> ...]
    python scripts/check_translation_parity.py versions/0.7/spec.md versions/0.7/spec.ru.md versions/0.7/spec.zh.md [--verbose]

Exit codes:
    0  every translation matches EN in all metrics for every section of
       both files (and has no extra/duplicate sections)
    1  one or more mismatches (including missing, translation-only, or
       duplicate sections) found
    2  usage error (missing/unreadable file)
"""

import argparse
import re
import sys

HEADING_RE = re.compile(r'^#{1,6}\s+\S')
NUMBERED_HEADING_RE = re.compile(r'^#{1,6}\s+(\d+(?:\.\d+)*)\b')
FENCE_RE = re.compile(r'^\s*```')
LIST_ITEM_RE = re.compile(r'^\s*(?:[-*]|\d+\.)\s+')
TABLE_ROW_RE = re.compile(r'^\s*\|')

# Order matters for readability only: MUST NOT / SHOULD NOT use their own
# literal patterns, while MUST / SHOULD use a negative lookahead so the
# "MUST" inside "MUST NOT" (and "SHOULD" inside "SHOULD NOT") is not
# double-counted as a bare MUST/SHOULD.
KEYWORD_PATTERNS = [
    ("MUST NOT", re.compile(r'\bMUST NOT\b')),
    ("MUST", re.compile(r'\bMUST\b(?!\s+NOT\b)')),
    ("SHOULD NOT", re.compile(r'\bSHOULD NOT\b')),
    ("SHOULD", re.compile(r'\bSHOULD\b(?!\s+NOT\b)')),
    ("MAY", re.compile(r'\bMAY\b')),
]


def read_lines(path):
    """Read a file as UTF-8 text, split into lines (no line endings). Raises
    OSError/UnicodeDecodeError on failure; caller turns that into exit 2."""
    with open(path, "r", encoding="utf-8") as f:
        return f.read().splitlines()


def section_sort_key(number):
    """Sort '3.7.1' before '10.2' numerically, not lexically."""
    return tuple(int(part) for part in number.split("."))


def heading_level(line):
    """Count of leading '#' characters on a heading line."""
    return len(line) - len(line.lstrip("#"))


def parse_file(lines):
    """Single fence-aware pass over a file's lines.

    Returns (sections, fence_opens, occurrences, levels, excluded):
      sections: dict of section-number -> (start_idx, end_idx) text range,
        end_idx exclusive, keyed by the FIRST occurrence of that number.
      fence_opens: sorted list of line indices where a ``` fence OPENS
        (i.e., the line index of the toggle from not-in-fence to in-fence).
      occurrences: dict of section-number -> count of numbered-heading
        occurrences (outside fences), for duplicate detection.
      levels: dict of section-number -> heading level of its FIRST
        occurrence.
      excluded: list, same length as lines, True for lines that must be
        ignored by content counters (inside a fence or a fence delimiter
        line). Such lines also act as paragraph-block boundaries.

    Lines matching a heading pattern while inside a fenced code block are
    not treated as headings (see module docstring).
    """
    heading_indices = []
    numbered = {}
    occurrences = {}
    levels = {}
    fence_opens = []
    excluded = []
    in_fence = False
    for idx, line in enumerate(lines):
        if FENCE_RE.match(line):
            excluded.append(True)
            if not in_fence:
                fence_opens.append(idx)
            in_fence = not in_fence
            continue
        if in_fence:
            excluded.append(True)
            continue
        excluded.append(False)
        if HEADING_RE.match(line):
            heading_indices.append(idx)
            m = NUMBERED_HEADING_RE.match(line)
            if m:
                num = m.group(1)
                occurrences[num] = occurrences.get(num, 0) + 1
                if num not in numbered:
                    numbered[num] = idx
                    levels[num] = heading_level(line)

    heading_indices.sort()
    sections = {}
    for num, start in numbered.items():
        end = len(lines)
        for h in heading_indices:
            if h > start:
                end = h
                break
        sections[num] = (start, end)
    return sections, fence_opens, occurrences, levels, excluded


def count_content(lines, start, end, excluded):
    """Count (paragraphs, list items, table rows) in lines[start:end).

    A paragraph is a maximal run of consecutive non-blank lines; excluded
    lines (fence delimiters, fence contents) and blank lines end a run.
    A run containing list items still counts as one paragraph."""
    paragraphs = 0
    list_items = 0
    table_rows = 0
    in_block = False
    for idx in range(start, end):
        line = lines[idx]
        if excluded[idx] or not line.strip() or HEADING_RE.match(line):
            in_block = False
            continue
        if not in_block:
            paragraphs += 1
            in_block = True
        if LIST_ITEM_RE.match(line):
            list_items += 1
        if TABLE_ROW_RE.match(line):
            table_rows += 1
    return paragraphs, list_items, table_rows


def count_code_blocks_per_section(sections, fence_opens):
    """Map each numbered section to the count of fence-opens that fall
    within its [start, end) range. A fence-open outside every known
    numbered section's range (e.g. in unnumbered front matter) is not
    attributed anywhere."""
    counts = {num: 0 for num in sections}
    items = sorted(sections.items(), key=lambda kv: kv[1][0])
    for idx in fence_opens:
        for num, (start, end) in items:
            if start <= idx < end:
                counts[num] += 1
                break
    return counts


def count_keywords(lines, start, end):
    text = "\n".join(lines[start:end])
    return {name: len(pattern.findall(text)) for name, pattern in KEYWORD_PATTERNS}


def check_translation(en_lines, en_sections, en_code_counts, en_numbers_sorted,
                       en_levels, en_excluded, t_path, t_lines, verbose):
    """Compare one translation file against EN. Prints [FAIL]/[PASS] lines
    as it goes; returns the count of sections (either direction) with any
    mismatch."""
    (t_sections, t_fence_opens, t_occurrences, t_levels,
     t_excluded) = parse_file(t_lines)
    t_code_counts = count_code_blocks_per_section(t_sections, t_fence_opens)

    n_mismatch = 0
    for num in en_numbers_sorted:
        en_start, en_end = en_sections[num]
        en_kw = count_keywords(en_lines, en_start, en_end)
        en_code = en_code_counts[num]

        if num not in t_sections:
            print("[FAIL] %s Sec %s: missing section (present in EN, "
                  "not found in translation)" % (t_path, num))
            n_mismatch += 1
            continue

        t_start, t_end = t_sections[num]
        t_kw = count_keywords(t_lines, t_start, t_end)
        t_code = t_code_counts[num]

        problems = []
        for name, _ in KEYWORD_PATTERNS:
            if en_kw[name] != t_kw[name]:
                problems.append("%s count mismatch (EN=%d, translation=%d)"
                                 % (name, en_kw[name], t_kw[name]))
        if en_code != t_code:
            problems.append("code-block count mismatch (EN=%d, translation=%d)"
                             % (en_code, t_code))
        en_para, en_list, en_table = count_content(
            en_lines, en_start, en_end, en_excluded)
        t_para, t_list, t_table = count_content(
            t_lines, t_start, t_end, t_excluded)
        if en_para != t_para:
            problems.append("paragraph count mismatch (EN=%d, translation=%d)"
                            % (en_para, t_para))
        if en_list != t_list:
            problems.append("list-item count mismatch (EN=%d, translation=%d)"
                            % (en_list, t_list))
        if en_table != t_table:
            problems.append("table-row count mismatch (EN=%d, translation=%d)"
                            % (en_table, t_table))
        if en_levels[num] != t_levels[num]:
            problems.append("heading level mismatch (EN=h%d, translation=h%d)"
                            % (en_levels[num], t_levels[num]))

        if problems:
            n_mismatch += 1
            for p in problems:
                print("[FAIL] %s Sec %s: %s" % (t_path, num, p))
        elif verbose:
            print("[PASS] %s Sec %s: all counts match" % (t_path, num))

    for num in sorted(t_occurrences, key=section_sort_key):
        count = t_occurrences[num]
        if count > 1:
            print("[FAIL] %s Sec %s: duplicate section number (%d occurrences)"
                  % (t_path, num, count))
            n_mismatch += 1
        elif num not in en_sections:
            print("[FAIL] %s Sec %s: translation-only section "
                  "(not present in EN)" % (t_path, num))
            n_mismatch += 1

    return n_mismatch


def main(argv):
    parser = argparse.ArgumentParser(
        description="Check structural parity (RFC 2119 keyword / code-block / "
                     "paragraph / list-item / table-row counts, heading "
                     "levels, section inventory) between the normative EN "
                     "spec and its translations, per numbered section.")
    parser.add_argument("en_path", help="path to the normative English spec, "
                        "e.g. versions/0.7/spec.md")
    parser.add_argument("translation_paths", nargs="+",
                        help="one or more translation files, e.g. "
                             "versions/0.7/spec.ru.md versions/0.7/spec.zh.md")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="also print a [PASS] line for every section "
                             "whose counts fully match")
    args = parser.parse_args(argv)

    try:
        en_lines = read_lines(args.en_path)
    except (OSError, UnicodeDecodeError) as e:
        print("error: could not read EN file %s: %s" % (args.en_path, e),
              file=sys.stderr)
        return 2

    en_sections, en_fence_opens, en_occurrences, en_levels, en_excluded = \
        parse_file(en_lines)
    if not en_sections:
        print("error: no numbered sections (headings matching '#+ <number>') "
              "found in EN file %s" % args.en_path, file=sys.stderr)
        return 2
    en_code_counts = count_code_blocks_per_section(en_sections, en_fence_opens)
    en_numbers_sorted = sorted(en_sections, key=section_sort_key)

    translation_lines = {}
    t_occurrence_counts = {}
    for t_path in args.translation_paths:
        try:
            translation_lines[t_path] = read_lines(t_path)
        except (OSError, UnicodeDecodeError) as e:
            print("error: could not read translation file %s: %s" % (t_path, e),
                  file=sys.stderr)
            return 2
        _, _, t_occ, _, _ = parse_file(translation_lines[t_path])
        t_occurrence_counts[t_path] = t_occ

    summary_lines = []
    overall = "PASS"
    for t_path in args.translation_paths:
        n_mismatch = check_translation(en_lines, en_sections, en_code_counts,
                                        en_numbers_sorted, en_levels,
                                        en_excluded, t_path,
                                        translation_lines[t_path], args.verbose)
        if n_mismatch:
            overall = "FAIL"
        summary_lines.append(
            "%s: %d section(s) with mismatches (EN defines %d numbered "
            "section(s); translation defines %d)"
            % (t_path, n_mismatch, len(en_numbers_sorted),
               len(t_occurrence_counts[t_path])))

    for line in summary_lines:
        print(line)
    print("OVERALL: %s" % overall)
    return 0 if overall == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
