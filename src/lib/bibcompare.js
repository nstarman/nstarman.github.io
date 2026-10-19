// Compares our BibTeX entry for a paper with the archive's (ADS) export of it.
// Pure and offline; the archive's text is the snapshot in
// config/bibtex-reference.json, written by scripts/refresh-publications.mjs.

/** One entry: `{ type, key, fields }`, field names lower-cased. A value is
 *  brace- or quote-delimited (nesting kept, outer delimiters dropped) or bare. */
export function parseBibtex(text) {
  const head = /@(\w+)\s*\{\s*([^,\s]*)\s*,/.exec(text);
  if (!head) throw new Error('not a BibTeX entry');
  const fields = {};
  let i = head.index + head[0].length;
  const skip = () => { while (i < text.length && /[\s,]/.test(text[i])) i++; };
  for (skip(); i < text.length && text[i] !== '}'; skip()) {
    const eq = text.indexOf('=', i);
    const name = text.slice(i, eq).trim().toLowerCase();
    i = eq + 1;
    while (/\s/.test(text[i])) i++;
    let value;
    if (text[i] === '{' || text[i] === '"') {
      const open = text[i++];
      const start = i;
      for (let depth = 0; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}' && depth-- === 0 && open === '{') break;
        else if (text[i] === '"' && depth === 0 && open === '"') break;
      }
      value = text.slice(start, i++);
    } else {
      const start = i;
      while (i < text.length && !/[,}]/.test(text[i])) i++;
      value = text.slice(start, i).trim();
    }
    fields[name] = value;
  }
  return { type: head[1].toLowerCase(), key: head[2], fields };
}

const ACCENT = { "'": '́', '`': '̀', '"': '̈', '^': '̂', '~': '̃', '=': '̄', c: '̧', v: '̌' };

// ponytail: the AASTeX macros ADS emits for the journals we publish in; add one when a new journal appears.
const JOURNALS = {
  apj: 'The Astrophysical Journal', apjl: 'The Astrophysical Journal Letters',
  apjs: 'The Astrophysical Journal Supplement Series', aj: 'The Astronomical Journal',
  mnras: 'Monthly Notices of the Royal Astronomical Society', aap: 'Astronomy & Astrophysics',
  prd: 'Physical Review D', jcap: 'Journal of Cosmology and Astroparticle Physics',
  pasp: 'Publications of the Astronomical Society of the Pacific',
};

const norm = (v) => v
  .replace(/\\([`'"^~=])\s*\{?([A-Za-z])\}?/g, (_, a, c) => (c + ACCENT[a]).normalize('NFC'))
  .replace(/\\([cv])[ ]?\{?([A-Za-z])\}?/g, (_, a, c) => (c + ACCENT[a]).normalize('NFC'))
  .replace(/\\&/g, '&')
  .replace(/\{\\textendash\}|(?<!-)--(?!-)/g, '–')
  .replace(/\{\\textemdash\}|---/g, '—')
  .replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();

const initials = (given) => (given ?? '').split(/[\s.-]+/).filter(Boolean).map((p) => p[0]).join('');
const splitName = (n) => {
  const [family, ...rest] = n.split(',');
  return { family: family.trim(), initials: initials(rest.join(',')) };
};

function sameAuthors(a, b) {
  const x = a.split(' and '), y = b.split(' and ');
  for (let k = 0; k < Math.max(x.length, y.length); k++) {
    const p = x[k] && splitName(x[k]), q = y[k] && splitName(y[k]);
    if (!p || !q || p.family !== q.family || p.initials !== q.initials) return [x[k] ?? '', y[k] ?? ''];
  }
  return null;
}

const SKIP = ['abstract', 'note'];
const VENUE = ['journal', 'volume', 'number', 'pages'];

/** Fields in both entries that differ, as `{ field, ours, theirs }`; `[]` when
 *  they agree. The key, `abstract`, `note` and fields only one side has are
 *  ignored; a preprint's venue is too, since ADS records it as "arXiv e-prints". */
export function compareToArchive(ours, archive, { preprint }) {
  const o = parseBibtex(ours).fields, t = parseBibtex(archive).fields;
  const out = [];
  for (const field of Object.keys(o)) {
    if (!(field in t) || SKIP.includes(field) || (preprint && VENUE.includes(field))) continue;
    const macro = (v) => (field === 'journal' ? v.replace(/\\([a-z]+)\b/g, (m, k) => JOURNALS[k] ?? m) : v);
    let a = norm(macro(o[field])), b = norm(macro(t[field]));
    if (field === 'month') { a = a.toLowerCase(); b = b.toLowerCase(); }
    if (field === 'author') {
      const d = sameAuthors(a, b);
      if (d) out.push({ field, ours: d[0], theirs: d[1] });
    } else if (a !== b) out.push({ field, ours: a, theirs: b });
  }
  return out;
}
