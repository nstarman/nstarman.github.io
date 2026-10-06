// The Card Builder's preview: the live card in its frame, made a place to
// point. Each part of the card is outlined and a click brings up what tunes
// it; parts are dragged between the areas they may sit in, the authors and the
// venue about each other, and the link buttons among themselves. The ⊕ buttons
// and grips are overlay.js's.
//
// attachPreview(frame, b) wires one loaded preview frame; `b` is the builder
// (see builder.js) — its form, state and the few methods these call back.

import previewCss from '../../styles/card-builder-preview.css?raw';
import { FIGURE_SLOTS } from '../cardname.js';
import { inBox } from './model.js';
import { cellGrid, partZones, venueDrops } from './geometry.js';
import { drag, shownIn } from './dom.js';
import { attachGrip, attachPlus, attachSize } from './overlay.js';

// The preview's hitboxes: each part of the card, outlined, brings up what
// tunes it — first match wins, so a link button beats the box it sits in,
// and the card itself is what is left: its padding and edge.
export const HITS = [
  // One rule: a click brings up the settings of what was clicked, and only
  // those — a part's own row, an area's, the card's.
  ['.c-foot .iconbtn', ['foot']],
  ['.c-paperbtn', ['paper']],
  ['.c-fig', ['figure']],
  ['.c-name', ['title']],
  // The authors' line is an area apart from what is in it: the names, the
  // authors', and the venue after them, the venue's — the line itself
  // outlined, its own room bringing up nothing.
  ['.c-byvenue', ['venue']],
  [':is(.c-by-tight, .c-by-short, .c-by-full, .c-by-n)', ['authors']],
  ['.c-by', []],
  ['.c-text', ['text']],
  // My position and the year are parts of their own, together or apart.
  ['.c-place', ['position']],
  [':is(.c-yr, .c-year)', ['year']],
  ['.c-stamp', ['position']],
  ['.c-context', ['context']],
  ['.c-refs', ['foot']],
  ['.c-venue', ['venue']],
  [':is(.c-xfoot, .btns[data-xg])', ['groups']],
  ['.c-foot', ['foot']],
  // An area, apart from what is in it: clicking its empty room.
  ['.eb-area', []],
  ['.card', ['padding', 'corners', 'background']],
];

// The preview's stylesheet, with the outline rule given every part's selector.
const HIT_CSS = previewCss.replace('__HIT_SELECTORS__', HITS.slice(0, -1).map(([q]) => q).join(', '));

