const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');
const pool = require('../config/db');
const { buildSeo, getSearchSeo, getProductSeo, slugify } = require('../config/seo');

// New listing page
router.get('/ny-annonse', isAuthenticated, (req, res) => {
    res.render('Ny-annonse', {
        seo: buildSeo({
            path: '/ny-annonse',
            title: 'Post a listing | Ishtri',
            description: 'Create a new Ishtri listing for cars, property, jobs, or travel packages.',
            robots: 'noindex,follow'
        }),
        user: req.session.user || null
    });
});

// My listings page
router.get('/mine-annonser', isAuthenticated, (req, res) => {
    res.render('mine-annonser', {
        seo: buildSeo({
            path: '/mine-annonser',
            title: 'Mine annonser | Ishtri',
            description: 'Administrer aktive og utløpte annonser på Ishtri.',
            robots: 'noindex,nofollow'
        }),
        user: req.session.user || null
    });
});

// Saved Searches page
router.get('/saved-searches', isAuthenticated, (req, res) => {
    res.render('saved-searches', {
        user: req.session.user || null,
        seo: buildSeo({
            path: '/saved-searches',
            title: 'Saved searches | Ishtri',
            description: 'Get alerts when new listings match your saved Ishtri searches.',
            robots: 'noindex,follow'
        })
    }); // Pass user if needed by navbar
});

// Legacy product details query route -> Redirect to slug URL
router.get('/productDetails', async (req, res, next) => {
    const id = req.query.productdID;
    if (id && /^\d+$/.test(id)) {
        try {
            const [rows] = await pool.promise().query('SELECT ProductName FROM products WHERE productdID = ? LIMIT 1', [id]);
            const name = rows[0]?.ProductName || 'product';
            const slug = name.toString().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,80);
            return res.redirect(301, `/product/${id}/${slug}`);
        } catch (e) {
            console.warn('Slug redirect failed, falling back to rendering:', e.message);
        }
    }
    // Fallback render (should rarely happen)
    try {
        const seo = buildSeo({
            path: req.originalUrl,
            title: 'Product details | Ishtri',
            description: 'Browse Ishtri listings with full product information.',
            robots: 'noindex,follow',
            ogType: 'product'
        });
        res.render('productDetails', { user: req.session.user || null, seo });
    } catch (error) {
        next(error);
    }
});

// SEO friendly product slug route (/product/:id/:slug?)
router.get('/product/:id/:slug?', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        let product = null;
        if (Number.isInteger(id)) {
            const [rows] = await pool.promise().query(
                `SELECT 
                    p.productdID AS ProductdID,
                    p.ProductName,
                    p.Price,
                    p.Description,
                    p.Images,
                    p.Location,
                    p.category,
                    p.Sold,
                    p.Date,
                    COALESCE(cb.brand_name, '') AS brand_name,
                    COALESCE(ci.country, '') AS country
                 FROM products p
                 LEFT JOIN cars c ON p.productdID = c.productdID
                 LEFT JOIN car_brands cb ON c.brand_id = cb.brand_id
                 LEFT JOIN cities ci ON p.city_id = ci.cityid
                 WHERE p.productdID = ?
                 LIMIT 1`,
                [id]
            );
            product = rows[0] || null;
        }

        if (product) {
            const correctSlug = slugify(product.ProductName || 'product');
            // Decode the slug from URL to handle encoded characters correctly
            const currentSlug = decodeURIComponent(req.params.slug || '');
            
            if (currentSlug !== correctSlug) {
                return res.redirect(301, `/product/${id}/${correctSlug}`);
            }
        }

        const seo = getProductSeo(product);
        res.render('productDetails', {
            user: req.session.user || null,
            product,
            seo
        });
    } catch (error) {
        next(error);
    }
});

// Favorites page
router.get('/favorites', isAuthenticated, (req, res) => {
    res.render('favorites', {
        seo: buildSeo({
            path: '/favorites',
            title: 'Favorites | Ishtri',
            description: 'Lagrede favoritter på Ishtri for raske tilbakebesøk.',
            robots: 'noindex,follow'
        }),
        user: req.session.user || null
    });
});

// Travel page
router.get('/reise', (req, res) => {
    res.render('reise', {
        seo: buildSeo({
            path: '/reise',
            title: 'Reise deals & packages | Ishtri',
            description: 'Plan curated getaways and bundle flights, stays, and experiences with Ishtri partners.'
        })
    });
});

// TorgetKat page
router.get('/torgetkat', (req, res) => {
    res.render('TorgetKat', {
        seo: buildSeo({
            path: '/torgetkat',
            title: 'Torget categories | Ishtri',
            description: 'Utforsk Torget-kategorier innen møbler, elektronikk, biler, båter og mer.'
        })
    }); 
});

// Messages page
router.get('/messages', isAuthenticated, (req, res) => {
    res.render('messages', {
        user: req.session.user,
        seo: buildSeo({
            path: '/messages',
            title: 'Messages | Ishtri',
            description: 'Les og svar på henvendelser fra Ishtri-kjøpere.',
            robots: 'noindex,nofollow'
        })
    }); 
});

// search page
router.get('/search', (req, res) => {
    const seo = getSearchSeo(req.query.query || '');
    res.render('SearchResults', { seo }); 
});

// notifications page
router.get('/notifications', isAuthenticated, (req, res) => {
    res.render('notifications', {
        user: req.session.user || null,
        seo: buildSeo({
            path: '/notifications',
            title: 'Notifications | Ishtri',
            description: 'Hold deg oppdatert på aktivitet i konto og annonser.',
            robots: 'noindex,nofollow'
        })
    }); // Pass user if needed
});

// settings page
router.get('/settings', isAuthenticated, (req, res) => {
    res.render('settings', {
        user: req.session.user || null,
        seo: buildSeo({
            path: '/settings',
            title: 'Kontoinnstillinger | Ishtri',
            description: 'Oppdater profilinformasjon, varsler og kontosikkerhet på Ishtri.',
            robots: 'noindex,nofollow'
        })
    });
});

module.exports = router;