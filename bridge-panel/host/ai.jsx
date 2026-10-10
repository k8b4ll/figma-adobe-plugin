// Illustrator side: brings each SVG/PNG in and positions it at its Figma coordinates,
// relative to the top-left of the active artboard.

// SVG -> editable vector group (SVGs can't be "placed", so build from file)
function bridgeLoadSvg(doc, layer, file) {
  try {
    return layer.groupItems.createFromFile(file);
  } catch (e1) {
    // Fallback: open the SVG as its own document, copy everything, paste into the target
    var src = app.open(file);
    src.selectObjectsOnActiveArtboard();
    app.copy();
    src.close(SaveOptions.DONOTSAVECHANGES);
    doc.activate();
    app.paste();
    if (doc.selection.length > 1) app.executeMenuCommand("group");
    return doc.selection[0];
  }
}

// PNG -> embedded raster image
function bridgeLoadPng(layer, file) {
  var p = layer.placedItems.add();
  p.file = file;
  try {
    p.embed();
    return layer.pageItems[0];
  } catch (e) {
    return p;
  }
}

function bridgeImport(job) {
  var made = 0;
  var errors = [];
  var prevSystem = null;
  try {
    var doc;
    if (job.options.newDoc || app.documents.length === 0) {
      doc = app.documents.add(DocumentColorSpace.RGB, Math.max(1, job.frame.w), Math.max(1, job.frame.h));
    } else {
      doc = app.activeDocument;
    }

    prevSystem = app.coordinateSystem;
    app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

    var layer = doc.activeLayer;
    layer.locked = false;
    layer.visible = true;

    // Illustrator's y axis can point up or down; detect it from the artboard rect [l, t, r, b]
    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var yDown = ab[3] > ab[1];

    var created = [];

    for (var i = 0; i < job.items.length; i++) {
      var it = job.items[i];
      try {
        var f = new File(it.file);
        if (!f.exists) throw new Error("file missing");

        var item;
        if (it.kind === "png") {
          item = bridgeLoadPng(layer, f);
          item.width = it.w;   // PNG is exported at 2x; scale back to the Figma size
          item.height = it.h;
        } else {
          item = bridgeLoadSvg(doc, layer, f);
        }
        item.name = it.name;

        var targetLeft = ab[0] + it.x;
        var targetTop = yDown ? ab[1] + it.y : ab[1] - it.y;

        // Move so the item's bounds start exactly at the target
        item.left = targetLeft;
        item.top = targetTop;
        var vb = item.visibleBounds; // [left, top, right, bottom]
        item.left = item.left + (targetLeft - vb[0]);
        item.top = item.top + (targetTop - vb[1]);

        created.push(item);
        made++;
      } catch (eItem) {
        errors.push(String(it.name).replace(/\|/g, "/") + ": " + String(eItem).replace(/\|/g, "/"));
      }
    }

    doc.selection = null;
    for (var k = 0; k < created.length; k++) {
      try { created[k].selected = true; } catch (eSel) {}
    }
  } catch (e) {
    return "error: [ai.jsx v5] " + e.toString();
  } finally {
    if (prevSystem !== null) app.coordinateSystem = prevSystem;
  }
  var out = "ok:" + made + "/" + job.items.length;
  if (errors.length) out += "|" + errors.join("|");
  return out;
}
