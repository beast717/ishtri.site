// /Public/js/pages/savedSearches.js

let cityMap = {};
let countryMap = {};

const subCategoryTranslations = {
    'Klær': 'Clothes',
    'Elektronikk': 'Electronics',
    'Hvitvarer': 'White Goods',
    'Møbler': 'Furniture',
    'Annet': 'Else'
    // Add more translations if needed
};

async function loadCountriesData() {
    try {
        const countriesResponse = await fetch('/api/utils/countries');
        const countriesData = await countriesResponse.json();
        
        countriesData.forEach(country => {
            countryMap[country.country] = country.country;
            country.cities.forEach((city, index) => {
                cityMap[country.city_ids[index]] = city;
            });
        });
    } catch (countriesError) {
        console.error("Error fetching countries:", countriesError);
    }
}

function parseFilters(search) {
    let filtersObj;
    
    try {
        if (typeof search.filters === 'string') {
            // It's a string, attempt to parse
            filtersObj = search.filters ? JSON.parse(search.filters) : {};
            console.log(`Parsed filters STRING for search ${search.search_id}:`, filtersObj);
        } else if (typeof search.filters === 'object' && search.filters !== null) {
            // It's already an object, use it directly
            filtersObj = search.filters;
            console.log(`Using filters OBJECT directly for search ${search.search_id}:`, filtersObj);
        } else {
            // Handle null, undefined, or other unexpected types
            console.warn(`Unexpected type or null filters for search ${search.search_id}:`, search.filters);
            filtersObj = {};
        }
    } catch (e) {
        console.error(`Error parsing filters JSON STRING for display (Search ID: ${search.search_id}):`, search.filters, e);
        filtersObj = {};
    }
    
    return filtersObj;
}

function generateFiltersSummary(filtersObj) {
    if (Object.keys(filtersObj).length === 0) {
        return 'No specific filters';
    }

    let filtersSummary = 'Filters: ';
    
    filtersSummary += Object.entries(filtersObj).map(([key, value]) => {
        // Translate SubCategory for Display
        let displayValue = value;
        if (key === 'subCategory' && subCategoryTranslations[value]) {
            displayValue = subCategoryTranslations[value];
        }

        if (key === 'cities' && Array.isArray(value)) {
            const cityNames = value.map(cityId => cityMap[cityId] || `Unknown City (ID: ${cityId})`);
            return `cities: ${cityNames.join(', ')}`;
        } else if (key === 'countries' && Array.isArray(value)) {
            const countryNames = value.map(countryName => countryMap[countryName] || countryName);
            return `countries: ${countryNames.join(', ')}`;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && (value.hasOwnProperty('from') || value.hasOwnProperty('to'))) {
            const rangeParts = [];
            if (value.from !== null && value.from !== undefined && value.from !== '') rangeParts.push(value.from);
            if (value.to !== null && value.to !== undefined && value.to !== '') rangeParts.push(value.to);
            const formattedRange = rangeParts.join(' - ');
            // Format key (e.g., yearRange -> Year Range)
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Range', ' Range');
            return `${formattedKey}: ${formattedRange || 'Any'}`;
        } else if (Array.isArray(value)) {
            if (value.length > 0) {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // e.g. fuel_types -> Fuel Types
                return `${formattedKey}: ${value.join(', ')}`;
            } else {
                return '';
            }
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // e.g. subCategory -> Sub Category
            return `${formattedKey}: ${displayValue}`;
        } else {
            return '';
        }
    }).filter(Boolean) // Remove empty strings
      .slice(0, 3)    // Limit to first 3 filters shown
      .join('; ');     // Join with semicolon and space

    if (Object.keys(filtersObj).length > 3 && filtersSummary.length > 0 && filtersSummary !== 'Filters: ') {
        filtersSummary += '...'; // Add ellipsis if more than 3 filters exist
    }
    
    if (filtersSummary === 'Filters: ') {
        filtersSummary = 'No specific filters'; // Catch case where all filters resulted in empty strings
    }
    
    return filtersSummary;
}

function attachDeleteListener(item, search, listContainer) {
    item.querySelector('.delete-btn').addEventListener('click', async (e) => {
        const searchId = item.dataset.searchId;
        if (!confirm(`Are you sure you want to delete the search "${search.search_name}"?`)) return;

        try {
            const deleteResponse = await fetch(`/api/saved-searches/${searchId}`, { method: 'DELETE' });
            if (!deleteResponse.ok) {
                const errorData = await deleteResponse.json();
                throw new Error(errorData.message || 'Failed to delete search.');
            }
            item.remove(); // Remove from UI
            window.ishtri.toast.show('Search deleted.', 'success');
            // If list becomes empty, show message
            if (listContainer.children.length === 0) {
                listContainer.innerHTML = '<p class="no-searches">You have no saved searches yet.</p>';
            }
        } catch (error) {
            console.error("Delete error:", error);
            window.ishtri.toast.show(`Error: ${error.message}`, 'error');
        }
    });
}

