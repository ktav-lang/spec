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
        """Minimal corpus + both writer-failure categories + boundary manifest."""
        tests = self.build_minimal(root)
        self.write(root + "/unrepresentable/nan.json",
                   '{"value": {"f": {"$float": "NaN"}}, '
                   '"unrepresentable_reason": "NonFiniteFloat", '
                   '"note": "not representable"}')
        self.write(root + "/parseable-unrepresentable/nan.ktav", "{f: a\\rb}")
        self.write(root + "/parseable-unrepresentable/nan.json",
                   '{"value": {"f": "a\\rb"}, '
                   '"unrepresentable_reason": "CRByte", '
                   '"note": "parser-produced writer failure"}')
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

    # -- unrepresentable schema and recursive reason witnesses -----------

    def test_unrepresentable_reason_witnesses_are_recursive(self):
        tests = self.build_minimal()
        values = {
            "ScalarRoot": 42,
            "EmptyKeyName": {"nested": [{"": "v"}]},
            "NonFiniteFloat": {"nested": [{"f": {"$float": "NaN"}}]},
            "CRByte": {"nested": [{"s": "a\rb"}]},
            "BothFormsRequired": {"nested": [{"s": "))\n)"}]},
            "TrailingWhitespaceCollision": {"nested": [{"s": "))\nx "}]},
            "LeadingWhitespaceCollision": {"nested": [{"s": " ))\n x"}]},
        }
        for index, (reason, value) in enumerate(values.items()):
            self.write("tests/unrepresentable/%02d.json" % index,
                       json.dumps({"value": value,
                                   "unrepresentable_reason": reason,
                                   "note": "recursive witness"}))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    def test_unrepresentable_null_nonfinite_false_green_rejected(self):
        tests = self.build_minimal()
        self.write("tests/unrepresentable/bad.json",
                   '{"value": null, "unrepresentable_reason": '
                   '"NonFiniteFloat", "note": "wrong witness"}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("does not contain a recursive witness", out)

    def test_root_float_sentinel_uses_scalar_root_precedence(self):
        tests = self.build_minimal()
        value = {"$float": "NaN"}
        self.write("tests/unrepresentable/root_nonfinite.json",
                   json.dumps({"value": value,
                               "unrepresentable_reason": "NonFiniteFloat",
                               "note": "root float sentinel"}))
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("does not contain a recursive witness", out)

        self.write("tests/unrepresentable/root_nonfinite.json",
                   json.dumps({"value": value,
                               "unrepresentable_reason": "ScalarRoot",
                               "note": "root float sentinel"}))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    def test_multiline_collision_requires_common_prefix_from_position_zero(self):
        tests = self.build_minimal()
        self.write("tests/unrepresentable/non_common_prefix.json",
                   json.dumps({
                       "value": {"s": " \t))\n\t\tx"},
                       "unrepresentable_reason": "LeadingWhitespaceCollision",
                       "note": "matching whitespace after a differing first position",
                   }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("does not contain a recursive witness", out)

    def test_unrepresentable_exact_schema_and_sentinel_shape(self):
        tests = self.build_minimal()
        self.write("tests/unrepresentable/bad.json",
                   '{"value": {"f": {"$float": "NaN", "extra": 1}}, '
                   '"unrepresentable_reason": "NonFiniteFloat", '
                   '"note": "bad", "extra": false}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("unexpected field(s)", out)
        self.assertIn("'$float' must be the only field", out)

    def test_parseable_unrepresentable_is_a_pair_without_canonical_output(self):
        tests = self.build_minimal()
        self.write("tests/parseable-unrepresentable/case.ktav", "{s: ))\\n)}")
        self.write("tests/parseable-unrepresentable/case.json",
                   '{"value": {"s": "))\\n)"}, '
                   '"unrepresentable_reason": "BothFormsRequired", '
                   '"note": "parseable"}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)
        self.write("tests/parseable-unrepresentable/case.canonical.ktav", "")
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("canonical output is not allowed", out)

    # -- closed set is version-specific ---------------------------------

    def write_invalid_utf8_fixture(self, root, name="bad_utf8"):
        """A well-formed invalid/invalid_utf8/ fixture: genuinely invalid
        UTF-8 bytes paired with expected_error 'InvalidUtf8', satisfying the
        bidirectional oracle-consistency check regardless of category
        acceptance (which varies by version)."""
        ktav_path = os.path.join(self.tmp, *root.split("/"),
                                  "invalid", "invalid_utf8", name + ".ktav")
        os.makedirs(os.path.dirname(ktav_path), exist_ok=True)
        with open(ktav_path, "wb") as f:
            f.write(b"\xff")
        self.write("%s/invalid/invalid_utf8/%s.json" % (root, name),
                   '{"expected_error": "InvalidUtf8"}')

    def test_error_categories_version_specific(self):
        with self.subTest(layout="default layout accepts 0.7 categories"):
            tests = self.build_minimal()
            self.write_invalid_utf8_fixture("tests")
            code, out = self.run_main(tests)
            self.assertEqual(code, 0, out)
        with self.subTest(layout="versions/0.6 rejects InvalidUtf8"):
            root = "versions/0.6/tests"
            tests = self.build_minimal(root=root)
            self.write_invalid_utf8_fixture(root)
            code, out = self.run_main(tests)
            self.assertEqual(code, 1)
            self.assertIn("InvalidUtf8", out)

    # -- bug 1/2: invalid_utf8 exemption/expected_error is not cross-checked --

    def test_invalid_utf8_valid_bytes_but_expected_error_says_invalid_rejected(self):
        # Ordinary valid-UTF-8 bytes, but the sibling .json still claims
        # expected_error: "InvalidUtf8" -- must FAIL, not silently pass.
        tests = self.build_minimal()
        ktav_path = os.path.join(tests, "invalid", "invalid_utf8", "bad_utf8.ktav")
        os.makedirs(os.path.dirname(ktav_path), exist_ok=True)
        with open(ktav_path, "w", encoding="utf-8", newline="\n") as f:
            f.write("key: value\n")
        self.write("tests/invalid/invalid_utf8/bad_utf8.json",
                   '{"expected_error": "InvalidUtf8"}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("invalid_utf8 oracle consistency", out)
        self.assertIn("actually valid UTF-8", out)

    def test_invalid_utf8_genuinely_invalid_bytes_but_wrong_expected_error_rejected(self):
        # Genuinely invalid UTF-8 bytes, but the sibling .json declares some
        # other expected_error -- must FAIL, not silently pass.
        tests = self.build_minimal()
        ktav_path = os.path.join(tests, "invalid", "invalid_utf8", "bad_utf8.ktav")
        os.makedirs(os.path.dirname(ktav_path), exist_ok=True)
        with open(ktav_path, "wb") as f:
            f.write(b"\xff")
        self.write("tests/invalid/invalid_utf8/bad_utf8.json",
                   '{"expected_error": "MissingSeparatorSpace"}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("invalid_utf8 oracle consistency", out)
        self.assertIn("not valid UTF-8", out)
        self.assertIn("MissingSeparatorSpace", out)

    def test_invalid_utf8_oracle_check_applies_outside_invalid_utf8_dir(self):
        # The invariant is about the data/oracle agreeing, not about
        # directory naming -- a fixture elsewhere under invalid/ with
        # invalid bytes and the wrong expected_error must also be caught.
        tests = self.build_minimal()
        ktav_path = os.path.join(tests, "invalid", "elsewhere.ktav")
        with open(ktav_path, "wb") as f:
            f.write(b"\xff")
        self.write("tests/invalid/elsewhere.json",
                   '{"expected_error": "MissingSeparator"}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("invalid_utf8 oracle consistency", out)
        self.assertIn("elsewhere.ktav", out)

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
            if cat == "InvalidUtf8":
                # Must have genuinely invalid UTF-8 bytes to satisfy the
                # invalid_utf8 oracle-consistency check too.
                self.write_invalid_utf8_fixture(root, name="bad%02d" % i)
                continue
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

    # -- bug 3: --boundary-manifest-lock catches a silently deleted entry --

    def build_two_leaf_corpus(self):
        """Minimal corpus + boundary manifest with two entries (alpha, beta)."""
        tests = self.build_minimal()
        self.write("tests/valid/beta.ktav", KTAV_DOC)
        self.write("tests/valid/beta.json", ALPHA_JSON)
        self.write("tests/valid/beta.canonical.ktav", KTAV_DOC)
        leaves = [
            {"fixture": "alpha", "path": "/host", "boundary_class": "integer_range"},
            {"fixture": "beta", "path": "/port", "boundary_class": "integer_range"},
        ]
        self.write("tests/boundary-fixtures.json",
                   json.dumps({"boundary_dependent_leaves": leaves}))
        return tests, leaves

    def test_boundary_manifest_lock_happy_path(self):
        tests, leaves = self.build_two_leaf_corpus()
        lock_path = self.write("lock/boundary-fixtures.lock.json", json.dumps(leaves))
        code, out = self.run_main(tests, "--boundary-manifest-lock", lock_path)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

    def test_boundary_manifest_lock_catches_deleted_entry(self):
        tests, leaves = self.build_two_leaf_corpus()
        lock_path = self.write("lock/boundary-fixtures.lock.json", json.dumps(leaves))
        # Silently delete the 'beta' entry from the corpus's manifest only;
        # the lock file (the expected inventory) still has both.
        self.write("tests/boundary-fixtures.json",
                   json.dumps({"boundary_dependent_leaves": [leaves[0]]}))
        code, out = self.run_main(tests, "--boundary-manifest-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("missing from", out)
        self.assertIn("beta", out)

    def test_boundary_manifest_lock_off_by_default(self):
        # Without the flag, a deleted entry with no other required checks
        # engaged is not caught -- this documents the flag is opt-in.
        tests, leaves = self.build_two_leaf_corpus()
        self.write("tests/boundary-fixtures.json",
                   json.dumps({"boundary_dependent_leaves": [leaves[0]]}))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    # -- corpus inventory lock catches fixture deletion ------------------

    def test_corpus_inventory_lock_catches_deleted_fixture(self):
        tests = self.build_minimal()
        self.write("tests/valid/beta.ktav", KTAV_DOC)
        self.write("tests/valid/beta.json", ALPHA_JSON)
        self.write("tests/valid/beta.canonical.ktav", KTAV_DOC)
        lock = {
            "version": "0.7.0",
            "valid": ["alpha", "beta"],
            "invalid": ["bad"],
            "unrepresentable": [],
            "parseable_unrepresentable": [],
        }
        lock_path = self.write("lock/corpus-inventory.0.7.lock.json",
                               json.dumps(lock))
        for suffix in (".ktav", ".json", ".canonical.ktav"):
            os.remove(os.path.join(tests, "valid", "beta" + suffix))
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("corpus inventory lock", out)
        self.assertIn("beta", out)

    def test_corpus_inventory_lock_happy_path(self):
        tests = self.build_minimal()
        lock = {
            "version": "0.7.0",
            "valid": ["alpha"],
            "invalid": ["bad"],
            "unrepresentable": [],
            "parseable_unrepresentable": [],
        }
        lock_path = self.write("lock/corpus-inventory.0.7.lock.json",
                               json.dumps(lock))
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

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
        lock_path = self.write(
            "lock/corpus-inventory.0.7.lock.json",
            json.dumps({
                "version": "0.7.0",
                "valid": ["alpha"],
                "invalid": ["bad"],
                "unrepresentable": ["nan"],
                "parseable_unrepresentable": ["nan"],
            }),
        )
        code, out = self.run_main(tests, "--require-unrepresentable",
                                  "--require-boundary",
                                  "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[SKIP]", out)
        self.assertNotIn("[FAIL]", out)


if __name__ == "__main__":
    unittest.main()
