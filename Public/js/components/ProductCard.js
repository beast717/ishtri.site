/**
 * Product Card Component - Handles individual product rendering
 */

import { getEl } from '../utils/domUtils.js';

/**
 * Create product element
 * @param {object} product - Product data
 * @returns {HTMLElement} Product card element
 */
export const createProductElement = (product) => {
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
    const productName = isJob ? product.JobTitle : 
        isCar ? `${product.brand_name || ''} ${product.model_name || ''}`.trim() : 
        product.ProductName;

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

    if (isCar) {
        innerHTML += `<p class="custom-title">${product.ProductName}</p>
                     <p><strong>Year:</strong> ${product.Year || 'N/A'}</p>
                     <p><strong>Mileage:</strong> ${product.Mileage ? `${product.Mileage.toLocaleString()} km` : 'N/A'}</p>`;
    } else if (isProperty) {
        innerHTML += `<p><strong>Price:</strong> ${product.Price ? `$${product.Price.toLocaleString()}` : 'Contact for price'}</p>
                     <p><strong>Type:</strong> ${product.PropertyType}</p>
                     <p><strong>Size:</strong> ${product.SizeSqm} m²</p>`;
    } else if (isJob) {
        innerHTML += `<p><strong>Company:</strong> ${product.CompanyName || 'N/A'}</p>
                     <p><strong>Type:</strong> ${product.EmploymentType || 'N/A'}</p>`;
    } else {
        innerHTML += `<p><strong>Price:</strong> ${product.Price ? `${product.Price.toLocaleString()} $` : 'Contact for price'}</p>`;
    }

    innerHTML += `<p><strong>Location:</strong> ${(product.cityName || product.Location || 'N/A')}${product.country ? `, ${product.country}` : ''}</p></div>`;
    div.innerHTML = innerHTML;

    div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('favorite-icon')) {
            window.location.href = `/productDetails?productdID=${product.ProductdID}`;
        }
    });

    const favoriteButton = div.querySelector('.favorite-icon');
    initFavoriteButton(favoriteButton);

    return div;
};

/**
 * Display products in container
 * @param {Array} products - Products to display
 * @param {boolean} loadMore - Whether this is load more
 */
export const displayProducts = (products, loadMore = false) => {
    const container = getEl('productsContainer');
    if (!container) return;

    if (!loadMore) {
        container.innerHTML = '';
    } else {
        // Remove existing load more button before adding new products
        const existingLoadMoreButton = getEl('loadMoreButton');
        if (existingLoadMoreButton) {
            existingLoadMoreButton.closest('.load-more-container')?.remove();
        }
    }
    
    if ((!products || products.length === 0) && !loadMore) {
        container.innerHTML = '<p class="no-products">No products found for the current criteria.</p>';
        return;
    }

    products.forEach(product => {
        container.appendChild(createProductElement(product));
    });

    // Initialize favorites and lazy loading
    initializeFavorites();
    if (window.ishtri?.lazyLoader) {
        window.ishtri.lazyLoader.observe();
    }
};

/**
 * Initialize favorite button
 * @param {HTMLElement} favoriteButton - Favorite button element
 */
const initFavoriteButton = (favoriteButton) => {
    if (!favoriteButton) return;
    
    // Use existing favorite button logic from window.ishtri
    if (window.ishtri?.favoriteButton) {
        window.ishtri.favoriteButton.init(favoriteButton);
    }
};

/**
 * Initialize all favorites on page
 */
const initializeFavorites = () => {
    fetch('/api/favorites', { credentials: 'include' })
        .then(res => res.ok ? res.json() : Promise.reject('Not logged in or API error'))
        .then(favorites => {
            const favoriteIds = new Set(favorites.map(f => f.ProductdID));
            
            document.querySelectorAll('.favorite-icon').forEach(icon => {
                const productId = Number(icon.dataset.productId);
                const isFavorited = favoriteIds.has(productId);
                
                icon.classList.toggle('favorited', isFavorited);
                icon.setAttribute('aria-pressed', isFavorited);
                icon.style.color = isFavorited ? '#ff4757' : '#ccc';
            });
        })
        .catch(() => {
            // Fail silently if the user is not logged in
        });
};
