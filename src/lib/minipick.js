// The gutter map's behaviour: opening it, picking someone, and marking what we
// wrote together.
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
 * Wire the CV's gutter map. Idempotent, and silent when the map is not on the
 * page — a preset that renders no publications section renders no map either.
 *
 * @param {string} id the aside's element id — what the two buttons that work
 *   it name in `aria-controls`.
 */
export function wireMiniMap(id = 'cv-collab-map') {
  const aside = document.getElementById(id);
  const pick = aside?.querySelector('.cvmini-who');
  if (!aside || !pick || aside.dataset.wired) return;
  aside.dataset.wired = '1';

  // Dots and trajectories alike — anything the map draws per person.
  const drawn = [...aside.querySelectorAll('[data-c]')];
  // Only the rows this CV actually rendered: a preset that drops a paper has no
  // row to mark, which is not an error, just a shorter CV.
  const rowFor = (paper) => document.getElementById(`item-${paper}`);

  let marked = [];

  /** The marked rows, which live outside this aside and so must be cleaned up
   *  explicitly. A mark with no map to explain it is just an unexplained green
   *  row, so nothing is marked while the map is shut. */
  const markPapers = () => {
    for (const row of marked) row.classList.remove('is-coauthor');
    marked = [];
    if (aside.hidden || pick.value === '') return;

    const opt = pick.options[pick.selectedIndex];
    for (const paper of (opt.dataset.papers || '').split(' ').filter(Boolean)) {
      const row = rowFor(paper);
      if (row) { row.classList.add('is-coauthor'); marked.push(row); }
    }
  };

  // Picking a collaborator does two things at once, and the second is the point
  // of putting this map next to a CV rather than on its own page: it narrows
  // the map to where that person has worked, and it marks the papers in the
  // list beside it that we wrote together.
  pick.addEventListener('change', () => {
    const only = pick.value;
    for (const d of drawn) d.style.display = only === '' || d.dataset.c === only ? '' : 'none';
    // The stylesheet brings the surviving trajectory up from its resting
    // faintness; expressed as one attribute rather than a class per element.
    if (only === '') delete aside.dataset.only;
    else aside.dataset.only = only;
    markPapers();
  });

  // The button that opens the map belongs to the CV's heading row, where a
  // paper's source mark sits — it cannot live inside an aside that is
  // positioned into the margin. Its behaviour can, and does, so all of the
  // map's client code is this file.
  const btn = document.querySelector('.cvminibtn');
  // `hidden` rather than a class, so with the map closed a screen reader is
  // told the same thing the eye is, and `aria-expanded` says which way it is.
  const setOpen = (open) => {
    aside.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    const words = `${open ? 'Hide' : 'Show'} where my collaborators have worked`;
    btn.setAttribute('aria-label', words);
    btn.setAttribute('title', words);
  };
  btn?.addEventListener('click', () => setOpen(aside.hidden));

  // The panel's own copy of the button only ever shuts it — it is inside the
  // thing it hides. Focus goes back to the heading's button, because closing
  // has just removed the focused element from the page; `preventScroll`
  // because the point of the second button is that the heading is far above.
  aside.querySelector('.cvmini-shut')?.addEventListener('click', () => {
    setOpen(false);
    btn.focus({ preventScroll: true });
  });

  // Watch the attribute rather than calling markPapers from the handler above:
  // whoever hides the aside — that button, a future one, or a stylesheet change
  // — the marks go with it, and the selection is honoured again when it reopens.
  new MutationObserver(markPapers)
    .observe(aside, { attributes: true, attributeFilter: ['hidden'] });
}
