/**
 * Active Filters Component - Displays and manages active filter tags
 */

import { getEl } from '../utils/domUtils.js';

/**
 * Update active filters display
 * @param {object} filters - Current filters
 * @param {Function} applyFilters - Apply filters callback
 */
export const updateActiveFiltersDisplay = async (filters, applyFilters) => {
    const displayContainer = getEl('activeFiltersDisplay');
    if (!displayContainer) return;

    // Import slider configs dynamically
    const { sliderConfigs } = await import('../stores/FilterStore.js');

    displayContainer.innerHTML = '';
    let hasActiveFilters = false;

    const addFilterTag = (label, value, removeCallback) => {
        hasActiveFilters = true;
        const tag = document.createElement('span');
        tag.className = 'active-filter-tag';
        tag.innerHTML = `${label}: <strong>${value}</strong> <button class="remove-filter-btn">×</button>`;
        tag.querySelector('button').addEventListener('click', removeCallback);
        displayContainer.appendChild(tag);
    };
    
    // Price sorting
    if (filters.priceOrder) {
        const priceLabel = filters.priceOrder === 'asc' ? 'Lowest Price' : 'Highest Price';
        addFilterTag('Sort', priceLabel, () => {
            const el = getEl('priceFilter'); 
            if (el) el.selectedIndex = 0;
            applyFilters();
        });
    }
    
    // Date sorting
    if (filters.dateOrder) {
        const dateLabel = filters.dateOrder === 'desc' ? 'Newest' : 'Oldest';
        addFilterTag('Date', dateLabel, () => {
            const el = getEl('dateFilter');
            if (el) el.selectedIndex = 0;
            applyFilters();
        });
    }
    
    // Sub category
    if (filters.subCategory) {
        addFilterTag('Category', filters.subCategory, () => {
            const el = getEl('subCategoryFilter');
            if (el) el.selectedIndex = 0;
            applyFilters();
        });
    }
    
    // Countries
    if (filters.selectedCountries && filters.selectedCountries.length > 0) {
        filters.selectedCountries.forEach(country => {
            addFilterTag('Country', country, () => {
                const cb = getEl(country); 
                if (cb) cb.checked = false;
                applyFilters();
            });
        });
    }
    
    // Cities
    if (filters.selectedCities && filters.selectedCities.length > 0) {
        filters.selectedCities.forEach(cityId => {
            const cityCheckbox = getEl(`city_${cityId}`);
            const cityName = cityCheckbox ? cityCheckbox.nextElementSibling?.textContent : `City ${cityId}`;
            addFilterTag('City', cityName, () => {
                if (cityCheckbox) cityCheckbox.checked = false;
                applyFilters();
            });
        });
    }
    
    // Car brands
    if (filters.selectedCarBrands && filters.selectedCarBrands.length > 0) {
        filters.selectedCarBrands.forEach(brandId => {
            const brandCheckbox = getEl(`brand_${brandId}`);
            const brandName = brandCheckbox ? brandCheckbox.nextElementSibling?.textContent : `Brand ${brandId}`;
            addFilterTag('Car Brand', brandName, () => {
                if (brandCheckbox) brandCheckbox.checked = false;
                applyFilters();
            });
        });
    }
    
    // Range filters
    addRangeFilterTag('Year', filters.yearRange, 'year-slider', sliderConfigs, addFilterTag, applyFilters);
    addRangeFilterTag('Mileage', filters.mileageRange, 'mileage-slider', sliderConfigs, addFilterTag, applyFilters, 'km');
    addRangeFilterTag('Size', filters.sizeRange, 'size-slider', sliderConfigs, addFilterTag, applyFilters, 'm²');
    addRangeFilterTag('Rooms', filters.roomsRange, 'rooms-slider', sliderConfigs, addFilterTag, applyFilters);
    addRangeFilterTag('Bathrooms', filters.bathroomsRange, 'bathrooms-slider', sliderConfigs, addFilterTag, applyFilters);
    
    // Multi-select filters
    addMultiSelectFilterTags('Fuel', filters.fuelTypes, 'fuelTypeFilter', addFilterTag, applyFilters);
    addMultiSelectFilterTags('Transmission', filters.transmissionTypes, 'transmissionFilter', addFilterTag, applyFilters);
    addMultiSelectFilterTags('Property Type', filters.propertyTypes, 'propertyTypeFilter', addFilterTag, applyFilters);
    addMultiSelectFilterTags('Energy Class', filters.energyClasses, 'energyClassFilter', addFilterTag, applyFilters);
    addMultiSelectFilterTags('Employment', filters.employmentTypes, 'employmentTypeFilter', addFilterTag, applyFilters);
    
    // Salary range
    if (filters.salaryRange && (filters.salaryRange.from || filters.salaryRange.to)) {
        const from = filters.salaryRange.from ? `${parseInt(filters.salaryRange.from).toLocaleString()} NOK` : 'Any';
        const to = filters.salaryRange.to ? `${parseInt(filters.salaryRange.to).toLocaleString()} NOK` : 'Any';
        addFilterTag('Salary', `${from} - ${to}`, () => {
            const fromEl = getEl('salaryFrom');
            const toEl = getEl('salaryTo');
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';
            applyFilters();
        });
    }
    
    // Application deadline
    if (filters.applicationDeadline) {
        const deadlineDate = new Date(filters.applicationDeadline).toLocaleDateString();
        addFilterTag('Deadline', deadlineDate, () => {
            const el = getEl('deadlineDate');
            if (el) el.value = '';
            applyFilters();
        });
    }

    displayContainer.style.display = hasActiveFilters ? 'flex' : 'none';
};

/**
 * Add range filter tag if values differ from defaults
 */
const addRangeFilterTag = (label, range, sliderKey, sliderConfigs, addFilterTag, applyFilters, unit = '') => {
    if (!range || (!range.from && !range.to)) return;
    
    const defaultStart = sliderConfigs[sliderKey]?.start;
    if (!defaultStart) return;
    
    const from = parseInt(range.from);
    const to = parseInt(range.to);
    
    // Only show if values differ from defaults
    if ((from && from !== defaultStart[0]) || (to && to !== defaultStart[1])) {
        const fromDisplay = from ? (unit ? `${from.toLocaleString()}${unit}` : from) : 'Any';
        const toDisplay = to ? (unit ? `${to.toLocaleString()}${unit}` : to) : 'Any';
        
        addFilterTag(label, `${fromDisplay} - ${toDisplay}`, () => {
            const slider = getEl(sliderKey);
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set(sliderConfigs[sliderKey].start);
            }
            applyFilters();
        });
    }
};

/**
 * Add multi-select filter tags
 */
const addMultiSelectFilterTags = (label, values, elementId, addFilterTag, applyFilters) => {
    if (!values || values.length === 0) return;
    
    values.forEach(value => {
        addFilterTag(label, value, () => {
            const select = getEl(elementId);
            if (select) {
                Array.from(select.options).forEach(opt => {
                    if (opt.value === value) opt.selected = false;
                });
            }
            applyFilters();
        });
    });
};
