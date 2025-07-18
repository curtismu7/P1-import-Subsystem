/**
 * TokenManager - Handles OAuth 2.0 token acquisition and caching with automatic re-authentication
 * 
 * Features:
 * - Automatic token refresh before expiry
 * - Detection of token expiration via 401 responses
 * - Automatic retry of failed requests with new tokens
 * - Secure credential storage and retrieval
 * - Rate limiting to prevent API abuse
 */
class TokenManager {
    /**
     * Create a new TokenManager instance
     * @param {Object} logger - Logger instance for logging messages
     * @param {Object} settings - Settings object containing API credentials
     */
    constructor(logger, settings) {
        if (!settings) {
            throw new Error('Settings are required for TokenManager');
        }
        
        this.logger = logger || console;
        this.settings = settings || {};
        this.tokenCache = {
            accessToken: null,
            expiresAt: 0,
            tokenType: 'Bearer',
            lastRefresh: 0
        };
        this.tokenExpiryBuffer = 5 * 60 * 1000; // 5 minutes buffer before token expiry
        this.isRefreshing = false;
        this.refreshQueue = [];
        
        // Auto-retry configuration
        this.maxRetries = 1; // Only retry once with new token
        this.retryDelay = 1000; // 1 second delay before retry
        
        // Bind methods
        this.getAccessToken = this.getAccessToken.bind(this);
        this._requestNewToken = this._requestNewToken.bind(this);
        this._isTokenValid = this._isTokenValid.bind(this);
        this.handleTokenExpiration = this.handleTokenExpiration.bind(this);
        this.retryWithNewToken = this.retryWithNewToken.bind(this);
    }

