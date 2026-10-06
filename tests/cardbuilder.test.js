// The Card Builder's pure logic: the controls ⇄ name mapping, the preview's
// geometry, the saved settings, and what the page knows of each item. The DOM
// side (overlay, gestures, export) is checked in the browser.

import { describe, expect, it } from 'vitest';
import { BUILDER_DEFAULT, CARD_TYPES, FIXED_MAX, FIXED_MIN, FIXED_MIN_HEIGHT, FRAME_PX, SITE_PRESETS, STEP_PX, parseName } from '../src/lib/cards.js';
import { items } from '../src/lib/data.js';
import { itemFacts, linkPlace } from '../src/lib/cardbuilder/facts.js';
import { between, cellGrid, named, partZones, sum, venueDrops } from '../src/lib/cardbuilder/geometry.js';
import {
  ownKeys, boxHeight, canTune, clampInt, controlOps, defaultsOf, figWidth, fitName, hiddenKeys, inBox, linksOf, namesN, presetWidths, readSpec, shapeHeight, shownKeys, sideHas, smallBox, stackedIn, stretch, typedPx, venueArea,
} from '../src/lib/cardbuilder/model.js';
import { parseSettings, serializeSettings } from '../src/lib/cardbuilder/settings.js';

const pool = items.filter((i) => CARD_TYPES.includes(i.type));
const limits = { fixedMin: FIXED_MIN, fixedMax: FIXED_MAX, fixedMinHeight: FIXED_MIN_HEIGHT, stepPx: STEP_PX };

/** A form's controls, held as the FormData-shaped { get, getAll } the model reads,
 *  with the page's own starting values for what a name does not set. */
function formOf(id, it, ops) {
  const v = new Map(Object.entries({ card: id, px: '320', hpx: '400', format: 'iframe', theme: 'auto', authorsn: '', figpx: '', framepx: '', bgap: '', partgap: '', perrow: '', vsplitn: '', hleft: '', hright: '', wleftn: '', wrightn: '', htop: '', hbottom: '' }));
  let figureOn = false;
  for (const [kind, name, val] of ops) {
    if (name === 'eb-figure-on') figureOn = val;
    else if (kind === 'set' || kind === 'radio') { if (val === null) v.delete(name); else v.set(name, String(val)); }
    else if (kind === 'check') { if (val) v.set(name, 'on'); else v.delete(name); }
    else v.set(name, val === null ? it.links.map(([k]) => k) : val);
  }
  const f = { get: (n) => { const x = v.get(n); return Array.isArray(x) ? x[0] ?? null : x ?? null; }, getAll: (n) => { const x = v.get(n); return Array.isArray(x) ? x : x == null ? [] : [x]; } };
  return { f, figureOn };
}

/** The controls a name sets on an item, read back into a name. */
function roundTrip(slug, i) {
  const it = itemFacts(i);
  const { ops, state } = controlOps(parseName(fitName(slug, it)), { it, stepPx: STEP_PX, framePx: FRAME_PX });
  const { f, figureOn } = formOf(i.id, it, ops);
  return readSpec(f, { it, figureOn, ...state, allLinks: ownKeys(it), limits }).slug;
}

describe('controls ⇄ name', () => {
  it('reads back, for every item, the name each preset sets in its controls', () => {
    for (const p of [{ slug: BUILDER_DEFAULT }, ...SITE_PRESETS]) {
      for (const i of pool) expect(roundTrip(p.slug, i), `${p.slug} on ${i.id}`).toBe(fitName(p.slug, itemFacts(i)));
    }
  });

  it('keeps the settings a name carries that no preset uses', () => {
    const slug = 'size:480:120-figure:right:center:40-title:nick:link-authors:5:marked:orcid-text:summary:center-extras:position,year-buttons:ads,code:2:right-look:textsize=compact,buttons=feature';
    const i = pool.find((x) => x.type === 'publication' && x.highlight?.image && x.bibcode);
    expect(roundTrip(slug, i)).toBe(fitName(slug, itemFacts(i)));
  });

  it('drops what an item has not got: no figure, no byline, no text', () => {
    const it = { links: [], paperTo: {}, figure: false, byline: false, text: false, venue: false, pos: false, year: false, role: false, students: false, context: false };
    const c = parseName(fitName('size:fill:fit-figure:left:top:auto-title:full:split-authors:full:plain-text:summary-extras:venue,position-buttons:all', it));
    expect(c.figure).toBe('none');
    expect(c.authors).toBe('none');
    expect(c.extras).toEqual([]);
  });

  it('lists the writes for a name in order, and the state it brings', () => {
    const it = { links: [['code'], ['preprint']], paperTo: {} };
    const { ops, state } = controlOps(parseName('size:320:400-figure:center:auto-title:short-authors:none-text:none-extras:position-buttons:preprint,empty:right-look:standard'), { it, stepPx: STEP_PX, framePx: FRAME_PX });
    expect(ops[0]).toEqual(['set', 'wmode', 'px']);
    expect(ops).toContainEqual(['set', 'px', 320]);
    expect(ops).toContainEqual(['checks', 'link', ['preprint', 'empty']]);
    expect(state.btnOrder).toEqual(['paperbutton', 'preprint', 'empty', 'code']);
    expect(state.areasOn.size).toBe(0);
  });

  it('writes a side and a space into the state', () => {
    const { state } = controlOps(parseName('size:fill:fit-figure:left:top:auto-title:full:split-authors:none-text:none-extras:none-buttons:all-area:left:share=30-space:title_figure=12'), { it: { links: [] }, stepPx: STEP_PX, framePx: FRAME_PX });
    expect([...state.areasOn]).toContain('left');
    expect(state.space).toEqual({ title_figure: '12' });
  });
});

