// The picking, hovering and dimming shared by the maps on this site.
//
// Progressive enhancement, and only that: with no JavaScript every pin, every
// trajectory and every name is already on the page, which is the honest default
// anyway. What this adds is the ability to pull one entry out of thirty.
//
// It toggles `hidden` rather than a class so the effect is in the DOM rather
// than only in the paint — a screen reader is told the same thing the eye is.
//
// Written against the markup both maps share — a `.cmap` figure containing
// `.cmap-pin`/`.cmap-trail` elements, a `.cmap-who` select, and a `.cmap-list`
// whose items carry the same `data-c` — rather than against either one, so the
// conference map got this behaviour without a second copy of it.

function wire(fig) {
  const pick = fig.querySelector('.cmap-who');
  if (!pick) return;
  const all = (sel) => [...fig.querySelectorAll(sel)];
  const list = fig.querySelector('.cmap-list');

  const show = (only) => {
    const mine = (el) => only === '' || el.dataset.c === only;
    for (const el of all('.cmap-pin, .cmap-trail')) el.style.display = mine(el) ? '' : 'none';
    // Showing everything means the map, and only the map: a roster of thirty
    // entries under it is the wall of text the picker exists to avoid.
    if (list) {
      list.hidden = only === '';
      for (const li of all('.cmap-list > li')) {
        li.hidden = !mine(li);
        // The detail belongs to whoever was asked for.
        const detail = li.querySelector('ol');
        const note = li.querySelector('.cmap-note');
        // Only the one asked for; the others are hidden anyway, and content
        // inside a hidden element should not be pretending to be visible.
        const open = only !== '' && mine(li);
        if (detail) detail.hidden = !open;
        if (note) note.hidden = !open;
      }
    }
    fig.dataset.only = only;
  };

  // Hover and keyboard linking between the two halves. Set on the elements
  // rather than expressed as a rule keyed off the figure: CSS cannot say "this
  // element's data-c matches its ancestor's data-hover" without one rule per
  // entry, and the version that dimmed everything and lit the match back up did
  // not survive contact with a real browser. This does one thing and can be
  // checked by reading it back.
  const dimmable = () => all('.cmap-pin, .cmap-trail, .cmap-list > li');
  const mark = (el) => {
    const owner = el?.closest?.('[data-c]');
    const only = owner?.dataset.c;
    for (const e of dimmable()) {
      // Trails carry their own resting opacity, so restoring means clearing the
      // override rather than writing 1 over the top of it.
      e.style.opacity = only === undefined || e.dataset.c === only ? '' : '.12';
    }
    if (only === undefined) delete fig.dataset.hover;
    else fig.dataset.hover = only;
  };

  pick.addEventListener('change', () => show(pick.value));
  show('');

  fig.addEventListener('pointerover', (e) => mark(e.target));
  fig.addEventListener('pointerleave', () => mark(null));
  fig.addEventListener('focusin', (e) => mark(e.target));
  fig.addEventListener('focusout', () => mark(null));

  // Clicking a pin or a trail picks it, which is what pointing at something on
  // a map and pressing it ought to do. Hover deliberately does not: sweeping
  // the cursor across eighty-five pins would rebuild the list under the reader
  // several times a second. Hover previews by dimming the others; the click
  // commits.
  fig.addEventListener('click', (e) => {
    const owner = e.target.closest?.('.cmap-pin, .cmap-trail');
    if (!owner) return;
    pick.value = owner.dataset.c;
    show(pick.value);
    // Selecting hides everything else, so the thing being pointed at is no
    // longer under the cursor and the dimming has nothing left to say.
    mark(null);
  });
}

/** Wire every map on the page, once each. Both components import this, and
 *  Astro serves one copy of the module however many of them there are. */
export function wireAll() {
  for (const fig of document.querySelectorAll('.cmap')) {
    if (fig.dataset.wired) continue;
    fig.dataset.wired = '1';
    wire(fig);
  }
}
