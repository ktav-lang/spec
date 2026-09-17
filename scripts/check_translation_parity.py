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

      6a. Per-fence content-loss counter: for each fenced code block that
         both EN and the translation still have (matched positionally by
         order of appearance within the section, 1st fence vs 1st fence,
         2nd vs 2nd, ...), the non-blank LINE COUNT inside the fence is
         compared. Item 2 alone only counts fences, so a translator who
         keeps a section's heading and its single big fence but silently
         drops one line FROM INSIDE that fence (e.g. one BNF production
         line cut from an otherwise-preserved grammar block) previously
         produced no mismatch at all; this line-count comparison catches
         exactly that case. Applied to numbered and named sections alike.
      6b. Grammar nonterminal-set parity (§ 4-shaped sections only): for
         any section whose EN fence(s) contain at least one line matching
         '^<...>\s*::=' (a BNF production's left-hand side, e.g.
         '<quoted-segment> ::= ...'), the SET of LHS nonterminal names
         inside EN's fence(s) is compared against the same set in the
         translation's fence(s) for that section. A translation missing
         (or adding) any production name is a failure. This is gated on
         EN actually containing such lines so it only fires on genuine
         grammar sections (currently just § 4) and never on sections
         whose fences hold ordinary example documents that happen to
         contain a stray '<' or '::='-free BNF-looking comment.
      6c. Grammar production RHS-syntax parity (same gate as 6b): item 6b
         alone only compares nonterminal NAMES, so a translation that
         swaps or corrupts a terminal INSIDE an existing production (e.g.
         the pair separator ":" replaced by ";" in <pair-line>) previously
         passed silently as long as every LHS name was still present. For
         each production whose left-hand side appears in both EN and the
         translation, the syntactic right-hand side (declaration line plus
         any immediately-following '|'-prefixed alternative lines, each
         cut at its first ';' comment lead-in) is compared verbatim.
         Fragments that mix in natural-language prose instead of strict
         terminal/nonterminal syntax (this grammar's own preamble calls
         the notation "semi-formal" -- e.g. <inline-scalar> and
         <inline-raw-scalar>'s RHS is an
         English sentence) are excluded from this comparison so a
         translator's legitimate prose rendering is never flagged; only
         fragments fully accounted for by recognized BNF tokens are held
         to exact parity, since this spec's convention never translates
         actual grammar syntax.
         The excluded semi-formal prose productions are still guarded by
         two embedded-token comparisons run inside check_translation: the
         significant-token MULTISET (see significant_grammar_tokens) and
         the compound control-byte (name, hex) PAIR multiset (see
         extract_compound_atoms), which pins WHICH abbreviation is bound
         to WHICH code point -- so swapping "LF 0x0A ... CR 0x0D" into
         "LF 0x0D ... CR 0x0A" fails even though both flat token
         multisets are identical.
         Two further numeric facts in the same prose are asserted as
         FIXED ABSOLUTE CONSTANTS per language rather than compared
         cross-language, because their correct value is known
         independently of any other language: wherever the
         language-independent '< 0x...' threshold pattern occurs
         (CONTROL_THRESHOLD_RE) its value must be 0x20, and wherever a
         translated tab word (EN "tab" / RU "табуляция" / ZH "制表符")
         is stated immediately followed by its hex value (TAB_WORD_RE)
         that value must be 0x09. A translation swapping BOTH values
         keeps every flat multiset and every compound pair unchanged --
         undetectable by any comparison -- and identical corruption of
         all languages at once defeats every cross-language check by
         construction; the absolute assertions catch both.
      7. Named-section parity: unnumbered headings of level >= 2 (the h1
         document title and the front-matter region under it are excluded
         from THIS generic count comparison — RU/ZH legitimately carry an
         "Informative translation" blockquote EN does not have; that
         region is instead covered by the targeted checks in item 8). Named sections are
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
      8. Targeted front-matter checks: the region from the start of the
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

import sys

from check_translation_parity import main

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
