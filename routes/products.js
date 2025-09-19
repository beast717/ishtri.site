// routes/products.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const upload = require('../config/upload');
const { body, query, param, validationResult, check } = require('express-validator'); // <-- Import validator functions

// --- Validation Chains ---

// GET /api/products (Query Params)
const getProductsValidation = [
    query('category').optional().trim().isIn(['Bil', 'Jobb', 'Eiendom', 'Torget', 'Båt', 'Mc', 'default', '']).withMessage('Invalid category specified'),
    query('subCategory').optional().trim(),
    query('carBrand').optional().trim(), // Further validation if needed (e.g., check if comma-separated numbers)
    query('countries').optional().trim(),
    query('cities').optional().trim(), // Further validation if needed (e.g., check if comma-separated numbers)
    query('sortPrice').optional().trim().isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Invalid sortPrice value'),
    query('sortDate').optional().trim().isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Invalid sortDate value'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be a number between 1 and 100').toInt(),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative number').toInt(),
    // Car specific
    query('yearFrom').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Invalid yearFrom value').toInt(),
    query('yearTo').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Invalid yearTo value').toInt()
        .custom((value, { req }) => !req.query.yearFrom || value >= req.query.yearFrom).withMessage('yearTo must be greater than or equal to yearFrom'),
    query('mileageFrom').optional().isInt({ min: 0 }).withMessage('Invalid mileageFrom value').toInt(),
    query('mileageTo').optional().isInt({ min: 0 }).withMessage('Invalid mileageTo value').toInt()
        .custom((value, { req }) => !req.query.mileageFrom || value >= req.query.mileageFrom).withMessage('mileageTo must be greater than or equal to mileageFrom'),
    query('fuelTypes').optional().trim(), // Could validate specific values if needed
    query('transmissionTypes').optional().trim(), // Could validate specific values if needed
    // Property specific
    query('propertyType').optional().trim(), // Could validate specific values if needed
    query('sizeSqmFrom').optional().isInt({ min: 0 }).withMessage('Invalid sizeSqmFrom value').toInt(),
    query('sizeSqmTo').optional().isInt({ min: 0 }).withMessage('Invalid sizeSqmTo value').toInt()
        .custom((value, { req }) => !req.query.sizeSqmFrom || value >= req.query.sizeSqmFrom).withMessage('sizeSqmTo must be greater than or equal to sizeSqmFrom'),
    query('numRoomsFrom').optional().isInt({ min: 0 }).withMessage('Invalid numRoomsFrom value').toInt(),
    query('numRoomsTo').optional().isInt({ min: 0 }).withMessage('Invalid numRoomsTo value').toInt()
        .custom((value, { req }) => !req.query.numRoomsFrom || value >= req.query.numRoomsFrom).withMessage('numRoomsTo must be greater than or equal to numRoomsFrom'),
    query('numBathroomsFrom').optional().isInt({ min: 0 }).withMessage('Invalid numBathroomsFrom value').toInt(),
    query('numBathroomsTo').optional().isInt({ min: 0 }).withMessage('Invalid numBathroomsTo value').toInt()
        .custom((value, { req }) => !req.query.numBathroomsFrom || value >= req.query.numBathroomsFrom).withMessage('numBathroomsTo must be greater than or equal to numBathroomsFrom'),
    query('energyClass').optional().trim(), // Could validate specific values if needed
];

// GET /api/products/:productId (URL Param)
const getProductByIdValidation = [
    param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer').toInt(),
];