describe('the buttons in order', () => {
  const f = (links, extra = [], paper = false) => ({ get: (n) => (n === 'paperbtn' && paper ? 'on' : null), getAll: (n) => ({ link: links, extra }[n] ?? []) });
  const order = ['paperbutton', 'code', 'arxiv', 'year', 'empty'];

  it('shows each ticked link, each empty one, the paper button and a part where it is on', () => {
    expect(shownKeys(order, f(['arxiv'], ['year'], true))).toEqual(['paperbutton', 'arxiv', 'year', 'empty']);
    expect(hiddenKeys(order, f(['arxiv']))).toEqual(['paperbutton', 'code', 'year']);
  });

  it('writes all where the shown are the item’s own order, else the shown ones', () => {
    expect(linksOf(['paperbutton', 'code', 'arxiv'], f(['code', 'arxiv']), ['code', 'arxiv'])).toBe('all');
    expect(linksOf(['paperbutton', 'code', 'arxiv'], f(['arxiv']), ['code', 'arxiv'])).toEqual(['arxiv']);
    expect(linksOf(['paperbutton', 'code'], f(['code'], [], true), ['code'])).toBe('all');
    expect(linksOf(['code', 'paperbutton'], f(['code'], [], true), ['code'])).toEqual(['code', 'paperbutton']);
  });
});

describe('sizes typed', () => {
  const f = (o) => ({ get: (n) => o[n] ?? null });
  it('holds a number to its range', () => {
    expect(clampInt('12.6', 0, 10)).toBe(10);
    expect(clampInt('', 3, 10)).toBe(3);
    expect(boxHeight(f({ hpx: '5' }), limits)).toBe(FIXED_MIN_HEIGHT);
    expect(boxHeight(f({}), limits)).toBe(400);
    expect(figWidth(f({ figpx: '500', figunit: '%' }))).toBe(100);
    expect(figWidth(f({ figpx: '500', figunit: 'px' }))).toBe(500);
    expect(namesN(f({ authorsn: '' }))).toBe(5);
    expect(namesN(f({ authorsn: '99' }))).toBe(20);
  });
  it('steps the text size to a tenth and the rest to whole pixels', () => {
    expect(typedPx(f({ textsizepx: '13.46' }), 'textsize', STEP_PX)).toBe(13.5);
    expect(typedPx(f({ paddingpx: '13.6' }), 'padding', STEP_PX)).toBe(14);
    expect(typedPx(f({ paddingpx: '999' }), 'padding', STEP_PX)).toBe(STEP_PX.padding.max);
  });
  it('stretches the preset widths with a box wider than it is high, to at most twice', () => {
    expect(presetWidths(stretch(false, 320, 400))).toEqual([200, 260, 320, 400, 520]);
    expect(stretch(true, 320, 400)).toBe(1);
    expect(stretch(true, 1000, 400)).toBe(2);
    expect(presetWidths(2)).toEqual([400, 520, 640, 800, 1040]);
  });
  it('gives a shape’s height from the width', () => {
    expect(shapeHeight(320, '4x5')).toBe(400);
    expect(shapeHeight('400', '8x5')).toBe(250);
  });
  it('finds a box too small for the full title, and the defaults it takes', () => {
    expect(smallBox('size:200:120-figure:none-title:short-authors:none-text:none-extras:none-buttons:none-look:textsize=minor')).toBe(true);
    expect(smallBox('size:fill:fit-title:full-text:none')).toBe(false);
    expect(defaultsOf('size:fill:fit-title:short-text:none').title).toBe('full');
  });
});

