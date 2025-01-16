// shared.js
function checkUnreadMessages() {
    fetch('/api/unread-messages-count')
        .then(response => response.json())
        .then(data => {
            const badge = document.getElementById('unreadBadge');
            if (badge) {
                badge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
            } else {
                console.error("unreadBadge element not found!");
            }
        })
        .catch(error => console.error("Error fetching unread messages count:", error));
}