// The Card Builder's controller: the page's form, its state, and the preview.
//
// A card is one name (cardname.js). The controls are that name taken apart —
// model.js reads them into a name and sets them from one — and the preview is
// the live /embed/ card for it, which overlay.js and preview.js make a place
// to point. render() is the one loop: controls → name → preview + snippet.
//
// `b`, the builder the overlay and preview modules are given, is this
// controller's whole surface to them:
//   form, el, items       the page's form, id lookup, and the items' facts
//   space, areasOn        the space tracks set; the areas added with their ⊕
//   trackBetween, trackName, showTracks   the tracks' names, and their row
//   st                    { lastAreas }, the venue's area last beside the authors'
//   tune(keys), render()  bring up a part's settings; redraw from the controls
//   setRadio, sideKind, showGap, stackedIn, moveButton, moveKey   control helpers

import { DIALS, FACES, SPACE_TRACKS, parseName, placeOf } from '../cardname.js';
import { query, snippet, esc, themes } from '../cardexport.js';
import {
  A2V, CELL, SMALL, V2A, boxHeight, canTune, clampInt, controlOps, defaultsOf, figWidth, fitName, hiddenKeys, namesN, presetWidths, readSpec, shapeHeight, shownKeys,
  smallBox, stackedIn as stackedInModel, stretch as stretchOf, typedPx, claimed, regroup, otherArea, newGroup, GROUP_AREAS, FIRST_ONLY,
} from './model.js';
import { parseSettings, serializeSettings } from './settings.js';
import { downloadCard } from './download.js';
import { attachPreview } from './preview.js';

/** Mount the builder on its form.
 *  @param {{ form: HTMLFormElement, data: object }} o  data is what the page
 *  hands over (tools/card.astro): site, limits, step sizes, fonts, presets and
 *  the items' facts. */
