/**
 * API Client Subsystem - Base Client
 * 
 * Provides a foundation for making API requests with consistent error handling,
 * retry logic, and authentication. This base client handles common concerns like
 * request formatting, response parsing, and error handling.
 * 
 * Features:
 * - Automatic token management
 * - Configurable retry logic
 * - Request/response interceptors
 * - Error normalization
 * - Rate limiting
 * - Request cancellation
 * - Response caching
 */

import TokenManager from '../server/token-manager.js';

/**
 * Base API Client
 * 
 * Core class for making API requests with consistent behavior.
 */
class BaseApiClient {
    /**
     * Create a new BaseApiClient
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {TokenManager} options.tokenManager - Token manager instance
     * @param {Object} options.config - Client configuration
     */
    constructor(options = {}) {
        const { logger, tokenManager, config = {} } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        this.tokenManager = tokenManager || new TokenManager(logger);
        
        // Configuration with defaults
        this.config = {
            baseUrl: '',
            timeout: 30000, // 30 seconds
            retries: 2,
            retryDelay: 1000, // 1 second
            cacheEnabled: false,
            cacheTTL: 60000, // 1 minute
            ...config
        };
        
        // Request interceptors
        this.requestInterceptors = [];
        
        // Response interceptors
        this.responseInterceptors = [];
        
        // Response cache
        this.cache = new Map();
        
        // Active requests for cancellation
        this.activeRequests = new Map();
        
        // Rate limiting
        this.rateLimiter = {
            lastRequest: 0,
            minInterval: 50, // 20 requests per second max
        };
        
        // Bind methods
        this.request = this.request.bind(this);
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.put = this.put.bind(this);
        this.delete = this.delete.bind(this);
        this.patch = this.patch.bind(this);
    }

    /**
     * Add a request interceptor
     * @param {Function} interceptor - Function that receives and modifies request config
     * @returns {number} Interceptor ID for removal
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
        return this.requestInterceptors.length - 1;
    }

    /**
     * Remove a request interceptor
     * @param {number} id - Interceptor ID to remove
     */
    removeRequestInterceptor(id) {
        this.requestInterceptors[id] = null;
    }

    /**
     * Add a response interceptor
     * @param {Function} interceptor - Function that receives and modifies response
     * @returns {number} Interceptor ID for removal
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
        return this.responseInterceptors.length - 1;
    }

    /**
     * Remove a response interceptor
     * @param {number} id - Interceptor ID to remove
     */
    removeResponseInterceptor(id) {
        this.responseInterceptors[id] = null;
    }

    /**
     * Check if we can make a request (rate limiting)
     * @private
     */
    _checkRateLimit() {
        const now = Date.now();
        if (now - this.rateLimiter.lastRequest < this.rateLimiter.minInterval) {
            return false;
        }
        this.rateLimiter.lastRequest = now;
        return true;
    }

    /**
     * Generate a cache key for a request
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {string} Cache key
     * @private
     */
    _getCacheKey(url, options) {
        const method = options.method || 'GET';
        const body = options.body ? JSON.stringify(options.body) : '';
        return `${method}:${url}:${body}`;
    }

    /**
     * Check cache for a matching request
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Object|null} Cached response or null
     * @private
     */
    _checkCache(url, options) {
        if (!this.config.cacheEnabled || options.method !== 'GET') {
            return null;
        }
        
        const cacheKey = this._getCacheKey(url, options);
        const cached = this.cache.get(cacheKey);
        
        if (!cached) {
            return null;
        }
        
        // Check if cache is expired
        if (Date.now() > cached.expires) {
            this.cache.delete(cacheKey);
            return null;
        }
        
        this.logger.debug('Using cached response', { url });
        return cached.response;
    }

    /**
     * Store response in cache
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {Object} response - Response to cache
     * @private
     */
    _storeInCache(url, options, response) {
        if (!this.config.cacheEnabled || options.method !== 'GET') {
            return;
        }
        
        const cacheKey = this._getCacheKey(url, options);
        const expires = Date.now() + this.config.cacheTTL;
        
        // Clone the response before storing
        const clonedResponse = response.clone();
        
        // Store in cache
        this.cache.set(cacheKey, {
            response: clonedResponse,
            expires
        });
        
        this.logger.debug('Stored response in cache', { url, expires });
    }

