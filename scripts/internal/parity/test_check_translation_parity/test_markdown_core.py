"""MarkdownCoreTests parity tests."""

import check_translation_parity as ctp
from test_check_translation_parity.base import EN_DOC, RU_DOC_OK, semi_doc


class MarkdownCoreTests:
    def test_section_sort_key_handles_4301_digit_numbers_without_traceback(self):
        huge = "9" * 4301
        en = self.write(
            "spec.md",
            EN_DOC + "\n## %s Huge section\n\nA MUST remains here.\n" % huge)
        ru = self.write(
            "spec.ru.md",
            RU_DOC_OK + "\n## %s Огромный раздел\n\nЗдесь остаётся MUST.\n" % huge)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("Traceback", out)

    # -- happy path -----------------------------------------------------

    def test_split_source_lines_only_recognizes_markdown_line_terminators(self):
        cases = [
            ("", []),
            ("first\nsecond\n", ["first", "second"]),
            ("first\rsecond\r", ["first", "second"]),
            ("first\r\nsecond\r\n", ["first", "second"]),
            ("first\u0085second\u2028third\u2029fourth\vfifth\ffinal",
             ["first\u0085second\u2028third\u2029fourth\vfifth\ffinal"]),
        ]
        for source, expected in cases:
            with self.subTest(source=repr(source)):
                self.assertEqual(ctp.split_source_lines(source), expected)

    def test_crlf_lf_and_cr_files_have_the_same_parity(self):
        for line_ending in ("\r\n", "\n", "\r"):
            with self.subTest(line_ending=repr(line_ending)):
                en = self.write_with_line_ending(
                    "spec.md", EN_DOC, line_ending)
                ru = self.write_with_line_ending(
                    "spec.ru.md", RU_DOC_OK, line_ending)
                code, out = self.run_main(en, ru)
                self.assertEqual(code, 0, out)
                self.assertIn("OVERALL: PASS", out)

    def test_unicode_line_separator_before_grammar_fence_is_not_a_break(self):
        grammar = [
            "<document> ::= <line>*",
            "<line> ::= <pair-line>",
        ]
        en = self.write("spec.md", semi_doc(grammar))
        translated = semi_doc(grammar).replace(
            "Grammar productions.\n\n```\n",
            "Grammar productions.\n\u2028```\n")
        ru = self.write("spec.ru.md", translated)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("unclosed fenced code block", out)

    def test_tilde_fence_with_info_string_excludes_contents(self):
        lines = [
            "## 1. Section",
            "   ~~~json",
            "## 9.9 not a heading",
            "   ~~~ \t",
            "## 2. After",
        ]
        sections, opens, occurrences, _, excluded, _, unclosed, ranges = (
            ctp.parse_file(lines))
        self.assertEqual(opens, [1])
        self.assertEqual(occurrences, {"1": 1, "2": 1})
        self.assertEqual(sorted(sections), ["1", "2"])
        self.assertTrue(excluded[2])
        self.assertFalse(unclosed)
        self.assertEqual(ranges, [(1, 2, 3)])

    def test_four_backtick_fence_requires_four_backtick_closer(self):
        lines = [
            "## 1. Section",
            "````python",
            "```",
            "## 9.9 still inside the fence",
            "````  \t",
            "## 2. After",
        ]
        sections, opens, occurrences, _, excluded, _, unclosed, ranges = (
            ctp.parse_file(lines))
        self.assertEqual(opens, [1])
        self.assertEqual(occurrences, {"1": 1, "2": 1})
        self.assertEqual(sorted(sections), ["1", "2"])
        self.assertTrue(excluded[2])
        self.assertTrue(excluded[3])
        self.assertFalse(unclosed)
        self.assertEqual(ranges, [(1, 2, 4)])

    def test_fence_closer_rejects_info_text_and_unicode_whitespace(self):
        lines = [
            "## 1. Section",
            "~~~",
            "~~~language",
            "\u2028",
            "~~~\u00a0",
            "## 9.9 still inside the fence",
            "~~~",
            "## 2. After",
        ]
        sections, opens, occurrences, _, excluded, _, unclosed, ranges = (
            ctp.parse_file(lines))
        self.assertEqual(opens, [1])
        self.assertEqual(occurrences, {"1": 1, "2": 1})
        self.assertTrue(excluded[2])
        self.assertTrue(excluded[3])
        self.assertTrue(excluded[4])
        self.assertFalse(unclosed)
        self.assertEqual(ranges, [(1, 2, 6)])

    def test_four_space_fence_indent_is_content_not_a_fence(self):
        lines = [
            "## 1. Section",
            "    ```",
            "## 9.9 is a heading after indented content",
            "Text MUST remain visible.",
        ]
        sections, opens, occurrences, _, excluded, _, unclosed, _ = (
            ctp.parse_file(lines))
        self.assertEqual(opens, [])
        self.assertEqual(occurrences, {"1": 1, "9.9": 1})
        self.assertFalse(excluded[1])
        self.assertFalse(unclosed)

    def test_unicode_whitespace_cannot_be_blank_heading_or_list_indentation(self):
        self.assertFalse(ctp.ascii_blank("\u0085"))
        self.assertFalse(ctp.ascii_blank("\u2028"))
        self.assertFalse(ctp.ascii_blank("\u2029"))
        self.assertFalse(ctp.ascii_blank("\v"))
        self.assertFalse(ctp.ascii_blank("\f"))
        self.assertIsNone(ctp.HEADING_RE.match("\u2028## 2. Not a heading"))
        self.assertIsNone(ctp.LIST_ITEM_RE.match("\u2029- not a list"))
        self.assertIsNone(ctp.TABLE_ROW_RE.match("\u0085| not a row"))
        self.assertIsNone(ctp.parse_fence_opener("\u2028```"))

        lines = ["## 1. Section", "\u2028", "Text MUST remain content."]
        sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
        self.assertEqual(ctp.count_content(
            lines, sections["1"][0], sections["1"][1], excluded),
            (1, 0, 0))

    def test_happy_path_identical_structure_passes(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[FAIL]", out)

    def test_happy_path_verbose_prints_pass_lines(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru, "--verbose")
        self.assertEqual(code, 0, out)
        self.assertIn("[PASS]", out)
        self.assertIn("Sec 2.1", out)

    # -- dropped MUST NOT sentence ----------------------------------------

    def test_dropped_must_not_sentence_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace(
            "Ключ MUST NOT содержать байт NUL.\n", "")
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.1", out)
        self.assertIn("MUST NOT count mismatch (EN=1, translation=0)", out)

    # -- missing whole section --------------------------------------------

    def test_missing_whole_section_fails(self):
        en = self.write("spec.md", EN_DOC)
        # Drop the "### 2.2 Values" section and its content entirely.
        cut = RU_DOC_OK.index("### 2.2 Значения")
        ru_broken = RU_DOC_OK[:cut]
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.2", out)
        self.assertIn("missing section", out)

    # -- missing code block -------------------------------------------------

    def test_missing_code_block_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace("```\nexample: 1\n```\n\n", "")
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.1", out)
        self.assertIn("code-block count mismatch (EN=1, translation=0)", out)

    # -- multiple translation files, independent verdicts ------------------

    def test_multiple_translations_independent(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh_broken = self.write(
            "spec.zh.md",
            RU_DOC_OK.replace("Ключ MUST быть непустым.", ""))
        code, out = self.run_main(en, ru, zh_broken)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("spec.zh.md", out)
        self.assertIn("MUST count mismatch", out)
        # ru.md itself still fully matches EN.
        ru_lines = [l for l in out.splitlines() if "spec.ru.md" in l and "[FAIL]" in l]
        self.assertEqual(ru_lines, [])

    # -- headings inside fenced code blocks are not real headings ----------

    def test_fake_heading_inside_code_fence_is_ignored(self):
        en = EN_DOC.replace(
            "```\nexample: 1\n```\n",
            "```\n## 9.9 not a real heading\nexample: 1\n```\n")
        en_path = self.write("spec.md", en)
        # RU's fence mirrors the same extra line so fence-content line
        # counts stay in parity; this test is only about the fake heading
        # not being picked up as a real section, not about content drift.
        ru_text = RU_DOC_OK.replace(
            "```\nexample: 1\n```\n",
            "```\n## 9.9 not a real heading\nexample: 1\n```\n")
        ru = self.write("spec.ru.md", ru_text)
        code, out = self.run_main(en_path, ru)
        # The fake "## 9.9" heading inside the fence must not be picked up
        # as a real numbered section (which would otherwise report a
        # "missing section 9.9" false failure against ru).
        self.assertNotIn("Sec 9.9", out)
        self.assertEqual(code, 0, out)

    # -- dropped plain paragraph (no keyword, no fence) --------------------

    def test_dropped_plain_paragraph_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace("Немного вводного текста.\n\n", "")
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 1", out)
        self.assertIn("paragraph count mismatch (EN=1, translation=0)", out)

    # -- translation-only section -------------------------------------------

    def test_translation_only_section_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK + "### 9.9 Лишний раздел\n\nНовый текст с MUST здесь.\n"
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 9.9", out)
        self.assertIn("translation-only section", out)

    # -- duplicate section number -------------------------------------------

    def test_duplicate_section_number_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK + "### 2.2 Дубликат\n\nЗначение MUST NOT быть пустым.\n"
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.2", out)
        self.assertIn("duplicate section number", out)

    # -- duplicate section number in the canonical EN file ------------------

    def test_duplicate_section_number_in_en_fails(self):
        en_broken = EN_DOC + "\n### 2.2 Duplicate In En\n\nExtra text with a MUST.\n"
        en = self.write("spec.md", en_broken)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.2", out)
        self.assertIn("duplicate section number", out)

    # -- missing unnumbered named section ------------------------------------

    def test_missing_unnumbered_named_section_fails(self):
        en_doc = EN_DOC + "\n## Appendix B. Migration\n\nMigrate with a MUST check.\n"
        en = self.write("spec.md", en_doc)
        ru = self.write("spec.ru.md", RU_DOC_OK)  # intentionally lacks the appendix
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("missing named section: Appendix B. Migration", out)
        self.assertNotIn("extra named section", out)

    # -- front matter: Version value changed in a translation ---------------

    def test_keyword_inside_fence_not_counted_masks_dropped_must(self):
        # Adversarial mutation: remove the real prose "MUST" from Sec 2.1
        # (replace the English keyword with a plain Russian word, so the
        # regex no longer matches it) while ALSO adding a "MUST"-looking
        # line inside the section's existing code fence. If fence content
        # were not excluded from the keyword count, the two changes would
        # cancel out and the mismatch would go undetected.
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace(
            "Ключ MUST быть непустым.", "Ключ должен быть непустым."
        ).replace(
            "```\nexample: 1\n```\n",
            "```\nexample: 1\n## MUST\n```\n",
        )
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 2.1", out)
        self.assertIn("MUST count mismatch (EN=1, translation=0)", out)

    # -- unclosed fenced code block in a translation -------------------------

    def test_unclosed_fence_in_translation_fails(self):
        # Drop only the CLOSING ``` of Sec 2.1's existing code block; the
        # rest of the file (including "### 2.2 ...") is then silently
        # swallowed as fence content by parse_file, so Sec 2.2 also
        # vanishes from RU -- but the checker must name the real defect
        # (an unclosed fence), not just report a missing section.
        en = self.write("spec.md", EN_DOC)
        ru_broken = RU_DOC_OK.replace("example: 1\n```\n", "example: 1\n")
        ru = self.write("spec.ru.md", ru_broken)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("spec.ru.md", out)
        self.assertIn("unclosed fenced code block", out)

    # -- unclosed fenced code block in the canonical EN file ------------------

    def test_unclosed_fence_in_en_fails(self):
        # Same mutation as above, applied to EN instead: this must be
        # fatal BEFORE any translation is read or compared (mirroring the
        # existing duplicate-section-in-EN fatal check), since every
        # section range/content count derived from EN is untrustworthy
        # once EN itself ends inside an unterminated fence.
        en_broken = EN_DOC.replace("example: 1\n```\n", "example: 1\n")
        en = self.write("spec.md", en_broken)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("spec.md", out)
        self.assertIn("unclosed fenced code block", out)

    # -- real spec files still balance their fences (protective, not gate) --

    def test_real_files_fence_balance_unaffected_by_unclosed_check(self):
        # Purely protective: a well-formed doc with a properly closed
        # fence must never trip the new unclosed-fence check.
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertNotIn("unclosed fenced code block", out)

    # -- embedded grammar terminals in semi-formal prose productions ---------

