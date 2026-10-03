// /embed/index.json — every embeddable card and how to ask for it. The
// machine-readable half of the Card Builder: another repo picks an item and a
// preset here and builds the URL, rather than scraping pages.
import { items } from '../../lib/data.js';
import {
  LOOKS, DIALS, FIGURE_AT, FIGURE_ALIGN, FIGURE_SLOTS, FOOT_AT, FOOT_END, RAIL_ALIGN, SPACE_TRACKS, FIXED_MIN_HEIGHT, TEXTS, TITLES, AUTHORS, FACES, EXTRAS, BACKGROUNDS, FIXED_MIN, FIXED_MAX, SITE_PRESETS, CARD_TYPES, defaultSlug, hasFigure, linkKeys, embedHref, siteHref,
} from '../../lib/cards.js';

export function GET({ site }) {
  const abs = (p) => new URL(p, site).href;
  const body = {
    url: abs('/embed/{id}/?card={name}'),
    name: 'size:<fill|px>:<fit|px>-figure:<none|center[:slot]:size|side:v[:h]:size>[:link]-title:<…>[:link][:status][:top][:center|right]-area:<left|right>:[min=px|share=%|buttons][,top][,bottom]-authors:<…>-text:<…>[:center|right]-extras:<none|a,b>-venue:<full|short>[:unlinked][:undated][:above][:center|right]|[:authors[:before]]-context:<place>-position:<place>-year:<place>-buttons:<all|none|a,b>[:per-row|:fit][:<side>[:v][:h]|:<center|bottom>[:h]]-paper:<word|icon>[:journal|arxiv|ads|site]-space:<a_b>=<px|flex>,…-look:<setting>=<value>,…  (textsize, padding, corners, buttons, titlesize, titleweight, frame, buttongap, background; the first four at one step written as the step)',
    axes: {
      size: { width: `fill, or px ${FIXED_MIN}–${FIXED_MAX}`, height: `fit, or px ${FIXED_MIN_HEIGHT}–${FIXED_MAX}` },
      figure: { none: true, at: FIGURE_AT, v: FIGURE_ALIGN, h: ['left', 'center', 'right'], slot: FIGURE_SLOTS, size: 'auto, filling its column; a share of its column, 10–100; or its own width, 8–800px' },
      paper: { label: 'a word, 1–16 letters or digits, or icon', to: ['journal', 'arxiv', 'ads', 'site'] },
      buttonsAt: { area: FOOT_AT, v: 'in a side: ' + FOOT_END.join(', '), h: RAIL_ALIGN },
      place: { area: 'top, the buttons\u2019 own area, or bottom where the buttons are not', v: 'with the buttons: ' + FOOT_END.join(', '), h: RAIL_ALIGN },
      area: { left: 'there, even empty; its width — min=<0–800 px>, share=<5–95 %> or buttons, left out fitting what is in it, or 3em empty — then top and bottom, the corners it wins over the top and bottom areas', right: 'as left', top: 'there, even empty; its height empty, min=<0–400 px>, or a line\u2019s', bottom: 'as top' },
      title: TITLES, titleAt: ['center', 'top'], titleAlign: RAIL_ALIGN, titleV: FOOT_END, authors: AUTHORS, authorsFit: 'fit, after the length: fewer names where they would run past one line', text: TEXTS, extras: EXTRAS, venue: { name: ['full', 'short'], link: 'unlinked to leave the name words', date: 'undated to leave out the year', align: RAIL_ALIGN }, context: 'a place', position: 'a place', year: 'a place',
      buttons: 'all, none, or a comma list of an item’s link keys; then :1–12 to a row, or :fit, as many as fit',
      look: { ...Object.fromEntries(DIALS.map((d) => [d, `${LOOKS.join(', ')}, or px: ${{ textsize: '8–40, to a tenth', padding: '0–64', corners: '0–64', buttons: '12–64' }[d]}`])), titlesize: `${LOOKS.join(', ')}, or px: 8–60`, titleweight: ['regular', 'medium', 'bold', 'mine'], ...Object.fromEntries(FACES.flatMap((f) => [[`${f}size`, 'px, 8–40, to a tenth'], [`${f}weight`, ['regular', 'medium', 'bold']]])), frame: `none, ${LOOKS.join(', ')}, or px: 0–32`, buttongap: 'px, 0–32, or 0–100% of a button\u2019s size', background: BACKGROUNDS },
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
      links: linkKeys(i),
    })),
  };
  return new Response(`${JSON.stringify(body, null, 2)}\n`, { headers: { 'Content-Type': 'application/json' } });
}
