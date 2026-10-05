// The Card Builder's preview geometry, with no DOM: where a card's grid puts
// its space tracks, how each is named, and where a part dragged in the
// preview may be dropped. Positions are in px, relative to the card.

/** The sum of the first i of a list of track sizes. */
export const sum = (a, i) => a.slice(0, i).reduce((x, y) => x + y, 0);

// The card's grid has fourteen rows and five columns: the left side, the
// center and the right side, the gutters between. Each space track by its
// index among them.
export const GRID_ROWS = 14;
export const GRID_COLS = 5;
export const ROW_TRACKS = [[1, 'title_figure'], [3, 'figure_authors'], [5, 'authors_venue'], [7, 'venue_text'], [9, 'text_buttons'], [12, 'center_bottom']];
export const COL_TRACKS = [[1, 'left_center'], [3, 'center_right']];
/** The rows a part sits in, as the tracks run between them. */
export const ROW_SLOTS = [0, 2, 4, 6, 8, 11, 13];
export const COL_NAMES = { 0: 'LHS', 2: 'center', 4: 'RHS' };
/** A grid column's index among the five, by the area it holds. */
export const COL_OF = { left: 0, center: 2, right: 4 };

/** A track named by the parts shown before and after it, or the card's edge:
 *  "text · buttons". slots are the row indices that hold a part, names each
 *  one's part, sizes the rows' heights; i is the track's index. */
export function named(slots, names, sizes, i) {
  const shown = slots.filter((j) => sizes[j] > 0.5);
  const a = shown.filter((j) => j < i).at(-1), b = shown.find((j) => j > i);
  return `${names[a] ?? 'edge'} · ${names[b] ?? 'edge'}`;
}

/** Of the tracks between two parts shown, the one that holds the gap between
 *  them — the buttons' sits on their side, past an empty figure column — so a
 *  space set there is the whole of it, not added to it. */
export function between(slots, tracks, sizes) {
  const shown = slots.filter((i) => sizes[i] > 0.5);
  return shown.slice(1).map((b, k) => {
    const c = tracks.filter(([i]) => i > shown[k] && i < b);
    return c.find(([i]) => sizes[i] > 0.5) ?? c[0];
  }).filter(Boolean);
}

/** Where dropping the authors or the venue puts the venue's area, as the
 *  Published row's menus have it. Dragged by its area, an area goes above,
 *  below, left or right of the other's; by its words, an element goes before
 *  or after what is there — or, sharing one, back to its own area. `box` is
 *  the other's [x, y, w, h]; returns the zones and, for each, the [line,
 *  order] settings it makes. */
export function venueDrops({ isArea, venue, shared, box: [x, y, w, h], lastAreas }) {
  const out = Math.max(h, 22);
  const zones = isArea
    ? { above: [x, y - out, w, out], left: [x, y, w / 2, h], right: [x + w / 2, y, w / 2, h], below: [x, y + h, w, out] }
    : { before: [x, y, w / 2, h], after: [x + w / 2, y, w / 2, h], ...(shared && { 'own area': [x, y + h, w, out] }) };
  const put = isArea
    ? venue ? { above: ['above'], left: ['left'], right: ['right'], below: ['below'] } : { above: ['below'], left: ['right'], right: ['left'], below: ['above'] }
    : { before: ['authors', venue ? 'before' : 'after'], after: ['authors', venue ? 'after' : 'before'], 'own area': [lastAreas] };
  return { zones, put };
}

/** Where each of a part's areas is, near enough to drop into, whether it is
 *  there or not: the top a band above the center's parts, the bottom one
 *  below them, each side its column or, not there, a sixth of the card; the
 *  center the rest — the card shared among its own areas alone. Sizes T, B,
 *  L and R are each area's extent, 0 for one the part may not go to. */
export function partZones({ W, H, T, B, L, R }) {
  return { top: [0, 0, W, T], bottom: [0, H - B, W, B], left: [0, T, L, H - T - B], right: [W - R, T, R, H - T - B], center: [L, T, W - L - R, H - T - B] };
}

/** The positions in an area: its zone cut into up-and-down rows and across
 *  columns, a menu's values each — grown into the card, where the zone is a
 *  thin band, to at least 18px a row and 36px a column. */
export function cellGrid(zone, area, vs, hs) {
  let [zx, zy, zw, zh] = zone;
  const mw = hs.length * 36, mh = vs.length * 18;
  if (zw < mw) { if (area === 'right') zx -= mw - zw; zw = mw; }
  if (zh < mh) { if (area === 'bottom') zy -= mh - zh; zh = mh; }
  return { zx, zy, zw, zh, w: zw / hs.length, h: zh / vs.length };
}
