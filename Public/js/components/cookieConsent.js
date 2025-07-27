// Public/js/components/cookieConsent.js

/**
 * Dynamically loads non-essential scripts like Google AdSense.
 * This should be called after consent has been established.
 */
function loadNonEssentialScripts() {
    // --- Load Google AdSense ---
    // This script also triggers Google's own Consent Management Platform (CMP).
    if (!document.getElementById('adsbygoogle-script')) {
        const adsenseScript = document.createElement('script');
        adsenseScript.id = 'adsbygoogle-script';
        adsenseScript.async = true;
        adsenseScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4798087235374147"; // Use your actual client ID
        adsenseScript.crossOrigin = "anonymous";
        document.head.appendChild(adsenseScript);
        console.log("Google AdSense script loading initiated.");
    }

    // --- Other non-essential scripts can be added here ---
    // Example for Google Analytics:
    /*
    const gaId = 'YOUR_GA_ID';
    if (gaId !== 'YOUR_GA_ID' && typeof gtag === 'undefined') {
        // ... GA loading logic ...
    }
    */
}

/**
 * Main initialization function for cookie consent.
 * Currently, it just loads the scripts that manage their own consent (like AdSense).
 * The logic for a custom banner is preserved here but commented out.
 */
export function initCookieConsent() {
    // Since you are relying on Google's CMP, we can directly call this.
    // The AdSense script itself will handle showing the consent banner.
    loadNonEssentialScripts();

    /*
    // --- THIS IS WHERE YOUR CUSTOM BANNER LOGIC WOULD GO ---
    // If you ever decide to build your own banner, you would uncomment and use this.
    
    const consentBanner = document.getElementById('cookieConsentBanner');
    const acceptBtn = document.getElementById('cookieAcceptBtn');
    const rejectBtn = document.getElementById('cookieRejectBtn');
    const consentStatusKey = 'cookieConsentStatus_ishtri_v1';

    if (consentBanner && acceptBtn && rejectBtn) {
        const currentStatus = localStorage.getItem(consentStatusKey);

        if (currentStatus === 'accepted') {
            loadNonEssentialScripts();
        } else if (currentStatus === 'rejected') {
            // Do nothing, respect user's choice
        } else {
            // No choice made yet, show the banner
            consentBanner.style.display = 'block';
        }

        acceptBtn.addEventListener('click', () => {
            localStorage.setItem(consentStatusKey, 'accepted');
            consentBanner.style.display = 'none';
            loadNonEssentialScripts();
        });

        rejectBtn.addEventListener('click', () => {
            localStorage.setItem(consentStatusKey, 'rejected');
            consentBanner.style.display = 'none';
        });
    }
    */
}