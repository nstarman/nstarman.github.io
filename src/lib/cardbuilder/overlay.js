// The Card Builder's overlay on the preview frame, drawn over the live card
// once it has loaded: the figure's corner grip, and the space tracks' ⊕
// buttons and bands, the areas' outlines, grips and ⊕ — each a part of the
// preview's own document, so a click on one is the builder's to answer.
//
// Both take the preview's iframe and `b`, the builder (see builder.js): its
// form, state and the few methods they call back.

import { FACES } from '../cardname.js';
import { clampInt } from './model.js';
import { COL_OF, COL_TRACKS, ROW_SLOTS, ROW_TRACKS, COL_NAMES, GRID_COLS, GRID_ROWS, between, named, sum } from './geometry.js';
import { FACE_Q, drag, shownIn } from './dom.js';

/** The figure's corner grip: dragging it sizes the figure, live in the
 *  preview, as a share of its column or in px as the size is set, and on
 *  release writes it to the size box. A figure that is centred grows on both
 *  sides. */
export function attachGrip(frame, b) {
  const { form, el, tune, render } = b;
  const doc = frame.contentDocument;
  const fig = doc.querySelector('.card[data-fig] > .c-fig');
  if (!fig) return;
  const handle = doc.createElement('span');
  handle.className = 'eb-fig-grip';
  handle.title = 'Drag to size the figure';
  fig.append(handle);
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    const card = doc.querySelector('.card');
    const cs = frame.contentWindow.getComputedStyle(card);
    // Its column: the side's, or the words' for a figure above them.
    const col = cs.gridTemplateColumns.split(' ').map(parseFloat)[COL_OF[card.dataset.fig]];
    const px = form.elements.figunit.value === 'px';
    const box = fig.getBoundingClientRect();
    // The width from where the drag began: a centred figure grows both
    // ways, twice the pointer's move, so its corner stays under the pointer.
    const centred = card.dataset.fig === 'center' || !card.dataset.figh;
    const x0 = e.clientX;
    let share = null;
    const move = (ev) => {
      const w = box.width + (ev.clientX - x0) * (centred ? 2 : 1);
      share = px ? clampInt(w, 8, 800) : clampInt((w / col) * 100, 10, 100);
      card.dataset.figw = '';
      card.style.setProperty('--figw', px ? `min(${share}px, 100%)` : `${share}%`);
    };
    const up = () => {
      if (share == null) return;
      form.elements.figpx.value = share;
      el('eb-figure-on').checked = true;
      tune(['figure']);
      render();
    };
    drag(handle, move, up);
  });
}

/** In the preview, a ⊕ between each two slots that show — the first track
 *  between them, where parts left out leave several — to add space there,
 *  and a hatched band over each track that has some. */
