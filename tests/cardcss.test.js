// The stylesheet handed to the layout engine (src/lib/cardcss.js).
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STYLESHEETS, PRELUDE, darkCss, engineCss } from '../src/lib/cardcss.js';

describe('darkCss', () => {
  it('takes the second colour of a pair', () => {
    expect(darkCss('a{color:light-dark(#fff,#000)}')).toBe('a{color:#000}');
  });

  it('reads a colour that is itself a function, on either side', () => {
    expect(darkCss('a{color:light-dark(rgb(1 2 3), color-mix(in oklab, red 8%, blue))}')).toBe('a{color:color-mix(in oklab, red 8%, blue)}');
    expect(darkCss('a{color:light-dark(rgb(1, 2, 3), rgb(4, 5, 6))}')).toBe('a{color:rgb(4, 5, 6)}');
  });

  it('takes every pair in a stylesheet, several to a declaration', () => {
    expect(darkCss(':root{--a:light-dark(#111,#eee);--b:light-dark(#222,#ddd)} p{border:1px solid light-dark(red,blue)}'))
      .toBe(':root{--a:#eee;--b:#ddd} p{border:1px solid blue}');
  });

  it('is case-insensitive, and leaves a stylesheet with no pair alone', () => {
    expect(darkCss('a{color:LIGHT-DARK(#fff,#000)}')).toBe('a{color:#000}');
    expect(darkCss('a{color:red}')).toBe('a{color:red}');
  });

  it('refuses what it cannot read rather than writing half of it', () => {
    expect(() => darkCss('a{color:light-dark(#fff)}')).toThrow(/cannot read light-dark\(\)/);
    expect(() => darkCss('a{color:light-dark(#fff,')).toThrow(/cannot read light-dark\(\)/);
  });
});

describe('engineCss', () => {
  it('starts with the browser defaults, and has no @font-face or comment', () => {
    for (const theme of ['light', 'dark']) {
      const css = engineCss(theme);
      expect(css.startsWith(PRELUDE)).toBe(true);
      expect(css).not.toMatch(/@font-face/);
      expect(css).not.toMatch(/\/\*/);
    }
  });

  it('keeps light-dark() for a light card and has none left for a dark one', () => {
    expect(engineCss('light')).toMatch(/light-dark\(/);
    expect(engineCss('dark')).not.toMatch(/light-dark\(/i);
  });

  it('differs between themes in colour only: the same rules, in the same order', () => {
    const rules = (css) => css.replace(/[^{};]*:[^;}]*;?/g, '').length;
    expect(rules(engineCss('dark'))).toBe(rules(engineCss('light')));
    expect(engineCss('dark').split('{').length).toBe(engineCss('light').split('{').length);
  });

  it('puts the defaults at no specificity, so an author rule overrides them as it does a browser\'s', () => {
    expect(PRELUDE).toMatch(/^:where\(/);
  });
});

describe('the stylesheets', () => {
  it('are the ones the embed page imports', () => {
    const embed = fs.readFileSync(new URL('../src/layouts/Embed.astro', import.meta.url), 'utf8');
    const imported = [...embed.matchAll(/^import '([^']+\.css)';/gm)].map((m) => m[1]);
    expect(STYLESHEETS).toEqual(imported);
  });
});
