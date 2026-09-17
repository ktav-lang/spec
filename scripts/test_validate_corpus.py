#!/usr/bin/env python3
"""Mutation and happy-path tests for scripts/validate_corpus.py.

Each test builds a minimal throwaway corpus in a system temp directory,
runs the validator's main() in-process, and asserts the verdict:
mutation tests (reproducing the review-round false-green findings) must
FAIL with a message naming the specific problem; happy-path tests must
PASS.

Run:  python scripts/test_validate_corpus.py
"""

import unittest

from test_validate_corpus import CorpusTestCase

__all__ = ["CorpusTestCase"]

if __name__ == "__main__":
    unittest.main()
