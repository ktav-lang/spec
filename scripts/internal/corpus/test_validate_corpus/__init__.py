"""Thematic mixin modules for the validate_corpus test suite."""
from test_validate_corpus.base import CorpusTestCase as _CorpusFixtureBase
from test_validate_corpus.test_json_valid import JsonAndValidTests
from test_validate_corpus.test_unrepresentable import UnrepresentableTests
from test_validate_corpus.test_categories_utf8 import CategoriesAndUtf8Tests
from test_validate_corpus.test_boundary import BoundaryTests
from test_validate_corpus.test_manifest_inventory import ManifestAndInventoryTests


class CorpusTestCase(_CorpusFixtureBase, JsonAndValidTests, UnrepresentableTests,
                     CategoriesAndUtf8Tests, BoundaryTests,
                     ManifestAndInventoryTests):
    """All validate_corpus tests: fixture base plus thematic mixins."""
