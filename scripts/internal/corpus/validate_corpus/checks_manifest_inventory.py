"""Check 6: manifest.json and the corpus inventory SHA-256 lock."""
import hashlib
import json
import os

from .common import (CORPUS_INVENTORY_FIELDS, CURRENT_CORPUS_LAYOUT,
                     DEFAULT_ERROR_CATEGORIES, FROZEN_CORPUS_LAYOUT_PROFILES,
                     IGNORED_CORPUS_TOP_LEVEL_NAMES,
                     IGNORED_CORPUS_TOP_LEVEL_SUFFIXES, JSON_RECURSION_ERROR,
                     KNOWN_FIXTURE_FLAGS, MANIFEST_CATEGORY_ENTRY_FIELDS,
                     MANIFEST_FLAG_ENTRY_FIELDS, MANIFEST_OPTIONAL_FIELDS,
                     MANIFEST_REQUIRED_FIELDS, MANIFEST_SCHEMA_VERSIONS,
                     ReleaseFamilyError, SHA256_RE, _ascii_safe_text,
                     _is_regular_directory, _is_regular_file, _walk_regular_category_files,
                     _walk_safe, corpus_layout_profiles, loads_strict, rel)
from .checks_unrepresentable import _lone_surrogate, _manifest_string_issue

def _manifest_fixture_path_issue(fixture):
    """Validate a manifest.json fixture path before it reaches filesystem
    APIs. Same safety rules as _fixture_path_issue (boundary-fixtures.json),
    generalized to any category directory rather than only valid/."""
    issue = _manifest_string_issue(fixture)
    if issue is not None:
        return issue
    if not fixture:
        return "must be a non-empty string"
    if ":" in fixture:
        return ("resolves outside the category directory (drive syntax is "
                "not allowed)")
    if ("\\" in fixture
            or any(part in ("", ".", "..") for part in fixture.split("/"))):
        return ("must be a '/'-separated path of plain name segments (no "
                "'..', '.', empty segments, backslashes, or drive syntax)")
    return None


def _category_fixture_stems(category_dir, tests_dir, results, label):
    """Return the set of fixture stems (rel-path WITHIN category_dir, minus
    the recognized suffix) present under one category directory -- one
    entry per shared basename, regardless of how many sibling files
    (.ktav/.json/.canonical.ktav) that basename has. This is the "fixture"
    identity manifest.json's category counts and fixture_flags entries are
    defined in terms of (§ 8.5) -- relative to the category directory
    itself, the same convention boundary-fixtures.json's 'fixture' field
    uses relative to valid/."""
    stems = set()
    for root, files in _walk_regular_category_files(
            category_dir, tests_dir, results, label):
        for fname in files:
            if fname.endswith(".canonical.ktav"):
                stem = fname[: -len(".canonical.ktav")]
            elif fname.endswith(".ktav"):
                stem = fname[: -len(".ktav")]
            elif fname.endswith(".json"):
                stem = fname[: -len(".json")]
            else:
                continue  # unexpected file type; reported by other checks
            stems.add(rel(os.path.join(root, stem), category_dir))
    return stems


