"""Error-category and invalid UTF-8 oracle tests."""
import json
import os
import validate_corpus


class CategoriesAndUtf8Tests:
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

