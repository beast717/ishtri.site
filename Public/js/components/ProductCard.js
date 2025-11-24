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
export const createProductElement = (product, options = {}) => {
    if (!product) return document.createElement('div');

    const layout = options.layout || 'list';
    const isGrid = layout === 'grid';

    const isJob = product.category === 'Jobb';
    const isCar = product.category === 'Bil';
    const isProperty = product.category === 'Eiendom';

    const div = document.createElement('a');
    div.className = isGrid ? 'product-card' : 'product';
    div.setAttribute('role', 'article');
    // div.setAttribute('tabindex', '0'); // 'a' tag is naturally focusable
    div.style.textDecoration = 'none';
    div.style.color = 'inherit';

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

    // Grid view needs larger images
    const sizes = isGrid 
        ? "(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 280px" 
        : "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 180px";
        
    const imgWidth = isGrid ? "280" : "180";
    const imgHeight = isGrid ? "210" : "140";

    let innerHTML = `
    <div class="product-image-container" ${!hasImage ? 'style="animation: none; background: none;"' : ''}>
        ${hasImage ? `
        <img data-src="${imageSrc}" data-srcset="${imageSrcset}"
             data-sizes="${sizes}"
             data-fallback="/images/default.svg"
             alt="${productName}"
             class="product-image lazy-image"
             loading="lazy"
             width="${imgWidth}" height="${imgHeight}">
        <div class="image-placeholder">
            <i class="fas fa-image"></i>
        </div>
        ` : `
        <img src="/images/default.svg"
             alt="${productName}"
             class="product-image loaded"
             width="${imgWidth}" height="${imgHeight}">
        `}
    </div>`;

    if (isGrid) {
        innerHTML += `
            <button class="fas fa-heart favorite-icon" 
                    data-product-id="${product.ProductdID}"
                    aria-label="Add to favorites"
                    aria-pressed="false">
            </button>
            <h4>
                ${productName || 'Unnamed Product'}
                ${product.Sold ? `<span class="sold-label" data-i18n="product_details.sold">(Sold)</span>` : ''}
            </h4>`;
            
        if (isCar) {
             innerHTML += `<p>${product.Price ? `${product.Price.toLocaleString()} $` : 'Contact'}</p>`;
        } else if (isProperty) {
             innerHTML += `<p>${product.Price ? `$${product.Price.toLocaleString()}` : 'Contact'}</p>`;
        } else if (isJob) {
             innerHTML += `<p>${product.CompanyName || 'N/A'}</p>`;
        } else {
             innerHTML += `<p>${product.Price ? `${product.Price.toLocaleString()} $` : 'Contact'}</p>`;
        }
        
        innerHTML += `<div style="font-size: 0.9rem; color: #666; margin-top: auto; padding-top: 10px;">
                        <i class="fas fa-map-marker-alt"></i> ${(product.cityName || product.Location || 'N/A')}
                      </div>`;
    } else {
        innerHTML += `
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
    }

    div.innerHTML = innerHTML;

    const slug = (productName || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u0600-\u06FF\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
        .substring(0, 80);

    div.href = `/product/${product.ProductdID}/${slug}`;

    div.addEventListener('click', (e) => {
        if (e.target.classList.contains('favorite-icon')) {
            e.preventDefault();
            e.stopPropagation();
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
