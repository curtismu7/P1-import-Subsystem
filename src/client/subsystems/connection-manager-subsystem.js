/**
 * Connection Manager Subsystem
 * 
 * Manages all PingOne connection functionality including token acquisition,
 * validation, connection testing, and credential management.
 * 
 * Features:
 * - Token acquisition and validation
 * - Connection testing and health checks
 * - Credential validation and storage
 * - Connection status monitoring
 * - Automatic token refresh
 * - Connection retry logic
 */

import { createLogger } from '../utils/browser-logging-service.js';

export class ConnectionManagerSubsystem {
    constructor(logger, uiManager, settingsManager, apiClient) {
        this.logger = logger || createLogger({
            serviceName: 'connection-manager-subsystem',
            environment: 'development'
        });
        
        this.uiManager = uiManager;
        this.settingsManager = settingsManager;
        this.apiClient = apiClient;
        
        // Connection state
        this.connectionStatus = 'disconnected';
        this.lastConnectionTest = null;
        this.tokenInfo = {
            token: null,
            expiresAt: null,
            isValid: false
        };
        
        // Connection monitoring
        this.healthCheckInterval = null;
        this.tokenRefreshInterval = null;
        this.connectionRetryCount = 0;
        this.maxRetryAttempts = 3;
        
        // Event listeners
        this.eventListeners = new Map();
        
        this.logger.info('Connection Manager subsystem initialized');
    }
    
