/**
 * Product Service - Handles product fetching and pagination
 */

import { buildApiUrl } from '../utils/urlUtils.js';

class ProductService {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.loadedProductIds = new Set();
        this.limit = 20;
    }

    /**
     * Fetch products with filters
     * @param {object} filters - Filter object
     * @param {boolean} loadMore - Whether this is a load more request
     * @param {string} cacheBuster - Optional cache buster
     * @returns {Promise} Fetch promise
     */
    async fetchProducts(filters, loadMore = false, cacheBuster = null) {
        if (this.isLoading) return;
        
        if (!loadMore) {
            this.currentPage = 1;
            this.hasMore = true;
        }
        
        if (!this.hasMore && loadMore) return;

        this.isLoading = true;

        try {
            // Calculate offset BEFORE incrementing currentPage for loadMore
            const offset = loadMore ? this.currentPage * this.limit : 0;
            const apiUrl = buildApiUrl(filters, this.limit, offset, cacheBuster);

            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const products = data.products || data;
            const total = data.total || products.length;

            // Update pagination state
            const currentlyLoaded = this.loadedProductIds.size + (products?.length || 0);
            this.hasMore = currentlyLoaded < total;

            // Filter out duplicates for load more
            const newProducts = loadMore ? 
                products.filter(product => {
                    const productId = product.ProductdID || product.productdID;
                    if (this.loadedProductIds.has(productId)) {
                        return false;
                    }
                    this.loadedProductIds.add(productId);
                    return true;
                }) : products;

            // Track all products
            if (!loadMore) {
                this.loadedProductIds.clear();
            }
            newProducts.forEach(product => {
                const productId = product.ProductdID || product.productdID;
                this.loadedProductIds.add(productId);
            });

            // Increment currentPage AFTER successful fetch for loadMore
            if (loadMore) {
                this.currentPage++;
            }

            return {
                products: newProducts,
                total,
                hasMore: this.hasMore,
                isLoadMore: loadMore
            };

        } catch (error) {
            console.error("Error fetching products:", error);
            this.hasMore = false;
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Reset pagination state
     */
    resetPagination() {
        this.currentPage = 1;
        this.hasMore = true;
        this.loadedProductIds.clear();
    }

    /**
     * Get current loading state
     * @returns {boolean}
     */
    getLoadingState() {
        return this.isLoading;
    }

    /**
     * Check if more products available
     * @returns {boolean}
     */
    hasMoreProducts() {
        return this.hasMore;
    }
}

// Export singleton instance
export const productService = new ProductService();
