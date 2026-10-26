// The render model. cv.typ and the website both read this, so a mistake here
// shows up in the PDF and the page at once — and neither can be diffed easily.

import { describe, expect, it } from 'vitest';
import { cvModel, rowOf } from '../src/lib/cvmodel.js';
import { lineTier } from '@nstarkman/data-resolver/inline.js';
import { resolve as itemById } from '../src/lib/data.js';

const complete = cvModel('complete');
const twoPage = cvModel('2page');
const all = (cv) => cv.sections.flatMap((s) => s.items);
const find = (cv, id) => all(cv).find((i) => i.id === id);
const text = (spans) => spans.map((s) => s.t).join('');

describe('the model', () => {
  it('carries the person and the preset it was built from', () => {
    expect(complete.preset).toBe('complete');
    expect(complete.person.name).toBeTruthy();
  });

  it('prints an institution as its name level asks: full, first alternative, last', () => {
    const post = itemById('mit-postdoc');
    const cv = { name: 'np' };
    const at = (names) => text(rowOf(post, cv, { detail: 'full' }, undefined, names).subject);
    expect(at(0)).toBe('MIT Kavli Institute for Astrophysics and Space Research');
    expect(at(1)).toBe('MIT Kavli Institute for Astrophysics');
    expect(at(2)).toBe('MIT Kavli');
    // An institution with no alternatives is its own at every level.
    const bs = itemById('cwru-bs');
    expect(text(rowOf(bs, cv, { detail: 'full' }, undefined, 2).subject)).toContain(bs.institution);
    // Each entry's level comes from `namesFor`, by id; absent is full.
    const model = cvModel('complete', new Set(['mit-postdoc']), undefined, { namesFor: { 'mit-postdoc': 2 } });
    expect(text(find(model, 'mit-postdoc').subject)).toBe('MIT Kavli');
    const bulk = cvModel('complete', new Set(['mit-postdoc']), undefined, { namesFor: { 'mit-postdoc': 1 } });
    expect(text(find(bulk, 'mit-postdoc').subject)).toBe('MIT Kavli Institute for Astrophysics');
    const none = cvModel('complete', new Set(['mit-postdoc']));
    expect(text(find(none, 'mit-postdoc').subject)).toBe('MIT Kavli Institute for Astrophysics and Space Research');
    // A level past the last alternative takes the last.
    const one = { ...post, institutionNames: ['MIT Kavli'] };
    expect(text(rowOf(one, cv, { detail: 'full' }, undefined, 1).subject)).toBe('MIT Kavli');
  });

  it('writes amounts in the currency style asked for, codes by default', () => {
    const only = new Set(['astropy-cycle-iii-funding-grant']);
    const trail = (opts) => find(cvModel('complete', only, undefined, opts), 'astropy-cycle-iii-funding-grant').trailing;
    expect(trail()).toBe('USD 12,000');
    expect(trail({ currency: 'us' })).toBe('US$12,000');
    expect(trail({ currency: 'dollar' })).toBe('$12,000');
  });

  it('writes the figure in a description in the currency style, from the record\'s amount', () => {
    const id = 'astropy-cycle-iii-funding-grant';
    const only = new Set([id]);
    const line = (opts) => text(find(cvModel('complete', only, () => true, opts), id).lines[0]);
    expect(line()).toMatch(/^USD 12,000 NASA ROSES/);
    expect(line({ currency: 'us' })).toMatch(/^US\$12,000 NASA ROSES/);
    expect(line({ currency: 'dollar' })).toMatch(/^\$12,000 NASA ROSES/);
  });

  it('leaves an award\'s institution out where the builder switched it off', () => {
    const id = 'osotf-hudd-award-at-massey';
    const only = new Set([id]);
    const who = (opts) => text(find(cvModel('complete', only, undefined, opts), id).subject);
    expect(who()).toBe('Massey College');
    expect(who({ funderOff: [id] })).toBe('');
    expect(who({ funderOff: ['someone-else'] })).toBe('Massey College');
    // A grant keeps its role when its institution is off.
    const grant = itemById('astropy-cycle-iii-funding-grant');
    expect(rowOf({ ...grant, role: 'Lead', funder: 'NASA' }, { name: 'np' }, { detail: 'full' }, undefined, 0, undefined, false)
      .subject.map((s) => s.t).join('')).toBe('Lead');
  });

  it('says what a declined grant was worth, in the currency style', () => {
    const id = 'nserc-pdf';
    const only = new Set([id]);
    const trail = (opts) => find(cvModel('complete', only, undefined, opts), id).trailing;
    expect(trail()).toBe('CAD 90,000 (declined)');
    expect(trail({ currency: 'dollar' })).toBe('CA$90,000 (declined)');
    // A declined entry with no amount, or an award, says only "declined".
    const cv = { name: 'np' };
    expect(rowOf({ type: 'grant', declined: true, title: 'x', date: { start: '2020' } }, cv, { detail: 'full' }).trailing).toBe('declined');
    expect(rowOf({ type: 'award', declined: true, amount: { currency: 'USD', value: 5 }, title: 'x', date: { start: '2020' } }, cv, { detail: 'full' }).trailing).toBe('declined');
  });

  it("cites a mentee's papers by identifier when asked, else in words", () => {
    const sirui = itemById('sirui-wu-copenhagen');
    const charlotte = itemById('charlotte-myers-mit-with-prof-lina-necib-mit');
    const cv = { name: 'np' };
    const line = (item, ids) => rowOf(item, cv, { detail: 'full' }, () => true, 0, undefined, true, ids).lines
      .map((l) => text(l)).find((t) => t.startsWith('First-author papers'));
    expect(line(sirui, false)).toBe('First-author papers: in The Astrophysical Journal and in the Journal of Open Source Software');
    expect(line(sirui, true)).toBe('First-author papers: 10.3847/1538-4357/aea0d4 and 10.21105/joss.10712');
    // Each carries its mark and link, as the Publications section writes a DOI.
    const spans = rowOf(sirui, cv, { detail: 'full' }, () => true, 0, undefined, true, true).lines.flat().filter((x) => x.icon);
    expect(spans.map((x) => x.icon)).toEqual(['paper', 'paper']);
    expect(spans[0].url).toBe('https://doi.org/10.3847/1538-4357/aea0d4');
    // A paper with no DOI cites its arXiv id.
    expect(line(charlotte, true)).toMatch(/^First-author papers: arXiv:\d+\.\d+ and arXiv:\d+\.\d+$/);
    expect(line(charlotte, false)).toBe('First-author papers: a NeurIPS workshop paper and a paper submitted to The Astrophysical Journal');
  });

  it('marks an education entry to have its institution below, and nothing else', () => {
    const only = new Set(['toronto-phd', 'mit-postdoc']);
    const on = cvModel('complete', only, undefined, { schoolBelow: true });
    const off = cvModel('complete', only);
    expect(find(on, 'toronto-phd').below).toBe(true);
    expect(find(on, 'mit-postdoc').below).toBeUndefined();
    expect(find(off, 'toronto-phd').below).toBeUndefined();
    // The words are the same; the template does the breaking.
    expect(text(find(on, 'toronto-phd').subject)).toBe('University of Toronto');
  });

  it("draws a school's homepage link as a graduation cap, and no other link", () => {
    const only = new Set(['toronto-phd', 'mit-postdoc']);
    const m = cvModel('complete', only);
    expect(find(m, 'toronto-phd').links.find((l) => l.rel === 'homepage').icon).toBe('cap');
    expect(find(m, 'mit-postdoc').links.find((l) => l.rel === 'homepage').icon).toBe('link');
  });

  it('marks the link icon for the degree line only with the institution below', () => {
    const only = new Set(['toronto-phd', 'mit-postdoc']);
    const on = cvModel('complete', only, undefined, { schoolBelow: true, linkOnDegree: true });
    expect(find(on, 'toronto-phd').linkOnDegree).toBe(true);
    expect(find(on, 'mit-postdoc').linkOnDegree).toBeUndefined();
    expect(find(cvModel('complete', only, undefined, { linkOnDegree: true }), 'toronto-phd').linkOnDegree).toBeUndefined();
    expect(find(cvModel('complete', only, undefined, { schoolBelow: true }), 'toronto-phd').linkOnDegree).toBeUndefined();
  });

  it('leaves a place out where the section says to, but not an amount', () => {
    const cv = { name: 'np' };
    const place = itemById('cwru-bs');
    const grant = itemById('astropy-cycle-iii-funding-grant');
    expect(rowOf(place, cv, { detail: 'full' }).trailing).toBe(place.location);
    expect(rowOf(place, cv, { detail: 'full', location: false }).trailing).toBe('');
    expect(rowOf(grant, cv, { detail: 'full', location: false }).trailing).toMatch(/^USD/);
  });

  it('spells months on dates, because the PDF prints them', () => {
    expect(find(complete, 'brinson-prize-fellowship').when).toBe('Feb 2024');
  });
});

