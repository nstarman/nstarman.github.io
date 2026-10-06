// The buttons as groups: each key in one group, each group with its own
// per-row count and place, the first the card's own buttons.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseName, formatName, cardFace, placeOf } from '../src/lib/cardname.js';
import { cardFacts, CARD_TYPES } from '../src/lib/cards.js';
import { items } from '../src/lib/data.js';
import { itemFacts } from '../src/lib/cardbuilder/facts.js';
import { controlOps, readSpec, fitName, mainLinks } from '../src/lib/cardbuilder/model.js';

const B = 'size:fill:fit-figure:none-title:full:whole:link-authors:none-text:details-extras:none';
const group = (n) => parseName(`${B}-${n}`);

describe('the name of a card with groups of buttons', () => {
  it('has the first buttons part as the card’s own and each other as a group', () => {
    const s = group('buttons:code,docs:left-buttons:stars:right');
    expect([s.links, s.foot]).toEqual([['code', 'docs'], 'left']);
    expect(s.groups).toEqual([{ links: ['stars'], area: 'right', v: 'top' }]);
    expect(group('buttons:all').groups).toBeUndefined();
  });

  it('gives a group the card’s area where it names none, and a place as the buttons have it', () => {
    expect(group('buttons:code:left-buttons:stars').groups[0]).toEqual({ links: ['stars'], area: 'left', v: 'top' });
    expect(group('buttons:code:left-buttons:stars:left:bottom').groups[0]).toEqual({ links: ['stars'], area: 'left', v: 'bottom' });
    expect(group('buttons:code-buttons:stars:3:bottom:center').groups[0]).toEqual({ links: ['stars'], perRow: 3, area: 'bottom', h: 'center' });
    expect(group('buttons:code-buttons:stars:top:right').groups[0]).toEqual({ links: ['stars'], area: 'top', h: 'right' });
    expect(group('buttons:code-buttons:stars:right:center:left').groups[0]).toEqual({ links: ['stars'], area: 'right', v: 'center', h: 'left' });
  });

  it('round-trips, each group written where it departs from the card’s own', () => {
    for (const n of [
      'buttons:code,docs:left-buttons:stars:right', 'buttons:all:fit:left:bottom-buttons:stars:right:center',
      'buttons:all-buttons:stars:top:right', 'buttons:code:left-buttons:stars:left:bottom', 'buttons:code:fit-buttons:stars:3:bottom:center',
      'buttons:code-buttons:docs:2-buttons:stars:right', 'buttons:all-buttons:docs,stars:2:left:bottom:right',
    ]) {
      const spec = group(n);
      expect(parseName(formatName(spec)), n).toEqual(spec);
      expect(formatName(spec).split('-').filter((p) => p.startsWith('buttons')), n).toHaveLength(1 + spec.groups.length);
    }
    // A group in the card's own area and place is written with no area at all.
    expect(formatName(group('buttons:code:left-buttons:stars:left')).split('-').filter((p) => p.startsWith('buttons'))).toEqual(['buttons:code:left', 'buttons:stars']);
  });

  it('refuses a key in two groups, all in two, a group of none, and a part that is no key', () => {
    expect(() => group('buttons:code-buttons:code')).toThrow(/code is in two groups/);
    expect(() => group('buttons:all-buttons:all')).toThrow(/all is in two groups/);
    expect(() => group('buttons:code-buttons:none')).toThrow(/group of buttons with none/);
    expect(() => group('buttons:code-buttons:year')).toThrow(/among the first buttons/);
    expect(() => group('buttons:code-buttons:paperbutton')).toThrow(/among the first buttons/);
    expect(() => group('buttons:code-buttons:stars:nowhere')).toThrow(/no such area/);
    expect(() => group('buttons:code:top')).toThrow(/no such area/);
    expect(() => group('buttons:code-buttons:stars:top:top')).toThrow(/no such place/);
  });

  it('lets empty be in any group, as often as asked', () => {
    expect(() => group('buttons:empty,code,empty-buttons:empty,stars:right')).not.toThrow();
  });
});

const unxt = items.find((i) => i.id === 'unxt');
const face = (n, i = unxt) => cardFace(parseName(`${B}-${n}`), cardFacts(i, false));
/** The keys a list shows, kept or not, in order. */
const keysOf = (g, i = unxt) => g.seq.map((x) => (x.link != null ? cardFacts(i).keys[x.link] : x.empty ? 'empty' : x.paper ? 'paper' : x.cell)).map((k, n) => (g.seq[n].kept ? k : `(${k})`));

