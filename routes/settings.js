// routes/settings.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('./auth'); // Use your auth middleware

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
router.put('/email-preference', isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user?.brukerId || req.session.brukerId;
        const { enabled } = req.body; // Expecting { "enabled": true } or { "enabled": false }

        // Validate input
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ message: 'Invalid value for "enabled". Must be true or false.' });
        }

        const [result] = await pool.promise().query(
            'UPDATE brukere SET email_notifications_enabled = ? WHERE brukerId = ?',
            [enabled, userId]
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