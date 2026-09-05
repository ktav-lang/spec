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

import argparse
import datetime
import re
import sys

HEADING_RE = re.compile(r'^#{1,6}\s+\S')
NUMBERED_HEADING_RE = re.compile(r'^#{1,6}\s+(\d+(?:\.\d+)*)\b')
FENCE_RE = re.compile(r'^\s*```')
LIST_ITEM_RE = re.compile(r'^\s*(?:[-*]|\d+\.)\s+')
TABLE_ROW_RE = re.compile(r'^\s*\|')
# A BNF production's left-hand side, e.g. "<quoted-segment> ::= ..." (§ 4).
# Only whitespace is allowed before the '<' so a mid-sentence "<foo> ::="
# fragment inside prose is not mistaken for an actual production line.
GRAMMAR_LHS_RE = re.compile(r'^\s*(<[^<>]+>)\s*::=')
# § 3.6 uses ordinary lowercase identifiers as BNF nonterminals rather than
# the angle-bracket form used by § 4. Keep this extractor separate: the two
# notations have different continuation and malformed-production rules.
BARE_GRAMMAR_LHS_RE = re.compile(
    r'^\s*([a-z][a-z0-9]*(?:[_-][a-z0-9]+)*)\s*::=')

# Recognized BNF syntax atoms used by § 4's semi-formal notation: a quoted
# terminal (with \" / \\ as the only in-terminal escapes, per § 4's own
# preamble), a <nonterminal>, a [char-class] (e.g. <hex-digit>'s
# "[0-9a-fA-F]"), the "(ws)" whitespace placeholder, an ABNF-style numeric
# repeat prefix like "1*ws" (<sep-end>'s one-off borrowing from RFC 5234,
# distinct from this grammar's own postfix "*"), the "&eol" / "&line-end"
# lookaheads, the "eol" / "EOF" end-of-line markers, the exact
# "any-chars-until-line-end" body atom, the "::=" production operator, and the
# single-character operators "|" "*" "+" "?" "!" "(" ")". Order matters: the
# 2-char/parenthesized/multi-char alternatives must be tried before the bare
# single-character ones so e.g. "(ws)" isn't split into "(" + "ws" + ")",
# and "1*ws" isn't split into a stray "1" plus "*" plus a leftover "ws".
GRAMMAR_TOKEN_RE = re.compile(
    r'"(?:[^"\\]|\\.)*"'
    r'|<[^<>]+>'
    r'|\[[^\[\]]*\]'
    r'|\(ws\)'
    r'|\d+\*ws\b'
    r'|&line-end(?![\w-])'
    r'|&eol\b'
    r'|::='
    r'|(?<![\w-])any-chars-until-line-end(?![\w-])'
    r'|(?<![\w-])EOF(?![\w-])'
    r'|\beol\b'
    r'|[|*+?!()]'
)

# Left-hand-side names whose RHS is intentionally natural-language prose
# rather than strict terminal/nonterminal BNF syntax -- § 4's own preamble
# calls the notation "semi-formal", and these productions lean fully into
# the "semi" half. Each is legitimately translated like any other prose, so
# none of them are held to cross-language byte parity by the RHS-syntax
# check below. Every OTHER production's RHS is expected to be pure BNF
# (verified empirically against the current grammar, and re-checked by
# find_malformed_grammar_productions below): if some other production ever
# fails to tokenize as pure BNF, that is treated as a real defect (a typo,
# a corrupted terminal, a translation mistake) and reported as an error
# rather than silently excluded, unlike these nine.
SEMI_FORMAL_PROSE_LHS = frozenset([
    "<unescaped-dot>",      # "\".\" that is NOT preceded by ..."
    "<non-quote-key-char>", # "<key-char> excluding \"\\\"\", \"'\", \"`\""
    "<dq-char>",            # "any UTF-8 code point except ..." (multi-line prose)
    "<sq-char>",            # "same exclusions as <dq-char>, but excluding ..."
    "<bt-char>",            # "same exclusions as <dq-char>, but excluding ..."
    "<key-char>",           # "any UTF-8 code point except ..." (long multi-paragraph prose)
    "<inline-raw-scalar>",  # raw-marker bytes through an unescaped delimiter
    "<inline-scalar>",      # "sequence of bytes terminated by an unescaped ..."
    "<multiline-content-line>",  # "any line within an open <multiline>; ..."
])

