#!/usr/bin/env python3
"""Tests for scripts/check_translation_parity.py.

Each test builds tiny synthetic EN/translation files in a temp directory,
runs the checker's main() in-process, and asserts the verdict: happy-path
files must PASS; files with a dropped MUST-NOT sentence, a missing
section, or a missing code block must FAIL naming the specific problem.
Front-matter mutations (a changed Version value, a missing h1 title, a
stray paragraph appended under the title) must FAIL the same way.

Run:  python scripts/test_check_translation_parity.py
"""

import contextlib
import io
import os
import re
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_translation_parity as ctp

EN_BODY = """## 1. Introduction

Some intro text.

## 2. Rules

### 2.1 Naming

A key MUST be non-empty. A key MUST NOT contain a NUL byte.
Implementations SHOULD normalize case. Implementations SHOULD NOT reorder
keys. Extra whitespace MAY be trimmed.

```
example: 1
```

### 2.2 Values

A value MUST be one of the supported types.
"""

RU_BODY = """## 1. Введение

Немного вводного текста.

## 2. Правила

### 2.1 Именование

Ключ MUST быть непустым. Ключ MUST NOT содержать байт NUL.
Реализации SHOULD нормализовать регистр. Реализации SHOULD NOT
переставлять ключи. Лишние пробелы MAY быть удалены.

```
example: 1
```

### 2.2 Значения

Значение MUST быть одним из поддерживаемых типов.
"""

ZH_BODY = """## 1. 引言

一些介绍性文字。

## 2. 规则

### 2.1 命名

键 MUST 非空。键 MUST NOT 包含 NUL 字节。
实现 SHOULD 规范化大小写。实现 SHOULD NOT 重排键。
多余空白 MAY 被去除。

```
example: 1
```

### 2.2 值

值 MUST 是受支持的类型之一。
"""

EN_DOC = """# Spec

**Version:** 0.7.0
**Date:** (unreleased — draft)

""" + EN_BODY

# RU translation identical in structure/counts to EN_DOC (text content
# differs, but that's fine: this is a structural, not linguistic, check).
RU_DOC_OK = """# Спецификация

**Версия:** 0.7.0
**Дата:** (не выпущено — черновик)

""" + RU_BODY

# ZH translation identical in structure/counts to EN_DOC (text content
# differs, but that's fine: this is a structural, not linguistic, check).
ZH_DOC_OK = """# 规范

**版本:** 0.7.0
**日期:**(未发布 —— 草案)

""" + ZH_BODY

# Realistic front-matter docs mirroring the shipped 0.7 files' shape:
# EN without a disclaimer, RU/ZH each with a legitimately different
# 'Informative translation' disclaimer blockquote EN does not have.
EN_FRONT_DOC = """# Spec

**Languages:** **English**
**Version:** 0.7.0
**Date:** (unreleased — draft, normative text and fixtures only)

""" + EN_BODY

RU_FRONT_DOC = """# Спецификация

**Languages:** [English](spec.md) · **Русский**
**Версия:** 0.7.0
**Дата:** (не выпущено — черновик)

> **Информативный перевод.** Канонической, нормативной версией является
> английский оригинал в том же каталоге.

""" + RU_BODY

ZH_FRONT_DOC = """# 规范

**Languages:** [English](spec.md) · **简体中文**
**版本:** 0.7.0
**日期:**(未发布 —— 草案)

> **Informative translation.** 本翻译仅供参考；规范性版本是英文原文。

""" + ZH_BODY

# Same base docs, but with a released (dated) Date field instead of draft,
# for the release-date parity tests below.
EN_DOC_DATED = EN_DOC.replace("**Date:** (unreleased — draft)\n",
                              "**Date:** 2026-09-02\n")
RU_DOC_DATED = RU_DOC_OK.replace("**Дата:** (не выпущено — черновик)\n",
                                 "**Дата:** 2026-09-02\n")
ZH_DOC_DATED = ZH_DOC_OK.replace("**日期:**(未发布 —— 草案)\n",
                                 "**日期:** 2026-09-02\n")


    # -- embedded grammar terminals in semi-formal prose productions ---------
    #
    # The 9 SEMI_FORMAL_PROSE_LHS productions mix real language-
    # independent syntax into translatable prose. Before this check was
    # added, a translation could silently corrupt an embedded normative
    # terminal (e.g. swap "." for ":" inside <unescaped-dot>'s prose RHS)
    # with zero detection. These tests pin the embedded-terminal
    # protection, the multiset (order-insensitive) comparison contract,
    # and the real shipped files' behavior.

# Real EN production text for the semi-formal-prose fixtures (verbatim
# grammar content from versions/0.7/spec.md § 4, prose lightly abridged
# where irrelevant to the embedded terminals). Used by the semi-formal
# tests below so the embedded tokens are realistic.
SEMI_GRAMMAR_LINES_EN = [
    "<document>      ::= <line>*",
    "<line>          ::= <comment> | <blank> | <header-line> | <pair-line>",
    '<comment>       ::= (ws) "##" any-chars-until-line-end',
    "<blank>         ::= (ws)",
    r'<unescaped-dot>      ::= "." that is NOT preceded by an odd number of "\\"',
    r'<non-quote-key-char> ::= <key-char> excluding "\"", "\'", "`"',
    "<key-char>      ::= any UTF-8 code point except",
    "                    ASCII control bytes < 0x20 other than the whitespace",
    "                    members (tab 0x09, VT 0x0B, FF 0x0C — LF 0x0A and",
    "                    CR 0x0D are excluded separately as line terminators),",
    "                    DEL (0x7F),",
    '                    "[", "]", "{", "}", "(", ")", ":", ",",',
    r'                    "\\" (backslash), "." (the path separator; use "\." for',
    '                    a literal dot), "#" is allowed; "##" only starts a comment',
    "<dq-char>       ::= any UTF-8 code point except ASCII control bytes",
    '                    < 0x20 other than tab/VT/FF, DEL (0x7F), LF, CR,',
    r'                    "\\" (escape lead), and "\"" (the delimiter itself)',
    "<sq-char>       ::= same exclusions as <dq-char>, but excluding \"'\"",
    '                    (its own delimiter) instead of "\\""',
    "<scalar-body>   ::= (ws) any-chars-until-line-end",
    "                    ; trimmed; interpreted per the value rules",
    '<inline-pair>      ::= <key> (ws) "::" (ws) <inline-raw-scalar> (ws)',
    '                     | <key> (ws) <plain-inline-separator> (ws) <inline-value-opt> (ws)',
    '<plain-inline-separator> ::= ":" !":"',
    "",
    "<inline-raw-scalar> ::= sequence of bytes after the raw marker,",
    '                        terminated by the first unescaped "," / "}" /',
    '                        "]" or by <line-end> (which is an error per',
    "                        section 6.11); surrounding whitespace is trimmed",
    "                        from this sequence before escape processing,",
    "                        and the resulting bytes are the literal String",
    "                        body. This production does NOT dispatch through",
    '                        <inline-value> or <inline-scalar>; an initial',
    '                        "{" or "[" is literal data.',
    "<inline-scalar>    ::= sequence of bytes terminated by an unescaped",
    '                       "," / "}" / "]" or by end-of-line',
    "<multiline-content-line> ::= any line within an open <multiline>;",
    '                             the terminator (")" or "))") ends the block',
]


def semi_doc(fence_lines):
    return (
        "# Spec\n\n**Version:** 0.7.0\n"
        "**Date:** (unreleased — draft)\n\n"
        "## 4. Grammar\n\nGrammar productions.\n\n```\n"
        + "\n".join(fence_lines) + "\n```\n\n"
        "## 5. Semantics\n\nSome text with a MUST.\n"
    )


BARE_GRAMMAR_LINES_EN = [
    "integer        ::= sign? ( hex | oct | bin | dec )",
    'sign           ::= "+" | "-"',
    'hex            ::= "0x" hex_digit (("_")? hex_digit)*',
    'oct            ::= "0o" oct_digit (("_")? oct_digit)*',
    'bin            ::= "0b" bin_digit (("_")? bin_digit)*',
    'dec            ::= dec_digit (("_")? dec_digit)*',
    "hex_digit      ::= [0-9a-fA-F]",
    "oct_digit      ::= [0-7]",
    "bin_digit      ::= [0-1]",
    "dec_digit      ::= [0-9]",
    "float          ::= sign? dec_part \".\" dec_part exponent?",
    "                 | sign? dec_part exponent",
    "dec_part       ::= dec_digit ((\"_\")? dec_digit)*",
    'exponent       ::= ("e" | "E") sign? dec_part',
]


def bare_doc(fence_lines):
    return (
        "# Spec\n\n**Version:** 0.7.0\n"
        "**Date:** (unreleased - draft)\n\n"
        "## 3.6 Number Literals\n\nGrammar productions.\n\n```\n"
        + "\n".join(fence_lines) + "\n```\n\n"
        "## 5. Semantics\n\nSome text with a MUST.\n"
    )


BODY_SOURCE_RE = re.compile(
    r'\Aexport default \{\n'
    r'  en: `(?P<en>(?:\\.|[^`])*)`,\n'
    r'  ru: `(?P<ru>(?:\\.|[^`])*)`,\n'
    r'  zh: `(?P<zh>(?:\\.|[^`])*)`,\n'
    r'\};\n\Z',
    re.DOTALL,
)


def decode_body_template(text, path, lang):
    """Decode the three escapes permitted in content body templates."""
    decoded = []
    idx = 0
    while idx < len(text):
        if text[idx] != "\\":
            decoded.append(text[idx])
            idx += 1
            continue
        if text.startswith("\\\\", idx):
            decoded.append("\\")
            idx += 2
        elif text.startswith("\\`", idx):
            decoded.append("`")
            idx += 2
        elif text.startswith("\\${", idx):
            decoded.append("${")
            idx += 3
        else:
            raise AssertionError(
                "%s %s contains an unsupported template escape at offset %d"
                % (path, lang, idx))
    return "".join(decoded)