def check_manifest(tests_dir, results, invalid_utf8_rpaths, require=False):
    """Check manifest.json (§ 8.5): the closed category/count inventory and
    the raw_bytes per-fixture flags, cross-checked against the corpus as it
    actually stands on disk -- not merely that the file parses.

    With require=True a missing manifest.json is a failure instead of a
    skip (mirroring --require-boundary/--require-unrepresentable)."""
    category = "manifest.json"
    manifest_path = os.path.join(tests_dir, "manifest.json")
    if not _is_regular_file(manifest_path):
        if require:
            results.fail(category, "manifest.json not present (required)")
            return False
        results.set_count(category, skipped=True)
        return False
    rpath = rel(manifest_path, tests_dir)
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            text = f.read()
    except (OSError, UnicodeError) as e:
        results.fail(category, "%s: unreadable: %s" % (rpath, e))
        return True
    try:
        manifest = loads_strict(text)
    except (json.JSONDecodeError, ValueError) as e:
        results.fail(category, "%s: invalid JSON: %s" % (rpath, _ascii_safe_text(e)))
        return True
    except RecursionError:
        results.fail(category, "%s: invalid JSON: %s" % (rpath, JSON_RECURSION_ERROR))
        return True
    if not isinstance(manifest, dict):
        results.fail(category, "%s: root must be a JSON object" % rpath)
        return True

    fields = set(manifest)
    allowed = MANIFEST_REQUIRED_FIELDS | MANIFEST_OPTIONAL_FIELDS
    missing = sorted(MANIFEST_REQUIRED_FIELDS - fields)
    extra = sorted(fields - allowed)
    if missing:
        results.fail(category, "%s: missing required field(s): %s"
                     % (rpath, ", ".join(repr(f) for f in missing)))
    if extra:
        results.fail(category, "%s: unexpected field(s): %s"
                     % (rpath, ", ".join(repr(f) for f in extra)))

    schema_version = manifest.get("schema_version")
    if not (isinstance(schema_version, int) and not isinstance(schema_version, bool)
            and schema_version in MANIFEST_SCHEMA_VERSIONS):
        supported = ", ".join(str(v) for v in sorted(MANIFEST_SCHEMA_VERSIONS))
        results.fail(category, "%s: unsupported schema_version %r "
                     "(supported: %s) -- refusing to guess its shape"
                     % (rpath, schema_version, supported))
        return True  # shape beyond this point is not trustworthy

    # -- categories: closed set of category directory names + exact counts --
    categories = manifest.get("categories")
    n_categories = 0
    declared = {}
    if not isinstance(categories, dict):
        results.fail(category, "%s: 'categories' must be an object" % rpath)
        categories = {}
    for name in sorted(categories):
        entry = categories[name]
        label = "%s: categories[%r]" % (rpath, name)
        if not isinstance(entry, dict) or set(entry) != MANIFEST_CATEGORY_ENTRY_FIELDS:
            results.fail(category, "%s: must be an object with exactly field(s): %s"
                         % (label, ", ".join(sorted(MANIFEST_CATEGORY_ENTRY_FIELDS))))
            continue
        count = entry["count"]
        if not (isinstance(count, int) and not isinstance(count, bool) and count >= 0):
            results.fail(category, "%s: 'count' must be a non-negative integer" % label)
            continue
        declared[name] = count

    try:
        actual_top_level = {
            entry.name for entry in os.scandir(tests_dir)
            if not _is_ignored_corpus_top_level(entry.name)
            and _is_regular_directory(entry.path)
        }
    except OSError as e:
        results.fail(category, "%s: cannot inspect top level: %s" % (rpath, e))
        actual_top_level = set(declared)  # avoid a spurious mismatch cascade

    for name in sorted(set(declared) - actual_top_level):
        results.fail(category, "%s: 'categories' names %r but no such directory "
                     "exists under %s" % (rpath, name, rel(tests_dir, tests_dir) or "."))
    unknown = sorted(actual_top_level - set(declared))
    for name in unknown:
        results.fail(category, "%s: unknown fixture category directory %r is not "
                     "listed in 'categories'" % (rpath, name))

    actual_stems_by_category = {}
    for name in sorted(set(declared) & actual_top_level):
        stems = _category_fixture_stems(
            os.path.join(tests_dir, name), tests_dir, results, category)
        actual_stems_by_category[name] = stems
        if len(stems) != declared[name]:
            results.fail(category, "%s: categories[%r].count is %d but %d "
                         "fixture(s) are actually present"
                         % (rpath, name, declared[name], len(stems)))
        else:
            n_categories += 1

    # -- fixture_flags: per-fixture handling flags, cross-checked against
    # the corpus's real UTF-8 validity for the 'raw_bytes' flag --
    flags_list = manifest.get("fixture_flags")
    n_flags = 0
    flagged_ktav_rpaths = set()
    if not isinstance(flags_list, list):
        results.fail(category, "%s: 'fixture_flags' must be a list" % rpath)
        flags_list = []
    seen_pairs = {}
    for i, entry in enumerate(flags_list):
        label = "%s: fixture_flags[%d]" % (rpath, i)
        if not isinstance(entry, dict) or set(entry) != MANIFEST_FLAG_ENTRY_FIELDS:
            results.fail(category, "%s: must be an object with exactly field(s): %s"
                         % (label, ", ".join(sorted(MANIFEST_FLAG_ENTRY_FIELDS))))
            continue
        entry_category = entry["category"]
        fixture = entry["fixture"]
        flags = entry["flags"]
        note = entry["note"]
        ok = True
        if not isinstance(entry_category, str) or entry_category not in declared:
            results.fail(category, "%s: 'category' %r is not one of manifest's "
                         "declared categories" % (label, entry_category))
            ok = False
        if not isinstance(fixture, str):
            results.fail(category, "%s: 'fixture' must be a string" % label)
            ok = False
        else:
            issue = _manifest_fixture_path_issue(fixture)
            if issue is not None:
                results.fail(category, "%s: 'fixture' %s: %r" % (label, issue, fixture))
                ok = False
        if not isinstance(flags, list) or not flags:
            results.fail(category, "%s: 'flags' must be a non-empty list" % label)
            ok = False
        elif any(not isinstance(f, str) or f not in KNOWN_FIXTURE_FLAGS for f in flags):
            results.fail(category, "%s: 'flags' entries must all be one of: %s"
                         % (label, ", ".join(sorted(KNOWN_FIXTURE_FLAGS))))
            ok = False
        if not isinstance(note, str) or note == "":
            results.fail(category, "%s: 'note' must be a non-empty string" % label)
            ok = False
        if not ok:
            continue
        pair = (entry_category, fixture)
        if pair in seen_pairs:
            results.fail(category, "%s: duplicate (category, fixture) pair %r: "
                         "entries %d and %d" % (rpath, pair, seen_pairs[pair], i))
        else:
            seen_pairs[pair] = i
        if entry_category in actual_stems_by_category:
            if fixture not in actual_stems_by_category[entry_category]:
                results.fail(category, "%s: fixture %r does not exist under "
                             "category %r" % (label, fixture, entry_category))
            elif "raw_bytes" in flags:
                ktav_rpath = rel(
                    os.path.join(tests_dir, entry_category, *fixture.split("/"))
                    + ".ktav", tests_dir)
                flagged_ktav_rpaths.add(ktav_rpath)
                if ktav_rpath not in invalid_utf8_rpaths:
                    results.fail(category, "%s: flagged 'raw_bytes', but %s is "
                                 "actually valid UTF-8" % (label, ktav_rpath))
        n_flags += 1

    actual_invalid_ktav = {p for p in invalid_utf8_rpaths if p.endswith(".ktav")}
    for missing_rpath in sorted(actual_invalid_ktav - flagged_ktav_rpaths):
        results.fail(category, "%s: %s is not valid UTF-8 but is not flagged "
                     "'raw_bytes' in 'fixture_flags'" % (rpath, missing_rpath))

    results.set_count(category, n_categories=n_categories, n_flags=n_flags)
    return True


