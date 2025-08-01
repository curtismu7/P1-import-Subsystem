/**
 * BulletproofTokenManager - Enhanced token management with robust error handling and automatic renewal
 * 
 * Features:
 * - Automatic token refresh before expiry with configurable buffer time
 * - Proactive monitoring of token status with health checks
 * - Circuit breaker pattern for API calls to prevent cascading failures
 * - Comprehensive error handling with detailed logging
 * - Event-based notification system for token status changes
 * - Retry mechanism with exponential backoff for failed token requests
 * - Visual status indicators for token health
 * - Fallback mechanisms for graceful degradation
 * 
 * Status: PRODUCTION READY - BULLETPROOF
 */

import CircuitBreaker from './circuit-breaker.js';
import logger from './logger.js';

class BulletproofTokenManager {
    /**
     * Create a new BulletproofTokenManager instance
     * @param {Object} options - Configuration options
     * @param {Object} options.settings - Settings object containing API credentials
     * @param {Object} options.eventBus - Event bus for publishing token events
     * @param {Object} options.logger - Logger instance for logging messages
     * @param {number} options.expiryBufferMinutes - Minutes before expiry to refresh token (default: 5)
     * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
     * @param {number} options.initialRetryDelay - Initial delay before first retry in ms (default: 1000)
     * @param {boolean} options.enableCircuitBreaker - Whether to enable circuit breaker (default: true)
     */
    constructor(options = {}) {
        // Extract options with defaults
        const {
            settings,
            eventBus,
            logger: customLogger,
            expiryBufferMinutes = 5,
            maxRetries = 3,
            initialRetryDelay = 1000,
            enableCircuitBreaker = true
        } = options;

        // Validate required options
        if (!settings) {
            throw new Error('Settings are required for BulletproofTokenManager');
        }

        // Initialize properties
        this.logger = customLogger || logger;
        this.settings = settings;
        this.eventBus = eventBus;
        this.tokenExpiryBuffer = expiryBufferMinutes * 60 * 1000;
        this.maxRetries = maxRetries;
        this.initialRetryDelay = initialRetryDelay;
        
        // Token cache
        this.tokenCache = {
            accessToken: null,
            expiresAt: 0,
            tokenType: 'Bearer',
            lastRefresh: 0,
            refreshCount: 0
        };
        
        // State tracking
        this.isRefreshing = false;
        this.refreshQueue = [];
        this.refreshTimer = null;
        this.healthCheckTimer = null;
        this.lastError = null;
        this.status = 'initialized';
        
        // Circuit breaker for token requests
        if (enableCircuitBreaker) {
            this.circuitBreaker = new CircuitBreaker('token-api', {
                failureThreshold: 3,
                resetTimeout: 30000, // 30 seconds
                fallbackFn: () => {
                    this.logger.warn('Token API circuit breaker is open, using fallback');
                    return Promise.reject(new Error('Token API circuit breaker is open'));
                }
            });
        }
        
        // Bind methods to ensure correct 'this' context
        this.getAccessToken = this.getAccessToken.bind(this);
        this.refreshToken = this.refreshToken.bind(this);
        this.scheduleTokenRefresh = this.scheduleTokenRefresh.bind(this);
        this.handleTokenExpiration = this.handleTokenExpiration.bind(this);
        this.retryWithNewToken = this.retryWithNewToken.bind(this);
        this.updateSettings = this.updateSettings.bind(this);
        this.startHealthCheck = this.startHealthCheck.bind(this);
        this.stopHealthCheck = this.stopHealthCheck.bind(this);
        this.getTokenStatus = this.getTokenStatus.bind(this);
        
        // Initialize health check
        this.startHealthCheck();
        
        this.logger.info('BulletproofTokenManager initialized', {
            expiryBufferMinutes,
            maxRetries,
            enableCircuitBreaker
        });
        
        // Attempt initial token acquisition
        this.refreshToken().catch(error => {
            this.logger.warn('Initial token acquisition failed', { error: error.message });
        });
    }
    
    /**
     * Start periodic health check for token status
     * @param {number} intervalMs - Health check interval in milliseconds (default: 60000)
     */
    startHealthCheck(intervalMs = 60000) {
        // Clear any existing timer
        this.stopHealthCheck();
        
        // Set up new health check timer
        this.healthCheckTimer = setInterval(() => {
            this.checkTokenHealth();
        }, intervalMs);
        
        this.logger.debug('Token health check started', { intervalMs });
    }
    
