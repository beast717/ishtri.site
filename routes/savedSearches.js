// routes/savedSearches.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Assuming your db config is here
const { isAuthenticated } = require('./auth'); // Import authentication middleware

// --- GET User's Saved Searches ---
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        if (!userId) {
            // isAuthenticated should handle this, but double check
            return res.status(401).json({ message: 'Authentication required' });
        }

        const [searches] = await pool.promise().query(
            'SELECT search_id, user_id, search_name, category, filters, created_at FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        // Optionally parse filters JSON before sending, or let frontend handle it
        res.json(searches);

    } catch (err) {
        console.error("Error fetching saved searches:", err);
        next(err); // Pass to global error handler
    }
});

// --- POST (Create) New Saved Search ---
router.post('/', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { search_name, category, filters } = req.body;

        // --- Basic Validation ---
        if (!search_name || search_name.trim() === '') {
            return res.status(400).json({ message: 'Search name is required.' });
        }
        if (!category || category.trim() === '') {
            return res.status(400).json({ message: 'Category is required.' });
        }
        if (!filters || typeof filters !== 'object') {
            // Basic check, more specific validation might be needed depending on filter structure
            return res.status(400).json({ message: 'Valid filters object is required.' });
        }

        // Convert filters object to JSON string for storage
        const filtersJson = JSON.stringify(filters);

        // --- Insert into Database ---
        const [result] = await pool.promise().query(
            'INSERT INTO saved_searches (user_id, search_name, category, filters) VALUES (?, ?, ?, ?)',
            [userId, search_name.trim(), category, filtersJson]
        );

        const insertedId = result.insertId;

        // Respond with success and the ID (or the full object)
        res.status(201).json({
            message: 'Search saved successfully!',
            search_id: insertedId,
            search_name: search_name.trim(), // Return trimmed name
            category: category,
            filters: filters // Return original object
        });

    } catch (err) {
        console.error("Error saving search:", err);
        // Check for potential duplicate entry or other DB errors
        if (err.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ message: 'A search with this name might already exist.' });
        }
        next(err);
    }
});

// --- DELETE Saved Search ---
router.delete('/:searchId', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const searchId = parseInt(req.params.searchId, 10);
        if (isNaN(searchId)) {
            return res.status(400).json({ message: 'Invalid search ID.' });
        }

        // --- Delete from Database (with user check) ---
        const [result] = await pool.promise().query(
            'DELETE FROM saved_searches WHERE search_id = ? AND user_id = ?',
            [searchId, userId]
        );

        if (result.affectedRows === 0) {
            // Either search didn't exist or didn't belong to the user
            return res.status(404).json({ message: 'Saved search not found or you do not have permission to delete it.' });
        }

        res.json({ message: 'Saved search deleted successfully.' });

    } catch (err) {
        console.error("Error deleting saved search:", err);
        next(err);
    }
});


// --- (Optional) PUT Route for Renaming ---
// router.put('/:searchId', isAuthenticated, async (req, res, next) => { ... });


module.exports = router;