// File: server/token-manager.js
// Description: PingOne API token management for server-side authentication with automatic re-authentication
// 
// This module handles authentication with PingOne APIs by managing access tokens.
// It provides token caching, automatic refresh, rate limiting, and credential
// management from both environment variables and settings files.
// 
// Key Features:
// - Token caching with automatic refresh before expiry
// - Automatic detection and handling of token expiration (401 responses)
// - Automatic retry of failed requests with new tokens using stored credentials
// - Rate limiting to prevent API abuse
// - Support for encrypted API secrets
// - Fallback credential sources (env vars, settings file)
// - Queue management for concurrent token requests

import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Token Manager Class
 * 
 * Manages PingOne API authentication tokens with caching, automatic refresh,
 * and rate limiting. Handles credential retrieval from multiple sources
 * and provides a unified interface for token access with automatic re-authentication.
 * 
 * @param {Object} logger - Logger instance for debugging and error reporting
 */
class TokenManager {
    constructor(logger) {
        // Initialize logger with fallback to console methods
        this.logger = logger || {
            debug: console.debug.bind(console),
            info: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        };
        
        // Token state management
        this.token = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
        this.refreshQueue = [];
        
        // Rate limiting configuration
        // Prevents API abuse by limiting token requests to 20 per second
        this.lastTokenRequest = 0;
        this.minRequestInterval = 50; // Minimum 50ms between token requests (20/sec)
        
        // Auto-retry configuration
        this.maxRetries = 1; // Only retry once with new token
        this.retryDelay = 1000; // 1 second delay before retry
        
        // Region tracking
        this.currentRegion = null;
    }

