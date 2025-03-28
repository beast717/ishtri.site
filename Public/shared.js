function checkUnreadMessages() {
    if (!document.getElementById('messagesPage')) {
        fetch('/api/messages/unread-count')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                const badge = document.getElementById('unreadBadge');
                if (badge) {
                    badge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
                    badge.textContent = data.unreadCount > 0 ? data.unreadCount : '';
                }
            })
            .catch(error => console.error('Error checking messages:', error));
    }
}

document.addEventListener('DOMContentLoaded', checkUnreadMessages);