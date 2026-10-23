// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

// User site served at the apex of a custom domain, so `site` is the domain and
// `base` must stay unset — `base` is only for project sites (nstarkman.space/stream-tool).
export default defineConfig({
  site: 'https://nstarkman.space',
  build: { format: 'directory' },
  // The card and map packages (@nstarkman/card-builder, @nstarkman/collaborator-map)
  // read their data from @nstarkman/research-store: here, this site's own store.
  // Vite must process those packages itself (noExternal), so the alias applies in dev too.
  vite: {
    resolve: { alias: { '@nstarkman/research-store': fileURLToPath(new URL('./src/lib/data.js', import.meta.url)) } },
    ssr: { noExternal: [/^@nstarkman\//] },
  },
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
