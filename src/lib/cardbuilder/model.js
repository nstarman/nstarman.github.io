// The Card Builder's model: pure functions between the form's controls and a
// card's name, with no DOM. The page's controls are read through a FormData-
// shaped `f` — { get(name), getAll(name) } — plus the builder's own state
// (BuilderState, below), so every rule here can be tested on plain values.
//
//   readSpec(f, st)      controls → { id, it, slug, width, height, format, theme }
//   controlOps(c, ctx)   a parsed name → the writes that set the controls to it
//   fitName(name, it)    a name as it comes out for one item
//
// What a name means — and so how a card is drawn — is cardname.js's `cardFace`
// alone; nothing here decides that.
//
// BuilderState: { it, figureOn, space, areasOn, btnOrder, allLinks, limits },
// `it` the item as the builder has it (see data in tools/card.astro),
// `figureOn` the Figure pill's tick, `space` the space tracks set, `areasOn`
// the areas added with their ⊕, `btnOrder` every button key in order,
// `allLinks` the link keys the form lists, `limits` { fixedMin, fixedMax,
// fixedMinHeight, stepPx }.

import { AUTHORS_MAX, DIALS, FACES, formatName, parseName, placeOf } from '../cardname.js';

/** A whole number typed, held between lo and hi. */
export const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v || 0)));

/** A point in a box, [x, y, width, height]. */
export const inBox = (x, y, [zx, zy, zw, zh]) => x >= zx && x <= zx + zw && y >= zy && y <= zy + zh;

/** My position, the year and the context link: each one's prefix in the
 *  form, and its part in a spec. */
export const SMALL = [['pos', 'pos'], ['year', 'year'], ['ctx', 'context']];
/** Each one's key among the buttons, where its area is there, list. */
export const CELL = { pos: 'position', year: 'year', ctx: 'context' };

/** The venue's area beside the authors', as the Published row and the Authors
 *  row each name it: below the authors is the authors above it. */
export const V2A = { below: 'above', above: 'below', left: 'right', right: 'left', authors: 'shared' };
export const A2V = { above: 'below', below: 'above', right: 'left', left: 'right', shared: 'authors' };

/** The venue's area as the name has it, as its menu names it: beside the
 *  authors' is left or right of them. */
export const venueArea = (c) => (c.venueAt === 'beside' ? (c.venueFirst ? 'left' : 'right') : c.venueAt ?? 'below');

export const sameOrder = (a, b) => a.length === b.length && a.every((k, i) => k === b[i]);

/** Whether an item has an extra. */
export const has = (it, x) => ({ figure: it.figure, venue: it.venue, status: it.status, position: it.pos, students: it.students, year: it.year, role: it.role, context: it.context })[x];
/** The byline as this item can have it: none with no authors. */
export const authorsFor = (it, a) => (!it.byline ? 'none' : a);
/** The title's link as this item can have it: none to a place it has not got. */
export const linkFor = (it, l) => (l && it[l] ? l : false);

// ---- what the buttons show, in order ----

const extraOn = (f, x) => f.getAll('extra').includes(x);
/** Whether a key in the buttons' order is shown: each key ticked, each empty
 *  one, a part among the buttons where its extra is ticked, and the paper
 *  button where its pill is. */
const isShown = (f, k) => k === 'empty' || f.getAll('link').includes(k) || (k === 'paperbutton' && !!f.get('paperbtn')) || (Object.values(CELL).includes(k) && extraOn(f, k));
/** The buttons shown, in order. */
export const shownKeys = (order, f) => order.filter((k) => isShown(f, k));
export const hiddenKeys = (order, f) => order.filter((k) => !isShown(f, k));

/** The list a name writes: all, where it is the item's own order with the
 *  paper button first; else the shown in order, the paper button left out
 *  where it is first. */
export function linksOf(order, f, all) {
  const shown = shownKeys(order, f), def = [...(f.get('paperbtn') ? ['paperbutton'] : []), ...all];
  if (sameOrder(shown, def)) return 'all';
  return shown[0] === 'paperbutton' ? shown.slice(1) : shown;
}

// ---- sizes typed ----

