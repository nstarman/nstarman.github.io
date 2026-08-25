#!/usr/bin/env python3
"""Fill in `abstract` on publications that are missing one.

ADS refuses unauthenticated fetches, so this goes to the sources ADS itself
indexes: the arXiv API where an item has an `arxiv` id, Crossref where it has a
`doi`. Both return the publisher's own text, so nothing here is paraphrased.

Only writes items that currently have no abstract, and only when a source
actually returns one — a paper with no retrievable abstract is left alone and
reported, rather than filled with something approximate.

    python3 scripts/fetch_abstracts.py           # dry run
    python3 scripts/fetch_abstracts.py --write
"""

from __future__ import annotations

import html
import json
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
UA = "nstarkman.space abstract import (mailto:starkman@mit.edu)"


def get(url: str, ua: bool = False) -> str:
    cmd = ["curl", "-sfL", "--max-time", "40"]
    if ua:
        cmd += ["-H", f"User-Agent: {UA}"]
    r = subprocess.run(cmd + [url], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else ""


def clean(text: str) -> str:
    """Publisher abstracts arrive with JATS or LaTeX markup in them."""
    text = re.sub(r"<jats:title>.*?</jats:title>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\$([^$]*)\$", r"\1", text)          # inline maths delimiters
    text = re.sub(r"\\[a-zA-Z]+\{([^}]*)\}", r"\1", text)
    text = re.sub(r"\\[a-zA-Z]+", "", text)
    text = text.replace("{", "").replace("}", "")
    text = unicodedata.normalize("NFC", " ".join(text.split()))
    return text.strip()


def from_arxiv(arxiv_id: str) -> str | None:
    xml = get(f"https://export.arxiv.org/api/query?id_list={arxiv_id}")
    m = re.search(r"<summary>(.*?)</summary>", xml, re.S)
    return clean(m.group(1)) if m else None


def from_crossref(doi: str) -> str | None:
    raw = get(f"https://api.crossref.org/works/{doi}", ua=True)
    if not raw:
        return None
    try:
        msg = json.loads(raw)["message"]
    except Exception:
        return None
    return clean(msg["abstract"]) if msg.get("abstract") else None


def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def from_arxiv_title(title: str) -> str | None:
    """Last resort for papers whose publisher deposits no abstract. Guarded by a
    title comparison — a search that returns a different paper is worse than no
    abstract at all."""
    q = re.sub(r"[^A-Za-z0-9 ]+", " ", title)
    q = "+AND+".join(f"ti:%22{w}%22" for w in [q]) .replace(" ", "+")
    xml = get(f"https://export.arxiv.org/api/query?search_query={q}&max_results=3")
    for entry in re.findall(r"<entry>(.*?)</entry>", xml, re.S):
        got = re.search(r"<title>(.*?)</title>", entry, re.S)
        summ = re.search(r"<summary>(.*?)</summary>", entry, re.S)
        if not got or not summ:
            continue
        if _norm(clean(got.group(1))) == _norm(title):
            return clean(summ.group(1))
    return None


def main() -> int:
    write = "--write" in sys.argv
    filled, missing = [], []

    for path in sorted(DATA.glob("*.json")):
        item = json.loads(path.read_text(encoding="utf-8"))
        if item.get("type") != "publication" or item.get("abstract"):
            continue

        text = None
        source = None
        if item.get("arxiv"):
            text, source = from_arxiv(item["arxiv"]), f"arXiv:{item['arxiv']}"
            time.sleep(3)  # arXiv asks for one request every few seconds
        if not text and item.get("doi"):
            text, source = from_crossref(item["doi"]), f"doi:{item['doi']}"
        if not text:
            text, source = from_arxiv_title(item["title"]), "arXiv title search"
            time.sleep(3)

        # A stub is worse than nothing; it would read as complete.
        if text and len(text) > 120:
            item["abstract"] = text
            if write:
                path.write_text(json.dumps(item, indent=2, ensure_ascii=False) + "\n",
                                encoding="utf-8")
            filled.append((item["id"], source, len(text)))
        else:
            missing.append((item["id"], item.get("arxiv") or item.get("doi") or "no identifier"))

    for pid, source, n in filled:
        print(f"  ok       {pid:<32} {n:>5} chars  from {source}")
    for pid, why in missing:
        print(f"  none     {pid:<32} ({why})")
    print(f"\n  {len(filled)} filled, {len(missing)} left without one"
          f"{'' if write else '  — dry run, pass --write'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
