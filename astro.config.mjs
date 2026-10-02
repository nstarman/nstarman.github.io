// @ts-check
import { defineConfig } from 'astro/config';

// User site served at the apex of a custom domain, so `site` is the domain and
// `base` must stay unset — `base` is only for project sites (nstarkman.space/stream-tool).
export default defineConfig({
  site: 'https://nstarkman.space',
  build: { format: 'directory' },
  // The CV builder moved under /tools/ with the other tools; old links still land.
  redirects: { '/cv/builder': '/tools/cv/' },
});
