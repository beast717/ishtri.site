// services/backgroundMatcher.js

const pool = require('../config/db');
const { checkProductAgainstSavedSearches } = require('./matchingService');
const { createMatchNotification } = require('./notificationService');

let lastCheckTimestamp = null; // Consider persisting this (DB/file) for resilience

async function checkNewProductsForMatches(io, getActiveUsersMap) {
    const currentCheckTime = new Date();
    let productsToCheck = [];
    let latestProcessedProductTimestamp = lastCheckTimestamp; // Track the latest timestamp from processed products

    try {
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
            console.log(`BackgroundMatcher: Fetching products newer than ${lastCheckTimestamp.toISOString()}`);
        } else {
            console.log("BackgroundMatcher: First run or restart detected. Will process products created from now on.");
            // Initialize timestamp to current time so the *next* run picks up new items
            lastCheckTimestamp = currentCheckTime;
            // Potentially persist this initial timestamp immediately
            return; // Exit, nothing to check on the very first run
        }

    

        const [newProducts] = await pool.promise().query(query, params);
        productsToCheck = newProducts;

        if (productsToCheck.length > 0) {
             console.log(`BackgroundMatcher: Checking ${productsToCheck.length} new products.`);
             const activeUsers = getActiveUsersMap(); // Get current user map

             for (const product of productsToCheck) {
                console.log(`BackgroundMatcher: Processing Product ID ${product.productdID}, Date: ${product.Date}`);
                 // Match product against saved searches
                 const matches = await checkProductAgainstSavedSearches(product);

                 if (matches.length > 0) {
                     console.log(`BackgroundMatcher: Product ${product.productdID} matched ${matches.length} searches.`);
                     // Create notifications (pass io and activeUsers)
                     await Promise.all(matches.map(match =>
                        createMatchNotification(match.userId, match.searchName, product, io, activeUsers)
                     ));
                 }

                 // *** IMPROVED TIMESTAMP: Update tracker to this product's date ***
                 latestProcessedProductTimestamp = new Date(product.Date);
             } // End for loop

             // *** Update the main timestamp AFTER the loop finishes successfully ***
             lastCheckTimestamp = latestProcessedProductTimestamp;
             console.log(`BackgroundMatcher: Batch processed. Last product timestamp: ${lastCheckTimestamp.toISOString()}`);
             // Consider persisting lastCheckTimestamp here

         } else {
              console.log(`BackgroundMatcher: No new products found since last check.`);
              // Keep lastCheckTimestamp as is, no need to update to currentCheckTime
         }

    } catch (error) {
        console.error("Error during background matching process:", error);
        // Consider adding more specific error handling or alerting
    }
}

module.exports = { checkNewProductsForMatches };