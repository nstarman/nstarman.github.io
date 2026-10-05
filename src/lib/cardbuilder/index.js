// The Card Builder, as a module: everything /tools/card/ does apart from its
// markup, which is src/pages/tools/card.astro, and its stylesheets,
// src/styles/card-builder.css (the page) and card-builder-preview.css (injected
// into the preview frame).
//
//   mountCardBuilder({ form, data })   wire the page's form; browser only
//
// and, with no DOM, the rules it is made of — all of them tested:
//
//   readSpec(f, state)       the controls → { slug, width, height, … }
//   controlOps(name, ctx)    a name → the writes that set the controls to it
//   fitName(name, item)      a name as it comes out for one item
//   parseSettings / serializeSettings   the saved-settings JSON
//
// Modules, each knowing only those above it:
//   model.js      controls ⇄ name; pure
//   geometry.js   the card grid's tracks, and where drops land; pure
//   settings.js   saved settings; pure
//   dom.js        small DOM helpers
//   overlay.js    ⊕ buttons, bands, area outlines and grips drawn on the preview
//   preview.js    outlines, click-to-tune and the drag gestures on the preview
//   download.js   the PNG and PDF, drawn from the preview
//   builder.js    the controller that joins them to the form
//
// What a name makes of an item is cardname.js's `cardFace` alone; the builder
// only writes names and reads them back, and never decides how a card looks.

export { mountCardBuilder } from './builder.js';
export { controlOps, fitName, readSpec } from './model.js';
export { parseSettings, serializeSettings } from './settings.js';
