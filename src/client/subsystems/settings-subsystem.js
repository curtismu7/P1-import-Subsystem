/**
 * Settings Management Subsystem
 * 
 * Handles all settings operations with proper separation of concerns.
 * Manages settings form validation, saving, and UI feedback.
 */

export class SettingsSubsystem {
    constructor(logger, uiManager, localClient, settingsManager, eventBus, credentialsManager) {
        this.logger = logger;
        this.uiManager = uiManager;
        this.localClient = localClient;
        this.settingsManager = settingsManager;
        this.eventBus = eventBus;
        this.credentialsManager = credentialsManager;
        
        // Settings state management
        this.isSaving = false;
        this.currentSettings = null;
        
        this.logger.info('Settings Subsystem initialized');
        
        // Set up event listeners for cross-subsystem communication
        this.setupCrossSubsystemEvents();
    }
    
    /**
     * Initialize the settings subsystem
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.loadCurrentSettings();
            this.logger.info('Settings Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Settings Subsystem', error);
            this.uiManager.showSettingsActionStatus('Failed to initialize Settings Subsystem: ' + error.message, 'error');
        }
    }
    
    /**
     * Set up event listeners for settings-related elements
     */
    setupEventListeners() {
        this.logger.info('Setting up Settings Subsystem event listeners');
        
        // Save settings button
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            this.logger.info('Found save settings button, attaching event listener');
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                this.logger.info('Save settings button clicked');
                await this.saveSettings();
            });
        } else {
            this.logger.warn('Save settings button not found in DOM');
        }
        
        // Test connection button
        const testBtn = document.getElementById('test-connection-btn');
        if (testBtn) {
            testBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.testConnection();
            });
        }
        
        // Get token button
        const tokenBtn = document.getElementById('get-token-btn');
        if (tokenBtn) {
            tokenBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.getToken();
            });
        }
        
        // API secret visibility toggle
        const toggleBtn = document.getElementById('toggle-api-secret-visibility');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSecretVisibility();
            });
        }
        
        this.logger.info('Settings Subsystem event listeners setup complete');
    }
    
    /**
     * Load current settings from settings manager
     */
    async loadCurrentSettings() {
        try {
            this.currentSettings = this.settingsManager.getSettings();
            this.populateSettingsForm(this.currentSettings);
            this.logger.info('Current settings loaded successfully');
        } catch (error) {
            this.logger.error('Failed to load current settings', error);
            throw error;
        }
    }
    
    /**
     * Save settings
     */
    async saveSettings() {
        if (this.isSaving) {
            this.logger.warn('Settings save already in progress');
            return;
        }
        
        try {
            this.isSaving = true;
            this.logger.info('Starting settings save process');
            
            // Debug: Check all dependencies
            this.logger.debug('Checking saveSettings dependencies:', {
                hasUIManager: !!this.uiManager,
                hasLocalClient: !!this.localClient,
                hasSettingsManager: !!this.settingsManager,
                hasCredentialsManager: !!this.credentialsManager,
                hasEventBus: !!this.eventBus
            });
            
            // Show immediate feedback
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus('Saving settings...', 'info');
                this.logger.debug('UI feedback shown successfully');
            } else {
                this.logger.warn('UIManager or showSettingsActionStatus method not available');
            }
            
            // Get form data
            let settings;
            try {
                settings = this.getFormData();
                this.logger.info('Form data extracted successfully:', settings);
            } catch (formError) {
                this.logger.error('Failed to get form data:', formError);
                throw new Error(`Form data extraction failed: ${formError.message}`);
            }
            
            // Validate settings
            try {
                if (!this.validateSettings(settings)) {
                    this.logger.error('Settings validation failed');
                    return;
                }
                this.logger.debug('Settings validation passed');
            } catch (validationError) {
                this.logger.error('Settings validation error:', validationError);
                throw new Error(`Settings validation error: ${validationError.message}`);
            }
            
            // Save to credentials manager if available
            if (this.credentialsManager) {
                try {
                    const credentials = {
                        environmentId: settings.environmentId || '',
                        apiClientId: settings.apiClientId || '',
                        apiSecret: settings.apiSecret || '',
                        populationId: settings.populationId || '',
                        region: settings.region || 'NorthAmerica'
                    };
                    
                    const validation = this.credentialsManager.validateCredentials(credentials);
                    if (!validation.isValid) {
                        throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
                    }
                    
                    this.credentialsManager.saveCredentials(credentials);
                    this.logger.info('Credentials saved to localStorage successfully');
                } catch (credentialsError) {
                    this.logger.error('Credentials manager error:', credentialsError);
                    throw new Error(`Credentials save failed: ${credentialsError.message}`);
                }
            } else {
                this.logger.debug('No credentials manager available, skipping credentials save');
            }
            
            // Save to server
            if (this.localClient && typeof this.localClient.post === 'function') {
                try {
                    this.logger.debug('Attempting server save with localClient.post');
                    const response = await this.localClient.post('/api/settings', settings);
                    this.logger.info('Server save successful:', response);
                } catch (serverError) {
                    this.logger.error('Failed to save to server:', serverError);
                    const errorMessage = serverError.message || 'Unknown server error';
                    if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                        this.uiManager.showSettingsActionStatus('Failed to save settings: ' + errorMessage, 'error', { autoHide: false });
                    }
                    throw new Error(`Server save failed: ${errorMessage}`);
                }
            } else {
                this.logger.error('LocalClient not available or post method missing');
                throw new Error('LocalClient not available for server communication');
            }
            
            // Update settings manager
            if (this.settingsManager && typeof this.settingsManager.updateSettings === 'function') {
                try {
                    this.settingsManager.updateSettings(settings);
                    this.currentSettings = settings;
                    this.logger.debug('Settings manager updated successfully');
                } catch (settingsManagerError) {
                    this.logger.error('Settings manager update error:', settingsManagerError);
                    throw new Error(`Settings manager update failed: ${settingsManagerError.message}`);
                }
            } else {
                this.logger.warn('Settings manager not available or updateSettings method missing');
            }
            
            // Show success feedback
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus('Settings saved successfully', 'success', { autoHideDelay: 3000 });
            }
            
            // Update connection status
            try {
                if (typeof this.updateConnectionStatus === 'function') {
                    this.updateConnectionStatus('✅ Settings saved! Please - Get token', 'success');
                }
            } catch (connectionStatusError) {
                this.logger.warn('Connection status update failed:', connectionStatusError);
            }
            
            // Emit event for other subsystems
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                try {
                    this.eventBus.emit('settingsSaved', { settings });
                    this.logger.debug('Settings saved event emitted successfully');
                } catch (eventError) {
                    this.logger.warn('Event emission failed:', eventError);
                }
            }
            
            this.logger.info('Settings save process completed successfully');
            
        } catch (error) {
            this.logger.error('Failed to save settings - detailed error:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus('Failed to save settings: ' + error.message, 'error', { autoHide: false });
            }
            
            // Re-throw the error so it can be caught by calling code
            throw error;
        } finally {
            this.isSaving = false;
            this.logger.debug('Settings save process finished, isSaving flag reset');
        }
    }
    
    /**
     * Get form data from settings form
     */
    getFormData() {
        const form = document.getElementById('settings-form');
        if (!form) {
            throw new Error('Settings form not found');
        }
        
        const formData = new FormData(form);
        const settings = {
            environmentId: formData.get('environment-id') || '',
            apiClientId: formData.get('api-client-id') || '',
            apiSecret: formData.get('api-secret') || '',
            region: formData.get('region') || 'NorthAmerica',
            rateLimit: parseInt(formData.get('rate-limit')) || 50,
            populationId: formData.get('population-id') || ''
        };
        
        return settings;
    }
    
    /**
     * Validate settings
     */
    validateSettings(settings) {
        const errors = [];
        
        if (!settings.environmentId?.trim()) {
            errors.push('Environment ID is required');
        }
        
        if (!settings.apiClientId?.trim()) {
            errors.push('API Client ID is required');
        }
        
        if (!settings.apiSecret?.trim()) {
            errors.push('API Secret is required');
        }
        
        if (!settings.region?.trim()) {
            errors.push('Region is required');
        }
        
        if (settings.rateLimit && (settings.rateLimit < 1 || settings.rateLimit > 1000)) {
            errors.push('Rate limit must be between 1 and 1000');
        }
        
        if (errors.length > 0) {
            const errorMessage = 'Validation failed: ' + errors.join(', ');
            this.logger.error('Settings validation failed', { errors });
            this.uiManager.showSettingsActionStatus(errorMessage, 'error', { autoHide: false });
            return false;
        }
        
        return true;
    }
    
    /**
     * Populate settings form with current values
     */
    populateSettingsForm(settings) {
        if (!settings) return;
        
        const fields = {
            'environment-id': settings.environmentId,
            'api-client-id': settings.apiClientId,
            'api-secret': settings.apiSecret,
            'region': settings.region,
            'rate-limit': settings.rateLimit,
            'population-id': settings.populationId
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value !== undefined && value !== null) {
                field.value = value;
            }
        });
        
        this.logger.info('Settings form populated with current values');
    }
    
    /**
     * Test connection
     */
    async testConnection() {
        try {
            this.logger.info('Testing connection...');
            this.uiManager.showSettingsActionStatus('Testing connection...', 'info');
            
            const settings = this.getFormData();
            
            // Test connection via API
            // CRITICAL: Use GET request to match server-side endpoint
            // Server endpoint: routes/pingone-proxy-fixed.js - router.get('/test-connection')
            // Last fixed: 2025-07-21 - HTTP method mismatch caused 400 Bad Request errors
            const response = await this.localClient.get('/api/pingone/test-connection');
            
            if (response.success) {
                this.uiManager.showSettingsActionStatus('Connection test successful', 'success', { autoHideDelay: 3000 });
                this.updateConnectionStatus('✅ Connection successful', 'success');
            } else {
                this.uiManager.showSettingsActionStatus('Connection test failed: ' + response.message, 'error');
                this.updateConnectionStatus('❌ Connection failed', 'error');
            }
            
        } catch (error) {
            this.logger.error('Connection test failed', error);
            this.uiManager.showSettingsActionStatus('Connection test failed: ' + error.message, 'error');
            this.updateConnectionStatus('❌ Connection failed', 'error');
        }
    }
    
    /**
     * Get token
     */
    async getToken() {
        try {
            this.logger.info('Getting token...');
            this.uiManager.showSettingsActionStatus('Getting token...', 'info');
            
            const settings = this.getFormData();
            
            // Get token via API
            const response = await this.localClient.post('/api/v1/auth/token', settings);
            
            if (response.success) {
                this.uiManager.showSettingsActionStatus('Token obtained successfully', 'success', { autoHideDelay: 3000 });
                this.updateConnectionStatus('✅ Token obtained', 'success');
                
                // NEW: Direct global token status updater for sidebar
                (this.logger?.debug || window.logger?.debug || console.log)('🚀 [DEBUG] SettingsSubsystem: About to call updateGlobalTokenStatusDirect');
                try {
                    // Get the main app instance to call the direct updater
                    if (window.app && typeof window.app.updateGlobalTokenStatusDirect === 'function') {
                        // Calculate time left from token response
                        const timeLeft = response.timeLeft || response.timeRemaining || '';
                        window.app.updateGlobalTokenStatusDirect(timeLeft);
                        (this.logger?.debug || window.logger?.debug || console.log)('✅ [DEBUG] SettingsSubsystem: updateGlobalTokenStatusDirect called successfully with timeLeft:', timeLeft);
                    } else {
                        (this.logger?.warn || window.logger?.warn || console.warn)('⚠️ [DEBUG] SettingsSubsystem: window.app.updateGlobalTokenStatusDirect not available');
                    }
                } catch (error) {
                    (this.logger?.error || window.logger?.error || console.error)('❌ [DEBUG] SettingsSubsystem: Error calling updateGlobalTokenStatusDirect:', error);
                }
                
                // Emit event for other subsystems
                if (this.eventBus) {
                    this.eventBus.emit('tokenObtained', { token: response.token });
                }
            } else {
                this.uiManager.showSettingsActionStatus('Failed to get token: ' + response.message, 'error');
                this.updateConnectionStatus('❌ Token failed', 'error');
            }
            
        } catch (error) {
            this.logger.error('Failed to get token', error);
            this.uiManager.showSettingsActionStatus('Failed to get token: ' + error.message, 'error');
            this.updateConnectionStatus('❌ Token failed', 'error');
        }
    }
    
    /**
     * Toggle API secret visibility
     */
    toggleSecretVisibility() {
        const secretField = document.getElementById('api-secret');
        const toggleBtn = document.getElementById('toggle-api-secret-visibility');
        const icon = toggleBtn?.querySelector('i');
        
        if (secretField && toggleBtn && icon) {
            if (secretField.type === 'password') {
                secretField.type = 'text';
                icon.className = 'fas fa-eye-slash';
                toggleBtn.setAttribute('aria-label', 'Hide password');
            } else {
                secretField.type = 'password';
                icon.className = 'fas fa-eye';
                toggleBtn.setAttribute('aria-label', 'Show password');
            }
        }
    }
    
    /**
     * Update connection status display
     */
    updateConnectionStatus(message, type) {
        const statusElement = document.getElementById('settings-connection-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `connection-status status-${type}`;
        }
    }
    
    /**
     * Set up cross-subsystem event listeners
     */
    setupCrossSubsystemEvents() {
        if (!this.eventBus) {
            this.logger.warn('EventBus not available for cross-subsystem events');
            return;
        }
        
        // Listen for token expiration events
        this.eventBus.on('tokenExpired', (data) => {
            this.logger.warn('Token expired');
            this.updateConnectionStatus('⚠️ Token expired', 'warning');
        });
        
        // Listen for token error events
        this.eventBus.on('tokenError', (data) => {
            this.logger.error('Token error detected', data);
            this.updateConnectionStatus('❌ Token error', 'error');
        });
        
        // Listen for token refresh events
        this.eventBus.on('tokenRefreshed', (data) => {
            this.logger.info('Token refreshed successfully');
            this.updateConnectionStatus('✅ Token refreshed', 'success');
        });
        
        this.logger.debug('Cross-subsystem event listeners set up for SettingsSubsystem');
    }
    
    /**
     * Get all settings (required by App initialization)
     * @returns {Object} All current settings
     */
    getAllSettings() {
        if (this.settingsManager && this.settingsManager.getAllSettings) {
            return this.settingsManager.getAllSettings();
        } else if (this.settingsManager && this.settingsManager.getSettings) {
            return this.settingsManager.getSettings();
        } else if (this.currentSettings) {
            return this.currentSettings;
        } else {
            this.logger.warn('No settings available, returning empty object');
            return {};
        }
    }
}
