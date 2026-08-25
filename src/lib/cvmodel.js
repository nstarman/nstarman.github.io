// Turns resolved preset sections into a flat render model.
//
// Deliberately does all the knowing-about-data work here, in JS, so cv.typ is
// pure typography. Typst can destructure JSON, but every conditional expressed
// there is a conditional that the website and the PDF could disagree about.
// One model, two renderers.

import person from '/config/person.json';
import { resolve } from './presets.js';
import { authors, venueLine, dateLabel, links, resolve as item0, REL_ICON, relKey } from './data.js';
import { spans, detailLines } from './inline.js';

/**
 * Order the groups the way a CV reads them, newest state first, and drop any
 * the preset happens not to contain.
 */
const GROUP_ORDER = {
  status: [
    ['in-prep', 'In Preparation'],
    ['submitted', 'Submitted'],
    ['accepted', 'Accepted'],
    ['published', 'Published'],
  ],
};

function groupsOf(items, field) {
  const order = GROUP_ORDER[field];
  if (!order) throw new Error(`No group order defined for "${field}".`);
  return order
    .map(([value, label]) => ({ label, items: items.filter((i) => i[field] === value) }))
    .filter((g) => g.items.length > 0);
}

const money = (a) => {
  if (!a) return null;
  const n = (v) => v.toLocaleString('en-US');
  const span = a.valueMax ? `${n(a.value)}\u2013${n(a.valueMax)}` : n(a.value);
  return `${a.currency} ${span}${a.perAnnum ? ' p.a.' : ''}`;
};

/**
 * The line under the title, as bold/plain spans. Spans rather than a marked-up
 * string because Typst prints a literal "*" — emphasis has to be structure, not
 * syntax, if the same model is to feed both HTML and PDF.
 */
function subject(item) {
  const plain = (t) => (t ? [{ t, b: false }] : []);

  switch (item.type) {
    case 'publication':
      return [];
    case 'presentation':
      return plain(item.event ?? '');
    case 'mentoring': {
      const who = item.student === item.title ? null : item.student;
      return plain([who, item.institution && `(${item.institution})`].filter(Boolean).join(' '));
    }
    // location belongs in the right-hand column; repeating it here printed it twice
    case 'education':
    case 'position':
      return plain([item.role, item.institution].filter(Boolean).join(', '));
    default:
      return plain(item.institution ?? item.organization ?? item.outlet ?? item.funder ?? '');
  }
}

/**
 * The right-hand column: a money figure, or a place.
 *
 * Awards keep their figure in the record but do not print it — a fellowship is
 * not usefully described by its stipend, and a grant is.
 */
/**
 * A package's paper, where the record points at one. `unxt` refs `unxt-joss`
 * and `astropy` refs the v5 paper, but the software entry carried only its own
 * code and docs links — so a published package looked unpublished.
 */
const CITE = ['paper', 'preprint', 'doi'];
function paperOf(sw) {
  for (const id of sw.refs ?? []) {
    const ref = item0(id);
    if (ref?.type !== 'publication') continue;
    const cite = links(ref).find((l) => CITE.includes(l.rel));
    if (cite) return { rel: 'paper', url: cite.url, label: 'paper', icon: 'paper' };
  }
  return null;
}

/** The byline, with the CV's owner bold. */
function byline(item) {
  const { shown, etal, collaboration } = authors(item, 6);
  const out = [];
  if (collaboration) out.push({ t: `${collaboration}, `, b: false });
  shown.forEach((a, i) => {
    if (i > 0) out.push({ t: ', ', b: false });
    out.push({ t: a.name, b: Boolean(a.me) });
  });
  if (etal) out.push({ t: ', et al', b: false });
  return out;
}

function trailing(item) {
  if (item.declined) return 'declined';
  if (item.amount && item.type !== 'award') {
    return money(item.amount);
  }
  return item.location ?? '';
}

/**
 * @param {string} presetName
 * @param {Set<string>} [only]     ids to keep, for the builder's tick-boxes
 * @param {(id: string, line: number) => boolean} [keepLine]
 *   Which of an entry's elaboration lines to keep. The difference between the
 *   normal CV and the two-page one is not only which entries appear but how much
 *   each one says, and that is a per-line question: an education entry can want
 *   its thesis and not its fellowships.
 */
export function cvModel(presetName, only, keepLine) {
  const cv = resolve(presetName, only);

  return {
    preset: cv.name,
    label: cv.label,
    detail: cv.detail,
    person,
    sections: cv.sections.map((s) => ({
      id: s.id,
      heading: s.heading,
      icon: s.icon,
      layout: s.layout,
      detail: s.detail,
      dropped: s.dropped,
      // Which subsections to draw, and in what order. `groupBy` has been sitting
      // in presets.json unread — the publications list is meant to break into
      // Submitted / Accepted / Published, as the LaTeX CV does.
      groups: s.groupBy ? groupsOf(s.items, s.groupBy).map((g) => ({
        label: g.label,
        ids: g.items.map((i) => i.id),
      })) : [],
      // A list section's entries are prose, not records — spans so a link in
      // one survives into the PDF.
      entries: (s.entries ?? []).map((e) => spans(e)),
      items: s.items.map((item) => ({
        id: item.id,
        // The PDF spells the month where a record has one; ranges stay years.
        when: dateLabel(item, { month: true }),
        title: item.title,
        subject: subject(item),
        byline: item.type === 'publication' ? byline(item) : [],
        venue: item.type === 'publication' ? venueLine(item) : null,
        // The grid layout has no room for `details`, and shows this instead.
        summary: item.summary ?? null,
        // `details` is the field the short presets drop — the whole point of the
        // summary/details split, and what make_short.py could not express.
        // Span arrays, not strings: `details` may be several lines and may carry
        // inline links, and Typst would print the markup verbatim otherwise.
        lines: detailLines(item).filter((_, i) =>
          keepLine ? keepLine(item.id, i) : s.detail === 'full'),
        trailing: trailing(item),
        recipient: item.recipient ?? null,
        status: item.status && item.status !== 'published' ? item.status : null,
        // Drawn as glyphs rather than the words "code" and "docs", so they cost
        // a few points at the end of a line instead of a line of their own —
        // which is why the short presets can carry them again.
        links: (() => {
          const own = links(item).map((l) => ({
            rel: l.rel,
            url: l.url,
            label: l.label ?? l.rel,
            icon: REL_ICON[relKey(l)] ?? 'link',
          }));
          const paper = item.type === 'software' ? paperOf(item) : null;
          // Second, so the grid still titles the package with its repository
          // and the paper leads the trail.
          return paper ? [own[0], paper, ...own.slice(1)].filter(Boolean) : own;
        })(),
      })),
    })),
  };
}
