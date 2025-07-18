/**
 * Token Management Subsystem - Token Status Provider
 * 
 * This module defines the TokenStatusProvider class, which is responsible for
 * displaying token status information to the user and providing notifications
 * about token events.
 */

import { TokenStatus, getTokenRemainingTime, formatRemainingTime } from './models.js';

/**
 * Options for TokenStatusProvider
 * @typedef {Object} TokenStatusProviderOptions
 * @property {number} [updateInterval=10000] - Milliseconds between status updates
 * @property {boolean} [showExpirationWarning=true] - Whether to show expiration warnings
 * @property {number} [warningThreshold=300] - Seconds before expiration to show warning
 * @property {string} [statusElementId='token-status-indicator'] - ID of status element
 * @property {string} [countdownElementId='token-countdown'] - ID of countdown element
 */

/**
 * Provider for token status display and notifications
 */
export class TokenStatusProvider {
  /**
   * Create a TokenStatusProvider
   * @param {import('./token-service.js').TokenService} tokenService - The token service
   * @param {Object} uiManager - UI manager for notifications
   * @param {Object} [logger] - Logger instance
   * @param {TokenStatusProviderOptions} [options] - Provider options
   */
  constructor(tokenService, uiManager, logger, options = {}) {
    if (!tokenService) {
      throw new Error('Token service is required for TokenStatusProvider');
    }
    
    if (!uiManager) {
      throw new Error('UI manager is required for TokenStatusProvider');
    }
    
    this.tokenService = tokenService;
    this.uiManager = uiManager;
    this.logger = logger || console;
    
    this.options = {
      updateInterval: 10000, // 10 seconds
      showExpirationWarning: true,
      warningThreshold: 300, // 5 minutes
      statusElementId: 'token-status-indicator',
      countdownElementId: 'token-countdown',
      ...options
    };
    
    // Status update timer
    this.updateTimer = null;
    
    // Last known status
    this.lastStatus = null;
    
    // Whether a warning has been shown
    this.warningShown = false;
    
    this.logger.debug('TokenStatusProvider created', {
      updateInterval: this.options.updateInterval,
      showExpirationWarning: this.options.showExpirationWarning,
      warningThreshold: this.options.warningThreshold
    });
  }
  
  /**
   * Start monitoring token status
   */
  startStatusMonitoring() {
    this.logger.debug('Starting token status monitoring');
    
    // Clear any existing timer
    this.stopStatusMonitoring();
    
    // Update status immediately
    this.updateTokenStatus();
    
    // Set up timer for regular updates
    this.updateTimer = setInterval(() => {
      this.updateTokenStatus();
    }, this.options.updateInterval);
    
    // Set up token service event listeners
    this.tokenService.onTokenRefresh(() => {
      this.logger.debug('Token refresh event received');
      this.updateTokenStatus();
    });
    
    this.tokenService.onTokenExpired(() => {
      this.logger.debug('Token expired event received');
      this.updateTokenStatus();
    });
    
    this.tokenService.onTokenError(() => {
      this.logger.debug('Token error event received');
      this.updateTokenStatus();
    });
    
    this.logger.info('Token status monitoring started');
  }
  
  /**
   * Stop monitoring token status
   */
  stopStatusMonitoring() {
    this.logger.debug('Stopping token status monitoring');
    
    // Clear update timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.logger.info('Token status monitoring stopped');
  }
  
  /**
   * Update the token status display
   */
  async updateTokenStatus() {
    try {
      this.logger.debug('Updating token status display');
      
      // Get current token status
      const status = await this.tokenService.getTokenStatus();
      
      // Update status element if available
      this.updateStatusElement(status);
      
      // Update countdown if available
      this.updateCountdownElement();
      
      // Show warnings if needed
      if (status !== this.lastStatus) {
        this.handleStatusChange(status);
        this.lastStatus = status;
      }
      
      this.logger.debug('Token status display updated', { status });
    } catch (error) {
      this.logger.error('Failed to update token status display', { error });
    }
  }
  