export function attachPreview(frame, b) {
  const { form, el, tune, setRadio, stackedIn, moveButton, st } = b;
  const doc = frame.contentDocument;
  if (!doc || doc.getElementById('eb-hit-css')) return;
  const style = doc.createElement('style');
  style.id = 'eb-hit-css';
  style.textContent = HIT_CSS;
  doc.head.append(style);
  doc.documentElement.classList.add('eb-hits');
  attachGrip(frame, b);
  attachPlus(frame, b);
  attachSize(frame, b);
  // A part is what it is; what is left — the card's own room, the box a
  // buttons' box fills its side with, or a title's box past its words — is the
  // area under the pointer, where there is one, not the part that happens
  // to fill it.
  const areaAt = (x, y) => [...doc.querySelectorAll('.eb-area')].find((a) => {
    const r = a.getBoundingClientRect();
    return inBox(x, y, [r.left, r.top, r.width, r.height]);
  });
  const onWords = (el, x, y) => {
    const r = doc.createRange();
    r.selectNodeContents(el);
    return [...r.getClientRects()].some((b) => x >= b.left - 2 && x <= b.right + 2 && y >= b.top - 2 && y <= b.bottom + 2);
  };
  const find = (t, x, y) => {
    if (t.closest?.('.eb-plus, .eb-band, .eb-area-grip, .eb-size-grip, .eb-areabtn')) return null;
    for (const [q, keys] of HITS) {
      const el = t.closest?.(q);
      if (!el) continue;
      const area = q === '.eb-area' ? el : (q === '.card' || q === '.c-foot' || (q === '.c-name' && !onWords(el, x, y))) && areaAt(x, y);
      return area ? { el: area, keys: [`area-${area.dataset.area}`] } : { el, keys };
    }
    return null;
  };
  // A part dragged between the areas it may sit in. Each part has its own
  // places and the setting that puts it there; dragged, the part follows
  // the pointer and its places are outlined, the one under the pointer
  // filled. Held half a second over one, that area opens into the
  // positions the part may take there — up and down by across, as its
  // position menus have them — and dropped on one, it goes there too;
  // dropped elsewhere in the area, only the area changes. A press that does
  // not move past 4px is still a click.
  const box = () => form.elements.foot.value;
  const V = ['top', 'center', 'bottom'], H = ['left', 'center', 'right'];
  const axis = (name, values) => ({ name, values });
  const small = (name, part, k) => ({ name, part, areas: () => [...new Set(['top', box(), 'bottom'])], now: () => form.elements[name].value || box(), value: (a) => (a === box() ? '' : a),
    axes: (a) => (a === box() ? { v: axis(`${k}v`, V), h: axis(`${k}h`, H) } : { h: axis(`${k}h`, H) }) });
  const side = (a) => a === 'left' || a === 'right';
  const MOVES = [
    { q: '.c-name', name: 'titleat', part: 'title', areas: () => ['top', 'center'], now: () => form.elements.titleat.value, value: (a) => a,
      axes: (a) => (a === 'top' ? { v: axis('titlev', V), h: axis('titlealign', H) } : { h: axis('titlealign', H) }) },
    { q: ':is(.c-yr, .c-year)', ...small('yearat', 'year', 'year') },
    { q: ':is(.c-place, .c-stamp)', ...small('posat', 'position', 'pos') },
    { q: '.c-context', ...small('ctxat', 'context', 'ctx') },
    { q: '.c-fig', name: 'figat', part: 'figure', areas: () => ['left', 'center', 'right'], now: () => form.elements.figat.value, value: (a) => a,
      // In the center, its slots among the parts — above the title only
      // where the title is not up in the top area.
      axes: (a) => (side(a) ? { v: axis('figv', V), h: axis('figh', H) }
        : { v: axis('figslot', FIGURE_SLOTS.filter((x) => x !== 'top' || form.elements.titleat.value !== 'top')) }) },
    { q: '.c-foot', name: 'foot', part: 'foot', areas: () => ['left', 'center', 'right', 'bottom'], now: box, value: (a) => a,
      axes: (a) => (side(a) && !stackedIn(a) ? { v: axis('footend', V), h: axis('railalign', H) } : { h: axis('railalign', H) }) },
  ];
  const SLOT_NAMES = { top: 'above title', title: 'below title', authors: 'below authors', venue: 'below venue', text: 'below text' };
  let dragged = false;
  doc.addEventListener('dragstart', (e) => e.preventDefault());
  // The authors and the venue, each an element in an area. Dragged by its
  // words, an element goes into the other's area, before or after what is
  // there — or, sharing one, back to its own. Dragged by its area — its
  // room, or within 5px of its edge — an area goes above, below, left or
  // right of the other's. The words stay put; a tag with the part's name
  // follows the pointer. Each drop is the Area and Order menus of both.
  doc.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest?.('.eb-plus, .eb-band, .eb-area-grip, .eb-split-grip, .eb-areabtn, .eb-fig-grip')) return;
    const card = doc.querySelector('.card'), d = card.dataset;
    if (!('venue' in d) || !('authors' in d)) return;
    const NAMES = '.c-by-tight, .c-by-short, .c-by-full, .c-by-n';
    const by = card.querySelector(':scope > .c-by'), vline = card.querySelector(':scope > .c-venue');
    const shared = d.venueat === 'authors', beside = d.venueat === 'beside';
    const seen = (q) => shownIn(by, q);
    // Each one's area: its line, or, beside, its column; sharing, the one line.
    const areaOf = { authors: beside ? seen(NAMES) : by, venue: shared ? by : beside ? seen('.c-byvenue') : vline };
    const t = e.target;
    const edge = (el) => {
      const b = el.getBoundingClientRect(), dx = Math.min(e.clientX - b.left, b.right - e.clientX), dy = Math.min(e.clientY - b.top, b.bottom - e.clientY);
      return Math.min(dx, dy) >= -3 && Math.min(dx, dy) <= 5;
    };
    let part = null, isArea = false;
    // An area by its room or its edge — but for one shared, which has no
    // other to move about.
    if (!shared) for (const p of ['venue', 'authors']) if (areaOf[p] && (t === areaOf[p] || edge(areaOf[p]))) { part = p; isArea = true; break; }
    if (!part) part = t.closest?.('.c-byvenue') || (vline.contains(t) && t !== vline) ? 'venue' : t.closest?.(NAMES) ? 'authors' : null;
    if (!part) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const venue = part === 'venue', other = areaOf[venue ? 'authors' : 'venue'];
    const r = card.getBoundingClientRect(), R = other.getBoundingClientRect();
    // Where each drop puts the venue's area, as the Published row's menus
    // have it: an area about the other's; an element into it, or out.
    const { zones: ZONES, put: PUT } = venueDrops({ isArea, venue, shared, box: [R.left - r.left, R.top - r.top, R.width, R.height], lastAreas: st.lastAreas });
    const x0 = e.clientX, y0 = e.clientY;
    let on = false, over = null, tag = null;
    const move = (ev) => {
      if (!on && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return;
      if (!on) {
        on = true;
        for (const [k, [zx, zy, zw, zh]] of Object.entries(ZONES)) {
          const z = doc.createElement('span');
          z.className = 'eb-drop eb-cell';
          z.dataset.drop = k;
          z.textContent = k;
          Object.assign(z.style, { left: `${zx}px`, top: `${zy}px`, width: `${zw}px`, height: `${zh}px` });
          card.append(z);
        }
        tag = doc.createElement('span');
        tag.className = 'eb-ghost';
        tag.textContent = `${venue ? 'Published' : 'Authors'}${isArea ? ' area' : ''}`;
        card.append(tag);
      }
      const px = ev.clientX - r.left, py = ev.clientY - r.top;
      Object.assign(tag.style, { left: `${px + 8}px`, top: `${py + 8}px` });
      over = Object.keys(ZONES).find((k) => inBox(px, py, ZONES[k])) ?? null;
      for (const z of card.querySelectorAll('.eb-cell')) z.classList.toggle('eb-drop-on', z.dataset.drop === over);
    };
    const up = () => {
      if (!on) return;
      dragged = true; // the click that follows the drop is no click
      card.querySelectorAll('.eb-cell, .eb-ghost').forEach((z) => z.remove());
      if (!over) return;
      const [line, order] = PUT[over];
      const set = (n, v) => { form.elements[n].value = v; form.elements[n].dispatchEvent(new Event('change', { bubbles: true })); };
      set('venueline', line);
      if (order) set('venueorder', order);
      tune([venue ? 'venue' : 'authors']);
    };
    drag(doc, move, up, true);
  }, true);
  // A button dragged: dropped by another of its group, it takes its place — the
  // order line's < and >, by the pointer; by a button of another group, it goes
  // into that group there; and on an area, out of its group into the one that
  // has the area, or a new one. The paper button and the parts among the
  // buttons stay in the first group, so they only move along in it.
  doc.addEventListener('pointerdown', (e) => {
    const li = e.button === 0 && !e.target.closest?.('.eb-plus, .eb-band, .eb-area-grip, .eb-split-grip, .eb-areabtn, .eb-fig-grip') && e.target.closest?.(':is(.c-foot, .c-xfoot) li[data-rel]');
    if (!li) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const card = doc.querySelector('.card');
    const shown = (x) => x.dataset.rel && x.getClientRects().length;
    const sibsOf = (x) => [...x.parentElement.children].filter(shown);
    const groupOf = (x) => +(x.parentElement.dataset.g ?? 0);
    const key = li.dataset.rel, from = { group: groupOf(li), index: sibsOf(li).indexOf(li) };
    const every = () => [...card.querySelectorAll(':is(.c-foot, .c-xfoot) li[data-rel]')].filter((x) => x !== li && x.getClientRects().length);
    // Where it may go to: an area, each a zone to drop on.
    const areas = b.groupsOf && !['paperbutton', 'year', 'position', 'context'].includes(key) ? ['left', 'center', 'right', 'bottom', 'top'] : [];
    const r = card.getBoundingClientRect(), cs = frame.contentWindow.getComputedStyle(card), cols = cs.gridTemplateColumns.split(' ').map(parseFloat);
    const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), W = r.width, H = r.height;
    const name = card.querySelector(':scope > .c-name'), foot = card.querySelector(':scope > .c-foot');
    const T = Math.max(22, card.dataset.titleat === 'top' && name ? name.getBoundingClientRect().bottom - r.top : parseFloat(cs.paddingTop));
    const B = Math.max(22, card.dataset.foot === 'bottom' && foot ? r.bottom - foot.getBoundingClientRect().top : parseFloat(cs.paddingBottom));
    const L = cols[0] > 1 ? pl + cols[0] + cols[1] / 2 : Math.max(28, W / 6), R = cols[4] > 1 ? pr + cols[4] + cols[3] / 2 : Math.max(28, W / 6);
    const zones = partZones({ W, H, T, B, L, R });
    const x0 = e.clientX, y0 = e.clientY;
    let on = false, over = null, zone = null;
    const move = (ev) => {
      if (!on) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return;
        on = true;
        li.classList.add('eb-dragging');
        for (const a of areas) {
          const [zx, zy, zw, zh] = zones[a], z = doc.createElement('span');
          z.className = 'eb-drop';
          z.dataset.drop = a;
          Object.assign(z.style, { left: `${zx}px`, top: `${zy}px`, width: `${zw}px`, height: `${zh}px` });
          card.append(z);
        }
      }
      li.style.translate = `${ev.clientX - x0}px ${ev.clientY - y0}px`;
      // The button nearest the pointer, in any group, but this one — within its width.
      const near = every().map((x) => { const q = x.getBoundingClientRect(); return [x, Math.hypot(ev.clientX - (q.left + q.width / 2), ev.clientY - (q.top + q.height / 2))]; }).sort((a, c) => a[1] - c[1])[0];
      over = near && near[1] < near[0].getBoundingClientRect().width ? near[0] : null;
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      zone = over ? null : areas.find((a) => inBox(x, y, zones[a])) ?? null;
      for (const q of every()) q.classList.toggle('eb-drop-on-btn', q === over);
      for (const z of card.querySelectorAll('.eb-drop')) z.classList.toggle('eb-drop-on', z.dataset.drop === zone);
    };
    const up = () => {
      if (!on) return;
      dragged = true; // the click that follows the drop is no click
      li.classList.remove('eb-dragging');
      li.style.translate = '';
      card.querySelectorAll('.eb-drop').forEach((z) => z.remove());
      for (const q of every()) q.classList.remove('eb-drop-on-btn');
      if (over) {
        const to = { group: groupOf(over), index: sibsOf(over).indexOf(over) };
        // Among its own group's, the first's as the order line has it.
        if (to.group === 0 && from.group === 0) moveButton(from.index, to.index);
        else b.moveKey({ key, from, to });
      } else if (zone) b.moveKey({ key, from, to: { area: zone } });
    };
    drag(doc, move, up, true);
  }, true);
  doc.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest?.('.eb-plus, .eb-band, .eb-area-grip, .eb-areabtn, .eb-fig-grip')) return;
    const m = MOVES.find((x) => e.target.closest?.(x.q));
    const card = doc.querySelector('.card'), part = m && e.target.closest(m.q);
    if (!part || !card.contains(part)) return;
    e.preventDefault();
    // Where each of its areas is, near enough to drop into, whether it is
    // there or not: the top a band above the center's parts, the bottom one
    // below them, each side its column or, not there, a sixth of the card;
    // the center the rest — the card shared among its own areas alone.
    const areas = m.areas();
    const cs = frame.contentWindow.getComputedStyle(card), r = card.getBoundingClientRect(), W = r.width, H = r.height;
    const cols = cs.gridTemplateColumns.split(' ').map(parseFloat), pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight);
    const name = card.querySelector(':scope > .c-name'), foot = card.querySelector(':scope > .c-foot');
    const T = !areas.includes('top') ? 0 : Math.max(22, card.dataset.titleat === 'top' && name ? name.getBoundingClientRect().bottom - r.top : parseFloat(cs.paddingTop));
    const B = !areas.includes('bottom') ? 0 : Math.max(22, card.dataset.foot === 'bottom' && foot ? r.bottom - foot.getBoundingClientRect().top : parseFloat(cs.paddingBottom));
    const L = !areas.includes('left') ? 0 : cols[0] > 1 ? pl + cols[0] + cols[1] / 2 : Math.max(28, W / 6);
    const R = !areas.includes('right') ? 0 : cols[4] > 1 ? pr + cols[4] + cols[3] / 2 : Math.max(28, W / 6);
    const zones = partZones({ W, H, T, B, L, R });
    const x0 = e.clientX, y0 = e.clientY;
    const at = (x, y) => areas.find((z) => inBox(x, y, zones[z]));
    let on = false, over = null, timer = null, open = null, cell = null;
    // The positions in an area: its zone cut into up-and-down rows and
    // across columns, a menu's values each.
    const grid = (a) => {
      const ax = m.axes(a), vs = ax.v?.values ?? [null], hs = ax.h?.values ?? [null];
      return { ax, vs, hs, ...cellGrid(zones[a], a, vs, hs) };
    };
    const inGrid = (g, x, y) => inBox(x, y, [g.zx, g.zy, g.zw, g.zh]);
    const openCells = (a) => {
      const g = grid(a);
      g.vs.forEach((v, i) => g.hs.forEach((h, j) => {
        const c = doc.createElement('span');
        c.className = 'eb-drop eb-cell';
        c.dataset.v = v ?? '';
        c.dataset.h = h ?? '';
        // The figure's slots are named; a grid's cells speak for themselves.
        if (g.ax.v?.name === 'figslot') c.textContent = SLOT_NAMES[v];
        Object.assign(c.style, { left: `${g.zx + j * g.w}px`, top: `${g.zy + i * g.h}px`, width: `${g.w}px`, height: `${g.h}px` });
        card.append(c);
      }));
      open = a;
    };
    const move = (ev) => {
      if (!on) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return;
        on = true;
        try { part.setPointerCapture(e.pointerId); } catch { /* a pointer already gone */ }
        part.classList.add('eb-dragging');
        for (const a of areas) {
          const [zx, zy, zw, zh] = zones[a], z = doc.createElement('span');
          z.className = 'eb-drop';
          z.dataset.drop = a;
          Object.assign(z.style, { left: `${zx}px`, top: `${zy}px`, width: `${zw}px`, height: `${zh}px` });
          card.append(z);
        }
      }
      part.style.translate = `${ev.clientX - x0}px ${ev.clientY - y0}px`;
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      // An area open keeps the pointer while it is over its positions.
      const a = open && inGrid(grid(open), x, y) ? open : at(x, y), was = over;
      over = areas.includes(a) ? a : null;
      // A new area: its positions open after half a second there.
      if (over !== was) {
        clearTimeout(timer);
        card.querySelectorAll('.eb-cell').forEach((c) => c.remove());
        open = cell = null;
        if (over) timer = setTimeout(() => { openCells(over); move(ev); }, 500);
      }
      for (const z of card.querySelectorAll('.eb-drop:not(.eb-cell)')) z.classList.toggle('eb-drop-on', z.dataset.drop === over);
      if (open) {
        const g = grid(open), clamp = (n, k) => Math.min(k - 1, Math.max(0, Math.floor(n)));
        cell = { v: g.vs[clamp((y - g.zy) / g.h, g.vs.length)], h: g.hs[clamp((x - g.zx) / g.w, g.hs.length)] };
        for (const c of card.querySelectorAll('.eb-cell')) c.classList.toggle('eb-drop-on', c.dataset.v === (cell.v ?? '') && c.dataset.h === (cell.h ?? ''));
      }
    };
    const up = () => {
      if (!on) return;
      clearTimeout(timer);
      dragged = true; // the click that follows the drop is no click
      part.classList.remove('eb-dragging');
      part.style.translate = '';
      card.querySelectorAll('.eb-drop').forEach((z) => z.remove());
      if (!over) return;
      // The area first, which sets the part's position there to its own;
      // then the position dropped on, if any.
      const set = (n, v) => {
        setRadio(n, v);
        form.querySelector(`select[name=${n}], [name=${n}]:checked`)?.dispatchEvent(new Event('change', { bubbles: true }));
      };
      if (over !== m.now()) {
        if (m.name === 'figat') el('eb-figure-on').checked = true;
        set(m.name, m.value(over));
      }
      if (open === over && cell) {
        const ax = m.axes(over);
        if (ax.v && cell.v) set(ax.v.name, cell.v);
        if (ax.h && cell.h) set(ax.h.name, cell.h);
      }
      tune([m.part]);
    };
    drag(doc, move, up);
  });
  let hover = null;
  doc.addEventListener('mouseover', (e) => {
    hover?.classList.remove('eb-hit-hover');
    hover = find(e.target, e.clientX, e.clientY)?.el ?? null;
    hover?.classList.add('eb-hit-hover');
  });
  // In the preview a click tunes; it does not follow the link.
  doc.addEventListener('click', (e) => {
    if (dragged) { dragged = false; e.preventDefault(); e.stopPropagation(); return; }
    const hit = find(e.target, e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    doc.querySelector('.eb-hit-on')?.classList.remove('eb-hit-on');
    hit.el.classList.add('eb-hit-on');
    tune(hit.keys);
  }, true);
}
