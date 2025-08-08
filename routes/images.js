// routes/images.js
// Responsive image endpoint using sharp with on-disk caching

const express = require('express');
const path = require('path');
const fs = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[images] sharp not installed; disabling responsive image routes.');
}

const router = express.Router();

if (sharp) {
  router.get('/img/:width/*', async (req, res, next) => {
    const width = parseInt(req.params.width, 10);
    if (!width || width < 50 || width > 3000) return res.status(400).send('Invalid width');

    const relPath = req.params[0] || '';
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const originalPath = path.normalize(path.join(uploadsDir, relPath));

    // Prevent path traversal
    if (!originalPath.startsWith(uploadsDir)) return res.status(400).send('Invalid path');
    if (!fs.existsSync(originalPath)) return res.status(404).send('Not found');

    const accept = req.headers.accept || '';
    const format = accept.includes('image/avif') ? 'avif' : (accept.includes('image/webp') ? 'webp' : 'webp');

    // Build cache path
    const cacheBase = path.join(uploadsDir, '.cache', 'img', String(width), format);
    const parsed = path.parse(relPath);
    const cachePath = path.join(cacheBase, parsed.dir, `${parsed.name}.${format}`);

    try {
      // If cached, serve directly
      if (fs.existsSync(cachePath)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        res.type(`image/${format}`);
        return res.sendFile(cachePath);
      }

      await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });

      // Process and cache
      await sharp(originalPath)
        .resize({ width, withoutEnlargement: true })
        .toFormat(format, { quality: 70 })
        .toFile(cachePath);

      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.type(`image/${format}`);
      return res.sendFile(cachePath);
    } catch (err) {
      console.error('[images] Processing error:', err);
      return next();
    }
  });
}

module.exports = router;