describe('detail levels', () => {
  it('drops elaboration on a summary preset', () => {
    const summarySections = twoPage.sections.filter((s) => s.detail !== 'full');
    for (const s of summarySections) {
      for (const i of s.items) expect(i.lines).toEqual([]);
    }
  });

  it('keeps it where a section overrides the preset', () => {
    // Invited Talks is `detail: full` on the two-page CV: a talk that names a
    // city and not its subject is an itinerary.
    const talks = twoPage.sections.find((s) => s.id === 'talks-invited');
    expect(talks.detail).toBe('full');
    expect(talks.items.some((i) => i.lines.length > 0)).toBe(true);
  });

  describe("a talk's place below its title", () => {
    const talk = (cv) => all(cv).find((i) => i.id === 'marche-iii-big-bang-big-stars-big-computers-jesi');
    const only = new Set(['marche-iii-big-bang-big-stars-big-computers-jesi', 'cwru-seminar']);
    const off = cvModel('complete', only);
    const on = cvModel('complete', only, undefined, { locationBelow: { 'talks-invited': true } });

    it('moves the place out of the right-hand column', () => {
      expect(talk(off).trailing).toBe('Jesi, Italy');
      expect(talk(off).placeBelow).toBeUndefined();
      expect(talk(on).trailing).toBe('');
      expect(talk(on).placeBelow).toBe('Jesi, Italy');
    });

    it('changes only the ticked section and nothing else of the row', () => {
      const other = cvModel('complete', only, undefined, { locationBelow: { publications: true } });
      expect(other).toEqual(off);
      const { trailing: _t, placeBelow: _p, ...rest } = talk(on);
      const { trailing: _t2, ...restOff } = talk(off);
      expect(rest).toEqual(restOff);
    });

    it('prints no line for a talk with no place, and leaves a note where it is', () => {
      const accepted = itemById('astropy-conference-talk');
      const cv = { name: 'complete' };
      const s = { id: 'talks-invited', detail: 'full' };
      const row = rowOf({ ...accepted, kind: 'accepted', location: undefined }, cv, s);
      expect(row.trailing).toBe('not attended');
      expect(row.placeBelow).toBeUndefined();
    });

    it('leaves the place out when the section prints none', () => {
      const none = cvModel('complete', only, undefined, { location: { 'talks-invited': false }, locationBelow: { 'talks-invited': true } });
      expect(talk(none).trailing).toBe('');
      expect(talk(none).placeBelow).toBeUndefined();
    });
  });

  it("prints a talk's title first, in quotation marks, and a note as it was", () => {
    expect(text(find(complete, 'eas-26-s10-lausanne').lines[0]))
      .toBe('“The Geometry of Dark Matter Halos from Extragalactic Streams”');
    // A title with a note: the title, then the note.
    expect(find(complete, '30th-texas-symposium-on-relativistic-astrophysics-talk').lines.map(text))
      .toEqual(['“Resolving the Recombination Visibility Function Width Tension”', 'Awarded best graduate student presentation']);
    // A note that is not a title is not quoted.
    expect(find(complete, 'gaia-hackathon').lines.map(text)).toEqual(['Role: LOC']);
  });

  it('lets the builder pick individual lines', () => {
    const onlyFirst = cvModel('complete', undefined, (_id, line) => line === 0,
      // Roles merged into one row carry one line each, so keep them apart here.
      { group: { Astropy: false } });
    for (const i of all(onlyFirst)) expect(i.lines.length).toBeLessThanOrEqual(1);
  });

  it('merges roles at one institution into one row, unless kept apart', () => {
    const rows = (opts) => all(cvModel('np', undefined, undefined, opts))
      .filter((i) => i.subject.some((sp) => sp.t === 'Astropy'));
    const [merged] = rows();
    expect(rows()).toHaveLength(1);
    expect(merged.title).toBe('Coordinator (2025 – 2028), Strategic Planner (2025 – 2026) & Core Developer');
    expect(rows({ group: { Astropy: false } }).map((r) => r.title))
      .toEqual(['Coordinator', 'Strategic Planner', 'Core Developer']);
  });

  it('lets the builder group any institution, not only those that opt in', () => {
    const id = 'group:Case Western Reserve University';
    const ids = (opts) => all(cvModel('complete', undefined, undefined, opts)).map((i) => i.id);
    expect(ids()).not.toContain(id);
    expect(ids({ group: { 'Case Western Reserve University': true } })).toContain(id);
  });

  it('prints `detailsComplete` in the complete CV and nowhere else', () => {
    // The GPA is on the record and belongs in the unabridged CV; it is not
    // something to hand a search committee. `details` is the wrong tier for it
    // because np and the website both print that.
    const text = (model, id) => {
      const item = all(model).find((i) => i.id === id);
      return (item?.lines ?? []).flat().map((sp) => sp.t).join(' ');
    };
    const record = itemById('cwru-bs');
    expect(record.detailsComplete).toBe('GPA 4.0.');

    expect(text(cvModel('complete'), 'cwru-bs')).toContain('GPA 4.0');
    for (const name of ['np', '2page', '1page']) {
      expect(text(cvModel(name), 'cwru-bs')).not.toContain('GPA');
    }
    // And the tier above it still prints everywhere it did before.
    expect(text(cvModel('np'), 'cwru-bs')).toContain('Summa Cum Laude');
  });

  it('appends a complete-only line last, so line indices do not shift', () => {
    // The builder ticks lines by index. If the extra line were inserted among
    // the others, every tick after it would silently point at a different line.
    const lines = all(cvModel('complete')).find((i) => i.id === 'cwru-bs').lines;
    expect(lines.at(-1).map((sp) => sp.t).join(' ')).toContain('GPA 4.0');
  });
});

