/**
 * URL Parameter Utilities
 * Handles URL parsing and parameter management
 */

/**
 * Parse URL parameters and return as object
 * @returns {URLSearchParams} URL parameters
 */
export const getUrlParams = () => new URLSearchParams(window.location.search);

/**
 * Get category from URL or default
 * @returns {string} Category name
 */
export const getCurrentCategory = () => {
    const urlParams = getUrlParams();
    return urlParams.get('category') || 'Torget';
};

/**
 * Check if current page is TorgetKat page
 * @returns {boolean}
 */
export const isTorgetKatPage = () => window.location.pathname.includes('/torgetkat');

/**
 * Check if current page is Search page
 * @returns {boolean}
 */
export const isSearchPage = () => 
    window.location.pathname.includes('/SearchResults') || 
    window.location.pathname.includes('/search');

/**
 * Build API URL with filters
 * @param {object} filters - Filter object
 * @param {number} limit - Results limit
 * @param {number} offset - Results offset
 * @param {string} cacheBuster - Optional cache buster
 * @returns {string} Complete API URL
 */
export const buildApiUrl = (filters, limit, offset, cacheBuster = null) => {
    const urlParams = getUrlParams();
    let apiUrl;

    // Determine base API URL
    if (isTorgetKatPage()) {
        const category = urlParams.get('category') || 'default';
        apiUrl = `/api/products?category=${category}&limit=${limit}&offset=${offset}`;
    } else {
        const searchQuery = urlParams.get("query") || '';
        apiUrl = `/api/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${offset}`;
    }
    
    // Append filter parameters
    if (filters.priceOrder) apiUrl += `&sortPrice=${filters.priceOrder}`;
    if (filters.dateOrder) apiUrl += `&sortDate=${filters.dateOrder}`;
    if (filters.subCategory) apiUrl += `&subCategory=${encodeURIComponent(filters.subCategory)}`;
    if (filters.selectedCountries.length) apiUrl += `&countries=${encodeURIComponent(filters.selectedCountries.join(','))}`;
    if (filters.selectedCities.length) apiUrl += `&cities=${encodeURIComponent(filters.selectedCities.join(','))}`;
    if (filters.selectedCarBrands.length) apiUrl += `&carBrand=${encodeURIComponent(filters.selectedCarBrands.join(','))}`;
    if (filters.yearRange.from) apiUrl += `&yearFrom=${filters.yearRange.from}`;
    if (filters.yearRange.to) apiUrl += `&yearTo=${filters.yearRange.to}`;
    if (filters.mileageRange.from) apiUrl += `&mileageFrom=${filters.mileageRange.from}`;
    if (filters.mileageRange.to) apiUrl += `&mileageTo=${filters.mileageRange.to}`;
    if (filters.fuelTypes.length) apiUrl += `&fuelTypes=${encodeURIComponent(filters.fuelTypes.join(','))}`;
    if (filters.transmissionTypes.length) apiUrl += `&transmissionTypes=${encodeURIComponent(filters.transmissionTypes.join(','))}`;
    if (filters.propertyTypes.length) apiUrl += `&propertyType=${encodeURIComponent(filters.propertyTypes.join(','))}`;
    if (filters.sizeRange.from) apiUrl += `&sizeSqmFrom=${filters.sizeRange.from}`;
    if (filters.sizeRange.to) apiUrl += `&sizeSqmTo=${filters.sizeRange.to}`;
    if (filters.roomsRange.from) apiUrl += `&numRoomsFrom=${filters.roomsRange.from}`;
    if (filters.roomsRange.to) apiUrl += `&numRoomsTo=${filters.roomsRange.to}`;
    if (filters.bathroomsRange.from) apiUrl += `&numBathroomsFrom=${filters.bathroomsRange.from}`;
    if (filters.bathroomsRange.to) apiUrl += `&numBathroomsTo=${filters.bathroomsRange.to}`;
    if (filters.energyClasses.length) apiUrl += `&energyClass=${encodeURIComponent(filters.energyClasses.join(','))}`;
    if (filters.employmentTypes.length) apiUrl += `&employmentTypes=${encodeURIComponent(filters.employmentTypes.join(','))}`;
    if (filters.salaryRange.from) apiUrl += `&salaryFrom=${filters.salaryRange.from}`;
    if (filters.salaryRange.to) apiUrl += `&salaryTo=${filters.salaryRange.to}`;
    if (filters.applicationDeadline) apiUrl += `&deadline=${filters.applicationDeadline}`;
    
    if (cacheBuster) apiUrl += `&_=${cacheBuster}`;
    
    return apiUrl;
};
