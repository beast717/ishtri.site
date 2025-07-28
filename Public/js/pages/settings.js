/**
 * Settings Page - Manage user preferences and notifications
 * Clean, modular implementation following the app structure
 */

// Utils
import { showLoading, hideLoading } from '../utils/domUtils.js';

// Services
import { settingsService } from '../services/SettingsService.js';

export default function initSettingsPage() {
    // Only initialize if we're on the settings page
    if (document.body.dataset.page !== 'settings') {
        return;
    }

    // DOM Elements
    const emailToggle = document.getElementById('emailNotificationToggle');
    const userEmailEl = document.getElementById('userEmail');
    const userNameEl = document.getElementById('userName');
    const loadingOverlay = document.getElementById('settingsLoading');

    /**
     * Show loading state
     */
    function showSettingsLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    function hideSettingsLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Load user account information
     */
    async function loadAccountInfo() {
        try {
            const userInfo = await settingsService.getUserInfo();
            
            if (userEmailEl) {
                userEmailEl.textContent = userInfo.email || 'Not available';
            }
            
            if (userNameEl) {
                userNameEl.textContent = userInfo.username || 'Not available';
            }
        } catch (error) {
            console.error('Error loading account info:', error);
            if (userEmailEl) userEmailEl.textContent = 'Error loading email';
            if (userNameEl) userNameEl.textContent = 'Error loading username';
        }
    }

    /**
     * Load email notification preference
     */
    async function loadEmailPreference() {
        try {
            const preference = await settingsService.getEmailPreference();
            
            if (emailToggle) {
                emailToggle.checked = preference.enabled;
            }
        } catch (error) {
            console.error('Error loading email preference:', error);
            
            if (window.ishtri?.toast) {
                window.ishtri.toast.show('Error loading email preferences', 'error');
            }
        }
    }

    /**
     * Update email notification preference
     */
    async function updateEmailPreference(enabled) {
        try {
            showSettingsLoading();
            
            await settingsService.updateEmailPreference(enabled);
            
            if (window.ishtri?.toast) {
                window.ishtri.toast.show(
                    `Email notifications ${enabled ? 'enabled' : 'disabled'}`, 
                    'success'
                );
            }
        } catch (error) {
            console.error('Error updating email preference:', error);
            
            // Revert the toggle state
            if (emailToggle) {
                emailToggle.checked = !enabled;
            }
            
            if (window.ishtri?.toast) {
                window.ishtri.toast.show('Error updating email preferences', 'error');
            }
        } finally {
            hideSettingsLoading();
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Email notification toggle
        if (emailToggle) {
            emailToggle.addEventListener('change', (e) => {
                updateEmailPreference(e.target.checked);
            });
        }
    }

    /**
     * Initialize the settings page
     */
    async function init() {
        try {
            // Setup event listeners
            setupEventListeners();
            
            // Load initial data
            await Promise.all([
                loadAccountInfo(),
                loadEmailPreference()
            ]);
            
        } catch (error) {
            console.error('Error initializing settings page:', error);
            
            if (window.ishtri?.toast) {
                window.ishtri.toast.show('Error loading settings', 'error');
            }
        }
    }

    // Start initialization
    init();
}
