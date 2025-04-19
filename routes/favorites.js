const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('./auth');
const { body, validationResult } = require('express-validator'); // <-- Import validator functions

// Validation chain for productdID in body
const favoriteValidation = [
    body('productdID').isInt({ min: 1 }).withMessage('Product ID must be a positive integer').toInt(),
];

// Add favorite
router.post('/', isAuthenticated, favoriteValidation, async (req, res, next) => { // <-- Add validation middleware
    // --- Validation Check ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // --- End Validation Check ---

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        const productdID = req.body.productdID; // Use validated ID

        // Check if favorite exists
        const [existing] = await connection.query(
            'SELECT * FROM favorites WHERE userId = ? AND productdID = ?',
            [req.session.brukerId, productdID] // Use validated ID
        );

        if (existing.length > 0) {
            // Remove favorite if exists
            await connection.query(
                'DELETE FROM favorites WHERE userId = ? AND productdID = ?',
                [req.session.brukerId, productdID] // Use validated ID
            );
            res.json({ message: 'Removed from favorites' });
        } else {
            // Add new favorite
            await connection.query(
                'INSERT INTO favorites (userId, productdID) VALUES (?, ?)',
                [req.session.brukerId, productdID] // Use validated ID
            );
            res.status(201).json({ message: 'Added to favorites' });
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
});

// Remove favorite
// Note: Using DELETE with a body is unconventional. Consider using params: router.delete('/:productdID', ...)
router.delete('/', isAuthenticated, favoriteValidation, async (req, res, next) => { // <-- Add validation middleware
    // --- Validation Check ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // --- End Validation Check ---
    try {
        const productdID = req.body.productdID; // Use validated ID
        await pool.promise().query(
            'DELETE FROM favorites WHERE userId = ? AND productdID = ?',
            [req.session.brukerId, productdID] // Use validated ID
        );
        res.json({ message: 'Removed from favorites' });
    } catch (err) {
        next(err);
    }
});

// List favorites (No input validation needed here)
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const [favorites] = await pool.promise().query(
            `SELECT p.* FROM products p
             JOIN favorites f ON p.productdID = f.productdID
             WHERE f.userId = ?`,
            [req.session.brukerId]
        );
        res.json(favorites);
    } catch (err) {
        next(err);
    }
});

module.exports = router;