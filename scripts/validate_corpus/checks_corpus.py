"""Checks 1-3b: UTF-8/JSON validity and valid/, invalid/ fixtures."""
import json
import os

from .common import (DEFAULT_ERROR_CATEGORIES, ERROR_CATEGORIES_BY_VERSION,
                     JSON_PARSE_FAILED, JSON_RECURSION_ERROR, VALID_ORACLE_WITNESS_REASONS,
                     _ascii_safe_text, _is_regular_directory, _is_regular_file,
                     _path_entry_exists, _sibling_declares_invalid_utf8,
                     _walk_regular_category_files, _walk_safe,
                     is_deliberately_invalid_utf8, loads_strict, rel)
from .checks_unrepresentable import _inspect_unrepresentable_value

def check_utf8_json(tests_dir, results):
    """Check 1: strict UTF-8 decode for every file; json.loads for every .json.
    Exception: an invalid/ .ktav fixture whose sibling oracle declares
    InvalidUtf8 is deliberately not valid UTF-8."""
    category = "UTF-8/JSON validity"
    n_files = 0
    n_json = 0
    n_exempt = 0
    parsed = {}  # relpath -> parsed object, or JSON_PARSE_FAILED on failure
    invalid_utf8_rpaths = []  # every file whose raw bytes are not valid UTF-8,
                               # exempt or not -- consumed by check_manifest
                               # to cross-check manifest.json's raw_bytes flags.
    for root, files in _walk_safe(tests_dir, tests_dir, results, category):
        for fname in files:
            path = os.path.join(root, fname)
            if not _is_regular_file(path):
                results.fail(category, "%s: symlink or special file is not allowed"
                             % rel(path, tests_dir))
                continue
            n_files += 1
            rpath = rel(path, tests_dir)
            try:
                with open(path, "rb") as f:
                    raw = f.read()
                text = raw.decode("utf-8", errors="strict")
            except UnicodeDecodeError as e:
                invalid_utf8_rpaths.append(rpath)
                if (is_deliberately_invalid_utf8(rpath)
                        and _sibling_declares_invalid_utf8(path)):
                    n_exempt += 1
                    continue
                results.fail(category, "%s: invalid UTF-8 at byte offset %d: %s"
                             % (rpath, e.start, e.reason))
                continue
            except OSError as e:
                results.fail(category, "%s: unreadable: %s" % (rel(path, tests_dir), e))
                continue
            if fname.endswith(".json"):
                n_json += 1
                try:
                    parsed[rel(path, tests_dir)] = loads_strict(text)
                except json.JSONDecodeError as e:
                    results.fail(category, "%s: invalid JSON: %s"
                                 % (rel(path, tests_dir), _ascii_safe_text(e)))
                    parsed[rel(path, tests_dir)] = JSON_PARSE_FAILED
                except ValueError as e:
                    results.fail(category, "%s: invalid JSON: %s"
                                 % (rel(path, tests_dir), _ascii_safe_text(e)))
                    parsed[rel(path, tests_dir)] = JSON_PARSE_FAILED
                except RecursionError:
                    results.fail(category, "%s: invalid JSON: %s"
                                 % (rel(path, tests_dir), JSON_RECURSION_ERROR))
                    parsed[rel(path, tests_dir)] = JSON_PARSE_FAILED
    results.set_count(category, n_files=n_files, n_json=n_json, n_exempt=n_exempt,
                       parsed=parsed, invalid_utf8_rpaths=invalid_utf8_rpaths)
    return parsed


def classify_valid(files):
    """Split files of one valid/ directory into (names, primary, json, canonical)."""
    names = set()
    primary = set()
    jsons = set()
    canonicals = set()
    for fname in files:
        if fname.endswith(".canonical.ktav"):
            name = fname[: -len(".canonical.ktav")]
            canonicals.add(name)
        elif fname.endswith(".ktav"):
            name = fname[: -len(".ktav")]
            primary.add(name)
        elif fname.endswith(".json"):
            name = fname[: -len(".json")]
            jsons.add(name)
        else:
            names.add(fname)  # unexpected
    return primary, jsons, canonicals

