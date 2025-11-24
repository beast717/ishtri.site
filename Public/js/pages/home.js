import { createProductElement } from '../components/ProductCard.js';
import { initAllFavoriteButtons } from '../components/favoriteButton.js';

const RANDOM_PRODUCTS_ENDPOINT = '/api/utils/random-products';

/**
 * Update the recommended section title when the language changes
 */
function updateRecommendedTitle() {
    const titleElement = document.getElementById('recommendedTitle');
    if (titleElement && window.ishtri && window.ishtri.i18n) {
        titleElement.textContent = window.ishtri.i18n.t('home.recommended');
    }
}

/**
 * Paint recommended products into the grid
 */
function renderRecommendedProducts(products = []) {
    const container = document.getElementById('randomProducts');
    if (!container) return;

    window.ishtri?.skeletonLoader.hideInContainer('randomProducts');
    container.innerHTML = '';

    if (!products.length) {
        const emptyMessage = window.ishtri?.i18n?.t('home.recommended_empty') || 'No recommendations right now. Check back soon!';
        const emptyElement = document.createElement('p');
        emptyElement.className = 'recommended-empty';
        emptyElement.textContent = emptyMessage;
        container.appendChild(emptyElement);
        container.setAttribute('aria-busy', 'false');
        return;
    }

    products.forEach(product => {
        container.appendChild(createProductElement(product, { layout: 'grid' }));
    });

    initAllFavoriteButtons(container);
    hydrateFavoriteIcons(container);
    window.ishtri?.lazyLoader?.refresh();

    container.setAttribute('aria-busy', 'false');
}

/**
 * Fetch random products and handle loading states
 */
async function loadRandomProducts({ showSkeleton = true } = {}) {
    const container = document.getElementById('randomProducts');
    if (!container) return;

    if (showSkeleton) {
        window.ishtri?.skeletonLoader.showInContainer('randomProducts', 'product', 6);
        container.setAttribute('aria-busy', 'true');
    }

    try {
        const response = await fetch(RANDOM_PRODUCTS_ENDPOINT);
        if (!response.ok) {
            throw new Error(`Failed to load recommendations (${response.status})`);
        }
        const products = await response.json();
        renderRecommendedProducts(products);
    } catch (error) {
        handleRecommendationError(error);
    }
}

function handleRecommendationError(error) {
    console.error('Error loading random products:', error);
    const container = document.getElementById('randomProducts');
    if (!container) return;

    window.ishtri?.skeletonLoader.hideInContainer('randomProducts');
    const errorMessage = window.ishtri?.i18n?.t('home.recommended_error') || 'Error loading products. Please try again.';
    container.innerHTML = '';
    const errorElement = document.createElement('p');
    errorElement.className = 'recommended-empty';
    errorElement.textContent = errorMessage;
    container.appendChild(errorElement);
    container.setAttribute('aria-busy', 'false');
    window.ishtri?.toast?.show(errorMessage, 'error');
}

async function hydrateFavoriteIcons(container) {
    if (!window.ishtri?.user?.brukerId) return;
    try {
        const response = await fetch('/api/favorites', { credentials: 'include' });
        if (!response.ok) return;
        const favorites = await response.json();
        const favoriteIds = new Set(favorites.map(item => item.ProductdID));
        container.querySelectorAll('.favorite-icon').forEach(icon => {
            const productId = Number(icon.dataset.productId);
            const isFavorited = favoriteIds.has(productId);
            icon.classList.toggle('favorited', isFavorited);
            icon.setAttribute('aria-pressed', isFavorited);
            icon.style.color = isFavorited ? '#ff4757' : '#ccc';
        });
    } catch (error) {
        console.error('Unable to hydrate favorite icons:', error);
    }
}

/**
 * Initialize search tracking
 */
function initSearchTracking() {
    const searchForm = document.querySelector('.søkeBarContainer form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            const searchInput = searchForm.querySelector('input[name="query"]');
            if (searchInput && searchInput.value.trim()) {
                // Track search event
                if (window.ishtri && window.ishtri.trackSearch) {
                    window.ishtri.trackSearch(searchInput.value.trim());
                }
            }
        });
    }
}

function initRecommendationRefresh() {
    const refreshButton = document.getElementById('refreshHomeRecommendations');
    if (!refreshButton) return;

    refreshButton.addEventListener('click', async () => {
        refreshButton.classList.add('is-loading');
        refreshButton.setAttribute('aria-busy', 'true');
        await loadRandomProducts();
        refreshButton.classList.remove('is-loading');
        refreshButton.setAttribute('aria-busy', 'false');
    });
}

function initQuickSearchPills() {
    const pills = document.querySelectorAll('[data-quick-search]');
    if (!pills.length) return;

    const searchInput = document.getElementById('homeSearchInput');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const query = pill.dataset.quickSearch;
            if (searchInput) {
                searchInput.value = query;
                searchInput.focus();
            }
            if (window.ishtri?.trackSearch) {
                window.ishtri.trackSearch(`quick:${query}`);
            }
        });
    });
}

/**
 * Initialize homepage functionality
 */
export default function initHomePage() {
    // Initialize search tracking
    initSearchTracking();
    initQuickSearchPills();
    initRecommendationRefresh();
    
    // Update recommended section title with translation
    updateRecommendedTitle();
    
    // Load random products
    loadRandomProducts();
    
    // Check for unread messages if user is logged in (this was in the old onload function)
    if (window.ishtri && window.ishtri.user && window.ishtri.user.brukernavn) {
        // The navbar component will handle message and notification badge updates
    }
    
    // Listen for language change events to update title
    window.addEventListener('languageChanged', updateRecommendedTitle);
}