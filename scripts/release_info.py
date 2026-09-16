#!/usr/bin/env python3
"""Single Python-side decoder for a corpus generation's release declaration.

This module is the ONE place in the Python tooling that decodes
``content/release.js`` (the JavaScript single source of truth produced by the
release single-sourcing refactor). The release version and date must never be
duplicated as literals elsewhere in Python code: consumers load them through
``load_release_file`` / ``release_path_for_tests`` instead, so a version bump
cannot go stale (the failure mode this replaces: a hand-bumped layout-profile
literal that drifted from the declaration).

The accepted file format is exactly what ``scripts/build_spec.mjs`` writes:
``export default `` + ``json.dumps(value, ensure_ascii=False, indent=2)`` +
a single trailing newline. Requiring byte-identity with that canonical
serialization (rather than merely parseable JSON) rejects duplicate keys,
CRLF line endings, trailing whitespace/semicolons, BOMs, and any other
formatting drift -- mirroring the builder's readJsonDefault rationale.
"""

import json
import os
import re

RELEASE_PREFIX = "export default "
RELEASE_KEY_ORDER = ("version", "released")
VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ReleaseInfoError(Exception):
    """Raised when a release declaration file is missing, malformed, or drifted."""


def load_release_file(path):
    """Read a release.js file and return {"version": ..., "released": ...}.

    Every failure raises ReleaseInfoError with a message starting with `path`.
    """
    def fail(message):
        raise ReleaseInfoError("%s: %s" % (path, message))

    try:
        with open(path, "rb") as stream:
            raw = stream.read()
    except OSError as e:
        fail("unreadable: %s" % e)
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        fail("release declaration is not valid UTF-8")
    if not text.startswith(RELEASE_PREFIX):
        fail("release declaration must start with the exact prefix %r"
             % RELEASE_PREFIX)
    remainder = text[len(RELEASE_PREFIX):]
    try:
        value = json.loads(remainder)
    except (json.JSONDecodeError, ValueError, RecursionError) as e:
        fail("invalid JSON: %s" % e)
    # Byte-identity with the builder's canonical serialization rejects
    # duplicate keys, CRLF, trailing whitespace/semicolons, and formatting
    # drift (same rationale as the builder's readJsonDefault).
    canonical = RELEASE_PREFIX + json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    if text != canonical:
        fail("release declaration is not byte-identical to the canonical "
             "serialization (duplicate keys, line endings, trailing "
             "whitespace, or formatting drift)")
    if not isinstance(value, dict) or isinstance(value, bool):
        fail("release declaration root must be a JSON object")
    if tuple(value.keys()) != RELEASE_KEY_ORDER:
        fail("release declaration keys must be exactly %r in that order, "
             "got %r" % (RELEASE_KEY_ORDER, tuple(value.keys())))
    version = value["version"]
    released = value["released"]
    if not isinstance(version, str) or VERSION_RE.fullmatch(version) is None:
        fail("release declaration 'version' must be a string matching "
             "N.N.N, got %r" % (version,))
    if not isinstance(released, str) or DATE_RE.fullmatch(released) is None:
        fail("release declaration 'released' must be a string matching "
             "YYYY-MM-DD, got %r" % (released,))
    return {"version": version, "released": released}


def release_path_for_tests(tests_dir):
    """Path of the release declaration governing the corpus at `tests_dir`.

    A corpus lives at versions/<version>/tests, so its content directory is
    the sibling of the tests directory. Kept in pardir form so callers'
    error messages show the real path; normpath only tidies separators.
    """
    return os.path.normpath(
        os.path.join(tests_dir, os.pardir, "content", "release.js"))
