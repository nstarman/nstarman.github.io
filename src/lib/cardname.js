// A card's name: its spec, written as key:value[:subvalue] parts joined by "-".
//
//   size:320:400-figure:center:auto-title:short-authors:none-text:none-extras:position,year-buttons:all-look:textsize=feature,padding=compact
//
//   size     <width>:<height>, each set or not:
//              width   fill · 120–1600    filling its container, or that many px
//              height  fit · 40–1600      growing with its content, or that
//                                         many px — a set height, which the
//                                         content is fitted inside and never
//                                         grows, so cards side by side can
//                                         share one
//            e.g. size:fill:fit — what fills a column; size:640:160 — a box;
//            size:fill:200 — a row of cards of one height
//   figure   none                   the highlight figure, not shown
//            center[:<slot>]:<size>[:link]  shown: in the center, below the
//                                   title — or, slot, above the title (top) or
//                                   below the authors, venue or text —
//            <side>:<v>[:<h>]:<size>[:link]  or in the left or right side,
//            e.g. figure:left:top:60   at the top, center or bottom of the
//                                   card's height and, narrower than its
//                                   column, at its left, center (the
//                                   default) or right; at auto, filling its
//                                   column, or 10–100, that share of the
//                                   column in percent, or 8–800px, its own
//                                   width. :link makes it a link to the
//                                   item, as the website has it
//   title    full:split · full:whole      the full title; split (the default)
//                                          sets only its short title at the
//                                          title's weight and the rest regular,
//                                          where the short title is part of the
//                                          full one; whole sets all of it alike
//            short · nick · none          (shortTitle, nickTitle, each falling
//                                          back to the longer one)
//            …:link · …:site              the title a link: to the item
//            …:ads · …:journal            itself — the paper, the package —
//            e.g. title:short:link        as the website has it; to its
//                                          entry on this site, on
//                                          /publications/ or /software/; to
//                                          its ADS abstract; or to where it
//                                          was published, the journal's own
//                                          page. Left off, words
//            …:status                     then a pill after it: submitted,
//            e.g. title:full:split:status   accepted or published
//            …:top                        then, last, where it sits: across
//            e.g. title:short:link:top    the card above all else — the
//                                          figure, words and sides start
//                                          under it; left off, the center
//            …:center · …:right           and very last, across its area:
//            e.g. title:nick:top:center   left (the default, left off),
//                                          centered or at the right
//   area     <a>[:<s>]                    the areas are fixed — the top, the
//            e.g. area:left:share=25,top  left side, the center, the right
//                                          side and the bottom — and the parts
//                                          move between them: a side holds its
//                                          figure and buttons, stacked, the
//                                          figure above. An area given here
//                                          is there with nothing in it, too:
//                                          area:left. A side's settings,
//                                          comma-separated: its width — fit
//                                          (left off), min=<0–800>, at least
//                                          so many px, share=<5–95>, that share
//                                          of the card's width in percent, or
//                                          buttons, as wide as its buttons
//                                          laid out — and the corners it wins:
//                                          top, over the top area, bottom,
//                                          over the bottom area, each of which
//                                          wins its corners left off. The top's
//                                          or bottom's, its height empty:
//                                          min=<0–400>, area:top:min=24
//   authors  none · short · full · 1–20   a paper's byline: none, the first
//                                          three and "et al.", up to eight, or
//                                          up to so many, authors:5;
//            …:fit                        fewer, where they would run past one
//                                          line — the venue after them too;
//            …:plain · …:marked           marked colours my students and gives
//                                          them † and ‡; plain, the default, not
//            …:orcid · …:site             each co-author a link: to their ORCID,
//            e.g. authors:full:plain:orcid  or to the papers we wrote together,
//                                          on this site's collaborator map —
//                                          where they have one; left off, words
//   text     none · summary · details     (the record's own tiers; none is
//                                          the title alone)
//            …:center · …:right           then across the center: left (the
//            e.g. text:summary:center     default, left off), centered or right
//   extras   none, or any of venue (where and when it appeared), status (a
//            paper not yet out — submitted, accepted — as a pill on the
//            venue line), position (my author position, "1st"), year (the
//            year), role (my role in a package),
//            context (a link to its topic on /research/)
//   venue    full · short           the venue line, where extras has it: the
//            …:unlinked             journal's name in full or short (ApJ,
//            …:undated              config/journals.json); not a link to the
//            …:above                article; without its year; its own line
//            …:center · …:right     above the authors' rather than below;
//            …:authors              across the center, left left off — or,
//            e.g. venue:short:right in place of the last two, after the
//                                   authors, on their line — or, :authors:
//                                   before, before them
//   context  <place>                where the context link sits, e.g.
//            e.g. context:bottom:right  context:bottom:right
//   position <place>                where my author position sits
//            e.g. position:top:right
//   year     <place>                where the year sits. Where my position is
//            e.g. year:top:right    in the same place, the two read as one,
//                                   "1st | 2026"
//   buttons  the link buttons: all · none, or the keys to keep, in the
//            order they are drawn, e.g. ads,code; then :1–12, the buttons to a row before the next,
//            e.g. buttons:all:2, or :fit, as many as fit — left off, as
//            near square as they go: ⌈√n⌉ to a row, for n buttons; then
//            their area — left, center (left off, under the words), right
//            or bottom (the card's full width) — and their place in it: in
//            a side, its top (left off), center or bottom, then across it,
//            toward the card's edge left off; under the words or at the
//            bottom, left (left off), center or right. buttons:all:fit:right,
//            buttons:all:bottom:center
//   paper    a paper's button of words, first in the buttons' box: its
//            label, a word of up to 16 letters or digits — paper:paper —
//            or icon, the paper glyph; then where it links: journal, arxiv,
//            ads or site — left off, the article where it is out, else
//            arXiv. Left off, no such button; with nowhere to link, none.
//            e.g. paper:paper, paper:pdf:arxiv, paper:icon:ads
//
//   <place>  my position, the year and the context link each sit in an
//            area, and at a place in it: with the buttons, in their area —
//            the default, at the end away from them — up and down and
//            across it, area:<v>:<h>; or in the top area, or the bottom one
//            where the buttons are not, a strip of the card's padding:
//            left (left off), center or right, top:right. Either part
//            after the area may be left off, as near the default as it is
//   space    room between the card's slots, comma-separated, each a length
//            0–64 px or flex — a row, what room is left; a column, a share
//            of the width alike with the words. Between rows, named by
//            the slots either side in their default order — a figure
//            moved among the center's parts keeps the names where they
//            are: top_left · top_center · top_right (from the top area,
//            there or not, to the left area, the center and the right
//            area, each its own; a length only) · title_figure · figure_authors ·
//            authors_venue · venue_text · text_buttons (to the buttons under
//            the words) · center_bottom (to the bottom area); between
//            columns: left_center · center_right (the left area, the center,
//            the right area). space:title_figure=flex sinks all under the
//            title; center_right=24 widens the gap before the right area.
//            Left off, as it is
//   look     how it is drawn: settings, comma-separated, as key=value, each
//            on its own —
//              textsize · padding · corners · buttons = a step, one of
//                minor · compact · standard · feature · display: the text
//                size (and with it every length inside the card set in em),
//                the padding, the corner radius, the link buttons; or a size
//                in px — text 8–40, to a tenth; padding 0–64, the same on
//                every side; corners 0–64; buttons 12–64, their icon half
//                that
//              titlesize = a step or a size in px, 8–60, to a tenth: the
//                title's own; left off, it follows the text size. Not one of
//                the four a step alone sets
//              titleweight = regular · medium · bold      the title's weight;
//                or mine, bold where I am first author and regular
//                otherwise; left off, medium, or regular past second author
//              <part>size = 8–40 px, to a tenth, and <part>weight =
//                regular · medium · bold   a part's own size and weight, for
//                body (the summary or details), authors, venue, position,
//                year and context; left off, as the card has it
//              buttongap = 0–32 px, or 0–100%   the space between the link
//                buttons, in px or a share of a button's size; left off, a
//                third of the text's height
//              frame = none · a step · 0–32 px    the white around a figure,
//                its corners then following the card's; none, the bare
//                image; left off, as it is
//              background = none · light · normal · dark      the card's tint:
//                none, half the site's, the site's, or twice it
//            A setting left out is standard on a card that fills its width,
//            and on one of a set width follows it (a 320px-wide card no wider
//            than it is high reads as standard); the background is normal.
//            The four at one step are written as the step alone — look:feature — and a step
//            may lead the settings, look:feature,padding=minor, setting the
//            four before the rest.
//
// Parts may come in any order, and all but size and text may be left out:
// figure none, title by the box (below), area none, authors none, extras
// none, context, position and year with the buttons, buttons all under
// the words, space none, and the look above. A left-out title depends on
// the box: a card of set height at minor text size is too small for the full title, so it takes the nick
// title when no wider than it is high and the short title when wider;
// anything else takes full:split. Such a box may leave out text too, and has none; any
// other must give it. A name is written in full, in the order above, but for
// the look's settings where they are the box's own, and a look with nothing
// in it. Lists use commas, which survive a URL query where "+" would not.
//
// No imports: the Card Builder bundles this, and the embed page inlines
// parseName's own source, so the grammar is written once.

