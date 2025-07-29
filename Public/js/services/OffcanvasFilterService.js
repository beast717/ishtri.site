/**
 * Offcanvas Filter Service - Handles mobile filter drawer functionality
 * Manages the synchronization between desktop and mobile filter panels
 */

export class OffcanvasFilterService {
    constructor(applyFiltersCallback = null) {
        this.isInitialized = false;
        this.isPopulated = false;
        this.isSyncing = false; // Flag to prevent double execution during sync
        this.applyFilters = applyFiltersCallback;
    }
    
    /**
     * Apply filters only if not currently syncing
     */
    safeApplyFilters() {
        if (!this.isSyncing && this.applyFilters) {
            this.applyFilters();
        }
    }
    
    /**
     * Sync to main panel and apply filters with proper timing
     */
    syncAndApply(syncCallback) {
        // Set sync flag to prevent main panel events
        this.isSyncing = true;
        
        // Execute the sync operation
        if (syncCallback) {
            syncCallback();
        }
        
        // Apply filters immediately (before resetting sync flag)
        if (this.applyFilters) {
            this.applyFilters();
        }
        
        // Reset sync flag after a brief delay
        setTimeout(() => {
            this.isSyncing = false;
        }, 50);
    }

    /**
     * Initialize the off-canvas filter drawer
     */
    async initialize() {
        if (this.isInitialized) return;
        
        this.populateOffcanvasFilters();
        this.setupDrawerEvents();
        
        this.isInitialized = true;
    }

    /**
     * Populate off-canvas drawer with filter content
     */
    populateOffcanvasFilters() {
        const mainSidePanel = document.getElementById('mainSidePanel');
        const offcanvasSidePanel = document.getElementById('offcanvasSidePanel');
        
        if (!mainSidePanel || !offcanvasSidePanel) return;
        
        // Check if main panel has content
        if (!mainSidePanel.innerHTML.trim()) return;
        
        // Clone the entire main side panel content
        const clonedContent = mainSidePanel.cloneNode(true);
        
        // IMPORTANT: Remove the 'side-panel' class that has display:none in mobile CSS
        clonedContent.className = 'mobile-filters-content';
        clonedContent.id = 'clonedSidePanel';
        
        // Update any conflicting IDs in the cloned content
        this.updateClonedIds(clonedContent);
        
        // Clear and populate the off-canvas panel
        offcanvasSidePanel.innerHTML = '';
        offcanvasSidePanel.appendChild(clonedContent);
        
        this.isPopulated = true;
        
        // Initialize filter synchronization only if not already done
        if (!this.isInitialized) {
            this.initializeFilterSync();
        }
    }

    /**
     * Update IDs in cloned content to avoid conflicts
     */
    updateClonedIds(clonedContent) {
        // Update element IDs
        const elementsWithIds = clonedContent.querySelectorAll('[id]');
        elementsWithIds.forEach(el => {
            if (el.id) {
                el.id = 'mobile-' + el.id;
            }
        });
        
        // Update labels to match the new IDs
        const labels = clonedContent.querySelectorAll('label[for]');
        labels.forEach(label => {
            if (label.getAttribute('for')) {
                label.setAttribute('for', 'mobile-' + label.getAttribute('for'));
            }
        });
    }

    /**
     * Setup drawer open/close events
     */
    setupDrawerEvents() {
        const openBtn = document.getElementById('offcanvasFilterBtn');
        const closeBtn = document.getElementById('offcanvasFilterClose');
        const overlay = document.getElementById('offcanvasFilterOverlay');
        const drawer = document.getElementById('offcanvasFilterDrawer');
        
        const openDrawer = () => {
            // Re-populate filters when opening to ensure latest content
            this.populateOffcanvasFilters();
            
            drawer?.classList.add('active');
            overlay?.classList.add('active');
            
            // Initialize sliders after drawer is opened and visible
            setTimeout(() => {
                this.initializeSliders();
            }, 200); // Give time for CSS transitions and rendering
        };
        
        const closeDrawer = () => {
            drawer?.classList.remove('active');
            overlay?.classList.remove('active');
        };
        
        openBtn?.addEventListener('click', openDrawer);
        closeBtn?.addEventListener('click', closeDrawer);
        overlay?.addEventListener('click', closeDrawer);
    }

    /**
     * Initialize filter synchronization between main and mobile panels
     */
    async initializeFilterSync() {
        // Setup delegated event listeners for mobile panel
        this.setupMobilePanelEvents();
        
        // Sync initial states
        this.syncInitialStates();
        
        // Note: Slider initialization is now handled when drawer opens
    }
    