    /**
     * Read application settings from the settings.json file
     * 
     * Loads configuration data including API credentials from the data/settings.json
     * file. This provides a fallback source for credentials when environment
     * variables are not available.
     * 
     * @private
     * @returns {Promise<Object|null>} Settings object or null if file cannot be read
     */
    async readSettingsFromFile() {
        try {
            // Use process.cwd() for a consistent, project-root-relative path
            const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
            const data = await fs.readFile(settingsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            this.logger.warn('Failed to read settings from file:', error.message);
            return null;
        }
    }

    /**
     * Get API credentials from multiple sources
     * 
     * Retrieves PingOne API credentials from environment variables first,
     * then falls back to the settings file. Supports both encrypted and
     * plain text API secrets, with automatic decryption when needed.
     * 
     * @private
     * @returns {Promise<Object|null>} Credentials object or null if not available
     */
    async getCredentials() {
        // Helper function to get a setting by multiple possible keys
        const getSetting = (obj, ...keys) => {
            for (const key of keys) {
                if (obj && typeof obj === 'object' && obj[key]) return obj[key];
            }
            return undefined;
        };

        let credentialSource = null;
        let clientId = null, clientSecret = null, environmentId = null, region = null;
        let tokenStatus = 'not-acquired';

        // 1. Try settings.json first
        const settings = await this.readSettingsFromFile();
        if (settings) {
            clientId = getSetting(settings, 'apiClientId', 'api-client-id');
            environmentId = getSetting(settings, 'environmentId', 'environment-id');
            region = getSetting(settings, 'region') || 'NorthAmerica';
            let apiSecret = getSetting(settings, 'api-secret', 'apiSecret');
            if (apiSecret) {
                if (apiSecret.startsWith('enc:')) {
                    try {
                        clientSecret = await this.decryptApiSecret(apiSecret);
                        if (clientSecret) {
                            tokenStatus = 'decrypted';
                        } else {
                            clientSecret = apiSecret.substring(4);
                            tokenStatus = 'decryption-failed-used-plain';
                        }
                    } catch (error) {
                        clientSecret = apiSecret.substring(4);
                        tokenStatus = 'decryption-failed-used-plain';
                    }
                } else {
                    clientSecret = apiSecret;
                    tokenStatus = 'plain';
                }
            }
            credentialSource = 'settings.json';
        }

        // 2. If any required field missing, try .env
        if (!clientId || !clientSecret || !environmentId) {
            clientId = clientId || process.env.PINGONE_CLIENT_ID;
            clientSecret = clientSecret || process.env.PINGONE_CLIENT_SECRET;
            environmentId = environmentId || process.env.PINGONE_ENVIRONMENT_ID;
            region = region || process.env.PINGONE_REGION || 'NorthAmerica';
            credentialSource = 'env';
            tokenStatus = 'env';
        }

        // 3. Local storage fallback is not possible server-side

        // Final check: all required credentials must be present
        if (!clientId || !clientSecret || !environmentId) {
            this.logCredentialEvent('error', {
                credentialSource,
                clientId,
                environmentId,
                region,
                tokenStatus,
                message: 'Missing PingOne credentials: clientId, clientSecret, or environmentId',
                success: false
            });
            return null;
        }

        // Validate credential format
        if (clientId === 'YOUR_CLIENT_ID_HERE' || clientSecret === 'YOUR_CLIENT_SECRET_HERE' || environmentId === 'YOUR_ENVIRONMENT_ID_HERE') {
            this.logCredentialEvent('error', {
                credentialSource,
                clientId,
                environmentId,
                region,
                tokenStatus,
                message: 'PingOne credentials are not configured. Please update data/settings.json with your actual credentials.',
                success: false
            });
            return null;
        }

        // Store current region for API base URL generation
        this.currentRegion = region;

        this.logCredentialEvent('info', {
            credentialSource,
            clientId: clientId ? '***' + clientId.slice(-4) : 'missing',
            environmentId: environmentId ? '***' + environmentId.slice(-4) : 'missing',
            region,
            tokenStatus,
            message: 'Credentials loaded',
            success: true
        });

        return { clientId, clientSecret, environmentId, region, credentialSource };
    }

    /**
     * Unified credential event logger
     */
    logCredentialEvent(level, { credentialSource, clientId, environmentId, region, tokenStatus, message, success }) {
        const timestamp = new Date().toISOString();
        const logMsg = `[🗝️ CREDENTIAL-MANAGER] [${timestamp}] [${level.toUpperCase()}] Source: ${credentialSource || 'unknown'} | ClientID: ${clientId || 'missing'} | EnvID: ${environmentId || 'missing'} | Region: ${region || 'missing'} | TokenStatus: ${tokenStatus || 'unknown'} | Success: ${success ? '✅' : '❌'} | ${message}`;
        if (level === 'error') {
            this.logger.error(logMsg);
        } else if (level === 'warn') {
            this.logger.warn(logMsg);
        } else {
            this.logger.info(logMsg);
        }
        // TODO: Forward to UI logging page and server logs if needed
    }

    /**
     * Decrypt API secret using a simple approach
     * @private
     */
    async decryptApiSecret(encryptedValue) {
        try {
            // Remove the 'enc:' prefix
            const encryptedData = encryptedValue.substring(4);
            
            // For now, we'll use a simple base64 decode as a fallback
            // This assumes the frontend is using a simple encryption method
            const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
            
            // If the decoded value looks like a valid API secret (contains valid characters)
            if (decoded && decoded.length > 0 && !decoded.includes('')) {
                return decoded;
            }
            
            // If base64 decode didn't work, the value might be encrypted with a different method
            this.logger.warn('API secret appears to be encrypted with a method not supported by server');
            return null;
        } catch (error) {
            this.logger.error('Failed to decrypt API secret:', error.message);
            return null;
        }
    }

    /**
     * Check if we can make a token request (rate limiting)
     * @private
     */
    canMakeTokenRequest() {
        const now = Date.now();
        if (now - this.lastTokenRequest < this.minRequestInterval) {
            // Instead of throwing, just return false and let the caller handle it
            return false;
        }
        this.lastTokenRequest = now;
        return true;
    }

    /**
     * Get an access token from PingOne with automatic re-authentication
     * @param {Object} customSettings - Optional custom settings to use instead of environment variables
     * @returns {Promise<string>} Access token
     */
    async getAccessToken(customSettings = null) {
        // Return cached token if it's still valid (with 2 minute buffer) and no custom settings
        if (!customSettings) {
            const bufferTime = 2 * 60 * 1000; // 2 minutes in milliseconds
            const now = Date.now();
            
            // If we have a valid token, return it
            if (this.token && this.tokenExpiry && this.tokenExpiry > (now + bufferTime)) {
                this.logger.debug('Using cached access token');
                return this.token;
            }
        }

        // If a refresh is already in progress, queue this request
        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.refreshQueue.push({ resolve, reject });
            });
        }

        // Start the refresh process
        this.isRefreshing = true;
        
        try {
            // Get credentials (either from custom settings or environment/file)
            let credentials;
            if (customSettings) {
                credentials = {
                    clientId: customSettings.apiClientId,
                    clientSecret: customSettings.apiSecret,
                    environmentId: customSettings.environmentId,
                    region: customSettings.region || 'NorthAmerica'
                };
            } else {
                credentials = await this.getCredentials();
            }

            if (!credentials) {
                throw new Error('No credentials available for token request');
            }

            // Check rate limiting
            if (!this.canMakeTokenRequest()) {
                throw new Error('Rate limit exceeded for token requests');
            }

            // Request new token
            const token = await this._requestNewToken(credentials);
            
            // Resolve all queued requests
            this.processQueue(null, token);
            
            return token;
            
        } catch (error) {
            this.logger.error('Failed to get access token', {
                error: error.message,
                customSettings: !!customSettings
            });
            
            // Clear token on error
            this.token = null;
            this.tokenExpiry = null;
            
            // Reject all queued requests
            this.processQueue(error);
            
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
        this.logger.warn('Token expiration detected, attempting automatic re-authentication');
        
        // Clear the expired token
        this.token = null;
        this.tokenExpiry = null;
        
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
                        this.token = null;
                        this.tokenExpiry = null;
                        
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
        if (!this.token) {
            return null;
        }
        
        const now = Date.now();
        const expiresIn = Math.max(0, this.tokenExpiry - now);
        
        return {
            accessToken: this.token,
            expiresIn: Math.floor(expiresIn / 1000), // Convert to seconds
            tokenType: 'Bearer',
            expiresAt: this.tokenExpiry,
            lastRefresh: this.lastTokenRequest,
            isValid: this.tokenExpiry > now
        };
    }

    /**
     * Get the current environment ID from credentials
     * @returns {Promise<string|null>} Environment ID or null if not available
     */
    async getEnvironmentId() {
        try {
            const credentials = await this.getCredentials();
            return credentials ? credentials.environmentId : null;
        } catch (error) {
            this.logger.error('Failed to get environment ID:', error.message);
            return null;
        }
    }

    /**
     * Clear the current token
     */
    clearToken() {
        this.token = null;
        this.tokenExpiry = null;
        this.logger.debug('Token cleared');
    }

    /**
     * Process the refresh queue
     * @param {Error|null} error - Error to reject with, or null for success
     * @param {string|null} token - Token to resolve with, or null for error
     */
    processQueue(error, token = null) {
        while (this.refreshQueue.length > 0) {
            const { resolve, reject } = this.refreshQueue.shift();
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        }
    }

    /**
     * Get the auth domain for a given region
     * @private
     */
    getRegionDomain(region) {
        const domainMap = {
            'NorthAmerica': 'auth.pingone.com',
            'Europe': 'auth.eu.pingone.com',
            'Canada': 'auth.ca.pingone.com',
            'Asia': 'auth.apsoutheast.pingone.com',
            'Australia': 'auth.aus.pingone.com',
            'US': 'auth.pingone.com',
            'EU': 'auth.eu.pingone.com',
            'AP': 'auth.apsoutheast.pingone.com'
        };
        return domainMap[region] || 'auth.pingone.com';
    }

    /**
     * Get the API base URL for a given region
     * @param {string} region - The region name
     * @returns {string} The API base URL
     */
    getApiBaseUrl(region = null) {
        const regionToUse = region || this.currentRegion || 'NorthAmerica';
        const domainMap = {
            'NorthAmerica': 'https://api.pingone.com/v1',
            'Europe': 'https://api.eu.pingone.com/v1',
            'Canada': 'https://api.ca.pingone.com/v1',
            'Asia': 'https://api.apsoutheast.pingone.com/v1',
            'Australia': 'https://api.aus.pingone.com/v1',
            'US': 'https://api.pingone.com/v1',
            'EU': 'https://api.eu.pingone.com/v1',
            'AP': 'https://api.apsoutheast.pingone.com/v1'
        };
        return domainMap[regionToUse] || 'https://api.pingone.com/v1';
    }

    /**
     * Request a new access token from PingOne using stored credentials
     * @param {Object} credentials - API credentials
     * @returns {Promise<string>} The new access token
     * @private
     */
    async _requestNewToken(credentials) {
        const { clientId, clientSecret, environmentId, region } = credentials;
        const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        // Validate required credentials
        if (!clientId || !clientSecret || !environmentId) {
            const error = new Error('Missing required API credentials');
            this.logger.error('Token request failed: Missing credentials', {
                requestId,
                hasClientId: !!clientId,
                hasSecret: !!clientSecret,
                hasEnvId: !!environmentId
            });
            throw error;
        }

        // Prepare request
        const authDomain = this.getRegionDomain(region);
        const tokenUrl = `https://${authDomain}/${environmentId}/as/token`;
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        
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
                    'Authorization': `Basic ${authHeader}`
                },
                body: 'grant_type=client_credentials',
                timeout: 30000 // 30 second timeout
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
            this.token = responseData.access_token;
            this.tokenExpiry = Date.now() + expiresInMs;
            
            this.logger.info('Successfully obtained new access token', {
                requestId,
                tokenType: responseData.token_type || 'Bearer',
                expiresIn: Math.floor(expiresInMs / 1000) + 's',
                responseTime: `${responseTime}ms`
            });
            
            return this.token;
            
        } catch (error) {
            this.logger.error('Error getting access token', {
                requestId,
                error: error.toString(),
                message: error.message,
                url: tokenUrl,
                responseTime: `${Date.now() - startTime}ms`
            });
            
            // Clear token on error
            this.token = null;
            this.tokenExpiry = null;
            
            throw error;
        }
    }
}

export default TokenManager;