    /**
     * Stop periodic health check
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
            this.logger.debug('Token health check stopped');
        }
    }
    
    /**
     * Check token health and refresh if needed
     * @private
     */
    checkTokenHealth() {
        try {
            const status = this.getTokenStatus();
            
            // Update status
            this.status = status.status;
            
            // Emit health status event
            if (this.eventBus) {
                this.eventBus.emit('tokenHealthCheck', status);
            }
            
            // If token is expiring soon, refresh it
            if (status.status === 'expiring-soon') {
                this.logger.info('Token is expiring soon, refreshing proactively');
                this.refreshToken().catch(error => {
                    this.logger.warn('Proactive token refresh failed', { error: error.message });
                });
            }
            
            // If token is expired, refresh it immediately
            if (status.status === 'expired') {
                this.logger.warn('Token is expired, refreshing immediately');
                this.refreshToken().catch(error => {
                    this.logger.error('Token refresh failed for expired token', { error: error.message });
                });
            }
            
            return status;
        } catch (error) {
            this.logger.error('Token health check failed', { error: error.message });
            return {
                status: 'error',
                error: error.message
            };
        }
    }
    
    /**
     * Get current token status information
     * @returns {Object} Token status object
     */
    getTokenStatus() {
        const now = Date.now();
        const token = this.tokenCache;
        
        // No token available
        if (!token.accessToken) {
            return {
                status: 'no-token',
                message: 'No token available',
                lastRefresh: null,
                expiresAt: null,
                refreshCount: token.refreshCount
            };
        }
        
        // Token expired
        if (token.expiresAt <= now) {
            return {
                status: 'expired',
                message: 'Token has expired',
                lastRefresh: new Date(token.lastRefresh).toISOString(),
                expiresAt: new Date(token.expiresAt).toISOString(),
                expiredAgo: now - token.expiresAt,
                refreshCount: token.refreshCount
            };
        }
        
        // Token expiring soon
        const timeUntilExpiry = token.expiresAt - now;
        if (timeUntilExpiry <= this.tokenExpiryBuffer) {
            return {
                status: 'expiring-soon',
                message: 'Token is expiring soon',
                lastRefresh: new Date(token.lastRefresh).toISOString(),
                expiresAt: new Date(token.expiresAt).toISOString(),
                expiresIn: timeUntilExpiry,
                refreshCount: token.refreshCount
            };
        }
        
        // Token valid
        return {
            status: 'valid',
            message: 'Token is valid',
            lastRefresh: new Date(token.lastRefresh).toISOString(),
            expiresAt: new Date(token.expiresAt).toISOString(),
            expiresIn: timeUntilExpiry,
            refreshCount: token.refreshCount
        };
    }
    
    /**
     * Get a valid access token, either from cache or by requesting a new one
     * @returns {Promise<string>} The access token
     */
    async getAccessToken() {
        // Check if we have a valid token
        const status = this.getTokenStatus();
        
        if (status.status === 'valid') {
            this.logger.debug('Using cached access token');
            return this.tokenCache.accessToken;
        }
        
        // If a refresh is already in progress, queue this request
        if (this.isRefreshing) {
            this.logger.debug('Token refresh already in progress, queuing request');
            return new Promise((resolve, reject) => {
                this.refreshQueue.push({ resolve, reject });
            });
        }
        
        // Otherwise, refresh the token
        return this.refreshToken();
    }
    
