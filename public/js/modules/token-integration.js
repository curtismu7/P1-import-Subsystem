/**
 * Token Integration Script
 * 
 * Connects the bulletproof token manager and token status display with the application.
 * This script initializes the token manager and status display with the appropriate
 * configuration and connects them to the application's event bus and settings.
 * 
 * Status: PRODUCTION READY - BULLETPROOF
 */

import BulletproofTokenManager, { createBulletproofTokenManager } from './bulletproof-token-manager.js';
import BulletproofTokenStatus, { createBulletproofTokenStatus } from './bulletproof-token-status.js';
import logger from './logger.js';

// Simple event bus implementation if not provided
class SimpleEventBus {
    constructor() {
        this.listeners = {};
    }
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return this;
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return this;
        if (!callback) {
            delete this.listeners[event];
        } else {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
        return this;
    }
    
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
        return this;
    }
}

/**
 * Initialize the token system
 * @param {Object} options - Configuration options
 * @returns {Object} Token system components
 */
function initializeTokenSystem(options = {}) {
    // Extract options with defaults
    const {
        settings,
        eventBus: existingEventBus,
        showGreenBanner = true,
        showRedBanner = true,
        expiryBufferMinutes = 5,
        autoRefresh = true,
        enableCircuitBreaker = true
    } = options;
    
    // Create event bus if not provided
    const eventBus = existingEventBus || new SimpleEventBus();
    
    // Get settings from global app or options
    const tokenSettings = settings || (window.app && window.app.settings) || {};
    
    // Log initialization
    logger.info('Initializing bulletproof token system', {
        showGreenBanner,
        showRedBanner,
        expiryBufferMinutes,
        autoRefresh,
        enableCircuitBreaker,
        hasSettings: !!tokenSettings,
        hasEventBus: !!eventBus,
        hasExistingApp: !!window.app,
        hasExistingTokenManager: !!(window.app && window.app.tokenManager)
    });
    
    try {
        // Create token manager
        const tokenManager = createBulletproofTokenManager({
            settings: tokenSettings,
            eventBus,
            logger,
            expiryBufferMinutes,
            enableCircuitBreaker
        });
        
        // Try to get existing token from the app immediately
        const existingToken = getExistingToken();
        if (existingToken) {
            logger.info('Found existing token, copying to bulletproof manager', {
                hasAccessToken: !!existingToken.accessToken,
                expiresAt: existingToken.expiresAt,
                tokenType: existingToken.tokenType
            });
            
            // Copy existing token data
            tokenManager.tokenCache = {
                ...tokenManager.tokenCache,
                accessToken: existingToken.accessToken,
                expiresAt: existingToken.expiresAt || 0,
                tokenType: existingToken.tokenType || 'Bearer',
                lastRefresh: existingToken.lastRefresh || Date.now(),
                refreshCount: 0
            };
            
            // Schedule token refresh if token is valid
            if (existingToken.accessToken && existingToken.expiresAt > Date.now()) {
                tokenManager.scheduleTokenRefresh();
            }
        }
        
        // Create token status display
        const tokenStatus = createBulletproofTokenStatus({
            tokenManager,
            eventBus,
            logger,
            showGreenBanner,
            showRedBanner,
            autoRefresh
        });
        
        // Add global references for debugging and API access
        if (window) {
            window.bulletproofTokenManager = tokenManager;
            window.bulletproofTokenStatus = tokenStatus;
        }
        
        // Connect to existing app if available
        if (window.app) {
            // Replace or extend existing token manager if available
            if (window.app.tokenManager) {
                logger.info('Extending existing token manager with bulletproof capabilities');
                
                // Add bulletproof methods to existing token manager
                Object.assign(window.app.tokenManager, {
                    bulletproof: tokenManager,
                    getTokenStatus: tokenManager.getTokenStatus,
                    refreshToken: tokenManager.refreshToken,
                    scheduleTokenRefresh: tokenManager.scheduleTokenRefresh,
                    handleTokenExpiration: tokenManager.handleTokenExpiration,
                    retryWithNewToken: tokenManager.retryWithNewToken
                });
                
                // Override the original getAccessToken method to use bulletproof version
                const originalGetAccessToken = window.app.tokenManager.getAccessToken;
                window.app.tokenManager.getAccessToken = async function() {
                    try {
                        // Try bulletproof version first
                        return await tokenManager.getAccessToken();
                    } catch (error) {
                        logger.warn('Bulletproof token manager failed, falling back to original', { error: error.message });
                        // Fallback to original method
                        return await originalGetAccessToken.call(this);
                    }
                };
            } else {
                // Set as app's token manager
                window.app.tokenManager = tokenManager;
            }
            
            // Add token status to app
            window.app.tokenStatus = tokenStatus;
            
            // Connect to app's event bus if available
            if (window.app.eventBus && window.app.eventBus !== eventBus) {
                // Forward events between event buses
                eventBus.on('tokenRefreshed', data => window.app.eventBus.emit('tokenRefreshed', data));
                eventBus.on('tokenError', data => window.app.eventBus.emit('tokenError', data));
                eventBus.on('tokenHealthCheck', data => window.app.eventBus.emit('tokenHealthCheck', data));
                
                window.app.eventBus.on('settingsUpdated', data => {
                    if (data && data.settings) {
                        tokenManager.updateSettings(data.settings);
                    }
                });
            }
        }
        
        // Set up periodic check for existing tokens (in case app loads token later)
        const tokenCheckInterval = setInterval(() => {
            const currentToken = getExistingToken();
            if (currentToken && currentToken.accessToken && 
                (!tokenManager.tokenCache.accessToken || 
                 currentToken.accessToken !== tokenManager.tokenCache.accessToken)) {
                
                logger.info('Detected new token from app, updating bulletproof manager');
                
                tokenManager.tokenCache = {
                    ...tokenManager.tokenCache,
                    accessToken: currentToken.accessToken,
                    expiresAt: currentToken.expiresAt || 0,
                    tokenType: currentToken.tokenType || 'Bearer',
                    lastRefresh: currentToken.lastRefresh || Date.now()
                };
                
                // Update status display
                tokenStatus.updateStatus();
                
                // Schedule refresh if needed
                tokenManager.scheduleTokenRefresh();
                
                // Clear interval once we have a token
                clearInterval(tokenCheckInterval);
            }
        }, 1000); // Check every second
        
        // Clear interval after 30 seconds to avoid infinite checking
        setTimeout(() => {
            clearInterval(tokenCheckInterval);
        }, 30000);
        
        // Return token system components
        return {
            tokenManager,
            tokenStatus,
            eventBus
        };
    } catch (error) {
        logger.error('Failed to initialize bulletproof token system', { error: error.message });
        
        // Show error in UI
        if (showRedBanner) {
            showErrorBanner('Failed to initialize token system', error.message);
        }
        
        // Rethrow for caller to handle
        throw error;
    }
}

