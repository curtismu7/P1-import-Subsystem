/**
 * Enhanced Token Status Subsystem
 * 
 * Modern token status management with better UI updates and styling
 */

import { createLogger } from '../utils/browser-logging-service.js';

export class EnhancedTokenStatusSubsystem {
    constructor(logger, eventBus, uiManager) {
        this.logger = logger || createLogger({
            serviceName: 'enhanced-token-status-subsystem',
            enableServer: true
        });
        
        this.eventBus = eventBus;
        this.uiManager = uiManager;
        
        // Token state
        this.tokenInfo = {
            isValid: false,
            expiresAt: null,
            expiresIn: 0,
            tokenType: 'Bearer',
            lastChecked: null
        };
        
        // UI elements
        this.statusElements = {};
        
        // Update intervals
        this.statusCheckInterval = null;
        this.uiUpdateInterval = null;
        
        // Configuration
        this.CHECK_INTERVAL = 30000; // 30 seconds
        this.UI_UPDATE_INTERVAL = 1000; // 1 second for countdown
        
        this.logger.info('🔑 Enhanced Token Status Subsystem initialized');
    }
    
    /**
     * Initialize the subsystem
     */
    async init() {
        try {
            this.logger.debug('🔑 Initializing Enhanced Token Status Subsystem...');
            
            // Find and cache UI elements
            this.cacheUIElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start monitoring
            this.startMonitoring();
            
            // Initial token check
            await this.checkTokenStatus();
            
            this.logger.info('🔑 Enhanced Token Status Subsystem initialized successfully');
            
        } catch (error) {
            this.logger.error('🔑 Failed to initialize Enhanced Token Status Subsystem', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Cache UI elements for faster updates
     */
    cacheUIElements() {
        // Global token status in sidebar
        const globalTokenStatus = document.getElementById('global-token-status');
        if (globalTokenStatus) {
            this.statusElements.global = {
                container: globalTokenStatus,
                icon: globalTokenStatus.querySelector('.global-token-icon'),
                text: globalTokenStatus.querySelector('.global-token-text'),
                countdown: globalTokenStatus.querySelector('.global-token-countdown'),
                indicator: document.getElementById('token-status-indicator'),
                refreshButton: document.getElementById('global-refresh-token'),
                getTokenButton: document.getElementById('global-get-token')
            };
        }
        
        // Token status indicators in other locations
        const indicators = document.querySelectorAll('.token-status-indicator');
        indicators.forEach((indicator, index) => {
            this.statusElements[`indicator_${index}`] = {
                container: indicator,
                icon: indicator.querySelector('.token-status-icon'),
                text: indicator.querySelector('.token-status-text'),
                time: indicator.querySelector('.token-status-time'),
                actions: indicator.querySelector('.token-status-actions')
            };
        });
        
        this.logger.debug('🔑 UI elements cached', {
            globalStatus: !!this.statusElements.global,
            indicators: Object.keys(this.statusElements).filter(k => k.startsWith('indicator_')).length
        });
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for token events
        this.eventBus.on('token:refreshed', (data) => {
            this.logger.info('🔑 TOKEN: Token refreshed event received', data);
            this.handleTokenRefreshed(data);
        });
        
        this.eventBus.on('token:expired', (data) => {
            this.logger.warn('🔑 TOKEN: Token expired event received', data);
            this.handleTokenExpired(data);
        });
        
        this.eventBus.on('token:error', (data) => {
            this.logger.error('🔑 TOKEN: Token error event received', data);
            this.handleTokenError(data);
        });
        
        this.eventBus.on('token:obtained', (data) => {
            this.logger.info('🔑 TOKEN: Token obtained event received', data);
            this.handleTokenObtained(data);
        });
        
        // Listen for settings changes
        this.eventBus.on('settings:updated', () => {
            this.logger.debug('🔑 Settings updated, checking token status');
            this.checkTokenStatus();
        });
        
        // Set up button event listeners
        this.setupButtonListeners();
        
        this.logger.debug('🔑 Event listeners set up');
    }
    
    /**
     * Set up button event listeners
     */
    setupButtonListeners() {
        // Global refresh button
        if (this.statusElements.global?.refreshButton) {
            this.statusElements.global.refreshButton.addEventListener('click', () => {
                this.logger.info('🔑 TOKEN: Refresh button clicked');
                this.refreshToken();
            });
        }
        
        // Global get token button
        if (this.statusElements.global?.getTokenButton) {
            this.statusElements.global.getTokenButton.addEventListener('click', () => {
                this.logger.info('🔑 TOKEN: Get token button clicked');
                this.getNewToken();
            });
        }
        
        this.logger.debug('🔑 Button listeners set up');
    }
    
    /**
     * Start monitoring token status
     */
    startMonitoring() {
        // Fixed token status update interval - more frequent checks
        // Check token status more frequently
        this.statusCheckInterval = setInterval(() => {
            this.checkTokenStatus();
        }, 10000); // Check every 10 seconds instead of 30
        
        // Update UI countdown every second
        this.uiUpdateInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
        
        this.logger.debug('🔑 Token monitoring started with improved frequency');
    }, this.CHECK_INTERVAL);
        
        // Update UI countdown every second
        this.uiUpdateInterval = setInterval(() => {
            this.updateCountdown();
        }, this.UI_UPDATE_INTERVAL);
        
        this.logger.debug('🔑 Token monitoring started');
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        
        if (this.uiUpdateInterval) {
            clearInterval(this.uiUpdateInterval);
            this.uiUpdateInterval = null;
        }
        
        this.logger.debug('🔑 Token monitoring stopped');
    }
    
    /**
     * Check current token status
     */
    async checkTokenStatus() {
        try {
            this.logger.debug('🔑 Checking token status...');
            
            // Try to get token info from various sources
            const tokenInfo = await this.getTokenInfo();
            
            // Update internal state
            this.tokenInfo = {
                ...this.tokenInfo,
                ...tokenInfo,
                lastChecked: Date.now()
            };
            
            // Update UI
            this.updateUI();
            
            // Log token status
            this.logTokenStatus();
            
            // Emit event
            this.eventBus.emit('token-status:updated', this.tokenInfo);
            
        } catch (error) {
            this.logger.error('🔑 Error checking token status', {
                error: error.message
            });
            
            // Set error state
            this.tokenInfo = {
                ...this.tokenInfo,
                isValid: false,
                error: error.message,
                lastChecked: Date.now()
            };
            
            this.updateUI();
        }
    }
    
    /**
     * Get token information from various sources
     */
    async getTokenInfo() {
        // Try to get from global token manager first
        if (window.app?.subsystems?.globalTokenManager) {
            try {
                const status = window.app.subsystems.globalTokenManager.getTokenStatus();
                if (status) {
                    return {
                        isValid: status.isValid,
                        expiresAt: status.expiresAt,
                        expiresIn: status.expiresIn,
                        tokenType: status.tokenType || 'Bearer'
                    };
                }
            } catch (error) {
                this.logger.debug('🔑 Could not get status from global token manager', error);
            }
        }
        
        // Try to get from token manager
        if (window.app?.tokenManager) {
            try {
                const status = window.app.tokenManager.getTokenStatus();
                if (status) {
                    return {
                        isValid: status.isValid,
                        expiresAt: status.expiresAt,
                        expiresIn: status.expiresIn,
                        tokenType: status.tokenType || 'Bearer'
                    };
                }
            } catch (error) {
                this.logger.debug('🔑 Could not get status from token manager', error);
            }
        }
        
        // Try to get from localStorage
        try {
            const token = localStorage.getItem('pingone_worker_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (token && expiry) {
                const expiryTime = parseInt(expiry, 10);
                const currentTime = Math.floor(Date.now() / 1000);
                const expiresIn = Math.max(0, expiryTime - currentTime);
                
                return {
                    isValid: expiresIn > 0,
                    expiresAt: new Date(expiryTime * 1000).toISOString(),
                    expiresIn: expiresIn,
                    tokenType: 'Bearer'
                };
            }
        } catch (error) {
            this.logger.debug('🔑 Could not get token from localStorage', error);
        }
        
        // Default to no token
        return {
            isValid: false,
            expiresAt: null,
            expiresIn: 0,
            tokenType: 'Bearer'
        };
    }
    
    /**
     * Update UI elements
     */
    updateUI() {
        const status = this.determineStatus();
        
        // Update global token status
        if (this.statusElements.global) {
            this.updateGlobalStatus(status);
        }
        
        // Update other indicators
        Object.keys(this.statusElements).forEach(key => {
            if (key.startsWith('indicator_')) {
                this.updateIndicator(this.statusElements[key], status);
            }
        });
        
        this.logger.debug('🔑 UI updated', { status: status.type });
    }
    
    /**
     * Determine current status type and styling
     */
    determineStatus() {
        if (this.tokenInfo.error) {
            return {
                type: 'error',
                icon: '❌',
                text: 'Token Error',
                className: 'error',
                color: '#dc3545'
            };
        }
        
        if (!this.tokenInfo.isValid || this.tokenInfo.expiresIn <= 0) {
            return {
                type: 'expired',
                icon: '🔒',
                text: 'Token Expired',
                className: 'expired',
                color: '#dc3545'
            };
        }
        
        if (this.tokenInfo.expiresIn <= 300) { // 5 minutes
            return {
                type: 'expiring',
                icon: '⚠️',
                text: 'Token Expiring',
                className: 'expiring',
                color: '#ffc107'
            };
        }
        
        return {
            type: 'valid',
            icon: '✅',
            text: 'Token Valid',
            className: 'valid',
            color: '#28a745'
        };
    }
    
    /**
     * Update global token status in sidebar
     */
    updateGlobalStatus(status) {
        const elements = this.statusElements.global;
        if (!elements) return;
        
        // Update container class
        if (elements.container) {
            elements.container.className = `global-token-status ${status.className}`;
        }
        
        // Update icon
        if (elements.icon) {
            elements.icon.textContent = status.icon;
        }
        
        // Update text
        if (elements.text) {
            elements.text.textContent = status.text;
        }
        
        // Update countdown
        if (elements.countdown) {
            if (this.tokenInfo.isValid && this.tokenInfo.expiresIn > 0) {
                const minutes = Math.floor(this.tokenInfo.expiresIn / 60);
                elements.countdown.textContent = `${minutes}m`;
            } else {
                elements.countdown.textContent = '';
            }
        }
        
        // Update indicator dot
        if (elements.indicator) {
            elements.indicator.className = `token-status-indicator ${status.className}`;
            elements.indicator.style.color = status.color;
            elements.indicator.textContent = '●';
            elements.indicator.title = `${status.text} - ${this.formatTimeRemaining()}`;
        }
        
        // Show/hide buttons based on status
        if (elements.refreshButton) {
            elements.refreshButton.style.display = this.tokenInfo.isValid ? 'inline-block' : 'none';
        }
        
        if (elements.getTokenButton) {
            elements.getTokenButton.style.display = !this.tokenInfo.isValid ? 'inline-block' : 'none';
        }
    }
    
    /**
     * Update indicator element
     */
    updateIndicator(elements, status) {
        if (!elements || !elements.container) return;
        
        // Update container class
        elements.container.className = `token-status-indicator ${status.className}`;
        
        // Update icon
        if (elements.icon) {
            elements.icon.textContent = status.icon;
        }
        
        // Update text
        if (elements.text) {
            elements.text.textContent = status.text;
        }
        
        // Update time
        if (elements.time) {
            elements.time.textContent = this.formatTimeRemaining();
        }
    }
    
    /**
     * Update countdown display
     */
    updateCountdown() {
        if (!this.tokenInfo.isValid || this.tokenInfo.expiresIn <= 0) return;
        
        // Recalculate time remaining
        if (this.tokenInfo.expiresAt) {
            const expiryTime = new Date(this.tokenInfo.expiresAt).getTime();
            const currentTime = Date.now();
            const expiresIn = Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
            
            this.tokenInfo.expiresIn = expiresIn;
            
            // Update countdown in global status
            if (this.statusElements.global?.countdown) {
                const minutes = Math.floor(expiresIn / 60);
                this.statusElements.global.countdown.textContent = expiresIn > 0 ? `${minutes}m` : '';
            }
            
            // Update time in indicators
            Object.keys(this.statusElements).forEach(key => {
                if (key.startsWith('indicator_') && this.statusElements[key].time) {
                    this.statusElements[key].time.textContent = this.formatTimeRemaining();
                }
            });
            
            // Check if token expired
            if (expiresIn <= 0 && this.tokenInfo.isValid) {
                this.handleTokenExpired();
            }
        }
    }
    
    /**
     * Format time remaining for display
     */
    formatTimeRemaining() {
        if (!this.tokenInfo.isValid || this.tokenInfo.expiresIn <= 0) {
            return 'Expired';
        }
        
        const minutes = Math.floor(this.tokenInfo.expiresIn / 60);
        const seconds = this.tokenInfo.expiresIn % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    /**
     * Log current token status
     */
    logTokenStatus() {
        const logData = {
            isValid: this.tokenInfo.isValid,
            expiresIn: this.tokenInfo.expiresIn,
            expiresInMinutes: Math.floor(this.tokenInfo.expiresIn / 60),
            expiresAt: this.tokenInfo.expiresAt,
            tokenType: this.tokenInfo.tokenType,
            lastChecked: new Date(this.tokenInfo.lastChecked).toISOString()
        };
        
        if (this.tokenInfo.isValid) {
            this.logger.info('🔑 TOKEN: Token status check - Valid', logData);
        } else {
            this.logger.warn('🔑 TOKEN: Token status check - Invalid', logData);
        }
    }
    
    /**
     * Handle token refreshed event
     */
    handleTokenRefreshed(data) {
        this.tokenInfo = {
            ...this.tokenInfo,
            isValid: true,
            expiresIn: data.expiresIn || 3600,
            expiresAt: data.expiresAt || new Date(Date.now() + (data.expiresIn || 3600) * 1000).toISOString(),
            tokenType: data.tokenType || 'Bearer',
            error: null,
            lastChecked: Date.now()
        };
        
        this.updateUI();
        
        this.logger.info('🔑 TOKEN: Token refreshed successfully', {
            expiresIn: this.tokenInfo.expiresIn,
            expiresInMinutes: Math.floor(this.tokenInfo.expiresIn / 60)
        });
    }
    
    /**
     * Handle token expired event
     */
    handleTokenExpired(data) {
        this.tokenInfo = {
            ...this.tokenInfo,
            isValid: false,
            expiresIn: 0,
            error: 'Token expired',
            lastChecked: Date.now()
        };
        
        this.updateUI();
        
        this.logger.warn('🔑 TOKEN: Token expired', data);
    }
    
    /**
     * Handle token error event
     */
    handleTokenError(data) {
        this.tokenInfo = {
            ...this.tokenInfo,
            isValid: false,
            error: data.error || 'Token error',
            lastChecked: Date.now()
        };
        
        this.updateUI();
        
        this.logger.error('🔑 TOKEN: Token error', data);
    }
    
    /**
     * Handle token obtained event
     */
    handleTokenObtained(data) {
        this.tokenInfo = {
            ...this.tokenInfo,
            isValid: true,
            expiresIn: data.expiresIn || 3600,
            expiresAt: data.expiresAt || new Date(Date.now() + (data.expiresIn || 3600) * 1000).toISOString(),
            tokenType: data.tokenType || 'Bearer',
            error: null,
            lastChecked: Date.now()
        };
        
        this.updateUI();
        
        this.logger.info('🔑 TOKEN: New token obtained', {
            expiresIn: this.tokenInfo.expiresIn,
            expiresInMinutes: Math.floor(this.tokenInfo.expiresIn / 60)
        });
    }
    
    /**
     * Refresh token
     */
    async refreshToken() {
        try {
            this.logger.info('🔑 TOKEN: Refreshing token...');
            
            // Try global token manager first
            if (window.app?.subsystems?.globalTokenManager?.refreshToken) {
                await window.app.subsystems.globalTokenManager.refreshToken();
                return;
            }
            
            // Try token manager
            if (window.app?.tokenManager?.refreshToken) {
                await window.app.tokenManager.refreshToken();
                return;
            }
            
            // Fallback to API call
            const response = await fetch('/api/pingone/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.handleTokenRefreshed(data);
            } else {
                throw new Error(`Token refresh failed: ${response.status}`);
            }
            
        } catch (error) {
            this.logger.error('🔑 TOKEN: Failed to refresh token', {
                error: error.message
            });
            this.handleTokenError({ error: error.message });
        }
    }
    
    /**
     * Get new token
     */
    async getNewToken() {
        try {
            this.logger.info('🔑 TOKEN: Getting new token...');
            
            // Navigate to settings or show credentials modal
            if (window.app?.subsystems?.navigation) {
                window.app.subsystems.navigation.navigateToView('settings');
            } else {
                // Fallback
                window.location.hash = 'settings';
            }
            
        } catch (error) {
            this.logger.error('🔑 TOKEN: Failed to get new token', {
                error: error.message
            });
        }
    }
    
    /**
     * Get current token status
     */
    getStatus() {
        return { ...this.tokenInfo };
    }
    
    /**
     * Destroy the subsystem
     */
    destroy() {
        this.stopMonitoring();
        this.statusElements = {};
        
        this.logger.info('🔑 Enhanced Token Status Subsystem destroyed');
    }
}

export default EnhancedTokenStatusSubsystem;