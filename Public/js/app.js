// --- Import Utilities ---
import Toast from './utils/toast.js';
import LazyLoader from './utils/lazyLoad.js';
import BackToTop from './utils/backToTop.js';
import SkeletonLoader from './utils/skeleton.js';

// --- Import Services ---
import { i18nService } from './services/I18nService.js';
import { initTracking,
         trackEvent, trackConversion,
         trackProductView, trackSearch, trackAdClick,
         trackAdUpload, trackAdEdit, trackAdDelete,
         trackContactSeller, trackFavoriteToggle } from './services/TrackingService.js';

// --- Import Core Components ---
import { initNavbar, updateNavbar } from './components/navbar.js';
import { initCookieConsent } from './components/cookieConsent.js';

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
    // Tracking utilities (delegated to TrackingService)
    trackEvent,
    trackConversion,
    trackProductView,
    trackSearch,
    trackAdClick,
    trackAdUpload,
    trackAdEdit,
    trackAdDelete,
    trackContactSeller,
    trackFavoriteToggle
};

/**
 * Load non-essential scripts for cookie consent
 */
function loadNonEssentialScripts() {
    // Initialize Google Ads/Analytics tracking via TrackingService
    initTracking({
        adsId: 'AW-17043604198',
        conversionLabel: 'a7mbCPT9tr8aEOaFg78_',
        // ga4Id: 'G-XXXXXXXXXX', // optional GA4 measurement ID
        debug: false
    });

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
 * Dynamically load the Socket.IO client script (only when needed)
 */
async function loadSocketClient() {
    if (typeof window.io !== 'undefined') return;
    if (document.getElementById('socketio-script')) {
        // Wait until it becomes available
        await new Promise((resolve) => {
            const check = () => (typeof window.io !== 'undefined') ? resolve() : setTimeout(check, 50);
            check();
        });
        return;
    }
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.id = 'socketio-script';
        s.async = true;
        s.src = '/socket.io/socket.io.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

/**
 * Initializes the Socket.IO connection and sets up event listeners
 */
async function initSocket(userId = null) {
    try {
        // Ensure client library is loaded on-demand
        await loadSocketClient();
        if (typeof io === 'undefined') {
            console.error('Socket.IO client library failed to load. Real-time features will be disabled.');
            return;
        }

        if (!window.ishtri.socket || !window.ishtri.socket.connected) {
            window.ishtri.socket = io();
            console.log('Socket.IO attempting connection.');

            window.ishtri.socket.on('connect', () => {
                console.log('Socket.IO connected.');
                if (userId) {
                    window.ishtri.socket.emit('authenticate', userId);
                    console.log(`Socket authenticated for user: ${userId}`);
                } else {
                    console.log('User not logged in, socket connected but not authenticated.');
                }
            });

            window.ishtri.socket.on('disconnect', (reason) => {
                console.log(`Socket.IO disconnected: ${reason}`);
            });

            window.ishtri.socket.on('connect_error', (error) => {
                console.error('Socket.IO connection error:', error);
            });
        } else if (userId && !window.ishtri.socket.authenticated) {
            console.log('Socket exists, attempting re-authentication.');
            window.ishtri.socket.emit('authenticate', userId);
        }
    } catch (e) {
        console.error('Socket.IO setup failed. Real-time updates disabled.', e);
    }
}

/**
 * Initialize user authentication and related features
 */
async function initAuth() {
    try {
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
        
        const isLoggedIn = user && user.brukerId;
        
        if (isLoggedIn) {
            window.ishtri.user = user;
            initSocket(user.brukerId);
        } else {
            initSocket();
        }
        
        return user;
    } catch (error) {
        console.error('Error during initial user check:', error);
        initSocket();
        return null;
    }
}

/**
 * A simple "router" to run page-specific code based on a data-attribute
 * on the <body> tag. Uses dynamic imports to only load needed code.
 */
async function pageRouter() {
    const page = document.body.dataset.page;
    if (!page) return;

    try {
        switch (page) {
            case 'home':
                (await import('./pages/home.js')).default();
                break;
            case 'productList':
                (await import('./pages/productList.js')).default();
                break;
            case 'productDetails':
                (await import('./pages/productDetails.js')).default();
                break;
            case 'newAd':
                (await import('./pages/newAd.js')).default();
                break;
            case 'messages':
                (await import('./pages/messages.js')).default();
                break;
            case 'myAds':
                (await import('./pages/myAds.js')).default();
                break;
            case 'favorites':
                (await import('./pages/favorites.js')).default();
                break;
            case 'savedSearches':
                (await import('./pages/savedSearches.js')).default();
                break;
            case 'auth':
                (await import('./pages/auth.js')).default();
                break;
            case 'reise':
                (await import('./pages/reise.js')).default();
                break;
            case 'notifications':
                (await import('./pages/notifications.js')).default();
                break;
            case 'settings':
                (await import('./pages/settings.js')).default();
                break;
            default:
                break;
        }
    } catch (e) {
        console.error('Failed to load page module for', page, e);
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
    await pageRouter();

    // Initialize lazy loading
    window.ishtri.lazyLoader.observe();
});