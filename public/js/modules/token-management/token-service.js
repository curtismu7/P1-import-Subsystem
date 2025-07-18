/**
 * Token Management Subsystem - Token Service
 * 
 * This module defines the TokenService class, which is the central service
 * responsible for coordinating all token-related operations.
 */

import { TokenStatus, TokenError, convertTokenResponse, isTokenExpired, isTokenExpiringSoon, getTokenRemainingTime } from './models.js';

/**
 * Options for TokenService
 * @typedef {Object} TokenServiceOptions
 * @property {number} [autoRefreshThreshold=60] - Seconds before expiration to trigger refresh
 * @property {number} [refreshRetryLimit=3] - Maximum number of refresh retries
 * @property {number} [refreshRetryDelay=1000] - Delay between refresh retries in milliseconds
 * @property {number} [tokenExpirationBuffer=30] - Extra buffer to consider a token expired in seconds
 */

/**
 * Central service for token management
 */
export class TokenService {
  /**
   * Create a TokenService
   * @param {import('./token-provider.js').TokenProvider} tokenProvider - Provider for acquiring tokens
   * @param {import('./token-validator.js').TokenValidator} tokenValidator - Validator for token validation
   * @param {import('./token-storage.js').TokenStorage} tokenStorage - Storage for tokens
   * @param {Object} [logger] - Logger instance
   * @param {TokenServiceOptions} [options] - Service options
   */
  constructor(tokenProvider, tokenValidator, tokenStorage, logger, options = {}) {
    if (!tokenProvider) {
      throw new Error('Token provider is required for TokenService');
    }
    
    if (!tokenValidator) {
      throw new Error('Token validator is required for TokenService');
    }
    
    if (!tokenStorage) {
      throw new Error('Token storage is required for TokenService');
    }
    
    this.tokenProvider = tokenProvider;
    this.tokenValidator = tokenValidator;
    this.tokenStorage = tokenStorage;
    this.logger = logger || console;
    
    this.options = {
      autoRefreshThreshold: 60, // 1 minute
      refreshRetryLimit: 3,
      refreshRetryDelay: 1000, // 1 second
      tokenExpirationBuffer: 30, // 30 seconds
      ...options
    };
    
    // Token refresh state
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.refreshCallbacks = [];
    
    // Event listeners
    this.tokenRefreshListeners = [];
    this.tokenExpiredListeners = [];
    this.tokenErrorListeners = [];
    
    // Refresh timer
    this.refreshTimer = null;
    
    this.logger.debug('TokenService initialized', {
      autoRefreshThreshold: this.options.autoRefreshThreshold,
      refreshRetryLimit: this.options.refreshRetryLimit,
      tokenExpirationBuffer: this.options.tokenExpirationBuffer
    });
  }
  
