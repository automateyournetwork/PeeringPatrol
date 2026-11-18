'use strict';
// T010 — Separation gate: views and presentation modules never decide verdicts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { root } = require('./helpers');

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

const files = [];
const viewsDir = path.join(root, 'views');
if (fs.existsSync(viewsDir)) {
  for (const f of fs.readdirSync(viewsDir)) if (f.endsWith('.js')) files.push(path.join('views', f));
}
for (const f of ['engine/renderer.js', 'engine/effects.js', 'engine/motion.js']) {
  if (fs.existsSync(path.join(root, f))) files.push(f);
}

test('presentation code does not use `verdict`', () => {
  for (const f of files) {
    const code = stripComments(fs.readFileSync(path.join(root, f), 'utf8'));
    assert.doesNotMatch(code, /\bverdict\b/, `${f} must not read or write verdict`);
  }
});

test('the comment stripper keeps code and drops comments', () => {
  assert.equal(stripComments('a // verdict').trim(), 'a');
  assert.equal(stripComments('/* verdict */b').trim(), 'b');
  assert.match(stripComments('x.verdict'), /verdict/);
});
