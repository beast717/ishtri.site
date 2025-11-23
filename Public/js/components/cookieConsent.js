const CONSENT_STORAGE_KEY = 'cookieConsentStatus_ishtri_v1';

function getStoredConsent() {
    try {
        return localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to read consent preference:', error);
        return null;
    }
}

function persistConsent(status) {
    try {
        localStorage.setItem(CONSENT_STORAGE_KEY, status);
    } catch (error) {
        console.warn('Unable to persist consent preference:', error);
    }
}

function hideBanner(banner) {
    if (!banner) return;
    banner.classList.remove('show');
}

function showBanner(banner) {
    if (!banner) return;
    banner.classList.add('show');
}

export function initCookieConsent({ onAccept, onReject } = {}) {
    const banner = document.getElementById('cookieConsentBanner');
    const acceptBtn = document.getElementById('cookieAcceptBtn');
    const rejectBtn = document.getElementById('cookieRejectBtn');
    const existingStatus = getStoredConsent();

    // If no banner exists we default to essential-only behavior
    if (!banner || !acceptBtn || !rejectBtn) {
        if (existingStatus !== 'rejected') {
            onAccept?.();
            return 'accepted';
        }
        onReject?.();
        return existingStatus || 'rejected';
    }

    if (existingStatus === 'accepted') {
        onAccept?.();
        return 'accepted';
    }

    if (existingStatus === 'rejected') {
        onReject?.();
        return 'rejected';
    }

    // No decision yet, reveal banner
    requestAnimationFrame(() => showBanner(banner));

    acceptBtn.addEventListener('click', () => {
        persistConsent('accepted');
        hideBanner(banner);
        onAccept?.();
    });

    rejectBtn.addEventListener('click', () => {
        persistConsent('rejected');
        hideBanner(banner);
        onReject?.();
    });

    return 'pending';
}