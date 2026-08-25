// The resolved CV as JSON, one file per preset. cv.typ consumes this, so the
// PDFs and the website go through the same resolver and cannot disagree about
// what "2-page" means.
import { cvModel } from '../../lib/cvmodel.js';
import { presetNames } from '../../lib/presets.js';

export function getStaticPaths() {
  return presetNames.map((preset) => ({ params: { preset } }));
}

export function GET({ params }) {
  return new Response(JSON.stringify(cvModel(params.preset), null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
