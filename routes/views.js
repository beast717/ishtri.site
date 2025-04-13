const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');

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

// Product details page
router.get('/productDetails', (req, res) => {
    res.render('productDetails', {
        user: req.session.user || null 
    });
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

module.exports = router;