// Zoom and pan for the world maps, by moving the SVG's viewBox.
//
// Progressive enhancement, like mappick.js: the controls are `hidden` in the
// markup and shown here, so with no script there is nothing that does nothing.
// The viewBox keeps the map's aspect ratio, so the figure never changes height
// and the page below it never jumps.

export const MAX_ZOOM = 8;
const STEP = 2;

/** The viewBox for zoom `z` centred on (cx, cy), kept inside the map. */
export function viewFor(W, H, z, cx, cy) {
  const w = W / z;
  const h = H / z;
  return {
    x: Math.min(Math.max(cx - w / 2, 0), W - w),
    y: Math.min(Math.max(cy - h / 2, 0), H - h),
    w,
    h,
  };
}

/** Is the point inside the view? */
export const inView = (view, x, y) =>
  x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h;

/** Zoom to `z`, holding the point under the cursor (fractions fx, fy of the
 *  view) where it is: the centre of a button zoom is (.5, .5). */
export function zoomAbout(W, H, view, z, fx = 0.5, fy = 0.5) {
  const next = Math.min(Math.max(z, 1), MAX_ZOOM);
  const w = W / next;
  const h = H / next;
  return viewFor(W, H, next, view.x + fx * view.w - fx * w + w / 2, view.y + fy * view.h - fy * h + h / 2);
}

function wire(fig) {
  const stage = fig.querySelector('.cmap-stage');
  const svg = stage?.querySelector('svg');
  const bar = stage?.querySelector('.cmap-zoom');
  if (!svg || !bar) return;
  const [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
  let view = { x: 0, y: 0, w: W, h: H };
  const zoomOf = () => W / view.w;

  // Where each person's pins are, so a trail can be dropped when none of them is
  // on screen: a line running across the view from somewhere else says nothing.
  const pinsOf = new Map();
  for (const c of stage.querySelectorAll('.cmap-pin')) {
    const dot = c.querySelector('circle');
    if (!pinsOf.has(c.dataset.c)) pinsOf.set(c.dataset.c, []);
    pinsOf.get(c.dataset.c).push([Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))]);
  }
  const trails = [...stage.querySelectorAll('.cmap-trail')];

  const apply = () => {
    svg.setAttribute('viewBox', `${view.x.toFixed(2)} ${view.y.toFixed(2)} ${view.w.toFixed(2)} ${view.h.toFixed(2)}`);
    const z = zoomOf();
    // Pins and lines are drawn in map units, so they grow with the zoom unless
    // the stylesheet scales them back: it multiplies every size by --k.
    svg.style.setProperty('--k', String(1 / z));
    stage.dataset.zoom = z > 1 ? String(z) : '';
    for (const t of trails) {
      t.toggleAttribute('data-offview', z > 1 && !pinsOf.get(t.dataset.c)?.some(([x, y]) => inView(view, x, y)));
    }
    bar.querySelector('[data-zoom="in"]').disabled = z >= MAX_ZOOM;
    bar.querySelector('[data-zoom="out"]').disabled = z <= 1;
    bar.querySelector('[data-zoom="reset"]').disabled = z <= 1;
  };
  const to = (z, fx, fy) => { view = zoomAbout(W, H, view, z, fx, fy); apply(); };

  bar.hidden = false;
  bar.addEventListener('click', (e) => {
    const how = e.target.closest('[data-zoom]')?.dataset.zoom;
    if (how === 'in') to(zoomOf() * STEP);
    else if (how === 'out') to(zoomOf() / STEP);
    else if (how === 'reset') to(1);
  });

  // Ctrl or ⌘ plus wheel — which is also what a trackpad pinch sends — zooms at
  // the cursor. A bare wheel is left alone: it is the page scrolling past.
  svg.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    to(zoomOf() * Math.exp(-e.deltaY * 0.01), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }, { passive: false });

  // Drag to pan, once there is somewhere to pan to. A drag that moved is not a
  // click: without this, letting go over a pin would pick it.
  let drag = null;
  let moved = false;
  svg.addEventListener('pointerdown', (e) => {
    if (zoomOf() > 1 && e.button === 0) { drag = { x: e.clientX, y: e.clientY, view: { ...view } }; moved = false; }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    if (!moved) svg.setPointerCapture(e.pointerId);
    moved = true;
    view = viewFor(W, H, zoomOf(), drag.view.x + drag.view.w / 2 - (dx / r.width) * view.w,
      drag.view.y + drag.view.h / 2 - (dy / r.height) * view.h);
    apply();
  });
  const end = () => { drag = null; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  fig.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}

export function wireZoom() {
  for (const fig of document.querySelectorAll('.cmap')) {
    if (!fig.dataset.zoomWired) { fig.dataset.zoomWired = '1'; wire(fig); }
  }
}
