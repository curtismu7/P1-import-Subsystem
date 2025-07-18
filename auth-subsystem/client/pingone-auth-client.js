/**
 * PingOne Auth Client
 * 
 * Client-side authentication service for PingOne APIs.
 * Handles token acquisition, caching, and automatic refresh.
 * 
 * This class provides the core client-side authentication functionality:
 * - Token acquisition from server API or directly from PingOne
 * - Token caching and automatic refresh before expiration
 * - Credential storage and validation
 * - Queue management for concurrent token requests
 * 
 * The client implements a fallback strategy:
 * 1. First try to get token from server API endpoint
 * 2. If server API fails, try to get token directly using stored credentials
 * 
 * This ensures authentication works even if the server-side auth is unavailable.
 */

import CredentialStorage from './credential-storage.js';

class PingOneAuthClient {
    constructor(logger, settings = null) {
        this.logger = logger || console;
        this.credentialStorage = new CredentialStorage(logger);
        this.settings = settings || {};
        
        // Token state management
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
        this.maxRetries = 2; // Retry twice with new token
        this.retryDelay = 1000; // 1 second delay before retry
    }

    /**
     * Initialize the auth client with settings
     * @param {Object} settings - Settings object with API credentials
     */
    initialize(settings) {
        if (settings) {
            this.settings = settings;
        }
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
        try {
            // First try to get token from server API
            const serverToken = await this._getTokenFromServer();
            if (serverToken) {
                return serverToken;
            }
            
            // If server token fails, try to get token directly using stored credentials
            return await this._getTokenDirectly();
        } catch (error) {
            this.logger.error('Failed to get access token:', error.message);
            throw error;
        }
    }

