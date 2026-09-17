"""Front-matter checks for the translation parity checker."""

import datetime

from .markdown import ascii_blank, is_fence_closer, parse_fence_opener
from .patterns import (
    BLOCKQUOTE_RE,
    DATE_LINE_RE,
    FIELD_LINE_RE,
    H1_RE,
    HEADING_RE,
    ISO_DATE_RE,
    KEYWORD_PATTERNS,
    VERSION_LINE_RE,
)

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

    Lines inside valid backtick/tilde fences are ignored, matching
    parse_file."""
    h1_count = 0
    version_values = []
    date_values = []
    strays = []
    field_count = 0
    fence = None
    in_front_matter = True
    for line in lines:
        if fence is None:
            opener = parse_fence_opener(line)
            if opener is not None:
                fence = opener
                if in_front_matter:
                    strays.append(line)
                continue
        elif is_fence_closer(line, fence):
            fence = None
            if in_front_matter:
                strays.append(line)
            continue
        if fence is not None:
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
        if not in_front_matter or ascii_blank(line):
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


