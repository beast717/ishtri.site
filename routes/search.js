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

        // Build the base query (FROM + WHERE) and parameters
        let baseQuery = `FROM products p 
        LEFT JOIN cities ci ON p.city_id = ci.cityid 
        LEFT JOIN properties pr ON p.productdID = pr.productdID
        LEFT JOIN cars c ON p.productdID = c.productdID
        LEFT JOIN jobs j ON p.productdID = j.productdID
        LEFT JOIN car_brands cb ON c.brand_id = cb.brand_id
        LEFT JOIN car_models cm ON c.model_id = cm.model_id
        WHERE 1=1`;
        const params = [];

        // Add search query filter - search in ProductName only for now
        if (query && query.trim()) {
            baseQuery += ` AND p.ProductName LIKE ?`;
            const searchTerm = `%${query.trim()}%`;
            params.push(searchTerm);
        }

        // Add country filter
        if (countries) {
            const countryList = countries.split(',').map(c => c.trim()).filter(c => c);
            if (countryList.length > 0) {
                const placeholders = countryList.map(() => '?').join(',');
                baseQuery += ` AND ci.country IN (${placeholders})`;
                params.push(...countryList);
            }
        }

        // Add city filter
        if (cities) {
            const cityList = cities.split(',').map(c => c.trim()).filter(c => c);
            if (cityList.length > 0) {
                const placeholders = cityList.map(() => '?').join(',');
                baseQuery += ` AND ci.cityid IN (${placeholders})`;
                params.push(...cityList);
            }
        }

        // Add subcategory filter
        if (subCategory) {
            baseQuery += ` AND p.SubCategory = ?`;
            params.push(subCategory);
        }

        // 1. Get total count using the base query
        const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
        const [countResult] = await pool.promise().query(countQuery, params);
        const totalCount = countResult[0].total;

        // 2. Build the main data query
        let sqlQuery = `SELECT p.*, ci.cityName, ci.country,
        pr.PropertyType, pr.SizeSqm,
        c.Year, c.Mileage,
        j.CompanyName, j.EmploymentType, j.JobTitle,
        cb.brand_name, cm.model_name
        ${baseQuery}`;

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
        
        // Create a new parameters array for the main query including limit and offset
        const queryParams = [...params, parseInt(limit), parseInt(offset)];

        const [results] = await pool.promise().query(sqlQuery, queryParams);
        
        res.json({
            products: results,
            query: query,
            total: totalCount
        });
        
    } catch (err) {
        console.error('Search API error:', err);
        next(err);
    }
});

module.exports = router;