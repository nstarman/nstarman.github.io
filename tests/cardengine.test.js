// The layout engine on the card's own markup and stylesheet (src/lib/cardengine.js).
import { describe, expect, it } from 'vitest';
import { items } from '../src/lib/data.js';
import { renderMarkup } from '../src/lib/cardmarkup.js';
import { engineCss } from '../src/lib/cardcss.js';
import { engineFonts } from '../src/lib/cardfonts.js';
import { withLayout } from '../src/lib/cardengine.js';
import { SITE_PRESETS, atWidth } from '@nstarkman/card-builder/cards.js';

const astropy = items.find((i) => i.id === 'astropy');
const flagship = atWidth(SITE_PRESETS.find((p) => p.key === 'softwareFlagship').slug, 400);
const cardOf = (tree) => tree.nodes.find((n) => n.type === 'box' && n.element?.className?.split(' ').includes('card'));

describe('engineFonts', () => {
  it('reads every face the card names, once, as family, weight and style', () => {
    const fonts = engineFonts();
    expect(fonts.length).toBe(18);
    expect(new Set(fonts.map((f) => f.name))).toEqual(new Set(['IBM Plex Sans', 'IBM Plex Mono', 'Newsreader']));
    expect(fonts.every((f) => f.data instanceof Uint8Array && f.data.length > 1000)).toBe(true);
    expect(new Set(fonts.map((f) => `${f.name}|${f.weight}|${f.style}`)).size).toBe(18);
    expect(engineFonts()).toBe(fonts);
  });
});

describe('withLayout', () => {
  const input = async (theme = 'light') => ({ ...(await renderMarkup(astropy, flagship, { theme })), css: engineCss(theme), fonts: engineFonts() });

  it('lays the card out at the width its name asks, as Chrome did', async () => {
    // 268.71875 and 400 are what Chrome measured for this card (research E2).
    const { width, height } = await withLayout(await input(), (tree) => cardOf(tree));
    expect(width).toBe(400);
    expect(height).toBe(268.71875);
  });

  it('lays out a dark card the same, in colour only', async () => {
    const light = await withLayout(await input('light'), (tree) => cardOf(tree).height);
    const dark = await withLayout(await input('dark'), (tree) => cardOf(tree).height);
    expect(dark).toBe(light);
  });

  it('frees the tree when it has been read, and when reading it fails', async () => {
    let seen;
    await withLayout(await input(), (tree) => { seen = tree; });
    expect(() => seen.toJSON()).toThrow();
    let failed;
    await expect(withLayout(await input(), (tree) => { failed = tree; throw new Error('read failed'); })).rejects.toThrow('read failed');
    expect(() => failed.toJSON()).toThrow();
  });

  it('does it in a few milliseconds', async () => {
    const given = await input();
    await withLayout(given, () => {}); // the first call loads the engine
    const t = performance.now();
    for (let i = 0; i < 10; i += 1) await withLayout(given, () => {});
    expect((performance.now() - t) / 10).toBeLessThan(50);
  });
});

describe('the engine and its rasterizer', () => {
  it('are pinned exactly, so an upgrade is a deliberate change that runs the Chrome comparison', async () => {
    const { default: pkg } = await import('../package.json', { with: { type: 'json' } });
    for (const name of ['takumi-paint', '@resvg/resvg-js']) expect(pkg.devDependencies[name], name).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
