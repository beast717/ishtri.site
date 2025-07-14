export default function initMyAdsPage() {
    const container = document.getElementById('productsContainer');
    const skeletonContainer = document.getElementById('skeletonContainer');

    if (!container || !skeletonContainer) return;

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
            skeletonContainer.style.display = 'none';
            container.innerHTML = '';

            if (products.length === 0) {
                container.innerHTML = '<p>You have not uploaded any products.</p>';
                return;
            }

            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product';
                const firstImage = product.Images && product.Images !== 'default.jpg' ? `/uploads/${product.Images.split(',')[0].trim()}` : '/uploads/default.jpg';

                productDiv.innerHTML = `
                  <img data-src="${firstImage}" 
                       alt="${product.ProductName}" 
                       class="product-image"
                       onerror="this.src='/uploads/default.jpg'">
                    <div>
                        <h3>
                            ${product.ProductName} 
                            ${product.Sold ? `<span class="sold-label">(Sold)</span>` : ''}
                        </h3>
                        <p><strong>Price:</strong> ${product.Price ? `$${product.Price.toLocaleString('en-US')}` : 'Contact for price'}</p>
                        <p><strong>Location:</strong> ${product.Location}</p>
                        <p><strong>Date:</strong> ${product.Date}</p>
                        <div class="button-container">
                            <button class="btn btn-danger" data-action="delete" data-id="${product.ProductdID}">Delete</button>
                            ${product.Sold 
                                ? `<button class="btn btn-warning" data-action="mark-unsold" data-id="${product.ProductdID}">Mark as Unsold</button>`
                                : `<button class="btn btn-success" data-action="mark-sold" data-id="${product.ProductdID}">Mark as Sold</button>`
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
            skeletonContainer.style.display = 'none';
            container.innerHTML = `<p>Error loading your products: ${error.message}</p>`;
            window.ishtri.toast.show('Failed to load your products.', 'error');
        });
}