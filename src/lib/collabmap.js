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
import places from '/config/places.json';
import { map, project, toXY, spread, hueFor, KM_PER_UNIT, MAX_DRIFT_MILES, MAX_PIN_DRIFT }
  from './worldmap.js';
import { byType, venueUrl, links } from './data.js';

// Re-exported because the map's callers and tests have always reached for them
// here, and where the maths lives is not their concern.
export { map, project, toXY, KM_PER_UNIT, MAX_DRIFT_MILES, MAX_PIN_DRIFT };

/** Papers we co-wrote, by the author's ORCID. */
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
        title: pub.title,
        date: String(pub.date.start),
        url: venueUrl(pub) ?? preprint?.url ?? null,
      });
    }
  }
  return out;
}

/** Did a post that ran `start`..`end` cover this date? */
const covers = (post, date) =>
  Boolean(post.start) && post.start <= date && (!post.end || post.end >= date);

/**
 * One entry per collaborator who can be put on the map at all: they have at
 * least one dated post at an institution with known coordinates.
 *
 * `hue` comes from worldmap.js, spread by the golden angle.
 */
export function collaboratorMap() {
  const papers = papersByAuthor();
  const people = [];

  for (const person of collaborators.people) {
    const posts = person.affiliations
      .filter((a) => a.start && a.organization && places.places[a.organization])
      // Newest first: what someone is doing now is the more useful fact, and it
      // is the order every other dated list on this site uses. The trajectory
      // is a line through the same points either way.
      .sort((a, b) => b.start.localeCompare(a.start));
    if (posts.length === 0) continue;

    const mine = papers.get(person.orcid) ?? [];
    const pins = posts.map((post) => {
      const { lat, lon } = places.places[post.organization];
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
      orcid: person.orcid,
      name: person.name,
      pins,
      // Only papers that landed inside a known post can be pinned; the rest are
      // still collaborations, and saying so beats pretending they do not exist.
      unplacedPapers: mine.filter((p) => !posts.some((post) => covers(post, p.date))),
    });
  }

  people.sort((a, b) => a.name.localeCompare(b.name));
  people.forEach((p, i) => { p.hue = hueFor(i); });
  spread(people.flatMap((p) => p.pins));
  return people;
}
