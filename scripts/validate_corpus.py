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
      6. With --corpus-inventory-lock, tests/ has the exact top-level layout
         selected by the lock version and every corpus file path and raw-byte
         SHA-256 digest matches the lock. Semantic and schema checks still run
         independently.

Usage:
    python scripts/validate_corpus.py <tests_dir> [--require-unrepresentable]
        [--require-boundary] [--boundary-manifest-lock <path>]
        [--corpus-inventory-lock <path>]

Exit codes:
    0  all checks passed (or were legitimately skipped)
    1  one or more checks failed
    2  usage error (wrong argument count, tests_dir missing or not a regular
       directory)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from validate_corpus import main

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