/** The height typed, held to its range. */
export const boxHeight = (f, { fixedMinHeight, fixedMax }) => clampInt(+f.get('hpx') || 400, fixedMinHeight, fixedMax);
/** The figure's width as typed and held to its range: a share of its column,
 *  10–100, or px, 8–800. */
export const figWidth = (f) => {
  const [lo, hi] = f.get('figunit') === 'px' ? [8, 800] : [10, 100];
  return clampInt(f.get('figpx'), lo, hi);
};
/** So many names, as typed and clamped; five with nothing typed. */
export const namesN = (f) => clampInt(+f.get('authorsn') || 5, 1, AUTHORS_MAX);
/** A size typed, held to its step range: the text size to a tenth of a
 *  pixel, the rest to whole ones. */
export const typedPx = (f, d, stepPx) => {
  const unit = d === 'textsize' || d === 'titlesize' ? 10 : 1;
  return Math.min(stepPx[d].max, Math.max(stepPx[d].min, Math.round((+f.get(`${d}px`) || 0) * unit) / unit));
};

/** The preset widths: the five steps' widths for a box no wider than it is
 *  high (a 320px one reads as standard), wider for a wider box — by its
 *  width over its height, held between 1 and 2, as global.css has it. */
export const stretch = (heightSet, width, height) => (heightSet ? Math.min(2, Math.max(1, (+width || 320) / height)) : 1);
export const presetWidths = (s) => [200, 260, 320, 400, 520].map((w) => Math.round((w * s) / 10) * 10);
/** A shape, "4x5", as the height it gives a width. */
export const shapeHeight = (width, shape) => { const [a, b] = shape.split('x').map(Number); return Math.round((+width * b) / a); };

/** A box too small for the full title: of set height, at minor text. */
export const smallBox = (slug) => { const c = parseName(slug); return c.height !== 'fit' && c.dials.textsize === 'minor'; };
/** What a box takes when nothing is chosen — in a fixed minor the nick or
 *  short title and no text, else the full title — asked of the grammar
 *  itself, by leaving the part out of the current name. Text has a default
 *  only where the grammar gives one. */
export function defaultsOf(slug) {
  const c = parseName(slug.replace(/-title:[^-]+/, ''));
  const out = { title: c.title };
  if (c.title === 'full') out.rest = c.rest;
  try { out.text = parseName(slug.replace(/-text:[^-]+/, '')).text; } catch { /* no default here */ }
  return out;
}

// ---- the areas ----

/** What a side holds: its figure, its buttons, or both. */
export const sideHas = (f, { it, figureOn }, side) => f.get('foot') === side || !!(it.figure && figureOn && f.get('figat') === side);
/** The figure shown in a side, where the buttons then stack under it, at the
 *  side's foot beside the words' last line: there they have no up and down
 *  of their own. */
export const stackedIn = (f, { it, figureOn }, a) => figureOn && !!it.figure && f.get('figat') === a;

/** The sides, and the top and bottom areas, as a name has them. A side is
 *  there — holding anything, or added: its width — at least so many px,
 *  0–800; a share of the card, 5–95; or its buttons', where they are in it —
 *  and the corners it wins, where the top or bottom area holds anything;
 *  written where it was added or departs. Then the top and bottom, where
 *  added: their height, empty. */
export function sidesOf(f, st) {
  const out = {};
  for (const side of ['left', 'right']) {
    if (!sideHas(f, st, side) && !st.areasOn.has(side)) continue;
    const kind = f.get(`w${side}`) === 'set' ? f.get(`w${side}u`) : f.get(`w${side}`), n = f.get(`w${side}n`);
    const [lo, hi] = kind === 'min' ? [0, 800] : [5, 95];
    const width = kind === 'buttons' ? (f.get('foot') === side ? 'buttons' : undefined)
      : kind && n !== '' ? `${kind}=${clampInt(n, lo, hi)}` : undefined;
    const wins = f.getAll(`win${side}`);
    // A corner is won where its area is there: holding the title, the
    // buttons or a part in a strip, or added.
    const there = (end) => st.areasOn.has(end) || (end === 'top' ? f.get('titleat') === 'top' : f.get('foot') === 'bottom') || SMALL.some(([k]) => f.get(`${k}at`) === end);
    const top = wins.includes('top') && there('top'), bottom = wins.includes('bottom') && there('bottom');
    const v = { ...(width && { width }), ...(top && { top }), ...(bottom && { bottom }) };
    if (st.areasOn.has(side) || Object.keys(v).length) out[side] = v;
  }
  // An end's height where it is given, or where its part is in it — the
  // title at the top, the buttons at the bottom — and has one set.
  for (const end of ['top', 'bottom']) {
    const n = f.get(`h${end}`), h = n !== '' && n != null;
    const filled = end === 'top' ? f.get('titleat') === 'top' : f.get('foot') === 'bottom';
    if (!st.areasOn.has(end) && !(filled && h)) continue;
    out[end] = h ? { height: clampInt(n, 0, 400) } : {};
  }
  return out;
}