// POST /api/products (Body) - More complex due to categories
const createProductValidation = [
    body('Category').trim().isIn(['Bil', 'Jobb', 'Eiendom', 'Torget', 'Båt', 'MC']).withMessage('Invalid category selected'),
    body('ProductName').trim().notEmpty().withMessage('Product name is required').isLength({ max: 255 }).withMessage('Product name too long'),
    body('Location').optional().trim().isLength({ max: 255 }).withMessage('Location too long'),
    body('City').trim().notEmpty().withMessage('City is required'),
    body('Country').trim().notEmpty().withMessage('Country is required'),
    body('Description').optional().trim(),
    body('SubCategori').optional().trim(),

    // --- Conditional Price Validation ---
    body().custom((value, { req }) => {
        const category = req.body.Category;
        const priceField = `${category}Price`; // e.g., 'BilPrice', 'JobbPrice'
        const price = req.body[priceField];

        // Price is generally optional, but if provided, must be numeric
        if (price !== undefined && price !== null && price !== '') {
            if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
                throw new Error(`Invalid ${category} Price specified. Must be a non-negative number.`);
            }
        }
        // For 'Jobb', Salary might be used instead or in addition, handle separately if needed
        return true;
    }),

    // --- Jobb Specific ---
    body('JobTitle').if(body('Category').equals('Jobb')).optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }),
    body('CompanyName').if(body('Category').equals('Jobb')).optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }),
    body('EmploymentType').if(body('Category').equals('Jobb')).optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
    body('Salary').if(body('Category').equals('Jobb')).optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }), // Could add numeric check if strictly numbers
    body('JobDescription').if(body('Category').equals('Jobb')).optional({ nullable: true, checkFalsy: true }).trim(),
    body('ApplicationDeadline').if(body('Category').equals('Jobb')).optional({ nullable: true, checkFalsy: true }).isISO8601().toDate().withMessage('Invalid date format for deadline'),
    body('ContactEmail').if(body('Category').equals('Jobb')).optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid contact email format').normalizeEmail(),

    // --- Bil Specific ---
    body('brand_id').if(body('Category').equals('Bil')).notEmpty().withMessage('Car brand is required').isInt({ min: 1 }).withMessage('Invalid car brand ID'),
    body('model_id').if(body('Category').equals('Bil')).notEmpty().withMessage('Car model is required').isInt({ min: 1 }).withMessage('Invalid car model ID'),
    body('Year').if(body('Category').equals('Bil')).optional({ nullable: true, checkFalsy: true }).isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Invalid car year'),
    body('Mileage').if(body('Category').equals('Bil')).optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Invalid car mileage'),
    body('FuelType').if(body('Category').equals('Bil')).optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
    body('Transmission').if(body('Category').equals('Bil')).optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),

    // --- Eiendom Specific ---
    body('PropertyType').if(body('Category').equals('Eiendom')).optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
    body('SizeSqm').if(body('Category').equals('Eiendom')).optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Invalid size (sqm)'),
    body('NumRooms').if(body('Category').equals('Eiendom')).optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Invalid number of rooms'),
    body('NumBathrooms').if(body('Category').equals('Eiendom')).optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Invalid number of bathrooms'),
    body('Amenities').if(body('Category').equals('Eiendom')).optional({ nullable: true, checkFalsy: true }).isArray().withMessage('Amenities must be an array'), // Check if it's an array before stringifying
    body('YearBuilt').if(body('Category').equals('Eiendom')).optional({ nullable: true, checkFalsy: true }).isInt({ min: 1500, max: new Date().getFullYear() + 1 }).withMessage('Invalid year built'),
    body('EnergyClass').if(body('Category').equals('Eiendom')).optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
];