export const LOOKS = ['minor', 'compact', 'standard', 'feature', 'display'];
export const DIALS = ['textsize', 'padding', 'corners', 'buttons'];
/** Where the figure sits: its area, up and down in a side, and its slot
 *  among the center's parts. */
export const FIGURE_AT = ['left', 'center', 'right'];
export const FIGURE_ALIGN = ['top', 'center', 'bottom'];
export const FIGURE_SLOTS = ['top', 'title', 'authors', 'venue', 'text'];
/** The buttons' area, and their place in it. */
export const FOOT_AT = ['left', 'center', 'right', 'bottom'];
export const FOOT_END = ['top', 'center', 'bottom'];
export const RAIL_ALIGN = ['left', 'center', 'right'];
export const TITLES = ['full', 'short', 'nick', 'none'];
export const AUTHORS = ['none', 'full', 'short'];
// The parts with a size and weight of their own, look:<part>size and
// <part>weight — the title's are titlesize and titleweight.
export const FACES = ['body', 'authors', 'venue', 'position', 'year', 'context'];
/** The most names authors:<n> asks for. */
export const AUTHORS_MAX = 20;
export const TEXTS = ['none', 'summary', 'details'];
export const EXTRAS = ['venue', 'status', 'position', 'year', 'role', 'context'];
export const BACKGROUNDS = ['none', 'light', 'normal', 'dark'];
/** A set width or height is between these, in px. */
export const FIXED_MIN = 120;
export const FIXED_MAX = 1600;
export const FIXED_MIN_HEIGHT = 40;

