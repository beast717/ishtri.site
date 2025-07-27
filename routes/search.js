// routes/search.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Search API endpoint - handles product search with filters
router.get('/', async (req, res, next) => {
    try {
        const { 
            query = '', 
            limit = 20, 
            offset = 0,
            sortPrice, 
            sortDate, 
            countries,
            cities,
            subCategory 
        } = req.query;

        // Start with a simple query first to test database connection
        let sqlQuery = `SELECT p.*, ci.cityName, ci.country FROM products p LEFT JOIN cities ci ON p.city_id = ci.cityid WHERE 1=1`;
        const params = [];

        // Add search query filter - search in ProductName only for now
        if (query && query.trim()) {
            sqlQuery += ` AND p.ProductName LIKE ?`;
            const searchTerm = `%${query.trim()}%`;
            params.push(searchTerm);
        }

        // Add country filter
        if (countries) {
            const countryList = countries.split(',').map(c => c.trim()).filter(c => c);
            if (countryList.length > 0) {
                const placeholders = countryList.map(() => '?').join(',');
                sqlQuery += ` AND ci.country IN (${placeholders})`;
                params.push(...countryList);
            }
        }

        // Add city filter
        if (cities) {
            const cityList = cities.split(',').map(c => c.trim()).filter(c => c);
            if (cityList.length > 0) {
                const placeholders = cityList.map(() => '?').join(',');
                sqlQuery += ` AND ci.cityid IN (${placeholders})`;
                params.push(...cityList);
            }
        }

        // Add subcategory filter
        if (subCategory) {
            sqlQuery += ` AND p.SubCategory = ?`;
            params.push(subCategory);
        }

        // Add sorting
        const orderClauses = [];
        if (sortPrice && ['asc', 'desc'].includes(sortPrice.toLowerCase())) {
            orderClauses.push(`p.Price ${sortPrice.toUpperCase()}`);
        }
        if (sortDate && ['asc', 'desc'].includes(sortDate.toLowerCase())) {
            orderClauses.push(`p.Date ${sortDate.toUpperCase()}`);
        }
        
        // Default sorting by date if no sort specified
        if (orderClauses.length === 0) {
            orderClauses.push('p.Date DESC');
        }
        
        sqlQuery += ` ORDER BY ${orderClauses.join(', ')}`;
        
        // Add pagination
        sqlQuery += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [results] = await pool.promise().query(sqlQuery, params);
        
        res.json({
            products: results,
            query: query,
            total: results.length
        });
        
    } catch (err) {
        console.error('Search API error:', err);
        next(err);
    }
});

module.exports = router;