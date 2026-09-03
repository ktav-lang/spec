#!/usr/bin/env python3
"""One-time mechanical bootstrap: split the 0.7 specs into content units.

All spec content is extracted by byte-range slicing of the original files;
the script never regenerates or hard-codes any spec text. Stdlib only.
"""
import argparse
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_translation_parity import (parse_file, NUMBERED_HEADING_RE,
                                      heading_level, FENCE_RE, HEADING_RE)

LANGS = [("en", "spec.md"), ("ru", "spec.ru.md"), ("zh", "spec.zh.md")]
SLUG_OK_RE = re.compile(r"[^a-z0-9]+")


def fatal(msg):
    print("FATAL: " + msg, file=sys.stderr)
    sys.exit(1)


def load(path):
    with open(path, "rb") as f:
        data = f.read()
    if b"\r" in data:
        fatal("CR byte found in " + path)
    offsets = [0]
    for line in data.split(b"\n")[:-1]:
        offsets.append(offsets[-1] + len(line) + 1)
    offsets.append(len(data))
    lines = data.decode("utf-8").splitlines()
    return data, offsets, lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    outdir = os.path.join(root, "versions", "0.7", "content")
    if os.path.exists(outdir):
        if not args.force:
            fatal("output dir exists: %s (use --force)" % outdir)
        shutil.rmtree(outdir)
    os.makedirs(outdir)

    # per-language state
    st = {}
    for lang, fname in LANGS:
        data, offsets, lines = load(os.path.join(root, "versions", "0.7", fname))
        res = parse_file(lines)
        sections, _, occurrences, levels, _, named, unclosed, _ = res
        if unclosed:
            fatal("unclosed fence in " + lang)
        for num, cnt in occurrences.items():
            if cnt > 1:
                fatal("duplicate section %s in %s" % (num, lang))
        first = None
        for idx, line in enumerate(lines):
            if HEADING_RE.match(line) and heading_level(line) >= 2:
                first = idx
                break
        if first is None:
            fatal("no level>=2 heading found in " + lang)
        st[lang] = {
            "data": data, "offsets": offsets, "lines": lines,
            "sections": sections, "levels": levels, "named": named,
            "first": first,
            "numbered": sorted(sections.items(), key=lambda kv: kv[1][0]),
            "named_sorted": sorted(named, key=lambda t: t[2]),
        }

    en = st["en"]
    if len(en["numbered"]) != 97 or len(en["named_sorted"]) != 5:
        fatal("expected 97 numbered / 5 named sections, got %d / %d" %
              (len(en["numbered"]), len(en["named_sorted"])))

    # Cross-check RU/ZH structure against EN positionally.
    for lang in ("ru", "zh"):
        L = st[lang]
        if [n for n, _ in L["numbered"]] != [n for n, _ in en["numbered"]]:
            for i, (a, b) in enumerate(zip(en["numbered"], L["numbered"])):
                if a[0] != b[0]:
                    fatal("%s: section at position %d is %s, EN has %s"
                          % (lang, i, b[0], a[0]))
            fatal("%s: numbered section sequence differs from EN" % lang)
        if len(L["named_sorted"]) != len(en["named_sorted"]):
            fatal("%s: named section count %d != EN %d"
                  % (lang, len(L["named_sorted"]), len(en["named_sorted"])))
        for i, (e1, l1) in enumerate(zip(en["named_sorted"], L["named_sorted"])):
            if e1[1] != l1[1]:
                fatal("%s: named section %d level %d != EN level %d"
                      % (lang, i, l1[1], e1[1]))

    # Build ordered unit list from EN. Each unit carries, per language,
    # the (heading_line_idx, body_end_idx) resolved positionally.
    def ranges_for(unit_kind, en_idx):
        """Return {lang: (heading_idx, end_idx)} for a non-frontmatter unit."""
        out = {}
        for lang in ("en", "ru", "zh"):
            L = st[lang]
            if unit_kind == "numbered":
                s, e = L["numbered"][en_idx][1]
            else:
                s, e = L["named_sorted"][en_idx][2], L["named_sorted"][en_idx][3]
            out[lang] = (s, e)
        return out

    units = [("frontmatter", None,
              {lang: (0, st[lang]["first"]) for lang in LANG_NAMES})]
    used = {"frontmatter"}
    num_i = 0
    named_i = 0
    en_starts = sorted(
        [(s, 0, num) for num, (s, e) in en["numbered"]] +
        [(s, 1, i) for i, (t, lv, s, e) in enumerate(en["named_sorted"])])
    for start, which, key in en_starts:
        if which == 0:
            num = key
            lvl = en["levels"][num]
            folder = "sec-" + num
            units.append((folder, ("numbered", num, lvl), ranges_for("numbered", num_i)))
            num_i += 1
        else:
            text, lvl, s, e = en["named_sorted"][key]
            head = text.strip()
            slug = SLUG_OK_RE.sub("-", head.split(".", 1)[0].lower()).strip("-")
            if not slug:
                fatal("empty slug from heading %r" % head)
            folder = "named-" + slug
            if folder in used:
                fatal("duplicate folder name " + folder)
            used.add(folder)
            units.append((folder, ("named", None, lvl), ranges_for("named", named_i)))
            named_i += 1

    if len(units) != 103:
        fatal("expected 103 units, got %d" % len(units))

    files_written = 0
    for folder, info, ranges in units:
        unitdir = os.path.join(outdir, folder)
        os.makedirs(unitdir)
        kind, num, lvl = info if info else ("frontmatter", None, None)
        titles = {}
        seps = {}
        for lang in ("en", "ru", "zh"):
            S = st[lang]
            hidx, eidx = ranges[lang]
            bstart = S["offsets"][0] if hidx == 0 else S["offsets"][hidx + 1]
            body = S["data"][bstart:S["offsets"][eidx]]
            with open(os.path.join(unitdir, lang + ".md"), "wb") as f:
                f.write(body)
            files_written += 1
            if kind == "frontmatter":
                titles[lang] = None
                continue
            line = S["lines"][hidx]
            if kind == "numbered":
                m = NUMBERED_HEADING_RE.match(line)
                if not m:
                    fatal("%s: heading not numbered in %s: %r" % (folder, lang, line))
                if m.group(1) != num:
                    fatal("%s: number mismatch in %s: %s != %s"
                          % (folder, lang, m.group(1), num))
                m_end = m.end()
                if line[m_end:m_end + 2] == ". ":
                    sep = ". "
                    title = line[m_end + 2:]
                elif line[m_end:m_end + 2] == "  ":
                    fatal("%s: double space after number in %s: %r"
                          % (folder, lang, line))
                elif line[m_end:m_end + 1] == " ":
                    sep = " "
                    title = line[m_end + 1:]
                else:
                    fatal("%s: heading lacks separator after number in %s: %r"
                          % (folder, lang, line))
                synthesized = "#" * lvl + " " + num + sep + title
            else:
                title = line[len(line) - len(line.lstrip("#")) + 1:]
                synthesized = "#" * lvl + " " + title
            titles[lang] = title
            if kind == "numbered":
                seps[lang] = sep
            if synthesized.encode("utf-8") != line.encode("utf-8"):
                fatal("%s/%s: heading round-trip failed\nreceived: %r\nexpected: %r"
                      % (folder, lang, synthesized, line))

        if kind == "frontmatter":
            obj = {"kind": "frontmatter", "number": None, "level": None,
                   "title": None}
        elif kind == "numbered":
            if not (seps["en"] == seps["ru"] == seps["zh"]):
                fatal("%s: separator differs across languages: en=%r ru=%r zh=%r"
                      % (folder, seps["en"], seps["ru"], seps["zh"]))
            obj = {"kind": "numbered", "number": num, "sep": seps["en"],
                   "level": lvl, "title": titles}
        else:
            obj = {"kind": "named", "number": None, "level": lvl,
                   "title": titles}
        with open(os.path.join(unitdir, "meta.js"), "w", encoding="utf-8",
                  newline="\n") as f:
            f.write("export default " + json.dumps(obj, ensure_ascii=False,
                                                   indent=2) + "\n")
        files_written += 1

    names = [u[0] for u in units]
    with open(os.path.join(outdir, "manifest.js"), "w", encoding="utf-8",
              newline="\n") as f:
        f.write("export default " + json.dumps(names, indent=2) + "\n")
    files_written += 1

    with open(os.path.join(outdir, "package.json"), "wb") as f:
        f.write(b'{\n  "type": "module"\n}\n')
    files_written += 1

    counts = {}
    for _, info, _ in units:
        k = info[0] if info else "frontmatter"
        counts[k] = counts.get(k, 0) + 1
    print("Units: %d total" % len(units))
    for k in ("frontmatter", "numbered", "named"):
        print("  %s: %d" % (k, counts.get(k, 0)))
    print("Files written: %d" % files_written)
    print("Manifest head: %s" % names[:3])
    print("Manifest tail: %s" % names[-3:])


LANG_NAMES = ("en", "ru", "zh")

if __name__ == "__main__":
    main()
