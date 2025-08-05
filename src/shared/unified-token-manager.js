/**
 * Unified Token Manager - Single Source of Truth for Token Management
 * 
 * This module provides a bulletproof, centralized token management system.
 * 
 * @version 1.0.0
 */

// Token storage keys (centralized definition)
const TOKEN_STORAGE_KEYS = {
    CACHE: 'pingone_token_cache',
    LEGACY_TOKEN: 'pingone_worker_token',
    LEGACY_EXPIRY: 'pingone_token_expiry',
    METADATA: 'pingone_token_metadata'
};

// Token sources (for fallback hierarchy)
const TOKEN_SOURCES = {
    MEMORY: 'memory',
    LOCALSTORAGE: 'localStorage',
    SERVER: 'server',
    ENV: 'environment'
};

// Token status constants
const TOKEN_STATUS = {
    VALID: 'valid',
    EXPIRING: 'expiring',
    EXPIRED: 'expired',
    MISSING: 'missing',
    ERROR: 'error'
};

// Default configuration
const DEFAULT_CONFIG = {
    expiryBufferMs: 5 * 60 * 1000, // 5 minutes
    warningThresholdMs: 10 * 60 * 1000, // 10 minutes
    autoRefreshIntervalMs: 30 * 1000, // 30 seconds
    maxRetries: 3,
    retryDelayMs: 1000,
    enableLogging: true
};

/**
 * Unified Token Manager Class
 */
class UnifiedTokenManager {
    constructor(options = {}) {
        this.config = { ...DEFAULT_CONFIG, ...options };
        this.logger = options.logger || this._createFallbackLogger();
        
        // In-memory token cache (primary source of truth)
        this._tokenCache = {
            token: null,
            expiresAt: null,
            tokenType: 'Bearer',
            source: null,
            lastRefresh: null
        };
        
        this._isRefreshing = false;
        this._refreshQueue = [];
        this._initialized = false;
        
        this._initialize();
    }
    
