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
import hashlib
import io
import json
import os
import shutil
import subprocess
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
        self.write(root + "/valid/boundary.ktav", "overflow: 9223372036854775808\n")
        self.write(root + "/valid/boundary.json",
                   '{"overflow": "9223372036854775808"}')
        self.write(root + "/valid/boundary.canonical.ktav",
                   "overflow:: 9223372036854775808\n")
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
                {"fixture": "boundary", "path": "/overflow",
                 "boundary_class": "integer_range"}]}))
        return tests

    def run_main(self, tests_dir, *flags):
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            code = validate_corpus.main([tests_dir] + list(flags))
        return code, out.getvalue()

    def write_corpus_lock(self, tests_dir, relpath="lock/corpus.json",
                          version="0.7.0"):
        files = {}
        profile = validate_corpus.CORPUS_LAYOUT_PROFILES[version]
        for dirname in sorted(profile["directories"]):
            directory = os.path.join(tests_dir, dirname)
            for root, _dirs, names in os.walk(directory):
                for name in names:
                    path = os.path.join(root, name)
                    rpath = os.path.relpath(path, tests_dir).replace(os.sep, "/")
                    with open(path, "rb") as stream:
                        files[rpath] = hashlib.sha256(stream.read()).hexdigest()
        for filename in sorted(profile["files"]):
            path = os.path.join(tests_dir, filename)
            if os.path.isfile(path):
                with open(path, "rb") as stream:
                    files[filename] = hashlib.sha256(stream.read()).hexdigest()
        return self.write(relpath, json.dumps({
            "version": version,
            "files": dict(sorted(files.items())),
        }))

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

    def assert_ascii_diagnostic(self, out):
        self.assertNotIn("Traceback", out)
        self.assertNotIn("UnicodeEncodeError", out)
        self.assertNotIn("\ud800", out)
        self.assertIn("\\ud800", out)
        out.encode("utf-8")

    def test_duplicate_lone_surrogate_key_in_corpus_is_ascii_safe(self):
        tests = self.build_minimal()
        self.write("tests/valid/alpha.json",
                   '{"\\ud800": 1, "\\ud800": 2}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assert_ascii_diagnostic(out)
        self.assertIn("duplicate object key '\\ud800'", out)

    def test_duplicate_lone_surrogate_key_in_both_lock_parsers_is_ascii_safe(self):
        tests = self.build_full()
        boundary_lock = self.write(
            "lock/boundary.json",
            '[{"fixture": "boundary", "\\ud800": 1, "\\ud800": 2, '
            '"path": "/overflow", "boundary_class": "integer_range"}]',
        )
        code, out = self.run_main(tests, "--boundary-manifest-lock", boundary_lock)
        self.assertEqual(code, 1)
        self.assert_ascii_diagnostic(out)
        self.assertIn("--boundary-manifest-lock", out)

        inventory_lock = self.write(
            "lock/inventory.json",
            '{"version": "0.7.0", "files": {}, "\\ud800": 1, '
            '"\\ud800": 2}',
        )
        code, out = self.run_main(tests, "--corpus-inventory-lock", inventory_lock)
        self.assertEqual(code, 1)
        self.assert_ascii_diagnostic(out)
        self.assertIn("--corpus-inventory-lock", out)

    def test_successful_null_oracles_are_not_treated_as_parse_failures(self):
        tests = self.build_minimal()

        self.write("tests/valid/alpha.json", "null")
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("valid/alpha.json: parser-produced Value oracle root must be "
                      "Object or Array", out)

        self.write("tests/invalid/bad.json", "null")
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("invalid/bad.json: expected_error check skipped: not a JSON "
                      "object", out)

        self.write("tests/unrepresentable/root.json", "null")
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("unrepresentable/root.json: expected a JSON object", out)

        self.write("tests/parseable-unrepresentable/root.ktav", "{s: value}")
        self.write("tests/parseable-unrepresentable/root.json", "null")
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("parseable-unrepresentable/root.json: expected a JSON object",
                      out)

        self.write("tests/boundary-fixtures.json", "null")
        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 1)
        self.assertIn("boundary-fixtures.json: root must be a JSON object", out)

    def test_integer_boundary_accepts_leading_zero_decimal_and_rejects_uppercase_prefix(
            self):
        tests = self.build_minimal()
        literal = "09223372036854775808"
        self.write("tests/valid/leading_zero.ktav",
                   "overflow: %s\n" % literal)
        self.write("tests/valid/leading_zero.json",
                   json.dumps({"overflow": literal}))
        self.write("tests/valid/leading_zero.canonical.ktav",
                   "overflow:: %s\n" % literal)
        self.write("tests/boundary-fixtures.json", json.dumps({
            "boundary_dependent_leaves": [{
                "fixture": "leading_zero", "path": "/overflow",
                "boundary_class": "integer_range",
            }]
        }))

        code, out = self.run_main(tests, "--require-boundary")
        self.assertEqual(code, 0, out)
        self.assertEqual(
            validate_corpus._parse_integer_literal(literal),
            9223372036854775808,
        )
        self.assertIsNone(validate_corpus._parse_integer_literal("0X8000000000000000"))

    def test_integer_literal_decimal_digit_limit_is_not_overflow(self):
        self.assertEqual(validate_corpus._parse_integer_literal("0" * 5000), 0)
        self.assertEqual(
            validate_corpus._parse_integer_literal("1" + "0" * 5000),
            validate_corpus.I64_MAX + 1,
        )
        self.assertEqual(
            validate_corpus._parse_integer_literal("-1" + "0" * 5000),
            validate_corpus.I64_MIN - 1,
        )

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
        }
        for index, (reason, value) in enumerate(values.items()):
            self.write("tests/unrepresentable/%02d.json" % index,
                       json.dumps({"value": value,
                                   "unrepresentable_reason": reason,
                                   "note": "recursive witness"}))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    def test_parseable_unrepresentable_reason_witnesses_are_recursive(self):
        tests = self.build_minimal()
        values = {
            "CRByte": {"nested": [{"s": "a\rb"}]},
            "BothFormsRequired": {"nested": [{"s": "))\n)"}]},
            "TrailingWhitespaceCollision": {"nested": [{"s": "))\nx "}]},
            "LeadingWhitespaceCollision": {"nested": [{"s": " ))\n x"}]},
        }
        for index, (reason, value) in enumerate(values.items()):
            base = "tests/parseable-unrepresentable/%02d" % index
            self.write(base + ".ktav", "{s: value}")
            self.write(base + ".json", json.dumps({
                "value": value,
                "unrepresentable_reason": reason,
                "note": "recursive witness",
            }))
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

    def test_parser_produced_integer_oracles_enforce_i64_recursively(self):
        tests = self.build_minimal()
        self.write("tests/valid/alpha.json",
                   '{"nested": [{"too_big": 9223372036854775808}]}')
        self.write("tests/parseable-unrepresentable/large.ktav", "{s: value}")
        self.write("tests/parseable-unrepresentable/large.json", json.dumps({
            "value": {"nested": [{"too_big": 9223372036854775808,
                                     "cr": "a\rb"}]},
            "unrepresentable_reason": "CRByte",
            "note": "integer range regression",
        }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertGreaterEqual(out.count("outside the mandatory i64 range"), 2)

    def test_malformed_float_sentinel_values_fail_by_missing_witness(self):
        tests = self.build_minimal()
        for malformed in ([], {}):
            with self.subTest(value=malformed):
                self.write("tests/unrepresentable/bad.json", json.dumps({
                    "value": {"f": {"$float": malformed}},
                    "unrepresentable_reason": "NonFiniteFloat",
                    "note": "malformed sentinel",
                }))
                code, out = self.run_main(tests)
                self.assertEqual(code, 1)
                self.assertIn("does not contain a recursive witness", out)
                self.assertNotIn("'$float' must be the only field", out)
                self.assertNotIn("Traceback", out)

    def test_programmatic_float_sentinel_shape_controls_recursive_witnesses(self):
        tests = self.build_minimal()
        cases = {
            "exact_nan": ({"nested": [{"$float": "NaN"}]},
                          "NonFiniteFloat"),
            "exact_infinity": ({"nested": [{"$float": "Infinity"}]},
                               "NonFiniteFloat"),
            "exact_negative_infinity": (
                {"nested": [{"$float": "-Infinity"}]},
                "NonFiniteFloat"),
            "exact_ordinary": ({"nested": [{"$float": "ordinary"},
                                               {"": "nested"}]},
                                "EmptyKeyName"),
            "multi_field": ({"nested": [{"$float": "NaN", "extra": 1},
                                            {"": {"deep": "nested"}}]},
                             "EmptyKeyName"),
        }
        for name, (value, reason) in cases.items():
            self.write("tests/unrepresentable/%s.json" % name, json.dumps({
                "value": value,
                "unrepresentable_reason": reason,
                "note": "sentinel shape regression",
            }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    def test_programmatic_malformed_nonfinite_sentinel_fails_by_missing_witness(self):
        tests = self.build_minimal()
        self.write("tests/unrepresentable/malformed.json", json.dumps({
            "value": {"nested": [{"$float": "not-a-nonfinite-value"}]},
            "unrepresentable_reason": "NonFiniteFloat",
            "note": "malformed sentinel must remain ordinary data",
        }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("does not contain a recursive witness", out)
        self.assertNotIn("'$float' must be the only field", out)

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
        self.write("tests/parseable-unrepresentable/non_common_prefix.ktav",
                   "{s: value}")
        self.write("tests/parseable-unrepresentable/non_common_prefix.json",
                   json.dumps({
                       "value": {"s": " \t))\n\t\tx"},
                       "unrepresentable_reason": "LeadingWhitespaceCollision",
                       "note": "matching whitespace after a differing first position",
                   }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("does not contain a recursive witness", out)

    def test_multiline_collision_uses_longest_common_whitespace_prefix(self):
        tests = self.build_minimal()
        self.write("tests/parseable-unrepresentable/partial_prefix.ktav",
                   "{s: value}")
        self.write("tests/parseable-unrepresentable/partial_prefix.json",
                   json.dumps({
                       "value": {"s": "\t ))\n\t\t x"},
                       "unrepresentable_reason": "LeadingWhitespaceCollision",
                       "note": "one-character common prefix",
                   }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    def test_single_segment_trailing_collision_is_a_witness(self):
        tests = self.build_minimal()
        self.write("tests/parseable-unrepresentable/trailing.ktav", "{s: value}")
        self.write("tests/parseable-unrepresentable/trailing.json", json.dumps({
            "value": {"s": ")) "},
            "unrepresentable_reason": "TrailingWhitespaceCollision",
            "note": "single segment",
        }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    def test_single_segment_leading_collision_is_a_witness(self):
        tests = self.build_minimal()
        self.write("tests/parseable-unrepresentable/leading.ktav", "{s: value}")
        self.write("tests/parseable-unrepresentable/leading.json", json.dumps({
            "value": {"s": " ))"},
            "unrepresentable_reason": "LeadingWhitespaceCollision",
            "note": "single segment",
        }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

    def test_reason_sets_are_category_specific(self):
        tests = self.build_minimal()
        self.write("tests/unrepresentable/cr.json", json.dumps({
            "value": {"s": "a\rb"},
            "unrepresentable_reason": "CRByte",
            "note": "wrong category",
        }))
        self.write("tests/parseable-unrepresentable/nonfinite.ktav", "{f: value}")
        self.write("tests/parseable-unrepresentable/nonfinite.json", json.dumps({
            "value": {"f": {"$float": "NaN"}},
            "unrepresentable_reason": "NonFiniteFloat",
            "note": "wrong category",
        }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("CRByte", out)
        self.assertIn("NonFiniteFloat", out)

    def test_unrepresentable_exact_schema_and_sentinel_shape(self):
        tests = self.build_minimal()
        self.write("tests/unrepresentable/bad.json",
                   '{"value": {"f": {"$float": "NaN", "extra": 1}}, '
                   '"unrepresentable_reason": "NonFiniteFloat", '
                   '"note": "bad", "extra": false}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("unexpected field(s)", out)
        self.assertIn("does not contain a recursive witness", out)
        self.assertNotIn("'$float' must be the only field", out)

    def test_json_number_kind_comes_from_lexical_token(self):
        parsed = validate_corpus.loads_strict(
            '{"integer": 0, "fraction": -0.0, "exponent": 1e0}'
        )
        self.assertEqual(validate_corpus._semantic_kind(parsed["integer"]),
                         "Integer")
        self.assertEqual(validate_corpus._semantic_kind(parsed["fraction"]),
                         "Float")
        self.assertEqual(validate_corpus._semantic_kind(parsed["exponent"]),
                         "Float")

    def test_deep_value_walk_reports_deterministic_recursion_diagnostic(self):
        value = "leaf"
        for _ in range(2000):
            value = {"nested": value}
        errors, _witnesses, root_kind = validate_corpus._inspect_unrepresentable_value(
            value
        )
        self.assertIsNone(root_kind)
        self.assertIn(
            "/value: maximum recursion depth exceeded while validating JSON value",
            errors,
        )

    def test_recursion_in_main_json_scan_is_a_deterministic_failure(self):
        tests = self.build_minimal()
        deep_json = "[" * 20000 + "0" + "]" * 20000
        self.write("tests/valid/deep.json", deep_json)
        self.write("tests/valid/deep.ktav", "deep: value\n")
        self.write("tests/valid/deep.canonical.ktav", "deep: value\n")
        invalid_ktav = self.write("tests/invalid/deep.ktav", "placeholder")
        with open(invalid_ktav, "wb") as stream:
            stream.write(b"\xff")
        self.write("tests/invalid/deep.json", deep_json)
        self.assertFalse(validate_corpus._sibling_declares_invalid_utf8(
            invalid_ktav
        ))
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn(
            "valid/deep.json: invalid JSON: "
            "maximum recursion depth exceeded while parsing JSON",
            out,
        )
        self.assertNotIn("Traceback", out)

    def test_recursion_in_boundary_and_inventory_locks_is_a_diagnostic(self):
        deep_json = "[" * 20000 + "0" + "]" * 20000

        tests = self.build_full()
        boundary_lock = self.write("lock/boundary.json", deep_json)
        code, out = self.run_main(tests, "--boundary-manifest-lock", boundary_lock)
        self.assertEqual(code, 1)
        self.assertIn(
            "--boundary-manifest-lock %s: invalid JSON: %s"
            % (boundary_lock, validate_corpus.JSON_RECURSION_ERROR),
            out,
        )
        self.assertNotIn("Traceback", out)

        tests = self.build_full("inventory/tests")
        inventory_lock = self.write("lock/inventory.json", deep_json)
        code, out = self.run_main(tests, "--corpus-inventory-lock", inventory_lock)
        self.assertEqual(code, 1)
        self.assertIn(
            "--corpus-inventory-lock %s: invalid JSON: %s"
            % (inventory_lock, validate_corpus.JSON_RECURSION_ERROR),
            out,
        )
        self.assertNotIn("Traceback", out)

    def test_parser_produced_value_oracle_requires_compound_root(self):
        tests = self.build_minimal()
        self.write("tests/valid/alpha.json", "42")
        self.write("tests/parseable-unrepresentable/case.ktav", "{s: value}")
        self.write("tests/parseable-unrepresentable/case.json", json.dumps({
            "value": "a\rb",
            "unrepresentable_reason": "CRByte",
            "note": "scalar root",
        }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertGreaterEqual(out.count("root must be Object or Array"), 2)

    def test_value_oracles_reject_lone_surrogates_in_keys_and_strings(self):
        tests = self.build_minimal()
        self.write("tests/valid/alpha.json",
                   '{"\\ud800": {"value": "\\udfff"}}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("Object key contains lone surrogate U+D800", out)
        self.assertIn("String contains lone surrogate U+DFFF", out)

    def test_value_oracle_rejects_nonfinite_ordinary_json_number(self):
        tests = self.build_minimal()
        self.write("tests/valid/alpha.json", '{"value": 1e400}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("non-finite JSON number '1e400' is not allowed", out)

    def test_sentinel_policy_accepts_only_documented_modes(self):
        with self.assertRaisesRegex(ValueError, "sentinel_policy"):
            validate_corpus._inspect_unrepresentable_value(
                {}, sentinel_policy="unsupported"
            )

    def test_float_sentinel_is_ordinary_valid_oracle_data(self):
        tests = self.build_minimal()
        self.write("tests/valid/alpha.json", '{"f": {"$float": "NaN"}}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

        self.write("tests/parseable-unrepresentable/case.ktav", "{s: value}")
        self.write("tests/parseable-unrepresentable/case.json", json.dumps({
            "value": {"s": {"$float": "NaN"}, "cr": "a\rb"},
            "unrepresentable_reason": "CRByte",
            "note": "sentinel is programmatic-only",
        }))
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)
        self.assertEqual(out.count("'$float' sentinel is not allowed"), 0)

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

    def test_each_corpus_category_rejects_files_outside_its_allowed_set(self):
        tests = self.build_full()
        self.write("tests/valid/extra.txt", "extra")
        self.write("tests/invalid/extra.txt", "extra")
        self.write("tests/unrepresentable/extra.ktav", "extra")
        self.write("tests/parseable-unrepresentable/extra.txt", "extra")
        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        self.assertIn("unexpected file type under valid/", out)
        self.assertIn("unexpected file type under invalid/", out)
        self.assertIn("unrepresentable/ (only .json allowed)", out)
        self.assertIn("parseable-unrepresentable/ (only .ktav and .json allowed)",
                      out)

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

    def test_valid_inventory_lock_profile_controls_error_categories(self):
        tests = self.build_minimal("temporary/tests")
        self.write_invalid_utf8_fixture("temporary/tests")
        lock_path = self.write_corpus_lock(
            tests, "lock/v06.json", version="0.6.4"
        )
        code, out = self.run_main(
            tests, "--corpus-inventory-lock", lock_path
        )
        self.assertEqual(code, 1)
        self.assertIn("unknown 'expected_error'", out)
        self.assertIn("InvalidUtf8", out)
        self.assertNotIn("Traceback", out)

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

    def test_invalid_utf8_exemption_follows_oracle_outside_named_directory(self):
        tests = self.build_minimal()
        ktav_path = os.path.join(tests, "invalid", "elsewhere.ktav")
        with open(ktav_path, "wb") as f:
            f.write(b"\xff")
        self.write("tests/invalid/elsewhere.json",
                   '{"expected_error": "InvalidUtf8"}')
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)
        self.assertIn("1 invalid_utf8/ fixture(s) exempt", out)

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

    def test_v06_without_corpus_lock_ignores_local_idea_directory(self):
        root = "versions/0.6/tests"
        tests = self.build_minimal(root)
        self.write(root + "/.idea/workspace.xml", "<project />")
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

    def test_corpus_inventory_lock_happy_paths_for_both_profiles(self):
        cases = [
            ("versions/0.6/tests", "0.6.4", self.build_minimal),
            ("versions/0.7/tests", "0.7.0", self.build_full),
        ]
        for index, (root, version, builder) in enumerate(cases):
            with self.subTest(version=version):
                tests = builder(root)
                lock_path = self.write_corpus_lock(
                    tests, "lock/profile-%d.json" % index, version=version
                )
                code, out = self.run_main(
                    tests, "--corpus-inventory-lock", lock_path
                )
                self.assertEqual(code, 0, out)
                self.assertIn("OVERALL: PASS", out)

    def test_corpus_inventory_lock_rejects_cross_version_layouts(self):
        tests = self.build_full("cross-06/tests")
        lock_path = self.write_corpus_lock(
            tests, "lock/cross-06.json", version="0.6.4"
        )
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("unexpected top-level entry 'boundary-fixtures.json'", out)
        self.assertIn("unexpected top-level entry 'unrepresentable'", out)

        tests = self.build_minimal("cross-07/tests")
        lock_path = self.write_corpus_lock(
            tests, "lock/cross-07.json", version="0.7.0"
        )
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("missing top-level file 'boundary-fixtures.json'", out)
        self.assertIn("missing top-level directory 'unrepresentable'", out)

    def test_v06_lock_rejects_v07_only_paths(self):
        tests = self.build_minimal("versions/0.6/tests")
        lock_path = self.write("lock/v06-v07-paths.json", json.dumps({
            "version": "0.6.4",
            "files": {
                "boundary-fixtures.json": "0" * 64,
                "unrepresentable/case.json": "0" * 64,
            },
        }))
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("invalid canonical corpus path 'boundary-fixtures.json'", out)
        self.assertIn("invalid canonical corpus path 'unrepresentable/case.json'", out)

    def test_corpus_inventory_lock_rejects_unknown_versions(self):
        for index, version in enumerate(("0.8.0", [0, 8, 0])):
            with self.subTest(version=version):
                tests = self.build_full("unknown-%d/tests" % index)
                lock_path = self.write(
                    "lock/unknown-%d.json" % index,
                    json.dumps({"version": version, "files": {}}),
                )
                code, out = self.run_main(
                    tests, "--corpus-inventory-lock", lock_path
                )
                self.assertEqual(code, 1)
                self.assertIn("unsupported corpus inventory version", out)
                self.assertNotIn("Traceback", out)

    def test_corpus_inventory_lock_ignores_only_top_level_local_metadata(self):
        root = "versions/0.6/tests"
        tests = self.build_minimal(root)
        lock_path = self.write_corpus_lock(
            tests, "lock/metadata.json", version="0.6.4"
        )
        for rpath in (
            "docs_local/note.txt",
            ".idea/workspace.xml",
            ".vscode/settings.txt",
            "project.iml",
            "scratch.swp",
            "scratch.swo",
            "backup~",
            ".DS_Store",
            "Thumbs.db",
            "desktop.ini",
        ):
            self.write(root + "/" + rpath, "local metadata")
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

        self.write(root + "/valid/.idea/workspace.xml", "fixture metadata")
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("valid/.idea/workspace.xml: not present in lock", out)

    def test_v06_corpus_inventory_lock_rejects_unknown_category(self):
        tests = self.build_minimal("versions/0.6/tests")
        lock_path = self.write_corpus_lock(
            tests, "lock/v06-unknown.json", version="0.6.4"
        )
        self.write("versions/0.6/tests/future/case.ktav", "value")
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("unexpected top-level entry 'future'", out)

    def test_corpus_inventory_lock_catches_deleted_file(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        os.remove(os.path.join(tests, "invalid", "bad.ktav"))
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("invalid/bad.ktav: missing from corpus", out)

    def test_corpus_inventory_lock_catches_content_drift_for_all_triple_files(self):
        paths = [
            "valid/alpha.ktav",
            "valid/alpha.json",
            "valid/alpha.canonical.ktav",
        ]
        for index, rpath in enumerate(paths):
            with self.subTest(path=rpath):
                root = "case%d/tests" % index
                tests = self.build_full(root)
                lock_path = self.write_corpus_lock(
                    tests, "lock/corpus-%d.json" % index
                )
                path = os.path.join(tests, *rpath.split("/"))
                with open(path, "a", encoding="utf-8", newline="\n") as stream:
                    stream.write("\n")
                code, out = self.run_main(
                    tests, "--corpus-inventory-lock", lock_path
                )
                self.assertEqual(code, 1)
                self.assertIn(rpath + ": content hash mismatch", out)

    def test_corpus_inventory_lock_catches_boundary_content_drift(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        path = os.path.join(tests, "boundary-fixtures.json")
        with open(path, "a", encoding="utf-8", newline="\n") as stream:
            stream.write("\n")
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("boundary-fixtures.json: content hash mismatch", out)

    def test_corpus_inventory_lock_rejects_added_file_and_unknown_category(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        self.write("tests/valid/extra.txt", "extra")
        self.write("tests/future/case.ktav", "value")
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("valid/extra.txt: not present in lock", out)
        self.assertIn("unexpected top-level entry 'future'", out)

    def test_corpus_inventory_lock_requires_exact_top_level_entries(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        os.remove(os.path.join(tests, "boundary-fixtures.json"))
        shutil.rmtree(os.path.join(tests, "unrepresentable"))
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("missing top-level file 'boundary-fixtures.json'", out)
        self.assertIn("missing top-level directory 'unrepresentable'", out)

    def test_corpus_inventory_lock_rejects_unknown_regular_top_level_file(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        self.write("tests/notes.txt", "extra")
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("unexpected top-level entry 'notes.txt'", out)

    @unittest.skipUnless(os.name == "posix", "special entries require POSIX")
    def test_corpus_inventory_lock_rejects_unknown_special_top_level_entry(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        os.mkfifo(os.path.join(tests, "extra.pipe"))
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("unexpected top-level entry 'extra.pipe'", out)

    @unittest.skipUnless(os.name == "posix", "symlinks require POSIX")
    def test_corpus_inventory_lock_rejects_unknown_top_level_symlink(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        os.symlink(os.path.join(tests, "valid"), os.path.join(tests, "extra-link"))
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("unexpected top-level entry 'extra-link'", out)

    def test_corpus_inventory_lock_happy_path(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
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
        lock_path = self.write_corpus_lock(tests)
        code, out = self.run_main(tests, "--require-unrepresentable",
                                  "--require-boundary",
                                  "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[SKIP]", out)
        self.assertNotIn("[FAIL]", out)


if __name__ == "__main__":
    unittest.main()
