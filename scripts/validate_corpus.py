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
      6. With --corpus-inventory-lock, tests/ has the exact 0.7 top-level
         layout and every corpus file path and raw-byte SHA-256 digest matches
         the versioned lock. Semantic and schema checks still run independently.

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
import hashlib
import json
import math
import os
import re
import sys
from decimal import Decimal, InvalidOperation

PROGRAMMATIC_UNREPRESENTABLE_REASONS = frozenset({
    "ScalarRoot",
    "EmptyKeyName",
    "NonFiniteFloat",
})
PARSER_UNREPRESENTABLE_REASONS = frozenset({
    "CRByte",
    "BothFormsRequired",
    "TrailingWhitespaceCollision",
    "LeadingWhitespaceCollision",
})
UNREPRESENTABLE_REASONS = (
    PROGRAMMATIC_UNREPRESENTABLE_REASONS | PARSER_UNREPRESENTABLE_REASONS
)

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
CORPUS_INVENTORY_FIELDS = frozenset({"version", "files"})
LOCKED_CORPUS_DIRS = frozenset({
    "valid", "invalid", "unrepresentable", "parseable-unrepresentable",
})
LOCKED_CORPUS_FILES = frozenset({"boundary-fixtures.json"})
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
ARRAY_INDEX_RE = re.compile(r"^(0|[1-9][0-9]*)$")
DECIMAL_PART = r"[0-9](?:_?[0-9])*"
INTEGER_LITERAL_RE = re.compile(
    rf"^[+-]?(?:0x[0-9a-fA-F](?:_?[0-9a-fA-F])*|"
    rf"0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*|{DECIMAL_PART})$"
)
FLOAT_LITERAL_RE = re.compile(
    rf"^[+-]?(?:{DECIMAL_PART}\.{DECIMAL_PART}(?:[eE][+-]?{DECIMAL_PART})?|"
    rf"{DECIMAL_PART}[eE][+-]?{DECIMAL_PART})$"
)
BOUNDARY_RECORD_FIELDS = frozenset({"fixture", "path", "boundary_class"})
I64_MIN = -(1 << 63)
I64_MAX = (1 << 63) - 1
JSON_PARSE_FAILED = object()
JSON_RECURSION_ERROR = "maximum recursion depth exceeded while parsing JSON"


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
    """True for an invalid/ .ktav input whose sibling oracle says InvalidUtf8."""
    parts = rpath.split("/")
    return len(parts) >= 2 and parts[0] == "invalid" and rpath.endswith(".ktav")


def _sibling_declares_invalid_utf8(path):
    """Read the sibling oracle without depending on its directory name."""
    sibling = path[:-len(".ktav")] + ".json"
    try:
        with open(sibling, "r", encoding="utf-8") as stream:
            value = loads_strict(stream.read())
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError, RecursionError):
        return False
    return isinstance(value, dict) and value.get("expected_error") == "InvalidUtf8"


def _reject_json_constant(name):
    raise ValueError("non-finite constant '%s' is not allowed in strict JSON" % name)


def _reject_duplicate_keys(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise ValueError("duplicate object key '%s' is not allowed in strict JSON" % key)
        obj[key] = value
    return obj


def _parse_json_float(token):
    value = float(token)
    if not math.isfinite(value):
        raise ValueError("non-finite JSON number %r is not allowed" % token)
    return value


def loads_strict(text):
    """json.loads that rejects NaN/Infinity/-Infinity and duplicate object keys."""
    return json.loads(text, parse_constant=_reject_json_constant,
                      parse_float=_parse_json_float,
                      object_pairs_hook=_reject_duplicate_keys)


def check_utf8_json(tests_dir, results):
    """Check 1: strict UTF-8 decode for every file; json.loads for every .json.
    Exception: an invalid/ .ktav fixture whose sibling oracle declares
    InvalidUtf8 is deliberately not valid UTF-8."""
    category = "UTF-8/JSON validity"
    n_files = 0
    n_json = 0
    n_exempt = 0
    parsed = {}  # relpath -> parsed object, or JSON_PARSE_FAILED on failure
    for root, _dirs, files in os.walk(tests_dir):
        for fname in files:
            path = os.path.join(root, fname)
            if os.path.islink(path) or not os.path.isfile(path):
                continue
            n_files += 1
            rpath = rel(path, tests_dir)
            try:
                with open(path, "rb") as f:
                    raw = f.read()
                text = raw.decode("utf-8", errors="strict")
            except UnicodeDecodeError as e:
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
                                 % (rel(path, tests_dir), e))
                    parsed[rel(path, tests_dir)] = JSON_PARSE_FAILED
                except ValueError as e:
                    results.fail(category, "%s: invalid JSON: %s"
                                 % (rel(path, tests_dir), e))
                    parsed[rel(path, tests_dir)] = JSON_PARSE_FAILED
                except RecursionError:
                    results.fail(category, "%s: invalid JSON: %s"
                                 % (rel(path, tests_dir), JSON_RECURSION_ERROR))
                    parsed[rel(path, tests_dir)] = JSON_PARSE_FAILED
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


