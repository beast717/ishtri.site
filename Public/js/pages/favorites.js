export default function initFavoritesPage() {
    const favoritesList = document.getElementById('favoritesList');
    
    if (!favoritesList) return;

    // Show skeleton loading using SkeletonLoader
    window.ishtri.skeletonLoader.showInContainer('favoritesList', 'product', 6);

    fetch('/api/favorites')
        .then(response => response.json())
        .then(products => {
            // Hide skeleton and clear container
            window.ishtri.skeletonLoader.hideInContainer('favoritesList');

            if (products.length === 0) {
                favoritesList.innerHTML = '<p class="no-products">No favorited products yet.</p>';
                return;
            }

            products.forEach((product, index) => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product';

                const imageUrl = product.Images && product.Images !== 'default.jpg' 
                    ? `/uploads/${product.Images.split(',')[0].trim()}` 
                    : '/uploads/default.jpg';

                const firstName = product.Images && product.Images !== 'default.jpg' ? product.Images.split(',')[0].trim() : null;
                const fallback = '/uploads/default.jpg';
                const srcSmall = firstName ? `/img/320/${firstName}` : fallback;
                const srcMed = firstName ? `/img/640/${firstName}` : fallback;
                const srcLg = firstName ? `/img/960/${firstName}` : fallback;

                productDiv.innerHTML = `
                    <img data-src="${srcMed}" 
                         src="/images/placeholder.png"
                         srcset="${srcSmall} 320w, ${srcMed} 640w, ${srcLg} 960w"
                         sizes="(max-width: 480px) 320px, (max-width: 768px) 640px, 960px"
                         alt="${product.ProductName}" 
                         class="product-image"
                         loading="lazy">
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
            
            if (window.ishtri?.lazyLoader) {
                window.ishtri.lazyLoader.observe();
            }
        })
        .catch(error => {
            console.error("Error loading favorited products:", error);
            // Hide skeleton on error
            window.ishtri.skeletonLoader.hideInContainer('favoritesList');
            favoritesList.innerHTML = '<p class="no-products">Error loading favorited products.</p>';
            window.ishtri.toast.show('Failed to load favorited products.', 'error');
        });
}