/** A part's place as the form has it: a strip's area and across it, or the
 *  buttons' area, up and down and across. */
export const placed = (f, k) => {
  const a = f.get(`${k}at`);
  if (a === 'list') return undefined; // among the buttons, in their order
  return a ? { area: a, h: f.get(`${k}h`) } : { area: f.get('foot'), v: f.get(`${k}v`), h: f.get(`${k}h`) };
};

/** The rows of the tuning panel this item can show: none for authors, text or
 *  a figure it has not got; a side's area only with something in it; and the
 *  top or bottom area's while it holds the title or the buttons — both sides
 *  offered beside it, whatever they hold, so the row is the same each time. */
export function canTune(t, f, st) {
  const { it, areasOn } = st;
  return !((t === 'authors' && !it.byline) || (t === 'text' && !it.text) || (t === 'paper' && !f.get('paperbtn')) || (t === 'groups' && st.allLinks.length < 2 && !st.groups?.length) || (t === 'venue' && !(it.venue && extraOn(f, 'venue'))) || (t === 'figure' && !it.figure) || (t === 'position' && !(it.pos && extraOn(f, 'position'))) || (t === 'year' && !(it.year && extraOn(f, 'year'))) || (t === 'context' && !(it.context && extraOn(f, 'context')))
    || (t === 'area-left' && !(sideHas(f, st, 'left') || areasOn.has('left'))) || (t === 'area-right' && !(sideHas(f, st, 'right') || areasOn.has('right')))
    || (t === 'area-top' && !(f.get('titleat') === 'top' || areasOn.has('top'))) || (t === 'area-bottom' && !(f.get('foot') === 'bottom' || areasOn.has('bottom'))));
}

// ---- controls → name ----

