// A length given either relative to a base size (`x`, a multiple of it) or
// absolutely (`pt`, in points). The arithmetic of LengthInput.astro, apart
// from the page so it can be tested, and shared with whatever reads a saved
// length back — the CV builder's selection file — so a file is held to the
// same limits as the field.

/** How far one ‹ or › moves, and how far a value may go, per unit. */
export const UNITS = {
  x: { step: 0.5, min: 0, max: 4 },
  pt: { step: 1, min: 0, max: 72 },
};

/** The length as it is when nobody has touched it: the base itself. */
export const DEFAULT_LENGTH = Object.freeze({ value: 1, unit: 'x' });

export const isDefault = (g) => g.unit === 'x' && g.value === 1;

// To two decimals: enough for 9.9pt or 1.25×, and no 0.30000000000000004.
const round = (v) => Math.round(v * 100) / 100;

/** `v` held to the unit's limits, or null when it is not a number at all. */
export function clampLength(v, unit) {
  const n = typeof v === 'string' ? Number(v.trim()) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || (typeof v === 'string' && !v.trim())) return null;
  const { min, max } = UNITS[unit];
  return round(Math.min(max, Math.max(min, n)));
}

/** One ‹ (`dir` −1) or › (+1) from `value`. */
export const stepLength = (value, unit, dir) => clampLength(value + dir * UNITS[unit].step, unit);

/** The same length in the other unit, given the base size in points. */
export function convertLength(value, from, to, base) {
  if (from === to) return value;
  return clampLength(to === 'pt' ? value * base : value / base, to);
}

/** A saved or sent length, checked: a bare number is a multiple, as CV
 *  selections saved before points existed have it; anything else malformed
 *  is null. */
export function readSavedLength(raw) {
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

/** The length a LengthInput holds. */
export function readLength(root) {
  return {
    value: Number(root.querySelector('.lengthin-val').dataset.last),
    unit: root.querySelector('.lengthin-unit').dataset.last,
  };
}

/** Set a LengthInput, firing nothing. */
export function writeLength(root, { value, unit }) {
  const val = root.querySelector('.lengthin-val');
  const sel = root.querySelector('.lengthin-unit');
  val.value = val.dataset.last = String(value);
  sel.value = sel.dataset.last = unit;
}
