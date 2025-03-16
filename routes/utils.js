const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/countries', async (req, res, next) => {
    try {
        const [results] = await pool.promise().query(`
            SELECT 
                c.country,
                GROUP_CONCAT(c.cityid) AS city_ids,
                GROUP_CONCAT(c.cityName) AS cities
            FROM cities c
            GROUP BY c.country
        `);

        // Transform to array format
        const transformed = results.map(row => ({
            country: row.country,
            city_ids: row.city_ids ? row.city_ids.split(',').map(Number) : [],
            cities: row.cities ? row.cities.split(',') : []
        }));

        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// Get countries
router.get('/countriess', async (req, res, next) => {
    try {
        const [countries] = await pool.promise().query(
            'SELECT DISTINCT country FROM cities ORDER BY country'
        );
        res.json(countries.map(c => c.country));
    } catch (err) {
        next(err);
    }
});

// Get cities by country
router.get('/cities/:country', async (req, res, next) => {
    try {
        const [cities] = await pool.promise().query(
            'SELECT cityName FROM cities WHERE country = ? ORDER BY cityName',
            [req.params.country]
        );
        res.json(cities.map(c => c.cityName));
    } catch (err) {
        next(err);
    }
});

// Random products
router.get('/random-products', async (req, res, next) => {
    try {
        const [results] = await pool.promise().query(
            `SELECT ProductdID, ProductName, Price, Images 
             FROM products 
             ORDER BY RAND() 
             LIMIT 5`
        );
        res.json(results);
    } catch (err) {
        next(err);
    }
});

// Get current user's products
router.get('/users', async (req, res, next) => {
    try {
        const [products] = await pool.promise().query(
            `SELECT * FROM products 
             WHERE brukerId = ? 
             ORDER BY Date DESC`,
            [req.session.brukerId]
        );
        
        res.json(products);
    } catch (err) {
        next(err);
    }
});

// Additional endpoints
router.get('/car-brands', async (req, res, next) => {
    try {
        const [brands] = await pool.promise().query(
            'SELECT brand_id, brand_name FROM car_brands ORDER BY brand_name'
        );
        res.json(brands);
    } catch (err) {
        next(err);
    }
});

router.get('/car-models/:brandId', async (req, res, next) => {
    try {
        const [models] = await pool.promise().query(
            'SELECT model_id, model_name FROM car_models WHERE brand_id = ?',
            [req.params.brandId]
        );
        res.json(models);
    } catch (err) {
        next(err);
    }
});

module.exports = router;