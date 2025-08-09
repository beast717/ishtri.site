const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');
const pool = require('../config/db');

// New listing page
router.get('/ny-annonse', isAuthenticated, (req, res) => {
    res.render('Ny-annonse');
});

// My listings page
router.get('/mine-annonser', isAuthenticated, (req, res) => {
    res.render('mine-annonser');
});

// Saved Searches page
router.get('/saved-searches', isAuthenticated, (req, res) => {
    res.render('saved-searches', { user: req.session.user || null }); // Pass user if needed by navbar
});

// Legacy product details query route -> Redirect to slug URL
router.get('/productDetails', async (req, res) => {
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
    res.render('productDetails', { user: req.session.user || null });
});

// SEO friendly product slug route (/product/:id/:slug?)
router.get('/product/:id/:slug?', (req, res) => {
    res.render('productDetails', { user: req.session.user || null });
});

// Favorites page
router.get('/favorites', isAuthenticated, (req, res) => {
    res.render('favorites');
});

// Travel page
router.get('/reise', (req, res) => {
    res.render('reise');
});

// TorgetKat page
router.get('/torgetkat', (req, res) => {
    res.render('TorgetKat'); 
});

// Messages page
router.get('/messages', isAuthenticated, (req, res) => {
    res.render('messages', { user: req.session.user }); 
});

// search page
router.get('/search', (req, res) => {
    res.render('SearchResults'); 
});

// notifications page
router.get('/notifications', isAuthenticated, (req, res) => {
    res.render('notifications', { user: req.session.user || null }); // Pass user if needed
});

// settings page
router.get('/settings', isAuthenticated, (req, res) => {
    res.render('settings', { user: req.session.user || null });
});

module.exports = router;