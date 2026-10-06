// /embed/index.json — every embeddable card and how to ask for it. The
// machine-readable half of the Card Builder: another repo picks an item and a
// preset here and builds the URL, rather than scraping pages.
import { items } from '../../lib/data.js';
import {
  LOOKS, DIALS, PAPER_TO, FIGURE_AT, FIGURE_ALIGN, FIGURE_SLOTS, FOOT_AT, FOOT_END, RAIL_ALIGN, SPACE_TRACKS, FIXED_MIN_HEIGHT, TEXTS, TITLES, AUTHORS, AUTHORS_MAX, FACES, EXTRAS, BACKGROUNDS, FIXED_MIN, FIXED_MAX, SITE_PRESETS, CARD_TYPES, defaultSlug, hasFigure, linkKeys, embedHref, siteHref,
} from '../../lib/cards.js';

export function GET({ site }) {
  const abs = (p) => new URL(p, site).href;
  const body = {
    url: abs('/embed/{id}/?card={name}'),
    name: 'size:<fill|px>:<fit|px>-figure:<none|center[:slot]:size|side:v[:h]:size>[:link]-title:<full[:whole|split]|short|nick|none>[:link|site|ads|journal][:status][:top[:top|center|bottom]][:center|right]-area:<left|right>[:min=px|share=%|buttons][,top][,bottom]-area:<top|bottom>[:min=px]-authors:<none|short|full|n>[:fit][:plain|marked][:orcid|site]-text:<none|summary|details>[:center|right]-extras:<none|a,b>-venue:<full|short>[:unlinked][:undated][:noarxiv][:above][:center|right]|[:authors[:before]]|[:beside[:before][:<%|px>]]-context:<place>-position:<place>-year:<place>-buttons:<all|none|a,b>[:per-row|:fit][:<side>[:v][:h]|:<center|bottom>[:h]]-paper:<word|icon>[:journal|arxiv|ads|site][:grey]-space:<a_b>=<px|flex>,…-look:<setting>=<value>,…  (textsize, padding, corners, buttons, titlesize, titleweight, <part>size, <part>weight, <part>style, <part>face, frame, buttongap, partgap, background; the first four at one step written as the step)',
    axes: {
      size: { width: `fill, or px ${FIXED_MIN}–${FIXED_MAX}`, height: `fit, or px ${FIXED_MIN_HEIGHT}–${FIXED_MAX}` },
      figure: { none: true, at: FIGURE_AT, v: FIGURE_ALIGN, h: ['left', 'center', 'right'], slot: FIGURE_SLOTS, size: 'auto, filling its column; a share of its column, 10–100; or its own width, 8–800px' },
      paper: { label: 'a word, 1–16 letters or digits, or icon', to: PAPER_TO, color: ['grey'] },
      buttonsAt: { area: FOOT_AT, v: 'in a side: ' + FOOT_END.join(', '), h: RAIL_ALIGN },
      place: { area: 'top, the buttons\u2019 own area, or bottom where the buttons are not', v: 'with the buttons: ' + FOOT_END.join(', '), h: RAIL_ALIGN },
      area: { left: 'there, even empty; its width — min=<0–800 px>, share=<5–95 %> or buttons, left out fitting what is in it, or 3em empty — then top and bottom, the corners it wins over the top and bottom areas', right: 'as left', top: 'there, even empty; its height empty, min=<0–400 px>, or a line\u2019s', bottom: 'as top' },
      title: { length: TITLES, rest: ['split', 'whole'], link: ['link', 'site', 'ads', 'journal'], status: 'status, a pill after it for a paper not yet out', at: ['center', 'top'], v: FOOT_END, align: RAIL_ALIGN }, authors: { length: [...AUTHORS, `1–${AUTHORS_MAX}`], fit: 'fit, after the length: fewer names where they would run past one line', marks: ['plain', 'marked'], link: ['orcid', 'site'] }, text: TEXTS, extras: EXTRAS, venue: { name: ['full', 'short'], link: 'unlinked to leave the name words', date: 'undated to leave out the year', arxiv: 'noarxiv for none where it is in no journal yet', at: ['below', 'above', 'authors', 'beside'], before: 'before, in the authors\u2019 area or beside it: ahead of them', split: 'beside: the left column\u2019s width, 5–95 (%) or 20–800px', align: RAIL_ALIGN }, context: 'a place', position: 'a place', year: 'a place',
      buttons: { keys: 'all, none, or a comma list, in order, of an item\u2019s link keys, each once, and of empty (as often as asked), paperbutton, year, position and context', groups: 'buttons may be given again: each part after the first is another group, with its own keys, count to a row, area (left, center, right, bottom, or top, a strip) and place; each key is in one group', perRow: ':1–12 to a row, or :fit, as many as fit' },
      look: { ...Object.fromEntries(DIALS.map((d) => [d, `${LOOKS.join(', ')}, or px: ${{ textsize: '8–40, to a tenth', padding: '0–64', corners: '0–64', buttons: '12–64' }[d]}`])), titlesize: `${LOOKS.join(', ')}, or px: 8–60`, titleweight: ['regular', 'medium', 'bold', 'mine'], ...Object.fromEntries(FACES.flatMap((f) => [[`${f}size`, 'px, 8–40, to a tenth'], [`${f}weight`, ['regular', 'medium', 'bold']]])), ...Object.fromEntries(['title', ...FACES].map((f) => [`${f}style`, ['normal', 'italic']])), ...Object.fromEntries(['title', ...FACES].map((f) => [`${f}face`, ['sans', 'serif', 'mono']])), frame: `none, ${LOOKS.join(', ')}, or px: 0–32`, buttongap: 'px, 0–32, or 0–100% of a button\u2019s size', partgap: 'px, 0–32, to a tenth: the space above each part', background: BACKGROUNDS },
      space: { between: SPACE_TRACKS, value: 'px, 0–64, or flex' },
    },
    resize: abs('/embed/resize.js'),
    presets: SITE_PRESETS,
    items: items.filter((i) => CARD_TYPES.includes(i.type)).map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      href: embedHref(i),
      site: siteHref(i) && abs(siteHref(i)),
      page: abs(`/embed/${i.id}/`),
      default: defaultSlug(i),
      figure: hasFigure(i),
      links: linkKeys(i, true),
    })),
  };
  return new Response(`${JSON.stringify(body, null, 2)}\n`, { headers: { 'Content-Type': 'application/json' } });
}
