/**
 * CSRF Token Management Utilities
 * 
 * Provides functions to handle CSRF token retrieval and inclusion in API requests
 * to prevent Cross-Site Request Forgery attacks.
 */

class CSRFManager {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
    }

    /**
     * Get CSRF token, refreshing if necessary
     * @returns {Promise<string>} CSRF token
     */
    async getToken() {
        // Check if we have a valid token
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        // Prevent multiple simultaneous refresh requests
        if (this.isRefreshing) {
            // Wait for the current refresh to complete
            while (this.isRefreshing) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return this.token;
        }

        return this.refreshToken();
    }

    /**
     * Refresh CSRF token from server
     * @returns {Promise<string>} New CSRF token
     */
    async refreshToken() {
        this.isRefreshing = true;

        try {
            const response = await fetch('/api/csrf-token', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get CSRF token: ${response.status}`);
            }

            const data = await response.json();
            
            // Accept multiple response shapes for robustness
            // Preferred: { success: true, csrfToken: '...' }
            // Also accept: { success: true, data: { csrfToken: '...' } }
            // Legacy/fallback: { token: '...' } or { data: { token: '...' } }
            const resolvedToken = (
                (data && data.csrfToken) ||
                (data && data.data && data.data.csrfToken) ||
                (data && data.token) ||
                (data && data.data && data.data.token) ||
                null
            );

            if (!data || data.success === false || !resolvedToken) {
                throw new Error('Invalid CSRF token response');
            }

            this.token = resolvedToken;
            // Set expiry to 23 hours (slightly less than server's 24 hours)
            this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);

            console.log('CSRF token refreshed successfully');
            return this.token;

        } catch (error) {
            console.error('Failed to refresh CSRF token:', error);
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Add CSRF token to request headers
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Updated fetch options with CSRF token
     */
    async addTokenToRequest(options = {}) {
        const token = await this.getToken();
        
        return {
            ...options,
            headers: {
                ...options.headers,
                'X-CSRF-Token': token
            }
        };
    }

    /**
     * Create a fetch wrapper that automatically includes CSRF tokens
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithCSRF(url, options = {}) {
        const updatedOptions = await this.addTokenToRequest(options);
        return fetch(url, updatedOptions);
    }

    /**
     * Clear stored token (useful for logout)
     */
    clearToken() {
        this.token = null;
        this.tokenExpiry = null;
    }
}

// Create global instance
const csrfManager = new CSRFManager();

// Export for use in other modules
export default csrfManager;

// Also make available globally for backward compatibility
window.csrfManager = csrfManager;
