#!/usr/bin/env bash
# Two-way check on schema/item.schema.json.
#
# A schema that accepts everything passes `npm run validate` and is worthless,
# so this asserts both directions: every real item validates, and every fixture
# in schema/invalid/ is rejected. Each fixture breaks exactly one rule and is
# named for it — add one whenever you add a constraint.
set -uo pipefail
cd "$(dirname "$0")/.."

AJV=(./node_modules/.bin/ajv validate -s schema/item.schema.json
     --spec=draft2020 -c ajv-formats --strict=false -d)

fails=0

echo "positive — data/ must validate"
# One ajv process over the whole glob: at ~170 items, a process per file took
# minutes. Only fall back to per-file when something is actually wrong, so the
# failure still names the file.
if "${AJV[@]}" "data/*.json" >/dev/null 2>&1; then
  echo "  ok       all $(ls data/*.json | wc -l | tr -d ' ') items validate"
else
  for f in data/*.json; do
    if ! "${AJV[@]}" "$f" >/dev/null 2>&1; then
      echo "  FAILED   $f"
      "${AJV[@]}" "$f" 2>&1 | sed 's/^/           /' | tail -3
      fails=$((fails + 1))
    fi
  done
fi

echo
echo "lists — data/lists/ must validate against schema/list.schema.json"
LIST_AJV=(./node_modules/.bin/ajv validate -s schema/list.schema.json
          --spec=draft2020 -c ajv-formats --strict=false -d)
if "${LIST_AJV[@]}" "data/lists/*.json" >/dev/null 2>&1; then
  echo "  ok       all $(ls data/lists/*.json | wc -l | tr -d ' ') lists validate"
else
  "${LIST_AJV[@]}" "data/lists/*.json" 2>&1 | sed 's/^/  /' | tail -5
  fails=$((fails + 1))
fi

echo
echo "identity — filename must be <date.start>-<id>.json"
# One node process, not one per file. The id is the item's identity and refs
# elsewhere point at it; the date in front only orders the directory, so both
# halves have to agree with the record or something silently points at nothing.
node -e '
const fs = require("fs");
const files = fs.readdirSync("data").filter(f => f.endsWith(".json"));
let bad = 0;
for (const f of files) {
  const o = JSON.parse(fs.readFileSync("data/" + f, "utf8"));
  const want = `${o.date && o.date.start}-${o.id}.json`;
  if (f !== want) { console.log(`  MISMATCH data/${f} should be ${want}`); bad++; }
}
if (!bad) console.log(`  ok       ${files.length} filenames are <date.start>-<id>.json`);
process.exit(bad ? 1 : 0);
' || fails=$((fails + 1))

echo
echo "refs — every ref must resolve to an existing item"
# A ref at a missing id is not a schema error: the pattern matches, so ajv passes
# and the link just renders as nothing. Catch it here instead.
node -e '
const fs = require("fs");
const files = fs.readdirSync("data").filter(f => f.endsWith(".json"));
const items = files.map(f => JSON.parse(fs.readFileSync("data/" + f, "utf8")));
const ids = new Set(items.map(i => i.id));
let bad = 0;
for (const i of items)
  for (const r of i.refs ?? [])
    if (!ids.has(r)) { console.log(`  DANGLING ${i.id} -> ${r}`); bad++; }
const n = items.reduce((a, i) => a + (i.refs?.length ?? 0), 0);
if (!bad) console.log(`  ok       ${n} ref(s) across ${items.length} items`);
process.exit(bad ? 1 : 0);
' || fails=$((fails + 1))

echo
echo "cross-links — every [text](item:id) must resolve"
# `item:` targets live inside prose, so the schema cannot see them. A typo there
# renders as an anchor to nothing.
node -e '
const fs = require("fs");
const files = fs.readdirSync("data").filter(f => f.endsWith(".json"));
const items = files.map(f => JSON.parse(fs.readFileSync("data/" + f, "utf8")));
const ids = new Set(items.map(i => i.id));
let bad = 0, n = 0;
for (const i of items) {
  const text = [i.details, i.summary].flat().filter(t => typeof t === "string").join(" ");
  for (const m of text.matchAll(/\[[^\]]+\]\(item:([a-z0-9-]+)\)/g)) {
    n++;
    if (!ids.has(m[1])) { console.log(`  DANGLING ${i.id} -> item:${m[1]}`); bad++; }
  }
}
if (!bad) console.log(`  ok       ${n} cross-link(s) resolve`);
process.exit(bad ? 1 : 0);
' || fails=$((fails + 1))

echo
echo "negative — schema/invalid/ must be rejected"
for f in schema/invalid/*.json; do
  if "${AJV[@]}" "$f" >/dev/null 2>&1; then
    echo "  NOT CAUGHT  $f"
    fails=$((fails + 1))
  else
    echo "  rejected    $(basename "$f")"
  fi
done

echo
if [ "$fails" -eq 0 ]; then
  echo "schema checks passed"
else
  echo "$fails failure(s)"
fi
exit "$fails"
