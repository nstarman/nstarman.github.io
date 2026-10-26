// A saved selection → the render model cv.typ draws.
//
// The one place that turns "what the builder has ticked" into a model. The
// builder page reads its controls into a selection and calls this; the CLI
// (scripts/build-cv.mjs) reads a saved file and calls this. A rule that lives
// in either alone is a PDF the builder and the command line would draw
// differently, which tests/selectionmodel.test.js holds against.

import { cvModel } from './cvmodel.js';

/**
 * @param {ReturnType<typeof import('./selection.js').decode>} sel
 *   a decoded selection — what `decode` returns, and what the page gets by
 *   decoding its own `encode`d controls, so both are cleaned the same way
 */
export function modelFromSelection(sel) {
  // Same resolver as the site and the CI PDFs — "complete" is the widest
  // section set, then the ticks narrow it.
  const model = cvModel('complete', sel.items, (id, i) => sel.lines.get(id)?.has(i) ?? false, {
    prefix: sel.prefix,
    order: sel.order,
    group: sel.group,
    locationAt: sel.locationAt,
    locationDetail: sel.locationDetail,
    tally: sel.tally,
    namesFor: sel.namesFor,
    currency: sel.currency ?? undefined,
    funderOff: sel.funderOff,
    paperIds: sel.paperIds,
    schoolBelow: sel.schoolBelow,
    linkOnDegree: sel.linkOnDegree,
  });
  // The template reads these; absent, it draws the default.
  for (const s of model.sections) {
    for (const it of s.items) if (it.recipient) it.recipientInline = sel.inline.has(it.id);
    s.columns = sel.columns[s.id] ?? s.columns;
  }
  model.style = sel.style ?? 'default';
  model.format = sel.page;
  model.trailcap = sel.trailcap;
  model.trailcapWidth = sel.trailcapWidth;
  model.fill = sel.fill;
  // Absent, the card as the preset has it.
  model.card = sel.card ?? model.card;
  model.spacing = sel.spacing;
  model.heading = sel.heading;
  model.place = sel.place;
  return model;
}
