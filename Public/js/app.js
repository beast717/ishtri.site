// --- Import Utilities ---
import Toast from './utils/toast.js';
import LazyLoader from './utils/lazyLoad.js';
import BackToTop from './utils/backToTop.js';
import SkeletonLoader from './utils/skeleton.js';

// --- Import Core Components ---
import { initNavbar } from './components/navbar.js';
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

// Create a single global namespace for our app's instances
window.ishtri = {
    toast: new Toast(),
    lazyLoader: new LazyLoader(),
    backToTop: new BackToTop(),
    skeletonLoader: new SkeletonLoader(),
    socket: null,
};

/**
 * Initializes the Socket.IO connection and authenticates the user.
 */
function initSocket() {
    if (typeof io === 'undefined') {
        console.error("Socket.IO client library not found. Real-time features will be disabled.");
        return;
    }
    
    window.ishtri.socket = io();

    // Authenticate the socket connection if a user is logged in
    fetch('/api/auth/current-user', { credentials: 'include' })
        .then(res => res.json())
        .then(user => {
            if (user && user.brukerId) {
                window.ishtri.socket.emit('authenticate', user.brukerId);
            }
        });
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
        // Add other pages here as you create them
        // 'settings': initSettingsPage,
    };

    if (pageInitializers[page]) {
        pageInitializers[page]();
    }
}

// Main execution block that runs on every page
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    initNavbar();
    initCookieConsent();
    pageRouter();

    // The lazy loader needs to be re-initialized on any page that might add new images dynamically
    window.ishtri.lazyLoader.observe();
});