    /**
     * Get token from server API
     * @returns {Promise<string|null>} The access token or null if failed
     * @private
     */
    async _getTokenFromServer() {
        try {
            const response = await fetch('/api/v1/auth/token');
            
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.warn('Server token request failed:', errorText);
                return null;
            }
            
            const data = await response.json();
            
            if (!data.success || !data.token) {
                this.logger.warn('Server returned unsuccessful token response');
                return null;
            }
            
            // Update token cache if token info is available
            if (data.tokenInfo) {
                this.tokenCache = {
                    accessToken: data.token,
                    expiresAt: data.tokenInfo.expiresAt || (Date.now() + 3600 * 1000),
                    tokenType: data.tokenInfo.tokenType || 'Bearer',
                    lastRefresh: Date.now()
                };
            } else {
                // Basic token cache update
                this.tokenCache = {
                    accessToken: data.token,
                    expiresAt: Date.now() + 3600 * 1000, // Default 1 hour
                    tokenType: 'Bearer',
                    lastRefresh: Date.now()
                };
            }
            
            this.logger.info('Successfully obtained token from server');
            return data.token;
        } catch (error) {
            this.logger.warn('Failed to get token from server:', error.message);
            return null;
        }
    }

    /**
     * Get token directly from PingOne using stored credentials
     * @returns {Promise<string>} The access token
     * @private
     */
    async _getTokenDirectly() {
        // Get credentials from settings or storage
        let credentials = this.settings;
        
        // If settings don't have credentials, try to get from storage
        if (!credentials.apiClientId || !credentials.apiSecret || !credentials.environmentId) {
            const storedCredentials = await this.credentialStorage.getCredentials();
            
            if (!storedCredentials) {
                throw new Error('No credentials available for token request');
            }
            
            credentials = storedCredentials;
        }
        
        const { apiClientId, apiSecret, environmentId, region = 'NorthAmerica' } = credentials;
        
        if (!apiClientId || !apiSecret || !environmentId) {
            throw new Error('Missing required API credentials');
        }

        // Prepare request
        const authDomain = this._getAuthDomain(region);
        const tokenUrl = `https://${authDomain}/${environmentId}/as/token`;
        const authHeader = btoa(`${apiClientId}:${apiSecret}`);
        
        this.logger.debug('Requesting new access token directly from PingOne...');
        
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authHeader}`
            },
            body: 'grant_type=client_credentials',
            credentials: 'omit'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error_description || errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.access_token) {
            throw new Error('No access token in response');
        }
        
        // Update token cache
        const expiresInMs = (data.expires_in || 3600) * 1000;
        this.tokenCache = {
            accessToken: data.access_token,
            expiresAt: Date.now() + expiresInMs,
            tokenType: data.token_type || 'Bearer',
            lastRefresh: Date.now()
        };
        
        this.logger.info('Successfully obtained token directly from PingOne');
        return data.access_token;
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
     * Clear the current token
     */
    clearToken() {
        this.tokenCache = {
            accessToken: null,
            expiresAt: 0,
            tokenType: 'Bearer',
            lastRefresh: 0
        };
        this.logger.debug('Token cleared');
    }

    /**
     * Save credentials to storage and optionally to server
     * @param {Object} credentials - The credentials to save
     * @param {boolean} saveToServer - Whether to also save to server
     * @returns {Promise<boolean>} True if successful
     */
    async saveCredentials(credentials, saveToServer = true) {
        try {
            if (!credentials || !credentials.apiClientId || !credentials.apiSecret || !credentials.environmentId) {
                this.logger.error('Cannot save incomplete credentials');
                return false;
            }

            // Save to local storage
            const localSaveResult = await this.credentialStorage.saveCredentials(credentials);
            
            if (!localSaveResult) {
                this.logger.error('Failed to save credentials to local storage');
                return false;
            }
            
            // Update settings
            this.settings = {
                ...this.settings,
                apiClientId: credentials.apiClientId,
                apiSecret: credentials.apiSecret,
                environmentId: credentials.environmentId,
                region: credentials.region || 'NorthAmerica'
            };
            
            // Clear token to force using new credentials on next request
            this.clearToken();
            
            // Save to server if requested
            if (saveToServer) {
                try {
                    const response = await fetch('/api/v1/auth/save-credentials', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(credentials)
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        this.logger.warn('Server credential save failed:', errorText);
                    } else {
                        this.logger.info('Credentials saved to server successfully');
                    }
                } catch (error) {
                    this.logger.warn('Failed to save credentials to server:', error.message);
                    // Continue even if server save fails
                }
            }
            
            return true;
        } catch (error) {
            this.logger.error('Failed to save credentials:', error.message);
            return false;
        }
    }

    /**
     * Validate credentials by attempting to get a token
     * @param {Object} credentials - The credentials to validate
     * @returns {Promise<Object>} Validation result with success flag and message
     */
    async validateCredentials(credentials) {
        try {
            if (!credentials || !credentials.apiClientId || !credentials.apiSecret || !credentials.environmentId) {
                return { 
                    success: false, 
                    message: 'Missing required credentials' 
                };
            }

            // Try server-side validation first
            try {
                const response = await fetch('/api/v1/auth/validate-credentials', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(credentials)
                });
                
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                this.logger.warn('Server-side validation failed, trying direct validation:', error.message);
            }
            
            // If server validation fails, try direct validation
            const tempSettings = {
                apiClientId: credentials.apiClientId,
                apiSecret: credentials.apiSecret,
                environmentId: credentials.environmentId,
                region: credentials.region || 'NorthAmerica'
            };
            
            // Store original settings
            const originalSettings = { ...this.settings };
            
            // Temporarily update settings
            this.settings = tempSettings;
            
            // Clear token to force new request
            this.clearToken();
            
            // Try to get a token with the provided credentials
            await this._getTokenDirectly();
            
            // Restore original settings
            this.settings = originalSettings;
            
            return { 
                success: true, 
                message: 'Credentials validated successfully' 
            };
        } catch (error) {
            return { 
                success: false, 
                message: `Validation failed: ${error.message}` 
            };
        }
    }

    /**
     * Get credentials from storage
     * @returns {Promise<Object|null>} The credentials or null if not found
     */
    async getCredentials() {
        return await this.credentialStorage.getCredentials();
    }

    /**
     * Check if credentials exist in storage
     * @returns {boolean} True if credentials exist
     */
    hasCredentials() {
        return this.credentialStorage.hasCredentials();
    }

    /**
     * Clear credentials from storage
     * @returns {boolean} True if successful
     */
    clearCredentials() {
        return this.credentialStorage.clearCredentials();
    }
}

export default PingOneAuthClient;