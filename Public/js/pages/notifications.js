/**
 * Notifications page functionality
 */

let socket = null;
let hasUnread = false;

export default function initNotificationsPage() {
    console.log('Initializing notifications page...');
    
    // Check if on the correct page
    const notificationList = document.getElementById('notificationList');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    
    if (!notificationList || !markAllReadBtn) {
        console.log('Notifications page elements not found');
        return;
    }

    // Use the global socket from app.js
    socket = window.ishtri.socket;
    if (!socket) {
        console.warn("Socket not initialized. Real-time notifications will not work.");
    }

    // Initialize page
    initializeNotifications();

    function initializeNotifications() {
        console.log('Initializing notifications functionality...');

        // Setup event listeners
        setupEventListeners();

        // Setup socket listeners for real-time updates
        setupSocketListeners();

        // Initial fetch
        fetchNotifications();
    }

    function setupEventListeners() {
        // Mark all as read button
        markAllReadBtn.addEventListener('click', markAllAsRead);

        // Event delegation for mark as read buttons
        notificationList.addEventListener('click', (e) => {
            const markBtn = e.target.closest('.mark-read-btn:not(.read)');
            if (markBtn) {
                const item = markBtn.closest('.notification-item');
                const notificationId = item.dataset.notificationId;
                markAsRead(notificationId, item);
            }
        });
    }

    function setupSocketListeners() {
        if (!socket) return;

        // Listen for new notifications
        socket.on('new_notification', (notificationData) => {
            console.log('New notification received on notifications page:', notificationData);
            fetchNotifications(); // Re-fetch to include the new notification
        });

        // Listen for notification read updates from other tabs
        socket.on('notification_read', (data) => {
            console.log('Notification read elsewhere event received:', data);
            const item = notificationList.querySelector(`.notification-item[data-notification-id="${data.notificationId}"]`);
            if (item && item.classList.contains('unread')) {
                updateNotificationItemUI(item, true);
                checkForUnreadAndToggleButton();
            }
        });

        // Listen for all notifications read updates
        socket.on('all_notifications_read', () => {
            console.log('All notifications read elsewhere event received.');
            fetchNotifications(); // Re-fetch the whole list
        });
    }

    async function fetchNotifications() {
        try {
            // Show skeleton loading using the SkeletonLoader class
            window.ishtri.skeletonLoader.showInContainer('notificationList', 'notification', 5);
            
            const response = await fetch('/api/notifications', { credentials: 'include' });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to view notifications.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const notifications = await response.json();
            
            // Hide skeleton and render notifications
            window.ishtri.skeletonLoader.hideInContainer('notificationList');
            renderNotifications(notifications);
        } catch (error) {
            console.error('Failed to load notifications:', error);
            
            // Hide skeleton on error
            window.ishtri.skeletonLoader.hideInContainer('notificationList');
            notificationList.innerHTML = `<p class="no-notifications">Error loading notifications: ${error.message}</p>`;
            markAllReadBtn.disabled = true;
            
            if (window.ishtri.toast) {
                window.ishtri.toast.show('Failed to load notifications', 'error');
            }
        }
    }

    function renderNotifications(notifications) {
        notificationList.innerHTML = '';
        hasUnread = false;

        if (!notifications || notifications.length === 0) {
            notificationList.innerHTML = '<p class="no-notifications">You have no notifications yet.</p>';
            markAllReadBtn.disabled = true;
            return;
        }

        notifications.forEach(notification => {
            if (!notification.isRead) hasUnread = true;

            const item = document.createElement('li');
            item.className = `notification-item ${notification.isRead ? 'read' : 'unread'}`;
            item.dataset.notificationId = notification.notificationId;

            // Determine icon based on type
            let iconClass = 'fa-envelope'; // Default
            if (notification.notification_type === 'new_match') {
                iconClass = 'fa-tags';
            }

            // Construct message, linking product name if productdID exists
            let messageHtml = notification.message;
            if (notification.notification_type === 'new_match' && notification.productdID && notification.ProductName) {
                const searchNameMatch = notification.message.match(/'([^']+)'/);
                const searchName = searchNameMatch ? searchNameMatch[1] : 'your search';
                let imgName = null;
                if (notification.firstImage) {
                    imgName = notification.firstImage
                        .replace('/uploads/', '')
                        .replace('/img/320/', '')
                        .replace('/img/360/', '')
                        .replace('/img/480/', '')
                        .replace('/img/600/', '')
                        .replace('/img/800/', '')
                        .replace('/img/1200/', '');
                }
                const fallback = '/images/default.svg';
                const srcSmall = imgName ? `/img/160/${imgName}` : fallback;
                const srcMed = imgName ? `/img/320/${imgName}` : fallback;
                const srcLg = imgName ? `/img/480/${imgName}` : fallback;
                const slug = (notification.ProductName || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,80);
                messageHtml = `New match for '${searchName}': <a href="/product/${notification.productdID}/${slug}" class="notification-product-link">`
                   + `<img src="/images/placeholder.png" data-src="${srcMed}" srcset="${srcSmall} 160w, ${srcMed} 320w, ${srcLg} 480w" sizes="160px" alt="Product thumbnail" onerror="this.src='${fallback}'">`
                   + `<span>${notification.ProductName || 'Product'}</span></a>`;
            }

            item.innerHTML = `
                <div class="notification-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <p class="notification-message">${messageHtml}</p>
                    <span class="notification-meta">${formatDate(notification.createdAt)}</span>
                </div>
                <div class="notification-actions">
                    ${!notification.isRead 
                        ? `<button class="mark-read-btn" title="Mark as read"><i class="fas fa-check-circle"></i></button>` 
                        : '<span class="mark-read-btn read" title="Read"><i class="fas fa-check-circle"></i></span>'
                    }
                </div>
            `;

            notificationList.appendChild(item);
        });

        // Enable/disable "Mark All Read" button
        markAllReadBtn.disabled = !hasUnread;
    }

    function formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    async function markAsRead(notificationId, listItem) {
        try {
            // Optimistic UI update
            updateNotificationItemUI(listItem, true);

            const response = await fetch(`/api/notifications/mark-read/${notificationId}`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to mark as read on server');
            }

            // Check if any unread remain after marking this one
            checkForUnreadAndToggleButton();
            console.log(`Notification ${notificationId} marked as read.`);

            // Update navbar badge count if function is available
            updateNavbarBadgeCount();

        } catch (error) {
            console.error(`Error marking notification ${notificationId} as read:`, error);
            
            // Revert UI on error
            updateNotificationItemUI(listItem, false);
            
            if (window.ishtri.toast) {
                window.ishtri.toast.show('Failed to mark notification as read.', 'error');
            }
        }
    }

    async function markAllAsRead() {
        if (!hasUnread) return;

        markAllReadBtn.disabled = true;
        
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to mark all as read on server');
            }

            // Re-fetch to update the whole list
            fetchNotifications();
            console.log('All notifications marked as read.');

            if (window.ishtri.toast) {
                window.ishtri.toast.show('All notifications marked as read.', 'success');
            }

            // Update navbar badge count
            updateNavbarBadgeCount();

        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            
            if (window.ishtri.toast) {
                window.ishtri.toast.show('Failed to mark all notifications as read.', 'error');
            }
            
            markAllReadBtn.disabled = !hasUnread;
        }
    }

    function updateNotificationItemUI(listItem, isRead) {
        if (isRead) {
            listItem.classList.remove('unread');
            listItem.classList.add('read');
            const actionDiv = listItem.querySelector('.notification-actions');
            if (actionDiv) {
                actionDiv.innerHTML = '<span class="mark-read-btn read" title="Read"><i class="fas fa-check-circle"></i></span>';
            }
        } else {
            listItem.classList.add('unread');
            listItem.classList.remove('read');
            const actionDiv = listItem.querySelector('.notification-actions');
            if (actionDiv) {
                actionDiv.innerHTML = `<button class="mark-read-btn" title="Mark as read"><i class="fas fa-check-circle"></i></button>`;
            }
        }
    }

    function checkForUnreadAndToggleButton() {
        hasUnread = !!notificationList.querySelector('.notification-item.unread');
        markAllReadBtn.disabled = !hasUnread;
    }

    function updateNavbarBadgeCount() {
        // Update navbar badge count if the update function is available
        if (window.ishtri.updateNavbar && typeof window.ishtri.updateNavbar === 'function') {
            // Trigger navbar update which will fetch new unread count
            fetch('/api/auth/current-user', { credentials: 'include' })
                .then(res => res.json())
                .then(user => {
                    if (user) {
                        window.ishtri.updateNavbar(user);
                    }
                })
                .catch(err => console.error('Failed to update navbar:', err));
        }
    }
}