def check_valid(tests_dir, results, parsed):
    """Check 2: complete .ktav/.json/.canonical.ktav triples under valid/."""
    category = "valid/ triples"
    valid_dir = os.path.join(tests_dir, "valid")
    if not _is_regular_directory(valid_dir):
        if _path_entry_exists(valid_dir):
            results.fail(category, "%s: category root must be a real directory"
                         % rel(valid_dir, tests_dir))
        else:
            results.fail(category, "valid/ directory not present")
        return
    n_fixtures = 0
    for root, files in _walk_regular_category_files(
            valid_dir, tests_dir, results, category):
        primary, jsons, canonicals = classify_valid(files)
        unexpected = sorted(
            f for f in files
            if not (f.endswith(".ktav") or f.endswith(".canonical.ktav")
                    or f.endswith(".json"))
        )
        for f in unexpected:
            results.fail(category, "%s: unexpected file type under valid/"
                         % rel(os.path.join(root, f), tests_dir))
        for name in sorted(primary):
            n_fixtures += 1
            if name not in jsons:
                results.fail(
                    category, "%s: missing sibling JSON oracle %s"
                    % (rel(os.path.join(root, name + ".ktav"), tests_dir),
                       rel(os.path.join(root, name + ".json"), tests_dir)))
            if name not in canonicals:
                results.fail(
                    category, "%s: missing sibling canonical oracle %s"
                    % (rel(os.path.join(root, name + ".ktav"), tests_dir),
                       rel(os.path.join(root, name + ".canonical.ktav"), tests_dir)))
            rpath = rel(os.path.join(root, name + ".json"), tests_dir)
            oracle = parsed.get(rpath, JSON_PARSE_FAILED)
            if oracle is not JSON_PARSE_FAILED:
                witness_paths = {}
                errors, witnesses, root_kind = _inspect_unrepresentable_value(
                    oracle, sentinel_policy="ordinary",
                    witness_paths=witness_paths,
                )
                for message in errors:
                    results.fail(category, "%s: %s" % (rpath, message))
                for reason in VALID_ORACLE_WITNESS_REASONS:
                    if not witnesses[reason]:
                        continue
                    for witness_path in witness_paths[reason]:
                        results.fail(
                            category,
                            "%s: non-representable %s witness at Value path %s"
                            % (rpath, reason, witness_path),
                        )
                if root_kind not in ("Object", "Array"):
                    results.fail(category, "%s: parser-produced Value oracle "
                                 "root must be Object or Array" % rpath)
        for name in sorted(jsons - primary):
            results.fail(
                category, "%s: orphaned JSON oracle; no sibling primary input %s"
                % (rel(os.path.join(root, name + ".json"), tests_dir),
                   rel(os.path.join(root, name + ".ktav"), tests_dir)))
        for name in sorted(canonicals - primary):
            results.fail(
                category, "%s: orphaned canonical oracle; no sibling primary input %s"
                % (rel(os.path.join(root, name + ".canonical.ktav"), tests_dir),
                   rel(os.path.join(root, name + ".ktav"), tests_dir)))
    results.set_count(category, n_fixtures=n_fixtures)


def select_error_categories(tests_dir):
    """Pick the closed expected_error set for a corpus, by its version path
    segment (the in-repo layout is versions/<v>/tests). Unknown layouts get
    the default (0.7) set, which is the union of all version sets."""
    parts = tests_dir.replace("\\", "/").split("/")
    for i in range(len(parts) - 1):
        if parts[i] == "versions" and parts[i + 1] in ERROR_CATEGORIES_BY_VERSION:
            return ERROR_CATEGORIES_BY_VERSION[parts[i + 1]]
    return DEFAULT_ERROR_CATEGORIES


