/**
 * Authentication Subsystem - Client API
 * 
 * Provides a unified API for PingOne authentication services on the client side.
 * Exports the PingOneAuth class and credential storage utilities.
 * 
 * This module serves as the main entry point for the client-side authentication subsystem.
 * It creates and exports a singleton instance of the PingOneAuth class for easy integration
 * with the application, as well as exporting the individual classes for custom instantiation.
 * 
 * Key features:
 * - Token acquisition and management
 * - Secure credential storage in localStorage
 * - Credential validation against PingOne API
 * - Automatic token refresh
 * - Fetch wrapper with automatic token handling
 * 
 * Usage:
 * ```javascript
 * // Using the singleton instance
 * import pingOneAuth from 'auth-subsystem/client';
 * 
 * // Get a token
 * const token = await pingOneAuth.getAccessToken();
 * 
 * // Make an authenticated API request
 * const response = await pingOneAuth.fetchWithToken('/api/endpoint');
 * ```
 */

import PingOneAuthClient from './pingone-auth-client.js';
import CredentialStorage from './credential-storage.js';

/**
 * PingOne Authentication Client
 * 
 * Main class for client-side authentication with PingOne APIs.
 * Handles token acquisition, credential storage, and validation.
 * 
 * This class serves as the primary interface for client-side authentication,
 * providing a simple API for token management and credential handling.
 * It delegates the actual implementation to specialized classes:
 * - PingOneAuthClient: Handles token acquisition and API communication
 * - CredentialStorage: Manages secure credential storage
 * 
 * Usage example:
 * ```javascript
 * // Get a token
 * const token = await pingOneAuth.getAccessToken();
 * 
 * // Make an authenticated API request
 * const response = await pingOneAuth.fetchWithToken('/api/endpoint');
 * 
 * // Save credentials
 * await pingOneAuth.saveCredentials({
 *   apiClientId: 'your-client-id',
 *   apiSecret: 'your-client-secret',
 *   environmentId: 'your-environment-id',
 *   region: 'NorthAmerica'
 * });
 * ```
 */
class PingOneAuth {
    /**
     * Create a new PingOneAuth instance
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.settings - Initial settings with API credentials
     */
    constructor(options = {}) {
        const { logger, settings } = options;
        
        this.logger = logger || console;
        this.authClient = new PingOneAuthClient(logger, settings);
        this.credentialStorage = new CredentialStorage(logger);
        
        // Bind methods
        this.getAccessToken = this.getAccessToken.bind(this);
        this.getTokenInfo = this.getTokenInfo.bind(this);
        this.clearToken = this.clearToken.bind(this);
        this.saveCredentials = this.saveCredentials.bind(this);
        this.validateCredentials = this.validateCredentials.bind(this);
        this.getCredentials = this.getCredentials.bind(this);
        this.hasCredentials = this.hasCredentials.bind(this);
        this.clearCredentials = this.clearCredentials.bind(this);
        
        // Initialize
        this.initialize(settings);
    }

    /**
     * Initialize the auth client with settings
     * @param {Object} settings - Settings object with API credentials
     */
    initialize(settings) {
        this.authClient.initialize(settings);
    }

    /**
     * Get a valid access token
     * @returns {Promise<string>} The access token
     */
    async getAccessToken() {
        return await this.authClient.getAccessToken();
    }

    /**
     * Get token information including expiry details
     * @returns {Object|null} Token info object or null if no token
     */
    getTokenInfo() {
        return this.authClient.getTokenInfo();
    }

    /**
     * Clear the current token
     */
    clearToken() {
        this.authClient.clearToken();
    }

    /**
     * Save credentials to storage and optionally to server
     * @param {Object} credentials - The credentials to save
     * @param {boolean} saveToServer - Whether to also save to server
     * @returns {Promise<boolean>} True if successful
     */
    async saveCredentials(credentials, saveToServer = true) {
        return await this.authClient.saveCredentials(credentials, saveToServer);
    }

    /**
     * Validate credentials by attempting to get a token
     * @param {Object} credentials - The credentials to validate
     * @returns {Promise<Object>} Validation result with success flag and message
     */
    async validateCredentials(credentials) {
        return await this.authClient.validateCredentials(credentials);
    }

    /**
     * Get credentials from storage
     * @returns {Promise<Object|null>} The credentials or null if not found
     */
    async getCredentials() {
        return await this.authClient.getCredentials();
    }

    /**
     * Check if credentials exist in storage
     * @returns {boolean} True if credentials exist
     */
    hasCredentials() {
        return this.authClient.hasCredentials();
    }

    /**
     * Clear credentials from storage
     * @returns {boolean} True if successful
     */
    clearCredentials() {
        return this.authClient.clearCredentials();
    }

    /**
     * Create an API request with automatic token handling
     * @param {string} url - The API URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} The fetch response
     */
    async fetchWithToken(url, options = {}) {
        try {
            const token = await this.getAccessToken();
            
            const requestOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            };
            
            return await fetch(url, requestOptions);
        } catch (error) {
            this.logger.error('Failed to fetch with token:', error.message);
            throw error;
        }
    }
}

// Create and export singleton instance
const pingOneAuth = new PingOneAuth();

// Export classes for custom instantiation
export { PingOneAuth, PingOneAuthClient, CredentialStorage };

// Default export for simple usage
export default pingOneAuth;