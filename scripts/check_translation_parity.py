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
         NOT" is not also counted as a bare MUST. Lines inside fenced
         code blocks are excluded from this count (same excluded mask
         as item 5) so a keyword appearing only in example code is not
         mistaken for normative prose.
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

      6. Named-section parity: unnumbered headings of level >= 2 (the h1
         document title and the front-matter region under it are excluded
         from THIS generic count comparison — RU/ZH legitimately carry an
         "Informative translation" blockquote EN does not have; that
         region is instead covered by the targeted checks in item 7). Named sections are
         matched POSITIONALLY: EN's i-th unnumbered top-level heading is
         paired with the translation's i-th, and the same metrics as for
         numbered sections are compared. Positional matching is required
         because the heading TEXT is translated (Abstract / Аннотация /
         摘要), so exact-text comparison between languages is impossible;
         no language-independent identifier exists (letter-based matching
         like "Appendix A" / "Приложение A" / "附录 A" would hard-code
         translator conventions and break on future front-matter
         sections); and all shipped files carry their unnumbered
         top-level sections in identical relative order, so position among
         unnumbered top-level headings is the invariant. A named section
         present in EN but missing from the translation is a failure, as
         is a translation-only named section.
      7. Targeted front-matter checks: the region from the start of the
         file to the first heading of any level (the h1 title plus the
         fields under it) is deliberately NOT compared with the generic
         paragraph/list/table counters above — RU/ZH legitimately carry
         an "Informative translation" disclaimer blockquote EN does not
         have, so count parity there would be a permanent false positive.
         Instead five targeted checks run:
           a. exactly ONE h1 heading ("# ...", single '#', not "##" or
              deeper) per file, outside fences — zero or several h1s
              corrupt the document structure;
           b. the value of the bold Version label line (recognized in
              all three languages: "**Version:**" / "**Версия:**" /
              "**版本:**") must be the identical string in EN and every
              translation;
           c. the bold Date label line ("**Date:**" / "**Дата:**" /
              "**日期:**") value is free prose that legitimately differs
              word-for-word across languages ("unreleased" vs "не
              выпущено" vs "未发布"), so it is first reduced to a
              release-status signal: "draft" if the value contains no
              ISO date (YYYY-MM-DD), "dated" if it contains one that is
              a real calendar date, "invalid" if it contains a
              YYYY-MM-DD-shaped substring that is not a real calendar
              date (e.g. month 13). All files must carry the same
              status, "invalid" always fails, and when the status is
              "dated" the extracted date string itself must also be
              identical across EN and every translation — a translation
              silently carrying a different release date than EN, or
              than another translation, is a release-correctness bug
              this checker must catch (see extract_release_date);
           d. every non-blank front-matter line must be either a
              blockquote line (the legitimate per-language disclaimer)
              or a bold "**Label:** value" field line — a stray plain
              paragraph appended under the title is a failure. This is a
              per-file shape whitelist, not a count comparison: it still
              tolerates the RU/ZH disclaimer and any future field
              labels, but catches silently appended free text;
           e. the total count of bold "**Label:** value" field lines
              (any label, not just Version/Date — e.g. "**Languages:**")
              in the front-matter region must be identical between EN
              and every translation. This is a coarse count-only check
              (label text is translated and cannot be compared), but it
              catches a whole field line being dropped wholesale (e.g.
              the "**Languages:**" line removed from a translation),
              which checks (b)-(d) alone do not detect since they only
              look at the Version/Date lines and at disallowed shapes,
              not at how many well-formed field lines are present.

    Fatal input check: if the EN file itself contains a duplicate
    numbered-section heading, EN being canonical, the run aborts with a
    fatal error (exit 1) before any translation is read or compared —
    a duplicated heading in the normative file must never silently pass
    by being compared against only one of the two occurrences. The same
    fatal-before-comparing treatment applies if the EN file itself ends
    while still inside an unterminated ``` fence (unbalanced fence
    delimiters): every section range and content count derived from a
    parse with a dangling fence is untrustworthy, since the whole tail of
    the file after the broken fence is silently mis-treated as excluded
    (code) content. A translation ending inside an unterminated fence is
    not fatal to the whole run (other translations are still checked) but
    is reported as a per-translation [FAIL] that fails OVERALL.

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
       both files (and has no extra/duplicate sections, and the targeted
       front-matter checks pass)
    1  one or more mismatches (including missing, translation-only, or
       duplicate sections) found
    2  usage error (missing/unreadable file)
"""

import argparse
import datetime
import re
import sys

HEADING_RE = re.compile(r'^#{1,6}\s+\S')
NUMBERED_HEADING_RE = re.compile(r'^#{1,6}\s+(\d+(?:\.\d+)*)\b')
FENCE_RE = re.compile(r'^\s*```')
LIST_ITEM_RE = re.compile(r'^\s*(?:[-*]|\d+\.)\s+')
TABLE_ROW_RE = re.compile(r'^\s*\|')

# Front-matter recognition: the h1 title line (single '#', not '##' or
# deeper), blockquote lines (the legitimate per-language disclaimer),
# bold '**Label:** ...' field lines, and the bold Version/Date label
# lines in all three shipped languages.
H1_RE = re.compile(r'^#\s+\S')
BLOCKQUOTE_RE = re.compile(r'^\s*>')
# Requires the actual "**Label:** value" shape: a colon immediately before
# the closing '**' (so a plain bold PROSE paragraph like "**note text**"
# with no colon is rejected), and at least one non-whitespace character
# after the closing '**' (so a label with no value is rejected). A space
# between the closing '**' and the value is NOT required — the shipped ZH
# Date line writes "**日期:**(未发布 ...)" with none.
FIELD_LINE_RE = re.compile(r'^\s*\*\*[^*:]+:\*\*\s*\S')
VERSION_LINE_RE = re.compile(
    r'^\s*\*\*(?:Version|Версия|版本):\*\*\s*(\S.*?)\s*$')
DATE_LINE_RE = re.compile(
    r'^\s*\*\*(?:Date|Дата|日期):\*\*\s*(\S.*?)\s*$')
# Digit-bounded on both sides so "2026-09-020" (an extra trailing digit)
# is not mistaken for the valid date "2026-09-02" followed by an ignored
# stray digit — plain '\d{4}-\d{2}-\d{2}' would substring-match it.
ISO_DATE_RE = re.compile(r'(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)')

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

    Returns (sections, fence_opens, occurrences, levels, excluded, named,
    unclosed_fence):
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
      named: ordered list of (text, level, start_idx, end_idx) for every
        heading (outside fences) that is NOT numbered and whose level is
        >= 2 (i.e. excluding the h1 document title); end_idx uses the
        same rule as numbered sections.
      unclosed_fence: True if the file ends while still "in a fence"
        (an odd number of ``` delimiter lines were seen). When True,
        everything after the last real fence-open was silently treated
        as excluded (code) content by this same pass, which corrupts the
        paragraph/list/table/keyword counts for whatever section(s)
        follow — callers MUST treat this as a fatal condition rather
        than trusting section content counts derived from this parse.

    Lines matching a heading pattern while inside a fenced code block are
    not treated as headings (see module docstring).
    """
    heading_indices = []
    numbered = {}
    occurrences = {}
    levels = {}
    named = []
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
            elif heading_level(line) >= 2:
                named.append((line.lstrip("#").strip(), heading_level(line),
                              idx, None))

    heading_indices.sort()
    sections = {}
    for num, start in numbered.items():
        end = len(lines)
        for h in heading_indices:
            if h > start:
                end = h
                break
        sections[num] = (start, end)
    for i, (text, level, start, _) in enumerate(named):
        end = len(lines)
        for h in heading_indices:
            if h > start:
                end = h
                break
        named[i] = (text, level, start, end)
    return sections, fence_opens, occurrences, levels, excluded, named, in_fence


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


def count_keywords(lines, start, end, excluded):
    """Count RFC 2119 keyword occurrences in lines[start:end), skipping
    lines where excluded[idx] is true (fence delimiters/contents) so a
    keyword appearing inside an example code block is not counted as
    normative prose."""
    text = "\n".join(lines[idx] for idx in range(start, end) if not excluded[idx])
    return {name: len(pattern.findall(text)) for name, pattern in KEYWORD_PATTERNS}


def extract_release_date(date_value):
    """Extract a release-status signal and, when present, the calendar
    date itself from a front-matter Date-line value.

    Returns (status, date_or_none, detail_or_none):
      status: "draft" if the value contains no YYYY-MM-DD-shaped
        substring; "dated" if it contains EXACTLY ONE such substring and
        that substring is a real calendar date; "invalid" if the value
        contains a YYYY-MM-DD-shaped substring that is NOT a real
        calendar date (e.g. "2026-13-45"), OR contains TWO OR MORE
        date-shaped substrings at all (even if each is individually a
        valid calendar date, and even if they are identical — a Date
        line naming more than one date is itself a defect: either it
        disagrees with itself about the release date, or it is a
        copy-paste smell; either way "which one is authoritative" is not
        a question this checker can answer, so it does not guess).
      date_or_none: the matched "YYYY-MM-DD" string when status is
        "dated", else None.
      detail_or_none: a human-readable explanation of WHY status is
        "invalid" (bad calendar date vs. wrong occurrence count), else
        None. check_front_matter surfaces this verbatim in its [FAIL]
        message so the two invalid cases are not confused with each
        other.

    A YYYY-MM-DD-shaped substring requires a non-digit (or start/end of
    string) immediately before and after it, so "2026-09-020" (an extra
    trailing digit) does NOT count as the valid date "2026-09-02" with a
    silently-ignored stray digit tacked on — it counts as zero date-shaped
    substrings ("draft"), same as if no date were present at all.

    The Date value is free prose that legitimately differs word-for-word
    across languages ("(unreleased — 0.7 draft ...)" vs
    "(не выпущено — черновик 0.7 ...)" vs "(未发布 —— 0.7 草案...)"), so no
    literal cross-language comparison is possible before release. The one
    language-independent signal the line carries pre-release is whether a
    real release date has been filled in; after release, the ISO date
    itself becomes the language-independent value, and every translation
    is required to carry the exact same one (a translation quietly
    shipping a different release date than EN is a real bug, not a
    translation-wording difference).
    Known heuristic limit: a draft line quoting a target date
    ("unreleased, planned 2026-10-01") reads as "dated" — but translations
    mirror the EN wording, so the signal (and, being copied, the date
    substring) still matches in all files together."""
    matches = ISO_DATE_RE.findall(date_value)
    if not matches:
        return "draft", None, None
    if len(matches) > 1:
        return ("invalid", None,
                "expected exactly one date-shaped occurrence, found %d: %s"
                % (len(matches), ", ".join(matches)))
    try:
        datetime.datetime.strptime(matches[0], "%Y-%m-%d")
    except ValueError:
        return "invalid", None, "invalid calendar date ('%s')" % matches[0]
    return "dated", matches[0], None


def scan_front_matter(lines):
    """Fence-aware scan for the targeted front-matter checks.

    Returns (h1_count, version_values, date_values, strays, field_count):
      h1_count: number of h1 heading lines ('# text', single '#', not
        '##' or deeper) anywhere in the file outside code fences;
      version_values / date_values: values captured (in order) from the
        bold Version-family ('**Version:**' / '**Версия:**' / '**版本:**')
        and Date-family ('**Date:**' / '**Дата:**' / '**日期:**') label
        lines in the front-matter region (start of file up to the first
        heading of any level);
      strays: non-blank front-matter lines that are neither the heading
        ending the region, a blockquote line, nor a bold '**Label:** ...'
        field line;
      field_count: total number of lines in the front-matter region
        matching the generic bold '**Label:** value' shape (FIELD_LINE_RE),
        regardless of which label they carry (Version, Date, Languages, or
        any future field) — a coarse count comparison that catches a whole
        field line (e.g. '**Languages:** ...') being dropped from a
        translation even though its label text is untranslatable-by-regex.

    Lines inside ``` fences are ignored, matching parse_file."""
    h1_count = 0
    version_values = []
    date_values = []
    strays = []
    field_count = 0
    in_fence = False
    in_front_matter = True
    for line in lines:
        if FENCE_RE.match(line):
            in_fence = not in_fence
            if in_front_matter:
                strays.append(line)
            continue
        if in_fence:
            continue
        if in_front_matter and HEADING_RE.match(line):
            if h1_count >= 1:
                # The h1 title itself belongs to the region; the first
                # heading AFTER it ends the front-matter region.
                in_front_matter = False
            elif not H1_RE.match(line):
                in_front_matter = False
        if H1_RE.match(line):
            h1_count += 1
        if not in_front_matter or not line.strip():
            continue
        if HEADING_RE.match(line):
            # The h1 title (and the heading ending the region) is part of
            # the allowed shape, not a stray line.
            continue
        if BLOCKQUOTE_RE.match(line):
            continue
        if FIELD_LINE_RE.match(line):
            field_count += 1
            m = VERSION_LINE_RE.match(line)
            if m:
                version_values.append(m.group(1))
            m = DATE_LINE_RE.match(line)
            if m:
                date_values.append(m.group(1))
            continue
        strays.append(line)
    return h1_count, version_values, date_values, strays, field_count


def check_front_matter(en_path, en_lines, translation_lines, verbose):
    """Targeted front-matter checks (module docstring, item 7) over EN and
    every translation together. The region is NOT compared with the
    generic paragraph/list/table counters (RU/ZH legitimately carry an
    'Informative translation' disclaimer blockquote EN does not have);
    instead, per file: exactly one h1; per translation vs EN: identical
    Version value, identical binary release status from the Date line,
    and the same total count of bold '**Label:** value' field lines
    (catches a whole field line, e.g. '**Languages:**', being dropped
    without needing to compare untranslatable label text); per file: no
    stray non-blank front-matter lines. Prints [FAIL] lines (and one
    [PASS] line under --verbose when all files are clean); returns the
    number of failures printed."""
    scans = {en_path: scan_front_matter(en_lines)}
    for t_path, t_lines in translation_lines.items():
        scans[t_path] = scan_front_matter(t_lines)
    paths = [en_path] + list(translation_lines)
    n_fail = 0

    for path in paths:
        h1_count = scans[path][0]
        if h1_count != 1:
            print("[FAIL] %s: front matter: expected exactly 1 h1 title "
                  "heading ('# ...'), found %d" % (path, h1_count))
            n_fail += 1

    en_version = None
    if len(scans[en_path][1]) != 1:
        print("[FAIL] %s: front matter: expected exactly 1 Version label "
              "line ('**Version:**' / '**Версия:**' / '**版本:**') with a "
              "value, found %d" % (en_path, len(scans[en_path][1])))
        n_fail += 1
    else:
        en_version = scans[en_path][1][0]
    for path in translation_lines:
        t_versions = scans[path][1]
        if len(t_versions) != 1:
            print("[FAIL] %s: front matter: expected exactly 1 Version "
                  "label line ('**Version:**' / '**Версия:**' / "
                  "'**版本:**') with a value, found %d"
                  % (path, len(t_versions)))
            n_fail += 1
        elif en_version is not None and t_versions[0] != en_version:
            print("[FAIL] %s: front matter: Version value mismatch "
                  "(EN=%s, translation=%s)"
                  % (path, en_version, t_versions[0]))
            n_fail += 1

    en_status = None
    en_date = None
    if len(scans[en_path][2]) != 1:
        print("[FAIL] %s: front matter: expected exactly 1 Date label "
              "line ('**Date:**' / '**Дата:**' / '**日期:**') with a "
              "value, found %d" % (en_path, len(scans[en_path][2])))
        n_fail += 1
    else:
        en_status, en_date, en_detail = extract_release_date(
            scans[en_path][2][0])
        if en_status == "invalid":
            print("[FAIL] %s: front matter: Date value is invalid: %s"
                  % (en_path, en_detail))
            n_fail += 1
    for path in translation_lines:
        t_dates = scans[path][2]
        if len(t_dates) != 1:
            print("[FAIL] %s: front matter: expected exactly 1 Date label "
                  "line ('**Date:**' / '**Дата:**' / '**日期:**') with a "
                  "value, found %d" % (path, len(t_dates)))
            n_fail += 1
        elif en_status is not None:
            t_status, t_date, t_detail = extract_release_date(t_dates[0])
            if t_status == "invalid":
                print("[FAIL] %s: front matter: Date value is invalid: %s"
                      % (path, t_detail))
                n_fail += 1
            elif t_status != en_status:
                print("[FAIL] %s: front matter: release-status mismatch "
                      "(EN=%s, translation=%s)"
                      % (path, en_status, t_status))
                n_fail += 1
            elif en_status == "dated" and t_date != en_date:
                print("[FAIL] %s: front matter: release date mismatch "
                      "(EN=%s, translation=%s)" % (path, en_date, t_date))
                n_fail += 1

    for path in paths:
        strays = scans[path][3]
        if strays:
            print("[FAIL] %s: front matter: unexpected content line(s) "
                  "(%d, first: '%s'); only blank lines, blockquote ('>') "
                  "lines and bold '**Label:** value' field lines are "
                  "allowed between the h1 title and the first heading"
                  % (path, len(strays), strays[0]))
            n_fail += 1

    en_field_count = scans[en_path][4]
    for path in translation_lines:
        t_field_count = scans[path][4]
        if t_field_count != en_field_count:
            print("[FAIL] %s: front matter: field-line count mismatch "
                  "(EN=%d, translation=%d)"
                  % (path, en_field_count, t_field_count))
            n_fail += 1

    if verbose and n_fail == 0:
        print("[PASS] front matter: %d file(s) ok (exactly one h1 each; "
              "Version values and release status agree; field-line "
              "counts match; no unexpected front-matter lines)" % len(paths))
    return n_fail


def check_translation(en_lines, en_sections, en_code_counts, en_numbers_sorted,
                       en_levels, en_excluded, en_named, en_named_code_counts,
                       t_path, t_lines, verbose):
    """Compare one translation file against EN. Prints [FAIL]/[PASS] lines
    as it goes; returns the count of sections (either direction) with any
    mismatch."""
    (t_sections, t_fence_opens, t_occurrences, t_levels,
     t_excluded, t_named, t_unclosed_fence) = parse_file(t_lines)
    t_code_counts = count_code_blocks_per_section(t_sections, t_fence_opens)
    t_named_code_counts = count_code_blocks_per_section(
        {i: (start, end) for i, (_, _, start, end) in enumerate(t_named)},
        t_fence_opens)

    n_mismatch = 0
    if t_unclosed_fence:
        print("[FAIL] %s: unclosed fenced code block: file ends while "
              "still inside a ``` block (unbalanced fence delimiters)"
              % t_path)
        n_mismatch += 1
    for num in en_numbers_sorted:
        en_start, en_end = en_sections[num]
        en_kw = count_keywords(en_lines, en_start, en_end, en_excluded)
        en_code = en_code_counts[num]

        if num not in t_sections:
            print("[FAIL] %s Sec %s: missing section (present in EN, "
                  "not found in translation)" % (t_path, num))
            n_mismatch += 1
            continue

        t_start, t_end = t_sections[num]
        t_kw = count_keywords(t_lines, t_start, t_end, t_excluded)
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

    for i in range(min(len(en_named), len(t_named))):
        en_text, en_named_level, en_start, en_end = en_named[i]
        _, t_named_level, t_start, t_end = t_named[i]
        en_kw = count_keywords(en_lines, en_start, en_end, en_excluded)
        t_kw = count_keywords(t_lines, t_start, t_end, t_excluded)
        en_code = en_named_code_counts[i]
        t_code = t_named_code_counts[i]

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
        if en_named_level != t_named_level:
            problems.append("heading level mismatch (EN=h%d, translation=h%d)"
                            % (en_named_level, t_named_level))

        if problems:
            n_mismatch += 1
            for p in problems:
                print("[FAIL] %s named section '%s': %s"
                      % (t_path, en_text, p))
        elif verbose:
            print("[PASS] %s named section '%s': all counts match"
                  % (t_path, en_text))
    for i in range(len(t_named), len(en_named)):
        print("[FAIL] %s: missing named section: %s"
              % (t_path, en_named[i][0]))
        n_mismatch += 1
    for j in range(len(en_named), len(t_named)):
        print("[FAIL] %s: extra named section: %s (translation has %d "
              "unnumbered top-level section(s); EN has %d)"
              % (t_path, t_named[j][0], len(t_named), len(en_named)))
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

    # Force UTF-8 stdout so echoed non-ASCII fragments (Cyrillic/Chinese
    # excerpts in [FAIL] messages) never raise UnicodeEncodeError on a
    # non-UTF-8 console (e.g. Windows cp1252); backslashreplace is a
    # no-op for valid text under UTF-8 and only guards pathological input.
    # sys.stdout may be swapped for a stream without .reconfigure() (e.g.
    # io.StringIO in tests), so only call it when available.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

    try:
        en_lines = read_lines(args.en_path)
    except (OSError, UnicodeDecodeError) as e:
        print("error: could not read EN file %s: %s" % (args.en_path, e),
              file=sys.stderr)
        return 2

    en_sections, en_fence_opens, en_occurrences, en_levels, en_excluded, \
        en_named, en_unclosed_fence = parse_file(en_lines)
    if not en_sections:
        print("error: no numbered sections (headings matching '#+ <number>') "
              "found in EN file %s" % args.en_path, file=sys.stderr)
        return 2
    dupes = sorted((num for num, count in en_occurrences.items() if count > 1),
                   key=section_sort_key)
    if dupes:
        for num in dupes:
            print("[FAIL] %s Sec %s: duplicate section number (%d occurrences)"
                  % (args.en_path, num, en_occurrences[num]))
        print("error: EN file %s contains duplicate section number(s) %s; "
              "EN is canonical, so translations are not compared"
              % (args.en_path, ", ".join(dupes)), file=sys.stderr)
        print("OVERALL: FAIL")
        return 1
    if en_unclosed_fence:
        print("[FAIL] %s: unclosed fenced code block: file ends while "
              "still inside a ``` block (unbalanced fence delimiters)"
              % args.en_path)
        print("error: EN file %s ends inside an unterminated fenced code "
              "block; EN is canonical, so translations are not compared"
              % args.en_path, file=sys.stderr)
        print("OVERALL: FAIL")
        return 1
    en_code_counts = count_code_blocks_per_section(en_sections, en_fence_opens)
    en_numbers_sorted = sorted(en_sections, key=section_sort_key)

    en_named_code_counts = count_code_blocks_per_section(
        {i: (start, end) for i, (_, _, start, end) in enumerate(en_named)},
        en_fence_opens)
    translation_lines = {}
    t_occurrence_counts = {}
    for t_path in args.translation_paths:
        try:
            translation_lines[t_path] = read_lines(t_path)
        except (OSError, UnicodeDecodeError) as e:
            print("error: could not read translation file %s: %s" % (t_path, e),
                  file=sys.stderr)
            return 2
        _, _, t_occ, _, _, _, _ = parse_file(translation_lines[t_path])
        t_occurrence_counts[t_path] = t_occ

    fm_failures = check_front_matter(args.en_path, en_lines,
                                     translation_lines, args.verbose)
    summary_lines = []
    overall = "PASS"
    if fm_failures:
        overall = "FAIL"
    summary_lines.append(
        "front matter: %d mismatch(es) (h1 count / Version value / "
        "release status and date / field-line count / allowed line "
        "shapes)" % fm_failures)
    for t_path in args.translation_paths:
        n_mismatch = check_translation(en_lines, en_sections, en_code_counts,
                                        en_numbers_sorted, en_levels,
                                        en_excluded, en_named,
                                        en_named_code_counts, t_path,
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
