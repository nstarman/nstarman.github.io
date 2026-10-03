// A card's name: its spec, written as key:value[:subvalue] parts joined by "-".
//
//   size:320:400-figure:center:auto-rail:center-title:short-authors:position-text:none-extras:none-buttons:all-look:textsize=feature,padding=compact
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
//   rail     center                 the links, year and context, under the
//                                   words, beside a figure at a side
//            bottom                 under the figure and the words both, the
//                                   card's full width
//            …:<h>[:<v>]            along it, either one's buttons left (the
//            e.g. rail:bottom:right   default), centered, or right — the year
//                                   and context then at its left; then
//                                   across it, the year and context at the
//                                   top, center or bottom (the default) of
//                                   the buttons: rail:center:left:top
//            <side>:<end>[:<h>]     in the left or right side, the links at
//            e.g. rail:right:top    the top or bottom of it and the year at
//                                   the other end, or center, the two
//                                   together in its middle; then across it,
//                                   left, center or right — toward the
//                                   card's edge, left off; with a figure
//                                   in the same side, under it
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
//            …:top                        then, last, where it sits: across
//            e.g. title:short:link:top    the card above all else — the
//                                          figure, words and rails start
//                                          under it; left off, the center,
//                                          the words' own column
//            …:center · …:right           and very last, across its area:
//            e.g. title:nick:top:center   left (the default, left off),
//                                          centered or at the right
//   area     left:<s> · right:<s>         the areas are fixed — the top, the
//            e.g. area:left:share=25,top  left side, the center, the right
//                                          side and the bottom — and the parts
//                                          move between them: a side holds its
//                                          figure and rail, stacked, the
//                                          figure above. A side's settings,
//                                          comma-separated: its width — fit
//                                          (left off), min=<0–800>, at least
//                                          so many px, share=<5–95>, that share
//                                          of the card's width in percent, or
//                                          buttons, as wide as its buttons
//                                          laid out — and the corners it wins:
//                                          top, over the top area, bottom,
//                                          over the bottom area, each of which
//                                          wins its corners left off
//   authors  none · short · full · 1–20   a paper's byline: none, the first
//                                          three and "et al.", up to eight, or
//                                          up to so many, authors:5;
//            …:plain · …:marked           marked colours my students and gives
//                                          them † and ‡; plain, the default, not
//            …:orcid · …:site             each co-author a link: to their ORCID,
//            e.g. authors:full:plain:orcid  or to the papers we wrote together,
//                                          on this site's collaborator map —
//                                          where they have one; left off, words
//            position                     in place of the byline, my place in
//                                          it beside the year: "1st | 2026" —
//                                          never both — in the rail, or
//            position:<x>:<y>             in a corner of the card, left or
//            e.g. authors:position:right:top  right, top or bottom
//   text     none · summary · details     (the record's own tiers; none is
//                                          the title alone)
//   extras   none, or any of venue (where and when it appeared), role (my
//            role in a package), context (a link to its topic on /research/)
//   context  rail                   the context link in the rail, the default
//            <x>:<y>                or out of it, in a corner of the card —
//            e.g. context:right:bottom  left or right, top or bottom — so a
//                                   card with nothing else for a rail has none
//   buttons  the link buttons: all · none, or the keys to keep, e.g.
//            ads,code; then :1–12, the buttons to a row before the next,
//            e.g. buttons:all:2, or :fit, as many as fit — left off, as
//            near square as they go: ⌈√n⌉ to a row, for n buttons
//   space    room between the card's slots, comma-separated, each a length
//            0–64 px or flex — a row, what room is left; a column, a share
//            of the width alike with the words. Between rows, named by
//            the slots either side in their default order — a figure
//            moved among the center's parts keeps the names where they
//            are: title_figure · figure_authors ·
//            authors_venue · venue_text · text_rail · rail_bottom; between
//            columns: left_words · words_right (the left side, the words,
//            the right side). space:title_figure=flex sinks all under the
//            title; words_right=24 widens the gap before the right side.
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
//              buttongap = 0–32 px    the space between the link buttons;
//                left off, a third of the text's height
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
// figure none, rail center, title by the box (below), area none, authors
// none, extras none, context rail, buttons all, space none, and the look
// above. A left-out title depends on the box: a card of set
// height at minor text size is too small for the full title, so it takes the nick
// title when no wider than it is high and the short title when wider;
// anything else takes full:split. Such a box may leave out text too, and has none; any
// other must give it. A name is written in full, in the order above, but for
// the look's settings where they are the box's own, and a look with nothing
// in it. Lists use commas, which survive a URL query where "+" would not.
//
// No imports, so the grammar is this one file, written once.

