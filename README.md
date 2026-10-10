# Figma to Adobe Bridge

Send selected Figma layers straight into **After Effects** or **Illustrator**, placed at the same position they have in Figma.

It has two parts:

- **Figma plugin** (`figma-plugin/`) reads your selection and exports vector data plus exact coordinates.
- **Adobe panel** (`bridge-panel/`) runs inside After Effects / Illustrator and places the layers.

Everything stays on your computer. The plugin talks to the panel over `localhost` only.

## One-Time Installment

### Adobe Panel

Download this repository (**Code > Download ZIP**) and unzip the folder to your computer[cite: 3]. 

Choose your operating system below to install the extension panel:

#### ⊞ Windows Users

Double-click the **`install-win.bat`** file in the root folder[cite: 2, 3].

####  Mac Users

1. Open the **Terminal** app (Press `Cmd + Space`, type *Terminal*, and hit Enter).

2. Type `cd ` (type `cd` followed by a **space**), then drag and drop your unzipped project folder directly into the Terminal window and hit **Enter**.

3. Copy and paste these two commands one by one:

#### Paste this command to grant permission to run the installer:  
```
Bashchmod +x install-mac.sh
```

#### Finally, run the script by typing:   
```
Bash./install-mac.sh
```

[>] What to expect: Terminal will output Installed. to confirm success.   

### Next Steps

1. Completely restart After Effects or Illustrator.   

2. Open Window > Extensions > Figma Bridge. (Keep this panel open and docked while using the plugin[cite: 3]). 

### Figma plugin

In the Figma desktop app: **Menu > Plugins > Development > Import plugin from manifest...** and choose `figma-plugin/manifest.json`.

## Project Structure
```
figma-adobe-bridge/
├── README.md
├── LICENSE
├── .gitignore
├── install-win.bat          Windows installer for the Adobe panel
├── install-mac.sh           Mac installer for the Adobe panel
│
├── figma-plugin/            The plugin you import into Figma
│   ├── manifest.json        Plugin settings
│   ├── code.js              Reads your selection and exports layers
│   └── ui.html              The plugin window
│
└── bridge-panel/            The panel that runs inside Illustrator / After Effects
    ├── index.html           The panel window
    ├── main.js              Receives layers from Figma
    ├── CSXS/
    │   └── manifest.xml     Tells Adobe how to load the panel
    └── host/
        ├── ai.jsx           Places layers in Illustrator
        └── ae.jsx           Places layers in After Effects
```

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
