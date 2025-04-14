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
                if (response.status !== 401) {
                     console.error('Error fetching notification count:', response.statusText);
                } // else { console.log("User not logged in for notification count."); } // Optional log
                return { count: 0 }; // Default to 0 on error/unauthenticated
            }
            return response.json();
        })
        .then(data => {
            const count = data.count || 0;
            notificationBadge.textContent = count; // Update text content
            // Use 'block' or 'flex' or appropriate display value based on your CSS
            notificationBadge.style.display = count > 0 ? 'block' : 'none';
        })
        .catch(error => {
            console.error('Error updating notification badge:', error);
            notificationBadge.style.display = 'none'; // Hide on fetch error
        });
}

// --- Function to Load Non-Essential Scripts (for Cookie Consent) ---
function loadNonEssentialScripts() {
    console.log("Consent granted: Loading non-essential scripts.");

    // Load Google AdSense dynamically
    if (!document.getElementById('adsbygoogle-script')) { // Check if already loaded
        const adsenseScript = document.createElement('script');
        adsenseScript.id = 'adsbygoogle-script';
        adsenseScript.async = true;
        // *** IMPORTANT: REPLACE WITH YOUR ACTUAL ADSENSE CLIENT ID ***
        adsenseScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUB_ID";
        adsenseScript.crossOrigin = "anonymous";
        document.head.appendChild(adsenseScript);
        console.log('AdSense script loaded dynamically.');
    } else {
        console.log('AdSense script already present.');
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
            console.log('Google Analytics loaded dynamically.');
        }
    } else if (gaId !== 'YOUR_GA_ID') {
         console.log('Google Analytics already present.');
    }
    */
}