describe('publications', () => {
  const pubs = complete.sections.find((s) => s.id === 'publications');
  const astropy = pubs.items.find((i) => i.id === 'astropy-v5-paper');

  it('hands byline, title and venue over separately', () => {
    expect(text(astropy.byline)).toContain('Starkman');
    expect(astropy.venue).toContain('Astrophysical Journal');
    expect(astropy.title).not.toContain('Starkman');
  });

  it('bolds the owner and nobody else', () => {
    expect(astropy.byline.filter((s) => s.b).map((s) => s.t)).toEqual(['N. Starkman']);
  });

  it('groups by status, newest state first', () => {
    // An empty status gets no group, so check the order of those present.
    const order = ['In Preparation', 'Submitted', 'Accepted', 'Published'];
    const labels = pubs.groups.map((g) => g.label);
    expect(labels).toEqual(order.filter((l) => labels.includes(l)));
    expect(labels).toContain('Published');
    const grouped = pubs.groups.flatMap((g) => g.ids);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(grouped.length).toBe(pubs.items.length);
  });

  it('names every citation link rather than leaving a bare glyph', () => {
    const cite = ['ads', 'arxiv', 'paper', 'doi'];
    for (const p of pubs.items) {
      for (const l of p.links.filter((x) => cite.includes(x.icon))) {
        expect(l.label).toBeTruthy();
      }
    }
  });
});