/** The controls → the card's name, written by cardname.js. */
export function readSpec(f, st) {
  const { it, space, figureOn, limits } = st;
  const { fixedMin, fixedMax, stepPx } = limits;
  const width = f.get('wmode') === 'px' ? clampInt(+f.get('px') || 320, fixedMin, fixedMax) : null;
  const height = f.get('hmode') === 'px' ? boxHeight(f, limits) : null;
  // By width belongs to a set width: there a setting left at it is left out.
  const dials = Object.fromEntries(DIALS.map((d) => [d, f.get(d)]).filter(([, v]) => v && v !== 'width'));
  // A size typed, on no step, is that many px.
  for (const d in stepPx) if (!f.get(d) && f.get(`${d}px`) !== '') dials[d] = String(typedPx(f, d, stepPx));
  const slug = formatName({
    width: width ?? 'fill', height: height ?? 'fit', dials,
    figure: !it.figure || !figureOn ? 'none' : f.get('figat'), figureAlign: f.get('figv'), figureSlot: f.get('figat') === 'center' ? f.get('figslot') : undefined, figureSize: f.get('figpx') === '' ? 'auto' : f.get('figunit') === 'px' ? `${figWidth(f)}px` : figWidth(f), figureH: ['left', 'right'].includes(f.get('figat')) && f.get('figh') !== 'center' ? f.get('figh') : undefined, sides: sidesOf(f, st), figureLink: f.get('figlink') === 'on',
    foot: f.get('foot'), footEnd: f.get('footend'), railAlign: f.get('railalign'), titleWeight: f.get('titleweight') || undefined, frame: f.get('framepx') !== '' ? String(clampInt(f.get('framepx'), 0, 32)) : f.get('frame') || undefined, buttonGap: f.get('bgap') !== '' ? (f.get('bgapu') === '%' ? `${clampInt(f.get('bgap'), 0, 100)}%` : String(clampInt(f.get('bgap'), 0, 32))) : undefined, partGap: f.get('partgap') !== '' ? String(Math.min(32, Math.max(0, Math.round(+f.get('partgap') * 10) / 10))) : undefined, space: { ...space }, title: f.get('title'), titleLink: linkFor(it, f.get('titlelink')), titleAt: f.get('titleat'), titleV: f.get('titleat') === 'top' ? f.get('titlev') : undefined, venueName: f.get('venuename') === 'short' && it.vshort ? 'short' : undefined, venueLink: f.get('venuelink') === 'none' && it.vlink ? false : undefined, venueDate: f.get('venuedate') ? undefined : false, venueArxiv: f.get('venuearxiv') ? undefined : false, paperButton: f.get('paperbtn') && it.byline ? { label: f.get('paperlabel') === 'icon' ? 'icon' : /^[A-Za-z0-9]{1,16}$/.test(f.get('paperword')) ? f.get('paperword') : 'paper', ...(f.get('paperto') && { to: f.get('paperto') }), ...(f.get('papercolor') && { color: f.get('papercolor') }) } : undefined, venueAt: { below: undefined, above: 'above', left: 'beside', right: 'beside', authors: 'authors' }[f.get('venueline')], venueFirst: f.get('venueline') === 'left' || (f.get('venueline') === 'authors' && f.get('venueorder') === 'before') ? true : undefined, venueSplit: ['left', 'right'].includes(f.get('venueline')) && f.get('vsplitn') !== '' ? (f.get('vsplitu') === 'px' ? `${clampInt(f.get('vsplitn'), 20, 800)}px` : String(clampInt(f.get('vsplitn'), 5, 95))) : undefined, venueAlign: ['below', 'above'].includes(f.get('venueline')) && f.get('venuealign') !== 'left' ? f.get('venuealign') : undefined, authorsFit: f.get('authorsfit') ? true : undefined, titleAlign: f.get('titlealign'), textAlign: f.get('textalign') !== 'left' ? f.get('textalign') : undefined, sizes: Object.fromEntries(FACES.filter((p) => f.get(`${p}size`)).map((p) => [p, String(Math.min(40, Math.max(8, Math.round(+f.get(`${p}size`) * 10) / 10)))])), weights: Object.fromEntries(FACES.filter((p) => f.get(`${p}weight`)).map((p) => [p, f.get(`${p}weight`)])), styles: Object.fromEntries(['title', ...FACES].filter((p) => f.get(`${p}style`) === 'italic').map((p) => [p, 'italic'])), fonts: Object.fromEntries(['title', ...FACES].filter((p) => f.get(`${p}face`)).map((p) => [p, f.get(`${p}face`)])), titleStatus: f.get('titlestatus') && it.tstatus ? true : undefined, rest: f.get('rest') || 'split',
    authors: authorsFor(it, f.get('authors') === 'n' ? namesN(f) : f.get('authors')), marks: f.get('marks'), authorLink: f.get('authorlink') || false, posAt: placed(f, 'pos'), yearAt: placed(f, 'year'), contextAt: placed(f, 'ctx'), text: it.text ? f.get('text') : 'none',
    extras: f.getAll('extra').filter((x) => has(it, x)), links: mainLinks(linksOf(st.btnOrder, f, st.allLinks), st.groups), groups: st.groups ?? [], perRow: f.get('perrow') ? clampInt(f.get('perrow'), 1, 12) : f.get('perp') === 'fit' ? 'fit' : undefined, background: f.get('background'),
  });
  return { id: f.get('card'), it, slug, width, height, format: f.get('format'), theme: f.get('theme') };
}

/** The link keys an item's card shows of its own accord: all but the optional ones (a package's
 *  stars, under STARS_MIN), which are in `it.links` last-flagged, to be named. */
export const ownKeys = (it) => it.links.filter((l) => !l[3]).map(([k]) => k);

/** The first group's keys, less any another group has: a key is in one. The
 *  builder has controls for the first group; another is carried as the name
 *  has it, until it has controls of its own. */