def read_repository_sec4_bodies():
    """Read and decode every checked-in Sec 4 body part per language."""
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    body_dir = os.path.join(
        repo_root, "versions", "0.7", "content", "sec-4")
    body_names = sorted(
        (name for name in os.listdir(body_dir)
         if re.fullmatch(r"body-\d+\.js", name)),
        key=lambda name: (len(name[5:-3]), name[5:-3]))
    result = {lang: [] for lang in ("en", "ru", "zh")}
    for name in body_names:
        body_path = os.path.join(body_dir, name)
        with open(body_path, encoding="utf-8") as body_file:
            match = BODY_SOURCE_RE.fullmatch(body_file.read())
        if match is None:
            raise AssertionError("unexpected content body shape: %s" % body_path)
        for lang in result:
            result[lang].append(
                decode_body_template(match.group(lang), body_path, lang))
    return {lang: "".join(parts) for lang, parts in result.items()}


class TranslationParityTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="ktav-parity-test-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def write(self, name, text):
        path = os.path.join(self.tmp, name)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        return path

    def write_with_line_ending(self, name, text, line_ending):
        path = os.path.join(self.tmp, name)
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text.replace("\n", line_ending))
        return path

    def _replace_semi_line(self, lines, prefix, new_line):
        mutated = list(lines)
        for i, l in enumerate(mutated):
            if l.startswith(prefix):
                mutated[i] = new_line
                return mutated
        self.fail("fixture line with prefix %r not found" % prefix)

    def run_main(self, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = ctp.main(list(args))
        return code, out.getvalue()

    def test_section_sort_key_handles_4301_digit_numbers_without_traceback(self):
        huge = "9" * 4301
        en = self.write(
            "spec.md",
            EN_DOC + "\n## %s Huge section\n\nA MUST remains here.\n" % huge)
        ru = self.write(
            "spec.ru.md",
            RU_DOC_OK + "\n## %s Огромный раздел\n\nЗдесь остаётся MUST.\n" % huge)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("Traceback", out)

    def assert_no_fail_lines_for(self, out, *paths):
        for path in paths:
            bad = [l for l in out.splitlines()
                   if path in l and "[FAIL]" in l]
            self.assertEqual(bad, [])

    # -- happy path -----------------------------------------------------

    def test_split_source_lines_only_recognizes_markdown_line_terminators(self):
        cases = [
            ("", []),
            ("first\nsecond\n", ["first", "second"]),
            ("first\rsecond\r", ["first", "second"]),
            ("first\r\nsecond\r\n", ["first", "second"]),
            ("first\u0085second\u2028third\u2029fourth\vfifth\ffinal",
             ["first\u0085second\u2028third\u2029fourth\vfifth\ffinal"]),
        ]
        for source, expected in cases:
            with self.subTest(source=repr(source)):
                self.assertEqual(ctp.split_source_lines(source), expected)

    def test_crlf_lf_and_cr_files_have_the_same_parity(self):
        for line_ending in ("\r\n", "\n", "\r"):
            with self.subTest(line_ending=repr(line_ending)):
                en = self.write_with_line_ending(
                    "spec.md", EN_DOC, line_ending)
                ru = self.write_with_line_ending(
                    "spec.ru.md", RU_DOC_OK, line_ending)
                code, out = self.run_main(en, ru)
                self.assertEqual(code, 0, out)
                self.assertIn("OVERALL: PASS", out)

    def test_unicode_line_separator_before_grammar_fence_is_not_a_break(self):
        grammar = [
            "<document> ::= <line>*",
            "<line> ::= <pair-line>",
        ]
        en = self.write("spec.md", semi_doc(grammar))
        translated = semi_doc(grammar).replace(
            "Grammar productions.\n\n```\n",
            "Grammar productions.\n\u2028```\n")
        ru = self.write("spec.ru.md", translated)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("unclosed fenced code block", out)

    def test_tilde_fence_with_info_string_excludes_contents(self):
        lines = [
            "## 1. Section",
            "   ~~~json",
            "## 9.9 not a heading",
            "   ~~~ \t",
            "## 2. After",
        ]
        sections, opens, occurrences, _, excluded, _, unclosed, ranges = (
            ctp.parse_file(lines))
        self.assertEqual(opens, [1])
        self.assertEqual(occurrences, {"1": 1, "2": 1})
        self.assertEqual(sorted(sections), ["1", "2"])
        self.assertTrue(excluded[2])
        self.assertFalse(unclosed)
        self.assertEqual(ranges, [(1, 2, 3)])

    def test_four_backtick_fence_requires_four_backtick_closer(self):
        lines = [
            "## 1. Section",
            "````python",
            "```",
            "## 9.9 still inside the fence",
            "````  \t",
            "## 2. After",
        ]
        sections, opens, occurrences, _, excluded, _, unclosed, ranges = (
            ctp.parse_file(lines))
        self.assertEqual(opens, [1])
        self.assertEqual(occurrences, {"1": 1, "2": 1})
        self.assertEqual(sorted(sections), ["1", "2"])
        self.assertTrue(excluded[2])
        self.assertTrue(excluded[3])
        self.assertFalse(unclosed)
        self.assertEqual(ranges, [(1, 2, 4)])

    def test_fence_closer_rejects_info_text_and_unicode_whitespace(self):
        lines = [
            "## 1. Section",
            "~~~",
            "~~~language",
            "\u2028",
            "~~~\u00a0",
            "## 9.9 still inside the fence",
            "~~~",
            "## 2. After",
        ]
        sections, opens, occurrences, _, excluded, _, unclosed, ranges = (
            ctp.parse_file(lines))
        self.assertEqual(opens, [1])
        self.assertEqual(occurrences, {"1": 1, "2": 1})
        self.assertTrue(excluded[2])
        self.assertTrue(excluded[3])
        self.assertTrue(excluded[4])
        self.assertFalse(unclosed)
        self.assertEqual(ranges, [(1, 2, 6)])

    def test_four_space_fence_indent_is_content_not_a_fence(self):
        lines = [
            "## 1. Section",
            "    ```",
            "## 9.9 is a heading after indented content",
            "Text MUST remain visible.",
        ]
        sections, opens, occurrences, _, excluded, _, unclosed, _ = (
            ctp.parse_file(lines))
        self.assertEqual(opens, [])
        self.assertEqual(occurrences, {"1": 1, "9.9": 1})
        self.assertFalse(excluded[1])
        self.assertFalse(unclosed)

    def test_unicode_whitespace_cannot_be_blank_heading_or_list_indentation(self):
        self.assertFalse(ctp.ascii_blank("\u0085"))
        self.assertFalse(ctp.ascii_blank("\u2028"))
        self.assertFalse(ctp.ascii_blank("\u2029"))
        self.assertFalse(ctp.ascii_blank("\v"))
        self.assertFalse(ctp.ascii_blank("\f"))
        self.assertIsNone(ctp.HEADING_RE.match("\u2028## 2. Not a heading"))
        self.assertIsNone(ctp.LIST_ITEM_RE.match("\u2029- not a list"))
        self.assertIsNone(ctp.TABLE_ROW_RE.match("\u0085| not a row"))
        self.assertIsNone(ctp.parse_fence_opener("\u2028```"))

        lines = ["## 1. Section", "\u2028", "Text MUST remain content."]
        sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
        self.assertEqual(ctp.count_content(
            lines, sections["1"][0], sections["1"][1], excluded),
            (1, 0, 0))

    def test_happy_path_identical_structure_passes(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[FAIL]", out)

    def test_happy_path_verbose_prints_pass_lines(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru, "--verbose")
        self.assertEqual(code, 0, out)
        self.assertIn("[PASS]", out)
        self.assertIn("Sec 2.1", out)

    # -- dropped MUST NOT sentence ----------------------------------------

    def test_dropped_must_not_sentence_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace(
            "Ключ MUST NOT содержать байт NUL.\n", "")
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.1", out)
        self.assertIn("MUST NOT count mismatch (EN=1, translation=0)", out)

    # -- missing whole section --------------------------------------------

    def test_missing_whole_section_fails(self):
        en = self.write("spec.md", EN_DOC)
        # Drop the "### 2.2 Values" section and its content entirely.
        cut = RU_DOC_OK.index("### 2.2 Значения")
        ru_broken = RU_DOC_OK[:cut]
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.2", out)
        self.assertIn("missing section", out)

    # -- missing code block -------------------------------------------------

    def test_missing_code_block_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace("```\nexample: 1\n```\n\n", "")
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.1", out)
        self.assertIn("code-block count mismatch (EN=1, translation=0)", out)

    # -- multiple translation files, independent verdicts ------------------

    def test_multiple_translations_independent(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh_broken = self.write(
            "spec.zh.md",
            RU_DOC_OK.replace("Ключ MUST быть непустым.", ""))
        code, out = self.run_main(en, ru, zh_broken)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("spec.zh.md", out)
        self.assertIn("MUST count mismatch", out)
        # ru.md itself still fully matches EN.
        ru_lines = [l for l in out.splitlines() if "spec.ru.md" in l and "[FAIL]" in l]
        self.assertEqual(ru_lines, [])

    # -- headings inside fenced code blocks are not real headings ----------

    def test_fake_heading_inside_code_fence_is_ignored(self):
        en = EN_DOC.replace(
            "```\nexample: 1\n```\n",
            "```\n## 9.9 not a real heading\nexample: 1\n```\n")
        en_path = self.write("spec.md", en)
        # RU's fence mirrors the same extra line so fence-content line
        # counts stay in parity; this test is only about the fake heading
        # not being picked up as a real section, not about content drift.
        ru_text = RU_DOC_OK.replace(
            "```\nexample: 1\n```\n",
            "```\n## 9.9 not a real heading\nexample: 1\n```\n")
        ru = self.write("spec.ru.md", ru_text)
        code, out = self.run_main(en_path, ru)
        # The fake "## 9.9" heading inside the fence must not be picked up
        # as a real numbered section (which would otherwise report a
        # "missing section 9.9" false failure against ru).
        self.assertNotIn("Sec 9.9", out)
        self.assertEqual(code, 0, out)

    # -- dropped plain paragraph (no keyword, no fence) --------------------

    def test_dropped_plain_paragraph_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace("Немного вводного текста.\n\n", "")
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 1", out)
        self.assertIn("paragraph count mismatch (EN=1, translation=0)", out)

    # -- translation-only section -------------------------------------------

    def test_translation_only_section_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK + "### 9.9 Лишний раздел\n\nНовый текст с MUST здесь.\n"
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 9.9", out)
        self.assertIn("translation-only section", out)

    # -- duplicate section number -------------------------------------------

    def test_duplicate_section_number_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK + "### 2.2 Дубликат\n\nЗначение MUST NOT быть пустым.\n"
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.2", out)
        self.assertIn("duplicate section number", out)

    # -- duplicate section number in the canonical EN file ------------------

    def test_duplicate_section_number_in_en_fails(self):
        en_broken = EN_DOC + "\n### 2.2 Duplicate In En\n\nExtra text with a MUST.\n"
        en = self.write("spec.md", en_broken)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.2", out)
        self.assertIn("duplicate section number", out)

    # -- missing unnumbered named section ------------------------------------

    def test_missing_unnumbered_named_section_fails(self):
        en_doc = EN_DOC + "\n## Appendix B. Migration\n\nMigrate with a MUST check.\n"
        en = self.write("spec.md", en_doc)
        ru = self.write("spec.ru.md", RU_DOC_OK)  # intentionally lacks the appendix
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("missing named section: Appendix B. Migration", out)
        self.assertNotIn("extra named section", out)

    # -- front matter: Version value changed in a translation ---------------

    def test_front_matter_version_mismatch_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md",
                        ZH_DOC_OK.replace("**版本:** 0.7.0", "**版本:** 9.9.9"))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertTrue(any("[FAIL]" in l and "spec.zh.md" in l
                            for l in out.splitlines()))
        self.assertIn("Version value mismatch", out)
        self.assertIn("EN=0.7.0", out)
        self.assertIn("9.9.9", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: h1 title line removed --------------------------------

    def test_front_matter_missing_h1_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md", ZH_DOC_OK.replace("# 规范\n", ""))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertTrue(any("[FAIL]" in l and "spec.zh.md" in l
                            for l in out.splitlines()))
        self.assertIn("h1 title heading", out)
        self.assertIn("found 0", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: stray paragraph appended under the title --------------

    def test_front_matter_extra_paragraph_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md", ZH_DOC_OK.replace(
            "**日期:**(未发布 —— 草案)\n",
            "**日期:**(未发布 —— 草案)\n\n这是未翻译的多余段落。\n"))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertTrue(any("[FAIL]" in l and "spec.zh.md" in l
                            for l in out.splitlines()))
        self.assertIn("unexpected content line", out)
        self.assertIn("这是未翻译的多余段落。", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: disclaimer blockquotes are legitimate -----------------

    def test_front_matter_happy_path_with_disclaimer_passes(self):
        en = self.write("spec.md", EN_FRONT_DOC)
        ru = self.write("spec.ru.md", RU_FRONT_DOC)
        zh = self.write("spec.zh.md", ZH_FRONT_DOC)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[FAIL]", out)

    # -- front matter: same released date across all files ------------------

    def test_front_matter_same_released_date_passes(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED)
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[FAIL]", out)

    # -- front matter: a translation ships a different release date ---------

    def test_front_matter_different_released_dates_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED)
        zh = self.write("spec.zh.md", ZH_DOC_DATED.replace(
            "**日期:** 2026-09-02\n", "**日期:** 2027-01-01\n"))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("release date mismatch", out)
        self.assertIn("EN=2026-09-02", out)
        self.assertIn("2027-01-01", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: one file still draft while others are released -------

    def test_front_matter_draft_released_mismatch_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_OK)  # still draft
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("release-status mismatch", out)
        self.assertIn("EN=dated", out)
        self.assertIn("translation=draft", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: YYYY-MM-DD-shaped but not a real calendar date -------

    def test_front_matter_invalid_calendar_date_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED.replace(
            "**Дата:** 2026-09-02\n", "**Дата:** 2026-13-40\n"))
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("invalid calendar date", out)
        self.assertIn("2026-13-40", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: Date line with two different valid dates -------------

    def test_front_matter_two_dates_in_one_line_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED.replace(
            "**Дата:** 2026-09-02\n", "**Дата:** 2026-09-02 2027-01-01\n"))
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "expected exactly one date-shaped occurrence, found 2", out)
        self.assertIn("2026-09-02", out)
        self.assertIn("2027-01-01", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: Date line with a valid date plus an invalid one ------

    def test_front_matter_valid_and_invalid_date_in_one_line_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED.replace(
            "**Дата:** 2026-09-02\n", "**Дата:** 2026-09-02 2026-13-40\n"))
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "expected exactly one date-shaped occurrence, found 2", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: an extra trailing digit is not a valid date ----------

    def test_front_matter_date_extra_trailing_digit_not_accepted(self):
        # "2026-09-020" must NOT be treated as the valid date "2026-09-02"
        # with a silently-dropped stray digit; with digit-bounded matching
        # it counts as no date at all, so the translation reads as "draft"
        # while EN (a clean "2026-09-02") reads as "dated" -- a
        # release-status mismatch, not a silent PASS.
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED.replace(
            "**Дата:** 2026-09-02\n", "**Дата:** 2026-09-020\n"))
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("release-status mismatch", out)
        self.assertIn("EN=dated", out)
        self.assertIn("translation=draft", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: a bold paragraph with no colon/value is not a field --

    def test_front_matter_bold_prose_without_colon_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md", ZH_DOC_OK.replace(
            "**日期:**(未发布 —— 草案)\n",
            "**日期:**(未发布 —— 草案)\n**这不是字段而是粗体段落**\n"))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("unexpected content line", out)
        self.assertIn("这不是字段而是粗体段落", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: a whole bold field line dropped from a translation ---

    def test_front_matter_field_line_count_mismatch_fails(self):
        # Drop the whole "**Languages:** ..." field line from RU; the
        # existing h1/Version/Date/stray checks alone do not notice a
        # missing generic field line, only a dedicated count comparison
        # does.
        en = self.write("spec.md", EN_FRONT_DOC)
        ru_broken = RU_FRONT_DOC.replace(
            "**Languages:** [English](spec.md) · **Русский**\n", "")
        ru = self.write("spec.ru.md", ru_broken)
        zh = self.write("spec.zh.md", ZH_FRONT_DOC)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("field-line count mismatch", out)
        self.assertIn("EN=3", out)
        self.assertIn("translation=2", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- adversarial: production line dropped from inside an otherwise-
    # preserved grammar fence (independent review finding 8) ---------------

    def test_dropped_grammar_production_line_inside_preserved_fence_fails(self):
        # Reproduces the reviewer's exact adversarial case: delete one BNF
        # production line from inside a § 4-style fence while the
        # translation still has the same NUMBER of headings (2) and the
        # same NUMBER of fenced code blocks (1) as EN. Before the
        # fence-line-count and grammar-LHS-set checks were added, this
        # produced a false "PASS": the fence-count check alone (1 vs 1)
        # cannot see a line missing FROM INSIDE a fence, and fence
        # content was fully excluded from every other content-loss
        # counter (paragraph/list/table/keyword).
        grammar_lines_en = [
            "<document>       ::= <line>*",
            "<line>           ::= <comment> | <blank>",
            r'<quoted-segment> ::= "\"" <dq-token>* "\""       ; § 5.3.3',
            "<dq-token>       ::= <key-escape> | <dq-char>",
        ]
        # Drops exactly the <quoted-segment> production line -- heading
        # count and fence count both still match EN.
        grammar_lines_translation = [
            l for l in grammar_lines_en
            if not l.startswith("<quoted-segment>")
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_translation))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 4", out)
        # The per-fence line-count check fires ...
        self.assertIn(
            "non-blank line count mismatch (EN=4, translation=3)", out)
        # ... and so does the grammar nonterminal-set check, naming the
        # dropped production's left-hand side.
        self.assertIn("grammar production LHS set mismatch", out)
        self.assertIn("<quoted-segment>", out)

    def test_duplicate_grammar_lhs_replacing_ignored_continuation_fails(self):
        # The prose continuation is intentionally ignored by the pure-BNF
        # production map. Replacing it with a second pure declaration must
        # still fail before that map can overwrite the first RHS.
        duplicate = list(SEMI_GRAMMAR_LINES_EN)
        duplicate[duplicate.index(
            "                    ASCII control bytes < 0x20 other than the whitespace"
        )] = "<document>      ::= <line>*"
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(duplicate))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("duplicate grammar production LHS <document>", out)
        self.assertIn("2 declarations in translation", out)

    def test_duplicate_grammar_lhs_in_en_is_fatal_before_translation_compare(self):
        duplicate = list(SEMI_GRAMMAR_LINES_EN)
        duplicate.append("<document>      ::= <line>*")
        en = self.write("spec.md", semi_doc(duplicate))
        ru = self.write("spec.ru.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("duplicate grammar production LHS <document>", out)
        self.assertNotIn("spec.ru.md", out)

    # -- bare-identifier grammar signatures -------------------------------

    def test_bare_grammar_character_class_drift_fails_without_line_count(self):
        mutated = list(BARE_GRAMMAR_LINES_EN)
        mutated[mutated.index("hex_digit      ::= [0-9a-fA-F]")] = (
            "hex_digit      ::= [0-8a-fA-F]")
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("bare grammar production RHS mismatch for hex_digit", out)
        self.assertNotIn("non-blank line count mismatch", out)

    def test_bare_grammar_rhs_token_drift_fails_without_line_count(self):
        mutated = list(BARE_GRAMMAR_LINES_EN)
        mutated[0] = mutated[0].replace("sign?", "sign*")
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("bare grammar production RHS mismatch for integer", out)
        self.assertNotIn("non-blank line count mismatch", out)

    def test_bare_grammar_deleted_production_fails_by_signature(self):
        mutated = [line for line in BARE_GRAMMAR_LINES_EN
                   if not line.startswith("dec_digit")]
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("bare grammar production LHS set mismatch", out)
        self.assertIn("dec_digit", out)

    def test_duplicate_bare_grammar_lhs_in_translation_fails_before_map_overwrite(self):
        mutated = list(BARE_GRAMMAR_LINES_EN)
        mutated[mutated.index('sign           ::= "+" | "-"')] = (
            "integer        ::= sign? ( hex | oct | bin | dec )")
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "duplicate bare grammar production LHS integer", out)
        self.assertIn("2 declarations in translation", out)
        self.assertNotIn("non-blank line count mismatch", out)

    def test_malformed_bare_grammar_in_en_is_fatal_before_translation_compare(self):
        malformed = list(BARE_GRAMMAR_LINES_EN)
        malformed[0] = "integer        ::= "
        en = self.write("spec.md", bare_doc(malformed))
        ru = self.write("spec.ru.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("bare grammar production integer failed to parse", out)
        self.assertNotIn("spec.ru.md", out)

    def test_duplicate_bare_grammar_lhs_in_en_is_fatal_before_translation_compare(self):
        duplicate = list(BARE_GRAMMAR_LINES_EN)
        duplicate[duplicate.index('sign           ::= "+" | "-"')] = (
            "integer        ::= sign? ( hex | oct | bin | dec )")
        en = self.write("spec.md", bare_doc(duplicate))
        ru = self.write("spec.ru.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("duplicate bare grammar production LHS integer", out)
        self.assertNotIn("spec.ru.md", out)

    def test_malformed_bare_grammar_in_translation_is_reported(self):
        malformed = list(BARE_GRAMMAR_LINES_EN)
        malformed[0] = "integer        ::= "
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(malformed))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "bare grammar production integer failed to parse in translation",
            out)

    def test_grammar_production_terminal_swap_fails_despite_matching_lhs(self):
        # Reproduces round-15's adversarial case: a translation swaps one
        # terminal inside an existing production (":" -> ";" in
        # <pair-line>) while heading count, fence non-blank line count, AND
        # the grammar LHS-name set all stay identical to EN. Before the
        # RHS-syntax check was added, this passed silently: the LHS-set
        # check only compares nonterminal NAMES, never each production's
        # actual right-hand side.
        grammar_lines_en = [
            "<document>   ::= <line>*",
            r'<pair-line>  ::= <key> ":"  <sep-end> <value-part-opt> eol',
            r'                  | <key> "::" <sep-end> <value-part-opt> eol',
            "<key>        ::= <segment>+",
        ]
        grammar_lines_mutated = [
            l.replace('<key> ":"', '<key> ";"')
            for l in grammar_lines_en
        ]
        self.assertNotEqual(grammar_lines_en, grammar_lines_mutated)
        self.assertEqual(
            [len(l) for l in grammar_lines_en],
            [len(l) for l in grammar_lines_mutated])

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 4", out)
        # The checks round-15 already found sufficient must NOT be what
        # catches this -- heading count, fence line count, and the LHS
        # name set are all unchanged by construction.
        self.assertNotIn("non-blank line count mismatch", out)
        self.assertNotIn("grammar production LHS set mismatch", out)
        # Only the new RHS-syntax check must fire, naming the production.
        self.assertIn("grammar production RHS mismatch for <pair-line>", out)

    def test_line_end_grammar_atoms_are_supported(self):
        # These exact atoms must tokenize as pure BNF so the shipped
        # section 4 grammar signature remains comparable across languages.
        grammar_lines = [
            "<document>      ::= <line>*",
            "<line-end>      ::= eol | EOF",
            "<comment-body>  ::= any-chars-until-line-end",
            "<lookahead>     ::= &line-end",
            '<item-literal>  ::= (ws) "::" <sep-end> '
            'any-chars-until-line-end <line-end>',
            '<plain-inline-separator> ::= ":" !":"',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased - draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines))
        ru = self.write("spec.ru.md", doc(grammar_lines))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

    def test_repository_content_pin_bare_grammar_signature_matches_all_languages(self):
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        per_language = {}
        for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
            path = os.path.join(repo_root, "versions", "0.7", name)
            lines = ctp.read_lines(path)
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["3.6"]
            productions, malformed = ctp.extract_bare_grammar_productions(
                lines, start, end, excluded)
            self.assertEqual(malformed, [], name)
            per_language[name] = productions

        self.assertEqual(per_language["spec.ru.md"], per_language["spec.md"])
        self.assertEqual(per_language["spec.zh.md"], per_language["spec.md"])
        self.assertEqual(
            set(per_language["spec.md"]),
            {"integer", "sign", "hex", "oct", "bin", "dec",
             "hex_digit", "oct_digit", "bin_digit", "dec_digit",
             "float", "dec_part", "exponent"})

    def test_line_end_atom_lookalikes_remain_malformed(self):
        # Accepting any of these would weaken the generic malformed-
        # production detector rather than adding the requested atoms.
        grammar_lines_en = [
            "<document>      ::= <line>*",
            "<line-end>      ::= eol | EOF",
            "<comment-body>  ::= any-chars-until-line-end",
            "<lookahead>     ::= &line-end",
        ]
        bad_atoms = [
            ("<line-end>", "<line-end>      ::= eol | EOFx", "EOFx"),
            ("<comment-body>",
             "<comment-body>  ::= any-chars-until-line-end-extra",
             "any-chars-until-line-end-extra"),
            ("<lookahead>", "<lookahead>     ::= &line-ending",
             "&line-ending"),
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased - draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        for lhs, bad_line, bad_atom in bad_atoms:
            with self.subTest(bad_atom=bad_atom):
                ru_lines = list(grammar_lines_en)
                ru_lines[ru_lines.index(
                    next(line for line in ru_lines
                         if line.startswith(lhs)))] = bad_line
                ru = self.write("spec.ru.md", doc(ru_lines))
                code, out = self.run_main(en, ru)
                self.assertEqual(code, 1, out)
                self.assertIn("OVERALL: FAIL", out)
                self.assertIn(
                    "failed to parse as pure BNF in translation", out)

    # ---- repository content-pin integration tests ------------------------
    # These deliberately open the checked-in generated spec/content files.
    # They are not synthetic parity fixtures and must remain strict pins.

    def test_repository_content_pin_line_end_grammar_signature_matches_all_languages(self):
        # The generated files must expose the same new atom signature; this
        # focused check does not run the full parity command.
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        signatures = []
        for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
            path = os.path.join(repo_root, "versions", "0.7", name)
            with open(path, encoding="utf-8") as f:
                lines = [line.rstrip("\n") for line in f.readlines()]
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["4"]
            productions, malformed = ctp.extract_grammar_productions(
                lines, start, end, excluded)
            self.assertEqual(malformed, [], name)
            signatures.append(productions)

        self.assertEqual(signatures[0], signatures[1])
        self.assertEqual(signatures[0], signatures[2])
        self.assertEqual(signatures[0]["<line-end>"], ["eol | EOF"])
        self.assertEqual(
            signatures[0]["<comment-body>"],
            ["any-chars-until-line-end"])
        self.assertTrue(
            any("&line-end" in fragment
                for fragment in signatures[0]["<value-start>"]))

    def test_item_literal_bounded_body_signature_mismatch_fails(self):
        grammar_lines_en = [
            "<document>      ::= <line>*",
            '<item-literal>  ::= (ws) "::" <sep-end> '
            'any-chars-until-line-end <line-end>',
        ]
        grammar_lines_ru = [
            "<document>      ::= <line>*",
            '<item-literal>  ::= (ws) "::" <sep-end> '
            '<any-chars>? <line-end>',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased - draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production RHS mismatch for <item-literal>", out)
        self.assertNotIn("failed to parse as pure BNF", out)

    def test_repository_content_pin_source_item_literal_uses_bounded_raw_line(self):
        production = (
            '<item-literal>  ::= (ws) "::" <sep-end> '
            '<raw-line> <line-end>')
        for lang, source in read_repository_sec4_bodies().items():
            with self.subTest(lang=lang):
                self.assertEqual(source.count(production), 1)
                self.assertNotIn(
                    '<item-literal>  ::= (ws) "::" <sep-end> '
                    'any-chars-until-line-end <line-end>', source)

    def test_repository_content_pin_source_raw_pair_line_uses_raw_line_only(self):
        expected_pair = '| <key> "::" <sep-end> <raw-line> <line-end>'
        expected_raw_line = '<raw-line> ::= any-chars-until-line-end'
        for lang, source in read_repository_sec4_bodies().items():
            with self.subTest(lang=lang):
                raw_pair_lines = [
                    line for line in source.splitlines()
                    if re.match(r'^\s*\|\s*<key>\s+"::"\s+<sep-end>', line)
                ]
                self.assertEqual(len(raw_pair_lines), 1, raw_pair_lines)
                pair_syntax = raw_pair_lines[0].split(';', 1)[0]
                self.assertEqual(' '.join(pair_syntax.split()), expected_pair)

                raw_line_declarations = [
                    line for line in source.splitlines()
                    if re.match(r'^\s*<raw-line>\s*::=', line)
                ]
                self.assertEqual(
                    len(raw_line_declarations), 1, raw_line_declarations)
                raw_line_syntax = raw_line_declarations[0].split(';', 1)[0]
                self.assertEqual(
                    ' '.join(raw_line_syntax.split()), expected_raw_line)

                guarded_syntax = pair_syntax + "\n" + raw_line_syntax
                self.assertNotIn('<value-part-opt>', guarded_syntax)
                self.assertNotIn('<value-start>', guarded_syntax)

    def test_repository_content_pin_source_ws_is_line_bounded_in_all_languages(self):
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        body_path = os.path.join(
            repo_root, "versions", "0.7", "content", "sec-4", "body-1.js")
        with open(body_path, encoding="utf-8") as f:
            source = f.read()

        for marker in (
                "is line-bounded",
                "ограничен строкой",
                "均受行边界限制"):
            self.assertIn(marker, source)
        for marker in (
                "not consumed by either ws form",
                "не поглощаются ни одной формой ws",
                "两种 ws 形式均不消耗它们"):
            self.assertIn(marker, source)

    def test_malformed_syntax_production_in_en_is_fatal(self):
        # Round-16 finding 2: a production whose LHS is NOT on the
        # semi-formal prose allowlist (SEMI_FORMAL_PROSE_LHS) is expected
        # to always be pure BNF. If EN's OWN copy fails to tokenize -- a
        # malformed terminal, like the pre-round-16 backslash-terminal bug
        # ("\"" written where "\\"" belongs) -- that is a spec-authoring
        # defect, not a translation issue, and must halt before any
        # translation is even compared (same severity class as a
        # duplicate section number or an unclosed fence).
        grammar_lines_en = [
            "<document>   ::= <line>*",
            r'<pair-line>  ::= <key> ":" <sep-end> <value-part-opt> eol',
            # Malformed: a terminal meant to mean a literal backslash,
            # written as the 3-byte escaped-quote-with-no-closer "\"
            # instead of the well-formed 4-byte "\\".
            r'<key>        ::= <segment>+ "\"',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_en))  # identical -- irrelevant, EN itself is broken
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("grammar production <key> failed to parse as pure BNF", out)
        # Must stop before any per-translation comparison runs: exactly
        # the one EN-fatal [FAIL] line, nothing else.
        fail_lines = [l for l in out.splitlines() if "[FAIL]" in l]
        self.assertEqual(len(fail_lines), 1, out)

    def test_malformed_syntax_production_in_translation_only_is_reported(self):
        # A production that tokenizes fine in EN but is corrupted into
        # something unparseable in the translation (not merely DIFFERENT,
        # but no longer valid BNF at all) must be reported distinctly from
        # an ordinary RHS mismatch, not silently dropped the way a
        # legitimately prose-shaped production's RHS is.
        grammar_lines_en = [
            "<document>   ::= <line>*",
            r'<pair-line>  ::= <key> ":" <sep-end> <value-part-opt> eol',
            "<key>        ::= <segment>+",
        ]
        grammar_lines_ru = [
            "<document>   ::= <line>*",
            r'<pair-line>  ::= <key> ":" <sep-end> <value-part-opt> eol',
            # Corrupted: same backslash-terminal defect, introduced only
            # in the translation this time.
            r'<key>        ::= <segment>+ "\"',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF "
            "in translation", out)

    def test_empty_angle_grammar_rhs_is_fatal_even_when_all_languages_are_truncated(self):
        # A shared truncation must not disappear from every production map
        # and thereby pass cross-language parity unchanged.
        grammar_lines = [
            "<document> ::= <line>*",
            "<key> ::= ",
        ]
        en = self.write("spec.md", semi_doc(grammar_lines))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines))
        zh = self.write("spec.zh.md", semi_doc(grammar_lines))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF", out)
        self.assertNotIn("spec.ru.md", out)
        self.assertNotIn("spec.zh.md", out)

    def test_empty_angle_grammar_rhs_in_translation_is_reported(self):
        grammar_lines_en = [
            "<document> ::= <line>*",
            "<key> ::= <segment>+",
        ]
        grammar_lines_ru = [
            "<document> ::= <line>*",
            "<key> ::= ",
        ]
        en = self.write("spec.md", semi_doc(grammar_lines_en))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF "
            "in translation", out)

    def test_empty_angle_grammar_continuation_is_recorded_before_later_alternatives(self):
        grammar_lines = [
            "<document> ::= <line>*",
            "<key> ::= <segment>+",
            "|",
            "| <other>",
            "<other> ::= <segment>",
        ]
        en = self.write("spec.md", semi_doc(grammar_lines))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF", out)
        self.assertNotIn("grammar production RHS mismatch for <other>", out)

    def test_empty_angle_grammar_declaration_keeps_nonempty_continuation_but_is_malformed(self):
        lines = [
            "<document> ::= <line>*",
            "<key> ::= ",
            "| <segment>+",
        ]
        sections, _, _, _, excluded, _, _, _ = ctp.parse_file(
            semi_doc(lines).splitlines())
        productions, malformed = ctp.extract_grammar_productions(
            semi_doc(lines).splitlines(), *sections["4"], excluded)
        self.assertEqual(productions["<key>"], ["| <segment>+"])
        self.assertIn(("<key>", ""), malformed)

    def test_grammar_terminal_tokenizer_accepts_only_documented_escapes(self):
        self.assertTrue(ctp._is_pure_bnf(r'"\""'))
        self.assertTrue(ctp._is_pure_bnf(r'"\\"'))
        self.assertFalse(ctp._is_pure_bnf(r'"\q"'))
        self.assertFalse(ctp._is_pure_bnf(r'"\."'))
        self.assertFalse(ctp._is_pure_bnf(r'"\n"'))

    def test_shared_invalid_grammar_terminal_escape_is_fatal(self):
        grammar_lines = [
            "<document> ::= <line>*",
            r'<key> ::= "\q"',
        ]
        en = self.write("spec.md", semi_doc(grammar_lines))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines))
        zh = self.write("spec.zh.md", semi_doc(grammar_lines))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF", out)
        self.assertNotIn("spec.ru.md", out)
        self.assertNotIn("spec.zh.md", out)

    def test_invalid_grammar_terminal_escape_in_translation_is_reported(self):
        grammar_lines_en = [
            "<document> ::= <line>*",
            r'<key> ::= "\\"',
        ]
        grammar_lines_ru = [
            "<document> ::= <line>*",
            r'<key> ::= "\q"',
        ]
        en = self.write("spec.md", semi_doc(grammar_lines_en))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF "
            "in translation", out)

    def test_escapable_byte_style_terminal_swap_without_semicolon_caught(self):
        # Reproduces round-16's exact adversarial case: mutate a
        # non-colon, non-semicolon terminal (here "," -> "!", matching the
        # review's own <escapable-byte> example) on a production's
        # DECLARATION line, with no trailing "; comment" on the line at
        # all -- so _rhs_fragment's semicolon-based comment-stripping
        # plays no role in detection, unlike the round-15 test's
        # ":" -> ";" mutation (which happened to also get caught via a
        # side effect of comment-stripping truncation). This isolates that
        # the RHS-syntax comparison itself, not that side effect, is what
        # catches a corrupted terminal.
        grammar_lines_en = [
            "<document>        ::= <line>*",
            r'<escapable-byte>  ::= "\\" | "," | "}" | "]"',
        ]
        grammar_lines_ru = [
            "<document>        ::= <line>*",
            r'<escapable-byte>  ::= "\\" | "!" | "}" | "]"',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "grammar production RHS mismatch for <escapable-byte>", out)

    def test_repository_content_pin_grammar_has_no_malformed_productions(self):
        # Protective test over the ACTUAL versions/0.7/spec.md: fixes the
        # expected set of productions this checker holds to exact BNF
        # parity, and asserts zero malformed productions right now. If
        # this count or set ever drifts, it means either a new production
        # was added (update the expected numbers) or -- the case this
        # guards against -- a real production silently stopped
        # tokenizing and fell through the allowlist gap undetected.
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        spec_path = os.path.join(repo_root, "versions", "0.7", "spec.md")
        with open(spec_path, encoding="utf-8") as f:
            lines = [l.rstrip("\n") for l in f.readlines()]
        sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
        start, end = sections["4"]
        lhs_set = ctp.extract_grammar_lhs(lines, start, end, excluded)
        productions, malformed = ctp.extract_grammar_productions(
            lines, start, end, excluded)
        self.assertEqual(malformed, [])
        self.assertEqual(len(lhs_set), 45)
        self.assertEqual(len(productions), 36)
        self.assertEqual(
            lhs_set - set(productions),
            ctp.SEMI_FORMAL_PROSE_LHS)
        self.assertIn("<raw-line>", lhs_set)
        self.assertEqual(
            productions["<raw-line>"], ["any-chars-until-line-end"])
        self.assertNotIn("<raw-line>", ctp.SEMI_FORMAL_PROSE_LHS)
        for lhs in ("<line-end>", "<comment-body>", "<raw-segment>"):
            self.assertIn(lhs, lhs_set)

    def test_grammar_lhs_check_does_not_misfire_without_grammar_fences(self):
        # Guard against the new grammar-LHS-set check misfiring on
        # ordinary sections whose fences hold non-grammar example content
        # (no line matches '^<...>::='): the happy-path fixtures below
        # have no grammar fence at all, and must stay a clean PASS.
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertNotIn("grammar production LHS set mismatch", out)
        self.assertNotIn("non-blank line count mismatch", out)

    # -- keyword inside a fence must not mask a dropped keyword in prose ----

    def test_keyword_inside_fence_not_counted_masks_dropped_must(self):
        # Adversarial mutation: remove the real prose "MUST" from Sec 2.1
        # (replace the English keyword with a plain Russian word, so the
        # regex no longer matches it) while ALSO adding a "MUST"-looking
        # line inside the section's existing code fence. If fence content
        # were not excluded from the keyword count, the two changes would
        # cancel out and the mismatch would go undetected.
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace(
            "Ключ MUST быть непустым.", "Ключ должен быть непустым."
        ).replace(
            "```\nexample: 1\n```\n",
            "```\nexample: 1\n## MUST\n```\n",
        )
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.1", out)
        self.assertIn("MUST count mismatch (EN=1, translation=0)", out)

    # -- unclosed fenced code block in a translation -------------------------

    def test_unclosed_fence_in_translation_fails(self):
        # Drop only the CLOSING ``` of Sec 2.1's existing code block; the
        # rest of the file (including "### 2.2 ...") is then silently
        # swallowed as fence content by parse_file, so Sec 2.2 also
        # vanishes from RU -- but the checker must name the real defect
        # (an unclosed fence), not just report a missing section.
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace("example: 1\n```\n", "example: 1\n")
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("spec.ru.md", out)
        self.assertIn("unclosed fenced code block", out)

    # -- unclosed fenced code block in the canonical EN file ------------------

    def test_unclosed_fence_in_en_fails(self):
        # Same mutation as above, applied to EN instead: this must be
        # fatal BEFORE any translation is read or compared (mirroring the
        # existing duplicate-section-in-EN fatal check), since every
        # section range/content count derived from EN is untrustworthy
        # once EN itself ends inside an unterminated fence.
        en_broken = EN_DOC.replace("example: 1\n```\n", "example: 1\n")
        en = self.write("spec.md", en_broken)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("spec.md", out)
        self.assertIn("unclosed fenced code block", out)

    # -- real spec files still balance their fences (protective, not gate) --

    def test_real_files_fence_balance_unaffected_by_unclosed_check(self):
        # Purely protective: a well-formed doc with a properly closed
        # fence must never trip the new unclosed-fence check.
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertNotIn("unclosed fenced code block", out)

    # -- embedded grammar terminals in semi-formal prose productions ---------

    def run_semi_mutation(self, mutated_lines, lhs):
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated_lines))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "embedded grammar terminal mismatch in semi-formal "
            "production %s" % lhs, out)
        # The OLD detectors must NOT have fired: same physical line
        # counts, and the mutated LHS has no pure-BNF fragment so it is
        # not in `productions` at all, and LHS names are intact.
        self.assertNotIn("non-blank line count mismatch", out)
        self.assertNotIn("grammar production RHS mismatch", out)
        self.assertNotIn("grammar production LHS set mismatch", out)

    def run_semi_compound_mutation(self, mutated_lines, lhs):
        """Like run_semi_mutation, but for mutations that change ONLY the
        (name, hex) bindings while keeping the flat token multiset
        identical: the OLD flat-multiset detector must stay silent (this
        is a genuinely NEW detection, not duplicate coverage) and the new
        compound association check must name the production."""
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated_lines))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte codepoint association mismatch in semi-formal "
            "production %s" % lhs, out)
        # NOT caught by the old flat multiset: the flat token bag is
        # unchanged by construction.
        self.assertNotIn("embedded grammar terminal mismatch", out)
        # No other detector has anything to fire on either.
        self.assertNotIn("non-blank line count mismatch", out)
        self.assertNotIn("grammar production RHS mismatch", out)
        self.assertNotIn("grammar production LHS set mismatch", out)

    def run_semi_triplet_mutation(self, mutated_lines, lhs):
        """Apply one semi-formal mutation to EN, RU, and ZH in turn.

        The production is intentionally prose-shaped, so every language's
        embedded grammar tokens must be protected independently. Keeping all
        three files in each run also guards the canonical EN path, not just
        the two translation paths.
        """
        for target in ("spec.md", "spec.ru.md", "spec.zh.md"):
            paths = {}
            for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
                lines = mutated_lines if name == target else SEMI_GRAMMAR_LINES_EN
                paths[name] = self.write(name, semi_doc(lines))
            code, out = self.run_main(
                paths["spec.md"], paths["spec.ru.md"], paths["spec.zh.md"])
            self.assertEqual(code, 1, "%s: %s" % (target, out))
            self.assertIn("OVERALL: FAIL", out)
            self.assertIn(
                "embedded grammar terminal mismatch in semi-formal "
                "production %s" % lhs, out)

    def run_grammar_triplet_mutation(self, mutated_lines, lhs):
        """Apply one strict-BNF mutation to each member of EN/RU/ZH."""
        for target in ("spec.md", "spec.ru.md", "spec.zh.md"):
            paths = {}
            for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
                lines = mutated_lines if name == target else SEMI_GRAMMAR_LINES_EN
                paths[name] = self.write(name, semi_doc(lines))
            code, out = self.run_main(
                paths["spec.md"], paths["spec.ru.md"], paths["spec.zh.md"])
            self.assertEqual(code, 1, "%s: %s" % (target, out))
            self.assertIn("OVERALL: FAIL", out)
            self.assertIn(
                "grammar production RHS mismatch for %s" % lhs, out)

    def test_pure_comment_terminal_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<comment>",
            '<comment>       ::= (ws) "//" any-chars-until-line-end')
        self.run_grammar_triplet_mutation(mutated, "<comment>")

    def test_semi_formal_unescaped_dot_terminal_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<unescaped-dot>",
            r'<unescaped-dot>      ::= ":" that is NOT preceded by an odd '
            r'number of "\\"')
        self.run_semi_mutation(mutated, "<unescaped-dot>")

    def test_semi_formal_unescaped_dot_escape_lead_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<unescaped-dot>",
            r'<unescaped-dot>      ::= "." that is NOT preceded by an odd '
            r'number of "//"')
        self.run_semi_mutation(mutated, "<unescaped-dot>")

    def test_semi_formal_non_quote_key_char_dropped_bt_exclusion_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<non-quote-key-char>",
            r'<non-quote-key-char> ::= <key-char> excluding "\"", "\'"')
        self.run_semi_mutation(mutated, "<non-quote-key-char>")

    def test_semi_formal_non_quote_key_char_sq_swapped_for_dq_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<non-quote-key-char>",
            r'<non-quote-key-char> ::= <key-char> excluding "\"", "\"", "`"')
        self.run_semi_mutation(mutated, "<non-quote-key-char>")

    def test_semi_formal_dq_char_escape_lead_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, r'                    "\\" (escape lead)',
            r'                    "//" (escape lead), and "\"" '
            r'(the delimiter itself)')
        self.run_semi_mutation(mutated, "<dq-char>")

    def test_semi_formal_sq_char_delimiter_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<sq-char>",
            '<sq-char>       ::= same exclusions as <dq-char>, but '
            'excluding "\\""')
        self.run_semi_mutation(mutated, "<sq-char>")

    def test_semi_formal_inline_scalar_comma_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<inline-scalar>",
            '<inline-scalar>    ::= sequence of bytes terminated by an '
            'unescaped')
        mutated = self._replace_semi_line(
            mutated, '                       ","',
            '                       ";" / "}" / "]" or by end-of-line')
        self.run_semi_mutation(mutated, "<inline-scalar>")

    def test_plain_inline_separator_terminal_mutation_fails_in_en_ru_zh(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<plain-inline-separator>",
            '<plain-inline-separator> ::= "." !":"')
        self.run_grammar_triplet_mutation(mutated, "<plain-inline-separator>")

    def test_plain_inline_separator_negative_lookahead_mutations_fail(self):
        mutations = [
            '<plain-inline-separator> ::= !":" ":"',
            '<plain-inline-separator> ::= ":"',
        ]
        for replacement in mutations:
            with self.subTest(replacement=replacement):
                mutated = self._replace_semi_line(
                    SEMI_GRAMMAR_LINES_EN, "<plain-inline-separator>",
                    replacement)
                self.run_grammar_triplet_mutation(
                    mutated, "<plain-inline-separator>")

    def test_inline_pair_raw_double_colon_mutation_fails_in_en_ru_zh(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<inline-pair>",
            '<inline-pair>      ::= <key> (ws) ":" (ws) '
            '<inline-raw-scalar> (ws)')
        self.run_grammar_triplet_mutation(mutated, "<inline-pair>")

    def test_inline_raw_scalar_delimiter_mutations_fail_in_en_ru_zh(self):
        mutations = [
            (
                '                        terminated by the first unescaped "," / "}" /',
                '                        terminated by the first unescaped ";" / "}" /'),
            (
                '                        "]" or by <line-end> (which is an error per',
                '                        ")" or by <line-end> (which is an error per'),
            (
                '                        "]" or by <line-end> (which is an error per',
                '                        "]" or by end-of-line (which is an error per'),
        ]
        for old, new in mutations:
            with self.subTest(new=new):
                mutated = self._replace_semi_line(
                    SEMI_GRAMMAR_LINES_EN, old, new)
                self.run_semi_triplet_mutation(mutated, "<inline-raw-scalar>")

    def test_semi_formal_multiline_content_line_verbatim_terminator_lost(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                             the terminator",
            '                             the terminator (")" or ")") ends '
            'the block')
        self.run_semi_mutation(mutated, "<multiline-content-line>")

    def test_semi_formal_key_char_colon_exclusion_dropped_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, '                    "[", "]", "{", "}"',
            '                    "[", "]", "{", "}", "(", ")", ","!')
        self.run_semi_mutation(mutated, "<key-char>")

    def test_semi_formal_order_insensitive_quote_list_passes(self):
        # Mirroring the real RU phrasing ("own delimiter first"): list the
        # quote exclusions in a DIFFERENT order than EN. Exclusion sets
        # are semantically order-independent, so the multiset contract
        # must keep this a PASS.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<non-quote-key-char>",
            r'<non-quote-key-char> ::= <key-char> excluding "\'", "\"", "`"')
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("embedded grammar terminal mismatch", out)

    def test_semi_formal_reworded_prose_keeping_terminals_passes(self):
        # A translation legitimately re-wording the prose while keeping
        # every embedded terminal must PASS.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<unescaped-dot>",
            r'<unescaped-dot>      ::= a "." with an odd count of "\\" '
            r'right before it is escaped, not unescaped')
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("embedded grammar terminal mismatch", out)

    def test_semi_formal_baseline_fixture_passes(self):
        # The untouched fixture itself must be a clean PASS (the mutation
        # tests below rely on this baseline).
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

    def test_semi_formal_dq_char_hex_0x20_mutated_to_0x21_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    < 0x20",
            "                    < 0x21 other than tab/VT/FF, DEL (0x7F), "
            "LF, CR,")
        self.run_semi_mutation(mutated, "<dq-char>")

    def test_semi_formal_dq_char_del_0x7f_clause_removed_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    < 0x20",
            "                    < 0x20 other than tab/VT/FF, LF, CR,")
        self.run_semi_mutation(mutated, "<dq-char>")

    def test_semi_formal_key_char_vt_ff_dropped_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    members (tab 0x09,",
            "                    members (tab 0x09 — LF 0x0A and")
        self.run_semi_mutation(mutated, "<key-char>")

    def test_semi_formal_key_char_cr_letter_dropped_fails(self):
        # A multiset-changing LF/CR mutation: bare "CR" removed while the
        # byte literal 0x0D stays. (A pure ORDER swap of "LF, CR" is NOT a
        # multiset change and is deliberately still a PASS -- see the
        # order-insensitivity test below.)
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    CR 0x0D are excluded separately",
            "                    0x0D are excluded separately as line "
            "terminators,")
        self.run_semi_mutation(mutated, "<key-char>")

    def test_semi_formal_dq_char_lf_cr_reorder_still_passes(self):
        # The significant-token comparison is a MULTISET contract: swapping
        # the order of "LF, CR" does not change the multiset and must stay a
        # PASS (mirrors the shipped translations' legitimate phrasing
        # differences). Documented so a future reviewer does not mistake
        # the order-insensitivity for a blind spot.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    < 0x20",
            "                    < 0x20 other than tab/VT/FF, DEL (0x7F), "
            "CR, LF,")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("embedded grammar terminal mismatch", out)

    def test_semi_formal_key_char_hex_0x0a_dropped_fails(self):
        # Byte-literal loss inside <key-char>: "LF 0x0A" loses its hex form.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    members (tab 0x09,",
            "                    members (tab 0x09, VT 0x0B, FF 0x0C — LF")
        self.run_semi_mutation(mutated, "<key-char>")

    def test_semi_formal_key_char_lf_cr_codepoint_bindings_swapped_fails(self):
        # The review's exact false-negative: swap ONLY the LF/CR codepoint
        # bindings ("LF 0x0A and CR 0x0D" -> "LF 0x0D and CR 0x0A"). The
        # flat token multiset is IDENTICAL (same names, same hex values),
        # so the pre-compound-check logic passed this; the compound pair
        # check must catch it.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    members (tab 0x09,",
            "                    members (tab 0x09, VT 0x0B, FF 0x0C — "
            "LF 0x0D and")
        mutated = self._replace_semi_line(
            mutated,
            "                    CR 0x0D are excluded separately",
            "                    CR 0x0A are excluded separately as line "
            "terminators),")
        self.run_semi_compound_mutation(mutated, "<key-char>")

    def test_semi_formal_key_char_vt_ff_codepoint_bindings_swapped_fails(self):
        # Same association-swap class for the VT/FF pair: "VT 0x0B,
        # FF 0x0C" -> "VT 0x0C, FF 0x0B". Flat multiset unchanged; only
        # the compound check fires.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    members (tab 0x09,",
            "                    members (tab 0x09, VT 0x0C, FF 0x0B — "
            "LF 0x0A and")
        self.run_semi_compound_mutation(mutated, "<key-char>")

    # -- fixed absolute-constant checks: '< 0x20' threshold, tab 0x09 ------
    #
    # Round-20 finding 2: two more numeric facts in the semi-formal
    # <dq-char>/<key-char> prose are asserted as FIXED ABSOLUTE CONSTANTS
    # per language (threshold always 0x20; tab always 0x09 wherever the
    # translated word is stated with its code point), not compared
    # cross-language.

    def test_semi_formal_key_char_control_threshold_mutated_fails(self):
        # ONLY the threshold value changes ("< 0x20" -> "< 0x09") in the
        # translation; the tab pairing is untouched. The absolute check
        # must fire and name the exact defect; the old compound-pair
        # check has nothing to fire on (no LF/CR/VT/FF/DEL pair touched).
        # Note the old flat-multiset check ALSO fires on this particular
        # mutation (a one-sided value change necessarily shifts the token
        # counts) -- that catch is incidental and evaporates when both
        # sides are corrupted identically, which is the case
        # test_semi_formal_threshold_corruption_identical_in_en_and_translation_fails
        # pins below.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    ASCII control bytes < 0x20",
            "                    ASCII control bytes < 0x09 other than the "
            "whitespace")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte threshold in production <key-char>", out)
        self.assertIn("expected 0x20, found 0x09", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)

    def test_semi_formal_dq_char_control_threshold_mutated_fails(self):
        # Same threshold mutation in the OTHER hosting production,
        # <dq-char> ("... control bytes < 0x20 other than tab/VT/FF, ...").
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    < 0x20",
            "                    < 0x09 other than tab/VT/FF, DEL (0x7F), "
            "LF, CR,")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte threshold in production <dq-char>", out)
        self.assertIn("expected 0x20, found 0x09", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)

    def test_semi_formal_key_char_tab_codepoint_mutated_fails(self):
        # ONLY the tab pairing's codepoint changes ("tab 0x09" ->
        # "tab 0x20"); the threshold is untouched. The absolute check
        # must fire and name the exact defect; the compound-pair check
        # stays silent ("tab" is not one of its five Latin names).
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    members (tab 0x09,",
            "                    members (tab 0x20, VT 0x0B, FF 0x0C — "
            "LF 0x0A and")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("tab codepoint in production <key-char>", out)
        self.assertIn("expected 0x09, found 0x20", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)

    def test_semi_formal_review_adversarial_threshold_tab_swap_fails_both_new_checks(self):
        # The review's exact false-green: swap BOTH fixed values
        # ("< 0x20 ... tab 0x09" -> "< 0x09 ... tab 0x20"). The flat
        # token multiset is IDENTICAL (one 0x20 and one 0x09 on each
        # side) and COMPOUND_ATOM_PAIR_RE matches neither the
        # '<'-anchored threshold nor the translated tab word, so BOTH
        # pre-existing detectors are structurally silent -- each new
        # absolute check must fire on its own fact, independently.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    ASCII control bytes < 0x20",
            "                    ASCII control bytes < 0x09 other than the "
            "whitespace")
        mutated = self._replace_semi_line(
            mutated,
            "                    members (tab 0x09,",
            "                    members (tab 0x20, VT 0x0B, FF 0x0C — "
            "LF 0x0A and")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte threshold in production <key-char> (en): "
            "expected 0x20, found 0x09", out)
        self.assertIn(
            "tab codepoint in production <key-char> (en): expected "
            "0x09, found 0x20", out)
        # The OLD detectors must NOT have fired: flat multiset identical
        # by construction, compound pairs untouched, all counts unchanged.
        self.assertNotIn("embedded grammar terminal mismatch", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)
        self.assertNotIn("non-blank line count mismatch", out)
        self.assertNotIn("grammar production RHS mismatch", out)
        self.assertNotIn("grammar production LHS set mismatch", out)

    def test_semi_formal_threshold_corruption_identical_in_en_and_translation_fails(self):
        # The absolute-constant payoff: apply the SAME one-sided
        # threshold corruption to EN and the translation. Every
        # cross-language comparison is definitionally blind to identical
        # corruption on both sides (flat multiset, compound pairs, all
        # counts agree), so the OLD detectors stay silent -- only the
        # fixed constant catches it. The tab pairing is untouched, so
        # the tab check must NOT fire.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    ASCII control bytes < 0x20",
            "                    ASCII control bytes < 0x09 other than the "
            "whitespace")
        en = self.write("spec.md", semi_doc(mutated))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte threshold in production <key-char> (en): "
            "expected 0x20, found 0x09", out)
        self.assertNotIn("tab codepoint in production", out)
        self.assertNotIn("embedded grammar terminal mismatch", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)

    # -- unit tests: extract_embedded_tokens / significant_grammar_tokens --

    def test_extract_embedded_tokens_returns_all_matches_in_order(self):
        # Terminals AND language-independent atoms interleaved in a
        # specific known order: the returned list must follow real source
        # positions, not "all grammar matches first, all atom matches
        # after" (the pre-round-19 behavior that broke the ordered
        # contract whenever the two token classes interleaved).
        text = '(ws) "##" 0x09 <dq-char> VT then (DEL (0x7F)) here'
        self.assertEqual(
            ctp.extract_embedded_tokens(text),
            ["(ws)", '"##"', "0x09", "<dq-char>", "VT",
             "(", "DEL", "(", "0x7F", ")", ")"])

    def test_significant_grammar_tokens_filters_prose_artifacts(self):
        text = (r'(ws) "##" <dq-char> ( and ) "\." '
                '"(" "first name: alice"')
        sig = ctp.significant_grammar_tokens(text)
        # Bare parens dropped; the letter/space-bearing example-scalar
        # quote dropped; normative terminals kept.
        self.assertIn('"##"', sig)
        self.assertIn('"\\."', sig)
        self.assertIn("<dq-char>", sig)
        self.assertIn("(ws)", sig)
        self.assertIn('"("', sig)
        self.assertNotIn("(", sig)
        self.assertNotIn(")", sig)
        self.assertNotIn('"first name: alice"', sig)

    def test_significant_grammar_tokens_includes_language_independent_atoms(self):
        text = '< 0x20 other than tab/VT/FF, DEL (0x7F), LF, CR,'
        sig = ctp.significant_grammar_tokens(text)
        self.assertEqual(
            sorted(sig),
            sorted(["0x20", "VT", "FF", "DEL", "0x7F", "LF", "CR"]))
        # "tab" is deliberately excluded (legitimately translated prose).
        self.assertNotIn("tab", sig)

    def test_extract_compound_atoms_captures_pairs_and_normalizes_case(self):
        text = '< 0x20 other than tab/VT/FF, DEL (0x7f), LF 0x0A and CR 0x0d,'
        self.assertEqual(
            ctp.extract_compound_atoms(text),
            [("DEL", "0x7F"), ("LF", "0x0A"), ("CR", "0x0D")])

    def test_extract_compound_atoms_ignores_bare_name_mentions(self):
        # A name with no adjacent hex value carries no pairing obligation
        # (e.g. the forward reference "LF, CR" in <dq-char>): not captured.
        text = 'tab/VT/FF, DEL (0x7F), LF, CR, and "\\" (escape lead)'
        self.assertEqual(ctp.extract_compound_atoms(text), [("DEL", "0x7F")])

    def test_extract_control_thresholds_captures_and_normalizes(self):
        # '<' + optional whitespace + hex; digits upper-cased, '0x' kept.
        self.assertEqual(
            ctp.extract_control_thresholds(
                'bytes < 0x20 other than ... and <0x2a here'),
            ["0x20", "0x2A"])
        # A <nonterminal> reference is not a threshold (a letter, not
        # whitespace/hex, follows the '<').
        self.assertEqual(
            ctp.extract_control_thresholds('<dq-char> and <key-char>'), [])

    def test_extract_tab_codepoints_pairs_only_word_plus_value(self):
        # A tab word IMMEDIATELY followed by its hex value is captured
        # (per language); a bare mention with no adjacent value
        # ("tab/VT/FF" -- the real <dq-char> shape in all three
        # languages) is not.
        self.assertEqual(
            ctp.extract_tab_codepoints(
                'members (tab 0x09, VT 0x0B) or bare tab/VT/FF'),
            [("en", "0x09")])
        self.assertEqual(
            ctp.extract_tab_codepoints(
                '(табуляция 0x09, VT 0x0B — и просто табуляции/VT/FF)'),
            [("ru", "0x09")])
        self.assertEqual(
            ctp.extract_tab_codepoints(
                '制表符 0x09、VT 0x0B —— 以及 制表符/VT/FF'),
            [("zh", "0x09")])

    def test_detect_language_labels_marked_scripts(self):
        self.assertEqual(
            ctp.detect_language('ASCII bytes < 0x20 and tab'), 'en')
        self.assertEqual(
            ctp.detect_language('управляющих байтов < 0x20 (табуляция)'),
            'ru')
        self.assertEqual(
            ctp.detect_language('控制字节 < 0x20(制表符 0x09)'), 'zh')

    # -- protective real-spec test for the embedded-terminal check ----------

    def test_repository_content_pin_semi_formal_terminal_multisets_match_translations(self):
        # Self-verifying pin over the ACTUAL shipped files: for every
        # SEMI_FORMAL_PROSE_LHS production in § 4, the significant
        # embedded-terminal multiset in RU and ZH must exactly equal EN's.
        # If this ever fails, a real normative terminal drifted inside a
        # semi-formal prose RHS. Also pins specific named terminals are
        # present in EN's lists.
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        en_lines = ctp.read_lines(
            os.path.join(repo_root, "versions", "0.7", "spec.md"))
        ru_lines = ctp.read_lines(
            os.path.join(repo_root, "versions", "0.7", "spec.ru.md"))
        zh_lines = ctp.read_lines(
            os.path.join(repo_root, "versions", "0.7", "spec.zh.md"))

        def tokens_per_lhs(lines):
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["4"]
            semi = ctp.extract_semi_formal_rhs(lines, start, end, excluded)
            self.assertEqual(set(semi), ctp.SEMI_FORMAL_PROSE_LHS)
            return {lhs: sorted(ctp.significant_grammar_tokens(rhs))
                    for lhs, rhs in semi.items()}

        en = tokens_per_lhs(en_lines)
        ru = tokens_per_lhs(ru_lines)
        zh = tokens_per_lhs(zh_lines)
        for lhs in sorted(en):
            self.assertEqual(ru[lhs], en[lhs], "RU drift in %s" % lhs)
            self.assertEqual(zh[lhs], en[lhs], "ZH drift in %s" % lhs)
        # Named terminals present in EN's lists.
        self.assertIn('"."', en["<unescaped-dot>"])
        self.assertIn('"\\\\"', en["<unescaped-dot>"])
        self.assertIn("<key-char>", en["<non-quote-key-char>"])
        for q in ('"\\""', '"\'"', '"`"'):
            self.assertIn(q, en["<non-quote-key-char>"])
        self.assertIn('"\\\\"', en["<dq-char>"])
        self.assertIn('"\\""', en["<dq-char>"])
        for t in ('","', '"}"', '"]"'):
            self.assertIn(t, en["<inline-scalar>"])
        self.assertEqual(
            sorted(en["<inline-raw-scalar>"]),
            sorted([
                '","', '"}"', '"]"', '"{"', '"["',
                '<line-end>', '<inline-value>', '<inline-scalar>',
            ]))
        for t in ('")"', '"))"', "<multiline>"):
            self.assertIn(t, en["<multiline-content-line>"])

    def test_repository_content_pin_semi_formal_compound_atom_pairs_match_translations(self):
        # Compound companion to the test above, over the ACTUAL shipped
        # files: for every SEMI_FORMAL_PROSE_LHS production in § 4, the
        # multiset of (control-byte name, hex code point) pairs in RU and
        # ZH must exactly equal EN's. If this ever fails, a translation
        # re-paired a label with the wrong byte (e.g. LF/CR codepoints
        # swapped) while keeping the flat token multiset intact.
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        per_file = {}
        for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
            lines = ctp.read_lines(
                os.path.join(repo_root, "versions", "0.7", name))
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["4"]
            semi = ctp.extract_semi_formal_rhs(lines, start, end, excluded)
            per_file[name] = {
                lhs: sorted(ctp.extract_compound_atoms(rhs))
                for lhs, rhs in semi.items()}
        en_pairs = per_file["spec.md"]
        for lhs in sorted(ctp.SEMI_FORMAL_PROSE_LHS):
            for other in ("spec.ru.md", "spec.zh.md"):
                self.assertEqual(
                    per_file[other].get(lhs, []), en_pairs.get(lhs, []),
                    "%s compound-pair drift in %s" % (other, lhs))
        # The <key-char> production carries the full association set.
        en_key = en_pairs["<key-char>"]
        for pair in [("LF", "0x0A"), ("CR", "0x0D"), ("VT", "0x0B"),
                     ("FF", "0x0C"), ("DEL", "0x7F")]:
            self.assertIn(pair, en_key)

    def test_repository_content_pin_fixed_threshold_and_tab_constants_hold(self):
        # Positive pin over the ACTUAL shipped EN/RU/ZH files (round-20
        # finding 2): wherever the '<'-anchored control-byte threshold
        # occurs in a semi-formal production it is 0x20, and wherever a
        # tab word is stated with its code point it is 0x09. The exact
        # occurrence shapes are pinned per production so a future edit
        # that DROPS the pattern (instead of corrupting it) is noticed
        # here too: <dq-char> carries exactly one threshold and a bare
        # (value-less) tab mention; <key-char> carries exactly one
        # threshold and exactly one tab pairing, per language.
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        tab_lang = {"spec.md": "en", "spec.ru.md": "ru", "spec.zh.md": "zh"}
        for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
            lines = ctp.read_lines(
                os.path.join(repo_root, "versions", "0.7", name))
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["4"]
            semi = ctp.extract_semi_formal_rhs(lines, start, end, excluded)
            for lhs, rhs in semi.items():
                for hexval in ctp.extract_control_thresholds(rhs):
                    self.assertEqual(
                        hexval, "0x20",
                        "%s %s: threshold" % (name, lhs))
                for lang, hexval in ctp.extract_tab_codepoints(rhs):
                    self.assertEqual(
                        (lang, hexval), (tab_lang[name], "0x09"),
                        "%s %s: tab pairing" % (name, lhs))
            self.assertEqual(
                ctp.extract_control_thresholds(semi["<key-char>"]), ["0x20"])
            self.assertEqual(
                ctp.extract_tab_codepoints(semi["<key-char>"]),
                [(tab_lang[name], "0x09")])
            self.assertEqual(
                ctp.extract_control_thresholds(semi["<dq-char>"]), ["0x20"])
            self.assertEqual(
                ctp.extract_tab_codepoints(semi["<dq-char>"]), [])

    # -- stdout encoding safety ----------------------------------------------

    def test_non_utf8_stdout_does_not_crash_on_non_ascii_output(self):
        # Regression test for a UnicodeEncodeError crash on Windows
        # consoles (cp1252 etc.): an echoed non-ASCII fragment (here, a
        # stray Chinese front-matter line) must not blow up main() when
        # stdout is a non-UTF-8-encoded stream; it must still print a
        # normal [FAIL] line. io.StringIO (used by run_main() above) has
        # no console encoding at all, so it cannot reproduce this bug —
        # this test drives main() against a real ascii-encoded text
        # stream instead.
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md", ZH_DOC_OK.replace(
            "**日期:**(未发布 —— 草案)\n",
            "**日期:**(未发布 —— 草案)\n这是未翻译的多余段落。\n"))
        buf = io.BytesIO()
        ascii_stdout = io.TextIOWrapper(buf, encoding="ascii", errors="strict")
        with contextlib.redirect_stdout(ascii_stdout):
            code = ctp.main([en, ru, zh])
        ascii_stdout.flush()
        out = buf.getvalue().decode("utf-8", errors="replace")
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("unexpected content line", out)


if __name__ == "__main__":
    unittest.main()
