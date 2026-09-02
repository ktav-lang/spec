#!/usr/bin/env python3
"""Validate the structure of a Ktav conformance corpus directory.

Purpose:
    Performs read-only structural sanity checks on a tests directory such as
    versions/0.7/tests:

      1. Every file decodes as strict UTF-8; every .json file parses as JSON.
      2. Every fixture under valid/ forms a complete sibling triple
         (<name>.ktav, <name>.json, <name>.canonical.ktav).
      3. Every fixture under invalid/ forms a sibling pair (<name>.ktav,
         <name>.json) and each .json has a non-empty string `expected_error`.
      4. unrepresentable/ (optional) contains only .json objects with `value`,
         `note`, and `unrepresentable_reason` from the known reason-code set.
      5. boundary-fixtures.json (optional) entries reference existing valid/
         triples, contain syntactically valid and resolvable RFC 6901 JSON
         Pointers, use known boundary classes, and have no duplicates.

Usage:
    python scripts/validate_corpus.py <tests_dir>

Exit codes:
    0  all checks passed (or were legitimately skipped)
    1  one or more checks failed
    2  usage error (wrong argument count, tests_dir missing or not a directory)
"""

import argparse
import json
import os
import sys

UNREPRESENTABLE_REASONS = {
    "ScalarRoot",
    "EmptyKeyName",
    "NonFiniteFloat",
    "CRByte",
    "BothFormsRequired",
    "TrailingWhitespaceCollision",
    "LeadingWhitespaceCollision",
}

BOUNDARY_CLASSES = {
    "integer_range",
    "float_range",
    "float_underflow",
    "float_precision",
}


def rel(path, tests_dir):
    """Path relative to tests_dir with forward slashes, for deterministic output."""
    return os.path.relpath(path, tests_dir).replace(os.sep, "/")


class Results:
    """Collects per-category results; each problem is a (category, message) pair."""

    def __init__(self):
        self.problems = []
        self.counts = {}

    def fail(self, category, message):
        self.problems.append((category, message))

    def set_count(self, category, **kwargs):
        self.counts[category] = kwargs


def is_deliberately_invalid_utf8(rpath):
    """True for the one fixture class allowed to fail the UTF-8 check: a
    .ktav input under invalid/invalid_utf8/ whose whole point is to be
    invalid UTF-8 (Sec 6.15). Its sibling .json is NOT exempt."""
    parts = rpath.split("/")
    return (len(parts) >= 2 and parts[0] == "invalid" and parts[1] == "invalid_utf8"
            and rpath.endswith(".ktav"))


def check_utf8_json(tests_dir, results):
    """Check 1: strict UTF-8 decode for every file; json.loads for every .json.
    Exception: invalid/invalid_utf8/*.ktav is deliberately not valid UTF-8
    (see is_deliberately_invalid_utf8)."""
    category = "UTF-8/JSON validity"
    n_files = 0
    n_json = 0
    n_exempt = 0
    parsed = {}  # relpath -> parsed object (or None on failure)
    for root, _dirs, files in os.walk(tests_dir):
        for fname in files:
            path = os.path.join(root, fname)
            n_files += 1
            rpath = rel(path, tests_dir)
            try:
                with open(path, "rb") as f:
                    raw = f.read()
                text = raw.decode("utf-8", errors="strict")
            except UnicodeDecodeError as e:
                if is_deliberately_invalid_utf8(rpath):
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
                    parsed[rel(path, tests_dir)] = json.loads(text)
                except json.JSONDecodeError as e:
                    results.fail(category, "%s: invalid JSON: %s"
                                 % (rel(path, tests_dir), e))
                    parsed[rel(path, tests_dir)] = None
    results.set_count(category, n_files=n_files, n_json=n_json, n_exempt=n_exempt,
                       parsed=parsed)
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


def check_valid(tests_dir, results):
    """Check 2: complete .ktav/.json/.canonical.ktav triples under valid/."""
    category = "valid/ triples"
    valid_dir = os.path.join(tests_dir, "valid")
    if not os.path.isdir(valid_dir):
        results.fail(category, "valid/ directory not present")
        return
    n_fixtures = 0
    for root, _dirs, files in os.walk(valid_dir):
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


