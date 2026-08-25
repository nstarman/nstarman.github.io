// Validates JSON files against a JSON Schema.
//
// This replaced ajv-cli, which is unmaintained at 5.0.0 and pins
// fast-json-patch ^2, carrying a prototype-pollution advisory for a diff
// feature we never used. Calling ajv directly drops that dependency and gives
// better failures: ajv-cli reports only the first bad file in a glob, so
// scripts/test-schema.sh used to re-run it once per file just to name the
// culprit.
//
//   node scripts/validate.mjs schema/item.schema.json "data/*.json"

import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const [schemaPath, ...globs] = process.argv.slice(2);
if (!schemaPath || globs.length === 0) {
  console.error('usage: validate.mjs <schema> <glob>...');
  process.exit(2);
}

// Only the one shape the callers use: a directory and a single "*" in the
// filename, as in data/*.json.
function expand(glob) {
  const dir = path.dirname(glob);
  const base = path.basename(glob);
  const star = base.indexOf('*');
  if (star !== base.lastIndexOf('*')) {
    throw new Error(`Only one "*" is supported: ${glob}`);
  }
  const head = star === -1 ? base : base.slice(0, star);
  const tail = star === -1 ? '' : base.slice(star + 1);
  const matches = (f) =>
    star === -1
      ? f === base
      : f.length >= head.length + tail.length && f.startsWith(head) && f.endsWith(tail);

  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(matches).sort().map((f) => path.join(dir, f));
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync(schemaPath, 'utf8')));

let bad = 0;
let seen = 0;
for (const file of globs.flatMap(expand)) {
  seen += 1;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.log(`  INVALID JSON  ${file}: ${err.message}`);
    bad += 1;
    continue;
  }
  if (validate(data)) continue;
  bad += 1;
  console.log(`  FAILED   ${file}`);
  for (const e of validate.errors.slice(0, 4)) {
    console.log(`           ${e.instancePath || '/'} ${e.message}`);
  }
}

if (bad === 0) console.log(`  ok       all ${seen} file(s) validate`);
process.exit(bad ? 1 : 0);
