#!/usr/bin/env bash
# Two-way check on schema/item.schema.json.
#
# A schema that accepts everything passes `npm run validate` and is worthless,
# so this asserts both directions: every real item validates, and every fixture
# in schema/invalid/ is rejected. Each fixture breaks exactly one rule and is
# named for it — add one whenever you add a constraint.
set -uo pipefail
cd "$(dirname "$0")/.."

AJV=(node scripts/validate.mjs schema/item.schema.json)

fails=0

echo "positive — data/ must validate"
"${AJV[@]}" "data/*.json" || fails=$((fails + 1))

echo
echo "lists — data/lists/ must validate against schema/list.schema.json"
node scripts/validate.mjs schema/list.schema.json "data/lists/*.json" \
  || fails=$((fails + 1))

echo
echo "integrity — filenames, refs and [text](item:id) cross-links"
# What the schema cannot see; tests/integrity.test.js says why each matters.
npx vitest run tests/integrity.test.js || fails=$((fails + 1))

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