// Get products with full filtering
router.get('/', getProductsValidation, async (req, res, next) => { // <-- Add validation middleware
    try {
        // --- Validation Check ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // --- End Validation Check ---

        let query = `
          SELECT 
            p.*,
             COALESCE(c.Year, '') AS Year,
            COALESCE(c.Mileage, '') AS Mileage,
            COALESCE(c.FuelType, '') AS FuelType,
            COALESCE(c.Transmission, '') AS Transmission,
            COALESCE(j.JobTitle, '') AS JobTitle,
            COALESCE(j.CompanyName, '') AS CompanyName,
            COALESCE(j.EmploymentType, '') AS EmploymentType,
            COALESCE(j.Salary, '') AS Salary,
            COALESCE(j.JobDescription, '') AS JobDescription,
            COALESCE(j.ApplicationDeadline, '') AS ApplicationDeadline,
            COALESCE(j.ContactEmail, '') AS ContactEmail,
            COALESCE(cb.brand_name, '') AS brand_name,
            COALESCE(cm.model_name, '') AS model_name,
            COALESCE(ci.cityName, p.Location) AS cityName,
            COALESCE(ci.country, '') AS country,
            COALESCE(pr.PropertyType, '') AS PropertyType,
            COALESCE(pr.SizeSqm, 0) AS SizeSqm,
            COALESCE(pr.NumRooms, 0) AS NumRooms,
            COALESCE(pr.NumBathrooms, 0) AS NumBathrooms,
            COALESCE(pr.Amenities, '[]') AS Amenities,
            COALESCE(pr.YearBuilt, '') AS YearBuilt,
            COALESCE(pr.EnergyClass, '') AS EnergyClass
            FROM products p
          LEFT JOIN properties pr ON p.productdID = pr.productdID
          LEFT JOIN jobs j ON p.productdID = j.productdID
          LEFT JOIN cars c ON p.productdID = c.productdID
          LEFT JOIN car_brands cb ON c.brand_id = cb.brand_id
          LEFT JOIN car_models cm ON c.model_id = cm.model_id
          LEFT JOIN cities ci ON p.city_id = ci.cityid
          WHERE 1=1
        `;

        const params = [];
        const { 
            category, 
            subCategory,
            carBrand,
            countries,
            cities,
            sortPrice,
            sortDate,
            limit = 20,
            offset = 0,
            yearFrom,
            yearTo,
            mileageFrom,
            mileageTo,
            fuelTypes,
            transmissionTypes,
            propertyType,
            sizeSqmFrom,
            sizeSqmTo,
            numRoomsFrom,
            numRoomsTo,
            numBathroomsFrom,
            numBathroomsTo,
            energyClass
        } = req.query;

        // Add filters
        if (category && category !== 'default') {
            query += ' AND p.category = ?';
            params.push(category);
        }

        // Property specific filters
        if (category === 'Eiendom') {
            // Property type filter
            if (propertyType) {
                const propertyTypes = propertyType.split(',').filter(type => type.trim());
                if (propertyTypes.length > 0) {
                    query += ` AND pr.PropertyType IN (${propertyTypes.map(() => '?').join(',')})`;
                    params.push(...propertyTypes);
                }
            }

            // Size range filter
            if (sizeSqmFrom) {
                query += ' AND COALESCE(pr.SizeSqm, 0) >= ?';
                params.push(sizeSqmFrom);
            }
            if (sizeSqmTo) {
                query += ' AND COALESCE(pr.SizeSqm, 0) <= ?';
                params.push(sizeSqmTo);
            }

            // Rooms range filter
            if (numRoomsFrom) {
                query += ' AND pr.NumRooms >= ?';
                params.push(numRoomsFrom);
            }
            if (numRoomsTo) {
                query += ' AND pr.NumRooms <= ?';
                params.push(numRoomsTo);
            }

            // Bathrooms range filter
            if (numBathroomsFrom) {
                query += ' AND pr.NumBathrooms >= ?';
                params.push(numBathroomsFrom);
            }
            if (numBathroomsTo) {
                query += ' AND pr.NumBathrooms <= ?';
                params.push(numBathroomsTo);
            }

            // Energy class filter
            if (energyClass) {
                const energyClasses = energyClass.split(',').filter(cls => cls.trim());
                if (energyClasses.length > 0) {
                    query += ` AND pr.EnergyClass IN (${energyClasses.map(() => '?').join(',')})`;
                    params.push(...energyClasses);
                }
            }
        }

        // Car specific filters
        if (category === 'Bil') {
            // Year range filter
            if (yearFrom) {
                query += ' AND c.Year >= ?';
                params.push(yearFrom);
            }
            if (yearTo) {
                query += ' AND c.Year <= ?';
                params.push(yearTo);
            }

            // Mileage range filter
            if (mileageFrom) {
                query += ' AND c.Mileage >= ?';
                params.push(mileageFrom);
            }
            if (mileageTo) {
                query += ' AND c.Mileage <= ?';
                params.push(mileageTo);
            }

            // Fuel type filter
            if (fuelTypes) {
                const fuelTypeArray = fuelTypes.split(',').filter(type => type.trim());
                if (fuelTypeArray.length > 0) {
                    query += ` AND c.FuelType IN (${fuelTypeArray.map(() => '?').join(',')})`;
                    params.push(...fuelTypeArray);
                }
            }

            // Transmission filter
            if (transmissionTypes) {
                const transmissionArray = transmissionTypes.split(',').filter(type => type.trim());
                if (transmissionArray.length > 0) {
                    query += ` AND c.Transmission IN (${transmissionArray.map(() => '?').join(',')})`;
                    params.push(...transmissionArray);
                }
            }
        }

        if (subCategory) {
            query += ' AND p.SubCategori = ?';
            params.push(subCategory);
        }

        if (carBrand) {
            const brands = carBrand.split(',').filter(b => b.trim());
            if (brands.length) {
                query += ` AND c.brand_id IN (${brands.map(() => '?').join(',')})`;
                params.push(...brands);
            }
        }

        if (countries && countries.trim() !== "") { // Add empty check
            const countryList = Array.isArray(countries) ? countries : countries.split(',');
            const validCountries = countryList.filter(c => c.trim() !== "");
            
            if (validCountries.length > 0) {
                // Use LOWER() for case-insensitive comparison
                query += ` AND LOWER(ci.country) IN (${validCountries.map(() => '?').join(',')})`; 
                // Convert parameters to lowercase
                params.push(...validCountries.map(c => c.trim().toLowerCase())); 
            }
        }

        if (cities) {
          const cityIDs = cities.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
          if (cityIDs.length) {
            query += ` AND p.city_id IN (${cityIDs.map(() => '?').join(',')})`;
            params.push(...cityIDs);
          }
        }
        // Sorting
        const order = [];
        if (sortPrice) order.push(`p.Price ${sortPrice.toUpperCase()}`);
        if (sortDate) order.push(`p.Date ${sortDate.toUpperCase()}`);
        if (order.length) {
            query += ` ORDER BY ${order.join(', ')}`;
        } else if (category === 'Eiendom') {
            // Default sorting for Eiendom if none selected
            query += ' ORDER BY p.Date DESC, p.Price ASC';
        }

        // Pagination
        const validLimit = parseInt(limit) || 20;
        const validOffset = parseInt(offset) || 0;
        query += ` LIMIT ${validLimit} OFFSET ${validOffset}`;

        // Execute query
        const [products] = await pool.promise().query(query, params);
        
        // Get total count - build a simpler count query using the same WHERE conditions
        let countQuery = `
            SELECT COUNT(DISTINCT p.productdID) AS total 
            FROM products p
            LEFT JOIN properties pr ON p.productdID = pr.productdID
            LEFT JOIN jobs j ON p.productdID = j.productdID
            LEFT JOIN cars c ON p.productdID = c.productdID
            LEFT JOIN car_brands cb ON c.brand_id = cb.brand_id
            LEFT JOIN car_models cm ON c.model_id = cm.model_id
            LEFT JOIN cities ci ON p.city_id = ci.cityid
            WHERE 1=1
        `;

        // Add the same filters as the main query (rebuild the WHERE clause)
        if (category && category !== 'default') {
            countQuery += ' AND p.category = ?';
        }

        // Property specific filters
        if (category === 'Eiendom') {
            if (propertyType) {
                const propertyTypes = propertyType.split(',').filter(type => type.trim());
                if (propertyTypes.length > 0) {
                    countQuery += ` AND pr.PropertyType IN (${propertyTypes.map(() => '?').join(',')})`;
                }
            }
            if (sizeSqmFrom) {
                countQuery += ' AND COALESCE(pr.SizeSqm, 0) >= ?';
            }
            if (sizeSqmTo) {
                countQuery += ' AND COALESCE(pr.SizeSqm, 0) <= ?';
            }
            if (numRoomsFrom) {
                countQuery += ' AND COALESCE(pr.NumRooms, 0) >= ?';
            }
            if (numRoomsTo) {
                countQuery += ' AND COALESCE(pr.NumRooms, 0) <= ?';
            }
            if (numBathroomsFrom) {
                countQuery += ' AND COALESCE(pr.NumBathrooms, 0) >= ?';
            }
            if (numBathroomsTo) {
                countQuery += ' AND COALESCE(pr.NumBathrooms, 0) <= ?';
            }
            if (energyClass) {
                const energyClasses = energyClass.split(',').filter(cls => cls.trim());
                if (energyClasses.length > 0) {
                    countQuery += ` AND pr.EnergyClass IN (${energyClasses.map(() => '?').join(',')})`;
                }
            }
        }

        // Car specific filters
        if (category === 'Bil') {
            if (yearFrom) {
                countQuery += ' AND COALESCE(c.Year, 0) >= ?';
            }
            if (yearTo) {
                countQuery += ' AND COALESCE(c.Year, 0) <= ?';
            }
            if (mileageFrom) {
                countQuery += ' AND c.Mileage >= ?';
            }
            if (mileageTo) {
                countQuery += ' AND c.Mileage <= ?';
            }
            if (fuelTypes) {
                const fuelTypeArray = fuelTypes.split(',').filter(type => type.trim());
                if (fuelTypeArray.length > 0) {
                    countQuery += ` AND c.FuelType IN (${fuelTypeArray.map(() => '?').join(',')})`;
                }
            }
            if (transmissionTypes) {
                const transmissionArray = transmissionTypes.split(',').filter(type => type.trim());
                if (transmissionArray.length > 0) {
                    countQuery += ` AND c.Transmission IN (${transmissionArray.map(() => '?').join(',')})`;
                }
            }
        }

        if (subCategory) {
            countQuery += ' AND p.SubCategori = ?';
        }

        if (carBrand) {
            const brands = carBrand.split(',').filter(b => b.trim());
            if (brands.length) {
                countQuery += ` AND c.brand_id IN (${brands.map(() => '?').join(',')})`;
            }
        }

        if (countries && countries.trim() !== "") {
            const countryList = Array.isArray(countries) ? countries : countries.split(',');
            const validCountries = countryList.filter(c => c.trim() !== "");
            
            if (validCountries.length > 0) {
                countQuery += ` AND LOWER(ci.country) IN (${validCountries.map(() => '?').join(',')})`;
            }
        }

        if (cities) {
            const cityIDs = cities.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (cityIDs.length) {
                countQuery += ` AND p.city_id IN (${cityIDs.map(() => '?').join(',')})`;
            }
        }

        // Execute count query with the same parameters
        const [totalResult] = await pool.promise().query(countQuery, params);
        
        res.json({
            total: totalResult[0].total,
            products: products.map(p => ({
                ...p,
                firstImage: p.Images ? `/img/480/${p.Images.split(',')[0].trim()}` : '/images/default.svg'
            }))
        });

    } catch (err) {
        next(err);
    }
});