export const LOOKS = ['minor', 'compact', 'standard', 'feature', 'display'];
export const DIALS = ['textsize', 'padding', 'corners', 'buttons'];
/** Where the figure sits: its area, up and down in a side, and its slot
 *  among the center's parts. */
export const FIGURE_AT = ['left', 'center', 'right'];
export const FIGURE_ALIGN = ['top', 'center', 'bottom'];
export const FIGURE_SLOTS = ['top', 'title', 'authors', 'venue', 'text'];
/** Where the rail sits, and its buttons along it. */
export const FOOT_AT = ['left', 'center', 'right', 'bottom'];
export const FOOT_END = ['top', 'center', 'bottom'];
export const RAIL_ALIGN = ['left', 'center', 'right'];
export const TITLES = ['full', 'short', 'nick', 'none'];
export const AUTHORS = ['none', 'short', 'full', 'position'];
/** The most names authors:<n> asks for. */
export const AUTHORS_MAX = 20;
export const TEXTS = ['none', 'summary', 'details'];
export const EXTRAS = ['venue', 'role', 'context'];
export const BACKGROUNDS = ['none', 'light', 'normal', 'dark'];
/** A set width or height is between these, in px. */
export const FIXED_MIN = 120;
export const FIXED_MAX = 1600;
export const FIXED_MIN_HEIGHT = 40;

export const SPACE_TRACKS = ['title_figure', 'figure_authors', 'authors_venue', 'venue_text', 'text_rail', 'rail_bottom', 'left_words', 'words_right'];

/** The tracks set, in a fixed order. */
const spaceList = (space) => SPACE_TRACKS.filter((t) => space[t]).map((t) => `${t}=${space[t]}`).join(',');

/** Spec → name: every part written, in a fixed order, but the look's settings
 *  that do not depart. */
export function formatName({ width = 'fill', height = 'fit', figure = 'none', figureAlign = 'center', figureSize = 'auto', figureH, figureSlot, figureLink = false, sides = {}, foot = 'center', footEnd, title = 'full', rest = 'split', titleLink = false, titleAt = 'center', titleAlign, authors = 'none', marks = 'plain', text, extras = [], links = 'all', perRow, posX, posY = 'bottom', authorLink = false, contextX, contextY = 'bottom', railAlign, titleWeight, frame, buttonGap, space, dials = {}, background = 'normal' }) {
  const list = (v, all) => (v === all ? all : v.length ? v.join(',') : 'none');
  // Standard is the own look of a card that fills its width, so it departs
  // from nothing there.
  const set = DIALS.filter((d) => dials[d] && !(width === 'fill' && dials[d] === 'standard'));
  const same = set.length === DIALS.length && DIALS.every((d) => dials[d] === dials.textsize);
  const tuned = [
    ...(same ? [dials.textsize] : set.map((d) => `${d}=${dials[d]}`)),
    ...(dials.titlesize ? [`titlesize=${dials.titlesize}`] : []),
    ...(titleWeight ? [`titleweight=${titleWeight}`] : []),
    ...(frame ? [`frame=${frame}`] : []),
    ...(buttonGap != null ? [`buttongap=${buttonGap}`] : []),
    ...(background !== 'normal' ? [`background=${background}`] : []),
  ];
  return [
    `size:${width}:${height}`,
    figure === 'none' ? 'figure:none' : `figure:${figure}${figure === 'center' ? (figureSlot && figureSlot !== 'title' ? `:${figureSlot}` : '') : `:${figureAlign}` + (figureH && figureH !== 'center' ? `:${figureH}` : '')}:${figureSize}` + (figureLink ? ':link' : ''),
    foot === 'center' || foot === 'bottom'
      ? `rail:${foot}` + (railAlign && railAlign !== 'left' || footEnd && footEnd !== 'bottom' ? `:${railAlign ?? 'left'}` : '') + (footEnd && footEnd !== 'bottom' ? `:${footEnd}` : '')
      : `rail:${foot}:${footEnd ?? 'top'}` + (railAlign && railAlign !== foot ? `:${railAlign}` : ''),
    (title === 'full' ? `title:full:${rest}` : `title:${title}`) + (titleLink && title !== 'none' ? `:${titleLink}` : '') + (titleAt === 'top' && title !== 'none' ? ':top' : '') + (titleAlign && titleAlign !== 'left' && title !== 'none' ? `:${titleAlign}` : ''),
    ...['left', 'right'].filter((s) => sides[s]).map((s) => `area:${s}:${[sides[s].width, sides[s].top && 'top', sides[s].bottom && 'bottom'].filter(Boolean).join(',')}`),
    authors === 'none' ? 'authors:none' : authors === 'position' ? 'authors:position' + (posX ? `:${posX}:${posY}` : '') : `authors:${authors}:${marks}` + (authorLink ? `:${authorLink}` : ''),
    `text:${text}`,
    `extras:${EXTRAS.filter((e) => extras.includes(e)).join(',') || 'none'}`,
    ...(contextX && extras.includes('context') ? [`context:${contextX}:${contextY}`] : []),
    `buttons:${list(links, 'all')}` + (perRow ? `:${perRow}` : ''),
    ...(space && Object.keys(space).length ? [`space:${spaceList(space)}`] : []),
    ...(tuned.length ? [`look:${tuned.join(',')}`] : []),
  ].join('-');
}

