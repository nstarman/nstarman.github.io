// Loads the site's own modules in plain node, with no browser and no server of ours.
//
// src/lib/data.js reads the database through import.meta.glob, and the card package imports
// `@nstarkman/research-store`, an alias Astro's Vite config sets; plain node can do neither.
// vitest gets both from `getViteConfig`, and so does this, in middleware mode: the modules load
// the way the build and the tests load them (specs/001-takumi-card-renderer, research D2).
//
//   const { load, close } = await ssr();
//   const { SITE_PRESETS } = await load('/packages/card-builder/src/cards.js');
//   await close();
import { createServer } from 'vite';
import { getViteConfig } from 'astro/config';

// Astro's environments announce themselves, and report a race with the shutdown as an error, on
// the console even at logLevel 'silent'. Neither says anything is wrong, and a command that prints
// [ERROR] while it succeeds is misleading, so these two messages, and only these, are dropped.
const NOISE = /\[vite\] connected\.|Failed to create the (?:prerender|dev) server app: transport was disconnected/;

function quiet() {
  const streams = [process.stdout, process.stderr].map((stream) => [stream, stream.write]);
  for (const [stream, write] of streams) {
    stream.write = (chunk, ...rest) => {
      const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
      const kept = text.split('\n').filter((line) => !NOISE.test(line)).join('\n');
      // A chunk that was only noise, and its newline, is dropped whole.
      return kept.trim() === '' && text.trim() !== '' ? true : write.call(stream, kept, ...rest);
    };
  }
  return () => { for (const [stream, write] of streams) stream.write = write; };
}

/** @param {{ root?: string }} [options]  the site's root; the working directory by default */
export async function ssr({ root = process.cwd() } = {}) {
  const restore = quiet();
  // No dev toolbar: it marks elements with the file they came from, an absolute path of this machine
  // that would end up in an SVG (the production build does not add it, and a deployed card has none).
  const config = await getViteConfig({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' }, { devToolbar: { enabled: false } })({ command: 'serve', mode: 'development' });
  const server = await createServer({ ...config, configFile: false, root, logLevel: 'silent' });
  return {
    /** A module of the site, by its path from the root: `/src/lib/data.js`. */
    load: (path) => server.ssrLoadModule(path),
    async close() {
      await server.close();
      // The shutdown's report arrives a moment after close() resolves.
      await new Promise((done) => setTimeout(done, 100));
      restore();
    },
  };
}
