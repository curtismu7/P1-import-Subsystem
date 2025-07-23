/**
 * Global Token Manager Subsystem
 * 
 * Provides a prominent global token status display in the sidebar
 * with real-time countdown timer and enhanced visibility across all windows.
 * 
 * Follows the subsystem architecture pattern with proper lifecycle management,
 * EventBus integration, and consistent initialization.
 */

class GlobalTokenManagerSubsystem {
    constructor(logger, eventBus) {
        this.logger = logger || console;
        this.eventBus = eventBus;
        
        // Subsystem state
        this.isInitialized = false;
        this.isDestroyed = false;
        
        // Timer for updating token status
        this.globalTokenTimer = null;
        this.updateInterval = 1000; // 1 second
        
        // Bind methods
        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.updateGlobalTokenStatus = this.updateGlobalTokenStatus.bind(this);
        this.setupGlobalTokenEventListeners = this.setupGlobalTokenEventListeners.bind(this);
        this.startGlobalTokenTimer = this.startGlobalTokenTimer.bind(this);
        this.getNewToken = this.getNewToken.bind(this);
        
        this.logger.debug('Global Token Manager Subsystem created');
    }

    /**
     * Initialize the subsystem
     */
    async init() {
        if (this.isInitialized) {
            this.logger.warn('Global Token Manager Subsystem already initialized');
            return;
        }

        try {
            this.logger.info('Initializing Global Token Manager Subsystem...');
            
            // Wait for DOM to be ready and token status element to exist
            await this.waitForTokenStatusElement();
            
            // Prevent conflicts with other token status systems
            this.preventTokenStatusConflicts();
            
            // Set up event listeners
            this.setupGlobalTokenEventListeners();
            
            // Set up EventBus listeners
            this.setupEventBusListeners();
            
            // Start the update timer
            this.startGlobalTokenTimer();
            
            // Initial status update
            this.updateGlobalTokenStatus();
            
            this.isInitialized = true;
            this.logger.info('Global Token Manager Subsystem initialized successfully');
            
            // Emit initialization event
            if (this.eventBus) {
                this.eventBus.emit('globalTokenManager:initialized');
            }
            
        } catch (error) {
            this.logger.error('Failed to initialize Global Token Manager Subsystem', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Destroy the subsystem and clean up resources
     */
    async destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.logger.info('Destroying Global Token Manager Subsystem...');
        
        // Stop the timer
        if (this.globalTokenTimer) {
            clearInterval(this.globalTokenTimer);
            this.globalTokenTimer = null;
        }
        
        // Remove event listeners
        this.removeEventListeners();
        
        // Clean up DOM protection
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        
        // Restore original UIManager methods
        this.restoreOriginalMethods();
        
        // Mark as destroyed
        this.isDestroyed = true;
        this.isInitialized = false;
        
        // Emit destruction event
        if (this.eventBus) {
            this.eventBus.emit('globalTokenManager:destroyed');
        }
        
        this.logger.info('Global Token Manager Subsystem destroyed');
    }

    /**
     * Wait for token status element to be available in DOM
     */
    async waitForTokenStatusElement() {
        const maxAttempts = 100;
        const delay = 100;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // Check if DOM is ready
            if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
                this.logger.debug(`DOM not ready (${document.readyState}), waiting...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            const element = document.getElementById('global-token-status');
            if (element) {
                // Verify all required child elements exist (they may be nested)
                const countdown = element.querySelector('.global-token-countdown');
                const icon = element.querySelector('.global-token-icon');
                const text = element.querySelector('.global-token-text');
                
                // If the main element exists, consider it ready even if some child elements are missing
                // The child elements will be populated by other methods
                if (element.id === 'global-token-status') {
                    this.logger.debug('Global token status element found and ready', {
                        attempt,
                        elementId: element.id,
                        hasCountdown: !!countdown,
                        hasIcon: !!icon,
                        hasText: !!text
                    });
                    return element;
                }
            } else {
                this.logger.debug(`Global token status element not found (attempt ${attempt}/${maxAttempts})`);
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.logger.error('Global token status element not found after waiting', {
            domState: document.readyState,
            bodyExists: !!document.body,
            sidebarExists: !!document.querySelector('.sidebar'),
            allElementsWithId: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
        });
        throw new Error('Global token status element not found after waiting');
    }

    /**
     * Prevent conflicts with other token status systems
     */
    preventTokenStatusConflicts() {
        this.logger.debug('Preventing token status conflicts...');
        
        // Mark our global token status element as protected
        const statusElement = document.getElementById('global-token-status');
        if (statusElement) {
            statusElement.setAttribute('data-protected', 'true');
            statusElement.setAttribute('data-managed-by', 'GlobalTokenManagerSubsystem');
            
            // Add a mutation observer to prevent other systems from modifying our element
            this.setupDOMProtection(statusElement);
        }
        
        // Override conflicting UIManager methods if they exist
        this.overrideConflictingMethods();
        
        this.logger.debug('Token status conflicts prevention set up');
    }

    /**
     * Set up DOM protection to prevent other systems from modifying our widget
     */
    setupDOMProtection(element) {
        if (!window.MutationObserver) {
            return; // Skip if MutationObserver not supported
        }
        
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // If our element was removed or modified by another system, restore it
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    const removedOurElement = Array.from(mutation.removedNodes).some(node => 
                        node.id === 'global-token-status'
                    );
                    
                    if (removedOurElement) {
                        this.logger.warn('Global token status element was removed by another system, will reinitialize');
                        // Reinitialize after a short delay
                        setTimeout(() => {
                            if (!document.getElementById('global-token-status')) {
                                this.logger.info('Reinitializing global token status element');
                                this.waitForTokenStatusElement().then(() => {
                                    this.updateGlobalTokenStatus();
                                }).catch(error => {
                                    this.logger.error('Failed to reinitialize token status element', error);
                                });
                            }
                        }, 100);
                    }
                }
            });
        });
        
        // Observe the parent container for changes
        const sidebar = element.parentElement;
        if (sidebar) {
            this.mutationObserver.observe(sidebar, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * Override conflicting methods in other systems
     */
    overrideConflictingMethods() {
        // Check if UIManager exists and has conflicting methods
        if (window.app && window.app.uiManager) {
            const uiManager = window.app.uiManager;
            
            // Store original methods if they exist
            if (typeof uiManager.updateUniversalTokenStatus === 'function') {
                uiManager._originalUpdateUniversalTokenStatus = uiManager.updateUniversalTokenStatus;
                uiManager.updateUniversalTokenStatus = () => {
                    this.logger.debug('UIManager.updateUniversalTokenStatus called - delegating to GlobalTokenManagerSubsystem');
                    this.updateGlobalTokenStatus();
                };
            }
            
            if (typeof uiManager.updateHomeTokenStatus === 'function') {
                uiManager._originalUpdateHomeTokenStatus = uiManager.updateHomeTokenStatus;
                uiManager.updateHomeTokenStatus = () => {
                    this.logger.debug('UIManager.updateHomeTokenStatus called - delegating to GlobalTokenManagerSubsystem');
                    this.updateGlobalTokenStatus();
                };
            }
            
            this.logger.debug('Conflicting UIManager methods overridden');
        }
    }

    /**
     * Restore original methods in other systems
     */
    restoreOriginalMethods() {
        if (window.app && window.app.uiManager) {
            const uiManager = window.app.uiManager;
            
            // Restore original methods if they were overridden
            if (uiManager._originalUpdateUniversalTokenStatus) {
                uiManager.updateUniversalTokenStatus = uiManager._originalUpdateUniversalTokenStatus;
                delete uiManager._originalUpdateUniversalTokenStatus;
            }
            
            if (uiManager._originalUpdateHomeTokenStatus) {
                uiManager.updateHomeTokenStatus = uiManager._originalUpdateHomeTokenStatus;
                delete uiManager._originalUpdateHomeTokenStatus;
            }
            
            this.logger.debug('Original UIManager methods restored');
        }
    }

    /**
     * Set up EventBus listeners
     */
    setupEventBusListeners() {
        if (!this.eventBus) {
            return;
        }

        // Listen for token refresh events
        this.eventBus.on('token:refreshed', () => {
            this.logger.debug('Token refreshed event received, updating status');
            this.updateGlobalTokenStatus();
        });

        // Listen for token error events
        this.eventBus.on('token:error', (data) => {
            this.logger.debug('Token error event received', data);
            this.updateGlobalTokenStatus();
        });

        // Listen for settings changes that might affect token status
        this.eventBus.on('settings:updated', () => {
            this.logger.debug('Settings updated event received, updating token status');
            this.updateGlobalTokenStatus();
        });

        this.logger.debug('EventBus listeners set up for Global Token Manager');
    }

    /**
     * Update the global token status display
     */
    updateGlobalTokenStatus() {
        if (this.isDestroyed) {
            return;
        }

        const statusBox = document.getElementById('global-token-status');
        if (!statusBox) {
            // Only log warning once every 30 seconds to reduce spam
            if (!this.lastElementWarning || Date.now() - this.lastElementWarning > 30000) {
                this.logger.debug('Global token status box not found - widget may not be initialized yet');
                this.lastElementWarning = Date.now();
            }
            return;
        }

        const countdown = statusBox.querySelector('.global-token-countdown');
        const icon = statusBox.querySelector('.global-token-icon');
        const text = statusBox.querySelector('.global-token-text');
        const getTokenBtn = document.getElementById('global-get-token');

        // If child elements are missing, log debug message but continue with partial updates
        if (!countdown || !icon || !text) {
            // Only log debug message once every 30 seconds to reduce spam
            if (!this.lastChildElementWarning || Date.now() - this.lastChildElementWarning > 30000) {
                this.logger.debug('Some global token status child elements not found, will update what is available', {
                    hasCountdown: !!countdown,
                    hasIcon: !!icon,
                    hasText: !!text,
                    statusBoxFound: !!statusBox
                });
                this.lastChildElementWarning = Date.now();
            }
        }

        try {
            // Get current token info (sync version for now to avoid async issues during init)
            const tokenInfo = this.getTokenInfoSync();
            
            if (tokenInfo.hasToken) {
                // Token exists
                const timeLeft = tokenInfo.timeLeft;
                const formattedTime = this.formatTime(timeLeft);
                
                if (countdown) countdown.textContent = formattedTime;
                
                if (timeLeft <= 0) {
                    // Token expired
                    statusBox.className = 'global-token-status expired';
                    if (icon) icon.textContent = '❌';
                    if (text) text.textContent = 'Token expired';
                    if (getTokenBtn) getTokenBtn.style.display = 'inline-block';
                } else if (timeLeft <= 300) { // 5 minutes
                    // Token expiring soon
                    statusBox.className = 'global-token-status expiring';
                    if (icon) icon.textContent = '⚠️';
                    if (text) text.textContent = 'Token expiring soon';
                    if (getTokenBtn) getTokenBtn.style.display = 'none';
                } else {
                    // Token valid
                    statusBox.className = 'global-token-status valid';
                    if (icon) icon.textContent = '✅';
                    if (text) text.textContent = 'Token valid';
                    if (getTokenBtn) getTokenBtn.style.display = 'none';
                }
            } else {
                // No token
                statusBox.className = 'global-token-status missing';
                if (icon) icon.textContent = '❌';
                if (text) text.textContent = 'No valid token';
                if (countdown) countdown.textContent = 'No Token';
                if (getTokenBtn) getTokenBtn.style.display = 'inline-block';
            }
        } catch (error) {
            // Reduce error logging frequency to prevent spam
            if (!this.lastErrorWarning || Date.now() - this.lastErrorWarning > 30000) {
                this.logger.debug('Error updating global token status', {
                    error: error.message
                });
                this.lastErrorWarning = Date.now();
            }
            
            // Show error state only if elements exist
            if (statusBox) statusBox.className = 'global-token-status error';
            if (icon) icon.textContent = '⚠️';
            if (text) text.textContent = 'Status error';
            if (countdown) countdown.textContent = 'Error';
        }
    }

/**
 * Format time in human-readable format
 */
formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Get current token information (synchronous version for initialization)
 */
getTokenInfoSync() {
    try {
        // Only check localStorage for sync version to avoid async issues during init
        const token = localStorage.getItem('pingone_worker_token');
        const expiry = localStorage.getItem('pingone_token_expiry');
        
        if (!token || !expiry) {
            return { hasToken: false, timeLeft: 0, source: 'localStorage' };
        }
        
        const expiryTime = parseInt(expiry);
        const currentTime = Date.now();
        const timeLeft = Math.floor((expiryTime - currentTime) / 1000);
        
        return {
            hasToken: true,
            timeLeft: Math.max(0, timeLeft),
            source: 'localStorage'
        };
    } catch (error) {
        this.logger.debug('Error getting sync token info', {
            error: error.message
        });
        return { hasToken: false, timeLeft: 0, source: 'error' };
    }
}

/**
 * Get current token information (async version with server fallback)
 */
async getTokenInfo() {
    try {
        // First try to get token info from server API
        try {
            // Corrected endpoint to align with auth-subsystem API
            const response = await fetch('/api/v1/auth/token');
            if (response.ok) {
                const serverTokenInfo = await response.json();
                // The /token endpoint returns tokenInfo directly
                if (serverTokenInfo.success && serverTokenInfo.tokenInfo) {
                    return {
                        hasToken: serverTokenInfo.tokenInfo.isValid,
                        timeLeft: serverTokenInfo.tokenInfo.timeLeft || 0,
                        source: 'server'
                    };
                }
            }
        } catch (serverError) {
            this.logger.debug('Could not fetch token info from server, checking localStorage', {
                error: serverError.message
            });
        }
        
        // Fallback to localStorage
        const token = localStorage.getItem('pingone_worker_token');
        const expiry = localStorage.getItem('pingone_token_expiry');
        
        if (!token || !expiry) {
            return { hasToken: false, timeLeft: 0, source: 'localStorage' };
        }
        
        const expiryTime = parseInt(expiry);
        const currentTime = Date.now();
        const timeLeft = Math.floor((expiryTime - currentTime) / 1000);
        
        return {
            hasToken: true,
            timeLeft: Math.max(0, timeLeft),
            source: 'localStorage'
        };
    } catch (error) {
        this.logger.error('Error getting token info', {
            error: error.message
        });
        return { hasToken: false, timeLeft: 0, source: 'error' };
    }
}

/**
 * Set up event listeners for global token buttons
 */
setupGlobalTokenEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('global-refresh-token');
    if (refreshBtn) {
        this.refreshBtnHandler = () => {
            this.logger.debug('Refresh token button clicked');
            this.updateGlobalTokenStatus();
        };
        refreshBtn.addEventListener('click', this.refreshBtnHandler);
    }

    // Get Token button
    const getTokenBtn = document.getElementById('global-get-token');
    if (getTokenBtn) {
        this.getTokenBtnHandler = () => {
            this.logger.debug('Get token button clicked');
            this.getNewToken();
        };
        getTokenBtn.addEventListener('click', this.getTokenBtnHandler);
    }

    this.logger.debug('Global token event listeners set up');
}

/**
 * Remove event listeners
 */
removeEventListeners() {
    const refreshBtn = document.getElementById('global-refresh-token');
    if (refreshBtn && this.refreshBtnHandler) {
        refreshBtn.removeEventListener('click', this.refreshBtnHandler);
    }

    const getTokenBtn = document.getElementById('global-get-token');
    if (getTokenBtn && this.getTokenBtnHandler) {
        getTokenBtn.removeEventListener('click', this.getTokenBtnHandler);
    }

    this.logger.debug('Global token event listeners removed');
}

/**
 * Start the timer to update token status regularly
 */
startGlobalTokenTimer() {
    if (this.globalTokenTimer) {
        clearInterval(this.globalTokenTimer);
    }
    
    this.globalTokenTimer = setInterval(() => {
        if (!this.isDestroyed) {
            this.updateGlobalTokenStatus();
        }
    }, this.updateInterval);
    
    this.logger.debug('Global token timer started', {
        interval: `${this.updateInterval}ms`
    });
}

/**
 * Get new token
 */
async getNewToken() {
    if (this.isDestroyed) {
        return;
    }

    try {
        this.logger.info('Getting new token via global token manager subsystem...');
        
        // Show loading state
        const statusBox = document.getElementById('global-token-status');
        if (statusBox) {
            statusBox.className = 'global-token-status loading';
            const icon = statusBox.querySelector('.global-token-icon');
            const text = statusBox.querySelector('.global-token-text');
            if (icon) icon.textContent = '⏳';
            if (text) text.textContent = 'Getting token...';
        }
        
        // Try to use the app's token refresh functionality
        if (window.app && typeof window.app.getToken === 'function') {
            await window.app.getToken();
            this.logger.info('Token refreshed successfully via app');
        } else {
            // Fallback: try to trigger token refresh through API
            const response = await fetch('/api/auth/refresh-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.logger.info('Token refreshed via API', result);
            } else {
                throw new Error(`API request failed: ${response.statusText}`);
            }
        }
        
        // Update status after token refresh
        this.updateGlobalTokenStatus();
        
        // Emit token refresh event
        if (this.eventBus) {
            this.eventBus.emit('globalTokenManager:tokenRefreshed');
        }
        
    } catch (error) {
        this.logger.error('Error getting new token', {
            error: error.message
        });
        
        // Show error state
        const statusBox = document.getElementById('global-token-status');
        if (statusBox) {
            statusBox.className = 'global-token-status error';
            const icon = statusBox.querySelector('.global-token-icon');
            const text = statusBox.querySelector('.global-token-text');
            if (icon) icon.textContent = '❌';
            if (text) text.textContent = 'Token error';
        }
    }
}
    formatTime(seconds) {
        if (seconds <= 0) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Get current token information
     */
    async getTokenInfo() {
        try {
            // First try to get token info from server API
            try {
                const response = await fetch('/api/token/status');
                if (response.ok) {
                    const serverTokenInfo = await response.json();
                    if (serverTokenInfo.hasToken) {
                        return {
                            hasToken: true,
                            timeLeft: serverTokenInfo.timeLeft || 0,
                            source: 'server'
                        };
                    }
                }
            } catch (serverError) {
                this.logger.debug('Could not fetch token info from server, checking localStorage', {
                    error: serverError.message
                });
            }
            
            // Fallback to localStorage
            const token = localStorage.getItem('pingone_worker_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (!token || !expiry) {
                return { hasToken: false, timeLeft: 0, source: 'localStorage' };
            }
            
            const expiryTime = parseInt(expiry);
            const currentTime = Date.now();
            const timeLeft = Math.floor((expiryTime - currentTime) / 1000);
            
            return {
                hasToken: true,
                timeLeft: Math.max(0, timeLeft),
                source: 'localStorage'
            };
        } catch (error) {
            this.logger.error('Error getting token info', {
                error: error.message
            });
            return { hasToken: false, timeLeft: 0, source: 'error' };
        }
    }

    /**
     * Set up event listeners for global token buttons
     */
    setupGlobalTokenEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('global-refresh-token');
        if (refreshBtn) {
            this.refreshBtnHandler = () => {
                this.logger.debug('Refresh token button clicked');
                this.updateGlobalTokenStatus();
            };
            refreshBtn.addEventListener('click', this.refreshBtnHandler);
        }

        // Get Token button
        const getTokenBtn = document.getElementById('global-get-token');
        if (getTokenBtn) {
            this.getTokenBtnHandler = () => {
                this.logger.debug('Get token button clicked');
                this.getNewToken();
            };
            getTokenBtn.addEventListener('click', this.getTokenBtnHandler);
        }

        this.logger.debug('Global token event listeners set up');
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        const refreshBtn = document.getElementById('global-refresh-token');
        if (refreshBtn && this.refreshBtnHandler) {
            refreshBtn.removeEventListener('click', this.refreshBtnHandler);
        }

        const getTokenBtn = document.getElementById('global-get-token');
        if (getTokenBtn && this.getTokenBtnHandler) {
            getTokenBtn.removeEventListener('click', this.getTokenBtnHandler);
        }

        this.logger.debug('Global token event listeners removed');
    }

    /**
     * Start the timer to update token status regularly
     */
    startGlobalTokenTimer() {
        if (this.globalTokenTimer) {
            clearInterval(this.globalTokenTimer);
        }
        
        this.globalTokenTimer = setInterval(() => {
            if (!this.isDestroyed) {
                this.updateGlobalTokenStatus();
            }
        }, this.updateInterval);
        
        this.logger.debug('Global token timer started', {
            interval: `${this.updateInterval}ms`
        });
    }

    /**
     * Get new token
     */
    async getNewToken() {
        if (this.isDestroyed) {
            return;
        }

        try {
            this.logger.info('Getting new token via global token manager subsystem...');
            
            // Show loading state
            const statusBox = document.getElementById('global-token-status');
            if (statusBox) {
                statusBox.className = 'global-token-status loading';
                const icon = statusBox.querySelector('.global-token-icon');
                const text = statusBox.querySelector('.global-token-text');
                if (icon) icon.textContent = '⏳';
                if (text) text.textContent = 'Getting token...';
            }
            
            // Try to use the app's token refresh functionality
            if (window.app && typeof window.app.getToken === 'function') {
                await window.app.getToken();
                this.logger.info('Token refreshed successfully via app');
            } else {
                // Fallback: try to trigger token refresh through API
                const response = await fetch('/api/auth/refresh-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.logger.info('Token refreshed via API', result);
                } else {
                    throw new Error(`API request failed: ${response.statusText}`);
                }
            }
            
            // Update status after token refresh
            this.updateGlobalTokenStatus();
            
            // Emit token refresh event
            if (this.eventBus) {
                this.eventBus.emit('globalTokenManager:tokenRefreshed');
            }
            
        } catch (error) {
            this.logger.error('Error getting new token', {
                error: error.message
            });
            
            // Show error state
            const statusBox = document.getElementById('global-token-status');
            if (statusBox) {
                statusBox.className = 'global-token-status error';
                const icon = statusBox.querySelector('.global-token-icon');
                const text = statusBox.querySelector('.global-token-text');
                if (icon) icon.textContent = '❌';
                if (text) text.textContent = 'Token error';
            }
        }
    }

    /**
     * Get subsystem status for health checks
     */
    getStatus() {
        return {
            name: 'GlobalTokenManagerSubsystem',
            initialized: this.isInitialized,
            destroyed: this.isDestroyed,
            timerActive: !!this.globalTokenTimer,
            updateInterval: this.updateInterval
        };
    }
}

export { GlobalTokenManagerSubsystem };
export default GlobalTokenManagerSubsystem;
