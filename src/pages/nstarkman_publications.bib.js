import { items } from '../lib/data.js';
import { toBibliography } from '../lib/bibtex.js';

// Served at /nstarkman_publications.bib so the .bib is a first-class artefact
// of the database rather than something exported by hand. Named rather than
// generic because it is downloaded into other people's reference managers and
// BibTeX directories, where a file called publications.bib is one of several.
export function GET() {
  // Matches /publications/, which this is linked from: in-preparation papers
  // have no citable form, so they are not in the bibliography either.
  const citable = items.filter((i) => i.status !== 'in-prep');
  return new Response(toBibliography(citable), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
