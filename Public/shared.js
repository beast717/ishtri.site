// --- START OF FILE Public/shared.js ---

// Function to check UNREAD MESSAGES (for message icon badge)
function checkUnreadMessages() {
    // Only run if NOT on the main messages page itself
    // Add an ID to the main container div/body of messages.ejs, e.g., id="messagesPageContainer"
    if (!document.getElementById('messagesPageContainer')) {
        fetch('/api/messages/unread-count', { credentials: 'include' }) // Ensure cookies are sent
            .then(response => {
                // If not logged in (401) or other error, don't show badge
                if (!response.ok) {
                    if (response.status !== 401) { // Don't log expected auth errors as console errors
                        console.error('Network response error fetching message count:', response.statusText);
                    }
                    return { unreadCount: 0 }; // Default to 0 on error/unauthenticated
                }
                return response.json();
            })
            .then(data => {
                const badge = document.getElementById('unreadBadge');
                if (badge) {
                    const count = data.unreadCount || 0;
                    // Use inline-block to respect layout, none to hide
                    badge.style.display = count > 0 ? 'inline-block' : 'none';
                    // Display count only if > 0, otherwise badge itself is hidden
                    badge.textContent = count > 0 ? count : '';
                }
            })
            .catch(error => {
                console.error('Error checking unread messages:', error);
                const badge = document.getElementById('unreadBadge');
                if (badge) badge.style.display = 'none'; // Hide badge on fetch error
            });
    } else {
        // On the messages page itself, hide the badge initially or manage differently
         const badge = document.getElementById('unreadBadge');
         if (badge) badge.style.display = 'none';
    }
}

// Function to update the NOTIFICATION badge count (for bell icon)
function updateNotificationBadge() {
    const notificationBadge = document.getElementById('notificationBadge');
    if (!notificationBadge) return; // Exit if badge element not found

    fetch('/api/notifications/unread-count', { credentials: 'include' }) // Send cookies
        .then(response => {
            if (!response.ok) {
                // If not OK (e.g., 401 Unauthorized), don't try to parse JSON
                if (response.status !== 401) {
                     console.error('Error fetching notification count:', response.status, response.statusText);
                } // else { console.log("User not logged in for notification count."); } // Optional log
                // Return an object that looks like the expected success response but with count 0
                return { count: 0 };
            }
            // Only attempt to parse JSON if the response was successful (status 2xx)
            const contentType = response.headers.get('content-type');
             if (!contentType || !contentType.includes('application/json')) {
                console.error('Received non-JSON response from notification count endpoint');
                // Even on success, if it's not JSON, treat as error/zero count
                return { count: 0 };
            }
            return response.json();
        })
        .then(data => {
            // Ensure data is an object and has a count property, default to 0 otherwise
            const count = (data && typeof data.count === 'number') ? data.count : 0;
            notificationBadge.textContent = count; // Update text content
            // Use 'block' or 'flex' or appropriate display value based on your CSS
            notificationBadge.style.display = count > 0 ? 'block' : 'none';
        })
        .catch(error => {
            // Catch network errors or errors from response.json() if it still fails
            console.error('Error updating notification badge:', error);
            if (notificationBadge) { // Check again in case it disappeared
                 notificationBadge.textContent = '0'; // Reset text
                 notificationBadge.style.display = 'none'; // Hide on fetch error
            }
        });
}

// --- Function to Load Non-Essential Scripts (for Cookie Consent) ---
function loadNonEssentialScripts() {
    // Load Google AdSense dynamically
    if (!document.getElementById('adsbygoogle-script')) { // Check if already loaded
        const adsenseScript = document.createElement('script');
        adsenseScript.id = 'adsbygoogle-script';
        adsenseScript.async = true;
        // Use your actual AdSense client ID
        adsenseScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4798087235374147";
        adsenseScript.crossOrigin = "anonymous";
        document.head.appendChild(adsenseScript);
    }

    // --- Add other non-essential scripts here ---
    // Example: Google Analytics (replace YOUR_GA_ID)
    /*
    const gaId = 'YOUR_GA_ID';
    if (gaId !== 'YOUR_GA_ID' && typeof gtag === 'undefined') {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(gaScript);

        gaScript.onload = () => {
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', gaId);
        }
    }
    */
}

