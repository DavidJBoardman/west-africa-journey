#!/usr/bin/env bash
#
# Builds the two web derivatives the app serves, from the full-resolution
# originals in photo-originals/.
#
#   public/photos/thumb/<id>.webp    400px wide  — the panel grid (176px at 2x)
#   public/photos/display/<id>.webp  1800px wide — the lightbox (80vw / 72vh)
#
# The originals are 6240x4160, ~5 MB each. Serving them directly meant a single
# stop's four photocards cost around 20 MB, which is why navigation stalled.
# They stay out of public/ so Vite never copies them into the build.
#
# Requires: sips (macOS, built in) and cwebp (`brew install webp`).
# Run from the project root:  ./scripts/build-photo-derivatives.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/photo-originals"
OUT="$ROOT/public/photos"
DATA="$ROOT/src/data/archives.js"

command -v cwebp >/dev/null || { echo "cwebp not found — brew install webp" >&2; exit 1; }
[[ -d "$SRC" ]] || { echo "no originals at $SRC" >&2; exit 1; }

mkdir -p "$OUT/thumb" "$OUT/display"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Only the cards the journey data actually references get shipped.
ids=$(grep -oE "\{ id: '[A-Za-z0-9_]+'" "$DATA" | sed "s/{ id: '//;s/'//" | sort -u)

built=0 missing=0
for id in $ids; do
  in="$SRC/$id.JPG"
  if [[ ! -f "$in" ]]; then
    echo "  missing original: $id"
    missing=$((missing + 1))
    continue
  fi
  sips -Z 400  --setProperty format jpeg -s formatOptions 92 --out "$TMP/t.jpg" "$in" >/dev/null
  cwebp -quiet -q 76 -m 6 "$TMP/t.jpg" -o "$OUT/thumb/$id.webp"

  sips -Z 1800 --setProperty format jpeg -s formatOptions 92 --out "$TMP/d.jpg" "$in" >/dev/null
  cwebp -quiet -q 82 -m 6 "$TMP/d.jpg" -o "$OUT/display/$id.webp"

  built=$((built + 1))
done

echo "built $built pairs into public/photos ($missing originals missing)"
du -sh "$OUT/thumb" "$OUT/display"