def _walk_regular_category_files(directory, tests_dir, results, category):
    if os.path.islink(directory):
        results.fail(category, "%s: category root must not be a symlink"
                     % rel(directory, tests_dir))
        return
    for root, dirs, files in os.walk(directory, topdown=True, followlinks=False):
        dirs.sort()
        for dirname in list(dirs):
            path = os.path.join(root, dirname)
            if os.path.islink(path):
                results.fail(category, "%s: symlink directory is not allowed"
                             % rel(path, tests_dir))
                dirs.remove(dirname)
        regular = []
        for filename in sorted(files):
            path = os.path.join(root, filename)
            if os.path.islink(path) or not os.path.isfile(path):
                results.fail(category, "%s: symlink or special file is not allowed"
                             % rel(path, tests_dir))
            else:
                regular.append(filename)
        yield root, regular


def check_valid(tests_dir, results, parsed):
    """Check 2: complete .ktav/.json/.canonical.ktav triples under valid/."""
    category = "valid/ triples"
    valid_dir = os.path.join(tests_dir, "valid")
    if not os.path.isdir(valid_dir):
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
                errors, _witnesses, root_kind = _inspect_unrepresentable_value(
                    oracle, sentinel_policy="ordinary"
                )
                for message in errors:
                    results.fail(category, "%s: %s" % (rpath, message))
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
    if not os.path.isdir(invalid_dir):
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


def _strip_ktav_whitespace(text):
    start = 0
    end = len(text)
    while start < end and text[start] in KTAV_WHITESPACE:
        start += 1
    while end > start and text[end - 1] in KTAV_WHITESPACE:
        end -= 1
    return text[start:end]


