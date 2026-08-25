#!/usr/bin/env bash
# Compiles one PDF per CV preset from the models Astro already emitted.
#
# Run AFTER `npm run build`: it consumes dist/cv/<preset>.json, which is the
# same render model the website uses, so the PDF and the site cannot disagree
# about what a preset contains.
#
# cv.typ always reads "cv.json" — the same filename typst.ts is handed through
# its virtual filesystem in the browser builder, so one template serves both.
set -euo pipefail
cd "$(dirname "$0")/.."

TYPST="${TYPST:-typst}"
command -v "$TYPST" >/dev/null || { echo "typst not found (set TYPST=/path/to/typst)"; exit 1; }

# Every face the CV sets is vendored in public/fonts/ and served from the site,
# so the PDF is the same wherever it is built. --ignore-system-fonts makes that
# a rule rather than a hope: a missing file fails here instead of quietly
# substituting whatever the build machine happens to have installed.
FONTS=(NewCM10-Regular.otf NewCM10-Bold.otf NewCM10-Italic.otf NewCM10-BoldItalic.otf
       FontAwesome5Free-Solid-900.otf FontAwesome5Brands-Regular-400.otf academicons.otf)
for f in "${FONTS[@]}"; do
  [ -f "public/fonts/$f" ] || { echo "missing font: public/fonts/$f"; exit 1; }
done
TYPST_ARGS=(--root . --font-path public/fonts --ignore-system-fonts)

shopt -s nullglob
models=(dist/cv/*.json)
[ ${#models[@]} -gt 0 ] || { echo "no dist/cv/*.json — run npm run build first"; exit 1; }

trap 'rm -f cv/cv.json' EXIT
for model in "${models[@]}"; do
  preset="$(basename "$model" .json)"
  cp "$model" cv/cv.json
  "$TYPST" compile "${TYPST_ARGS[@]}" cv/cv.typ "dist/cv/starkman-cv-$preset.pdf"
  pages="$("$TYPST" query "${TYPST_ARGS[@]}" cv/cv.typ '<none>' --field value 2>/dev/null || true)"
  # Also into public/, so the dev server serves the same PDFs the built site
  # does — dist/ is not on any dev route, so "Download PDF" was dead there.
  mkdir -p public/cv
  cp "dist/cv/starkman-cv-$preset.pdf" "public/cv/starkman-cv-$preset.pdf"
  printf '  %-28s %s\n' "starkman-cv-$preset.pdf" "$(wc -c < "dist/cv/starkman-cv-$preset.pdf" | tr -d ' ') bytes"
done

# The old Jekyll site served the CV at /files/starkman_cv.pdf and that URL is
# linked from elsewhere. Keep it alive, but as a copy of the freshly built full
# CV rather than a committed file that goes stale.
mkdir -p dist/files public/files
cp dist/cv/starkman-cv-np.pdf dist/files/starkman_cv.pdf
cp dist/cv/starkman-cv-np.pdf public/files/starkman_cv.pdf
echo "  files/starkman_cv.pdf        (alias of starkman-cv-np.pdf, for old links)"

# The PDFs must carry only the vendored faces. A font that crept in from the
# build machine would render differently on the next machine.
if command -v pdffonts >/dev/null; then
  stray="$(pdffonts dist/cv/starkman-cv-complete.pdf | tail -n +3 |
           grep -vE 'NewCM10|FontAwesome5|Academicons' || true)"
  if [ -n "$stray" ]; then
    echo; echo "  UNVENDORED FONT in the built CV:"; echo "$stray" | sed 's/^/    /'
    exit 1
  fi
  echo "  fonts                        all from public/fonts/"
fi
