"""Module-level regex and constant tables for the translation parity checker."""

import re

HEADING_RE = re.compile(r'^[ ]{0,3}#{1,6}[ \t]+[^ \t]')
NUMBERED_HEADING_RE = re.compile(
    r'^[ ]{0,3}#{1,6}[ \t]+([0-9]+(?:\.[0-9]+)*)\b')
LIST_ITEM_RE = re.compile(r'^[ \t]*(?:[-*]|[0-9]+\.)[ \t]+')
TABLE_ROW_RE = re.compile(r'^[ \t]*\|')
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
    r'"(?:[^"\\]|\\["\\])*"'
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

# Semi-formal prose also quotes illustrative escape spellings such as
# "\\.". Those are embedded contract tokens, not pure-BNF terminal
# notation, so retain the broad scanner for significant_grammar_tokens while
# keeping GRAMMAR_TOKEN_RE strict for _is_pure_bnf validation above.
EMBEDDED_GRAMMAR_TOKEN_RE = re.compile(
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
H1_RE = re.compile(r'^[ ]{0,3}#[ \t]+[^ \t]')
BLOCKQUOTE_RE = re.compile(r'^[ \t]*>')
# Requires the actual "**Label:** value" shape: a colon immediately before
# the closing '**' (so a plain bold PROSE paragraph like "**note text**"
# with no colon is rejected), and at least one non-whitespace character
# after the closing '**' (so a label with no value is rejected). A space
# between the closing '**' and the value is NOT required — the shipped ZH
# Date line writes "**日期:**(未发布 ...)" with none.
FIELD_LINE_RE = re.compile(r'^[ \t]*\*\*[^*:]+:\*\*[ \t]*[^ \t]')
VERSION_LINE_RE = re.compile(
    r'^[ \t]*\*\*(?:Version|Версия|版本):\*\*[ \t]*([^ \t].*?)[ \t]*$')
DATE_LINE_RE = re.compile(
    r'^[ \t]*\*\*(?:Date|Дата|日期):\*\*[ \t]*([^ \t].*?)[ \t]*$')
# Digit-bounded on both sides so "2026-09-020" (an extra trailing digit)
# is not mistaken for the valid date "2026-09-02" followed by an ignored
# stray digit — plain '\d{4}-\d{2}-\d{2}' would substring-match it.
ISO_DATE_RE = re.compile(r'(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)')

# Markdown/source files recognize only the three conventional line-ending
# sequences.  str.splitlines() also treats several Unicode separators and
# control characters as line boundaries, which can change the parsed fence
# and heading structure of an otherwise valid source file.
SOURCE_LINE_END_RE = re.compile(r"\r\n|\r|\n")

# Order matters for readability only: MUST NOT / SHOULD NOT use their own
# literal patterns, while MUST / SHOULD use a negative lookahead so the
# "MUST" inside "MUST NOT" (and "SHOULD" inside "SHOULD NOT") is not
# double-counted as a bare MUST/SHOULD.
KEYWORD_PATTERNS = [
    ("MUST NOT", re.compile(r'\bMUST NOT\b')),
    ("MUST", re.compile(r'\bMUST\b(?![ \t]+NOT\b)')),
    ("SHOULD NOT", re.compile(r'\bSHOULD NOT\b')),
    ("SHOULD", re.compile(r'\bSHOULD\b(?![ \t]+NOT\b)')),
    ("MAY", re.compile(r'\bMAY\b')),
]


CJK_RE = re.compile(r'[\u4E00-\u9FFF]')
