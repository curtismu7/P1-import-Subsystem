/**
 * Token Refresh Handler
 * 
 * Provides automatic token refresh functionality for API calls
 * with retry logic and error handling.
 */

class TokenRefreshHandler {
    constructor() {
        this.tokenRefreshInProgress = false;
        this.tokenRefreshPromise = null;
        this.lastRefreshTime = 0;
        this.minRefreshInterval = 5000; // 5 seconds
    }

    /**
     * Get a fresh token with automatic refresh if needed
     * @param {Object} tokenManager - Token manager instance
     * @returns {Promise<string>} Fresh token
     */
    async getFreshToken(tokenManager) {
        if (!tokenManager) {
            throw new Error('Token manager is required');
        }

        // Check if we already have a valid token
        try {
            const currentToken = await tokenManager.getAccessToken();
            if (currentToken) {
                return currentToken;
            }
        } catch (error) {
            console.warn('Error getting current token:', error);
            // Continue with refresh
        }

        // If refresh is already in progress, wait for it
        if (this.tokenRefreshInProgress) {
            console.log('Token refresh already in progress, waiting...');
            return this.tokenRefreshPromise;
        }

        // Check if we've refreshed recently
        const now = Date.now();
        if (now - this.lastRefreshTime < this.minRefreshInterval) {
            console.log('Token was refreshed recently, using cached token');
            return tokenManager.getAccessToken();
        }

        // Start refresh process
        this.tokenRefreshInProgress = true;
        this.tokenRefreshPromise = this._refreshToken(tokenManager);

        try {
            const token = await this.tokenRefreshPromise;
            return token;
        } finally {
            this.tokenRefreshInProgress = false;
            this.lastRefreshTime = Date.now();
        }
    }

    /**
     * Refresh token with retry logic
     * @private
     * @param {Object} tokenManager - Token manager instance
     * @returns {Promise<string>} Fresh token
     */
    async _refreshToken(tokenManager) {
        console.log('Refreshing token...');
        
        // Clear current token to force refresh
        if (typeof tokenManager.clearToken === 'function') {
            tokenManager.clearToken();
        }
        
        // Try to get a new token
        try {
            const token = await tokenManager.getAccessToken();
            if (!token) {
                throw new Error('Failed to get new token');
            }
            
            console.log('Token refreshed successfully');
            return token;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            throw error;
        }
    }

    /**
     * Make an API call with automatic token refresh
     * @param {Function} apiCall - Function that makes the API call
     * @param {Object} tokenManager - Token manager instance
     * @param {number} maxRetries - Maximum number of retries
     * @returns {Promise<Object>} API response
     */
    async callWithTokenRefresh(apiCall, tokenManager, maxRetries = 1) {
        let retries = 0;
        
        while (retries <= maxRetries) {
            try {
                // Get fresh token
                const token = await this.getFreshToken(tokenManager);
                
                // Make API call
                return await apiCall(token);
            } catch (error) {
                // Check if error is due to token expiration
                const isTokenError = error.status === 401 || 
                                    (error.message && error.message.includes('token'));
                
                if (isTokenError && retries < maxRetries) {
                    console.log(`Token error, retrying (${retries + 1}/${maxRetries})...`);
                    retries++;
                    
                    // Force token refresh
                    if (typeof tokenManager.clearToken === 'function') {
                        tokenManager.clearToken();
                    }
                    
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    // Rethrow error if not token related or max retries reached
                    throw error;
                }
            }
        }
    }
}

// Create and export a singleton instance
const tokenRefreshHandler = new TokenRefreshHandler();
export default tokenRefreshHandler;