export const SPACE_TRACKS = ['top_left', 'top_center', 'top_right', 'title_figure', 'figure_authors', 'authors_venue', 'venue_text', 'text_buttons', 'center_bottom', 'left_center', 'center_right'];
/** The areas my position, the year and the context link may sit in. */
export const PLACE_AT = ['top', 'left', 'center', 'right', 'bottom'];

/** Where my position (part 'pos'), the year or the context link sits:
 *  { area, v, h }, and strip where that is a strip of the card's padding — as
 *  the name puts it or, left out, with the buttons, at the end away from
 *  them. In the top area, or the bottom one where the buttons are not, a
 *  strip: left, center or right. In the buttons' area, their box: up and down
 *  and across it. Self-contained, as parseName: the embed page runs a copy. */
export function placeOf(spec, part) {
  const at = spec[part + 'At'] || {};
  const box = spec.foot || 'center';
  const side = box === 'left' || box === 'right';
  const area = at.area || box;
  if (area !== box) return { area: area, strip: true, h: at.h || 'left' };
  const bv = side ? spec.footEnd || 'top' : 'bottom';
  const bh = spec.railAlign || (side ? box : 'left');
  const away = { top: 'bottom', bottom: 'top', center: side ? 'center' : 'right', left: 'right', right: 'left' };
  return side ? { area: area, v: at.v || away[bv], h: at.h || bh } : { area: area, v: at.v || 'bottom', h: at.h || away[bh] };
}

/** The tracks set, in a fixed order. */
const spaceList = (space) => SPACE_TRACKS.filter((t) => space[t]).map((t) => `${t}=${space[t]}`).join(',');

/** Spec → name: every part written, in a fixed order, but the look's settings
 *  that do not depart. */