# Bare single-character BNF operator tokens dropped by
# significant_grammar_tokens. Reason (observed against the shipped
# EN/RU/ZH files): parenthesized grouping inside a semi-formal production's
# prose is a legitimate per-language rendering choice -- RU/ZH <dq-char>
# group their exclusions into parenthetical spans EN leaves ungrouped (4 extra
# paren pairs), so raw paren counts differ across languages without any
# normative difference. The negative-lookahead operator is included here too:
# it is syntax when a production is pure BNF, but a bare punctuation mark in
# semi-formal prose must not become a cross-language token obligation. Every
# review-flagged normative terminal in the semi-formal productions is a quoted
# terminal, a <nonterminal> reference, or "(ws)", all of which survive this
# filter.
SEMI_FORMAL_OPERATOR_TOKENS = frozenset(["(", ")", "|", "*", "+", "?", "!"])

# Inner content of a quoted terminal that is pure ASCII punctuation
# (code points 0x21-0x2F, 0x3A-0x40, 0x5B-0x60, 0x7B-0x7E). Quoted tokens
# whose inner text carries letters, digits, spaces, or non-ASCII
# characters are dropped by significant_grammar_tokens.
PUNCTUATION_ONLY_QUOTED_RE = re.compile(r'[!-/:-@\[-`{-~]+')

# Language-independent atoms embedded in the semi-formal productions' prose
# RHS: hex byte literals (0x20, 0x7F, 0x09, 0x0B, 0x0C, 0x0A, 0x0D) and the
# Latin control-byte abbreviations LF, CR, VT, FF, DEL. Observed against the
# shipped files: the RU and ZH renderings of <dq-char> and <key-char> (the
# only semi-formal productions carrying these constraints) keep every one of
# these tokens verbatim -- e.g. RU "DEL (0x7F)", "LF, CR", "табуляция 0x09" --
# so they are normative cross-language contract even though the surrounding
# prose is legitimately translated. Deliberately NOT included: the English
# word "tab", which IS translated (RU "табуляции"/"таб", ZH "制表符");
# requiring it verbatim would false-fail the shipped translations. Scoped to
# extract_embedded_tokens only (semi-formal RHS extraction); the grammar
# atoms accepted by GRAMMAR_TOKEN_RE are listed separately above and are not
# inferred from this broad control-byte pattern.
LANGUAGE_INDEPENDENT_ATOM_RE = re.compile(r'\b0x[0-9A-Fa-f]+\b|\b(?:LF|CR|VT|FF|DEL)\b')

# Compound control-byte associations embedded in the semi-formal
# productions' prose: a control-byte abbreviation (LF, CR, VT, FF, DEL)
# immediately followed by its hex value, e.g. "LF 0x0A", "VT 0x0B",
# "DEL (0x7F)" (parentheses around the value optional). The flat atom
# multiset folded in by LANGUAGE_INDEPENDENT_ATOM_RE above knows that
# every name and every value is present somewhere, but not WHICH name is
# bound to WHICH value -- so a translation that swaps the code points
# ("LF 0x0A and CR 0x0D" rewritten as "LF 0x0D and CR 0x0A") keeps the
# exact same flat multiset while asserting the wrong byte for each name.
# A bare name mention with NO adjacent hex value (e.g. the forward
# reference "LF, CR" in <dq-char>) is not captured by this regex and
# carries no pairing obligation -- that is correct: only an explicit
# name-plus-value statement is held to association parity. Hex digits
# are upper-cased before comparison so "0x0a" and "0x0A" are one pair.
COMPOUND_ATOM_PAIR_RE = re.compile(
    r'\b(LF|CR|VT|FF|DEL)\b\s*\(?(0x[0-9A-Fa-f]+)\)?')