describe('software', () => {
  const sw = complete.sections.find((s) => s.id === 'software');

  it('shows the paper of a package that has one', () => {
    const unxt = sw.items.find((i) => i.id === 'unxt');
    expect(unxt.links.some((l) => l.icon === 'paper')).toBe(true);
    // ...and it is the paper the record points at.
    expect(itemById('unxt').refs).toContain('unxt-joss');
  });

  it('leaves a package with no paper alone', () => {
    const quax = sw.items.find((i) => i.id === 'quax');
    expect(quax.links.some((l) => l.icon === 'paper')).toBe(false);
  });

  it('still titles a package with its repository', () => {
    const unxt = sw.items.find((i) => i.id === 'unxt');
    expect(unxt.links[0].icon).toBe('github');
  });
});

describe('every item', () => {
  it('has the fields cv.typ reads, so the template cannot fault', () => {
    for (const i of all(complete)) {
      expect(typeof i.when).toBe('string');
      expect(typeof i.title).toBe('string');
      expect(Array.isArray(i.subject)).toBe(true);
      expect(Array.isArray(i.lines)).toBe(true);
      expect(Array.isArray(i.links)).toBe(true);
      expect(typeof i.trailing).toBe('string');
      for (const l of i.links) expect(l.icon && l.url && l.label).toBeTruthy();
    }
  });

  it('never prints a mentee name twice', () => {
    // `student` was imported equal to `title`, so the subject repeated it.
    const mentoring = complete.sections.find((s) => s.id === 'mentoring');
    for (const i of mentoring.items) expect(text(i.subject)).not.toBe(i.title);
  });
});

