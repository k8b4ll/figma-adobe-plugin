// Figma Bridge panel: runs inside After Effects / Illustrator, listens on a
// local port for layers sent by the Figma plugin, and hands them to ExtendScript.
(function () {
  'use strict';

  var cep = window.__adobe_cep__;
  var http = require('http');
  var fs = require('fs');
  var os = require('os');
  var path = require('path');

  var statusEl = document.getElementById('status');
  var logEl = document.getElementById('log');
  var dotEl = document.getElementById('dot');

  var host = JSON.parse(cep.getHostEnvironment()).appName; // AEFT or ILST
  var isAE = host === 'AEFT';
  var PORT = isAE ? 3790 : 3791;
  var APP = isAE ? 'After Effects' : 'Illustrator';
  var MAX_BODY = 200 * 1024 * 1024;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    dotEl.className = 'dot' + (cls ? ' ' + cls : '');
  }

  function extPath() {
    var p = decodeURI(cep.getSystemPath('extension'));
    return p.replace(/^file:\/\/\/?(?=[A-Za-z]:)/, '').replace(/^file:\/\//, '');
  }

  function cors(extra) {
    var h = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Private-Network': 'true'
    };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  function reply(res, code, obj) {
    res.writeHead(code, cors({ 'Content-Type': 'application/json' }));
    res.end(JSON.stringify(obj));
  }

  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function str(v, max) { return String(v == null ? '' : v).slice(0, max || 120); }

  // Validate everything and write SVGs to disk. Only plain numbers, short strings
  // and file paths we generated are ever passed on to ExtendScript.
  function buildJob(data) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) throw new Error('No layers received.');

    var base = path.join(os.homedir(), 'FigmaBridge');
    if (!fs.existsSync(base)) fs.mkdirSync(base);
    var dir = path.join(base, String(Date.now()));
    fs.mkdirSync(dir);

    var items = [];
    for (var i = 0; i < data.items.length; i++) {
      var it = data.items[i];
      var isPng = it.kind === 'png' && typeof it.png === 'string' && it.png.length > 0;
      var isSvg = typeof it.svg === 'string' && it.svg.length > 0;
      if (!isPng && !isSvg) continue;
      var safe = str(it.name, 60).replace(/[^a-zA-Z0-9_-]+/g, '_') || 'layer';
      var file = path.join(dir, i + '_' + safe + (isPng ? '.png' : '.svg'));
      if (isPng) fs.writeFileSync(file, Buffer.from(it.png, 'base64'));
      else fs.writeFileSync(file, it.svg, 'utf8');
      items.push({
        kind: isPng ? 'png' : 'svg',
        name: str(it.name, 120) || 'Layer',
        file: file.replace(/\\/g, '/'),
        x: num(it.x), y: num(it.y), w: num(it.w), h: num(it.h)
      });
    }
    if (!items.length) throw new Error('No usable layers received.');

    return {
      frame: {
        name: str(data.frame && data.frame.name, 120) || 'Figma',
        w: num(data.frame && data.frame.w) || 1920,
        h: num(data.frame && data.frame.h) || 1080
      },
      options: {
        convertShapes: !!(data.options && data.options.convertShapes),
        newDoc: !!(data.options && data.options.newDoc)
      },
      items: items
    };
  }

  function runInHost(job, done) {
    var jsx = path.join(extPath(), 'host', isAE ? 'ae.jsx' : 'ai.jsx').replace(/\\/g, '/');
    var script = '$.evalFile(' + JSON.stringify(jsx) + ');bridgeImport(' + JSON.stringify(job) + ');';
    cep.evalScript(script, function (result) { done(String(result)); });
  }

  var server = http.createServer(function (req, res) {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors({})); res.end(); return; }

    if (req.method === 'GET' && req.url === '/ping') {
      reply(res, 200, { ok: true, host: host });
      return;
    }

    if (req.method === 'POST' && req.url === '/import') {
      var chunks = [], size = 0, aborted = false;
      req.on('data', function (c) {
        size += c.length;
        if (size > MAX_BODY) { aborted = true; reply(res, 413, { ok: false, error: 'Selection is too large.' }); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', function () {
        if (aborted) return;
        try {
          var job = buildJob(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          setStatus('Importing...', 'on');
          runInHost(job, function (result) {
            if (result.indexOf('ok') === 0) {
              // Format from the host script: ok:made/total|error|error
              var parts = result.split('|');
              var counts = parts[0].replace('ok:', '').split('/');
              var made = parseInt(counts[0], 10) || 0;
              var total = parseInt(counts[1], 10) || job.items.length;
              var errors = parts.slice(1);
              setStatus('Listening for Figma', errors.length ? 'err' : 'on');
              logEl.textContent = 'Last import: ' + made + ' of ' + total + (errors.length ? ' layers. Problems: ' + errors.join('; ') : ' layers.');
              reply(res, 200, { ok: true, made: made, total: total, errors: errors });
            } else {
              setStatus('Last import failed', 'err');
              logEl.textContent = result;
              reply(res, 200, { ok: false, error: result.replace(/^error:\s*/, '') });
            }
          });
        } catch (e) {
          reply(res, 400, { ok: false, error: e.message });
        }
      });
      return;
    }

    reply(res, 404, { ok: false, error: 'Not found' });
  });

  server.on('error', function (e) {
    setStatus(e.code === 'EADDRINUSE' ? 'Port ' + PORT + ' is in use' : 'Server error', 'err');
    logEl.textContent = e.code === 'EADDRINUSE'
      ? 'Another copy of this panel is already open. Close it and reopen.'
      : String(e.message);
  });

  server.listen(PORT, '127.0.0.1', function () {
    setStatus('Listening for Figma', 'on');
    logEl.textContent = APP + ' is ready. Select layers in Figma and click Send.';
  });
})();