export const mainLinks = (links, groups) => (Array.isArray(links) && groups?.length ? links.filter((k) => !groups.some((g) => Array.isArray(g.links) && g.links.includes(k) && k !== 'empty')) : links);

/** The keys another group has: shown there, so ticked, but not in the first. */
export const claimed = (groups) => new Set((groups ?? []).flatMap((g) => (Array.isArray(g.links) ? g.links.filter((k) => k !== 'empty') : [])));

/** What only the first group has: the paper button and the parts among the buttons. */
export const FIRST_ONLY = ['paperbutton', 'year', 'position', 'context'];

/** The areas another group may be in, and where a new one goes: the other side,
 *  or the bottom for buttons under the words. */
export const GROUP_AREAS = ['left', 'center', 'right', 'bottom', 'top'];
export const otherArea = (mainArea) => ({ left: 'right', right: 'left', center: 'bottom', bottom: 'right' }[mainArea] ?? 'right');

/** A new group in an area, its place there the area's own. */
export const newGroup = (area, links) => ({ links, area, ...(area === 'left' || area === 'right' ? { v: 'top' } : {}) });

/**
 * A button moved: out of one group, into another — at a place in it, or into
 * the group that has an area, or a new one — or just moved along in its own.
 * Pure: the first group's shown keys in order (main), the other groups (each
 * { links, area, v?, h?, perRow? }) and the first's area. Returns them anew;
 * unchanged where the move is not allowed — the paper button and the parts
 * among the buttons stay in the first group — and a group left with no button
 * is gone, its empty rooms with it.
 * @param {{ main: string[], groups: object[], mainArea: string }} s
 * @param {{ key: string, from: { group: number, index: number }, to: { group: number, index?: number } | { area: string } }} m
 */
export function regroup({ main, groups, mainArea }, { key, from, to }) {
  const lists = [main.slice(), ...groups.map((g) => g.links.slice())];
  // The group it goes to: the first, another — or none yet, for a new one in an area.
  const there = to.area != null ? groups.findIndex((g) => g.area === to.area) : -1;
  const into = to.area != null ? (to.area === mainArea ? 0 : there >= 0 ? there + 1 : -1) : to.group;
  if (FIRST_ONLY.includes(key) && into !== 0) return { main, groups, moved: false };
  if (lists[from.group]?.[from.index] !== key) return { main, groups, moved: false };
  lists[from.group].splice(from.index, 1);
  const next = groups.map((g, i) => ({ ...g, links: lists[i + 1] }));
  if (into === 0) lists[0].splice(to.index ?? lists[0].length, 0, key);
  else if (into < 0) next.push(newGroup(to.area, [key]));
  else next[into - 1].links.splice(to.index ?? next[into - 1].links.length, 0, key);
  return { main: lists[0], groups: next.filter((g) => g.links.some((k) => k !== 'empty')), moved: true };
}

// ---- name → controls ----

/** A name, parsed, as the writes that set the controls to it, in order, and
 *  the builder state it brings. An extra the item has not got stays off.
 *
 *  ops: ['set', name, value] — the control's value; ['radio', name, value] —
 *  a menu's or radio group's choice, '' too, none checked on null; ['check',
 *  name, bool]; ['checks', name, [values]] — each control of that name
 *  checked where its value is listed.
 *  state: { areasOn, space, btnOrder, lastAreas } — lastAreas undefined to
 *  keep what it was. */