export function formatName({ width = 'fill', height = 'fit', figure = 'none', figureAlign = 'center', figureSize = 'auto', figureH, figureSlot, figureLink = false, sides = {}, foot = 'center', footEnd, title = 'full', rest = 'split', titleLink = false, titleAt = 'center', titleAlign, titleV, titleStatus, authors = 'none', marks = 'plain', text, extras = [], links = 'all', perRow, posAt, authorLink = false, contextAt, yearAt, railAlign, titleWeight, textAlign, frame, buttonGap, space, dials = {}, background = 'normal', sizes = {}, weights = {}, venueName, venueLink, venueDate, venueAlign, venueAt, venueFirst, authorsFit, paperButton }) {
  const list = (v, all) => (v === all ? all : v.length ? v.join(',') : 'none');
  // Standard is the own look of a card that fills its width, so it departs
  // from nothing there.
  const set = DIALS.filter((d) => dials[d] && !(width === 'fill' && dials[d] === 'standard'));
  const same = set.length === DIALS.length && DIALS.every((d) => dials[d] === dials.textsize);
  const tuned = [
    ...(same ? [dials.textsize] : set.map((d) => `${d}=${dials[d]}`)),
    ...(dials.titlesize ? [`titlesize=${dials.titlesize}`] : []),
    ...(titleWeight ? [`titleweight=${titleWeight}`] : []),
    ...FACES.flatMap((p) => [sizes[p] && `${p}size=${sizes[p]}`, weights[p] && `${p}weight=${weights[p]}`].filter(Boolean)),
    ...(frame ? [`frame=${frame}`] : []),
    ...(buttonGap != null ? [`buttongap=${buttonGap}`] : []),
    ...(background !== 'normal' ? [`background=${background}`] : []),
  ];
  // A small part's place, written where it departs from its own left out:
  // the area, then up and down where that is not the default — or where
  // across is center, which would read as up and down — then across.
  const place = (part, at) => {
    const d = placeOf({ foot, footEnd, railAlign }, part);
    const p = placeOf({ foot, footEnd, railAlign, [part + 'At']: at }, part);
    if (p.area === d.area && p.v === d.v && p.h === d.h) return '';
    if (p.strip) return `:${p.area}` + (p.h !== 'left' ? `:${p.h}` : '');
    const h = p.h !== d.h ? p.h : null;
    return `:${p.area}` + (p.v !== d.v || h === 'center' ? `:${p.v}` : '') + (h ? `:${h}` : '');
  };
  // The buttons' area and their place in it, where either departs.
  const side = foot === 'left' || foot === 'right';
  const bv = side && footEnd && footEnd !== 'top' ? footEnd : null;
  const bh = railAlign && railAlign !== (side ? foot : 'left') ? railAlign : null;
  const at = foot !== 'center' || bv || bh ? `:${foot}` + (bv || (side && bh === 'center') ? `:${footEnd || 'top'}` : '') + (bh ? `:${bh}` : '') : '';
  return [
    `size:${width}:${height}`,
    figure === 'none' ? 'figure:none' : `figure:${figure}${figure === 'center' ? (figureSlot && figureSlot !== 'title' ? `:${figureSlot}` : '') : `:${figureAlign}` + (figureH && figureH !== 'center' ? `:${figureH}` : '')}:${figureSize}` + (figureLink ? ':link' : ''),
    (title === 'full' ? `title:full:${rest}` : `title:${title}`) + (titleLink && title !== 'none' ? `:${titleLink}` : '') + (titleStatus && title !== 'none' ? ':status' : '') + (titleAt === 'top' && title !== 'none' ? ':top' + (titleV && titleV !== 'top' ? `:${titleV}` : titleAlign === 'center' ? ':top' : '') : '') + (titleAlign && titleAlign !== 'left' && title !== 'none' ? `:${titleAlign}` : ''),
    ...['left', 'right', 'top', 'bottom'].filter((s) => sides[s]).map((s) => {
      const set = [sides[s].width, sides[s].height != null && `min=${sides[s].height}`, sides[s].top && 'top', sides[s].bottom && 'bottom'].filter(Boolean).join(',');
      return `area:${s}` + (set ? `:${set}` : '');
    }),
    authors === 'none' ? 'authors:none' : `authors:${authors}${authorsFit ? ':fit' : ''}:${marks}` + (authorLink ? `:${authorLink}` : ''),
    `text:${text}` + (textAlign && textAlign !== 'left' && text !== 'none' ? `:${textAlign}` : ''),
    `extras:${EXTRAS.filter((e) => extras.includes(e)).join(',') || 'none'}`,
    ...(extras.includes('venue') && (venueName === 'short' || venueLink === false || venueDate === false || venueAlign || venueAt) ? [`venue:${venueName || 'full'}${venueLink === false ? ':unlinked' : ''}${venueDate === false ? ':undated' : ''}${venueAt === 'above' ? ':above' : ''}${venueAt === 'authors' ? `:authors${venueFirst ? ':before' : ''}` : venueAlign ? `:${venueAlign}` : ''}`] : []),
    ...(extras.includes('context') && place('context', contextAt) ? [`context${place('context', contextAt)}`] : []),
    ...(extras.includes('position') && place('pos', posAt) ? [`position${place('pos', posAt)}`] : []),
    ...(extras.includes('year') && place('year', yearAt) ? [`year${place('year', yearAt)}`] : []),
    `buttons:${list(links, 'all')}` + (perRow ? `:${perRow}` : '') + at,
    ...(paperButton ? [`paper:${paperButton.label}${paperButton.to ? `:${paperButton.to}` : ''}`] : []),
    ...(space && Object.keys(space).length ? [`space:${spaceList(space)}`] : []),
    ...(tuned.length ? [`look:${tuned.join(',')}`] : []),
  ].join('-');
}

