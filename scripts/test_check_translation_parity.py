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


class TranslationParityTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="ktav-parity-test-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def write(self, name, text):
        path = os.path.join(self.tmp, name)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        return path

    def run_main(self, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = ctp.main(list(args))
        return code, out.getvalue()

    def assert_no_fail_lines_for(self, out, *paths):
        for path in paths:
            bad = [l for l in out.splitlines()
                   if path in l and "[FAIL]" in l]
            self.assertEqual(bad, [])

    # -- happy path -----------------------------------------------------

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

    def test_real_spec_grammar_has_no_malformed_productions(self):
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
        self.assertEqual(len(lhs_set), 38)
        self.assertEqual(len(productions), 28)
        self.assertEqual(lhs_set - set(productions), ctp.SEMI_FORMAL_PROSE_LHS)

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
