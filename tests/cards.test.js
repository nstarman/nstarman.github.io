import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LOOKS, FIGURE_AT, FIGURE_ALIGN, FOOT_AT, FOOT_END, TEXTS, TITLES, AUTHORS, EXTRAS, BACKGROUNDS, SITE_PRESETS, CARD_TYPES, formatName, parseName, placeOf, defaultSlug, linkKeys, cardText, hasStatus,
} from '../src/lib/cards.js';
import { items, titleOf, splitTitle } from '../src/lib/data.js';

/** Every preset="…" a component or page passes to Card. */
function usedPresets(dir = 'src', out = new Set()) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) usedPresets(p, out);
    else if (e.name.endsWith('.astro')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/<Card\b[^>]*\bpreset="([^"]+)"/g)) out.add(m[1]);
  }
  return out;
}

const NAME = 'size:320:400-figure:center:auto-title:short-authors:none-text:none-extras:position-buttons:all-look:standard';
const four = (step) => ({ textsize: step, padding: step, corners: step, buttons: step });

describe('card names', () => {
  it('round-trip every value of every axis, and every mix of the ones that share a part', () => {
    const sizes = [{ width: 'fill', height: 'fit' }, { width: 'fill', height: 200 }, { width: 480, height: 'fit' }, { width: 640, height: 160 }];
    const titles = [{ title: 'full', rest: 'whole' }, { title: 'full', rest: 'split' }, ...TITLES.filter((t) => t !== 'full').map((title) => ({ title }))];
    const bylines = AUTHORS.flatMap((authors) => (authors === 'none' ? [{ authors }] : ['marked', 'plain'].map((marks) => ({ authors, marks }))));
    const dialSets = [{}, { textsize: 'feature' }, { textsize: 'minor', padding: 'display', corners: 'compact', buttons: 'standard' }, { padding: '0' }, { textsize: '12.5', padding: '24', corners: '0', buttons: '40' }, ...LOOKS.map(four)];
    const base = { text: 'summary', figure: 'none', foot: 'center', extras: [], links: 'all', background: 'normal' };
    const check = (spec) => {
      // standard is the own look of a card that fills its width, so there it departs from nothing —
      // but for the title size, which is its own
      const want = { ...spec, dials: Object.fromEntries(Object.entries(spec.dials).filter(([d, v]) => !(spec.width === 'fill' && v === 'standard' && d !== 'titlesize'))) };
      // the title and figure are words and a picture unless :link
      want.titleLink = spec.titleLink ?? false;
      // and in the center column unless :top
      want.titleAt = spec.titleAt ?? 'center';
      if (spec.figure !== 'none') want.figureLink = spec.figureLink ?? false;
      // a byline is words unless :orcid or :site
      if (['short', 'full'].includes(spec.authors) || typeof spec.authors === 'number') want.authorLink = spec.authorLink ?? false;
      expect(parseName(formatName(spec))).toEqual(want);
    };
    // The parts whose subvalues and defaults depend on each other: every mix.
    for (const sz of sizes) for (const dials of dialSets) for (const t of titles) for (const a of bylines) check({ ...base, ...sz, dials, ...t, ...a });
    // The rest stand alone: each value, around a base card.
    const card = { ...base, width: 'fill', height: 'fit', dials: {}, title: 'full', rest: 'split', authors: 'none' };
    for (const figure of FIGURE_AT) for (const figureAlign of figure === 'center' ? [undefined] : FIGURE_ALIGN) for (const figureSize of ['auto', 10, 50, 100, '8px', '240px']) for (const figureLink of [false, true]) check({ ...card, figure, ...(figureAlign && { figureAlign }), figureSize, figureLink });
    for (const figureH of ['left', 'right']) check({ ...card, figure: 'right', figureAlign: 'bottom', figureH, figureSize: 60, figureLink: false });
    for (const figureSlot of ['top', 'authors', 'venue', 'text']) check({ ...card, figure: 'center', figureSlot, figureSize: 'auto', figureLink: true });
    for (const sides of [{ left: { width: 'min=0' } }, { right: { width: 'share=95', top: true } }, { left: { width: 'buttons', bottom: true }, right: { top: true, bottom: true } }]) check({ ...card, sides });
    for (const title of ['full', 'short', 'nick']) for (const titleLink of [undefined, 'link', 'site', 'ads', 'journal']) for (const titleAt of ['center', 'top']) check({ ...card, title, rest: title === 'full' ? 'split' : undefined, ...(titleLink && { titleLink }), titleAt });
    for (const foot of FOOT_AT.filter((f) => f !== 'center' && f !== 'bottom')) for (const footEnd of FOOT_END) check({ ...card, foot, footEnd });
    check({ ...card, foot: 'bottom' });
    for (const foot of ['center', 'bottom']) for (const railAlign of ['center', 'right']) check({ ...card, foot, railAlign });
    for (const text of TEXTS) check({ ...card, text });
    for (const authors of ['short', 'full', 5]) for (const authorLink of ['orcid', 'site']) check({ ...card, authors, marks: 'marked', authorLink });
    for (const titlesize of [...LOOKS, '8', '22.5', '60']) check({ ...card, dials: { titlesize } });
    for (const extras of [[], ['venue'], EXTRAS]) check({ ...card, extras });
    for (const links of ['all', [], ['paper', 'ads']]) check({ ...card, links });
    for (const background of BACKGROUNDS) check({ ...card, background });
  });

  it('read as key:value[:subvalue] parts, written in full and in order, the look last', () => {
    expect(formatName({ width: 320, height: 400, dials: four('standard'), figure: 'center', title: 'short', text: 'none', extras: ['position'] })).toBe(NAME);
    expect(formatName({ dials: four('compact'), foot: 'right', footEnd: 'top', text: 'summary', links: [] }))
      .toBe('size:fill:fit-figure:none-title:full:split-authors:none-text:summary-extras:none-buttons:none:right-look:compact');
    expect(formatName({ width: 480, height: 480, figure: 'left', figureSize: 40, text: 'details', links: ['ads', 'code'] }))
      .toBe('size:480:480-figure:left:center:40-title:full:split-authors:none-text:details-extras:none-buttons:ads,code');
  });

  it('take parts in any order, and leave figure, foot, title, extras, links and look to their defaults', () => {
    expect(parseName('text:summary-size:fill:fit')).toEqual({
      width: 'fill', height: 'fit', dials: {}, figure: 'none', foot: 'center', titleLink: false, titleAt: 'center', title: 'full', rest: 'split', authors: 'none', text: 'summary', extras: [], links: 'all', background: 'normal',
    });
  });

  it('set each dimension or not: the width fills or is px, the height fits or is px', () => {
    expect(parseName('size:fill:200-text:none')).toMatchObject({ width: 'fill', height: 200 });
    expect(parseName('size:640:fit-text:none')).toMatchObject({ width: 640, height: 'fit' });
    for (const bad of ['fill', 'fit:fill', '119:200', '1601:200', '640:39', '640:1601', '640x160', 'dynamic', 'fixed:640', '0640:160']) {
      expect(() => parseName(`size:${bad}-text:none`)).toThrow();
    }
  });

  it('give a left-out title by the box: in a minor box of set height, nick when no wider than high, else short', () => {
    const t = (n) => { const c = parseName(n); return c.title + (c.rest ? `:${c.rest}` : ''); };
    expect(t('size:200:250-text:none-look:minor')).toBe('nick');
    expect(t('size:200:200-text:none-look:minor')).toBe('nick');
    expect(t('size:400:250-text:none-look:minor')).toBe('short');
    expect(t('size:fill:120-text:none-look:minor')).toBe('short');
    expect(t('size:200:250-text:none-look:compact')).toBe('full:split');
    expect(t('size:200:250-text:none')).toBe('full:split');
    expect(t('size:fill:fit-text:none-look:minor')).toBe('full:split');
    expect(t('size:200:250-title:full:whole-text:none-look:minor')).toBe('full:whole');
  });

  it('give a minor box of set height no text when it leaves text out, and no other box a default', () => {
    expect(parseName('size:400:100-look:minor').text).toBe('none');
    expect(parseName('size:400:100-text:details-look:minor').text).toBe('details');
    expect(() => parseName('size:400:100-look:compact')).toThrow();
    expect(() => parseName('size:400:fit-look:minor')).toThrow();
  });

  it('write authors between title and text, none when left out, students plain unless marked', () => {
    expect(parseName('size:fill:fit-authors:short-text:summary')).toMatchObject({ authors: 'short', marks: 'plain' });
    expect(parseName('size:fill:fit-authors:short:marked-text:summary')).toMatchObject({ authors: 'short', marks: 'marked' });
    expect(() => parseName('size:fill:fit-authors:none:plain-text:summary')).toThrow();
    expect(parseName('size:fill:fit-text:summary').authors).toBe('none');
    expect(() => parseName('size:fill:fit-authors:some-text:summary')).toThrow();
  });

  it('take my author position as an extra, beside a byline or without one', () => {
    expect(parseName('size:fill:fit-authors:none-text:none')).not.toHaveProperty('marks');
    expect(parseName('size:fill:fit-authors:full-text:none-extras:position')).toMatchObject({ authors: 'full', extras: ['position'] });
    // Not a byline any more.
    expect(() => parseName('size:fill:fit-authors:position-text:none')).toThrow();
  });

  it('place the figure, at a share of the card or its own size, or leave it out', () => {
    expect(parseName('size:fill:fit-text:none').figure).toBe('none');
    expect(parseName('size:fill:fit-text:none-figure:left:top:40')).toMatchObject({ figure: 'left', figureAlign: 'top', figureSize: 40 });
    expect(parseName('size:fill:fit-text:none-figure:right:bottom:auto:link')).toMatchObject({ figure: 'right', figureAlign: 'bottom', figureSize: 'auto', figureLink: true });
    expect(parseName('size:fill:fit-text:none-figure:center:auto')).toMatchObject({ figure: 'center', figureSize: 'auto' });
    expect(parseName('size:fill:fit-text:none-figure:center:auto').figureAlign).toBeUndefined();
    for (const bad of ['figure:auto', 'figure:top:auto', 'figure:left', 'figure:left:40', 'figure:left:middle:40', 'figure:center:middle:40', 'figure:left:top', 'figure:left:top:9', 'figure:left:top:101', 'figure:none:auto', 'extras:figure', 'look:figure=40']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('set the buttons in an area, under the words left out, and at a place in it', () => {
    expect(parseName('size:fill:fit-text:none').foot).toBe('center');
    expect(parseName('size:fill:fit-text:none-buttons:all:left:bottom')).toMatchObject({ foot: 'left', footEnd: 'bottom' });
    expect(parseName('size:fill:fit-text:none-buttons:all:2:right:center')).toMatchObject({ foot: 'right', footEnd: 'center', perRow: 2 });
    expect(parseName('size:fill:fit-text:none-buttons:all:right')).toMatchObject({ foot: 'right', footEnd: 'top' });
    expect(parseName('size:fill:fit-text:none-buttons:all:bottom')).toMatchObject({ foot: 'bottom' });
    expect(parseName('size:fill:fit-text:none-buttons:all:bottom:right')).toMatchObject({ foot: 'bottom', railAlign: 'right' });
    expect(parseName('size:fill:fit-text:none-buttons:all:center:left').railAlign).toBeUndefined();
    // A side's own edge is the default across it, and so is the top; center
    // across a side needs its place up and down, or it would read as that.
    expect(parseName('size:fill:fit-text:none-buttons:all:right:top:right').railAlign).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-buttons:all:left:top:center'))).toContain('-buttons:all:left:top:center');
    expect(formatName(parseName('size:fill:fit-text:none-buttons:all:left:bottom:right'))).toContain('-buttons:all:left:bottom:right');
    expect(formatName(parseName('size:fill:fit-text:none-buttons:all:fit:center:right'))).toContain('-buttons:all:fit:center:right');
    for (const bad of ['buttons:all:top', 'buttons:all:bottom:top', 'buttons:all:right:middle', 'buttons:all:13', 'buttons:all:center:right:left', 'rail:center', 'rail:right:top', 'foot:center', 'layout:landscape']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('make the title and the figure links only where the name asks', () => {
    expect(parseName('size:fill:fit-text:none-title:short:link')).toMatchObject({ title: 'short', titleLink: 'link' });
    expect(parseName('size:fill:fit-text:none-title:short:site')).toMatchObject({ title: 'short', titleLink: 'site' });
    expect(parseName('size:fill:fit-text:none-title:short:ads')).toMatchObject({ title: 'short', titleLink: 'ads' });
    expect(parseName('size:fill:fit-text:none-title:full:whole:journal')).toMatchObject({ title: 'full', rest: 'whole', titleLink: 'journal' });
    expect(parseName('size:fill:fit-text:none-title:full:whole:site')).toMatchObject({ title: 'full', rest: 'whole', titleLink: 'site' });
    expect(parseName('size:fill:fit-text:none-title:full:whole:link')).toMatchObject({ title: 'full', rest: 'whole', titleLink: 'link' });
    expect(parseName('size:fill:fit-text:none-title:full:link')).toMatchObject({ title: 'full', rest: 'split', titleLink: 'link' });
    expect(parseName('size:fill:fit-text:none-title:short').titleLink).toBe(false);
    expect(parseName('size:fill:fit-text:none-figure:left:top:40:link')).toMatchObject({ figure: 'left', figureSize: 40, figureLink: true });
    expect(parseName('size:fill:fit-text:none-figure:left:top:40').figureLink).toBe(false);
    expect(formatName({ title: 'short', titleLink: 'link', figure: 'center', figureSize: 'auto', figureLink: true, text: 'none' }))
      .toBe('size:fill:fit-figure:center:auto:link-title:short:link-authors:none-text:none-extras:none-buttons:all');
    for (const bad of ['title:none:link', 'title:none:site', 'title:short:link:site', 'title:site', 'title:link', 'title:short:links', 'title:full:link:bold', 'figure:left:top:40:yes', 'figure:none:link', 'figure:link']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('write each look setting on its own, and the four at one step as the step', () => {
    expect(formatName({ dials: { textsize: 'compact', padding: 'standard' }, text: 'none', background: 'light' }))
      .toBe('size:fill:fit-figure:none-title:full:split-authors:none-text:none-extras:none-buttons:all-look:textsize=compact,background=light');
    expect(formatName({ width: 480, height: 120, dials: { buttons: 'display' }, text: 'none' }))
      .toBe('size:480:120-figure:none-title:full:split-authors:none-text:none-extras:none-buttons:all-look:buttons=display');
    expect(formatName({ dials: four('feature'), text: 'none' })).toMatch(/-look:feature$/);
    // standard is the own look of a card that fills its width: all four there is no look at all
    expect(formatName({ dials: four('standard'), text: 'none' })).not.toMatch(/look:/);
    expect(parseName('size:480:120-text:none-look:buttons=display').dials).toEqual({ buttons: 'display' });
    expect(parseName('size:fill:fit-text:none-look:feature,padding=minor').dials).toEqual({ ...four('feature'), padding: 'minor' });
    expect(parseName('size:fill:fit-text:none-look:standard').dials).toEqual({});
    expect(parseName('size:480:fit-text:none-look:standard').dials).toEqual(four('standard'));
  });

  it('take the text size, padding, corners and buttons as a step or a size in px', () => {
    expect(parseName('size:fill:fit-text:none-look:textsize=15.5,padding=8').dials).toEqual({ textsize: '15.5', padding: '8' });
    expect(parseName('size:fill:fit-text:none-look:textsize=8').dials.textsize).toBe('8');
    expect(parseName('size:fill:fit-text:none-look:textsize=40').dials.textsize).toBe('40');
    expect(parseName('size:fill:fit-text:none-look:padding=12').dials).toEqual({ padding: '12' });
    expect(parseName('size:fill:fit-text:none-look:feature,padding=0').dials).toEqual({ ...four('feature'), padding: '0' });
    expect(parseName('size:fill:fit-text:none-look:corners=0,buttons=12').dials).toEqual({ corners: '0', buttons: '12' });
    for (const bad of ['padding=65', 'padding=012', 'padding=-1', 'padding=1.5', 'textsize=41', 'textsize=7', 'textsize=12.25', 'textsize=08', 'corners=65', 'buttons=11', 'buttons=0']) {
      expect(() => parseName(`size:fill:fit-text:none-look:${bad}`)).toThrow();
    }
  });

  it('place my position with the buttons, or in the top or bottom strip', () => {
    expect(parseName('size:fill:fit-text:none-extras:position').posAt).toBeUndefined();
    expect(parseName('size:fill:fit-text:none-extras:position-position:top:right')).toMatchObject({ extras: ['position'], posAt: { area: 'top', h: 'right' } });
    expect(formatName({ text: 'none', extras: ['position'], posAt: { area: 'bottom', h: 'center' } })).toContain('-extras:position-position:bottom:center-');
    // A byline and my position, both.
    expect(formatName({ text: 'none', authors: 'full', extras: ['position', 'year'] })).toContain('-authors:full:plain-text:none-extras:position,year-');
    // A strip's left is its default, and the buttons' box is where it sits left out.
    expect(formatName({ text: 'none', extras: ['position'], posAt: { area: 'top', h: 'left' } })).toContain('-position:top-');
    expect(formatName({ text: 'none', extras: ['position'], posAt: { area: 'center', v: 'bottom', h: 'right' } })).not.toContain('-position:');
    expect(formatName({ text: 'none', extras: ['position'], posAt: { area: 'center', h: 'left' } })).toContain('-position:center:left-');
    // Not an area away from the buttons, and in a strip only across it.
    for (const bad of ['position:left', 'position:top:bottom', 'position:center:middle', 'authors:full:top:left', 'authors:position:top']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('place a part with the buttons, at the end away from them left out', () => {
    const at = (name, part) => placeOf(parseName(`size:fill:fit-text:none-extras:year,context-${name}`), part);
    expect(at('buttons:all', 'year')).toEqual({ area: 'center', v: 'bottom', h: 'right' });
    expect(at('buttons:all:center:right', 'year')).toEqual({ area: 'center', v: 'bottom', h: 'left' });
    expect(at('buttons:all:right', 'year')).toEqual({ area: 'right', v: 'bottom', h: 'right' });
    expect(at('buttons:all:left:center', 'context')).toEqual({ area: 'left', v: 'center', h: 'left' });
    // In the box, center alone reads as up and down; across, it follows that.
    expect(at('buttons:all:bottom-year:bottom:center', 'year')).toEqual({ area: 'bottom', v: 'center', h: 'right' });
    expect(at('buttons:all:bottom-year:bottom:bottom:center', 'year')).toEqual({ area: 'bottom', v: 'bottom', h: 'center' });
    expect(at('year:bottom:center', 'year')).toEqual({ area: 'bottom', strip: true, h: 'center' });
    expect(at('context:top', 'context')).toEqual({ area: 'top', strip: true, h: 'left' });
  });

  it('link a byline to ORCID or our papers, and size the title on its own', () => {
    expect(parseName('size:fill:fit-text:none-authors:full:marked:orcid')).toMatchObject({ authors: 'full', marks: 'marked', authorLink: 'orcid' });
    expect(parseName('size:fill:fit-text:none-authors:3:orcid')).toMatchObject({ authors: 3, marks: 'plain', authorLink: 'orcid' });
    expect(parseName('size:fill:fit-text:none-authors:full:site')).toMatchObject({ authors: 'full', marks: 'plain', authorLink: 'site' });
    expect(parseName('size:fill:fit-text:none-authors:short').authorLink).toBe(false);
    expect(formatName({ text: 'none', authors: 'full', authorLink: 'orcid' })).toContain('-authors:full:plain:orcid-');
    // Not one of the four a step sets, and standard is its own on a filling card.
    expect(parseName('size:fill:fit-text:none-look:feature,titlesize=standard').dials).toEqual({ ...four('feature'), titlesize: 'standard' });
    expect(parseName('size:fill:fit-text:none-look:titlesize=22.5').dials).toEqual({ titlesize: '22.5' });
    expect(formatName({ text: 'none', dials: { titlesize: 'display' } })).toMatch(/-look:titlesize=display$/);
    for (const bad of ['authors:full:orcid:marked', 'authors:full:bold:orcid', 'authors:full:site:orcid', 'look:titlesize=61', 'look:titlesize=7', 'look:titlesize=huge']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('place the year and the context link as my position, each where its own part puts it', () => {
    expect(parseName('size:fill:fit-text:none-extras:year-year:top:right')).toMatchObject({ yearAt: { area: 'top', h: 'right' } });
    expect(parseName('size:fill:fit-text:none-extras:context-context:bottom:right')).toMatchObject({ contextAt: { area: 'bottom', h: 'right' } });
    expect(formatName({ text: 'none', extras: ['year', 'context'], contextAt: { area: 'bottom' }, yearAt: { area: 'top', h: 'right' } })).toContain('-extras:year,context-context:bottom-year:top:right-');
    // Not shown, no place for it.
    expect(formatName({ text: 'none', extras: [], yearAt: { area: 'top' }, contextAt: { area: 'top' } })).not.toMatch(/year:|context:/);
    for (const bad of ['year:rail', 'year:right', 'year:top:middle', 'year:none', 'context:rail', 'context:right:bottom', 'context:middle']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('weigh the title, frame the figure, and space the buttons', () => {
    expect(parseName('size:fill:fit-text:none-look:titleweight=bold,frame=12,buttongap=8')).toMatchObject({ titleWeight: 'bold', frame: '12', buttonGap: '8' });
    expect(parseName('size:fill:fit-text:none-look:titleweight=mine').titleWeight).toBe('mine');
    expect(parseName('size:fill:fit-text:none-look:frame=none').frame).toBe('none');
    expect(parseName('size:fill:fit-text:none-look:frame=feature').frame).toBe('feature');
    expect(formatName({ text: 'none', titleWeight: 'regular', frame: 'none', buttonGap: '0' })).toMatch(/-look:titleweight=regular,frame=none,buttongap=0$/);
    // Or a share of a button's size.
    expect(parseName('size:fill:fit-text:none-look:buttongap=50%').buttonGap).toBe('50%');
    expect(formatName({ text: 'none', buttonGap: '100%' })).toMatch(/-look:buttongap=100%$/);
    for (const bad of ['look:titleweight=heavy', 'look:frame=33', 'look:frame=012', 'look:buttongap=33', 'look:buttongap=x', 'look:buttongap=101%', 'look:buttongap=5%%']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('set space between the slots, and write it in the grid\'s order', () => {
    const s = parseName('size:fill:fit-text:none-space:center_right=24,title_figure=flex');
    expect(s.space).toEqual({ title_figure: 'flex', center_right: '24' });
    expect(formatName(s)).toMatch(/-space:title_figure=flex,center_right=24$/);
    expect(parseName(formatName(s)).space).toEqual(s.space);
    for (const bad of [
      'space:title_words=4', 'space:title_figure=65', 'space:title_figure=auto',
      // A part's own sides were the first Space; the tracks replace them.
      'space:title.x=flex', 'space:buttons.all=4',
    ]) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('put the title in the center column, or across the top, and write it last', () => {
    expect(parseName('size:fill:fit-text:none-title:short:link').titleAt).toBe('center');
    const s = parseName('size:fill:fit-text:none-title:full:whole:journal:top');
    expect(s).toMatchObject({ title: 'full', rest: 'whole', titleLink: 'journal', titleAt: 'top' });
    expect(formatName(s)).toContain('-title:full:whole:journal:top-');
    expect(formatName(parseName('size:fill:fit-text:none-title:nick:top'))).toContain('-title:nick:top-');
    for (const bad of ['title:none:top', 'title:short:top:link', 'title:top']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('size each side apart from its figure, and place the figure in its column', () => {
    const s = parseName('size:fill:fit-text:none-figure:left:top:right:120px:link-area:right:min=80-area:left:share=25');
    expect(s).toMatchObject({ figure: 'left', figureAlign: 'top', figureH: 'right', figureSize: '120px', figureLink: true, sides: { left: { width: 'share=25' }, right: { width: 'min=80' } } });
    // Each area once, in the order top, left, right; the place across left off at center.
    expect(formatName(s)).toContain('-figure:left:top:right:120px:link-');
    expect(formatName(s)).toContain('-area:left:share=25-area:right:min=80-');
    expect(parseName('size:fill:fit-text:none-figure:right:center:center:60').figureH).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-figure:right:center:center:60'))).toContain('-figure:right:center:60-');
    expect(parseName('size:fill:fit-text:none-figure:center:40').figureSize).toBe(40);
    for (const bad of ['figure:left:top:left:5', 'figure:left:top:900px', 'figure:center:left:40', 'area:left:share=99', 'area:left:min=900',
      'area:left:wide=3', 'area:middle:min=10', 'area:left:min=10-area:left:share=20']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('slot a centered figure among the parts of the center, below the title left out', () => {
    expect(parseName('size:fill:fit-text:none-figure:center:authors:40').figureSlot).toBe('authors');
    expect(parseName('size:fill:fit-text:none-figure:center:top:40').figureSlot).toBe('top');
    expect(parseName('size:fill:fit-text:none-figure:center:title:40').figureSlot).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-figure:center:title:40'))).toContain('-figure:center:40-');
    for (const bad of ['figure:center:rail:40', 'figure:left:top:authors:40', 'figure:center:authors']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('set the text across the center, at its own size and weight', () => {
    expect(parseName('size:fill:fit-text:summary:center-look:bodysize=13.5,bodyweight=medium')).toMatchObject({ text: 'summary', textAlign: 'center', bodySize: '13.5', bodyWeight: 'medium' });
    expect(parseName('size:fill:fit-text:details:left').textAlign).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:details:right-look:bodyweight=bold'))).toMatch(/-text:details:right-.*-look:bodyweight=bold$/);
    for (const bad of ['text:none:center', 'text:summary:middle', 'look:bodysize=41', 'look:bodysize=7', 'look:bodyweight=mine']) {
      expect(() => parseName(`size:fill:fit-text:summary-${bad}`.replace('-text:summary-text', '-text'))).toThrow();
    }
  });

  it('put a status pill after the title, where the name asks', () => {
    expect(parseName('size:fill:fit-text:none-title:full:split:link:status:top:center')).toMatchObject({ titleLink: 'link', titleStatus: true, titleAt: 'top', titleAlign: 'center' });
    expect(parseName('size:fill:fit-text:none-title:short').titleStatus).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-title:nick:status'))).toContain('-title:nick:status-');
    for (const bad of ['title:none:status', 'title:short:top:status', 'title:short:status:link']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('set the title across its area, at the left left out', () => {
    expect(parseName('size:fill:fit-text:none-title:nick:top:center')).toMatchObject({ title: 'nick', titleAt: 'top', titleAlign: 'center' });
    expect(parseName('size:fill:fit-text:none-title:full:whole:link:right')).toMatchObject({ rest: 'whole', titleLink: 'link', titleAt: 'center', titleAlign: 'right' });
    expect(parseName('size:fill:fit-text:none-title:short:left').titleAlign).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-title:nick:site:top:right'))).toContain('-title:nick:site:top:right-');
    for (const bad of ['title:none:center', 'title:short:center:top', 'title:short:right:left']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('give a side its width and the corners it wins, each once', () => {
    const s = parseName('size:fill:fit-text:none-buttons:all:bottom-title:short:top-area:left:bottom,buttons,top-area:right:top');
    expect(s.sides).toEqual({ left: { width: 'buttons', top: true, bottom: true }, right: { top: true } });
    // The width first, then the corners; the sides in order.
    expect(formatName(s)).toContain('-area:left:buttons,top,bottom-area:right:top-');
    // An area alone is there, empty; the top and bottom take a height.
    expect(parseName('size:fill:fit-text:none-area:left-area:top:min=24').sides).toEqual({ left: {}, top: { height: 24 } });
    expect(formatName(parseName('size:fill:fit-text:none-area:bottom-area:right:share=20'))).toContain('-area:right:share=20-area:bottom-');
    for (const bad of ['area:top:left', 'area:left:top,top', 'area:left:min=10,share=20', 'area:left:middle', 'area:bottom:left', 'area:top:share=20', 'area:top:min=401', 'area:center']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('take a byline of so many names', () => {
    expect(parseName('size:fill:fit-text:none-authors:5')).toMatchObject({ authors: 5, marks: 'plain' });
    expect(parseName('size:fill:fit-text:none-authors:20:marked')).toMatchObject({ authors: 20, marks: 'marked' });
    expect(formatName({ text: 'none', authors: 5, marks: 'marked' })).toContain('-authors:5:marked-');
    for (const bad of ['authors:0', 'authors:21', 'authors:05', 'authors:5:bold']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('take the buttons to a row after the links', () => {
    expect(parseName('size:fill:fit-text:none-buttons:ads,code:2')).toMatchObject({ links: ['ads', 'code'], perRow: 2 });
    expect(parseName('size:fill:fit-text:none-buttons:all').perRow).toBeUndefined();
    expect(parseName('size:fill:fit-text:none-buttons:all:fit').perRow).toBe('fit');
    expect(formatName({ text: 'none', perRow: 'fit' })).toMatch(/-buttons:all:fit$/);
    expect(formatName({ text: 'none', perRow: 3 })).toMatch(/-buttons:all:3$/);
    for (const bad of ['buttons:all:0', 'buttons:all:13', 'buttons:all:02', 'buttons:all:x', 'buttons:all:2:3', 'buttons:all:fill', 'links:all']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('reject what is not a card', () => {
    for (const bad of [
      'micro', 'size:dynamic-text:none', 'size:fill:fit', 'size:fill:fit-text:title', 'size:fill:fit-text:none-extras:fig',
      'size:fill:fit-text:none-text:summary', 'size:fill:fit-text:none-buttons:ads+code', 'size:fill:fit-title:short:plain-text:none',
      'size:fill:fit-title:full:heavy-text:none', 'size:fill:fit-text:none-background:light', 'size:fill:fit-text:none-look:huge',
      'size:fill:fit-text:none-look:textsize=huge', 'size:fill:fit-text:none-look:textsize=minor,textsize=compact', 'size:fill:fit-text:none-look:type=compact',
      'size:fill:fit-text:none-look:padding=compact,standard', 'size:fill:fit-text:none-look:background=grey',
      'size:fill:fit-text:none-look:', 'size:fill:fit-text:none-look:shadow=minor',
    ]) expect(() => parseName(bad)).toThrow();
  });
});

describe('card text', () => {
  it('gives a paper its highlight as details, and the first sentence as summary unless it has its own', () => {
    const highlight = { description: 'One idea. And [more](https://x.org/a.b) of it.' };
    expect(cardText({ type: 'publication', highlight })).toEqual({ summary: 'One idea.', details: highlight.description });
    expect(cardText({ type: 'publication', summary: 'Its own.', highlight }).summary).toBe('Its own.');
    expect(cardText({ type: 'publication' })).toEqual({ summary: undefined, details: undefined });
  });

  it('gives a package its own summary, and its details or else the summary again', () => {
    expect(cardText({ type: 'software', summary: 'S.' })).toEqual({ summary: 'S.', details: 'S.' });
    expect(cardText({ type: 'software', summary: 'S.', details: 'D.' }).details).toBe('D.');
  });
});

describe('titles', () => {
  it('fall back from nick to short to full', () => {
    expect(titleOf({ title: 'T', shortTitle: 'S', nickTitle: 'N' }, 'nick')).toBe('N');
    expect(titleOf({ title: 'T', shortTitle: 'S' }, 'nick')).toBe('S');
    expect(titleOf({ title: 'T' }, 'nick')).toBe('T');
    expect(titleOf({ title: 'T' }, 'short')).toBe('T');
    expect(titleOf({ title: 'T', shortTitle: 'S' })).toBe('T');
  });
});

describe('the full title around its short one', () => {
  it('splits where the short title is part of it, keeping its own casing', () => {
    expect(splitTitle({ title: 'Stream Members Only: Data-Driven Streams', shortTitle: 'Stream Members Only' }))
      .toEqual(['', 'Stream Members Only', ': Data-Driven Streams']);
    expect(splitTitle({ title: 'Coordinax: coordinates in JAX', shortTitle: 'coordinax' }))
      .toEqual(['', 'Coordinax', ': coordinates in JAX']);
  });

  it('does not, where it is not', () => {
    expect(splitTitle({ title: 'A Constant Halo Density', shortTitle: 'SPARC Halo Density' })).toBeNull();
    expect(splitTitle({ title: 'unxt' })).toBeNull();
  });
});

describe('presets', () => {
  it('parse as the embed page has the parser, inlined on its own with nothing around it', () => {
    const inlined = new Function(`return (${parseName.toString()})`)();
    const rich = 'size:320:400-figure:center:authors:auto:link-title:nick:top:center-authors:full:marked:site-text:none-extras:venue,status,position,year,role,context-context:bottom:right-position:top-year:center:top:center-buttons:all:2:center:right-space:title_figure=8,left_center=flex-area:left:share=25,top-look:feature,titleweight=mine,frame=4,buttongap=3,background=light';
    for (const n of [...SITE_PRESETS.map((p) => p.slug), NAME, rich, 'size:fill:200-figure:left:top:right:120px-title:short-authors:5:marked:orcid-text:details-extras:none-buttons:none:right:center:left']) {
      expect(inlined(n), n).toEqual(parseName(n));
    }
  });

  it('are exactly the cards the website renders', () => {
    expect([...usedPresets()].sort()).toEqual(SITE_PRESETS.map((p) => p.slug).sort());
  });

  it('are written as the canonical name, and so is every item default', () => {
    const canonical = (n) => expect(formatName(parseName(n))).toBe(n);
    for (const p of SITE_PRESETS) canonical(p.slug);
    for (const i of items.filter((x) => CARD_TYPES.includes(x.type))) canonical(defaultSlug(i));
  });
});

describe('embeds', () => {
  it('give a status pill only to a paper not yet out', () => {
    const pubs = items.filter((i) => i.type === 'publication');
    for (const status of ['submitted', 'accepted']) {
      const p = pubs.find((i) => i.status === status);
      if (p) expect(hasStatus(p), p.id).toBe(true);
    }
    for (const status of ['published', 'in-prep']) expect(hasStatus(pubs.find((i) => i.status === status))).toBe(false);
    expect(hasStatus(items.find((i) => i.type === 'software'))).toBe(false);
  });

  it('offer each link key once', () => {
    for (const i of items.filter((x) => CARD_TYPES.includes(x.type))) {
      const keys = linkKeys(i);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
