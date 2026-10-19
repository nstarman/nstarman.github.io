// Mentees: the mentoring items that are a person, with a profile at /people/<slug>/.
//
// A mentee's papers and software are not listed on their record; they are found
// from the other side, by the `mentee` id on a paper's author. The logic lives in
// pure functions over arrays so the tests need no data; the wrappers at the
// bottom hand them the database.

import { byType, resolve, titleOf } from './data.js';
import { siteHref } from './cards.js';
import { spans } from './inline.js';

// Partial dates compare correctly as strings: "2026-04" > "2026" > "2025-07",
// so the more precise date of two sharing a prefix sorts first, newest first.
const newestFirst = (key) => (a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0);
const byStart = newestFirst((i) => i.date?.start ?? '');

export const menteeName = (m) => `${m.person.given} ${m.person.family}`;
export const profileHref = (m) => `/people/${m.slug}/`;

/** The mentoring items that have a `person`, newest first. */
export const pickMentees = (all) => all.filter((i) => i.type === 'mentoring' && i.person).sort(byStart);

/** Publications with an author who is this mentee, newest first. */
export const papersOf = (m, pubs) =>
  pubs.filter((p) => p.authors?.some((a) => a.mentee === m.id)).sort(byStart);

/** Software from the refs of the mentee's papers, then software they wrote
 *  themselves, each once, in first-seen order. */
export function softwareOf(m, papers, software, lookup) {
  const fromRefs = papers.flatMap((p) => (p.refs ?? []).map(lookup)).filter((i) => i?.type === 'software');
  const authored = software.filter((s) => s.authors?.some((a) => a.mentee === m.id));
  return [...new Set([...fromRefs, ...authored])];
}

export const sortAchievements = (list) => [...(list ?? [])].sort(newestFirst((a) => a.date));

/** Awards first, then the rest, each newest first, cut to `n`. */
export function pickTop(list, n = 3) {
  const sorted = sortAchievements(list);
  const isAward = (a) => a.kind === 'award';
  return [...sorted.filter(isAward), ...sorted.filter((a) => !isAward(a))].slice(0, n);
}

export const achievements = (m) => sortAchievements(m.achievements);
export const topAchievements = (m, n = 3) => pickTop(m.achievements, n);

export const mentees = () => pickMentees(byType('mentoring'));
export const menteeById = (id) => mentees().find((m) => m.id === id);
export const menteeBySlug = (slug) => mentees().find((m) => m.slug === slug);
export const menteePapers = (m) => papersOf(m, byType('publication'));
export const menteeSoftware = (m) => softwareOf(m, menteePapers(m), byType('software'), resolve);

/** `research` as spans with a link each: a `[](item:id)` is named by the item's
 *  nickTitle and points at its place on this site, as /research/'s introductions
 *  name theirs. An id naming no item throws, so a typo fails the build. */
export const researchSpans = (text, lookup = resolve) =>
  spans(text).map((s) => {
    if (!s.item) return s;
    const p = lookup(s.item);
    if (!p) throw new Error(`research: [](item:${s.item}) names no item`);
    return { ...s, t: s.t || titleOf(p, 'nick'), url: siteHref(p) };
  });
