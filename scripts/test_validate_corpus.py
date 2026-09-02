#!/usr/bin/env python3
"""Mutation and happy-path tests for scripts/validate_corpus.py.

Each test builds a minimal throwaway corpus in a system temp directory,
runs the validator's main() in-process, and asserts the verdict:
mutation tests (reproducing the review-round false-green findings) must
FAIL with a message naming the specific problem; happy-path tests must
PASS.

Run:  python scripts/test_validate_corpus.py
"""

import contextlib
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import validate_corpus

KTAV_DOC = "host: localhost\nport: 8080\n"
ALPHA_JSON = '{"host": "localhost", "port": 8080}'


class CorpusTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="ktav-corpus-test-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    # -- corpus builders ---------------------------------------------

    def write(self, relpath, text):
        path = os.path.join(self.tmp, *relpath.split("/"))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        return path

    def build_minimal(self, root="tests"):
        """valid/ triple + invalid/ pair; no unrepresentable/, no manifest."""
        self.write(root + "/valid/alpha.ktav", KTAV_DOC)
        self.write(root + "/valid/alpha.json", ALPHA_JSON)
        self.write(root + "/valid/alpha.canonical.ktav", KTAV_DOC)
        self.write(root + "/invalid/bad.ktav", "host localhost\n")
        self.write(root + "/invalid/bad.json",
                   '{"expected_error": "MissingSeparator"}')
        return os.path.join(self.tmp, *root.split("/"))

    def build_full(self, root="tests"):
        """Minimal corpus + unrepresentable/ + boundary manifest."""
        tests = self.build_minimal(root)
        self.write(root + "/unrepresentable/nan.json",
                   '{"value": null, "note": "not representable", '
                   '"unrepresentable_reason": "NonFiniteFloat"}')
        self.write(root + "/boundary-fixtures.json", json.dumps(
            {"boundary_dependent_leaves": [
                {"fixture": "alpha", "path": "/host",
                 "boundary_class": "integer_range"}]}))
        return tests

    def run_main(self, tests_dir, *flags):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = validate_corpus.main([tests_dir] + list(flags))
        return code, out.getvalue()

    # -- mutation 1: NaN/Infinity in a JSON oracle --------------------

    def test_mutation_1_nonfinite_json_constant_rejected(self):
        tests = self.build_minimal()
        for text in ('{"x": NaN}', '{"x": Infinity}', '{"x": -Infinity}'):
            with self.subTest(json_text=text):
                self.write("tests/valid/alpha.json", text)
                code, out = self.run_main(tests)
                self.assertEqual(code, 1)
                self.assertIn("OVERALL: FAIL", out)
                self.assertIn(text.split()[1].rstrip("}"), out)
                self.assertIn("strict JSON", out)

    # -- mutation 2: duplicate JSON keys -------------------------------

    def test_mutation_2_duplicate_json_key_rejected(self):
        tests = self.build_minimal()
        self.write("tests/valid/alpha.json", '{"x": 1, "x": 2}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("duplicate object key 'x'", out)

    # -- mutation 3: unknown expected_error ----------------------------

    def test_mutation_3_unknown_expected_error_rejected(self):
        tests = self.build_minimal()
        self.write("tests/invalid/bad.json",
                   '{"expected_error": "TypoCategory"}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("unknown 'expected_error'", out)
        self.assertIn("TypoCategory", out)
        self.assertIn("must be one of", out)

    # -- closed set is version-specific ---------------------------------

    def test_error_categories_version_specific(self):
        with self.subTest(layout="default layout accepts 0.7 categories"):
            tests = self.build_minimal()
            self.write("tests/invalid/bad.json",
                       '{"expected_error": "InvalidUtf8"}')
            code, out = self.run_main(tests)
            self.assertEqual(code, 0, out)
        with self.subTest(layout="versions/0.6 rejects InvalidUtf8"):
            tests = self.build_minimal(root="versions/0.6/tests")
            self.write("versions/0.6/tests/invalid/bad.json",
                       '{"expected_error": "InvalidUtf8"}')
            code, out = self.run_main(tests)
            self.assertEqual(code, 1)
            self.assertIn("InvalidUtf8", out)

    def test_all_v06_categories_accepted_in_06_layout(self):
        root = "versions/0.6/tests"
        tests = self.build_minimal(root)
        for i, cat in enumerate(sorted(validate_corpus.ERROR_CATEGORIES_V0_6)):
            self.write("%s/invalid/bad%02d.ktav" % (root, i),
                       "host localhost\n")
            self.write("%s/invalid/bad%02d.json" % (root, i),
                       json.dumps({"expected_error": cat}))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    def test_all_v07_categories_accepted_in_07_layout(self):
        root = "versions/0.7/tests"
        tests = self.build_minimal(root)
        for i, cat in enumerate(sorted(validate_corpus.ERROR_CATEGORIES_V0_7)):
            self.write("%s/invalid/bad%02d.ktav" % (root, i),
                       "host localhost\n")
            self.write("%s/invalid/bad%02d.json" % (root, i),
                       json.dumps({"expected_error": cat}))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    # -- mutation 4: empty boundary_dependent_leaves --------------------

    def test_mutation_4_empty_boundary_manifest_rejected_when_required(self):
        tests = self.build_full()
        self.write("tests/boundary-fixtures.json",
                   '{"boundary_dependent_leaves": []}')
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("'boundary_dependent_leaves' must not be empty", out)

    def test_empty_boundary_manifest_without_flag_still_passes(self):
        tests = self.build_full()
        self.write("tests/boundary-fixtures.json",
                   '{"boundary_dependent_leaves": []}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    # -- mutation 5: missing unrepresentable/ / manifest -----------------

    def test_mutation_5_missing_mandatory_items_rejected_when_required(self):
        tests = self.build_minimal()  # has neither unrepresentable/ nor manifest
        code, out = self.run_main(tests, "--require-unrepresentable",
                                  "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("unrepresentable/ directory not present (required)",
                      out)
        self.assertIn("boundary-fixtures.json not present (required)", out)

    def test_missing_optional_items_skip_without_flags(self):
        tests = self.build_minimal()
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)
        self.assertIn("[SKIP] unrepresentable/: directory not present", out)
        self.assertIn("[SKIP] boundary-fixtures.json: file not present", out)

    # -- mutation 6: fixture path traversal ------------------------------

    def test_mutation_6_fixture_path_traversal_rejected(self):
        cases = [
            ("../invalid/unclosed/array", "plain name segments"),
            ("..\\invalid\\unclosed", "plain name segments"),
            ("/etc/passwd", "plain name segments"),
            ("./alpha", "plain name segments"),
            ("sub/../../alpha", "plain name segments"),
        ]
        if os.name == "nt":
            cases.append(("C:/Windows/notepad.exe", "resolves outside"))
        tests = self.build_full()
        for fixture, marker in cases:
            with self.subTest(fixture=fixture):
                manifest = json.dumps({"boundary_dependent_leaves": [
                    {"fixture": fixture, "path": "/host",
                     "boundary_class": "integer_range"}]})
                self.write("tests/boundary-fixtures.json", manifest)
                code, out = self.run_main(tests, "--require-unrepresentable",
                                          "--require-boundary")
                self.assertEqual(code, 1)
                self.assertIn("OVERALL: FAIL", out)
                self.assertIn(repr(fixture), out)
                self.assertIn(marker, out)

    def test_symlink_escape_rejected(self):
        if os.name != "posix":
            self.skipTest("needs POSIX symlinks")
        tests = self.build_full()
        os.symlink(self.tmp, os.path.join(tests, "valid", "link"),
                   target_is_directory=True)
        manifest = json.dumps({"boundary_dependent_leaves": [
            {"fixture": "link/alpha", "path": "/host",
             "boundary_class": "integer_range"}]})
        self.write("tests/boundary-fixtures.json", manifest)
        code, out = self.run_main(tests, "--require-unrepresentable",
                                  "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("resolves outside", out)

    # -- happy paths ------------------------------------------------------

    def test_happy_path_minimal_corpus_passes(self):
        tests = self.build_minimal()
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertIn("expected_error OK", out)

    def test_happy_path_full_corpus_passes_with_flags(self):
        tests = self.build_full()
        code, out = self.run_main(tests, "--require-unrepresentable",
                                  "--require-boundary")
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[SKIP]", out)
        self.assertNotIn("[FAIL]", out)


if __name__ == "__main__":
    unittest.main()
