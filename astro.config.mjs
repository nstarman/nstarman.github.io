// @ts-check
import { defineConfig } from 'astro/config';

// User site served at the apex of a custom domain, so `site` is the domain and
// `base` must stay unset — `base` is only for project sites (nstarkman.space/stream-tool).
export default defineConfig({
  site: 'https://nstarkman.space',
  build: { format: 'directory' },
  // Pages that moved; old links still land. The site's own tools moved under
  // /webdev/; /tools/ lists them with those hosted in their own repos.
  redirects: {
    '/cv/builder': '/webdev/cv/',
    '/tools/embed': '/webdev/card/',
    '/tools/cv': '/webdev/cv/',
    '/tools/card': '/webdev/card/',
    '/webdev': '/tools/',
  },
});
