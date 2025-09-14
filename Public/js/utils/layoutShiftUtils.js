/**
 * Layout Shift Prevention Utilities for EJS Views
 * Easy integration guide for your existing view files
 */

// INTEGRATION GUIDE FOR YOUR EJS FILES:

/* 
1. Add to <head> section (after your existing meta tags):
   <%- include('partials/optimized-head') %>

2. Add before closing </body> tag:
   <%- include('partials/optimized-scripts') %>

3. Update your product containers to use layout-safe classes:
   <div class="product-grid" instead of custom flex containers
   
4. Add skeleton loading for dynamic content:
   <div class="skeleton-product skeleton-container">...</div>
*/

// EXAMPLE UPDATES FOR YOUR MAIN VIEW FILES:

/* 
For Forside.ejs - DONE ✓
For productDetails.ejs - Add optimized-head and optimized-scripts
For TorgetKat.ejs - Add optimized-head and optimized-scripts + product grid
For SearchResults.ejs - Add optimized-head and optimized-scripts + product grid
For other views - Add optimized-head and optimized-scripts
*/

// UTILITY FUNCTIONS FOR YOUR JAVASCRIPT:

/**
 * Show skeleton loading while loading products
 */
function showProductsLoading(container, count = 3) {
    if (!window.skeletonManager) return;
    return window.skeletonManager.showProductsSkeleton(container, count);
}

/**
 * Hide skeleton and show real products
 */
function hideProductsLoading(skeletonId) {
    if (!window.skeletonManager) return;
    window.skeletonManager.hideSkeleton(skeletonId);
}

/**
 * Optimize images in a container
 */
function optimizeImagesInContainer(container) {
    if (!container) return;
    
    const images = container.querySelectorAll('img');
    images.forEach(img => {
        // Add lazy loading attributes
        if (img.src && !img.dataset.src && !img.classList.contains('optimized')) {
            img.dataset.src = img.src;
            img.src = 'data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%27100%27%20height=%2775%27/%3e';
            img.loading = 'lazy';
            img.classList.add('lazy-image', 'optimized');
        }
        
        // Add aspect ratio if missing
        if (!img.style.aspectRatio && (img.width && img.height)) {
            img.style.aspectRatio = `${img.width}/${img.height}`;
        }
    });
    
    // Refresh lazy loader
    if (window.lazyImageLoader) {
        window.lazyImageLoader.refresh();
    }
}

/**
 * Create optimized product element
 */
function createOptimizedProductElement(product) {
    const div = document.createElement('div');
    div.className = 'product no-shift';
    div.setAttribute('role', 'article');
    div.setAttribute('tabindex', '0');

    const images = product.Images ? product.Images.split(',') : [];
    const firstName = images.length > 0 ? images[0].trim() : null;
    const basePath = firstName ? `/img/720/${firstName}` : '/images/default-product.png';

    const srcSmall = firstName ? `/img/360/${firstName}` : basePath;
    const srcMed = firstName ? `/img/720/${firstName}` : basePath;
    const srcLg = firstName ? `/img/960/${firstName}` : basePath;

    div.innerHTML = `
        <div class="product-image-container">
            <img data-src="${srcMed}"
                 data-srcset="${srcSmall} 360w, ${srcMed} 720w, ${srcLg} 960w"
                 data-sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 180px"
                 data-width="180" 
                 data-height="140"
                 data-aspect-ratio="9/7"
                 data-fallback="${basePath}"
                 alt="${product.ProductName || 'Product'}"
                 class="product-image lazy-image"
                 loading="lazy"
                 width="180" height="140">
            <div class="image-placeholder">
                <i class="fas fa-image"></i>
            </div>
        </div>
        <div class="product-details">
            <h3>${product.ProductName || 'Unnamed Product'}</h3>
            <p><strong>Price:</strong> ${product.Price ? `${product.Price.toLocaleString()} $` : 'Contact for price'}</p>
            <p><strong>Location:</strong> ${product.Location || 'N/A'}</p>
        </div>
    `;

    return div;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showProductsLoading,
        hideProductsLoading,
        optimizeImagesInContainer,
        createOptimizedProductElement
    };
}

// Global utilities
window.layoutShiftUtils = {
    showProductsLoading,
    hideProductsLoading,
    optimizeImagesInContainer,
    createOptimizedProductElement
};