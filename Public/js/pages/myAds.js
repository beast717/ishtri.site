export default function initMyAdsPage() {
    const container = document.getElementById('productsContainer');

    if (!container) return;

    // Show skeleton loading using SkeletonLoader
    window.ishtri.skeletonLoader.showInContainer('productsContainer', 'product', 6);

    function handleProductAction(e) {
        const button = e.target.closest('button');
        if (!button) return;
        
        const action = button.dataset.action;
        const productId = button.dataset.id;
        if (!action || !productId) return;

        e.stopPropagation(); // Prevent navigating to product details

        let url, method, confirmMsg, successMsg;

        switch (action) {
            case 'delete':
                url = `/api/products/delete-product/${productId}`;
                method = 'DELETE';
                confirmMsg = 'Are you sure you want to delete this product?';
                successMsg = 'Product deleted.';
                break;
            case 'mark-sold':
                url = `/api/products/sold/${productId}`;
                method = 'PUT';
                confirmMsg = 'Are you sure you want to mark this product as sold?';
                successMsg = 'Product marked as sold.';
                break;
            case 'mark-unsold':
                url = `/api/products/unsold/${productId}`;
                method = 'PUT';
                confirmMsg = 'Are you sure you want to mark this product as unsold?';
                successMsg = 'Product marked as unsold.';
                break;
            default:
                return;
        }

        if (confirm(confirmMsg)) {
            fetch(url, { method })
                .then(res => res.json())
                .then(result => {
                    // Track ad deletion
                    if (action === 'delete' && window.ishtri && window.ishtri.trackAdDelete) {
                        // Try to get category from the product element (if available)
                        const productElement = button.closest('.product');
                        const category = productElement?.dataset?.category || 'unknown';
                        window.ishtri.trackAdDelete(productId, category);
                    }
                    
                    window.ishtri.toast.show(result.message || successMsg, 'success');
                    if (action === 'delete') {
                        button.closest('.product').remove();
                    } else {
                        location.reload(); // Reload to show updated status
                    }
                })
                .catch(err => {
                    window.ishtri.toast.show(`Failed to ${action.replace('-', ' ')} the product.`, 'error');
                });
        }
    }

    fetch('/api/utils/users')
        .then(response => response.json())
        .then(products => {
            // Hide skeleton and clear container
            window.ishtri.skeletonLoader.hideInContainer('productsContainer');

            if (products.length === 0) {
                container.innerHTML = '<p>You have not uploaded any products.</p>';
                return;
            }

            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product';
                const firstImage = product.Images && product.Images !== 'default.jpg' ? `/img/360/${product.Images.split(',')[0].trim()}` : '/uploads/default.jpg';

                productDiv.innerHTML = `
                  <img data-src="${firstImage}" 
                       alt="${product.ProductName}" 
                       class="product-image"
                       onerror="this.src='/uploads/default.jpg'">
                    <div>
                        <h3>
                            ${product.ProductName} 
                            ${product.Sold ? `<span class="sold-label" data-i18n="product_details.sold">(Sold)</span>` : ''}
                        </h3>
                        <p><strong data-i18n="product_details.price">Price:</strong> ${product.Price ? `$${product.Price.toLocaleString('en-US')}` : 'Contact for price'}</p>
                        <p><strong data-i18n="product_details.location">Location:</strong> ${product.Location}</p>
                        <p><strong data-i18n="product_details.dato">Date:</strong> ${product.Date}</p>
                        <div class="button-container">
                            <button class="btn btn-danger btn-compact" data-action="delete" data-id="${product.ProductdID}" data-i18n="product_details.slett">Delete</button>
                            ${product.Sold 
                                ? `<button class="btn btn-warning btn-compact" data-action="mark-unsold" data-id="${product.ProductdID}" data-i18n="product_details.mark_unsold">Mark as Unsold</button>`
                                : `<button class="btn btn-success btn-compact" data-action="mark-sold" data-id="${product.ProductdID}" data-i18n="product_details.mark_sold">Mark as Sold</button>`
                            }
                        </div>
                    </div>
                `;
                
                // Add main click listener for navigation
                productDiv.addEventListener('click', (e) => {
                    // Only navigate if the click was not on a button
                    if (!e.target.closest('button')) {
                        window.location.href = `/productDetails?productdID=${product.ProductdID}`;
                    }
                });

                container.appendChild(productDiv);
            });
            
            // Add a single delegated event listener for all buttons
            container.addEventListener('click', handleProductAction);

            window.ishtri.lazyLoader.observe();
        })
        .catch(error => {
            // Hide skeleton on error
            window.ishtri.skeletonLoader.hideInContainer('productsContainer');
            container.innerHTML = `<p>Error loading your products: ${error.message}</p>`;
            window.ishtri.toast.show('Failed to load your products.', 'error');
        });
}