# The ASCII control-byte threshold stated in the <dq-char>/<key-char>
# prose: a literal '<' immediately followed by a hex value ("ASCII control
# bytes < 0x20" -- EN, RU "управляющих байтов < 0x20", ZH "控制字节 < 0x20";
# '<' and hex notation are language-independent, so the pattern itself
# carries no translation risk). Unlike the LF/CR/VT/FF/DEL pairs above,
# this value has a known-correct answer in EVERY language independently of
# what any other language says -- ASCII control bytes are definitionally
# the range below 0x20 -- so it is asserted ABSOLUTELY per language rather
# than compared cross-language: a wrong value fails even when every
# language is mutated identically (which no cross-language comparison can
# ever catch). Checked wherever the pattern occurs (only <dq-char> and
# <key-char> carry it today); zero matches in a production's RHS is fine.
CONTROL_THRESHOLD_RE = re.compile(r'<\s*(0x[0-9A-Fa-f]+)')
CONTROL_THRESHOLD_EXPECTED = "0x20"

# The tab control byte, always 0x09. The WORD is legitimately translated
# (EN "tab", RU "табуляция"/"табуляции", ZH "制表符") and is therefore
# deliberately absent from LANGUAGE_INDEPENDENT_ATOM_RE -- but wherever a
# language's tab word is IMMEDIATELY followed by its hex value, that
# pairing is a fixed fact of this spec in every language (tab is code
# point 0x09, period), so the word-plus-value PAIRING is checked
# absolutely even though the word itself cannot be. A bare word mention
# with no adjacent value ("tab/VT/FF" -- the <dq-char> shape in all three
# languages) is not captured and carries no obligation, mirroring
# COMPOUND_ATOM_PAIR_RE's treatment of bare LF/CR mentions. Every
# language's word pattern is run against every text: the patterns match
# disjoint scripts, so only the text's own language can produce matches.
TAB_WORD_RE = {
    "en": re.compile(r'\btab\b'),
    "ru": re.compile(r'\bтабуляц\w*\b'),
    "zh": re.compile(r'制表符'),
}
# Value shape accepted after a tab word: optional whitespace, optional
# parentheses around the hex value (same shape COMPOUND_ATOM_PAIR_RE
# accepts after a name). Matched with .match(text, word_match.end()) so
# the value must IMMEDIATELY follow the word.
TAB_VALUE_AFTER_WORD_RE = re.compile(r'\s*\(?(0x[0-9A-Fa-f]+)\)?')
TAB_CODEPOINT_EXPECTED = "0x09"

# Marked-script presence, used by detect_language to name the language of
# a semi-formal RHS text in [FAIL] messages. Latin letters are present in
# all three languages (terminals, "UTF-8", "ASCII") and identify nothing;
# Cyrillic and CJK ideographs identify ru/zh.
CYRILLIC_RE = re.compile(r'[\u0400-\u04FF]')
CJK_RE = re.compile(r'[\u4E00-\u9FFF]')


def extract_embedded_tokens(rhs_text):
    """Return the source-ordered list of every GRAMMAR_TOKEN_RE match
    PLUS every LANGUAGE_INDEPENDENT_ATOM_RE match in a semi-formal
    production's RHS text (the raw token stream, unfiltered). Matches
    from BOTH regexes are tagged with their .start() offset and the
    combined list is sorted by that offset, so the result reflects real
    source order no matter how grammar terminals and language-independent
    atoms interleave (an earlier implementation returned every grammar
    match first and every atom match afterward, silently breaking the
    ordered contract whenever the two classes interleaved). The atom
    regex captures the hex byte literals and Latin control-byte
    abbreviations (LF, CR, VT, FF, DEL) that the semi-formal
    <dq-char>/<key-char> prose states as plain text rather than as quoted
    terminals -- they are language-independent normative contract (kept
    verbatim by the shipped RU/ZH translations) and must join the
    significant-token multiset even though the punctuation-only
    quoted-terminal filter cannot see them. Downstream callers compare
    this stream as a multiset, so the ordering is contract hygiene for
    this helper's direct callers/tests, not a behavioral change for the
    parity verdict itself."""
    matches = [(m.start(), m.group(0))
               for m in GRAMMAR_TOKEN_RE.finditer(rhs_text)]
    matches.extend((m.start(), m.group(0)) for m in
                   LANGUAGE_INDEPENDENT_ATOM_RE.finditer(rhs_text))
    return [tok for _, tok in sorted(matches, key=lambda pair: pair[0])]


