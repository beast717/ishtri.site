// Public/js/components/navbar.js

/**
 * Fetches the unread message count and updates the badge in the navbar.
 */
function checkUnreadMessages() {
    // Don't run if we are on the messages page itself
    if (document.getElementById('messagesPageContainer')) {
        const badge = document.getElementById('unreadBadge');
        if (badge) badge.style.display = 'none';
        return;
    }

    fetch('/api/messages/unread-count', { credentials: 'include' })
        .then(response => {
            if (!response.ok) return { unreadCount: 0 };
            return response.json();
        })
        .then(data => {
            const badge = document.getElementById('unreadBadge');
            if (badge) {
                const count = data.unreadCount || 0;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
                badge.textContent = count > 0 ? count : '';
            }
        })
        .catch(error => {
            console.error('Error checking unread messages:', error);
            const badge = document.getElementById('unreadBadge');
            if (badge) badge.style.display = 'none';
        });
}

/**
 * Fetches the unread notification count and updates the badge on the bell icon.
 */
function updateNotificationBadge() {
    const notificationBadge = document.getElementById('notificationBadge');
    if (!notificationBadge) return;

    fetch('/api/notifications/unread-count', { credentials: 'include' })
        .then(response => {
            if (!response.ok) return { count: 0 };
            return response.json();
        })
        .then(data => {
            const count = (data && typeof data.count === 'number') ? data.count : 0;
            notificationBadge.textContent = count;
            notificationBadge.style.display = count > 0 ? 'block' : 'none';
        })
        .catch(error => {
            console.error('Error updating notification badge:', error);
            notificationBadge.textContent = '0';
            notificationBadge.style.display = 'none';
        });
}

/**
 * Sets up the real-time socket listeners for navbar elements (badges).
 */
function setupSocketListeners() {
    const socket = window.ishtri.socket;
    if (!socket) return;

    // Listen for new notifications
    socket.on('new_notification', (notificationData) => {
        updateNotificationBadge();
        if (window.ishtri.toast) {
            const productLink = notificationData.productdID ? `<a href="/productDetails?productdID=${notificationData.productdID}" style="text-decoration: underline;">View Product</a>` : '';
            window.ishtri.toast.show(`New Match: ${notificationData.message} ${productLink}`, 'info', 10000);
        }
    });

    // Listen for read events to keep the badge in sync
    socket.on('notification_read', updateNotificationBadge);
    socket.on('all_notifications_read', updateNotificationBadge);

    // Listen for new messages to update the message badge
    socket.on('messageReceived', () => {
        // Re-fetch message count unless user is on the messages page
        if (!document.getElementById('messagesPageContainer')) {
            checkUnreadMessages();
        }
    });
}

/**
 * Updates the navbar UI to show either the "Login" button or the user profile dropdown.
 * @param {object|null} user - The user object, or null if not logged in.
 */
function updateNavbarUI(user) {
    console.log('Updating navbar UI with user:', user);
    
    const loginButton = document.getElementById('loginButton');
    const profileContainer = document.getElementById('profileContainer');
    const profileUsername = document.getElementById('profileUsername');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutButton = document.getElementById('logoutButton');

    console.log('Navbar elements found:', {
        loginButton: !!loginButton,
        profileContainer: !!profileContainer,
        profileUsername: !!profileUsername,
        dropdownMenu: !!dropdownMenu,
        logoutButton: !!logoutButton
    });

    if (user && user.brukernavn) {
        console.log('User is logged in, showing profile container');
        // --- User is Logged In ---
        if (loginButton) loginButton.style.display = 'none';
        if (profileContainer) profileContainer.style.display = 'flex';
        if (profileUsername) profileUsername.textContent = user.brukernavn;

    } else {
        console.log('User is not logged in, showing login button');
        // --- User is Logged Out ---
        if (loginButton) loginButton.style.display = 'block';
        if (profileContainer) profileContainer.style.display = 'none';
    }

    // --- Setup Event Listeners (they are idempotent, safe to run multiple times) ---
    if (profileContainer && dropdownMenu) {
        profileContainer.addEventListener('click', (event) => {
            const isVisible = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isVisible ? 'none' : 'block';
            event.stopPropagation();
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                .then(response => {
                    if (response.ok) {
                        if (window.ishtri.socket?.connected) window.ishtri.socket.disconnect();
                        window.location.href = '/';
                    } else {
                        window.ishtri.toast?.show('Logout failed. Please try again.', 'error');
                    }
                }).catch(err => {
                    window.ishtri.toast?.show('An error occurred during logout.', 'error');
                });
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (dropdownMenu && dropdownMenu.style.display === 'block' && !profileContainer?.contains(event.target)) {
            dropdownMenu.style.display = 'none';
        }
    });
}


/**
 * Main initialization function for the navbar.
 * @param {object|null} user - The user object, or null if not logged in.
 */
export function initNavbar(user = null) {
    // Update the UI based on whether a user object was provided
    updateNavbarUI(user);

    // If user is logged in, perform authenticated actions
    if (user && user.brukerId) {
        console.log(`User ${user.brukerId} is logged in. Setting up authenticated navbar features.`);
        
        // Listen for real-time updates (socket should already be authenticated by app.js)
        setupSocketListeners();
    }
}

/**
 * Updates the navbar when user logs in or out dynamically
 * @param {object|null} user - The user object, or null if logged out
 */
export function updateNavbar(user) {
    updateNavbarUI(user);
    
    // If user just logged in, set up authenticated features
    if (user && user.brukerId) {
        console.log(`User ${user.brukerId} logged in. Updating navbar.`);
        setupSocketListeners();
        
        // Also trigger initial badge updates
        if (typeof checkUnreadMessages === 'function') {
            checkUnreadMessages();
        }
        if (typeof updateNotificationBadge === 'function') {
            updateNotificationBadge();
        }
    }
}