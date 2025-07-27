/**
 * Load random products and display them on the homepage
 */
function loadRandomProducts() {
    const randomProductsContainer = document.getElementById('randomProducts');
    if (!randomProductsContainer) return;

    // Show skeleton loading
    randomProductsContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'product-card skeleton';
        skeleton.innerHTML = `
            <div class="skeleton-image skeleton"></div>
            <div class="skeleton-text skeleton-title skeleton"></div>
            <div class="skeleton-text skeleton-price skeleton"></div>
        `;
        randomProductsContainer.appendChild(skeleton);
    }

    fetch('/api/utils/random-products')
        .then(response => response.json())
        .then(products => {
            randomProductsContainer.innerHTML = '';
            
            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product-card';
                
                // Handle images
                const images = product.Images ? product.Images.split(',') : [];
                const firstImage = images.length > 0 ? images[0].trim() : null;
                const imageUrl = firstImage ? `/uploads/${firstImage}` : '/images/default-product.png';
                
                productDiv.innerHTML = `
                    <img data-src="${imageUrl}" alt="${product.ProductName}" class="product-image" onerror="this.src='/images/default-product.png'">
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
            
            initializeFavorites();
            // Initialize lazy loading for the new images
            if (window.ishtri && window.ishtri.lazyLoader) {
                window.ishtri.lazyLoader.observe();
            }
        })
        .catch(err => {
            console.error('Error loading random products:', err);
            randomProductsContainer.innerHTML = '<p>Error loading products. Please try again.</p>';
            if (window.ishtri && window.ishtri.toast) {
                window.ishtri.toast.show('Error loading products. Please try again.', 'error');
            }
        });
}

/**
 * Initialize favorite icons based on user's current favorites
 */
function initializeFavorites() {
    // First, check if the user is logged in
    fetch('/api/auth/current-user', { credentials: 'include' })
        .then(response => response.json())
        .then(userData => {
            if (userData && userData.brukernavn) {
                // User is logged in, fetch favorites
                fetch('/api/favorites', { credentials: 'include' })
                    .then(response => {
                        if (!response.ok) {
                            // Handle potential errors even if logged in initially
                            if (response.status === 401) {
                                throw new Error('Authentication required');
                            }
                            throw new Error('Failed to fetch favorites');
                        }
                        const contentType = response.headers.get('content-type');
                        if (!contentType || !contentType.includes('application/json')) {
                            throw new Error('Invalid response format from /api/favorites');
                        }
                        return response.json();
                    })
                    .then(favorites => {
                        document.querySelectorAll('.favorite-icon').forEach(icon => {
                            const productdID = icon.getAttribute('data-product-id');
                            const isFavorited = favorites.some(product => product.ProductdID === Number(productdID));

                            if (isFavorited) {
                                icon.classList.add('favorited');
                                icon.style.color = '#ff4757'; // Red color for favorited products
                            } else {
                                icon.classList.remove('favorited');
                                icon.style.color = '#ccc'; // Default color for non-favorited products
                            }
                        });
                    })
                    .catch(error => {
                        console.error("Error fetching or processing favorites:", error);
                        // Ensure icons are in default state on error
                        document.querySelectorAll('.favorite-icon').forEach(icon => {
                            icon.classList.remove('favorited');
                            icon.style.color = '#ccc';
                        });
                    });
            } else {
                // User is not logged in, set all icons to default state
                document.querySelectorAll('.favorite-icon').forEach(icon => {
                    icon.classList.remove('favorited');
                    icon.style.color = '#ccc';
                });
            }
        })
        .catch(error => {
            console.error("Error checking user authentication:", error);
            // Ensure icons are in default state on error
            document.querySelectorAll('.favorite-icon').forEach(icon => {
                icon.classList.remove('favorited');
                icon.style.color = '#ccc';
            });
        });
}

/**
 * Handle favorite icon clicks
 */
function handleFavoriteClick(e) {
    if (!e.target.classList.contains('favorite-icon')) return;
    
    e.preventDefault();
    e.stopPropagation();

    const productdID = e.target.getAttribute('data-product-id');
    const isFavorited = e.target.classList.contains('favorited');

    fetch('/api/auth/current-user', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            if (!data.brukernavn) {
                if (window.ishtri && window.ishtri.toast) {
                    window.ishtri.toast.show('Please <a href="/login">log in</a> to add favorites', 'info');
                }
                return;
            }

            // Use the same endpoint for both adding and removing favorites
            fetch('/api/favorites', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productdID }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                e.target.classList.toggle('favorited');
                e.target.style.color = isFavorited ? '#ccc' : '#ff4757';
                if (window.ishtri && window.ishtri.toast) {
                    window.ishtri.toast.show(
                        isFavorited ? 'Product removed from favorites' : 'Product added to favorites',
                        'success'
                    );
                }
            })
            .catch(error => {
                console.error('Error updating favorites:', error);
                if (window.ishtri && window.ishtri.toast) {
                    window.ishtri.toast.show('Error updating favorites. Please try again.', 'error');
                }
            });
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
            if (window.ishtri && window.ishtri.toast) {
                window.ishtri.toast.show('Error checking authentication. Please try again.', 'error');
            }
        });
}

/**
 * Initialize homepage functionality
 */
export default function initHomePage() {
    console.log('Initializing home page...');
    
    // Load random products
    loadRandomProducts();
    
    // Add event listener for favorite clicks
    document.addEventListener('click', handleFavoriteClick);
    
    // Check for unread messages if user is logged in (this was in the old onload function)
    if (window.ishtri && window.ishtri.user && window.ishtri.user.brukernavn) {
        console.log('User is logged in on home page, initializing authenticated features');
        // The navbar component will handle message and notification badge updates
    }
}