  /**
   * Get a valid token
   * @param {boolean} [forceRefresh=false] - Whether to force a refresh
   * @returns {Promise<string>} The token
   * @throws {TokenError} If token acquisition fails
   */
  async getToken(forceRefresh = false) {
    try {
      this.logger.debug('Getting token', { forceRefresh });
      
      // If a refresh is already in progress, wait for it to complete
      if (this.isRefreshing) {
        this.logger.debug('Token refresh already in progress, waiting for completion');
        return this.waitForRefresh();
      }
      
      // Get the stored token
      const storedToken = await this.tokenStorage.getToken();
      const tokenInfo = await this.tokenStorage.getTokenInfo();
      
      // If we have a token and it's not expired and we're not forcing a refresh, use it
      if (
        storedToken && 
        tokenInfo && 
        !forceRefresh && 
        !isTokenExpired(tokenInfo, this.options.tokenExpirationBuffer)
      ) {
        this.logger.debug('Using stored token', {
          expiresAt: tokenInfo.expiresAt,
          remainingTime: getTokenRemainingTime(tokenInfo)
        });
        
        // Schedule refresh if token is expiring soon
        this.scheduleRefreshIfNeeded(tokenInfo);
        
        return storedToken;
      }
      
      // If we have a refresh token, try to refresh
      if (tokenInfo && tokenInfo.refreshToken) {
        try {
          this.logger.debug('Refreshing token using refresh token');
          return await this.refreshToken(tokenInfo.refreshToken);
        } catch (error) {
          this.logger.warn('Token refresh failed, acquiring new token', { error });
          // Fall through to acquire a new token
        }
      }
      
      // Acquire a new token
      this.logger.debug('Acquiring new token');
      const tokenResponse = await this.tokenProvider.acquireToken();
      const token = tokenResponse.access_token;
      
      // Validate the token
      const isValid = await this.tokenValidator.validateToken(token);
      if (!isValid) {
        throw new TokenError('invalid_token', 'Acquired token is invalid');
      }
      
      // Convert the response to token info
      const newTokenInfo = convertTokenResponse(tokenResponse);
      
      // Store the token
      await this.tokenStorage.saveToken(token, newTokenInfo);
      
      // Schedule refresh if needed
      this.scheduleRefreshIfNeeded(newTokenInfo);
      
      this.logger.info('New token acquired and stored', {
        tokenType: newTokenInfo.tokenType,
        expiresAt: newTokenInfo.expiresAt,
        hasRefreshToken: !!newTokenInfo.refreshToken
      });
      
      return token;
    } catch (error) {
      // Convert regular errors to TokenError
      if (!(error instanceof TokenError)) {
        this.logger.error('Token acquisition failed', { error });
        error = new TokenError(
          'token_acquisition_failed',
          `Failed to acquire token: ${error.message}`
        );
      }
      
      // Notify error listeners
      this.notifyTokenErrorListeners(error);
      
      throw error;
    }
  }
  
  /**
   * Validate a token
   * @param {string} token - The token to validate
   * @returns {Promise<boolean>} True if the token is valid
   */
  async validateToken(token) {
    try {
      this.logger.debug('Validating token');
      return await this.tokenValidator.validateToken(token);
    } catch (error) {
      this.logger.error('Token validation failed', { error });
      return false;
    }
  }
  