export function attachPlus(frame, b) {
  const { form, el, space, areasOn, trackBetween, trackName, showTracks, sideKind, showGap, tune, render, setRadio } = b;
  const doc = frame.contentDocument, card = doc?.querySelector('.card');
  if (!card) return;
  // While a side is dragged its grip stays put: redrawn, it would be lost
  // from under the pointer as the card's height follows the drag.
  let dragging = false;
  const place = () => {
    if (dragging) return;
    card.querySelectorAll('.eb-plus, .eb-band, .eb-area, .eb-area-grip, .eb-split-grip, .eb-areabtn').forEach((e) => e.remove());
    const cs = frame.contentWindow.getComputedStyle(card);
    const rows = cs.gridTemplateRows.split(' ').map(parseFloat), cols = cs.gridTemplateColumns.split(' ').map(parseFloat);
    if (rows.length !== GRID_ROWS || cols.length !== GRID_COLS) return;
    const pt = parseFloat(cs.paddingTop), pl = parseFloat(cs.paddingLeft);
    const H = sum(rows, GRID_ROWS), W = sum(cols, GRID_COLS);
    // The areas, apart from their contents: the sides down the rows they
    // run, the top and bottom across what they take — each where it has
    // any room.
    const at0 = card.getBoundingClientRect();
    const lineY = (line) => pt + sum(rows, line - 1);
    const row = (v) => parseInt(cs.getPropertyValue(v), 10);
    const area = (name, x, y, w, h) => {
      if (w < 1 || h < 1) return;
      const e = doc.createElement('span');
      e.className = 'eb-area';
      e.dataset.area = name;
      Object.assign(e.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      card.append(e);
    };
    // The center's top space is padding over the card, which the sides
    // take back, and each side has its own: where a side starts.
    const titleTop = card.dataset.titleat === 'top';
    const tc = titleTop ? 0 : +(space.top_center ?? 0);
    const sideTop = (side) => lineY(row(side === 'left' ? '--rL0' : '--rR0')) - tc + +(space[`top_${side}`] ?? 0);
    area('left', pl, sideTop('left'), cols[0], lineY(row('--rL1')) - sideTop('left'));
    area('right', pl + sum(cols, 4), sideTop('right'), cols[4], lineY(row('--rR1')) - sideTop('right'));
    // A box left empty shows what it comes to in the card as drawn — the
    // title's size; the figure's width, a share of its column or px as its
    // unit is; the white around it; the gap between the buttons; an empty
    // top's or bottom's height — so < and > step from there.
    const win = frame.contentWindow, show = (n, v) => { const i = form.elements[n]; if (i) i.placeholder = v == null || Number.isNaN(v) ? 'auto' : String(Math.round(v * 10) / 10); };
    const title = card.querySelector('.c-name'), fig = card.querySelector('.c-fig'), img = fig?.querySelector('img');
    show('titlesizepx', title && win.getComputedStyle(title).display !== 'none' ? parseFloat(win.getComputedStyle(title).fontSize) : null);
    for (const p of FACES) {
      const e = [...card.querySelectorAll(FACE_Q[p])].find((x) => x.getClientRects().length);
      show(`${p}size`, e ? parseFloat(win.getComputedStyle(e).fontSize) : null);
    }
    const figOn = fig && win.getComputedStyle(fig).display !== 'none' && fig.offsetWidth > 0;
    const figCol = figOn ? cols[COL_OF[card.dataset.fig] ?? 2] : 0;
    show('figpx', figOn ? (form.elements.figunit.value === 'px' ? fig.getBoundingClientRect().width : Math.round((fig.getBoundingClientRect().width / figCol) * 100)) : null);
    show('framepx', figOn && img ? parseFloat(win.getComputedStyle(img).paddingTop) : null);
    showGap();
    for (const end of ['top', 'bottom']) show(`h${end}`, parseFloat(cs.fontSize) * 1.4); // a line's
    // A side that fits what is in it, or its buttons: its box shows the
    // width that comes to, in px.
    for (const [side, w] of [['left', cols[0]], ['right', cols[4]]]) {
      const k = sideKind(side);
      form.elements[`w${side}n`].placeholder = !['min', 'share'].includes(k) && w > 0.5 ? Math.round(w) : '–';
    }
    // Each side holding anything, a grip on its inner edge to drag its width.
    for (const [side, x, w, r1] of [['left', pl + cols[0], cols[0], '--rL1'], ['right', pl + sum(cols, 4), cols[4], '--rR1']]) {
      if (w < 1) continue;
      const g = doc.createElement('span');
      g.className = 'eb-area-grip';
      g.dataset.side = side;
      g.title = `Drag to set the ${side} side's width`;
      Object.assign(g.style, { left: `${x}px`, top: `${sideTop(side)}px`, height: `${lineY(row(r1)) - sideTop(side)}px` });
      card.append(g);
    }
    for (const [name, q, on] of [['top', '.c-name', card.dataset.titleat === 'top'], ['bottom', '.c-foot', card.dataset.foot === 'bottom']]) {
      const r = on && card.querySelector(q).getBoundingClientRect();
      if (r) area(name, r.left - at0.left, lineY(name === 'top' ? 1 : 14), r.width, name === 'top' ? rows[0] : rows[13]);
    }
    // The areas themselves: an empty top or bottom outlined in the strip of
    // padding it makes; on each edge a ⊕ to add an area that is not there,
    // and in each empty one an ✕ to take it away.
    const empty = (card.dataset.empty ?? '').split(' ').filter(Boolean), strips = card.dataset.strips ?? '';
    const W0 = card.offsetWidth, H0 = card.offsetHeight, pb = parseFloat(cs.paddingBottom);
    if (empty.includes('top')) area('top', pl, 2, W, pt - 4);
    if (empty.includes('bottom')) area('bottom', pl, H0 - pb + 2, W, pb - 4);
    const there = { left: cols[0] > 0.5, right: cols[4] > 0.5,
      top: card.dataset.titleat === 'top' || strips.includes('top') || empty.includes('top'),
      bottom: (card.dataset.foot === 'bottom' && card.dataset.rail !== 'empty') || strips.includes('bottom') || empty.includes('bottom') };
    // On its edge, beside the space ⊕ there rather than on it: a side's a
    // step down its edge, the top's and bottom's a step along theirs.
    const edge = { left: [5, H0 / 2 + 22], right: [W0 - 5, H0 / 2 + 22], top: [W0 / 2 + 22, 5], bottom: [W0 / 2 + 22, H0 - 5] };
    for (const a of ['left', 'right', 'top', 'bottom']) {
      const del = empty.includes(a);
      if (there[a] && !del) continue;
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'eb-areabtn';
      b.textContent = del ? '×' : '+';
      b.title = `${del ? 'Take away' : 'Add'} the ${{ left: 'left', right: 'right', top: 'top', bottom: 'bottom' }[a]} area`;
      b.setAttribute('aria-label', b.title);
      const r = del && card.querySelector(`.eb-area[data-area="${a}"]`);
      const [x, y] = r ? [r.offsetLeft + r.offsetWidth / 2, r.offsetTop + r.offsetHeight / 2] : edge[a];
      Object.assign(b.style, { left: `${x}px`, top: `${y}px` });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (del) areasOn.delete(a); else areasOn.add(a);
        tune(del ? [] : [`area-${a}`]);
        render();
      });
      card.append(b);
    }
    // Name each track by the parts shown before and after it, or the
    // card's edge, and relabel the Space row to match — its text only, so
    // a box being typed in keeps its focus.
    // Each row slot named by the part in it, as this card orders them.
    const rowNames = { 11: 'buttons', 13: 'bottom' };
    for (const [q, name] of [['.c-name', 'title'], ['.c-fig', 'figure'], ['.c-by', 'authors'], ['.c-venue', 'venue'], ['.c-text', 'text']]) {
      const part = card.querySelector(q);
      const r = part && parseInt(frame.contentWindow.getComputedStyle(part).gridRowStart, 10);
      if (r && !(r - 1 in rowNames)) rowNames[r - 1] = name;
    }
    // The title in the top area, the row under it is the space from the
    // top to the center; else that space is padding over the center.
    // Beside the authors, the venue's column: the space between the two
    // is authors_venue's, in the gutter, not a row.
    const sideBy = card.dataset.venueat === 'beside' && 'venue' in card.dataset && 'authors' in card.dataset;
    const rowTracks = ROW_TRACKS.map(([i, t]) => [i, titleTop && t === 'title_figure' ? 'top_center' : t]).filter(([, t]) => !(sideBy && t === 'authors_venue'));
    for (const [i, t] of rowTracks) trackBetween[t] = named(ROW_SLOTS, rowNames, rows, i);
    if (!titleTop) trackBetween.top_center = 'top · center';
    Object.assign(trackBetween, { top_left: 'top · LHS', top_right: 'top · RHS' });
    if (rows[13] < 0.5) trackBetween.center_bottom = 'center · bottom';
    // A column's space is between two areas, there or not: LHS · center, center · RHS.
    for (const [i, t] of COL_TRACKS) trackBetween[t] = `${COL_NAMES[i - 1]} · ${COL_NAMES[i + 1]}`;
    for (const e of el('eb-tracks').querySelectorAll('[data-label]')) e.textContent = trackName(e.dataset.label);
    // A ⊕ adds a space; on one already set it is a ✕, and takes it away.
    // The band is a button too: it brings up the space's own settings.
    const add = (cls, css, track) => {
      const e = doc.createElement('button');
      const name = trackName(track);
      const set = cls === 'eb-plus' && space[track] != null;
      e.type = 'button';
      e.className = cls;
      Object.assign(e.style, css);
      if (cls === 'eb-plus') e.textContent = set ? '×' : '+';
      e.title = cls === 'eb-band' ? `Space: ${name}` : `${set ? 'Remove' : 'Add'} space: ${name}`;
      e.setAttribute('aria-label', e.title);
      e.dataset.track = track;
      card.append(e);
    };
    const mid = `${pl + sum(cols, 2) + cols[2] / 2}px`;
    const shownRows = between(ROW_SLOTS, rowTracks, rows);
    for (const [i, t] of shownRows) add('eb-plus', { top: `${pt + sum(rows, i) + rows[i] / 2}px`, left: mid }, t);
    // The spaces from the top area and to the bottom one always, there or
    // not, as the columns'.
    if (!titleTop) add('eb-plus', { top: `${pt - tc / 2}px`, left: mid }, 'top_center');
    if (!shownRows.some(([, t]) => t === 'center_bottom')) add('eb-plus', { top: `${pt + sum(rows, 12) + rows[12] / 2}px`, left: mid }, 'center_bottom');
    // The two column spaces always: an area left out, the card's edge stands
    // in for it, and a space there sets the center in from it.
    for (const [i, t] of COL_TRACKS) {
      add('eb-plus', { top: `${pt + H / 2}px`, left: `${pl + sum(cols, i) + cols[i] / 2}px` }, t);
    }
    // Beside the authors, the gutter between the two columns: the space
    // there, its ⊕ and band, and a grip to drag the left one's width — its
    // box showing what it comes to.
    if (sideBy) {
      const by = card.querySelector(':scope > .c-by'), at = card.getBoundingClientRect(), B = by.getBoundingClientRect();
      const seen = (q) => shownIn(by, q);
      const [L, R] = [seen('.c-by-tight, .c-by-short, .c-by-full, .c-by-n'), seen('.c-byvenue')].map((x) => x?.getBoundingClientRect()).filter(Boolean).sort((a, b) => a.left - b.left);
      if (L && R) {
        const gx = (L.right + R.left) / 2 - at.left, y = B.top - at.top;
        trackBetween.authors_venue = card.dataset.venuefirst ? 'published · authors' : 'authors · published';
        // The ⊕ on the line's top edge, the grip down the rest of it.
        add('eb-plus', { top: `${y}px`, left: `${gx}px` }, 'authors_venue');
        if (space.authors_venue) add('eb-band', { left: `${L.right - at.left}px`, width: `${R.left - L.right}px`, top: `${y}px`, height: `${B.height}px` }, 'authors_venue');
        const g = doc.createElement('span');
        g.className = 'eb-split-grip';
        g.title = 'Drag to set the left column’s width';
        Object.assign(g.style, { left: `${gx}px`, top: `${y + 9}px`, height: `${B.height}px` });
        card.append(g);
        show('vsplitn', form.elements.vsplitu.value === 'px' ? L.width : (L.width / B.width) * 100);
      }
    }
    // Each band where its track does its work: a row's across the words —
    // the figures and side boxes span those rows — but for the one above
    // the bottom area, which runs the card's width; a column's down to
    // that area, which runs under them all.
    // A title at the top runs across the card, short of the sides the top
    // area stops beside; the sides, and the columns' spaces, start under it
    // — beside the space under it — but for one beside such a side.
    const top = card.dataset.titleat === 'top' ? sum(rows, 1) : 0;
    // Each side's own top space, where the side is there.
    for (const [side, x, w] of [['left', pl, cols[0]], ['right', pl + sum(cols, 4), cols[4]]]) {
      if (w < 0.5) continue;
      const t = `top_${side}`, v = +(space[t] ?? 0), y = sideTop(side);
      add('eb-plus', { top: `${y - v / 2}px`, left: `${x + w / 2}px` }, t);
      if (v) add('eb-band', { top: `${y - v}px`, height: `${v}px`, left: `${x}px`, width: `${w}px` }, t);
    }
    if (tc) add('eb-band', { top: `${pt - tc}px`, height: `${tc}px`, left: `${pl + sum(cols, 2)}px`, width: `${cols[2]}px` }, 'top_center');
    for (const [i, t] of rowTracks) {
      // The center's own, but for the one above the bottom area, which runs
      // the card's width: a title in the top area has the sides start beside
      // the space under it, so that space is the center's too.
      const across = t === 'center_bottom' ? { left: `${pl}px`, width: `${W}px` }
        : { left: `${pl + sum(cols, 2)}px`, width: `${cols[2]}px` };
      if (space[t]) add('eb-band', { top: `${pt + sum(rows, i)}px`, height: `${rows[i]}px`, ...across }, t);
    }
    const beside = (card.dataset.wins ?? '').split(' ').map((w) => ({ 'left-top': 'left_center', 'right-top': 'center_right' })[w]);
    for (const [i, t] of COL_TRACKS) {
      const y = beside.includes(t) ? 0 : top;
      if (space[t]) add('eb-band', { left: `${pl + sum(cols, i)}px`, width: `${cols[i]}px`, top: `${pt + y}px`, height: `${sum(rows, 12) - y}px` }, t);
    }
  };
  place();
  frame.contentWindow.addEventListener('resize', place);
  // The gutter's grip dragged, beside the authors: the left column's width
  // as it goes, then — let go — set in the Published row, as its unit is.
  doc.addEventListener('pointerdown', (e) => {
    const g = e.target.closest?.('.eb-split-grip');
    if (!g) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    const B = card.querySelector(':scope > .c-by').getBoundingClientRect(), px = form.elements.vsplitu.value === 'px';
    let v = null;
    const move = (ev) => {
      const w = ev.clientX - B.left;
      v = px ? clampInt(w, 20, 800) : clampInt((w / B.width) * 100, 5, 95);
      card.dataset.vsplit = '';
      card.style.setProperty('--vsplit', px ? `${v}px` : `${v}%`);
    };
    const up = () => {
      dragging = false;
      if (v == null) return place();
      form.elements.vsplitn.value = v;
      tune(['venue']);
      render();
    };
    drag(doc, move, up);
  });
  // A side's grip dragged: its width as it goes, then — let go — set in the
  // Area row: a share of the card where it is one, else at least that px.
  doc.addEventListener('pointerdown', (e) => {
    const g = e.target.closest?.('.eb-area-grip');
    if (!g) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    const side = g.dataset.side;
    const cs = frame.contentWindow.getComputedStyle(card), at = card.getBoundingClientRect();
    const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), inner = at.width - pl - pr;
    const share = sideKind(side) === 'share';
    let v = null;
    const move = (ev) => {
      const w = side === 'left' ? ev.clientX - (at.left + pl) : at.right - pr - ev.clientX;
      v = share ? clampInt((w / inner) * 100, 5, 95) : clampInt(w, 0, 800);
      card.style.setProperty(side === 'left' ? '--colL' : '--colR', share ? `${v}%` : `minmax(${v}px, auto)`);
    };
    const up = () => {
      dragging = false;
      if (v == null) return place();
      setRadio(`w${side}`, 'set');
      form.elements[`w${side}u`].value = share ? 'share' : 'min';
      form.elements[`w${side}n`].value = v;
      tune([`area-${side}`]);
      render();
    };
    drag(doc, move, up);
  });
  doc.addEventListener('click', (e) => {
    const b = e.target.closest?.('.eb-plus, .eb-band');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const t = b.dataset.track;
    if (b.classList.contains('eb-band')) {
      // Its settings: the Space row, at this space's px.
      tune(['space']);
      el('eb-tracks').querySelector(`[data-track="${t}"]`)?.focus();
      return;
    }
    if (space[t] != null) delete space[t]; else space[t] = '8';
    showTracks();
    if (space[t] != null) tune(['space']);
    render();
  });
}
