"""GrammarTests parity tests."""

import os
import re

import check_translation_parity as ctp
from test_check_translation_parity.base import BARE_GRAMMAR_LINES_EN, EN_DOC, REPO_ROOT, RU_DOC_OK, SEMI_GRAMMAR_LINES_EN, bare_doc, content_unit_dir, read_repository_sec4_bodies, semi_doc


class GrammarTests:
    def test_dropped_grammar_production_line_inside_preserved_fence_fails(self):
        # Reproduces the reviewer's exact adversarial case: delete one BNF
        # production line from inside a § 4-style fence while the
        # translation still has the same NUMBER of headings (2) and the
        # same NUMBER of fenced code blocks (1) as EN. Before the
        # fence-line-count and grammar-LHS-set checks were added, this
        # produced a false "PASS": the fence-count check alone (1 vs 1)
        # cannot see a line missing FROM INSIDE a fence, and fence
        # content was fully excluded from every other content-loss
        # counter (paragraph/list/table/keyword).
        grammar_lines_en = [
            "<document>       ::= <line>*",
            "<line>           ::= <comment> | <blank>",
            r'<quoted-segment> ::= "\"" <dq-token>* "\""       ; § 5.3.3',
            "<dq-token>       ::= <key-escape> | <dq-char>",
        ]
        # Drops exactly the <quoted-segment> production line -- heading
        # count and fence count both still match EN.
        grammar_lines_translation = [
            l for l in grammar_lines_en
            if not l.startswith("<quoted-segment>")
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_translation))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 4", out)
        # The per-fence line-count check fires ...
        self.assertIn(
            "non-blank line count mismatch (EN=4, translation=3)", out)
        # ... and so does the grammar nonterminal-set check, naming the
        # dropped production's left-hand side.
        self.assertIn("grammar production LHS set mismatch", out)
        self.assertIn("<quoted-segment>", out)

    def test_duplicate_grammar_lhs_replacing_ignored_continuation_fails(self):
        # The prose continuation is intentionally ignored by the pure-BNF
        # production map. Replacing it with a second pure declaration must
        # still fail before that map can overwrite the first RHS.
        duplicate = list(SEMI_GRAMMAR_LINES_EN)
        duplicate[duplicate.index(
            "                    ASCII control bytes < 0x20 other than the whitespace"
        )] = "<document>      ::= <line>*"
        en = self.write("spec.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", semi_doc(duplicate))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("duplicate grammar production LHS <document>", out)
        self.assertIn("2 declarations in translation", out)

    def test_duplicate_grammar_lhs_in_en_is_fatal_before_translation_compare(self):
        duplicate = list(SEMI_GRAMMAR_LINES_EN)
        duplicate.append("<document>      ::= <line>*")
        en = self.write("spec.md", semi_doc(duplicate))
        ru = self.write("spec.ru.md", semi_doc(SEMI_GRAMMAR_LINES_EN))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("duplicate grammar production LHS <document>", out)
        self.assertNotIn("spec.ru.md", out)

    # -- bare-identifier grammar signatures -------------------------------

    def test_bare_grammar_character_class_drift_fails_without_line_count(self):
        mutated = list(BARE_GRAMMAR_LINES_EN)
        mutated[mutated.index("hex_digit      ::= [0-9a-fA-F]")] = (
            "hex_digit      ::= [0-8a-fA-F]")
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("bare grammar production RHS mismatch for hex_digit", out)
        self.assertNotIn("non-blank line count mismatch", out)

    def test_bare_grammar_rhs_token_drift_fails_without_line_count(self):
        mutated = list(BARE_GRAMMAR_LINES_EN)
        mutated[0] = mutated[0].replace("sign?", "sign*")
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("bare grammar production RHS mismatch for integer", out)
        self.assertNotIn("non-blank line count mismatch", out)

    def test_bare_grammar_deleted_production_fails_by_signature(self):
        mutated = [line for line in BARE_GRAMMAR_LINES_EN
                   if not line.startswith("dec_digit")]
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("bare grammar production LHS set mismatch", out)
        self.assertIn("dec_digit", out)

    def test_duplicate_bare_grammar_lhs_in_translation_fails_before_map_overwrite(self):
        mutated = list(BARE_GRAMMAR_LINES_EN)
        mutated[mutated.index('sign           ::= "+" | "-"')] = (
            "integer        ::= sign? ( hex | oct | bin | dec )")
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "duplicate bare grammar production LHS integer", out)
        self.assertIn("2 declarations in translation", out)
        self.assertNotIn("non-blank line count mismatch", out)

    def test_malformed_bare_grammar_in_en_is_fatal_before_translation_compare(self):
        malformed = list(BARE_GRAMMAR_LINES_EN)
        malformed[0] = "integer        ::= "
        en = self.write("spec.md", bare_doc(malformed))
        ru = self.write("spec.ru.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("bare grammar production integer failed to parse", out)
        self.assertNotIn("spec.ru.md", out)

    def test_duplicate_bare_grammar_lhs_in_en_is_fatal_before_translation_compare(self):
        duplicate = list(BARE_GRAMMAR_LINES_EN)
        duplicate[duplicate.index('sign           ::= "+" | "-"')] = (
            "integer        ::= sign? ( hex | oct | bin | dec )")
        en = self.write("spec.md", bare_doc(duplicate))
        ru = self.write("spec.ru.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("duplicate bare grammar production LHS integer", out)
        self.assertNotIn("spec.ru.md", out)

    def test_malformed_bare_grammar_in_translation_is_reported(self):
        malformed = list(BARE_GRAMMAR_LINES_EN)
        malformed[0] = "integer        ::= "
        en = self.write("spec.md", bare_doc(BARE_GRAMMAR_LINES_EN))
        ru = self.write("spec.ru.md", bare_doc(malformed))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "bare grammar production integer failed to parse in translation",
            out)

    def test_grammar_production_terminal_swap_fails_despite_matching_lhs(self):
        # Reproduces round-15's adversarial case: a translation swaps one
        # terminal inside an existing production (":" -> ";" in
        # <pair-line>) while heading count, fence non-blank line count, AND
        # the grammar LHS-name set all stay identical to EN. Before the
        # RHS-syntax check was added, this passed silently: the LHS-set
        # check only compares nonterminal NAMES, never each production's
        # actual right-hand side.
        grammar_lines_en = [
            "<document>   ::= <line>*",
            r'<pair-line>  ::= <key> ":"  <sep-end> <value-part-opt> eol',
            r'                  | <key> "::" <sep-end> <value-part-opt> eol',
            "<key>        ::= <segment>+",
        ]
        grammar_lines_mutated = [
            l.replace('<key> ":"', '<key> ";"')
            for l in grammar_lines_en
        ]
        self.assertNotEqual(grammar_lines_en, grammar_lines_mutated)
        self.assertEqual(
            [len(l) for l in grammar_lines_en],
            [len(l) for l in grammar_lines_mutated])

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_mutated))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("Sec 4", out)
        # The checks round-15 already found sufficient must NOT be what
        # catches this -- heading count, fence line count, and the LHS
        # name set are all unchanged by construction.
        self.assertNotIn("non-blank line count mismatch", out)
        self.assertNotIn("grammar production LHS set mismatch", out)
        # Only the new RHS-syntax check must fire, naming the production.
        self.assertIn("grammar production RHS mismatch for <pair-line>", out)

    def test_line_end_grammar_atoms_are_supported(self):
        # These exact atoms must tokenize as pure BNF so the shipped
        # section 4 grammar signature remains comparable across languages.
        grammar_lines = [
            "<document>      ::= <line>*",
            "<line-end>      ::= eol | EOF",
            "<comment-body>  ::= any-chars-until-line-end",
            "<lookahead>     ::= &line-end",
            '<item-literal>  ::= (ws) "::" <sep-end> '
            'any-chars-until-line-end <line-end>',
            '<plain-inline-separator> ::= ":" !":"',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased - draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines))
        ru = self.write("spec.ru.md", doc(grammar_lines))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertIn("OVERALL: PASS", out)

    def test_repository_content_pin_bare_grammar_signature_matches_all_languages(self):
        repo_root = REPO_ROOT
        per_language = {}
        for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
            path = os.path.join(repo_root, "versions", "0.7", name)
            lines = ctp.read_lines(path)
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["3.6"]
            productions, malformed = ctp.extract_bare_grammar_productions(
                lines, start, end, excluded)
            self.assertEqual(malformed, [], name)
            per_language[name] = productions

        self.assertEqual(per_language["spec.ru.md"], per_language["spec.md"])
        self.assertEqual(per_language["spec.zh.md"], per_language["spec.md"])
        self.assertEqual(
            set(per_language["spec.md"]),
            {"integer", "sign", "hex", "oct", "bin", "dec",
             "hex_digit", "oct_digit", "bin_digit", "dec_digit",
             "float", "dec_part", "exponent"})

    def test_line_end_atom_lookalikes_remain_malformed(self):
        # Accepting any of these would weaken the generic malformed-
        # production detector rather than adding the requested atoms.
        grammar_lines_en = [
            "<document>      ::= <line>*",
            "<line-end>      ::= eol | EOF",
            "<comment-body>  ::= any-chars-until-line-end",
            "<lookahead>     ::= &line-end",
        ]
        bad_atoms = [
            ("<line-end>", "<line-end>      ::= eol | EOFx", "EOFx"),
            ("<comment-body>",
             "<comment-body>  ::= any-chars-until-line-end-extra",
             "any-chars-until-line-end-extra"),
            ("<lookahead>", "<lookahead>     ::= &line-ending",
             "&line-ending"),
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased - draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        for lhs, bad_line, bad_atom in bad_atoms:
            with self.subTest(bad_atom=bad_atom):
                ru_lines = list(grammar_lines_en)
                ru_lines[ru_lines.index(
                    next(line for line in ru_lines
                         if line.startswith(lhs)))] = bad_line
                ru = self.write("spec.ru.md", doc(ru_lines))
                code, out = self.run_main(en, ru)
                self.assertEqual(code, 1, out)
                self.assertIn("OVERALL: FAIL", out)
                self.assertIn(
                    "failed to parse as pure BNF in translation", out)

    # ---- repository content-pin integration tests ------------------------
    # These deliberately open the checked-in generated spec/content files.
    # They are not synthetic parity fixtures and must remain strict pins.

    def test_repository_content_pin_line_end_grammar_signature_matches_all_languages(self):
        # The generated files must expose the same new atom signature; this
        # focused check does not run the full parity command.
        repo_root = REPO_ROOT
        signatures = []
        for name in ("spec.md", "spec.ru.md", "spec.zh.md"):
            path = os.path.join(repo_root, "versions", "0.7", name)
            with open(path, encoding="utf-8") as f:
                lines = [line.rstrip("\n") for line in f.readlines()]
            sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
            start, end = sections["4"]
            productions, malformed = ctp.extract_grammar_productions(
                lines, start, end, excluded)
            self.assertEqual(malformed, [], name)
            signatures.append(productions)

        self.assertEqual(signatures[0], signatures[1])
        self.assertEqual(signatures[0], signatures[2])
        self.assertEqual(signatures[0]["<line-end>"], ["eol | EOF"])
        self.assertEqual(
            signatures[0]["<comment-body>"],
            ["any-chars-until-line-end"])
        self.assertTrue(
            any("&line-end" in fragment
                for fragment in signatures[0]["<value-start>"]))

    def test_item_literal_bounded_body_signature_mismatch_fails(self):
        grammar_lines_en = [
            "<document>      ::= <line>*",
            '<item-literal>  ::= (ws) "::" <sep-end> '
            'any-chars-until-line-end <line-end>',
        ]
        grammar_lines_ru = [
            "<document>      ::= <line>*",
            '<item-literal>  ::= (ws) "::" <sep-end> '
            '<any-chars>? <line-end>',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased - draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production RHS mismatch for <item-literal>", out)
        self.assertNotIn("failed to parse as pure BNF", out)

    def test_repository_content_pin_source_item_literal_uses_bounded_raw_line(self):
        production = (
            '<item-literal>  ::= (ws) "::" <sep-end> '
            '<raw-line> <line-end>')
        for lang, source in read_repository_sec4_bodies().items():
            with self.subTest(lang=lang):
                self.assertEqual(source.count(production), 1)
                self.assertNotIn(
                    '<item-literal>  ::= (ws) "::" <sep-end> '
                    'any-chars-until-line-end <line-end>', source)

    def test_repository_content_pin_source_raw_pair_line_uses_raw_line_only(self):
        expected_pair = '| <key> "::" <sep-end> <raw-line> <line-end>'
        expected_raw_line = '<raw-line> ::= any-chars-until-line-end'
        for lang, source in read_repository_sec4_bodies().items():
            with self.subTest(lang=lang):
                raw_pair_lines = [
                    line for line in source.splitlines()
                    if re.match(r'^\s*\|\s*<key>\s+"::"\s+<sep-end>', line)
                ]
                self.assertEqual(len(raw_pair_lines), 1, raw_pair_lines)
                pair_syntax = raw_pair_lines[0].split(';', 1)[0]
                self.assertEqual(' '.join(pair_syntax.split()), expected_pair)

                raw_line_declarations = [
                    line for line in source.splitlines()
                    if re.match(r'^\s*<raw-line>\s*::=', line)
                ]
                self.assertEqual(
                    len(raw_line_declarations), 1, raw_line_declarations)
                raw_line_syntax = raw_line_declarations[0].split(';', 1)[0]
                self.assertEqual(
                    ' '.join(raw_line_syntax.split()), expected_raw_line)

                guarded_syntax = pair_syntax + "\n" + raw_line_syntax
                self.assertNotIn('<value-part-opt>', guarded_syntax)
                self.assertNotIn('<value-start>', guarded_syntax)

    def test_repository_content_pin_source_ws_is_line_bounded_in_all_languages(self):
        repo_root = REPO_ROOT
        body_path = os.path.join(content_unit_dir("sec-4"), "body-1.md")
        with open(body_path, encoding="utf-8") as f:
            source = f.read()

        for marker in (
                "is line-bounded",
                "ограничен строкой",
                "均受行边界限制"):
            self.assertIn(marker, source)
        for marker in (
                "not consumed by either ws form",
                "не поглощаются ни одной формой ws",
                "两种 ws 形式均不消耗它们"):
            self.assertIn(marker, source)

    def test_malformed_syntax_production_in_en_is_fatal(self):
        # Round-16 finding 2: a production whose LHS is NOT on the
        # semi-formal prose allowlist (SEMI_FORMAL_PROSE_LHS) is expected
        # to always be pure BNF. If EN's OWN copy fails to tokenize -- a
        # malformed terminal, like the pre-round-16 backslash-terminal bug
        # ("\"" written where "\\"" belongs) -- that is a spec-authoring
        # defect, not a translation issue, and must halt before any
        # translation is even compared (same severity class as a
        # duplicate section number or an unclosed fence).
        grammar_lines_en = [
            "<document>   ::= <line>*",
            r'<pair-line>  ::= <key> ":" <sep-end> <value-part-opt> eol',
            # Malformed: a terminal meant to mean a literal backslash,
            # written as the 3-byte escaped-quote-with-no-closer "\"
            # instead of the well-formed 4-byte "\\".
            r'<key>        ::= <segment>+ "\"',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_en))  # identical -- irrelevant, EN itself is broken
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn("grammar production <key> failed to parse as pure BNF", out)
        # Must stop before any per-translation comparison runs: exactly
        # the one EN-fatal [FAIL] line, nothing else.
        fail_lines = [l for l in out.splitlines() if "[FAIL]" in l]
        self.assertEqual(len(fail_lines), 1, out)

    def test_malformed_syntax_production_in_translation_only_is_reported(self):
        # A production that tokenizes fine in EN but is corrupted into
        # something unparseable in the translation (not merely DIFFERENT,
        # but no longer valid BNF at all) must be reported distinctly from
        # an ordinary RHS mismatch, not silently dropped the way a
        # legitimately prose-shaped production's RHS is.
        grammar_lines_en = [
            "<document>   ::= <line>*",
            r'<pair-line>  ::= <key> ":" <sep-end> <value-part-opt> eol',
            "<key>        ::= <segment>+",
        ]
        grammar_lines_ru = [
            "<document>   ::= <line>*",
            r'<pair-line>  ::= <key> ":" <sep-end> <value-part-opt> eol',
            # Corrupted: same backslash-terminal defect, introduced only
            # in the translation this time.
            r'<key>        ::= <segment>+ "\"',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF "
            "in translation", out)

    def test_empty_angle_grammar_rhs_is_fatal_even_when_all_languages_are_truncated(self):
        # A shared truncation must not disappear from every production map
        # and thereby pass cross-language parity unchanged.
        grammar_lines = [
            "<document> ::= <line>*",
            "<key> ::= ",
        ]
        en = self.write("spec.md", semi_doc(grammar_lines))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines))
        zh = self.write("spec.zh.md", semi_doc(grammar_lines))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF", out)
        self.assertNotIn("spec.ru.md", out)
        self.assertNotIn("spec.zh.md", out)

    def test_empty_angle_grammar_rhs_in_translation_is_reported(self):
        grammar_lines_en = [
            "<document> ::= <line>*",
            "<key> ::= <segment>+",
        ]
        grammar_lines_ru = [
            "<document> ::= <line>*",
            "<key> ::= ",
        ]
        en = self.write("spec.md", semi_doc(grammar_lines_en))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF "
            "in translation", out)

    def test_empty_angle_grammar_continuation_is_recorded_before_later_alternatives(self):
        grammar_lines = [
            "<document> ::= <line>*",
            "<key> ::= <segment>+",
            "|",
            "| <other>",
            "<other> ::= <segment>",
        ]
        en = self.write("spec.md", semi_doc(grammar_lines))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF", out)
        self.assertNotIn("grammar production RHS mismatch for <other>", out)

    def test_empty_angle_grammar_declaration_keeps_nonempty_continuation_but_is_malformed(self):
        lines = [
            "<document> ::= <line>*",
            "<key> ::= ",
            "| <segment>+",
        ]
        sections, _, _, _, excluded, _, _, _ = ctp.parse_file(
            semi_doc(lines).splitlines())
        productions, malformed = ctp.extract_grammar_productions(
            semi_doc(lines).splitlines(), *sections["4"], excluded)
        self.assertEqual(productions["<key>"], ["| <segment>+"])
        self.assertIn(("<key>", ""), malformed)

    def test_grammar_terminal_tokenizer_accepts_only_documented_escapes(self):
        self.assertTrue(ctp._is_pure_bnf(r'"\""'))
        self.assertTrue(ctp._is_pure_bnf(r'"\\"'))
        self.assertFalse(ctp._is_pure_bnf(r'"\q"'))
        self.assertFalse(ctp._is_pure_bnf(r'"\."'))
        self.assertFalse(ctp._is_pure_bnf(r'"\n"'))

    def test_shared_invalid_grammar_terminal_escape_is_fatal(self):
        grammar_lines = [
            "<document> ::= <line>*",
            r'<key> ::= "\q"',
        ]
        en = self.write("spec.md", semi_doc(grammar_lines))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines))
        zh = self.write("spec.zh.md", semi_doc(grammar_lines))
        code, out = self.run_main(en, ru, zh)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF", out)
        self.assertNotIn("spec.ru.md", out)
        self.assertNotIn("spec.zh.md", out)

    def test_invalid_grammar_terminal_escape_in_translation_is_reported(self):
        grammar_lines_en = [
            "<document> ::= <line>*",
            r'<key> ::= "\\"',
        ]
        grammar_lines_ru = [
            "<document> ::= <line>*",
            r'<key> ::= "\q"',
        ]
        en = self.write("spec.md", semi_doc(grammar_lines_en))
        ru = self.write("spec.ru.md", semi_doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn(
            "grammar production <key> failed to parse as pure BNF "
            "in translation", out)

    def test_escapable_byte_style_terminal_swap_without_semicolon_caught(self):
        # Reproduces round-16's exact adversarial case: mutate a
        # non-colon, non-semicolon terminal (here "," -> "!", matching the
        # review's own <escapable-byte> example) on a production's
        # DECLARATION line, with no trailing "; comment" on the line at
        # all -- so _rhs_fragment's semicolon-based comment-stripping
        # plays no role in detection, unlike the round-15 test's
        # ":" -> ";" mutation (which happened to also get caught via a
        # side effect of comment-stripping truncation). This isolates that
        # the RHS-syntax comparison itself, not that side effect, is what
        # catches a corrupted terminal.
        grammar_lines_en = [
            "<document>        ::= <line>*",
            r'<escapable-byte>  ::= "\\" | "," | "}" | "]"',
        ]
        grammar_lines_ru = [
            "<document>        ::= <line>*",
            r'<escapable-byte>  ::= "\\" | "!" | "}" | "]"',
        ]

        def doc(fence_lines):
            return (
                "# Spec\n\n**Version:** 0.7.0\n"
                "**Date:** (unreleased — draft)\n\n"
                "## 4. Grammar\n\nGrammar productions.\n\n```\n"
                + "\n".join(fence_lines) + "\n```\n\n"
                "## 5. Semantics\n\nSome text with a MUST.\n"
            )

        en = self.write("spec.md", doc(grammar_lines_en))
        ru = self.write("spec.ru.md", doc(grammar_lines_ru))
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 1, out)
        self.assertIn("OVERALL: FAIL", out)
        self.assertIn(
            "grammar production RHS mismatch for <escapable-byte>", out)

    def test_repository_content_pin_grammar_has_no_malformed_productions(self):
        # Protective test over the ACTUAL versions/0.7/spec.md: fixes the
        # expected set of productions this checker holds to exact BNF
        # parity, and asserts zero malformed productions right now. If
        # this count or set ever drifts, it means either a new production
        # was added (update the expected numbers) or -- the case this
        # guards against -- a real production silently stopped
        # tokenizing and fell through the allowlist gap undetected.
        repo_root = REPO_ROOT
        spec_path = os.path.join(repo_root, "versions", "0.7", "spec.md")
        with open(spec_path, encoding="utf-8") as f:
            lines = [l.rstrip("\n") for l in f.readlines()]
        sections, _, _, _, excluded, _, _, _ = ctp.parse_file(lines)
        start, end = sections["4"]
        lhs_set = ctp.extract_grammar_lhs(lines, start, end, excluded)
        productions, malformed = ctp.extract_grammar_productions(
            lines, start, end, excluded)
        self.assertEqual(malformed, [])
        self.assertEqual(len(lhs_set), 45)
        self.assertEqual(len(productions), 36)
        self.assertEqual(
            lhs_set - set(productions),
            ctp.SEMI_FORMAL_PROSE_LHS)
        self.assertIn("<raw-line>", lhs_set)
        self.assertEqual(
            productions["<raw-line>"], ["any-chars-until-line-end"])
        self.assertNotIn("<raw-line>", ctp.SEMI_FORMAL_PROSE_LHS)
        for lhs in ("<line-end>", "<comment-body>", "<raw-segment>"):
            self.assertIn(lhs, lhs_set)

    def test_grammar_lhs_check_does_not_misfire_without_grammar_fences(self):
        # Guard against the new grammar-LHS-set check misfiring on
        # ordinary sections whose fences hold non-grammar example content
        # (no line matches '^<...>::='): the happy-path fixtures below
        # have no grammar fence at all, and must stay a clean PASS.
        en = self.write("spec.md", EN_DOC)
        ru = self.write("spec.ru.md", RU_DOC_OK)
        code, out = self.run_main(en, ru)
        self.assertEqual(code, 0, out)
        self.assertNotIn("grammar production LHS set mismatch", out)
        self.assertNotIn("non-blank line count mismatch", out)

    # -- keyword inside a fence must not mask a dropped keyword in prose ----

