// routes/sitemap.js
// Dynamic sitemap with simple in-memory cache
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { slugify } = require('../config/seo');

// In-memory cache (reset on server restart)
let cache = { xml: null, expires: 0 };
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

async function buildSitemapXML(baseUrl) {
  // Static routes to include
  const staticPaths = [
    '/', '/login', '/torget', '/reise', '/forgot-password',
    '/privacy.html', '/terms.html', '/saved-searches', '/favorites', '/settings'
  ];

  // Fetch products including name for slugs
  const [rows] = await pool.promise().query(
    'SELECT productdID, Date, ProductName FROM products ORDER BY Date DESC LIMIT 1000'
  );

  const urlEntries = [];
  const iso = d => {
    try { return new Date(d).toISOString(); } catch { return new Date().toISOString(); }
  };

  staticPaths.forEach(p => {
    urlEntries.push(`<url><loc>${baseUrl}${p}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  });

  rows.forEach(r => {
    const slug = slugify(r.ProductName || 'product');
    urlEntries.push(`<url><loc>${baseUrl}/product/${r.productdID}/${slug}</loc><lastmod>${iso(r.Date)}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>`;
}

router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.APP_BASE_URL || 'https://ishtri.site';
    const now = Date.now();
    if (cache.xml && cache.expires > now) {
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=1800');
      return res.send(cache.xml);
    }

    const xml = await buildSitemapXML(baseUrl);
    cache = { xml, expires: now + CACHE_TTL_MS };
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(xml);
  } catch (e) {
    console.error('Sitemap generation failed:', e.message);
    res.status(500).send('<!-- sitemap error -->');
  }
});

module.exports = router;
