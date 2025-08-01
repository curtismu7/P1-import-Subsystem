/**
 * BulletproofTokenStatus - Enhanced token status display with robust error handling
 * 
 * Features:
 * - Visual indicators for token health and status
 * - Automatic status updates based on token events
 * - Comprehensive error handling with detailed logging
 * - Fallback mechanisms for graceful degradation
 * - Configurable display options for different UI contexts
 * 
 * Status: PRODUCTION READY - BULLETPROOF
 */

import logger from './logger.js';

class BulletproofTokenStatus {
    /**
     * Create a new BulletproofTokenStatus instance
     * @param {Object} options - Configuration options
     * @param {Object} options.tokenManager - Token manager instance
     * @param {Object} options.eventBus - Event bus for token events
     * @param {Object} options.logger - Logger instance
     * @param {boolean} options.showGreenBanner - Whether to show green banner for valid tokens
     * @param {boolean} options.showRedBanner - Whether to show red banner for invalid tokens
     * @param {boolean} options.autoRefresh - Whether to auto-refresh token status
     * @param {number} options.refreshInterval - Refresh interval in milliseconds
     */
    constructor(options = {}) {
        // Extract options with defaults
        const {
            tokenManager,
            eventBus,
            logger: customLogger,
            showGreenBanner = true,
            showRedBanner = true,
            autoRefresh = true,
            refreshInterval = 30000 // 30 seconds
        } = options;

        // Validate required options
        if (!tokenManager) {
            throw new Error('Token manager is required for BulletproofTokenStatus');
        }

        // Initialize properties
        this.logger = customLogger || logger;
        this.tokenManager = tokenManager;
        this.eventBus = eventBus;
        this.showGreenBanner = showGreenBanner;
        this.showRedBanner = showRedBanner;
        this.autoRefresh = autoRefresh;
        this.refreshInterval = refreshInterval;
        
        // State tracking
        this.statusElements = {
            greenBanner: null,
            redBanner: null,
            statusIndicator: null
        };
        this.refreshTimer = null;
        this.lastStatus = null;
        
        // Bind methods to ensure correct 'this' context
        this.updateStatus = this.updateStatus.bind(this);
        this.startAutoRefresh = this.startAutoRefresh.bind(this);
        this.stopAutoRefresh = this.stopAutoRefresh.bind(this);
        this.showBanner = this.showBanner.bind(this);
        this.hideBanner = this.hideBanner.bind(this);
        
        // Initialize event listeners
        this._initEventListeners();
        
        // Start auto-refresh if enabled
        if (this.autoRefresh) {
            this.startAutoRefresh();
        }
        
        // Initial status update
        this.updateStatus();
        
        this.logger.info('BulletproofTokenStatus initialized', {
            showGreenBanner,
            showRedBanner,
            autoRefresh,
            refreshInterval
        });
    }
    
    /**
     * Initialize event listeners for token events
     * @private
     */
    _initEventListeners() {
        if (!this.eventBus) {
            return;
        }
        
        // Listen for token refresh events
        this.eventBus.on('tokenRefreshed', () => {
            this.logger.info('Token refreshed event received');
            this.updateStatus();
        });
        
        // Listen for token error events
        this.eventBus.on('tokenError', () => {
            this.logger.warn('Token error event received');
            this.updateStatus();
        });
        
        // Listen for token health check events
        this.eventBus.on('tokenHealthCheck', () => {
            this.logger.debug('Token health check event received');
            this.updateStatus();
        });
    }
    
    /**
     * Start automatic status refresh
     * @param {number} interval - Refresh interval in milliseconds (optional)
     */
    startAutoRefresh(interval) {
        // Clear any existing timer
        this.stopAutoRefresh();
        
        // Set up new refresh timer
        const refreshMs = interval || this.refreshInterval;
        this.refreshTimer = setInterval(() => {
            this.updateStatus();
        }, refreshMs);
        
        this.logger.debug('Token status auto-refresh started', { intervalMs: refreshMs });
    }
    
