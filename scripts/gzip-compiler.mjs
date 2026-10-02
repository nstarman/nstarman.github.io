// Gzips the Typst compiler wasm for the CV builder.
//
// The raw file is 27 MiB and Cloudflare Pages, which hosts the pull-request
// previews, refuses any file over 25 MiB. Gzipped it is about 11 MiB, and
// src/lib/typstcompile.js inflates it in the browser with DecompressionStream,
// so the same file works on every host.
//
// Runs from predev and prebuild, and is git-ignored, so it cannot drift from
// the installed compiler.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const src = createRequire(import.meta.url).resolve(
  '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
);
const OUT = 'src/generated/typst_ts_web_compiler_bg.wasm.gz';
fs.mkdirSync('src/generated', { recursive: true });
fs.writeFileSync(OUT, zlib.gzipSync(fs.readFileSync(src), { level: 9 }));