    /**
     * Sync initial states from main panel to mobile panel
     */
    syncInitialStates() {
        const mainPanel = document.getElementById('mainSidePanel');
        const mobilePanel = document.getElementById('offcanvasSidePanel');
        
        if (!mainPanel || !mobilePanel) return;
        
        // Sync checkboxes
        const mainCheckboxes = mainPanel.querySelectorAll('input[type="checkbox"]');
        mainCheckboxes.forEach(mainCheckbox => {
            const mobileCheckbox = mobilePanel.querySelector(`#mobile-${mainCheckbox.id}`);
            if (mobileCheckbox) {
                mobileCheckbox.checked = mainCheckbox.checked;
            }
        });
        
        // Sync selects
        const mainSelects = mainPanel.querySelectorAll('select');
        mainSelects.forEach(mainSelect => {
            const mobileSelect = mobilePanel.querySelector(`#mobile-${mainSelect.id}`);
            if (mobileSelect) {
                Array.from(mainSelect.options).forEach((option, index) => {
                    if (mobileSelect.options[index]) {
                        mobileSelect.options[index].selected = option.selected;
                    }
                });
            }
        });
        
        // Sync inputs
        const mainInputs = mainPanel.querySelectorAll('input[type="number"], input[type="date"], input[type="hidden"]');
        mainInputs.forEach(mainInput => {
            const mobileInput = mobilePanel.querySelector(`#mobile-${mainInput.id}`);
            if (mobileInput) {
                mobileInput.value = mainInput.value;
            }
        });
    }
    
    /**
     * Setup delegated event listeners for mobile panel (following main panel pattern)
     */
    setupMobilePanelEvents() {
        const offcanvasSidePanel = document.getElementById('offcanvasSidePanel');
        const offcanvasFilterDrawer = document.getElementById('offcanvasFilterDrawer');
        
        if (!offcanvasSidePanel || !this.applyFilters) return;
        
        // Delegated event listener for mobile panel (same pattern as main panel)
        offcanvasSidePanel.addEventListener('change', e => {
            if (e.target.matches('input[type="checkbox"]')) {
                // Handle country checkbox city list visibility
                if (e.target.classList.contains('country-checkbox')) {
                    const countryName = e.target.value;
                    const mobileCityList = document.getElementById(`mobile-${countryName}-cities`);
                    if (mobileCityList) {
                        mobileCityList.style.display = e.target.checked ? 'block' : 'none';
                    }
                    
                    // Sync to main panel and then apply filters
                    this.syncAndApply(() => {
                        const mainCheckbox = document.getElementById(e.target.id.replace('mobile-', ''));
                        if (mainCheckbox) {
                            mainCheckbox.checked = e.target.checked;
                            const mainCityList = document.getElementById(`${countryName}-cities`);
                            if (mainCityList) {
                                mainCityList.style.display = e.target.checked ? 'block' : 'none';
                            }
                        }
                    });
                } else {
                    // For other checkboxes (cities, car brands, etc.)
                    this.syncAndApply(() => {
                        const mainCheckbox = document.getElementById(e.target.id.replace('mobile-', ''));
                        if (mainCheckbox) {
                            mainCheckbox.checked = e.target.checked;
                        }
                    });
                }
                
            } else if (e.target.matches('select')) {
                // Sync select changes to main panel
                this.syncAndApply(() => {
                    const mainSelect = document.getElementById(e.target.id.replace('mobile-', ''));
                    if (mainSelect) {
                        Array.from(e.target.options).forEach((option, index) => {
                            if (mainSelect.options[index]) {
                                mainSelect.options[index].selected = option.selected;
                            }
                        });
                    }
                });
            }
        });
        
        // Handle input events for number and date inputs
        offcanvasSidePanel.addEventListener('input', e => {
            if (e.target.matches('input[type="number"], input[type="date"]')) {
                // Sync input changes to main panel
                this.syncAndApply(() => {
                    const mainInput = document.getElementById(e.target.id.replace('mobile-', ''));
                    if (mainInput) {
                        mainInput.value = e.target.value;
                    }
                });
            }
        });
        
        // Handle reset button clicks - listen on the entire drawer to catch the reset button
        if (offcanvasFilterDrawer) {
            offcanvasFilterDrawer.addEventListener('click', e => {
                // Check if clicked element is the reset button or a child of it
                const resetButton = e.target.closest('#mobile-resetFiltersBtn') || 
                                   e.target.closest('.reset-filters-btn') ||
                                   (e.target.id === 'mobile-resetFiltersBtn');
                
                if (resetButton) {
                    // Trigger the same reset functionality as the main reset button
                    const mainResetBtn = document.getElementById('resetFiltersBtn');
                    if (mainResetBtn) {
                        mainResetBtn.click();
                    }
                    
                    // Sync after reset happens
                    setTimeout(() => {
                        this.syncInitialStates();
                    }, 100);
                }
            });
        }
    }

    /**
     * Refresh filter synchronization (call after filters are updated)
     */
    refreshSync() {
        this.syncInitialStates();
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
        // Destroy existing slider if it exists (from cloning)
        if (mobileSlider.noUiSlider) {
            try {
                mobileSlider.noUiSlider.destroy();
            } catch (error) {
                // Silently handle destruction errors
            }
        }
        
        // Clear any existing classes that might interfere
        mobileSlider.className = 'range-slider';
        mobileSlider.innerHTML = '';
        
        // Initialize mobile slider
        try {
            noUiSlider.create(mobileSlider, {
                start: config.start,
                connect: true,
                step: config.step,
                range: config.range,
                format: config.format,
            });
        } catch (error) {
            return; // Silently fail if slider creation fails
        }
        
        // Update mobile slider display values
        mobileSlider.noUiSlider.on('update', (values) => {
            this.updateSliderDisplayValues(sliderId, config, values);
        });
        
        // Sync mobile slider changes to main slider
        mobileSlider.noUiSlider.on('change', (values) => {
            // Use syncAndApply to properly handle synchronization
            this.syncAndApply(() => {
                mainSlider.noUiSlider.set(values);
            });
        });
        
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
}
