"""Shared fixtures, doc-body constants, and helpers for the parity tests."""

import contextlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import check_translation_parity as ctp

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

EN_BODY = """## 1. Introduction

Some intro text.

## 2. Rules

### 2.1 Naming

A key MUST be non-empty. A key MUST NOT contain a NUL byte.
Implementations SHOULD normalize case. Implementations SHOULD NOT reorder
keys. Extra whitespace MAY be trimmed.

```
example: 1
```

### 2.2 Values

A value MUST be one of the supported types.
"""

RU_BODY = """## 1. Введение

Немного вводного текста.

## 2. Правила

### 2.1 Именование

Ключ MUST быть непустым. Ключ MUST NOT содержать байт NUL.
Реализации SHOULD нормализовать регистр. Реализации SHOULD NOT
переставлять ключи. Лишние пробелы MAY быть удалены.

```
example: 1
```

### 2.2 Значения

Значение MUST быть одним из поддерживаемых типов.
"""

ZH_BODY = """## 1. 引言

一些介绍性文字。

## 2. 规则

### 2.1 命名

键 MUST 非空。键 MUST NOT 包含 NUL 字节。
实现 SHOULD 规范化大小写。实现 SHOULD NOT 重排键。
多余空白 MAY 被去除。

```
example: 1
```

### 2.2 值

值 MUST 是受支持的类型之一。
"""

EN_DOC = """# Spec

**Version:** 0.7.0
**Date:** (unreleased — draft)

""" + EN_BODY

# RU translation identical in structure/counts to EN_DOC (text content
# differs, but that's fine: this is a structural, not linguistic, check).
RU_DOC_OK = """# Спецификация

**Версия:** 0.7.0
**Дата:** (не выпущено — черновик)

""" + RU_BODY

# ZH translation identical in structure/counts to EN_DOC (text content
# differs, but that's fine: this is a structural, not linguistic, check).
ZH_DOC_OK = """# 规范

**版本:** 0.7.0
**日期:**(未发布 —— 草案)

""" + ZH_BODY

# Realistic front-matter docs mirroring the shipped 0.7 files' shape:
# EN without a disclaimer, RU/ZH each with a legitimately different
# 'Informative translation' disclaimer blockquote EN does not have.
EN_FRONT_DOC = """# Spec

**Languages:** **English**
**Version:** 0.7.0
**Date:** (unreleased — draft, normative text and fixtures only)

""" + EN_BODY

RU_FRONT_DOC = """# Спецификация

**Languages:** [English](spec.md) · **Русский**
**Версия:** 0.7.0
**Дата:** (не выпущено — черновик)

> **Информативный перевод.** Канонической, нормативной версией является
> английский оригинал в том же каталоге.

""" + RU_BODY

ZH_FRONT_DOC = """# 规范

**Languages:** [English](spec.md) · **简体中文**
**版本:** 0.7.0
**日期:**(未发布 —— 草案)

> **Informative translation.** 本翻译仅供参考；规范性版本是英文原文。

""" + ZH_BODY

# Same base docs, but with a released (dated) Date field instead of draft,
# for the release-date parity tests below.
EN_DOC_DATED = EN_DOC.replace("**Date:** (unreleased — draft)\n",
                              "**Date:** 2026-09-02\n")
RU_DOC_DATED = RU_DOC_OK.replace("**Дата:** (не выпущено — черновик)\n",
                                 "**Дата:** 2026-09-02\n")
ZH_DOC_DATED = ZH_DOC_OK.replace("**日期:**(未发布 —— 草案)\n",
                                 "**日期:** 2026-09-02\n")


    # -- embedded grammar terminals in semi-formal prose productions ---------
    #
    # The 9 SEMI_FORMAL_PROSE_LHS productions mix real language-
    # independent syntax into translatable prose. Before this check was
    # added, a translation could silently corrupt an embedded normative
    # terminal (e.g. swap "." for ":" inside <unescaped-dot>'s prose RHS)
    # with zero detection. These tests pin the embedded-terminal
    # protection, the multiset (order-insensitive) comparison contract,
    # and the real shipped files' behavior.

