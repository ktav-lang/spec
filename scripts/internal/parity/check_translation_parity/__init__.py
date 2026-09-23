"""Translation parity checker package (split out of check_translation_parity.py)."""

from .cli import main
from .grammar import (
    _is_pure_bnf,
    detect_language,
    extract_bare_grammar_productions,
    extract_compound_atoms,
    extract_control_thresholds,
    extract_embedded_tokens,
    extract_grammar_lhs,
    extract_grammar_productions,
    extract_semi_formal_rhs,
    extract_tab_codepoints,
    significant_grammar_tokens,
)
from .markdown import (
    ascii_blank,
    count_content,
    parse_fence_opener,
    parse_file,
    read_lines,
    split_source_lines,
)
from .patterns import HEADING_RE, LIST_ITEM_RE, SEMI_FORMAL_PROSE_LHS, TABLE_ROW_RE

__all__ = [
    "HEADING_RE",
    "LIST_ITEM_RE",
    "SEMI_FORMAL_PROSE_LHS",
    "TABLE_ROW_RE",
    "_is_pure_bnf",
    "ascii_blank",
    "count_content",
    "detect_language",
    "extract_bare_grammar_productions",
    "extract_compound_atoms",
    "extract_control_thresholds",
    "extract_embedded_tokens",
    "extract_grammar_lhs",
    "extract_grammar_productions",
    "extract_semi_formal_rhs",
    "extract_tab_codepoints",
    "main",
    "parse_fence_opener",
    "parse_file",
    "read_lines",
    "significant_grammar_tokens",
    "split_source_lines",
]
