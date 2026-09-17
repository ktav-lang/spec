"""Command-line entry point for the translation parity checker."""

import argparse
import sys

from .checker import check_translation
from .front_matter import check_front_matter
from .grammar import (
    extract_bare_grammar_lhs,
    extract_bare_grammar_lhs_occurrences,
    extract_bare_grammar_productions,
    extract_grammar_lhs,
    extract_grammar_lhs_occurrences,
    extract_grammar_productions,
)
from .markdown import (
    count_code_blocks_per_section,
    count_fence_line_counts_per_section,
    parse_file,
    read_lines,
    section_sort_key,
)

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
        en_named, en_unclosed_fence, en_fence_ranges = parse_file(en_lines)
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
    en_fence_line_counts = count_fence_line_counts_per_section(
        en_sections, en_fence_ranges, en_lines)
    en_numbers_sorted = sorted(en_sections, key=section_sort_key)

    en_grammar_duplicates = []
    for num in en_numbers_sorted:
        start, end = en_sections[num]
        if extract_grammar_lhs(en_lines, start, end, en_excluded):
            lhs_occurrences = extract_grammar_lhs_occurrences(
                en_lines, start, end, en_excluded)
            for lhs in sorted(lhs_occurrences):
                if lhs_occurrences[lhs] > 1:
                    en_grammar_duplicates.append(
                        (num, lhs, lhs_occurrences[lhs]))
    if en_grammar_duplicates:
        for num, lhs, count in en_grammar_duplicates:
            print("[FAIL] %s Sec %s: duplicate grammar production LHS %s "
                  "(%d declarations)" %
                  (args.en_path, num, lhs, count))
        print("error: EN file %s contains duplicate grammar production "
              "declaration(s); EN is canonical, so translations are not "
              "compared" % args.en_path, file=sys.stderr)
        print("OVERALL: FAIL")
        return 1
    en_bare_grammar_duplicates = []
    for num in en_numbers_sorted:
        start, end = en_sections[num]
        occurrences = extract_bare_grammar_lhs_occurrences(
            en_lines, start, end, en_excluded)
        for lhs in sorted(occurrences):
            if occurrences[lhs] > 1:
                en_bare_grammar_duplicates.append(
                    (num, lhs, occurrences[lhs]))
    if en_bare_grammar_duplicates:
        for num, lhs, count in en_bare_grammar_duplicates:
            print("[FAIL] %s Sec %s: duplicate bare grammar production "
                  "LHS %s (%d declarations)" %
                  (args.en_path, num, lhs, count))
        print("error: EN file %s contains duplicate bare grammar "
              "production declaration(s); EN is canonical, so translations "
              "are not compared" % args.en_path, file=sys.stderr)
        print("OVERALL: FAIL")
        return 1
    en_grammar_malformed = []
    for num in en_numbers_sorted:
        start, end = en_sections[num]
        if extract_grammar_lhs(en_lines, start, end, en_excluded):
            _, malformed = extract_grammar_productions(
                en_lines, start, end, en_excluded)
            for lhs, frag in malformed:
                en_grammar_malformed.append((num, lhs, frag))
    if en_grammar_malformed:
        for num, lhs, frag in en_grammar_malformed:
            print("[FAIL] %s Sec %s: grammar production %s failed to "
                  "parse as pure BNF (fragment: %r) -- not on the "
                  "semi-formal prose allowlist, so this is a malformed "
                  "terminal/nonterminal, not legitimate prose"
                  % (args.en_path, num, lhs, frag))
        print("error: EN file %s has %d malformed grammar production(s); "
              "EN is canonical, so translations are not compared"
              % (args.en_path, len(en_grammar_malformed)), file=sys.stderr)
        print("OVERALL: FAIL")
        return 1
    en_bare_grammar_malformed = []
    for num in en_numbers_sorted:
        start, end = en_sections[num]
        if extract_bare_grammar_lhs(en_lines, start, end, en_excluded):
            _, malformed = extract_bare_grammar_productions(
                en_lines, start, end, en_excluded)
            for lhs, fragment in malformed:
                en_bare_grammar_malformed.append((num, lhs, fragment))
    if en_bare_grammar_malformed:
        for num, lhs, fragment in en_bare_grammar_malformed:
            print("[FAIL] %s Sec %s: bare grammar production %s failed to "
                  "parse (empty RHS fragment: %r)" %
                  (args.en_path, num, lhs, fragment))
        print("error: EN file %s has %d malformed bare grammar production(s); "
              "EN is canonical, so translations are not compared"
              % (args.en_path, len(en_bare_grammar_malformed)),
              file=sys.stderr)
        print("OVERALL: FAIL")
        return 1

    en_named_code_counts = count_code_blocks_per_section(
        {i: (start, end) for i, (_, _, start, end) in enumerate(en_named)},
        en_fence_opens)
    en_named_fence_line_counts = count_fence_line_counts_per_section(
        {i: (start, end) for i, (_, _, start, end) in enumerate(en_named)},
        en_fence_ranges, en_lines)
    translation_lines = {}
    t_occurrence_counts = {}
    for t_path in args.translation_paths:
        try:
            translation_lines[t_path] = read_lines(t_path)
        except (OSError, UnicodeDecodeError) as e:
            print("error: could not read translation file %s: %s" % (t_path, e),
                  file=sys.stderr)
            return 2
        _, _, t_occ, _, _, _, _, _ = parse_file(translation_lines[t_path])
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
                                        en_fence_line_counts, en_numbers_sorted,
                                        en_levels, en_excluded, en_named,
                                        en_named_code_counts,
                                        en_named_fence_line_counts, t_path,
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