# Real EN production text for the semi-formal-prose fixtures (verbatim
# grammar content from versions/0.7/spec.md § 4, prose lightly abridged
# where irrelevant to the embedded terminals). Used by the semi-formal
# tests below so the embedded tokens are realistic.
SEMI_GRAMMAR_LINES_EN = [
    "<document>      ::= <line>*",
    "<line>          ::= <comment> | <blank> | <header-line> | <pair-line>",
    '<comment>       ::= (ws) "##" any-chars-until-line-end',
    "<blank>         ::= (ws)",
    r'<unescaped-dot>      ::= "." that is NOT preceded by an odd number of "\\"',
    r'<non-quote-key-char> ::= <key-char> excluding "\"", "\'", "`"',
    "<key-char>      ::= any UTF-8 code point except",
    "                    ASCII control bytes < 0x20 other than the whitespace",
    "                    members (tab 0x09, VT 0x0B, FF 0x0C — LF 0x0A and",
    "                    CR 0x0D are excluded separately as line terminators),",
    "                    DEL (0x7F),",
    '                    "[", "]", "{", "}", "(", ")", ":", ",",',
    r'                    "\\" (backslash), "." (the path separator; use "\." for',
    '                    a literal dot), "#" is allowed; "##" only starts a comment',
    "<dq-char>       ::= any UTF-8 code point except ASCII control bytes",
    '                    < 0x20 other than tab/VT/FF, DEL (0x7F), LF, CR,',
    r'                    "\\" (escape lead), and "\"" (the delimiter itself)',
    "<sq-char>       ::= same exclusions as <dq-char>, but excluding \"'\"",
    '                    (its own delimiter) instead of "\\""',
    "<scalar-body>   ::= (ws) any-chars-until-line-end",
    "                    ; trimmed; interpreted per the value rules",
    '<inline-pair>      ::= <key> (ws) "::" (ws) <inline-raw-scalar> (ws)',
    '                     | <key> (ws) <plain-inline-separator> (ws) <inline-value-opt> (ws)',
    '<plain-inline-separator> ::= ":" !":"',
    "",
    "<inline-raw-scalar> ::= sequence of bytes after the raw marker,",
    '                        terminated by the first unescaped "," / "}" /',
    '                        "]" or by <line-end> (which is an error per',
    "                        section 6.11); surrounding whitespace is trimmed",
    "                        from this sequence before escape processing,",
    "                        and the resulting bytes are the literal String",
    "                        body. This production does NOT dispatch through",
    '                        <inline-value> or <inline-scalar>; an initial',
    '                        "{" or "[" is literal data.',
    "<inline-scalar>    ::= sequence of bytes terminated by an unescaped",
    '                       "," / "}" / "]" or by end-of-line',
    "<multiline-content-line> ::= any line within an open <multiline>;",
    '                             the terminator (")" or "))") ends the block',
]


def semi_doc(fence_lines):
    return (
        "# Spec\n\n**Version:** 0.7.0\n"
        "**Date:** (unreleased — draft)\n\n"
        "## 4. Grammar\n\nGrammar productions.\n\n```\n"
        + "\n".join(fence_lines) + "\n```\n\n"
        "## 5. Semantics\n\nSome text with a MUST.\n"
    )


BARE_GRAMMAR_LINES_EN = [
    "integer        ::= sign? ( hex | oct | bin | dec )",
    'sign           ::= "+" | "-"',
    'hex            ::= "0x" hex_digit (("_")? hex_digit)*',
    'oct            ::= "0o" oct_digit (("_")? oct_digit)*',
    'bin            ::= "0b" bin_digit (("_")? bin_digit)*',
    'dec            ::= dec_digit (("_")? dec_digit)*',
    "hex_digit      ::= [0-9a-fA-F]",
    "oct_digit      ::= [0-7]",
    "bin_digit      ::= [0-1]",
    "dec_digit      ::= [0-9]",
    "float          ::= sign? dec_part \".\" dec_part exponent?",
    "                 | sign? dec_part exponent",
    "dec_part       ::= dec_digit ((\"_\")? dec_digit)*",
    'exponent       ::= ("e" | "E") sign? dec_part',
]