    /**
     * Initialize the token manager
     */
    async _initialize() {
        try {
            this._logTokenEvent('INFO', 'Initializing Unified Token Manager');
            await this._loadTokenFromFallback();
            this._initialized = true;
            this._logTokenEvent('SUCCESS', 'Unified Token Manager initialized');
        } catch (error) {
            this._logTokenEvent('ERROR', 'Failed to initialize', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Get current token (primary public method)
     */
    async getToken() {
        try {
            if (this._isTokenValid()) {
                this._logTokenEvent('DEBUG', 'Using cached token');
                return this._tokenCache.token;
            }
            
            if (this._isRefreshing) {
                return new Promise((resolve, reject) => {
                    this._refreshQueue.push({ resolve, reject });
                });
            }
            
            return await this._refreshToken();
        } catch (error) {
            this._logTokenEvent('ERROR', 'Failed to get token', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Set token (centralized token storage)
     */
    async setToken(token, expiresAt, options = {}) {
        try {
            if (!token || typeof token !== 'string') {
                throw new Error('Token must be a non-empty string');
            }
            
            if (!expiresAt || typeof expiresAt !== 'number') {
                throw new Error('ExpiresAt must be a valid timestamp');
            }
            
            this._tokenCache = {
                token,
                expiresAt,
                tokenType: options.tokenType || 'Bearer',
                source: options.source || TOKEN_SOURCES.MEMORY,
                lastRefresh: Date.now()
            };
            
            await this._persistToken();
            this._clearLegacyTokens();
            
            this._logTokenEvent('SUCCESS', 'Token set successfully', {
                source: this._tokenCache.source,
                expiresAt: new Date(expiresAt).toISOString()
            });
            
            this._processRefreshQueue(token);
            
        } catch (error) {
            this._logTokenEvent('ERROR', 'Failed to set token', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Clear token (centralized token removal)
     */
    async clearToken(options = {}) {
        try {
            const previousSource = this._tokenCache.source;
            
            this._tokenCache = {
                token: null,
                expiresAt: null,
                tokenType: 'Bearer',
                source: null,
                lastRefresh: null
            };
            
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(TOKEN_STORAGE_KEYS.CACHE);
                localStorage.removeItem(TOKEN_STORAGE_KEYS.METADATA);
                
                if (options.clearLegacy !== false) {
                    this._clearLegacyTokens();
                }
            }
            
            this._logTokenEvent('SUCCESS', 'Token cleared', { previousSource });
            
        } catch (error) {
            this._logTokenEvent('ERROR', 'Failed to clear token', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Check if token is expired
     */
    isTokenExpired() {
        if (!this._tokenCache.token || !this._tokenCache.expiresAt) {
            return true;
        }
        return this._tokenCache.expiresAt <= Date.now();
    }
    
    /**
     * Check if token is expiring soon
     */
    isTokenExpiring() {
        if (!this._tokenCache.token || !this._tokenCache.expiresAt) {
            return false;
        }
        
        const timeUntilExpiry = this._tokenCache.expiresAt - Date.now();
        return timeUntilExpiry <= this.config.warningThresholdMs && timeUntilExpiry > 0;
    }
    
    /**
     * Get token information
     */
    getTokenInfo() {
        const now = Date.now();
        const hasToken = !!this._tokenCache.token;
        const isExpired = this.isTokenExpired();
        const isExpiring = this.isTokenExpiring();
        
        let status = TOKEN_STATUS.MISSING;
        let message = 'No token available';
        let timeRemaining = null;
        
        if (hasToken) {
            if (isExpired) {
                status = TOKEN_STATUS.EXPIRED;
                message = 'Token has expired';
                timeRemaining = 0;
            } else if (isExpiring) {
                status = TOKEN_STATUS.EXPIRING;
                message = 'Token expires soon';
                timeRemaining = this._tokenCache.expiresAt - now;
            } else {
                status = TOKEN_STATUS.VALID;
                message = 'Token is valid';
                timeRemaining = this._tokenCache.expiresAt - now;
            }
        }
        
        return {
            hasToken,
            status,
            message,
            timeRemaining,
            timeRemainingFormatted: timeRemaining ? this._formatTime(timeRemaining) : null,
            isExpired,
            isExpiring,
            source: this._tokenCache.source,
            tokenType: this._tokenCache.tokenType,
            lastRefresh: this._tokenCache.lastRefresh,
            expiresAt: this._tokenCache.expiresAt
        };
    }
    
    /**
     * Load token from fallback sources
     */
    async _loadTokenFromFallback() {
        try {
            // 1. Check memory (already loaded)
            if (this._isTokenValid()) {
                return this._tokenCache.token;
            }
            
            // 2. Check localStorage
            const localToken = await this._loadFromLocalStorage();
            if (localToken) {
                return localToken;
            }
            
            // 3. Check server
            const serverToken = await this._loadFromServer();
            if (serverToken) {
                return serverToken;
            }
            
            return null;
        } catch (error) {
            this._logTokenEvent('ERROR', 'Fallback load failed', { error: error.message });
            return null;
        }
    }
    
    /**
     * Validate token expiry for components
     */
    validateTokenExpiry(component = 'unknown') {
        const tokenInfo = this.getTokenInfo();
        
        this._logTokenEvent('DEBUG', `Token validation for ${component}`, {
            component,
            status: tokenInfo.status,
            hasToken: tokenInfo.hasToken
        });
        
        return {
            isValid: tokenInfo.status === TOKEN_STATUS.VALID,
            shouldRefresh: tokenInfo.isExpiring || tokenInfo.isExpired,
            status: tokenInfo.status,
            message: tokenInfo.message,
            timeRemaining: tokenInfo.timeRemaining
        };
    }
    
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    
    _isTokenValid() {
        if (!this._tokenCache.token || !this._tokenCache.expiresAt) {
            return false;
        }
        
        const timeUntilExpiry = this._tokenCache.expiresAt - Date.now();
        return timeUntilExpiry > this.config.expiryBufferMs;
    }
    
    async _refreshToken() {
        if (this._isRefreshing) {
            return new Promise((resolve, reject) => {
                this._refreshQueue.push({ resolve, reject });
            });
        }
        
        try {
            this._isRefreshing = true;
            this._logTokenEvent('INFO', 'Refreshing token');
            
            const token = await this._loadTokenFromFallback();
            if (token && this._isTokenValid()) {
                this._processRefreshQueue(token);
                return token;
            }
            
            this._processRefreshQueue(null, new Error('No valid token available'));
            return null;
            
        } catch (error) {
            this._processRefreshQueue(null, error);
            throw error;
        } finally {
            this._isRefreshing = false;
        }
    }
    
    _processRefreshQueue(token, error = null) {
        while (this._refreshQueue.length > 0) {
            const { resolve, reject } = this._refreshQueue.shift();
            error ? reject(error) : resolve(token);
        }
    }
    
    async _persistToken() {
        if (typeof localStorage === 'undefined') return;
        
        try {
            const tokenData = {
                token: this._tokenCache.token,
                expiresAt: this._tokenCache.expiresAt,
                tokenType: this._tokenCache.tokenType,
                source: this._tokenCache.source,
                lastRefresh: this._tokenCache.lastRefresh,
                version: '1.0.0',
                timestamp: Date.now()
            };
            
            localStorage.setItem(TOKEN_STORAGE_KEYS.CACHE, JSON.stringify(tokenData));
            this._logTokenEvent('DEBUG', 'Token persisted to localStorage');
            
        } catch (error) {
            this._logTokenEvent('ERROR', 'Failed to persist token', { error: error.message });
        }
    }
    
    async _loadFromLocalStorage() {
        if (typeof localStorage === 'undefined') return null;
        
        try {
            // Try primary cache format
            const cacheData = localStorage.getItem(TOKEN_STORAGE_KEYS.CACHE);
            if (cacheData) {
                const tokenData = JSON.parse(cacheData);
                
                if (tokenData.token && tokenData.expiresAt) {
                    this._tokenCache = {
                        token: tokenData.token,
                        expiresAt: tokenData.expiresAt,
                        tokenType: tokenData.tokenType || 'Bearer',
                        source: TOKEN_SOURCES.LOCALSTORAGE,
                        lastRefresh: tokenData.lastRefresh || Date.now()
                    };
                    
                    if (this._isTokenValid()) {
                        return tokenData.token;
                    }
                }
            }
            
            // Try legacy format
            return await this._loadLegacyToken();
            
        } catch (error) {
            this._logTokenEvent('ERROR', 'Failed to load from localStorage', { error: error.message });
            return null;
        }
    }
    
    async _loadFromServer() {
        try {
            const response = await fetch('/api/health');
            if (!response.ok) return null;
            
            const healthData = await response.json();
            const serverToken = healthData.token;
            
            if (serverToken && serverToken.hasToken && serverToken.isValid) {
                const expiresAt = Date.now() + (serverToken.expiresIn * 1000);
                
                this._tokenCache = {
                    token: 'server-managed',
                    expiresAt,
                    tokenType: 'Bearer',
                    source: TOKEN_SOURCES.SERVER,
                    lastRefresh: Date.now()
                };
                
                return 'server-managed';
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    async _loadLegacyToken() {
        if (typeof localStorage === 'undefined') return null;
        
        try {
            const legacyToken = localStorage.getItem(TOKEN_STORAGE_KEYS.LEGACY_TOKEN);
            const legacyExpiry = localStorage.getItem(TOKEN_STORAGE_KEYS.LEGACY_EXPIRY);
            
            if (legacyToken && legacyExpiry) {
                const expiresAt = parseInt(legacyExpiry, 10);
                
                this._tokenCache = {
                    token: legacyToken,
                    expiresAt,
                    tokenType: 'Bearer',
                    source: TOKEN_SOURCES.LOCALSTORAGE,
                    lastRefresh: Date.now()
                };
                
                if (this._isTokenValid()) {
                    this._logTokenEvent('DEBUG', 'Loaded legacy token');
                    return legacyToken;
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    _clearLegacyTokens() {
        if (typeof localStorage === 'undefined') return;
        
        try {
            localStorage.removeItem(TOKEN_STORAGE_KEYS.LEGACY_TOKEN);
            localStorage.removeItem(TOKEN_STORAGE_KEYS.LEGACY_EXPIRY);
            localStorage.removeItem('exportToken');
            localStorage.removeItem('exportTokenExpires');
        } catch (error) {
            // Silent fail for cleanup
        }
    }
    
    _formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    _logTokenEvent(level, message, data = {}) {
        if (!this.config.enableLogging) return;
        
        const logData = {
            timestamp: new Date().toISOString(),
            component: 'UnifiedTokenManager',
            level,
            message,
            ...data
        };
        
        if (this.logger && this.logger[level.toLowerCase()]) {
            this.logger[level.toLowerCase()](message, logData);
        } else {
            console.log(`[${level}] ${message}`, logData);
        }
    }
    
    _createFallbackLogger() {
        return {
            debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data),
            info: (msg, data) => console.log(`[INFO] ${msg}`, data),
            warn: (msg, data) => console.warn(`[WARN] ${msg}`, data),
            error: (msg, data) => console.error(`[ERROR] ${msg}`, data),
            success: (msg, data) => console.log(`[SUCCESS] ${msg}`, data)
        };
    }
}

// Export constants and class
export {
    UnifiedTokenManager,
    TOKEN_STORAGE_KEYS,
    TOKEN_SOURCES,
    TOKEN_STATUS,
    DEFAULT_CONFIG
};

export default UnifiedTokenManager;
