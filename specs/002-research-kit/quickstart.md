# Quickstart

1. `npm test` and the page diff against `main` (as for site-layout): no page changes (SC-001).
2. `npx vitest run tests/research-kit.test.js`: every item collects from disk and from a fake GitHub reader
   identically (SC-002); `cards/*.json` valid; the four versions equal.
3. Fixture paper site (`tests/fixtures/paper-site/`, offline): builds with only `@nstarkman/research-kit`,
   a snapshot of `stream-convexity-spatial`, and the alias; its card HTML equals `/embed/`'s for
   `paperSite` (SC-003).
4. After merge: first publish by hand (four packages), then the tag publishes through the workflow (SC-004).
