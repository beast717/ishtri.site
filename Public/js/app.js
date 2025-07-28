// --- Import Utilities ---
import Toast from './utils/toast.js';
import LazyLoader from './utils/lazyLoad.js';
import BackToTop from './utils/backToTop.js';
import SkeletonLoader from './utils/skeleton.js';

// --- Import Services ---
import { i18nService } from './services/I18nService.js';

// --- Import Core Components ---
import { initNavbar, updateNavbar } from './components/navbar.js';
import { initCookieConsent } from './components/cookieConsent.js';

// --- Import Page-Specific Initializers ---
import initHomePage from './pages/home.js';
import initProductListPage from './pages/productList.js';
import initProductDetailsPage from './pages/productDetails.js';
import initNewAdPage from './pages/newAd.js';
import initMessagesPage from './pages/messages.js';
import initMyAdsPage from './pages/myAds.js';
import initFavoritesPage from './pages/favorites.js';
import initSavedSearchesPage from './pages/savedSearches.js';
import initAuthPage from './pages/auth.js';
import initReisePage from './pages/reise.js';
import initNotificationsPage from './pages/notifications.js';
import initSettingsPage from './pages/settings.js';

// Create a single global namespace for our app's instances
window.ishtri = {
    toast: new Toast(),
    lazyLoader: new LazyLoader(),
    backToTop: new BackToTop('#backToTop'),
    skeletonLoader: new SkeletonLoader(),
    socket: null,
    user: null,
    // Add navbar update function to global scope
    updateNavbar: updateNavbar,
    // Add i18n service to global scope for backward compatibility
    i18n: i18nService,
};

/**
 * Load non-essential scripts for cookie consent
 */
function loadNonEssentialScripts() {
    // Load Google AdSense dynamically
    if (!document.getElementById('adsbygoogle-script')) {
        const adsenseScript = document.createElement('script');
        adsenseScript.id = 'adsbygoogle-script';
        adsenseScript.async = true;
        adsenseScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4798087235374147";
        adsenseScript.crossOrigin = "anonymous";
        document.head.appendChild(adsenseScript);
    }
}

/**
 * Initializes the Socket.IO connection and sets up event listeners
 */
function initSocket(userId = null) {
    if (typeof io === 'undefined') {
        console.error("Socket.IO client library not found. Real-time features will be disabled.");
        return;
    }
    
    try {
        if (!window.ishtri.socket || !window.ishtri.socket.connected) {
            window.ishtri.socket = io();
            console.log("Socket.IO attempting connection.");

            window.ishtri.socket.on('connect', () => {
                console.log("Socket.IO connected.");
                if (userId) {
                    window.ishtri.socket.emit('authenticate', userId);
                    console.log(`Socket authenticated for user: ${userId}`);
                } else {
                    console.log("User not logged in, socket connected but not authenticated.");
                }
            });

            window.ishtri.socket.on('disconnect', (reason) => {
                console.log(`Socket.IO disconnected: ${reason}`);
            });

            window.ishtri.socket.on('connect_error', (error) => {
                console.error("Socket.IO connection error:", error);
            });

        } else if (userId && !window.ishtri.socket.authenticated) {
            console.log("Socket exists, attempting re-authentication.");
            window.ishtri.socket.emit('authenticate', userId);
        }
    } catch (e) {
        console.error("Socket.IO setup failed. Real-time updates disabled.", e);
    }
}

/**
 * Initialize user authentication and related features
 */
async function initAuth() {
    try {
        console.log('Fetching current user...');
        const response = await fetch('/api/auth/current-user', { credentials: 'include' });
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log("User not logged in (initial check).");
            } else {
                console.error(`Initial user check failed with status: ${response.status}`);
            }
            return null;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Received non-JSON response from current-user endpoint');
            return null;
        }
        
        const user = await response.json();
        console.log('User data received:', user);
        
        const isLoggedIn = user && user.brukerId;
        
        if (isLoggedIn) {
            console.log("User is logged in. User object:", user);
            window.ishtri.user = user;
            initSocket(user.brukerId);
        } else {
            console.log("User is not logged in or user data is incomplete");
            initSocket();
        }
        
        return user;
    } catch (error) {
        console.error("Error during initial user check:", error);
        initSocket();
        return null;
    }
}

/**
 * A simple "router" to run page-specific code based on a data-attribute
 * on the <body> tag.
 */
function pageRouter() {
    const page = document.body.dataset.page;
    if (!page) return;

    const pageInitializers = {
        'home': initHomePage,
        'productList': initProductListPage,
        'productDetails': initProductDetailsPage,
        'newAd': initNewAdPage,
        'messages': initMessagesPage,
        'myAds': initMyAdsPage,
        'favorites': initFavoritesPage,
        'savedSearches': initSavedSearchesPage,
        'auth': initAuthPage,
        'reise': initReisePage,
        'notifications': initNotificationsPage,
        'settings': initSettingsPage,
    };

    if (pageInitializers[page]) {
        pageInitializers[page]();
    }
}

// Main execution block that runs on every page
document.addEventListener('DOMContentLoaded', async () => {
    // Load non-essential scripts
    loadNonEssentialScripts();
    
    // Initialize i18n service first
    await i18nService.init();
    
    // Initialize authentication and user-specific features
    const user = await initAuth();
    
    // Initialize core components
    initNavbar(user);
    initCookieConsent();
    
    // Initialize page-specific functionality
    pageRouter();

    // Initialize lazy loading
    window.ishtri.lazyLoader.observe();
});