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

export const map = { width: world.width, height: world.height, land: world.d };

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

/**
 * Fan out pins that would land on top of each other.
 *
 * Not just exact coincidence: Harvard and MIT are different coordinates a few
 * projected units apart, as are Princeton and the Institute for Advanced Study,
 * the Simons Foundation and the Flatiron Institute, and CITA and CIFAR. At this
 * scale those are the same dot. So pins are clustered by distance and each
 * cluster is fanned around its own centre, which also guarantees no two members
 * end up in the same place — the first attempt offset each group from its own
 * coordinate and simply moved the collisions somewhere else.
 */
function spread(pins, minGap = 9) {
  const clusters = [];
  for (const pin of pins) {
    const near = clusters.find((c) => Math.hypot(c.x - pin.x, c.y - pin.y) < minGap);
    if (near) {
      near.members.push(pin);
      near.x = near.members.reduce((t, m) => t + m.x, 0) / near.members.length;
      near.y = near.members.reduce((t, m) => t + m.y, 0) / near.members.length;
    } else {
      clusters.push({ x: pin.x, y: pin.y, members: [pin] });
    }
  }
  for (const c of clusters) {
    if (c.members.length === 1) continue;
    const r = minGap * 0.55 * Math.max(1, Math.sqrt(c.members.length / 3));
    c.members.forEach((m, i) => {
      const a = (2 * Math.PI * i) / c.members.length - Math.PI / 2;
      m.x = c.x + r * Math.cos(a);
      m.y = c.y + r * Math.sin(a);
    });
  }

  // Clustering is greedy and a cluster's centre moves as members join it, so
  // two fans can still finish next to each other. A few relaxation passes push
  // any remaining close pair apart. Bounded and deterministic: the same input
  // gives the same map every build, which matters for a committed page.
  const apart = minGap * 0.7;
  for (let pass = 0; pass < 60; pass += 1) {
    let worst = 0;
    for (let i = 0; i < pins.length; i += 1) {
      for (let j = i + 1; j < pins.length; j += 1) {
        const a = pins[i], b = pins[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= apart) continue;
        worst = Math.max(worst, apart - d);
        // A pair exactly on top of each other has no direction to separate
        // along, so give it one rather than dividing by zero.
        const ux = d === 0 ? Math.cos(i) : dx / d;
        const uy = d === 0 ? Math.sin(i) : dy / d;
        const push = (apart - d) / 2;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
      }
    }
    if (worst < 0.05) break;
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
      .sort((a, b) => a.start.localeCompare(b.start));
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
