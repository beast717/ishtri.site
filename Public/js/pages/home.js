import { initFavoriteButtons } from '../components/favoriteButton.js';

function loadRandomProducts() {
    const randomProductsContainer = document.getElementById('randomProducts');
    if (!randomProductsContainer) return;

    // Show skeleton loading
    randomProductsContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        randomProductsContainer.appendChild(window.ishtri.skeletonLoader.createProductSkeleton());
    }

    fetch('/api/utils/random-products')
        .then(response => response.json())
        .then(products => {
            randomProductsContainer.innerHTML = ''; // Clear skeletons
            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product-card';
                
                const images = product.Images ? product.Images.split(',') : [];
                const firstImage = images.length > 0 ? images[0].trim() : null;
                const imageUrl = firstImage ? `/uploads/${firstImage}` : '/images/default-product.png';
                
                productDiv.innerHTML = `
                    <img src="${imageUrl}" alt="${product.ProductName}" class="product-image" onerror="this.src='/images/default-product.png'">
                    <i class="fas fa-heart favorite-icon" data-product-id="${product.ProductdID}"></i>
                    <h4>
                        ${product.ProductName} 
                        ${product.Sold ? `<span class="sold-label">(Sold)</span>` : ''}
                    </h4>
                    <p>${product.Price ? `$${product.Price.toLocaleString('en-US')}` : 'Contact for price'}</p>
                `;
                
                productDiv.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('favorite-icon')) {
                        window.location.href = `/productDetails?productdID=${product.ProductdID}`;
                    }
                });
                
                randomProductsContainer.appendChild(productDiv);
            });
            
            initFavoriteButtons();
        })
        .catch(err => {
            randomProductsContainer.innerHTML = '<p>Error loading products. Please try again.</p>';
            window.ishtri.toast.show('Error loading products. Please try again.', 'error');
        });
}

export default function initHomePage() {
    loadRandomProducts();
}