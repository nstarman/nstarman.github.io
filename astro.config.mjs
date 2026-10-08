// @ts-check
import { defineConfig } from 'astro/config';

// User site served at the apex of a custom domain, so `site` is the domain and
// `base` must stay unset — `base` is only for project sites (nstarkman.space/stream-tool).
export default defineConfig({
  site: 'https://nstarkman.space',
  build: { format: 'directory' },
  // Pages that moved; old links still land. The site's own tools went from
  // /tools/ to /webdev/, and /tools/ is now the list of those hosted elsewhere.
  redirects: {
    '/cv/builder': '/webdev/cv/',
    '/tools/embed': '/webdev/card/',
    '/tools/cv': '/webdev/cv/',
    '/tools/card': '/webdev/card/',
  },
});
