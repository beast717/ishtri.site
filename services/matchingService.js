// services/matchingService.js
const pool = require('../config/db'); // Adjust path if db.js is elsewhere relative to this file

async function checkProductAgainstSavedSearches(product) {
    const matches = [];
    // Ensure product and category are valid before proceeding
    if (!product || !product.category) {
         console.warn("Matching service called with invalid product data:", product);
         return matches; // Return empty array if product data is incomplete
    }


    try {
        // 1. Fetch relevant saved searches
        const [savedSearches] = await pool.promise().query(
            `SELECT search_id, user_id, search_name, filters, last_checked_at
             FROM saved_searches
             WHERE category = ?`,
            [product.category]
        );

        // 2. Iterate and compare
        for (const search of savedSearches) {
            // --- Background Job Check: Compare product date with last_checked_at ---
            // Uncomment this block if using the background job approach
            /*
            if (search.last_checked_at && product.Date && new Date(product.Date) <= new Date(search.last_checked_at)) {
                 // console.log(`Skipping product ${product.productdID} for search ${search.search_id} as it's not newer than last check.`);
                 continue; // Skip if product isn't new relative to this search's last check time
            }
            */
            // --- End Background Job Check ---

            let doesMatch = true; // Assume match initially
            let parsedFilters;
            try {
                // Also handle cases where filters might be null or undefined in the DB
                parsedFilters = search.filters ? JSON.parse(search.filters) : {};
            } catch (e) {
                console.error(`Error parsing filters JSON for search ${search.search_id}:`, search.filters, e);
                continue; // Skip this search if filters are malformed
            }

            // --- DETAILED FILTER COMPARISON LOGIC ---

            // Helper function for range checks
            const checkRange = (value, min, max) => {
                 if (min != null && value < min) return false; // Use != null to catch 0 correctly
                 if (max != null && value > max) return false;
                 return true;
             };

             // Helper function for array checks (case-insensitive for strings if needed)
             const checkArrayContains = (arrayToCheck, value) => {
                 if (!arrayToCheck || arrayToCheck.length === 0) return true; // No filter applied
                 // Optional: Case-insensitive check for strings
                 // if (typeof value === 'string') {
                 //     return arrayToCheck.some(item => String(item).toLowerCase() === value.toLowerCase());
                 // }
                 return arrayToCheck.map(String).includes(String(value)); // Ensure type consistency
             };


            // Generic Filters (applied if present in parsedFilters)
             if (parsedFilters.price_min != null || parsedFilters.price_max != null) {
                 if (!checkRange(product.Price, parsedFilters.price_min, parsedFilters.price_max)) doesMatch = false;
             }
             if (doesMatch && parsedFilters.countries?.length > 0) {
                 // Assuming product has 'country' property
                 if (!product.country || !checkArrayContains(parsedFilters.countries, product.country)) doesMatch = false;
             }
             if (doesMatch && parsedFilters.cities?.length > 0) {
                  // Assuming product has 'city_id' property
                 if (product.city_id == null || !checkArrayContains(parsedFilters.cities, product.city_id)) doesMatch = false;
             }


            // Category Specific Filters
            if (doesMatch) {
                switch (product.category) {
                    case 'Torget':
                        if (parsedFilters.subCategory && product.SubCategori !== parsedFilters.subCategory) doesMatch = false;
                        break;

                    case 'Bil':
                        // Use checkRange helper
                         if (!checkRange(product.Year, parsedFilters.year_from, parsedFilters.year_to)) doesMatch = false;
                         if (doesMatch && !checkRange(product.Mileage, parsedFilters.mileage_from, parsedFilters.mileage_to)) doesMatch = false;
                         // Use checkArrayContains helper
                         if (doesMatch && !checkArrayContains(parsedFilters.fuel_types, product.FuelType)) doesMatch = false;
                         if (doesMatch && !checkArrayContains(parsedFilters.transmission_types, product.Transmission)) doesMatch = false;
                         if (doesMatch && !checkArrayContains(parsedFilters.car_brands, product.brand_id)) doesMatch = false;
                        break;

                    case 'Eiendom':
                         if (!checkArrayContains(parsedFilters.property_types, product.PropertyType)) doesMatch = false;
                         if (doesMatch && !checkRange(product.SizeSqm, parsedFilters.size_sqm_from, parsedFilters.size_sqm_to)) doesMatch = false;
                         if (doesMatch && !checkRange(product.NumRooms, parsedFilters.num_rooms_from, parsedFilters.num_rooms_to)) doesMatch = false;
                         if (doesMatch && !checkRange(product.NumBathrooms, parsedFilters.num_bathrooms_from, parsedFilters.num_bathrooms_to)) doesMatch = false;
                         if (doesMatch && !checkArrayContains(parsedFilters.energy_classes, product.EnergyClass)) doesMatch = false;
                        break;

                    case 'Jobb':
                         if (!checkArrayContains(parsedFilters.employment_types, product.EmploymentType)) doesMatch = false;
                         // Note: Salary range might need specific parsing if stored as text
                         // if (doesMatch && parsedFilters.salary_from != null || parsedFilters.salary_to != null) { ... }
                         // Deadline check needs date comparison
                         // if (doesMatch && parsedFilters.deadline && product.ApplicationDeadline > parsedFilters.deadline) doesMatch = false;
                        break;

                    // Add cases for 'Båt', 'MC' if they have specific filters
                }
            }
            // --- END OF FILTER COMPARISON ---

            if (doesMatch) {
                matches.push({
                    userId: search.user_id,
                    searchName: search.search_name,
                    productId: product.productdID, // Ensure product object has the correct ID field
                    searchId: search.search_id // Include searchId for potential updates later
                });
            }
        }
    } catch (error) {
        console.error("Error checking product against saved searches:", error);
        // Depending on severity, might want to re-throw or just log
    }

    return matches;
}

module.exports = { checkProductAgainstSavedSearches };