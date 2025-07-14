export default function initProductDetailsPage() {
    // --- STATE & CONFIG ---
    const urlParams = new URLSearchParams(window.location.search);
    const productdID = urlParams.get('productdID');
    let productOwnerId = null;
    let currentImageIndex = 0;

    // --- DOM ELEMENTS ---
    const messageModal = document.getElementById('messageModal');
    const overlay = document.getElementById('overlay');
    const messageInput = document.getElementById('messageInput');
    const favoriteButton = document.getElementById('favoriteButton');
    const contactOwnerBtn = document.getElementById('contactOwner');
    const imageCarousel = document.getElementById('imageCarousel');
    const productSkeleton = document.getElementById('productSkeleton');
    // ... all other element selectors ...

    // --- FUNCTIONS ---
    const showMessageModal = () => {
        messageModal.style.display = 'block';
        overlay.style.display = 'block';
    };
    const hideMessageModal = () => {
        messageModal.style.display = 'none';
        overlay.style.display = 'none';
    };
    
    function sendMessage() {
        const messageContent = messageInput.value.trim();
        if (!messageContent || !productOwnerId) {
            window.ishtri.toast.show('Please enter a message.', 'warning');
            return;
        }
        fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productdID, messageContent, receiverId: productOwnerId })
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to send message');
            window.ishtri.toast.show('Message sent successfully!', 'success');
            hideMessageModal();
        })
        .catch(err => window.ishtri.toast.show(err.message, 'error'));
    }
    
    function toggleFavorite() {
        fetch('/api/favorites', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productdID })
        })
        .then(res => {
            if (res.status === 401) {
                window.ishtri.toast.show('Please log in to add favorites.', 'info');
                return;
            }
            if (!res.ok) throw new Error('Failed to update favorites');
            return res.json();
        })
        .then(data => {
            if (!data) return;
            const isFavorited = data.message.includes('Added');
            favoriteButton.textContent = isFavorited ? 'Unfavorite' : 'Favorite';
            favoriteButton.classList.toggle('unfavorite', isFavorited);
            window.ishtri.toast.show(data.message, 'success');
        })
        .catch(err => window.ishtri.toast.show(err.message, 'error'));
    }

    function updateCarouselUI(images) {
        if (!imageCarousel) return;
        imageCarousel.innerHTML = `
            <button class="prev" aria-label="Previous image">❮</button>
            <button class="next" aria-label="Next image">❯</button>
        `;
        images.forEach((imgSrc, index) => {
            const img = document.createElement('img');
            img.src = `/uploads/${imgSrc.trim()}`;
            if (index !== 0) img.style.display = 'none';
            imageCarousel.appendChild(img);
        });
        
        const prevBtn = imageCarousel.querySelector('.prev');
        const nextBtn = imageCarousel.querySelector('.next');
        
        const allImages = imageCarousel.querySelectorAll('img');
        
        const showImage = (index) => {
            allImages.forEach((img, i) => {
                img.style.display = i === index ? 'block' : 'none';
            });
        };
        
        prevBtn.addEventListener('click', () => {
            currentImageIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
            showImage(currentImageIndex);
        });
        
        nextBtn.addEventListener('click', () => {
            currentImageIndex = (currentImageIndex + 1) % allImages.length;
            showImage(currentImageIndex);
        });

        if (allImages.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
    }

    // --- INITIALIZATION ---
    if (!productdID) {
        document.querySelector('.productDetailsContainer').innerHTML = '<h1>Product not found.</h1>';
        return;
    }

    fetch(`/api/products/${productdID}`)
        .then(res => res.json())
        .then(product => {
            productSkeleton.style.display = 'none';
            productOwnerId = product.brukerId;

            // Populate all the product details fields (title, price, desc, etc.)
            document.getElementById('productTitle').textContent = product.ProductName;
            // ... and so on for all fields ...
            document.getElementById('productDescription').textContent = product.Description;
            document.getElementById('productPrice').textContent = `${product.Price} $`;
            document.getElementById('productLocation').textContent = product.Location;
            
            // Show the content
            document.getElementById('imageCarousel').style.display = 'block';
            document.getElementById('productTitle').style.display = 'block';
            document.querySelectorAll('.productDetailsContainer p').forEach(p => p.style.display = 'block');
            contactOwnerBtn.style.display = 'inline-block';
            favoriteButton.style.display = 'inline-block';

            const images = product.Images ? product.Images.split(',') : [];
            updateCarouselUI(images);
            
            // Set initial favorite state
            fetch('/api/favorites').then(res=>res.ok?res.json():[]).then(favs => {
                const isFavorited = favs.some(p => p.ProductdID == productdID);
                favoriteButton.textContent = isFavorited ? 'Unfavorite' : 'Favorite';
                favoriteButton.classList.toggle('unfavorite', isFavorited);
            });
        });
    
    contactOwnerBtn.addEventListener('click', () => {
        fetch('/api/auth/current-user').then(res => res.json()).then(user => {
            if (user && user.brukernavn) showMessageModal();
            else window.location.href = '/login';
        });
    });

    document.getElementById('sendMessageButton').addEventListener('click', sendMessage);
    document.getElementById('cancelMessageButton').addEventListener('click', hideMessageModal);
    favoriteButton.addEventListener('click', toggleFavorite);
}