// A paper's site at nstarkman.space/demo/, as syw-site sets one up: it has only
// @nstarkman/research-kit, and its store is a snapshot (tests/kit/paper-site.test.js).
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nstarkman.space',
  base: '/demo',
  outDir: process.env.PAPER_SITE_OUT,
  cacheDir: `${process.env.PAPER_SITE_OUT}-cache`,
  vite: {
    cacheDir: `${process.env.PAPER_SITE_OUT}-cache/vite`,
    resolve: { alias: { '@nstarkman/research-store': fileURLToPath(new URL('./src/store.js', import.meta.url)) } },
    ssr: { noExternal: [/^@nstarkman\//] },
    // Astro 7 prerenders in its own environment: the build needs it there too.
    environments: { prerender: { resolve: { noExternal: [/^@nstarkman\//] } } },
  },
});
