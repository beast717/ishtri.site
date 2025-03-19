// shared.js
function checkUnreadMessages() {
    fetch('/api/messages/unread-count', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            const badge = document.getElementById('unreadBadge');
            if (badge) {
                badge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
                if (data.unreadCount > 0) {
                    badge.setAttribute('title', i18next.t('meldinger.unread_count', { count: data.unreadCount }));
                }
            } else {
                console.error(i18next.t('errors.element_not_found', { element: 'unreadBadge' }));
            }
        })
        .catch(error => console.error(i18next.t('errors.fetch_failed', { error: error.message })));
}