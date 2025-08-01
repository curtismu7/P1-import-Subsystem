/**
 * Token Management Subsystem - Token Manager
 * 
 * This module defines the TokenManager class, which provides a simplified facade
 * for token operations and coordinates with the TokenStatusProvider.
 */

import { TokenStatus, TokenError } from './models.js';

/**
 * Options for TokenManager
 * @typedef {Object} TokenManagerOptions
 * @property {boolean} [autoInitialize=true] - Whether to initialize automatically
 * @property {boolean} [autoRefresh=true] - Whether to enable auto-refresh
 */

/**
 * Facade for token operations
 */
export class TokenManager {
  /**
   * Create a TokenManager
   * @param {import('./token-service.js').TokenService} tokenService - The token service
   * @param {Object} [tokenStatusProvider] - Optional provider for token status display
   * @param {Object} [logger] - Logger instance
   * @param {TokenManagerOptions} [options] - Manager options
   */
  constructor(tokenService, tokenStatusProvider = null, logger, options = {}) {
    if (!tokenService) {
      throw new Error('Token service is required for TokenManager');
    }
    
    this.tokenService = tokenService;
    this.tokenStatusProvider = tokenStatusProvider;
    this.logger = logger || console;
    
    this.options = {
      autoInitialize: true,
      autoRefresh: true,
      ...options
    };
    
    // Status listeners
    this.statusListeners = [];
    
    // Current status
    this.currentStatus = TokenStatus.NONE;
    
    // Initialize if auto-initialize is enabled
    if (this.options.autoInitialize) {
      this.initialize();
    }
    
    this.logger.debug('TokenManager created', {
      autoInitialize: this.options.autoInitialize,
      autoRefresh: this.options.autoRefresh,
      hasStatusProvider: !!this.tokenStatusProvider
    });
  }
  
  /**
   * Initialize the token manager
   * Sets up event listeners and checks initial token status
   */
  initialize() {
    this.logger.debug('Initializing TokenManager');
    
    // Set up token service event listeners
    this.tokenService.onTokenRefresh(token => {
      this.logger.debug('Token refreshed event received');
      this.updateTokenStatus();
      
      // Update status provider if available
      if (this.tokenStatusProvider) {
        this.tokenStatusProvider.showTokenRefreshSuccess();
      }
    });
    
    this.tokenService.onTokenExpired(() => {
      this.logger.debug('Token expired event received');
      this.updateTokenStatus();
      
      // Update status provider if available
      if (this.tokenStatusProvider) {
        this.tokenStatusProvider.showTokenExpiredError();
      }
    });
    
    this.tokenService.onTokenError(error => {
      this.logger.debug('Token error event received', { error });
      this.updateTokenStatus();
      
      // Update status provider if available
      if (this.tokenStatusProvider) {
        this.tokenStatusProvider.showTokenRefreshError(error);
      }
    });
    
    // Check initial token status
    this.updateTokenStatus();
    
    // Start status provider if available
    if (this.tokenStatusProvider) {
      this.tokenStatusProvider.startStatusMonitoring();
    }
    
    this.logger.info('TokenManager initialized');
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
      
      // Update status provider if available
      if (forceRefresh && this.tokenStatusProvider) {
        this.tokenStatusProvider.showTokenRefreshInProgress();
      }
      
      const token = await this.tokenService.getToken(forceRefresh);
      
      // Update token status after getting token
      this.updateTokenStatus();
      
      return token;
    } catch (error) {
      this.logger.error('Failed to get token', { error });
      
      // Update token status after error
      this.updateTokenStatus();
      
      throw error;
    }
  }
  
  /**
   * Ensure a valid token is available
   * If the current token is expired or expiring soon, it will be refreshed
   * @returns {Promise<string>} The token
   * @throws {TokenError} If token acquisition fails
   */
  async ensureValidToken() {
    try {
      this.logger.debug('Ensuring valid token');
      
      const status = await this.tokenService.getTokenStatus();
      const needsRefresh = status === TokenStatus.EXPIRED || status === TokenStatus.EXPIRING_SOON;
      
      return this.getToken(needsRefresh);
    } catch (error) {
      this.logger.error('Failed to ensure valid token', { error });
      throw error;
    }
  }
  
  /**
   * Refresh the token
   * @returns {Promise<string>} The new token
   * @throws {TokenError} If token refresh fails
   */
  async refreshToken() {
    try {
      this.logger.debug('Refreshing token');
      
      // Update status provider if available
      if (this.tokenStatusProvider) {
        this.tokenStatusProvider.showTokenRefreshInProgress();
      }
      
      const token = await this.tokenService.refreshToken();
      
      // Update token status after refreshing
      this.updateTokenStatus();
      
      return token;
    } catch (error) {
      this.logger.error('Failed to refresh token', { error });
      
      // Update token status after error
      this.updateTokenStatus();
      
      throw error;
    }
  }
  
  /**
   * Clear the stored token
   * @returns {Promise<void>}
   */
  async clearToken() {
    try {
      this.logger.debug('Clearing token');
      await this.tokenService.clearToken();
      
      // Update token status after clearing
      this.updateTokenStatus();
      
      this.logger.info('Token cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear token', { error });
      throw error;
    }
  }
  
  /**
   * Get the current token status
   * @returns {Promise<TokenStatus>} The token status
   */
  async getTokenStatus() {
    return this.tokenService.getTokenStatus();
  }
  
  /**
   * Update the token status and notify listeners
   * @private
   */
  async updateTokenStatus() {
    try {
      const status = await this.tokenService.getTokenStatus();
      
      // If status changed, notify listeners
      if (status !== this.currentStatus) {
        this.currentStatus = status;
        this.notifyStatusListeners(status);
      }
      
      return status;
    } catch (error) {
      this.logger.error('Failed to update token status', { error });
      return TokenStatus.ERROR;
    }
  }
  
  /**
   * Register a listener for token status changes
   * @param {Function} callback - Callback function that receives the new status
   * @returns {Function} Function to unregister the listener
   */
  onTokenStatusChange(callback) {
    this.statusListeners.push(callback);
    
    // Immediately notify with current status
    if (this.currentStatus) {
      try {
        callback(this.currentStatus);
      } catch (error) {
        this.logger.error('Error in token status listener', { error });
      }
    }
    
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Notify status listeners
   * @param {TokenStatus} status - The new status
   * @private
   */
  notifyStatusListeners(status) {
    this.logger.debug('Token status changed', { status });
    
    this.statusListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        this.logger.error('Error in token status listener', { error });
      }
    });
  }
  
  /**
   * Dispose of the token manager
   * This cleans up any listeners and disposes the token service
   */
  dispose() {
    this.logger.debug('Disposing TokenManager');
    
    // Clear status listeners
    this.statusListeners = [];
    
    // Stop status provider if available
    if (this.tokenStatusProvider) {
      this.tokenStatusProvider.stopStatusMonitoring();
    }
    
    // Dispose token service
    this.tokenService.dispose();
    
    this.logger.info('TokenManager disposed');
  }
}

/**
 * Create a TokenManager with the given dependencies
 * @param {import('./token-service.js').TokenService} tokenService - The token service
 * @param {Object} [tokenStatusProvider] - Optional provider for token status display
 * @param {Object} [logger] - Logger instance
 * @param {TokenManagerOptions} [options] - Manager options
 * @returns {TokenManager} The token manager
 */
export function createTokenManager(tokenService, tokenStatusProvider, logger, options) {
  return new TokenManager(tokenService, tokenStatusProvider, logger, options);
}