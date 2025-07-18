/**
 * API Factory - Creates API clients with automatic token re-authentication
 * 
 * This module provides a factory for creating API clients that automatically
 * handle token expiration by detecting 401 responses and retrying with new tokens
 * using stored credentials.
 */

import TokenManager from './token-manager.js';
import { LocalAPIClient, localAPIClient } from './local-api-client.js';
import { PingOneClient } from './pingone-client.js';

/**
 * Create an API client with automatic token re-authentication
 * @param {Object} settings - API settings including credentials
 * @param {Object} logger - Logger instance
 * @returns {Object} API client with auto-retry capabilities
 */
export function createAutoRetryAPIClient(settings, logger) {
    if (!settings) {
        throw new Error('Settings are required for API client creation');
    }
    
    const tokenManager = new TokenManager(logger, settings);
    
    /**
     * Make an API request with automatic token re-authentication
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async function makeRequest(url, options = {}) {
        if (!url) {
            throw new Error('URL is required for API request');
        }
        
        return await tokenManager.retryWithNewToken(async (token) => {
            const requestOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };
            
            const response = await fetch(url, requestOptions);
            
            // Check for token expiration
            if (response.status === 401) {
                const responseText = await response.text().catch(() => '');
                const isTokenExpired = responseText.includes('token_expired') || 
                                     responseText.includes('invalid_token') ||
                                     responseText.includes('expired');
                
                if (isTokenExpired) {
                    throw new Error('TOKEN_EXPIRED');
                }
            }
            
            return response;
        });
    }
    
    /**
     * GET request with auto-retry
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async function get(url, options = {}) {
        if (!url) {
            throw new Error('URL is required for GET request');
        }
        
        return await makeRequest(url, { ...options, method: 'GET' });
    }
    
    /**
     * POST request with auto-retry
     * @param {string} url - The API endpoint URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async function post(url, data = null, options = {}) {
        if (!url) {
            throw new Error('URL is required for POST request');
        }
        
        const requestOptions = { ...options, method: 'POST' };
        
        if (data) {
            requestOptions.body = JSON.stringify(data);
        }
        
        return await makeRequest(url, requestOptions);
    }
    
    /**
     * PUT request with auto-retry
     * @param {string} url - The API endpoint URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async function put(url, data = null, options = {}) {
        if (!url) {
            throw new Error('URL is required for PUT request');
        }
        
        const requestOptions = { ...options, method: 'PUT' };
        
        if (data) {
            requestOptions.body = JSON.stringify(data);
        }
        
        return await makeRequest(url, requestOptions);
    }
    
    /**
     * DELETE request with auto-retry
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async function del(url, options = {}) {
        if (!url) {
            throw new Error('URL is required for DELETE request');
        }
        
        return await makeRequest(url, { ...options, method: 'DELETE' });
    }
    
    /**
     * PATCH request with auto-retry
     * @param {string} url - The API endpoint URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async function patch(url, data = null, options = {}) {
        if (!url) {
            throw new Error('URL is required for PATCH request');
        }
        
        const requestOptions = { ...options, method: 'PATCH' };
        
        if (data) {
            requestOptions.body = JSON.stringify(data);
        }
        
        return await makeRequest(url, requestOptions);
    }
    
    /**
     * Get token information
     * @returns {Object|null} Token info
     */
    function getTokenInfo() {
        return tokenManager.getTokenInfo();
    }
    
    /**
     * Update settings and clear token cache if credentials changed
     * @param {Object} newSettings - New settings
     */
    function updateSettings(newSettings) {
        if (!newSettings) {
            throw new Error('New settings are required');
        }
        
        tokenManager.updateSettings(newSettings);
    }
    
    return {
        get,
        post,
        put,
        del,
        patch,
        getTokenInfo,
        updateSettings,
        tokenManager
    };
}

/**
 * Create a PingOne API client with automatic token re-authentication
 * @param {Object} settings - PingOne API settings
 * @param {Object} logger - Logger instance
 * @returns {Object} PingOne API client
 */