describe('the areas', () => {
  const f = (o) => ({ get: (n) => o[n] ?? null, getAll: () => [] });
  const st = (more = {}) => ({ it: { figure: true, venue: true }, figureOn: true, areasOn: new Set(), ...more });
  it('holds a side by its buttons or its figure', () => {
    expect(sideHas(f({ foot: 'left' }), st(), 'left')).toBe(true);
    expect(sideHas(f({ foot: 'center', figat: 'right' }), st(), 'right')).toBe(true);
    expect(sideHas(f({ foot: 'center', figat: 'right' }), st({ figureOn: false }), 'right')).toBe(false);
    expect(stackedIn(f({ figat: 'left' }), st(), 'left')).toBe(true);
  });
  it('offers a row only where its part is', () => {
    expect(canTune('area-left', f({ foot: 'center', figat: 'center' }), st())).toBe(false);
    expect(canTune('area-left', f({ foot: 'center' }), st({ areasOn: new Set(['left']) }))).toBe(true);
    expect(canTune('area-top', f({ titleat: 'top' }), st())).toBe(true);
    expect(canTune('authors', f({}), st({ it: { byline: false } }))).toBe(false);
    expect(canTune('venue', f({}), st())).toBe(false); // the extra is not ticked
    expect(canTune('foot', f({}), st())).toBe(true);
  });
  it('names the venue’s area as its menu does', () => {
    expect(venueArea({})).toBe('below');
    expect(venueArea({ venueAt: 'beside', venueFirst: true })).toBe('left');
    expect(venueArea({ venueAt: 'beside' })).toBe('right');
  });
});

describe('the preview’s geometry', () => {
  it('sums the first tracks', () => {
    expect(sum([1, 2, 3, 4], 3)).toBe(6);
  });
  it('names a track by the parts shown either side of it, or the edge', () => {
    const rows = [10, 4, 20, 4, 0, 4, 12];
    const names = { 0: 'title', 2: 'figure', 4: 'authors', 6: 'text' };
    expect(named([0, 2, 4, 6], names, rows, 1)).toBe('title · figure');
    expect(named([0, 2, 4, 6], names, rows, 3)).toBe('figure · text'); // authors is empty
    expect(named([0, 2, 4, 6], names, rows, 7)).toBe('text · edge');
    expect(named([0, 2, 4, 6], names, [0, 0, 20, 0, 0, 0, 0], 1)).toBe('edge · figure');
  });
  it('takes of the tracks between two parts the one that holds the gap', () => {
    const tracks = [[1, 'a'], [3, 'b']];
    expect(between([0, 2, 4], tracks, [5, 0, 5, 0, 5])).toEqual([[1, 'a'], [3, 'b']]);
    expect(between([0, 4], tracks, [5, 0, 0, 3, 5])).toEqual([[3, 'b']]);
    expect(between([0, 4], tracks, [5, 0, 0, 0, 5])).toEqual([[1, 'a']]);
    expect(between([0], tracks, [5])).toEqual([]);
  });
  it('drops the venue’s area about the authors’, or an element into it', () => {
    const box = [10, 20, 100, 30];
    const area = venueDrops({ isArea: true, venue: true, shared: false, box, lastAreas: 'below' });
    expect(Object.keys(area.zones)).toEqual(['above', 'left', 'right', 'below']);
    expect(area.zones.above).toEqual([10, -10, 100, 30]);
    expect(area.put.above).toEqual(['above']);
    expect(venueDrops({ isArea: true, venue: false, shared: false, box }).put.above).toEqual(['below']); // the authors above is the venue below
    const el = venueDrops({ isArea: false, venue: true, shared: true, box, lastAreas: 'above' });
    expect(Object.keys(el.zones)).toEqual(['before', 'after', 'own area']);
    expect(el.put['own area']).toEqual(['above']);
    expect(venueDrops({ isArea: false, venue: false, shared: false, box }).zones['own area']).toBeUndefined();
  });
  it('shares the card among the areas a part may go to', () => {
    const z = partZones({ W: 300, H: 200, T: 20, B: 0, L: 40, R: 0 });
    expect(z.top).toEqual([0, 0, 300, 20]);
    expect(z.left).toEqual([0, 20, 40, 180]);
    expect(z.center).toEqual([40, 20, 260, 180]);
  });
  it('cuts an area into positions, grown into the card where it is a thin band', () => {
    const g = cellGrid([0, 0, 300, 10], 'top', ['top', 'center', 'bottom'], ['left', 'center', 'right']);
    expect(g).toMatchObject({ zw: 300, zh: 54, w: 100, h: 18 });
    expect(cellGrid([280, 0, 20, 100], 'right', [null], ['l', 'c', 'r']).zx).toBe(280 - 88);
    expect(cellGrid([0, 190, 300, 10], 'bottom', ['a', 'b'], [null]).zy).toBe(190 - 26);
    expect(inBox(5, 5, [0, 0, 10, 10])).toBe(true);
    expect(inBox(11, 5, [0, 0, 10, 10])).toBe(false);
  });
});

