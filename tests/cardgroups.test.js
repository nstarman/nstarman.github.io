// The buttons as groups: each key in one group, each group with its own
// per-row count and place, the first the card's own buttons.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseName, formatName, cardFace, placeOf } from '../src/lib/cardname.js';
import { cardFacts, CARD_TYPES } from '../src/lib/cards.js';
import { items } from '../src/lib/data.js';
import { itemFacts } from '../src/lib/cardbuilder/facts.js';
import { controlOps, readSpec, fitName, mainLinks, claimed, regroup, otherArea, newGroup, FIRST_ONLY } from '../src/lib/cardbuilder/model.js';
import { FRAME_PX, STEP_PX } from '../src/lib/cards.js';

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

describe('a button moved between groups (the Card Builder’s drag and menus)', () => {
  const state = (main, groups, mainArea = 'center') => ({ main, groups, mainArea });
  const keys = (r) => [r.main, r.groups.map((g) => g.links)];

  it('moves along in its own group, the first or another', () => {
    expect(keys(regroup(state(['code', 'docs', 'stars'], []), { key: 'code', from: { group: 0, index: 0 }, to: { group: 0, index: 2 } }))).toEqual([['docs', 'stars', 'code'], []]);
    const r = regroup(state(['code'], [{ links: ['docs', 'stars'], area: 'right' }]), { key: 'docs', from: { group: 1, index: 0 }, to: { group: 1, index: 1 } });
    expect(keys(r)).toEqual([['code'], [['stars', 'docs']]]);
  });

  it('moves out of the first group into another, at a place in it', () => {
    const r = regroup(state(['code', 'docs', 'stars'], [{ links: ['data'], area: 'right' }]), { key: 'stars', from: { group: 0, index: 2 }, to: { group: 1, index: 0 } });
    expect(keys(r)).toEqual([['code', 'docs'], [['stars', 'data']]]);
    expect(r.moved).toBe(true);
  });

  it('moves out of another group, into the first or a third', () => {
    const groups = [{ links: ['stars'], area: 'right' }, { links: ['data'], area: 'bottom' }];
    expect(keys(regroup(state(['code'], groups), { key: 'stars', from: { group: 1, index: 0 }, to: { group: 0, index: 0 } }))).toEqual([['stars', 'code'], [['data']]]);
    expect(keys(regroup(state(['code'], groups), { key: 'stars', from: { group: 1, index: 0 }, to: { group: 2 } }))).toEqual([['code'], [['data', 'stars']]]);
  });

  it('makes a new group of a button dropped on an area, and puts it in the group already there', () => {
    const r = regroup(state(['code', 'docs'], []), { key: 'docs', from: { group: 0, index: 1 }, to: { area: 'right' } });
    expect(r.groups).toEqual([{ links: ['docs'], area: 'right', v: 'top' }]);
    expect(regroup(state(['code'], []), { key: 'code', from: { group: 0, index: 0 }, to: { area: 'top' } }).groups).toEqual([{ links: ['code'], area: 'top' }]);
    const more = regroup(state(['code', 'docs'], [{ links: ['stars'], area: 'right', v: 'top' }]), { key: 'docs', from: { group: 0, index: 1 }, to: { area: 'right' } });
    expect(keys(more)).toEqual([['code'], [['stars', 'docs']]]);
    // An area that is the buttons' own is the first group.
    expect(keys(regroup(state(['code'], [{ links: ['stars'], area: 'left' }], 'center'), { key: 'stars', from: { group: 1, index: 0 }, to: { area: 'center' } }))).toEqual([['code', 'stars'], []]);
  });

  it('leaves no group empty, its rooms gone with it', () => {
    const r = regroup(state(['code'], [{ links: ['empty', 'stars', 'empty'], area: 'right' }]), { key: 'stars', from: { group: 1, index: 1 }, to: { group: 0, index: 1 } });
    expect(keys(r)).toEqual([['code', 'stars'], []]);
  });

  it('keeps the paper button and the parts among the buttons in the first group', () => {
    for (const key of FIRST_ONLY) {
      const r = regroup(state(['code', key], []), { key, from: { group: 0, index: 1 }, to: { area: 'right' } });
      expect(r.moved, key).toBe(false);
      expect(r.main, key).toEqual(['code', key]);
    }
    // It may move along in the first group.
    expect(regroup(state(['code', 'paperbutton'], []), { key: 'paperbutton', from: { group: 0, index: 1 }, to: { group: 0, index: 0 } }).main).toEqual(['paperbutton', 'code']);
  });

  it('refuses a move that is not of the button there, and does not change what it was given', () => {
    const groups = [{ links: ['stars'], area: 'right' }];
    const before = JSON.stringify(groups);
    expect(regroup(state(['code'], groups), { key: 'docs', from: { group: 0, index: 0 }, to: { group: 1 } }).moved).toBe(false);
    regroup(state(['code'], groups), { key: 'code', from: { group: 0, index: 0 }, to: { group: 1, index: 0 } });
    expect(JSON.stringify(groups)).toBe(before);
  });

  it('puts a new group in the other side first', () => {
    expect([otherArea('left'), otherArea('right'), otherArea('center'), otherArea('bottom')]).toEqual(['right', 'left', 'bottom', 'right']);
    expect(newGroup('left', ['stars'])).toEqual({ links: ['stars'], area: 'left', v: 'top' });
    expect(newGroup('bottom', ['stars'])).toEqual({ links: ['stars'], area: 'bottom' });
    expect([...claimed([{ links: ['stars', 'empty'] }, { links: ['data'] }])].sort()).toEqual(['data', 'stars']);
  });

  it('makes names a card reads back the same, whatever the moves', () => {
    const base = parseName(`${B}-buttons:all`);
    const it0 = itemFacts(unxt);
    let st = state(['paper', 'code', 'docs', 'stars'], []);
    st = { ...st, mainArea: 'center' };
    for (const m of [
      { key: 'stars', from: { group: 0, index: 3 }, to: { area: 'right' } },
      { key: 'docs', from: { group: 0, index: 2 }, to: { area: 'right' } },
      { key: 'code', from: { group: 0, index: 1 }, to: { area: 'bottom' } },
    ]) st = { ...regroup(st, m), mainArea: 'center' };
    const name = formatName({ ...base, links: st.main, groups: st.groups });
    const spec = parseName(name);
    expect(spec.groups.map((g) => g.links)).toEqual([['stars', 'docs'], ['code']]);
    expect(spec.links).toEqual(['paper']);
    expect(it0.links.length).toBeGreaterThan(2);
  });

  it('is carried by the controls of a name: an all group becomes its keys, every key ticked', () => {
    const it0 = itemFacts(unxt);
    const slug = `${B}-buttons:code-buttons:all:right`.replace('size:fill', 'size:320');
    const { ops, state: st } = controlOps(parseName(slug), { it: it0, stepPx: STEP_PX, framePx: FRAME_PX });
    expect(st.groups[0].links).toEqual(['paper', 'docs', 'stars']);
    expect(ops.find((o) => o[0] === 'checks' && o[1] === 'link')[2].sort()).toEqual(['code', 'docs', 'paper', 'stars']);
  });
});
