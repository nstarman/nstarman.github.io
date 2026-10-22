# @nstarkman/site-layout

The page layout of [nstarkman.space](https://nstarkman.space) — header, navigation, footer,
stylesheet, icons and theme switch — for sites published under it at `nstarkman.space/<repo>/`.
It is developed in [nstarman/nstarman.github.io](https://github.com/nstarman/nstarman.github.io)
(`packages/site-layout/`), whose own pages use it.

## Install

In an Astro 7 project, pinned to one release:

```bash
npm install --save-exact @nstarkman/site-layout@20261022.0.0
```

```js
// astro.config.mjs
export default defineConfig({ site: 'https://nstarkman.space', base: '/<repo>' });
```

```astro
---
import SiteLayout from '@nstarkman/site-layout/SiteLayout.astro';
---
<SiteLayout title="My tool — Nathaniel Starkman" section="/tools/" repo="nstarman/<repo>">
  <h1>My tool</h1>
</SiteLayout>
```

## Props

| prop | default | meaning |
|---|---|---|
| `title` | required | the page's `<title>` |
| `description` | the site's description | the meta description |
| `section` | the page's path | the nav entry marked current, e.g. `/tools/` |
| `repo` | `nstarman/nstarman.github.io` | the repository "Last updated" links to |

Every link the layout writes is site-absolute (`/research/`), so under your `base` it still
reaches nstarkman.space. The favicon and fonts are the site's, loaded from it and from Google Fonts.

## Contents

`SiteLayout.astro`, `site.css` (the whole site stylesheet) and `IconSprite.astro`, each importable
by that path. The layout imports only the other two.

## Versions

`YYYYMMDD.0.N`: a release is its date, `N` its fixes. Fixes are backported to every release that
has the bug. See [CHANGELOG.md](CHANGELOG.md); Dependabot (`npm`) proposes new releases.
