// services/backgroundMatcher.js

const pool = require('../config/db');
const { checkProductAgainstSavedSearches } = require('./matchingService');
const { createMatchNotification } = require('./notificationService');

// Store last check timestamp in database instead of memory
async function getLastCheckTimestamp() {
    try {
        const [result] = await pool.promise().query(
            `SELECT value FROM system_settings WHERE setting_key = 'last_matcher_check' LIMIT 1`
        );
        return result.length > 0 ? new Date(result[0].value) : null;
    } catch (error) {
        // If table doesn't exist or other error, return null
        if (process.env.NODE_ENV === 'development') {
            console.warn('Could not retrieve last check timestamp:', error.message);
        }
        return null;
    }
}

async function setLastCheckTimestamp(timestamp) {
    try {
        await pool.promise().query(
            `INSERT INTO system_settings (setting_key, value) VALUES ('last_matcher_check', ?) 
             ON DUPLICATE KEY UPDATE value = ?`,
            [timestamp.toISOString(), timestamp.toISOString()]
        );
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('Could not save last check timestamp:', error.message);
        }
    }
}

async function checkNewProductsForMatches(io, getActiveUsersMap) {
    const currentCheckTime = new Date();
    let productsToCheck = [];
    let latestProcessedProductTimestamp = null;

    try {
        // Get the last check timestamp from database
        const lastCheckTimestamp = await getLastCheckTimestamp();
        
        // Construct the base query with necessary JOINs
        let query = `
            SELECT p.*, -- Select all needed fields from products
                   c.Year, c.Mileage, c.FuelType, c.Transmission, c.brand_id, c.model_id, -- Car details
                   pr.PropertyType, pr.SizeSqm, pr.NumRooms, pr.NumBathrooms, pr.YearBuilt, pr.EnergyClass, -- Property details
                   j.EmploymentType, -- Job details etc.
                   ci.country, ci.cityName -- *** ADDED city info JOIN ***
            FROM products p
            LEFT JOIN cars c ON p.productdID = c.productdID AND p.category = 'Bil'
            LEFT JOIN properties pr ON p.productdID = pr.productdID AND p.category = 'Eiendom'
            LEFT JOIN jobs j ON p.productdID = j.productdID AND p.category = 'Jobb'
            LEFT JOIN cities ci ON p.city_id = ci.cityid -- *** ADDED JOIN ***
        `;
        const params = [];

        // Fetch products created since the last successful check point
         if (lastCheckTimestamp) {
            query += ` WHERE p.Date > ? ORDER BY p.Date ASC`; // Process oldest first within the batch
            params.push(lastCheckTimestamp);
        } else {
            // On first run, check products from the last 24 hours to catch any existing matches
            const twentyFourHoursAgo = new Date(currentCheckTime.getTime() - 24 * 60 * 60 * 1000);
            query += ` WHERE p.Date > ? ORDER BY p.Date ASC`;
            params.push(twentyFourHoursAgo);
        }

    

        const [newProducts] = await pool.promise().query(query, params);
        productsToCheck = newProducts;

        if (productsToCheck.length > 0) {
             const activeUsers = getActiveUsersMap(); // Get current user map

             for (const product of productsToCheck) {
                 // Match product against saved searches
                 const matches = await checkProductAgainstSavedSearches(product);

                 if (matches.length > 0) {
                     // Create notifications (pass io and activeUsers)
                     await Promise.all(matches.map(match =>
                        createMatchNotification(match.userId, match.searchName, product, io, activeUsers)
                     ));
                 }

                 // *** IMPROVED TIMESTAMP: Update tracker to this product's date ***
                 latestProcessedProductTimestamp = new Date(product.Date);
             } // End for loop

             // *** Update the main timestamp AFTER the loop finishes successfully ***
             if (latestProcessedProductTimestamp) {
                 await setLastCheckTimestamp(latestProcessedProductTimestamp);
             }

         } else {
              // Keep lastCheckTimestamp as is, no need to update to currentCheckTime
         }

    } catch (error) {
        console.error("Error during background matching process:", error);
        // Consider adding more specific error handling or alerting
    }
}

module.exports = { checkNewProductsForMatches };