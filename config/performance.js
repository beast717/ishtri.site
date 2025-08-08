// config/performance.js
// Centralized performance-related middleware and helpers

const path = require('path');

let compression;
try {
  compression = require('compression');
} catch (e) {
  // Optional dependency
}

function applyCompression(app) {
  if (compression) {
    app.use(compression());
  } else {
    console.warn('[perf] compression package not installed; skipping gzip compression.');
  }
}

function setStaticCacheHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // No cache for HTML/EJS
  if (ext === '.html' || ext === '.ejs') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return;
  }
  // Cache other assets aggressively
  const oneMonth = 30 * 24 * 60 * 60; // seconds
  res.setHeader('Cache-Control', `public, max-age=${oneMonth}, immutable`);
}

module.exports = {
  applyCompression,
  setStaticCacheHeaders,
};