    /**
     * Apply request interceptors
     * @param {Object} config - Request configuration
     * @returns {Object} Modified request configuration
     * @private
     */
    _applyRequestInterceptors(config) {
        let result = { ...config };
        
        for (const interceptor of this.requestInterceptors) {
            if (interceptor) {
                result = interceptor(result) || result;
            }
        }
        
        return result;
    }

    /**
     * Apply response interceptors
     * @param {Object} response - Response object
     * @param {Object} config - Request configuration
     * @returns {Object} Modified response
     * @private
     */
    async _applyResponseInterceptors(response, config) {
        let result = response;
        
        for (const interceptor of this.responseInterceptors) {
            if (interceptor) {
                result = await interceptor(result, config) || result;
            }
        }
        
        return result;
    }

    /**
     * Make an API request with automatic token handling and retries
     * @param {string} url - Request URL (can be relative to baseUrl)
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Fetch response
     */
    async request(url, options = {}) {
        // Apply request interceptors
        const config = this._applyRequestInterceptors({
            url,
            ...options
        });
        
        // Resolve URL (relative or absolute)
        const resolvedUrl = config.url.startsWith('http') 
            ? config.url 
            : `${this.config.baseUrl}${config.url}`;
        
        // Check cache
        const cachedResponse = this._checkCache(resolvedUrl, config);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Check rate limiting
        if (!this._checkRateLimit()) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minInterval));
        }
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const { signal } = controller;
        
        // Set timeout
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.config.timeout);
        
        // Store active request
        const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.activeRequests.set(requestId, controller);
        
        try {
            // Get token if needed
            let headers = { ...config.headers };
            
            if (config.authenticated !== false) {
                const token = await this.tokenManager.getAccessToken();
                headers = {
                    ...headers,
                    'Authorization': `Bearer ${token}`
                };
            }
            
            // Make request
            let response;
            let retries = 0;
            
            while (retries <= this.config.retries) {
                try {
                    response = await fetch(resolvedUrl, {
                        ...config,
                        headers,
                        signal
                    });
                    
                    // Check if token expired
                    if (response.status === 401 && retries < this.config.retries) {
                        this.logger.warn('Token expired, retrying with new token');
                        this.tokenManager.clearToken();
                        const newToken = await this.tokenManager.getAccessToken();
                        headers = {
                            ...headers,
                            'Authorization': `Bearer ${newToken}`
                        };
                        retries++;
                        continue;
                    }
                    
                    break;
                } catch (error) {
                    if (retries >= this.config.retries) {
                        throw error;
                    }
                    
                    this.logger.warn(`Request failed, retrying (${retries + 1}/${this.config.retries})`, {
                        url: resolvedUrl,
                        error: error.message
                    });
                    
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                }
            }
            
            // Apply response interceptors
            const processedResponse = await this._applyResponseInterceptors(response, config);
            
            // Store in cache if successful
            if (response.ok) {
                this._storeInCache(resolvedUrl, config, processedResponse);
            }
            
            return processedResponse;
        } catch (error) {
            this.logger.error('Request failed', {
                url: resolvedUrl,
                error: error.message
            });
            
            throw error;
        } finally {
            // Clean up
            clearTimeout(timeoutId);
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * Make a GET request
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Fetch response
     */
    async get(url, options = {}) {
        return this.request(url, {
            ...options,
            method: 'GET'
        });
    }

    /**
     * Make a POST request
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Fetch response
     */
    async post(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(data)
        });
    }

    /**
     * Make a PUT request
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Fetch response
     */
    async put(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(data)
        });
    }

    /**
     * Make a DELETE request
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Fetch response
     */
    async delete(url, options = {}) {
        return this.request(url, {
            ...options,
            method: 'DELETE'
        });
    }

    /**
     * Make a PATCH request
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Fetch response
     */
    async patch(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(data)
        });
    }

    /**
     * Cancel all active requests
     */
    cancelAllRequests() {
        for (const controller of this.activeRequests.values()) {
            controller.abort();
        }
        this.activeRequests.clear();
    }

    /**
     * Clear the response cache
     */
    clearCache() {
        this.cache.clear();
        this.logger.debug('Response cache cleared');
    }
}

export default BaseApiClient;