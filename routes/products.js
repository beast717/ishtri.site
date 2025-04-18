// routes/products.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const upload = require('../config/upload');

// Get products with full filtering
router.get('/', async (req, res, next) => {
    try {
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
        
        // Get total count
        const whereClause = query.includes('WHERE') 
        ? query.split('WHERE')[1].split('ORDER BY')[0].split('LIMIT')[0] 
        : '';

        const countQuery = `
            SELECT COUNT(DISTINCT p.productdID) AS total 
            FROM products p
            LEFT JOIN properties pr ON p.productdID = pr.productdID
            LEFT JOIN jobs j ON p.productdID = j.productdID
            LEFT JOIN cars c ON p.productdID = c.productdID
            LEFT JOIN car_brands cb ON c.brand_id = cb.brand_id
            LEFT JOIN car_models cm ON c.model_id = cm.model_id
            LEFT JOIN cities ci ON p.city_id = ci.cityid
            ${query.includes('WHERE') ? 
                query.split('WHERE')[1]
                    .split('ORDER BY')[0]  
                    .split('LIMIT')[0]     
                : ''
            }
        `.replace('1=1', '');

            // Execute with original params
            const [totalResult] = await pool.promise().query(
              `SELECT COUNT(*) AS total FROM (${countQuery}) AS subquery`, 
              params
            );
        
        res.json({
            total: totalResult[0].total,
            products: products.map(p => ({
                ...p,
                firstImage: p.Images ? `/uploads/${p.Images.split(',')[0].trim()}` : '/uploads/default-placeholder.png'
            }))
        });

    } catch (err) {
        next(err);
    }
});

// Get single product details
router.get('/:productId', async (req, res, next) => {
    try {
        const [results] = await pool.promise().query(
            `SELECT p.*, j.*, c.*, pr.*, cb.brand_name, cm.model_name, p.Price,  p.Description, p.brukerId
             FROM products p
             LEFT JOIN jobs j ON p.productdID = j.productdID
             LEFT JOIN cars c ON p.productdID = c.productdID
             LEFT JOIN properties pr ON p.productdID = pr.productdID
             LEFT JOIN car_brands cb ON c.brand_id = cb.brand_id
             LEFT JOIN car_models cm ON c.model_id = cm.model_id
             WHERE p.productdID = ?`,
            [req.params.productId]
        );
        
        if (!results.length) return res.status(404).send('Product not found');
        res.json(results[0]);
    } catch (err) {
        next(err);
    }
});

// Submit product (supports all categories)
router.post('/', upload.array('images', 5), async (req, res, next) => {
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
            const productData = {
              category: body.Category,
              ProductName: sanitizeSQL(body.ProductName) || 'Untitled Listing',
              Price: body[`${body.Category}Price`] ? parseFloat(body[`${body.Category}Price`]) : null,
              Location: sanitizeSQL(body.Location) || null,
              city_id: city_id,
              Description: sanitizeSQL(body.Description) || null,
              Images: files.length > 0 
                ? files.map(f => f.filename).join(',') 
                : 'default.jpg',
              brukerId: session.brukerId,
              Date: new Date(),
              SubCategori: body.SubCategori || null
            };

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

            // Handle category-specific inserts
            if (body.Category === 'Jobb') {
              await connection.query(
                `INSERT INTO jobs SET ?`, 
                {
                  productdID: productId,
                  JobTitle: body.JobTitle || null, // Allow NULL
                  CompanyName: body.CompanyName || null,
                  EmploymentType: body.EmploymentType || null,
                  Salary: body.Salary || null,
                  JobDescription: body.JobDescription || null,
                  ApplicationDeadline: body.ApplicationDeadline || null,
                  ContactEmail: body.ContactEmail || null
                }
              );
            }

            if (body.Category === 'Bil') {
              const carData = {
                  productdID: productId,
                  brand_id: body.brand_id || null,
                  model_id: body.model_id || null,
                  Year: body.Year || null,         
                  Mileage: body.Mileage || null,  
                  FuelType: body.FuelType || null,
                  Transmission: body.Transmission || null
                };

                // Convert empty strings to NULL for numeric fields
              if (carData.Year === '') carData.Year = null;
              if (carData.Mileage === '') carData.Mileage = null;

              await connection.query(`INSERT INTO cars SET ?`, carData);
            }

            if (body.Category === 'Eiendom') {
              const propertyData = {
                productdID: productId,
                PropertyType: body.PropertyType || null, // Convert empty string to NULL
                SizeSqm: body.SizeSqm ? parseInt(body.SizeSqm) : null,
                NumRooms: body.NumRooms ? parseInt(body.NumRooms) : null,
                NumBathrooms: body.NumBathrooms ? parseInt(body.NumBathrooms) : null,
                Amenities: Array.isArray(body.Amenities) ? JSON.stringify(body.Amenities) : '[]',
                YearBuilt: body.YearBuilt || null,
                EnergyClass: body.EnergyClass || null
              };

              await connection.query(`INSERT INTO properties SET ?`, propertyData);
            }

            await connection.commit();
            res.redirect('/mine-annonser');

        } catch (error) {
            await connection.rollback();
            throw error;
        }

    } catch (err) {
         // Handle multer errors
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File size exceeds 5MB limit' });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ message: 'Maximum 5 images allowed' });
            }
        }
        next(err);
    }
});

module.exports = router;