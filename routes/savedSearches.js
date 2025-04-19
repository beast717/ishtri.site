// routes/savedSearches.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Assuming your db config is here
const { isAuthenticated } = require('./auth'); // Import authentication middleware
const { body, param, validationResult } = require('express-validator'); // <-- Import validator functions

// --- Validation Chains ---
const createSavedSearchValidation = [
    body('search_name').trim().notEmpty().withMessage('Search name is required').isLength({ max: 100 }).withMessage('Search name too long'),
    body('category').trim().notEmpty().withMessage('Category is required').isIn(['Bil', 'Jobb', 'Eiendom', 'Torget']).withMessage('Invalid category'), // Adjust allowed categories as needed
    body('filters').isObject().withMessage('Filters must be a valid object'),
    // Add more specific validation for filter structure if possible/needed
    // e.g., body('filters.price_min').optional().isInt({ min: 0 })
];

const deleteSavedSearchValidation = [
    param('searchId').isInt({ min: 1 }).withMessage('Invalid search ID.').toInt(),
];

// --- GET User's Saved Searches (No input validation needed here beyond auth) ---
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
router.post('/', isAuthenticated, createSavedSearchValidation, async (req, res, next) => { // <-- Add validation middleware
    // --- Validation Check ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // --- End Validation Check ---

    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        // No need for userId check here, isAuthenticated handles it

        const { search_name, category, filters } = req.body; // Use validated data

        // Basic validation handled by express-validator

        // Convert filters object to JSON string for storage
        const filtersJson = JSON.stringify(filters);

        // --- Insert into Database ---
        const [result] = await pool.promise().query(
            'INSERT INTO saved_searches (user_id, search_name, category, filters) VALUES (?, ?, ?, ?)',
            [userId, search_name, category, filtersJson] // Use validated data
        );

        const insertedId = result.insertId;

        // Respond with success and the ID (or the full object)
        res.status(201).json({
            message: 'Search saved successfully!',
            search_id: insertedId,
            search_name: search_name, // Return validated name
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
router.delete('/:searchId', isAuthenticated, deleteSavedSearchValidation, async (req, res, next) => { // <-- Add validation middleware
    // --- Validation Check ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // --- End Validation Check ---

    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        // No need for userId check here, isAuthenticated handles it

        const searchId = req.params.searchId; // Use validated ID (already converted to int)

        // No need for isNaN check, validation handles it

        // --- Delete from Database (with user check) ---
        const [result] = await pool.promise().query(
            'DELETE FROM saved_searches WHERE search_id = ? AND user_id = ?',
            [searchId, userId] // Use validated ID
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