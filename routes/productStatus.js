const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('./auth');

// Mark as sold
router.put('/sold/:productdID', isAuthenticated, async (req, res, next) => {
    try {
        const [result] = await pool.promise().query(
            `UPDATE products 
             SET Sold = TRUE 
             WHERE productdID = ? AND brukerId = ?`,
            [req.params.productdID, req.session.brukerId]
        );
        
        if (result.affectedRows === 0) throw new Error('Operation failed');
        res.json({ message: 'Marked as sold' });
    } catch (err) {
        next(err);
    }
});

// Mark as unsold
router.put('/unsold/:productdID', isAuthenticated, async (req, res, next) => {
    try {
        const [result] = await pool.promise().query(
            `UPDATE products 
             SET Sold = FALSE 
             WHERE productdID = ? AND brukerId = ?`,
            [req.params.productdID, req.session.brukerId]
        );
        
        if (result.affectedRows === 0) throw new Error('Operation failed');
        res.json({ message: 'Marked as unsold' });
    } catch (err) {
        next(err);
    }
});

// Delete product endpoint
router.delete('/delete-product/:id', async (req, res, next) => {
    const connection = await pool.promise().getConnection();
    
    try {
        await connection.beginTransaction();

        // 1. Delete from child tables first
        await connection.query(
            'DELETE FROM cars WHERE productdID = ?', 
            [req.params.id]
        );
        
        await connection.query(
            'DELETE FROM jobs WHERE productdID = ?', 
            [req.params.id]
        );

        // 2. Delete from main products table
        const [result] = await connection.query(
            'DELETE FROM products WHERE productdID = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }

        await connection.commit();
        res.json({ message: 'Product and related data deleted successfully' });

    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
});

module.exports = router;