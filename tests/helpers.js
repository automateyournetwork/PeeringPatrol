'use strict';
// Loads the game's classic scripts into this Node process, the same way index.html does.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const DATA = ['data/lan.js', 'data/packets.js', 'data/phases.js'];
const ENGINE = [
  'engine/rng.js', 'engine/rules.js', 'engine/scoring.js', 'engine/spawner.js',
  'engine/labels.js', 'engine/feedback.js', 'engine/validate.js'
];

function load(files) {
  globalThis.PP = { data: {}, engine: {}, views: {} };
  for (const f of ['engine/namespace.js', ...files]) {
    vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
  }
  return globalThis.PP;
}

function loadAll() { return load([...DATA, ...ENGINE]); }

function byId(PP) {
  const m = {};
  for (const t of PP.data.packets) m[t.id] = t;
  return m;
}

module.exports = { root, DATA, ENGINE, load, loadAll, byId };
