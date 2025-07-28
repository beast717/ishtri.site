/**
 * Category Management Utilities
 * Handles category-specific UI visibility and logic
 */

import { getEl } from './domUtils.js';
import { getCurrentCategory, isTorgetKatPage } from './urlUtils.js';

/**
 * Handle category-specific filter visibility
 * Shows/hides filter sections based on current category
 */
export const handleCategoryVisibility = () => {
    if (!isTorgetKatPage()) return; // Only run on the category page

    const category = getCurrentCategory();

    // Get references to all category-specific filter sections
    const subcategoryContainer = getEl('subcategoryFilterContainer');
    const carBrandList = getEl('carBrandList');
    const carBrandLabel = getEl('filterCar');
    const carSpecificFilters = getEl('carSpecificFilters');
    const propertySpecificFilters = getEl('propertySpecificFilters');
    const workSpecificFilters = getEl('workSpecificFilters');

    // First, hide all of them to ensure a clean state
    if (subcategoryContainer) subcategoryContainer.style.display = 'none';
    if (carBrandList) carBrandList.style.display = 'none';
    if (carBrandLabel) carBrandLabel.style.display = 'none';
    if (carSpecificFilters) carSpecificFilters.style.display = 'none';
    if (propertySpecificFilters) propertySpecificFilters.style.display = 'none';
    if (workSpecificFilters) workSpecificFilters.style.display = 'none';

    // Show the correct section based on the category
    switch (category) {
        case 'Torget':
            if (subcategoryContainer) subcategoryContainer.style.display = 'block';
            break;
        case 'Bil':
            if (carBrandList) carBrandList.style.display = 'block';
            if (carBrandLabel) carBrandLabel.style.display = 'block';
            if (carSpecificFilters) carSpecificFilters.style.display = 'block';
            break;
        case 'Eiendom': // "Property"
            if (propertySpecificFilters) propertySpecificFilters.style.display = 'block';
            break;
        case 'Jobb':
            if (workSpecificFilters) workSpecificFilters.style.display = 'block';
            break;
        default:
            // No specific filters to show for other categories
            break;
    }
};

/**
 * Get category-specific filters mapping
 * @returns {object} Category filters mapping
 */
export const getCategoryFiltersMapping = () => ({
    'Bil': [
        'priceOrder', 'dateOrder', 'selectedCountries', 'selectedCities', 
        'selectedCarBrands', 'yearRange', 'mileageRange', 'fuelTypes', 'transmissionTypes'
    ],
    'Eiendom': [
        'priceOrder', 'dateOrder', 'selectedCountries', 'selectedCities',
        'propertyTypes', 'sizeRange', 'roomsRange', 'bathroomsRange', 'energyClasses'
    ],
    'Jobb': [
        'priceOrder', 'dateOrder', 'selectedCountries', 'selectedCities',
        'employmentTypes', 'salaryRange', 'applicationDeadline'
    ],
    'Torget': [
        'priceOrder', 'dateOrder', 'subCategory', 'selectedCountries', 'selectedCities'
    ]
});