    /**
     * Get a valid access token, either from cache or by requesting a new one
     * @returns {Promise<string>} The access token
     */
    async getAccessToken() {
        // Check if we have a valid cached token
        if (this._isTokenValid()) {
            this.logger.debug('Using cached access token');
            return this.tokenCache.accessToken;
        }

        // If a refresh is already in progress, queue this request
        if (this.isRefreshing) {
            return new Promise((resolve) => {
                this.refreshQueue.push(resolve);
            });
        }

        // Otherwise, request a new token
        try {
            this.isRefreshing = true;
            const token = await this._requestNewToken();
            
            // Resolve all queued requests
            while (this.refreshQueue.length > 0) {
                const resolve = this.refreshQueue.shift();
                resolve(token);
            }
            
            return token;
        } catch (error) {
            // Clear token cache on error
            this.tokenCache = {
                accessToken: null,
                expiresAt: 0,
                tokenType: 'Bearer',
                lastRefresh: 0
            };
            
            // Reject all queued requests
            while (this.refreshQueue.length > 0) {
                const resolve = this.refreshQueue.shift();
                resolve(Promise.reject(error));
            }
            
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Handle token expiration detected from API response
     * @param {Object} response - The failed API response
     * @param {Function} retryFn - Function to retry the original request
     * @returns {Promise<Object>} The retry result
     */
    async handleTokenExpiration(response, retryFn) {
        if (!response) {
            throw new Error('Response is required for token expiration handling');
        }
        
        if (!retryFn || typeof retryFn !== 'function') {
            throw new Error('Retry function is required for token expiration handling');
        }
        
        this.logger.warn('Token expiration detected, attempting automatic re-authentication');
        
        // Clear the expired token
        this.tokenCache = {
            accessToken: null,
            expiresAt: 0,
            tokenType: 'Bearer',
            lastRefresh: 0
        };
        
        try {
            // Get a new token using stored credentials
            const newToken = await this.getAccessToken();
            
            if (!newToken) {
                throw new Error('Failed to obtain new token for retry');
            }
            
            this.logger.info('Successfully obtained new token, retrying request');
            
            // Wait a moment before retrying to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            
            // Retry the original request with the new token
            return await retryFn(newToken);
            
        } catch (error) {
            this.logger.error('Failed to re-authenticate and retry request', {
                error: error.message,
                originalStatus: response.status
            });
            throw error;
        }
    }

    /**
     * Retry a failed request with a new token
     * @param {Function} requestFn - Function that makes the API request
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async retryWithNewToken(requestFn, options = {}) {
        if (!requestFn || typeof requestFn !== 'function') {
            throw new Error('Request function is required for retry operation');
        }
        
        let retryCount = 0;
        
        while (retryCount <= this.maxRetries) {
            try {
                // Get current token
                const token = await this.getAccessToken();
                
                // Make the request
                const response = await requestFn(token);
                
                // Check if the response indicates token expiration
                if (response.status === 401) {
                    const responseText = await response.text().catch(() => '');
                    const isTokenExpired = responseText.includes('token_expired') || 
                                         responseText.includes('invalid_token') ||
                                         responseText.includes('expired');
                    
                    if (isTokenExpired && retryCount < this.maxRetries) {
                        this.logger.warn(`Token expired on attempt ${retryCount + 1}, retrying with new token`);
                        
                        // Clear expired token and get new one
                        this.tokenCache = {
                            accessToken: null,
                            expiresAt: 0,
                            tokenType: 'Bearer',
                            lastRefresh: 0
                        };
                        
                        retryCount++;
                        continue;
                    }
                }
                
                // If we get here, the request was successful or we've exhausted retries
                return response;
                
            } catch (error) {
                if (retryCount >= this.maxRetries) {
                    throw error;
                }
                
                this.logger.warn(`Request failed on attempt ${retryCount + 1}, retrying`, {
                    error: error.message
                });
                
                retryCount++;
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
        
        throw new Error('Max retries exceeded');
    }

    /**
     * Create a request wrapper that automatically handles token expiration
     * @param {Function} requestFn - Function that makes the API request
     * @returns {Function} Wrapped function that handles token expiration
     */
    createAutoRetryWrapper(requestFn) {
        if (!requestFn || typeof requestFn !== 'function') {
            throw new Error('Request function is required for auto-retry wrapper');
        }
        
        return async (...args) => {
            return await this.retryWithNewToken(async (token) => {
                // Add the token to the request arguments
                const requestArgs = [...args];
                
                // If the first argument is an options object, add the token to it
                if (requestArgs[0] && typeof requestArgs[0] === 'object') {
                    requestArgs[0].headers = {
                        ...requestArgs[0].headers,
                        'Authorization': `Bearer ${token}`
                    };
                }
                
                return await requestFn(...requestArgs);
            });
        };
    }

    /**
     * Get token information including expiry details
     * @returns {Object|null} Token info object or null if no token
     */
    getTokenInfo() {
        if (!this.tokenCache.accessToken) {
            return null;
        }
        
        const now = Date.now();
        const expiresIn = Math.max(0, this.tokenCache.expiresAt - now);
        
        return {
            accessToken: this.tokenCache.accessToken,
            expiresIn: Math.floor(expiresIn / 1000), // Convert to seconds
            tokenType: this.tokenCache.tokenType,
            expiresAt: this.tokenCache.expiresAt,
            lastRefresh: this.tokenCache.lastRefresh,
            isValid: this._isTokenValid()
        };
    }

    /**
     * Check if the current token is still valid
     * @returns {boolean} True if token is valid, false otherwise
     * @private
     */
    _isTokenValid() {
        const now = Date.now();
        return this.tokenCache.accessToken && 
               this.tokenCache.expiresAt > (now + this.tokenExpiryBuffer) &&
               // Ensure token isn't too old (max 1 hour)
               (now - this.tokenCache.lastRefresh) < (60 * 60 * 1000);
    }

    /**
     * Get the auth domain for a given region
     * @param {string} region - The region to get auth domain for
     * @returns {string} The auth domain URL
     * @private
     */
    _getAuthDomain(region) {
        if (!region) {
            return 'auth.pingone.com';
        }
        
        const authDomainMap = {
            'NorthAmerica': 'auth.pingone.com',
            'Europe': 'auth.eu.pingone.com',
            'Canada': 'auth.ca.pingone.com',
            'Asia': 'auth.apsoutheast.pingone.com',
            'Australia': 'auth.aus.pingone.com',
            'US': 'auth.pingone.com',
            'EU': 'auth.eu.pingone.com',
            'AP': 'auth.apsoutheast.pingone.com'
        };
        return authDomainMap[region] || 'auth.pingone.com';
    }

    /**
     * Request a new access token from PingOne using stored credentials
     * @returns {Promise<string>} The new access token
     * @private
     */
    async _requestNewToken() {
        const { apiClientId, apiSecret, environmentId, region = 'NorthAmerica' } = this.settings;
        const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        // Validate required settings
        if (!apiClientId || !apiSecret || !environmentId) {
            const error = new Error('Missing required API credentials in settings');
            this.logger.error('Token request failed: Missing credentials', {
                requestId,
                hasClientId: !!apiClientId,
                hasSecret: !!apiSecret,
                hasEnvId: !!environmentId
            });
            throw error;
        }

        // Prepare request
        const authDomain = this._getAuthDomain(region);
        const tokenUrl = `https://${authDomain}/${environmentId}/as/token`;
        const credentials = btoa(`${apiClientId}:${apiSecret}`);
        
        try {
            this.logger.debug('Requesting new access token from PingOne...', {
                requestId,
                authDomain,
                environmentId,
                region
            });
            
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${credentials}`
                },
                body: 'grant_type=client_credentials',
                credentials: 'omit'
            });

            const responseTime = Date.now() - startTime;
            let responseData;
            
            try {
                responseData = await response.json();
            } catch (e) {
                const text = await response.text().catch(() => 'Failed to read response text');
                throw new Error(`Invalid JSON response: ${e.message}. Response: ${text}`);
            }
            
            if (!response.ok) {
                const errorMsg = responseData.error_description || 
                               responseData.error || 
                               `HTTP ${response.status} ${response.statusText}`;
                
                this.logger.error('Token request failed', {
                    requestId,
                    status: response.status,
                    error: responseData.error,
                    errorDescription: responseData.error_description,
                    responseTime: `${responseTime}ms`,
                    url: tokenUrl
                });
                
                throw new Error(errorMsg);
            }
            
            if (!responseData.access_token) {
                throw new Error('No access token in response');
            }
            
            // Update token cache
            const expiresInMs = (responseData.expires_in || 3600) * 1000;
            this.tokenCache = {
                accessToken: responseData.access_token,
                expiresAt: Date.now() + expiresInMs,
                tokenType: responseData.token_type || 'Bearer',
                lastRefresh: Date.now()
            };
            
            this.logger.info('Successfully obtained new access token', {
                requestId,
                tokenType: this.tokenCache.tokenType,
                expiresIn: Math.floor(expiresInMs / 1000) + 's',
                responseTime: `${responseTime}ms`
            });
            
            return this.tokenCache.accessToken;
            
        } catch (error) {
            this.logger.error('Error getting access token', {
                requestId,
                error: error.toString(),
                message: error.message,
                url: tokenUrl,
                responseTime: `${Date.now() - startTime}ms`
            });
            
            // Clear token cache on error
            this.tokenCache = {
                accessToken: null,
                expiresAt: 0,
                tokenType: 'Bearer',
                lastRefresh: 0
            };
            
            throw error;
        }
    }
    
    /**
     * Update settings and clear token cache if credentials changed
     * @param {Object} newSettings - New settings object
     */
    updateSettings(newSettings) {
        if (!newSettings) {
            throw new Error('New settings are required for update');
        }
        
        const credentialsChanged = 
            newSettings.apiClientId !== this.settings.apiClientId ||
            newSettings.apiSecret !== this.settings.apiSecret ||
            newSettings.environmentId !== this.settings.environmentId ||
            newSettings.region !== this.settings.region;
        
        this.settings = { ...this.settings, ...newSettings };
        
        if (credentialsChanged) {
            this.logger.debug('API credentials changed, clearing token cache');
            this.tokenCache = {
                accessToken: null,
                expiresAt: 0,
                tokenType: 'Bearer',
                lastRefresh: 0
            };
        }
    }
}

export default TokenManager;