export function controlOps(c, { it, stepPx, framePx }) {
  const ops = [];
  const set = (name, value) => ops.push(['set', name, value]);
  const radio = (name, value) => ops.push(['radio', name, value]);
  const check = (name, value) => ops.push(['check', name, !!value]);
  set('wmode', c.width === 'fill' ? 'fill' : 'px');
  set('hmode', c.height === 'fit' ? 'fit' : 'px');
  if (c.width !== 'fill') set('px', c.width);
  for (const d of DIALS) radio(d, c.dials[d] ?? (c.width === 'fill' ? 'standard' : 'width'));
  // A title size of a step shows as its px, there being no stops for it.
  const ts = c.dials.titlesize;
  radio('titlesize', ts ? '' : 'text');
  if (ts && !/^\d/.test(ts)) set('titlesizepx', stepPx.titlesize[ts]);
  for (const d in stepPx) if (/^\d/.test(c.dials[d] ?? '')) set(`${d}px`, c.dials[d]); // a size, on no step
  if (c.height !== 'fit') set('hpx', c.height);
  check('eb-figure-on', c.figure !== 'none');
  if (c.figure !== 'none') set('figat', c.figure);
  set('figv', c.figureAlign ?? 'center');
  set('figpx', c.figureSize === 'auto' ? '' : parseInt(c.figureSize, 10));
  set('figunit', typeof c.figureSize === 'string' && c.figureSize.endsWith('px') ? 'px' : '%');
  set('figh', c.figureH ?? 'center');
  set('figslot', c.figureSlot ?? 'title');
  const areasOn = new Set(Object.keys(c.sides ?? {}));
  for (const end of ['top', 'bottom']) set(`h${end}`, c.sides?.[end]?.height ?? '');
  for (const side of ['left', 'right']) {
    const { width = '', top, bottom } = c.sides?.[side] ?? {};
    const [kind, n = ''] = width.split('=');
    radio(`w${side}`, ['min', 'share'].includes(kind) ? 'set' : kind);
    if (['min', 'share'].includes(kind)) set(`w${side}u`, kind);
    set(`w${side}n`, n);
    ops.push(['checks', `win${side}`, [top && 'top', bottom && 'bottom'].filter(Boolean)]);
  }
  check('figlink', c.figureLink);
  set('foot', c.foot);
  set('footend', c.footEnd ?? 'top');
  set('railalign', c.railAlign ?? (['left', 'right'].includes(c.foot) ? c.foot : 'left'));
  set('titleweight', c.titleWeight ?? '');
  const framePxTyped = /^[0-9]/.test(c.frame ?? '');
  // A step, as its px: the box has no steps of its own.
  const frameStep = framePx[c.frame];
  radio('frame', framePxTyped || frameStep ? null : c.frame ?? '');
  set('framepx', framePxTyped ? c.frame : frameStep ?? '');
  set('bgap', c.buttonGap != null ? parseInt(c.buttonGap, 10) : '');
  set('bgapu', c.buttonGap?.endsWith('%') ? '%' : 'px');
  set('partgap', c.partGap ?? '');
  set('perrow', typeof c.perRow === 'number' ? c.perRow : '');
  radio('perp', typeof c.perRow === 'number' ? '' : c.perRow === 'fit' ? 'fit' : 'square');
  set('title', c.title);
  set('rest', c.rest ?? 'split');
  radio('titlelink', c.titleLink || '');
  set('titleat', c.titleAt ?? 'center');
  set('titlealign', c.titleAlign ?? 'left');
  set('titlev', c.titleV ?? 'top');
  check('paperbtn', c.paperButton);
  set('paperlabel', c.paperButton?.label === 'icon' ? 'icon' : 'word');
  set('paperword', c.paperButton && c.paperButton.label !== 'icon' ? c.paperButton.label : 'paper');
  set('paperto', c.paperButton?.to ?? '');
  set('papercolor', c.paperButton?.color ?? '');
  radio('venuename', c.venueName ?? 'full');
  radio('venueline', venueArea(c));
  radio('authorsline', V2A[venueArea(c)]);
  set('vsplitn', c.venueSplit ? parseInt(c.venueSplit, 10) : '');
  set('vsplitu', /px$/.test(c.venueSplit ?? '') ? 'px' : '%');
  set('venueorder', c.venueFirst ? 'before' : 'after');
  set('authorsorder', c.venueFirst ? 'after' : 'before');
  check('authorsfit', c.authorsFit);
  radio('venuelink', c.venueLink === false ? 'none' : 'journal');
  check('venuedate', c.venueDate !== false);
  check('venuearxiv', c.venueArxiv !== false);
  set('venuealign', c.venueAlign ?? 'left');
  check('titlestatus', c.titleStatus);
  set('textalign', c.textAlign ?? 'left');
  for (const p of ['title', ...FACES]) set(`${p}style`, c.styles?.[p] ?? '');
  for (const p of ['title', ...FACES]) set(`${p}face`, c.fonts?.[p] ?? '');
  for (const p of FACES) {
    set(`${p}size`, c.sizes?.[p] ?? '');
    radio(`${p}by`, c.sizes?.[p] ? '' : 'text');
    set(`${p}weight`, c.weights?.[p] ?? '');
  }
  set('authors', typeof c.authors === 'number' ? 'n' : c.authors);
  set('authorsn', typeof c.authors === 'number' ? c.authors : '');
  // My position, the year and the context link: the area — '' for the
  // buttons' own — and the place there, as the name has them or, left out,
  // as they then sit.
  for (const [k, part] of SMALL) {
    const pl = placeOf(c, part);
    radio(`${k}at`, pl.strip ? pl.area : '');
    if (pl.v) set(`${k}v`, pl.v);
    set(`${k}h`, pl.h);
  }
  radio('authorlink', c.authorLink || '');
  set('marks', c.marks ?? 'plain');
  set('background', c.background);
  set('text', c.text);
  ops.push(['checks', 'extra', c.extras]);
  // `all` is the keys a card shows of its own accord; the optional ones are ticked only where named.
  const keys = it.links.map(([k]) => k), own = ownKeys(it);
  // Another group that is all is the keys no other list has, so it is a list too.
  const listedElsewhere = new Set([...(c.links === 'all' ? [] : c.links), ...(c.groups ?? []).flatMap((g) => (g.links === 'all' ? [] : g.links))]);
  const groups = (c.groups ?? []).map((g) => (g.links === 'all' ? { ...g, links: own.filter((k) => !listedElsewhere.has(k)) } : g));
  const others = [...claimed(groups)].filter((k) => keys.includes(k));
  ops.push(['checks', 'link', [...(c.links === 'all' ? own : c.links), ...others.filter((k) => !(c.links === 'all' ? own : c.links).includes(k))]]);
  const listed = c.links === 'all' ? own : c.links.filter((k) => ['empty', 'paperbutton', ...Object.values(CELL)].includes(k) || keys.includes(k));
  const btnOrder = [...(listed.includes('paperbutton') ? [] : ['paperbutton']), ...listed, ...others.filter((k) => !listed.includes(k)), ...keys.filter((k) => !listed.includes(k) && !others.includes(k))];
  // A part the name lists among the buttons has its area there.
  for (const [k] of SMALL) if (listed.includes(CELL[k])) radio(`${k}at`, 'list');
  const venue = venueArea(c);
  return { ops, state: { areasOn, space: { ...(c.space ?? {}) }, btnOrder, groups, lastAreas: venue !== 'authors' ? venue : undefined } };
}

