#!/bin/bash
# Installs the Figma Bridge panel for After Effects and Illustrator (macOS)
set -e
SRC="$(cd "$(dirname "$0")/bridge-panel" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/com.figmabridge.panel"

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -R "$SRC" "$DEST"

# Allow unsigned panels
for v in 9 10 11 12 13; do
  defaults write com.adobe.CSXS.$v PlayerDebugMode 1
done

echo "Installed."
echo "Restart After Effects / Illustrator, then open Window > Extensions > Figma Bridge."
