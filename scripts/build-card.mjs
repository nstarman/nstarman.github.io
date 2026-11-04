// Draws a card as the Card Builder downloads it, without opening the builder:
//
//   node scripts/build-card.mjs <id> [<card name | preset key>] [--theme light|dark] [--width N] [out.svg|.png|.pdf]
//
// Left out, the name is the item's default card, the theme light, and the output the
// builder's own file name for it, a PNG, where the command was run.
//
// It runs the builder's own downloadCard (src/lib/cardbuilder/download.js) in a headless
// Chromium against the site's dev server, started here, so the file is the builder's —
// the same measurement of the same CSS — with no layout of its own (specs/cards/spec.md).
// Needs Playwright's Chromium: npx playwright install chromium.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readArgs, USAGE } from './lib/cardargs.mjs';

let args;
try {
  args = readArgs(process.argv.slice(2));
} catch (err) {
  console.error(`${err.message}\n${USAGE}`);
  process.exit(2);
}

const cwd = process.cwd();
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
// The PDF's compiler, which predev otherwise makes.
const COMPILER = 'src/generated/typst_ts_web_compiler_bg.wasm.gz';
if (args.format === 'pdf' && !fs.existsSync(COMPILER)) {
  const r = spawnSync(process.execPath, ['scripts/gzip-compiler.mjs'], { stdio: 'inherit' });
  if (r.status !== 0 || !fs.existsSync(COMPILER)) {
    console.error(`could not make ${COMPILER} (scripts/gzip-compiler.mjs${r.error ? `: ${r.error.message}` : ` exited ${r.status}`})`);
    process.exit(1);
  }
}

const { dev } = await import('astro');
const { chromium } = await import('playwright');
const fonts = fs.readdirSync('public/fonts/card').filter((f) => f.endsWith('.otf')).sort().map((f) => `/fonts/card/${f}`);

let server, browser;
try {
  // Without the dev toolbar, which marks elements with their source file — the builder's
  // download from the deployed site has no such attributes.
  server = await dev({ root, logLevel: 'error', devToolbar: { enabled: false }, server: { host: '127.0.0.1', port: 0 } });
  const base = `http://127.0.0.1:${server.address.port}`;
  browser = await chromium.launch().catch((err) => {
    throw new Error(`${err.message.split('\n')[0]}\n(run: npx playwright install chromium)`);
  });
  // 1280 wide is where the root font size is exactly 16px, as the builder is used.
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Any page of the site can import its modules; the item's own embed is a 404 for an unknown id,
  // which the lookup below names.
  await page.goto(`${base}/embed/index.json`);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180_000 }),
    page.evaluate(async ({ args, fonts }) => {
      const { items } = await import('/src/lib/data.js');
      const { CARD_TYPES, PRESET, defaultSlug, formatName, parseName } = await import('/packages/card-builder/src/cards.js');
      const { query } = await import('/src/lib/cardexport.js');
      const { downloadCard } = await import('/src/lib/cardbuilder/download.js');
      const it = items.find((i) => i.id === args.id);
      if (!it) throw new Error(`no item ${args.id}`);
      if (!CARD_TYPES.includes(it.type)) throw new Error(`${args.id} is a ${it.type}, which has no card`);
      const spec = parseName(PRESET[args.name] ?? args.name ?? defaultSlug(it));
      const width = spec.width === 'fill' ? args.width : spec.width;
      if (width == null) throw new Error('this card fills its width: give one with --width N');
      // As the builder's readSpec has it, the name written in full.
      const s = { id: it.id, it: { title: it.title }, slug: formatName(spec), width, format: args.format, theme: args.theme };
      // The preview as the builder makes it: an iframe of the embed, as high as the card reports.
      const preview = document.body.appendChild(document.createElement('div'));
      preview.innerHTML = `<iframe src="/embed/${s.id}/${query(s)}" width="${width}" style="border:0; max-width:100%"></iframe>`;
      addEventListener('message', (e) => {
        if (e.data?.type === 'nstarkman-embed') preview.querySelector('iframe').style.height = `${e.data.height}px`;
      });
      await downloadCard({ preview, site: 'https://nstarkman.space', fonts, say: () => {} }, s);
    }, { args, fonts }),
  ]);
  const out = path.resolve(cwd, args.out ?? download.suggestedFilename());
  await download.saveAs(out);
  console.log(`${path.relative(cwd, out)}  ${fs.statSync(out).size} bytes`);
} catch (err) {
  // The page's message, without page.evaluate's prefix and the stack.
  console.error(err.message.replace(/^page\.evaluate: (Error: )?/, '').split('\n').filter((l) => !/^\s+at /.test(l)).join('\n'));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.stop();
}
