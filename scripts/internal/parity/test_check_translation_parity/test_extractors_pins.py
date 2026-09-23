"""ExtractorsAndPinsTests parity tests."""

import contextlib
import io
import os
import unittest

import check_translation_parity as ctp
from test_check_translation_parity.base import EN_DOC, REPO_ROOT, RU_DOC_OK, ZH_DOC_OK


class ExtractorsAndPinsTests:
    def test_extract_embedded_tokens_returns_all_matches_in_order(self):
        # Terminals AND language-independent atoms interleaved in a
        # specific known order: the returned list must follow real source
        # positions, not "all grammar matches first, all atom matches
        # after" (the pre-round-19 behavior that broke the ordered
        # contract whenever the two token classes interleaved).
        text = '(ws) "##" 0x09 <dq-char> VT then (DEL (0x7F)) here'
        self.assertEqual(
            ctp.extract_embedded_tokens(text),
            ["(ws)", '"##"', "0x09", "<dq-char>", "VT",
             "(", "DEL", "(", "0x7F", ")", ")"])

    def test_significant_grammar_tokens_filters_prose_artifacts(self):
        text = (r'(ws) "##" <dq-char> ( and ) "\." '
                '"(" "first name: alice"')
        sig = ctp.significant_grammar_tokens(text)
        # Bare parens dropped; the letter/space-bearing example-scalar
        # quote dropped; normative terminals kept.
        self.assertIn('"##"', sig)
        self.assertIn('"\\."', sig)
        self.assertIn("<dq-char>", sig)
        self.assertIn("(ws)", sig)
        self.assertIn('"("', sig)
        self.assertNotIn("(", sig)
        self.assertNotIn(")", sig)
        self.assertNotIn('"first name: alice"', sig)

    def test_significant_grammar_tokens_includes_language_independent_atoms(self):
        text = '< 0x20 other than tab/VT/FF, DEL (0x7F), LF, CR,'
        sig = ctp.significant_grammar_tokens(text)
        self.assertEqual(
            sorted(sig),
            sorted(["0x20", "VT", "FF", "DEL", "0x7F", "LF", "CR"]))
        # "tab" is deliberately excluded (legitimately translated prose).
        self.assertNotIn("tab", sig)

    def test_extract_compound_atoms_captures_pairs_and_normalizes_case(self):
        text = '< 0x20 other than tab/VT/FF, DEL (0x7f), LF 0x0A and CR 0x0d,'
        self.assertEqual(
            ctp.extract_compound_atoms(text),
            [("DEL", "0x7F"), ("LF", "0x0A"), ("CR", "0x0D")])

    def test_extract_compound_atoms_ignores_bare_name_mentions(self):
        # A name with no adjacent hex value carries no pairing obligation
        # (e.g. the forward reference "LF, CR" in <dq-char>): not captured.
        text = 'tab/VT/FF, DEL (0x7F), LF, CR, and "\\" (escape lead)'
        self.assertEqual(ctp.extract_compound_atoms(text), [("DEL", "0x7F")])

    def test_extract_control_thresholds_captures_and_normalizes(self):
        # '<' + optional whitespace + hex; digits upper-cased, '0x' kept.
        self.assertEqual(
            ctp.extract_control_thresholds(
                'bytes < 0x20 other than ... and <0x2a here'),
            ["0x20", "0x2A"])
        # A <nonterminal> reference is not a threshold (a letter, not
        # whitespace/hex, follows the '<').
        self.assertEqual(
            ctp.extract_control_thresholds('<dq-char> and <key-char>'), [])

    def test_extract_tab_codepoints_pairs_only_word_plus_value(self):
        # A tab word IMMEDIATELY followed by its hex value is captured
        # (per language); a bare mention with no adjacent value
        # ("tab/VT/FF" -- the real <dq-char> shape in all three
        # languages) is not.
        self.assertEqual(
            ctp.extract_tab_codepoints(
                'members (tab 0x09, VT 0x0B) or bare tab/VT/FF'),
            [("en", "0x09")])
        self.assertEqual(
            ctp.extract_tab_codepoints(
                '(табуляция 0x09, VT 0x0B — и просто табуляции/VT/FF)'),
            [("ru", "0x09")])
        self.assertEqual(
            ctp.extract_tab_codepoints(
                '制表符 0x09、VT 0x0B —— 以及 制表符/VT/FF'),
            [("zh", "0x09")])

    def test_detect_language_labels_marked_scripts(self):
        self.assertEqual(
            ctp.detect_language('ASCII bytes < 0x20 and tab'), 'en')
        self.assertEqual(
            ctp.detect_language('управляющих байтов < 0x20 (табуляция)'),
            'ru')
        self.assertEqual(
            ctp.detect_language('控制字节 < 0x20(制表符 0x09)'), 'zh')

    # -- protective real-spec test for the embedded-terminal check ----------

    def test_repository_content_pin_semi_formal_terminal_multisets_match_translations(self):
        # Self-verifying pin over the ACTUAL shipped files: for every
        # SEMI_FORMAL_PROSE_LHS production in § 4, the significant
        # embedded-terminal multiset in RU and ZH must exactly equal EN's.
        # If this ever fails, a real normative terminal drifted inside a
        # semi-formal prose RHS. Also pins specific named terminals are
        # present in EN's lists.
        repo_root = REPO_ROOT
        en_lines = ctp.read_lines(
            os.path.join(repo_root, "versions", "0.8", "spec.md"))
        ru_lines = ctp.read_lines(
            os.path.join(repo_root, "versions", "0.8", "spec.ru.md"))
        zh_lines = ctp.read_lines(
            os.path.join(repo_root, "versions", "0.8", "spec.zh.md"))

        def tokens_per_lhs(lines):
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["4"]
            semi = ctp.extract_semi_formal_rhs(lines, start, end, excluded)
            self.assertEqual(set(semi), ctp.SEMI_FORMAL_PROSE_LHS)
            return {lhs: sorted(ctp.significant_grammar_tokens(rhs))
                    for lhs, rhs in semi.items()}

        en = tokens_per_lhs(en_lines)
        ru = tokens_per_lhs(ru_lines)
        zh = tokens_per_lhs(zh_lines)
        for lhs in sorted(en):
            self.assertEqual(ru[lhs], en[lhs], "RU drift in %s" % lhs)
            self.assertEqual(zh[lhs], en[lhs], "ZH drift in %s" % lhs)
        # Named terminals present in EN's lists.
        self.assertIn('"."', en["<unescaped-dot>"])
        self.assertIn('"\\\\"', en["<unescaped-dot>"])
        self.assertIn("<key-char>", en["<non-quote-key-char>"])
        for q in ('"\\""', '"\'"', '"`"'):
            self.assertIn(q, en["<non-quote-key-char>"])
        self.assertIn('"\\\\"', en["<dq-char>"])
        self.assertIn('"\\""', en["<dq-char>"])
        for t in ('","', '"}"', '"]"'):
            self.assertIn(t, en["<inline-scalar>"])
        self.assertEqual(
            sorted(en["<inline-raw-scalar>"]),
            sorted([
                '","', '"}"', '"]"', '"{"', '"["',
                '<line-end>', '<inline-value>', '<inline-scalar>',
            ]))
        for t in ('")"', '"))"', "<multiline>"):
            self.assertIn(t, en["<multiline-content-line>"])

    def test_repository_content_pin_semi_formal_compound_atom_pairs_match_translations(self):
        # Compound companion to the test above, over the ACTUAL shipped
        # files: for every SEMI_FORMAL_PROSE_LHS production in § 4, the
        # multiset of (control-byte name, hex code point) pairs in RU and
        # ZH must exactly equal EN's. If this ever fails, a translation
        # re-paired a label with the wrong byte (e.g. LF/CR codepoints
        # swapped) while keeping the flat token multiset intact.
        repo_root = REPO_ROOT
        per_file = {}
        for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
            lines = ctp.read_lines(
                os.path.join(repo_root, "versions", "0.8", name))
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["4"]
            semi = ctp.extract_semi_formal_rhs(lines, start, end, excluded)
            per_file[name] = {
                lhs: sorted(ctp.extract_compound_atoms(rhs))
                for lhs, rhs in semi.items()}
        en_pairs = per_file["spec.md"]
        for lhs in sorted(ctp.SEMI_FORMAL_PROSE_LHS):
            for other in ("spec.ru.md", "spec.zh.md"):
                self.assertEqual(
                    per_file[other].get(lhs, []), en_pairs.get(lhs, []),
                    "%s compound-pair drift in %s" % (other, lhs))
        # The <key-char> production carries the full association set.
        en_key = en_pairs["<key-char>"]
        for pair in [("LF", "0x0A"), ("CR", "0x0D"), ("VT", "0x0B"),
                     ("FF", "0x0C"), ("DEL", "0x7F")]:
            self.assertIn(pair, en_key)

    def test_repository_content_pin_fixed_threshold_and_tab_constants_hold(self):
        # Positive pin over the ACTUAL shipped EN/RU/ZH files (round-20
        # finding 2): wherever the '<'-anchored control-byte threshold
        # occurs in a semi-formal production it is 0x20, and wherever a
        # tab word is stated with its code point it is 0x09. The exact
        # occurrence shapes are pinned per production so a future edit
        # that DROPS the pattern (instead of corrupting it) is noticed
        # here too: <dq-char> carries exactly one threshold and a bare
        # (value-less) tab mention; <key-char> carries exactly one
        # threshold and exactly one tab pairing, per language.
        repo_root = REPO_ROOT
        tab_lang = {"spec.md": "en", "spec.ru.md": "ru", "spec.zh.md": "zh"}
        for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
            lines = ctp.read_lines(
                os.path.join(repo_root, "versions", "0.8", name))
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["4"]
            semi = ctp.extract_semi_formal_rhs(lines, start, end, excluded)
            for lhs, rhs in semi.items():
                for hexval in ctp.extract_control_thresholds(rhs):
                    self.assertEqual(
                        hexval, "0x20",
                        "%s %s: threshold" % (name, lhs))
                for lang, hexval in ctp.extract_tab_codepoints(rhs):
                    self.assertEqual(
                        (lang, hexval), (tab_lang[name], "0x09"),
                        "%s %s: tab pairing" % (name, lhs))
            self.assertEqual(
                ctp.extract_control_thresholds(semi["<key-char>"]), ["0x20"])
            self.assertEqual(
                ctp.extract_tab_codepoints(semi["<key-char>"]),
                [(tab_lang[name], "0x09")])
            self.assertEqual(
                ctp.extract_control_thresholds(semi["<dq-char>"]), ["0x20"])
            self.assertEqual(
                ctp.extract_tab_codepoints(semi["<dq-char>"]), [])

    # -- stdout encoding safety ----------------------------------------------

    def test_non_utf8_stdout_does_not_crash_on_non_ascii_output(self):
        # Regression test for a UnicodeEncodeError crash on Windows
        # consoles (cp1252 etc.): an echoed non-ASCII fragment (here, a
        # stray Chinese front-matter line) must not blow up main() when
        # stdout is a non-UTF-8-encoded stream; it must still print a
        # normal [FAIL] line. io.StringIO (used by run_main() above) has
        # no console encoding at all, so it cannot reproduce this bug —
        # this test drives main() against a real ascii-encoded text
        # stream instead.
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        zh = self.write("spec.zh.md", ZH_DOC_OK.replace(
            "**日期:**(未发布 —— 草案)\n",
            "**日期:**(未发布 —— 草案)\n这是未翻译的多余段落。\n"))
        buf = io.BytesIO()
        ascii_stdout = io.TextIOWrapper(buf, encoding="ascii", errors="strict")
        with contextlib.redirect_stdout(ascii_stdout):
            code = ctp.main([en, ru, zh])
        ascii_stdout.flush()
        out = buf.getvalue().decode("utf-8", errors="replace")
        self.assertEqual(code, 1)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("unexpected content line", out)


if __name__ == "__main__":
    unittest.main()
