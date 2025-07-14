function handleFavoriteClick(event) {
    const icon = event.target.closest('.favorite-icon');
    if (!icon) return;

    event.preventDefault();
    event.stopPropagation();

    const productdID = icon.dataset.productId;
    const isFavorited = icon.classList.contains('favorited');

    fetch('/api/favorites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productdID }),
    })
    .then(response => {
        if (!response.ok) {
            if(response.status === 401) {
                window.ishtri.toast.show('Please <a href="/login">log in</a> to add favorites.', 'info');
            }
            throw new Error('Favorite toggle failed');
        }
        return response.json();
    })
    .then(data => {
        icon.classList.toggle('favorited');
        icon.style.color = isFavorited ? '#ccc' : '#ff4757';
        window.ishtri.toast.show(data.message, 'success');
    })
    .catch(error => {
        console.error("Favorite error:", error.message);
    });
}

function updateUserFavorites() {
    fetch('/api/favorites', { credentials: 'include' })
        .then(response => response.ok ? response.json() : [])
        .then(favorites => {
            const favoriteIds = new Set(favorites.map(p => p.ProductdID));
            document.querySelectorAll('.favorite-icon').forEach(icon => {
                const productdID = Number(icon.dataset.productId);
                const isFavorited = favoriteIds.has(productdID);
                icon.classList.toggle('favorited', isFavorited);
                icon.style.color = isFavorited ? '#ff4757' : '#ccc';
            });
        });
}

export function initFavoriteButtons() {
    if (!document.body.dataset.favoriteListener) {
        document.body.addEventListener('click', handleFavoriteClick);
        document.body.dataset.favoriteListener = 'true';
    }
    updateUserFavorites();
}