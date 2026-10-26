// Turns resolved preset sections into a flat render model.
//
// Deliberately does all the knowing-about-data work here, in JS, so cv.typ is
// pure typography. Typst can destructure JSON, but every conditional expressed
// there is a conditional that the website and the PDF could disagree about.
// One model, two renderers.

import person from '/config/person.json';
import { resolve } from './presets.js';
import { asIdentifiers } from './refids.js';
import { authors, venueLine, dateLabel, links, money, softwarePapers, linkIcon, institutionGroups, groupedByDefault, groupDate, groupTitle } from './data.js';
import { spans, detailLines, achievementLines } from '@nstarkman/data-resolver/inline.js';

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
/**
 * The institution as an entry's name level asks: 0, the record's own;
 * 1 and 2 the first and the last of its `institutionNames`, longest first — a
 * record with fewer takes the last it has, one with none its own.
 */
function institutionOf(item, names = 0) {
  const alt = item.institutionNames;
  return names > 0 && alt?.length ? alt[Math.min(names, alt.length) - 1] : item.institution;
}

function subject(item, names = 0, funder = true) {
  const plain = (t) => (t ? [{ t, b: false }] : []);

  switch (item.type) {
    case 'publication':
      return [];
    case 'presentation':
      return plain(item.event ?? '');
    case 'mentoring': {
      const who = item.student === item.title ? null : item.student;
      return plain([who, item.institution && `(${institutionOf(item, names)})`].filter(Boolean).join(' '));
    }
    // location belongs in the right-hand column; repeating it here printed it twice
    case 'education':
    case 'position':
      return plain([item.role, institutionOf(item, names)].filter(Boolean).join(', '));
    // A team grant says what my part was — "Co-Investigator, STScI".
    case 'grant':
      return plain([item.role, funder && item.funder].filter(Boolean).join(', '));
    default:
      return plain(item.institution ? institutionOf(item, names) : item.organization ?? item.outlet ?? (funder && item.funder) ?? '');
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

function trailing(item, s, currency) {
  // A declined grant still says what it was worth: the amount, then "(declined)".
  if (item.declined) {
    return item.amount && item.type !== 'award' ? `${money(item.amount, currency)} (declined)` : 'declined';
  }
  if (item.kind === 'accepted') return 'not attended';
  if (item.amount && item.type !== 'award') {
    return money(item.amount, currency);
  }
  return s.location === false ? '' : item.location ?? '';
}

/** One item as a row of the model. */
export function rowOf(item, cv, s, keepLine, names = 0, currency, funder = true, ids = false) {
  const detail = detailLines(item, { complete: cv.includeAll, currency });
  return {
    id: item.id,
    // The PDF spells the month where a record has one; ranges stay years.
    when: dateLabel(item, { month: true }),
    title: item.title,
    subject: subject(item, names, funder),
    byline: item.type === 'publication' ? byline(item) : [],
    venue: item.type === 'publication' ? venueLine(item) : null,
    // The grid layout has no room for `details`, and shows this instead.
    summary: item.summary ?? null,
    // `details` is the field the short presets drop — the whole point of the
    // summary/details split, and what make_short.py could not express.
    // Span arrays, not strings: `details` may be several lines and may carry
    // inline links, and Typst would print the markup verbatim otherwise.
    // A mentee's papers may be cited by identifier (`ids`) instead of in words.
    lines: [...detail.filter((_, i) => keepLine ? keepLine(item.id, i) : s.detail === 'full')
              .map((l) => (ids && item.type === 'mentoring' ? asIdentifiers(l) : l)),
            // Marked achievements follow every detail line, and have their own gate.
            ...achievementLines(item, cv.name, { complete: cv.includeAll })
              .filter((_, i) => !keepLine || keepLine(item.id, detail.length + i))],
    trailing: trailing(item, s, currency),
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
        icon: linkIcon(item, l),
      }));
      const papers = item.type === 'software' ? papersOf(item) : [];
      // Second, so the grid still titles the package with its repository
      // and the papers lead the trail.
      return papers.length ? [own[0], ...papers, ...own.slice(1)].filter(Boolean) : own;
    })(),
  };
}

