"""JSON oracle and strict-valid corpus tests."""
import json
import validate_corpus


class JsonAndValidTests:
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

    def test_valid_oracles_reject_nonrepresentable_witnesses_with_value_paths(self):
        tests = self.build_minimal()
        cases = {
            "empty_key": ({"nested": [{"": "v"}]},
                          "EmptyKeyName", "/value/nested/0/"),
            "cr_byte": ({"nested": [{"s": "a\rb"}]},
                         "CRByte", "/value/nested/0/s"),
            "both_forms": ({"nested": [{"s": "))\n)"}]},
                            "BothFormsRequired", "/value/nested/0/s"),
            "trailing_whitespace": ({"nested": [{"s": "))\nx "}]},
                                      "TrailingWhitespaceCollision",
                                      "/value/nested/0/s"),
            "leading_whitespace": ({"nested": [{"s": " ))\n x"}]},
                                     "LeadingWhitespaceCollision",
                                     "/value/nested/0/s"),
        }
        for name, (value, reason, value_path) in cases.items():
            base = "tests/valid/witnesses/%s" % name
            self.write(base + ".ktav", "fixture: value\n")
            self.write(base + ".json", json.dumps(value))
            self.write(base + ".canonical.ktav", "fixture: value\n")

        code, out = self.run_main(tests)
        self.assertEqual(code, 1)
        for name, (_value, reason, value_path) in cases.items():
            self.assertIn(
                "valid/witnesses/%s.json: non-representable %s witness at "
                "Value path %s" % (name, reason, value_path),
                out,
            )

    def test_valid_oracles_accept_ordinary_leading_and_trailing_multiline_strings(
            self):
        tests = self.build_minimal()
        cases = {
            "leading": {"text": "  first\n second"},
            "trailing": {"text": "first \nsecond"},
        }
        for name, value in cases.items():
            base = "tests/valid/multiline/%s" % name
            self.write(base + ".ktav", "fixture: value\n")
            self.write(base + ".json", json.dumps(value))
            self.write(base + ".canonical.ktav", "fixture: value\n")

        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)

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

