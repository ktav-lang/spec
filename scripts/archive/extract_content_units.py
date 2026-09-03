#!/usr/bin/env python3
"""Archived one-time bootstrap record: split the 0.7 specs into content units.

This is the script that mechanically performed the 0.7 content-unit
migration, kept in scripts/archive/ for provenance only -- it is NOT a
routine tool. It refuses to run when versions/0.7/content/ already exists
and has no override flag: rebuilding from scratch requires manually
deleting content/ first as a separate, deliberate action.

All spec content is extracted by byte-range slicing of the original files;
the script never regenerates or hard-codes any spec text. Stdlib only.
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from check_translation_parity import (parse_file, NUMBERED_HEADING_RE,
                                      heading_level, FENCE_RE, HEADING_RE)

LANGS = [("en", "spec.md"), ("ru", "spec.ru.md"), ("zh", "spec.zh.md")]
SLUG_OK_RE = re.compile(r"[^a-z0-9]+")


def tl_escape(s):
    s = s.replace("\\", "\\\\")   # 1. backslashes
    s = s.replace("`", "\\`")     # 2. backticks
    s = s.replace("${", "\\${")   # 3. dollar-brace
    return s


def split_language(body, lang_lines, N):
    """Split body into exactly N chunks at blank-line boundaries near the
    even targets. Returns (chunks, placed_cut_count)."""
    L = len(lang_lines) - 1
    offs = [0]
    for ln in lang_lines[:-1]:
        offs.append(offs[-1] + len(ln) + 1)
    cands = [b for b in range(len(lang_lines) - 1)
             if lang_lines[b] == "" and offs[b + 1] < len(body)]
    cuts = []
    prev_b = -1
    for i in range(1, N):
        t = i * L / N
        best = None
        for b in cands:
            if b <= prev_b:
                continue
            if best is None or abs((b + 1) - t) < abs((best + 1) - t):
                best = b
        if best is None:
            return None, i - 1
        cuts.append(offs[best + 1])
        prev_b = best
    bounds = [0] + cuts + [len(body)]
    chunks = [body[bounds[k]:bounds[k + 1]] for k in range(N)]
    return chunks, N - 1


def split_unit(bodies, lines_by_lang, folder):
    """Split each language body into N chunks; returns ({lang: chunks}, N)."""
    counts = {lang: bodies[lang].count("\n") for lang in bodies}
    L_unit = max(counts.values())
    N = 1 if L_unit <= 120 else -(-L_unit // 100)
    for _attempt in range(10):
        results = {}
        shortfall = None
        for lang in bodies:
            chunks, placed = split_language(bodies[lang], lines_by_lang[lang], N)
            if chunks is None:
                shortfall = placed if shortfall is None else min(shortfall, placed)
                break
            if "".join(chunks) != bodies[lang]:
                fatal("%s/%s: body chunk reassembly mismatch" % (folder, lang))
            results[lang] = chunks
        if shortfall is None:
            return results, N
        N = 1 + shortfall
    fatal("could not converge on a split for unit %s" % folder)


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
    args = ap.parse_args()

    root = os.path.abspath(os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    outdir = os.path.join(root, "versions", "0.7", "content")
    if os.path.exists(outdir):
        fatal("output dir exists: %s -- refusing to touch it; delete it "
              "manually first if a from-scratch re-bootstrap is really needed"
              % outdir)
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
    parts_per_unit = {}
    for folder, info, ranges in units:
        unitdir = os.path.join(outdir, folder)
        os.makedirs(unitdir)
        kind, num, lvl = info if info else ("frontmatter", None, None)
        titles = {}
        seps = {}
        bodies = {}
        for lang in ("en", "ru", "zh"):
            S = st[lang]
            hidx, eidx = ranges[lang]
            bstart = S["offsets"][0] if hidx == 0 else S["offsets"][hidx + 1]
            body = S["data"][bstart:S["offsets"][eidx]].decode("utf-8")
            if not body.endswith("\n"):
                fatal("%s/%s: body does not end with newline" % (folder, lang))
            bodies[lang] = body
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

        chunks_by_lang, N = split_unit(
            bodies, {lang: bodies[lang].split("\n") for lang in bodies}, folder)
        parts_per_unit[folder] = N
        for k in range(1, N + 1):
            with open(os.path.join(unitdir, "body-%d.js" % k), "w",
                      encoding="utf-8", newline="\n") as f:
                f.write("export default {\n"
                        "  en: `%s`,\n"
                        "  ru: `%s`,\n"
                        "  zh: `%s`,\n"
                        "};\n"
                        % tuple(tl_escape(chunks_by_lang[l][k - 1])
                                for l in ("en", "ru", "zh")))
        files_written += N

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
        obj["bodyParts"] = N
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
    split_info = []
    total_parts = 0
    for folder, _, _ in units:
        n = parts_per_unit[folder]
        total_parts += n
        if n > 1:
            split_info.append("%s=%d" % (folder, n))
    for _, info, _ in units:
        k = info[0] if info else "frontmatter"
        counts[k] = counts.get(k, 0) + 1
    print("Units: %d total" % len(units))
    for k in ("frontmatter", "numbered", "named"):
        print("  %s: %d" % (k, counts.get(k, 0)))
    print("Body parts: %d total across %d units; %d unit(s) split "
          "(bodyParts>1): %s"
          % (total_parts, len(units), len(split_info), split_info))
    print("Files written: %d" % files_written)
    print("Manifest head: %s" % names[:3])
    print("Manifest tail: %s" % names[-3:])


LANG_NAMES = ("en", "ru", "zh")

if __name__ == "__main__":
    main()
