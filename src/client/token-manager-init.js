/**
 * Token Manager Initialization Script
 * 
 * This script initializes the Unified Token Manager and integrates it with
 * the existing application systems to ensure consistent token management.
 */

import { initializeTokenManager, TokenAccess, MigrationUtils, TokenMonitoring } from '../shared/token-integration-helper.js';

/**
 * Initialize the unified token management system
 */
export async function initializeUnifiedTokenManager(app) {
    try {
        console.log('🚀 Initializing Unified Token Management System...');
        
        // Initialize the unified token manager
        const tokenManager = initializeTokenManager({
            logger: app.logger || console,
            eventBus: app.eventBus,
            enableLogging: true,
            preventDirectAccess: true, // Enable localStorage access warnings
            autoRefresh: true,
            expiryBufferMs: 5 * 60 * 1000, // 5 minutes
            warningThresholdMs: 10 * 60 * 1000 // 10 minutes
        });
        
        // Migrate existing token managers
        await migrateExistingTokenManagers(app, tokenManager);
        
        // Set up token monitoring
        setupTokenMonitoring(app);
        
        // Update global references
        updateGlobalReferences(app, tokenManager);
        
        // Set up event handlers
        setupTokenEventHandlers(app, tokenManager);
        
        console.log('✅ Unified Token Management System initialized successfully');
        
        return tokenManager;
        
    } catch (error) {
        console.error('❌ Failed to initialize Unified Token Management System:', error);
        throw error;
    }
}

/**
 * Migrate existing token managers to use the unified system
 */
async function migrateExistingTokenManagers(app, tokenManager) {
    console.log('🔄 Migrating existing token managers...');
    
    try {
        // Migrate PingOne client if available
        if (app.pingOneClient) {
            console.log('📦 Migrating PingOne client...');
            await MigrationUtils.migrateExistingTokenManager(app.pingOneClient);
            MigrationUtils.replaceTokenManagerMethods(app.pingOneClient);
        }
        
        // Migrate global token manager if available
        if (app.subsystems && app.subsystems.globalTokenManager) {
            console.log('📦 Migrating global token manager...');
            await MigrationUtils.migrateExistingTokenManager(app.subsystems.globalTokenManager);
            MigrationUtils.replaceTokenManagerMethods(app.subsystems.globalTokenManager);
        }
        
        // Migrate token manager subsystem if available
        if (app.subsystems && app.subsystems.tokenManager) {
            console.log('📦 Migrating token manager subsystem...');
            await MigrationUtils.migrateExistingTokenManager(app.subsystems.tokenManager);
            MigrationUtils.replaceTokenManagerMethods(app.subsystems.tokenManager);
        }
        
        // Migrate connection manager if available
        if (app.subsystems && app.subsystems.connectionManager) {
            console.log('📦 Migrating connection manager...');
            await MigrationUtils.migrateExistingTokenManager(app.subsystems.connectionManager);
            MigrationUtils.replaceTokenManagerMethods(app.subsystems.connectionManager);
        }
        
        console.log('✅ Token manager migration completed');
        
    } catch (error) {
        console.error('❌ Token manager migration failed:', error);
        // Don't throw - continue with initialization
    }
}

/**
 * Set up token monitoring with UI updates
 */
function setupTokenMonitoring(app) {
    console.log('👁️ Setting up token monitoring...');
    
    const monitoring = TokenMonitoring.startMonitoring({
        onValid: (tokenInfo) => {
            console.log('✅ Token is valid:', tokenInfo.timeRemainingFormatted);
            updateTokenUI(app, 'valid', tokenInfo);
        },
        
        onExpiring: (tokenInfo) => {
            console.warn('⚠️ Token is expiring soon:', tokenInfo.timeRemainingFormatted);
            updateTokenUI(app, 'expiring', tokenInfo);
            
            // Show expiring notification
            if (app.showNotification) {
                app.showNotification('Token expires soon', 'warning');
            }
        },
        
        onExpired: (tokenInfo) => {
            console.error('❌ Token has expired');
            updateTokenUI(app, 'expired', tokenInfo);
            
            // Show expired notification
            if (app.showNotification) {
                app.showNotification('Token has expired', 'error');
            }
        },
        
        onMissing: (tokenInfo) => {
            console.warn('🔍 No token available');
            updateTokenUI(app, 'missing', tokenInfo);
        },
        
        onError: (tokenInfo) => {
            console.error('💥 Token error:', tokenInfo.message);
            updateTokenUI(app, 'error', tokenInfo);
        },
        
        onStatusChange: (tokenInfo) => {
            // Update any global token status displays
            if (window.app && window.app.updateGlobalTokenStatusDirect) {
                window.app.updateGlobalTokenStatusDirect(tokenInfo);
            }
        }
    });
    
    // Store monitoring instance for cleanup
    app._tokenMonitoring = monitoring;
    
    console.log('✅ Token monitoring setup completed');
}

/**
 * Update token UI elements
 */