  /**
   * Update the status element
   * @param {TokenStatus} status - The current token status
   * @private
   */
  updateStatusElement(status) {
    try {
      const statusElement = document.getElementById(this.options.statusElementId);
      
      if (!statusElement) {
        this.logger.debug('Status element not found', { elementId: this.options.statusElementId });
        return;
      }
      
      // Clear existing classes
      statusElement.classList.remove('valid', 'expiring', 'expired', 'refreshing', 'error', 'none');
      
      // Add appropriate class and text
      switch (status) {
        case TokenStatus.VALID:
          statusElement.classList.add('valid');
          statusElement.textContent = 'Token Valid';
          break;
        case TokenStatus.EXPIRING_SOON:
          statusElement.classList.add('expiring');
          statusElement.textContent = 'Token Expiring Soon';
          break;
        case TokenStatus.EXPIRED:
          statusElement.classList.add('expired');
          statusElement.textContent = 'Token Expired';
          break;
        case TokenStatus.REFRESHING:
          statusElement.classList.add('refreshing');
          statusElement.textContent = 'Refreshing Token...';
          break;
        case TokenStatus.ERROR:
          statusElement.classList.add('error');
          statusElement.textContent = 'Token Error';
          break;
        case TokenStatus.NONE:
          statusElement.classList.add('none');
          statusElement.textContent = 'No Token';
          break;
      }
      
      this.logger.debug('Status element updated', { status });
    } catch (error) {
      this.logger.error('Failed to update status element', { error });
    }
  }
  
  /**
   * Update the countdown element
   * @private
   */
  async updateCountdownElement() {
    try {
      const countdownElement = document.getElementById(this.options.countdownElementId);
      
      if (!countdownElement) {
        this.logger.debug('Countdown element not found', { elementId: this.options.countdownElementId });
        return;
      }
      
      // Get token info
      const tokenInfo = await this.tokenService.getTokenInfo();
      
      if (!tokenInfo || !tokenInfo.expiresAt) {
        countdownElement.textContent = 'N/A';
        return;
      }
      
      // Calculate remaining time
      const remainingTime = getTokenRemainingTime(tokenInfo);
      
      // Format and display
      countdownElement.textContent = formatRemainingTime(remainingTime);
      
      // Add appropriate class
      countdownElement.classList.remove('warning', 'critical');
      
      if (remainingTime <= 60) { // 1 minute
        countdownElement.classList.add('critical');
      } else if (remainingTime <= this.options.warningThreshold) {
        countdownElement.classList.add('warning');
      }
      
      this.logger.debug('Countdown element updated', { remainingTime });
    } catch (error) {
      this.logger.error('Failed to update countdown element', { error });
    }
  }
  
  /**
   * Handle a status change
   * @param {TokenStatus} status - The new status
   * @private
   */
  handleStatusChange(status) {
    this.logger.debug('Handling status change', { status });
    
    switch (status) {
      case TokenStatus.EXPIRING_SOON:
        if (this.options.showExpirationWarning && !this.warningShown) {
          this.showTokenExpirationWarning();
          this.warningShown = true;
        }
        break;
      case TokenStatus.EXPIRED:
        this.showTokenExpiredError();
        this.warningShown = false;
        break;
      case TokenStatus.VALID:
        // Reset warning flag when token becomes valid again
        this.warningShown = false;
        break;
    }
  }
  
  /**
   * Show a warning that the token is expiring soon
   */
  async showTokenExpirationWarning() {
    try {
      this.logger.debug('Showing token expiration warning');
      
      // Get token info
      const tokenInfo = await this.tokenService.getTokenInfo();
      
      if (!tokenInfo || !tokenInfo.expiresAt) {
        return;
      }
      
      // Calculate remaining time
      const remainingTime = getTokenRemainingTime(tokenInfo);
      const formattedTime = formatRemainingTime(remainingTime);
      
      // Show warning notification
      this.uiManager.showNotification(
        `Your authentication token will expire in ${formattedTime}. Please save your work.`,
        {
          type: 'warning',
          duration: 10000, // 10 seconds
          title: 'Token Expiring Soon'
        }
      );
      
      this.logger.info('Token expiration warning shown', { remainingTime });
    } catch (error) {
      this.logger.error('Failed to show token expiration warning', { error });
    }
  }
  