export function createPingOneAPIClient(settings, logger) {
    if (!settings) {
        throw new Error('Settings are required for PingOne API client creation');
    }
    
    if (!settings.environmentId) {
        throw new Error('Environment ID is required for PingOne API client');
    }
    
    const baseURL = getPingOneBaseURL(settings.region);
    const apiClient = createAutoRetryAPIClient(settings, logger);
    
    /**
     * Get PingOne base URL for the region
     * @param {string} region - The region
     * @returns {string} Base URL
     */
    function getPingOneBaseURL(region) {
        const baseURLs = {
            'NorthAmerica': 'https://api.pingone.com',
            'Europe': 'https://api.eu.pingone.com',
            'Canada': 'https://api.ca.pingone.com',
            'Asia': 'https://api.apsoutheast.pingone.com',
            'Australia': 'https://api.aus.pingone.com',
            'US': 'https://api.pingone.com',
            'EU': 'https://api.eu.pingone.com',
            'AP': 'https://api.apsoutheast.pingone.com'
        };
        return baseURLs[region] || 'https://api.pingone.com';
    }
    
    /**
     * Make a PingOne API request
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async function pingOneRequest(endpoint, options = {}) {
        if (!endpoint) {
            throw new Error('Endpoint is required for PingOne request');
        }
        
        const url = `${baseURL}/v1${endpoint}`;
        return await apiClient.makeRequest(url, options);
    }
    
    /**
     * Get users from PingOne
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Users response
     */
    async function getUsers(options = {}) {
        const queryParams = new URLSearchParams(options).toString();
        const endpoint = `/environments/${settings.environmentId}/users${queryParams ? `?${queryParams}` : ''}`;
        return await pingOneRequest(endpoint, { method: 'GET' });
    }
    
    /**
     * Create user in PingOne
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Create user response
     */
    async function createUser(userData) {
        if (!userData) {
            throw new Error('User data is required for user creation');
        }
        
        const endpoint = `/environments/${settings.environmentId}/users`;
        return await pingOneRequest(endpoint, { 
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    /**
     * Update user in PingOne
     * @param {string} userId - User ID
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Update user response
     */
    async function updateUser(userId, userData) {
        if (!userId) {
            throw new Error('User ID is required for user update');
        }
        
        if (!userData) {
            throw new Error('User data is required for user update');
        }
        
        const endpoint = `/environments/${settings.environmentId}/users/${userId}`;
        return await pingOneRequest(endpoint, { 
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    /**
     * Delete user from PingOne
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Delete user response
     */
    async function deleteUser(userId) {
        if (!userId) {
            throw new Error('User ID is required for user deletion');
        }
        
        const endpoint = `/environments/${settings.environmentId}/users/${userId}`;
        return await pingOneRequest(endpoint, { method: 'DELETE' });
    }
    
    /**
     * Get populations from PingOne
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Populations response
     */
    async function getPopulations(options = {}) {
        const queryParams = new URLSearchParams(options).toString();
        const endpoint = `/environments/${settings.environmentId}/populations${queryParams ? `?${queryParams}` : ''}`;
        return await pingOneRequest(endpoint, { method: 'GET' });
    }
    
    /**
     * Create population in PingOne
     * @param {Object} populationData - Population data
     * @returns {Promise<Object>} Create population response
     */
    async function createPopulation(populationData) {
        if (!populationData) {
            throw new Error('Population data is required for population creation');
        }
        
        const endpoint = `/environments/${settings.environmentId}/populations`;
        return await pingOneRequest(endpoint, { 
            method: 'POST',
            body: JSON.stringify(populationData)
        });
    }
    
    /**
     * Delete population from PingOne
     * @param {string} populationId - Population ID
     * @returns {Promise<Object>} Delete population response
     */
    async function deletePopulation(populationId) {
        if (!populationId) {
            throw new Error('Population ID is required for population deletion');
        }
        
        const endpoint = `/environments/${settings.environmentId}/populations/${populationId}`;
        return await pingOneRequest(endpoint, { method: 'DELETE' });
    }
    
    return {
        // API methods
        getUsers,
        createUser,
        updateUser,
        deleteUser,
        getPopulations,
        createPopulation,
        deletePopulation,
        
        // Token management
        getTokenInfo: apiClient.getTokenInfo,
        updateSettings: apiClient.updateSettings,
        
        // Raw request method
        request: pingOneRequest
    };
}

/**
 * API Factory class - Backward compatibility
 */
class APIFactory {
    /**
     * Create a new APIFactory instance
     * @param {Object} logger - Logger instance
     * @param {Object} settingsManager - Settings manager instance
     */
    constructor(logger, settingsManager) {
        if (!settingsManager) {
            throw new Error('Settings manager is required for API factory');
        }
        
        this.logger = logger || console;
        this.settingsManager = settingsManager;
        this.clients = new Map();
    }

    /**
     * Get or create a PingOne API client
     * @returns {PingOneClient} PingOne API client instance
     */
    getPingOneClient() {
        if (!this.clients.has('pingone')) {
            this.clients.set('pingone', new PingOneClient(this.logger, this.settingsManager));
        }
        return this.clients.get('pingone');
    }

    /**
     * Get or create a local API client
     * @param {string} [baseUrl=''] - Base URL for the API
     * @returns {LocalAPIClient} Local API client instance
     */
    getLocalClient(baseUrl = '') {
        const cacheKey = `local_${baseUrl}`;
        if (!this.clients.has(cacheKey)) {
            this.clients.set(cacheKey, new LocalAPIClient(this.logger, baseUrl));
        }
        return this.clients.get(cacheKey);
    }

    /**
     * Get the default local API client (singleton)
     * @returns {LocalAPIClient} Default local API client instance
     */
    getDefaultLocalClient() {
        return localAPIClient;
    }
}

// Create a singleton instance but don't export it directly
let _apiFactoryInstance = null;
let isInitializing = false;
let initializationPromise = null;

/**
 * Initialize the API factory with required dependencies
 * @param {Object} logger - Logger instance
 * @param {Object} settingsManager - Settings manager instance
 * @returns {Promise<APIFactory>} Initialized API factory instance
 */
const initAPIFactory = async (logger, settingsManager) => {
    // If already initialized, return the existing instance
    if (_apiFactoryInstance) {
        return _apiFactoryInstance;
    }
    
    // If initialization is in progress, wait for it to complete
    if (isInitializing) {
        if (initializationPromise) {
            return initializationPromise;
        }
    }
    
    // Set initialization flag and create a new promise
    isInitializing = true;
    initializationPromise = new Promise(async (resolve, reject) => {
        try {
            // Create the factory instance
            const factory = new APIFactory(logger, settingsManager);
            
            // Set the instance
            _apiFactoryInstance = factory;
            defaultAPIFactory = factory;
            
            // Log successful initialization
            if (logger && logger.info) {
                logger.info('API Factory initialized successfully');
            } else {
                console.log('API Factory initialized successfully');
            }
            
            resolve(factory);
        } catch (error) {
            const errorMsg = `Failed to initialize API Factory: ${error.message}`;
            if (logger && logger.error) {
                logger.error(errorMsg, { error });
            } else {
                console.error(errorMsg, error);
            }
            reject(new Error(errorMsg));
        } finally {
            isInitializing = false;
            initializationPromise = null;
        }
    });
    
    return initializationPromise;
};

// Export the singleton instance and initialization function
export { APIFactory, initAPIFactory };

// For backward compatibility, export a default instance (will be initialized when initAPIFactory is called)
let defaultAPIFactory = null;

/**
 * API Factory singleton for backward compatibility
 */
export const apiFactory = {
    /**
     * Get PingOne client
     * @returns {PingOneClient} PingOne API client
     * @throws {Error} If API factory is not initialized
     */
    getPingOneClient: () => {
        if (!defaultAPIFactory) {
            throw new Error('API Factory not initialized. Call initAPIFactory() first.');
        }
        return defaultAPIFactory.getPingOneClient();
    },
    
    /**
     * Get local client
     * @param {string} [baseUrl=''] - Base URL for the API
     * @returns {LocalAPIClient} Local API client
     * @throws {Error} If API factory is not initialized
     */
    getLocalClient: (baseUrl = '') => {
        if (!defaultAPIFactory) {
            throw new Error('API Factory not initialized. Call initAPIFactory() first.');
        }
        return defaultAPIFactory.getLocalClient(baseUrl);
    }
};

/**
 * Get the default API factory instance
 * @returns {APIFactory|null} The default API factory instance
 */
export const getAPIFactory = () => defaultAPIFactory;

export default {
    createAutoRetryAPIClient,
    createPingOneAPIClient,
    initAPIFactory,
    apiFactory
};
