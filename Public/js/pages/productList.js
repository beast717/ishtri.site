/**
 * Product List Page - Main orchestrator (Refactored)
 * Clean, modular, and maintainable implementation
 */

// Utils
import { debounce, showLoading, hideLoading, showSkeletonLoading } from '../utils/domUtils.js';
import { isTorgetKatPage, isSearchPage } from '../utils/urlUtils.js';
import { handleCategoryVisibility } from '../utils/categoryUtils.js';

// Services
import { productService } from '../services/ProductService.js';
import { savedSearchService } from '../services/SavedSearchService.js';

// Stores
import { filterStore } from '../stores/FilterStore.js';

// Components
import { displayProducts } from '../components/ProductCard.js';
import { LoadMoreButton } from '../components/LoadMoreButton.js';

export default function initProductListPage() {
    // Page Context Detection
    if (!isTorgetKatPage() && !isSearchPage()) {
        return;
    }

    // Initialize components
    const loadMoreButton = new LoadMoreButton(() => fetchProducts(true));
    const debouncedApplyFilters = debounce(applyFilters, 350);

    /**
     * Main product fetching function
     * @param {boolean} loadMore - Whether this is a load more request
     */
    async function fetchProducts(loadMore = false) {
        try {
            // Show appropriate loading state
            if (!loadMore) {
                showSkeletonLoading();
                productService.resetPagination();
            } else {
                showLoading();
            }

            // Update load more button state
            loadMoreButton.update(true, productService.hasMoreProducts());

            // Fetch products with current filters
            const result = await productService.fetchProducts(
                filterStore.getFilters(), 
                loadMore
            );

            // Display products
            displayProducts(result.products, result.isLoadMore);

            // Add load more button if needed
            if (result.hasMore) {
                loadMoreButton.add();
            }

            // Update button state
            loadMoreButton.update(false, result.hasMore);

        } catch (error) {
            console.error("Error fetching products:", error);
            const container = document.getElementById('productsContainer');
            if (container) {
                container.innerHTML = `<p class="error-message">Error loading products. Please try refreshing.</p>`;
            }
            
            if (window.ishtri?.toast) {
                window.ishtri.toast.show('Error loading products.', 'error');
            }
            
            loadMoreButton.update(false, false);
        } finally {
            hideLoading();
        }
    }

    /**
     * Apply current filters
     */
    function applyFilters() {
        filterStore.updateFromUI();
        
        if (isTorgetKatPage()) {
            updateActiveFiltersDisplay();
        }
        
        productService.resetPagination();
        fetchProducts(false);
    }

    /**
     * Reset all filters
     */
    async function resetFilters() {
        // Reset UI elements
        document.querySelectorAll('.side-panel input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.city-list').forEach(list => list.style.display = 'none');
        
        // Reset dropdowns and inputs
        ['priceFilter', 'dateFilter', 'subCategoryFilter', 'fuelTypeFilter', 'transmissionFilter', 
         'propertyTypeFilter', 'energyClassFilter', 'employmentTypeFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (el.multiple) {
                    Array.from(el.options).forEach(opt => opt.selected = false);
                } else {
                    el.selectedIndex = 0;
                }
            }
        });

        // Reset range inputs
        ['salaryFrom', 'salaryTo', 'deadlineDate', 'yearFrom', 'yearTo', 'mileageFrom', 'mileageTo', 
         'sizeSqmFrom', 'sizeSqmTo', 'numRoomsFrom', 'numRoomsTo', 'numBathroomsFrom', 'numBathroomsTo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // Reset sliders (TorgetKat only)
        if (isTorgetKatPage()) {
            await resetSliders();
        }

        // Reset store
        filterStore.reset();
        
        if (isTorgetKatPage()) {
            updateActiveFiltersDisplay();
        }

        productService.resetPagination();
        fetchProducts(false);
    }

    /**
     * Reset all sliders to default values
     */
    async function resetSliders() {
        const { sliderConfigs } = await import('../stores/FilterStore.js');
        
        Object.keys(sliderConfigs).forEach(sliderId => {
            const sliderEl = document.getElementById(sliderId);
            if (sliderEl && sliderEl.noUiSlider) {
                sliderEl.noUiSlider.set(sliderConfigs[sliderId].start);
            }
        });
    }

    /**
     * Update active filters display (TorgetKat only)
     */
    async function updateActiveFiltersDisplay() {
        // Import ActiveFilters component dynamically for TorgetKat page only
        const { updateActiveFiltersDisplay: updateDisplay } = await import('../components/ActiveFilters.js');
        updateDisplay(filterStore.getFilters(), applyFilters);
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Filter event listeners
        document.getElementById('priceFilter')?.addEventListener('change', applyFilters);
        document.getElementById('dateFilter')?.addEventListener('change', applyFilters);
        document.getElementById('subCategoryFilter')?.addEventListener('change', applyFilters);
        document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);
        document.getElementById('resetFiltersBtn-mobile')?.addEventListener('click', resetFilters);

        // Delegated listeners for dynamic content
        const sidePanel = document.getElementById('mainSidePanel');
        if (sidePanel) {
            sidePanel.addEventListener('change', e => {
                if (e.target.matches('input[type="checkbox"]')) {
                    const countryLi = e.target.closest('.country-list > li');
                    if (countryLi && e.target.id === countryLi.querySelector('input').id) {
                        const cityList = countryLi.querySelector('.city-list');
                        if (cityList) cityList.style.display = e.target.checked ? 'block' : 'none';
                    }
                    debouncedApplyFilters();
                } else if (e.target.matches('select')) {
                    debouncedApplyFilters();
                }
            });
        }

        // TorgetKat-specific listeners
        if (isTorgetKatPage()) {
            setupTorgetKatListeners();
        }
    }

    /**
     * Setup TorgetKat-specific event listeners
     */
    async function setupTorgetKatListeners() {
        // Off-canvas drawer
        const openBtn = document.getElementById('offcanvasFilterBtn');
        const closeBtn = document.getElementById('offcanvasFilterClose');
        const overlay = document.getElementById('offcanvasFilterOverlay');
        const drawer = document.getElementById('offcanvasFilterDrawer');
        
        const openDrawer = () => {
            drawer?.classList.add('active');
            overlay?.classList.add('active');
        };
        
        const closeDrawer = () => {
            drawer?.classList.remove('active');
            overlay?.classList.remove('active');
        };
        
        openBtn?.addEventListener('click', openDrawer);
        closeBtn?.addEventListener('click', closeDrawer);
        overlay?.addEventListener('click', closeDrawer);

        // Save Search Button
        document.body.addEventListener('click', e => {
            if (e.target.closest('.save-search-button')) {
                e.preventDefault();
                savedSearchService.saveCurrentSearch(filterStore.getFilters());
            }
        });

        // Initialize sliders
        await initializeSliders();
    }

    /**
     * Initialize sliders for TorgetKat page
     */
    async function initializeSliders() {
        if (typeof noUiSlider === 'undefined') return;

        const { sliderConfigs } = await import('../stores/FilterStore.js');
        
        Object.keys(sliderConfigs).forEach(sliderId => {
            const sliderElement = document.getElementById(sliderId);
            if (sliderElement && !sliderElement.noUiSlider) {
                const config = sliderConfigs[sliderId];
                
                noUiSlider.create(sliderElement, {
                    start: config.start,
                    connect: true,
                    step: config.step,
                    range: config.range,
                    format: config.format,
                });
                
                sliderElement.noUiSlider.on('update', (values) => {
                    document.getElementById(config.inputs[0]).value = values[0];
                    document.getElementById(config.inputs[1]).value = values[1];
                    document.getElementById(`${sliderId}-val-min`).textContent = values[0];
                    document.getElementById(`${sliderId}-val-max`).textContent = values[1];
                });
                
                sliderElement.noUiSlider.on('change', debouncedApplyFilters);
            }
        });
    }

    /**
     * Initialize data loaders
     */
    async function initializeDataLoaders() {
        // Import and use data services
        const { CountryService } = await import('../services/CountryService.js');
        const countryService = new CountryService();
        
        await countryService.initializeCountries();
        await countryService.initializeCarBrands();
    }

    /**
     * Load saved search filters if present
     */
    async function loadSavedSearchFilters() {
        const savedFilters = savedSearchService.loadSavedSearchFilters();
        if (savedFilters) {
            // Apply saved filters to UI
            await applySavedFiltersToUI(savedFilters);
            filterStore.setFilters(savedFilters);
        }
    }

    /**
     * Apply saved filters to UI elements
     * @param {object} filters - Saved filters
     */
    async function applySavedFiltersToUI(filters) {
        const { FilterUIService } = await import('../services/FilterUIService.js');
        const filterUIService = new FilterUIService();
        await filterUIService.applySavedFiltersToUI(filters);
    }

    /**
     * Main initialization function
     */
    async function run() {
        // Handle category visibility
        if (isTorgetKatPage()) {
            handleCategoryVisibility();
        }
        
        // Setup event listeners
        setupEventListeners();

        // Initialize data loaders
        await initializeDataLoaders();

        // TorgetKat-specific initialization
        if (isTorgetKatPage()) {
            // Load saved search filters if present
            await loadSavedSearchFilters();
            updateActiveFiltersDisplay();
        }

        // Initial product fetch
        fetchProducts();
    }

    // Start the application
    run();
}