// --- Main DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {

    // --- Initial UI Updates & Checks ---
    checkUnreadMessages();      // Check message count on load
    updateNotificationBadge();  // Check notification count on load

    // --- Socket.IO Setup & Authentication ---
    // Ensure socket.io client library is loaded before this script in your HTML
    // e.g., <script src="/socket.io/socket.io.js"></script>
    let socket; // Declare socket variable
    try {
        socket = io(); // Connect to Socket.IO server

        // Function to authenticate socket connection
        function authenticateSocket() {
            fetch('/api/auth/current-user', { credentials: 'include' })
                .then(res => {
                    if (!res.ok) { throw new Error(`HTTP error ${res.status}`); }
                    return res.json();
                })
                .then(user => {
                    if (user && user.brukerId) {
                        socket.emit('authenticate', user.brukerId);
                        console.log(`Socket authenticated for user: ${user.brukerId}`);
                    } else {
                        console.log("User not logged in, socket not authenticated.");
                    }
                }).catch(error => {
                    // Handle case where user isn't logged in (401 etc.) gracefully
                    if (error.message.includes('401')) {
                        console.log("User not logged in (fetch failed), socket not authenticated.");
                    } else {
                        console.error("Error fetching current user for socket auth:", error);
                    }
                });
        }

        // Authenticate the socket connection on page load
        authenticateSocket();

        // --- Socket Event Listeners (for real-time updates) ---
        if (socket) {
            // Listen for new notifications
            socket.on('new_notification', (notificationData) => {
                console.log('Received new notification via socket:', notificationData);
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
                console.log('Socket event: notification_read received:', data);
                updateNotificationBadge(); // Update badge count
            });

            // Listen for updates when all notifications are read elsewhere
            socket.on('all_notifications_read', () => {
                console.log('Socket event: all_notifications_read received.');
                updateNotificationBadge(); // Update badge count
            });

             // Listen for new messages to update message badge (optional, but good practice)
             socket.on('messageReceived', (messageData) => {
                console.log('Received new message via socket:', messageData);
                // Avoid incrementing if user is currently on the messages page
                if (!document.getElementById('messagesPageContainer')) {
                     checkUnreadMessages(); // Re-fetch message count
                }
             });

        } // end if(socket)

    } catch (e) {
        console.error("Socket.IO connection failed. Real-time updates disabled.", e);
        // Handle cases where socket.io might not load or connect
    }


    // --- Navbar Profile/Login State Logic ---
    const loginButton = document.getElementById('loginButton');
    const profileContainer = document.getElementById('profileContainer');
    const profileUsername = document.getElementById('profileUsername');
    // const profileIcon = document.getElementById('profileIcon'); // Uncomment if using profile icon

    if (loginButton && profileContainer) { // Ensure basic elements exist
        fetch('/api/auth/current-user', { credentials: 'include' })
            .then(response => response.json())
            .then(data => {
                if (data.brukernavn) {
                    loginButton.style.display = 'none';
                    profileContainer.style.display = 'flex';
                    if (profileUsername) profileUsername.textContent = data.brukernavn;
                    // if (profileIcon) profileIcon.src = data.profileIconUrl || 'prrofilepic.svg'; // Uncomment and adjust if needed
                } else {
                    loginButton.style.display = 'block'; // Or 'block', 'inline-flex' etc.
                    profileContainer.style.display = 'none';
                }
            }).catch(error => {
                console.error("Error setting up navbar auth state:", error);
                // Default to showing login button if fetch fails
                loginButton.style.display = 'flex';
                profileContainer.style.display = 'none';
            });
    }


    // --- Profile Dropdown Logic ---
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
            if (dropdownMenu.style.display === 'block' && !profileContainer.contains(event.target)) {
                dropdownMenu.style.display = 'none';
                profileContainer.classList.remove('dropdown-open');
            }
        });
    }

    // --- Logout Button Logic ---
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                .then(response => {
                    if (response.ok) {
                        if (socket) { // Disconnect socket if connected
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


    // --- Cookie Consent Logic ---
    const consentBanner = document.getElementById('cookieConsentBanner');
    const acceptBtn = document.getElementById('cookieAcceptBtn');
    const rejectBtn = document.getElementById('cookieRejectBtn');
    const consentStatusKey = 'cookieConsentStatus_ishtri_v1'; // Unique key

    if (consentBanner && acceptBtn && rejectBtn) { // Check all elements exist
        const currentStatus = localStorage.getItem(consentStatusKey);

        if (currentStatus === 'accepted') {
            console.log('Cookie consent previously accepted.');
            loadNonEssentialScripts(); // Load scripts immediately
        } else if (currentStatus === 'rejected') {
            console.log('Cookie consent previously rejected.');
            // Non-essential scripts should NOT load.
        } else {
            // No status set or invalid status, show the banner
            consentBanner.style.display = 'block'; // Use display 'block' or 'flex' based on CSS
            // Optional: Add class for transition after display is set
            // setTimeout(() => { consentBanner.classList.add('show'); }, 50);
        }

        // Event Listeners
        acceptBtn.addEventListener('click', () => handleConsent(true));
        rejectBtn.addEventListener('click', () => handleConsent(false));

        // Handle Consent Action
        function handleConsent(accepted) {
            const newStatus = accepted ? 'accepted' : 'rejected';
            try {
                localStorage.setItem(consentStatusKey, newStatus);
                console.log(`Cookie consent set to: ${newStatus}.`);
            } catch (e) {
                console.error("Could not save consent status to localStorage:", e);
                 // Inform user? Maybe an alert.
                 alert("Could not save your cookie preference due to a browser issue.");
            }

            // Hide banner smoothly if using transition classes
            // consentBanner.classList.remove('show');
            // Or hide directly
            consentBanner.style.display = 'none';

            if (accepted) {
                loadNonEssentialScripts();
            }
        }

    } else {
        // console.warn("Cookie consent elements not found on this page."); // Optional warning
    }
    // --- End Cookie Consent ---


    // --- Language Selector Logic ---
    const languageSelect = document.getElementById('languageSelect');
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
    } 

}); 