def significant_grammar_tokens(rhs_text):
    """Reduce a semi-formal production's RHS token stream to the tokens
    that are actually normative grammar contract, discarding prose
    artifacts. Two filters are applied to extract_embedded_tokens' output:

      1. Bare single-character operator tokens ("(", ")", "|", "*", "+",
         "?", "!") are dropped (see SEMI_FORMAL_OPERATOR_TOKENS for the
         observed reason: per-language parenthetical grouping).

      2. Quoted terminals whose INNER content is not pure ASCII
         punctuation (must fully match PUNCTUATION_ONLY_QUOTED_RE) are
         dropped. Reason (observed): these RHS blocks quote example
         scalars ('"first name: alice"') and mention quote-characters as
         prose ('"\'"', '"`"'); across languages the mention-pairing
         shifts (RU/ZH produce pairing-artifact tokens containing
         letters/spaces/CJK that EN does not), so letter/space-bearing
         quoted tokens are prose, not contract. All known normative
         terminals -- '"##"', '"."', '"\\\\"', '"\\."', '"#"', the quote
         exclusions, '","', '"}"', '"]"', '")"', '"))"', and '":"'
         -- are punctuation-only and survive. The new inline productions
         also retain their raw-value delimiters and
         <line-end>/<inline-value>/<inline-scalar> references.

    Language-independent atoms (see LANGUAGE_INDEPENDENT_ATOM_RE) are added
    to the token stream by extract_embedded_tokens and always survive both
    filters: they are hex byte literals (0x20, 0x7F, 0x09, 0x0B, 0x0C, 0x0A,
    0x0D) and the Latin abbreviations LF, CR, VT, FF, DEL stated inside the
    <dq-char>/<key-char> prose. "tab" is deliberately NOT an atom: unlike
    the hex/abbreviation tokens it is legitimately translated (RU
    "табуляции", ZH "制表符"), so holding it to cross-language parity would
    false-fail the shipped files; VT/FF/0x09 surrounding it carry the same
    constraint and are held.

    The surviving lists are compared as MULTISETS (sorted(a) !=
    sorted(b)), NOT as ordered lists. This deliberately deviates from a
    naive ordered contract because the shipped files legitimately differ
    in token ORDER: ZH <unescaped-dot> lists '"\\\\"' before '"."' where
    EN lists '"."' first, and RU <sq-char>/<bt-char> phrase it as
    "instead of '\\"'" (own-delimiter first) where EN says "excluding
    '\'' ... instead of '\\"'" -- while exclusion sets are semantically
    order-independent. An ordered comparison would flag the currently-
    consistent shipped translations. The real check on the shipped
    versions/0.7 files passes under this multiset contract (verified),
    and every currently-known corruption class -- terminal substitution,
    terminal loss, terminal gain -- changes the multiset."""
    significant = []
    for tok in extract_embedded_tokens(rhs_text):
        if tok in SEMI_FORMAL_OPERATOR_TOKENS:
            continue
        if (len(tok) >= 2 and tok.startswith('"') and tok.endswith('"')
                and not PUNCTUATION_ONLY_QUOTED_RE.fullmatch(tok[1:-1])):
            continue
        significant.append(tok)
    return significant


def extract_compound_atoms(rhs_text):
    """Return the list of (name, hex) control-byte associations stated in
    a semi-formal production's RHS text, one per COMPOUND_ATOM_PAIR_RE
    match, with hex digits normalized to upper case (the "0x" prefix
    stays lower): "LF 0x0A" -> ("LF", "0x0A"), "DEL (0x7F)" ->
    ("DEL", "0x7F").

    This is the compound companion to the flat significant-token multiset
    compared in check_translation: the flat multiset pins WHICH tokens are
    present and how many, but not the label-value bindings between the
    LF/CR/VT/FF/DEL abbreviations and their hex code points, so a
    translation that merely re-pairs the same names and values (e.g.
    swaps LF's and CR's code points) leaves the flat multiset unchanged.
    Callers compare these pair lists as MULTISETS (sorted on both sides),
    preserving the order-insensitivity contract of the flat check; bare
    name mentions with no adjacent value never appear here and so impose
    no pairing obligation (see COMPOUND_ATOM_PAIR_RE)."""
    pairs = []
    for m in COMPOUND_ATOM_PAIR_RE.finditer(rhs_text):
        hexval = m.group(2)
        pairs.append((m.group(1), hexval[:2] + hexval[2:].upper()))
    return pairs


