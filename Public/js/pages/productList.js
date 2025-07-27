// public/js/pages/productList.js
import { initFavoriteButton } from '../components/favoriteButton.js';
export default function initProductListPage() {
    // --- Page Context Detection ---
    // Determine which page we are on to tailor API calls and UI initialization.
    const isTorgetKatPage = window.location.pathname.includes('/torgetkat');
    const isSearchPage = window.location.pathname.includes('/SearchResults') || window.location.pathname.includes('/search');

    // If we're not on either of these pages, do nothing.
    if (!isTorgetKatPage && !isSearchPage) {
        return;
    }

    // --- State & Configuration ---
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    const limit = 20;

    // A comprehensive state object for all possible filters across both pages.
    let currentFilters = {
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

    // Slider configurations are only used on the TorgetKat page.
    const sliderConfigs = {
        'year-slider': { range: { min: 1980, max: new Date().getFullYear() }, start: [1980, new Date().getFullYear()], step: 1, inputs: ['yearFrom', 'yearTo'], format: { to: v => Math.round(v), from: v => Math.round(v) } },
        'mileage-slider': { range: { min: 0, max: 500000 }, start: [0, 500000], step: 1000, inputs: ['mileageFrom', 'mileageTo'], format: { to: v => Math.round(v), from: v => Math.round(v) } },
        'size-slider': { range: { min: 10, max: 1000 }, start: [10, 1000], step: 10, inputs: ['sizeSqmFrom', 'sizeSqmTo'], format: { to: v => Math.round(v), from: v => Math.round(v) } },
        'rooms-slider': { range: { min: 1, max: 10 }, start: [1, 10], step: 1, inputs: ['numRoomsFrom', 'numRoomsTo'], format: { to: v => Math.round(v), from: v => Math.round(v) } },
        'bathrooms-slider': { range: { min: 1, max: 5 }, start: [1, 5], step: 1, inputs: ['numBathroomsFrom', 'numBathroomsTo'], format: { to: v => Math.round(v), from: v => Math.round(v) } }
    };

    // --- Utilities ---
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };
    const debouncedApplyFilters = debounce(applyFilters, 350);

    // --- DOM Element Selectors ---
    const getEl = (id) => document.getElementById(id);
    const queryEl = (selector) => document.querySelector(selector);
    const queryAll = (selector) => document.querySelectorAll(selector);

    // --- UI Update Functions ---
    function showLoading() {
        const overlay = getEl('loadingOverlay');
        if (overlay) overlay.style.display = 'flex';
    }

    function hideLoading() {
        const overlay = getEl('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    function showSkeletonLoading() {
        const container = getEl('productsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Create 8 skeleton product cards
        for (let i = 0; i < 8; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-product';
            skeleton.innerHTML = `
                <div class="skeleton skeleton-image"></div>
                <div>
                    <div class="skeleton skeleton-text skeleton-title"></div>
                    <div class="skeleton skeleton-text skeleton-price"></div>
                    <div class="skeleton skeleton-text skeleton-location"></div>
                </div>
            `;
            container.appendChild(skeleton);
        }
    }

    function addLoadMoreButton() {
        const container = getEl('productsContainer');
        if (!container || getEl('loadMoreButton')) return;

        // Create a dedicated container for the load more button
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'load-more-container';
        buttonWrapper.innerHTML = `<button id="loadMoreButton" class="load-more-btn">Load More</button>`;
        
        // Append to the products container instead of after it
        container.appendChild(buttonWrapper);
        
        getEl('loadMoreButton').addEventListener('click', () => fetchProducts(true));
    }
    
    function updateLoadMoreButton() {
        const button = getEl('loadMoreButton');
        if (button) {
            button.style.display = hasMore ? 'block' : 'none';
            button.disabled = isLoading;
            button.textContent = isLoading ? 'Loading...' : 'Load More';
        } else if(hasMore) {
            addLoadMoreButton();
        }
    }

    // --- Product Rendering Logic ---
    function createProductElement(product) {
        if (!product) return document.createElement('div');

        const isJob = product.category === 'Jobb';
        const isCar = product.category === 'Bil';
        const isProperty = product.category === 'Eiendom';

        const div = document.createElement('div');
        div.className = 'product';
        div.setAttribute('role', 'article');
        div.setAttribute('tabindex', '0');

        const images = product.Images ? product.Images.split(',') : [];
        const imageUrl = images.length > 0 ? `/uploads/${images[0].trim()}` : '/images/default-product.png';
        const productName = isJob ? product.JobTitle : isCar ? `${product.brand_name || ''} ${product.model_name || ''}`.trim() : product.ProductName;

        let innerHTML = `
            <img src="/images/placeholder.png" data-src="${imageUrl}" alt="${productName}" class="product-image" onerror="this.onerror=null;this.src='/images/default-product.png';">
            <div>
                <h3>
                    ${productName || 'Unnamed Product'}
                    ${product.Sold ? `<span class="sold-label" data-i18n="product_details.sold">(Sold)</span>` : ''}
                    <button class="fas fa-heart favorite-icon" 
                            data-product-id="${product.ProductdID}"
                            aria-label="Add to favorites"
                            aria-pressed="false">
                    </button>
                </h3>`;

        if (isCar) innerHTML += `<p class="custom-title">${product.ProductName}</p><p><strong>Year:</strong> ${product.Year || 'N/A'}</p><p><strong>Mileage:</strong> ${product.Mileage ? `${product.Mileage.toLocaleString()} km` : 'N/A'}</p>`;
        else if (isProperty) innerHTML += `<p><strong>Price:</strong> ${product.Price ? `$${product.Price.toLocaleString()}` : 'Contact for price'}</p><p><strong>Type:</strong> ${product.PropertyType}</p><p><strong>Size:</strong> ${product.SizeSqm} m²</p>`;
        else if (isJob) innerHTML += `<p><strong>Company:</strong> ${product.CompanyName || 'N/A'}</p><p><strong>Type:</strong> ${product.EmploymentType || 'N/A'}</p>`;
        else innerHTML += `<p><strong>Price:</strong> ${product.Price ? `${product.Price.toLocaleString()} $` : 'Contact for price'}</p>`;

        innerHTML += `<p><strong>Location:</strong> ${(product.cityName || product.Location || 'N/A')}${product.country ? `, ${product.country}` : ''}</p></div>`;
        div.innerHTML = innerHTML;

        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('favorite-icon')) {
                window.location.href = `/productDetails?productdID=${product.ProductdID}`;
            }
        });

        const favoriteButton = div.querySelector('.favorite-icon');
        initFavoriteButton(favoriteButton); // Initialize the button using our component logic

        return div;
    }

    function displayProducts(products, loadMore = false) {
        const container = getEl('productsContainer');
        if (!container) return;

        if (!loadMore) container.innerHTML = '';
        if ((!products || products.length === 0) && !loadMore) {
            container.innerHTML = '<p class="no-products">No products found for the current criteria.</p>';
            return;
        }

        products.forEach(product => {
            container.appendChild(createProductElement(product));
        });

        // Add load more button only after first successful product load
        if (!loadMore && products.length > 0 && !getEl('loadMoreButton')) {
            addLoadMoreButton();
        }

        initializeFavorites();
        if (window.ishtri?.lazyLoader) {
            window.ishtri.lazyLoader.observe();
        }
    }
    
    // --- Core Data Fetching ---
    function fetchProducts(loadMore = false, cacheBuster = null) {
        if (isLoading) return;
        if (!loadMore) {
            currentPage = 1;
            hasMore = true;
        }
        if (!hasMore && loadMore) return;

        isLoading = true;
        
        // Show skeleton loading for initial load, loading overlay for load more
        if (!loadMore) {
            showSkeletonLoading();
        } else {
            showLoading();
        }
        
        updateLoadMoreButton();

        const offset = (currentPage - 1) * limit;
        const urlParams = new URLSearchParams(window.location.search);
        let apiUrl;

        // 1. Determine Base API URL
        if (isTorgetKatPage) {
            const category = urlParams.get('category') || 'default';
            apiUrl = `/api/products?category=${category}&limit=${limit}&offset=${offset}`;
        } else { // isSearchPage
            const searchQuery = urlParams.get("query") || '';
            apiUrl = `/api/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${offset}`;
        }
        
        // 2. Append All Filter Parameters
        if (currentFilters.priceOrder) apiUrl += `&sortPrice=${currentFilters.priceOrder}`;
        if (currentFilters.dateOrder) apiUrl += `&sortDate=${currentFilters.dateOrder}`;
        if (currentFilters.subCategory) apiUrl += `&subCategory=${encodeURIComponent(currentFilters.subCategory)}`;
        if (currentFilters.selectedCountries.length) apiUrl += `&countries=${encodeURIComponent(currentFilters.selectedCountries.join(','))}`;
        if (currentFilters.selectedCities.length) apiUrl += `&cities=${encodeURIComponent(currentFilters.selectedCities.join(','))}`;
        if (currentFilters.selectedCarBrands.length) apiUrl += `&carBrand=${encodeURIComponent(currentFilters.selectedCarBrands.join(','))}`;
        if (currentFilters.yearRange.from) apiUrl += `&yearFrom=${currentFilters.yearRange.from}`;
        if (currentFilters.yearRange.to) apiUrl += `&yearTo=${currentFilters.yearRange.to}`;
        if (currentFilters.mileageRange.from) apiUrl += `&mileageFrom=${currentFilters.mileageRange.from}`;
        if (currentFilters.mileageRange.to) apiUrl += `&mileageTo=${currentFilters.mileageRange.to}`;
        if (currentFilters.fuelTypes.length) apiUrl += `&fuelTypes=${encodeURIComponent(currentFilters.fuelTypes.join(','))}`;
        if (currentFilters.transmissionTypes.length) apiUrl += `&transmissionTypes=${encodeURIComponent(currentFilters.transmissionTypes.join(','))}`;
        if (currentFilters.propertyTypes.length) apiUrl += `&propertyType=${encodeURIComponent(currentFilters.propertyTypes.join(','))}`;
        if (currentFilters.sizeRange.from) apiUrl += `&sizeSqmFrom=${currentFilters.sizeRange.from}`;
        if (currentFilters.sizeRange.to) apiUrl += `&sizeSqmTo=${currentFilters.sizeRange.to}`;
        if (currentFilters.roomsRange.from) apiUrl += `&numRoomsFrom=${currentFilters.roomsRange.from}`;
        if (currentFilters.roomsRange.to) apiUrl += `&numRoomsTo=${currentFilters.roomsRange.to}`;
        if (currentFilters.bathroomsRange.from) apiUrl += `&numBathroomsFrom=${currentFilters.bathroomsRange.from}`;
        if (currentFilters.bathroomsRange.to) apiUrl += `&numBathroomsTo=${currentFilters.bathroomsRange.to}`;
        if (currentFilters.energyClasses.length) apiUrl += `&energyClass=${encodeURIComponent(currentFilters.energyClasses.join(','))}`;
        if (currentFilters.employmentTypes.length) apiUrl += `&employmentTypes=${encodeURIComponent(currentFilters.employmentTypes.join(','))}`;
        if (currentFilters.salaryRange.from) apiUrl += `&salaryFrom=${currentFilters.salaryRange.from}`;
        if (currentFilters.salaryRange.to) apiUrl += `&salaryTo=${currentFilters.salaryRange.to}`;
        if (currentFilters.applicationDeadline) apiUrl += `&deadline=${currentFilters.applicationDeadline}`;
        
        if (cacheBuster) apiUrl += `&_=${cacheBuster}`;
        
        // 3. Execute Fetch
        fetch(apiUrl)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                const products = data.products || data; // Handle both API response structures
                hasMore = products.length >= limit;
                displayProducts(products, loadMore);
                if (loadMore) currentPage++;
            })
            .catch(error => {
                console.error("Error fetching products:", error);
                const container = getEl('productsContainer');
                if(container) container.innerHTML = `<p class="error-message">Error loading products. Please try refreshing.</p>`;
                if (window.ishtri?.toast) window.ishtri.toast.show('Error loading products.', 'error');
                hasMore = false;
            })
            .finally(() => {
                isLoading = false;
                hideLoading();
                updateLoadMoreButton();
            });
    }

    // --- Filter Management ---
    function updateCurrentFiltersFromUI() {
        const getMultiSelectValues = (id) => Array.from(getEl(id)?.selectedOptions || []).map(opt => opt.value);
        
        currentFilters = {
            priceOrder: getEl('priceFilter')?.value || '',
            dateOrder: getEl('dateFilter')?.value || '',
            subCategory: getEl('subCategoryFilter')?.value || '',
            selectedCountries: Array.from(queryAll('.country-list > li > input[type="checkbox"]:checked')).map(cb => cb.value),
            selectedCities: Array.from(queryAll('.city-list input[type="checkbox"]:checked')).map(cb => cb.value),
            selectedCarBrands: Array.from(queryAll('.car-brand-list input[type="checkbox"]:checked')).map(cb => cb.value),
            yearRange: { from: getEl('yearFrom')?.value, to: getEl('yearTo')?.value },
            mileageRange: { from: getEl('mileageFrom')?.value, to: getEl('mileageTo')?.value },
            fuelTypes: getMultiSelectValues('fuelTypeFilter'),
            transmissionTypes: getMultiSelectValues('transmissionFilter'),
            propertyTypes: getMultiSelectValues('propertyTypeFilter'),
            sizeRange: { from: getEl('sizeSqmFrom')?.value, to: getEl('sizeSqmTo')?.value },
            roomsRange: { from: getEl('numRoomsFrom')?.value, to: getEl('numRoomsTo')?.value },
            bathroomsRange: { from: getEl('numBathroomsFrom')?.value, to: getEl('numBathroomsTo')?.value },
            energyClasses: getMultiSelectValues('energyClassFilter'),
            employmentTypes: getMultiSelectValues('employmentTypeFilter'),
            salaryRange: { from: getEl('salaryFrom')?.value, to: getEl('salaryTo')?.value },
            applicationDeadline: getEl('deadlineDate')?.value
        };
    }
    
    function applyFilters() {
        updateCurrentFiltersFromUI();
        if (isTorgetKatPage) {
            updateActiveFiltersDisplay();
        }
        fetchProducts(false); // Fetch from page 1 with new filters
    }

    function resetFilters() {
        // Reset UI form elements
        queryAll('.side-panel input[type="checkbox"]').forEach(cb => cb.checked = false);
        queryAll('.city-list').forEach(list => list.style.display = 'none');
        ['priceFilter', 'dateFilter', 'subCategoryFilter', 'fuelTypeFilter', 'transmissionFilter', 'propertyTypeFilter', 'energyClassFilter', 'employmentTypeFilter'].forEach(id => {
            const el = getEl(id);
            if (el) {
                if (el.multiple) Array.from(el.options).forEach(opt => opt.selected = false);
                else el.selectedIndex = 0;
            }
        });
        ['salaryFrom', 'salaryTo', 'deadlineDate'].forEach(id => {
            const el = getEl(id); if (el) el.value = '';
        });

        // Reset sliders if they exist (TorgetKat page)
        if (isTorgetKatPage) {
            Object.keys(sliderConfigs).forEach(sliderId => {
                const sliderEl = getEl(sliderId);
                if (sliderEl && sliderEl.noUiSlider) {
                    sliderEl.noUiSlider.set(sliderConfigs[sliderId].start);
                }
            });
        }
        
        // Trigger a fresh fetch with reset filters
        applyFilters();
    }

     function handleCategoryVisibility() {
        if (!isTorgetKatPage) return; // Only run on the category page

        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');

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
        // Add other categories here if you have them (e.g., 'Båt', 'MC')

        // Now, show the correct section based on the category
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
            // Add more cases for 'Båt', 'MC', etc.
            default:
                // No specific filters to show for other categories
                break;
        }
    }
    
    // --- Active Filter Tags UI (TorgetKat Only) ---
    function updateActiveFiltersDisplay() {
        if (!isTorgetKatPage) return;
        const displayContainer = getEl('activeFiltersDisplay');
        if (!displayContainer) return;

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
        
        // This is a simplified version. The fully detailed version would check every single filter
        // in `currentFilters` and create a tag if it's not set to its default value.
        currentFilters.selectedCountries.forEach(country => {
            addFilterTag('Country', country, () => {
                const cb = getEl(country); if (cb) cb.checked = false;
                applyFilters();
            });
        });
        
        // Add logic for all other filters here... (subCategory, carBrand, yearRange etc.)

        displayContainer.style.display = hasActiveFilters ? 'flex' : 'none';
    }


    // --- Initialization ---
    async function initializeCountries() {
        const countryList = queryEl('.country-list');
        if (!countryList || countryList.dataset.initialized) return;

        try {
            const response = await fetch('/api/utils/countries');
            const countries = await response.json();
            
            countries.forEach(countryData => {
                const countryItem = document.createElement('li');
                countryItem.innerHTML = `
                    <input type="checkbox" id="${countryData.country}" value="${countryData.country}">
                    <label for="${countryData.country}">${countryData.country}</label>
                    <ul class="city-list" id="${countryData.country}-cities" style="display: none;"></ul>`;
                
                const cityList = countryItem.querySelector('.city-list');
                countryData.cities.forEach((cityName, index) => {
                    const cityId = countryData.city_ids[index];
                    cityList.innerHTML += `<li><input type="checkbox" id="city_${cityId}" value="${cityId}"><label for="city_${cityId}">${cityName}</label></li>`;
                });
                countryList.appendChild(countryItem);
            });
            countryList.dataset.initialized = 'true';
        } catch (error) {
            console.error("Error loading countries:", error);
            countryList.innerHTML = '<li>Error loading filters.</li>';
        }
    }

    async function initializeCarBrands() {
        const carBrandList = queryEl('.car-brand-list');
        if (!carBrandList || carBrandList.dataset.initialized) return;

        try {
            const response = await fetch('/api/utils/car-brands');
            const brands = await response.json();
            
            brands.forEach(brand => {
                const brandItem = document.createElement('li');
                brandItem.innerHTML = `
                    <input type="checkbox" id="brand_${brand.brand_id}" value="${brand.brand_id}">
                    <label for="brand_${brand.brand_id}">${brand.brand_name}</label>`;
                carBrandList.appendChild(brandItem);
            });
            carBrandList.dataset.initialized = 'true';
        } catch (error) {
            console.error("Error loading car brands:", error);
            carBrandList.innerHTML = '<li>Error loading car brands.</li>';
        }
    }

     function initializeFavorites() {
        fetch('/api/favorites', { credentials: 'include' })
            .then(res => res.ok ? res.json() : Promise.reject('Not logged in or API error'))
            .then(favorites => {
                const favoriteIds = new Set(favorites.map(f => f.ProductdID));
                
                document.querySelectorAll('.favorite-icon').forEach(icon => {
                    const productId = Number(icon.dataset.productId);
                    const isFavorited = favoriteIds.has(productId);
                    
                    // Set the initial visual state
                    icon.classList.toggle('favorited', isFavorited);
                    icon.setAttribute('aria-pressed', isFavorited);
                    icon.style.color = isFavorited ? '#ff4757' : '#ccc';
                });
            })
            .catch(() => {
                // Fail silently if the user is not logged in.
                // The buttons will just appear in their default (unfavorited) state.
            });
    }

    function setupEventListeners() {
        // General Filters
        getEl('priceFilter')?.addEventListener('change', applyFilters);
        getEl('dateFilter')?.addEventListener('change', applyFilters);
        getEl('subCategoryFilter')?.addEventListener('change', applyFilters);
        getEl('resetFiltersBtn')?.addEventListener('click', resetFilters);
        getEl('resetFiltersBtn-mobile')?.addEventListener('click', resetFilters);

        // Delegated listener for dynamically loaded filter lists
        const sidePanel = getEl('mainSidePanel');
        if (sidePanel) {
            sidePanel.addEventListener('change', e => {
                if (e.target.matches('input[type="checkbox"]')) {
                    const countryLi = e.target.closest('.country-list > li');
                    // Toggle city list visibility if a country checkbox is clicked
                    if (countryLi && e.target.id === countryLi.querySelector('input').id) {
                         const cityList = countryLi.querySelector('.city-list');
                         if(cityList) cityList.style.display = e.target.checked ? 'block' : 'none';
                    }
                    debouncedApplyFilters();
                } else if (e.target.matches('select')) {
                    debouncedApplyFilters();
                }
            });
        }
        
        // Favorite Icons (delegated to the container)
        getEl('productsContainer')?.addEventListener('click', e => {
            if (e.target.matches('.favorite-icon')) {
                 // Favorite click logic (already in createProductElement, but could be delegated here too)
            }
        });

        // TorgetKat-specific listeners
        if (isTorgetKatPage) {
            // Off-canvas drawer
            const openBtn = getEl('offcanvasFilterBtn');
            const closeBtn = getEl('offcanvasFilterClose');
            const overlay = getEl('offcanvasFilterOverlay');
            const drawer = getEl('offcanvasFilterDrawer');
            const openDrawer = () => { /* ... full open logic ... */ drawer?.classList.add('active'); overlay?.classList.add('active'); };
            const closeDrawer = () => { /* ... full close logic ... */ drawer?.classList.remove('active'); overlay?.classList.remove('active'); };
            openBtn?.addEventListener('click', openDrawer);
            closeBtn?.addEventListener('click', closeDrawer);
            overlay?.addEventListener('click', closeDrawer);

            // Save Search Button
            document.body.addEventListener('click', e => {
                if (e.target.closest('.save-search-button')) {
                    // ... Paste the full Save Search logic here ...
                    console.log("Save search clicked!");
                }
            });
        }
    }

    function initializeSliders() {
        if (!isTorgetKatPage || typeof noUiSlider === 'undefined') return;

        Object.keys(sliderConfigs).forEach(sliderId => {
            const sliderElement = getEl(sliderId);
            if (sliderElement && !sliderElement.noUiSlider) { // Check if not already initialized
                const config = sliderConfigs[sliderId];
                noUiSlider.create(sliderElement, {
                    start: config.start,
                    connect: true,
                    step: config.step,
                    range: config.range,
                    format: config.format,
                });
                sliderElement.noUiSlider.on('update', (values) => {
                    getEl(config.inputs[0]).value = values[0];
                    getEl(config.inputs[1]).value = values[1];
                    getEl(`${sliderId}-val-min`).textContent = values[0];
                    getEl(`${sliderId}-val-max`).textContent = values[1];
                });
                sliderElement.noUiSlider.on('change', debouncedApplyFilters);
            }
        });
    }

    // --- Main Execution Block ---
    async function run() {
        // --- MODIFIED: Call the new visibility handler ---
        if (isTorgetKatPage) {
            handleCategoryVisibility();
        }
        
        setupEventListeners();

        // Perform initializations
        await initializeCountries();
        await initializeCarBrands();

        if (isTorgetKatPage) {
            initializeSliders();
            updateActiveFiltersDisplay();
            // Other TorgetKat specific initializations would go here
        }

        // Initial fetch of products
        fetchProducts();
    }

    // Run the main initialization logic for the page
    run();
}