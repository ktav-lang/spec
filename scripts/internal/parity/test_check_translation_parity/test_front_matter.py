"""FrontMatterTests parity tests."""

from test_check_translation_parity.base import EN_DOC, EN_DOC_DATED, EN_FRONT_DOC, RU_DOC_DATED, RU_DOC_OK, RU_FRONT_DOC, ZH_DOC_DATED, ZH_DOC_OK, ZH_FRONT_DOC


class FrontMatterTests:
    def assert_no_fail_lines_for(self, out, *paths):
        for path in paths:
            bad = [l for l in out.splitlines()
                   if path in l and "[FAIL]" in l]
            self.assertEqual(bad, [])

    def test_front_matter_version_mismatch_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md",
                        ZH_DOC_OK.replace("**版本:** 0.7.0", "**版本:** 9.9.9"))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertTrue(any("[FAIL]" in l and "spec.zh.md" in l
                            for l in out.splitlines()))
        self.assertIn("Version value mismatch", out)
        self.assertIn("EN=0.7.0", out)
        self.assertIn("9.9.9", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: h1 title line removed --------------------------------

    def test_front_matter_missing_h1_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md", ZH_DOC_OK.replace("# 规范\n", ""))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertTrue(any("[FAIL]" in l and "spec.zh.md" in l
                            for l in out.splitlines()))
        self.assertIn("h1 title heading", out)
        self.assertIn("found 0", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: stray paragraph appended under the title --------------

    def test_front_matter_extra_paragraph_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md", ZH_DOC_OK.replace(
            "**日期:**(未发布 —— 草案)\n",
            "**日期:**(未发布 —— 草案)\n\n这是未翻译的多余段落。\n"))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertTrue(any("[FAIL]" in l and "spec.zh.md" in l
                            for l in out.splitlines()))
        self.assertIn("unexpected content line", out)
        self.assertIn("这是未翻译的多余段落。", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: disclaimer blockquotes are legitimate -----------------

    def test_front_matter_happy_path_with_disclaimer_passes(self):
        en = self.write("spec.md", EN_FRONT_DOC)
        ru = self.write("spec.ru.md", RU_FRONT_DOC)
        zh = self.write("spec.zh.md", ZH_FRONT_DOC)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[FAIL]", out)

    # -- front matter: same released date across all files ------------------

    def test_front_matter_same_released_date_passes(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED)
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("[FAIL]", out)

    # -- front matter: a translation ships a different release date ---------

    def test_front_matter_different_released_dates_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED)
        zh = self.write("spec.zh.md", ZH_DOC_DATED.replace(
            "**日期:** 2026-09-02\n", "**日期:** 2027-01-01\n"))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("release date mismatch", out)
        self.assertIn("EN=2026-09-02", out)
        self.assertIn("2027-01-01", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: one file still draft while others are released -------

    def test_front_matter_draft_released_mismatch_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_OK)  # still draft
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("release-status mismatch", out)
        self.assertIn("EN=dated", out)
        self.assertIn("translation=draft", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: YYYY-MM-DD-shaped but not a real calendar date -------

    def test_front_matter_invalid_calendar_date_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED.replace(
            "**Дата:** 2026-09-02\n", "**Дата:** 2026-13-40\n"))
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("invalid calendar date", out)
        self.assertIn("2026-13-40", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: Date line with two different valid dates -------------

    def test_front_matter_two_dates_in_one_line_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED.replace(
            "**Дата:** 2026-09-02\n", "**Дата:** 2026-09-02 2027-01-01\n"))
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "expected exactly one date-shaped occurrence, found 2", out)
        self.assertIn("2026-09-02", out)
        self.assertIn("2027-01-01", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: Date line with a valid date plus an invalid one ------

    def test_front_matter_valid_and_invalid_date_in_one_line_fails(self):
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED.replace(
            "**Дата:** 2026-09-02\n", "**Дата:** 2026-09-02 2026-13-40\n"))
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "expected exactly one date-shaped occurrence, found 2", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: an extra trailing digit is not a valid date ----------

    def test_front_matter_date_extra_trailing_digit_not_accepted(self):
        # "2026-09-020" must NOT be treated as the valid date "2026-09-02"
        # with a silently-dropped stray digit; with digit-bounded matching
        # it counts as no date at all, so the translation reads as "draft"
        # while EN (a clean "2026-09-02") reads as "dated" -- a
        # release-status mismatch, not a silent PASS.
        en = self.write("spec.md", EN_DOC_DATED)
        ru = self.write("spec.ru.md", RU_DOC_DATED.replace(
            "**Дата:** 2026-09-02\n", "**Дата:** 2026-09-020\n"))
        zh = self.write("spec.zh.md", ZH_DOC_DATED)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("release-status mismatch", out)
        self.assertIn("EN=dated", out)
        self.assertIn("translation=draft", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- front matter: a bold paragraph with no colon/value is not a field --

    def test_front_matter_bold_prose_without_colon_fails(self):
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md", ZH_DOC_OK.replace(
            "**日期:**(未发布 —— 草案)\n",
            "**日期:**(未发布 —— 草案)\n**这不是字段而是粗体段落**\n"))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("unexpected content line", out)
        self.assertIn("这不是字段而是粗体段落", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.ru.md")

    # -- front matter: a whole bold field line dropped from a translation ---

    def test_front_matter_field_line_count_mismatch_fails(self):
        # Drop the whole "**Languages:** ..." field line from RU; the
        # existing h1/Version/Date/stray checks alone do not notice a
        # missing generic field line, only a dedicated count comparison
        # does.
        en = self.write("spec.md", EN_FRONT_DOC)
        ru_broken = RU_FRONT_DOC.replace(
            "**Languages:** [English](spec.md) · **Русский**\n", "")
        ru = self.write("spec.ru.md", ru_broken)
        zh = self.write("spec.zh.md", ZH_FRONT_DOC)
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("field-line count mismatch", out)
        self.assertIn("EN=3", out)
        self.assertIn("translation=2", out)
        self.assert_no_fail_lines_for(out, "spec.md", "spec.zh.md")

    # -- adversarial: production line dropped from inside an otherwise-
    # preserved grammar fence (independent review finding 8) ---------------

