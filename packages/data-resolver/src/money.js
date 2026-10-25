// How an `amount` is written. Pure, and its own module so the store and the prose
// expansion in inline.js can both use it without importing each other.

/** By style: `us` replaces the D with a sign, `dollar` gives US dollars the bare
 *  sign. A currency with no sign keeps its code. */
const SIGNS = { us: { USD: 'US$', CAD: 'CA$' }, dollar: { USD: '$', CAD: 'CA$' } };

/** "USD 10,000", "CAD 20,000–30,000 p.a.", or null; in a `style`, "US$10,000",
 *  "$10,000", "CA$20,000–30,000 p.a.". The code is the default. */
export function money(a, style) {
  if (!a) return null;
  const n = (v) => v.toLocaleString('en-US');
  const span = a.valueMax ? `${n(a.value)}–${n(a.valueMax)}` : n(a.value);
  const sign = SIGNS[style]?.[a.currency];
  return `${sign ?? `${a.currency} `}${span}${a.perAnnum ? ' p.a.' : ''}`;
}
