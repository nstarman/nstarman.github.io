// Holds the offline card to the browser's: each card is measured in headless Chromium, on the real
// embed page with src/lib/cardpdf.js's own measureCard, and by the layout engine from the card's
// own markup and stylesheet (src/lib/cardoffline.js), and the two models are compared
// (specs/001-takumi-card-renderer, contracts/offline-card.md).
//
//   npm run build                       # the pages it measures are dist/embed/<id>/
//   npx playwright install chromium     # once
//   npm run check:cards -- [--preset <key>]… [--item <id>]… [--width N]… [--theme light|dark] [--json]
//
// Left out, the cases are every preset in OFFLINE_PRESETS (`--preset home` asks for one left out) for one item of each type that has a card
// (astropy, four papers, a highlight where there is one), at 400 and 808 px, in both themes. A case
// passes when everything the model holds is within half a pixel and nothing is missing or extra.
// Exit 0 when every case does, 1 when one does not, 2 for bad arguments.
//
// Chrome must be a Mac's: Chrome on Linux rounds glyph advances to whole pixels and breaks lines
// elsewhere, so a card laid out there is not the one a reader's browser draws.
// Headless only; no visible browser is ever opened. No network service is called.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ssr } from './lib/ssr.mjs';

const USAGE = 'usage: npm run check:cards -- [--preset <key>]… [--item <id>]… [--width N]… [--theme light|dark] [--json] | --fuzz N [--seed S] [--path P]';
const HALF = 0.5; // CSS px: the spec's tolerance (FR-002)
const TEXT_WIDTH = 1; // a line's width is drawn as textLength, which squeezes a line that is wrong by more
const COLOUR = 1; // per channel of #rrggbbaa: the two round a computed colour differently
const SITE = 'https://nstarkman.space';
const MIME = { html: 'text/html', css: 'text/css', svg: 'image/svg+xml', js: 'text/javascript', json: 'application/json', otf: 'font/otf', ttf: 'font/ttf', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2' };
const DEFAULT_ITEMS = ['astropy', 'pinns-neurips', 'potamides-apj', 'euclid-eggs-pilot', 'coordinax-paper'];
const DEFAULT_WIDTHS = [400, 808];

function readArgs(argv) {
  const a = { presets: [], items: [], widths: [], theme: null, json: false, fuzz: 0, seed: undefined, path: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => { if (argv[i + 1] === undefined) throw new Error(`${arg} needs a value`); return argv[++i]; };
    if (arg === '--preset') a.presets.push(value());
    else if (arg === '--item') a.items.push(value());
    else if (arg === '--width') { const n = Number(value()); if (!Number.isInteger(n) || n < 120 || n > 1600) throw new Error('--width is a whole number of px, 120–1600'); a.widths.push(n); }
    else if (arg === '--theme') { a.theme = value(); if (!['light', 'dark'].includes(a.theme)) throw new Error('--theme is light or dark'); }
    else if (arg === '--json') a.json = true;
    else if (arg === '--fuzz') { a.fuzz = Number(value()); if (!Number.isInteger(a.fuzz) || a.fuzz < 1) throw new Error('--fuzz is a number of cards, 1 or more'); }
    else if (arg === '--seed') a.seed = Number(value());
    else if (arg === '--path') a.path = value();
    else throw new Error(`no such option, ${arg}`);
  }
  return a;
}

// ---- comparing two models ----

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const colourNear = (a, b) => (a === b) || (!!a && !!b && [1, 3, 5, 7].every((i) => near(parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16), COLOUR)));
const rectGap = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h);
const rectMax = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));
const inRect = (a, b) => near(a.x, b.x, HALF) && near(a.y, b.y, HALF) && near(a.w, b.w, HALF) && near(a.h, b.h, HALF);
/** An svg op's markup, with its colours apart, so that two within a unit of each other are the same. */
const split = (svg) => ({ shape: svg.replace(/#[0-9a-f]{6}/gi, '#'), colours: svg.match(/#[0-9a-f]{6}/gi) ?? [] });
/** A clamped last line: the browser measurement drops a character before its ellipsis, the engine's has what it drew (research E11). */
/** Where two strings first differ, with a little of each around it. */
const firstDiff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i += 1; return `at ${i}: "${a.slice(Math.max(0, i - 20), i + 40)}" / "${b.slice(Math.max(0, i - 20), i + 40)}"`; };
const sameLine = (c, e) => c === e || (c.endsWith('…') && e.endsWith('…') && e.startsWith(c.slice(0, -2)));

/** Pairs each of `want` with the nearest unused `have` that `ok` accepts: [[w, h]…], the unpaired of each. */
function pair(want, have, ok, gap) {
  const used = new Set();
  const pairs = [];
  const missing = [];
  for (const w of want) {
    let best = null;
    for (const h of have) if (!used.has(h) && ok(w, h) && (!best || gap(w, h) < gap(w, best))) best = h;
    if (best) { used.add(best); pairs.push([w, best]); } else missing.push(w);
  }
  return { pairs, missing, extra: have.filter((h) => !used.has(h)) };
}

/** What differs between the browser's model and the engine's, and the greatest distance it found. */
export function compareModels(chrome, engine) {
  const problems = [];
  let worst = 0;
  const gap = (what, a, b, tol) => { const d = Math.abs(a - b); worst = Math.max(worst, d); if (d > tol) problems.push(`${what}: ${a} in the browser, ${b} in the engine`); };
  gap('card width', chrome.w, engine.w, HALF);
  gap('card height', chrome.h, engine.h, HALF);
  chrome.r.forEach((r, i) => gap(`card corner ${i}`, r, engine.r[i], HALF));

  const of = (m, k) => m.ops.filter((o) => o.k === k);
  const text = pair(of(chrome, 'text'), of(engine, 'text'), (c, e) => sameLine(c.s, e.s) && near(c.x, e.x, 3) && near(c.y, e.y, 3), (c, e) => Math.abs(c.x - e.x) + Math.abs(c.y - e.y));
  for (const c of text.missing) problems.push(`missing text "${c.s}" at ${c.x.toFixed(1)}, ${c.y.toFixed(1)}`);
  for (const e of text.extra) problems.push(`extra text "${e.s}" at ${e.x.toFixed(1)}, ${e.y.toFixed(1)}`);
  for (const [c, e] of text.pairs) {
    const at = `text "${c.s}"`;
    gap(`${at} x`, c.x, e.x, HALF); gap(`${at} y`, c.y, e.y, HALF);
    if (!near(c.w, e.w, TEXT_WIDTH)) problems.push(`${at} width: ${c.w.toFixed(2)} in the browser, ${e.w.toFixed(2)} in the engine`);
    for (const k of ['font', 'weight', 'style', 'href']) if (c[k] !== e[k]) problems.push(`${at} ${k}: ${c[k]} in the browser, ${e[k]} in the engine`);
    if (!near(c.size, e.size, 0.01)) problems.push(`${at} size: ${c.size} in the browser, ${e.size} in the engine`);
    if (!near(c.ls, e.ls, 0.01)) problems.push(`${at} letter-spacing: ${c.ls} in the browser, ${e.ls} in the engine`);
    if (!colourNear(c.color, e.color)) problems.push(`${at} colour: ${c.color} in the browser, ${e.color} in the engine`);
  }

  const boxes = pair(of(chrome, 'box'), of(engine, 'box'), inRect, rectGap);
  for (const c of boxes.missing) problems.push(`missing box ${[c.x, c.y, c.w, c.h].map((v) => v.toFixed(1))} ${c.fill ?? ''} ${c.stroke ?? ''}`);
  for (const e of boxes.extra) problems.push(`extra box ${[e.x, e.y, e.w, e.h].map((v) => v.toFixed(1))} ${e.fill ?? ''} ${e.stroke ?? ''}`);
  for (const [c, e] of boxes.pairs) {
    const at = `box ${[c.x, c.y, c.w, c.h].map((v) => v.toFixed(1))}`;
    worst = Math.max(worst, rectMax(c, e));
    if (!colourNear(c.fill, e.fill)) problems.push(`${at} fill: ${c.fill} in the browser, ${e.fill} in the engine`);
    if (!colourNear(c.stroke, e.stroke)) problems.push(`${at} stroke: ${c.stroke} in the browser, ${e.stroke} in the engine`);
    if (!near(c.sw, e.sw, 0.05)) problems.push(`${at} border: ${c.sw} in the browser, ${e.sw} in the engine`);
    c.r.forEach((r, i) => { if (!near(r, e.r[i], HALF)) problems.push(`${at} corner ${i}: ${r} in the browser, ${e.r[i]} in the engine`); });
    if (c.href !== e.href) problems.push(`${at} link: ${c.href} in the browser, ${e.href} in the engine`);
  }

  for (const k of ['svg', 'img']) {
    const parts = pair(of(chrome, k), of(engine, k), inRect, rectGap);
    for (const c of parts.missing) problems.push(`missing ${k} ${[c.x, c.y, c.w, c.h].map((v) => v.toFixed(1))}`);
    for (const e of parts.extra) problems.push(`extra ${k} ${[e.x, e.y, e.w, e.h].map((v) => v.toFixed(1))}`);
    for (const [c, e] of parts.pairs) {
      const at = `${k} ${[c.x, c.y, c.w, c.h].map((v) => v.toFixed(1))}`;
      worst = Math.max(worst, rectMax(c, e));
      if (c.href !== e.href) problems.push(`${at} link: ${c.href} in the browser, ${e.href} in the engine`);
      // The engine reads a fit from the rectangle the picture is drawn in, and a picture that fills its box is drawn the
      // same whether the CSS says cover or contain: that is the one pair taken as equal.
      if (k === 'img' && c.fit !== e.fit && !(c.fit === 'cover' && e.fit === 'contain')) problems.push(`${at} fit: ${c.fit} in the browser, ${e.fit} in the engine`);
      if (k === 'svg') {
        const a = split(c.svg); const b = split(e.svg);
        if (a.shape !== b.shape || a.colours.length !== b.colours.length || !a.colours.every((x, i) => colourNear(`${x}ff`, `${b.colours[i]}ff`))) problems.push(`${at} drawing differs ${firstDiff(c.svg, e.svg)} (browser / engine)`);
      }
    }
  }
  return { problems, worst, ok: problems.length === 0 };
}

// ---- the cases, and the two ways of measuring one ----

async function main(args) {
  const root = process.cwd();
  const { load, close } = await ssr();
  let browser;
  try {
    const { items } = await load('/src/lib/data.js');
    const { SITE_PRESETS, TIER_PRESET, atWidth } = await load('/packages/card-builder/src/cards.js');
    const { modelFor, OFFLINE_PRESETS } = await load('/src/lib/cardoffline.js');
    const { query } = await load('/src/lib/cardexport.js');

    for (const key of args.presets) if (!SITE_PRESETS.some((p) => p.key === key)) throw Object.assign(new Error(`no such preset, ${key}`), { usage: true });
    for (const id of args.items) if (!items.some((i) => i.id === id)) throw Object.assign(new Error(`no such item, ${id}`), { usage: true });
    // One item of each type that has a card, and every preset, unless asked for others.
    const ids = args.items.length ? args.items : [...DEFAULT_ITEMS, items.find((i) => i.type === 'highlight')?.id].filter(Boolean);
    const sizes = (args.widths.length ? args.widths : DEFAULT_WIDTHS).flatMap((w) => (args.theme ? [args.theme] : ['light', 'dark']).map((t) => [w, t]));
    const cases = ids.flatMap((id) => (args.presets.length ? args.presets : OFFLINE_PRESETS).flatMap((preset) => sizes
      .map(([width, theme]) => ({ item: items.find((i) => i.id === id), preset, width, theme, name: atWidth(SITE_PRESETS.find((p) => p.key === preset).slug, width) }))));
    if (!cases.length) throw Object.assign(new Error('no cards to check'), { usage: true });

    for (const id of new Set(cases.map((c) => c.item.id))) {
      if (!fs.existsSync(path.join(root, 'dist/embed', id, 'index.html'))) throw new Error(`dist/embed/${id}/ is missing: run npm run build first`);
    }
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true }).catch((err) => { throw new Error(`${err.message.split('\n')[0]}\n(run: npx playwright install chromium)`); });
    // 1280 wide is where the root font size is exactly 16px, as the cards were measured and are used.
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.route('http://card.test/**', (route) => {
      const p = decodeURIComponent(new URL(route.request().url()).pathname);
      const file = path.join(root, 'dist', p.endsWith('/') ? `${p}index.html` : p);
      return fs.existsSync(file) && fs.statSync(file).isFile()
        ? route.fulfill({ body: fs.readFileSync(file), contentType: MIME[file.split('.').pop()] ?? 'application/octet-stream' })
        : route.fulfill({ status: 404, body: '' });
    });
    const measureSrc = fs.readFileSync(path.join(root, 'src/lib/cardpdf.js'), 'utf8').replace(/^export /gm, '');

    if (args.fuzz) return await fuzz(args, { items, SITE_PRESETS, TIER_PRESET, atWidth, modelFor, query, page });

    const results = [];
    for (const c of cases) {
      const label = `${c.item.id} ${c.preset} ${c.width} ${c.theme}`;
      let r;
      try {
        await page.goto(`http://card.test/embed/${c.item.id}/${query({ slug: c.name, theme: c.theme })}`, { waitUntil: 'load' });
        await page.addScriptTag({ content: measureSrc });
        // The buttons ease their colours, and a card read in between is half in each theme.
        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important }' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(80);
        const chrome = await page.evaluate(({ title, site }) => window.measureCard(document.querySelector('.card'), { title, site }).model, { title: c.item.title, site: SITE });
        const { model: engine } = await modelFor({ item: c.item, name: c.name, theme: c.theme, width: c.width });
        r = { ...compareModels(chrome, engine), label, preset: c.preset };
      } catch (err) {
        r = { ok: false, worst: Infinity, problems: [`could not measure: ${err.message.split('\n')[0]}`], label, preset: c.preset };
      }
      results.push(r);
      if (!args.json) console.log(`${r.ok ? '✓' : '✗'} ${label}${r.ok ? `  (worst ${r.worst.toFixed(3)} px)` : ''}${r.ok ? '' : `\n    ${r.problems.slice(0, 8).join('\n    ')}${r.problems.length > 8 ? `\n    … and ${r.problems.length - 8} more` : ''}`}`);
    }

    const failed = results.filter((r) => !r.ok);
    if (args.json) console.log(JSON.stringify(results.map(({ label, preset, ok, worst, problems }) => ({ label, preset, ok, worst: Number.isFinite(worst) ? worst : null, problems })), null, 2));
    else {
      const byPreset = {};
      for (const r of results) { const b = (byPreset[r.preset] ??= { cases: 0, passed: 0, worst: 0 }); b.cases += 1; b.passed += r.ok; b.worst = Math.max(b.worst, r.ok ? r.worst : 0); }
      console.log(`\n${results.length - failed.length} of ${results.length} cases within ${HALF} px: ${Object.entries(byPreset).map(([k, b]) => `${k} ${b.passed}/${b.cases}`).join(', ')}`);
    }
    return failed.length ? 1 : 0;
  } finally {
    await browser?.close();
    await close();
  }
}

