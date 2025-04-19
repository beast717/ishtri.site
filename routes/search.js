// routes/products.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const upload = require('../config/upload');



// Example of the correct endpoint implementation
router.get('/', async (req, res, next) => {
    try{


    const { query, sortPrice, sortDate, countries } = req.query;

    let sqlQuery = "SELECT * FROM products WHERE ProductName LIKE ?";
    const params = [`%${query}%`];

    if (countries) {
        const countryList = countries.split(',');
        const placeholders = countryList.map(() => '?').join(',');
        sqlQuery += ` AND Country IN (${placeholders})`;
        params.push(...countryList);
    }

    const orderClauses = [];
    if (sortPrice) orderClauses.push(`Price ${sortPrice.toUpperCase()}`);
    if (sortDate) orderClauses.push(`COALESCE(Date, '1970-01-01') ${sortDate.toUpperCase()}`);
    if (orderClauses.length > 0) sqlQuery += ` ORDER BY ${orderClauses.join(', ')}`;

    pool.query(sqlQuery, params, (err, results) => {
        res.json(results);
    });
        
    } catch (err) {
        next(err);
    }
    
});

// Search Route
router.get('/search', (req, res) => {
    const searchQuery = req.query.query.trim();
    const sql = "SELECT * FROM products WHERE LOWER(ProductName) LIKE LOWER(?)";
    const values = [`%${searchQuery}%`];

    pool.query(sql, values, (err, results) => {
        if (err) return next(err);

        if (results.length > 0) {
            // Pass all matching products to a selection page
            res.render ('SearchResults');
        } else {
            return res.status(404).send("No products found.");
        }
    });
});

module.exports = router;