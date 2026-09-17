"""SemiFormalTests parity tests."""


from test_check_translation_parity.base import SEMI_GRAMMAR_LINES_EN, semi_doc


class SemiFormalTests:
    def run_semi_mutation(self, mutated_lines, lhs):
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated_lines))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "embedded grammar terminal mismatch in semi-formal "
            "production %s" % lhs, out)
        # The OLD detectors must NOT have fired: same physical line
        # counts, and the mutated LHS has no pure-BNF fragment so it is
        # not in `productions` at all, and LHS names are intact.
        self.assertNotIn("non-blank line count mismatch", out)
        self.assertNotIn("grammar production RHS mismatch", out)
        self.assertNotIn("grammar production LHS set mismatch", out)

    def run_semi_compound_mutation(self, mutated_lines, lhs):
        """Like run_semi_mutation, but for mutations that change ONLY the
        (name, hex) bindings while keeping the flat token multiset
        identical: the OLD flat-multiset detector must stay silent (this
        is a genuinely NEW detection, not duplicate coverage) and the new
        compound association check must name the production."""
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated_lines))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte codepoint association mismatch in semi-formal "
            "production %s" % lhs, out)
        # NOT caught by the old flat multiset: the flat token bag is
        # unchanged by construction.
        self.assertNotIn("embedded grammar terminal mismatch", out)
        # No other detector has anything to fire on either.
        self.assertNotIn("non-blank line count mismatch", out)
        self.assertNotIn("grammar production RHS mismatch", out)
        self.assertNotIn("grammar production LHS set mismatch", out)

    def run_semi_triplet_mutation(self, mutated_lines, lhs):
        """Apply one semi-formal mutation to EN, RU, and ZH in turn.

        The production is intentionally prose-shaped, so every language's
        embedded grammar tokens must be protected independently. Keeping all
        three files in each run also guards the canonical EN path, not just
        the two translation paths.
        """
        for target in ("spec.md", "spec.ru.md", "spec.zh.md"):
            paths = {}
            for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
                lines = mutated_lines if name == target else SEMI_GRAMMAR_LINES_EN
                paths[name] = self.write(name, semi_doc(lines))
            code, out = self.run_main(
                paths["spec.md"], paths["spec.ru.md"], paths["spec.zh.md"])
            self.assertEqual(code, 1, "%s: %s" % (target, out))
            self.assertIn("OVERALL: FAIL", out)
            self.assertIn(
                "embedded grammar terminal mismatch in semi-formal "
                "production %s" % lhs, out)

    def run_grammar_triplet_mutation(self, mutated_lines, lhs):
        """Apply one strict-BNF mutation to each member of EN/RU/ZH."""
        for target in ("spec.md", "spec.ru.md", "spec.zh.md"):
            paths = {}
            for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
                lines = mutated_lines if name == target else SEMI_GRAMMAR_LINES_EN
                paths[name] = self.write(name, semi_doc(lines))
            code, out = self.run_main(
                paths["spec.md"], paths["spec.ru.md"], paths["spec.zh.md"])
            self.assertEqual(code, 1, "%s: %s" % (target, out))
            self.assertIn("OVERALL: FAIL", out)
            self.assertIn(
                "grammar production RHS mismatch for %s" % lhs, out)

    def test_pure_comment_terminal_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<comment>",
            '<comment>       ::= (ws) "//" any-chars-until-line-end')
        self.run_grammar_triplet_mutation(mutated, "<comment>")

    def test_semi_formal_unescaped_dot_terminal_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<unescaped-dot>",
            r'<unescaped-dot>      ::= ":" that is NOT preceded by an odd '
            r'number of "\\"')
        self.run_semi_mutation(mutated, "<unescaped-dot>")

    def test_semi_formal_unescaped_dot_escape_lead_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<unescaped-dot>",
            r'<unescaped-dot>      ::= "." that is NOT preceded by an odd '
            r'number of "//"')
        self.run_semi_mutation(mutated, "<unescaped-dot>")

    def test_semi_formal_non_quote_key_char_dropped_bt_exclusion_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<non-quote-key-char>",
            r'<non-quote-key-char> ::= <key-char> excluding "\"", "\'"')
        self.run_semi_mutation(mutated, "<non-quote-key-char>")

    def test_semi_formal_non_quote_key_char_sq_swapped_for_dq_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<non-quote-key-char>",
            r'<non-quote-key-char> ::= <key-char> excluding "\"", "\"", "`"')
        self.run_semi_mutation(mutated, "<non-quote-key-char>")

    def test_semi_formal_dq_char_escape_lead_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, r'                    "\\" (escape lead)',
            r'                    "//" (escape lead), and "\"" '
            r'(the delimiter itself)')
        self.run_semi_mutation(mutated, "<dq-char>")

    def test_semi_formal_sq_char_delimiter_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<sq-char>",
            '<sq-char>       ::= same exclusions as <dq-char>, but '
            'excluding "\\""')
        self.run_semi_mutation(mutated, "<sq-char>")

    def test_semi_formal_inline_scalar_comma_swap_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<inline-scalar>",
            '<inline-scalar>    ::= sequence of bytes terminated by an '
            'unescaped')
        mutated = self._replace_semi_line(
            mutated, '                       ","',
            '                       ";" / "}" / "]" or by end-of-line')
        self.run_semi_mutation(mutated, "<inline-scalar>")

    def test_plain_inline_separator_terminal_mutation_fails_in_en_ru_zh(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<plain-inline-separator>",
            '<plain-inline-separator> ::= "." !":"')
        self.run_grammar_triplet_mutation(mutated, "<plain-inline-separator>")

    def test_plain_inline_separator_negative_lookahead_mutations_fail(self):
        mutations = [
            '<plain-inline-separator> ::= !":" ":"',
            '<plain-inline-separator> ::= ":"',
        ]
        for replacement in mutations:
            with self.subTest(replacement=replacement):
                mutated = self._replace_semi_line(
                    SEMI_GRAMMAR_LINES_EN, "<plain-inline-separator>",
                    replacement)
                self.run_grammar_triplet_mutation(
                    mutated, "<plain-inline-separator>")

    def test_inline_pair_raw_double_colon_mutation_fails_in_en_ru_zh(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<inline-pair>",
            '<inline-pair>      ::= <key> (ws) ":" (ws) '
            '<inline-raw-scalar> (ws)')
        self.run_grammar_triplet_mutation(mutated, "<inline-pair>")

    def test_inline_raw_scalar_delimiter_mutations_fail_in_en_ru_zh(self):
        mutations = [
            (
                '                        terminated by the first unescaped "," / "}" /',
                '                        terminated by the first unescaped ";" / "}" /'),
            (
                '                        "]" or by <line-end> (which is an error per',
                '                        ")" or by <line-end> (which is an error per'),
            (
                '                        "]" or by <line-end> (which is an error per',
                '                        "]" or by end-of-line (which is an error per'),
        ]
        for old, new in mutations:
            with self.subTest(new=new):
                mutated = self._replace_semi_line(
                    SEMI_GRAMMAR_LINES_EN, old, new)
                self.run_semi_triplet_mutation(mutated, "<inline-raw-scalar>")

    def test_semi_formal_multiline_content_line_verbatim_terminator_lost(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                             the terminator",
            '                             the terminator (")" or ")") ends '
            'the block')
        self.run_semi_mutation(mutated, "<multiline-content-line>")

    def test_semi_formal_key_char_colon_exclusion_dropped_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, '                    "[", "]", "{", "}"',
            '                    "[", "]", "{", "}", "(", ")", ","!')
        self.run_semi_mutation(mutated, "<key-char>")

    def test_semi_formal_order_insensitive_quote_list_passes(self):
        # Mirroring the real RU phrasing ("own delimiter first"): list the
        # quote exclusions in a DIFFERENT order than EN. Exclusion sets
        # are semantically order-independent, so the multiset contract
        # must keep this a PASS.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<non-quote-key-char>",
            r'<non-quote-key-char> ::= <key-char> excluding "\'", "\"", "`"')
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("embedded grammar terminal mismatch", out)

    def test_semi_formal_reworded_prose_keeping_terminals_passes(self):
        # A translation legitimately re-wording the prose while keeping
        # every embedded terminal must PASS.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "<unescaped-dot>",
            r'<unescaped-dot>      ::= a "." with an odd count of "\\" '
            r'right before it is escaped, not unescaped')
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("embedded grammar terminal mismatch", out)

    def test_semi_formal_baseline_fixture_passes(self):
        # The untouched fixture itself must be a clean PASS (the mutation
        # tests below rely on this baseline).
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

    def test_semi_formal_dq_char_hex_0x20_mutated_to_0x21_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    < 0x20",
            "                    < 0x21 other than tab/VT/FF, DEL (0x7F), "
            "LF, CR,")
        self.run_semi_mutation(mutated, "<dq-char>")

    def test_semi_formal_dq_char_del_0x7f_clause_removed_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    < 0x20",
            "                    < 0x20 other than tab/VT/FF, LF, CR,")
        self.run_semi_mutation(mutated, "<dq-char>")

    def test_semi_formal_key_char_vt_ff_dropped_fails(self):
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    members (tab 0x09,",
            "                    members (tab 0x09 — LF 0x0A and")
        self.run_semi_mutation(mutated, "<key-char>")

    def test_semi_formal_key_char_cr_letter_dropped_fails(self):
        # A multiset-changing LF/CR mutation: bare "CR" removed while the
        # byte literal 0x0D stays. (A pure ORDER swap of "LF, CR" is NOT a
        # multiset change and is deliberately still a PASS -- see the
        # order-insensitivity test below.)
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    CR 0x0D are excluded separately",
            "                    0x0D are excluded separately as line "
            "terminators,")
        self.run_semi_mutation(mutated, "<key-char>")

    def test_semi_formal_dq_char_lf_cr_reorder_still_passes(self):
        # The significant-token comparison is a MULTISET contract: swapping
        # the order of "LF, CR" does not change the multiset and must stay a
        # PASS (mirrors the shipped translations' legitimate phrasing
        # differences). Documented so a future reviewer does not mistake
        # the order-insensitivity for a blind spot.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    < 0x20",
            "                    < 0x20 other than tab/VT/FF, DEL (0x7F), "
            "CR, LF,")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)
        self.assertNotIn("embedded grammar terminal mismatch", out)

    def test_semi_formal_key_char_hex_0x0a_dropped_fails(self):
        # Byte-literal loss inside <key-char>: "LF 0x0A" loses its hex form.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN, "                    members (tab 0x09,",
            "                    members (tab 0x09, VT 0x0B, FF 0x0C — LF")
        self.run_semi_mutation(mutated, "<key-char>")

    def test_semi_formal_key_char_lf_cr_codepoint_bindings_swapped_fails(self):
        # The review's exact false-negative: swap ONLY the LF/CR codepoint
        # bindings ("LF 0x0A and CR 0x0D" -> "LF 0x0D and CR 0x0A"). The
        # flat token multiset is IDENTICAL (same names, same hex values),
        # so the pre-compound-check logic passed this; the compound pair
        # check must catch it.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    members (tab 0x09,",
            "                    members (tab 0x09, VT 0x0B, FF 0x0C — "
            "LF 0x0D and")
        mutated = self._replace_semi_line(
            mutated,
            "                    CR 0x0D are excluded separately",
            "                    CR 0x0A are excluded separately as line "
            "terminators),")
        self.run_semi_compound_mutation(mutated, "<key-char>")

    def test_semi_formal_key_char_vt_ff_codepoint_bindings_swapped_fails(self):
        # Same association-swap class for the VT/FF pair: "VT 0x0B,
        # FF 0x0C" -> "VT 0x0C, FF 0x0B". Flat multiset unchanged; only
        # the compound check fires.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    members (tab 0x09,",
            "                    members (tab 0x09, VT 0x0C, FF 0x0B — "
            "LF 0x0A and")
        self.run_semi_compound_mutation(mutated, "<key-char>")

    # -- fixed absolute-constant checks: '< 0x20' threshold, tab 0x09 ------
    #
    # Round-20 finding 2: two more numeric facts in the semi-formal
    # <dq-char>/<key-char> prose are asserted as FIXED ABSOLUTE CONSTANTS
    # per language (threshold always 0x20; tab always 0x09 wherever the
    # translated word is stated with its code point), not compared
    # cross-language.

    def test_semi_formal_key_char_control_threshold_mutated_fails(self):
        # ONLY the threshold value changes ("< 0x20" -> "< 0x09") in the
        # translation; the tab pairing is untouched. The absolute check
        # must fire and name the exact defect; the old compound-pair
        # check has nothing to fire on (no LF/CR/VT/FF/DEL pair touched).
        # Note the old flat-multiset check ALSO fires on this particular
        # mutation (a one-sided value change necessarily shifts the token
        # counts) -- that catch is incidental and evaporates when both
        # sides are corrupted identically, which is the case
        # test_semi_formal_threshold_corruption_identical_in_en_and_translation_fails
        # pins below.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    ASCII control bytes < 0x20",
            "                    ASCII control bytes < 0x09 other than the "
            "whitespace")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte threshold in production <key-char>", out)
        self.assertIn("expected 0x20, found 0x09", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)

    def test_semi_formal_dq_char_control_threshold_mutated_fails(self):
        # Same threshold mutation in the OTHER hosting production,
        # <dq-char> ("... control bytes < 0x20 other than tab/VT/FF, ...").
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    < 0x20",
            "                    < 0x09 other than tab/VT/FF, DEL (0x7F), "
            "LF, CR,")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte threshold in production <dq-char>", out)
        self.assertIn("expected 0x20, found 0x09", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)

    def test_semi_formal_key_char_tab_codepoint_mutated_fails(self):
        # ONLY the tab pairing's codepoint changes ("tab 0x09" ->
        # "tab 0x20"); the threshold is untouched. The absolute check
        # must fire and name the exact defect; the compound-pair check
        # stays silent ("tab" is not one of its five Latin names).
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    members (tab 0x09,",
            "                    members (tab 0x20, VT 0x0B, FF 0x0C — "
            "LF 0x0A and")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("tab codepoint in production <key-char>", out)
        self.assertIn("expected 0x09, found 0x20", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)

    def test_semi_formal_review_adversarial_threshold_tab_swap_fails_both_new_checks(self):
        # The review's exact false-green: swap BOTH fixed values
        # ("< 0x20 ... tab 0x09" -> "< 0x09 ... tab 0x20"). The flat
        # token multiset is IDENTICAL (one 0x20 and one 0x09 on each
        # side) and COMPOUND_ATOM_PAIR_RE matches neither the
        # '<'-anchored threshold nor the translated tab word, so BOTH
        # pre-existing detectors are structurally silent -- each new
        # absolute check must fire on its own fact, independently.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    ASCII control bytes < 0x20",
            "                    ASCII control bytes < 0x09 other than the "
            "whitespace")
        mutated = self._replace_semi_line(
            mutated,
            "                    members (tab 0x09,",
            "                    members (tab 0x20, VT 0x0B, FF 0x0C — "
            "LF 0x0A and")
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte threshold in production <key-char> (en): "
            "expected 0x20, found 0x09", out)
        self.assertIn(
            "tab codepoint in production <key-char> (en): expected "
            "0x09, found 0x20", out)
        # The OLD detectors must NOT have fired: flat multiset identical
        # by construction, compound pairs untouched, all counts unchanged.
        self.assertNotIn("embedded grammar terminal mismatch", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)
        self.assertNotIn("non-blank line count mismatch", out)
        self.assertNotIn("grammar production RHS mismatch", out)
        self.assertNotIn("grammar production LHS set mismatch", out)

    def test_semi_formal_threshold_corruption_identical_in_en_and_translation_fails(self):
        # The absolute-constant payoff: apply the SAME one-sided
        # threshold corruption to EN and the translation. Every
        # cross-language comparison is definitionally blind to identical
        # corruption on both sides (flat multiset, compound pairs, all
        # counts agree), so the OLD detectors stay silent -- only the
        # fixed constant catches it. The tab pairing is untouched, so
        # the tab check must NOT fire.
        mutated = self._replace_semi_line(
            SEMI_GRAMMAR_LINES_EN,
            "                    ASCII control bytes < 0x20",
            "                    ASCII control bytes < 0x09 other than the "
            "whitespace")
        en = self.write("spec.md", semi_doc(mutated))
        ru = self.write("spec.ru.md", semi_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "control-byte threshold in production <key-char> (en): "
            "expected 0x20, found 0x09", out)
        self.assertNotIn("tab codepoint in production", out)
        self.assertNotIn("embedded grammar terminal mismatch", out)
        self.assertNotIn(
            "control-byte codepoint association mismatch", out)

    # -- unit tests: extract_embedded_tokens / significant_grammar_tokens --

