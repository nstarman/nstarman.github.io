# @nstarkman/research-kit

The [nstarkman.space](https://nstarkman.space) paper card, publication entry and collaborator map,
for a paper's own site at `nstarkman.space/<repo>/` (made with
[syw-site](https://github.com/nstarman/syw-site)). It is three packages at one version:
`@nstarkman/data-resolver` (the data layer as a store, and the collector), `@nstarkman/card-builder`
(`Card`, `Publication`), `@nstarkman/collaborator-map` (`CollabMap`). Developed in
[nstarman/nstarman.github.io](https://github.com/nstarman/nstarman.github.io), whose pages use them.

```bash
npm install --save-exact @nstarkman/research-kit@<version>
```

## A snapshot, then a store

```js
import { collect } from '@nstarkman/research-kit/collect.js';
import { fromGitHub } from '@nstarkman/research-kit/readers.js';
const snapshot = await collect('stream-convexity-spatial', fromGitHub({ repo: 'nstarman/nstarman.github.io' }));
```

The snapshot (schema 1) is the item and the items its `refs` reach, as they are in the website's
`data/`, with the `config/` slices they use and the commit they came from. Keep it in the repository
and build offline.

## The store the components read

The components import `@nstarkman/research-store`. Point it at a module that builds the store and
exports its names, and let Vite load the packages — in dev and in the build — or Node loads them and
cannot find the store:

```js
// astro.config.mjs
vite: {
  resolve: { alias: { '@nstarkman/research-store': fileURLToPath(new URL('./src/store.js', import.meta.url)) } },
  ssr: { noExternal: [/^@nstarkman\//] },                                        // dev
  environments: { prerender: { resolve: { noExternal: [/^@nstarkman\//] } } },  // build (Astro 7)
}
```

```js
// src/store.js
import { createStore } from '@nstarkman/research-kit/store.js';
import snapshot from '../card.json';
export const store = createStore(snapshot);
export const { items, lists, config, byType, resolve, authors, links /* … every name of the store */ } = store;
```

Then `<Publication item={resolve(id)} abstract card="paperSite" />` and `<CollabMap />`. The page
needs `@nstarkman/site-layout`'s stylesheet, which carries the card's rules.

## Versions

`YYYYMMDD.0.N`, the four packages together; fixes are backported to every release with the bug.
See `CHANGELOG.md`.
