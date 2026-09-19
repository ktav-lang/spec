"""Shared constants and helpers for the corpus validator."""
import json
import math
import os
import re
import stat

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
VALID_ORACLE_WITNESS_REASONS = (
    "EmptyKeyName",
    "CRByte",
    "BothFormsRequired",
    "TrailingWhitespaceCollision",
    "LeadingWhitespaceCollision",
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
# 0.8 added no new Sec 6 (invalid/) category -- strict-lossy/ rejections
# are LossyScalar, which is a parse_strict-only class, not a lax `invalid/`
# expected_error. Same closed set as 0.7.
ERROR_CATEGORIES_V0_8 = ERROR_CATEGORIES_V0_7
ERROR_CATEGORIES_BY_VERSION = {
    "0.6": ERROR_CATEGORIES_V0_6,
    "0.7": ERROR_CATEGORIES_V0_7,
    "0.8": ERROR_CATEGORIES_V0_8,
}
DEFAULT_ERROR_CATEGORIES = ERROR_CATEGORIES_V0_8  # == union of all versions (0.6/0.7 are subsets)

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
# Frozen historical profiles. versions/0.6 is deleted from the working tree
# and gains no release declaration (content/release.js), so its profile
# stays a literal here. versions/0.7 is still carried in the working tree
# (unlike 0.6) with its own content/release.js still declaring "0.7.1", so
# without an explicit frozen entry it would fall through to
# CURRENT_CORPUS_LAYOUT below and wrongly demand strict-lossy/, which 0.7.1
# never had.
FROZEN_CORPUS_LAYOUT_PROFILES = {
    "0.6.4": {
        "directories": frozenset({"valid", "invalid"}),
        "files": frozenset(),
        "error_categories": ERROR_CATEGORIES_V0_6,
    },
    "0.7.1": {
        "directories": frozenset({
            "valid", "invalid", "unrepresentable", "parseable-unrepresentable",
        }),
        "files": frozenset({"boundary-fixtures.json", "manifest.json"}),
        "error_categories": ERROR_CATEGORIES_V0_7,
    },
}
# Structural facts of the current corpus generation. The KEY under which this
# profile is registered comes from the sibling content/release.js declaration
# (via corpus_layout_profiles), never from a literal here.
CURRENT_CORPUS_LAYOUT = {
    "directories": frozenset({
        "valid", "invalid", "unrepresentable", "parseable-unrepresentable",
        "strict-lossy",
    }),
    "files": frozenset({"boundary-fixtures.json", "manifest.json"}),
}


class ReleaseFamilyError(ValueError):
    """The validator has no ERROR_CATEGORIES entry for a release family."""


def corpus_layout_profiles(release_version):
    """Layout profiles keyed by corpus version for the given release family.

    `release_version` comes from the sibling content/release.js declaration;
    None selects only the frozen historical profiles.
    """
    profiles = dict(FROZEN_CORPUS_LAYOUT_PROFILES)
    if release_version is not None and release_version not in profiles:
        family = release_version.rsplit(".", 1)[0]
        if family not in ERROR_CATEGORIES_BY_VERSION:
            raise ReleaseFamilyError(
                "validator needs an ERROR_CATEGORIES entry for release "
                "family %r (declared version %r)" % (family, release_version))
        profiles[release_version] = {
            **CURRENT_CORPUS_LAYOUT,
            "error_categories": ERROR_CATEGORIES_BY_VERSION[family],
        }
    return profiles
IGNORED_CORPUS_TOP_LEVEL_NAMES = frozenset({
    "docs_local", ".idea", ".vscode", ".DS_Store", "Thumbs.db", "desktop.ini",
})
IGNORED_CORPUS_TOP_LEVEL_SUFFIXES = (".iml", ".swp", ".swo", "~")
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
SENTINEL_POLICIES = frozenset({"allow", "ordinary"})

# manifest.json (§ 8.5): schema versions this validator understands, its
# closed top-level/category/flag-entry field sets, and the closed set of
# recognized per-fixture flags.
MANIFEST_SCHEMA_VERSIONS = frozenset({1})
MANIFEST_REQUIRED_FIELDS = frozenset({"schema_version", "categories", "fixture_flags"})
MANIFEST_OPTIONAL_FIELDS = frozenset({"$comment"})
MANIFEST_CATEGORY_ENTRY_FIELDS = frozenset({"count"})
MANIFEST_FLAG_ENTRY_FIELDS = frozenset({"category", "fixture", "flags", "note"})
KNOWN_FIXTURE_FLAGS = frozenset({"raw_bytes"})


def _is_float_sentinel(value):
    """Return true only for the exact programmatic non-finite Float shape."""
    return (
        isinstance(value, dict)
        and len(value) == 1
        and FLOAT_SENTINEL_KEY in value
        and isinstance(value[FLOAT_SENTINEL_KEY], str)
        and value[FLOAT_SENTINEL_KEY] in FLOAT_SENTINEL_VALUES
    )


def rel(path, tests_dir):
    """Path relative to tests_dir with forward slashes, for deterministic output."""
    try:
        return os.path.relpath(path, tests_dir).replace(os.sep, "/")
    except (OSError, ValueError, UnicodeError):
        # Diagnostics must remain printable even for hostile path strings.
        return _ascii_safe_text(path)


def _is_regular_directory(path):
    """Use lstat semantics so the traversal root cannot be redirected."""
    try:
        info = os.lstat(path)
    except (OSError, ValueError, UnicodeError):
        return False
    if stat.S_ISLNK(info.st_mode):
        return False
    isjunction = getattr(os.path, "isjunction", None)
    try:
        if isjunction is not None and isjunction(path):
            return False
    except (OSError, ValueError, UnicodeError):
        return False
    if os.name == "nt":
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        if getattr(info, "st_file_attributes", 0) & reparse:
            return False
    return stat.S_ISDIR(info.st_mode)


def _is_regular_file(path):
    """True only for a regular, non-link, non-reparse-point file."""
    try:
        info = os.lstat(path)
    except (OSError, ValueError, UnicodeError):
        return False
    if stat.S_ISLNK(info.st_mode):
        return False
    if os.name == "nt":
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        if getattr(info, "st_file_attributes", 0) & reparse:
            return False
    return stat.S_ISREG(info.st_mode)


def _path_entry_exists(path):
    """Use lstat so a dangling link is still considered an existing entry."""
    try:
        os.lstat(path)
    except (OSError, ValueError, UnicodeError):
        return False
    return True


def _directory_rejection_reason(path):
    """Return a deterministic reason for a directory that must not be walked."""
    try:
        info = os.lstat(path)
    except (OSError, ValueError, UnicodeError) as error:
        return "directory cannot be inspected: %s" % _ascii_safe_text(error)
    if stat.S_ISLNK(info.st_mode):
        return "symlink directory is not allowed"
    isjunction = getattr(os.path, "isjunction", None)
    try:
        if isjunction is not None and isjunction(path):
            return "junction directory is not allowed"
    except (OSError, ValueError, UnicodeError) as error:
        return "directory cannot be inspected: %s" % _ascii_safe_text(error)
    if os.name == "nt":
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        if getattr(info, "st_file_attributes", 0) & reparse:
            return "reparse-point directory is not allowed"
    if not stat.S_ISDIR(info.st_mode):
        return "entry is not a directory"
    return None


def _walk_safe(directory, tests_dir, results, category):
    """Walk only real directories, pruning links and reparse points first."""
    reason = _directory_rejection_reason(directory)
    if reason is not None:
        results.fail(category, "%s: %s" % (rel(directory, tests_dir), reason))
        return

    def onerror(error):
        filename = getattr(error, "filename", None) or directory
        results.fail(category, "%s: traversal failed: %s"
                     % (rel(filename, tests_dir), _ascii_safe_text(error)))

    for root, dirs, files in os.walk(directory, topdown=True,
                                     followlinks=False, onerror=onerror):
        dirs.sort()
        files.sort()
        for dirname in list(dirs):
            path = os.path.join(root, dirname)
            reason = _directory_rejection_reason(path)
            if reason is not None:
                results.fail(category, "%s: %s" % (rel(path, tests_dir), reason))
                dirs.remove(dirname)
        yield root, files


def _ascii_safe_text(value):
    """Render diagnostics without emitting raw Unicode surrogates."""
    return str(value).encode("ascii", "backslashreplace").decode("ascii")


class Results:
    """Collects per-category results; each problem is a (category, message) pair."""

    def __init__(self):
        self.problems = []
        self.counts = {}

    def fail(self, category, message):
        self.problems.append((category, _ascii_safe_text(message)))

    def set_count(self, category, **kwargs):
        self.counts[category] = kwargs


def is_deliberately_invalid_utf8(rpath):
    """True for an invalid/ .ktav input whose sibling oracle says InvalidUtf8."""
    parts = rpath.split("/")
    return len(parts) >= 2 and parts[0] == "invalid" and rpath.endswith(".ktav")


def _sibling_declares_invalid_utf8(path):
    """Read the sibling oracle without depending on its directory name."""
    sibling = path[:-len(".ktav")] + ".json"
    if not _is_regular_file(sibling):
        return False
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
            raise ValueError("duplicate object key %s is not allowed in strict JSON"
                             % ascii(key))
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

def _walk_regular_category_files(directory, tests_dir, results, category):
    for root, files in _walk_safe(directory, tests_dir, results, category):
        regular = []
        for filename in files:
            path = os.path.join(root, filename)
            if not _is_regular_file(path):
                results.fail(category, "%s: symlink or special file is not allowed"
                             % rel(path, tests_dir))
            else:
                regular.append(filename)
        yield root, regular

def _strip_ktav_whitespace(text):
    start = 0
    end = len(text)
    while start < end and text[start] in KTAV_WHITESPACE:
        start += 1
    while end > start and text[end - 1] in KTAV_WHITESPACE:
        end -= 1
    return text[start:end]
