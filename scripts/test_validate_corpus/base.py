#!/usr/bin/env python3
"""Fixture base for the validate_corpus test suite."""
import contextlib
import hashlib
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import release_info
import validate_corpus

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CURRENT_RELEASE = release_info.load_release_file(
    os.path.join(REPO_ROOT, "versions", "0.8", "content", "release.js"))
CURRENT_VERSION = CURRENT_RELEASE["version"]
CURRENT_RELEASE_JS = ("export default "
                      + json.dumps(CURRENT_RELEASE, ensure_ascii=False, indent=2)
                      + chr(10))

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
        self.write(root + "/strict-lossy/leading_zero.ktav", "zip: 01234\n")
        self.write(root + "/strict-lossy/leading_zero.json",
                   '{"lax_value": {"zip": 1234}, '
                   '"expected_error": "LossyScalar", '
                   '"body": "01234", "canonical": "1234", '
                   '"note": "leading zero dropped by canonicalization"}')
        self.write(root + "/boundary-fixtures.json", json.dumps(
            {"boundary_dependent_leaves": [
                {"fixture": "boundary", "path": "/overflow",
                 "boundary_class": "integer_range"}]}))
        self.write(root + "/manifest.json", json.dumps({
            "schema_version": 1,
            "categories": {
                "valid": {"count": 2},
                "invalid": {"count": 1},
                "unrepresentable": {"count": 1},
                "parseable-unrepresentable": {"count": 1},
                "strict-lossy": {"count": 1},
            },
            "fixture_flags": [],
        }))
        return tests

    def run_main(self, tests_dir, *flags):
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            code = validate_corpus.main([tests_dir] + list(flags))
        return code, out.getvalue()

    def write_corpus_lock(self, tests_dir, relpath="lock/corpus.json",
                          version=None):
        if version is None:
            # Root-cause fix of the stale-literal failure mode: the default
            # comes from content/release.js, never a hand-bumped literal.
            version = CURRENT_VERSION
        if version == CURRENT_VERSION:
            # Simulate the repo layout: the current corpus's sibling
            # content/release.js declaration, which main() consults for the
            # layout-profile key. Frozen versions carry no declaration.
            content_dir = os.path.join(
                os.path.dirname(os.path.abspath(tests_dir)), "content")
            os.makedirs(content_dir, exist_ok=True)
            with open(os.path.join(content_dir, "release.js"), "w",
                      encoding="utf-8", newline=chr(10)) as f:
                f.write(CURRENT_RELEASE_JS)
        files = {}
        profile = validate_corpus.corpus_layout_profiles(
            CURRENT_VERSION if version == CURRENT_VERSION else None)[version]
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

