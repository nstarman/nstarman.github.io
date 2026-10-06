import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LOOKS, FIGURE_AT, FIGURE_ALIGN, FOOT_AT, FOOT_END, TEXTS, TITLES, AUTHORS, EXTRAS, BACKGROUNDS, SITE_PRESETS, PRESET, STEP_PX, FRAME_PX, CARD_TYPES, formatName, parseName, placeOf, cardFace, cardFacts, defaultSlug, linkKeys, cardLinks, starLabel, STARS_MIN, cardText, hasStatus, paperHref,
  FACES, SPACE_TRACKS, FIGURE_SLOTS, PAPER_TO, DIALS,
} from '../src/lib/cards.js';
import { items, titleOf, splitTitle } from '../src/lib/data.js';
import { file, snippet } from '../src/lib/cardexport.js';

/** Every preset a component or page passes to Card: by its key,
 *  preset={PRESET.<key>}, or as a name written out, preset="…". */
function usedPresets(dir = 'src', out = { keys: new Set(), written: new Set() }) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) usedPresets(p, out);
    else if (e.name.endsWith('.astro')) {
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/<Card\b[^>]*\bpreset=\{PRESET\.(\w+)\}/g)) out.keys.add(m[1]);
      for (const m of src.matchAll(/<Card\b[^>]*\bpreset="([^"]+)"/g)) out.written.add(m[1]);
    }
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
    expect(formatName(parseName('size:fill:fit-text:none-space:center_bottom=4,top_right=2,top_center=12'))).toMatch(/-space:top_center=12,top_right=2,center_bottom=4$/);
    for (const bad of [
      'space:title_words=4', 'space:title_figure=65', 'space:title_figure=auto',
      // The top area's space is padding, or the row under the title: a length.
      'space:top_center=flex', 'space:top_left=flex',
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
    expect(parseName('size:fill:fit-text:summary:center-look:bodysize=13.5,bodyweight=medium')).toMatchObject({ text: 'summary', textAlign: 'center', sizes: { body: '13.5' }, weights: { body: 'medium' } });
    expect(parseName('size:fill:fit-text:details:left').textAlign).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:details:right-look:bodyweight=bold'))).toMatch(/-text:details:right-.*-look:bodyweight=bold$/);
    for (const bad of ['text:none:center', 'text:summary:middle', 'look:bodysize=41', 'look:bodysize=7', 'look:bodyweight=mine', 'look:titlesize2=9', 'look:extrasweight=bold', 'look:yearsize=12.25']) {
      expect(() => parseName(`size:fill:fit-text:summary-${bad}`.replace('-text:summary-text', '-text'))).toThrow();
    }
  });

  it('give each part with words its own size and weight, in a fixed order', () => {
    const s = parseName('size:fill:fit-text:summary-look:contextweight=bold,authorssize=12.5,venueweight=medium,yearsize=9,positionsize=10');
    expect(s.sizes).toEqual({ authors: '12.5', year: '9', position: '10' });
    expect(s.weights).toEqual({ context: 'bold', venue: 'medium' });
    expect(formatName(s)).toMatch(/-look:authorssize=12\.5,venueweight=medium,positionsize=10,yearsize=9,contextweight=bold$/);
  });

  it('keep the buttons in the order the name lists them', () => {
    expect(parseName('size:fill:fit-text:none-buttons:code,ads,preprint:right').links).toEqual(['code', 'ads', 'preprint']);
    expect(formatName(parseName('size:fill:fit-text:none-buttons:code,ads,preprint:right'))).toContain('-buttons:code,ads,preprint:right');
    // Empty ones, as many as asked, each a button's room with nothing in it.
    expect(parseName('size:fill:fit-text:none-buttons:empty,ads,empty,empty,preprint:3').links).toEqual(['empty', 'ads', 'empty', 'empty', 'preprint']);
    // The year, my position, the context link and the paper button, among them.
    expect(formatName(parseName('size:fill:fit-text:none-extras:year-buttons:year,paperbutton,ads:right'))).toContain('-buttons:year,paperbutton,ads:right');
  });

  it('give a paper a button of words, linked to its article, else arXiv', () => {
    expect(parseName('size:fill:fit-text:none-buttons:all-paper:paper')).toMatchObject({ paperButton: { label: 'paper' } });
    expect(parseName('size:fill:fit-text:none-buttons:all-paper:icon:ads').paperButton).toEqual({ label: 'icon', to: 'ads' });
    expect(parseName('size:fill:fit-text:none-buttons:all-paper:paper:grey').paperButton).toEqual({ label: 'paper', color: 'grey' });
    expect(formatName(parseName('size:fill:fit-text:none-buttons:all-paper:pdf:arxiv:grey'))).toMatch(/-paper:pdf:arxiv:grey$/);
    expect(formatName(parseName('size:fill:fit-text:none-paper:PDF:arxiv-buttons:all'))).toMatch(/-buttons:all-paper:PDF:arxiv$/);
    for (const bad of ['paper', 'paper:read:doi', 'paper:a-b', 'paper:waytoolongforabutton', 'paper:pdf:arxiv:ads', 'paper:pdf:grey:arxiv', 'paper:pdf:blue']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
    const out = { type: 'publication', status: 'published', venue: { journal: 'X' }, links: [{ rel: 'paper', url: 'https://j' }], arxiv: '2401.00001' };
    expect(paperHref(out)).toBe('https://j');
    expect(paperHref({ type: 'publication', arxiv: '2401.00001' })).toBe('https://arxiv.org/abs/2401.00001');
    expect(paperHref({ type: 'publication' })).toBeNull();
    expect(paperHref(out, 'arxiv')).toBe('https://arxiv.org/abs/2401.00001');
    expect(paperHref({ type: 'software', arxiv: '2401.00001' })).toBeNull();
    // So many buttons wide: the glyph one, a short word two, a long one more.
    const span = (label) => cardFace(parseName(`${NAME}-paper:${label}`), { ...cardFacts(items.find((i) => paperHref(i))), every: false }).style['--pn'];
    expect([span('icon'), span('pdf'), span('paper'), span('manuscript')]).toEqual([1, 2, 2, 4]);
    expect(paperHref({ ...out, status: 'submitted' }), 'not out yet: arXiv').toBe('https://arxiv.org/abs/2401.00001');
  });

  it('fit the byline to one line, where the name asks', () => {
    expect(parseName('size:fill:fit-authors:full:fit:marked:orcid-text:none')).toMatchObject({ authors: 'full', authorsFit: true, marks: 'marked', authorLink: 'orcid' });
    expect(parseName('size:fill:fit-authors:5:plain-text:none').authorsFit).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-authors:short:fit-text:none'))).toContain('-authors:short:fit:plain-');
    for (const bad of ['authors:full:plain:fit', 'authors:none:fit', 'authors:fit']) expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
  });

  it('set the venue line short, undated and across, where extras has it', () => {
    expect(parseName('size:fill:fit-text:none-extras:venue-venue:short:undated:right')).toMatchObject({ venueName: 'short', venueDate: false, venueAlign: 'right' });
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:full:unlinked:undated'))).toContain('-venue:full:unlinked:undated-');
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:full:undated:noarxiv:authors'))).toContain('-venue:full:undated:noarxiv:authors-');
    expect(parseName('size:fill:fit-text:none-look:yearstyle=italic,titlestyle=normal').styles).toEqual({ year: 'italic' });
    expect(formatName(parseName('size:fill:fit-text:none-look:yearface=serif,titleface=mono'))).toMatch(/-look:titleface=mono,yearface=serif$/);
    expect(() => parseName('size:fill:fit-text:none-look:titleface=comic')).toThrow();
    expect(formatName(parseName('size:fill:fit-text:none-look:yearstyle=italic,venuestyle=italic'))).toMatch(/-look:venuestyle=italic,yearstyle=italic$/);
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:full:center'))).toContain('-extras:venue-venue:full:center-');
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:full:left'))).not.toContain('-venue:');
    expect(formatName(parseName('size:fill:fit-text:none-extras:none-venue:short'))).not.toContain('-venue:');
    expect(parseName('size:fill:fit-text:none-extras:venue-venue:short:authors')).toMatchObject({ venueAt: 'authors' });
    expect(parseName('size:fill:fit-text:none-extras:venue-venue:short:above:right')).toMatchObject({ venueAt: 'above', venueAlign: 'right' });
    expect(parseName('size:fill:fit-text:none-extras:venue-venue:short:authors:before')).toMatchObject({ venueAt: 'authors', venueFirst: true });
    expect(parseName('size:fill:fit-text:none-extras:venue-venue:short:beside')).toMatchObject({ venueAt: 'beside' });
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:full:beside:before'))).toContain('-venue:full:beside:before-');
    expect(parseName('size:fill:fit-text:none-extras:venue-venue:full:beside:before:40').venueSplit).toBe('40');
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:full:beside:120px'))).toContain('-venue:full:beside:120px-');
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:short:authors:before'))).toContain('-venue:short:authors:before-');
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:full:undated:above'))).toContain('-venue:full:undated:above-');
    expect(parseName('size:fill:fit-text:none-extras:venue-venue:short:authors').venueAlign).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-extras:venue-venue:full:undated:authors'))).toContain('-venue:full:undated:authors-');
    for (const bad of ['venue:abbr', 'venue:short:right:undated', 'venue:undated', 'venue:full:middle', 'venue:full:undated:unlinked', 'venue:full:authors:right', 'venue:full:above:authors', 'venue:full:right:above', 'venue:full:before', 'venue:full:right:before', 'venue:full:authors:after', 'venue:full:above:beside', 'venue:full:beside:right', 'venue:full:beside:96', 'venue:full:beside:4', 'venue:full:beside:900px', 'venue:full:authors:40']) {
      expect(() => parseName(`size:fill:fit-text:none-extras:venue-${bad}`)).toThrow();
    }
  });

  it('put a status pill after the title, where the name asks', () => {
    expect(parseName('size:fill:fit-text:none-title:full:split:link:status:top:top:center')).toMatchObject({ titleLink: 'link', titleStatus: true, titleAt: 'top', titleAlign: 'center' });
    expect(parseName('size:fill:fit-text:none-title:short').titleStatus).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-title:nick:status'))).toContain('-title:nick:status-');
    for (const bad of ['title:none:status', 'title:short:top:status', 'title:short:status:link']) {
      expect(() => parseName(`size:fill:fit-text:none-${bad}`)).toThrow();
    }
  });

  it('set the title up and down the top area, a center alone up and down', () => {
    expect(parseName('size:fill:fit-text:none-title:nick:top:center')).toMatchObject({ titleAt: 'top', titleV: 'center' });
    expect(parseName('size:fill:fit-text:none-title:nick:top:bottom:right')).toMatchObject({ titleV: 'bottom', titleAlign: 'right' });
    expect(parseName('size:fill:fit-text:none-title:nick:top:top').titleV).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-title:nick:top:bottom:center'))).toContain('-title:nick:top:bottom:center-');
    expect(formatName(parseName('size:fill:fit-text:none-title:nick:top:top'))).toContain('-title:nick:top-');
  });

  it('set the title across its area, at the left left out', () => {
    expect(parseName('size:fill:fit-text:none-title:nick:top:top:center')).toMatchObject({ title: 'nick', titleAt: 'top', titleAlign: 'center' });
    expect(formatName(parseName('size:fill:fit-text:none-title:nick:top:top:center'))).toContain('-title:nick:top:top:center-');
    expect(parseName('size:fill:fit-text:none-title:full:whole:link:right')).toMatchObject({ rest: 'whole', titleLink: 'link', titleAt: 'center', titleAlign: 'right' });
    expect(parseName('size:fill:fit-text:none-title:short:left').titleAlign).toBeUndefined();
    expect(formatName(parseName('size:fill:fit-text:none-title:nick:site:top:right'))).toContain('-title:nick:site:top:right-');
    for (const bad of ['title:none:center', 'title:short:center:top', 'title:short:right:left', 'title:short:bottom', 'title:none:link']) {
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
  it('parse, and make the same card, as the embed page has them, inlined on their own with nothing around them', () => {
    const [inlined, face] = new Function(`${placeOf.toString()}\n${cardFace.toString()}\nreturn [(${parseName.toString()}), cardFace];`)();
    const rich = 'size:320:400-figure:center:authors:auto:link-title:nick:top:center-authors:full:marked:site-text:none-extras:venue,status,position,students,year,role,context-context:bottom:right-position:top-year:center:top:center-buttons:all:2:center:right-space:title_figure=8,left_center=flex-area:left:share=25,top-look:feature,titleweight=mine,frame=4,buttongap=3,background=light';
    for (const n of [...SITE_PRESETS.map((p) => p.slug), NAME, rich, 'size:fill:200-figure:left:top:right:120px-title:short-authors:5:marked:orcid-text:details-extras:none-buttons:none:right:center:left']) {
      expect(inlined(n), n).toEqual(parseName(n));
      for (const i of items.filter((x) => CARD_TYPES.includes(x.type)).slice(0, 12)) expect(face(inlined(n), cardFacts(i, true)), n).toEqual(cardFace(parseName(n), cardFacts(i, true)));
    }
  });

  it('are exactly the cards the website renders', () => {
    const used = usedPresets();
    expect([...used.written]).toEqual([]);
    expect([...used.keys].sort()).toEqual(Object.keys(PRESET).sort());
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

describe('the grammar, at its edges', () => {
  const B = 'size:fill:fit-text:none';
  const throws = (n) => expect(() => parseName(n), n).toThrow();
  it('writes four equal sizes in px each, a step alone being only a step', () => {
    for (const width of ['fill', 320]) {
      const n = formatName({ width, text: 'none', dials: { textsize: '16', padding: '16', corners: '16', buttons: '16' } });
      expect(n).toContain('look:textsize=16,padding=16,corners=16,buttons=16');
      expect(formatName(parseName(n))).toBe(n);
    }
  });
  it('takes each button and extra once, but empty as often as asked, and all or none alone', () => {
    for (const n of ['all,ads', 'none,ads', 'ads,ads', 'ads,cod', 'arxiv']) throws(`${B}-buttons:${n}`);
    expect(parseName(`${B}-buttons:empty,ads,empty`).links).toEqual(['empty', 'ads', 'empty']);
    throws(`${B}-extras:venue,venue`);
    expect(parseName(`${B}-extras:year,position`).extras).toEqual(['position', 'year']);
  });
  it('takes an empty area\'s height once, even a 0', () => {
    throws(`${B}-area:top:min=0,min=24`);
    expect(parseName(`${B}-area:top:min=0`).sides.top.height).toBe(0);
  });
  it('reads and writes the space above each part, in px to a tenth', () => {
    expect(formatName(parseName(`${B}-look:partgap=8.8`))).toContain('look:partgap=8.8');
    expect(cardFace(parseName(`${B}-look:partgap=8.8`), cardFacts(items[0])).style['--gr']).toBe('8.8px');
    for (const n of ['33', '8.85', '-1']) throws(`${B}-look:partgap=${n}`);
  });
  it('writes a space of 0, and none for no space at all', () => {
    expect(formatName({ text: 'none', space: { title_figure: 0 } })).toContain('space:title_figure=0');
    expect(formatName({ text: 'none', space: { title_figure: undefined } })).not.toContain('space');
    expect(formatName({})).toContain('-text:none-');
  });
  it('accepts every value the exported lists offer, which parseName writes out on its own', () => {
    for (const p of FACES) for (const k of ['size=12', 'weight=bold', 'style=italic', 'face=mono']) parseName(`${B}-look:${p}${k}`);
    for (const t of SPACE_TRACKS) parseName(`${B}-space:${t}=4`);
    for (const slot of FIGURE_SLOTS) parseName(`${B}-figure:center:${slot}:auto`);
    for (const to of PAPER_TO) parseName(`${B}-paper:paper:${to}`);
    for (const d of DIALS) for (const step of LOOKS) parseName(`${B}-look:${d}=${step}`);
  });
  it('writes every name it reads as one it reads back the same', () => {
    // A seeded walk through the axes, mixed: each name written is a fixed point.
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const maybe = (x) => (rnd() < 0.5 ? x : '');
    for (let k = 0; k < 3000; k += 1) {
      const foot = pick(['center', 'bottom', 'left', 'right']);
      const parts = [
        `size:${pick(['fill', '320'])}:${pick(['fit', '160'])}`,
        pick(['figure:none', `figure:center${maybe(':authors')}:${pick(['auto', '40', '120px'])}${maybe(':link')}`, `figure:${pick(['left', 'right'])}:${pick(['top', 'center', 'bottom'])}${maybe(':right')}:auto`]),
        pick(['title:none', `title:${pick(['full:whole', 'full:split', 'short', 'nick'])}${maybe(':link')}${maybe(':status')}${maybe(':top:center')}${maybe(':right')}`]),
        pick(['authors:none', `authors:${pick(['short', 'full', '5'])}${maybe(':fit')}:${pick(['plain', 'marked'])}${maybe(':orcid')}`]),
        pick(['text:none', `text:${pick(['summary', 'details'])}:${pick(['left', 'center'])}`]),
        `extras:${['venue', 'status', 'position', 'year', 'context'].filter(() => rnd() < 0.5).join(',') || 'none'}`,
        maybe(`venue:${pick(['full', 'short'])}${maybe(':undated')}${pick(['', ':above', ':authors:before', ':beside:40'])}`),
        maybe(`year:${pick(['top:right', 'bottom', foot])}`),
        `buttons:${pick(['all', 'none', 'ads,code', 'empty,ads,empty', 'year,paperbutton'])}${maybe(':3')}:${foot}`,
        maybe(`paper:${pick(['paper', 'icon'])}${maybe(':arxiv')}${maybe(':grey')}`),
        maybe(`space:${pick(['title_figure=flex', 'center_right=24,top_left=0'])}`),
        maybe(`look:${pick(['feature', 'textsize=15.5', 'padding=0,yearstyle=italic', 'frame=4,buttongap=50%'])}`),
      ].filter(Boolean);
      let spec;
      try { spec = parseName(parts.join('-')); } catch { continue; }
      const once = formatName(spec);
      expect(formatName(parseName(once)), once).toBe(once);
    }
  });
  it('sets a short last row at the right from the last part listed among the buttons', () => {
    const it0 = items.find((i) => i.type === 'publication' && linkKeys(i).length >= 3 && cardFacts(i).year);
    const keys = linkKeys(it0).slice(0, 3);
    const f = cardFace(parseName(`${B}-extras:year-buttons:${keys[0]},year,${keys[1]},${keys[2]}:2:right`), cardFacts(it0));
    // The rows after the year: two buttons, a whole row — so no skip.
    expect(f.seq.some((x) => x.skip)).toBe(false);
    const g = cardFace(parseName(`${B}-extras:year-buttons:${keys[0]},${keys[1]},year,${keys[2]}:2:right`), cardFacts(it0));
    expect(g.seq.find((x) => x.skip)?.link).toBe(linkKeys(it0).indexOf(keys[2]));
  });
});

describe('the students extra', () => {
  const led = items.find((i) => i.id === 'potamides-joss');
  const stu = (name, item = led) => cardFace(parseName(name), cardFacts(item)).data.stustamp;
  const base = (x) => `size:fill:fit-figure:none-title:short-authors:none-text:none-extras:${x}-buttons:none`;
  it('shows the students beside my position, only where it is named', () => {
    expect(stu(base('position,students'))).toBeDefined();
    expect(stu(base('position'))).toBeUndefined();
  });
  it('stands alone, but needs a student among the authors', () => {
    expect(stu(base('students'))).toBeDefined();
    expect(stu(base('position,students'), items.find((i) => i.id === 'galactic-amnesia'))).toBeUndefined();
  });
});

describe('the Card Builder\'s snippets', () => {
  const s = { id: 'x', it: { title: 'A [b] "c"', href: 'https://e.org/a (b)' }, slug: 'size:fill:fit-text:none', width: null, format: 'markdown', theme: 'auto' };
  it('name a file for its card, a hash where the name would run too long', () => {
    expect(file(s, 'light')).toBe('x--size_fill_fit-text_none-light.png');
    const long = file({ ...s, slug: SITE_PRESETS.find((p) => p.key === 'assist').slug }, 'dark');
    expect(long.length).toBeLessThan(40);
    expect(long).toMatch(/^x--[0-9a-z]+-dark\.png$/);
  });
  it('escape what the item gives them', () => {
    expect(snippet(s, { site: 'https://s', height: 100 })).toBe('[![A \\[b\\] "c"](x--size_fill_fit-text_none-light.png)](<https://e.org/a (b)>)');
    expect(snippet({ ...s, it: { title: 'a\\[b' } }, { site: '', height: 0 })).toBe('![a\\\\\\[b](x--size_fill_fit-text_none-light.png)');
    expect(snippet({ ...s, format: 'html', theme: 'light' }, { site: 'https://s', height: 100 })).toContain('alt="A [b] &quot;c&quot;"');
  });
});

describe('the Card Builder\'s steps in px', () => {
  // A length in global.css as px at the root's 16px: .72rem, calc(.72rem *
  // 1.08), 10px.
  const css = fs.readFileSync('src/styles/global.css', 'utf8');
  const px = (v) => {
    const m = /^calc\(([\d.]+)rem \* ([\d.]+)\)$/.exec(v);
    return m ? +m[1] * +m[2] * 16 : v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v);
  };
  const of = (attr, prop, step) => px(new RegExp(`\\.card\\[data-${attr}="${step}"\\]\\{[^}]*${prop}:([^;}]+)`).exec(css)[1].trim());
  it('are the stylesheet\'s, to half a pixel', () => {
    const PROP = { textsize: '--fs', titlesize: '--ts', padding: '--pad-t', corners: '--rad', buttons: '--ib' };
    for (const [d, prop] of Object.entries(PROP)) for (const step of LOOKS) expect(Math.abs(STEP_PX[d][step] - of(d, prop, step)), `${d} ${step}`).toBeLessThanOrEqual(0.5);
    for (const step of LOOKS) expect(Math.abs(FRAME_PX[step] - of('frame', '--frame', step)), `frame ${step}`).toBeLessThanOrEqual(0.5);
  });
});

describe('the stars button', () => {
  const counts = JSON.parse(fs.readFileSync('config/stars.json', 'utf8')).stars;
  const software = items.filter((i) => i.type === 'software' && i.repo);

  it('reads the count as a short label', () => {
    expect(starLabel(0)).toBe('0');
    expect(starLabel(657)).toBe('657');
    expect(starLabel(1234)).toBe('1.2k');
  });

  it('has a count for every package, so no card is without its button', () => {
    for (const i of software) expect(counts[i.repo], `${i.id}: run node scripts/collect-stars.mjs`).toBeGreaterThanOrEqual(0);
    expect(Object.keys(counts).sort()).toEqual([...new Set(software.map((i) => i.repo))].sort());
  });

  it('can be named among a card’s buttons, placed or left out, like any other', () => {
    const base = 'size:fill:fit-figure:none-title:full:whole:link-authors:none-text:details-extras:none';
    for (const keys of ['stars', 'code,stars', 'stars,code,docs', 'all']) expect(() => parseName(`${base}-buttons:${keys}:fit`), keys).not.toThrow();
    // Every key a card can offer is one a name can ask for.
    for (const i of software) for (const k of linkKeys(i)) expect(() => parseName(`${base}-buttons:${k}`), `${i.id} ${k}`).not.toThrow();
  });

  it('is the last link of a package with enough stars, to its stargazers, and of nothing else', () => {
    for (const i of software.filter((x) => counts[x.repo] >= STARS_MIN)) {
      const star = cardLinks(i).at(-1);
      expect(star, i.id).toMatchObject({ rel: 'stars', url: `https://github.com/${i.repo}/stargazers`, count: starLabel(counts[i.repo]) });
      expect(linkKeys(i)).toContain('stars');
    }
    for (const i of items.filter((x) => x.type !== 'software' && CARD_TYPES.includes(x.type))) expect(linkKeys(i)).not.toContain('stars');
  });

  it('is not there for a package under STARS_MIN', () => {
    expect(STARS_MIN).toBe(40);
    const few = software.filter((x) => counts[x.repo] < STARS_MIN);
    expect(few.length, 'a package under the threshold, to hold it to').toBeGreaterThan(0);
    for (const i of few) expect(linkKeys(i), i.id).not.toContain('stars');
    // Every package that has a button has at least that many.
    for (const i of software.filter((x) => linkKeys(x).includes('stars'))) expect(counts[i.repo], i.id).toBeGreaterThanOrEqual(STARS_MIN);
  });
});
});
