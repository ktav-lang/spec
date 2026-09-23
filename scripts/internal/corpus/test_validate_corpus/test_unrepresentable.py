"""Unrepresentable and parser-produced writer-failure tests."""
import json
import validate_corpus


class UnrepresentableTests:
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

    def test_deep_json_in_main_scan_is_a_deterministic_failure(self):
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
        self.assertTrue(
            "valid/deep.json: invalid JSON: %s"
            % validate_corpus.JSON_RECURSION_ERROR in out
            or "valid/deep.json: /value: maximum recursion depth exceeded "
            "while validating JSON value" in out,
            out,
        )
        self.assertNotIn("Traceback", out)

    def test_deep_boundary_and_inventory_locks_fail_deterministically(self):
        deep_json = "[" * 20000 + "0" + "]" * 20000

        tests = self.build_full()
        boundary_lock = self.write("lock/boundary.json", deep_json)
        code, out = self.run_main(tests, "--boundary-manifest-lock", boundary_lock)
        self.assertEqual(code, 1)
        self.assertTrue(
            "--boundary-manifest-lock %s: invalid JSON: %s"
            % (boundary_lock, validate_corpus.JSON_RECURSION_ERROR) in out
            or "--boundary-manifest-lock %s: entry 0 must be an object"
            % boundary_lock in out,
            out,
        )
        self.assertNotIn("Traceback", out)

        tests = self.build_full("inventory/tests")
        inventory_lock = self.write("lock/inventory.json", deep_json)
        code, out = self.run_main(tests, "--corpus-inventory-lock", inventory_lock)
        self.assertEqual(code, 1)
        self.assertTrue(
            "--corpus-inventory-lock %s: invalid JSON: %s"
            % (inventory_lock, validate_corpus.JSON_RECURSION_ERROR) in out
            or "--corpus-inventory-lock %s: root must be a JSON object"
            % inventory_lock in out,
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