function attachViewResultsListener(item) {
    item.querySelector('.view-btn').addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        const filters = JSON.parse(e.target.dataset.filters);
        const params = new URLSearchParams();
        params.set('category', category);

        // Convert saved filter names/structure to URL query parameters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== '') {
                // Handle different key mappings between saved filters and URL parameters
                if (key === 'selectedCarBrands' || key === 'car_brands') {
                    if (Array.isArray(value) && value.length > 0) {
                        params.set('carBrand', value.join(','));
                    }
                } else if (key === 'selectedCountries' || key === 'countries') {
                    if (Array.isArray(value) && value.length > 0) {
                        params.set('countries', value.join(','));
                    }
                } else if (key === 'selectedCities' || key === 'cities') {
                    if (Array.isArray(value) && value.length > 0) {
                        params.set('cities', value.join(','));
                    }
                } else if (key === 'fuelTypes' || key === 'fuel_types') {
                    if (Array.isArray(value) && value.length > 0) {
                        params.set('fuelTypes', value.join(','));
                    }
                } else if (key === 'transmissionTypes' || key === 'transmission_types') {
                    if (Array.isArray(value) && value.length > 0) {
                        params.set('transmissionTypes', value.join(','));
                    }
                } else if (key === 'property_types' || key === 'propertyTypes') {
                    if (Array.isArray(value) && value.length > 0) {
                        params.set('propertyType', value.join(','));
                    }
                } else if (key === 'energy_classes' || key === 'energyClasses') {
                    if (Array.isArray(value) && value.length > 0) {
                        params.set('energyClass', value.join(','));
                    }
                } else if (key === 'employment_types' || key === 'employmentTypes') {
                    if (Array.isArray(value) && value.length > 0) {
                        params.set('employmentTypes', value.join(','));
                    }
                } else if (key === 'priceOrder') {
                    params.set('sortPrice', value);
                } else if (key === 'dateOrder') {
                    params.set('sortDate', value);
                } else if (key === 'sizeRange') {
                    if (value.from) params.set('sizeSqmFrom', value.from);
                    if (value.to) params.set('sizeSqmTo', value.to);
                } else if (key === 'roomsRange') {
                    if (value.from) params.set('numRoomsFrom', value.from);
                    if (value.to) params.set('numRoomsTo', value.to);
                } else if (key === 'bathroomsRange') {
                    if (value.from) params.set('numBathroomsFrom', value.from);
                    if (value.to) params.set('numBathroomsTo', value.to);
                } else if (key === 'yearRange') {
                    if (value.from) params.set('yearFrom', value.from);
                    if (value.to) params.set('yearTo', value.to);
                } else if (key === 'mileageRange') {
                    if (value.from) params.set('mileageFrom', value.from);
                    if (value.to) params.set('mileageTo', value.to);
                } else if (key === 'salaryRange') {
                    if (value.from) params.set('salaryFrom', value.from);
                    if (value.to) params.set('salaryTo', value.to);
                } else if (key === 'applicationDeadline') {
                    params.set('deadline', value);
                } else if (Array.isArray(value)) {
                    if (value.length > 0) {
                        params.set(key, value.join(','));
                    }
                } else if (typeof value === 'object') { // Handle range objects
                    if (value.from && !key.endsWith('Range')) params.set(`${key}_from`, value.from);
                    if (value.to) params.set(`${key}_to`, value.to);
                } else {
                    params.set(key, value);
                }
            }
        });

        const finalUrl = `/torgetkat?${params.toString()}`;

        // Redirect to the category page with filters applied
        window.location.href = finalUrl;
    });
}

async function loadSavedSearches() {
    const listContainer = document.getElementById('savedSearchesList');
    
    if (!listContainer) {
        console.error('Saved searches list container not found');
        return;
    }

    // Show skeleton loading using the SkeletonLoader class
    window.ishtri.skeletonLoader.showInContainer('savedSearchesList', 'savedSearch', 3);

    try {
        // Load countries data first
        await loadCountriesData();

        const searchesResponse = await fetch('/api/saved-searches');
        if (!searchesResponse.ok) {
            if (searchesResponse.status === 401) {
                throw new Error('Please log in to view saved searches.');
            }
            throw new Error('Failed to load saved searches.');
        }
        
        const searches = await searchesResponse.json();
        
        // Hide skeleton and clear container
        window.ishtri.skeletonLoader.hideInContainer('savedSearchesList');
        
        if (!searches || searches.length === 0) {
            listContainer.innerHTML = '<p class="no-searches">You have no saved searches yet.</p>';
            return;
        }

        searches.forEach(search => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.dataset.searchId = search.search_id;

            // Parse filters and generate summary
            const filtersObj = parseFilters(search);
            const filtersSummary = generateFiltersSummary(filtersObj);

            item.innerHTML = `
                <div>
                    <h3>${search.search_name || 'Untitled Search'}</h3>
                    <div class="category">Category: ${search.category}</div>
                    <div class="filters-summary">${filtersSummary}</div>
                </div>
                <div class="search-item-actions">
                    <button class="btn btn-primary view-btn" data-category="${search.category}" data-filters='${JSON.stringify(filtersObj || {})}'>View Results</button>
                    <button class="btn btn-danger delete-btn">Delete</button>
                </div>
            `;

            // Attach event listeners
            attachDeleteListener(item, search, listContainer);
            attachViewResultsListener(item);

            listContainer.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading saved searches:', error);
        
        // Hide skeleton on error
        window.ishtri.skeletonLoader.hideInContainer('savedSearchesList');
        listContainer.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
    }
}

export default function initSavedSearchesPage() {
    console.log('Initializing saved searches page...');
    
    // Check if on the correct page
    if (!document.querySelector('.saved-searches-container')) return;

    // Load saved searches when page is ready
    loadSavedSearches();
    
    console.log('Saved searches page initialized successfully');
}