/**
 * Handles the API call and UI update for toggling a product's favorite status.
 * This version waits for server confirmation before changing the UI.
 */
async function handleFavoriteClick(event) {
    event.stopPropagation();
    event.preventDefault();

    const icon = event.currentTarget;
    const productdID = icon.dataset.productId;

    // Disable the button to prevent multiple clicks
    icon.style.pointerEvents = 'none';

    try {
        const response = await fetch('/api/favorites', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productdID }),
        });

        const responseData = await response.json();

        // --- THE CORE FIX IS HERE ---
        // We now check the server response *before* making any visual changes.
        if (response.ok) {
            // SUCCESS: User is logged in and the database was updated.
            // Now, and only now, do we update the UI.
            const isFavorited = icon.classList.contains('favorited');
            
            icon.classList.toggle('favorited');
            icon.setAttribute('aria-pressed', !isFavorited);
            icon.style.color = isFavorited ? '#ccc' : '#ff4757';
            
            window.ishtri?.toast.show(
                isFavorited ? 'Product removed from favorites' : 'Product added to favorites',
                'success'
            );
        } else {
            // FAILURE: Server rejected the request (e.g., user is not logged in).
            // Do not change the UI. Only show the informational toast.
            window.ishtri?.toast.show('Please log in to manage favorites.', 'info');
        }

    } catch (error) {
        // NETWORK ERROR: The request didn't even reach the server.
        console.error("Favorite toggle network error:", error);
        window.ishtri?.toast.show('An error occurred. Please try again.', 'error');
    } finally {
        // Always re-enable the button so the user can try again.
        icon.style.pointerEvents = 'auto';
    }
}


/**
 * Initializes a favorite button by adding the necessary click event listener.
 * @param {HTMLElement} buttonElement - The favorite button element.
 */
export function initFavoriteButton(buttonElement) {
    if (!buttonElement) return;
    buttonElement.removeEventListener('click', handleFavoriteClick);
    buttonElement.addEventListener('click', handleFavoriteClick);
}

/**
 * Finds and initializes all favorite buttons within a given container.
 * @param {HTMLElement} container - The container element to search within.
 */
export function initAllFavoriteButtons(container = document) {
    const buttons = container.querySelectorAll('.favorite-icon');
    buttons.forEach(initFavoriteButton);
}