def check_invalid(tests_dir, results, parsed):
    """Check 3: .ktav/.json pairs under invalid/ with expected_error strings."""
    category = "invalid/ pairs"
    invalid_dir = os.path.join(tests_dir, "invalid")
    if not os.path.isdir(invalid_dir):
        results.fail(category, "invalid/ directory not present")
        return
    n_fixtures = 0
    for root, _dirs, files in os.walk(invalid_dir):
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
            if rpath not in parsed or parsed[rpath] is None:
                continue  # parse failure already reported in check 1
            obj = parsed[rpath]
            if not isinstance(obj, dict):
                results.fail(category, "%s: expected_error check skipped: "
                             "not a JSON object" % rpath)
                continue
            err = obj.get("expected_error")
            if not isinstance(err, str) or err == "":
                results.fail(category, "%s: 'expected_error' must be a "
                             "non-empty string" % rpath)
    results.set_count(category, n_fixtures=n_fixtures)


def check_unrepresentable(tests_dir, results, parsed):
    """Check 4: optional unrepresentable/ category: .json objects with reason codes."""
    category = "unrepresentable/"
    unrep_dir = os.path.join(tests_dir, "unrepresentable")
    if not os.path.isdir(unrep_dir):
        results.set_count(category, skipped=True)
        return False
    n_fixtures = 0
    for root, _dirs, files in os.walk(unrep_dir):
        for fname in sorted(files):
            path = os.path.join(root, fname)
            rpath = rel(path, tests_dir)
            if not fname.endswith(".json"):
                results.fail(category, "%s: unexpected file type under "
                             "unrepresentable/ (only .json allowed)" % rpath)
                continue
            n_fixtures += 1
            if rpath not in parsed or parsed[rpath] is None:
                continue  # parse failure already reported
            obj = parsed[rpath]
            if not isinstance(obj, dict):
                results.fail(category, "%s: expected a JSON object" % rpath)
                continue
            if "value" not in obj:
                results.fail(category, "%s: missing required field 'value'" % rpath)
            for field in ("unrepresentable_reason", "note"):
                if not isinstance(obj.get(field), str):
                    results.fail(category, "%s: field '%s' must be a string"
                                 % (rpath, field))
            reason = obj.get("unrepresentable_reason")
            if isinstance(reason, str) and reason not in UNREPRESENTABLE_REASONS:
                results.fail(category, "%s: unknown unrepresentable_reason %r "
                             "(must be one of: %s)"
                             % (rpath, reason, ", ".join(sorted(UNREPRESENTABLE_REASONS))))
    results.set_count(category, n_fixtures=n_fixtures)
    return True


def json_pointer_tokens(pointer):
    """Validate an RFC 6901 pointer; return (tokens, error_message). tokens use
    the raw (still-escaped) segments; None on syntax error."""
    if not pointer.startswith("/"):
        return None, "JSON Pointer must start with '/'"
    raw = pointer[1:].split("/") if pointer[1:] != "" else [""]
    for tok in raw:
        i = 0
        while i < len(tok):
            if tok[i] == "~":
                if i + 1 >= len(tok) or tok[i + 1] not in ("0", "1"):
                    return None, ("invalid escape sequence %r in token %r "
                                  "(only ~0 and ~1 are allowed)"
                                  % (tok[i:i + 2], tok))
                i += 2
            else:
                i += 1
    return raw, None


def unescape_token(tok):
    return tok.replace("~1", "/").replace("~0", "~")


def resolve_pointer(doc, pointer):
    """Resolve pointer against doc. Returns (node, error_message)."""
    raw, err = json_pointer_tokens(pointer)
    if err:
        return None, err
    node = doc
    for depth, tok in enumerate(raw):
        token = unescape_token(tok)
        if isinstance(node, dict):
            if not isinstance(token, str) or token not in node:
                return None, "at token %d (%r): key not found in object" % (depth, token)
            node = node[token]
        elif isinstance(node, list):
            if not token.isdigit() or (len(token) > 1 and token[0] == "0"):
                return None, ("at token %d (%r): expected a canonical non-negative "
                              "array index" % (depth, token))
            idx = int(token)
            if idx >= len(node):
                return None, ("at token %d (%r): array index %d out of range "
                              "(length %d)" % (depth, token, idx, len(node)))
            node = node[idx]
        else:
            return None, ("at token %d (%r): cannot descend into %s"
                          % (depth, token, type(node).__name__))
    return node, None


