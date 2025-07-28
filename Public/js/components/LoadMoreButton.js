/**
 * Load More Button Component - Handles pagination UI
 */

import { getEl } from '../utils/domUtils.js';

class LoadMoreButton {
    constructor(onLoadMore) {
        this.onLoadMore = onLoadMore;
        this.isLoading = false;
        this.hasMore = true;
    }

    /**
     * Add load more button to container
     */
    add() {
        const container = getEl('productsContainer');
        if (!container) return;
        
        if (getEl('loadMoreButton')) return; // Already exists

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'load-more-container';
        buttonWrapper.innerHTML = `<button id="loadMoreButton" class="load-more-btn">Load More</button>`;
        
        container.appendChild(buttonWrapper);
        
        const button = getEl('loadMoreButton');
        if (button) {
            button.addEventListener('click', () => this.onLoadMore());
        }
    }

    /**
     * Update button state
     * @param {boolean} isLoading - Loading state
     * @param {boolean} hasMore - Has more items
     */
    update(isLoading, hasMore) {
        this.isLoading = isLoading;
        this.hasMore = hasMore;

        const button = getEl('loadMoreButton');
        if (button) {
            button.style.display = hasMore ? 'block' : 'none';
            button.disabled = isLoading;
            button.textContent = isLoading ? 'Loading...' : 'Load More';
        }
    }

    /**
     * Remove button from DOM
     */
    remove() {
        const button = getEl('loadMoreButton');
        if (button) {
            button.closest('.load-more-container')?.remove();
        }
    }
}

export { LoadMoreButton };
