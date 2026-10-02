// Compiles the CV to PDF in the browser, with typst.ts.
//
// Knows nothing about the page: it takes the render model cvModel() built and
// returns the PDF bytes. The builder owns the tick-boxes, the status line and
// what happens to the file.

// The whole template, not just cv.typ: it imports lib/theme.typ and
// lib/styles.typ, and typst.ts resolves those against the same virtual root.
// Globbed rather than listed, so adding a module — or a style — needs no
// change here.
const TEMPLATE = import.meta.glob('/cv/**/*.typ', { eager: true, query: '?raw', import: 'default' });
// The header's portrait and QR are binary and live beside the template.
// Bundled at build time rather than fetched, so compiling stays one round trip.
const ASSETS = import.meta.glob('/cv/assets/*', { eager: true, query: '?url', import: 'default' });

let typst = null;

async function loadCompiler(fonts) {
  // Dynamic, so the ~10 MB of wasm never touches any other route.
  const [{ $typst }, { preloadRemoteFonts }, wasm] = await Promise.all([
    import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs'),
    import('@myriaddreamin/typst.ts'),
    import('@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'),
  ]);
  $typst.setCompilerInitOptions({
    getModule: () => wasm.default,
    beforeBuild: [preloadRemoteFonts(fonts)],
  });
  return $typst;
}

/**
 * @param {object} model  cvModel() output, with `style` set
 * @param {string[]} fonts  URLs of the faces to load, read once on first use:
 *   every .otf in public/fonts/, the same files the CI build compiles with,
 *   so the browser PDF cannot quietly differ from the downloadable one
 * @param {(msg: string) => void} [onStatus]  progress for the page to show
 * @returns {Promise<Uint8Array>} the PDF
 */
export async function compilePdf(model, fonts, onStatus = () => {}) {
  if (!typst) {
    onStatus('Loading the Typst compiler…');
    typst = await loadCompiler(fonts);
  }
  onStatus('Compiling…');
  // cv/ is the compilation root in both runtimes, so cv/lib/styles.typ is
  // /lib/styles.typ here and the relative imports inside resolve unchanged.
  for (const [path, src] of Object.entries(TEMPLATE)) {
    await typst.addSource(path.slice('/cv'.length), src);
  }
  for (const [path, url] of Object.entries(ASSETS)) {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    await typst.mapShadow(`/assets/${path.split('/').pop()}`, bytes);
  }
  await typst.mapShadow('/cv.json', new TextEncoder().encode(JSON.stringify(model)));
  return typst.pdf({ mainFilePath: '/cv.typ' });
}