describe('mentee achievements', () => {
  const item = {
    id: 'm', type: 'mentoring', title: 'M', date: { start: '2024' },
    details: 'About M.',
    achievements: [
      { kind: 'award', date: '2026-03', title: 'Prize', event: 'AAS', cvs: ['2page'] },
      { kind: 'talk', date: '2025', title: 'Talk', url: 'https://x.org', outlet: 'Out' },
    ],
  };
  const row = (name, keepLine, includeAll = false) =>
    rowOf(item, { name, includeAll }, { detail: name === '2page' ? 'summary' : 'full' }, keepLine);
  const lines = (r) => r.lines.map(text);

  it('prints a marked achievement even where details are dropped', () => {
    expect(lines(row('2page'))).toEqual(['Prize — AAS (2026)']);
  });
  it('prints neither on a preset that marks neither', () => {
    expect(lines(row('np'))).toEqual(['About M']);
  });
  it('prints all, oldest first, on the complete CV', () => {
    expect(lines(row('complete', undefined, true)))
      .toEqual(['About M', 'Talk — Out (2025)', 'Prize — AAS (2026)']);
  });
  it('keeps an achievement the builder ticks by its own index', () => {
    expect(lines(row('complete', (_id, i) => i === 1, true))).toEqual(['Talk — Out (2025)']);
  });
  it('tells achievements from complete-only lines, so the builder ticks them', () => {
    // 1 base line, 1 complete-only, then achievements.
    expect([0, 1, 2].map((i) => lineTier(i, 1, 2))).toEqual(['base', 'complete', 'achievement']);
  });
  it('is not kept by a builder tick of an earlier line', () => {
    expect(lines(row('complete', (_id, i) => i === 0, true))).toEqual(['About M']);
  });
});
