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
                query += ' AND pr.SizeSqm >= ?';
                params.push(sizeSqmFrom);
            }
            if (sizeSqmTo) {
                query += ' AND pr.SizeSqm <= ?';
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
                query += ` AND ci.country IN (${validCountries.map(() => '?').join(',')})`;
                params.push(...validCountries.map(c => c.trim()));
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
        if (order.length) query += ` ORDER BY ${order.join(', ')}`;

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
                  .split('ORDER BY')[0]  // Remove sorting
                  .split('LIMIT')[0]     // Remove pagination
                : ''
              }
            `.replace('1=1', ''); // Remove redundant 1=1 if present

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
              ProductName: sanitizeSQL(body.ProductName) || 'Unnamed Vehicle',
              Price: parseFloat(String(body.Price).replace(/,/g, '')) || null,
              Location: sanitizeSQL(body.Location) || 'Location not specified',
              city_id: city_id,
              Description: sanitizeSQL(body.Description) || 'No description provided',
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

            if (productData.Location.length < 2) {
              await connection.rollback();
              return res.status(400).send("Location must be at least 2 characters");
            }

            // Inside the POST route handler (products.js):
            if (body.Category !== 'Jobb') { 
              let priceInput;
              switch (body.Category) {
                case 'Torget':
                  priceInput = body.TorgetPrice;
                  break;
                case 'Eiendom':
                  priceInput = body.PropertyPrice;
                  break;
                case 'Bil':
                  priceInput = body.CarPrice;
                  break;
                default:
                  priceInput = body.Price;
              }

              // Debugging: Log the received price input
              console.log('Price Input:', priceInput);

              if (!priceInput) {
                await connection.rollback();
                return res.status(400).send('Price field is required');
              }

              let parsedPrice;
              try {
                // Remove all non-numeric characters except periods
                const cleanedPrice = String(priceInput)
                  .replace(/,/g, '') // Remove commas first
                  .replace(/[^\d.]/g, ''); // Remove non-digits/non-periods

                parsedPrice = parseFloat(cleanedPrice);

                if (isNaN(parsedPrice)) {
                  throw new Error('Invalid price');
                }
              } catch (error) {
                await connection.rollback();
                return res.status(400).send('Invalid price format. Use numbers only (e.g., 1500000)');
              }

              productData.Price = parsedPrice;

            } else {
              productData.Price = null; // Explicitly set to null for jobs
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
                    `INSERT INTO jobs SET ?`, {
                        productdID: productId,
                        JobTitle: body.JobTitle,
                        CompanyName: body.CompanyName,
                        EmploymentType: body.EmploymentType,
                        Salary: body.Salary,
                        ApplicationDeadline: body.ApplicationDeadline,
                        ContactEmail: body.ContactEmail,
                        JobDescription: body.JobDescription
                    }
                );
            }

            if (body.Category === 'Bil') {
              const carData = {
                  productdID: productId,
                  brand_id: body.brand_id,
                  model_id: body.model_id,
                  Year: body.Year,         
                  Mileage: body.Mileage,   
                  FuelType: body.FuelType, 
                  Transmission: body.Transmission
                };

              await connection.query(`INSERT INTO cars SET ?`, carData);
            }

            if (body.Category === 'Eiendom') {
              const propertyData = {
                productdID: productId,
                PropertyType: body.PropertyType,
                SizeSqm: body.SizeSqm,
                NumRooms: body.NumRooms,
                NumBathrooms: body.NumBathrooms,
                Amenities: Array.isArray(body.Amenities) ? 
               JSON.stringify(body.Amenities) : 
               '[]',
                YearBuilt: body.YearBuilt,
                EnergyClass: body.EnergyClass
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
        next(err);
    }
});

module.exports = router;