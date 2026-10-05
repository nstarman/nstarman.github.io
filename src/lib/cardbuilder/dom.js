// Small DOM helpers the Card Builder's modules share.

/** Where each part with a size and weight of its own is drawn in the card, to
 *  show what an empty size comes to. */
export const FACE_Q = { body: '.c-text :is(.c-sum, .c-det)', authors: '.c-by', venue: ':is(.c-venue, .c-byvenue)', position: '.c-place', year: ':is(.c-yr, .c-year)', context: '.c-context' };

/** A drag: move as the pointer moves over target, then up once it is let
 *  go, the listeners taken away — capture, the release caught first. */
export const drag = (target, move, up, capture = false) => {
  const end = (ev) => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end, capture); up(ev); };
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', end, capture);
};

/** The first of root's q that is drawn. */
export const shownIn = (root, q) => [...root.querySelectorAll(q)].find((x) => x.getClientRects().length);
