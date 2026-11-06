#!/usr/bin/env bash
# Render docs/*.svg to crisp 2x PNGs using headless Chrome (no extra tools needed).
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Google Chrome not found at $CHROME"; exit 1; }
for f in docs/architecture docs/request-flow; do
  w="$(sed -n 's/.*<svg[^>]* width="\([0-9]*\)".*/\1/p' "$f.svg" | head -1)"
  h="$(sed -n 's/.*<svg[^>]* height="\([0-9]*\)".*/\1/p' "$f.svg" | head -1)"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="${w},${h}" --screenshot="$PWD/$f.png" "file://$PWD/$f.svg" >/dev/null 2>&1
  echo "rendered $f.png  (${w}x${h} @2x)"
done
