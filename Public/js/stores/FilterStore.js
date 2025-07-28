/**
 * Filter Store - Centralized Filter State Management
 * Manages all filter state and provides methods to update filters
 */

import { getEl, queryAll } from '../utils/domUtils.js';

/**
 * Default filter state
 */
const defaultFilters = {
    priceOrder: '',
    dateOrder: '',
    subCategory: '',
    selectedCountries: [],
    selectedCities: [],
    selectedCarBrands: [],
    yearRange: { from: null, to: null },
    mileageRange: { from: null, to: null },
    fuelTypes: [],
    transmissionTypes: [],
    propertyTypes: [],
    sizeRange: { from: null, to: null },
    roomsRange: { from: null, to: null },
    bathroomsRange: { from: null, to: null },
    energyClasses: [],
    employmentTypes: [],
    salaryRange: { from: null, to: null },
    applicationDeadline: null
};

/**
 * Slider configurations for TorgetKat page
 */
export const sliderConfigs = {
    'year-slider': { 
        range: { min: 1980, max: new Date().getFullYear() }, 
        start: [1980, new Date().getFullYear()], 
        step: 1, 
        inputs: ['yearFrom', 'yearTo'], 
        format: { to: v => Math.round(v), from: v => Math.round(v) } 
    },
    'mileage-slider': { 
        range: { min: 0, max: 500000 }, 
        start: [0, 500000], 
        step: 1000, 
        inputs: ['mileageFrom', 'mileageTo'], 
        format: { to: v => Math.round(v), from: v => Math.round(v) } 
    },
    'size-slider': { 
        range: { min: 10, max: 1000 }, 
        start: [10, 1000], 
        step: 10, 
        inputs: ['sizeSqmFrom', 'sizeSqmTo'], 
        format: { to: v => Math.round(v), from: v => Math.round(v) } 
    },
    'rooms-slider': { 
        range: { min: 1, max: 10 }, 
        start: [1, 10], 
        step: 1, 
        inputs: ['numRoomsFrom', 'numRoomsTo'], 
        format: { to: v => Math.round(v), from: v => Math.round(v) } 
    },
    'bathrooms-slider': { 
        range: { min: 1, max: 5 }, 
        start: [1, 5], 
        step: 1, 
        inputs: ['numBathroomsFrom', 'numBathroomsTo'], 
        format: { to: v => Math.round(v), from: v => Math.round(v) } 
    }
};

class FilterStore {
    constructor() {
        this.filters = { ...defaultFilters };
        this.listeners = [];
    }

    /**
     * Get current filters
     * @returns {object} Current filter state
     */
    getFilters() {
        return { ...this.filters };
    }

    /**
     * Update filters from UI elements
     */
    updateFromUI() {
        const getMultiSelectValues = (id) => 
            Array.from(getEl(id)?.selectedOptions || [])
                .map(opt => opt.value)
                .filter(val => val);
        
        this.filters = {
            priceOrder: getEl('priceFilter')?.value || '',
            dateOrder: getEl('dateFilter')?.value || '',
            subCategory: getEl('subCategoryFilter')?.value || '',
            selectedCountries: Array.from(queryAll('.country-list > li > input[type="checkbox"]:checked'))
                .map(cb => cb.value)
                .filter(val => val),
            selectedCities: Array.from(queryAll('.city-list input[type="checkbox"]:checked'))
                .map(cb => cb.value)
                .filter(val => val),
            selectedCarBrands: Array.from(queryAll('.car-brand-list input[type="checkbox"]:checked'))
                .map(cb => cb.value)
                .filter(val => val),
            yearRange: { 
                from: getEl('yearFrom')?.value || null, 
                to: getEl('yearTo')?.value || null 
            },
            mileageRange: { 
                from: getEl('mileageFrom')?.value || null, 
                to: getEl('mileageTo')?.value || null 
            },
            fuelTypes: getMultiSelectValues('fuelTypeFilter'),
            transmissionTypes: getMultiSelectValues('transmissionFilter'),
            propertyTypes: getMultiSelectValues('propertyTypeFilter'),
            sizeRange: { 
                from: getEl('sizeSqmFrom')?.value || null, 
                to: getEl('sizeSqmTo')?.value || null 
            },
            roomsRange: { 
                from: getEl('numRoomsFrom')?.value || null, 
                to: getEl('numRoomsTo')?.value || null 
            },
            bathroomsRange: { 
                from: getEl('numBathroomsFrom')?.value || null, 
                to: getEl('numBathroomsTo')?.value || null 
            },
            energyClasses: getMultiSelectValues('energyClassFilter'),
            employmentTypes: getMultiSelectValues('employmentTypeFilter'),
            salaryRange: { 
                from: getEl('salaryFrom')?.value || null, 
                to: getEl('salaryTo')?.value || null 
            },
            applicationDeadline: getEl('deadlineDate')?.value || null
        };

        this.notifyListeners();
    }

    /**
     * Reset filters to default state
     */
    reset() {
        this.filters = { ...defaultFilters };
        this.notifyListeners();
    }

    /**
     * Set specific filter values
     * @param {object} newFilters - Filters to update
     */
    setFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.notifyListeners();
    }

    /**
     * Add listener for filter changes
     * @param {Function} listener - Callback function
     */
    addListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * Remove listener
     * @param {Function} listener - Callback function to remove
     */
    removeListener(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * Notify all listeners of state change
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.filters));
    }
}

// Export singleton instance
export const filterStore = new FilterStore();
