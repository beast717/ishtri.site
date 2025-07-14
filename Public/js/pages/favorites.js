export default function initFavoritesPage() {
    const favoritesList = document.getElementById('favoritesList');
    const skeletonContainer = document.getElementById('skeletonContainer');
    
    if (!favoritesList || !skeletonContainer) return;

    fetch('/api/favorites')
        .then(response => response.json())
        .then(products => {
            skeletonContainer.style.display = 'none';
            favoritesList.innerHTML = ''; // Clear skeleton

            if (products.length === 0) {
                favoritesList.innerHTML = '<p class="no-products">No favorited products yet.</p>';
                return;
            }

            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product';

                const imageUrl = product.Images && product.Images !== 'default.jpg' 
                    ? `/uploads/${product.Images.split(',')[0].trim()}` 
                    : '/uploads/default.jpg';

                productDiv.innerHTML = `
                    <img data-src="${imageUrl}" 
                         alt="${product.ProductName}" 
                         class="product-image">
                    <div>
                        <h3>${product.ProductName}</h3>
                        <p><strong>Price:</strong> ${product.Price ? `${product.Price.toLocaleString('no-NO')} kr` : 'Contact for price'}</p>
                        <p><strong>Location:</strong> ${product.Location || 'Location not specified'}</p>
                    </div>
                `;

                productDiv.addEventListener('click', () => {
                    window.location.href = `/productDetails?productdID=${product.ProductdID}`;
                });

                favoritesList.appendChild(productDiv);
            });
            
            window.ishtri.lazyLoader.observe();
        })
        .catch(error => {
            console.error("Error loading favorited products:", error);
            skeletonContainer.style.display = 'none';
            favoritesList.innerHTML = '<p class="no-products">Error loading favorited products.</p>';
            window.ishtri.toast.show('Failed to load favorited products.', 'error');
        });
}