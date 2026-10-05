// The gutter maps' behaviour: opening one, picking someone or somewhere, and
// marking the rows in the CV that answer the pick — the papers we wrote
// together, or the talks given there.
//
// mappick.js's counterpart. Not the same module, because this is not the same
// interaction: the full maps pair a picker with a roster and dim between the
// two halves, while this one has no roster and instead reaches out of its own
// aside into the CV beside it. Sharing one module would mean each page
// shipping the other's behaviour to run neither.
//
// Progressive enhancement, as everywhere else here: with no JavaScript the map
// still draws every pin and the link still goes to the full version.

/**
 * Wire one of the CV's gutter maps. Idempotent, and silent when the map is not
 * on the page — a preset that renders no publications section renders no
 * collaborator map either, and one with no talks no conference map.
 *
 * The aside says what it shows in `data-words`, and each option lists the rows
 * it marks in `data-rows`, so this file knows nothing about either map's data.
 *
 * @param {string} id the aside's element id — what the two buttons that work
 *   it name in `aria-controls`.
 * @param {{ jump?: boolean }} [opts] `jump`: a pin is clickable, and picking
 *   scrolls the CV to the first row marked — the newest, as `data-rows` is
 *   listed newest-first. Where dots stack, as colleagues at one institution
 *   do, a click picks whichever is drawn on top; the picker reaches the rest.
 */
export function wireMiniMap(id = 'cv-collab-map', { jump = false } = {}) {
  const aside = document.getElementById(id);
  const pick = aside?.querySelector('.cvmini-who');
  if (!aside || !pick || aside.dataset.wired) return;
  aside.dataset.wired = '1';

  // Dots and trajectories alike — anything the map draws per pickable thing.
  const drawn = [...aside.querySelectorAll('[data-c]')];
  // Only the rows this CV actually rendered: a preset that drops a paper has no
  // row to mark, which is not an error, just a shorter CV.
  const rowFor = (id) => document.getElementById(`item-${id}`);

  let marked = [];

  /** The marked rows, which live outside this aside and so must be cleaned up
   *  explicitly. A mark with no map to explain it is just an unexplained green
   *  row, so nothing is marked while the map is shut. */
  const markRows = () => {
    for (const row of marked) row.classList.remove('is-lit');
    marked = [];
    if (aside.hidden || pick.value === '') return;

    const opt = pick.options[pick.selectedIndex];
    for (const id of (opt.dataset.rows || '').split(' ').filter(Boolean)) {
      const row = rowFor(id);
      if (row) { row.classList.add('is-lit'); marked.push(row); }
    }
  };

  // Picking does two things at once, and the second is the point of putting
  // this map next to a CV rather than on its own page: it narrows the map to
  // the one person or place, and it marks the rows in the list beside it.
  pick.addEventListener('change', () => {
    const only = pick.value;
    for (const d of drawn) d.style.display = only === '' || d.dataset.c === only ? '' : 'none';
    // The stylesheet brings the surviving trajectory up from its resting
    // faintness; expressed as one attribute rather than a class per element.
    if (only === '') delete aside.dataset.only;
    else aside.dataset.only = only;
    markRows();
    // On the user's pick only, not in markRows: reopening the map re-marks
    // the rows, and that should not yank the page somewhere.
    if (jump && marked.length > 0) {
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      marked[0].scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
    }
  });

  // A pin picks itself, through the picker, so the two cannot disagree. The
  // picker stays the keyboard's way in; a 3px pin is a shortcut for a mouse.
  if (jump) {
    aside.querySelector('.cvmini-svg')?.addEventListener('click', (e) => {
      const c = e.target.closest('[data-c]')?.dataset.c;
      if (c === undefined) return;
      pick.value = c;
      pick.dispatchEvent(new Event('change'));
    });
  }

  // The button that opens the map belongs to the CV's heading row, where a
  // paper's source mark sits — it cannot live inside an aside that is
  // positioned into the margin. Its behaviour can, and does, so all of the
  // map's client code is this file.
  // Found by what they control. The conference map has one on every talk
  // heading it spans, and all of them must agree on whether it is open.
  const btns = [...document.querySelectorAll(`.cvminibtn[aria-controls="${id}"]`)];
  // The one last used, so closing from the panel hands focus back to it.
  let opener = btns[0];
  // `hidden` rather than a class, so with the map closed a screen reader is
  // told the same thing the eye is, and `aria-expanded` says which way it is.
  const setOpen = (open) => {
    aside.hidden = !open;
    const words = `${open ? 'Hide' : 'Show'} ${aside.dataset.words}`;
    for (const btn of btns) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', words);
      btn.setAttribute('title', words);
    }
  };
  for (const btn of btns) {
    btn.hidden = false;
    btn.addEventListener('click', () => { opener = btn; setOpen(aside.hidden); });
  }

  // The panel's own copy of the button only ever shuts it — it is inside the
  // thing it hides. Focus goes back to the heading's button, because closing
  // has just removed the focused element from the page; `preventScroll`
  // because the point of the second button is that the heading is far above.
  aside.querySelector('.cvmini-shut')?.addEventListener('click', () => {
    setOpen(false);
    opener?.focus({ preventScroll: true });
  });

  // Watch the attribute rather than calling markRows from the handler above:
  // whoever hides the aside — that button, a future one, or a stylesheet change
  // — the marks go with it, and the selection is honoured again when it reopens.
  new MutationObserver(markRows)
    .observe(aside, { attributes: true, attributeFilter: ['hidden'] });
}
