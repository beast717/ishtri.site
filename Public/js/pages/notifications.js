export default function initNotificationsPage() {
    const notificationList = document.getElementById('notificationList');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (!notificationList || !markAllReadBtn) return;

    let hasUnread = false;

    async function fetchNotifications() {
        try {
            const response = await fetch('/api/notifications', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to load notifications');
            const notifications = await response.json();
            renderNotifications(notifications);
        } catch (error) {
            notificationList.innerHTML = `<p class="no-notifications">${error.message}</p>`;
        }
    }

    function renderNotifications(notifications) {
        notificationList.innerHTML = '';
        hasUnread = notifications.some(n => !n.isRead);

        if (notifications.length === 0) {
            notificationList.innerHTML = '<p class="no-notifications">You have no notifications yet.</p>';
        }

        notifications.forEach(n => {
            const item = document.createElement('li');
            item.className = `notification-item ${n.isRead ? 'read' : 'unread'}`;
            item.dataset.notificationId = n.notificationId;
            // ... your full innerHTML logic from the original script ...
            notificationList.appendChild(item);
        });

        markAllReadBtn.disabled = !hasUnread;
    }
    
    // ... all your other helper functions (formatDate, markAsRead, markAllAsRead) ...

    // --- EVENT LISTENERS ---
    notificationList.addEventListener('click', e => {
        const markBtn = e.target.closest('.mark-read-btn:not(.read)');
        if (markBtn) {
            const item = markBtn.closest('.notification-item');
            const notificationId = item.dataset.notificationId;
            // markAsRead(notificationId, item);
        }
    });

    markAllReadBtn.addEventListener('click', () => { /* markAllAsRead(); */ });

    // --- SOCKET LISTENERS ---
    if (window.ishtri.socket) {
        window.ishtri.socket.on('new_notification', fetchNotifications);
        window.ishtri.socket.on('notification_read', fetchNotifications);
        window.ishtri.socket.on('all_notifications_read', fetchNotifications);
    }

    // --- INITIAL LOAD ---
    fetchNotifications();
}