    /**
     * Stop automatic status refresh
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            this.logger.debug('Token status auto-refresh stopped');
        }
    }
    
    /**
     * Update token status display
     * @returns {Object} Current token status
     */
    updateStatus() {
        try {
            // Get current token status
            const status = this.tokenManager.getTokenStatus();
            this.lastStatus = status;
            
            // Update UI based on status
            this._updateUI(status);
            
            return status;
        } catch (error) {
            this.logger.error('Error updating token status', { error: error.message });
            
            // Show error state in UI
            this._updateUI({ status: 'error', error: error.message });
            
            return { status: 'error', error: error.message };
        }
    }
    
    /**
     * Update UI elements based on token status
     * @param {Object} status - Token status object
     * @private
     */
    _updateUI(status) {
        switch (status.status) {
            case 'valid':
                // Show green banner for valid token
                if (this.showGreenBanner) {
                    this.showBanner('green', 'Token is valid', {
                        expiresAt: status.expiresAt,
                        expiresIn: this._formatTimeRemaining(status.expiresIn)
                    });
                }
                
                // Hide red banner
                this.hideBanner('red');
                
                // Update status indicator
                this._updateStatusIndicator('valid', 'Token is valid');
                break;
                
            case 'expiring-soon':
                // Show yellow/orange warning in green banner
                if (this.showGreenBanner) {
                    this.showBanner('green', 'Token is expiring soon', {
                        expiresAt: status.expiresAt,
                        expiresIn: this._formatTimeRemaining(status.expiresIn),
                        warning: true
                    });
                }
                
                // Hide red banner
                this.hideBanner('red');
                
                // Update status indicator
                this._updateStatusIndicator('warning', 'Token is expiring soon');
                break;
                
            case 'expired':
                // Hide green banner
                this.hideBanner('green');
                
                // Show red banner for expired token
                if (this.showRedBanner) {
                    this.showBanner('red', 'Token has expired', {
                        expiredAgo: this._formatTimeRemaining(status.expiredAgo)
                    });
                }
                
                // Update status indicator
                this._updateStatusIndicator('error', 'Token has expired');
                break;
                
            case 'no-token':
                // Hide green banner
                this.hideBanner('green');
                
                // Show red banner for no token
                if (this.showRedBanner) {
                    this.showBanner('red', 'No token available');
                }
                
                // Update status indicator
                this._updateStatusIndicator('error', 'No token available');
                break;
                
            case 'error':
                // Hide green banner
                this.hideBanner('green');
                
                // Show red banner for error
                if (this.showRedBanner) {
                    this.showBanner('red', 'Token error', {
                        error: status.error || 'Unknown error'
                    });
                }
                
                // Update status indicator
                this._updateStatusIndicator('error', 'Token error');
                break;
                
            default:
                // Hide all banners for unknown status
                this.hideBanner('green');
                this.hideBanner('red');
                
                // Update status indicator
                this._updateStatusIndicator('unknown', 'Unknown token status');
        }
    }
    
    /**
     * Show a status banner
     * @param {string} type - Banner type ('green' or 'red')
     * @param {string} message - Banner message
     * @param {Object} details - Additional details to display
     */
    showBanner(type, message, details = {}) {
        // Get or create banner element
        const banner = this._getBannerElement(type);
        if (!banner) return;
        
        // Set banner content
        let content = '';
        
        if (type === 'green') {
            // Green banner content
            content = `
                <div class="token-status-banner-content">
                    <div class="token-status-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="token-status-message">
                        <strong>${message}</strong>
                        ${details.expiresIn ? `<span>Expires in: ${details.expiresIn}</span>` : ''}
                    </div>
                    <div class="token-status-actions">
                        <button class="token-refresh-btn" title="Refresh Token">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="token-dismiss-btn" title="Dismiss">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Add warning class if token is expiring soon
            if (details.warning) {
                banner.classList.add('warning');
            } else {
                banner.classList.remove('warning');
            }
        } else {
            // Red banner content
            content = `
                <div class="token-status-banner-content">
                    <div class="token-status-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="token-status-message">
                        <strong>${message}</strong>
                        ${details.error ? `<span>Error: ${details.error}</span>` : ''}
                        ${details.expiredAgo ? `<span>Expired: ${details.expiredAgo} ago</span>` : ''}
                    </div>
                    <div class="token-status-actions">
                        <button class="token-refresh-btn" title="Refresh Token">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="token-dismiss-btn" title="Dismiss">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Set content
        banner.innerHTML = content;
        
        // Show banner
        banner.style.display = 'block';
        
        // Add event listeners
        const refreshBtn = banner.querySelector('.token-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this._handleRefreshClick();
            });
        }
        
