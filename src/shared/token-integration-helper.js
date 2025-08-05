/**
 * Token Integration Helper
 * 
 * This module provides integration utilities to connect the Unified Token Manager
 * with existing token management systems and prevent direct localStorage access.
 */

import { UnifiedTokenManager, TOKEN_STATUS } from './unified-token-manager.js';

/**
 * Global token manager instance
 */
let globalTokenManager = null;

/**
 * Initialize the global token manager
 */
export function initializeTokenManager(options = {}) {
    if (globalTokenManager) {
        console.warn('Token manager already initialized');
        return globalTokenManager;
    }
    
    globalTokenManager = new UnifiedTokenManager(options);
    
    // Patch localStorage to prevent direct token access
    if (options.preventDirectAccess !== false) {
        patchLocalStorageAccess();
    }
    
    console.log('✅ Global token manager initialized');
    return globalTokenManager;
}

/**
 * Get the global token manager instance
 */
export function getTokenManager() {
    if (!globalTokenManager) {
        console.warn('Token manager not initialized, creating with defaults');
        return initializeTokenManager();
    }
    return globalTokenManager;
}

/**
 * Unified token access methods (replaces direct localStorage access)
 */
export const TokenAccess = {
    /**
     * Get current token (replaces localStorage.getItem('*token*'))
     */
    async getToken() {
        const manager = getTokenManager();
        return await manager.getToken();
    },
    
    /**
     * Set token (replaces localStorage.setItem('*token*'))
     */
    async setToken(token, expiresAt, options = {}) {
        const manager = getTokenManager();
        return await manager.setToken(token, expiresAt, options);
    },
    
    /**
     * Clear token (replaces localStorage.removeItem('*token*'))
     */
    async clearToken(options = {}) {
        const manager = getTokenManager();
        return await manager.clearToken(options);
    },
    
    /**
     * Check if token is expired
     */
    isTokenExpired() {
        const manager = getTokenManager();
        return manager.isTokenExpired();
    },
    
    /**
     * Check if token is expiring soon
     */
    isTokenExpiring() {
        const manager = getTokenManager();
        return manager.isTokenExpiring();
    },
    
    /**
     * Get token information
     */
    getTokenInfo() {
        const manager = getTokenManager();
        return manager.getTokenInfo();
    },
    
    /**
     * Validate token expiry for a component
     */
    validateTokenExpiry(component) {
        const manager = getTokenManager();
        return manager.validateTokenExpiry(component);
    }
};

/**
 * Legacy compatibility layer for existing code
 */
export const LegacyTokenCompat = {
    /**
     * Get token in legacy format (for backward compatibility)
     */
    async getCurrentTokenTimeRemaining() {
        const tokenInfo = TokenAccess.getTokenInfo();
        
        if (!tokenInfo.hasToken) {
            return {
                token: null,
                isExpired: true,
                timeRemaining: '0s'
            };
        }
        
        return {
            token: await TokenAccess.getToken(),
            isExpired: tokenInfo.isExpired,
            timeRemaining: tokenInfo.timeRemainingFormatted || '0s'
        };
    },
    
    /**
     * Check token status (legacy format)
     */
    async checkTokenStatus() {
        const validation = TokenAccess.validateTokenExpiry('legacy-compat');
        return {
            valid: validation.isValid,
            shouldRefresh: validation.shouldRefresh,
            status: validation.status
        };
    },
    
    /**
     * Get access token (legacy method name)
     */
    async getAccessToken() {
        return await TokenAccess.getToken();
    }
};

/**
 * Patch localStorage to prevent direct token access
 */
function patchLocalStorageAccess() {
    if (typeof localStorage === 'undefined') {
        return;
    }
    
    const originalGetItem = localStorage.getItem;
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    
    // Token-related keys that should be managed by UnifiedTokenManager
    const PROTECTED_KEYS = [
        'pingone_token_cache',
        'pingone_worker_token',
        'pingone_token_expiry',
        'exportToken',
        'exportTokenExpires'
    ];
    
    // Override getItem
    localStorage.getItem = function(key) {
        if (PROTECTED_KEYS.includes(key)) {
            console.warn(`🚫 Direct localStorage access to '${key}' is deprecated. Use TokenAccess.getToken() instead.`);
            
            // For backward compatibility, still allow access but log warning
            return originalGetItem.call(this, key);
        }
        return originalGetItem.call(this, key);
    };
    
    // Override setItem
    localStorage.setItem = function(key, value) {
        if (PROTECTED_KEYS.includes(key)) {
            console.warn(`🚫 Direct localStorage access to '${key}' is deprecated. Use TokenAccess.setToken() instead.`);
            
            // For backward compatibility, still allow access but log warning
            return originalSetItem.call(this, key, value);
        }
        return originalSetItem.call(this, key, value);
    };
    
    // Override removeItem
    localStorage.removeItem = function(key) {
        if (PROTECTED_KEYS.includes(key)) {
            console.warn(`🚫 Direct localStorage access to '${key}' is deprecated. Use TokenAccess.clearToken() instead.`);
            
            // For backward compatibility, still allow access but log warning
            return originalRemoveItem.call(this, key);
        }
        return originalRemoveItem.call(this, key);
    };
    
    console.log('🔒 localStorage token access patching enabled');
}

