// Figma to Adobe Bridge - sandbox side. Reads the selection and exports vector/PNG
// data together with exact coordinates so the Adobe panel can paste in place.

figma.showUI(__html__, { width: 320, height: 500, themeColors: false });

function sendSelectionInfo() {
  figma.ui.postMessage({ type: 'selection', count: figma.currentPage.selection.length });
}
sendSelectionInfo();
figma.on('selectionchange', sendSelectionInfo);

// The top-level frame a layer lives in (stops below the page or a section)
function topAncestor(node) {
  let n = node;
  while (n.parent && n.parent.type !== 'PAGE' && n.parent.type !== 'DOCUMENT' && n.parent.type !== 'SECTION') {
    n = n.parent;
  }
  return n;
}

// Path of child indices from the page down to the node, used to sort by stacking order
function indexPath(node) {
  const path = [];
  let n = node;
  while (n.parent && n.parent.type !== 'DOCUMENT') {
    path.unshift(n.parent.children.indexOf(n));
    n = n.parent;
  }
  return path;
}
function compareStacking(a, b) {
  const pa = indexPath(a), pb = indexPath(b);
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return pa.length - pb.length;
}

// True if the node, or anything inside it, has a visible image fill
function hasImageFill(node) {
  if ('fills' in node && Array.isArray(node.fills)) {
    for (const f of node.fills) {
      if (f.type === 'IMAGE' && f.visible !== false) return true;
    }
  }
  if ('children' in node) {
    for (const c of node.children) {
      if (c.visible !== false && hasImageFill(c)) return true;
    }
  }
  return false;
}

// Read the width/height Figma wrote into the SVG header
function svgSize(bytes) {
  let head = '';
  const n = Math.min(bytes.length, 600);
  for (let i = 0; i < n; i++) head += String.fromCharCode(bytes[i]);
  const m = head.match(/<svg[^>]*?\swidth="([\d.]+)"[^>]*?\sheight="([\d.]+)"/);
  return m ? { w: parseFloat(m[1]), h: parseFloat(m[2]) } : null;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'transfer') return;

  const selection = figma.currentPage.selection.slice();
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'error', message: 'Select at least one layer first.' });
    return;
  }

  selection.sort(compareStacking);

  // Optionally split frames/groups into their direct children
  let nodes = selection;
  if (msg.split) {
    const splittable = ['FRAME', 'GROUP', 'SECTION', 'COMPONENT', 'INSTANCE'];
    nodes = [];
    for (const n of selection) {
      if (splittable.indexOf(n.type) !== -1 && n.children && n.children.length > 0) {
        for (const c of n.children) if (c.visible !== false) nodes.push(c);
      } else {
        nodes.push(n);
      }
    }
    nodes.sort(compareStacking);
  }

  // Reference frame = the shared top-level frame, or the union of the selection
  const tops = selection.map(topAncestor);
  let frame;
  if (tops.every((t) => t === tops[0])) {
    const bb = tops[0].absoluteBoundingBox || { x: 0, y: 0, width: 100, height: 100 };
    frame = { name: tops[0].name, x: bb.x, y: bb.y, w: bb.width, h: bb.height };
  } else {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of selection) {
      const b = n.absoluteRenderBounds || n.absoluteBoundingBox;
      if (!b) continue;
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
    }
    frame = { name: 'Selection', x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  const outlineText = !(msg.target === 'ai' && msg.keepText);
  const items = [];
  const skipped = [];

  for (const node of nodes) {
    try {
      let b = node.absoluteRenderBounds || node.absoluteBoundingBox;
      if (!b) { skipped.push(node.name + ' (no visible area)'); continue; }

      // SVG can't carry image fills reliably, so layers with images go as PNG (2x)
      const asPng = !!msg.imagesAsPng && hasImageFill(node);
      let bytes, w = b.width, h = b.height;

      if (asPng) {
        bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
      } else {
        bytes = await node.exportAsync({ format: 'SVG', svgOutlineText: outlineText, svgIdAttribute: false });
        // Match the SVG's real size to the right Figma bounds (with or without strokes/effects)
        const sz = svgSize(bytes);
        const bb = node.absoluteBoundingBox;
        if (sz) {
          if (bb) {
            const dr = Math.abs(sz.w - b.width) + Math.abs(sz.h - b.height);
            const db = Math.abs(sz.w - bb.width) + Math.abs(sz.h - bb.height);
            if (db < dr) b = bb;
          }
          w = sz.w; h = sz.h;
        }
      }

      items.push({
        kind: asPng ? 'png' : 'svg',
        name: node.name,
        x: b.x - frame.x,
        y: b.y - frame.y,
        w: w,
        h: h,
        bytes: bytes
      });
    } catch (err) {
      skipped.push(node.name + ' (' + err.message + ')');
    }
  }

  if (items.length === 0) {
    figma.ui.postMessage({ type: 'error', message: 'Nothing could be exported. ' + skipped.join('; ') });
    return;
  }

  figma.ui.postMessage({
    type: 'export-ready',
    target: msg.target,
    convertShapes: !!msg.convertShapes,
    frame: { name: frame.name, w: frame.w, h: frame.h },
    items: items,
    skipped: skipped
  });
};
