# Contract: `@nstarkman/site-layout`

## package.json (shape)

```json
{
  "name": "@nstarkman/site-layout",
  "version": "2026.1022.0",
  "description": "The nstarkman.space page layout, for sites hosted at nstarkman.space/<repo>/.",
  "type": "module",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/nstarman/nstarman.github.io.git", "directory": "packages/site-layout" },
  "keywords": ["astro-component"],
  "exports": {
    "./SiteLayout.astro": "./SiteLayout.astro",
    "./IconSprite.astro": "./IconSprite.astro",
    "./site.css": "./site.css"
  },
  "files": ["SiteLayout.astro", "IconSprite.astro", "site.css", "CHANGELOG.md"],
  "peerDependencies": { "astro": "^7" },
  "publishConfig": { "access": "public", "provenance": true }
}
```

`README.md`, `LICENSE` and `package.json` are always packed by npm; the packed list is exactly
those plus `files` (checked by the test and before publishing).

`repository.url` must match the GitHub repository for provenance and trusted publishing.

## `<SiteLayout>` props

| prop | type | default | meaning |
|---|---|---|---|
| `title` | string | required | `<title>` |
| `description` | string | the site's description | meta description |
| `section` | string | the current path | nav entry marked current (e.g. `/research/`) |
| `repo` | string | `nstarman/nstarman.github.io` | repository the "Last updated" footer links to |

Default slot: page content. Every link the layout emits is site-absolute (`/research/`), never
prefixed with the consumer's `base`.

## Self-containment

`SiteLayout.astro` imports exactly `./site.css` and `./IconSprite.astro`; `IconSprite.astro`
imports nothing; `site.css` has no `@import` and no `url(`.

## Compatibility

A removed or renamed prop, export or CSS custom property, or a changed meaning, is breaking:
`CHANGELOG.md` gives a migration note under that version.