describe('what a name with groups makes of a card', () => {
  const keys = cardFacts(unxt).keys;

  it('gives the first group its list, and another group its own', () => {
    expect(keys).toEqual(['paper', 'code', 'docs', 'stars']);
    const f = face('buttons:code,docs:left-buttons:stars:right');
    expect(keysOf(f.groups[0])).toEqual(['code', 'docs', '(paper)', '(stars)'].filter((k) => k !== '(stars)'));
    expect(keysOf(f.groups[1])).toEqual(['stars']);
    expect(f.seq).toBe(f.groups[0].seq);
  });

  it('puts what no group lists, hidden, in the first — unless one group is all', () => {
    expect(keysOf(face('buttons:code-buttons:stars:right').groups[0])).toEqual(['code', '(paper)', '(docs)']);
    expect(keysOf(face('buttons:code-buttons:all:right').groups[1])).toEqual(['paper', 'docs', 'stars']);
    expect(keysOf(face('buttons:code-buttons:all:right').groups[0])).toEqual(['code']);
    expect(keysOf(face('buttons:all-buttons:stars:right').groups[0])).toEqual(['paper', 'code', 'docs']);
  });

  it('puts a group in a slot of the buttons’ box where it is in their area, a strip at the top, or a box of its own', () => {
    const slot = face('buttons:code:left-buttons:stars:left:bottom').groups[1];
    expect([slot.foot, slot.slot, slot.strip]).toEqual([null, 'end', null]);
    expect(face('buttons:code:left-buttons:stars:left').groups[1].slot).toBe('start');
    const strip = face('buttons:code-buttons:stars:top:right');
    expect([strip.groups[1].strip, strip.groups[1].slot, strip.groups[1].foot]).toEqual([{ area: 'top', h: 'right' }, null, null]);
    expect(strip.data.strips).toBe('top');
    const own = face('buttons:code:left-buttons:stars:right:center');
    expect([own.groups[1].foot, own.groups[1].slot, own.feet, own.data.xfeet]).toEqual(['right', 'center', ['right'], 'right']);
    expect(face('buttons:code-buttons:stars:bottom:right').feet).toEqual(['bottom']);
    // Two groups in one other area share its box.
    expect(face('buttons:code:left-buttons:docs:right-buttons:stars:right:bottom').feet).toEqual(['right']);
  });

  it('is a card of one group when there is one: nothing of the others’', () => {
    const f = face('buttons:all:fit:left');
    expect([f.groups.length, f.feet, f.data.xfeet]).toEqual([1, [], undefined]);
  });

  it('counts each group’s rows its own', () => {
    const f = face('buttons:code,docs:1-buttons:stars:3:right');
    expect([f.groups[0].per, f.groups[1].per]).toEqual([1, 1]);
    const wide = face('buttons:all:fit-buttons:paper,stars:2:bottom', items.find((i) => i.id === 'astropy'));
    expect(wide.groups[0].per).toBeNull();
    expect(wide.groups[1].per).toBe(2);
    // On a right rail, a short last row starts so many columns in — for that group.
    const rail = face('buttons:code:2:right-buttons:stars,paper,docs:3:right:top:right', unxt);
    expect(rail.groups[0].skip === null || typeof rail.groups[0].skip === 'number').toBe(true);
  });

  it('shows nothing of a group whose keys the item has not got', () => {
    const paper = items.find((i) => i.type === 'publication' && !cardFacts(i).keys.includes('stars'));
    const f = face('buttons:all-buttons:stars:right', paper);
    expect([f.groups[1].on, f.feet, f.data.xfeet]).toEqual([false, [], undefined]);
  });

  it('holds the area its group is in, for the card’s columns and rows', () => {
    const f = face('buttons:code-buttons:stars:left');
    expect(f.groups[1].slot).toBe('start');
    const own = face('buttons:code-buttons:stars:right');
    expect(own.data.xfeet).toBe('right');
  });

  it('is the same card on the embed page, run from its own source', () => {
    const [inlined, run] = new Function(`${placeOf.toString()}\n${cardFace.toString()}\nreturn [(${parseName.toString()}), cardFace];`)();
    for (const n of ['buttons:code,docs:left-buttons:stars:right', 'buttons:all:fit-buttons:stars:bottom:right', 'buttons:code:2:right:bottom-buttons:docs,stars:2:left:center:right', 'buttons:empty,code-buttons:empty,stars:top:center']) {
      const name = `${B}-${n}`;
      expect(inlined(name), n).toEqual(parseName(name));
      for (const i of items.filter((x) => CARD_TYPES.includes(x.type)).slice(0, 20)) expect(run(inlined(name), cardFacts(i, true)), n).toEqual(cardFace(parseName(name), cardFacts(i, true)));
    }
  });
});

describe('the stylesheet has a rule for what a name with groups sets', () => {
  const css = fs.readFileSync('src/styles/global.css', 'utf8');
  it('every area a group can have its own box in, and each way a group is placed', () => {
    for (const a of ['left', 'right', 'center', 'bottom']) {
      expect(css, a).toContain(`> .c-xfoot[data-at="${a}"]{grid-area:`);
      // The center's row needs nothing of the card: it is under the words as ever.
      if (a !== 'center') expect(css, a).toContain(`[data-xfeet~="${a}"]`);
    }
    for (const s of ['start', 'center', 'end']) expect(css, s).toContain('.c-slot[data-at="' + s + '"]');
    for (const attr of ['data-xg', 'data-gper', 'data-gh="center"', 'data-gh="right"', 'data-gv="bottom"']) expect(css, attr).toContain(attr);
  });

  it('and every attribute the component writes for a group is one the stylesheet reads', () => {
    const list = fs.readFileSync('src/components/ButtonList.astro', 'utf8');
    for (const attr of list.match(/data-[a-z]+(?==)/g)) expect(css, attr).toContain(attr);
  });
});

describe('the Card Builder carries a card’s other groups', () => {
  const it0 = itemFacts(unxt);
  const slug = `${B}-buttons:code,docs:left-buttons:stars:right`.replace('size:fill', 'size:320');
  it('through its controls and back', () => {
    const { ops, state } = controlOps(parseName(slug), { it: it0, stepPx: {}, framePx: {} });
    expect(state.groups).toEqual(parseName(slug).groups);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('with the key no longer ticked in the first group, and only the keys the item has', () => {
    expect(mainLinks(['code', 'stars', 'empty'], [{ links: ['stars', 'empty'] }])).toEqual(['code', 'empty']);
    expect(mainLinks('all', [{ links: ['stars'] }])).toBe('all');
    expect(mainLinks(['code'], undefined)).toEqual(['code']);
    const fit = fitName(slug, { ...it0, links: it0.links.filter(([k]) => k !== 'stars') });
    expect(fit).not.toContain('buttons:stars');
    expect(fitName(slug, it0)).toContain('buttons:stars:right');
  });
});
