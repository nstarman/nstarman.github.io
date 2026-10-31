# Changelog

Versions are dates, `YYYYMMDD.0.N`; the four research-kit packages are released together at one
version. A breaking change says how to migrate.

## 20261028.0.1

### Added

- A `syw` link: a paper's showyourwork repository, drawn with showyourwork's "s" (`i-syw`, in
  `@nstarkman/site-layout` 20261022.0.2) and labelled "showyourwork" (`@nstarkman/data-resolver`,
  `@nstarkman/card-builder` 20261028.0.1). A paper site needs both packages at these versions, then
  a refreshed snapshot (`syw-site card`) to show it.
- A paper with its own site (a `homepage` link) has **Details ›** to it instead of **Context ›**
  (`@nstarkman/card-builder` 20261028.0.1).

## 20261028.0.0

### Added

- A paper's collaborator map shows the site's author too, with the author's papers on the
  author's pins (`@nstarkman/collaborator-map` 20261028.0.0). Refresh a paper site's snapshot
  (`syw-site card`) to pick up the author's entry.

## 20261023.0.1

### Fixed

- Released with `@nstarkman/data-resolver` 20261023.0.1 (a paper's map: its own co-authors only).

## 20261023.0.0

First release.