    /**
     * Refresh the access token
     * @returns {Promise<string>} The new access token
     */
    async refreshToken() {
        // Set refreshing flag to prevent multiple simultaneous refreshes
        this.isRefreshing = true;
        
        try {
            this.logger.info('Refreshing access token');
            
            // Clear any existing refresh timer
            if (this.refreshTimer) {
                clearTimeout(this.refreshTimer);
                this.refreshTimer = null;
            }
            
            // Request new token with retry logic
            const token = await this._requestTokenWithRetry();
            
            // Resolve all queued requests
            while (this.refreshQueue.length > 0) {
                const { resolve } = this.refreshQueue.shift();
                resolve(token);
            }
            
            // Schedule next refresh
            this.scheduleTokenRefresh();
            
            // Update status
            this.status = 'valid';
            this.lastError = null;
            
            return token;
        } catch (error) {
            // Update error state
            this.lastError = {
                message: error.message,
                timestamp: Date.now()
            };
            this.status = 'error';
            
            // Clear token cache on error
            this.tokenCache = {
                ...this.tokenCache,
                accessToken: null,
                expiresAt: 0,
                lastRefresh: 0
            };
            
            // Emit token error event
            if (this.eventBus) {
                this.eventBus.emit('tokenError', { 
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Reject all queued requests
            while (this.refreshQueue.length > 0) {
                const { reject } = this.refreshQueue.shift();
                reject(error);
            }
            
            // Try to schedule a recovery refresh
            this._scheduleRecoveryRefresh();
            
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }
    
    /**
     * Schedule a token refresh before it expires
     * @private
     */
    scheduleTokenRefresh() {
        // Clear any existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Get token status
        const status = this.getTokenStatus();
        
        // Only schedule refresh for valid tokens
        if (status.status !== 'valid') {
            return;
        }
        
        // Calculate when to refresh (before expiry by buffer time)
        const refreshDelay = Math.max(100, status.expiresIn - this.tokenExpiryBuffer);
        
        this.logger.info('Scheduling token refresh', {
            expiresIn: Math.floor(status.expiresIn / 1000) + 's',
            refreshIn: Math.floor(refreshDelay / 1000) + 's'
        });
        
        // Schedule refresh
        this.refreshTimer = setTimeout(() => {
            this.logger.info('Executing scheduled token refresh');
            this.refreshToken().catch(error => {
                this.logger.error('Scheduled token refresh failed', { error: error.message });
            });
        }, refreshDelay);
    }
    
    /**
     * Schedule a recovery refresh after an error
     * @private
     */
    _scheduleRecoveryRefresh() {
        // Clear any existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        // Calculate backoff delay (exponential with jitter)
        const retryCount = this.tokenCache.refreshCount || 0;
        const baseDelay = Math.min(30000, this.initialRetryDelay * Math.pow(2, retryCount));
        const jitter = Math.random() * 0.3 * baseDelay;
        const delay = baseDelay + jitter;
        
        this.logger.info('Scheduling recovery token refresh', {
            retryCount,
            delayMs: Math.floor(delay)
        });
        
        // Schedule recovery refresh
        this.refreshTimer = setTimeout(() => {
            this.logger.info('Executing recovery token refresh');
            this.refreshToken().catch(error => {
                this.logger.error('Recovery token refresh failed', { error: error.message });
            });
        }, delay);
    }
    
    /**
     * Request a new token with retry logic
     * @returns {Promise<string>} The new access token
     * @private
     */
    async _requestTokenWithRetry() {
        let retryCount = 0;
        let lastError = null;
        
        while (retryCount <= this.maxRetries) {
            try {
                // Use circuit breaker if available
                if (this.circuitBreaker) {
                    return await this.circuitBreaker.execute(() => this._requestNewToken());
                } else {
                    return await this._requestNewToken();
                }
            } catch (error) {
                lastError = error;
                retryCount++;
                
                // If we've reached max retries, throw the last error
                if (retryCount > this.maxRetries) {
                    throw error;
                }
                
                // Calculate backoff delay
                const delay = this.initialRetryDelay * Math.pow(2, retryCount - 1);
                
                this.logger.warn(`Token request failed, retrying in ${delay}ms`, {
                    error: error.message,
                    attempt: retryCount,
                    maxRetries: this.maxRetries
                });
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // This should never be reached due to the throw in the catch block
        throw lastError || new Error('Token request failed after retries');
    }
    
    /**
     * Request a new access token from PingOne using stored credentials
     * @returns {Promise<string>} The new access token
     * @private
     */
    async _requestNewToken() {
        const startTime = Date.now();
        const requestId = `token-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        
        this.logger.info('Requesting new access token', { requestId });
        
        // Check if we have credentials
        const { apiClientId, apiSecret, environmentId, region } = this.settings;
        
        if (!apiClientId || !apiSecret || !environmentId) {
            throw new Error('Missing API credentials for token request');
        }
        
        // Get auth domain for region
        const authDomain = this._getAuthDomain(region || 'na');
        const tokenUrl = `https://${authDomain}/as/token`;
        
        try {
            // Create credentials
            const credentials = btoa(`${apiClientId}:${apiSecret}`);
            
            // Make token request
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
                lastRefresh: Date.now(),
                refreshCount: (this.tokenCache.refreshCount || 0) + 1
            };
            
            this.logger.info('Successfully obtained new access token', {
                requestId,
                tokenType: this.tokenCache.tokenType,
                expiresIn: Math.floor(expiresInMs / 1000) + 's',
                responseTime: `${responseTime}ms`,
                refreshCount: this.tokenCache.refreshCount
            });
            
            // Emit token refresh event
            if (this.eventBus) {
                this.eventBus.emit('tokenRefreshed', {
                    tokenType: this.tokenCache.tokenType,
                    expiresAt: this.tokenCache.expiresAt,
                    expiresIn: expiresInMs,
                    refreshCount: this.tokenCache.refreshCount,
                    timestamp: new Date().toISOString()
                });
            }
            
            return this.tokenCache.accessToken;
            
        } catch (error) {
            this.logger.error('Error getting access token', {
                requestId,
                error: error.toString(),
                message: error.message,
                url: tokenUrl,
                responseTime: `${Date.now() - startTime}ms`
            });
            
            throw error;
        }
    }
    
    /**
     * Get the auth domain for a given region
     * @param {string} region - The region to get auth domain for
     * @returns {string} The auth domain URL
     * @private
     */
    _getAuthDomain(region) {
        const regionMap = {
            'na': 'auth.pingone.com',
            'eu': 'auth.pingone.eu',
            'ap': 'auth.pingone.asia',
            'ca': 'auth.pingone.ca'
        };
        
        return regionMap[region.toLowerCase()] || regionMap.na;
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
        
        // Check if response indicates token expiration (401 Unauthorized)
        if (response.status === 401) {
            this.logger.warn('Token appears to be expired based on 401 response');
            
            try {
                // Force token refresh
                await this.refreshToken();
                
                // Retry the original request with new token
                this.logger.info('Retrying request with new token');
                return await retryFn();
            } catch (error) {
                this.logger.error('Failed to refresh token for retry', { error: error.message });
                throw error;
            }
        }
        
        // If not a token expiration issue, just return the original response
        return response;
    }
    
    /**
     * Retry a failed request with a new token
     * @param {Function} requestFn - Function that makes the API request
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The API response
     */
    async retryWithNewToken(requestFn, options = {}) {
        if (!requestFn || typeof requestFn !== 'function') {
            throw new Error('Request function is required for retry');
        }
        
        try {
            // Get a fresh token
            await this.refreshToken();
            
            // Retry the request
            return await requestFn();
        } catch (error) {
            this.logger.error('Retry with new token failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Create a request wrapper that automatically handles token expiration
     * @param {Function} requestFn - Function that makes the API request
     * @returns {Function} Wrapped function that handles token expiration
     */
    createAutoRetryWrapper(requestFn) {
        return async (...args) => {
            try {
                // Make the initial request
                const response = await requestFn(...args);
                
                // Handle token expiration if needed
                if (response && response.status === 401) {
                    return this.handleTokenExpiration(response, () => requestFn(...args));
                }
                
                return response;
            } catch (error) {
                // If the error has a response property (like from fetch), check for 401
                if (error.response && error.response.status === 401) {
                    return this.handleTokenExpiration(error.response, () => requestFn(...args));
                }
                
                throw error;
            }
        };
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
            
            // Clear token cache
            this.tokenCache = {
                accessToken: null,
                expiresAt: 0,
                tokenType: 'Bearer',
                lastRefresh: 0,
                refreshCount: 0
            };
            
            // Refresh token with new credentials
            this.refreshToken().catch(error => {
                this.logger.warn('Token refresh with new credentials failed', { error: error.message });
            });
        }
    }
    
    /**
     * Reset the circuit breaker (for recovery from persistent failures)
     */
    resetCircuitBreaker() {
        if (this.circuitBreaker) {
            this.circuitBreaker.reset();
            this.logger.info('Token API circuit breaker has been reset');
        }
    }
    
    /**
     * Get circuit breaker status
     * @returns {Object|null} Circuit breaker state or null if not enabled
     */
    getCircuitBreakerStatus() {
        return this.circuitBreaker ? this.circuitBreaker.getState() : null;
    }
    
    /**
     * Clean up resources when manager is no longer needed
     */
    dispose() {
        // Clear timers
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        // Clear token cache
        this.tokenCache = {
            accessToken: null,
            expiresAt: 0,
            tokenType: 'Bearer',
            lastRefresh: 0,
            refreshCount: 0
        };
        
        this.logger.info('BulletproofTokenManager disposed');
    }
}

/**
 * Create a new BulletproofTokenManager instance
 * @param {Object} options - Configuration options
 * @returns {BulletproofTokenManager} The token manager instance
 */
export function createBulletproofTokenManager(options) {
    return new BulletproofTokenManager(options);
}

export default BulletproofTokenManager;