def _is_ignored_corpus_top_level(name):
    return (name in IGNORED_CORPUS_TOP_LEVEL_NAMES
            or name.endswith(IGNORED_CORPUS_TOP_LEVEL_SUFFIXES))


def _check_locked_top_level(tests_dir, results, locked_dirs, locked_files):
    category = "corpus inventory lock"
    expected = locked_dirs | locked_files
    try:
        entries = {
            entry.name: entry
            for entry in os.scandir(tests_dir)
            if not _is_ignored_corpus_top_level(entry.name)
        }
    except OSError as e:
        results.fail(category, "%s: cannot inspect top level: %s" % (tests_dir, e))
        return

    for name in sorted(expected - set(entries)):
        kind = "directory" if name in locked_dirs else "file"
        results.fail(category, "missing top-level %s %r" % (kind, name))
    for name in sorted(set(entries) - expected):
        results.fail(category, "unexpected top-level entry %r" % name)
    for name in sorted(expected & set(entries)):
        entry = entries[name]
        if name in locked_dirs:
            valid = _is_regular_directory(entry.path)
            kind = "directory"
        else:
            valid = _is_regular_file(entry.path)
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


def _corpus_file_hashes(tests_dir, results, locked_dirs, locked_files):
    category = "corpus inventory lock"
    hashes = {}
    for dirname in sorted(locked_dirs):
        directory = os.path.join(tests_dir, dirname)
        if not _is_regular_directory(directory):
            continue
        for root, files in _walk_safe(directory, tests_dir, results, category):
            for filename in files:
                path = os.path.join(root, filename)
                rpath = rel(path, tests_dir)
                if not _is_regular_file(path):
                    results.fail(category, "%s: symlink or special entry is not "
                                 "a corpus file" % rpath)
                    continue
                try:
                    hashes[rpath] = _sha256_file(path)
                except OSError as e:
                    results.fail(category, "%s: unreadable while hashing: %s"
                                 % (rpath, e))
    for filename in sorted(locked_files):
        path = os.path.join(tests_dir, filename)
        if not _is_regular_file(path):
            continue
        try:
            hashes[filename] = _sha256_file(path)
        except OSError as e:
            results.fail(category, "%s: unreadable while hashing: %s"
                         % (filename, e))
    return hashes


def _valid_locked_path(path, locked_dirs, locked_files):
    if not isinstance(path, str) or "\\" in path:
        return False
    if _lone_surrogate(path) is not None or any(ord(char) < 0x20 for char in path):
        return False
    if path in locked_files:
        return True
    parts = path.split("/")
    return (len(parts) >= 2 and parts[0] in locked_dirs
            and all(part not in ("", ".", "..") for part in parts))


