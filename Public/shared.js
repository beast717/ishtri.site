function checkUnreadMessages() {
    if (!document.getElementById('messagesPage')) {
        fetch('/api/messages/unread-count')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                const badge = document.getElementById('unreadBadge');
                if (badge) {
                    badge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
                    badge.textContent = data.unreadCount > 0 ? data.unreadCount : '';
                }
            })
            .catch(error => console.error('Error checking messages:', error));
    }
}

document.addEventListener('DOMContentLoaded', checkUnreadMessages);
// --- START: Cookie Consent Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const consentBanner = document.getElementById('cookieConsentBanner');
    const acceptBtn = document.getElementById('cookieAcceptBtn');
    const rejectBtn = document.getElementById('cookieRejectBtn');
    const consentStatusKey = 'cookieConsentStatus_ishtri_v1'; // Unique key for your site

    // Check if banner element exists before proceeding
    if (!consentBanner) {
        // console.warn("Cookie consent banner element not found on this page.");
        return; // Exit if the banner isn't on the current page
    }

    // --- Check Existing Consent ---
    const currentStatus = localStorage.getItem(consentStatusKey);

    if (currentStatus === 'accepted') {
        console.log('Cookie consent previously accepted.');
        loadNonEssentialScripts(); // Load scripts immediately
    } else if (currentStatus === 'rejected') {
        console.log('Cookie consent previously rejected.');
        // Non-essential scripts should NOT load. Do nothing here.
    } else {
        // No status set, show the banner with transition
        consentBanner.style.display = 'block'; // Set display before adding class
        setTimeout(() => {
            consentBanner.classList.add('show');
        }, 50); // Small delay to allow display change before transition starts
    }

    // --- Event Listeners ---
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => handleConsent(true));
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => handleConsent(false));
    }

    // --- Handle Consent Action ---
    function handleConsent(accepted) {
        const newStatus = accepted ? 'accepted' : 'rejected';
        try {
            localStorage.setItem(consentStatusKey, newStatus);
            console.log(`Cookie consent set to: ${newStatus}.`);
        } catch (e) {
            console.error("Could not save consent status to localStorage:", e);
        }

        consentBanner.classList.remove('show');
        // Optional: Hide completely after transition
        // setTimeout(() => { consentBanner.style.display = 'none'; }, 600);

        if (accepted) {
            loadNonEssentialScripts();
        }
    }

    // --- Load Non-Essential Scripts (CRITICAL PART) ---
    function loadNonEssentialScripts() {
        console.log("Consent granted: Loading non-essential scripts.");

        // Load Google AdSense dynamically
        if (!document.getElementById('adsbygoogle-script')) { // Check if already loaded
            const adsenseScript = document.createElement('script');
            adsenseScript.id = 'adsbygoogle-script';
            adsenseScript.async = true;
            // USE YOUR ACTUAL CLIENT ID HERE!
            adsenseScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4798087235374147";
            adsenseScript.crossOrigin = "anonymous";
            document.head.appendChild(adsenseScript);
            console.log('AdSense script loaded dynamically.');

            // Optional: Initialize ads if needed after script load
            // adsenseScript.onload = () => {
            //     (adsbygoogle = window.adsbygoogle || []).push({});
            //     console.log('AdSense initialized.');
            // };
        } else {
            console.log('AdSense script already present.');
        }

        // --- Add other scripts here ---
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

    } // End of loadNonEssentialScripts

}); // End of DOMContentLoaded for consent

// Optional: Expose a global check function if needed elsewhere
function hasCookieConsent() {
    try {
        return localStorage.getItem('cookieConsentStatus_ishtri_v1') === 'accepted';
    } catch (e) {
        console.error("Could not read consent status from localStorage:", e);
        return false; // Default to no consent if storage fails
    }
}
// --- END: Cookie Consent Logic ---