/**
 * Create auto-retry wrapper for API requests
 */
export function createTokenRetryWrapper(requestFn, options = {}) {
    const manager = getTokenManager();
    
    return async (...args) => {
        const maxRetries = options.maxRetries || 3;
        const retryDelay = options.retryDelay || 1000;
        
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Get current token
                const token = await manager.getToken();
                if (!token) {
                    throw new Error('No valid token available');
                }
                
                // Execute request with token
                const result = await requestFn(token, ...args);
                
                // Success
                if (attempt > 0) {
                    console.log(`✅ Request succeeded on attempt ${attempt + 1}`);
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                
                // Check if it's a token-related error
                const isTokenError = error.status === 401 || 
                                   error.status === 403 || 
                                   error.message.toLowerCase().includes('token') ||
                                   error.message.toLowerCase().includes('unauthorized');
                
                if (isTokenError && attempt < maxRetries) {
                    console.warn(`⚠️ Token error on attempt ${attempt + 1}, retrying...`);
                    
                    // Clear current token and wait before retry
                    await manager.clearToken();
                    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
                    
                    continue;
                }
                
                // Non-token error or max retries reached
                break;
            }
        }
        
        console.error(`❌ Request failed after ${maxRetries + 1} attempts:`, lastError.message);
        throw lastError;
    };
}

/**
 * Migration utilities for existing systems
 */
export const MigrationUtils = {
    /**
     * Migrate existing token manager to unified system
     */
    async migrateExistingTokenManager(existingManager) {
        const manager = getTokenManager();
        
        try {
            // Try to extract token from existing manager
            let token = null;
            let expiresAt = null;
            
            // Check various methods existing managers might have
            if (existingManager.getAccessToken) {
                token = await existingManager.getAccessToken();
            } else if (existingManager.token) {
                token = existingManager.token;
            }
            
            if (existingManager.getTokenInfo) {
                const info = existingManager.getTokenInfo();
                expiresAt = info.expiresAt;
            } else if (existingManager.tokenExpiry) {
                expiresAt = existingManager.tokenExpiry;
            }
            
            if (token && expiresAt) {
                await manager.setToken(token, expiresAt, {
                    source: 'migration',
                    metadata: { migratedFrom: existingManager.constructor.name }
                });
                
                console.log('✅ Successfully migrated existing token manager');
                return true;
            }
            
            console.warn('⚠️ No valid token found in existing manager');
            return false;
            
        } catch (error) {
            console.error('❌ Failed to migrate existing token manager:', error);
            return false;
        }
    },
    
    /**
     * Replace existing token manager methods
     */
    replaceTokenManagerMethods(existingManager) {
        if (!existingManager) return;
        
        // Replace common methods with unified equivalents
        existingManager.getToken = TokenAccess.getToken;
        existingManager.getAccessToken = TokenAccess.getToken;
        existingManager.setToken = TokenAccess.setToken;
        existingManager.clearToken = TokenAccess.clearToken;
        existingManager.isTokenExpired = TokenAccess.isTokenExpired;
        existingManager.isTokenExpiring = TokenAccess.isTokenExpiring;
        existingManager.getTokenInfo = TokenAccess.getTokenInfo;
        existingManager.validateTokenExpiry = TokenAccess.validateTokenExpiry;
        
        // Add legacy compatibility methods
        existingManager.getCurrentTokenTimeRemaining = LegacyTokenCompat.getCurrentTokenTimeRemaining;
        existingManager.checkTokenStatus = LegacyTokenCompat.checkTokenStatus;
        
        console.log('✅ Replaced existing token manager methods with unified equivalents');
    }
};

/**
 * Token status monitoring utilities
 */
export const TokenMonitoring = {
    /**
     * Start monitoring token status with callbacks
     */
    startMonitoring(callbacks = {}) {
        const manager = getTokenManager();
        
        const checkStatus = () => {
            const tokenInfo = manager.getTokenInfo();
            
            // Call appropriate callback based on status
            switch (tokenInfo.status) {
                case TOKEN_STATUS.VALID:
                    callbacks.onValid?.(tokenInfo);
                    break;
                case TOKEN_STATUS.EXPIRING:
                    callbacks.onExpiring?.(tokenInfo);
                    break;
                case TOKEN_STATUS.EXPIRED:
                    callbacks.onExpired?.(tokenInfo);
                    break;
                case TOKEN_STATUS.MISSING:
                    callbacks.onMissing?.(tokenInfo);
                    break;
                case TOKEN_STATUS.ERROR:
                    callbacks.onError?.(tokenInfo);
                    break;
            }
            
            // Always call general status callback
            callbacks.onStatusChange?.(tokenInfo);
        };
        
        // Check immediately
        checkStatus();
        
        // Set up interval monitoring
        const interval = setInterval(checkStatus, 30000); // Every 30 seconds
        
        return {
            stop: () => clearInterval(interval),
            checkNow: checkStatus
        };
    }
};

// Browser global fallback for legacy compatibility
if (typeof window !== 'undefined') {
    window.TokenAccess = TokenAccess;
    window.LegacyTokenCompat = LegacyTokenCompat;
    window.initializeTokenManager = initializeTokenManager;
    window.getTokenManager = getTokenManager;
}
