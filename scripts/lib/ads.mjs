// Pure parts of scripts/refresh-publications.mjs, split out so vitest can run
// them without the network.

/** Publisher abstracts arrive with JATS, HTML or stray markup in them. Maths
 *  ($…$) is left alone: the site and BibTeX both expect it. */
export function cleanAbstract(text) {
  return text
    .replace(/<jats:title>.*?<\/jats:title>/gis, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&') // last, so "&amp;lt;" becomes "&lt;" and is not unescaped twice
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .trim();
}

/** A stub reads as complete, so it is worse than no abstract. */
export const usable = (s) => !!s && s.length > 120;

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The ADS query for a publication: the strongest identifier it has. */
export function adsQuery({ bibcode, doi, arxiv }) {
  if (bibcode) return `bibcode:"${bibcode}"`;
  if (doi) return `doi:"${doi}"`;
  if (arxiv) return `identifier:"arXiv:${arxiv.replace(/v\d+$/, '')}"`;
  return null;
}

/** An arXiv-only bibcode (2024arXiv240101234S) is superseded once the paper is
 *  published, so a journal bibcode replaces it; one journal bibcode never
 *  replaces another, since a published paper's does not change. */
export const isPreprintBibcode = (b) => /^\d{4}arXiv/.test(b ?? '');

/** The fields of `item` that ADS's `doc` fills or corrects: a missing abstract,
 *  bibcode or DOI, a preprint bibcode now superseded, and the citation count.
 *  An existing abstract is never replaced. */
export function changes(item, doc) {
  const out = {};
  if (!item.abstract && doc.abstract) {
    const a = cleanAbstract(doc.abstract);
    if (usable(a)) out.abstract = a;
  }
  const b = doc.bibcode;
  if (b && b !== item.bibcode && (!item.bibcode || (isPreprintBibcode(item.bibcode) && !isPreprintBibcode(b)))) {
    out.bibcode = b;
  }
  const doi = doc.doi?.find((d) => !d.startsWith("10.48550/")); // arXiv's own DOI is not the paper's
  if (!item.doi && doi && /^10\.\d{4,9}\/\S+$/.test(doi)) out.doi = doi;
  const n = doc.citation_count;
  if (Number.isInteger(n) && n >= 0 && n !== item.citations) out.citations = n;
  return out;
}

/** Fallback when ADS has no abstract: arXiv's own, then Crossref's. */
export function arxivAbstract(xml) {
  const m = /<summary>(.*?)<\/summary>/s.exec(xml);
  return m ? cleanAbstract(m[1]) : null;
}

export function crossrefAbstract(json) {
  return json?.message?.abstract ? cleanAbstract(json.message.abstract) : null;
}

/** arXiv title search, last resort: only an entry whose title matches exactly,
 *  because a different paper's abstract is worse than none. */
export function arxivByTitle(xml, title) {
  for (const [, entry] of xml.matchAll(/<entry>(.*?)<\/entry>/gs)) {
    const t = /<title>(.*?)<\/title>/s.exec(entry)?.[1];
    if (t && norm(cleanAbstract(t)) === norm(title)) return arxivAbstract(entry);
  }
  return null;
}
