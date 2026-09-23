"""Command-line entry point for the corpus validator."""
import argparse
import sys

import release_info

from .common import Results, _is_regular_directory, _is_regular_file
from .checks_corpus import (check_invalid, check_invalid_utf8_oracle,
                            check_utf8_json, check_valid,
                            select_error_categories)
from .checks_unrepresentable import (check_parseable_unrepresentable,
                                     check_unrepresentable)
from .checks_boundary import check_boundary_fixtures
from .checks_manifest_inventory import (check_corpus_inventory_lock,
                                        check_manifest,
                                        load_corpus_inventory_lock)

def main(argv):
    parser = argparse.ArgumentParser(
        description="Validate the structure of a Ktav conformance corpus.")
    parser.add_argument("tests_dir", help="path to a tests directory, e.g. "
                        "versions/0.7/tests")
    parser.add_argument("--require-unrepresentable", action="store_true",
                        help="treat missing unrepresentable/ or "
                        "parseable-unrepresentable/ directories as failures "
                        "instead of skips")
    parser.add_argument("--require-boundary", action="store_true",
                        help="treat a missing or empty boundary-fixtures.json "
                        "manifest as a failure instead of a skip")
    parser.add_argument("--boundary-manifest-lock", metavar="PATH", default=None,
                        help="path to a lock file (a JSON array of "
                        "{fixture, path, boundary_class} records) that "
                        "boundary-fixtures.json's 'boundary_dependent_leaves' "
                        "must match exactly; catches a silently deleted entry")
    parser.add_argument("--corpus-inventory-lock", metavar="PATH", default=None,
                        help="path to a versioned lock file whose complete "
                        "corpus relative-path to SHA-256 mapping must match "
                        "exactly")
    parser.add_argument("--require-manifest", action="store_true",
                        help="treat a missing manifest.json as a failure "
                        "instead of a skip")
    args = parser.parse_args(argv)

    tests_dir = args.tests_dir
    if not _is_regular_directory(tests_dir):
        print("error: tests_dir does not exist, is not a regular directory, "
              "or is a symlink/junction: %s"
              % tests_dir, file=sys.stderr)
        return 2

    results = Results()
    inventory_lock = None
    inventory_profile = None
    release_hint = None
    if args.corpus_inventory_lock is not None:
        release_path = release_info.release_path_for_tests(tests_dir)
        release_version = None
        if not _is_regular_file(release_path):
            # Legitimate: frozen versions and synthetic corpora carry no
            # release declaration.
            release_hint = (
                "no release declaration found at %s; the current version's "
                "layout profile is derived from it" % release_path)
        else:
            try:
                release_version = release_info.load_release_file(
                    release_path)["version"]
            except release_info.ReleaseInfoError as e:
                results.fail("corpus inventory lock", str(e))
                release_version = None
        inventory_lock, inventory_profile = load_corpus_inventory_lock(
            args.corpus_inventory_lock, results,
            release_version=release_version, release_hint=release_hint
        )
    parsed = check_utf8_json(tests_dir, results)
    check_valid(tests_dir, results, parsed)
    error_categories = (inventory_profile["error_categories"]
                        if inventory_profile is not None
                        else select_error_categories(tests_dir))
    check_invalid(tests_dir, results, parsed, error_categories)
    check_invalid_utf8_oracle(tests_dir, results, parsed)
    has_unrep = check_unrepresentable(tests_dir, results, parsed,
                                      require=args.require_unrepresentable)
    has_parseable_unrep = check_parseable_unrepresentable(
        tests_dir, results, parsed, require=args.require_unrepresentable)
    has_boundary = check_boundary_fixtures(tests_dir, results, parsed,
                                           require=args.require_boundary,
                                           lock_path=args.boundary_manifest_lock)
    invalid_utf8_rpaths = results.counts.get(
        "UTF-8/JSON validity", {}).get("invalid_utf8_rpaths", [])
    has_manifest = check_manifest(tests_dir, results, invalid_utf8_rpaths,
                                  require=args.require_manifest)
    if (args.corpus_inventory_lock is not None
            and inventory_lock is not None and inventory_profile is not None):
        check_corpus_inventory_lock(
            tests_dir, results, args.corpus_inventory_lock,
            lock_data=inventory_lock, profile=inventory_profile
        )

    failures = {}
    for category, message in results.problems:
        failures.setdefault(category, []).append(message)

    # Deterministic summary
    def line(category, ok):
        probs = failures.get(category, [])
        if ok and not probs:
            c = results.counts.get(category, {})
            return "[PASS] %s: %s" % (category, detail(category, c))
        return None

    def detail(category, c):
        if category == "UTF-8/JSON validity":
            n_exempt = c.get("n_exempt", 0)
            suffix = (", %d invalid_utf8/ fixture(s) exempt" % n_exempt) if n_exempt else ""
            return "%d files scanned, %d .json parsed%s" % (c.get("n_files", 0),
                                                          c.get("n_json", 0), suffix)
        if category == "valid/ triples":
            return "%d fixtures complete" % c.get("n_fixtures", 0)
        if category == "invalid/ pairs":
            return "%d fixtures complete, expected_error OK" % c.get("n_fixtures", 0)
        if category == "invalid_utf8 oracle consistency":
            return "%d fixture(s) checked" % c.get("n_checked", 0)
        if category == "unrepresentable/":
            if c.get("skipped"):
                return "directory not present"
            return "%d fixtures OK" % c.get("n_fixtures", 0)
        if category == "parseable-unrepresentable/":
            if c.get("skipped"):
                return "directory not present"
            return "%d fixtures OK" % c.get("n_fixtures", 0)
        if category == "boundary-fixtures.json":
            if c.get("skipped"):
                return "file not present"
            return "%d entries OK" % c.get("n_entries", 0)
        if category == "manifest.json":
            if c.get("skipped"):
                return "file not present"
            return ("%d categories OK, %d fixture_flags entries OK"
                    % (c.get("n_categories", 0), c.get("n_flags", 0)))
        if category == "corpus inventory lock":
            return "%d files match SHA-256 lock" % c.get("n_files", 0)
        return ""

    order = ["UTF-8/JSON validity", "valid/ triples", "invalid/ pairs",
             "invalid_utf8 oracle consistency", "unrepresentable/",
             "parseable-unrepresentable/", "boundary-fixtures.json",
             "manifest.json", "corpus inventory lock"]
    file_categories = frozenset({"boundary-fixtures.json", "manifest.json"})
    skipped_map = {
        "unrepresentable/": not has_unrep and not args.require_unrepresentable,
        "parseable-unrepresentable/": (not has_parseable_unrep
                                        and not args.require_unrepresentable),
        "boundary-fixtures.json": (not has_boundary and not args.require_boundary
                                   and args.boundary_manifest_lock is None),
        "manifest.json": not has_manifest and not args.require_manifest,
    }
    overall = "PASS"
    for category in order:
        probs = failures.get(category, [])
        if skipped_map.get(category):
            label = ("file not present"
                     if category in file_categories
                     else "directory not present")
            print("[SKIP] %s: %s" % (category, label))
        elif probs:
            print("[FAIL] %s: %d problem(s)" % (category, len(probs)))
            for msg in probs:
                print("  - %s" % msg)
            overall = "FAIL"
        elif category == "corpus inventory lock" and args.corpus_inventory_lock is None:
            print("[SKIP] corpus inventory lock: flag not provided")
        else:
            print(line(category, True))
    print("OVERALL: %s" % overall)
    return 0 if overall == "PASS" else 1
