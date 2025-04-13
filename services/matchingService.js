// services/matchingService.js
const pool = require('../config/db');

async function checkProductAgainstSavedSearches(product) {
    const matches = [];
    if (!product || !product.category) {
        return matches;
    }

    try {
        const [savedSearches] = await pool.promise().query(
            `SELECT search_id, user_id, search_name, filters
             FROM saved_searches
             WHERE category = ?`,
            [product.category]
        );

        for (const search of savedSearches) {
            let doesMatch = true;
            let parsedFilters; // Declare here

            // *** START: ROBUST PARSING LOGIC ***
            try {

                if (typeof search.filters === 'string') {
                    // It's a string, attempt to parse
                    parsedFilters = search.filters ? JSON.parse(search.filters) : {};
             
                } else if (typeof search.filters === 'object' && search.filters !== null) {
                    // It's already an object, use it directly
                    parsedFilters = search.filters;
                  
                } else {
                    // Handle null, undefined, or other unexpected types
                    
                    parsedFilters = {};
                }

                // Check if filters object is empty after potential parsing/assignment
                if (Object.keys(parsedFilters).length === 0) {
                     
                     continue; // Skip this search if no filters are defined
                }

            } catch (e) {
                 // This catch block now specifically handles errors from JSON.parse if input was a malformed *string*
                 console.error(`  ERROR parsing filters JSON STRING for search ${search.search_id}:`, search.filters, e);
                 continue; // Skip this search if JSON string parsing failed
            }

            // --- FILTER COMPARISON LOGIC ---

            const checkRange = (prodVal, rangeFilter) => {
                // Check if rangeFilter exists and has from/to properties
                if (!rangeFilter) return true; // No range filter applied
                const filterMin = rangeFilter.from;
                const filterMax = rangeFilter.to;
                // Convert product value to number for comparison if needed, handle nulls
                const numericProdVal = prodVal != null ? Number(prodVal) : null;
                if (numericProdVal === null) return false; // Product doesn't have the value to compare

                if (filterMin != null && numericProdVal < Number(filterMin)) return false;
                if (filterMax != null && numericProdVal > Number(filterMax)) return false;
                return true;
            };

            const checkArrayContains = (filterArray, prodVal) => {
                if (!filterArray || filterArray.length === 0) return true; // No filter applied
                if (prodVal == null) return false; // Product doesn't have the value
                return filterArray.map(String).includes(String(prodVal)); // Compare as strings
            };

            // --- Apply Filters ---

            // Generic Filters (Check if they exist in parsedFilters first!)
            if (parsedFilters.countries && parsedFilters.countries.length > 0) {
                // product.country should now be available from the JOIN in backgroundMatcher
                if (!product.country || !checkArrayContains(parsedFilters.countries, product.country)) doesMatch = false;
            }
            if (doesMatch && parsedFilters.cities && parsedFilters.cities.length > 0) {
                if (product.city_id == null || !checkArrayContains(parsedFilters.cities, product.city_id)) doesMatch = false;
            }
             // Add Price check if you save price ranges
             // if (doesMatch && parsedFilters.priceRange) {
             //    if (!checkRange(product.Price, parsedFilters.priceRange)) doesMatch = false;
             // }


            // Category Specific Filters
            if (doesMatch) {
                switch (product.category) {
                    case 'Torget':
                        if (parsedFilters.subCategory && product.SubCategori !== parsedFilters.subCategory) doesMatch = false;
                        break;

                    case 'Bil':
                        // *** USE CORRECT KEYS FROM SAVED FILTERS ***
                        if (!checkRange(product.Year, parsedFilters.yearRange)) doesMatch = false; // Use yearRange directly
                        if (doesMatch && !checkRange(product.Mileage, parsedFilters.mileageRange)) doesMatch = false; // Use mileageRange directly
                        if (doesMatch && !checkArrayContains(parsedFilters.fuel_types, product.FuelType)) doesMatch = false; // Use fuel_types
                        if (doesMatch && !checkArrayContains(parsedFilters.transmission_types, product.Transmission)) doesMatch = false; // Use transmission_types
                        if (doesMatch && !checkArrayContains(parsedFilters.car_brands, product.brand_id)) doesMatch = false; // Use car_brands
                        break;

                    case 'Eiendom':
                         // *** USE CORRECT KEYS FROM SAVED FILTERS ***
                         if (!checkArrayContains(parsedFilters.property_types, product.PropertyType)) doesMatch = false; // Use property_types
                         if (doesMatch && !checkRange(product.SizeSqm, parsedFilters.sizeRange)) doesMatch = false; // Use sizeRange
                         if (doesMatch && !checkRange(product.NumRooms, parsedFilters.roomsRange)) doesMatch = false; // Use roomsRange
                         if (doesMatch && !checkRange(product.NumBathrooms, parsedFilters.bathroomsRange)) doesMatch = false; // Use bathroomsRange
                         if (doesMatch && !checkArrayContains(parsedFilters.energy_classes, product.EnergyClass)) doesMatch = false; // Use energy_classes
                        break;

                    case 'Jobb':
                         // *** USE CORRECT KEYS FROM SAVED FILTERS ***
                         if (!checkArrayContains(parsedFilters.employment_types, product.EmploymentType)) doesMatch = false; // Use employment_types
                         // Add salaryRange check if needed
                         // if (doesMatch && !checkRange(product.Salary, parsedFilters.salaryRange)) doesMatch = false; // Assuming product.Salary is numeric
                         // Add deadline check if needed
                         // if (doesMatch && parsedFilters.applicationDeadline && product.ApplicationDeadline) {
                         //    if (new Date(product.ApplicationDeadline) > new Date(parsedFilters.applicationDeadline)) doesMatch = false; // Example: Product deadline must be <= filter deadline
                         // }
                        break;
                }
            }
            if (doesMatch) {
                matches.push({
                    userId: search.user_id,
                    searchName: search.search_name,
                    productId: product.productdID,
                    searchId: search.search_id
                });
            }
        }
    } catch (error) {
        console.error("Error checking product against saved searches:", error);
    }
    return matches;
}

module.exports = { checkProductAgainstSavedSearches };