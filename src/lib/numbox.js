// The arithmetic of NumBox.astro, apart from the page so it can be tested,
// and the one thing a page may ask of a box: to take the unit its menu shows.

const decimals = (n) => (String(Math.abs(n)).split('.')[1] ?? '').length;

/** `from` moved by `by`, held to [lo, hi], to the finer of the two
 *  precisions `by` and the box's `step` have — a tenth where the box takes
 *  one, else whole, for the steps the Card Builder uses. */
export function stepValue(from, by, lo, hi, step = 1) {
  const p = 10 ** Math.max(decimals(by), decimals(step));
  return Math.min(hi, Math.max(lo, Math.round((from + by) * p) / p));
}

/** `v` in a unit `perFrom` of some common measure to a unit `perTo` of it,
 *  to the precision of the new unit's `step`. */
export function convertValue(v, perFrom, perTo, step = 1) {
  const p = 10 ** decimals(step);
  return Math.round((v * perFrom / perTo) * p) / p;
}

/**
 * Make a box (`.numbox`) take the unit its menu shows. An option may carry
 * its own `data-min`, `-max`, `-step`, `-by` and `-placeholder`, which the box
 * takes; and `data-per`, how much of a common measure one of it is, with
 * which a value already typed is carried over so it keeps its size. A unit
 * with none of these — the Card Builder's % and px — changes nothing but
 * itself.
 */
export function applyUnit(box) {
  const sel = box.querySelector('select.numbox-unit');
  const input = box.querySelector('input');
  if (!sel || !input) return;
  const now = sel.selectedOptions[0]?.dataset ?? {};
  const was = [...sel.options].find((o) => o.value === sel.dataset.last)?.dataset ?? {};
  for (const k of ['min', 'max', 'step', 'placeholder']) if (now[k] !== undefined) input[k] = now[k];
  if (now.by !== undefined) {
    for (const b of box.querySelectorAll('.numbox-step')) {
      const by = Math.sign(+b.dataset.d) * +now.by;
      b.dataset.d = by;
      b.title = b.ariaLabel = `${by < 0 ? 'Less' : 'More'} by ${Math.abs(by)}`;
    }
  }
  if (input.value !== '' && was.per && now.per && sel.dataset.last !== sel.value) {
    input.value = convertValue(+input.value, +was.per, +now.per, +input.step || 1);
  }
  sel.dataset.last = sel.value;
}
