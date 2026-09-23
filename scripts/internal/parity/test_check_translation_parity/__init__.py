from test_check_translation_parity.base import TranslationParityTestCase as _ParityFixtureBase
from test_check_translation_parity.test_markdown_core import MarkdownCoreTests
from test_check_translation_parity.test_front_matter import FrontMatterTests
from test_check_translation_parity.test_grammar import GrammarTests
from test_check_translation_parity.test_semi_formal import SemiFormalTests
from test_check_translation_parity.test_extractors_pins import ExtractorsAndPinsTests


class TranslationParityTestCase(_ParityFixtureBase, MarkdownCoreTests, FrontMatterTests,
                                GrammarTests, SemiFormalTests,
                                ExtractorsAndPinsTests):
    """All translation-parity tests: fixture base plus thematic mixins."""
