// Peering Patrol global namespace. Loaded first, in the browser and under Node tests.
(function (g) {
  'use strict';
  if (!g.PP) g.PP = { data: {}, engine: {}, views: {} };
  if (typeof module === 'object' && module && module.exports) module.exports = g.PP;
})(typeof globalThis !== 'undefined' ? globalThis : window);