def _validate_hash_mapping(value, results, rpath, locked_dirs, locked_files):
    category = "corpus inventory lock"
    if not isinstance(value, dict):
        results.fail(category, "%s: 'files' must be an object mapping canonical "
                     "relative paths to SHA-256 digests" % rpath)
        return {}
    valid = {}
    for path in sorted(value):
        digest = value[path]
        if not _valid_locked_path(path, locked_dirs, locked_files):
            results.fail(category, "%s: invalid canonical corpus path %r"
                         % (rpath, path))
            continue
        if not isinstance(digest, str) or SHA256_RE.fullmatch(digest) is None:
            results.fail(category, "%s: digest for %r must be 64 lowercase "
                         "hexadecimal SHA-256 characters" % (rpath, path))
            continue
        valid[path] = digest
    return valid


def load_corpus_inventory_lock(lock_path, results, release_version=None,
                               release_hint=None):
    """Load one inventory lock and return (data, layout profile).

    The caller uses the profile for semantic checks and passes the parsed data
    to the inventory checker, so malformed locks produce one diagnostic only.
    `release_version` is the version declared by the sibling
    content/release.js (None when absent/unreadable); `release_hint` is
    appended to the unsupported-version diagnostic when release_version is
    None, pointing at the expected declaration path.
    """
    category = "corpus inventory lock"
    try:
        profiles = corpus_layout_profiles(release_version)
    except ReleaseFamilyError as e:
        results.fail(category, "--corpus-inventory-lock %s: release "
                     "declaration declares version %r which this validator "
                     "does not know: %s"
                     % (lock_path, release_version, e))
        # Still register the declared version structurally (with the union
        # of known categories) so the lock diagnostic lists it as supported.
        profiles = dict(FROZEN_CORPUS_LAYOUT_PROFILES)
        profiles[release_version] = {
            **CURRENT_CORPUS_LAYOUT,
            "error_categories": DEFAULT_ERROR_CATEGORIES,
        }
    try:
        with open(lock_path, "r", encoding="utf-8") as f:
            lock_text = f.read()
    except (OSError, ValueError, UnicodeError) as e:
        results.fail(category, "--corpus-inventory-lock %s: unreadable: %s"
                     % (lock_path, e))
        return None, None
    try:
        lock_data = loads_strict(lock_text)
    except (json.JSONDecodeError, ValueError) as e:
        results.fail(category, "--corpus-inventory-lock %s: invalid JSON: %s"
                     % (lock_path, _ascii_safe_text(e)))
        return None, None
    except RecursionError:
        results.fail(category, "--corpus-inventory-lock %s: invalid JSON: %s"
                     % (lock_path, JSON_RECURSION_ERROR))
        return None, None
    if not isinstance(lock_data, dict):
        results.fail(category, "--corpus-inventory-lock %s: root must be a JSON "
                     "object" % lock_path)
        return None, None
    missing = sorted(CORPUS_INVENTORY_FIELDS - set(lock_data))
    extra = sorted(set(lock_data) - CORPUS_INVENTORY_FIELDS)
    if missing:
        results.fail(category, "%s: missing required field(s): %s"
                     % (lock_path, ", ".join(repr(field) for field in missing)))
    if extra:
        results.fail(category, "%s: unexpected field(s): %s"
                     % (lock_path, ", ".join(repr(field) for field in extra)))
    if "version" not in lock_data:
        return lock_data, None
    version = lock_data["version"]
    profile = (profiles.get(version)
               if isinstance(version, str) else None)
    if profile is None:
        supported = ", ".join(repr(item) for item in sorted(profiles))
        hint = ""
        if release_version is None and release_hint:
            hint = " (%s)" % release_hint
        results.fail(category, "%s: unsupported corpus inventory version %r "
                     "(supported: %s)%s" % (lock_path, version, supported, hint))
        return lock_data, None
    return lock_data, profile


def check_corpus_inventory_lock(tests_dir, results, lock_path,
                                lock_data=None, profile=None):
    """Match every locked corpus file's canonical path and SHA-256 digest."""
    category = "corpus inventory lock"
    if lock_data is None and profile is None:
        lock_data, profile = load_corpus_inventory_lock(lock_path, results)
    if lock_data is None or profile is None:
        return

    locked_dirs = profile["directories"]
    locked_files = profile["files"]
    expected = _validate_hash_mapping(
        lock_data.get("files"), results, lock_path, locked_dirs, locked_files
    )
    _check_locked_top_level(tests_dir, results, locked_dirs, locked_files)
    actual = _corpus_file_hashes(tests_dir, results, locked_dirs, locked_files)
    for path in sorted(set(expected) - set(actual)):
        results.fail(category, "%s: missing from corpus" % path)
    for path in sorted(set(actual) - set(expected)):
        results.fail(category, "%s: not present in lock" % path)
    for path in sorted(set(expected) & set(actual)):
        if expected[path] != actual[path]:
            results.fail(category, "%s: content hash mismatch (expected %s, "
                         "actual %s)" % (path, expected[path], actual[path]))
    results.set_count(category, n_files=len(actual))
