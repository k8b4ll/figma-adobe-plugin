// After Effects side: imports each SVG/PNG, places it at its Figma position,
// and (optionally) converts SVGs to editable shape layers.

function bridgeClamp(n) { n = Math.round(n); return Math.max(4, Math.min(30000, n)); }

function bridgeDeselect(comp) {
  var sel = comp.selectedLayers;
  for (var i = 0; i < sel.length; i++) sel[i].selected = false;
}

function bridgeImport(job) {
  var made = 0;
  var errors = [];
  app.beginUndoGroup("Import from Figma");
  try {
    var comp = app.project.activeItem;
    if (job.options.newDoc || !(comp && comp instanceof CompItem)) {
      comp = app.project.items.addComp(job.frame.name, bridgeClamp(job.frame.w), bridgeClamp(job.frame.h), 1, 10, 30);
      comp.openInViewer();
    }

    for (var i = 0; i < job.items.length; i++) {
      var it = job.items[i];
      try {
        var f = new File(it.file);
        if (!f.exists) throw new Error("file missing");

        var footage = app.project.importFile(new ImportOptions(f));
        var layer = comp.layers.add(footage);
        layer.name = it.name;

        var xf = layer.property("ADBE Transform Group");
        if (it.kind === "png") {
          // Raster is exported at 2x: scale back to the Figma size (anchor is the center)
          xf.property("ADBE Scale").setValue([100 * it.w / layer.width, 100 * it.h / layer.height]);
          xf.property("ADBE Position").setValue([it.x + it.w / 2, it.y + it.h / 2]);
        } else {
          // Footage anchor is its center; shift so the layer's top-left lands on (x, y)
          var anchor = xf.property("ADBE Anchor Point").value;
          xf.property("ADBE Position").setValue([it.x + anchor[0], it.y + anchor[1]]);
        }

        var converted = false;
        if (job.options.convertShapes && it.kind !== "png") {
          try {
            bridgeDeselect(comp);
            layer.selected = true;
            app.executeCommand(3973); // Layer > Create > Create Shapes from Vector Layer
            var sel = comp.selectedLayers;
            if (sel.length > 0 && sel[0].matchName === "ADBE Vector Layer") {
              sel[0].name = it.name;
              layer.remove();
              footage.remove();
              converted = true;
            }
          } catch (e1) { /* keep the footage layer if conversion fails */ }
        }
        if (!converted) {
          try { layer.collapseTransformation = true; } catch (e2) {}
        }
        made++;
      } catch (eItem) {
        errors.push(String(it.name).replace(/\|/g, "/") + ": " + String(eItem).replace(/\|/g, "/"));
      }
    }
  } catch (e) {
    return "error: " + e.toString();
  } finally {
    app.endUndoGroup();
  }
  var out = "ok:" + made + "/" + job.items.length;
  if (errors.length) out += "|" + errors.join("|");
  return out;
}