  /**
   * Refresh the token
   * @param {string} [refreshToken] - Optional refresh token to use
   * @returns {Promise<string>} The new token
   * @throws {TokenError} If token refresh fails
   */
  async refreshToken(refreshToken) {
    // If a refresh is already in progress, wait for it to complete
    if (this.isRefreshing) {
      this.logger.debug('Token refresh already in progress, waiting for completion');
      return this.waitForRefresh();
    }
    
    try {
      this.isRefreshing = true;
      this.refreshPromise = this._refreshToken(refreshToken);
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }
  
  /**
   * Internal method to refresh the token
   * @param {string} [refreshToken] - Optional refresh token to use
   * @returns {Promise<string>} The new token
   * @throws {TokenError} If token refresh fails
   * @private
   */
  async _refreshToken(refreshToken) {
    try {
      this.logger.debug('Refreshing token');
      
      // If no refresh token is provided, try to get it from storage
      if (!refreshToken) {
        const tokenInfo = await this.tokenStorage.getTokenInfo();
        refreshToken = tokenInfo?.refreshToken;
        
        if (!refreshToken) {
          throw new TokenError('no_refresh_token', 'No refresh token available');
        }
      }
      
      // Try to refresh the token with retries
      let lastError;
      for (let attempt = 0; attempt <= this.options.refreshRetryLimit; attempt++) {
        try {
          if (attempt > 0) {
            this.logger.debug(`Retry attempt ${attempt}/${this.options.refreshRetryLimit}`);
            await new Promise(resolve => setTimeout(resolve, this.options.refreshRetryDelay * attempt));
          }
          
          // Acquire a new token using the refresh token
          const tokenResponse = await this.tokenProvider.acquireToken({ refreshToken });
          const token = tokenResponse.access_token;
          
          // Validate the token
          const isValid = await this.tokenValidator.validateToken(token);
          if (!isValid) {
            throw new TokenError('invalid_token', 'Refreshed token is invalid');
          }
          
          // Convert the response to token info
          const newTokenInfo = convertTokenResponse(tokenResponse);
          
          // Store the token
          await this.tokenStorage.saveToken(token, newTokenInfo);
          
          // Schedule refresh if needed
          this.scheduleRefreshIfNeeded(newTokenInfo);
          
          this.logger.info('Token refreshed successfully', {
            tokenType: newTokenInfo.tokenType,
            expiresAt: newTokenInfo.expiresAt,
            hasRefreshToken: !!newTokenInfo.refreshToken
          });
          
          // Notify refresh listeners
          this.notifyTokenRefreshListeners(token);
          
          // Resolve any pending callbacks
          this.resolveRefreshCallbacks(token);
          
          return token;
        } catch (error) {
          lastError = error;
          this.logger.warn(`Token refresh attempt ${attempt + 1} failed`, { error });
          
          // If this is an auth error, don't retry
          if (
            error instanceof TokenError && 
            (error.code === 'invalid_grant' || error.status === 401)
          ) {
            break;
          }
        }
      }
      
      // All retries failed
      throw lastError || new TokenError('refresh_failed', 'Token refresh failed after retries');
    } catch (error) {
      // Convert regular errors to TokenError
      if (!(error instanceof TokenError)) {
        this.logger.error('Token refresh failed', { error });
        error = new TokenError(
          'token_refresh_failed',
          `Failed to refresh token: ${error.message}`
        );
      }
      
      // Notify error listeners
      this.notifyTokenErrorListeners(error);
      
      // Reject any pending callbacks
      this.rejectRefreshCallbacks(error);
      
      throw error;
    }
  }
  
  /**
   * Wait for an ongoing refresh to complete
   * @returns {Promise<string>} The refreshed token
   * @private
   */
  waitForRefresh() {
    return new Promise((resolve, reject) => {
      this.refreshCallbacks.push({ resolve, reject });
    });
  }
  
  /**
   * Resolve all pending refresh callbacks
   * @param {string} token - The refreshed token
   * @private
   */
  resolveRefreshCallbacks(token) {
    this.refreshCallbacks.forEach(callback => callback.resolve(token));
    this.refreshCallbacks = [];
  }
  
  /**
   * Reject all pending refresh callbacks
   * @param {Error} error - The error that occurred
   * @private
   */
  rejectRefreshCallbacks(error) {
    this.refreshCallbacks.forEach(callback => callback.reject(error));
    this.refreshCallbacks = [];
  }
  
  /**
   * Schedule a token refresh if needed
   * @param {import('./models.js').TokenInfo} tokenInfo - The token information
   * @private
   */
  scheduleRefreshIfNeeded(tokenInfo) {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // If the token is already expired, don't schedule a refresh
    if (isTokenExpired(tokenInfo)) {
      this.logger.debug('Token is already expired, not scheduling refresh');
      this.notifyTokenExpiredListeners();
      return;
    }
    
    // Calculate when to refresh
    const remainingTime = getTokenRemainingTime(tokenInfo);
    const refreshTime = Math.max(0, remainingTime - this.options.autoRefreshThreshold);
    
    this.logger.debug('Scheduling token refresh', {
      remainingTime,
      refreshTime,
      refreshIn: new Date(Date.now() + refreshTime * 1000).toISOString()
    });
    
    // Schedule the refresh
    this.refreshTimer = setTimeout(() => {
      this.logger.debug('Auto-refresh timer triggered');
      this.refreshToken().catch(error => {
        this.logger.error('Auto-refresh failed', { error });
      });
    }, refreshTime * 1000);
  }
  
  /**
   * Get the token expiration date
   * @returns {Date|null} The expiration date, or null if not available
   */
  async getTokenExpiration() {
    try {
      const tokenInfo = await this.tokenStorage.getTokenInfo();
      return tokenInfo?.expiresAt || null;
    } catch (error) {
      this.logger.error('Failed to get token expiration', { error });
      return null;
    }
  }
  
  /**
   * Get the current token status
   * @returns {TokenStatus} The token status
   */
  async getTokenStatus() {
    try {
      // If a refresh is in progress, return REFRESHING
      if (this.isRefreshing) {
        return TokenStatus.REFRESHING;
      }
      
      const token = await this.tokenStorage.getToken();
      const tokenInfo = await this.tokenStorage.getTokenInfo();
      
      // If no token, return NONE
      if (!token || !tokenInfo) {
        return TokenStatus.NONE;
      }
      
      // If token is expired, return EXPIRED
      if (isTokenExpired(tokenInfo, this.options.tokenExpirationBuffer)) {
        return TokenStatus.EXPIRED;
      }
      
      // If token is expiring soon, return EXPIRING_SOON
      if (isTokenExpiringSoon(tokenInfo, this.options.autoRefreshThreshold)) {
        return TokenStatus.EXPIRING_SOON;
      }
      
      // Otherwise, return VALID
      return TokenStatus.VALID;
    } catch (error) {
      this.logger.error('Failed to get token status', { error });
      return TokenStatus.ERROR;
    }
  }
  
  /**
   * Get the token information
   * @returns {Promise<import('./models.js').TokenInfo|null>} The token information, or null if not available
   */
  async getTokenInfo() {
    try {
      return await this.tokenStorage.getTokenInfo();
    } catch (error) {
      this.logger.error('Failed to get token info', { error });
      return null;
    }
  }
  
  /**
   * Clear the stored token
   * @returns {Promise<void>}
   */
  async clearToken() {
    try {
      this.logger.debug('Clearing token');
      await this.tokenStorage.clearToken();
      this.logger.info('Token cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear token', { error });
      throw error;
    }
  }
  
  /**
   * Register a listener for token refresh events
   * @param {Function} callback - Callback function that receives the new token
   * @returns {Function} Function to unregister the listener
   */
  onTokenRefresh(callback) {
    this.tokenRefreshListeners.push(callback);
    return () => {
      this.tokenRefreshListeners = this.tokenRefreshListeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register a listener for token expired events
   * @param {Function} callback - Callback function
   * @returns {Function} Function to unregister the listener
   */
  onTokenExpired(callback) {
    this.tokenExpiredListeners.push(callback);
    return () => {
      this.tokenExpiredListeners = this.tokenExpiredListeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register a listener for token error events
   * @param {Function} callback - Callback function that receives the error
   * @returns {Function} Function to unregister the listener
   */
  onTokenError(callback) {
    this.tokenErrorListeners.push(callback);
    return () => {
      this.tokenErrorListeners = this.tokenErrorListeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Notify token refresh listeners
   * @param {string} token - The new token
   * @private
   */
  notifyTokenRefreshListeners(token) {
    this.tokenRefreshListeners.forEach(callback => {
      try {
        callback(token);
      } catch (error) {
        this.logger.error('Error in token refresh listener', { error });
      }
    });
  }
  
  /**
   * Notify token expired listeners
   * @private
   */
  notifyTokenExpiredListeners() {
    this.tokenExpiredListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        this.logger.error('Error in token expired listener', { error });
      }
    });
  }
  
  /**
   * Notify token error listeners
   * @param {Error} error - The error that occurred
   * @private
   */
  notifyTokenErrorListeners(error) {
    this.tokenErrorListeners.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        this.logger.error('Error in token error listener', { error: callbackError });
      }
    });
  }
  
  /**
   * Dispose of the token service
   * This cleans up any timers and listeners
   */
  dispose() {
    this.logger.debug('Disposing TokenService');
    
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // Clear listeners
    this.tokenRefreshListeners = [];
    this.tokenExpiredListeners = [];
    this.tokenErrorListeners = [];
    
    // Clear refresh callbacks
    this.rejectRefreshCallbacks(new Error('TokenService disposed'));
  }
}

/**
 * Create a TokenService with the given dependencies
 * @param {import('./token-provider.js').TokenProvider} tokenProvider - Provider for acquiring tokens
 * @param {import('./token-validator.js').TokenValidator} tokenValidator - Validator for token validation
 * @param {import('./token-storage.js').TokenStorage} tokenStorage - Storage for tokens
 * @param {Object} [logger] - Logger instance
 * @param {TokenServiceOptions} [options] - Service options
 * @returns {TokenService} The token service
 */
export function createTokenService(tokenProvider, tokenValidator, tokenStorage, logger, options) {
  return new TokenService(tokenProvider, tokenValidator, tokenStorage, logger, options);
}