def check_invalid(tests_dir, results, parsed, error_categories):
    """Check 3: .ktav/.json pairs under invalid/ with expected_error strings."""
    category = "invalid/ pairs"
    invalid_dir = os.path.join(tests_dir, "invalid")
    if not _is_regular_directory(invalid_dir):
        if _path_entry_exists(invalid_dir):
            results.fail(category, "%s: category root must be a real directory"
                         % rel(invalid_dir, tests_dir))
        else:
            results.fail(category, "invalid/ directory not present")
        return
    n_fixtures = 0
    for root, files in _walk_regular_category_files(
            invalid_dir, tests_dir, results, category):
        primary = set()
        jsons = set()
        for fname in files:
            if fname.endswith(".ktav"):
                primary.add(fname[: -len(".ktav")])
            elif fname.endswith(".json"):
                jsons.add(fname[: -len(".json")])
            else:
                results.fail(
                    category, "%s: unexpected file type under invalid/ "
                    "(only .ktav and .json allowed)"
                    % rel(os.path.join(root, fname), tests_dir))
        for name in sorted(primary - jsons):
            results.fail(
                category, "%s: missing sibling %s"
                % (rel(os.path.join(root, name + ".ktav"), tests_dir),
                   rel(os.path.join(root, name + ".json"), tests_dir)))
        for name in sorted(jsons):
            n_fixtures += 1
            if name not in primary:
                results.fail(
                    category, "%s: missing sibling %s"
                    % (rel(os.path.join(root, name + ".json"), tests_dir),
                       rel(os.path.join(root, name + ".ktav"), tests_dir)))
            rpath = rel(os.path.join(root, name + ".json"), tests_dir)
            obj = parsed.get(rpath, JSON_PARSE_FAILED)
            if obj is JSON_PARSE_FAILED:
                continue  # parse failure already reported in check 1
            if not isinstance(obj, dict):
                results.fail(category, "%s: expected_error check skipped: "
                             "not a JSON object" % rpath)
                continue
            err = obj.get("expected_error")
            if not isinstance(err, str) or err == "":
                results.fail(category, "%s: 'expected_error' must be a "
                             "non-empty string" % rpath)
            elif err not in error_categories:
                results.fail(category, "%s: unknown 'expected_error' %r "
                             "(must be one of: %s)"
                             % (rpath, err, ", ".join(sorted(error_categories))))
    results.set_count(category, n_fixtures=n_fixtures)


def check_invalid_utf8_oracle(tests_dir, results, parsed):
    """Check 3b: bidirectional cross-check between a fixture's actual UTF-8
    validity and its .json's expected_error, for every invalid/ fixture
    (not just ones under invalid/invalid_utf8/ -- the invariant is about the
    data and the oracle agreeing, not about directory naming).

    - Invalid UTF-8 bytes but expected_error != "InvalidUtf8" -> FAIL.
    - Valid UTF-8 bytes but expected_error == "InvalidUtf8" -> FAIL.
    """
    category = "invalid_utf8 oracle consistency"
    invalid_dir = os.path.join(tests_dir, "invalid")
    n_checked = 0
    if not _is_regular_directory(invalid_dir):
        if _path_entry_exists(invalid_dir):
            results.fail(category, "%s: category root must be a real directory"
                         % rel(invalid_dir, tests_dir))
        results.set_count(category, n_checked=n_checked)
        return
    for root, files in _walk_safe(invalid_dir, tests_dir, results, category):
        for fname in files:
            if not fname.endswith(".json"):
                continue
            json_path = os.path.join(root, fname)
            if not _is_regular_file(json_path):
                results.fail(category, "%s: symlink or special file is not allowed"
                             % rel(json_path, tests_dir))
                continue
            name = fname[: -len(".json")]
            ktav_path = os.path.join(root, name + ".ktav")
            if not _is_regular_file(ktav_path):
                continue  # missing sibling already reported by check_invalid
            jrpath = rel(json_path, tests_dir)
            obj = parsed.get(jrpath, JSON_PARSE_FAILED)
            if obj is JSON_PARSE_FAILED:
                continue  # parse failure already reported in check 1
            if not isinstance(obj, dict):
                continue  # already reported by check_invalid
            err = obj.get("expected_error")
            if not isinstance(err, str):
                continue  # already reported by check_invalid
            try:
                with open(ktav_path, "rb") as f:
                    raw = f.read()
            except OSError as e:
                results.fail(category, "%s: unreadable: %s"
                             % (rel(ktav_path, tests_dir), e))
                continue
            n_checked += 1
            krpath = rel(ktav_path, tests_dir)
            try:
                raw.decode("utf-8", errors="strict")
                is_valid_utf8 = True
            except UnicodeDecodeError:
                is_valid_utf8 = False
            if not is_valid_utf8 and err != "InvalidUtf8":
                results.fail(category, "%s: bytes are not valid UTF-8, but "
                             "sibling %s declares expected_error %r (must be "
                             "'InvalidUtf8')" % (krpath, jrpath, err))
            elif is_valid_utf8 and err == "InvalidUtf8":
                results.fail(category, "%s: declares expected_error "
                             "'InvalidUtf8', but sibling %s is actually valid "
                             "UTF-8" % (jrpath, krpath))
    results.set_count(category, n_checked=n_checked)
