# Figma to Adobe Bridge

Send selected Figma layers straight into **After Effects** or **Illustrator**, placed at the same position they have in Figma.

It has two parts:

- **Figma plugin** (`figma-plugin/`) reads your selection and exports vector data plus exact coordinates.
- **Adobe panel** (`bridge-panel/`) runs inside After Effects / Illustrator and places the layers.

Everything stays on your computer. The plugin talks to the panel over `localhost` only.

## Install

### 1. Adobe panel (once)

Download this repo (Code > Download ZIP) and unzip it.

- **macOS:** open Terminal in the folder and run `./install-mac.sh`
- **Windows:** double-click `install-win.bat`

Restart After Effects / Illustrator, then open **Window > Extensions > Figma Bridge**. Leave the panel open (dock it somewhere); it only receives layers while it is open.

The installer turns on Adobe's "unsigned panel" setting (`PlayerDebugMode`) so the panel loads.

### 2. Figma plugin

In the Figma desktop app: **Menu > Plugins > Development > Import plugin from manifest...** and choose `figma-plugin/manifest.json`.

## Use

1. Open a comp (After Effects) or a document (Illustrator). If none is open, one is created at the size of your Figma frame.
2. In Figma, select layers and run the plugin. A green dot next to the app name means its panel is running.
3. Click **Send to After Effects** or **Send to Illustrator**.

Positions are relative to the top-left of the selected layers' top-level frame, so a frame the same size as your comp or artboard lands exactly in place.

| Option | Effect |
|---|---|
| Convert to shape layers (AE) | Turns each SVG into an editable shape layer. Off keeps a continuously-rasterized vector footage layer. |
| Keep text editable (AI) | Keeps live text (needs the font installed). Off outlines text for exact appearance. |

If the panel isn't running, the plugin offers to download the SVG files instead.

## Limitations

- Each selected layer becomes one imported item (nested layers are flattened). Select children individually if you need them separate.
- Blend modes, some effects, and auto layout don't survive SVG.
- Illustrator documents should use pixel units for 1:1 sizes.
- The panel uses Adobe's CEP technology. Adobe is moving toward a newer system (UXP), so a future Adobe version may need an updated panel.

## License

This project is released under the MIT License.

In plain terms: you're free to use, copy, modify, and share this plugin, including for commercial work. You just need to keep the copyright notice and license text with it. It's provided "as is", without warranty, so use it at your own risk and keep backups of your work.

Copyright (c) 2026 katelyn moro

## Disclaimer

Figma to Adobe Bridge is an independent project. It is not affiliated with, endorsed by, or sponsored by Figma, Inc. or Adobe Inc. Figma, Adobe, Illustrator, and After Effects are trademarks of their respective owners.
