/**
 * Token Notification Subsystem
 * Handles user notifications for invalid/missing tokens and disabled functionality
 */

import { createLogger } from '../utils/winston-logger.js';

export class TokenNotificationSubsystem {
    constructor(logger, eventBus, navigationSubsystem) {
        this.logger = logger || createLogger({
            serviceName: 'token-notification-subsystem',
            environment: 'development'
        });
        
        this.eventBus = eventBus;
        this.navigationSubsystem = navigationSubsystem;
        this.isInitialized = false;
        this.isDestroyed = false;
        
        // Notification state
        this.currentNotification = null;
        this.notificationElement = null;
        this.lastTokenCheck = null;
        this.checkInterval = null;
        
        this.logger.info('Token Notification Subsystem initialized');
    }

    /**
     * Initialize the subsystem
     */
    async init() {
        if (this.isInitialized || this.isDestroyed) {
            return;
        }

        try {
            this.logger.debug('Initializing Token Notification Subsystem...');
            
            // Create notification container
            this.createNotificationContainer();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start token monitoring
            this.startTokenMonitoring();
            
            // Initial token check
            this.checkTokenStatus();
            
            this.isInitialized = true;
            this.eventBus.emit('tokenNotification:initialized');
            this.logger.info('Token Notification Subsystem initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Token Notification Subsystem', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Destroy the subsystem
     */
    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.logger.debug('Destroying Token Notification Subsystem...');
        
        // Clear monitoring
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        // Remove notification
        this.hideNotification();
        
        // Remove notification container
        if (this.notificationElement) {
            this.notificationElement.remove();
            this.notificationElement = null;
        }
        
        // Mark as destroyed
        this.isDestroyed = true;
        this.isInitialized = false;
        
        this.logger.info('Token Notification Subsystem destroyed');
    }

    /**
     * Create notification container in DOM
     */
    createNotificationContainer() {
        // Remove existing container if it exists
        const existing = document.getElementById('token-notification-container');
        if (existing) {
            existing.remove();
        }
        
        // Create new container
        this.notificationElement = document.createElement('div');
        this.notificationElement.id = 'token-notification-container';
        this.notificationElement.className = 'token-notification-container';
        this.notificationElement.style.display = 'none';
        
        // Insert at top of main content area
        const mainContent = document.querySelector('.main-content') || document.body;
        mainContent.insertBefore(this.notificationElement, mainContent.firstChild);
        
        this.logger.debug('Token notification container created');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for token events
        this.eventBus.on('token:refreshed', () => {
            this.logger.debug('Token refreshed event received');
            this.checkTokenStatus();
        });
        
        this.eventBus.on('token:expired', () => {
            this.logger.debug('Token expired event received');
            this.showTokenExpiredNotification();
        });
        
        this.eventBus.on('token:error', () => {
            this.logger.debug('Token error event received');
            this.showTokenErrorNotification();
        });
        
        // Listen for settings changes
        this.eventBus.on('settings:updated', () => {
            this.logger.debug('Settings updated event received');
            this.checkTokenStatus();
        });
        
        this.logger.debug('Token notification event listeners set up');
    }

    /**
     * Start token monitoring
     */
    startTokenMonitoring() {
        // Check token status every 30 seconds
        this.checkInterval = setInterval(() => {
            this.checkTokenStatus();
        }, 30000);
        
        this.logger.debug('Token monitoring started');
    }

    /**
     * Check current token status and show appropriate notification
     * Coordinates with Global Token Manager to avoid conflicting messages
     */
    checkTokenStatus() {
        try {
            // First check if Global Token Manager is handling this
            if (window.app && window.app.subsystems && window.app.subsystems.globalTokenManager) {
                const globalTokenInfo = window.app.subsystems.globalTokenManager.getTokenInfoSync();
                
                // If global token manager says token is valid, trust it and hide our notifications
                if (globalTokenInfo && globalTokenInfo.hasToken && globalTokenInfo.timeLeft > 0) {
                    this.hideNotification();
                    this.lastTokenCheck = Date.now();
                    return;
                }
            }
            
            // Fallback to our own token checking if global manager not available
            const tokenInfo = this.getTokenInfo();
            
            if (!tokenInfo.hasToken) {
                this.showNoTokenNotification();
            } else if (tokenInfo.timeLeft <= 0) {
                this.showTokenExpiredNotification();
            } else if (tokenInfo.timeLeft <= 300) { // 5 minutes
                this.showTokenExpiringNotification(tokenInfo.timeLeft);
            } else {
                // Token is valid - hide notification
                this.hideNotification();
            }
            
            this.lastTokenCheck = Date.now();
            
        } catch (error) {
            this.logger.error('Error checking token status', {
                error: error.message
            });
            // Only show error notification if global token manager is not handling it
            if (!window.app?.subsystems?.globalTokenManager) {
                this.showTokenErrorNotification();
            }
        }
    }

    /**
     * Get token information from localStorage
     */
    getTokenInfo() {
        try {
            const token = localStorage.getItem('pingone_worker_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (!token || !expiry) {
                return { hasToken: false, timeLeft: 0 };
            }
            
            const expiryTime = parseInt(expiry, 10);
            const currentTime = Math.floor(Date.now() / 1000);
            const timeLeft = expiryTime - currentTime;
            
            return {
                hasToken: true,
                timeLeft: Math.max(0, timeLeft),
                token: token.substring(0, 20) + '...' // Truncated for logging
            };
            
        } catch (error) {
            this.logger.error('Error getting token info', {
                error: error.message
            });
            return { hasToken: false, timeLeft: 0 };
        }
    }

    /**
     * Show notification for missing token
     */
    showNoTokenNotification() {
        const message = `
            <div class="token-notification-content">
                <div class="token-notification-icon">🔒</div>
                <div class="token-notification-text">
                    <h4>Authentication Required</h4>
                    <p>No valid PingOne token found. Most functionality is disabled until you authenticate.</p>
                    <p><strong>What you can do:</strong></p>
                    <ul>
                        <li>Go to <strong>Settings</strong> to configure your PingOne credentials</li>
                        <li>Use the <strong>Get Token</strong> button to authenticate</li>
                        <li>Check the token status widget in the sidebar</li>
                    </ul>
                </div>
                <div class="token-notification-actions">
                    <button id="go-to-settings-btn" class="btn btn-primary btn-sm">Go to Settings</button>
                    <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="btn btn-secondary btn-sm">Dismiss</button>
                </div>
            </div>
        `;
        
        this.showNotification(message, 'no-token');
    }

    /**
     * Show notification for expired token
     */
    showTokenExpiredNotification() {
        const message = `
            <div class="token-notification-content">
                <div class="token-notification-icon">⏰</div>
                <div class="token-notification-text">
                    <h4>Token Expired</h4>
                    <p>Your PingOne authentication token has expired. Please get a new token to continue using the application.</p>
                </div>
                <div class="token-notification-actions">
                    <button onclick="window.app?.subsystems?.globalTokenManager?.refreshToken?.()" class="btn btn-warning btn-sm">Refresh Token</button>
                    <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="btn btn-secondary btn-sm">Dismiss</button>
                </div>
            </div>
        `;
        
        this.showNotification(message, 'expired-token');
    }

    /**
     * Show notification for expiring token
     */
    showTokenExpiringNotification(timeLeft) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        
        const message = `
            <div class="token-notification-content">
                <div class="token-notification-icon">⚠️</div>
                <div class="token-notification-text">
                    <h4>Token Expiring Soon</h4>
                    <p>Your PingOne token will expire in <strong>${timeString}</strong>. Consider refreshing it to avoid interruption.</p>
                </div>
                <div class="token-notification-actions">
                    <button onclick="window.app?.subsystems?.globalTokenManager?.refreshToken?.()" class="btn btn-warning btn-sm">Refresh Now</button>
                    <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="btn btn-secondary btn-sm">Dismiss</button>
                </div>
            </div>
        `;
        
        this.showNotification(message, 'expiring-token');
    }

    /**
     * Show notification for token error
     */
    showTokenErrorNotification() {
        const message = `
            <div class="token-notification-content">
                <div class="token-notification-icon">❌</div>
                <div class="token-notification-text">
                    <h4>Token Error</h4>
                    <p>There was an error with your authentication token. Please check your settings and try again.</p>
                </div>
                <div class="token-notification-actions">
                    <button onclick="window.location.hash='settings'" class="btn btn-primary btn-sm">Check Settings</button>
                    <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="btn btn-secondary btn-sm">Dismiss</button>
                </div>
            </div>
        `;
        
        this.showNotification(message, 'error-token');
    }

    /**
     * Show notification with given content and type
     */
    showNotification(content, type) {
        if (!this.notificationElement) {
            this.logger.warn('Notification element not available');
            return;
        }
        
        // Don't show the same notification repeatedly
        if (this.currentNotification === type) {
            return;
        }
        
        this.notificationElement.innerHTML = content;
        this.notificationElement.className = `token-notification-container ${type}`;
        this.notificationElement.style.display = 'block';
        
        this.currentNotification = type;

        this.logger.debug('Token notification shown', { type });

        // Add event listener for the 'Go to Settings' button if it exists
        const goToSettingsBtn = this.notificationElement.querySelector('#go-to-settings-btn');
        if (goToSettingsBtn) {
            goToSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.navigationSubsystem) {
                    this.navigationSubsystem.navigateToView('settings');
                } else {
                    this.logger.error('NavigationSubsystem not available.');
                    // Fallback for safety
                    window.location.hash = 'settings';
                }
            });
        }
    }

    /**
     * Hide current notification
     */
    hideNotification() {
        if (this.notificationElement) {
            this.notificationElement.style.display = 'none';
            this.notificationElement.innerHTML = '';
        }
        
        this.currentNotification = null;
        this.logger.debug('Token notification hidden');
    }
}

export default TokenNotificationSubsystem;
