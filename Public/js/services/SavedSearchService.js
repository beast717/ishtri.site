/**
 * Saved Search Service - Handles saving and loading saved searches
 */

import { getCurrentCategory, getUrlParams } from '../utils/urlUtils.js';
import { getCategoryFiltersMapping } from '../utils/categoryUtils.js';
import { getEl } from '../utils/domUtils.js';

class SavedSearchService {
    /**
     * Save current search filters
     * @param {object} filters - Current filter state
     * @returns {Promise} Save operation promise
     */
    async saveCurrentSearch(filters) {
        // Check if user is logged in
        try {
            const authCheck = await fetch('/api/favorites', { 
                method: 'GET', 
                credentials: 'include' 
            });
            
            if (!authCheck.ok) {
                const message = 'Please log in to save searches.';
                this.showMessage(message, 'warning');
                return;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showMessage('Please log in to save searches.', 'warning');
            return;
        }

        // Get current category
        const category = getCurrentCategory();

        // Create clean filters object (category-specific)
        const cleanFilters = this.getCleanFilters(filters, category);

        // Check if there are any active filters
        if (Object.keys(cleanFilters).length === 0) {
            this.showMessage('Please apply some filters before saving the search.', 'info');
            return;
        }

        // Prompt user for search name
        const searchName = prompt('Enter a name for this saved search:');
        if (!searchName || searchName.trim() === '') {
            return;
        }

        try {
            const response = await fetch('/api/saved-searches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    search_name: searchName.trim(),
                    category: category,
                    filters: cleanFilters
                })
            });

            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                console.error('Failed to parse response as JSON:', parseError);
                const textResponse = await response.text();
                console.error('Response text:', textResponse);
                throw new Error('Server returned invalid response format');
            }

            if (response.ok) {
                this.showMessage('Search saved successfully!', 'success');
            } else {
                const errorMessage = result.errors ? 
                    result.errors.map(err => err.msg).join(', ') : 
                    result.message || 'Failed to save search';
                
                this.showMessage('Error: ' + errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error saving search:', error);
            this.showMessage('Failed to save search. Please try again.', 'error');
        }
    }

    /**
     * Load saved search filters from URL
     * @returns {object|null} Loaded filters or null if none
     */
    loadSavedSearchFilters() {
        const urlParams = getUrlParams();
        
        // Check if we have filter parameters in the URL
        const hasFilterParams = Array.from(urlParams.keys()).some(key => 
            key !== 'category' && key !== 'limit' && key !== 'offset'
        );
        
        console.log('Loading saved search filters...', { 
            hasFilterParams, 
            urlParams: Array.from(urlParams.entries()) 
        });
        
        if (!hasFilterParams) {
            console.log('No saved filters to load');
            return null;
        }

        try {
            const filters = {};

            // Parse URL parameters and build filter object
            if (urlParams.get('sortPrice')) filters.priceOrder = urlParams.get('sortPrice');
            if (urlParams.get('sortDate')) filters.dateOrder = urlParams.get('sortDate');
            if (urlParams.get('subCategory')) filters.subCategory = decodeURIComponent(urlParams.get('subCategory'));
            
            if (urlParams.get('countries')) {
                filters.selectedCountries = decodeURIComponent(urlParams.get('countries')).split(',');
            }
            
            if (urlParams.get('cities')) {
                filters.selectedCities = decodeURIComponent(urlParams.get('cities')).split(',');
            }
            
            if (urlParams.get('carBrand')) {
                filters.selectedCarBrands = decodeURIComponent(urlParams.get('carBrand')).split(',');
            }

            // Range filters
            if (urlParams.get('yearFrom') || urlParams.get('yearTo')) {
                filters.yearRange = {
                    from: urlParams.get('yearFrom') || null,
                    to: urlParams.get('yearTo') || null
                };
            }

            if (urlParams.get('mileageFrom') || urlParams.get('mileageTo')) {
                filters.mileageRange = {
                    from: urlParams.get('mileageFrom') || null,
                    to: urlParams.get('mileageTo') || null
                };
            }

            if (urlParams.get('sizeSqmFrom') || urlParams.get('sizeSqmTo')) {
                filters.sizeRange = {
                    from: urlParams.get('sizeSqmFrom') || null,
                    to: urlParams.get('sizeSqmTo') || null
                };
            }

            if (urlParams.get('numRoomsFrom') || urlParams.get('numRoomsTo')) {
                filters.roomsRange = {
                    from: urlParams.get('numRoomsFrom') || null,
                    to: urlParams.get('numRoomsTo') || null
                };
            }

            if (urlParams.get('numBathroomsFrom') || urlParams.get('numBathroomsTo')) {
                filters.bathroomsRange = {
                    from: urlParams.get('numBathroomsFrom') || null,
                    to: urlParams.get('numBathroomsTo') || null
                };
            }

            if (urlParams.get('salaryFrom') || urlParams.get('salaryTo')) {
                filters.salaryRange = {
                    from: urlParams.get('salaryFrom') || null,
                    to: urlParams.get('salaryTo') || null
                };
            }

            // Multi-select filters
            const multiSelectParams = [
                { param: 'fuelTypes', key: 'fuelTypes' },
                { param: 'transmissionTypes', key: 'transmissionTypes' },
                { param: 'propertyType', key: 'propertyTypes' },
                { param: 'energyClass', key: 'energyClasses' },
                { param: 'employmentTypes', key: 'employmentTypes' }
            ];

            multiSelectParams.forEach(({ param, key }) => {
                if (urlParams.get(param)) {
                    filters[key] = decodeURIComponent(urlParams.get(param)).split(',');
                }
            });

            if (urlParams.get('deadline')) {
                filters.applicationDeadline = urlParams.get('deadline');
            }

            return filters;
            
        } catch (error) {
            console.error('Error loading saved search filters:', error);
            return null;
        }
    }

    /**
     * Get clean filters for category
     * @param {object} filters - All filters
     * @param {string} category - Category name
     * @returns {object} Clean filters
     */
    getCleanFilters(filters, category) {
        const cleanFilters = {};
        const categoryFilters = getCategoryFiltersMapping();
        const relevantFilters = categoryFilters[category] || categoryFilters['Torget'];
        
        relevantFilters.forEach(key => {
            const value = filters[key];
            if (value && (
                (Array.isArray(value) && value.length > 0) ||
                (typeof value === 'object' && value !== null && (value.from || value.to)) ||
                (typeof value === 'string' && value.trim() !== '')
            )) {
                cleanFilters[key] = value;
            }
        });

        return cleanFilters;
    }

    /**
     * Show message to user
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error, warning, info)
     */
    showMessage(message, type) {
        if (window.ishtri?.toast) {
            window.ishtri.toast.show(message, type);
        } else {
            alert(message);
        }
    }
}

// Export singleton instance
export const savedSearchService = new SavedSearchService();