    /**
     * Initialize the connection manager subsystem
     */
    async init() {
        try {
            this.logger.info('Initializing connection manager subsystem...');
            
            // Load existing token if available
            await this.loadExistingToken();
            
            // Start connection monitoring
            this.startConnectionMonitoring();
            
            // Set up automatic token refresh
            this.setupTokenRefresh();
            
            this.logger.info('Connection Manager subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize connection manager subsystem', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Test connection to PingOne
     * @param {Object} credentials - Optional credentials to test
     * @returns {Promise<Object>} - Connection test result
     */
    async testConnection(credentials = null) {
        try {
            this.logger.info('Testing PingOne connection...');
            
            // Update UI to show testing state
            if (this.uiManager) {
                this.uiManager.updateConnectionStatus('testing', 'Testing connection...');
            }
            
            // Use provided credentials or get from settings
            const testCredentials = credentials || await this.getCredentials();
            
            if (!testCredentials) {
                throw new Error('No credentials available for connection test');
            }
            
            // Validate credentials format
            this.validateCredentials(testCredentials);
            
            // Test connection by getting a token
            const tokenResult = await this.acquireToken(testCredentials);
            
            if (tokenResult.success) {
                this.connectionStatus = 'connected';
                this.lastConnectionTest = {
                    timestamp: Date.now(),
                    success: true,
                    credentials: {
                        clientId: testCredentials.clientId,
                        environmentId: testCredentials.environmentId,
                        region: testCredentials.region
                    }
                };
                
                // Update UI
                if (this.uiManager) {
                    this.uiManager.updateConnectionStatus('success', 'Connection successful');
                }
                
                this.logger.info('Connection test successful');
                
                // Emit connection success event
                this.emit('connectionSuccess', this.lastConnectionTest);
                
                return {
                    success: true,
                    message: 'Connection successful',
                    token: tokenResult.token,
                    expiresIn: tokenResult.expiresIn
                };
            } else {
                throw new Error(tokenResult.error || 'Failed to acquire token');
            }
            
        } catch (error) {
            this.logger.error('Connection test failed', { error: error.message });
            
            this.connectionStatus = 'disconnected';
            this.lastConnectionTest = {
                timestamp: Date.now(),
                success: false,
                error: error.message
            };
            
            // Update UI
            if (this.uiManager) {
                this.uiManager.updateConnectionStatus('error', `Connection failed: ${error.message}`);
            }
            
            // Emit connection failure event
            this.emit('connectionFailure', { error: error.message });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Acquire a new token from PingOne
     * @param {Object} credentials - PingOne credentials
     * @returns {Promise<Object>} - Token acquisition result
     */
    async acquireToken(credentials = null) {
        try {
            this.logger.info('Acquiring PingOne token...');
            
            // Use provided credentials or get from settings
            const tokenCredentials = credentials || await this.getCredentials();
            
            if (!tokenCredentials) {
                throw new Error('No credentials available for token acquisition');
            }
            
            // Validate credentials
            this.validateCredentials(tokenCredentials);
            
            // Make token request using the correct endpoint
            const response = await this.apiClient.post('/api/pingone/get-token', {
                clientId: tokenCredentials.clientId,
                clientSecret: tokenCredentials.clientSecret,
                environmentId: tokenCredentials.environmentId,
                region: tokenCredentials.region
            });
            
            if (response.success && response.data?.access_token) {
                // Store token info
                this.tokenInfo = {
                    token: response.data.access_token,
                    expiresAt: Date.now() + (response.data.expires_in * 1000),
                    isValid: true,
                    acquiredAt: Date.now()
                };
                
                // Update connection status
                this.connectionStatus = 'connected';
                
                // Update UI
                if (this.uiManager) {
                    this.uiManager.updateTokenStatus(true, 'Token acquired successfully');
                }
                
                this.logger.info('Token acquired successfully', {
                    expiresIn: response.expiresIn
                });
                
                // Emit token acquired event
                this.emit('tokenAcquired', {
                    token: response.token,
                    expiresIn: response.expiresIn
                });
                
                return {
                    success: true,
                    token: response.data.access_token,
                    expiresIn: response.data.expires_in
                };
            } else {
                throw new Error(response.error || 'Failed to acquire token');
            }
            
        } catch (error) {
            this.logger.error('Token acquisition failed', { error: error.message });
            
            // Clear token info
            this.tokenInfo = {
                token: null,
                expiresAt: null,
                isValid: false
            };
            
            // Update connection status
            this.connectionStatus = 'disconnected';
            
            // Update UI
            if (this.uiManager) {
                this.uiManager.updateTokenStatus(false, `Token acquisition failed: ${error.message}`);
            }
            
            // Emit token acquisition failure event
            this.emit('tokenAcquisitionFailure', { error: error.message });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Validate current token
     * @returns {Promise<boolean>} - Whether token is valid
     */
    async validateToken() {
        try {
            if (!this.tokenInfo.token) {
                this.logger.debug('No token to validate');
                return false;
            }
            
            // Check if token is expired
            if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
                this.logger.info('Token has expired');
                this.tokenInfo.isValid = false;
                return false;
            }
            
            // Test token with a simple API call
            const response = await this.apiClient.get('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${this.tokenInfo.token}`
                }
            });
            
            const isValid = response.success;
            this.tokenInfo.isValid = isValid;
            
            if (isValid) {
                this.logger.debug('Token validation successful');
                this.connectionStatus = 'connected';
            } else {
                this.logger.info('Token validation failed');
                this.connectionStatus = 'disconnected';
            }
            
            return isValid;
            
        } catch (error) {
            this.logger.error('Token validation error', { error: error.message });
            this.tokenInfo.isValid = false;
            this.connectionStatus = 'disconnected';
            return false;
        }
    }
    
    /**
     * Refresh current token
     * @returns {Promise<Object>} - Token refresh result
     */
    async refreshToken() {
        try {
            this.logger.info('Refreshing token...');
            
            // Get current credentials
            const credentials = await this.getCredentials();
            if (!credentials) {
                throw new Error('No credentials available for token refresh');
            }
            
            // Acquire new token
            const result = await this.acquireToken(credentials);
            
            if (result.success) {
                this.logger.info('Token refreshed successfully');
                
                // Emit token refreshed event
                this.emit('tokenRefreshed', {
                    token: result.token,
                    expiresIn: result.expiresIn
                });
            }
            
            return result;
            
        } catch (error) {
            this.logger.error('Token refresh failed', { error: error.message });
            
            // Emit token refresh failure event
            this.emit('tokenRefreshFailure', { error: error.message });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get current credentials
     * @returns {Promise<Object|null>} - Current credentials
     */
    async getCredentials() {
        try {
            // Try to get from credentials manager first
            if (window.credentialsManager) {
                const credentials = window.credentialsManager.getCredentials();
                if (credentials && this.isValidCredentialSet(credentials)) {
                    return credentials;
                }
            }
            
            // Fallback to settings manager
            if (this.settingsManager) {
                await this.settingsManager.loadCurrentSettings();
                const settings = this.settingsManager.currentSettings;
                if (settings && this.isValidCredentialSet(settings)) {
                    return {
                        clientId: settings.clientId,
                        clientSecret: settings.clientSecret,
                        environmentId: settings.environmentId,
                        region: settings.region
                    };
                }
            }
            
            return null;
        } catch (error) {
            this.logger.error('Failed to get credentials', { error: error.message });
            return null;
        }
    }
    
    /**
     * Validate credentials format
     * @param {Object} credentials - Credentials to validate
     */
    validateCredentials(credentials) {
        const required = ['clientId', 'clientSecret', 'environmentId'];
        const missing = required.filter(field => !credentials[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required credentials: ${missing.join(', ')}`);
        }
        
        // Validate format
        if (!/^[a-f0-9-]{36}$/.test(credentials.clientId)) {
            throw new Error('Invalid client ID format');
        }
        
        if (!/^[a-f0-9-]{36}$/.test(credentials.environmentId)) {
            throw new Error('Invalid environment ID format');
        }
        
        if (credentials.clientSecret.length < 10) {
            throw new Error('Client secret appears to be invalid');
        }
    }
    
    /**
     * Check if credential set is valid
     * @param {Object} credentials - Credentials to check
     * @returns {boolean} - Whether credentials are valid
     */
    isValidCredentialSet(credentials) {
        try {
            this.validateCredentials(credentials);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Load existing token from storage
     */
    async loadExistingToken() {
        try {
            // Try to load from token manager
            if (window.globalTokenManager && typeof window.globalTokenManager.getCachedToken === 'function') {
                const cachedToken = window.globalTokenManager.getCachedToken();
                if (cachedToken) {
                    this.tokenInfo = {
                        token: cachedToken.token,
                        expiresAt: cachedToken.expiresAt,
                        isValid: cachedToken.isValid,
                        acquiredAt: cachedToken.acquiredAt
                    };
                    
                    // Validate the loaded token
                    const isValid = await this.validateToken();
                    if (isValid) {
                        this.connectionStatus = 'connected';
                        this.logger.info('Existing token loaded and validated');
                    } else {
                        this.logger.info('Existing token loaded but invalid');
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to load existing token', { error: error.message });
        }
    }
    
    /**
     * Start connection monitoring
     */
    startConnectionMonitoring() {
        // Health check every 5 minutes
        this.healthCheckInterval = setInterval(async () => {
            if (this.connectionStatus === 'connected') {
                const isValid = await this.validateToken();
                if (!isValid) {
                    this.logger.info('Connection lost during health check');
                    this.emit('connectionLost');
                }
            }
        }, 5 * 60 * 1000);
        
        this.logger.debug('Connection monitoring started');
    }
    
    /**
     * Setup automatic token refresh
     */
    setupTokenRefresh() {
        // Check token expiry every minute
        this.tokenRefreshInterval = setInterval(async () => {
            if (this.tokenInfo.token && this.tokenInfo.expiresAt) {
                const timeUntilExpiry = this.tokenInfo.expiresAt - Date.now();
                const refreshThreshold = 5 * 60 * 1000; // 5 minutes
                
                if (timeUntilExpiry <= refreshThreshold && timeUntilExpiry > 0) {
                    this.logger.info('Token expiring soon, attempting refresh...');
                    await this.refreshToken();
                }
            }
        }, 60 * 1000);
        
        this.logger.debug('Automatic token refresh setup');
    }
    
    /**
     * Get connection status
     * @returns {string} - Current connection status
     */
    getConnectionStatus() {
        return this.connectionStatus;
    }
    
    /**
     * Get token info
     * @returns {Object} - Current token information
     */
    getTokenInfo() {
        return {
            hasToken: !!this.tokenInfo.token,
            isValid: this.tokenInfo.isValid,
            expiresAt: this.tokenInfo.expiresAt,
            timeUntilExpiry: this.tokenInfo.expiresAt ? this.tokenInfo.expiresAt - Date.now() : null
        };
    }
    
    /**
     * Get last connection test result
     * @returns {Object|null} - Last connection test result
     */
    getLastConnectionTest() {
        return this.lastConnectionTest;
    }
    
    /**
     * Check if currently connected
     * @returns {boolean} - Whether currently connected
     */
    isConnected() {
        return this.connectionStatus === 'connected' && this.tokenInfo.isValid;
    }
    
    /**
     * Check if token is valid and not expired
     * @returns {boolean} - Whether token is valid
     */
    hasValidToken() {
        return this.tokenInfo.isValid && 
               this.tokenInfo.token && 
               this.tokenInfo.expiresAt && 
               Date.now() < this.tokenInfo.expiresAt;
    }
    
    /**
     * Disconnect and clear token
     */
    disconnect() {
        this.logger.info('Disconnecting...');
        
        // Clear token info
        this.tokenInfo = {
            token: null,
            expiresAt: null,
            isValid: false
        };
        
        // Update connection status
        this.connectionStatus = 'disconnected';
        
        // Update UI
        if (this.uiManager) {
            this.uiManager.updateConnectionStatus('disconnected', 'Disconnected');
            this.uiManager.updateTokenStatus(false, 'No token');
        }
        
        // Emit disconnected event
        this.emit('disconnected');
        
        this.logger.info('Disconnected successfully');
    }
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event listener function
     */
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event listener function
     */
    off(event, listener) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    this.logger.error('Event listener error', { event, error: error.message });
                }
            });
        }
    }
    
    /**
     * Get connection statistics
     * @returns {Object} - Connection statistics
     */
    getConnectionStats() {
        return {
            status: this.connectionStatus,
            hasToken: !!this.tokenInfo.token,
            tokenValid: this.tokenInfo.isValid,
            tokenExpiresAt: this.tokenInfo.expiresAt,
            lastConnectionTest: this.lastConnectionTest,
            retryCount: this.connectionRetryCount
        };
    }
    
    /**
     * Clean up the connection manager subsystem
     */
    cleanup() {
        // Clear intervals
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Disconnect
        this.disconnect();
        
        this.logger.info('Connection Manager subsystem cleaned up');
    }
}