def normalize_hex_literal(hexval):
    """Uppercase the hex DIGITS, keep the '0x' prefix lower -- the same
    normalization extract_compound_atoms applies -- so '0x0a' and '0x0A'
    are one value ('0x0A')."""
    return hexval[:2] + hexval[2:].upper()


def detect_language(text):
    """Best-effort language name ('en' | 'ru' | 'zh') for a semi-formal
    production's RHS text, by marked-script presence: Cyrillic -> 'ru',
    CJK ideographs -> 'zh', otherwise 'en'. Only used to LABEL [FAIL]
    messages (the fixed-constant checks below are absolute and need no
    language identity to run); never used to select or skip a check."""
    if CJK_RE.search(text):
        return "zh"
    if CYRILLIC_RE.search(text):
        return "ru"
    return "en"


def extract_control_thresholds(rhs_text):
    """Return every '<'-anchored ASCII control-byte threshold value stated
    in a semi-formal production's RHS text, one per CONTROL_THRESHOLD_RE
    match, hex digits normalized to upper case: "< 0x20" -> "0x20". Zero
    matches is a normal result (only <dq-char>/<key-char> carry the
    pattern today); callers assert each returned value equals
    CONTROL_THRESHOLD_EXPECTED."""
    return [normalize_hex_literal(m.group(1))
            for m in CONTROL_THRESHOLD_RE.finditer(rhs_text)]


def extract_tab_codepoints(rhs_text):
    """Return every (language, hex) pairing of a translated tab word with
    its code point in a semi-formal production's RHS text: EN "tab 0x09"
    -> ("en", "0x09"), RU "табуляция 0x09" -> ("ru", "0x09"), ZH
    "制表符 0x09" -> ("zh", "0x09"), hex digits normalized to upper case.
    A tab word with no immediately-adjacent hex value ("tab/VT/FF",
    "табуляции/VT/FF", "制表符/VT/FF" -- the <dq-char> shape in all three
    languages) is not captured and carries no obligation. Every language's
    word pattern is run against every text (they match disjoint scripts,
    so only the text's own language can produce matches); callers assert
    each returned hex equals TAB_CODEPOINT_EXPECTED."""
    pairs = []
    for lang in sorted(TAB_WORD_RE):
        for m in TAB_WORD_RE[lang].finditer(rhs_text):
            vm = TAB_VALUE_AFTER_WORD_RE.match(rhs_text, m.end())
            if vm:
                pairs.append((lang, normalize_hex_literal(vm.group(1))))
    return pairs


def extract_semi_formal_rhs(lines, start, end, excluded):
    """Return {lhs: rhs_text} for every LHS in SEMI_FORMAL_PROSE_LHS found
    inside the fence lines (excluded[idx] True) of lines[start:end).

    The RHS text block for a semi-formal production is the declaration
    line after '::=' PLUS all immediately-following fence lines until the
    first blank line, the first line matching GRAMMAR_LHS_RE, or the fence
    end -- these productions' prose wraps over several continuation lines
    that do NOT start with '|' (e.g. <inline-raw-scalar>'s delimiter list
    and <line-end> reference span wrapped lines, as do <inline-scalar>'s
    '","' / '"}"' / '"]"' and <multiline-content-line>'s '")"' /
    '"))"'). Lines are individually whitespace-collapsed
    then joined with single spaces. Unlike _rhs_fragment, the text is NOT
    cut at ';': in these productions semicolons are ordinary prose
    punctuation (EN <key-char> contains "path separator; use '\\\\.'" -- a
    ';' cut would eat the '"\\."' terminal, and was empirically shown to
    break against the real files)."""
    result = {}
    idx = start
    while idx < end:
        if not excluded[idx]:
            idx += 1
            continue
        m = GRAMMAR_LHS_RE.match(lines[idx])
        if not m or m.group(1) not in SEMI_FORMAL_PROSE_LHS:
            idx += 1
            continue
        parts = [' '.join(lines[idx][m.end():].split())]
        j = idx + 1
        while j < end and excluded[j]:
            stripped = lines[j].strip()
            if not stripped or GRAMMAR_LHS_RE.match(lines[j]):
                break
            parts.append(' '.join(stripped.split()))
            j += 1
        result[m.group(1)] = ' '.join(parts)
        idx = j
    return result

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
    return len(line) - len(line.lstrip("#"))


