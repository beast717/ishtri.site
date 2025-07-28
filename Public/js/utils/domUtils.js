/**
 * DOM Utility Functions
 * Centralized DOM manipulation helpers
 */

export const getEl = (id) => document.getElementById(id);
export const queryEl = (selector) => document.querySelector(selector);
export const queryAll = (selector) => document.querySelectorAll(selector);

/**
 * Debounce utility for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
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

/**
 * Show/hide loading states
 */
export const showLoading = () => {
    const overlay = getEl('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
};

export const hideLoading = () => {
    const overlay = getEl('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
};

export const showSkeletonLoading = () => {
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
};
