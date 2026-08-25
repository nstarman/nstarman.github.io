#!/usr/bin/env python3
"""One-off importer: starkman_long_cv.tex -> data/*.json.

Two hundred entries is too many to retype accurately, and the CV's table rows
are regular enough to parse: a row opens with a date in the first cell, the
second cell holds the bold title and any links, an optional third holds a place
or an amount, and following lines beginning with `&` are the detail that became
the `long` field.

This is deliberately a one-shot tool, not a maintained pipeline — after the
import the JSON is the source of truth and the .tex is retired. It prints what
it could not confidently parse rather than guessing.

    python3 scripts/import_cv_tex.py <path-to-starkman_long_cv.tex> [--write]
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# subsection (or section) title -> the item it produces
SECTION_MAP = {
    "Education":                         dict(type="education"),
    "Major Fellowships & Awards":        dict(type="award", tier="major"),
    "Major Grants":                      dict(type="grant", tier="major"),
    "Professional Positions":            dict(type="position"),
    "Invited Talks/Discussions":         dict(type="presentation", kind="invited"),
    "Selected Presentations":            dict(type="presentation", kind="contributed"),
    "Student Mentoring":                 dict(type="mentoring"),
    "Teaching Assistantship (TA)":       dict(type="teaching"),
    "Conferences & Workshops Organized": dict(type="presentation", kind="organizer"),
    "Conferences & Workshops":           dict(type="presentation", kind="attended"),
    "Organizations":                     dict(type="service"),
    "Other Outreach":                    dict(type="outreach"),
    "Small Grants":                      dict(type="grant", tier="minor"),
    "MEDIA":                             dict(type="media"),
}

MONTHS = {m: f"{i:02d}" for i, m in enumerate(
    "january february march april may june july august september october "
    "november december".split(), 1)}
MONTHS |= {m[:3]: v for m, v in MONTHS.items()}


def strip_comments(tex: str) -> str:
    tex = "\n".join(re.sub(r"(?<!\\)%.*$", "", ln) for ln in tex.splitlines())
    # \label{...} trails some \section lines and would defeat the end anchor
    return re.sub(r"\\label\{[^}]*\}", "", tex)


def detex(s: str) -> str:
    """Plain text from a LaTeX fragment, keeping the URLs separately."""
    s = s.replace("\\\\", " ")  # row separators, or they land in the text
    s = re.sub(r"\\href\{[^}]*\}\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\grayhref\{[^}]*\}\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\hyperref\[[^]]*\]\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\(textbf|textit|emph|small|texttt|rm|textsc)\{", "{", s)
    s = re.sub(r"\\faIcon\{[^}]*\}|\\aiicon\{[^}]*\}", "", s)
    s = re.sub(r"\\(vspace|hspace)\{[^}]*\}", "", s)
    s = re.sub(r"\\(newline|hfill|linebreak|,|!|;|:|\s)", " ", s)
    s = s.replace("\\&", "&").replace("\\$", "$").replace("\\%", "%").replace("\\#", "#")
    s = s.replace("``", "\u201c").replace("''", "\u201d")
    s = re.sub(r"[{}]", "", s)
    s = re.sub(r"\\[a-zA-Z]+", "", s)
    return unicodedata.normalize("NFC", " ".join(s.split())).strip(" .,")


def urls(s: str) -> list[str]:
    found = re.findall(r"\\(?:gray)?href\{(https?://[^}]*)\}", s)
    # LaTeX escapes % as \% inside \href; left in, the URL is not a valid uri
    return [u.replace("\\%", "%").replace("\\&", "&").replace("\\#", "#") for u in found]


def parse_date(cell: str) -> dict | None:
    t = detex(cell)
    if not t:
        return None
    rng = re.match(r"^(\d{4})\s*[-–]\s*(\d{4})$", t)
    if rng:
        return {"start": rng.group(1), "end": rng.group(2)}
    if re.match(r"^\d{4}\s*[-–]\s*$", t):
        return {"start": t[:4], "present": True}
    md = re.match(r"^([A-Za-z]+)\.?\s+(\d{4})$", t)
    if md and md.group(1).lower() in MONTHS:
        return {"start": f"{md.group(2)}-{MONTHS[md.group(1).lower()]}"}
    if re.match(r"^\d{4}$", t):
        return {"start": t}
    return None


def parse_amount(cell: str) -> dict | None:
    t = detex(cell)
    # "CAD 23-32,000" is a range whose lower bound omits its thousands, so a
    # plain [\d,]+ match stops at the hyphen and yields 23.
    m = re.match(r"^(USD|CAD|EUR|GBP)\s*\$?\s*([\d,]+)(?:\s*[-\u2013]\s*([\d,]+))?", t)
    if not m:
        return None
    num = lambda x: int(x.replace(",", ""))
    lo, hi = num(m.group(2)), num(m.group(3)) if m.group(3) else None
    if hi is not None and lo < hi:
        # scale the abbreviated lower bound: 23 against 32,000 means 23,000
        while lo * 10 <= hi:
            lo *= 10
        return {"currency": m.group(1), "value": lo, "valueMax": hi}
    return {"currency": m.group(1), "value": lo}


def split_row(line: str) -> list[str]:
    return re.split(r"(?<!\\)&", line)


def blocks(tex: str):
    """Yield (heading, body) for each mapped section or subsection."""
    pat = re.compile(r"\\(?:sub)?section\*?(?:\[[^]]*\])?\{(.+)\}\s*$", re.M)
    marks = [(m.start(), detex(m.group(1))) for m in pat.finditer(tex)]
    for i, (pos, name) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(tex)
        for key in SECTION_MAP:
            if name.replace("\u2019", "'") == key:
                yield key, tex[pos:end]
                break


def entries(body: str):
    """Split a table body into entries: a new one starts on a row whose first
    cell is non-empty."""
    cur = None
    for raw in body.splitlines():
        line = raw.strip()
        if not line or line.startswith("\\begin") or line.startswith("\\end"):
            continue
        if line.startswith("\\section") or line.startswith("\\subsection"):
            continue
        cells = split_row(line)
        head = detex(cells[0]) if cells else ""
        if len(cells) > 1 and head and parse_date(cells[0]):
            if cur:
                yield cur
            cur = {"date_cell": cells[0], "cells": cells[1:], "detail": [], "raw": [line]}
        elif cur is not None:
            cur["raw"].append(line)
            text = detex(line.lstrip("&"))
            if text:
                cur["detail"].append(text)
    if cur:
        yield cur


def slug(text: str, used: set[str]) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60].strip("-")
    s = s or "item"
    base, n = s, 2
    while s in used:
        s, n = f"{base}-{n}", n + 1
    used.add(s)
    return s


def main() -> int:
    src = Path(sys.argv[1])
    tex = strip_comments(src.read_text(encoding="utf-8"))
    write = "--write" in sys.argv

    existing = {p.stem for p in (ROOT / "data").glob("*.json")}
    used, out, skipped = set(existing), [], []

    for heading, body in blocks(tex):
        spec = SECTION_MAP[heading]
        for e in entries(body):
            date = parse_date(e["date_cell"])
            title_cell = e["cells"][0]
            title = detex(title_cell)
            if not title:
                skipped.append((heading, " ".join(e["raw"])[:90]))
                continue

            item = {"$schema": "../schema/item.schema.json",
                    "id": slug(title, used), "type": spec["type"], "cvs": ["np"],
                    "date": date, "title": title}
            for k in ("tier", "kind"):
                if k in spec:
                    item[k] = spec[k]

            right = e["cells"][1] if len(e["cells"]) > 1 else ""
            amount = parse_amount(right)
            if amount:
                item["amount"] = amount
            elif detex(right):
                # `teaching` has no location in the schema; the cell names the
                # institution there.
                key = "institution" if spec["type"] == "teaching" else "location"
                item[key] = detex(right)

            detail = [d for d in e["detail"] if d]
            if detail:
                item["details"] = " ".join(detail)

            # \hfill puts the figure on a continuation line rather than in a cell
            if spec["type"] in ("award", "grant") and "amount" not in item:
                for blob in (title, item.get("details", "")):
                    found = parse_amount(re.sub(r"^.*?((USD|CAD|EUR|GBP)\s)", r"\1", blob))
                    if found:
                        item["amount"] = found
                        break
                item["title"] = re.sub(r"\s*(USD|CAD|EUR|GBP)\s*\$?\s*[\d,\-]+.*$", "", item["title"]).strip()
            if "Declined" in (item.get("details") or ""):
                item["declined"] = True

            # Required per-type fields the table layout implies rather than states:
            # in each of these sections the bold cell *is* the required value.
            if spec["type"] == "mentoring":
                item["student"] = title
            elif spec["type"] == "media":
                item["outlet"] = title
            elif spec["type"] in ("position", "education"):
                item["institution"] = title

            links = urls(" ".join(e["raw"]))
            if links:
                rel = "event" if spec["type"] == "presentation" else "homepage"
                item["links"] = [{"rel": rel, "url": u} for u in dict.fromkeys(links)]

            out.append((heading, item))

    by_heading: dict[str, int] = {}
    for heading, _ in out:
        by_heading[heading] = by_heading.get(heading, 0) + 1
    for h, n in by_heading.items():
        print(f"  {n:>3}  {h}")
    print(f"\n  {len(out)} entries parsed, {len(skipped)} skipped")
    for h, r in skipped[:10]:
        print(f"    skipped [{h}]: {r}")

    if write:
        for _, item in out:
            (ROOT / "data" / f"{item['id']}.json").write_text(
                json.dumps(item, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\n  wrote {len(out)} files")
    else:
        print("\n  dry run — pass --write to emit files")
        for _, item in out[:3]:
            print("\n" + json.dumps(item, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
