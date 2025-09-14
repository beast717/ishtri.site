/**
 * Update the recommended section                productDiv.innerHTML = `
                    <div class="product-image-container">
                        <img data-src="${srcMed}"
                             data-srcset="${srcSmall} 320w, ${srcMed} 640w, ${srcLg} 960w"
                             data-sizes="(max-width: 480px) 320px, (max-width: 768px) 640px, 960px"
                             src="/images/placeholder.png"
                             alt="${product.ProductName}"
                             class="product-image lazy-image"
                             data-fallback="${fallback}">
                    </div>
                    <i class="fas fa-heart favorite-icon" data-product-id="${product.ProductdID}"></i>
                    <h4>
                        ${product.ProductName} 
                        ${product.Sold ? `<span class="sold-label">(Sold)</span>` : ''}
                    </h4>
                    <p>${product.Price ? `$${product.Price.toLocaleString('en-US')}` : 'Contact for price'}</p>
                `;er translation
 */
function updateRecommendedTitle() {
    const titleElement = document.getElementById('recommendedTitle');
    if (titleElement && window.ishtri && window.ishtri.i18n) {
        titleElement.textContent = window.ishtri.i18n.t('home.recommended');
    }
}

/**
 * Load random products and display them on the homepage
 */
function loadRandomProducts() {
    const randomProductsContainer = document.getElementById('randomProducts');
    if (!randomProductsContainer) return;

    // Show skeleton loading using SkeletonLoader
    window.ishtri.skeletonLoader.showInContainer('randomProducts', 'product', 5);

    fetch('/api/utils/random-products')
        .then(response => response.json())
        .then(products => {
            // Hide skeleton and clear container
            window.ishtri.skeletonLoader.hideInContainer('randomProducts');
            
            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product-card';
                
                // Handle images
                const images = product.Images ? product.Images.split(',') : [];
                const firstImage = images.length > 0 ? images[0].trim() : null;
                const fallback = '/images/default-product.png';
                const srcSmall = firstImage ? `/img/320/${firstImage}` : fallback;
                const srcMed = firstImage ? `/img/640/${firstImage}` : fallback;
                const srcLg = firstImage ? `/img/960/${firstImage}` : fallback;
                
                productDiv.innerHTML = `
                    <img data-src="${srcMed}"
                         src="/images/placeholder.png"
                         srcset="${srcSmall} 320w, ${srcMed} 640w, ${srcLg} 960w"
                         sizes="(max-width: 480px) 320px, (max-width: 768px) 640px, 960px"
                         alt="${product.ProductName}"
                         class="product-image"
                         loading="lazy"
                         onerror="this.src='${fallback}'">
                    <i class="fas fa-heart favorite-icon" data-product-id="${product.ProductdID}"></i>
                    <h4>
                        ${product.ProductName} 
                        ${product.Sold ? `<span class="sold-label">(Sold)</span>` : ''}
                    </h4>
                    <p>${product.Price ? `$${product.Price.toLocaleString('en-US')}` : 'Contact for price'}</p>
                `;
                
                productDiv.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('favorite-icon')) {
                        // Track product click
                        if (window.ishtri && window.ishtri.trackAdClick) {
                            window.ishtri.trackAdClick(product.ProductdID, product.category || 'unknown');
                        }
                        
                        const slug = (product.ProductName || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,80);
                        window.location.href = `/product/${product.ProductdID}/${slug}`;
                    }
                });
                
                randomProductsContainer.appendChild(productDiv);
            });
            
            initializeFavorites();
            // Initialize lazy loading for the new images
            if (window.ishtri && window.ishtri.lazyLoader) {
                window.ishtri.lazyLoader.refresh();
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
 * Initialize search tracking
 */
function initSearchTracking() {
    const searchForm = document.querySelector('.søkeBarContainer form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            const searchInput = searchForm.querySelector('input[name="query"]');
            if (searchInput && searchInput.value.trim()) {
                // Track search event
                if (window.ishtri && window.ishtri.trackSearch) {
                    window.ishtri.trackSearch(searchInput.value.trim());
                }
            }
        });
    }
}

/**
 * Initialize homepage functionality
 */
export default function initHomePage() {
    console.log('Initializing home page...');
    
    // Initialize search tracking
    initSearchTracking();
    
    // Update recommended section title with translation
    updateRecommendedTitle();
    
    // Load random products
    loadRandomProducts();
    
    // Add event listener for favorite clicks
    document.addEventListener('click', handleFavoriteClick);
    
    // Check for unread messages if user is logged in (this was in the old onload function)
    if (window.ishtri && window.ishtri.user && window.ishtri.user.brukernavn) {
        console.log('User is logged in on home page, initializing authenticated features');
        // The navbar component will handle message and notification badge updates
    }
    
    // Listen for language change events to update title
    window.addEventListener('languageChanged', updateRecommendedTitle);
}