def check_boundary_fixtures(tests_dir, results, parsed):
    """Check 5: optional boundary-fixtures.json manifest."""
    category = "boundary-fixtures.json"
    manifest_path = os.path.join(tests_dir, "boundary-fixtures.json")
    if not os.path.isfile(manifest_path):
        results.set_count(category, skipped=True)
        return False
    rpath = rel(manifest_path, tests_dir)
    if rpath not in parsed or parsed[rpath] is None:
        results.fail(category, "%s: could not parse manifest (see check 1)" % rpath)
        return True
    manifest = parsed[rpath]
    if not isinstance(manifest, dict):
        results.fail(category, "%s: root must be a JSON object" % rpath)
        return True
    leaves = manifest.get("boundary_dependent_leaves")
    if not isinstance(leaves, list):
        results.fail(category, "%s: 'boundary_dependent_leaves' must be a list" % rpath)
        return True
    seen = {}
    n_ok = 0
    for i, entry in enumerate(leaves):
        if not isinstance(entry, dict):
            results.fail(category, "%s: entry %d must be an object" % (rpath, i))
            continue
        fixture = entry.get("fixture")
        if not isinstance(fixture, str) or fixture == "":
            results.fail(category, "%s: entry %d: 'fixture' must be a non-empty "
                         "string" % (rpath, i))
            fixture = None
        elif fixture.startswith("/"):
            results.fail(category, "%s: entry %d: 'fixture' must not start "
                         "with '/'" % (rpath, i))
            fixture = None
        ptr = entry.get("path")
        if not isinstance(ptr, str):
            results.fail(category, "%s: entry %d: 'path' must be a string"
                         % (rpath, i))
            ptr = None
        bclass = entry.get("boundary_class")
        if bclass not in BOUNDARY_CLASSES:
            results.fail(category, "%s: entry %d: unknown boundary_class %r "
                         "(must be one of: %s)"
                         % (rpath, i, bclass, ", ".join(sorted(BOUNDARY_CLASSES))))
        if fixture is not None:
            base = os.path.join(tests_dir, "valid", *fixture.split("/"))
            triples = [base + ".ktav", base + ".json", base + ".canonical.ktav"]
            missing = [rel(p, tests_dir) for p in triples if not os.path.isfile(p)]
            if missing:
                results.fail(category, "%s: entry %d: fixture %r missing file(s): %s"
                             % (rpath, i, fixture, ", ".join(missing)))
            elif ptr is not None:
                fixture_json = parsed.get(rel(base + ".json", tests_dir))
                if fixture_json is not None:
                    _node, err = resolve_pointer(fixture_json, ptr)
                    if err:
                        results.fail(
                            category, "%s: entry %d: cannot resolve path %r in "
                            "fixture %r: %s" % (rpath, i, ptr, fixture, err))
        if fixture is not None and ptr is not None:
            key = (fixture, ptr)
            if key in seen:
                results.fail(category, "%s: duplicate (fixture, path) pair %r: "
                             "entries %d and %d" % (rpath, key, seen[key], i))
            else:
                seen[key] = i
        n_ok += 1
    results.set_count(category, n_entries=n_ok)
    return True


def main(argv):
    parser = argparse.ArgumentParser(
        description="Validate the structure of a Ktav conformance corpus.")
    parser.add_argument("tests_dir", help="path to a tests directory, e.g. "
                        "versions/0.7/tests")
    args = parser.parse_args(argv)

    tests_dir = args.tests_dir
    if not os.path.isdir(tests_dir):
        print("error: tests_dir does not exist or is not a directory: %s"
              % tests_dir, file=sys.stderr)
        return 2

    results = Results()
    parsed = check_utf8_json(tests_dir, results)
    check_valid(tests_dir, results)
    check_invalid(tests_dir, results, parsed)
    has_unrep = check_unrepresentable(tests_dir, results, parsed)
    has_boundary = check_boundary_fixtures(tests_dir, results, parsed)

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
        if category == "unrepresentable/":
            if c.get("skipped"):
                return "directory not present"
            return "%d fixtures OK" % c.get("n_fixtures", 0)
        if category == "boundary-fixtures.json":
            if c.get("skipped"):
                return "file not present"
            return "%d entries OK" % c.get("n_entries", 0)
        return ""

    order = ["UTF-8/JSON validity", "valid/ triples", "invalid/ pairs",
             "unrepresentable/", "boundary-fixtures.json"]
    skipped_map = {
        "unrepresentable/": not has_unrep,
        "boundary-fixtures.json": not has_boundary,
    }
    overall = "PASS"
    for category in order:
        probs = failures.get(category, [])
        if skipped_map.get(category):
            print("[SKIP] %s: directory not present" % category
                  if category == "unrepresentable/"
                  else "[SKIP] %s: file not present" % category)
        elif probs:
            print("[FAIL] %s: %d problem(s)" % (category, len(probs)))
            for msg in probs:
                print("  - %s" % msg)
            overall = "FAIL"
        else:
            print(line(category, True))
    print("OVERALL: %s" % overall)
    return 0 if overall == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
