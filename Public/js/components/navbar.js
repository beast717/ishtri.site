function updateBadge(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (badge) {
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function checkUnreadCounts() {
    fetch('/api/messages/unread-count', { credentials: 'include' })
        .then(res => res.ok ? res.json() : { count: 0 })
        .then(data => updateBadge('unreadBadge', data.unreadCount || 0))
        .catch(() => updateBadge('unreadBadge', 0));

    fetch('/api/notifications/unread-count', { credentials: 'include' })
        .then(res => res.ok ? res.json() : { count: 0 })
        .then(data => updateBadge('notificationBadge', data.count || 0))
        .catch(() => updateBadge('notificationBadge', 0));
}

function setupNavbarUI(user) {
    const loginButton = document.getElementById('loginButton');
    const profileContainer = document.getElementById('profileContainer');
    const profileUsername = document.getElementById('profileUsername');

    if (user && user.brukernavn) {
        if(loginButton) loginButton.style.display = 'none';
        if(profileContainer) profileContainer.style.display = 'flex';
        if(profileUsername) profileUsername.textContent = user.brukernavn;
    } else {
        if(loginButton) loginButton.style.display = 'flex';
        if(profileContainer) profileContainer.style.display = 'none';
    }
}

export function initNavbar() {
    const profileContainer = document.getElementById('profileContainer');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutButton = document.getElementById('logoutButton');

    fetch('/api/auth/current-user', { credentials: 'include' })
        .then(response => response.json())
        .then(user => {
            setupNavbarUI(user);
            if (user && user.brukernavn) {
                checkUnreadCounts(); // Initial check
                // Listen for updates via socket
                if (window.ishtri.socket) {
                    window.ishtri.socket.on('new_notification', checkUnreadCounts);
                    window.ishtri.socket.on('messageReceived', checkUnreadCounts);
                    window.ishtri.socket.on('notification_read', checkUnreadCounts);
                }
            }
        });

    if (profileContainer) {
        profileContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            if(dropdownMenu) dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                if(window.ishtri.socket) window.ishtri.socket.disconnect();
                window.location.href = '/login';
            });
        });
    }
    
    document.addEventListener('click', () => {
        if (dropdownMenu && dropdownMenu.style.display === 'block') {
            dropdownMenu.style.display = 'none';
        }
    });
}