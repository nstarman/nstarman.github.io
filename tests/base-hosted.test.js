// The sites hosted in repos of their own import Base.astro from a submodule of this repo, into
// an Astro project of their own. Whatever Base imports must come with it and
// resolve there, so it is held to its stylesheet and icons, and those to
// nothing further.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const imports = (src) => [...src.matchAll(/^import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);

describe('Base.astro, as the hosted sites use it', () => {
  it('imports only its stylesheet and icons', () => {
    expect(imports(read('layouts/Base.astro'))).toEqual(['../styles/global.css', '../components/IconSprite.astro']);
  });
  it('whose own imports and urls go nowhere', () => {
    expect(imports(read('components/IconSprite.astro'))).toEqual([]);
    expect(read('styles/global.css')).not.toMatch(/@import|url\(/);
  });
});
