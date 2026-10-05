// Turns resolved preset sections into a flat render model.
//
// Deliberately does all the knowing-about-data work here, in JS, so cv.typ is
// pure typography. Typst can destructure JSON, but every conditional expressed
// there is a conditional that the website and the PDF could disagree about.
// One model, two renderers.

import person from '/config/person.json';
import { resolve } from './presets.js';
import { authors, venueLine, dateLabel, links, money, softwarePapers, REL_ICON, relKey, institutionGroups, groupDate } from './data.js';
import { spans, detailLines } from './inline.js';

/**
 * The groups a section can break into, in the order a CV reads them: newest
 * state first, dropping any the preset happens not to contain. `status` is the
 * only `groupBy` the presets use; anything else in config/presets.json is a
 * typo, and says so rather than silently grouping by status.
 */
const STATUS_GROUPS = [
  ['in-prep', 'In Preparation'],
  ['submitted', 'Submitted'],
  ['accepted', 'Accepted'],
  ['published', 'Published'],
];

function groupsOf(items, field) {
  if (field !== 'status') throw new Error(`Only groupBy "status" is supported, not "${field}".`);
  return STATUS_GROUPS
    .map(([value, label]) => ({ label, items: items.filter((i) => i.status === value) }))
    .filter((g) => g.items.length > 0);
}

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
/** One definition, in lib/data.js, so the PDF and the website cannot disagree
 *  about which packages have a paper. The template wants an `icon`. */
const papersOf = (sw) => softwarePapers(sw).map((p) => ({ ...p, icon: 'paper' }));

/** The byline, with the CV's owner bold.
 *
 * Deliberately carries no ORCID link. The author model has one, but the PDF is
 * the only consumer of this byline and it stays unlinked — so the span never
 * gets a `url` key that cv.typ would have to decide what to do with. A student
 * of mine carries their level, which cv.typ colours.
 */
function byline(item) {
  const { shown, etal, collaboration } = authors(item, 6);
  const out = [];
  if (collaboration) out.push({ t: `${collaboration}, `, b: false });
  shown.forEach((a, i) => {
    if (i > 0) out.push({ t: ', ', b: false });
    out.push({ t: a.name, b: Boolean(a.me), student: a.student });
  });
  if (etal) out.push({ t: ', et al', b: false });
  return out;
}

function trailing(item) {
  if (item.declined) return 'declined';
  if (item.kind === 'accepted') return 'not attended';
  if (item.amount && item.type !== 'award') {
    return money(item.amount);
  }
  return item.location ?? '';
}

/** One item as a row of the model. */
function rowOf(item, cv, s, keepLine) {
  return {
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
    lines: detailLines(item, { complete: cv.includeAll }).filter((_, i) =>
      keepLine ? keepLine(item.id, i) : s.detail === 'full'),
    trailing: trailing(item),
    recipient: item.recipient ?? null,
    recipientInline: cv.recipientInline || (item.recipientInline ?? false),
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
      const papers = item.type === 'software' ? papersOf(item) : [];
      // Second, so the grid still titles the package with its repository
      // and the papers lead the trail.
      return papers.length ? [own[0], ...papers, ...own.slice(1)].filter(Boolean) : own;
    })(),
  };
}

/**
 * A section's rows. Roles at one institution print under it when the section
 * `cluster`s by institution and the builder has not asked for them apart: one
 * row — the roles joined in the title, the dates spanning them, every role's
 * lines beneath.
 */
function itemsOf(s, cv, keepLine, separate) {
  const row = (item) => rowOf(item, cv, s, keepLine);
  if (s.cluster !== 'institution' || separate[s.id]) return s.items.map(row);
  return institutionGroups(s.items).flatMap((g) => {
    if (g.item) return [row(g.item)];
    const rows = g.items.map(row);
    const [first] = g.items;
    const home = links(first).find((l) => l.rel === 'homepage');
    const names = rows.map((r) => r.title);
    return [{
      ...rows[0],
      id: `group:${first.institution}`,
      when: dateLabel({ date: groupDate(g.items) }, { month: true }),
      title: names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names.at(-1)}` : names[0],
      subject: subject(first) ? [{ t: first.institution, b: false }] : [],
      lines: rows.flatMap((r) => r.lines),
      trailing: first.location ?? '',
      links: home ? [{ rel: home.rel, url: home.url, label: home.label ?? home.rel,
                       icon: REL_ICON[relKey(home)] ?? 'link' }] : [],
    }];
  });
}

/**
 * @param {string} presetName
 * @param {Set<string>} [only]     ids to keep, for the builder's tick-boxes
 * @param {(id: string, line: number) => boolean} [keepLine]
 *   Which of an entry's elaboration lines to keep. The difference between the
 *   normal CV and the two-page one is not only which entries appear but how much
 *   each one says, and that is a per-line question: an education entry can want
 *   its thesis and not its fellowships.
 * @param {{ prefix?: Record<string, string>, separate?: Record<string, boolean> }} [opts]
 *   passed to resolve(); `separate` names the sections whose same-institution
 *   roles print as separate rows rather than under one heading
 */
export function cvModel(presetName, only, keepLine, opts) {
  const cv = resolve(presetName, only, opts);
  const separate = opts?.separate ?? {};

  return {
    preset: cv.name,
    label: cv.label,
    detail: cv.detail,
    place: cv.place,
    spacing: cv.spacing,
    person,
    sections: cv.sections.map((s) => ({
      id: s.id,
      heading: s.heading,
      icon: s.icon,
      layout: s.layout,
      columns: s.columns,
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
      items: itemsOf(s, cv, keepLine, separate),
    })),
  };
}
