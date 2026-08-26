// The collaborator map's render model.
//
// A pin is one post a collaborator held somewhere; a trajectory is the dotted
// line joining one person's pins in the order they held them. Each pin carries
// the papers we wrote while they were there, which is the part that makes it a
// map of collaboration rather than of employment.
//
// Projection and geometry are resolved here rather than in the component, so
// the page renders plain numbers and the maths is testable without a DOM.

import collaborators from '/config/collaborators.json';
import places from '/config/places.json';
import world from '../assets/world-equal-earth.json';
import { byType, venueUrl, links } from './data.js';

export const map = {
  width: world.width, height: world.height,
  land: world.d, lakes: world.lakes,
};

const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
const M = Math.sqrt(3) / 2;

/** Equal Earth (Šavrič, Patterson & Jenny 2018). Equal-area, so no country is
 *  drawn bigger than it is — which is the point of a map about where people are. */
export function project(lon, lat) {
  const l = (lon * Math.PI) / 180;
  const p = (lat * Math.PI) / 180;
  const th = Math.asin(M * Math.sin(p));
  const th2 = th * th, th6 = th2 * th2 * th2;
  const x = (2 * Math.sqrt(3) * l * Math.cos(th))
    / (3 * (9 * A4 * th6 * th2 + 7 * A3 * th6 + 3 * A2 * th2 + A1));
  const y = A4 * th6 * th2 * th + A3 * th6 * th + A2 * th2 * th + A1 * th;
  return [x, y];
}

const [MAXX] = project(180, 0);
const [, MAXY] = project(0, 90);
const SCALE = world.width / (2 * MAXX);

/** lon/lat -> the same user units the committed world path is drawn in. */
export function toXY(lon, lat) {
  const [x, y] = project(lon, lat);
  return [(x + MAXX) * SCALE, (MAXY - y) * SCALE];
}

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

/** Kilometres per map unit: the map's height spans 180 degrees of latitude, and
 *  a degree of latitude is 111 km wherever you stand. */
export const KM_PER_UNIT = 111 / (map.height / 180);

/**
 * How far a pin may be moved from the place it stands for.
 *
 * Ten miles — city level. Written as a distance rather than a number of units
 * because the tolerance is a claim about the world, not about the drawing: at
 * this scale one unit is about 41 km, so three units was seventy-six miles and
 * put Case Western outside Cleveland.
 *
 * A pin is three units across, which is far wider than this, so stacked pins
 * now overlap almost exactly. That is the honest picture — the picker below the
 * map is what separates a crowd, not a lie about where people were.
 */
// Nine and a half, not ten: coordinates are written to two decimals in the SVG,
// which is a fifth of a mile of rounding on top of whatever the model decided.
// The promise is about the pin on the screen, so the rounding comes out of the
// budget rather than out of the promise.
export const MAX_DRIFT_MILES = 9.5;
export const MAX_PIN_DRIFT = (MAX_DRIFT_MILES * 1.609) / KM_PER_UNIT;
const MAX_DRIFT = MAX_PIN_DRIFT;

/**
 * Separate pins that share a coordinate, and no more than that.
 *
 * An earlier version clustered by proximity and then relaxed everything apart
 * until nothing touched. It produced a tidy map and a false one: pins drifted a
 * median of ten units and a maximum of twenty-five, which is nine degrees of
 * longitude — Columbia University came out somewhere in Ohio, and Case Western
 * left Cleveland. Overlapping pins are honest; misplaced ones are not, and a
 * map's first duty is to put things where they are.
 *
 * So only exact co-location is fixed, by fanning the stack into a small rosette
 * inside MAX_DRIFT. Institutions that are genuinely near each other — Harvard
 * and MIT, Princeton and the IAS — are drawn near each other, because they are.
 * The picker is what separates a crowd now.
 */
function spread(pins) {
  const at = new Map();
  for (const pin of pins) {
    const key = `${pin.x.toFixed(2)},${pin.y.toFixed(2)}`;
    if (!at.has(key)) at.set(key, []);
    at.get(key).push(pin);
  }
  for (const group of at.values()) {
    if (group.length === 1) continue;
    // Every member the same distance out, so the stack reads as a rosette
    // rather than one pin with satellites.
    const r = Math.min(MAX_DRIFT, 1.2 + group.length * 0.35);
    group.forEach((pin, i) => {
      const a = (2 * Math.PI * i) / group.length - Math.PI / 2;
      pin.x += r * Math.cos(a);
      pin.y += r * Math.sin(a);
    });
  }
}

/**
 * One entry per collaborator who can be put on the map at all: they have at
 * least one dated post at an institution with known coordinates.
 *
 * `hue` is a number, not a colour: the stylesheet decides how light to make it,
 * because a hue that reads on paper-white disappears on near-black. Hues are
 * spread by the golden angle so neighbours in the list are far apart on the
 * wheel however many people there turn out to be.
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
  people.forEach((p, i) => { p.hue = Math.round((i * 137.508) % 360); });
  spread(people.flatMap((p) => p.pins));
  return people;
}