def bare_doc(fence_lines):
    return (
        "# Spec\n\n**Version:** 0.7.0\n"
        "**Date:** (unreleased - draft)\n\n"
        "## 3.6 Number Literals\n\nGrammar productions.\n\n```\n"
        + "\n".join(fence_lines) + "\n```\n\n"
        "## 5. Semantics\n\nSome text with a MUST.\n"
    )


BODY_SOURCE_RE = re.compile(
    r'\Aexport default \{\n'
    r'  en: `(?P<en>(?:\\.|[^`])*)`,\n'
    r'  ru: `(?P<ru>(?:\\.|[^`])*)`,\n'
    r'  zh: `(?P<zh>(?:\\.|[^`])*)`,\n'
    r'\};\n\Z',
    re.DOTALL,
)


def decode_body_template(text, path, lang):
    """Decode the three escapes permitted in content body templates."""
    decoded = []
    idx = 0
    while idx < len(text):
        if text[idx] != "\\":
            decoded.append(text[idx])
            idx += 1
            continue
        if text.startswith("\\\\", idx):
            decoded.append("\\")
            idx += 2
        elif text.startswith("\\`", idx):
            decoded.append("`")
            idx += 2
        elif text.startswith("\\${", idx):
            decoded.append("${")
            idx += 3
        else:
            raise AssertionError(
                "%s %s contains an unsupported template escape at offset %d"
                % (path, lang, idx))
    return "".join(decoded)


def content_unit_dir(name):
    """Absolute path of a content unit, wherever the manifest puts it.

    A unit may sit inside a group directory, so its location comes from
    manifest.js; only its NAME is fixed.
    """
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    content = os.path.join(repo_root, "versions", "0.7", "content")
    with open(os.path.join(content, "manifest.js"), encoding="utf-8") as fh:
        manifest = json.loads(fh.read().replace("export default ", "", 1))
    for unit in manifest:
        if unit.rsplit("/", 1)[-1] == name:
            return os.path.join(content, *unit.split("/"))
    raise AssertionError("manifest.js has no unit named %r" % name)


def read_repository_sec4_bodies():
    """Read and decode every checked-in Sec 4 body part per language."""
    body_dir = content_unit_dir("sec-4")
    body_names = sorted(
        (name for name in os.listdir(body_dir)
         if re.fullmatch(r"body-\d+\.js", name)),
        key=lambda name: (len(name[5:-3]), name[5:-3]))
    result = {lang: [] for lang in ("en", "ru", "zh")}
    for name in body_names:
        body_path = os.path.join(body_dir, name)
        with open(body_path, encoding="utf-8") as body_file:
            match = BODY_SOURCE_RE.fullmatch(body_file.read())
        if match is None:
            raise AssertionError("unexpected content body shape: %s" % body_path)
        for lang in result:
            result[lang].append(
                decode_body_template(match.group(lang), body_path, lang))
    return {lang: "".join(parts) for lang, parts in result.items()}




class TranslationParityTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="ktav-parity-test-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def write(self, name, text):
        path = os.path.join(self.tmp, name)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        return path

    def write_with_line_ending(self, name, text, line_ending):
        path = os.path.join(self.tmp, name)
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text.replace("\n", line_ending))
        return path

    def _replace_semi_line(self, lines, prefix, new_line):
        mutated = list(lines)
        for i, l in enumerate(mutated):
            if l.startswith(prefix):
                mutated[i] = new_line
                return mutated
        self.fail("fixture line with prefix %r not found" % prefix)

    def run_main(self, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = ctp.main(list(args))
        return code, out.getvalue()

