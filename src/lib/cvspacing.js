// A spacing the CV builder sets: a multiple of the gap's own size (`x`) or a
// length in points (`pt`), entered in a NumBox. Its units, and how a value is
// read from a box, written to one, and read back from a saved selection — all
// held to the same limits.

import { applyUnit } from './numbox.js';

/** Each unit's step, limits and typing precision. */
export const SPACING_UNITS = {
  x: { by: 0.5, min: 0, max: 4, step: 0.01 },
  pt: { by: 1, min: 0, max: 72, step: 0.1 },
};

/** The NumBox units for a gap whose own size is `base` points. Empty, the
 *  box is that size, and its placeholder says so in either unit. */
export const spacingUnits = (base) => [
  { value: 'x', label: '×', title: 'A multiple of its own size', ...SPACING_UNITS.x, per: base, placeholder: 1, checked: true },
  { value: 'pt', label: 'pt', title: 'In points', ...SPACING_UNITS.pt, per: 1, placeholder: base },
];

const inRange = (v, unit) => {
  const { min, max } = SPACING_UNITS[unit];
  return Math.min(max, Math.max(min, v));
};

/** The spacing a box holds, `{value, unit}`, or null when it is empty — its
 *  own size. */
export function readSpacing(box) {
  const input = box.querySelector('input');
  const unit = box.querySelector('select.numbox-unit').value;
  if (input.value === '' || !Number.isFinite(+input.value)) return null;
  return { value: inRange(+input.value, unit), unit };
}

/** Set a box to `g`, or empty it for null; fires nothing. */
export function writeSpacing(box, g) {
  const sel = box.querySelector('select.numbox-unit');
  sel.value = g?.unit ?? 'x';
  box.querySelector('input').value = '';
  applyUnit(box);
  box.querySelector('input').value = g ? String(g.value) : '';
}

/** A saved spacing, checked: a bare number is a multiple, as selections
 *  saved before points existed have it; anything else malformed is null. */
export function readSavedSpacing(raw) {
  if (typeof raw === 'number') raw = { value: raw, unit: 'x' };
  if (raw === null || typeof raw !== 'object' || !(raw.unit in SPACING_UNITS)) return null;
  if (typeof raw.value !== 'number' || !Number.isFinite(raw.value)) return null;
  const { min, max } = SPACING_UNITS[raw.unit];
  if (raw.value < min || raw.value > max) return null;
  return { value: raw.value, unit: raw.unit };
}