def parse_file(lines):
    """Single fence-aware pass over a file's lines.

    Returns (sections, fence_opens, occurrences, levels, excluded, named,
    unclosed_fence, fence_ranges):
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
      fence_ranges: ordered list of (open_idx, content_start, content_end)
        for every COMPLETE (closed) fence, in document order: open_idx is
        the line index of the opening ``` delimiter (matching an entry in
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
    in_fence = False
    open_idx = None
    for idx, line in enumerate(lines):
        if FENCE_RE.match(line):
            excluded.append(True)
            if not in_fence:
                fence_opens.append(idx)
                open_idx = idx
            else:
                fence_ranges.append((open_idx, open_idx + 1, idx))
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
    return (sections, fence_opens, occurrences, levels, excluded, named,
            in_fence, fence_ranges)


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
                               if lines[i].strip())
                counts[num].append(nonblank)
                break
    return counts


def extract_grammar_lhs(lines, start, end, excluded):
    """Return the SET of grammar-production left-hand-side nonterminal
    names (e.g. '<key>') found inside a fenced code block within
    lines[start:end) -- i.e. on lines where excluded[idx] is True (fence
    delimiter or fence content) that match GRAMMAR_LHS_RE. Requiring
    excluded[idx] restricts this to actual fenced grammar blocks (this
    spec's § 4 convention keeps the whole grammar in one ``` block) and
    protects against matching a '<foo> ::= ...'-shaped example mentioned
    in ordinary prose outside a fence.

    Callers gate the whole check on the EN side of this set being
    non-empty, so it only fires on sections that actually are grammar
    sections and never misfires on a section whose fence(s) hold, say, an
    ordinary example ktav document with no BNF-shaped lines at all."""
    return set(extract_grammar_lhs_occurrences(
        lines, start, end, excluded))


def extract_grammar_lhs_occurrences(lines, start, end, excluded):
    """Return declaration occurrence counts before RHS maps can overwrite."""
    counts = {}
    for idx in range(start, end):
        if not excluded[idx]:
            continue
        m = GRAMMAR_LHS_RE.match(lines[idx])
        if m:
            lhs = m.group(1)
            counts[lhs] = counts.get(lhs, 0) + 1
    return counts


def extract_bare_grammar_lhs(lines, start, end, excluded):
    """Return the set of lowercase bare BNF declaration names in fences."""
    return set(extract_bare_grammar_lhs_occurrences(
        lines, start, end, excluded))


def extract_bare_grammar_lhs_occurrences(lines, start, end, excluded):
    """Return bare BNF declaration counts before any signature map is built.

    A declaration is recognized only inside a fenced section and only when
    its LHS is a lowercase bare identifier. This deliberately does not scan
    prose outside fences or infer grammar from an arbitrary lowercase word.
    """
    counts = {}
    for idx in range(start, end):
        if not excluded[idx]:
            continue
        match = BARE_GRAMMAR_LHS_RE.match(lines[idx])
        if match:
            lhs = match.group(1)
            counts[lhs] = counts.get(lhs, 0) + 1
    return counts


def extract_bare_grammar_productions(lines, start, end, excluded):
    """Return ``(signatures, malformed)`` for bare BNF in fenced sections.

    Each signature contains the complete RHS declaration plus immediately
    following ``|`` alternatives. Whitespace is the only normalization:
    grammar punctuation, identifiers, literals, and character classes remain
    byte-for-byte significant. ``malformed`` contains declarations or
    alternatives with an empty RHS. Duplicate declarations are intentionally
    reported separately by extract_bare_grammar_lhs_occurrences before these
    maps are used for parity comparisons.
    """
    productions = {}
    malformed = []
    idx = start
    while idx < end:
        if not excluded[idx]:
            idx += 1
            continue
        match = BARE_GRAMMAR_LHS_RE.match(lines[idx])
        if not match:
            idx += 1
            continue

        lhs = match.group(1)
        parts = []
        rhs = ' '.join(lines[idx][match.end():].split())
        if rhs:
            parts.append(rhs)
        else:
            malformed.append((lhs, rhs))

        j = idx + 1
        while j < end and excluded[j]:
            continuation = lines[j].strip()
            if not continuation.startswith('|'):
                break
            rhs = ' '.join(continuation[1:].split())
            if rhs:
                parts.append('| ' + rhs)
            else:
                malformed.append((lhs, '|'))
            j += 1

        # Keep the first value if a caller uses this helper without first
        # rejecting duplicates; the normal parity path rejects them from the
        # occurrence count before comparing signatures.
        if parts and lhs not in productions:
            productions[lhs] = ' '.join(parts)
        idx = j
    return productions, malformed


def _rhs_fragment(text):
    """Cut a raw RHS fragment at its first ';' (this grammar's own comment
    lead-in convention, e.g. "; object open") and collapse whitespace runs
    to single spaces so line-wrapping differences don't cause a false
    mismatch. Comment TEXT itself is never compared -- only what precedes
    the ';' is a syntax claim."""
    idx = text.find(';')
    if idx != -1:
        text = text[:idx]
    return ' '.join(text.split())


def _is_pure_bnf(fragment):
    """True if `fragment` is fully accounted for by GRAMMAR_TOKEN_RE, with
    no leftover natural-language words. Several productions in this
    grammar (its own preamble calls the notation "semi-formal") describe
    their RHS in English prose instead of strict terminal/nonterminal
    syntax (e.g. "sequence of bytes terminated by an unescaped ..." for
    <inline-scalar>) -- those are meant to be translated like any other
    prose and must NOT be held to exact-byte parity. A fragment is only
    treated as normative syntax, gated for exact cross-language parity,
    when consuming every recognized token leaves nothing behind."""
    return GRAMMAR_TOKEN_RE.sub('', fragment).strip() == ''


def extract_grammar_productions(lines, start, end, excluded):
    """Return (productions, malformed):

      - productions: {lhs: [fragment, ...]} for each production whose
        declaration line matches GRAMMAR_LHS_RE, plus any immediately-
        following '|'-prefixed continuation lines (this grammar's
        convention for further alternatives of the same production),
        restricted to lines inside a fence (excluded[idx] True).
        Continuation collection stops at the first line that is blank,
        outside the fence, or does not start with '|' after stripping --
        which is exactly how this spec's grammar block already
        distinguishes a real alternative line from a wrapped prose
        explanation attached to the same production (see <header-line>'s
        multi-paragraph "Context-dependence" note, which is exactly this
        shape and must NOT be swept into the production's RHS). Only
        fragments that pass _is_pure_bnf (or belong to an LHS listed in
        SEMI_FORMAL_PROSE_LHS) are kept here.

      - malformed: [(lhs, fragment), ...] -- one entry per non-empty
        fragment that FAILED _is_pure_bnf for an LHS that is NOT in
        SEMI_FORMAL_PROSE_LHS. Every production outside that allowlist is
        expected to always be pure BNF (verified against this grammar's
        actual current text); a fragment that isn't is a real defect --
        a malformed terminal, a typo, a translation mistake -- not
        legitimate prose, and callers MUST treat this as fail-closed
        (an error to report), never silently drop it the way an
        allowlisted production's prose is dropped.

    Grammar syntax itself is never translated by this spec's own
    convention (confirmed by every existing translated section), so any
    two conformant copies of a genuinely syntactic fragment MUST already
    be byte-identical -- a `productions` mismatch between EN and a
    translation only ever fires on a real divergence, mutation, or
    corruption."""
    productions = {}
    malformed = []
    idx = start
    while idx < end:
        if not excluded[idx]:
            idx += 1
            continue
        m = GRAMMAR_LHS_RE.match(lines[idx])
        if not m:
            idx += 1
            continue
        lhs = m.group(1)
        prose_ok = lhs in SEMI_FORMAL_PROSE_LHS
        fragments = []
        frag = _rhs_fragment(lines[idx][m.end():])
        if frag:
            if _is_pure_bnf(frag):
                fragments.append(frag)
            elif not prose_ok:
                malformed.append((lhs, frag))
        j = idx + 1
        while j < end and excluded[j]:
            stripped = lines[j].strip()
            if not stripped.startswith('|'):
                break
            frag = _rhs_fragment(stripped[1:])
            if frag:
                if _is_pure_bnf(frag):
                    fragments.append('| ' + frag)
                elif not prose_ok:
                    malformed.append((lhs, '| ' + frag))
            j += 1
        if fragments:
            productions[lhs] = fragments
        idx = j if j > idx + 1 else idx + 1
    return productions, malformed


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


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
