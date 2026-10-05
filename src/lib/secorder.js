// Reordering the CV builder's sections: the one rule, and the long-hold drag.
//
// The page, the contents list and the compile all read one list of section
// ids, so everything here is about that list. `move` is the rule, kept free of
// the DOM so it is tested; `holdDrag` is the gesture, which needs a browser.

/** `order` with `id` one place `dir` (-1 up, 1 down) along; unchanged at an end. */
export function move(order, id, dir) {
  const i = order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const out = [...order];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/**
 * Lets the items of a list (`ol > li`) be dragged into a new order after a long
 * hold, so a plain tap still follows the link and a plain swipe still scrolls
 * the strip. The list runs down on the rail and across on the narrow-screen
 * strip; which, is read from the CSS at the time rather than restated here.
 *
 * Items are moved in place as the pointer passes them; `onDrop` is told once,
 * when it is let go, and reads the new order from the list.
 */
export function holdDrag(ol, { onDrop, hold = 450, slop = 8 }) {
  let g = null;
  const end = () => {
    if (!g) return;
    clearTimeout(g.timer);
    if (g.on) {
      g.li.classList.remove('is-lifted');
      ol.classList.remove('is-sorting');
      // The release is also a click on the link under it; that is not a visit.
      const stop = (e) => e.preventDefault();
      ol.addEventListener('click', stop, { capture: true, once: true });
      // Not every release makes a click (it lands on the list, not a link).
      setTimeout(() => ol.removeEventListener('click', stop, true), 0);
      onDrop();
    }
    g = null;
  };

  ol.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('li');
    if (!li || e.button) return;
    g = { li, id: e.pointerId, x: e.clientX, y: e.clientY, on: false };
    g.timer = setTimeout(() => {
      g.on = true;
      g.li.classList.add('is-lifted');
      ol.classList.add('is-sorting');
      try { ol.setPointerCapture(g.id); } catch {}
    }, hold);
  });

  ol.addEventListener('pointermove', (e) => {
    if (!g) return;
    if (!g.on) {
      // Moving before the hold is over is a scroll or a swipe, not a pick-up.
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > slop) { clearTimeout(g.timer); g = null; }
      return;
    }
    const down = getComputedStyle(ol).flexDirection === 'column';
    const p = down ? e.clientY : e.clientX;
    for (const li of ol.children) {
      if (li === g.li) continue;
      const r = li.getBoundingClientRect();
      if (p < (down ? r.top : r.left) || p > (down ? r.bottom : r.right)) continue;
      // Over a neighbour: take its place, from whichever side we came.
      if (g.li.compareDocumentPosition(li) & Node.DOCUMENT_POSITION_FOLLOWING) li.after(g.li);
      else li.before(g.li);
      break;
    }
  });

  // A touch scroll cannot be told to stop once begun except from here.
  ol.addEventListener('touchmove', (e) => { if (g?.on) e.preventDefault(); }, { passive: false });
  ol.addEventListener('contextmenu', (e) => { if (g?.on) e.preventDefault(); });
  ol.addEventListener('dragstart', (e) => e.preventDefault());
  ol.addEventListener('pointerup', end);
  ol.addEventListener('pointercancel', end);
}