/** A preset as it comes out for this item: the extras it has not got drop,
 *  so an item with no figure still matches the default. */
export function fitName(name, it) {
  const c = parseName(name);
  // A list of buttons to keep, read against the links this item has.
  const keys = it.links.map(([k]) => k), own = ownKeys(it);
  // The paper button where this item can have one; a part among the
  // buttons where it shows; and the paper button first, as left out.
  const paperButton = it.byline && Object.values(it.paperTo).some(Boolean) ? c.paperButton : undefined;
  const listed = c.links === 'all' ? own : c.links.filter((k) => k === 'empty' || keys.includes(k) || (k === 'paperbutton' && paperButton) || (Object.values(CELL).includes(k) && c.extras.includes(k) && has(it, k)));
  const kept = listed[0] === 'paperbutton' ? listed.slice(1) : listed;
  // Another group of buttons keeps the keys the item has, and goes if it has none.
  const groups = (c.groups ?? []).map((g) => (g.links === 'all' ? g : { ...g, links: g.links.filter((k) => k === 'empty' || keys.includes(k)) })).filter((g) => g.links === 'all' || g.links.some((k) => k !== 'empty'));
  return formatName({ ...c, groups, paperButton, links: sameOrder(kept, own) ? 'all' : kept, extras: c.extras.filter((x) => has(it, x)), authors: authorsFor(it, c.authors), titleLink: linkFor(it, c.titleLink), titleStatus: c.titleStatus && !!it.tstatus ? true : undefined, figure: it.figure ? c.figure : 'none',
    rest: c.rest ?? 'split', text: it.text ? c.text : 'none' });
}