// Get single product details
router.get('/:productId', getProductByIdValidation, async (req, res, next) => { // <-- Add validation middleware
    try {
        // --- Validation Check ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // --- End Validation Check ---

        const productId = req.params.productId; // Already validated and potentially sanitized (toInt)

        const [results] = await pool.promise().query(
            `SELECT p.*, j.*, c.*, pr.*, cb.brand_name, cm.model_name, p.Price,  p.Description, p.brukerId
             FROM products p
             LEFT JOIN jobs j ON p.productdID = j.productdID
             LEFT JOIN cars c ON p.productdID = c.productdID
             LEFT JOIN properties pr ON p.productdID = pr.productdID
             LEFT JOIN car_brands cb ON c.brand_id = cb.brand_id
             LEFT JOIN car_models cm ON c.model_id = cm.model_id
             WHERE p.productdID = ?`,
            [productId] // Use validated productId
        );

        if (!results.length) return res.status(404).send('Product not found');
        res.json(results[0]);
    } catch (err) {
        next(err);
    }
});

// Submit product (supports all categories)
// Note: upload.array() middleware runs before validation. File validation is handled by multer config.
router.post('/', upload.array('images', 5), createProductValidation, async (req, res, next) => { // <-- Add validation middleware
    // --- Validation Check ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation fails, especially after file uploads, consider deleting uploaded files
        // Or handle this more gracefully on the frontend before submitting
        if (req.files && req.files.length > 0) {
            // Basic cleanup attempt (consider more robust error handling/cleanup)
            const fs = require('fs').promises;
            const path = require('path');
            console.warn("Validation failed after file upload. Attempting cleanup...");
            req.files.forEach(file => {
                fs.unlink(path.join('uploads', file.filename)).catch(err => console.error("Error deleting uploaded file during validation failure:", err));
            });
        }
        return res.status(400).json({ errors: errors.array() }); // Send validation errors
    }
    // --- End Validation Check ---

    try {
        const { body, files, session } = req;
        const connection = await pool.promise().getConnection();

        await connection.beginTransaction();

        try {
            // 1. Get city_id from selected city and country
            const [cityResult] = await connection.query(
                'SELECT cityid FROM cities WHERE cityName = ? AND country = ?',
                [body.City, body.Country]
            );
            
            if (cityResult.length === 0) {
                throw new Error('Selected city not found in database');
            }
            
            const city_id = cityResult[0].cityid;
            
            const sanitizeSQL = (str) => {
              return String(str || '')
                .trim()
                .replace(/^,+/g, '') // Remove leading commas
                .replace(/,+$/g, '') // Remove trailing commas
                .replace(/'/g, "''") // Escape single quotes
                .replace(/\\/g, '\\\\'); // Escape backslashes
            };
            // 2. Build product data with city_id
            // Use validated and potentially sanitized body data
            const productData = {
              category: body.Category, // Validated
              ProductName: body.ProductName, // Validated & trimmed
              // Price needs careful handling due to dynamic field name
              Price: body[`${body.Category}Price`] ? parseFloat(body[`${body.Category}Price`]) : null, // Validated as numeric if present
              Location: body.Location, // Validated & trimmed
              city_id: city_id, // Fetched from DB
              Description: body.Description, // Validated & trimmed
              Images: files.length > 0
                ? files.map(f => f.filename).join(',')
                : 'default.svg',
              brukerId: session.brukerId, // Assumed valid from session
              Date: new Date(),
              SubCategori: body.SubCategori // Validated & trimmed
            };

            // Apostrophe check might be redundant if using parameterized queries correctly,
            // but kept for safety based on original code.
            if (productData.ProductName.includes("'")) {
              await connection.rollback();
              return res.status(400).send("Remove apostrophes from product name");
            }

            // 3. Insert into products table
            const [productResult] = await connection.query(
                `INSERT INTO products SET ?`, 
                productData
            );

            const productId = productResult.insertId;

            // Handle category-specific inserts using validated body data
            if (body.Category === 'Jobb') {
              await connection.query(
                `INSERT INTO jobs SET ?`, 
                {
                  productdID: productId,
                  JobTitle: body.JobTitle || null, // Use validated data
                  CompanyName: body.CompanyName || null,
                  EmploymentType: body.EmploymentType || null,
                  Salary: body.Salary || null,
                  JobDescription: body.JobDescription || null,
                  ApplicationDeadline: body.ApplicationDeadline || null, // Already validated as Date
                  ContactEmail: body.ContactEmail || null // Validated & normalized
                }
              );
            }

            if (body.Category === 'Bil') {
              const carData = {
                  productdID: productId,
                  brand_id: body.brand_id, // Validated as int
                  model_id: body.model_id, // Validated as int
                  Year: body.Year || null, // Validated as int
                  Mileage: body.Mileage || null, // Validated as int
                  FuelType: body.FuelType || null, // Validated
                  Transmission: body.Transmission || null // Validated
                };
              // No need to convert empty strings to NULL, validation handles optionality/types
              await connection.query(`INSERT INTO cars SET ?`, carData);
            }

            if (body.Category === 'Eiendom') {
              const propertyData = {
                productdID: productId,
                PropertyType: body.PropertyType || null, // Validated
                SizeSqm: body.SizeSqm ? parseInt(body.SizeSqm) : null, // Validated as int
                NumRooms: body.NumRooms ? parseInt(body.NumRooms) : null, // Validated as int
                NumBathrooms: body.NumBathrooms ? parseInt(body.NumBathrooms) : null, // Validated as int
                Amenities: Array.isArray(body.Amenities) ? JSON.stringify(body.Amenities) : '[]', // Validated as array
                YearBuilt: body.YearBuilt || null, // Validated as int
                EnergyClass: body.EnergyClass || null // Validated
              };
              await connection.query(`INSERT INTO properties SET ?`, propertyData);
            }

            await connection.commit();
            res.status(201).json({ success: true, productId: productId });

        } catch (error) {
            await connection.rollback();
            // Log the detailed error for debugging
            console.error("Error during product creation transaction:", error);
            // Send a generic error response or redirect to an error page
            // Avoid throwing the raw error directly to next() if possible,
            // unless the global error handler is designed for it.
             res.status(500).send('Failed to create product due to an internal error.');
            // throw error; // Re-throwing might trigger the outer catch block's next(err)
        } finally {
             if (connection) connection.release(); // Ensure connection is released
        }

    } catch (err) {
         // Handle multer errors specifically
        if (err instanceof require('multer').MulterError) { // Ensure multer is required if checking instanceof
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size exceeds 5MB limit' });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ message: 'Maximum 5 images allowed' });
            }
             // Handle other potential multer errors
             console.error("Multer Error:", err);
             return res.status(400).json({ message: `File upload error: ${err.message}` });
        }
        // Pass other errors to the global error handler
        console.error("Unhandled error in POST /api/products:", err); // Log unexpected errors
        next(err);
    }
});

module.exports = router;