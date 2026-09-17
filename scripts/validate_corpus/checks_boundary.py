"""Check 5: boundary-fixtures.json pointers, classes, and lock."""
import json
import math
import os
from decimal import Decimal, InvalidOperation

from .common import (ARRAY_INDEX_RE, BOUNDARY_CLASSES, BOUNDARY_RECORD_FIELDS,
                     FLOAT_LITERAL_RE, I64_MAX, I64_MIN, INTEGER_LITERAL_RE,
                     JSON_PARSE_FAILED, JSON_RECURSION_ERROR, KTAV_WHITESPACE,
                     _ascii_safe_text, _is_regular_directory, _is_regular_file,
                     _strip_ktav_whitespace, loads_strict, rel)
from .checks_unrepresentable import (_fixture_path_issue,
                                     _manifest_string_issue)

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
    try:
        child = os.path.realpath(child)
        parent = os.path.realpath(parent)
        rel = os.path.relpath(child, parent)
    except (OSError, ValueError, UnicodeError):
        # Invalid or cross-drive paths can never be within the tree.
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
    if any(_manifest_string_issue(entry[field]) is not None
           for field in BOUNDARY_RECORD_FIELDS):
        return False
    fixture = entry["fixture"]
    if _fixture_path_issue(fixture) is not None:
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
        else:
            issue = _manifest_string_issue(entry[field])
            if issue is not None:
                results.fail(category, "%s: %r %s"
                             % (label, field, issue))
                valid = False
    if valid and entry["boundary_class"] not in BOUNDARY_CLASSES:
        results.fail(category, "%s: unknown boundary_class %r (must be one of: %s)"
                     % (label, entry["boundary_class"],
                        ", ".join(sorted(BOUNDARY_CLASSES))))
        valid = False
    if valid:
        issue = _fixture_path_issue(entry["fixture"])
        if issue is not None:
            results.fail(category, "%s: 'fixture' %s: %r"
                         % (label, issue, entry["fixture"]))
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
    if (not tokens or any(
            not token or any(char in token for char in
                             ("\\", "'", '"', "`", ":", "."))
            for token in tokens)):
        return []
    target = ".".join(tokens)
    matches = []
    for line in text.split("\n"):
        stripped = _strip_ktav_whitespace(line)
        if not stripped or stripped.startswith("#"):
            continue
        separator_at = None
        separator = None
        quote = None
        escaped = False
        for index, char in enumerate(stripped):
            if escaped:
                escaped = False
                continue
            if char == "\\":
                escaped = True
                continue
            if quote is not None:
                if char == quote:
                    quote = None
                continue
            if char in "'\"`":
                quote = char
                continue
            if char == ":":
                separator_at = index
                separator = "::" if stripped[index:index + 2] == "::" else ":"
                break
        if separator_at is None or quote is not None or escaped:
            continue
        remainder = stripped[separator_at + len(separator):]
        key = stripped[:separator_at]
        if not remainder or remainder[0] not in KTAV_WHITESPACE:
            continue
        literal = _strip_ktav_whitespace(remainder)
        if (not key or any(char in key for char in "\\'\"`")
                or any(char in KTAV_WHITESPACE for char in key)):
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
    if base == 10:
        significant = cleaned.lstrip("0")
        if not significant:
            return 0
        # Avoid Python's decimal digit limit while retaining exact boundary
        # handling for values that can fit in a small native conversion.
        if len(significant) > len(str(I64_MAX)):
            return I64_MAX + 1 if sign > 0 else I64_MIN - 1
        return sign * int(significant, 10)
    return sign * int(cleaned, base)


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
    except (OSError, UnicodeError) as e:
        results.fail(category, "--boundary-manifest-lock %s: unreadable: %s"
                     % (lock_path, e))
        return
    try:
        lock_data = loads_strict(lock_text)
    except (json.JSONDecodeError, ValueError) as e:
        results.fail(category, "--boundary-manifest-lock %s: invalid JSON: %s"
                     % (lock_path, _ascii_safe_text(e)))
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
    if not _is_regular_file(manifest_path):
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
            if (not _is_regular_directory(valid_root)
                    or not all(_is_within(p, valid_root) for p in triples)):
                results.fail(category, "%s: entry %d: fixture %r resolves outside "
                             "<tests_dir>/valid/" % (rpath, i, fixture))
                fixture = None
        if fixture is not None:
            missing = [rel(p, tests_dir) for p in triples
                       if not _is_regular_file(p)]
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