function updateTokenUI(app, status, tokenInfo) {
    try {
        // Update token status indicator if available
        if (app.tokenStatusIndicator && app.tokenStatusIndicator.updateStatus) {
            app.tokenStatusIndicator.updateStatus();
        }
        
        // Update global token manager display if available
        if (app.subsystems && app.subsystems.globalTokenManager && app.subsystems.globalTokenManager.updateGlobalTokenStatus) {
            app.subsystems.globalTokenManager.updateGlobalTokenStatus();
        }
        
        // Update any other token displays
        const tokenElements = document.querySelectorAll('[data-token-status]');
        tokenElements.forEach(element => {
            element.setAttribute('data-token-status', status);
            element.textContent = tokenInfo.message || status;
        });
        
    } catch (error) {
        console.error('Error updating token UI:', error);
    }
}

/**
 * Update global references for backward compatibility
 */
function updateGlobalReferences(app, tokenManager) {
    console.log('🔗 Updating global references...');
    
    // Make TokenAccess available globally
    if (typeof window !== 'undefined') {
        window.TokenAccess = TokenAccess;
        window.UnifiedTokenManager = tokenManager;
    }
    
    // Update app references
    app.tokenManager = tokenManager;
    app.TokenAccess = TokenAccess;
    
    // Create unified getToken method on app
    app.getToken = async () => {
        return await TokenAccess.getToken();
    };
    
    // Create unified token validation method
    app.validateToken = (component) => {
        return TokenAccess.validateTokenExpiry(component);
    };
    
    console.log('✅ Global references updated');
}

/**
 * Set up token event handlers
 */
function setupTokenEventHandlers(app, tokenManager) {
    console.log('📡 Setting up token event handlers...');
    
    // Listen for token events if eventBus is available
    if (app.eventBus) {
        app.eventBus.on('tokenSet', (data) => {
            console.log('🎉 Token set event:', data);
            
            // Refresh UI components
            if (app.refreshTokenDisplays) {
                app.refreshTokenDisplays();
            }
        });
        
        app.eventBus.on('tokenCleared', (data) => {
            console.log('🧹 Token cleared event:', data);
            
            // Update UI to show no token state
            updateTokenUI(app, 'missing', { message: 'Token cleared' });
        });
        
        app.eventBus.on('tokenRefreshNeeded', (data) => {
            console.log('🔄 Token refresh needed:', data);
            
            // Trigger token acquisition if possible
            if (app.acquireToken) {
                app.acquireToken().catch(error => {
                    console.error('Failed to acquire token:', error);
                });
            }
        });
    }
    
    console.log('✅ Token event handlers setup completed');
}

/**
 * Create bulletproof API request wrapper
 */
export function createBulletproofAPIWrapper(app) {
    return {
        /**
         * Make API request with automatic token retry
         */
        async request(url, options = {}) {
            const tokenManager = app.tokenManager || app.TokenAccess;
            if (!tokenManager) {
                throw new Error('Token manager not available');
            }
            
            const maxRetries = 3;
            let lastError;
            
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    // Get current token
                    const token = await tokenManager.getToken();
                    if (!token) {
                        throw new Error('No valid token available');
                    }
                    
                    // Add token to request headers
                    const requestOptions = {
                        ...options,
                        headers: {
                            ...options.headers,
                            'Authorization': `Bearer ${token}`
                        }
                    };
                    
                    // Make request
                    const response = await fetch(url, requestOptions);
                    
                    // Check for token-related errors
                    if (response.status === 401 || response.status === 403) {
                        throw new Error(`Authentication failed: ${response.status}`);
                    }
                    
                    return response;
                    
                } catch (error) {
                    lastError = error;
                    
                    // Check if it's a token error and we haven't exceeded retries
                    const isTokenError = error.message.includes('Authentication failed') ||
                                       error.message.includes('token') ||
                                       error.message.includes('unauthorized');
                    
                    if (isTokenError && attempt < maxRetries) {
                        console.warn(`⚠️ Token error on attempt ${attempt + 1}, clearing token and retrying...`);
                        
                        // Clear current token
                        await tokenManager.clearToken();
                        
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                        continue;
                    }
                    
                    break;
                }
            }
            
            throw lastError;
        },
        
        /**
         * GET request with token retry
         */
        async get(url, options = {}) {
            return this.request(url, { ...options, method: 'GET' });
        },
        
        /**
         * POST request with token retry
         */
        async post(url, data, options = {}) {
            return this.request(url, {
                ...options,
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
        }
    };
}

/**
 * Cleanup function for token manager
 */
export function cleanupTokenManager(app) {
    try {
        console.log('🧹 Cleaning up token manager...');
        
        // Stop monitoring
        if (app._tokenMonitoring) {
            app._tokenMonitoring.stop();
            delete app._tokenMonitoring;
        }
        
        // Destroy token manager
        if (app.tokenManager && app.tokenManager.destroy) {
            app.tokenManager.destroy();
        }
        
        console.log('✅ Token manager cleanup completed');
        
    } catch (error) {
        console.error('❌ Token manager cleanup failed:', error);
    }
}

// Export for use in main application
export { TokenAccess, TokenMonitoring, MigrationUtils };
