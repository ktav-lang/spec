"""The section-by-section translation comparison for the parity checker."""

from .front_matter import count_keywords
from .grammar import (
    detect_language,
    extract_bare_grammar_lhs_occurrences,
    extract_bare_grammar_productions,
    extract_compound_atoms,
    extract_control_thresholds,
    extract_grammar_lhs,
    extract_grammar_lhs_occurrences,
    extract_grammar_productions,
    extract_semi_formal_rhs,
    extract_tab_codepoints,
    significant_grammar_tokens,
)
from .markdown import (
    count_code_blocks_per_section,
    count_content,
    count_fence_line_counts_per_section,
    parse_file,
    section_sort_key,
)
from .patterns import CONTROL_THRESHOLD_EXPECTED, KEYWORD_PATTERNS, TAB_CODEPOINT_EXPECTED

def check_translation(en_lines, en_sections, en_code_counts,
                       en_fence_line_counts, en_numbers_sorted, en_levels,
                       en_excluded, en_named, en_named_code_counts,
                       en_named_fence_line_counts, t_path, t_lines, verbose):
    """Compare one translation file against EN. Prints [FAIL]/[PASS] lines
    as it goes; returns the count of sections (either direction) with any
    mismatch."""
    (t_sections, t_fence_opens, t_occurrences, t_levels,
     t_excluded, t_named, t_unclosed_fence, t_fence_ranges) = parse_file(t_lines)
    t_code_counts = count_code_blocks_per_section(t_sections, t_fence_opens)
    t_fence_line_counts = count_fence_line_counts_per_section(
        t_sections, t_fence_ranges, t_lines)
    t_named_code_counts = count_code_blocks_per_section(
        {i: (start, end) for i, (_, _, start, end) in enumerate(t_named)},
        t_fence_opens)
    t_named_fence_line_counts = count_fence_line_counts_per_section(
        {i: (start, end) for i, (_, _, start, end) in enumerate(t_named)},
        t_fence_ranges, t_lines)

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
        en_fence_lines = en_fence_line_counts.get(num, [])
        t_fence_lines = t_fence_line_counts.get(num, [])
        for i in range(min(len(en_fence_lines), len(t_fence_lines))):
            if en_fence_lines[i] != t_fence_lines[i]:
                problems.append(
                    "fenced code block #%d non-blank line count mismatch "
                    "(EN=%d, translation=%d)"
                    % (i + 1, en_fence_lines[i], t_fence_lines[i]))
        en_lhs = extract_grammar_lhs(en_lines, en_start, en_end, en_excluded)
        if en_lhs:
            t_lhs = extract_grammar_lhs(t_lines, t_start, t_end, t_excluded)
            t_lhs_occurrences = extract_grammar_lhs_occurrences(
                t_lines, t_start, t_end, t_excluded)
            missing = sorted(en_lhs - t_lhs)
            extra = sorted(t_lhs - en_lhs)
            if missing or extra:
                detail = []
                if missing:
                    detail.append("missing from translation: %s"
                                   % ", ".join(missing))
                if extra:
                    detail.append("extra in translation: %s"
                                   % ", ".join(extra))
                problems.append(
                    "grammar production LHS set mismatch (EN has %d "
                    "nonterminal(s), translation has %d; %s)"
                    % (len(en_lhs), len(t_lhs), "; ".join(detail)))
            for lhs in sorted(t_lhs_occurrences):
                count = t_lhs_occurrences[lhs]
                if count > 1:
                    problems.append(
                        "duplicate grammar production LHS %s "
                        "(%d declarations in translation)" % (lhs, count))
            if not any(count > 1 for count in t_lhs_occurrences.values()):
                en_prod, _ = extract_grammar_productions(
                    en_lines, en_start, en_end, en_excluded)
                t_prod, t_malformed = extract_grammar_productions(
                    t_lines, t_start, t_end, t_excluded)
                for lhs in sorted(en_prod):
                    if en_prod[lhs] != t_prod.get(lhs):
                        problems.append(
                            "grammar production RHS mismatch for %s "
                            "(EN=%r, translation=%r)"
                            % (lhs, en_prod[lhs], t_prod.get(lhs)))
                for lhs, frag in t_malformed:
                    problems.append(
                        "grammar production %s failed to parse as pure BNF "
                        "in translation (fragment: %r) -- not on the "
                        "semi-formal prose allowlist, so this is a corrupted "
                        "terminal/nonterminal, not legitimate translated prose"
                        % (lhs, frag))
            # Semi-formal-prose productions are NOT held to verbatim RHS
            # parity (their prose is legitimately translated), but the
            # real grammar terminals EMBEDDED in their prose are still
            # language-independent contract: compare the significant-token
            # MULTISETS (see significant_grammar_tokens -- multiset, not
            # ordered, so legitimate per-language token ordering/pairing
            # differences in the shipped files never false-fail). A
            # production with zero significant tokens in both languages
            # passes trivially (empty == empty) -- the accepted,
            # self-verifying outcome for genuinely pure-prose productions.
            en_semi = extract_semi_formal_rhs(
                en_lines, en_start, en_end, en_excluded)
            t_semi = extract_semi_formal_rhs(
                t_lines, t_start, t_end, t_excluded)
            for lhs in sorted(en_semi):
                en_sig = sorted(significant_grammar_tokens(en_semi[lhs]))
                t_sig = sorted(significant_grammar_tokens(t_semi.get(lhs, "")))
                if en_sig != t_sig:
                    problems.append(
                        "embedded grammar terminal mismatch in semi-formal "
                        "production %s (EN tokens: %r; translation tokens: %r)"
                        % (lhs, en_sig, t_sig))
            # Compound association check: the flat multiset above cannot
            # see WHICH control-byte abbreviation is bound to WHICH hex
            # value, so a translation swapping the LF/CR (or VT/FF)
            # code-point bindings passes it while asserting the wrong
            # bytes. Compare the (name, hex) pair multisets per production
            # as well (additive defense-in-depth: the flat check above
            # stays exactly as it is).
            for lhs in sorted(en_semi):
                en_pairs = sorted(extract_compound_atoms(en_semi[lhs]))
                t_pairs = sorted(extract_compound_atoms(t_semi.get(lhs, "")))
                if en_pairs != t_pairs:
                    problems.append(
                        "control-byte codepoint association mismatch in "
                        "semi-formal production %s: EN pairs %r vs "
                        "translation pairs %r" % (lhs, en_pairs, t_pairs))
            # Fixed absolute-constant checks (round-20 review finding 2):
            # two more numeric facts in the same semi-formal prose have
            # known-correct values in every language INDEPENDENTLY of what
            # any other language says, so -- unlike the cross-language
            # comparisons above -- they are asserted absolutely, per
            # language: the '<'-anchored ASCII control-byte threshold is
            # always 0x20, and the translated tab word is always bound to
            # 0x09 wherever it is stated immediately followed by its code
            # point. A translation swapping BOTH values ("< 0x09 ...
            # tab 0x20") keeps the flat multiset AND the compound pairs
            # above unchanged -- a false-green for every cross-language
            # check -- and a corruption applied identically to all
            # languages defeats every comparison by construction; both
            # fail the absolute assertion here regardless. Zero matches
            # for either pattern in a production's RHS is fine (only
            # <dq-char>/<key-char> carry them today); an existing match
            # with any other value is reported.
            for lhs in sorted(en_semi):
                t_rhs = t_semi.get(lhs, "")
                language = detect_language(t_rhs)
                for hexval in extract_control_thresholds(t_rhs):
                    if hexval != CONTROL_THRESHOLD_EXPECTED:
                        problems.append(
                            "control-byte threshold in production %s (%s): "
                            "expected 0x20, found %s"
                            % (lhs, language, hexval))
                for lang, hexval in extract_tab_codepoints(t_rhs):
                    if hexval != TAB_CODEPOINT_EXPECTED:
                        problems.append(
                            "tab codepoint in production %s (%s): expected "
                            "0x09, found %s" % (lhs, lang, hexval))
        # § 3.6's grammar uses bare identifiers (integer, float, dec_digit,
        # ...), so it is invisible to the angle-bracket grammar gate above.
        # Compare its complete whitespace-normalized signatures separately.
        en_bare_occurrences = extract_bare_grammar_lhs_occurrences(
            en_lines, en_start, en_end, en_excluded)
        if en_bare_occurrences:
            t_bare_occurrences = extract_bare_grammar_lhs_occurrences(
                t_lines, t_start, t_end, t_excluded)
            en_bare, _ = extract_bare_grammar_productions(
                en_lines, en_start, en_end, en_excluded)
            t_bare, t_bare_malformed = extract_bare_grammar_productions(
                t_lines, t_start, t_end, t_excluded)
            en_names = set(en_bare_occurrences)
            t_names = set(t_bare_occurrences)
            missing = sorted(en_names - t_names)
            extra = sorted(t_names - en_names)
            if missing or extra:
                detail = []
                if missing:
                    detail.append("missing from translation: %s"
                                  % ", ".join(missing))
                if extra:
                    detail.append("extra in translation: %s"
                                  % ", ".join(extra))
                problems.append(
                    "bare grammar production LHS set mismatch (EN has %d "
                    "production(s), translation has %d; %s)"
                    % (len(en_names), len(t_names), "; ".join(detail)))
            for lhs in sorted(t_bare_occurrences):
                count = t_bare_occurrences[lhs]
                if count > 1:
                    problems.append(
                        "duplicate bare grammar production LHS %s "
                        "(%d declarations in translation)" % (lhs, count))
            if not any(count > 1 for count in t_bare_occurrences.values()):
                for lhs in sorted(en_names & t_names):
                    if en_bare.get(lhs) != t_bare.get(lhs):
                        problems.append(
                            "bare grammar production RHS mismatch for %s "
                            "(EN=%r, translation=%r)"
                            % (lhs, en_bare.get(lhs), t_bare.get(lhs)))
            for lhs, fragment in t_bare_malformed:
                problems.append(
                    "bare grammar production %s failed to parse in "
                    "translation (empty RHS fragment: %r)"
                    % (lhs, fragment))
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
        en_fence_lines = en_named_fence_line_counts.get(i, [])
        t_fence_lines = t_named_fence_line_counts.get(i, [])
        for j in range(min(len(en_fence_lines), len(t_fence_lines))):
            if en_fence_lines[j] != t_fence_lines[j]:
                problems.append(
                    "fenced code block #%d non-blank line count mismatch "
                    "(EN=%d, translation=%d)"
                    % (j + 1, en_fence_lines[j], t_fence_lines[j]))
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


