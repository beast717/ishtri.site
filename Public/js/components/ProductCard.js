/**
 * Product Card Component - Handles individual product rendering
 */

import { getEl } from '../utils/domUtils.js';
import { initFavoriteButton } from './favoriteButton.js';

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
    const firstName = images.length > 0 ? images[0].trim() : null;
    const hasImage = firstName && firstName !== 'default.svg';

    const imageSrc = hasImage ? `/img/360/${firstName}` : '/images/default.svg';
    const imageSrcset = hasImage ? 
        `/img/360/${firstName} 360w, /img/720/${firstName} 720w, /img/960/${firstName} 960w` : 
        '';

    const productName = isJob ? product.JobTitle : 
        isCar ? `${product.brand_name || ''} ${product.model_name || ''}`.trim() : 
        product.ProductName;

    let innerHTML = `
    <div class="product-image-container" ${!hasImage ? 'style="animation: none; background: none;"' : ''}>
        ${hasImage ? `
        <img data-src="${imageSrc}" data-srcset="${imageSrcset}"
             data-sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 180px"
             data-fallback="/images/default.svg"
             alt="${productName}"
             class="product-image lazy-image"
             loading="lazy"
             width="180" height="140">
        <div class="image-placeholder">
            <i class="fas fa-image"></i>
        </div>
        ` : `
        <img src="/images/default.svg"
             alt="${productName}"
             class="product-image loaded"
             width="180" height="140">
        `}
    </div>
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
            const slug = (productName || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,80);
            window.location.href = `/product/${product.ProductdID}/${slug}`;
        }
    });

    const favoriteButton = div.querySelector('.favorite-icon');
    initFavoriteButtonForCard(favoriteButton);

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
        window.ishtri.lazyLoader.refresh();
    }
};

/**
 * Initialize favorite button
 * @param {HTMLElement} favoriteButton - Favorite button element
 */
const initFavoriteButtonForCard = (favoriteButton) => {
    if (!favoriteButton) return;
    
    // Use the proper favorite button functionality
    initFavoriteButton(favoriteButton);
};

/**
 * Initialize all favorites on page
 */
const initializeFavorites = () => {
    // First, initialize click handlers for all favorite buttons
    document.querySelectorAll('.favorite-icon').forEach(initFavoriteButton);
    
    // Then fetch and update visual states
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
            // But still initialize the buttons so they show login prompt
            document.querySelectorAll('.favorite-icon').forEach(initFavoriteButton);
        });
};