/**
 * A section's rows. Roles at one institution that are grouped — by their
 * `groupRoles`, or as the builder chose — when the section `cluster`s by
 * institution print as one
 * row — the roles joined in the title, the dates spanning them, every role's
 * lines beneath.
 */
function itemsOf(s, cv, keepLine, group, namesFor, currency, funderOff, paperIds, schoolBelow, linkOnDegree, placeBelow, titlePlaceOff) {
  const levelOf = (item) => namesFor[item.id] ?? 0;
  // An education entry may have its institution on its own line, below the degree.
  const row = (item) => {
    const r = rowOf(item, cv, s, keepLine, levelOf(item), currency, !funderOff.has(item.id), paperIds);
    // A place in the right-hand column moves under the title; an amount, "declined" or "not
    // attended" is not the place and stays.
    const moved = placeBelow && item.location && r.trailing === item.location;
    // A title that ends in its place, without it unless the section keeps it.
    const ending = item.titlePlace && ` (${item.titlePlace})`;
    const bare = titlePlaceOff && ending && item.title.endsWith(ending) && item.title.slice(0, -ending.length);
    return {
      ...r,
      ...(bare && { title: bare }),
      ...(moved && { trailing: '', placeBelow: item.location }),
      ...(schoolBelow && item.type === 'education' && { below: true, ...(linkOnDegree && { linkOnDegree: true }) }),
    };
  };
  if (s.cluster !== 'institution') return s.items.map(row);
  const grouped = (items) => group[items[0].institution] ?? groupedByDefault(items);
  return institutionGroups(s.items, grouped).flatMap((g) => {
    if (g.item) return [row(g.item)];
    const rows = g.items.map(row);
    const [first] = g.items;
    const home = links(first).find((l) => l.rel === 'homepage');
    return [{
      ...rows[0],
      id: `group:${first.institution}`,
      when: dateLabel({ date: groupDate(g.items) }, { month: true }),
      title: groupTitle(g.items),
      subject: subject(first, levelOf(first)) ? [{ t: institutionOf(first, levelOf(first)), b: false }] : [],
      lines: rows.flatMap((r) => r.lines),
      trailing: s.location === false ? '' : first.location ?? '',
      links: home ? [{ rel: home.rel, url: home.url, label: home.label ?? home.rel,
                       icon: linkIcon(first, home) }] : [],
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
 * @param {{ prefix?: Record<string, string>, group?: Record<string, boolean>, namesFor?: Record<string, number>, currency?: 'us' | 'dollar', funderOff?: string[], paperIds?: boolean, schoolBelow?: boolean, linkOnDegree?: boolean, locationBelow?: Record<string, boolean>, titlePlace?: Record<string, boolean> }} [opts]
 *   passed to resolve(); `namesFor` is each entry's institution-name level, by
 *   id (see `institutionOf`); `currency` how amounts are written (see `money`); `paperIds` cites a mentee's papers by identifier; `schoolBelow` puts an education
 *   entry's institution on its own line; `linkOnDegree` ends the degree line with its link icon
 *   (with `schoolBelow`); `locationBelow` the sections whose entries print their
 *   place on a line below the title, not in the right-hand column; `titlePlace` the sections
 *   (`true`) whose entries keep the place their title ends with, which is otherwise left out; `funderOff` the ids whose
 *   `funder` does not print — the builder's list, else the preset's;
 *   `group` is the builder's choice, by institution, of
 *   whether its roles print as one row — absent, the records' `groupRoles` say
 */
export function cvModel(presetName, only, keepLine, opts) {
  const cv = resolve(presetName, only, opts);
  const group = opts?.group ?? {};
  // The institution-name level of each entry, by id: 0 full (the default), 1
  // shorter, 2 shortest.
  const namesFor = opts?.namesFor ?? {};

  return {
    preset: cv.name,
    label: cv.label,
    detail: cv.detail,
    card: cv.card,
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
      tally: s.tally ?? null,
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
      items: itemsOf(s, cv, keepLine, group, namesFor, opts?.currency, new Set(opts?.funderOff ?? cv.funderOff), Boolean(opts?.paperIds), Boolean(opts?.schoolBelow), Boolean(opts?.linkOnDegree), opts?.locationBelow?.[s.id] === true, opts?.titlePlace?.[s.id] !== true),
    })),
  };
}
