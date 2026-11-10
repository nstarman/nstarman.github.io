// The offline card's markup (src/lib/cardmarkup.js): Card.astro rendered with a name, plus the
// probes the measurer reads links, icon colours and the ground from.
import { describe, expect, it } from 'vitest';
import { items } from '../src/lib/data.js';
import { renderMarkup, sprite } from '../src/lib/cardmarkup.js';
import { SITE_PRESETS, atWidth } from '@nstarkman/card-builder/cards.js';

const astropy = items.find((i) => i.id === 'astropy');
const name = atWidth(SITE_PRESETS.find((p) => p.key === 'softwareFlagship').slug, 400);

describe('renderMarkup', () => {
  it('wraps the card as the embed page does, with its theme on the root', async () => {
    const { html } = await renderMarkup(astropy, name);
    expect(html).toMatch(/^<html data-theme="light"><body class="embed"><main><article class="card"/);
    expect((await renderMarkup(astropy, name, { theme: 'dark' })).html).toContain('<html data-theme="dark">');
  });

  it('adds one ground probe, which takes no room', async () => {
    const { html } = await renderMarkup(astropy, name);
    expect(html.match(/class="x-ground"/g)).toHaveLength(1);
    expect(html).toMatch(/class="x-ground" style="position:absolute;width:1px;height:1px;background:var\(--ground\)"/);
  });

  it('tags every link with x-link-N, and links[N] is its address', async () => {
    const { html, links } = await renderMarkup(astropy, name);
    const anchors = [...html.matchAll(/<a\b[^>]*\bhref="[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(anchors.length).toBeGreaterThan(1);
    anchors.forEach((tag) => expect(tag).toMatch(/\bclass="[^"]*\bx-link-\d+\b/));
    expect(links).toHaveLength(anchors.length);
    // An ampersand in an address comes back as the address, not as markup.
    for (const href of links) expect(href).not.toMatch(/&amp;|&quot;/);
  });

  it('follows each icon with one colour probe and names its symbol', async () => {
    const { html, icons } = await renderMarkup(astropy, name);
    const svgs = html.match(/<svg\b[^>]*\bclass="[^"]*\bico\b[^"]*"/g) ?? [];
    expect(svgs.length).toBeGreaterThan(0);
    expect(icons).toHaveLength(svgs.length);
    icons.forEach((icon, n) => {
      expect(html).toContain(`</svg><i class="x-ink-${n}" style="position:absolute;width:1px;height:1px;background:currentColor"></i>`);
      expect(icon.symbol).toMatch(/^i-/);
    });
  });
});

describe('sprite', () => {
  it('has a symbol, with a viewBox and a body, for every icon the card uses', async () => {
    const { icons } = await renderMarkup(astropy, name);
    const symbols = await sprite();
    expect(symbols.size).toBeGreaterThan(5);
    for (const { symbol } of icons) {
      expect(symbols.has(symbol), `no symbol ${symbol} in the sprite`).toBe(true);
      expect(symbols.get(symbol).viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
      expect(symbols.get(symbol).body.length).toBeGreaterThan(10);
      expect(symbols.get(symbol).body, 'no path of this machine in a drawing').not.toMatch(/data-astro-|\/Users\/|\/home\//);
    }
  });
});