describe('saved settings', () => {
  const name = 'size:320:400-figure:none-title:short-authors:none-text:none-extras:none-buttons:all';
  it('round-trips the name, theme and format', () => {
    const text = serializeSettings({ slug: name, theme: 'dark', format: 'pdf' });
    expect(text.endsWith('\n')).toBe(true);
    expect(parseSettings(text)).toEqual({ name, theme: 'dark', format: 'pdf' });
  });
  it('defaults the theme, and leaves the format unset', () => {
    expect(parseSettings(JSON.stringify({ name }))).toEqual({ name, theme: 'auto', format: undefined });
  });
  it('refuses a theme or format it has not got, and a name it cannot read', () => {
    expect(() => parseSettings(JSON.stringify({ name, theme: 'sepia' }))).toThrow(/no such theme, sepia/);
    expect(() => parseSettings(JSON.stringify({ name, format: 'gif' }))).toThrow(/no such format, gif/);
    expect(() => parseSettings(JSON.stringify({ name: 'nonsense' }))).toThrow();
    expect(() => parseSettings('{')).toThrow();
  });
});

describe('what the page knows of each item', () => {
  it('gives every item a title and its links, named by where they go', () => {
    for (const i of pool) {
      const f = itemFacts(i);
      expect(f.title).toBe(i.title);
      expect(f.byline).toBe(i.type === 'publication');
      for (const [k, name, title] of f.links) expect([k, name, title].every((x) => typeof x === 'string' && x)).toBe(true);
    }
  });
  it('names a link by its place where the key is a place, else by what it is', () => {
    expect(linkPlace({ rel: 'code', url: 'https://github.com/a/b' })).toBe('GitHub');
    expect(linkPlace({ rel: 'preprint', url: 'https://arxiv.org/abs/1' })).toBe('arXiv');
    expect(linkPlace({ rel: 'data', url: 'https://zenodo.org/records/1' })).toBe('Zenodo');
    expect(linkPlace({ rel: 'doi', url: 'https://doi.org/10.1/x' })).toBe('DOI');
    expect(linkPlace({ rel: 'docs', url: 'https://example.org/' })).toBe('docs');
  });
});

describe('the stars of a package with few', () => {
  const few = items.find((i) => i.id === 'coordinax');
  const it0 = itemFacts(few);
  const slug = (links) => `size:fill:fit-figure:none-title:full:whole:link-authors:none-text:details-extras:none-buttons:${links}`;

  it('are a pill of their own, last, flagged to be ticked — and not among the card’s own buttons', () => {
    expect(it0.links.at(-1)[0]).toBe('stars');
    expect(it0.links.at(-1)[3]).toBe(true);
    expect(it0.links.slice(0, -1).every((l) => !l[3])).toBe(true);
    expect(ownKeys(it0)).toEqual(it0.links.slice(0, -1).map(([k]) => k));
  });

  it('read back from the controls as the card’s own: all, and not the stars', () => {
    expect(roundTrip(slug('all'), few)).toBe(slug('all'));
  });

  it('read back as named where the name lists them', () => {
    expect(roundTrip(slug('code,docs,stars'), few)).toBe(slug('code,docs,stars'));
    expect(roundTrip(slug('stars,code'), few)).toBe(slug('stars,code'));
  });

  it('tick as the controls have them: the card’s own, and the stars where named', () => {
    const ticked = (name) => controlOps(parseName(slug(name)), { it: it0, stepPx: STEP_PX, framePx: FRAME_PX }).ops.find((o) => o[0] === 'checks' && o[1] === 'link')[2];
    expect(ticked('all')).toEqual(ownKeys(it0));
    expect(ticked('code,stars')).toEqual(['code', 'stars']);
  });
});

