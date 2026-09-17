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

import unittest

from test_check_translation_parity import TranslationParityTestCase

__all__ = ["TranslationParityTestCase"]

if __name__ == "__main__":
    unittest.main()