/** Name → spec; throws on a name that does not describe a card. Self-contained
 *  — no outside names, so its lists are written out here rather than taken
 *  from the exports above — because the embed page runs a copy of its source,
 *  and a test runs that copy too. */
export function parseName(name) {
  const one = (v, ok) => ok.indexOf(v) >= 0;
  const steps = ['minor', 'compact', 'standard', 'feature', 'display'];
  const spec = { dials: {}, figure: 'none', foot: 'center', titleLink: false, titleAt: 'center', authors: 'none', extras: [], links: 'all', background: 'normal' };
  const seen = {};
  const parts = String(name).split('-');
  for (let i = 0; i < parts.length; i += 1) {
    const kv = parts[i].split(':');
    const key = kv[0];
    // A part once — but area once for each area it sets: area:left, area:right.
    const once = key === 'area' ? key + ':' + kv[1] : key;
    if (seen[once]) throw new Error('"' + name + '": ' + once + ' is given twice');
    seen[once] = true;
    if (key === 'size' && kv.length === 3) {
      const px = (v, lo) => /^[1-9][0-9]*$/.test(v) && +v >= lo && +v <= 1600;
      if (!((kv[1] === 'fill' || px(kv[1], 120)) && (kv[2] === 'fit' || px(kv[2], 40)))) throw new Error('"' + name + '": no such size, ' + parts[i]);
      spec.width = kv[1] === 'fill' ? 'fill' : +kv[1];
      spec.height = kv[2] === 'fit' ? 'fit' : +kv[2];
    } else if (key === 'figure' && kv.length >= 3) {
      // At a side, where in the card's height, then — a figure narrower than
      // its column — where across it, before the size: auto, filling its
      // column; a share of the column, 10–100; or its own width, 8–800px.
      const side = one(kv[1], ['left', 'right']);
      const f = side ? kv.slice(3) : kv.slice(2);
      const h = side && f.length > 1 && one(f[0], ['left', 'center', 'right']) ? f.shift() : null;
      // In the center, which of its slots: above the title (top), or below
      // the title (the default), the authors, the venue or the text.
      const slot = !side && f.length > 1 && one(f[0], ['top', 'title', 'authors', 'venue', 'text']) ? f.shift() : null;
      const share = /^[1-9][0-9]{1,2}$/.test(f[0]) && +f[0] >= 10 && +f[0] <= 100;
      const own = /^[1-9][0-9]{0,2}px$/.test(f[0] || '') && parseInt(f[0], 10) >= 8 && parseInt(f[0], 10) <= 800;
      if (!((side ? one(kv[2], ['top', 'center', 'bottom']) : kv[1] === 'center') && (f[0] === 'auto' || share || own) && (f.length === 1 || (f.length === 2 && f[1] === 'link')))) throw new Error('"' + name + '": no such figure, ' + parts[i]);
      spec.figure = kv[1];
      if (side) spec.figureAlign = kv[2];
      if (h && h !== 'center') spec.figureH = h;
      if (slot && slot !== 'title') spec.figureSlot = slot;
      spec.figureSize = share ? +f[0] : f[0];
      spec.figureLink = f.length === 2;
    } else if (key === 'area' && one(kv[1], ['left', 'right', 'top', 'bottom']) && (kv.length === 2 || kv.length === 3)) {
      // An area that is there, with or without anything in it. A side: its
      // width — at least so many px, growing to fit what is in it; a share
      // of the card's; or its buttons' — and the corners it wins, over the
      // top and bottom areas. The top or bottom: its height, empty. Each once.
      const side = {};
      const end = one(kv[1], ['top', 'bottom']);
      const xs = kv.length === 3 ? kv[2].split(',') : [];
      for (let j = 0; j < xs.length; j += 1) {
        const m = /^(min|share)=(0|[1-9][0-9]{0,2})$/.exec(xs[j]);
        const width = !end && ((m && (m[1] === 'min' ? +m[2] <= 800 : +m[2] >= 5 && +m[2] <= 95)) || xs[j] === 'buttons');
        const height = end && m && m[1] === 'min' && +m[2] <= 400;
        if (width && !side.width) side.width = xs[j];
        else if (height && !side.height) side.height = +m[2];
        else if (!end && one(xs[j], ['top', 'bottom']) && !side[xs[j]]) side[xs[j]] = true;
        else throw new Error('"' + name + '": no such area, ' + parts[i]);
      }
      spec.sides = { ...spec.sides, [kv[1]]: side };
    } else if (key === 'text' && kv.length === 3 && one(kv[1], ['summary', 'details']) && one(kv[2], ['left', 'center', 'right'])) {
      // The text, then across the center: left, centered or right.
      spec.text = kv[1];
      if (kv[2] !== 'left') spec.textAlign = kv[2];
    } else if (key === 'title') {
      // full[:whole|split], short, nick or none; any but none may then link,
      // :link, :site, :ads or :journal; then :status; then sit at the :top,
      // across the card above all else, rather than in the center column —
      // and there up and down, top, center or bottom, a center alone being
      // up and down; and very last across its area, left, center or right.
      let j = 1;
      const at = (xs) => (j < kv.length && one(kv[j], xs) ? kv[j++] : null);
      const t = [at(['full', 'short', 'nick', 'none'])];
      if (t[0] === 'full') spec.rest = at(['whole', 'split']) || 'split';
      const link = t[0] !== 'none' && at(['link', 'site', 'ads', 'journal']);
      const more = t[0] !== 'none';
      const pill = more && at(['status']);
      const top = more && at(['top']);
      const v = top && at(['top', 'center', 'bottom']);
      const align = more && at(['left', 'center', 'right']);
      if (!t[0] || j !== kv.length) throw new Error('"' + name + '": no such title, ' + parts[i]);
      spec.title = t[0];
      spec.titleLink = link || false;
      spec.titleAt = top ? 'top' : 'center';
      if (v && v !== 'top') spec.titleV = v;
      if (align && align !== 'left') spec.titleAlign = align;
      if (pill) spec.titleStatus = true;
    } else if (key === 'authors' && (one(kv[1], ['short', 'full']) || (/^[1-9][0-9]?$/.test(kv[1]) && +kv[1] <= 20)) && kv.length <= 5) {
      // The length, then :fit — fewer names where they would run past one
      // line — then its marking, then where the names link, if anywhere.
      const fit = kv[2] === 'fit';
      const link = kv.length > 2 && one(kv[kv.length - 1], ['orcid', 'site']) ? kv[kv.length - 1] : false;
      const m = kv.slice(fit ? 3 : 2, link ? -1 : undefined);
      if (m.length > 1 || (m.length && !one(m[0], ['marked', 'plain']))) throw new Error('"' + name + '": no such student marking, ' + parts[i]);
      spec.authors = one(kv[1], ['short', 'full']) ? kv[1] : +kv[1];
      if (fit) spec.authorsFit = true;
      spec.marks = m[0] || 'plain';
      spec.authorLink = link;
    } else if (key === 'venue') {
      // The venue line: full or short, then :unlinked, then :undated, then
      // :above the authors' line rather than below it, then across the
      // center, left, center or right — or, in place of both, after the
      // authors, on their line.
      let j = 1;
      const at = (xs) => (j < kv.length && one(kv[j], xs) ? kv[j++] : null);
      const n = at(['full', 'short']), unlinked = at(['unlinked']), undated = at(['undated']), above = at(['above']);
      const align = at(above ? ['left', 'center', 'right'] : ['left', 'center', 'right', 'authors']);
      // On the authors' line, after them, or :before them.
      const before = align === 'authors' && at(['before']);
      if (!n || j !== kv.length) throw new Error('"' + name + '": no such venue, ' + parts[i]);
      if (above) spec.venueAt = 'above';
      if (before) spec.venueFirst = true;
      if (n === 'short') spec.venueName = 'short';
      if (unlinked) spec.venueLink = false;
      if (undated) spec.venueDate = false;
      if (align === 'authors') spec.venueAt = 'authors';
      else if (align && align !== 'left') spec.venueAlign = align;
    } else if ((key === 'context' || key === 'year' || key === 'position') && kv.length >= 2) {
      // A place — settled once the buttons' area is known.
      spec[(key === 'position' ? 'pos' : key) + 'At'] = kv.slice(1);
    } else if (key === 'paper') {
      // Its label, a word or icon; then where it links, if not the default.
      if (!/^[A-Za-z0-9]{1,16}$/.test(kv[1] || '') || kv.length > 3 || (kv.length === 3 && !one(kv[2], ['journal', 'arxiv', 'ads', 'site']))) throw new Error('"' + name + '": no such paper button, ' + parts[i]);
      spec.paperButton = kv.length === 3 ? { label: kv[1], to: kv[2] } : { label: kv[1] };
    } else if (key === 'buttons' && /^(all|none|[a-z]+(,[a-z]+)*)$/.test(kv[1] || '')) {
      // The keys; then so many to a row, or fit; then the area and the place
      // in it — in a side, up and down then across; else across.
      const r = kv.slice(2);
      if (r.length && (r[0] === 'fit' || /^[0-9]+$/.test(r[0]))) {
        const n = r.shift();
        if (!(n === 'fit' || (/^[1-9][0-9]?$/.test(n) && +n <= 12))) throw new Error('"' + name + '": no such buttons to a row, ' + parts[i]);
        spec.perRow = n === 'fit' ? 'fit' : +n;
      }
      if (r.length) {
        const area = r.shift();
        if (!one(area, ['left', 'center', 'right', 'bottom'])) throw new Error('"' + name + '": no such area for the buttons, ' + parts[i]);
        const side = area === 'left' || area === 'right';
        spec.foot = area;
        if (side) spec.footEnd = r.length && one(r[0], ['top', 'center', 'bottom']) ? r.shift() : 'top';
        if (r.length && one(r[0], ['left', 'center', 'right'])) { const h = r.shift(); if (h !== (side ? area : 'left')) spec.railAlign = h; }
        if (r.length) throw new Error('"' + name + '": no such place for the buttons, ' + parts[i]);
      }
      spec.links = kv[1] === 'all' ? 'all' : kv[1] === 'none' ? [] : kv[1].split(',');
    } else if (kv.length !== 2) {
      throw new Error('"' + name + '": not key:value, ' + parts[i]);
    } else if (key === 'figure' && kv[1] === 'none') {
      spec.figure = 'none';
    } else if (key === 'authors' && kv[1] === 'none') {
      spec.authors = kv[1];
    } else if (key === 'text' && one(kv[1], ['none', 'summary', 'details'])) {
      spec.text = kv[1];
    } else if (key === 'extras') {
      const xs = kv[1] === 'none' ? [] : kv[1].split(',');
      for (let j = 0; j < xs.length; j += 1) if (!one(xs[j], ['venue', 'status', 'position', 'year', 'role', 'context'])) throw new Error('"' + name + '": no such extra, ' + xs[j]);
      spec.extras = xs;
    } else if (key === 'space') {
      spec.space = {};
      const xs = kv[1].split(',');
      for (let j = 0; j < xs.length; j += 1) {
        // A track between two slots, named by them.
        const t = /^(top_left|top_center|top_right|title_figure|figure_authors|authors_venue|venue_text|text_buttons|center_bottom|left_center|center_right)=(flex|0|[1-9][0-9]?)$/.exec(xs[j]);
        if (!t || (t[2] !== 'flex' && +t[2] > 64) || (/^top_/.test(t[1]) && t[2] === 'flex')) throw new Error('"' + name + '": no such space, ' + xs[j]);
        spec.space[t[1]] = t[2];
      }
    } else if (key === 'look') {
      // A step first, if any, setting the four; then key=value settings,
      // each once.
      const xs = kv[1].split(',');
      const set = {};
      for (let j = 0; j < xs.length; j += 1) {
        const s = xs[j].split('=');
        if (s.length === 1 && j === 0 && one(s[0], steps)) spec.dials = { textsize: s[0], padding: s[0], corners: s[0], buttons: s[0] };
        else if (s.length !== 2 || set[s[0]]) throw new Error('"' + name + '": not understood, look ' + xs[j]);
        else if (one(s[0], ['textsize', 'padding', 'corners', 'buttons']) && one(s[1], steps)) spec.dials[s[0]] = s[1];
        else if (s[0] === 'textsize' && /^[1-9][0-9]?(\.[0-9])?$/.test(s[1]) && +s[1] >= 8 && +s[1] <= 40) spec.dials.textsize = s[1];
        else if (s[0] === 'titlesize' && (one(s[1], steps) || (/^[1-9][0-9]?(\.[0-9])?$/.test(s[1]) && +s[1] >= 8 && +s[1] <= 60))) spec.dials.titlesize = s[1];
        else if (s[0] === 'titleweight' && one(s[1], ['regular', 'medium', 'bold', 'mine'])) spec.titleWeight = s[1];
        else if (/^(body|authors|venue|position|year|context)size$/.test(s[0]) && /^[1-9][0-9]?(\.[0-9])?$/.test(s[1]) && +s[1] >= 8 && +s[1] <= 40) (spec.sizes = spec.sizes || {})[s[0].slice(0, -4)] = s[1];
        else if (/^(body|authors|venue|position|year|context)weight$/.test(s[0]) && one(s[1], ['regular', 'medium', 'bold'])) (spec.weights = spec.weights || {})[s[0].slice(0, -6)] = s[1];
        else if (s[0] === 'buttongap' && ((/^(0|[1-9][0-9]?)$/.test(s[1]) && +s[1] <= 32) || (/^(0|[1-9][0-9]?|100)%$/.test(s[1])))) spec.buttonGap = s[1];
        else if (s[0] === 'frame' && (one(s[1], ['none'].concat(steps)) || (/^(0|[1-9][0-9]?)$/.test(s[1]) && +s[1] <= 32))) spec.frame = s[1];
        else if (one(s[0], ['padding', 'corners', 'buttons']) && /^(0|[1-9][0-9]?)$/.test(s[1]) && +s[1] <= 64 && +s[1] >= (s[0] === 'buttons' ? 12 : 0)) spec.dials[s[0]] = s[1];
        else if (s[0] === 'background' && one(s[1], ['none', 'light', 'normal', 'dark'])) spec.background = s[1];
        else throw new Error('"' + name + '": not understood, look ' + xs[j]);
        set[s[0]] = true;
      }
    } else {
      throw new Error('"' + name + '": not understood, ' + parts[i]);
    }
  }
  // My position, the year and the context link: an area — the buttons', or
  // the top or bottom — and a place in it: a strip's across it, the
  // buttons' box up and down and across.
  const parts3 = ['pos', 'year', 'context'];
  for (let j = 0; j < parts3.length; j += 1) {
    const t = spec[parts3[j] + 'At'];
    if (!t) continue;
    const area = t[0];
    if (!(area === spec.foot || area === 'top' || area === 'bottom')) throw new Error('"' + name + '": ' + parts3[j] + ' sits with the buttons, at the top or at the bottom, not ' + area);
    const at = { area: area };
    const r = t.slice(1);
    if (area === spec.foot && r.length && one(r[0], ['top', 'center', 'bottom'])) at.v = r.shift();
    if (r.length && one(r[0], ['left', 'center', 'right'])) at.h = r.shift();
    if (r.length) throw new Error('"' + name + '": no such place for ' + parts3[j] + ', ' + t.join(':'));
    spec[parts3[j] + 'At'] = at;
  }
  // Standard is the own look of a card that fills its width.
  // A title size is its own, never the card's standard.
  if (spec.width === 'fill') for (const d in spec.dials) if (d !== 'titlesize' && spec.dials[d] === 'standard') delete spec.dials[d];
  const minor = spec.height !== undefined && spec.height !== 'fit' && spec.dials.textsize === 'minor';
  if (!spec.text && minor) spec.text = 'none';
  if (!spec.width || !spec.text) throw new Error('"' + name + '": needs size and text');
  if (!spec.title) {
    spec.title = !minor ? 'full' : spec.width === 'fill' || spec.width > spec.height ? 'short' : 'nick';
    spec.titleLink = false;
    if (spec.title === 'full') spec.rest = 'split';
  }
  return spec;
}
