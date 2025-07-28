/**
 * Settings Service - Handles settings-related API calls
 */

class SettingsService {
    /**
     * Get user account information
     * @returns {Promise<object>} User information
     */
    async getUserInfo() {
        try {
            const response = await fetch('/api/auth/user-info', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                email: data.email,
                username: data.brukernavn || data.username
            };
        } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
        }
    }

    /**
     * Get email notification preference
     * @returns {Promise<object>} Email preference setting
     */
    async getEmailPreference() {
        try {
            const response = await fetch('/api/settings/email-preference', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching email preference:', error);
            throw error;
        }
    }

    /**
     * Update email notification preference
     * @param {boolean} enabled - Whether email notifications should be enabled
     * @returns {Promise<object>} Update result
     */
    async updateEmailPreference(enabled) {
        try {
            const response = await fetch('/api/settings/email-preference', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ enabled })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating email preference:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const settingsService = new SettingsService();
