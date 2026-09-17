"""Grammar extraction helpers for the translation parity checker."""

from .patterns import (
    BARE_GRAMMAR_LHS_RE,
    COMPOUND_ATOM_PAIR_RE,
    CONTROL_THRESHOLD_RE,
    CJK_RE,
    CYRILLIC_RE,
    EMBEDDED_GRAMMAR_TOKEN_RE,
    GRAMMAR_LHS_RE,
    GRAMMAR_TOKEN_RE,
    LANGUAGE_INDEPENDENT_ATOM_RE,
    PUNCTUATION_ONLY_QUOTED_RE,
    SEMI_FORMAL_OPERATOR_TOKENS,
    SEMI_FORMAL_PROSE_LHS,
    TAB_VALUE_AFTER_WORD_RE,
    TAB_WORD_RE,
)

def extract_embedded_tokens(rhs_text):
    """Return the source-ordered list of every embedded grammar-token
    match PLUS every LANGUAGE_INDEPENDENT_ATOM_RE match in a semi-formal
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
               for m in EMBEDDED_GRAMMAR_TOKEN_RE.finditer(rhs_text)]
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

      - malformed: [(lhs, fragment), ...] -- one entry per empty fragment
        or non-empty fragment that FAILED _is_pure_bnf for an LHS that is
        NOT in SEMI_FORMAL_PROSE_LHS. Empty RHS fragments are malformed for
        every production, including the allowlisted semi-formal ones. Every
        production outside that allowlist is expected to always be pure BNF
        (verified against this grammar's actual current text); a fragment
        that isn't is a real defect -- a malformed terminal, a typo, a
        translation mistake -- not legitimate prose, and callers MUST treat
        this as fail-closed (an error to report), never silently drop it the
        way an allowlisted production's prose is dropped.

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
        else:
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
            else:
                malformed.append((lhs, '|'))
            j += 1
        if fragments:
            productions[lhs] = fragments
        idx = j if j > idx + 1 else idx + 1
    return productions, malformed


