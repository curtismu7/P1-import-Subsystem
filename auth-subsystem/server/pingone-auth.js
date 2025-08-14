/**
 * PingOne Authentication Service
 * 
 * Provides authentication with PingOne APIs by managing access tokens.
 * Handles token caching, automatic refresh, and credential management.
 * 
 * This is the core server-side authentication service that:
 * - Acquires and caches access tokens from PingOne
 * - Manages token expiration and automatic refresh
 * - Handles credential storage and retrieval
 * - Provides region-specific API endpoints
 * - Implements rate limiting and retry logic
 * 
 * The service is designed to be used as a singleton instance to maintain
 * consistent token state across the application.
 */

import fetch from 'node-fetch';
import CredentialEncryptor from './credential-encryptor.js';

class PingOneAuth {
    constructor(logger) {
        this.logger = logger || console;
        this.credentialEncryptor = new CredentialEncryptor(logger);
        
        // Token state management
        this.token = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
        this.refreshQueue = [];
        
        // Rate limiting configuration
        this.lastTokenRequest = 0;
        this.minRequestInterval = 50; // Minimum 50ms between token requests (20/sec)
        
        // Auto-retry configuration
        this.maxRetries = 2; // Retry twice with new token
        this.retryDelay = 1000; // 1 second delay before retry
        
        // Region tracking
        this.currentRegion = null;
    }

    /**
     * Get API credentials from environment variables or settings file
     * @returns {Promise<Object|null>} Credentials object or null if not available
     */
    async getCredentials() {
        // First try environment variables (preferred source)
        let clientId = process.env.PINGONE_CLIENT_ID;
        let clientSecret = process.env.PINGONE_CLIENT_SECRET;
        let environmentId = process.env.PINGONE_ENVIRONMENT_ID;
        let region = process.env.PINGONE_REGION || 'NorthAmerica';

        // Check if environment variables are actually set
        const hasEnvVars = clientId && clientSecret && environmentId;
        
        if (!hasEnvVars) {
            this.logger.info('Environment variables missing or incomplete, reading from settings file');
            
            // Try to read encrypted credentials first
            let settings = await this.credentialEncryptor.readAndDecryptSettings();
            
            // If no encrypted credentials, try to read from plain text settings.json
            if (!settings) {
                try {
                    const fs = await import('fs/promises');
                    const path = await import('path');
                    const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
                    const settingsContent = await fs.readFile(settingsPath, 'utf8');
                    settings = JSON.parse(settingsContent);
                    this.logger.info('Read credentials from plain text settings.json');
                } catch (error) {
                    this.logger.warn('Could not read plain text settings.json:', error.message);
                }
            }
            
            if (settings) {
                // Map the settings to the expected format (handle both field name variations)
                const mappedSettings = {
                    apiClientId: settings.apiClientId || settings.pingone_client_id,
                    apiSecret: settings.apiSecret || settings.pingone_client_secret,
                    environmentId: settings.environmentId || settings.pingone_environment_id,
                    region: settings.region || settings.pingone_region || 'NorthAmerica'
                };
                
                clientId = clientId || mappedSettings.apiClientId;
                environmentId = environmentId || mappedSettings.environmentId;
                region = region || mappedSettings.region || 'NorthAmerica';

                // Get decrypted API secret
                if (!clientSecret && mappedSettings.apiSecret) {
                    clientSecret = mappedSettings.apiSecret;
                }
            }
        }

        // Final check: all required credentials must be present
        if (!clientId || !clientSecret || !environmentId) {
            this.logger.error('Missing PingOne credentials: clientId, clientSecret, or environmentId');
            return null;
        }

        // Validate credential format
        if (clientId === 'YOUR_CLIENT_ID_HERE' || clientSecret === 'YOUR_CLIENT_SECRET_HERE' || environmentId === 'YOUR_ENVIRONMENT_ID_HERE') {
            this.logger.error('PingOne credentials are not configured properly');
            return null;
        }

        // Store current region for API base URL generation
        this.currentRegion = region;

        return { clientId, clientSecret, environmentId, region };
    }

    /**
     * Check if we can make a token request (rate limiting)
     * @private
     */
    canMakeTokenRequest() {
        const now = Date.now();
        if (now - this.lastTokenRequest < this.minRequestInterval) {
            return false;
        }
        this.lastTokenRequest = now;
        return true;
    }

    /**
     * Get an access token from PingOne with automatic re-authentication
     * @param {Object} customSettings - Optional custom settings to use instead of stored credentials
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
            'NA': 'https://api.pingone.com/v1', // Add NA mapping
            'Europe': 'https://api.eu.pingone.com/v1',
            'EU': 'https://api.eu.pingone.com/v1',
            'Canada': 'https://api.ca.pingone.com/v1',
            'Asia': 'https://api.apsoutheast.pingone.com/v1',
            'AsiaPacific': 'https://api.apsoutheast.pingone.com/v1', // Add AsiaPacific mapping
            'AP': 'https://api.apsoutheast.pingone.com/v1',
            'APAC': 'https://api.apsoutheast.pingone.com/v1', // Add APAC mapping
            'Australia': 'https://api.aus.pingone.com/v1',
            'US': 'https://api.pingone.com/v1'
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
     * Validate credentials by attempting to get a token
     * @param {Object} credentials - Credentials to validate
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

            const customSettings = {
                apiClientId: credentials.apiClientId,
                apiSecret: credentials.apiSecret,
                environmentId: credentials.environmentId,
                region: credentials.region || 'NorthAmerica'
            };

            // Clear existing token to force a new request
            this.clearToken();
            
            // Try to get a token with the provided credentials
            await this.getAccessToken(customSettings);
            
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
     * Save credentials to settings file
     * @param {Object} credentials - Credentials to save
     * @returns {Promise<boolean>} True if successful
     */
    async saveCredentials(credentials) {
        try {
            if (!credentials || !credentials.apiClientId || !credentials.apiSecret || !credentials.environmentId) {
                this.logger.error('Cannot save incomplete credentials');
                return false;
            }

            // Read existing settings to preserve other values
            const existingSettings = await this.credentialEncryptor.readAndDecryptSettings() || {};
            
            // Update with new credentials
            const updatedSettings = {
                ...existingSettings,
                apiClientId: credentials.apiClientId,
                apiSecret: credentials.apiSecret,
                environmentId: credentials.environmentId,
                region: credentials.region || existingSettings.region || 'NorthAmerica'
            };
            
            // Save updated settings
            const success = await this.credentialEncryptor.encryptAndSaveSettings(updatedSettings);
            
            if (success) {
                this.logger.info('Credentials saved successfully');
                
                // Clear token to force using new credentials on next request
                this.clearToken();
            }
            
            return success;
        } catch (error) {
            this.logger.error('Failed to save credentials:', error.message);
            return false;
        }
    }
}

export default PingOneAuth;