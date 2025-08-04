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
            // Check if settingsManager exists and has getSettings method
            if (!this.settingsManager) {
                this.logger.warn('Settings manager not available, using default settings');
                this.currentSettings = this.getDefaultSettings();
                return;
            }
            
            if (typeof this.settingsManager.getAllSettings !== 'function') {
                this.logger.warn('Settings manager getAllSettings method not available, using default settings');
                this.currentSettings = this.getDefaultSettings();
                return;
            }
            
            // Try to load settings from settings manager
            this.currentSettings = this.settingsManager.getAllSettings();
            
            // If settings are null or empty, use defaults
            if (!this.currentSettings || Object.keys(this.currentSettings).length === 0) {
                this.logger.info('No existing settings found, using defaults');
                this.currentSettings = this.getDefaultSettings();
            }
            
            this.populateSettingsForm(this.currentSettings);
            this.logger.info('Current settings loaded successfully');
        } catch (error) {
            this.logger.warn('Failed to load current settings, using defaults:', error.message);
            // Don't throw error, use default settings instead
            this.currentSettings = this.getDefaultSettings();
        }
    }
    
    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            environmentId: '',
            apiClientId: '',
            apiSecret: '',
            region: 'NorthAmerica',
            rateLimit: 50,
            populationId: ''
        };
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
            
            // Show immediate feedback
            this.uiManager.showSettingsActionStatus('Saving settings...', 'info');
            
            // Get form data
            const settings = this.getFormData();
            this.logger.info('Form data extracted:', settings);
            
            // Validate settings
            if (!this.validateSettings(settings)) {
                return;
            }
            
            // Save to credentials manager if available
            if (this.credentialsManager) {
                const credentials = {
                    environmentId: settings.pingone_environment_id || '',
                    apiClientId: settings.pingone_client_id || '',
                    apiSecret: settings.pingone_client_secret || '',
                    populationId: settings.pingone_population_id || '',
                    region: settings.pingone_region || settings.region || 'NorthAmerica'
                };
                
                // Also include the PingOne-prefixed keys for consistency
                credentials.pingone_environment_id = credentials.environmentId;
                credentials.pingone_client_id = credentials.apiClientId;
                credentials.pingone_client_secret = credentials.apiSecret;
                credentials.pingone_population_id = credentials.populationId;
                credentials.pingone_region = credentials.region;
                
                const validation = this.credentialsManager.validateCredentials(credentials);
                if (!validation.isValid) {
                    throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
                }
                
                this.credentialsManager.saveCredentials(credentials);
                this.logger.info('Credentials saved to localStorage using PingOne-prefixed keys', {
                    timestamp: new Date().toISOString(),
                    keysUsed: 'pingone_prefixed'
                });
            }
            
            // Save to server
            try {
                const response = await this.localClient.post('/api/settings', settings);
                this.logger.info('Settings saved to server successfully');
            } catch (serverError) {
                this.logger.warn('Failed to save to server, but credentials saved to localStorage:', serverError.message);
            }
            
            // Update settings manager
            this.settingsManager.updateSettings(settings);
            this.currentSettings = settings;
            
            // Show success feedback
            this.uiManager.showSettingsActionStatus('Settings saved successfully', 'success', { autoHideDelay: 3000 });
            
            // Update connection status
            this.updateConnectionStatus('✅ Settings saved! Please - Get token', 'success');
            
            // Emit event for other subsystems
            if (this.eventBus) {
                this.eventBus.emit('settingsSaved', { settings });
            }
            
            // Emit credentials-updated event for population dropdown fallback system
            const credentialsUpdatedEvent = new CustomEvent('credentials-updated', {
                detail: { settings, timestamp: Date.now() }
            });
            document.dispatchEvent(credentialsUpdatedEvent);
            this.logger.info('Credentials-updated event dispatched for population dropdown system');
            
            this.logger.info('Settings save process completed successfully');
            
        } catch (error) {
            this.logger.error('Failed to save settings', error);
            this.uiManager.showSettingsActionStatus('Failed to save settings: ' + error.message, 'error', { autoHide: false });
        } finally {
            this.isSaving = false;
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
            pingone_environment_id: document.getElementById('pingone_environment_id_settings')?.value || '',
            pingone_client_id: document.getElementById('pingone_client_id_settings')?.value || '',
            pingone_client_secret: document.getElementById('pingone_client_secret_settings')?.value || '',
            pingone_region: document.getElementById('pingone_region_settings')?.value || 'NorthAmerica',
            rateLimit: parseInt(document.getElementById('rate-limit')?.value) || 50,
            pingone_population_id: document.getElementById('population-id')?.value || ''
        };
        
        // For backwards compatibility, also set the legacy keys
        settings.environmentId = settings.pingone_environment_id;
        settings.apiClientId = settings.pingone_client_id;
        settings.apiSecret = settings.pingone_client_secret;
        settings.region = settings.pingone_region;
        settings.populationId = settings.pingone_population_id;
        
        // Log migration of keys
        this.logger.info('Settings keys migrated to PingOne-prefixed format', {
            timestamp: new Date().toISOString(),
            migrationResult: 'success'
        });
        
        return settings;
    }
    
    /**
     * Validate settings
     */
    validateSettings(settings) {
        const errors = [];
        
        if (!settings.pingone_environment_id?.trim()) {
            errors.push('PingOne Environment ID is required');
        }
        
        if (!settings.pingone_client_id?.trim()) {
            errors.push('PingOne Client ID is required');
        }
        
        if (!settings.pingone_client_secret?.trim()) {
            errors.push('PingOne Client Secret is required');
        }
        
        if (!settings.pingone_region?.trim()) {
            errors.push('PingOne Region is required');
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
        
        // First, migrate any legacy keys to PingOne-prefixed keys if needed
        this.migrateSettingsKeys(settings);
        
        const fields = {
            'pingone_environment_id_settings': settings.pingone_environment_id || settings.environmentId,
            'pingone_client_id_settings': settings.pingone_client_id || settings.apiClientId,
            'pingone_client_secret_settings': settings.pingone_client_secret || settings.apiSecret,
            'pingone_region_settings': settings.pingone_region || settings.region,
            'rate-limit': settings.rateLimit,
            'population-id': settings.pingone_population_id || settings.populationId
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
     * Migrate legacy settings keys to PingOne-prefixed keys
     * @param {Object} settings - Settings object to migrate
     * @returns {Object} - Migrated settings object
     */
    migrateSettingsKeys(settings) {
        if (!settings) return settings;
        
        const migrations = [
            { from: 'environmentId', to: 'pingone_environment_id' },
            { from: 'apiClientId', to: 'pingone_client_id' },
            { from: 'apiSecret', to: 'pingone_client_secret' },
            { from: 'region', to: 'pingone_region' },
            { from: 'populationId', to: 'pingone_population_id' }
        ];
        
        let migrationsPerformed = false;
        
        migrations.forEach(({ from, to }) => {
            // Only migrate if source exists and destination doesn't
            if (settings[from] !== undefined && settings[from] !== null && 
                (settings[to] === undefined || settings[to] === null || settings[to] === '')) {
                settings[to] = settings[from];
                migrationsPerformed = true;
                
                this.logger.info(`Migrated setting from ${from} to ${to}`, {
                    timestamp: new Date().toISOString(),
                    field: from,
                    migrationResult: 'success'
                });
            }
        });
        
        if (migrationsPerformed) {
            // Update settings in the settings manager if migrations were performed
            this.settingsManager.updateSettings(settings);
        }
        
        return settings;
    }
    
    /**
     * Test connection
     * CRITICAL: This method MUST use GET /api/pingone/test-connection endpoint
     * DO NOT change to POST or different endpoint without updating server-side route
     * Last fixed: 2025-07-22 - Fixed HTTP method mismatch causing 400 Bad Request errors
     */
    async testConnection() {
        try {
            this.logger.info('Testing connection...');
            this.uiManager.showSettingsActionStatus('Testing connection...', 'info');
            
            const settings = this.getFormData();
            
            // Test connection via API
            // CRITICAL: Use GET request to match server-side endpoint
            // Server endpoint: routes/pingone-proxy-fixed.js - router.get('/test-connection')
            // DO NOT change to POST without updating server-side endpoint
            // Last fixed: 2025-07-22 - HTTP method mismatch caused 400 Bad Request errors
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
            const response = await this.localClient.post('/api/token', settings);
            
            if (response.success) {
                this.uiManager.showSettingsActionStatus('Token obtained successfully', 'success', { autoHideDelay: 3000 });
                this.updateConnectionStatus('✅ Token obtained', 'success');
                
                // NEW: Direct global token status updater for sidebar
                console.log('🚀 [DEBUG] SettingsSubsystem: About to call updateGlobalTokenStatusDirect');
                try {
                    // Get the main app instance to call the direct updater
                    if (window.app && typeof window.app.updateGlobalTokenStatusDirect === 'function') {
                        // Calculate time left from token response
                        const timeLeft = response.timeLeft || response.timeRemaining || '';
                        window.app.updateGlobalTokenStatusDirect(timeLeft);
                        console.log('✅ [DEBUG] SettingsSubsystem: updateGlobalTokenStatusDirect called successfully with timeLeft:', timeLeft);
                    } else {
                        console.warn('⚠️ [DEBUG] SettingsSubsystem: window.app.updateGlobalTokenStatusDirect not available');
                    }
                } catch (error) {
                    console.error('❌ [DEBUG] SettingsSubsystem: Error calling updateGlobalTokenStatusDirect:', error);
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
