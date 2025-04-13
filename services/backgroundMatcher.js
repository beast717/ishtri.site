// services/backgroundMatcher.js (New file)
const pool = require('../config/db');
const { checkProductAgainstSavedSearches } = require('./matchingService');
const { createMatchNotification } = require('./notificationService');

let lastCheckTimestamp = null; // In-memory store (better: use DB or file)

async function checkNewProductsForMatches(io, getActiveUsersMap) { // Accept io instance
    const currentCheckTime = new Date();
    let productsToCheck = [];

    try {
        // Fetch products created since the last check
        if (lastCheckTimestamp) {
            const [newProducts] = await pool.promise().query(
                `SELECT p.*, -- Select all needed fields from products AND joined tables
                       c.Year, c.Mileage, c.FuelType, c.Transmission, c.brand_id, c.model_id, -- Car details
                       pr.PropertyType, pr.SizeSqm, pr.NumRooms, pr.NumBathrooms, pr.YearBuilt, pr.EnergyClass, -- Property details
                       j.EmploymentType -- Job details etc.
                FROM products p
                LEFT JOIN cars c ON p.productdID = c.productdID AND p.category = 'Bil'
                LEFT JOIN properties pr ON p.productdID = pr.productdID AND p.category = 'Eiendom'
                LEFT JOIN jobs j ON p.productdID = j.productdID AND p.category = 'Jobb'
                -- Join other tables if needed
                WHERE p.Date > ?`, // Use product creation date
                [lastCheckTimestamp]
            );
            productsToCheck = newProducts;
        } else {
            // First run or restart: maybe check products from the last hour? Or skip?
            // Or fetch the timestamp of the latest checked notification?
            console.log("First run or restart, skipping initial check or define starting point.");
            // For now, we'll just process future products after the first successful run.
        }

        console.log(`Checking ${productsToCheck.length} new products against saved searches.`);
           const activeUsers = getActiveUsersMap();

        for (const product of productsToCheck) {
             // Fetch additional details if needed (like country, brand name etc.) based on IDs
             // Example: Fetch country from city_id if not joined above
             // Example: Fetch brand/model names if not joined above

            const matches = await checkProductAgainstSavedSearches(product);
            if (matches.length > 0) {
                 // Pass 'io' to the notification service
                await Promise.all(matches.map(match =>
                   createMatchNotification(match.userId, match.searchName, product, io, activeUsers)
                ));
            }
        }

        // Update last check time *after* processing
        lastCheckTimestamp = currentCheckTime;
        console.log(`Updated lastCheckTimestamp to: ${lastCheckTimestamp.toISOString()}`);

    } catch (error) {
        console.error("Error during background matching process:", error);
    }
}

module.exports = { checkNewProductsForMatches };