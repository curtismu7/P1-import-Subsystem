/**
 * Authentication Management Subsystem
 * 
 * Handles all authentication-related operations including token management,
 * credential validation, and authentication state tracking.
 */

export class AuthManagementSubsystem {
    constructor(logger, uiManager, localClient, settingsSubsystem) {
        this.logger = logger;
        this.uiManager = uiManager;
        this.localClient = localClient;
        this.settingsSubsystem = settingsSubsystem;
        
        // Authentication state
        this.isAuthenticated = false;
        this.tokenStatus = null;
        this.tokenExpiry = null;
        this.refreshTimer = null;
        
        this.logger.info('Authentication Management Subsystem initialized');
    }
    
    /**
     * Initialize the authentication subsystem
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.checkInitialTokenStatus();
            this.setupTokenRefreshTimer();
            this.logger.info('Authentication Management Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Authentication Management Subsystem', error);
            throw error;
        }
    }
    
    /**
     * Set up event listeners for authentication-related elements
     */
    setupEventListeners() {
        // Get token button
        const getTokenBtn = document.getElementById('get-token-btn');
        if (getTokenBtn) {
            getTokenBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.getToken();
            });
        }
        
        // Test connection button
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.testConnection();
            });
        }
        
        // Global token refresh button
        const globalRefreshBtn = document.getElementById('global-refresh-token');
        if (globalRefreshBtn) {
            globalRefreshBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.refreshToken();
            });
        }
        
        // Settings form submission
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSettingsSubmit(e);
            });
        }
    }
    
    /**
     * Get a new authentication token
     */
    async getToken() {
        try {
            this.logger.info('Getting new authentication token');
            this.showTokenProgress('Getting token...');
            
            // Validate settings first
            await this.settingsSubsystem.loadCurrentSettings();
            const settings = this.settingsSubsystem.currentSettings;
            if (!this.validateSettings(settings)) {
                throw new Error('Invalid settings - please check your configuration');
            }
            
            // Request token from server
            const response = await this.localClient.post('/api/v1/auth/token', {
                clientId: settings.clientId,
                clientSecret: settings.clientSecret,
                environmentId: settings.environmentId,
                region: settings.region
            });
            
            if (!response.success) {
                throw new Error(response.error || 'Failed to get token');
            }
            
            // Update token status
            this.tokenStatus = response.token;
            this.tokenExpiry = response.expiry;
            this.isAuthenticated = true;
            
            // Update UI
            this.updateTokenStatusUI(true, 'Token obtained successfully');
            this.uiManager.showSuccess('Authentication successful');
            
            // Set up refresh timer
            this.setupTokenRefreshTimer();
            
            this.logger.info('Token obtained successfully');
            
        } catch (error) {
            this.logger.error('Failed to get token', error);
            this.updateTokenStatusUI(false, error.message);
            this.uiManager.showError('Authentication Failed', error.message);
        } finally {
            this.hideTokenProgress();
        }
    }
    
    /**
     * Test connection with current settings
     */
    async testConnection() {
        try {
            this.logger.info('Testing connection');
            this.showConnectionProgress('Testing connection...');
            
            // Get current settings
            await this.settingsSubsystem.loadCurrentSettings();
            const settings = this.settingsSubsystem.currentSettings;
            if (!this.validateSettings(settings)) {
                throw new Error('Invalid settings - please check your configuration');
            }
            // Use POST request to match server-side endpoint
            const response = await this.localClient.post('/api/pingone/test-connection', {
                environmentId: settings.environmentId,
                clientId: settings.clientId,
                clientSecret: settings.clientSecret,
                region: settings.region
            });
            if (!response.success) {
                throw new Error(response.error || 'Connection test failed');
            }
            // Update UI
            this.updateConnectionStatusUI(true, 'Connection successful');
            this.uiManager.showSuccess('Connection test successful');
            this.logger.info('Connection test successful');
        } catch (error) {
            this.logger.error('Connection test failed', error);
            this.updateConnectionStatusUI(false, error.message);
            this.uiManager.showError('Connection Test Failed', error.message);
        } finally {
            this.hideConnectionProgress();
        }
    }
    
    /**
     * Refresh the current token
     */
    async refreshToken() {
        try {
            this.logger.info('Refreshing authentication token');
            this.showTokenProgress('Refreshing token...');
            
            const response = await this.localClient.post('/api/v1/auth/refresh');
            
            if (!response.success) {
                throw new Error(response.error || 'Failed to refresh token');
            }
            
            // Update token status
            this.tokenStatus = response.token;
            this.tokenExpiry = response.expiry;
            this.isAuthenticated = true;
            
            // Update UI
            this.updateTokenStatusUI(true, 'Token refreshed successfully');
            this.uiManager.showSuccess('Token refreshed successfully');
            
            // Reset refresh timer
            this.setupTokenRefreshTimer();
            
            this.logger.info('Token refreshed successfully');
            
        } catch (error) {
            this.logger.error('Failed to refresh token', error);
            this.updateTokenStatusUI(false, error.message);
            this.uiManager.showError('Token Refresh Failed', error.message);
            
            // Clear authentication state
            this.clearAuthenticationState();
        } finally {
            this.hideTokenProgress();
        }
    }
    
    /**
     * Handle settings form submission
     */
    async handleSettingsSubmit(event) {
        try {
            const formData = new FormData(event.target);
            const settings = Object.fromEntries(formData.entries());
            
            this.logger.info('Saving settings');
            
            // Validate settings
            if (!this.validateSettings(settings)) {
                throw new Error('Invalid settings - please check all required fields');
            }
            
            // Save settings
            await this.settingsManager.saveSettings(settings);
            
            // Clear current authentication state since settings changed
            this.clearAuthenticationState();
            
            // Update UI
            this.uiManager.updateSettingsSaveStatus('Settings saved successfully', 'success');
            
            this.logger.info('Settings saved successfully');
            
        } catch (error) {
            this.logger.error('Failed to save settings', error);
            this.uiManager.updateSettingsSaveStatus(`Settings Save Failed: ${error.message}`, 'error');
        }
    }
    
    /**
     * Check initial token status and automatically acquire new token if expired
     * CRITICAL: This method provides automatic token acquisition at startup
     * DO NOT REMOVE OR MODIFY without understanding the startup authentication flow
     */
    async checkInitialTokenStatus() {
        try {
            this.logger.debug('🔍 [STARTUP] Checking initial token status...');
            const response = await this.localClient.get('/api/v1/auth/status');
            
            if (response.success && response.isValid) {
                // Token is valid - set authentication state
                this.tokenStatus = response.status;
                this.tokenExpiry = response.expiresIn;
                this.isAuthenticated = true;
                this.updateTokenStatusUI(true, `Token is ${response.status}`);
                this.logger.info('✅ [STARTUP] Valid token found, authentication ready');
                
            } else if (response.success && response.hasToken) {
                // Token exists but is expired - attempt automatic refresh
                this.logger.warn('⚠️ [STARTUP] Token expired, attempting automatic refresh...');
                this.tokenStatus = response.status;
                this.tokenExpiry = response.expiresIn;
                
                // Attempt automatic token acquisition
                const refreshSuccess = await this.attemptAutomaticTokenRefresh();
                
                if (refreshSuccess) {
                    this.logger.info('✅ [STARTUP] Token automatically refreshed, authentication ready');
                } else {
                    this.logger.warn('❌ [STARTUP] Automatic token refresh failed, user intervention required');
                    this.isAuthenticated = false;
                    this.updateTokenStatusUI(false, 'Token expired - refresh required');
                }
                
            } else {
                // No token available - attempt automatic acquisition if credentials exist
                this.logger.warn('⚠️ [STARTUP] No token found, attempting automatic acquisition...');
                
                const acquisitionSuccess = await this.attemptAutomaticTokenRefresh();
                
                if (acquisitionSuccess) {
                    this.logger.info('✅ [STARTUP] Token automatically acquired, authentication ready');
                } else {
                    this.logger.warn('❌ [STARTUP] No token available and automatic acquisition failed');
                    this.isAuthenticated = false;
                    this.updateTokenStatusUI(false, response.status || 'No valid token');
                }
            }
            
        } catch (error) {
            this.logger.error('❌ [STARTUP] Failed to check token status', error);
            this.isAuthenticated = false;
            this.updateTokenStatusUI(false, 'Token status unknown');
        }
    }
    
    /**
     * Attempt automatic token refresh/acquisition at startup
     * CRITICAL: This method enables automatic token acquisition when credentials are available
     * DO NOT REMOVE - Required for seamless startup authentication flow
     */
    async attemptAutomaticTokenRefresh() {
        try {
            this.logger.debug('🔄 [STARTUP] Attempting automatic token acquisition...');
            
            // Load current settings to check if credentials are available
            await this.settingsSubsystem.loadCurrentSettings();
            const settings = this.settingsSubsystem.currentSettings;
            
            // Validate that we have the required credentials
            if (!this.validateSettings(settings)) {
                this.logger.debug('❌ [STARTUP] No valid credentials available for automatic token acquisition');
                return false;
            }
            
            this.logger.debug('✅ [STARTUP] Valid credentials found, attempting token acquisition...');
            
            // Request token from server using available credentials
            const response = await this.localClient.post('/api/v1/auth/token', {
                clientId: settings.clientId,
                clientSecret: settings.clientSecret,
                environmentId: settings.environmentId,
                region: settings.region
            });
            
            if (response.success && response.token) {
                // Token acquisition successful - update authentication state
                this.tokenStatus = response.token;
                this.tokenExpiry = response.expiry;
                this.isAuthenticated = true;
                
                // Update UI to reflect successful authentication
                this.updateTokenStatusUI(true, 'Token obtained automatically');
                
                // Set up refresh timer for the new token
                this.setupTokenRefreshTimer();
                
                this.logger.info('✅ [STARTUP] Automatic token acquisition successful');
                return true;
                
            } else {
                this.logger.warn('❌ [STARTUP] Token acquisition failed:', response.error || 'Unknown error');
                return false;
            }
            
        } catch (error) {
            this.logger.error('❌ [STARTUP] Error during automatic token acquisition:', error);
            return false;
        }
    }
    
    /**
     * Set up automatic token refresh timer
     * CRITICAL: This method manages token refresh scheduling
     * DO NOT REMOVE - Required for automatic token maintenance
     */
    setupTokenRefreshTimer() {
        // Clear existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        if (!this.tokenExpiry) {
            return;
        }
        
        // Calculate refresh time (5 minutes before expiry)
        const expiryTime = new Date(this.tokenExpiry).getTime();
        const refreshTime = expiryTime - (5 * 60 * 1000); // 5 minutes before
        const now = Date.now();
        
        if (refreshTime > now) {
            const delay = refreshTime - now;
            this.refreshTimer = setTimeout(() => {
                this.refreshToken();
            }, delay);
            
            this.logger.info('Token refresh timer set', {
                refreshIn: Math.round(delay / 1000 / 60),
                unit: 'minutes'
            });
        }
    }
    
    /**
     * Validate settings object
     */
    validateSettings(settings) {
        const required = ['clientId', 'clientSecret', 'environmentId', 'region'];
        
        for (const field of required) {
            if (!settings[field] || settings[field].trim() === '') {
                this.logger.error('Missing required setting', { field });
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Clear authentication state
     */
    clearAuthenticationState() {
        this.isAuthenticated = false;
        this.tokenStatus = null;
        this.tokenExpiry = null;
        
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        this.updateTokenStatusUI(false, 'Authentication cleared');
    }
    
    /**
     * Update token status UI
     */
    updateTokenStatusUI(isValid, message) {
        // Update global token status
        const globalTokenStatus = document.getElementById('global-token-status');
        if (globalTokenStatus) {
            globalTokenStatus.className = `token-status ${isValid ? 'valid' : 'invalid'}`;
            globalTokenStatus.textContent = message;
        }
        
        // Update token indicator
        const tokenIndicator = document.getElementById('token-status-indicator');
        if (tokenIndicator) {
            tokenIndicator.className = `token-indicator ${isValid ? 'valid' : 'invalid'}`;
        }
        
        // Update get token button visibility
        const getTokenBtn = document.getElementById('get-token-btn');
        if (getTokenBtn) {
            getTokenBtn.style.display = isValid ? 'none' : 'inline-block';
        }
        
        // Update refresh token button visibility
        const refreshTokenBtn = document.getElementById('global-refresh-token');
        if (refreshTokenBtn) {
            refreshTokenBtn.style.display = isValid ? 'inline-block' : 'none';
        }
    }
    
    /**
     * Update connection status UI
     */
    updateConnectionStatusUI(isConnected, message) {
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
            connectionStatus.textContent = message;
        }
    }
    
    /**
     * Show token progress
     */
    showTokenProgress(message) {
        const getTokenBtn = document.getElementById('get-token-btn');
        if (getTokenBtn) {
            getTokenBtn.disabled = true;
            getTokenBtn.textContent = message;
        }
    }
    
    /**
     * Hide token progress
     */
    hideTokenProgress() {
        const getTokenBtn = document.getElementById('get-token-btn');
        if (getTokenBtn) {
            getTokenBtn.disabled = false;
            getTokenBtn.textContent = 'Get Token';
        }
    }
    
    /**
     * Show connection progress
     */
    showConnectionProgress(message) {
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.disabled = true;
            testConnectionBtn.textContent = message;
        }
    }
    
    /**
     * Hide connection progress
     */
    hideConnectionProgress() {
        const testConnectionBtn = document.getElementById('test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.disabled = false;
            testConnectionBtn.textContent = 'Test Connection';
        }
    }
    
    /**
     * Get current authentication status
     */
    getAuthenticationStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            tokenStatus: this.tokenStatus,
            tokenExpiry: this.tokenExpiry,
            timeUntilExpiry: this.tokenExpiry ? 
                Math.max(0, new Date(this.tokenExpiry).getTime() - Date.now()) : 0
        };
    }
    
    /**
     * Check if token is valid and not expired
     */
    isTokenValid() {
        if (!this.isAuthenticated || !this.tokenExpiry) {
            return false;
        }
        
        const now = Date.now();
        const expiry = new Date(this.tokenExpiry).getTime();
        
        return expiry > now;
    }
}