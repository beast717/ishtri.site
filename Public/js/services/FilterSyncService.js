/**
 * Filter Sync Service - Handles synchronization between desktop and mobile filter panels
 * Manages bidirectional sync of checkboxes, selects, inputs, and sliders
 */

export class FilterSyncService {
    constructor(applyFiltersCallback = null) {
        this.syncedElements = new Set();
        this.applyFilters = applyFiltersCallback;
    }

    /**
     * Initialize filter synchronization
     */
    initialize() {
        this.syncFilterStates();
    }

    /**
     * Sync filter states between main and mobile panels
     */
    syncFilterStates() {
        const mainPanel = document.getElementById('mainSidePanel');
        const mobilePanel = document.getElementById('offcanvasSidePanel');
        
        if (!mainPanel || !mobilePanel) return;
        
        this.syncCheckboxes(mainPanel, mobilePanel);
        this.syncSelectElements(mainPanel, mobilePanel);
        this.syncInputElements(mainPanel, mobilePanel);
    }

    /**
     * Sync checkbox elements between panels
     */
    syncCheckboxes(mainPanel, mobilePanel) {
        const mainCheckboxes = mainPanel.querySelectorAll('input[type="checkbox"]');
        
        mainCheckboxes.forEach(mainCheckbox => {
            const mobileCheckbox = mobilePanel.querySelector(`#mobile-${mainCheckbox.id}`);
            if (mobileCheckbox && !this.syncedElements.has(mainCheckbox.id)) {
                // Sync state from main to mobile
                mobileCheckbox.checked = mainCheckbox.checked;
                
                // Add event listener to sync back from mobile to main
                mobileCheckbox.addEventListener('change', () => {
                    mainCheckbox.checked = mobileCheckbox.checked;
                    mainCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Handle city list visibility for country checkboxes
                    this.handleCityListVisibility(mainCheckbox, mobileCheckbox);
                    
                    // Apply filters directly when mobile filter changes
                    if (this.applyFilters) {
                        this.applyFilters();
                    }
                });
                
                this.syncedElements.add(mainCheckbox.id);
            }
        });
    }

    /**
     * Handle city list visibility when country checkbox changes
     */
    handleCityListVisibility(mainCheckbox, mobileCheckbox) {
        if (mainCheckbox.classList.contains('country-checkbox')) {
            const countryName = mainCheckbox.value;
            const mainCityList = document.getElementById(`${countryName}-cities`);
            const mobileCityList = document.getElementById(`mobile-${countryName}-cities`);
            
            if (mainCityList && mobileCityList) {
                const displayValue = mobileCheckbox.checked ? 'block' : 'none';
                mainCityList.style.display = displayValue;
                mobileCityList.style.display = displayValue;
            }
        }
    }

    /**
     * Sync select elements between panels
     */
    syncSelectElements(mainPanel, mobilePanel) {
        const mainSelects = mainPanel.querySelectorAll('select');
        
        mainSelects.forEach(mainSelect => {
            const mobileSelect = mobilePanel.querySelector(`#mobile-${mainSelect.id}`);
            if (mobileSelect && !this.syncedElements.has(mainSelect.id + '-select')) {
                // Sync selected options from main to mobile
                this.syncSelectOptions(mainSelect, mobileSelect);
                
                // Add event listener to sync back from mobile to main
                mobileSelect.addEventListener('change', () => {
                    this.syncSelectOptions(mobileSelect, mainSelect);
                    mainSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Apply filters directly when mobile filter changes
                    if (this.applyFilters) {
                        this.applyFilters();
                    }
                });
                
                this.syncedElements.add(mainSelect.id + '-select');
            }
        });
    }

    /**
     * Sync select options between two select elements
     */
    syncSelectOptions(sourceSelect, targetSelect) {
        Array.from(sourceSelect.options).forEach((option, index) => {
            if (targetSelect.options[index]) {
                targetSelect.options[index].selected = option.selected;
            }
        });
    }

    /**
     * Sync input elements between panels
     */
    syncInputElements(mainPanel, mobilePanel) {
        const mainInputs = mainPanel.querySelectorAll('input[type="number"], input[type="date"], input[type="hidden"]');
        
        mainInputs.forEach(mainInput => {
            const mobileInput = mobilePanel.querySelector(`#mobile-${mainInput.id}`);
            if (mobileInput && !this.syncedElements.has(mainInput.id + '-input')) {
                // Sync value from main to mobile
                mobileInput.value = mainInput.value;
                
                // Add event listener to sync back from mobile to main
                mobileInput.addEventListener('input', () => {
                    mainInput.value = mobileInput.value;
                    mainInput.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Apply filters directly when mobile filter changes
                    if (this.applyFilters) {
                        this.applyFilters();
                    }
                });
                
                this.syncedElements.add(mainInput.id + '-input');
            }
        });
    }

    /**
     * Initialize sliders in mobile panel
     */
    async initializeSliders() {
        if (typeof noUiSlider === 'undefined') return;

        const { sliderConfigs } = await import('../stores/FilterStore.js');
        
        Object.keys(sliderConfigs).forEach(sliderId => {
            const mainSlider = document.getElementById(sliderId);
            const mobileSlider = document.getElementById(`mobile-${sliderId}`);
            
            if (mainSlider && mobileSlider && mainSlider.noUiSlider) {
                this.initializeMobileSlider(sliderId, mainSlider, mobileSlider, sliderConfigs[sliderId]);
            }
        });
    }

    /**
     * Initialize a single mobile slider
     */
    initializeMobileSlider(sliderId, mainSlider, mobileSlider, config) {
        // Initialize mobile slider if not already done
        if (!mobileSlider.noUiSlider) {
            noUiSlider.create(mobileSlider, {
                start: config.start,
                connect: true,
                step: config.step,
                range: config.range,
                format: config.format,
            });
            
            // Update mobile slider display values
            mobileSlider.noUiSlider.on('update', (values) => {
                this.updateSliderDisplayValues(sliderId, config, values);
            });
            
            // Sync mobile slider changes to main slider
            mobileSlider.noUiSlider.on('change', (values) => {
                mainSlider.noUiSlider.set(values);
                
                // Apply filters directly when mobile slider changes
                if (this.applyFilters) {
                    this.applyFilters();
                }
            });
        }
        
        // Sync current values from main to mobile
        if (mobileSlider.noUiSlider) {
            const mainValues = mainSlider.noUiSlider.get();
            mobileSlider.noUiSlider.set(mainValues);
        }
    }

    /**
     * Update slider display values
     */
    updateSliderDisplayValues(sliderId, config, values) {
        const mobileFromInput = document.getElementById(`mobile-${config.inputs[0]}`);
        const mobileToInput = document.getElementById(`mobile-${config.inputs[1]}`);
        const mobileMinSpan = document.getElementById(`mobile-${sliderId}-val-min`);
        const mobileMaxSpan = document.getElementById(`mobile-${sliderId}-val-max`);
        
        if (mobileFromInput) mobileFromInput.value = values[0];
        if (mobileToInput) mobileToInput.value = values[1];
        if (mobileMinSpan) mobileMinSpan.textContent = values[0];
        if (mobileMaxSpan) mobileMaxSpan.textContent = values[1];
    }

    /**
     * Clear sync tracking (useful for cleanup)
     */
    clearSyncTracking() {
        this.syncedElements.clear();
    }
}
