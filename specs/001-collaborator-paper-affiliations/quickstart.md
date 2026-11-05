# Quickstart: check the feature

1. `npm test` — the collaborator tests include the new cases: the fallback from one item, several
   spellings merged, two institutions kept apart, ORCID winning, an unplaceable affiliation reported,
   an unreadable record not falling back. They run on fixtures; no network.
2. `node scripts/collect-collaborators.mjs` (network: ORCID). Expect:
   - Jagjit Singh Sidhu gains one entry: Case Western Reserve University, Cleveland, OH, US,
     kind `paper`, 2020-06 to 2020-06.
   - `git diff config/collaborators.json` shows no other person's entry changed (spec SC-002), apart
     from what ORCID itself changed since the last run.
   - The summary lists those still empty and why: Nicholas Earl and E. Sola (no item affiliation),
     and the two people who appear only in `config/acknowledgements.json`.
3. `node scripts/geocode-places.mjs --check` — nothing new to place (CWRU is already pinned).
4. `npm run build`, then open `/research/` in the browser pane: Sidhu is on the collaborator map at
   Cleveland. After the next card refresh of nstarman/macro_lightning_paper, its site's map shows four
   authors.