// ---- cards nobody chose: generated titles, texts, roles and widths, laid out in both ----

/** The old differential test's generators, over the card's text: a title, a role, a text and a width. */
async function fuzz(args, { items, SITE_PRESETS, TIER_PRESET, atWidth, modelFor, query, page }) {
  const fc = (await import('fast-check')).default;
  const word = fc.oneof(
    { weight: 8, arbitrary: fc.stringMatching(/^[A-Za-z]{1,12}$/) },
    { weight: 2, arbitrary: fc.stringMatching(/^[A-Za-z]{1,6}-[A-Za-z]{1,6}$/) },
    { weight: 1, arbitrary: fc.stringMatching(/^[A-Za-z]+[.,;:!?'")(]$/) },
    { weight: 1, arbitrary: fc.constantFrom('—', '·', '&', '"quoted"', "it's", 'naïve', 'Zürich', 'ß', '5–10', 'x/y', 'e.g.', '3.14') },
    { weight: 1, arbitrary: fc.stringMatching(/^[A-Za-z]{25,45}$/) },
  );
  const sentence = fc.array(word, { minLength: 1, maxLength: 40 }).map((w) => w.join(' '));
  const packages = items.filter((i) => i.type === 'software' && i.tier in TIER_PRESET);
  const cards = fc.record({
    id: fc.constantFrom(...packages.map((i) => i.id)),
    width: fc.integer({ min: 160, max: 900 }),
    theme: fc.constantFrom('light', 'dark'),
    title: fc.option(fc.stringMatching(/^[A-Za-z_][A-Za-z0-9_-]{0,30}$/), { nil: null }),
    text: fc.option(sentence, { nil: null }),
    role: fc.option(sentence, { nil: null }),
  });
  // The page's edits, and the same edits to the item the engine is given.
  const edit = ({ title, text, role }) => {
    const card = document.querySelector('.card');
    if (title != null) for (const t of card.querySelectorAll('.c-name .c-t')) t.textContent = title;
    if (text != null) card.querySelector('.c-det').textContent = text;
    if (role != null) { const r = card.querySelector('.c-role'); if (r) r.textContent = role; }
  };
  let last;
  const property = fc.asyncProperty(cards, async (c) => {
    try { await one(c); } catch (err) { last = err; throw err; }
  });
  const one = async (c) => {
    const item = items.find((i) => i.id === c.id);
    const name = atWidth(SITE_PRESETS.find((p) => p.key === TIER_PRESET[item.tier]).slug, c.width).replace(/^size:\d+:/, `size:${c.width}:`);
    await page.goto(`http://card.test/embed/${c.id}/${query({ slug: name, theme: c.theme })}`, { waitUntil: 'load' });
    await page.addScriptTag({ content: fs.readFileSync('src/lib/cardpdf.js', 'utf8').replace(/^export /gm, '') });
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important }' });
    await page.evaluate(`(${edit.toString()})(${JSON.stringify(c)})`);
    await page.evaluate(() => document.fonts.ready);
    const chrome = await page.evaluate(({ title, site }) => window.measureCard(document.querySelector('.card'), { title, site }).model, { title: c.title ?? item.title, site: SITE });
    const edited = { ...item, title: c.title ?? item.title, details: c.text ?? item.details, role: item.role && c.role ? c.role : item.role };
    const { model } = await modelFor({ item: edited, name, theme: c.theme, width: c.width });
    const r = compareModels(chrome, model);
    if (!r.ok) throw new Error(`${name} (${c.theme})\n${r.problems.slice(0, 12).join('\n')}`);
  };
  try {
    await fc.assert(property, { numRuns: args.fuzz, seed: args.seed, path: args.path });
    console.log(`${args.fuzz} generated cards, all within ${HALF} px`);
    return 0;
  } catch (err) {
    const out = process.env.FUZZ_OUT;
    err.message = `${err.message}\n\nlast failure: ${last?.stack ?? last}`;
    if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'counterexample.txt'), String(err.message)); }
    console.error(err.message);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let args;
  try { args = readArgs(process.argv.slice(2)); } catch (err) { console.error(`${err.message}\n${USAGE}`); process.exit(2); }
  main(args).then((code) => process.exit(code), (err) => { console.error(err.message); process.exit(err.usage ? 2 : 1); });
}
