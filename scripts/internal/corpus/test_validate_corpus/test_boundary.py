"""Boundary manifest, tests-dir, and JSON pointer tests."""
import json
import os
import subprocess
import unittest

import validate_corpus


class BoundaryTests:
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
        for fixture in ("alpha", "beta"):
            self.write("tests/valid/%s.ktav" % fixture,
                       "overflow: 9223372036854775808\n")
            self.write("tests/valid/%s.json" % fixture,
                       '{"overflow": "9223372036854775808"}')
            self.write("tests/valid/%s.canonical.ktav" % fixture,
                       "overflow:: 9223372036854775808\n")
        leaves = [
            {"fixture": "alpha", "path": "/overflow", "boundary_class": "integer_range"},
            {"fixture": "beta", "path": "/overflow", "boundary_class": "integer_range"},
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

    def test_boundary_manifest_lock_invalid_utf8_is_aggregated(self):
        tests, _leaves = self.build_two_leaf_corpus()
        lock_path = os.path.join(self.tmp, "lock", "boundary-invalid-utf8.json")
        os.makedirs(os.path.dirname(lock_path), exist_ok=True)
        with open(lock_path, "wb") as stream:
            stream.write(b"[\x80]\n")
        code, out = self.run_main(tests, "--boundary-manifest-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("[FAIL] boundary-fixtures.json", out)
        self.assertIn("--boundary-manifest-lock", out)
        self.assertIn("unreadable", out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertNotIn("Traceback", out)

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

    def test_boundary_manifest_requires_real_object_field_boundary(self):
        tests = self.build_full()
        self.write("tests/valid/boundary.ktav",
                   "overflow: 9223372036854775808\ngroup: {}\n")
        self.write("tests/valid/boundary.json",
                   '{"overflow": "9223372036854775808", "group": {}}')
        self.write("tests/valid/boundary.canonical.ktav",
                   "overflow:: 9223372036854775808\ngroup: {}\n")
        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "boundary", "path": "/overflow",
                "boundary_class": "float_range",
            }]
        }))
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("does not prove boundary_class 'float_range'", out)

        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "boundary", "path": "/group",
                "boundary_class": "integer_range",
            }]
        }))
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("must identify a scalar field of an Object", out)

    def test_boundary_manifest_accepts_only_matching_numeric_classes(self):
        tests = self.build_minimal()
        cases = [
            ("integer", "overflow: 9223372036854775808\n",
             '{"overflow": "9223372036854775808"}',
             "integer_range"),
            ("range", "overflow: 1e9999\n",
             '{"overflow": "1e9999"}', "float_range"),
            ("underflow", "underflow: -1e-9999\n",
             '{"underflow": -0.0}', "float_underflow"),
            ("precision", "tie: 9007199254740993.0\n",
             '{"tie": 9007199254740992.0}', "float_precision"),
        ]
        leaves = []
        for name, source, oracle, boundary_class in cases:
            self.write("tests/valid/%s.ktav" % name, source)
            self.write("tests/valid/%s.json" % name, oracle)
            self.write("tests/valid/%s.canonical.ktav" % name, source)
            key = source.split(":", 1)[0]
            leaves.append({"fixture": name, "path": "/%s" % key,
                           "boundary_class": boundary_class})
        self.write("tests/boundary-fixtures.json",
                   json.dumps({"boundary_dependent_leaves": leaves}))
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 0, out)

    def test_boundary_manifest_rejects_exact_float_token_as_precision_boundary(self):
        tests = self.build_minimal()
        self.write("tests/valid/exact.ktav", "value: 3.14\n")
        self.write("tests/valid/exact.json", '{"value": 3.14}')
        self.write("tests/valid/exact.canonical.ktav", "value: 3.14\n")
        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "exact", "path": "/value",
                "boundary_class": "float_precision",
            }]
        }))
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("does not prove boundary_class 'float_precision'", out)

    def test_boundary_source_matching_rejects_non_ktav_unicode_whitespace(self):
        tests = self.build_minimal()
        hostile = "overflow:\x1c9223372036854775808\n"
        self.write("tests/valid/hostile.ktav", hostile)
        self.write("tests/valid/hostile.json",
                   '{"overflow": "9223372036854775808"}')
        self.write("tests/valid/hostile.canonical.ktav",
                   "overflow:: 9223372036854775808\n")
        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "hostile", "path": "/overflow",
                "boundary_class": "integer_range",
            }]
        }))
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("could not identify one unquoted Ktav source literal", out)

    def test_boundary_source_matching_rejects_escaped_colon_key(self):
        tests = self.build_minimal()
        self.write("tests/valid/hostile.ktav",
                   "a\\:: 9223372036854775808\n")
        self.write("tests/valid/hostile.json",
                   json.dumps({"a\\": "9223372036854775808"}))
        self.write("tests/valid/hostile.canonical.ktav",
                   "a\\:: 9223372036854775808\n")
        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "hostile", "path": "/a\\",
                "boundary_class": "integer_range",
            }]
        }))
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("could not identify one unquoted Ktav source literal", out)

    def test_boundary_fixture_rejects_nul_before_filesystem_operations(self):
        tests = self.build_full()
        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "boundary\x00", "path": "/overflow",
                "boundary_class": "integer_range",
            }]
        }))
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("contains NUL", out)
        self.assertNotIn("ValueError", out)
        self.assertNotIn("UnicodeEncodeError", out)
        self.assertNotIn("Traceback", out)

    def test_boundary_fixture_rejects_lone_surrogate_before_filesystem_operations(self):
        tests = self.build_full()
        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "boundary\ud800", "path": "/overflow",
                "boundary_class": "integer_range",
            }]
        }))
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("contains lone surrogate U+D800", out)
        self.assertNotIn("ValueError", out)
        self.assertNotIn("UnicodeEncodeError", out)
        self.assertNotIn("Traceback", out)

    def test_tests_dir_must_be_a_real_directory(self):
        regular_file = self.write("not-a-directory", "not a directory")
        code, out = self.run_main(regular_file)
        self.assertEqual(code, 2)
        self.assertIn("not a regular directory", out)

    @unittest.skipUnless(os.name == "posix", "symlinks require POSIX")
    def test_tests_dir_symlink_is_rejected_before_traversal(self):
        tests = self.build_minimal()
        link = os.path.join(self.tmp, "tests-link")
        os.symlink(tests, link, target_is_directory=True)
        code, out = self.run_main(link)
        self.assertEqual(code, 2)
        self.assertIn("symlink/junction", out)

    @unittest.skipUnless(os.name == "posix", "symlinks require POSIX")
    def test_descendant_symlink_is_pruned_from_semantic_and_inventory_scans(self):
        tests = self.build_full()
        outside = os.path.join(self.tmp, "outside")
        os.mkdir(outside)
        with open(os.path.join(outside, "outside.json"), "w", encoding="utf-8") as f:
            f.write('{"x": 1, "x": 2}')
        lock_path = self.write_corpus_lock(tests)
        os.symlink(outside, os.path.join(tests, "valid", "escape"),
                   target_is_directory=True)

        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("valid/escape: symlink directory is not allowed", out)
        self.assertNotIn("valid/escape/outside.json", out)

        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("valid/escape: symlink directory is not allowed", out)
        self.assertNotIn("valid/escape/outside.json", out)

    @unittest.skipUnless(os.name == "nt", "junctions require Windows")
    def test_descendant_junction_is_pruned_before_walk(self):
        tests = self.build_full()
        outside = os.path.join(self.tmp, "outside")
        os.mkdir(outside)
        link = os.path.join(tests, "valid", "junction")
        completed = subprocess.run(
            ["cmd", "/c", "mklink", "/J", link, outside],
            capture_output=True,
            text=True,
        )
        if completed.returncode != 0:
            self.skipTest("could not create a junction: %s" % completed.stderr)
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertRegex(out, r"valid/junction: (junction|reparse-point) directory")

    def test_boundary_record_schema_is_closed_before_lock_comparison(self):
        tests = self.build_full()
        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "boundary", "path": "/overflow",
                "boundary_class": "integer_range", "extra": True,
            }]
        }))
        lock_path = self.write("lock/boundary.json", json.dumps([{
            "fixture": [], "path": "/overflow", "boundary_class": "integer_range"
        }]))
        code, out = self.run_main(tests, "--boundary-manifest-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("unexpected field(s)", out)
        self.assertIn("'fixture' must be a string", out)
        self.assertNotIn("Traceback", out)

    def test_json_pointer_array_index_uses_ascii_grammar_without_value_error(self):
        for pointer in ("/\u0660", "/" + "9" * 5000):
            with self.subTest(pointer=pointer):
                node, error = validate_corpus.resolve_pointer(["value"], pointer)
                self.assertIsNone(node)
                self.assertIsInstance(error, str)

    # -- full corpus SHA-256 lock and closed top level -------------------

