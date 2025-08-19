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
import regionMapper from '../src/utils/region-mapper.js';
import CredentialEncryptor from '../auth-subsystem/server/credential-encryptor.js';

// Extract utility functions from the region mapper
const { toApiCode, toDisplayName } = regionMapper;

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

        // Credential encryption/decryption helper
        this.encryptor = new CredentialEncryptor(this.logger);
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
        // Handles different naming conventions (camelCase, kebab-case)
        const getSetting = (obj, ...keys) => {
            for (const key of keys) {
                if (obj && typeof obj === 'object' && obj[key]) return obj[key];
            }
            return undefined;
        };
        
        // Track if we're using legacy region format
        let usingLegacyRegion = false;

        // First try environment variables (preferred source)
        let clientId = process.env.PINGONE_CLIENT_ID;
        let clientSecret = process.env.PINGONE_CLIENT_SECRET;
        let environmentId = process.env.PINGONE_ENVIRONMENT_ID;
        let region = process.env.PINGONE_REGION || 'NA';

        // Check if environment variables are actually set (not just empty strings)
        const hasEnvVars = clientId && clientSecret && environmentId;
        
        if (!hasEnvVars) {
            this.logger.info('Environment variables missing or incomplete, reading from settings file');
            const settings = await this.readSettingsFromFile();
            
            if (settings) {
                this.logger.debug('Settings loaded from file:', Object.keys(settings));
                
                // Debug: Check what we're actually getting
                this.logger.debug('Raw settings:', {
                    'api-client-id': settings['api-client-id'],
                    'environment-id': settings['environment-id'],
                    'api-secret': settings['api-secret'],
                    'apiClientId': settings.apiClientId,
                });
                
                // Get region from environment or settings
                const rawRegion = process.env.PINGONE_REGION || 
                                  getSetting(settings, 'pingone_region', 'region') || 
                                  'NA';
                
                // Convert to standardized region code (avoid shadowing outer 'region')
                const mappedRegion = toApiCode(rawRegion);
                
                // Check if we converted from legacy format
                if (rawRegion !== mappedRegion) {
                    usingLegacyRegion = true;
                    this.logger.debug(` Converting legacy region format in credentials: ${rawRegion} → ${mappedRegion}`);
                }
                
                // Accept multiple naming conventions, including legacy pingone_* keys
                clientId = clientId || getSetting(settings, 'apiClientId', 'api-client-id', 'pingone_client_id');
                environmentId = environmentId || getSetting(settings, 'environmentId', 'environment-id', 'pingone_environment_id');
                // Use mapped region as primary, fall back to settings if somehow empty
                region = mappedRegion || getSetting(settings, 'region', 'pingone_region') || 'NA';

                // Prefer plain api-secret if both exist; also support legacy pingone_client_secret
                let apiSecret = getSetting(settings, 'api-secret', 'apiSecret', 'pingone_client_secret');
                
                this.logger.debug('API secret selected:', apiSecret ? (apiSecret.startsWith('enc:') ? '[ENCRYPTED]' : '[PLAIN]') : 'not found');
                if (!clientSecret && apiSecret) {
                    if (typeof apiSecret === 'string' && apiSecret.startsWith('enc:')) {
                        // Encrypted with AES via CredentialEncryptor
                        try {
                            clientSecret = await this.encryptor.decrypt(apiSecret);
                            if (clientSecret) {
                                this.logger.info('Successfully decrypted API secret from settings file');
                            } else {
                                this.logger.error('Decryption returned empty value for API secret');
                            }
                        } catch (error) {
                            this.logger.error('Failed to decrypt API secret with CredentialEncryptor', { error: error.message });
                            // Do NOT fall back to using ciphertext; require proper key
                            throw new Error('Failed to decrypt API secret. Ensure AUTH_SUBSYSTEM_ENCRYPTION_KEY is set and correct.');
                        }
                    } else {
                        // Unencrypted value - use it directly
                        clientSecret = apiSecret;
                        this.logger.info('Using plain text API secret from settings file');
                    }
                }
                
                // Additional fallback: if we still don't have a clientSecret, check if the apiSecret 
                // is actually a valid secret that doesn't start with 'enc:' but looks encrypted
                if (!clientSecret && apiSecret && apiSecret.length > 20) {
                    this.logger.info('Using API secret as-is (may be plain text or custom encoding)');
                    clientSecret = apiSecret;
                }
                
                this.logger.debug('Final credentials check:', {
                    clientId: clientId ? '***' + clientId.slice(-4) : 'missing',
                    environmentId: environmentId ? '***' + environmentId.slice(-4) : 'missing',
                    clientSecret: clientSecret ? '***' + clientSecret.slice(-4) : 'missing',
                    region: region
                });
            }
        }


        // Final check: all required credentials must be present
        if (!clientId || !clientSecret || !environmentId) {
            this.logger.error('Missing PingOne credentials: clientId, clientSecret, or environmentId');
            this.logger.error('Please configure your PingOne API credentials in the Settings page or data/settings.json');
            return null;
        }

        // Validate credential format
        if (clientId === 'YOUR_CLIENT_ID_HERE' || clientSecret === 'YOUR_CLIENT_SECRET_HERE' || environmentId === 'YOUR_ENVIRONMENT_ID_HERE') {
            this.logger.error('PingOne credentials are not configured. Please update data/settings.json with your actual credentials.');
            return null;
        }

        // Store current region for API base URL generation
        this.currentRegion = region;

        return { clientId, clientSecret, environmentId, region };
    }

    /**
     * Decrypt API secret using a simple approach
     * @private
     */
    async decryptApiSecret(encryptedValue) {
        // Backward-compat shim: use proper AES decryptor
        try {
            return await this.encryptor.decrypt(encryptedValue);
        } catch (error) {
            this.logger.error('decryptApiSecret failed using CredentialEncryptor', { error: error.message });
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
     * @param {string} region - Region in any format (code, name, legacy name)
     * @returns {string} - Authentication domain for the region
     * @private
     */
    getRegionDomain(region) {
        // Convert any region format to standardized API code
        const standardRegion = toApiCode(region);
        
        const domainMap = {
            // Standard region codes (preferred)
            'NA': 'auth.pingone.com',
            'EU': 'auth.eu.pingone.com',
            'CA': 'auth.ca.pingone.com',
            'AP': 'auth.apsoutheast.pingone.com'
        };
        
        // Log if we're converting from a legacy format
        if (region && standardRegion !== region) {
            this.logger.debug(` Converting legacy region format: ${region} → ${standardRegion}`);
        }
        
        return domainMap[standardRegion] || 'auth.pingone.com';
    }

    /**
     * Get the API base URL for a given region
     * @param {string} region - Region in any format (code, name, legacy name)
     * @returns {string} The API base URL
     */
    getApiBaseUrl(region = null) {
        // Use provided region, or fall back to current region, or default to NA
        const regionInput = region || this.currentRegion || 'NA';
        
        // Convert any region format to standardized API code
        const standardRegion = toApiCode(regionInput);
        
        const domainMap = {
            'NA': 'https://api.pingone.com/v1',
            'EU': 'https://api.eu.pingone.com/v1',
            'CA': 'https://api.ca.pingone.com/v1',
            'AP': 'https://api.apsoutheast.pingone.com/v1'
        };
        
        // Log if we're converting from a legacy format
        if (regionInput && standardRegion !== regionInput) {
            this.logger.debug(` Converting legacy region format for API URL: ${regionInput} → ${standardRegion}`);
        }
        
        return domainMap[standardRegion] || 'https://api.pingone.com/v1';
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

        // Prepare request - always use standardized region code
        const standardRegion = toApiCode(region);
        const authDomain = this.getRegionDomain(standardRegion);
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