// --- Main DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // The AdSense script that was here has been removed.
    // It is now correctly loaded via the loadNonEssentialScripts() function,
    // which is triggered by the cookie consent logic.

    // --- Authentication Check ---
    // Fetch user status first to determine if authenticated calls should proceed
    fetch('/api/auth/current-user', { credentials: 'include' })
        .then(res => {
            // Check if response is okay AND is JSON before parsing
            if (!res.ok) {
                 // Handle non-OK responses (like 401) - user is not logged in or error occurred
                 if (res.status === 401) {
                     console.log("User not logged in (initial check). Skipping authenticated initial loads.");
                 } else {
                     console.error(`Initial user check failed with status: ${res.status}`);
                 }
                 return null; // Indicate user is not logged in or error
            }
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                 console.error('Received non-JSON response from current-user endpoint');
                 return null; // Treat as error/not logged in
            }
            return res.json(); // Parse JSON only if response is OK and content type is correct
        })
        .then(user => {
            const isLoggedIn = user && user.brukerId;

            // --- Initial UI Updates & Checks (Conditional) ---
            if (isLoggedIn) {
                console.log("User is logged in. Performing initial authenticated loads.");
                checkUnreadMessages();      // Check message count on load
                updateNotificationBadge();  // Check notification count on load
            } else {
                // Optionally update badges to 0 explicitly if needed, though default state might suffice
                 const messageBadge = document.getElementById('unreadBadge');
                 if (messageBadge) messageBadge.style.display = 'none';
                 const notificationBadge = document.getElementById('notificationBadge');
                 if (notificationBadge) notificationBadge.style.display = 'none';
            }

            // --- Socket.IO Setup & Authentication ---
            setupSocketIO(isLoggedIn ? user.brukerId : null); // Pass user ID or null

            // --- Navbar Profile/Login State Logic ---
            setupNavbar(isLoggedIn ? user : null); // Pass user object or null

        })
        .catch(error => {
            // Catch errors from the initial fetch/json parsing itself
            console.error("Error during initial user check:", error);
            // Setup UI assuming logged out state on error
            setupSocketIO(null);
            setupNavbar(null);
             // Ensure badges are hidden on error
             const messageBadge = document.getElementById('unreadBadge');
             if (messageBadge) messageBadge.style.display = 'none';
             const notificationBadge = document.getElementById('notificationBadge');
             if (notificationBadge) notificationBadge.style.display = 'none';
        });


    // --- Socket.IO Setup Function ---
    let socket; // Declare socket variable in wider scope if needed elsewhere
    function setupSocketIO(userId) {
        // --- ADD THIS CHECK ---
        if (typeof io === 'undefined') {
            console.error("Socket.IO client library (io) not loaded. Real-time features disabled.");
            // Optionally display a message to the user or disable UI elements
            return; // Stop execution if io is not available
        }
        // --- END CHECK ---

        try {
            // Connect only if not already connected (or handle reconnection logic if needed)
            if (!socket || !socket.connected) {
                 socket = io(); // Connect to Socket.IO server
                 console.log("Socket.IO attempting connection.");

                 socket.on('connect', () => {
                     console.log("Socket.IO connected.");
                     // Authenticate immediately if userId is available
                     if (userId) {
                         socket.emit('authenticate', userId);
                         console.log(`Socket authenticated for user: ${userId}`);
                     } else {
                         console.log("User not logged in, socket connected but not authenticated.");
                     }
                 });

                 socket.on('disconnect', (reason) => {
                     console.log(`Socket.IO disconnected: ${reason}`);
                     // Handle potential reconnection logic here if needed
                 });

                 socket.on('connect_error', (error) => {
                     console.error("Socket.IO connection error:", error);
                 });

                 // --- Socket Event Listeners (for real-time updates) ---
                 // Listen for new notifications
                 socket.on('new_notification', (notificationData) => {
                     updateNotificationBadge(); // Update badge when a new notification arrives
                     if (window.toast) {
                         const productLink = notificationData.productdID
                             ? `<a href="/productDetails?productdID=${notificationData.productdID}" style="text-decoration: underline; color: blue;">View Product</a>`
                             : '';
                         window.toast.show(`New Match: ${notificationData.message} ${productLink}`, 'info', 10000);
                     }
                 });

                 // Listen for updates when a notification is read elsewhere
                 socket.on('notification_read', (data) => {
                     updateNotificationBadge(); // Update badge count
                 });

                 // Listen for updates when all notifications are read elsewhere
                 socket.on('all_notifications_read', () => {
                     updateNotificationBadge(); // Update badge count
                 });

                 // Listen for new messages to update message badge (optional, but good practice)
                 socket.on('messageReceived', (messageData) => {
                     // Avoid incrementing if user is currently on the messages page
                     if (!document.getElementById('messagesPageContainer')) {
                         checkUnreadMessages(); // Re-fetch message count
                     }
                 });

            } else if (userId && !socket.authenticated) {
                 // If socket exists but wasn't authenticated (e.g., user logged in after page load)
                 // This scenario might need more complex handling depending on app flow
                 console.log("Socket exists, attempting re-authentication.");
                 socket.emit('authenticate', userId);
            }

        } catch (e) {
            console.error("Socket.IO setup failed. Real-time updates disabled.", e);
            // Handle cases where socket.io might not load or connect
        }
    }


    // --- Navbar Setup Function ---
    function setupNavbar(user) {
        const loginButton = document.getElementById('loginButton');
        const profileContainer = document.getElementById('profileContainer');
        const profileUsername = document.getElementById('profileUsername');
        // const profileIcon = document.getElementById('profileIcon'); // Uncomment if using profile icon

        if (loginButton && profileContainer) { // Ensure basic elements exist
            if (user && user.brukernavn) {
                loginButton.style.display = 'none';
                profileContainer.style.display = 'flex'; // Or 'block' etc. based on your CSS
                if (profileUsername) profileUsername.textContent = user.brukernavn;
                // if (profileIcon) profileIcon.src = user.profileIconUrl || 'prrofilepic.svg'; // Uncomment and adjust if needed
            } else {
                loginButton.style.display = 'block'; // Or 'flex', 'inline-flex' etc.
                profileContainer.style.display = 'none';
            }
        } else {
             console.warn("Navbar elements (loginButton/profileContainer) not found.");
        }

        // --- Profile Dropdown Logic (can stay here or be moved inside setupNavbar) ---
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (profileContainer && dropdownMenu) { // Check elements exist
            profileContainer.addEventListener('click', function (event) {
                const isVisible = dropdownMenu.style.display === 'block';
                dropdownMenu.style.display = isVisible ? 'none' : 'block';
                profileContainer.classList.toggle('dropdown-open', !isVisible);
                event.stopPropagation(); // Prevent click closing it immediately
            });

            // Close dropdown if clicking outside of it
            document.addEventListener('click', function (event) {
                // Check if dropdownMenu exists and is visible before trying to access its style
                if (dropdownMenu && dropdownMenu.style.display === 'block' && !profileContainer.contains(event.target)) {
                    dropdownMenu.style.display = 'none';
                    profileContainer.classList.remove('dropdown-open');
                }
            });
        }

        // --- Logout Button Logic (can stay here or be moved inside setupNavbar) ---
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                    .then(response => {
                        if (response.ok) {
                            if (socket && socket.connected) { // Disconnect socket if connected
                                console.log("Logging out, disconnecting socket.");
                                socket.disconnect();
                            }
                            window.location.href = '/'; // Redirect to homepage
                        } else {
                            console.error("Logout failed on server.");
                            window.toast?.show('Logout failed. Please try again.', 'error'); // Use toast if available
                        }
                    }).catch(err => {
                        console.error("Error during logout fetch:", err);
                         window.toast?.show('An error occurred during logout.', 'error');
                    });
            });
        }
    }


    // --- Cookie Consent Logic ---
    const consentBanner = document.getElementById('cookieConsentBanner');
    const acceptBtn = document.getElementById('cookieAcceptBtn');
    const rejectBtn = document.getElementById('cookieRejectBtn');
    const consentStatusKey = 'cookieConsentStatus_ishtri_v1'; // Unique key

    if (consentBanner && acceptBtn && rejectBtn) { // Check all elements exist
        let currentStatus = null; // Default to null if localStorage is inaccessible
        try {
            currentStatus = localStorage.getItem(consentStatusKey);
        } catch (e) {
            console.warn("Could not access localStorage to get cookie consent status:", e);
            // Optionally inform the user or proceed with default behavior (showing the banner)
        }


        if (currentStatus === 'accepted') {
            loadNonEssentialScripts(); // Load scripts immediately
        } else if (currentStatus === 'rejected') {
            // Non-essential scripts should NOT load.
        } else {
            // No status set, invalid status, or localStorage inaccessible, show the banner
            consentBanner.style.display = 'block'; // Use display 'block' or 'flex' based on CSS
            // Optional: Add class for transition after display is set
            setTimeout(() => { consentBanner.classList.add('show'); }, 50);
        }

         // Event Listeners
         acceptBtn.addEventListener('click', () => {
            try {
                localStorage.setItem(consentStatusKey, 'accepted');
            } catch (e) {
                console.warn("Could not access localStorage to set cookie consent status:", e);
                // Optionally inform the user that their preference might not be saved
            }
            consentBanner.style.display = 'none';
            loadNonEssentialScripts();
        });

        rejectBtn.addEventListener('click', () => {
            try {
                localStorage.setItem(consentStatusKey, 'rejected');
            } catch (e) {
                console.warn("Could not access localStorage to set cookie consent status:", e);
                 // Optionally inform the user that their preference might not be saved
            }
            consentBanner.classList.remove('show'); // Hide with animation
            // Ensure non-essential scripts are not loaded if they haven't been already
        });


    }


    // --- Language Selector Logic ---
    /*const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        // Load saved language or default to browser/English
        const savedLang = localStorage.getItem('preferredLanguage') || navigator.language.split('-')[0] || 'en';
        // Ensure the savedLang is a valid option, otherwise default to 'en'
        const validLangs = Array.from(languageSelect.options).map(opt => opt.value);
        languageSelect.value = validLangs.includes(savedLang) ? savedLang : 'en';

        // Apply the initial language
        if (window.i18n) { // Check if your i18n library object exists
             window.i18n.setLanguage(languageSelect.value);
        } else {
             console.warn("i18n library not found. Cannot set initial language.");
        }


        languageSelect.addEventListener('change', function() {
            const selectedLang = this.value;
            try {
                localStorage.setItem('preferredLanguage', selectedLang);
                 if (window.i18n) {
                    window.i18n.setLanguage(selectedLang); // Update language using your i18n library's method
                 } else {
                      console.warn("i18n library not found. Cannot change language.");
                 }

            } catch (e) {
                console.error("Could not save language preference to localStorage:", e);
                alert("Could not save your language preference due to a browser issue.");
            }
        });
        
    } */

});
