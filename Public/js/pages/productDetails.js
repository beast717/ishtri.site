/**
 * Product Details page functionality - Complete product viewing and interaction
 */

let currentImageIndex = 0;
let productOwnerId = null;

export default function initProductDetailsPage() {
    console.log('Initializing product details page...');
    
    // Check if on the correct page
    if (!document.querySelector('.productDetailsContainer')) return;

    // Track page view conversion for product details
    if (window.ishtri && window.ishtri.trackConversion) {
        window.ishtri.trackConversion();
    }

    // Initialize page
    initializeProductDetails();

    function initializeProductDetails() {
        console.log('Initializing product details functionality...');

        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const productdID = urlParams.get('productdID');

        if (!productdID) {
            console.error('No product ID found in URL');
            showToast('Invalid product ID', 'error');
            return;
        }

        // Setup event listeners
        setupEventListeners(productdID);

        // Load product data
        loadProductDetails(productdID);

        // Initialize functionality
        initializeFavorites(productdID);
        initializeBackToTop();
        
        // Initialize page features after load
        window.addEventListener('load', () => {
            checkUnreadMessages();
            
            // Initialize lazy loading if available
            if (window.lazyLoader) {
                window.lazyLoader.observe();
            }
        });
    }

    function setupEventListeners(productdID) {
        // Contact owner button
        const contactOwnerBtn = document.getElementById('contactOwner');
        if (contactOwnerBtn) {
            contactOwnerBtn.addEventListener('click', () => handleContactOwner());
        }

        // Message modal buttons
        const sendMessageBtn = document.getElementById('sendMessageButton');
        const cancelMessageBtn = document.getElementById('cancelMessageButton');
        
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => handleSendMessage(productdID));
        }
        
        if (cancelMessageBtn) {
            cancelMessageBtn.addEventListener('click', hideMessageModal);
        }

        // Favorite button
        const favoriteBtn = document.getElementById('favoriteButton');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => toggleFavorite(productdID));
        }

        // Login modal buttons
        const loginBtn = document.getElementById('loginButton1');
        const cancelLoginBtn = document.getElementById('cancelLoginButton');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => window.location.href = '/login');
        }
        
        if (cancelLoginBtn) {
            cancelLoginBtn.addEventListener('click', hideLoginModal);
        }

        // Carousel navigation
        const prevBtn = document.querySelector('.carousel .prev');
        const nextBtn = document.querySelector('.carousel .next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', prevImage);
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', nextImage);
        }
    }

    async function loadProductDetails(productdID) {
        try {
            console.log('Fetching product details for ID:', productdID);
            const response = await fetch(`/api/products/${productdID}`);
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Product not found');
                } else if (response.status === 500) {
                    const errorText = await response.text();
                    throw new Error(`Server error: ${errorText}`);
                } else {
                    const errorText = await response.text();
                    throw new Error(`HTTP error ${response.status}: ${errorText}`);
                }
            }
            
            const responseText = await response.text();
            console.log('Raw response text length:', responseText.length);
            console.log('Raw response text (first 100 chars):', responseText.substring(0, 100));
            
            if (!responseText.trim()) {
                throw new Error('Empty response from server');
            }
            
            let product;
            try {
                product = JSON.parse(responseText);
                console.log('Successfully parsed product data');
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Full response text:', responseText);
                throw new Error('Invalid JSON response from server');
            }
            
            if (!product || typeof product !== 'object') {
                throw new Error('Invalid product data received');
            }
            
            console.log('Product data received:', {
                id: product.productdID,
                name: product.ProductName,
                category: product.category,
                hasImages: !!product.Images
            });
            
            renderProductDetails(product);
            
        } catch (error) {
            console.error('Error fetching product:', error);
            
            // Show error in the product container
            const container = document.querySelector('.productDetailsContainer');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h2>❌ Error Loading Product</h2>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>Product ID: ${productdID}</p>
                        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 20px;">
                            🔄 Try Again
                        </button>
                        <br><br>
                        <a href="/" style="text-decoration: none; color: #007bff;">← Back to Home</a>
                    </div>
                `;
            }
            
            // Also try to show toast if available
            const toast = window.ishtri?.toast || window.toast;
            if (toast) {
                showToast('Failed to load product: ' + error.message, 'error');
            }
        }
    }

    function renderProductDetails(product) {
        console.log('Rendering product details:', product);
        
        // Store category globally for tracking purposes
        window.currentProductCategory = product.category;
        
        // Track product view
        if (window.ishtri && window.ishtri.trackProductView) {
            window.ishtri.trackProductView(
                product.ProductdID,
                product.category || 'unknown',
                product.Price || 0
            );
        }
        
        // Store product owner ID for messaging
        productOwnerId = product.brukerId;

        // Hide skeleton and show content
        const skeleton = document.getElementById('productSkeleton');
        if (skeleton) skeleton.style.display = 'none';

        const carousel = document.getElementById('imageCarousel');
        const title = document.getElementById('productTitle');
        const price = document.getElementById('productPrice');
        const location = document.getElementById('productLocation');
        const description = document.getElementById('productDescription');

        // Show main elements
        if (carousel) carousel.style.display = 'block';
        if (title) title.style.display = 'block';
        
        document.querySelectorAll('.productDetailsContainer p').forEach(p => {
            p.style.display = 'block';
        });

        // Update title with fallback
        if (title) {
            title.textContent = product.ProductName || 'Product';
        }

        // Render category-specific content
        renderCategorySpecificContent(product, price, description, location);

        // Handle images with fallback
        if (product.Images) {
            renderImageCarousel(product.Images);
        } else {
            // Hide carousel if no images
            if (carousel) carousel.style.display = 'none';
        }

        // Show action buttons
        const contactBtn = document.getElementById('contactOwner');
        const favoriteBtn = document.getElementById('favoriteButton');
        
        if (contactBtn) contactBtn.style.display = 'block';
        if (favoriteBtn) favoriteBtn.style.display = 'block';
    }

    function renderCategorySpecificContent(product, priceElement, descElement, locationElement) {
        const isProperty = product.category === 'Eiendom';
        const isCar = product.category === 'Bil';
        const isJob = product.category === 'Jobb';

        console.log('Rendering category-specific content for:', product.category);

        // Handle property details
        if (isProperty) {
            let amenities = [];
            try {
                if (product.Amenities && product.Amenities.trim()) {
                    amenities = JSON.parse(product.Amenities);
                }
            } catch (parseError) {
                console.warn('Failed to parse amenities JSON:', parseError);
                console.warn('Amenities data:', product.Amenities);
                amenities = [];
            }
            
            if (priceElement) {
                priceElement.textContent = `${product.Price || 'Price not specified'} $`;
            }

            if (descElement) {
                descElement.innerHTML = `
                    <div class="property-details">
                        <p><strong>Property Type:</strong> ${product.PropertyType || 'Not specified'}</p>
                        <p><strong>Size:</strong> ${product.SizeSqm || 'Not specified'} m²</p>
                        <p><strong>Rooms:</strong> ${product.NumRooms || 'Not specified'}</p>
                        <p><strong>Bathrooms:</strong> ${product.NumBathrooms || 'Not specified'}</p>
                        <p><strong>Year Built:</strong> ${product.YearBuilt || 'Not specified'}</p>
                        <p><strong>Energy Class:</strong> ${product.EnergyClass || 'Not specified'}</p>
                        <p><strong>Amenities:</strong> ${Array.isArray(amenities) ? amenities.join(', ') || 'No special amenities' : 'No special amenities'}</p>
                    </div>
                    ${product.Description ? `<div class="description">${product.Description}</div>` : ''}
                `;
            }

            if (locationElement) {
                locationElement.textContent = product.Location || 'Location not specified';
            }
        }
        // Handle car details
        else if (isCar) {
            if (priceElement) {
                priceElement.innerHTML = `
                    ${product.Price || 'Price not specified'} $<br>
                    <strong data-i18n="form.brand">Brand:</strong> ${product.brand_name || 'Not specified'}<br>
                    <strong data-i18n="form.model">Model:</strong> ${product.model_name || 'Not specified'}<br>
                    <strong data-i18n="form.year">Year:</strong> ${product.Year || 'Not specified'}<br>
                    <strong data-i18n="form.mileage">Mileage:</strong> ${product.Mileage || 'Not specified'}
                `;
            }

            if (descElement) {
                descElement.innerHTML = `
                    ${product.Description || 'No description available'}
                    <p><strong data-i18n="form.fuel_type">Fuel Type:</strong> <span data-i18n="fuel.${product.FuelType?.toLowerCase() || ''}">${product.FuelType || 'Not specified'}</span></p>
                    <p><strong data-i18n="form.transmission">Transmission:</strong> <span data-i18n="transmission.${product.Transmission?.toLowerCase() || ''}">${product.Transmission || 'Not specified'}</span></p>
                `;
            }

            if (locationElement) {
                locationElement.textContent = `${product.Location || 'Location not specified'}${product.country ? ', ' + product.country : ''}`;
            }
        }
        // Handle job details
        else if (isJob) {
            if (priceElement) {
                priceElement.innerHTML = `<strong data-i18n="form.employment_type">Employment Type:</strong> ${product.EmploymentType || 'Not specified'}`;
            }

            if (descElement) {
                descElement.innerHTML = `
                    <p><strong data-i18n="form.company_name">Company:</strong> ${product.CompanyName || 'Not specified'}</p>
                    <p><strong data-i18n="form.salary">Salary:</strong> ${product.Salary || 'Not specified'}</p>
                    <p><strong data-i18n="form.deadline">Application Deadline:</strong> ${product.ApplicationDeadline || 'Not specified'}</p>
                    <p><strong data-i18n="form.contact_email">Contact Email:</strong> ${product.ContactEmail || 'Not specified'}</p>
                    ${product.JobDescription || product.Description || 'No job description available'}
                `;
            }

            if (locationElement) {
                locationElement.textContent = product.Location || 'Location not specified';
            }
        }
        // Default case
        else {
            if (priceElement) {
                priceElement.textContent = `${product.Price || 'Price not specified'} $`;
            }
            
            if (descElement) {
                descElement.textContent = product.Description || 'No description available';
            }
            
            if (locationElement) {
                locationElement.textContent = product.Location || 'Location not specified';
            }
        }
    }

    function renderImageCarousel(imagesString) {
        if (!imagesString || typeof imagesString !== 'string') {
            console.log('No images to render or invalid images data');
            return;
        }

        const images = imagesString.split(',').filter(img => img.trim());
        const carousel = document.getElementById('imageCarousel');
        
        if (!carousel) {
            console.warn('Carousel element not found');
            return;
        }

        if (images.length === 0) {
            console.log('No valid images found');
            carousel.style.display = 'none';
            return;
        }

        // Remove existing images
        carousel.querySelectorAll('img').forEach(img => img.remove());
        
        // Add new images
        images.forEach((imgSrc, index) => {
            const img = document.createElement('img');
            const trimmedSrc = imgSrc.trim();
            const small = `/img/640/${trimmedSrc}`;
            const medium = `/img/960/${trimmedSrc}`;
            const large = `/img/1600/${trimmedSrc}`;
            img.alt = `Product image ${index + 1}`;
            img.loading = index === 0 ? 'eager' : 'lazy';
            img.decoding = 'async';
            img.setAttribute('srcset', `${small} 640w, ${medium} 960w, ${large} 1600w`);
            img.setAttribute('sizes', '(max-width: 768px) 100vw, 850px');
            // Lazy load non-first images
            if (index === 0) {
                img.classList.add('active');
                img.src = medium; // good default for first view
            } else {
                img.setAttribute('data-src', medium);
            }
            
            // Add error handling for images
            img.onerror = function() {
                console.warn('Failed to load image:', this.src);
                this.style.display = 'none';
            };
            
            carousel.appendChild(img);
        });

        // Reset current image index
        currentImageIndex = 0;

        // Initialize lazy loading for carousel images
        if (window.ishtri?.lazyLoader) {
            window.ishtri.lazyLoader.observe();
        } else if (window.lazyLoader) {
            window.lazyLoader.observe();
        }

        updateCarouselButtons(images.length);
        console.log(`Rendered ${images.length} images in carousel`);
    }

    function updateCarouselButtons(imageCount) {
        document.querySelectorAll('.carousel button').forEach(btn => {
            btn.style.display = imageCount <= 1 ? 'none' : 'block';
        });
    }

    function prevImage() {
        const images = document.querySelectorAll('.carousel img');
        if (images.length <= 1) return;

        // Remove active class from current image
        if (images[currentImageIndex]) {
            images[currentImageIndex].classList.remove('active');
        }
        
        // Calculate new index
        currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
        
        // Add active class to new image
        if (images[currentImageIndex]) {
            images[currentImageIndex].classList.add('active');
            
            // Lazy load the new active image
            const activeImg = images[currentImageIndex];
            if (activeImg.hasAttribute('data-src') && !activeImg.src) {
                activeImg.src = activeImg.getAttribute('data-src');
            }
        }
        
        console.log('Previous image, now showing:', currentImageIndex);
    }

    function nextImage() {
        const images = document.querySelectorAll('.carousel img');
        if (images.length <= 1) return;

        // Remove active class from current image
        if (images[currentImageIndex]) {
            images[currentImageIndex].classList.remove('active');
        }
        
        // Calculate new index
        currentImageIndex = (currentImageIndex + 1) % images.length;
        
        // Add active class to new image
        if (images[currentImageIndex]) {
            images[currentImageIndex].classList.add('active');
            
            // Lazy load the new active image
            const activeImg = images[currentImageIndex];
            if (activeImg.hasAttribute('data-src') && !activeImg.src) {
                activeImg.src = activeImg.getAttribute('data-src');
            }
        }
        
        console.log('Next image, now showing:', currentImageIndex);
    }

    // ========== MODAL HANDLING ========== //
    function showMessageModal() {
        const modal = document.getElementById('messageModal');
        const overlay = document.getElementById('overlay');
        
        if (modal) modal.style.display = 'block';
        if (overlay) overlay.style.display = 'block';
    }

    function hideMessageModal() {
        const modal = document.getElementById('messageModal');
        const overlay = document.getElementById('overlay');
        const messageInput = document.getElementById('messageInput');
        
        if (modal) modal.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if (messageInput) messageInput.value = '';
    }

    function showLoginModal() {
        const modal = document.getElementById('loginModal');
        const overlay = document.getElementById('loginOverlay');
        
        if (modal) modal.style.display = 'block';
        if (overlay) overlay.style.display = 'block';
    }

    function hideLoginModal() {
        const modal = document.getElementById('loginModal');
        const overlay = document.getElementById('loginOverlay');
        
        if (modal) modal.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
    }

    // ========== MESSAGE FUNCTIONALITY ========== //
    async function handleContactOwner() {
        try {
            const response = await fetch('/api/auth/current-user');
            const data = await response.json();
            
            if (data.brukernavn) {
                showMessageModal();
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error checking user session:', error);
            window.location.href = '/login';
        }
    }

    async function handleSendMessage(productdID) {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;

        const messageContent = messageInput.value.trim();
        if (!messageContent) {
            showToast('Please enter a message', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    productdID: productdID, 
                    messageContent: messageContent,
                    receiverId: productOwnerId 
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            // Track successful contact/message sent
            if (window.ishtri && window.ishtri.trackContactSeller) {
                // Try to get category from the global product data if available
                const category = window.currentProductCategory || null;
                window.ishtri.trackContactSeller(productdID, category);
            }

            showToast('Message sent successfully!', 'success');
            hideMessageModal();
            
            // Update unread message badge
            checkUnreadMessages();
            
        } catch (error) {
            console.error('Message error:', error);
            showToast('Failed to send message', 'error');
        }
    }

    // ========== FAVORITE FUNCTIONALITY ========== //
    async function initializeFavorites(productdID) {
        try {
            // Check if user is logged in first
            const userResponse = await fetch('/api/auth/current-user');
            const userData = await userResponse.json();
            
            if (!userData.brukernavn) {
                // User not logged in - don't show favorites functionality yet
                return;
            }

            // User is logged in, check favorites
            const favResponse = await fetch('/api/favorites');
            if (!favResponse.ok) {
                if (favResponse.status === 401) {
                    console.log('User session expired');
                    return;
                }
                throw new Error('Failed to fetch favorites');
            }

            const favorites = await favResponse.json();
            
            // Parse the current product ID as integer
            const currentProductId = parseInt(productdID);
            
            // Handle empty favorites list
            if (!Array.isArray(favorites) || favorites.length === 0) {
                updateFavoriteButton(false);
                return;
            }
            
            // Check if current product is in favorites - try to find ANY valid ID field
            const isFavorited = favorites.some(fav => {
                // Get all possible ID values and find the first valid one
                const possibleIds = [
                    fav.productdID,
                    fav.ProductdID, 
                    fav.productId,
                    fav.ProductId,
                    fav.product_id,
                    fav.PRODUCTID,
                    fav.id
                ];
                
                // Find the first valid ID (not null, not undefined, and can be parsed as integer)
                let favId = null;
                for (const id of possibleIds) {
                    if (id !== null && id !== undefined) {
                        const parsedId = parseInt(id);
                        if (!isNaN(parsedId)) {
                            favId = parsedId;
                            break;
                        }
                    }
                }
                
                return favId !== null && favId === currentProductId;
            });
            
            updateFavoriteButton(isFavorited);
            
        } catch (error) {
            console.error('Error checking favorites:', error);
            // Silently fail - favorites will just not be available
        }
    }

    function updateFavoriteButton(isFavorited) {
        const favoriteButton = document.getElementById('favoriteButton');
        if (favoriteButton) {
            favoriteButton.textContent = isFavorited ? 'Unfavorite' : 'Favorite';
            favoriteButton.classList.toggle('unfavorite', isFavorited);
        }
    }

    async function toggleFavorite(productdID) {
        try {
            // Check if user is logged in first
            const userResponse = await fetch('/api/auth/current-user');
            const userData = await userResponse.json();
            
            if (!userData.brukernavn) {
                showToast('Please log in to add favorites', 'info');
                showLoginModal();
                return;
            }

            console.log('Toggling favorite for product ID:', productdID);

            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ productdID: parseInt(productdID) })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Toggle favorite response:', data);
            
            // Instead of relying on the response message, re-check the favorites status
            // This ensures the button state is always accurate
            await initializeFavorites(productdID);
            
            // Show appropriate toast message
            const isAdded = data.message.includes('Added');
            showToast(
                isAdded ? 'Product added to favorites' : 'Product removed from favorites',
                'success'
            );
            
        } catch (error) {
            console.error('Favorite error:', error);
            showToast('Failed to update favorites', 'error');
        }
    }

    // ========== BACK TO TOP FUNCTIONALITY ========== //
    function initializeBackToTop() {
        const backToTopButton = document.getElementById('backToTop');
        if (!backToTopButton) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ========== UTILITY FUNCTIONS ========== //
    
    // Unified toast helper
    function showToast(message, type = 'info') {
        const toast = window.ishtri?.toast || window.toast;
        if (toast && typeof toast.show === 'function') {
            toast.show(message, type);
        } else {
            console.log(`Toast (${type}):`, message);
            // Fallback to alert for errors
            if (type === 'error') {
                alert(message);
            }
        }
    }

    async function checkUnreadMessages() {
        try {
            const response = await fetch('/api/auth/current-user');
            const userData = await response.json();
            
            if (userData.brukernavn) {
                // User is logged in, could check for unread messages here if needed
                // This function exists in the original code but doesn't seem to be implemented
                console.log('User logged in, could check for unread messages');
            }
        } catch (error) {
            console.error('Error checking user session:', error);
        }
    }
}