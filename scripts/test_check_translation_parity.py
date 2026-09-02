#!/usr/bin/env python3
"""Tests for scripts/check_translation_parity.py.

Each test builds tiny synthetic EN/translation files in a temp directory,
runs the checker's main() in-process, and asserts the verdict: happy-path
files must PASS; files with a dropped MUST-NOT sentence, a missing
section, or a missing code block must FAIL naming the specific problem.

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

EN_DOC = """# Spec

## 1. Introduction

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

# RU translation identical in structure/counts to EN_DOC (text content
# differs, but that's fine: this is a structural, not linguistic, check).
RU_DOC_OK = """# Спецификация

## 1. Введение

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


if __name__ == "__main__":
    unittest.main()