/** Name → spec; throws on a name that does not describe a card. */
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
    } else if (key === 'rail' && (kv.length === 3 || kv.length === 4) && one(kv[1], ['center', 'bottom'])) {
      // Under the words or at the bottom: along it, then across it — each
      // rail's own axis first, as a side's is.
      if (!(one(kv[2], ['left', 'center', 'right']) && (kv.length === 3 || one(kv[3], ['top', 'center', 'bottom'])))) throw new Error('"' + name + '": no such rail, ' + parts[i]);
      spec.foot = kv[1];
      if (kv[2] !== 'left') spec.railAlign = kv[2];
      if (kv[3] && kv[3] !== 'bottom') spec.footEnd = kv[3];
    } else if (key === 'rail' && (kv.length === 3 || kv.length === 4)) {
      // In a side: where in its height, then where across it — toward the
      // card's edge, the side's own, left off.
      if (!(one(kv[1], ['left', 'right']) && one(kv[2], ['top', 'center', 'bottom']) && (kv.length === 3 || (one(kv[3], ['left', 'center', 'right']) && kv[3] !== kv[1])))) throw new Error('"' + name + '": no such rail, ' + parts[i]);
      spec.foot = kv[1];
      spec.footEnd = kv[2];
      if (kv[3]) spec.railAlign = kv[3];
    } else if (key === 'area' && one(kv[1], ['left', 'right']) && kv.length === 3) {
      // A side: its width — at least so many px, growing to fit what is in
      // it; a share of the card's; or its buttons' — and the corners it
      // wins, over the top and bottom areas. Each once.
      const side = {};
      const xs = kv[2].split(',');
      for (let j = 0; j < xs.length; j += 1) {
        const m = /^(min|share)=(0|[1-9][0-9]{0,2})$/.exec(xs[j]);
        const width = (m && (m[1] === 'min' ? +m[2] <= 800 : +m[2] >= 5 && +m[2] <= 95)) || xs[j] === 'buttons';
        if (width && !side.width) side.width = xs[j];
        else if (one(xs[j], ['top', 'bottom']) && !side[xs[j]]) side[xs[j]] = true;
        else throw new Error('"' + name + '": no such area, ' + parts[i]);
      }
      spec.sides = { ...spec.sides, [kv[1]]: side };
    } else if (key === 'title') {
      // full[:whole|split], short, nick or none; any but none may then link,
      // :link, :site, :ads or :journal, then sit at the :top, across the
      // card above all else, rather than in the center column, and very last
      // across its area, left, center or right.
      const align = kv.length > 2 && one(kv[kv.length - 1], ['left', 'center', 'right']) ? kv[kv.length - 1] : null;
      const ka = align ? kv.slice(0, -1) : kv;
      const top = ka.length > 2 && ka[ka.length - 1] === 'top';
      const kt = top ? ka.slice(0, -1) : ka;
      const link = kt.length > 2 && one(kt[kt.length - 1], ['link', 'site', 'ads', 'journal']) ? kt[kt.length - 1] : false;
      const t = link ? kt.slice(1, -1) : kt.slice(1);
      if ((top || align) && t[0] === 'none') throw new Error('"' + name + '": no such title, ' + parts[i]);
      if (t[0] === 'full' && t.length <= 2 && (t.length === 1 || one(t[1], ['whole', 'split']))) spec.rest = t[1] || 'split';
      else if (!(t.length === 1 && one(t[0], ['short', 'nick', 'none']) && !(link && t[0] === 'none'))) throw new Error('"' + name + '": no such title, ' + parts[i]);
      spec.title = t[0];
      spec.titleLink = link;
      spec.titleAt = top ? 'top' : 'center';
      if (align && align !== 'left') spec.titleAlign = align;
    } else if (key === 'authors' && (one(kv[1], ['short', 'full']) || (/^[1-9][0-9]?$/.test(kv[1]) && +kv[1] <= 20)) && kv.length <= 4) {
      // The length, then its marking, then where the names link, if anywhere.
      const link = kv.length > 2 && one(kv[kv.length - 1], ['orcid', 'site']) ? kv[kv.length - 1] : false;
      const m = kv.slice(2, link ? -1 : undefined);
      if (m.length > 1 || (m.length && !one(m[0], ['marked', 'plain']))) throw new Error('"' + name + '": no such student marking, ' + parts[i]);
      spec.authors = one(kv[1], ['short', 'full']) ? kv[1] : +kv[1];
      spec.marks = m[0] || 'plain';
      spec.authorLink = link;
    } else if (key === 'authors' && kv[1] === 'position' && kv.length === 4) {
      if (!(one(kv[2], ['left', 'right']) && one(kv[3], ['top', 'bottom']))) throw new Error('"' + name + '": no such corner, ' + parts[i]);
      spec.authors = 'position';
      spec.posX = kv[2];
      spec.posY = kv[3];
    } else if (key === 'context' && kv.length === 3) {
      if (!(one(kv[1], ['left', 'right']) && one(kv[2], ['top', 'bottom']))) throw new Error('"' + name + '": no such corner, ' + parts[i]);
      spec.contextX = kv[1];
      spec.contextY = kv[2];
    } else if (key === 'buttons' && kv.length <= 3 && /^(all|none|[a-z]+(,[a-z]+)*)$/.test(kv[1])) {
      if (kv.length === 3 && !(kv[2] === 'fit' || (/^[1-9][0-9]?$/.test(kv[2]) && +kv[2] <= 12))) throw new Error('"' + name + '": no such buttons to a row, ' + parts[i]);
      spec.links = kv[1] === 'all' ? 'all' : kv[1] === 'none' ? [] : kv[1].split(',');
      if (kv.length === 3) spec.perRow = kv[2] === 'fit' ? 'fit' : +kv[2];
    } else if (kv.length !== 2) {
      throw new Error('"' + name + '": not key:value, ' + parts[i]);
    } else if (key === 'figure' && kv[1] === 'none') {
      spec.figure = 'none';
    } else if (key === 'rail' && one(kv[1], ['center', 'bottom'])) {
      spec.foot = kv[1];
    } else if (key === 'authors' && one(kv[1], ['none', 'position'])) {
      spec.authors = kv[1];
    } else if (key === 'context' && kv[1] === 'rail') {
      delete spec.contextX;
    } else if (key === 'text' && one(kv[1], ['none', 'summary', 'details'])) {
      spec.text = kv[1];
    } else if (key === 'extras') {
      const xs = kv[1] === 'none' ? [] : kv[1].split(',');
      for (let j = 0; j < xs.length; j += 1) if (!one(xs[j], ['venue', 'role', 'context'])) throw new Error('"' + name + '": no such extra, ' + xs[j]);
      spec.extras = xs;
    } else if (key === 'space') {
      spec.space = {};
      const xs = kv[1].split(',');
      for (let j = 0; j < xs.length; j += 1) {
        // A track between two slots, named by them.
        const t = /^(title_figure|figure_authors|authors_venue|venue_text|text_rail|rail_bottom|left_words|words_right)=(flex|0|[1-9][0-9]?)$/.exec(xs[j]);
        if (!t || (t[2] !== 'flex' && +t[2] > 64)) throw new Error('"' + name + '": no such space, ' + xs[j]);
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
        else if (s[0] === 'buttongap' && /^(0|[1-9][0-9]?)$/.test(s[1]) && +s[1] <= 32) spec.buttonGap = s[1];
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