/**
 * Show error banner in the UI
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorBanner(title, message) {
    try {
        // Create banner element
        const banner = document.createElement('div');
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.backgroundColor = '#f44336';
        banner.style.color = 'white';
        banner.style.padding = '10px 20px';
        banner.style.zIndex = '9999';
        banner.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.justifyContent = 'space-between';
        
        // Set content
        banner.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="margin-right: 10px; font-size: 18px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div>
                    <strong>${title}</strong>
                    <span style="opacity: 0.8; margin-left: 10px;">${message}</span>
                </div>
            </div>
            <button style="background: none; border: none; color: white; cursor: pointer; opacity: 0.8; padding: 5px; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to document
        document.body.insertBefore(banner, document.body.firstChild);
        
        // Add dismiss button event listener
        const dismissBtn = banner.querySelector('button');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                if (banner.parentNode) {
                    banner.parentNode.removeChild(banner);
                }
            });
        }
    } catch (error) {
        console.error('Failed to show error banner:', error);
    }
}

// Initialize token system when DOM is ready
function initializeOnDOMReady() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeTokenSystem();
        });
    } else {
        // DOM already ready, initialize now
        initializeTokenSystem();
    }
}

/**
 * Get existing token from various sources
 * @returns {Object|null} Existing token data or null
 */
function getExistingToken() {
    // Try multiple sources for existing token
    const sources = [
        // From window.app.tokenManager
        () => {
            if (window.app && window.app.tokenManager && window.app.tokenManager.tokenCache) {
                return window.app.tokenManager.tokenCache;
            }
            return null;
        },
        
        // From window.app.tokenManager.getTokenInfo()
        () => {
            if (window.app && window.app.tokenManager && typeof window.app.tokenManager.getTokenInfo === 'function') {
                try {
                    return window.app.tokenManager.getTokenInfo();
                } catch (error) {
                    logger.debug('Error getting token info from app.tokenManager', { error: error.message });
                    return null;
                }
            }
            return null;
        },
        
        // From localStorage
        () => {
            try {
                const stored = localStorage.getItem('pingone_token');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.accessToken) {
                        return parsed;
                    }
                }
            } catch (error) {
                logger.debug('Error reading token from localStorage', { error: error.message });
            }
            return null;
        },
        
        // From sessionStorage
        () => {
            try {
                const stored = sessionStorage.getItem('pingone_token');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.accessToken) {
                        return parsed;
                    }
                }
            } catch (error) {
                logger.debug('Error reading token from sessionStorage', { error: error.message });
            }
            return null;
        },
        
        // From global variables
        () => {
            if (window.tokenCache && window.tokenCache.accessToken) {
                return window.tokenCache;
            }
            return null;
        }
    ];
    
    // Try each source
    for (const getToken of sources) {
        try {
            const token = getToken();
            if (token && token.accessToken) {
                logger.debug('Found existing token from source', {
                    hasAccessToken: !!token.accessToken,
                    expiresAt: token.expiresAt,
                    tokenType: token.tokenType
                });
                return token;
            }
        } catch (error) {
            logger.debug('Error checking token source', { error: error.message });
        }
    }
    
    return null;
}

// Auto-initialize if not in module context
if (typeof window !== 'undefined') {
    initializeOnDOMReady();
}

// Export functions and classes for direct use
export { 
    initializeTokenSystem,
    getExistingToken,
    BulletproofTokenManager,
    BulletproofTokenStatus,
    SimpleEventBus
};

export default initializeTokenSystem;
