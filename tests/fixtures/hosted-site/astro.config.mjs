// A site hosted at nstarkman.space/demo/, as a repo of its own would set it
// up, for tests/site-layout.test.js. It builds into the directory the test
// passes; only Astro's gitignored .astro/ stubs land here.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nstarkman.space',
  base: '/demo',
  outDir: process.env.HOSTED_SITE_OUT,
  cacheDir: process.env.HOSTED_SITE_OUT + '-cache',
  vite: { cacheDir: process.env.HOSTED_SITE_OUT + '-cache/vite' },
});
