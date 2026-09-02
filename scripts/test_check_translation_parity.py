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
        ru = self.write("spec.ru.md", RU_DOC_OK)
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


if __name__ == "__main__":
    unittest.main()
