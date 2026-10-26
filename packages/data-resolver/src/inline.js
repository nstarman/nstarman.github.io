// A deliberately tiny inline-link syntax for `long` and `short`.
//
// The CV's detail lines carry links — the NSERC fellowships, a grant call, a
// conference page — and rendering them as buttons underneath detaches them from
// the words they belong to. Rather than adding rich text to the schema, `long`
// may contain `[text](url)` and this splits it into spans.
//
// Spans, not HTML: the same model feeds the website and the Typst CV, and only
// one of those understands markup.

import { dateLabel } from '@nstarkman/research-store';
import { sortAchievements } from './mentees.js';
import { money } from './money.js';

// `[text](https://…)` for the web, and `[text](item:some-id)` to point at
// another entry on the same CV — the CV cross-references itself (a position
// citing the grants that funded it) and a bare URL cannot express that.
// `[](item:some-id)`, with no text, is for /research/'s topic introductions:
// the span carries `item`, and the page fills in that paper's nickTitle.
const LINK = /\[([^\]]*)\]\((https?:\/\/[^)\s]+|item:[a-z0-9-]+)\)/g;

// `base` is where the cross-referenced entry lives. Empty on the CV, which
// holds every entry itself; '/cv/' from any other page, so the reference is a
// link there too rather than being flattened to plain text.
const href = (target, base = '') =>
  target.startsWith('item:') ? `${base}#item-${target.slice(5)}` : target;

/**
 * @param {string|string[]} text
 * @param {string} [base]  prefix for `item:` targets, e.g. '/cv/'
 * @returns {{t: string, url?: string, item?: string}[]}
 */
export function spans(text, base = '') {
  if (!text) return [];
  if (Array.isArray(text)) return text.flatMap((t) => spans(t, base));
  const out = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    const item = m[2].startsWith('item:') ? m[2].slice(5) : undefined;
    out.push({ t: m[1], url: href(m[2], base), ...(item && { item }) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

/** "1 talk", "3 talks", "2 entries". */
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd". */
export const ordinal = (n) => {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${(!teen && ['th', 'st', 'nd', 'rd'][n % 10]) || 'th'}`;
};

/** The same text with the link syntax stripped, for places that cannot link. */
export const plain = (text) => (text ?? '').replace(LINK, '$1');

/** Each line of a `long` as its own span list. A plain string is one line. */
export function lines(long, base = '') {
  return (Array.isArray(long) ? long : [long]).filter(Boolean).map((l) => spans(l, base));
}

/**
 * An item's elaboration, one span array per line, in the order both renderers
 * must use. Shared so the page and the PDF cannot disagree about what an
 * entry's lines are — or, once the builder can tick them individually, about
 * which line index a tick refers to.
 *
 * `complete` adds the lines only the complete CV shows. It is off by default so
 * every caller that has not thought about it gets the discreet answer: a field
 * whose whole purpose is to appear in one place should not leak into a fourth
 * renderer by being forgotten about.
 *
 * The extra lines go last, after the thesis and supervisors, so a line index
 * means the same thing whether or not they are included — the builder ticks
 * lines by index, and inserting in the middle would silently move its ticks.
 * A talk's title (`talk`) is the exception that proves it: it comes first, in
 * quotation marks, because it is what a presentation's first line always was.
 */
export function detailLines(item, { complete = false, currency, forms = false } = {}) {
  const prose = (long) => amountLines(long, item, { currency, forms }).map(noFinalPeriod);
  return [
    ...(item.talk ? [quoted(item.talk)] : []),
    ...prose(item.details),
    ...(item.thesis ? [noFinalPeriod(spans(`Thesis: ${item.thesis}`))] : []),
    ...(item.supervisors?.length ? [noFinalPeriod(spans(`Supervisors: ${item.supervisors.join(', ')}`))] : []),
    ...(complete ? prose(item.detailsComplete) : []),
  ];
}

/**
 * A title as a line in quotation marks: “…”. The marks belong to the rendering, not the record,
 * and a double quote inside the title becomes a single one. The closing mark follows the title
 * without its final period, as any line under a heading has none.
 */
export function quoted(title) {
  const inner = title.replace(/["“]([^"”]*)["”]/g, '‘$1’');
  return [{ t: '“' }, ...noFinalPeriod(spans(inner)), { t: '”' }];
}

/**
 * A CV line is a label or a phrase under a heading, so it does not end in a period: the
 * last span loses one. A line ending in an abbreviation ("et al.", "etc.") or an ellipsis
 * keeps it. The record is not changed, only what is shown.
 */
export const KEEPS_PERIOD = /(\.\.|\b(?:al|etc|Jr|Sr|Inc|vs|St|Co|Ltd)\.)$/;
export function noFinalPeriod(line) {
  const last = line[line.length - 1];
  if (!last || !last.t) return line;
  const t = last.t.trimEnd();
  if (!t.endsWith('.') || KEEPS_PERIOD.test(t)) return line;
  const rest = t.slice(0, -1);
  return rest ? [...line.slice(0, -1), { ...last, t: rest }] : line.slice(0, -1);
}

/**
 * `lines`, with `{amount}` standing for the item's `amount` written as `money` writes
 * it in `currency`: so a figure in prose is stored once, in the data, and follows
 * the CV's currency style. With `forms` the span carries all three forms, for the
 * builder's page to swap; a token on an item with no `amount` is left as it is,
 * which the data tests refuse.
 */
function amountLines(long, item, { currency, forms }) {
  const token = '{amount}';
  return (Array.isArray(long) ? long : [long]).filter(Boolean).map((line) => {
    if (!item.amount || !line.includes(token)) return spans(line);
    return line.split(token).flatMap((piece, k) => [
      ...(k ? [{
        t: money(item.amount, currency),
        ...(forms && { forms: { code: money(item.amount), us: money(item.amount, 'us'), dollar: money(item.amount, 'dollar') } }),
      }] : []),
      ...spans(piece),
    ]);
  });
}

/**
 * A mentee's marked achievements, one span array per line, oldest first so the
 * entry reads as a progression. They follow everything `detailLines` returns,
 * so existing line indexes keep their meaning, and are gated by their own
 * `cvs` rather than by the section's detail level: a short CV that drops
 * details can still carry the one achievement worth a line. `complete` shows all.
 */
export function achievementLines(item, preset, { complete = false } = {}) {
  return sortAchievements(item.achievements).reverse()
    .filter((a) => complete || a.cvs?.includes(preset))
    .map((a) => {
      const what = a.url ? `[${a.title}](${a.url})` : a.title;
      const where = a.event ?? a.outlet;
      return spans(`${what}${where ? ` — ${where}` : ''} (${dateLabel({ date: { start: a.date } })})`);
    });
}

/** Each achievement's `cvs`, in the order `achievementLines` prints them. */
export const achievementCvs = (item) =>
  sortAchievements(item.achievements).reverse().map((a) => a.cvs ?? []);

/**
 * Whether an achievement's line starts ticked when the builder is seeded from
 * `preset`: the complete CV prints them all, any other only those it is marked for.
 */
export const achievementTicked = (cvs, preset, unabridged) =>
  Boolean(unabridged) || (cvs ?? []).includes(preset);

/**
 * What kind of line index `i` is on an entry whose lines run: `base` detail
 * lines, then complete-only ones up to `detailCount`, then achievements. The
 * builder ticks by this — only the complete-only kind starts unticked on a
 * preset that does not show it; a marked achievement is printed everywhere.
 */
export const lineTier = (i, baseCount, detailCount) =>
  i < baseCount ? 'base' : i < detailCount ? 'complete' : 'achievement';
