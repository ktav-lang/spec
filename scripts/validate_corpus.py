#!/usr/bin/env python3
"""Validate the structure of a Ktav conformance corpus directory.

Purpose:
    Performs read-only structural sanity checks on a tests directory such as
    versions/0.7/tests:

      1. Every file decodes as strict UTF-8; every .json file parses as JSON.
      2. Every fixture under valid/ forms a complete sibling triple
         (<name>.ktav, <name>.json, <name>.canonical.ktav).
      3. Every fixture under invalid/ forms a sibling pair (<name>.ktav,
         <name>.json) and each .json has an `expected_error` drawn from the
         version's closed set of error categories (Sec 6).
      3b. For every invalid/ fixture, the actual UTF-8 validity of its .ktav
         bytes agrees, bidirectionally, with whether its sibling .json's
         `expected_error` is "InvalidUtf8" -- regardless of directory naming
         convention (Sec 6.15).
      4. unrepresentable/ contains exact-schema .json Value descriptions with
         reason-specific recursive witnesses; parseable-unrepresentable/
         contains exact-schema .ktav/.json pairs for writer failures whose
         Values are parser-produced (optional unless --require-unrepresentable
         is passed).
      5. boundary-fixtures.json entries reference existing valid/ triples,
         contain syntactically valid and resolvable RFC 6901 JSON Pointers, use
         known boundary classes, and have no duplicates (optional unless
         --require-boundary is passed). With --boundary-manifest-lock, the
         entry set must also match a separate lock file exactly, catching a
         silently deleted entry that leaves the rest individually well-formed.

Usage:
    python scripts/validate_corpus.py <tests_dir> [--require-unrepresentable]
        [--require-boundary] [--boundary-manifest-lock <path>]
        [--corpus-inventory-lock <path>]

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

# Closed set of expected_error category names, per spec version.
# Derived from versions/0.6/spec.md and versions/0.7/spec.md Sec 6 headings.
# Sec 6.7 and 6.9 are RESERVED: InlineNonEmptyCompound and InvalidTypedScalar
# are historical names implementations MUST NOT emit, so they are absent.
ERROR_CATEGORIES_V0_6 = frozenset({
    "UnbalancedBracket", "UnclosedCompound",        # 6.1
    "DuplicateKey",                                 # 6.2
    "KeyPathConflict",                              # 6.3
    "InvalidKey",                                   # 6.4
    "EmptyKey",                                     # 6.5
    "MissingSeparator",                             # 6.6
    "Io",                                           # 6.8
    "MissingSeparatorSpace",                        # 6.10
    "UnterminatedInlineCompound",                   # 6.11
    "MalformedInlineCompound",                      # 6.12
    "BadEscapeSequence",                            # 6.13
    "OrphanLineAfterTopLevelInline",                # 6.14
})
ERROR_CATEGORIES_V0_7 = ERROR_CATEGORIES_V0_6 | {
    "InvalidUtf8",          # 6.15
    "UnterminatedQuotedKey",  # 6.16
}
ERROR_CATEGORIES_BY_VERSION = {"0.6": ERROR_CATEGORIES_V0_6, "0.7": ERROR_CATEGORIES_V0_7}
DEFAULT_ERROR_CATEGORIES = ERROR_CATEGORIES_V0_7  # == union of all versions (0.6 is a subset)

BOUNDARY_CLASSES = {
    "integer_range",
    "float_range",
    "float_underflow",
    "float_precision",
}

UNREPRESENTABLE_FIELDS = frozenset({
    "value",
    "unrepresentable_reason",
    "note",
})
FLOAT_SENTINEL_KEY = "$float"
FLOAT_SENTINEL_VALUES = frozenset({"NaN", "Infinity", "-Infinity"})
KTAV_WHITESPACE = frozenset(
    chr(codepoint) for codepoint in (
        0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x0020, 0x0085,
        0x00A0, 0x1680, *range(0x2000, 0x200B), 0x2028, 0x2029,
        0x202F, 0x205F, 0x3000,
    )
)
CORPUS_INVENTORY_FIELDS = frozenset({
    "version",
    "valid",
    "invalid",
    "unrepresentable",
    "parseable_unrepresentable",
})


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


def _reject_json_constant(name):
    raise ValueError("non-finite constant '%s' is not allowed in strict JSON" % name)


def _reject_duplicate_keys(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise ValueError("duplicate object key '%s' is not allowed in strict JSON" % key)
        obj[key] = value
    return obj


def loads_strict(text):
    """json.loads that rejects NaN/Infinity/-Infinity and duplicate object keys."""
    return json.loads(text, parse_constant=_reject_json_constant,
                      object_pairs_hook=_reject_duplicate_keys)


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
                    parsed[rel(path, tests_dir)] = loads_strict(text)
                except json.JSONDecodeError as e:
                    results.fail(category, "%s: invalid JSON: %s"
                                 % (rel(path, tests_dir), e))
                    parsed[rel(path, tests_dir)] = None
                except ValueError as e:
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
    if not os.path.isdir(invalid_dir):
        results.set_count(category, n_checked=n_checked)
        return
    for root, _dirs, files in os.walk(invalid_dir):
        for fname in files:
            if not fname.endswith(".json"):
                continue
            name = fname[: -len(".json")]
            ktav_path = os.path.join(root, name + ".ktav")
            if not os.path.isfile(ktav_path):
                continue  # missing sibling already reported by check_invalid
            json_path = os.path.join(root, fname)
            jrpath = rel(json_path, tests_dir)
            if jrpath not in parsed or parsed[jrpath] is None:
                continue  # parse failure already reported in check 1
            obj = parsed[jrpath]
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


def _strip_ktav_whitespace(text):
    start = 0
    end = len(text)
    while start < end and text[start] in KTAV_WHITESPACE:
        start += 1
    while end > start and text[end - 1] in KTAV_WHITESPACE:
        end -= 1
    return text[start:end]


def _semantic_kind(value):
    if isinstance(value, dict):
        if (set(value) == {FLOAT_SENTINEL_KEY}
                and value[FLOAT_SENTINEL_KEY] in FLOAT_SENTINEL_VALUES):
            return "Float"
        return "Object"
    if isinstance(value, list):
        return "Array"
    if value is None:
        return "Null"
    if isinstance(value, bool):
        return "Bool"
    if isinstance(value, int):
        return "Integer"
    if isinstance(value, float):
        return "Float"
    if isinstance(value, str):
        return "String"
    return None


def _multiline_collision_witness(text):
    """Return the § 5.9.7 collision witnesses for a String body."""
    if "\n" not in text:
        return False, False, False
    lines = text.split("\n")
    trimmed = [_strip_ktav_whitespace(line) for line in lines]
    has_double_closer = any(line == "))" for line in trimmed)
    has_single_closer = any(line == ")" for line in trimmed)
    trailing = any(line and line[-1] in KTAV_WHITESPACE for line in lines)

    non_blank = [line for line in lines if _strip_ktav_whitespace(line) != ""]
    leading = False
    if non_blank:
        leading_runs = []
        for line in non_blank:
            run = 0
            while run < len(line) and line[run] in KTAV_WHITESPACE:
                run += 1
            leading_runs.append(run)
        common = min(leading_runs)
        leading = common > 0 and all(
            line[:common] == non_blank[0][:common] for line in non_blank
        )

    return (
        has_double_closer and has_single_closer,
        has_double_closer and trailing,
        has_double_closer and leading,
    )


def _inspect_unrepresentable_value(value):
    """Validate the Value mapping and collect reason witnesses recursively."""
    errors = []
    witnesses = {reason: False for reason in UNREPRESENTABLE_REASONS}

    def walk(node, path):
        if isinstance(node, dict):
            if FLOAT_SENTINEL_KEY in node:
                if (set(node) != {FLOAT_SENTINEL_KEY}
                        or node[FLOAT_SENTINEL_KEY] not in FLOAT_SENTINEL_VALUES):
                    errors.append(
                        "%s: '$float' must be the only field of a sentinel "
                        "with value 'NaN', 'Infinity', or '-Infinity'" % path)
                else:
                    witnesses["NonFiniteFloat"] = True
                return
            for key, child in node.items():
                if key == "":
                    witnesses["EmptyKeyName"] = True
                walk(child, "%s/%s" % (path, key.replace("~", "~0").replace("/", "~1")))
        elif isinstance(node, list):
            for index, child in enumerate(node):
                walk(child, "%s/%d" % (path, index))
        elif isinstance(node, str):
            if "\r" in node:
                witnesses["CRByte"] = True
            both, trailing, leading = _multiline_collision_witness(node)
            witnesses["BothFormsRequired"] |= both
            witnesses["TrailingWhitespaceCollision"] |= trailing
            witnesses["LeadingWhitespaceCollision"] |= leading

    walk(value, "/value")
    return errors, witnesses, _semantic_kind(value)


def _check_unrepresentable_object(obj, rpath, results, category):
    if not isinstance(obj, dict):
        results.fail(category, "%s: expected a JSON object" % rpath)
        return

    fields = set(obj)
    missing = sorted(UNREPRESENTABLE_FIELDS - fields)
    extra = sorted(fields - UNREPRESENTABLE_FIELDS)
    if missing:
        results.fail(category, "%s: missing required field(s): %s"
                     % (rpath, ", ".join(repr(field) for field in missing)))
    if extra:
        results.fail(category, "%s: unexpected field(s): %s"
                     % (rpath, ", ".join(repr(field) for field in extra)))

    reason = obj.get("unrepresentable_reason")
    note = obj.get("note")
    if not isinstance(reason, str) or reason == "":
        results.fail(category, "%s: 'unrepresentable_reason' must be a "
                     "non-empty string" % rpath)
    elif reason not in UNREPRESENTABLE_REASONS:
        results.fail(category, "%s: unknown unrepresentable_reason %r "
                     "(must be one of: %s)"
                     % (rpath, reason, ", ".join(sorted(UNREPRESENTABLE_REASONS))))
    if not isinstance(note, str) or note == "":
        results.fail(category, "%s: 'note' must be a non-empty string" % rpath)
    if "value" not in obj:
        return

    value_errors, witnesses, root_kind = _inspect_unrepresentable_value(
        obj["value"]
    )
    for message in value_errors:
        results.fail(category, "%s: %s" % (rpath, message))
    if not isinstance(reason, str) or reason not in UNREPRESENTABLE_REASONS:
        return
    if reason == "ScalarRoot":
        applicable = root_kind not in ("Object", "Array")
    else:
        applicable = root_kind in ("Object", "Array") and witnesses[reason]
    if not applicable:
        results.fail(category, "%s: value does not contain a recursive witness "
                     "for reason %r" % (rpath, reason))


def check_unrepresentable(tests_dir, results, parsed, require=False):
    """Check 4: programmatic-only unrepresentable Value descriptions."""
    category = "unrepresentable/"
    unrep_dir = os.path.join(tests_dir, "unrepresentable")
    if not os.path.isdir(unrep_dir):
        if require:
            results.fail(category, "unrepresentable/ directory not present (required)")
            return False
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
            if rpath in parsed and parsed[rpath] is not None:
                _check_unrepresentable_object(parsed[rpath], rpath, results, category)
    results.set_count(category, n_fixtures=n_fixtures)
    return True


def check_parseable_unrepresentable(tests_dir, results, parsed, require=False):
    """Check parser-produced Values that a conforming writer must reject."""
    category = "parseable-unrepresentable/"
    fixture_dir = os.path.join(tests_dir, "parseable-unrepresentable")
    if not os.path.isdir(fixture_dir):
        if require:
            results.fail(category, "parseable-unrepresentable/ directory not "
                         "present (required)")
            return False
        results.set_count(category, skipped=True)
        return False
    n_fixtures = 0
    for root, _dirs, files in os.walk(fixture_dir):
        primary = set()
        jsons = set()
        for fname in files:
            if fname.endswith(".canonical.ktav"):
                results.fail(category, "%s: canonical output is not allowed "
                             "under parseable-unrepresentable/"
                             % rel(os.path.join(root, fname), tests_dir))
            elif fname.endswith(".ktav"):
                primary.add(fname[:-len(".ktav")])
            elif fname.endswith(".json"):
                jsons.add(fname[:-len(".json")])
            else:
                results.fail(category, "%s: unexpected file type under "
                             "parseable-unrepresentable/ (only .ktav and .json "
                             "allowed)" % rel(os.path.join(root, fname), tests_dir))
        for name in sorted(primary - jsons):
            results.fail(category, "%s: missing sibling %s"
                         % (rel(os.path.join(root, name + ".ktav"), tests_dir),
                            rel(os.path.join(root, name + ".json"), tests_dir)))
        for name in sorted(jsons - primary):
            results.fail(category, "%s: missing sibling %s"
                         % (rel(os.path.join(root, name + ".json"), tests_dir),
                            rel(os.path.join(root, name + ".ktav"), tests_dir)))
        for name in sorted(jsons):
            n_fixtures += 1
            rpath = rel(os.path.join(root, name + ".json"), tests_dir)
            if rpath in parsed and parsed[rpath] is not None:
                _check_unrepresentable_object(parsed[rpath], rpath, results, category)
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


def _is_within(child, parent):
    """True if realpath(child) is parent itself or lies under realpath(parent)."""
    child = os.path.realpath(child)
    parent = os.path.realpath(parent)
    try:
        rel = os.path.relpath(child, parent)
    except ValueError:
        # Windows cross-drive paths can never be within the tree.
        return False
    return rel == os.curdir or not (rel == os.pardir or rel.startswith(os.pardir + os.sep))


def _boundary_record_key(entry):
    """Hashable identity for a boundary_dependent_leaves entry (or a lock-file
    record of the same shape), used for lock-file set comparison. Uses raw
    field values -- even if malformed -- so a deletion is caught regardless
    of whatever other per-entry validity problems are separately reported."""
    if not isinstance(entry, dict):
        return ("<non-object>", repr(entry))
    return (entry.get("fixture"), entry.get("path"), entry.get("boundary_class"))


def _boundary_record_repr(key):
    fixture, ptr, bclass = key
    return "{fixture: %r, path: %r, boundary_class: %r}" % (fixture, ptr, bclass)


def check_boundary_manifest_lock(results, rpath, leaves, lock_path):
    """Compare the manifest's 'boundary_dependent_leaves' entries against a
    lock file's entries as a multiset (order-independent, duplicate-aware),
    so a silently deleted entry -- with every remaining entry still
    individually well-formed -- is caught."""
    category = "boundary-fixtures.json"
    try:
        with open(lock_path, "r", encoding="utf-8") as f:
            lock_text = f.read()
    except OSError as e:
        results.fail(category, "--boundary-manifest-lock %s: unreadable: %s"
                     % (lock_path, e))
        return
    try:
        lock_data = loads_strict(lock_text)
    except (json.JSONDecodeError, ValueError) as e:
        results.fail(category, "--boundary-manifest-lock %s: invalid JSON: %s"
                     % (lock_path, e))
        return
    if not isinstance(lock_data, list):
        results.fail(category, "--boundary-manifest-lock %s: root must be a "
                     "JSON array" % lock_path)
        return

    def counts(records):
        c = {}
        for entry in records:
            key = _boundary_record_key(entry)
            c[key] = c.get(key, 0) + 1
        return c

    expected = counts(lock_data)
    actual = counts(leaves)
    missing = []
    extra = []
    for key, cnt in expected.items():
        shortfall = cnt - actual.get(key, 0)
        if shortfall > 0:
            missing.extend([key] * shortfall)
    for key, cnt in actual.items():
        surplus = cnt - expected.get(key, 0)
        if surplus > 0:
            extra.extend([key] * surplus)
    if missing or extra:
        parts = []
        if missing:
            parts.append("missing from %s (present in lock file): %s"
                         % (rpath, "; ".join(_boundary_record_repr(k) for k in missing)))
        if extra:
            parts.append("unexpected in %s (absent from lock file): %s"
                         % (rpath, "; ".join(_boundary_record_repr(k) for k in extra)))
        results.fail(category, "--boundary-manifest-lock %s: manifest does not "
                     "match lock file exactly; %s" % (lock_path, "; ".join(parts)))


def check_boundary_fixtures(tests_dir, results, parsed, require=False, lock_path=None):
    """Check 5: boundary-fixtures.json manifest. With require=True a missing
    manifest is a failure instead of a skip, and an empty
    'boundary_dependent_leaves' list is also a failure. With lock_path set,
    the manifest's entries must match that lock file's entries exactly (see
    check_boundary_manifest_lock)."""
    category = "boundary-fixtures.json"
    manifest_path = os.path.join(tests_dir, "boundary-fixtures.json")
    if not os.path.isfile(manifest_path):
        if require or lock_path is not None:
            results.fail(category, "boundary-fixtures.json not present (required)")
            return False
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
    if require and not leaves:
        results.fail(category, "%s: 'boundary_dependent_leaves' must not be empty: "
                     "a required manifest must name at least one boundary-dependent "
                     "leaf" % rpath)
    if lock_path is not None:
        check_boundary_manifest_lock(results, rpath, leaves, lock_path)
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
        elif "\\" in fixture or any(seg in ("", ".", "..") for seg in fixture.split("/")):
            results.fail(category, "%s: entry %d: 'fixture' must be a '/'-separated "
                         "path of plain name segments under valid/ (no '..', '.', "
                         "empty segments, or backslashes): %r" % (rpath, i, fixture))
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
            valid_root = os.path.join(tests_dir, "valid")
            triples = [base + ".ktav", base + ".json", base + ".canonical.ktav"]
            if not all(_is_within(p, valid_root) for p in triples):
                results.fail(category, "%s: entry %d: fixture %r resolves outside "
                             "<tests_dir>/valid/" % (rpath, i, fixture))
                fixture = None
        if fixture is not None:
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


def _fixture_inventory(tests_dir):
    """Return fixture paths relative to each corpus category directory."""
    def collect(category, suffix, exclude_suffix=None):
        directory = os.path.join(tests_dir, category)
        found = []
        if not os.path.isdir(directory):
            return found
        for root, _dirs, files in os.walk(directory):
            for fname in files:
                if not fname.endswith(suffix):
                    continue
                if exclude_suffix and fname.endswith(exclude_suffix):
                    continue
                path = os.path.join(root, fname)
                found.append(os.path.relpath(path, directory)[:-len(suffix)]
                             .replace(os.sep, "/"))
        return sorted(found)

    return {
        "valid": collect("valid", ".ktav", ".canonical.ktav"),
        "invalid": collect("invalid", ".ktav"),
        "unrepresentable": collect("unrepresentable", ".json"),
        "parseable_unrepresentable": collect("parseable-unrepresentable", ".ktav",
                                              ".canonical.ktav"),
    }


def _validate_inventory_list(value, field, results, rpath):
    if not isinstance(value, list):
        results.fail("corpus inventory lock", "%s: %r must be an array"
                     % (rpath, field))
        return []
    seen = set()
    valid = []
    for item in value:
        if not isinstance(item, str) or item == "":
            results.fail("corpus inventory lock", "%s: %r entries must be "
                         "non-empty strings" % (rpath, field))
            continue
        parts = item.split("/")
        if ("\\" in item or any(part in ("", ".", "..") for part in parts)):
            results.fail("corpus inventory lock", "%s: %r contains invalid "
                         "fixture path %r" % (rpath, field, item))
            continue
        if item in seen:
            results.fail("corpus inventory lock", "%s: %r contains duplicate "
                         "fixture %r" % (rpath, field, item))
            continue
        seen.add(item)
        valid.append(item)
    return sorted(valid)


def check_corpus_inventory_lock(tests_dir, results, lock_path):
    """Require the complete versioned fixture inventory to match a lock."""
    category = "corpus inventory lock"
    try:
        with open(lock_path, "r", encoding="utf-8") as f:
            lock_text = f.read()
    except OSError as e:
        results.fail(category, "--corpus-inventory-lock %s: unreadable: %s"
                     % (lock_path, e))
        return
    try:
        lock_data = loads_strict(lock_text)
    except (json.JSONDecodeError, ValueError) as e:
        results.fail(category, "--corpus-inventory-lock %s: invalid JSON: %s"
                     % (lock_path, e))
        return
    if not isinstance(lock_data, dict):
        results.fail(category, "--corpus-inventory-lock %s: root must be a JSON "
                     "object" % lock_path)
        return
    missing = sorted(CORPUS_INVENTORY_FIELDS - set(lock_data))
    extra = sorted(set(lock_data) - CORPUS_INVENTORY_FIELDS)
    if missing:
        results.fail(category, "%s: missing required field(s): %s"
                     % (lock_path, ", ".join(repr(field) for field in missing)))
    if extra:
        results.fail(category, "%s: unexpected field(s): %s"
                     % (lock_path, ", ".join(repr(field) for field in extra)))
    if lock_data.get("version") != "0.7.0":
        results.fail(category, "%s: 'version' must be '0.7.0'" % lock_path)
    expected = {}
    for field in sorted(CORPUS_INVENTORY_FIELDS - {"version"}):
        expected[field] = _validate_inventory_list(lock_data.get(field), field,
                                                    results, lock_path)
    actual = _fixture_inventory(tests_dir)
    for field in sorted(expected):
        if expected[field] != actual[field]:
            missing_items = sorted(set(expected[field]) - set(actual[field]))
            extra_items = sorted(set(actual[field]) - set(expected[field]))
            details = []
            if missing_items:
                details.append("missing from corpus: %s" % ", ".join(missing_items))
            if extra_items:
                details.append("not present in lock: %s" % ", ".join(extra_items))
            results.fail(category, "%s: %s inventory differs (%s)"
                         % (field, lock_path, "; ".join(details)))
    results.set_count(category, **{field: len(actual[field]) for field in actual})


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
                        "valid/invalid/unrepresentable/parseable-unrepresentable "
                        "fixture inventory must match exactly")
    args = parser.parse_args(argv)

    tests_dir = args.tests_dir
    if not os.path.isdir(tests_dir):
        print("error: tests_dir does not exist or is not a directory: %s"
              % tests_dir, file=sys.stderr)
        return 2

    results = Results()
    parsed = check_utf8_json(tests_dir, results)
    check_valid(tests_dir, results)
    check_invalid(tests_dir, results, parsed, select_error_categories(tests_dir))
    check_invalid_utf8_oracle(tests_dir, results, parsed)
    has_unrep = check_unrepresentable(tests_dir, results, parsed,
                                      require=args.require_unrepresentable)
    has_parseable_unrep = check_parseable_unrepresentable(
        tests_dir, results, parsed, require=args.require_unrepresentable)
    has_boundary = check_boundary_fixtures(tests_dir, results, parsed,
                                           require=args.require_boundary,
                                           lock_path=args.boundary_manifest_lock)
    if args.corpus_inventory_lock is not None:
        check_corpus_inventory_lock(tests_dir, results, args.corpus_inventory_lock)

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
        return ""

    order = ["UTF-8/JSON validity", "valid/ triples", "invalid/ pairs",
             "invalid_utf8 oracle consistency", "unrepresentable/",
             "parseable-unrepresentable/", "boundary-fixtures.json",
             "corpus inventory lock"]
    skipped_map = {
        "unrepresentable/": not has_unrep and not args.require_unrepresentable,
        "parseable-unrepresentable/": (not has_parseable_unrep
                                        and not args.require_unrepresentable),
        "boundary-fixtures.json": (not has_boundary and not args.require_boundary
                                   and args.boundary_manifest_lock is None),
    }
    overall = "PASS"
    for category in order:
        probs = failures.get(category, [])
        if skipped_map.get(category):
            label = ("file not present"
                     if category == "boundary-fixtures.json"
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


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