        const dismissBtn = banner.querySelector('.token-dismiss-btn');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                this.hideBanner(type);
            });
        }
    }
    
    /**
     * Hide a status banner
     * @param {string} type - Banner type ('green' or 'red')
     */
    hideBanner(type) {
        const banner = this._getBannerElement(type, false);
        if (banner) {
            banner.style.display = 'none';
        }
    }
    
    /**
     * Update the status indicator element
     * @param {string} status - Status type ('valid', 'warning', 'error', 'unknown')
     * @param {string} message - Status message
     * @private
     */
    _updateStatusIndicator(status, message) {
        // Get or create status indicator
        const indicator = this._getStatusIndicator();
        if (!indicator) return;
        
        // Remove all status classes
        indicator.classList.remove('valid', 'warning', 'error', 'unknown');
        
        // Add current status class
        indicator.classList.add(status);
        
        // Update title attribute
        indicator.setAttribute('title', message);
        
        // Update content
        let iconClass = 'fa-question-circle';
        switch (status) {
            case 'valid':
                iconClass = 'fa-check-circle';
                break;
            case 'warning':
                iconClass = 'fa-exclamation-circle';
                break;
            case 'error':
                iconClass = 'fa-exclamation-triangle';
                break;
        }
        
        indicator.innerHTML = `<i class="fas ${iconClass}"></i>`;
    }
    
    /**
     * Get or create a banner element
     * @param {string} type - Banner type ('green' or 'red')
     * @param {boolean} create - Whether to create the element if it doesn't exist
     * @returns {HTMLElement} The banner element
     * @private
     */
    _getBannerElement(type, create = true) {
        const key = `${type}Banner`;
        
        // Return existing element if available
        if (this.statusElements[key]) {
            return this.statusElements[key];
        }
        
        // Don't create if not requested
        if (!create) {
            return null;
        }
        
        // Create new banner element
        const banner = document.createElement('div');
        banner.className = `token-status-banner ${type}-banner`;
        banner.id = `token-status-${type}-banner`;
        
        // Add styles
        this._addStyles();
        
        // Add to document
        document.body.insertBefore(banner, document.body.firstChild);
        
        // Store reference
        this.statusElements[key] = banner;
        
        return banner;
    }
    
    /**
     * Get or create status indicator element
     * @param {boolean} create - Whether to create the element if it doesn't exist
     * @returns {HTMLElement} The status indicator element
     * @private
     */
    _getStatusIndicator(create = true) {
        // Return existing element if available
        if (this.statusElements.statusIndicator) {
            return this.statusElements.statusIndicator;
        }
        
        // Don't create if not requested
        if (!create) {
            return null;
        }
        
        // Look for existing indicator in the DOM
        let indicator = document.getElementById('token-status-indicator');
        
        // Create new indicator if not found
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'token-status-indicator';
            indicator.className = 'token-status-indicator';
            
            // Add to document (in header or top-right corner)
            const header = document.querySelector('header') || document.body;
            header.appendChild(indicator);
        }
        
        // Add styles
        this._addStyles();
        
        // Store reference
        this.statusElements.statusIndicator = indicator;
        
        return indicator;
    }
    
    /**
     * Add required styles to the document
     * @private
     */
    _addStyles() {
        // Check if styles are already added
        if (document.getElementById('token-status-styles')) {
            return;
        }
        
        // Create style element
        const style = document.createElement('style');
        style.id = 'token-status-styles';
        
        // Add CSS
        style.textContent = `
            /* Token Status Banners */
            .token-status-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 9999;
                padding: 10px 20px;
                color: white;
                font-size: 14px;
                display: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .token-status-banner.green-banner {
                background-color: #4caf50;
                border-bottom: 2px solid #2e7d32;
            }
            
            .token-status-banner.green-banner.warning {
                background-color: #ff9800;
                border-bottom: 2px solid #ef6c00;
            }
            
            .token-status-banner.red-banner {
                background-color: #f44336;
                border-bottom: 2px solid #c62828;
            }
            
            .token-status-banner-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .token-status-icon {
                margin-right: 10px;
                font-size: 18px;
            }
            
            .token-status-message {
                flex: 1;
            }
            
            .token-status-message strong {
                margin-right: 10px;
            }
            
            .token-status-message span {
                opacity: 0.8;
                margin-left: 10px;
            }
            
            .token-status-actions {
                display: flex;
                gap: 10px;
            }
            
            .token-status-actions button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                opacity: 0.8;
                padding: 5px;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .token-status-actions button:hover {
                opacity: 1;
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            /* Token Status Indicator */
            .token-status-indicator {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background-color: #f5f5f5;
                color: #757575;
                font-size: 14px;
                cursor: pointer;
                margin: 0 5px;
            }
            
            .token-status-indicator.valid {
                background-color: #4caf50;
                color: white;
            }
            
            .token-status-indicator.warning {
                background-color: #ff9800;
                color: white;
            }
            
            .token-status-indicator.error {
                background-color: #f44336;
                color: white;
            }
            
            /* Animation for attention */
            @keyframes token-status-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .token-status-banner.attention {
                animation: token-status-pulse 1s ease-in-out;
            }
        `;
        
        // Add to document
        document.head.appendChild(style);
    }
    
    /**
     * Format time remaining in a human-readable format
     * @param {number} timeMs - Time in milliseconds
     * @returns {string} Formatted time string
     * @private
     */
    _formatTimeRemaining(timeMs) {
        if (!timeMs) return 'unknown';
        
        const seconds = Math.floor(timeMs / 1000);
        
        if (seconds < 60) {
            return `${seconds} seconds`;
        }
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        
        return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
    
    /**
     * Handle refresh button click
     * @private
     */
    _handleRefreshClick() {
        this.logger.info('Manual token refresh requested');
        
        // Show loading state
        const indicators = [
            this._getBannerElement('green', false),
            this._getBannerElement('red', false),
            this._getStatusIndicator(false)
        ].filter(Boolean);
        
        indicators.forEach(el => {
            const icon = el.querySelector('.fas');
            if (icon) {
                // Store original class
                const originalClass = icon.className;
                icon.dataset.originalClass = originalClass;
                
                // Replace with spinner
                icon.className = 'fas fa-spinner fa-spin';
            }
        });
        
        // Refresh token
        if (this.tokenManager && typeof this.tokenManager.refreshToken === 'function') {
            this.tokenManager.refreshToken()
                .then(() => {
                    this.logger.info('Manual token refresh successful');
                    this.updateStatus();
                })
                .catch(error => {
                    this.logger.error('Manual token refresh failed', { error: error.message });
                    this.updateStatus();
                })
                .finally(() => {
                    // Restore icons
                    indicators.forEach(el => {
                        const icon = el.querySelector('.fas');
                        if (icon && icon.dataset.originalClass) {
                            icon.className = icon.dataset.originalClass;
                            delete icon.dataset.originalClass;
                        }
                    });
                });
        } else {
            this.logger.warn('Token manager does not support refreshToken method');
            
            // Restore icons after a delay
            setTimeout(() => {
                indicators.forEach(el => {
                    const icon = el.querySelector('.fas');
                    if (icon && icon.dataset.originalClass) {
                        icon.className = icon.dataset.originalClass;
                        delete icon.dataset.originalClass;
                    }
                });
                
                this.updateStatus();
            }, 1000);
        }
    }
    
    /**
     * Clean up resources when component is no longer needed
     */
    dispose() {
        // Stop auto-refresh
        this.stopAutoRefresh();
        
        // Remove event listeners
        if (this.eventBus) {
            this.eventBus.off('tokenRefreshed', this.updateStatus);
            this.eventBus.off('tokenError', this.updateStatus);
            this.eventBus.off('tokenHealthCheck', this.updateStatus);
        }
        
        // Remove DOM elements
        Object.values(this.statusElements).forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        // Clear references
        this.statusElements = {
            greenBanner: null,
            redBanner: null,
            statusIndicator: null
        };
        
        this.logger.info('BulletproofTokenStatus disposed');
    }
}

/**
 * Create a new BulletproofTokenStatus instance
 * @param {Object} options - Configuration options
 * @returns {BulletproofTokenStatus} The token status instance
 */
export function createBulletproofTokenStatus(options) {
    return new BulletproofTokenStatus(options);
}

export default BulletproofTokenStatus;
