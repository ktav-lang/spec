"""Corpus inventory lock, release declaration, and manifest tests."""
import json
import os
import shutil
import unittest

import release_info

from test_validate_corpus.base import CURRENT_VERSION


class ManifestAndInventoryTests:
    def test_corpus_inventory_lock_happy_paths_for_both_profiles(self):
        cases = [
            ("versions/0.6/tests", "0.6.4", self.build_minimal),
            ("versions/0.7/tests", CURRENT_VERSION, self.build_full),
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
            tests, "lock/cross-07.json", version=CURRENT_VERSION
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
        for index, version in enumerate(("0.6.5", [0, 8, 0])):
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

    def test_corpus_inventory_profile_key_is_derived_from_release_declaration(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

        # Removing the sibling declaration must make the current version's
        # layout profile unresolvable: the lock then fails as unsupported.
        declaration = os.path.join(
            os.path.dirname(os.path.abspath(tests)), "content", "release.js")
        os.remove(declaration)
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        os.remove(declaration)
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("unsupported corpus inventory version", out)
        self.assertIn(release_info.release_path_for_tests(tests), out)

    def test_corpus_inventory_profile_key_tracks_the_declaration_value(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        declaration = os.path.join(
            os.path.dirname(os.path.abspath(tests)), "content", "release.js")
        self.write_declaration(declaration, {"version": "9.9.9",
                                             "released": "2020-01-01"})
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn(
            "unsupported corpus inventory version '%s'" % CURRENT_VERSION, out)
        self.assertIn("supported: '0.6.4', '0.7.1', '9.9.9'", out)

    def test_malformed_release_declaration_fails_loudly(self):
        tests = self.build_full()
        lock_path = self.write_corpus_lock(tests)
        declaration = os.path.join(
            os.path.dirname(os.path.abspath(tests)), "content", "release.js")
        with open(declaration, "w", encoding="utf-8", newline=chr(10)) as f:
            f.write("export default {")
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 1)
        self.assertIn("corpus inventory lock", out)
        self.assertIn(declaration, out)
        self.assertIn("invalid JSON", out)

    def test_frozen_0_6_lock_path_does_not_read_a_release_declaration(self):
        tests = self.build_minimal("versions/0.6/tests")
        declaration = os.path.join(
            os.path.dirname(os.path.abspath(tests)), "content")
        self.assertFalse(os.path.exists(declaration))
        lock_path = self.write_corpus_lock(
            tests, "lock/frozen.json", version="0.6.4")
        self.assertFalse(os.path.exists(declaration))
        code, out = self.run_main(tests, "--corpus-inventory-lock", lock_path)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

    def write_declaration(self, path, release):
        with open(path, "w", encoding="utf-8", newline=chr(10)) as f:
            f.write("export default "
                    + json.dumps(release, ensure_ascii=False, indent=2)
                    + chr(10))
        return path

    # -- manifest.json (Sec 8.5 runner contract) -------------------------

    def test_manifest_happy_path_passes_without_flag(self):
        tests = self.build_full()
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)
        self.assertIn("[PASS] manifest.json:", out)

    def test_manifest_missing_is_skipped_without_require_flag(self):
        tests = self.build_minimal()
        code, out = self.run_main(tests)
        self.assertEqual(code, 0, out)
        self.assertIn("[SKIP] manifest.json: file not present", out)

    def test_manifest_missing_is_rejected_when_required(self):
        tests = self.build_minimal()
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("manifest.json not present (required)", out)

    def test_manifest_rejects_unsupported_schema_version(self):
        tests = self.build_full()
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 2,
            "categories": {
                "valid": {"count": 2}, "invalid": {"count": 1},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
            },
            "fixture_flags": [],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("unsupported schema_version 2", out)

    def test_manifest_rejects_missing_and_extra_top_level_fields(self):
        tests = self.build_full()
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {},
            "extra_field": True,
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("missing required field(s): 'fixture_flags'", out)
        self.assertIn("unexpected field(s): 'extra_field'", out)

    def test_manifest_rejects_category_count_mismatch(self):
        tests = self.build_full()
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 999}, "invalid": {"count": 1},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
            },
            "fixture_flags": [],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("categories['valid'].count is 999 but 2 fixture(s) "
                      "are actually present", out)

    def test_manifest_rejects_declared_category_with_no_directory(self):
        tests = self.build_full()
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 2}, "invalid": {"count": 1},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
                "future": {"count": 0},
            },
            "fixture_flags": [],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("'categories' names 'future' but no such directory exists",
                      out)

    def test_manifest_rejects_unknown_category_directory(self):
        tests = self.build_full()
        self.write("tests/unknown_category/note.ktav", "value")
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("unknown fixture category directory 'unknown_category' "
                      "is not listed in 'categories'", out)

    def test_manifest_rejects_stale_raw_bytes_flag(self):
        # A fixture is flagged raw_bytes, but its bytes are actually valid
        # UTF-8 -- the flag no longer describes reality.
        tests = self.build_full()
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 2}, "invalid": {"count": 1},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
            },
            "fixture_flags": [{
                "category": "invalid", "fixture": "bad", "flags": ["raw_bytes"],
                "note": "stale",
            }],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("flagged 'raw_bytes', but invalid/bad.ktav is actually "
                      "valid UTF-8", out)

    def test_manifest_rejects_missing_raw_bytes_flag_for_genuinely_invalid_utf8(self):
        # A .ktav fixture is genuinely not valid UTF-8, but manifest.json
        # does not flag it -- this is exactly the C#/JS false-green bug
        # class (Sec 6.15) the flag exists to prevent.
        tests = self.build_full()
        ktav_path = os.path.join(tests, "invalid", "invalid_utf8", "bad_utf8.ktav")
        os.makedirs(os.path.dirname(ktav_path), exist_ok=True)
        with open(ktav_path, "wb") as f:
            f.write(b"\xff")
        self.write("tests/invalid/invalid_utf8/bad_utf8.json",
                   '{"expected_error": "InvalidUtf8"}')
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 2}, "invalid": {"count": 2},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
            },
            "fixture_flags": [],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("invalid/invalid_utf8/bad_utf8.ktav is not valid UTF-8 "
                      "but is not flagged 'raw_bytes'", out)

    def test_manifest_accepts_correct_raw_bytes_flag(self):
        tests = self.build_full()
        ktav_path = os.path.join(tests, "invalid", "invalid_utf8", "bad_utf8.ktav")
        os.makedirs(os.path.dirname(ktav_path), exist_ok=True)
        with open(ktav_path, "wb") as f:
            f.write(b"\xff")
        self.write("tests/invalid/invalid_utf8/bad_utf8.json",
                   '{"expected_error": "InvalidUtf8"}')
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 2}, "invalid": {"count": 2},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
                "strict-lossy": {"count": 1},
            },
            "fixture_flags": [{
                "category": "invalid", "fixture": "invalid_utf8/bad_utf8",
                "flags": ["raw_bytes"], "note": "deliberately invalid UTF-8",
            }],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 0, out)

    def test_manifest_rejects_fixture_flags_path_traversal_and_bad_category(self):
        tests = self.build_full()
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 2}, "invalid": {"count": 1},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
            },
            "fixture_flags": [
                {"category": "invalid", "fixture": "../bad", "flags": ["raw_bytes"],
                 "note": "traversal"},
                {"category": "no-such-category", "fixture": "bad",
                 "flags": ["raw_bytes"], "note": "bad category"},
            ],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("plain name segments", out)
        self.assertIn("'category' 'no-such-category' is not one of manifest's "
                      "declared categories", out)

    def test_manifest_rejects_unknown_flag_name_and_duplicate_pair(self):
        tests = self.build_full()
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 2}, "invalid": {"count": 1},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
            },
            "fixture_flags": [
                {"category": "invalid", "fixture": "bad", "flags": ["not_a_flag"],
                 "note": "bad flag"},
            ],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("'flags' entries must all be one of: raw_bytes", out)

    def test_manifest_rejects_duplicate_category_fixture_pair(self):
        tests = self.build_full()
        entry = {"category": "invalid", "fixture": "bad", "flags": ["raw_bytes"],
                 "note": "dup"}
        self.write("tests/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 2}, "invalid": {"count": 1},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
            },
            "fixture_flags": [entry, dict(entry)],
        }))
        code, out = self.run_main(tests, "--require-manifest")
        self.assertEqual(code, 1)
        self.assertIn("duplicate (category, fixture) pair", out)

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

