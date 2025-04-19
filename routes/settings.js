// routes/settings.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('./auth'); // Use your auth middleware
const { body, validationResult } = require('express-validator'); // <-- Import validator functions

// --- Validation Chain ---
const updateEmailPrefValidation = [
    body('enabled').isBoolean().withMessage('Invalid value for "enabled". Must be true or false.'),
];

// GET current email notification preference
router.get('/email-preference', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        const [results] = await pool.promise().query(
            'SELECT email_notifications_enabled FROM brukere WHERE brukerId = ?',
            [userId]
        );

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ enabled: !!results[0].email_notifications_enabled }); // Return boolean

    } catch (error) {
        console.error("Error fetching email preference:", error);
        next(error);
    }
});

// PUT update email notification preference
router.put('/email-preference', isAuthenticated, updateEmailPrefValidation, async (req, res, next) => { // <-- Add validation middleware
    // --- Validation Check ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Use the message from the validator
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    // --- End Validation Check ---

    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        const { enabled } = req.body; // Use validated data

        // Validation handled by express-validator

        const [result] = await pool.promise().query(
            'UPDATE brukere SET email_notifications_enabled = ? WHERE brukerId = ?',
            [enabled, userId] // Use validated boolean
        );

        if (result.affectedRows === 0) {
             return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'Email notification preference updated successfully.' });

    } catch (error) {
        console.error("Error updating email preference:", error);
        next(error);
    }
});

module.exports = router;