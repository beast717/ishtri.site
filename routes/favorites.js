const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('./auth');

// Add favorite
router.post('/', isAuthenticated, async (req, res, next) => {
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // Check if favorite exists
        const [existing] = await connection.query(
            'SELECT * FROM favorites WHERE userId = ? AND productdID = ?',
            [req.session.brukerId, req.body.productdID]
        );

        if (existing.length > 0) {
            // Remove favorite if exists
            await connection.query(
                'DELETE FROM favorites WHERE userId = ? AND productdID = ?',
                [req.session.brukerId, req.body.productdID]
            );
            res.json({ message: 'Removed from favorites' });
        } else {
            // Add new favorite
            await connection.query(
                'INSERT INTO favorites (userId, productdID) VALUES (?, ?)',
                [req.session.brukerId, req.body.productdID]
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
router.delete('/', isAuthenticated, async (req, res, next) => {
    try {
        await pool.promise().query(
            'DELETE FROM favorites WHERE userId = ? AND productdID = ?',
            [req.session.brukerId, req.body.productdID]
        );
        res.json({ message: 'Removed from favorites' });
    } catch (err) {
        next(err);
    }
});

// List favorites
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