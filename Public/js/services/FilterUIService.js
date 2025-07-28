/**
 * Filter UI Service - Handles applying saved filters to UI elements
 */

import { getEl } from '../utils/domUtils.js';

export class FilterUIService {
    /**
     * Apply saved filters to UI elements
     * @param {object} filters - Saved filters object
     */
    async applySavedFiltersToUI(filters) {
        try {
            // Import slider configs when needed
            const { sliderConfigs } = await import('../stores/FilterStore.js');

            // Price and date sorting
            if (filters.priceOrder) {
                const priceFilter = getEl('priceFilter');
                if (priceFilter) priceFilter.value = filters.priceOrder;
            }
            
            if (filters.dateOrder) {
                const dateFilter = getEl('dateFilter');
                if (dateFilter) dateFilter.value = filters.dateOrder;
            }

            // Sub category
            if (filters.subCategory) {
                const subCatFilter = getEl('subCategoryFilter');
                if (subCatFilter) subCatFilter.value = filters.subCategory;
            }

            // Countries
            if (filters.selectedCountries && filters.selectedCountries.length > 0) {
                filters.selectedCountries.forEach(country => {
                    const countryCheckbox = getEl(country.trim());
                    if (countryCheckbox) {
                        countryCheckbox.checked = true;
                        // Show city list for this country
                        const countryLi = countryCheckbox.closest('li');
                        const cityList = countryLi?.querySelector('.city-list');
                        if (cityList) cityList.style.display = 'block';
                    }
                });
            }

            // Cities
            if (filters.selectedCities && filters.selectedCities.length > 0) {
                filters.selectedCities.forEach(cityId => {
                    const cityCheckbox = getEl(`city_${cityId.trim()}`);
                    if (cityCheckbox) cityCheckbox.checked = true;
                });
            }

            // Car brands
            if (filters.selectedCarBrands && filters.selectedCarBrands.length > 0) {
                filters.selectedCarBrands.forEach(brandId => {
                    const brandCheckbox = getEl(`brand_${brandId.trim()}`);
                    if (brandCheckbox) brandCheckbox.checked = true;
                });
            }

            // Range filters with sliders
            await this.applyRangeFilter('year', filters.yearRange, sliderConfigs);
            await this.applyRangeFilter('mileage', filters.mileageRange, sliderConfigs);
            await this.applyRangeFilter('size', filters.sizeRange, sliderConfigs, 'sizeSqm');
            await this.applyRangeFilter('rooms', filters.roomsRange, sliderConfigs, 'numRooms');
            await this.applyRangeFilter('bathrooms', filters.bathroomsRange, sliderConfigs, 'numBathrooms');

            // Multi-select filters
            const multiSelectFilters = [
                { filters: filters.fuelTypes, elementId: 'fuelTypeFilter' },
                { filters: filters.transmissionTypes, elementId: 'transmissionFilter' },
                { filters: filters.propertyTypes, elementId: 'propertyTypeFilter' },
                { filters: filters.energyClasses, elementId: 'energyClassFilter' },
                { filters: filters.employmentTypes, elementId: 'employmentTypeFilter' }
            ];

            multiSelectFilters.forEach(({ filters: filterValues, elementId }) => {
                if (filterValues && filterValues.length > 0) {
                    const selectElement = getEl(elementId);
                    if (selectElement) {
                        Array.from(selectElement.options).forEach(option => {
                            if (filterValues.includes(option.value)) {
                                option.selected = true;
                            }
                        });
                    }
                }
            });

            // Salary range
            if (filters.salaryRange) {
                if (filters.salaryRange.from) {
                    const salaryFromEl = getEl('salaryFrom');
                    if (salaryFromEl) salaryFromEl.value = filters.salaryRange.from;
                }
                if (filters.salaryRange.to) {
                    const salaryToEl = getEl('salaryTo');
                    if (salaryToEl) salaryToEl.value = filters.salaryRange.to;
                }
            }

            // Application deadline
            if (filters.applicationDeadline) {
                const deadlineEl = getEl('deadlineDate');
                if (deadlineEl) deadlineEl.value = filters.applicationDeadline;
            }

        } catch (error) {
            console.error('Error applying saved filters to UI:', error);
        }
    }

    /**
     * Apply range filter with slider sync
     * @param {string} type - Filter type (year, mileage, etc.)
     * @param {object} range - Range object with from/to
     * @param {object} sliderConfigs - Slider configurations
     * @param {string} prefix - Input prefix override
     */
    async applyRangeFilter(type, range, sliderConfigs, prefix = null) {
        if (!range || (!range.from && !range.to)) return;

        const inputPrefix = prefix || type;
        const fromInput = getEl(`${inputPrefix}From`);
        const toInput = getEl(`${inputPrefix}To`);
        
        if (range.from && fromInput) fromInput.value = range.from;
        if (range.to && toInput) toInput.value = range.to;
        
        // Update slider if it exists
        const sliderKey = `${type}-slider`;
        const slider = getEl(sliderKey);
        
        if (slider && slider.noUiSlider && sliderConfigs[sliderKey]) {
            const fromVal = range.from || sliderConfigs[sliderKey].start[0];
            const toVal = range.to || sliderConfigs[sliderKey].start[1];
            slider.noUiSlider.set([fromVal, toVal]);
        }
    }
}
