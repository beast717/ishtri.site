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
router.post('/', isAuthenticated, favoriteValidation, async (req, res, next) => {
    // Validation Check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        const productdID = req.body.productdID;

        // Check if favorite exists (fix case sensitivity)
        const [existing] = await connection.query(
            'SELECT * FROM favorites WHERE userId = ? AND productdID = ?',
            [req.session.brukerId, productdID]
        );

        if (existing.length > 0) {
            // Remove favorite if exists
            await connection.query(
                'DELETE FROM favorites WHERE userId = ? AND productdID = ?',
                [req.session.brukerId, productdID]
            );
            await connection.commit();
            res.json({ message: 'Removed from favorites' });
        } else {
            // Add new favorite
            const [insertResult] = await connection.query(
                'INSERT INTO favorites (userId, productdID) VALUES (?, ?)',
                [req.session.brukerId, productdID]
            );
            await connection.commit();
            res.status(201).json({ message: 'Added to favorites' });
        }

    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
});

// Remove favorite
router.delete('/', isAuthenticated, favoriteValidation, async (req, res, next) => {
    // Validation Check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const productdID = req.body.productdID;
        await pool.promise().query(
            'DELETE FROM favorites WHERE userId = ? AND productdID = ?',
            [req.session.brukerId, productdID]
        );
        res.json({ message: 'Removed from favorites' });
    } catch (err) {
        next(err);
    }
});

// List favorites
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        // Get favorites with all required JOINs for all categories
        const [favorites] = await pool.promise().query(
            `SELECT p.ProductdID, p.ProductName, p.Price, p.Location, p.Description, 
                    p.Images, p.brukerId, p.category, p.Date, p.SubCategori, p.Sold,
                    COALESCE(cb.brand_name, '') AS brand_name,
                    COALESCE(cm.model_name, '') AS model_name,
                    COALESCE(c.Year, '') AS Year,
                    COALESCE(c.Mileage, 0) AS Mileage,
                    COALESCE(ci.cityName, p.Location) AS cityName,
                    COALESCE(ci.country, '') AS country,
                    COALESCE(pr.PropertyType, '') AS PropertyType,
                    COALESCE(pr.SizeSqm, 0) AS SizeSqm,
                    COALESCE(j.CompanyName, '') AS CompanyName,
                    COALESCE(j.EmploymentType, '') AS EmploymentType,
                    COALESCE(j.JobTitle, '') AS JobTitle
             FROM products p
             INNER JOIN favorites f ON p.ProductdID = f.productdID
             LEFT JOIN cars c ON p.productdID = c.productdID
             LEFT JOIN car_brands cb ON c.brand_id = cb.brand_id
             LEFT JOIN car_models cm ON c.model_id = cm.model_id
             LEFT JOIN properties pr ON p.productdID = pr.productdID
             LEFT JOIN jobs j ON p.productdID = j.productdID
             LEFT JOIN cities ci ON p.city_id = ci.cityid
             WHERE f.userId = ?
             ORDER BY p.Date DESC`,
            [req.session.brukerId]
        );
        
        res.json(favorites);
    } catch (err) {
        next(err);
    }
});

module.exports = router;