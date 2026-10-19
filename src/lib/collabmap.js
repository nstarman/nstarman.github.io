// The collaborator map's render model.
//
// A pin is one post a collaborator held somewhere; a trajectory is the dotted
// line joining one person's pins in the order they held them. Each pin carries
// the papers we wrote while they were there, which is the part that makes it a
// map of collaboration rather than of employment.
//
// Geometry is resolved here rather than in the component, so the page renders
// plain numbers and the maths is testable without a DOM. The projection itself
// lives in worldmap.js, shared with the conference map.

import collaborators from '/config/collaborators.json';
import { locate } from './places.js';
import { map, project, toXY, spread, hueFor, KM_PER_UNIT, MAX_DRIFT_MILES, MAX_PIN_DRIFT }
  from './worldmap.js';
import { mentees, menteeKey, menteeName, profileHref, topAchievements, researchSpans, firstSentenceSpans } from './mentees.js';
import { byType, venueUrl, links, assists, primaryLink } from './data.js';

// Re-exported because the map's callers and tests have always reached for them
// here, and where the maths lives is not their concern.
export { map, project, toXY, KM_PER_UNIT, MAX_DRIFT_MILES, MAX_PIN_DRIFT };

/** Papers we co-wrote, and papers of theirs that thank me (`assist`), by the
 *  author's ORCID. */
function papersByAuthor() {
  const out = new Map();
  for (const pub of byType('publication')) {
    for (const a of pub.authors ?? []) {
      if (a.me || !a.orcid) continue;
      if (!out.has(a.orcid)) out.set(a.orcid, []);
      // The publications page carries no per-item anchor, so a paper links to
      // itself: the journal where it is published, the preprint otherwise, and
      // plain text when it is neither yet.
      const preprint = (links(pub) ?? []).find((l) => l.rel === 'preprint');
      out.get(a.orcid).push({
        id: pub.id,
        title: pub.nickTitle ?? pub.shortTitle ?? pub.title,
        doi: pub.doi,
        date: String(pub.date.start),
        url: venueUrl(pub) ?? preprint?.url ?? null,
      });
    }
  }
  for (const a of assists) {
    for (const au of a.authors) {
      if (!au.orcid) continue;
      if (!out.has(au.orcid)) out.set(au.orcid, []);
      out.get(au.orcid).push({
        id: a.bibcode, title: a.title, doi: a.doi, date: a.date, url: primaryLink(a)?.url ?? null, assist: true,
      });
    }
  }
  return out;
}

// Nobiliary particles travel with the surname: "van Kerkwijk", not "Kerkwijk".
const PARTICLES = new Set(['van', 'von', 'de', 'der', 'den', 'del', 'della', 'di', 'da', 'dos', 'la', 'le']);

/** "Marten H. van Kerkwijk" -> "van Kerkwijk, Marten H." — index order, for
 *  lists a reader scans by surname. Anything without a given name is left be. */
export function lastFirst(name) {
  const parts = name.split(' ');
  // ponytail: a two-word name always splits, so a particle surname on its own
  // ("Le Guin") comes out wrong. No collaborator has one; widen if one arrives.
  let i = parts.length - 1;
  while (i > 1 && PARTICLES.has(parts[i - 1].toLowerCase())) i -= 1;
  const given = parts.slice(0, i).join(' ');
  return given ? `${parts.slice(i).join(' ')}, ${given}` : name;
}

/** Did a post that ran `start`..`end` cover this date? */
const covers = (post, date) =>
  Boolean(post.start) && post.start <= date && (!post.end || post.end >= date);

// An end of "2023" runs to the end of 2023, so it must sort after "2023-09":
// '~' follows every digit and '-'. An open end runs on for ever.
const last = (post) => (post.end ?? '9999') + '~';
/** Do two posts' date ranges meet? Partial dates cover their whole year or month. */
export const meets = (a, b) => a.start <= last(b) && b.start <= last(a);

/** The posts to put on the map for one person: the ORCID record's, then each
 *  `journey` post of a mentee whose institution the record has no overlapping
 *  post for. ORCID wins; the record fills its gaps. */
export function postsOf(orcidPosts, journey = []) {
  const extra = journey
    .filter((j) => !orcidPosts.some((o) => o.start && locate(o.organization) === locate(j.organization) && meets(o, j)))
    .map((j) => ({ ...j, role: j.role }));
  return [...orcidPosts, ...extra]
    .filter((a) => a.start && a.organization && locate(a.organization))
    // Newest first: what someone is doing now is the more useful fact, and it
    // is the order every other dated list on this site uses. The trajectory
    // is a line through the same points either way.
    .sort((a, b) => b.start.localeCompare(a.start));
}

/** First sentence of a mentee's research, as spans with item links resolved. */
const firstSentence = (text) => (text ? firstSentenceSpans(researchSpans(text)) : null);

/**
 * One entry per collaborator who can be put on the map at all: they have at
 * least one dated post at an institution with known coordinates. A mentee is
 * always in, with `pins: []` if nothing of theirs can be placed.
 *
 * `key` is the ORCID, or a mentee's slug when they have none.
 * `hue` comes from worldmap.js, spread by the golden angle.
 */
export function collaboratorMap(menteeList = mentees()) {
  const papers = papersByAuthor();
  const people = [];
  const byKey = new Map(menteeList.map((m) => [menteeKey(m), m]));

  const entries = collaborators.people.map((c) => ({
    orcid: c.orcid, name: c.name, affiliations: c.affiliations, m: byKey.get(c.orcid),
  }));
  for (const m of menteeList) {
    if (!entries.some((e) => e.m === m)) {
      entries.push({ orcid: m.person.orcid, name: menteeName(m), affiliations: [], m });
    }
  }

  for (const person of entries) {
    const m = person.m;
    const posts = postsOf(person.affiliations, m?.journey);
    if (posts.length === 0 && !m) continue;

    const mine = papers.get(person.orcid) ?? [];
    const pins = posts.map((post) => {
      const { lat, lon } = locate(post.organization);
      const [x, y] = toXY(lon, lat);
      return {
        organization: post.organization,
        place: [post.city, post.country].filter(Boolean).join(', '),
        role: post.role,
        start: post.start,
        end: post.end,
        lat, lon, x, y,
        papers: mine.filter((p) => covers(post, p.date)),
      };
    });
    people.push({
      key: person.orcid ?? menteeKey(m),
      orcid: person.orcid,
      name: person.name,
      pins,
      // Only papers that landed inside a known post can be pinned; the rest are
      // still collaborations, and saying so beats pretending they do not exist.
      unplacedPapers: mine.filter((p) => !posts.some((post) => covers(post, p.date))),
      ...(m && {
        mentee: { slug: m.slug, href: profileHref(m), research: firstSentence(m.research), top: topAchievements(m) },
      }),
    });
  }

  people.sort((a, b) => lastFirst(a.name).localeCompare(lastFirst(b.name)));
  people.forEach((p, i) => { p.hue = hueFor(i); });
  spread(people.flatMap((p) => p.pins));
  return people;
}

let mapped;
/** A person on the map at /research/ (by ORCID, or a mentee's slug), picked
 *  there by mappick.js from the query; null for someone the map has no entry for. */
export function collabHref(key) {
  mapped ??= new Set(collaboratorMap().map((p) => p.key));
  return mapped.has(key) ? `/research/?collab=${key}#collaborators` : null;
}
