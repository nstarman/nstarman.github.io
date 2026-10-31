# Changelog

Versions are dates, `YYYYMMDD.0.N`; the four research-kit packages are released together at one
version. A breaking change says how to migrate.

## 20261028.0.1

### Added

- A `syw` link (a paper's showyourwork repository): ordered after the preprint, drawn with the
  `syw` mark (`i-syw` in `@nstarkman/site-layout` 20261022.0.2) and labelled "showyourwork" when it
  has no label of its own.

## 20261028.0.0

### Changed

- Released with `@nstarkman/collaborator-map` 20261028.0.0. `collect()` is unchanged: a paper's
  snapshot keeps the people among its authors, which now includes the site's author.

## 20261023.0.1

### Fixed

- `collect()` put the co-authors of every item it reached on the paper's collaborator map — its
  packages' papers' too; it now puts only the paper's own co-authors.

## 20261023.0.0

First release.
