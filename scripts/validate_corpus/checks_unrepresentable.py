"""Checks 4: unrepresentable/ and parseable-unrepresentable/ fixtures."""
import json
import math
import os

from .common import (I64_MAX, I64_MIN, JSON_PARSE_FAILED, KTAV_WHITESPACE,
                     PARSER_UNREPRESENTABLE_REASONS, PROGRAMMATIC_UNREPRESENTABLE_REASONS,
                     SENTINEL_POLICIES, UNREPRESENTABLE_FIELDS,
                     UNREPRESENTABLE_REASONS, _is_float_sentinel,
                     rel,
                     _is_regular_directory, _strip_ktav_whitespace,
                     _walk_regular_category_files)

def _semantic_kind(value, decode_float_sentinel=True):
    if isinstance(value, dict):
        if decode_float_sentinel and _is_float_sentinel(value):
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


def _manifest_string_issue(value):
    """Return a deterministic reason when a manifest string is unsafe."""
    if "\x00" in value:
        return "contains NUL"
    surrogate = _lone_surrogate(value)
    if surrogate is not None:
        return "contains lone surrogate U+%04X" % surrogate
    for char in value:
        codepoint = ord(char)
        if codepoint < 0x20 or codepoint == 0x7F:
            return "contains ASCII control U+%04X" % codepoint
    return None


def _fixture_path_issue(fixture):
    """Validate a manifest fixture path before it reaches filesystem APIs."""
    issue = _manifest_string_issue(fixture)
    if issue is not None:
        return issue
    if not fixture:
        return "must be a non-empty string"
    if ":" in fixture:
        return ("resolves outside <tests_dir>/valid/ (drive syntax is not "
                "allowed)")
    if ("\\" in fixture
            or any(part in ("", ".", "..") for part in fixture.split("/"))):
        return ("must be a '/'-separated path of plain name segments under "
                "valid/ (no '..', '.', empty segments, backslashes, or drive "
                "syntax)")
    return None


def _oracle_path(path, key):
    escaped = json.dumps(key, ensure_ascii=True)[1:-1]
    return "%s/%s" % (path, escaped.replace("~", "~0").replace("/", "~1"))


def _inspect_unrepresentable_value(value, sentinel_policy="allow",
                                   witness_paths=None):
    """Validate a recursive Value oracle and collect writer-failure witnesses.

    sentinel_policy is "allow" for programmatic-only fixtures and "ordinary"
    for parser-produced fixtures.
    """
    if sentinel_policy not in SENTINEL_POLICIES:
        raise ValueError("sentinel_policy must be 'allow' or 'ordinary'")
    errors = []
    witnesses = {reason: False for reason in UNREPRESENTABLE_REASONS}

    def record_witness(reason, path):
        witnesses[reason] = True
        if witness_paths is not None:
            witness_paths.setdefault(reason, []).append(path)

    def walk(node, path):
        if isinstance(node, dict):
            for key in node:
                surrogate = _lone_surrogate(key)
                if surrogate is not None:
                    errors.append("%s: Object key contains lone surrogate U+%04X"
                                  % (path, surrogate))
            if sentinel_policy == "allow" and _is_float_sentinel(node):
                record_witness("NonFiniteFloat", path)
                return
            for key, child in node.items():
                if key == "":
                    record_witness("EmptyKeyName", _oracle_path(path, key))
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
                record_witness("CRByte", path)
            both, trailing, leading = _multiline_collision_witness(node)
            if both:
                record_witness("BothFormsRequired", path)
            if trailing:
                record_witness("TrailingWhitespaceCollision", path)
            if leading:
                record_witness("LeadingWhitespaceCollision", path)
        elif isinstance(node, float) and not math.isfinite(node):
            errors.append("%s: ordinary JSON number must be finite" % path)
        elif (isinstance(node, int) and not isinstance(node, bool)
              and sentinel_policy == "ordinary"
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
    if not _is_regular_directory(unrep_dir):
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
    if not _is_regular_directory(fixture_dir):
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