def _semantic_kind(value, decode_float_sentinel=True):
    if isinstance(value, dict):
        if (decode_float_sentinel
                and set(value) == {FLOAT_SENTINEL_KEY}
                and isinstance(value[FLOAT_SENTINEL_KEY], str)
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
    lines = text.split("\n")
    trimmed = [_strip_ktav_whitespace(line) for line in lines]
    has_double_closer = any(line == "))" for line in trimmed)
    has_single_closer = any(line == ")" for line in trimmed)
    trailing = any(line and line[-1] in KTAV_WHITESPACE for line in lines)

    non_blank = [line for line in lines if _strip_ktav_whitespace(line) != ""]
    leading = False
    if non_blank:
        common_prefix = None
        for line in non_blank:
            run = 0
            while run < len(line) and line[run] in KTAV_WHITESPACE:
                run += 1
            prefix = line[:run]
            if common_prefix is None:
                common_prefix = prefix
                continue
            common_length = min(len(common_prefix), len(prefix))
            while (common_length > 0
                   and common_prefix[:common_length] != prefix[:common_length]):
                common_length -= 1
            common_prefix = common_prefix[:common_length]
        leading = bool(common_prefix)

    return (
        has_double_closer and has_single_closer,
        has_double_closer and trailing,
        has_double_closer and leading,
    )


def _lone_surrogate(value):
    for char in value:
        codepoint = ord(char)
        if 0xD800 <= codepoint <= 0xDFFF:
            return codepoint
    return None


def _oracle_path(path, key):
    escaped = json.dumps(key, ensure_ascii=True)[1:-1]
    return "%s/%s" % (path, escaped.replace("~", "~0").replace("/", "~1"))


def _inspect_unrepresentable_value(value, sentinel_policy="allow"):
    """Validate a recursive Value oracle and collect writer-failure witnesses.

    sentinel_policy is "allow" for programmatic-only fixtures and "forbid"
    for parser-produced fixtures.
    """
    errors = []
    witnesses = {reason: False for reason in UNREPRESENTABLE_REASONS}

    def walk(node, path):
        if isinstance(node, dict):
            for key in node:
                surrogate = _lone_surrogate(key)
                if surrogate is not None:
                    errors.append("%s: Object key contains lone surrogate U+%04X"
                                  % (path, surrogate))
            if FLOAT_SENTINEL_KEY in node and sentinel_policy != "ordinary":
                if sentinel_policy == "forbid":
                    errors.append("%s: '$float' sentinel is not allowed in a "
                                  "parser-produced Value oracle" % path)
                    for key, child in node.items():
                        walk(child, _oracle_path(path, key))
                    return
                if (set(node) != {FLOAT_SENTINEL_KEY}
                        or not isinstance(node[FLOAT_SENTINEL_KEY], str)
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
                walk(child, _oracle_path(path, key))
        elif isinstance(node, list):
            for index, child in enumerate(node):
                walk(child, "%s/%d" % (path, index))
        elif isinstance(node, str):
            surrogate = _lone_surrogate(node)
            if surrogate is not None:
                errors.append("%s: String contains lone surrogate U+%04X"
                              % (path, surrogate))
            if "\r" in node:
                witnesses["CRByte"] = True
            both, trailing, leading = _multiline_collision_witness(node)
            witnesses["BothFormsRequired"] |= both
            witnesses["TrailingWhitespaceCollision"] |= trailing
            witnesses["LeadingWhitespaceCollision"] |= leading
        elif isinstance(node, float) and not math.isfinite(node):
            errors.append("%s: ordinary JSON number must be finite" % path)
        elif (isinstance(node, int) and not isinstance(node, bool)
              and sentinel_policy in ("ordinary", "forbid")
              and not I64_MIN <= node <= I64_MAX):
            errors.append("%s: parser-produced JSON Integer %d is outside "
                          "the mandatory i64 range [%d, %d]"
                          % (path, node, I64_MIN, I64_MAX))

    try:
        walk(value, "/value")
        root_kind = _semantic_kind(
            value, decode_float_sentinel=sentinel_policy == "allow"
        )
    except RecursionError:
        errors.append("/value: maximum recursion depth exceeded while validating "
                      "JSON value")
        root_kind = None
    return errors, witnesses, root_kind


def _check_unrepresentable_object(obj, rpath, results, category,
                                  allowed_reasons, parser_produced):
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
    elif reason not in allowed_reasons:
        results.fail(category, "%s: unrepresentable_reason %r is not allowed "
                     "in %s (must be one of: %s)"
                     % (rpath, reason, category,
                        ", ".join(sorted(allowed_reasons))))
    if not isinstance(note, str) or note == "":
        results.fail(category, "%s: 'note' must be a non-empty string" % rpath)
    if "value" not in obj:
        return

    value_errors, witnesses, root_kind = _inspect_unrepresentable_value(
        obj["value"], sentinel_policy="allow" if not parser_produced else "ordinary"
    )
    for message in value_errors:
        results.fail(category, "%s: %s" % (rpath, message))
    if parser_produced and root_kind not in ("Object", "Array"):
        results.fail(category, "%s: parser-produced Value oracle root must be "
                     "Object or Array" % rpath)
    if not isinstance(reason, str) or reason not in allowed_reasons:
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
    for root, files in _walk_regular_category_files(
            unrep_dir, tests_dir, results, category):
        for fname in sorted(files):
            path = os.path.join(root, fname)
            rpath = rel(path, tests_dir)
            if not fname.endswith(".json"):
                results.fail(category, "%s: unexpected file type under "
                             "unrepresentable/ (only .json allowed)" % rpath)
                continue
            n_fixtures += 1
            value = parsed.get(rpath, JSON_PARSE_FAILED)
            if value is not JSON_PARSE_FAILED:
                _check_unrepresentable_object(
                    value, rpath, results, category,
                    PROGRAMMATIC_UNREPRESENTABLE_REASONS,
                    parser_produced=False,
                )
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
    for root, files in _walk_regular_category_files(
            fixture_dir, tests_dir, results, category):
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
            value = parsed.get(rpath, JSON_PARSE_FAILED)
            if value is not JSON_PARSE_FAILED:
                _check_unrepresentable_object(
                    value, rpath, results, category,
                    PARSER_UNREPRESENTABLE_REASONS,
                    parser_produced=True,
                )
    results.set_count(category, n_fixtures=n_fixtures)
    return True


def json_pointer_tokens(pointer):
    """Validate an RFC 6901 pointer; return (tokens, error_message). tokens use
    the raw (still-escaped) segments; None on syntax error."""
    if not isinstance(pointer, str):
        return None, "JSON Pointer must be a string"
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
            if ARRAY_INDEX_RE.fullmatch(token) is None:
                return None, ("at token %d (%r): expected a canonical non-negative "
                              "array index" % (depth, token))
            try:
                idx = int(token, 10)
            except ValueError:
                return None, ("at token %d (%r): array index is too large"
                              % (depth, token))
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


def _boundary_record_shape(entry):
    """Return whether a record is safe to use as a hash/multiset key."""
    if not isinstance(entry, dict):
        return False
    if set(entry) != BOUNDARY_RECORD_FIELDS:
        return False
    if any(not isinstance(entry[field], str) for field in BOUNDARY_RECORD_FIELDS):
        return False
    fixture = entry["fixture"]
    if (not fixture or "\\" in fixture
            or any(part in ("", ".", "..") for part in fixture.split("/"))):
        return False
    _tokens, pointer_error = json_pointer_tokens(entry["path"])
    return (entry["boundary_class"] in BOUNDARY_CLASSES
            and pointer_error is None)


def _report_boundary_record_shape(results, category, label, entry):
    """Validate the closed record schema before inspecting its values."""
    if not isinstance(entry, dict):
        results.fail(category, "%s must be an object" % label)
        return False
    fields = set(entry)
    missing = sorted(BOUNDARY_RECORD_FIELDS - fields)
    extra = sorted(fields - BOUNDARY_RECORD_FIELDS)
    if missing:
        results.fail(category, "%s: missing required field(s): %s"
                     % (label, ", ".join(repr(field) for field in missing)))
    if extra:
        results.fail(category, "%s: unexpected field(s): %s"
                     % (label, ", ".join(repr(field) for field in extra)))
    if missing or extra:
        return False
    valid = True
    for field in sorted(BOUNDARY_RECORD_FIELDS):
        if not isinstance(entry[field], str):
            results.fail(category, "%s: %r must be a string"
                         % (label, field))
            valid = False
    if valid and entry["boundary_class"] not in BOUNDARY_CLASSES:
        results.fail(category, "%s: unknown boundary_class %r (must be one of: %s)"
                     % (label, entry["boundary_class"],
                        ", ".join(sorted(BOUNDARY_CLASSES))))
        valid = False
    if valid and entry["fixture"] == "":
        results.fail(category, "%s: 'fixture' must be a non-empty string" % label)
        valid = False
    if valid and ("\\" in entry["fixture"]
                  or any(part in ("", ".", "..")
                         for part in entry["fixture"].split("/"))):
        results.fail(category, "%s: 'fixture' must be a '/'-separated path "
                     "of plain name segments under valid/ (no '..', '.', "
                     "empty segments, or backslashes): %r"
                     % (label, entry["fixture"]))
        valid = False
    if valid:
        _tokens, pointer_error = json_pointer_tokens(entry["path"])
        if pointer_error:
            results.fail(category, "%s: 'path' is not a valid JSON Pointer: %s"
                         % (label, pointer_error))
            valid = False
    return valid


def _source_literals_for_pointer(text, tokens):
    """Find an unquoted pair-line literal for a JSON object path.

    Boundary fixtures use scalar pair lines. Only a complete dotted path is
    accepted; inline, ambiguous, or context-dependent forms are rejected
    rather than guessed.
    """
    if not tokens:
        return []
    target = ".".join(tokens)
    matches = []
    for line in text.split("\n"):
        stripped = _strip_ktav_whitespace(line)
        if not stripped or stripped.startswith("#"):
            continue
        match = re.match(r"^(.+?)(::|:)(.*)$", stripped)
        if match is None:
            continue
        key, separator, remainder = match.groups()
        if not remainder or remainder[0] not in KTAV_WHITESPACE:
            continue
        literal = _strip_ktav_whitespace(remainder)
        if any(char in key for char in "'\"`"):
            continue
        if key == target:
            matches.append((key, separator, literal))
    return matches


def _parse_source_numeric_literal(text, tokens):
    matches = _source_literals_for_pointer(text, tokens)
    if len(matches) != 1:
        return None, ("could not identify one unquoted Ktav source literal for "
                      "the object field")
    _key, separator, literal = matches[0]
    if separator != ":":
        return None, "Ktav source field uses a raw string marker, not a numeric literal"
    if any(char in KTAV_WHITESPACE for char in literal):
        return None, "Ktav source field is not a single numeric literal"
    return literal, None


def _parse_integer_literal(literal):
    if INTEGER_LITERAL_RE.fullmatch(literal) is None:
        return None
    cleaned = literal.replace("_", "")
    sign = 1
    if cleaned[:1] in ("+", "-"):
        sign = -1 if cleaned[0] == "-" else 1
        cleaned = cleaned[1:]
    if cleaned.startswith("0b"):
        base = 2
    elif cleaned.startswith("0o"):
        base = 8
    elif cleaned.startswith("0x"):
        base = 16
    else:
        base = 10
    try:
        return sign * int(cleaned, base)
    except ValueError:
        # Python 3.11+ limits decimal string-to-int conversions. A literal
        # that trips that limit is necessarily outside the i64 boundary.
        return I64_MAX + 1 if sign > 0 else I64_MIN - 1


def _parse_float_literal(literal):
    if FLOAT_LITERAL_RE.fullmatch(literal) is None:
        return None
    try:
        return float(literal.replace("_", ""))
    except (OverflowError, ValueError):
        return None


def _check_boundary_semantics(tests_dir, results, rpath, index, entry,
                              fixture_json, fixture_ktav):
    """Require a real source/oracle divergence for the declared boundary."""
    category = "boundary-fixtures.json"
    ptr = entry["path"]
    raw_tokens, pointer_error = json_pointer_tokens(ptr)
    if pointer_error:
        return
    node, error = resolve_pointer(fixture_json, ptr)
    if error:
        return
    if not raw_tokens:
        return
    parent_pointer = ("/" + "/".join(raw_tokens[:-1])) if len(raw_tokens) > 1 else ""
    parent = fixture_json if not parent_pointer else resolve_pointer(
        fixture_json, parent_pointer
    )[0]
    if not isinstance(parent, dict) or isinstance(node, (dict, list)):
        results.fail(category, "%s: entry path %r must identify a scalar field "
                     "of an Object" % (rpath, ptr))
        return
    try:
        with open(fixture_ktav, "r", encoding="utf-8") as stream:
            source_text = stream.read()
    except (OSError, UnicodeError) as error:
        results.fail(category, "%s: cannot read Ktav source for %r: %s"
                     % (rpath, entry["fixture"], error))
        return
    literal, error = _parse_source_numeric_literal(
        source_text, [unescape_token(token) for token in raw_tokens]
    )
    if error:
        results.fail(category, "%s: entry path %r in fixture %r: %s"
                     % (rpath, ptr, entry["fixture"], error))
        return
    boundary_class = entry["boundary_class"]
    valid = False
    if boundary_class == "integer_range":
        parsed = _parse_integer_literal(literal)
        valid = (parsed is not None and not I64_MIN <= parsed <= I64_MAX
                 and isinstance(node, str) and node == literal)
    elif boundary_class == "float_range":
        parsed = _parse_float_literal(literal)
        valid = (parsed is not None and not math.isfinite(parsed)
                 and isinstance(node, str) and node == literal)
    elif boundary_class == "float_underflow":
        parsed = _parse_float_literal(literal)
        valid = False if parsed is None else (
            parsed == 0.0 and isinstance(node, float) and node == 0.0
            and math.copysign(1.0, parsed) == math.copysign(1.0, node)
        )
        if parsed is not None:
            try:
                valid = (Decimal(literal.replace("_", "")) != 0
                         and valid)
            except InvalidOperation:
                valid = False
    elif boundary_class == "float_precision":
        parsed = _parse_float_literal(literal)
        if parsed is not None and math.isfinite(parsed) and isinstance(node, float):
            try:
                source_decimal = Decimal(literal.replace("_", ""))
                shortest_decimal = Decimal(repr(node))
                valid = (parsed == node and source_decimal != shortest_decimal)
            except InvalidOperation:
                valid = False
    if not valid:
        results.fail(category, "%s: entry %d does not prove boundary_class %r "
                     "from its Ktav source literal and minimum oracle value"
                     % (rpath, index, boundary_class))


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
    except RecursionError:
        results.fail(category, "--boundary-manifest-lock %s: invalid JSON: %s"
                     % (lock_path, JSON_RECURSION_ERROR))
        return
    if not isinstance(lock_data, list):
        results.fail(category, "--boundary-manifest-lock %s: root must be a "
                     "JSON array" % lock_path)
        return

    valid_lock_records = []
    for index, entry in enumerate(lock_data):
        if _report_boundary_record_shape(
                results, category,
                "--boundary-manifest-lock %s: entry %d" % (lock_path, index),
                entry):
            valid_lock_records.append(entry)

    # Manifest records are validated by check_boundary_fixtures. Do not feed
    # malformed values into a tuple/dict key even when the lock flag is used.
    valid_manifest_records = [entry for entry in leaves
                              if _boundary_record_shape(entry)]

    def counts(records):
        c = {}
        for entry in records:
            key = _boundary_record_key(entry)
            c[key] = c.get(key, 0) + 1
        return c

    expected = counts(valid_lock_records)
    actual = counts(valid_manifest_records)
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
    manifest = parsed.get(rpath, JSON_PARSE_FAILED)
    if manifest is JSON_PARSE_FAILED:
        results.fail(category, "%s: could not parse manifest (see check 1)" % rpath)
        return True
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
        label = "%s: entry %d" % (rpath, i)
        if not _report_boundary_record_shape(results, category, label, entry):
            continue
        fixture = entry.get("fixture")
        ptr = entry.get("path")
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
                fixture_json = parsed.get(
                    rel(base + ".json", tests_dir), JSON_PARSE_FAILED
                )
                if fixture_json is not JSON_PARSE_FAILED:
                    _node, err = resolve_pointer(fixture_json, ptr)
                    if err:
                        results.fail(
                            category, "%s: entry %d: cannot resolve path %r in "
                            "fixture %r: %s" % (rpath, i, ptr, fixture, err))
                    else:
                        _check_boundary_semantics(
                            tests_dir, results, rpath, i, entry, fixture_json,
                            base + ".ktav")
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


def _check_locked_top_level(tests_dir, results):
    category = "corpus inventory lock"
    expected = LOCKED_CORPUS_DIRS | LOCKED_CORPUS_FILES
    try:
        entries = {entry.name: entry for entry in os.scandir(tests_dir)}
    except OSError as e:
        results.fail(category, "%s: cannot inspect top level: %s" % (tests_dir, e))
        return

    for name in sorted(expected - set(entries)):
        kind = "directory" if name in LOCKED_CORPUS_DIRS else "file"
        results.fail(category, "missing top-level %s %r" % (kind, name))
    for name in sorted(set(entries) - expected):
        results.fail(category, "unexpected top-level entry %r" % name)
    for name in sorted(expected & set(entries)):
        entry = entries[name]
        if name in LOCKED_CORPUS_DIRS:
            valid = entry.is_dir(follow_symlinks=False)
            kind = "directory"
        else:
            valid = entry.is_file(follow_symlinks=False)
            kind = "regular file"
        if entry.is_symlink() or not valid:
            results.fail(category, "top-level entry %r must be a %s, not a "
                         "symlink or special entry" % (name, kind))


def _sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        while True:
            chunk = stream.read(65536)
            if not chunk:
                return digest.hexdigest()
            digest.update(chunk)


def _corpus_file_hashes(tests_dir, results):
    category = "corpus inventory lock"
    hashes = {}
    for dirname in sorted(LOCKED_CORPUS_DIRS):
        directory = os.path.join(tests_dir, dirname)
        if not os.path.isdir(directory) or os.path.islink(directory):
            continue
        for root, dirs, files in os.walk(directory, topdown=True,
                                         followlinks=False):
            dirs.sort()
            files.sort()
            for child in list(dirs):
                path = os.path.join(root, child)
                if os.path.islink(path):
                    results.fail(category, "%s: symlink directory is not a "
                                 "corpus file" % rel(path, tests_dir))
                    dirs.remove(child)
            for filename in files:
                path = os.path.join(root, filename)
                rpath = rel(path, tests_dir)
                if os.path.islink(path) or not os.path.isfile(path):
                    results.fail(category, "%s: symlink or special entry is not "
                                 "a corpus file" % rpath)
                    continue
                try:
                    hashes[rpath] = _sha256_file(path)
                except OSError as e:
                    results.fail(category, "%s: unreadable while hashing: %s"
                                 % (rpath, e))
    boundary_path = os.path.join(tests_dir, "boundary-fixtures.json")
    if os.path.isfile(boundary_path) and not os.path.islink(boundary_path):
        try:
            hashes["boundary-fixtures.json"] = _sha256_file(boundary_path)
        except OSError as e:
            results.fail(category, "boundary-fixtures.json: unreadable while "
                         "hashing: %s" % e)
    return hashes


def _valid_locked_path(path):
    if path == "boundary-fixtures.json":
        return True
    if not isinstance(path, str) or "\\" in path:
        return False
    if _lone_surrogate(path) is not None or any(ord(char) < 0x20 for char in path):
        return False
    parts = path.split("/")
    return (len(parts) >= 2 and parts[0] in LOCKED_CORPUS_DIRS
            and all(part not in ("", ".", "..") for part in parts))


def _validate_hash_mapping(value, results, rpath):
    category = "corpus inventory lock"
    if not isinstance(value, dict):
        results.fail(category, "%s: 'files' must be an object mapping canonical "
                     "relative paths to SHA-256 digests" % rpath)
        return {}
    valid = {}
    for path in sorted(value):
        digest = value[path]
        if not _valid_locked_path(path):
            results.fail(category, "%s: invalid canonical corpus path %r"
                         % (rpath, path))
            continue
        if not isinstance(digest, str) or SHA256_RE.fullmatch(digest) is None:
            results.fail(category, "%s: digest for %r must be 64 lowercase "
                         "hexadecimal SHA-256 characters" % (rpath, path))
            continue
        valid[path] = digest
    return valid


def check_corpus_inventory_lock(tests_dir, results, lock_path):
    """Match every locked corpus file's canonical path and SHA-256 digest."""
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
    except RecursionError:
        results.fail(category, "--corpus-inventory-lock %s: invalid JSON: %s"
                     % (lock_path, JSON_RECURSION_ERROR))
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
    expected = _validate_hash_mapping(lock_data.get("files"), results, lock_path)
    _check_locked_top_level(tests_dir, results)
    actual = _corpus_file_hashes(tests_dir, results)
    for path in sorted(set(expected) - set(actual)):
        results.fail(category, "%s: missing from corpus" % path)
    for path in sorted(set(actual) - set(expected)):
        results.fail(category, "%s: not present in lock" % path)
    for path in sorted(set(expected) & set(actual)):
        if expected[path] != actual[path]:
            results.fail(category, "%s: content hash mismatch (expected %s, "
                         "actual %s)" % (path, expected[path], actual[path]))
    results.set_count(category, n_files=len(actual))


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
    args = parser.parse_args(argv)

    tests_dir = args.tests_dir
    if not os.path.isdir(tests_dir):
        print("error: tests_dir does not exist or is not a directory: %s"
              % tests_dir, file=sys.stderr)
        return 2

    results = Results()
    parsed = check_utf8_json(tests_dir, results)
    check_valid(tests_dir, results, parsed)
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
        if category == "corpus inventory lock":
            return "%d files match SHA-256 lock" % c.get("n_files", 0)
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
