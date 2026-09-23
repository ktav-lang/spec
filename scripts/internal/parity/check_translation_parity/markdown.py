"""Markdown structural parsing helpers for the translation parity checker."""

from .patterns import (
    HEADING_RE,
    LIST_ITEM_RE,
    NUMBERED_HEADING_RE,
    SOURCE_LINE_END_RE,
    TABLE_ROW_RE,
)

def split_source_lines(text):
    """Split source text on CRLF, LF, and CR only.

    Keep the same empty-file and final-terminator behavior as
    ``str.splitlines()``, without treating Unicode line/paragraph separators
    or vertical/tab form-feed controls as line boundaries.
    """
    if not text:
        return []
    lines = SOURCE_LINE_END_RE.split(text)
    if text.endswith(("\r", "\n")):
        lines.pop()
    return lines


def read_lines(path):
    """Read a UTF-8 source file and split it into lines.

    OSError/UnicodeDecodeError are raised for the caller to turn into exit 2.
    ``newline=""`` preserves the source terminators for split_source_lines.
    """
    with open(path, "r", encoding="utf-8", newline="") as f:
        return split_source_lines(f.read())


def section_sort_key(number):
    """Sort decimal section components without converting them to integers.

    Heading numbers are untrusted input. Comparing each normalized decimal
    component by significant length and then digits preserves numeric order
    while avoiding Python's bounded decimal-to-int conversion entirely.
    """
    components = []
    for part in number.split("."):
        significant = part.lstrip("0") or "0"
        components.append((len(significant), significant))
    return tuple(components)


def heading_level(line):
    """Count of leading '#' characters on a heading line."""
    idx = 0
    while idx < len(line) and line[idx] == " ":
        idx += 1
    start = idx
    while idx < len(line) and line[idx] == "#":
        idx += 1
    return idx - start


def ascii_blank(line):
    """Whether a Markdown line is blank under the ASCII whitespace rules."""
    return not line or all(char in " \t" for char in line)


def ascii_strip(text):
    """Strip only the ASCII space and tab characters from both ends."""
    return text.strip(" \t")


def parse_fence_opener(line):
    """Return ``(character, length)`` for a valid Markdown fence opener."""
    indent = 0
    while indent < len(line) and line[indent] == " ":
        indent += 1
    if indent > 3 or indent == len(line) or line[indent] not in "`~":
        return None
    marker = line[indent]
    end = indent
    while end < len(line) and line[end] == marker:
        end += 1
    length = end - indent
    if length < 3:
        return None
    # CommonMark forbids backticks in a backtick fence's info string.  A
    # tilde fence may carry arbitrary info text, which remains excluded with
    # the opener line just like a backtick fence's info string.
    if marker == "`" and "`" in line[end:]:
        return None
    return marker, length


def is_fence_closer(line, fence):
    """Whether ``line`` closes ``fence`` (marker character and length)."""
    marker, opener_length = fence
    indent = 0
    while indent < len(line) and line[indent] == " ":
        indent += 1
    if indent > 3 or indent == len(line) or line[indent] != marker:
        return False
    end = indent
    while end < len(line) and line[end] == marker:
        end += 1
    if end - indent < opener_length:
        return False
    return all(char in " \t" for char in line[end:])


def heading_text(line):
    """Return the text of a heading matched by ``HEADING_RE``."""
    idx = 0
    while idx < len(line) and line[idx] == " ":
        idx += 1
    while idx < len(line) and line[idx] == "#":
        idx += 1
    return ascii_strip(line[idx:])


def parse_file(lines):
    """Single fence-aware pass over a file's lines.

    Returns (sections, fence_opens, occurrences, levels, excluded, named,
    unclosed_fence, fence_ranges):
      sections: dict of section-number -> (start_idx, end_idx) text range,
        end_idx exclusive, keyed by the FIRST occurrence of that number.
      fence_opens: sorted list of line indices where a valid backtick or
        tilde fence OPENS (i.e., the line index of the toggle from
        not-in-fence to in-fence).
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
      unclosed_fence: True if the file ends while still "in a fence".
        When True,
        everything after the last real fence-open was silently treated
        as excluded (code) content by this same pass, which corrupts the
        paragraph/list/table/keyword counts for whatever section(s)
        follow — callers MUST treat this as a fatal condition rather
        than trusting section content counts derived from this parse.
      fence_ranges: ordered list of (open_idx, content_start, content_end)
        for every COMPLETE (closed) fence, in document order: open_idx is
        the line index of the opening fence delimiter (matching an entry in
        fence_opens, used to attribute the fence to a section the same
        way count_code_blocks_per_section does); content_start/content_end
        bound lines[content_start:content_end], the fence's content lines
        with both ``` delimiters excluded. A trailing unclosed fence (see
        unclosed_fence above) contributes no entry here.

    Lines matching a heading pattern while inside a fenced code block are
    not treated as headings (see module docstring).
    """
    heading_indices = []
    numbered = {}
    occurrences = {}
    levels = {}
    named = []
    fence_opens = []
    fence_ranges = []
    excluded = []
    fence = None
    open_idx = None
    for idx, line in enumerate(lines):
        if fence is None:
            opener = parse_fence_opener(line)
            if opener is not None:
                fence = opener
                fence_opens.append(idx)
                open_idx = idx
                excluded.append(True)
                continue
        elif is_fence_closer(line, fence):
            excluded.append(True)
            fence_ranges.append((open_idx, open_idx + 1, idx))
            fence = None
            continue
        if fence is not None:
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
                named.append((heading_text(line), heading_level(line),
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
    return (sections, fence_opens, occurrences, levels, excluded, named,
            fence is not None, fence_ranges)


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
        if excluded[idx] or ascii_blank(line) or HEADING_RE.match(line):
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


def count_fence_line_counts_per_section(sections, fence_ranges, lines):
    """Map each section to an ORDERED list of non-blank line counts, one
    entry per fenced code block whose OPENING delimiter falls within that
    section's [start, end) range (same attribution rule as
    count_code_blocks_per_section, and same section keys/units — numbered
    section numbers, or synthetic 0-based indices for named sections).

    count_code_blocks_per_section alone only counts HOW MANY fences a
    section has, which stays equal if a translator keeps a section's
    heading and its single big fence but silently drops a line FROM
    INSIDE that fence (e.g. one BNF production line cut from an
    otherwise-preserved § 4 grammar block). Comparing this per-fence
    line-count list, position by position, between EN and a translation
    catches that case."""
    counts = {num: [] for num in sections}
    items = sorted(sections.items(), key=lambda kv: kv[1][0])
    for open_idx, content_start, content_end in fence_ranges:
        for num, (start, end) in items:
            if start <= open_idx < end:
                nonblank = sum(1 for i in range(content_start, content_end)
                               if not ascii_blank(lines[i]))
                counts[num].append(nonblank)
                break
    return counts


