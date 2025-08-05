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
            const settings = await this.settingsSubsystem.getSettings();
            if (!this.validateSettings(settings)) {
                throw new Error('Invalid settings - please check your configuration');
            }
            
            // Request token from server
            const response = await this.localClient.post('/api/token', {
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
            const settings = await this.settingsSubsystem.getSettings();
            if (!this.validateSettings(settings)) {
                throw new Error('Invalid settings - please check your configuration');
            }
            
            // Test connection
            const response = await this.localClient.post('/api/test-connection', settings);
            
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
            
            const response = await this.localClient.post('/api/token/refresh');
            
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
            await this.settingsSubsystem.saveSettings(settings);
            
            // Clear current authentication state since settings changed
            this.clearAuthenticationState();
            
            // Update UI
            this.uiManager.showSuccess('Settings saved successfully');
            
            this.logger.info('Settings saved successfully');
            
        } catch (error) {
            this.logger.error('Failed to save settings', error);
            this.uiManager.showError('Settings Save Failed', error.message);
        }
    }
    
    /**
     * Check initial token status
     */
    async checkInitialTokenStatus() {
        try {
            const response = await this.localClient.get('/api/token/status');
            
            if (response.success && response.valid) {
                this.tokenStatus = response.token;
                this.tokenExpiry = response.expiry;
                this.isAuthenticated = true;
                this.updateTokenStatusUI(true, 'Token is valid');
            } else {
                this.isAuthenticated = false;
                this.updateTokenStatusUI(false, 'No valid token');
            }
            
        } catch (error) {
            this.logger.error('Failed to check token status', error);
            this.isAuthenticated = false;
            this.updateTokenStatusUI(false, 'Token status unknown');
        }
    }
    
    /**
     * Set up automatic token refresh timer
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