  /**
   * Show an error that the token has expired
   */
  showTokenExpiredError() {
    try {
      this.logger.debug('Showing token expired error');
      
      // Show error notification
      this.uiManager.showNotification(
        'Your authentication token has expired. Please refresh the token to continue.',
        {
          type: 'error',
          duration: 0, // Don't auto-dismiss
          title: 'Token Expired',
          actions: [
            {
              label: 'Refresh Token',
              callback: async () => {
                try {
                  await this.tokenService.refreshToken();
                } catch (error) {
                  this.logger.error('Failed to refresh token from notification', { error });
                  this.uiManager.showError('Failed to refresh token', error.message);
                }
              }
            }
          ]
        }
      );
      
      this.logger.info('Token expired error shown');
    } catch (error) {
      this.logger.error('Failed to show token expired error', { error });
    }
  }
  
  /**
   * Show that a token refresh is in progress
   */
  showTokenRefreshInProgress() {
    try {
      this.logger.debug('Showing token refresh in progress');
      
      // Update status element if available
      const statusElement = document.getElementById(this.options.statusElementId);
      
      if (statusElement) {
        statusElement.classList.remove('valid', 'expiring', 'expired', 'error', 'none');
        statusElement.classList.add('refreshing');
        statusElement.textContent = 'Refreshing Token...';
      }
      
      this.logger.info('Token refresh in progress shown');
    } catch (error) {
      this.logger.error('Failed to show token refresh in progress', { error });
    }
  }
  
  /**
   * Show that a token refresh was successful
   */
  async showTokenRefreshSuccess() {
    try {
      this.logger.debug('Showing token refresh success');
      
      // Update status immediately
      await this.updateTokenStatus();
      
      // Show success notification
      this.uiManager.showNotification(
        'Your authentication token has been refreshed successfully.',
        {
          type: 'success',
          duration: 5000, // 5 seconds
          title: 'Token Refreshed'
        }
      );
      
      this.logger.info('Token refresh success shown');
    } catch (error) {
      this.logger.error('Failed to show token refresh success', { error });
    }
  }
  
  /**
   * Show that a token refresh failed
   * @param {Error} error - The error that occurred
   */
  showTokenRefreshError(error) {
    try {
      this.logger.debug('Showing token refresh error', { error });
      
      // Show error notification
      this.uiManager.showNotification(
        `Failed to refresh token: ${error.message}. Please try again or re-authenticate.`,
        {
          type: 'error',
          duration: 0, // Don't auto-dismiss
          title: 'Token Refresh Failed',
          actions: [
            {
              label: 'Try Again',
              callback: async () => {
                try {
                  await this.tokenService.refreshToken();
                } catch (refreshError) {
                  this.logger.error('Failed to refresh token from notification', { error: refreshError });
                  this.uiManager.showError('Failed to refresh token', refreshError.message);
                }
              }
            },
            {
              label: 'Re-authenticate',
              callback: () => {
                // Clear token and redirect to login
                this.tokenService.clearToken().then(() => {
                  window.location.reload();
                });
              }
            }
          ]
        }
      );
      
      this.logger.info('Token refresh error shown', { error });
    } catch (showError) {
      this.logger.error('Failed to show token refresh error', { error: showError });
    }
  }
}

/**
 * Create a TokenStatusProvider with the given dependencies
 * @param {import('./token-service.js').TokenService} tokenService - The token service
 * @param {Object} uiManager - UI manager for notifications
 * @param {Object} [logger] - Logger instance
 * @param {TokenStatusProviderOptions} [options] - Provider options
 * @returns {TokenStatusProvider} The token status provider
 */
export function createTokenStatusProvider(tokenService, uiManager, logger, options) {
  return new TokenStatusProvider(tokenService, uiManager, logger, options);
}