// A gap the CV builder lets you set: a multiple of the gap's own size (`x`)
// or a length in points (`pt`). The arithmetic of GapInput.astro, apart from
// the page so it can be tested, and shared with the saved-selection reader so
// a file is held to the same limits as the field.

/** How far one ‹ or › moves, and how far a value may go, per unit. */
export const UNITS = {
  x: { step: 0.5, min: 0, max: 4 },
  pt: { step: 1, min: 0, max: 72 },
};

/** The gap as it is when nobody has touched it. */
export const DEFAULT_GAP = Object.freeze({ value: 1, unit: 'x' });

export const isDefault = (g) => g.unit === 'x' && g.value === 1;

// To two decimals: enough for 9.9pt or 1.25×, and no 0.30000000000000004.
const round = (v) => Math.round(v * 100) / 100;

/** `v` held to the unit's limits, or null when it is not a number at all. */
export function clampGap(v, unit) {
  const n = typeof v === 'string' ? Number(v.trim()) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || (typeof v === 'string' && !v.trim())) return null;
  const { min, max } = UNITS[unit];
  return round(Math.min(max, Math.max(min, n)));
}

/** One ‹ (`dir` −1) or › (+1) from `value`. */
export const stepGap = (value, unit, dir) => clampGap(value + dir * UNITS[unit].step, unit);

/** The same gap in the other unit, given its own size in points. */
export function convertGap(value, from, to, base) {
  if (from === to) return value;
  return clampGap(to === 'pt' ? value * base : value / base, to);
}

/** A saved or sent gap, checked: a bare number is a multiple, as selections
 *  saved before points existed have it; anything else malformed is null. */
export function readSavedGap(raw) {
  if (typeof raw === 'number') raw = { value: raw, unit: 'x' };
  if (raw === null || typeof raw !== 'object' || !(raw.unit in UNITS)) return null;
  if (typeof raw.value !== 'number' || !Number.isFinite(raw.value)) return null;
  const { min, max } = UNITS[raw.unit];
  if (raw.value < min || raw.value > max) return null;
  return { value: raw.value, unit: raw.unit };
}

// ── the field ─────────────────────────────────────────────────────────────
// `data-last` holds the last settled value and unit, so a bad entry can go
// back to it and a unit change knows what it is converting from.

/** The gap a GapInput holds. */
export function readGap(root) {
  return {
    value: Number(root.querySelector('.gapin-val').dataset.last),
    unit: root.querySelector('.gapin-unit').dataset.last,
  };
}

/** Set a GapInput, firing nothing. */
export function writeGap(root, { value, unit }) {
  const val = root.querySelector('.gapin-val');
  const sel = root.querySelector('.gapin-unit');
  val.value = val.dataset.last = String(value);
  sel.value = sel.dataset.last = unit;
}