export function mountCardBuilder({ form, data }) {
  const { site, fonts, fixedMin, fixedMax, fixedMinHeight, stepPx: STEP_PX, framePx: FRAME_PX, presets, items } = data;
  const limits = { fixedMin, fixedMax, fixedMinHeight, stepPx: STEP_PX };
  const el = (id) => document.getElementById(id);
  // A side's width: fit, its buttons', or a number typed, in its unit — a
  // share of the card (%) or at least so many px.
  const sideKind = (side) => {
    const w = form.querySelector(`[name=w${side}]:checked`)?.value ?? '';
    return w === 'set' ? form.elements[`w${side}u`].value : w;
  };
  // The buttons' gap as the card draws it, in the gap box's unit: px, or a
  // share of a button's size.
  function showGap() {
    const doc = document.querySelector('#eb-preview iframe')?.contentDocument, btns = doc?.querySelector('.card .c-foot .btns--icon');
    const gap = btns ? parseFloat(doc.defaultView.getComputedStyle(btns).columnGap) || 0 : null, ib = btns?.querySelector('.iconbtn')?.offsetWidth;
    form.elements.bgap.placeholder = gap == null ? 'auto' : String(form.elements.bgapu.value === '%' && ib ? Math.round((gap / ib) * 100) : Math.round(gap * 10) / 10);
  }
  // A choice set by value, a menu's or a radio group's — '' too, which
  // setting RadioNodeList.value does not check — and none checked where no
  // radio has it.
  const setRadio = (n, v) => {
    const m = form.querySelector(`select[name="${n}"]`);
    if (m) m.value = String(v);
    else for (const r of document.querySelectorAll(`input[type=radio][name="${n}"]`)) r.checked = r.value === String(v);
  };
  const preview = el('eb-preview');
  const code = el('eb-code');
  const note = el('eb-note');
  const extras = el('eb-extras');
  // The Extras menu closes on a click outside it, or Escape.
  const drop = el('eb-extras-drop');
  document.addEventListener('click', (e) => { if (drop.open && !drop.contains(e.target)) drop.open = false; });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drop.open) { drop.open = false; drop.querySelector('summary').focus(); } });
  const download = el('eb-download');
  const copy = el('eb-copy');

  let height = 0; // the previewed card's height, as it last reported it
  let shown = ''; // the preview's src, so a snippet-only change leaves it alone

  // The builder's state, besides what the controls hold. space and areasOn are
  // changed in place, never replaced: the overlay holds them.
  const space = {};            // the space tracks set, px or flex
  const areasOn = new Set();   // the areas added with their ⊕, there with nothing in them too
  const st = { lastAreas: 'below' }; // where the venue's own area last was, beside the authors': where it goes back to from their shared one
  let groups = [];             // the other groups of buttons, as the name has them: carried, not yet edited here
  let btnOrder = [];           // the buttons' order, every key the item has: the shown ones, in it, are the name's list

  // The controls as the model reads them.
  const snap = () => new FormData(form);
  const state = () => ({ it: items[form.elements.card.value], figureOn: el('eb-figure-on').checked, space, areasOn, btnOrder, groups, allLinks: [...form.querySelectorAll('[name=link]:not([data-optional])')].map((b) => b.value), limits });
  const spec = () => readSpec(snap(), state());
  const stackedIn = (a) => stackedInModel(snap(), state(), a);
  const canTuneRow = (r) => canTune(r.dataset.tune, snap(), state());
  const stretch = () => stretchOf(form.elements.hmode.value === 'px', form.elements.px.value, boxHeight(snap(), limits));

  // The role, status, my position, the year and the context, where the item
  // has them, and on a row of their own a toggle per link it carries. The figure and the venue are on the row
  // above.
  function buildExtras(id) {
    const it = items[id];
    const x = (on, v, title) => (on ? `<label title="${title}"><input type="checkbox" class="eb-check" name="extra" value="${v}" />${v}</label>` : '');
    extras.innerHTML = x(it.role, 'role', 'My role in the package')
      + x(it.pos, 'position', 'My author position, as 1st')
      + x(it.students, 'students', 'My students on the paper, with their positions, beside mine')
      + x(it.year, 'year', 'The year')
      + x(it.context, 'context', 'A link to its topic on /research/');
    el('eb-extras-drop').hidden = !extras.innerHTML;
    // The paper button first, as it is in the box, where it has somewhere
    // to link; then each link's.
    el('eb-links').innerHTML = (Object.values(it.paperTo).some(Boolean) ? '<label title="A button of words, paper, first among the buttons: to the article, else arXiv"><input type="checkbox" class="eb-check" name="paperbtn" />paper</label>' : '') + it.links.map(([k, name, title, optional]) => `<label title="${esc(optional ? `${title}: not on a card of its own accord — tick it to show it` : title)}"><input type="checkbox" class="eb-check" name="link" value="${k}"${optional ? ' data-optional' : ' checked'} />${esc(name)}</label>`).join('');
  }

  // A part among the buttons shows where its extra is ticked; the paper
  // button where its pill is.
  const extraOn = (x) => [...form.querySelectorAll('[name=extra]')].some((b) => b.value === x && b.checked);
  // The first group's: a key another group has is shown there, not here.
  const shownOrder = () => shownKeys(btnOrder, snap()).filter((k) => k === 'empty' || !claimed(groups).has(k));
  const hiddenOrder = () => btnOrder.filter((k) => !shownOrder().includes(k));
  // The order line: each shown button, with < and > to move it past the one
  // shown before or after it — an empty one with a ✕ to take it away — and
  // + empty to add a button's room with nothing in it, at the end.
  const buttonNames = (it) => ({ ...Object.fromEntries(it.links.map(([k, name]) => [k, name])), empty: 'empty', paperbutton: 'paper button', year: 'year', position: 'position', context: 'context' });
  // A menu to move a button to another group — the first, another, or a new
  // one. The paper button and the parts among the buttons stay in the first.
  const groupName = (n) => (n === 0 ? 'the buttons' : `group ${n + 1}`);
  const groupMenu = (k, from, name) => FIRST_ONLY.includes(k) ? '' : `<select class="eb-menu eb-gto" data-gto aria-label="Move ${esc(name)} to another group" title="Move to another group"><option value="" selected>→</option>`
    + [0, ...groups.map((_, i) => i + 1)].filter((n) => n !== from).map((n) => `<option value="${n}">${groupName(n)}</option>`).join('')
    + '<option value="new">new group</option></select>';
  function showOrder() {
    const it = items[form.elements.card.value], names = buttonNames(it);
    const keys = shownOrder();
    el('eb-order').innerHTML = keys.map((k, i) => `<span class="numbox-pill eb-orderpill${k === 'empty' ? ' eb-orderempty' : ''}" data-i="${i}">`
      + `<button type="button" class="numbox-step" data-move="-1" ${i ? '' : 'disabled'} aria-label="Move ${esc(names[k])} earlier" title="Earlier">&lt;</button>`
      + `<span class="eb-ordername">${esc(names[k])}</span>`
      + `<button type="button" class="numbox-step" data-move="1" ${i < keys.length - 1 ? '' : 'disabled'} aria-label="Move ${esc(names[k])} later" title="Later">&gt;</button>`
      + (k === 'empty' ? `<button type="button" class="numbox-step" data-drop aria-label="Take this empty button away" title="Take away">✕</button>` : groupMenu(k, 0, names[k])) + '</span>').join('')
      + '<button type="button" class="eb-orderadd" data-add aria-label="Add an empty button at the end" title="A button\'s room with nothing in it">+ empty</button>';
    el('eb-order').hidden = el('eb-order-key').hidden = !it.links.length && !keys.length;
  }
  // The shown buttons set anew, the hidden ones kept after.
  const setShown = (shown) => { btnOrder = [...shown, ...hiddenOrder()]; showOrder(); render(); };
  // A shown button, by its place, moved to another's.
  function moveButton(from, to) {
    const shown = shownOrder();
    if (from < 0 || to < 0 || to >= shown.length || to === from) return;
    shown.splice(to, 0, ...shown.splice(from, 1));
    setShown(shown);
  }

  // ---- the other groups of buttons ----
  // The first group is the Buttons row above; each other has a line here: its
  // buttons in order, each with a menu to send it to another group, and its
  // area, place and rows. A button is dragged between them in the preview.
  const gset = (g, patch) => { for (const k of Object.keys(patch)) if (patch[k] === undefined) delete g[k]; Object.assign(g, patch); };
  /** A button moved: m is regroup's, and the key stays ticked — shown wherever it is. */
  function moveKey(m) {
    const res = regroup({ main: shownOrder(), groups, mainArea: form.elements.foot.value }, m);
    if (!res.moved) return;
    groups = res.groups;
    btnOrder = [...res.main, ...btnOrder.filter((k) => k !== 'empty' && !res.main.includes(k))];
    const tick = form.querySelector(`[name=link][value="${CSS.escape(m.key)}"]`);
    if (tick) tick.checked = true;
    showOrder();
    showGroups();
    tune(['foot', 'groups']);
    render();
  }
  // The same for a menu's choice: another group, or a new one at the area away from the buttons.
  const sendTo = (key, from, index, v) => moveKey({ key, from: { group: from, index }, to: v === 'new' ? { area: groupAreaFor(otherArea(form.elements.foot.value)) } : { group: +v } });
  // A new group goes to an area no group is in, the other side first.
  const groupAreaFor = (want) => [want, 'right', 'left', 'bottom', 'center'].find((a) => a !== form.elements.foot.value && !groups.some((g) => g.area === a)) ?? want;
  function showGroups() {
    const it = items[form.elements.card.value], names = buttonNames(it);
    const AREA = { left: 'LHS', center: 'center', right: 'RHS', bottom: 'bottom', top: 'top strip' };
    const side = (a) => a === 'left' || a === 'right';
    const opt = (v, text, now) => `<option value="${v}"${String(now) === String(v) ? ' selected' : ''}>${text}</option>`;
    el('eb-groups').innerHTML = groups.map((g, i) => {
      const n = i + 1;
      const chips = g.links.map((k, j) => `<span class="numbox-pill eb-orderpill${k === 'empty' ? ' eb-orderempty' : ''}" data-j="${j}">`
        + `<button type="button" class="numbox-step" data-gmove="-1" ${j ? '' : 'disabled'} aria-label="Move ${esc(names[k])} earlier" title="Earlier">&lt;</button>`
        + `<span class="eb-ordername">${esc(names[k])}</span>`
        + `<button type="button" class="numbox-step" data-gmove="1" ${j < g.links.length - 1 ? '' : 'disabled'} aria-label="Move ${esc(names[k])} later" title="Later">&gt;</button>`
        + (k === 'empty' ? '<button type="button" class="numbox-step" data-gdrop aria-label="Take this empty button away" title="Take away">✕</button>' : groupMenu(k, n, names[k])) + '</span>').join('');
      const h = g.h ?? (side(g.area) ? g.area : 'left');
      return `<span class="eb-sub eb-group" data-n="${n}"><span class="eb-dim">${groupName(n)}</span><span class="eb-px">${chips}<button type="button" class="eb-orderadd" data-gadd aria-label="Add an empty button to ${groupName(n)}" title="A button's room with nothing in it">+ empty</button></span>`
        + `<span class="eb-dim">area</span><span class="eb-px"><select class="eb-menu" data-gset="area" aria-label="The area ${groupName(n)} sits in">${GROUP_AREAS.map((a) => opt(a, AREA[a], g.area)).join('')}</select>`
        + (side(g.area) ? `<span class="eb-dim eb-inkey">up and down</span><select class="eb-menu" data-gset="v" aria-label="${groupName(n)} up and down">${['top', 'center', 'bottom'].map((v) => opt(v, v, g.v ?? 'top')).join('')}</select>` : '')
        + `<span class="eb-dim eb-inkey">across</span><select class="eb-menu" data-gset="h" aria-label="${groupName(n)} across">${['left', 'center', 'right'].map((v) => opt(v, v, h)).join('')}</select></span>`
        + `<span class="eb-dim">per row</span><span class="eb-px"><select class="eb-menu" data-gset="perRow" aria-label="${groupName(n)} buttons to a row">${opt('', 'square', g.perRow ?? '')}${opt('fit', 'fit', g.perRow ?? '')}${Array.from({ length: 12 }, (_, x) => opt(x + 1, x + 1, g.perRow ?? '')).join('')}</select>`
        + `<button type="button" class="eb-orderadd" data-gdel aria-label="Put ${groupName(n)}'s buttons back in the first group" title="Back to the first group">✕ group</button></span></span>`;
    }).join('');
  }
  el('eb-groups').addEventListener('change', (e) => {
    e.stopPropagation();
    const grp = e.target.closest('.eb-group'), n = grp ? +grp.dataset.n : null;
    if (e.target.dataset.gto != null) {
      const pill = e.target.closest('[data-j]'), key = groups[n - 1].links[+pill.dataset.j];
      return sendTo(key, n, +pill.dataset.j, e.target.value);
    }
    const g = groups[n - 1], what = e.target.dataset.gset;
    if (!g || !what) return;
    const v = e.target.value;
    if (what === 'area') gset(g, { area: v, v: v === 'left' || v === 'right' ? 'top' : undefined, h: undefined });
    else if (what === 'v') gset(g, { v: v === 'top' ? 'top' : v });
    else if (what === 'h') gset(g, { h: v === (g.area === 'left' || g.area === 'right' ? g.area : 'left') ? undefined : v });
    else if (what === 'perRow') gset(g, { perRow: v === '' ? undefined : v === 'fit' ? 'fit' : +v });
    showGroups();
    render();
  });
  el('eb-groups').addEventListener('click', (e) => {
    const bt = e.target.closest('button');
    if (!bt) return;
    const grp = bt.closest('.eb-group'), n = +grp.dataset.n, g = groups[n - 1], j = +bt.closest('[data-j]')?.dataset.j;
    if (bt.dataset.gadd != null) g.links.push('empty');
    else if (bt.dataset.gdrop != null) { g.links.splice(j, 1); if (!g.links.some((k) => k !== 'empty')) return dropGroup(n); }
    else if (bt.dataset.gmove) { const to = j + +bt.dataset.gmove; if (to >= 0 && to < g.links.length) g.links.splice(to, 0, ...g.links.splice(j, 1)); }
    else if (bt.dataset.gdel != null) return dropGroup(n);
    showGroups();
    render();
  });
  /** A group taken away: its buttons back at the end of the first group. */
  function dropGroup(n) {
    const g = groups[n - 1];
    btnOrder = [...shownOrder(), ...g.links.filter((k) => k !== 'empty'), ...btnOrder.filter((k) => !shownOrder().includes(k) && !g.links.includes(k))];
    groups = groups.filter((_, i) => i !== n - 1);
    showOrder();
    showGroups();
    render();
  }
  // A button in the first group's order line, sent to another group.
  el('eb-order').addEventListener('change', (e) => {
    if (e.target.dataset.gto == null) return;
    e.stopPropagation();
    const i = +e.target.closest('[data-i]').dataset.i;
    sendTo(shownOrder()[i], 0, i, e.target.value);
  });

  // A part's place set back to where it sits in its area left out — with the
  // buttons, at the end away from them; in a strip, at its left. The bottom
  // strip is the buttons' own area once they are at the bottom.
  function resetPlace(k) {
    const foot = form.elements.foot.value;
    if (foot === 'bottom' && form.elements[`${k}at`].value === 'bottom') setRadio(`${k}at`, '');
    const a = form.elements[`${k}at`].value;
    if (a === 'list') return;
    const part = SMALL.find(([x]) => x === k)[1];
    const pl = placeOf({ foot, footEnd: form.elements.footend.value, railAlign: form.elements.railalign.value, [`${part}At`]: a ? { area: a } : undefined }, part);
    if (pl.v) form.elements[`${k}v`].value = pl.v;
    form.elements[`${k}h`].value = pl.h;
  }

  // Every item starts from the builder's default, following the reader's theme.
  function start() {
    apply(presets[0].slug);
    form.elements.theme.value = 'auto';
  }

  // The writes controlOps lists, made on the form.
  function write(ops) {
    for (const [kind, name, v] of ops) {
      if (kind === 'set') form.elements[name].value = v;
      else if (kind === 'radio') setRadio(name, v);
      else if (kind === 'check') { const c = form.elements[name]; if (c) c.checked = v; } // the paper pill, where the item has none
      else for (const c of form.querySelectorAll(`[name=${name}]`)) c.checked = v === null || v.includes(c.value);
    }
  }

  // A name → the controls. An extra the item has not got stays off.
  function apply(name) {
    let c;
    try { c = parseName(name); } catch { return; }
    const { ops, state: next } = controlOps(c, { it: items[form.elements.card.value], stepPx: STEP_PX, framePx: FRAME_PX });
    write(ops);
    areasOn.clear();
    for (const a of next.areasOn) areasOn.add(a);
    for (const t in space) delete space[t];
    Object.assign(space, next.space);
    btnOrder = next.btnOrder;
    groups = next.groups;
    if (next.lastAreas) st.lastAreas = next.lastAreas;
    showTracks();
  }

  function render() {
    const s = spec();
    wasSmall = smallBox(s.slug);
    // Which of the website's cards, if any, the controls now make.
    // The default also follows the reader's theme, which the name does not carry.
    const match = presets.find((p) => fitName(p.slug, s.it) === s.slug);
    form.elements.preset.value = match && !(match === presets[0] && s.theme !== 'auto') ? match.slug : '';
    el('eb-slug').textContent = s.slug;
    el('eb-authors').hidden = !s.it.byline;
    el('eb-text').hidden = !s.it.text;
    el('eb-figure').hidden = !s.it.figure;
    el('eb-venue').hidden = !s.it.venue;
    // marked | plain and the ORCID links belong to a byline that is shown.
    el('eb-marks').hidden = el('eb-marks-key').hidden = el('eb-orcid').hidden = el('eb-orcid-key').hidden = !(s.it.byline && ['short', 'full', 'n'].includes(form.elements.authors.value));
    // Each part's area: top, the buttons' own — named as theirs — or bottom,
    // which is theirs where they are at the bottom; up and down only in the
    // buttons' box, a strip having none.
    const box = form.elements.foot.value;
    for (const [k] of SMALL) {
      el(`eb-${k}at`).querySelector('.eb-boxname').textContent = { left: 'LHS', center: 'center', right: 'RHS', bottom: 'bottom' }[box];
      el(`eb-${k}at`).querySelector('.eb-stripbottom').hidden = el(`eb-${k}at`).querySelector('.eb-stripbottom').disabled = box === 'bottom';
      el(`eb-${k}v`).hidden = !!form.elements[`${k}at`].value;
      // Among the buttons, its place is their order's: no position.
      const place = el(`eb-${k}v`).closest('.eb-place');
      place.hidden = place.previousElementSibling.hidden = form.elements[`${k}at`].value === 'list';
    }
    // Up and down belongs to buttons in a side.
    el('eb-footend').hidden = !['left', 'right'].includes(box) || stackedIn(box);
    // Up and down belongs to the title in the top area, whose height may be
    // more than its own.
    el('eb-titlev').hidden = form.elements.titleat.value !== 'top';
    // A status pill belongs to a paper that has one to show.
    el('eb-tstatus').hidden = !s.it.tstatus;
    el('eb-vstatus').hidden = !s.it.status;
    el('eb-varxiv').hidden = !s.it.varxiv;
    el('eb-vname').hidden = el('eb-vname-key').hidden = !s.it.vshort;
    el('eb-vlink').hidden = el('eb-vlink-key').hidden = !s.it.vlink;
    showOrder();
    showGroups();
    // The paper button belongs to a paper; its word to a word label; and of
    // where it may link, only where this one can.
    form.elements.paperword.hidden = form.elements.paperlabel.value === 'icon';
    for (const o of form.elements.paperto.options) o.disabled = !!o.value && !s.it.paperTo[o.value];
    if (form.elements.paperto.selectedOptions[0]?.disabled) form.elements.paperto.value = '';
    el('eb-vpos').hidden = el('eb-vpos-key').hidden = !['below', 'above'].includes(form.elements.venueline.value);
    el('eb-vsplit').hidden = el('eb-vsplit-key').hidden = !['left', 'right'].includes(form.elements.venueline.value);
    el('eb-vorder').hidden = el('eb-vorder-key').hidden = el('eb-aorder').hidden = el('eb-aorder-key').hidden = form.elements.venueline.value !== 'authors';
    el('eb-aarea').hidden = el('eb-aarea-key').hidden = !(s.it.venue && extraOn('venue'));
    if (s.it.vshort) el('eb-vname-short').title = `The journal's short name: ${s.it.vshort}`;
    // whole | split belongs to a full title that has a short title inside it.
    el('eb-rest').hidden = !(form.elements.title.value === 'full' && s.it.split);
    // The title's link pills, named for this item, where it has the place.
    // A place the item's own link already is shows once, as that link —
    // unless it is the one chosen.
    for (const l of ['link', 'ads', 'journal', 'site']) {
      el(`eb-tl-${l}`).hidden = !s.it[l] || (s.it.linkIs === l && form.elements.titlelink.value !== l);
      el(`eb-tl-${l}`).lastChild.textContent = s.it[l] ?? '';
    }
    el('eb-title-on').checked = form.elements.title.value !== 'none';
    el('eb-authors-on').checked = form.elements.authors.value !== 'none';
    el('eb-text-on').checked = form.elements.text.value !== 'none';
    syncAll();
    // What is set opens out of its pill, and folds back into it as its value.
    const wset = s.width != null, hset = s.height != null;
    if (!wset && !hset) widthOpen = false;
    wasSet.wmode = wset;
    wasSet.hmode = hset;
    el('eb-px').hidden = !widthOpen;
    el('eb-px-w').hidden = !wset;
    el('eb-px-h').hidden = !hset;
    el('eb-shapes').hidden = !(wset && hset);
    el('eb-w-shown').textContent = wset && !widthOpen ? `${s.width}px` : 'set';
    el('eb-h-shown').textContent = hset && !widthOpen ? `${s.height}px` : 'set';
    showWidths(s.width);
    // The shape lit is the one the two numbers make, if any.
    for (const r of form.elements.shape) { r.checked = wset && hset && shapeHeight(s.width, r.value) === s.height; }
    // A side's width only where something is in it: a setting for an empty
    // one would change nothing.
    for (const side of ['left', 'right']) {
      const kind = sideKind(side);
      el(`eb-w-${side}-buttons`).hidden = form.elements.foot.value !== side;
      el(`eb-w-${side}-n`).hidden = kind === 'buttons';
    }
    // A row whose part is gone — not this item's, or turned off — goes too.
    for (const r of tuneRows) if (!r.hidden && !canTuneRow(r)) r.hidden = true;
    // Its position: in a side, up and down and across it; in the center,
    // among its parts — above the title only where the title is not up in
    // the top area.
    const centred = form.elements.figat.value === 'center';
    el('eb-figslot').hidden = !centred;
    el('eb-figv').hidden = el('eb-figh').hidden = centred;
    const topSlot = form.elements.figslot.querySelector('[value=top]');
    topSlot.disabled = form.elements.titleat.value === 'top';
    if (topSlot.disabled && topSlot.selected) form.elements.figslot.value = 'title';
    for (const b of form.querySelectorAll('.eb-bywidth')) b.hidden = !wset;
    // The figure's auto: with no width typed.
    form.querySelector('[name=figp]').checked = form.elements.figpx.value === '';
    // A number typed is the buttons to a row; with none, square or fit.
    if (form.elements.perrow.value !== '') for (const r of form.elements.perp) r.checked = false;
    else if (!form.elements.perp.value) form.elements.perp.value = 'square';
    // A size box shows its step's px; typed, it keeps its own.
    for (const d in STEP_PX) {
      const v = form.querySelector(`[name=${d}]:checked`)?.value, box = form.elements[`${d}px`];
      if (v && document.activeElement !== box) box.value = STEP_PX[d][v] ?? '';
    }
    for (const d of form.querySelectorAll('.eb-dial')) d.dataset.stops = wset ? 6 : 5;
    // A card that fills its width fills the stage, which can be dragged
    // narrower or wider to see it reflow; one of a set width has its own,
    // and the stage goes back to the column's.
    preview.dataset.w = wset ? 'px' : 'fill';
    preview.dataset.theme = s.theme;
    if (wset) preview.style.width = '';
    if (s.width && document.activeElement !== form.elements.px) form.elements.px.value = s.width;
    code.value = snippet(s, { site, height });
    const image = s.format !== 'iframe';
    const n = themes(s).length;
    const kind = { pdf: 'PDF', svg: 'SVG' }[s.format] ?? 'PNG';
    download.hidden = !image;
    download.title = `Download ${kind}`;
    download.setAttribute('aria-label', download.title);
    note.textContent = !image ? ''
      : s.format === 'pdf' ? `Download the PDF${n > 1 ? 's, light and dark,' : ','} drawn by Typst: the text selectable and the links live.`
      : s.format === 'svg' ? `Download the SVG${n > 1 ? 's, light and dark,' : ','} text and links intact. The links are live where the file is opened or embedded inline — a browser never runs one inside an <img>, on GitHub or anywhere.`
      : `Download the PNG${n > 1 ? 's' : ''} and keep ${n > 1 ? 'them' : 'it'} beside the page; the snippet names ${n > 1 ? 'them' : 'it'}.`
        + (s.format === 'markdown' && s.theme === 'auto' ? ' Markdown cannot follow the reader’s theme, so this is the light one.' : '');
    // The preview loads from this site, not from `site`, so a preview deploy
    // shows its own build.
    const src = `/embed/${s.id}/${query(s)}`;
    if (src === shown) return;
    shown = src;
    height = 0;
    preview.innerHTML = `<iframe src="${src}" title="${esc(s.it.title)} preview" width="${s.width ?? '100%'}" style="border:0; max-width:100%"></iframe>`;
    const frame = preview.querySelector('iframe');
    frame.addEventListener('load', () => attachPreview(frame, b));
  }

  // The preview frame reports its card's height; the snippet takes it, so the
  // frame is the right size even without resize.js.
  addEventListener('message', (e) => {
    const f = preview.querySelector('iframe');
    if (!f || e.source !== f.contentWindow || e.data?.type !== 'nstarkman-embed') return;
    height = e.data.height;
    f.style.height = `${height}px`;
    render();
  });

  // A box made small — of set height at minor text — or no longer small
  // brings its own defaults; any other change of size keeps the title.
  let wasSmall = false;
  function defaults() {
    const d = defaultsOf(spec().slug);
    form.elements.title.value = d.title;
    if (d.rest !== undefined) form.elements.rest.value = d.rest;
    if (d.text !== undefined) form.elements.text.value = d.text;
  }

  const widthPills = el('eb-widths');
  function showWidths(width) {
    const key = String(stretch());
    if (widthPills.dataset.stretch !== key) {
      widthPills.dataset.stretch = key;
      widthPills.innerHTML = presetWidths(stretch()).map((w) => `<label><input type="radio" class="posradio" name="pxp" value="${w}" />${w}</label>`).join('');
    }
    for (const r of widthPills.querySelectorAll('input')) r.checked = +r.value === width;
  }

  // The set width and height open out of their pills — on choosing set, or
  // on clicking it again — and fold back once chosen: a preset picked, Enter
  // or Escape in a box, or a click or tab away.
  let widthOpen = false;
  const wasSet = { wmode: false, hmode: false }; // as they stood before a click, which comes before its change
  const widthBox = el('eb-px');
  function openWidth(open, input = form.elements.px) {
    widthOpen = open;
    if (!open) { // as clamped
      const s = spec();
      if (s.width != null) form.elements.px.value = s.width;
      if (s.height != null) form.elements.hpx.value = s.height;
    }
    render();
    if (open) { input.focus(); input.select(); }
  }
  for (const pill of form.querySelectorAll('.eb-setpx')) {
    pill.addEventListener('click', (e) => {
      if (e.target.type !== 'radio') return; // the label's click comes again from its radio
      // A click on set when already set fires no change, so it toggles here;
      // choosing set opens it in the change handler.
      if (wasSet[e.target.name]) openWidth(!widthOpen, e.target.name === 'hmode' ? form.elements.hpx : form.elements.px);
    });
  }
  document.addEventListener('pointerdown', (e) => {
    if (widthOpen && !e.target.closest('#eb-px, .eb-setpx')) openWidth(false);
  });
  widthBox.addEventListener('focusout', (e) => {
    if (widthOpen && e.relatedTarget && !e.relatedTarget.closest('#eb-px, .eb-setpx')) openWidth(false);
  });
  for (const input of [form.elements.px, form.elements.hpx]) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); openWidth(false); }
    });
  }

  // A pill with a tick box — Title, Authors, Text: the box shows the part or
  // not (none), coming back as it was. Ticked, its options come up under the
  // preview; unticked, they go.
  for (const [name, first] of [['title', 'full'], ['authors', 'full'], ['text', 'summary']]) {
    let last = first;
    el(`eb-${name}-on`).addEventListener('change', (e) => {
      e.stopPropagation();
      if (e.target.checked) form.elements[name].value = last;
      else { last = form.elements[name].value; form.elements[name].value = 'none'; }
      render();
      if (e.target.checked) {
        tune([name]);
        el(`eb-${name}-row`).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        el(`eb-${name}-row`).hidden = true;
        syncAll();
      }
    });
  }

  // Each track named by the parts shown either side of it in the preview —
  // "text · buttons" — as it was last laid out; by its own name until then.
  const trackBetween = {};
  const trackName = (t) => trackBetween[t] ?? t.replace('_', ' · ');
  // The tracks set, each with its px, flex and a way to remove it; or how to
  // add one.
  // < and > beside every number box step it themselves — NumBox — from what
  // the box shows where it is empty: what that comes to in the card as drawn,
  // or, with nothing to show, so many names from five (its data-from).
  function showTracks() {
    const set = SPACE_TRACKS.filter((t) => space[t]);
    el('eb-tracks').innerHTML = set.length ? set.map((t) => {
      const v = space[t];
      const and = trackName(t).replace(' · ', ' and ');
      return `<span class="eb-track eb-px"><span class="eb-dim" data-label="${t}">${trackName(t)}</span>`
        + `<span data-numbox="${t}"></span>`
        + (/^top_/.test(t) ? '' : `<span class="pilltoggle eb-checks"><label><input type="checkbox" class="eb-check" data-trackflex="${t}" ${v === 'flex' ? 'checked' : ''} />flex</label></span>`)
        + `<button type="button" class="eb-track-x" data-trackdel="${t}" aria-label="Remove the space between ${and}">✕</button></span>`;
    }).join('') : '<span class="eb-dim">⊕ between two parts in the preview adds one</span>';
    // Each track's box, the page's one NumBox copied, given its track.
    for (const slot of el('eb-tracks').querySelectorAll('[data-numbox]')) {
      const t = slot.dataset.numbox, box = el('eb-trackbox').content.firstElementChild.cloneNode(true), i = box.querySelector('input');
      i.dataset.track = t;
      i.value = space[t] === 'flex' ? '' : space[t];
      i.setAttribute('aria-label', `Space between ${trackName(t).replace(' · ', ' and ')}, in pixels`);
      slot.replaceWith(box);
    }
  }
  // The setting a size box belongs to, if the target is one.
  const sizeOf = (t) => Object.keys(STEP_PX).find((d) => t.name === `${d}px`);

  form.addEventListener('input', (e) => {
    if (['px', 'hpx', 'figpx'].includes(e.target.name)) render();
    // A side's width typed: in px, at least that many, unless % is chosen.
    const wn = /^w(left|right)n$/.exec(e.target.name);
    if (wn) {
      setRadio(`w${wn[1]}`, 'set');
      render();
    }
    // A track's px typed; empty is none.
    if (e.target.dataset?.track) {
      const t = e.target.dataset.track;
      if (e.target.value === '') delete space[t]; else space[t] = String(clampInt(e.target.value, 0, 64));
      render();
    }
    // A frame typed is that many px, on no step.
    if (e.target.name === 'framepx') { for (const r of form.elements.frame) r.checked = false; render(); }
    if (e.target.name === 'bgap' || e.target.name === 'partgap' || /^h(top|bottom)$/.test(e.target.name)) render();
    // A text size typed leaves by text.
    if (e.target.name === 'paperword' || e.target.name === 'vsplitn') render();
    const face = FACES.find((p) => e.target.name === `${p}size`);
    if (face) { setRadio(`${face}by`, e.target.value === '' ? 'text' : ''); render(); }
    // Typing a number of names chooses it.
    if (e.target.name === 'authorsn') { form.elements.authors.value = 'n'; render(); }
    const d = sizeOf(e.target);
    if (d) { setRadio(d, ''); render(); }
  });
  // Nothing to send: Enter in the width box keeps the page, and a width out of
  // range is clamped by spec(), not refused.
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', (e) => {
    if (e.target.name === 'card') {
      buildExtras(e.target.value);
      start();
    } else if (e.target.name === 'preset' && e.target.value) {
      if (e.target.value === presets[0].slug) start(); else apply(e.target.value); // to look at; custom changes nothing
    } else if (e.target.name === 'foot') {
      // A new area, its own place: in a side, the links at its top and
      // toward its edge; under the words or at the bottom, at the left,
      // the year at the bottom of the buttons.
      const side = ['left', 'right'].includes(e.target.value);
      form.elements.railalign.value = side ? e.target.value : 'left';
      form.elements.footend.value = 'top';
      for (const [k] of SMALL) resetPlace(k);
    } else if (['footend', 'railalign'].includes(e.target.name)) {
      // The buttons moved in their area: what sits with them, away from them.
      for (const [k] of SMALL) if (!form.elements[`${k}at`].value) resetPlace(k);
    } else if (/^(pos|year|ctx)at$/.test(e.target.name)) {
      // Among the buttons, it joins their order, first; elsewhere, it leaves.
      const k = e.target.name.slice(0, -2);
      btnOrder = btnOrder.filter((x) => x !== CELL[k]);
      if (e.target.value === 'list') btnOrder = [CELL[k], ...btnOrder];
      resetPlace(k);
    } else if (e.target.name === 'link' && !e.target.checked) {
      // Hidden, a button is hidden wherever it is: out of the group that had it.
      for (const g of groups) g.links = g.links.filter((k) => k !== e.target.value);
      groups = groups.filter((g) => g.links.some((k) => k !== 'empty'));
    } else if (e.target.name === 'paperbtn') {
      if (e.target.checked) tune(['paper']); else el('eb-paper-row').hidden = true; // ticked, its settings come up; unticked, they go
    } else if (e.target.name === 'venueline') {
      form.elements.authorsline.value = V2A[e.target.value]; // the same choice, from the authors' side
      if (e.target.value !== 'authors') st.lastAreas = e.target.value;
    } else if (e.target.name === 'authorsline') {
      form.elements.venueline.value = A2V[e.target.value];
      if (e.target.value !== 'shared') st.lastAreas = A2V[e.target.value];
    } else if (e.target.name === 'venueorder') {
      form.elements.authorsorder.value = e.target.value === 'before' ? 'after' : 'before'; // the same order, from the authors' side
    } else if (e.target.name === 'authorsorder') {
      form.elements.venueorder.value = e.target.value === 'before' ? 'after' : 'before';
    } else if (FACES.some((p) => e.target.name === `${p}by`)) {
      form.elements[`${e.target.name.slice(0, -2)}size`].value = ''; // by text: no size of its own
    } else if (e.target.name === 'bgapu') {
      showGap(); // the same gap, shown in its new unit
    } else if (/^w(left|right)u$/.test(e.target.name)) {
      setRadio(`w${e.target.name.slice(1, -1)}`, 'set'); // a unit chosen is a width set
    } else if (e.target.name === 'titleat') {
      // The top area's settings come with the title into it, and go with it.
      el('eb-area-top-row').hidden = !canTuneRow(el('eb-area-top-row'));
    } else if (e.target.name === 'title' && e.target.value === 'full') {
      form.elements.rest.value = 'split'; // choosing full starts it split
    } else if (e.target.name === 'authorsn') {
      form.elements.authors.value = 'n'; // a number typed is that choice
      e.target.value = namesN(snap()); // as clamped
    } else if (e.target.name === 'authors' && e.target.value === 'n') {
      if (form.elements.authorsn.value === '') form.elements.authorsn.value = 5;
    } else if (e.target.dataset?.trackflex) {
      const t = e.target.dataset.trackflex;
      space[t] = e.target.checked ? 'flex' : '8';
      showTracks();
    } else if (e.target.name === 'frame') {
      form.elements.framepx.value = ''; // a step or none, in place of a size
    } else if (e.target.name === 'perp') {
      form.elements.perrow.value = ''; // square or fit, in place of a number
    } else if (e.target.name === 'figp') {
      form.elements.figpx.value = '';
    } else if (e.target.name === 'figpx') {
      if (e.target.value !== '') e.target.value = figWidth(snap()); // as clamped
    } else if (sizeOf(e.target)) {
      if (e.target.value !== '') e.target.value = typedPx(snap(), sizeOf(e.target), STEP_PX); // as clamped
    } else if (e.target.name === 'pxp') {
      // A preset width keeps the box's shape where the height is set too.
      const ratio = boxHeight(snap(), limits) / (+form.elements.px.value || 320);
      form.elements.px.value = e.target.value;
      if (form.elements.hmode.value === 'px') form.elements.hpx.value = Math.round(e.target.value * ratio);
      widthOpen = false;
    } else if (e.target.name === 'wmode' && e.target.value === 'px') {
      widthOpen = true;
      setTimeout(() => { form.elements.px.focus(); form.elements.px.select(); });
    } else if (e.target.name === 'hmode' && e.target.value === 'px') {
      widthOpen = true;
      setTimeout(() => { form.elements.hpx.focus(); form.elements.hpx.select(); });
    } else if (e.target.name === 'shape') {
      // A shape sets the height from the width.
      form.elements.hpx.value = shapeHeight(form.elements.px.value, e.target.value);
    } else if (e.target.name === 'wmode' && e.target.value === 'px') {
      // A set width has its look by width: standard there is by width.
      for (const d of DIALS) if (form.elements[d].value === 'standard') setRadio(d, 'width');
    } else if (e.target.name === 'wmode' && e.target.value === 'fill') {
      // A card that fills its width has no set width to follow: a setting by
      // width is standard.
      for (const d of DIALS) if (form.elements[d].value === 'width') setRadio(d, 'standard');
    }
    // A new size or text size brings its own defaults.
    // A box made small — of set height at minor text — or no longer small
    // brings its own defaults; any other change of size keeps the title.
    if (['wmode', 'hmode', 'textsize', 'px', 'hpx', 'shape', 'pxp'].includes(e.target.name) && smallBox(spec().slug) !== wasSmall) defaults();
    render();
  });

  const tuneRows = [...document.querySelectorAll('[data-tune]')];
  // The buttons and the paper button are one box: either's settings come up
  // with the other's, the paper's where it is on.
  const TOGETHER = [['foot', 'paper']];
  function tune(keys) {
    for (const g of TOGETHER) if (g.some((k) => keys.includes(k))) keys = [...new Set([...keys, ...g])];
    for (const r of tuneRows) r.hidden = !keys.includes(r.dataset.tune) || !canTuneRow(r);
    syncAll();
  }
  // < and > on a button in the order line: earlier or later by one.
  el('eb-order').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const shown = shownOrder(), i = +b.closest('[data-i]')?.dataset.i;
    if (b.dataset.add != null) setShown([...shown, 'empty']);
    else if (b.dataset.drop != null) setShown(shown.filter((_, j) => j !== i));
    else if (b.dataset.move) moveButton(i, i + +b.dataset.move);
  });
  // ✕ on a track takes its space away.
  el('eb-tracks').addEventListener('click', (e) => {
    const t = e.target.closest('[data-trackdel]')?.dataset.trackdel;
    if (!t) return;
    delete space[t];
    showTracks();
    render();
  });

  // Show all, or — once every row the item can show is up — hide all.
  const tuneAll = el('eb-tune-all');
  function syncAll() {
    tuneAll.textContent = tuneRows.filter(canTuneRow).every((r) => !r.hidden) ? 'hide all' : 'show all';
  }

  // The surface the preview's modules are given.
  const b = { limits, form, el, items, space, areasOn, st, trackBetween, trackName, showTracks, tune, render, setRadio, sideKind, showGap, stackedIn, moveButton, moveKey, groupsOf: () => groups };
  tuneAll.addEventListener('click', () => tune(tuneAll.textContent === 'hide all' ? [] : tuneRows.map((r) => r.dataset.tune)));

  // The PNG, PDF or SVG, drawn here from the preview when asked for.
  const exporter = { preview, site, fonts, say: (m) => (note.textContent = m) };
  download.addEventListener('click', async () => {
    const s = spec();
    download.disabled = true;
    try {
      await downloadCard(exporter, s);
      render();
    } catch (err) {
      note.textContent = `Could not draw the ${{ pdf: 'PDF', svg: 'SVG' }[s.format] ?? 'PNG'}: ${err.message}`;
    } finally {
      download.disabled = false;
    }
  });

  // Name ▸ shows the card's name beside it; again hides it.
  el('eb-name-toggle').addEventListener('click', () => {
    const open = el('eb-name-toggle').getAttribute('aria-expanded') !== 'true';
    el('eb-name-toggle').setAttribute('aria-expanded', String(open));
    el('eb-slug').hidden = !open;
  });

  // Settings out: the card's name, theme and format — not the item. In: the
  // same, checked by reading the name back, then loaded onto whichever item is
  // chosen. Extras and links the item has not got stay off, as with a preset.
  el('eb-export').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([serializeSettings(spec())], { type: 'application/json' }));
    a.download = 'card-settings.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const importFile = el('eb-import-file');
  el('eb-import').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const f = importFile.files[0];
    importFile.value = ''; // the same file again is a change too
    if (!f) return;
    try {
      const { name, theme, format } = parseSettings(await f.text());
      apply(name);
      form.elements.theme.value = theme;
      if (format) form.elements.format.value = format;
    } catch (err) {
      note.textContent = `Could not import ${f.name}: ${err.message}`;
      return;
    }
    render();
  });

  // The copy mark turns into a tick for a moment once the snippet is on the
  // clipboard. Where the clipboard is refused, the snippet is selected instead
  // and the label says how to copy it.
  const say = (label, icon) => {
    copy.setAttribute('aria-label', label);
    copy.title = label;
    copy.querySelector('use').setAttribute('href', `#${icon}`);
  };
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.value);
      say('Copied', 'i-check');
    } catch {
      code.select();
      say('Press ⌘C / Ctrl+C to copy', 'i-copy');
    }
    setTimeout(() => say('Copy snippet', 'i-copy'), 1500);
  });

  buildExtras(form.elements.card.value);
  start();
  render();
}
