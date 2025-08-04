/**
 * Settings Management Subsystem
 * 
 * Handles all settings operations with proper separation of concerns.
 * Manages settings form validation, saving, and UI feedback.
 */

import { STANDARD_KEYS } from '../../utils/config-standardization-browser.js';
import PingOneClient from '../../utils/pingone-client.js';

class SettingsSubsystem {
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
        
        // Safe logger access with fallbacks
        const infoLog = this.logger?.info || this.logger?.log || console.log;
        infoLog('Settings Subsystem initialized');
        
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
            // Safe logger access with fallbacks
            const infoLog = this.logger?.info || this.logger?.log || console.log;
            infoLog('Settings Subsystem initialized successfully');
        } catch (error) {
            // Safe logger access with fallbacks
            const errorLog = this.logger?.error || this.logger?.log || console.error;
            errorLog('Failed to initialize Settings Subsystem', error);
            this.uiManager.showSettingsActionStatus('Failed to initialize Settings Subsystem: ' + error.message, 'error');
        }
    }
    
    /**
     * Set up event listeners for settings-related elements
     */
    setupEventListeners() {
        // Safe logger access with fallbacks
        const infoLog = this.logger?.info || this.logger?.log || console.log;
        const warnLog = this.logger?.warn || this.logger?.log || console.warn;
        
        infoLog('Setting up Settings Subsystem event listeners');
        
        // Save settings button
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            infoLog('Found save settings button, attaching event listener');
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                infoLog('Save settings button clicked');
                await this.saveSettings();
            });
        } else {
            warnLog('Save settings button not found in DOM');
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
        
        infoLog('Settings Subsystem event listeners setup complete');
    }
    
    /**
     * Load current settings from server API first, then fall back to local storage
     */
    async loadCurrentSettings() {
        try {
            // First try to load from server API
            try {
                this.logger.info('🔧 SETTINGS: Loading settings from server API...');
                const response = await fetch('/api/settings');
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        this.logger.info('🔧 SETTINGS: Server settings loaded successfully', {
                            hasEnvironmentId: !!result.data.pingone_environment_id,
                            hasApiClientId: !!result.data.pingone_client_id,
                            region: result.data.pingone_region
                        });
                        
                        // Use the data property from the response
                        this.currentSettings = result.data;
                        this.populateSettingsForm(this.currentSettings);
                        this.logger.info('🔧 SETTINGS: Form fields populated successfully');
                        return;
                    } else {
                        this.logger.warn('🔧 SETTINGS: Invalid server response format:', result);
                    }
                } else {
                    this.logger.warn('🔧 SETTINGS: Server API returned non-OK status:', response.status);
                }
            } catch (apiError) {
                this.logger.warn('🔧 SETTINGS: Failed to load from server API, falling back to local storage', {
                    error: apiError.message
                });
            }
            
            // Fallback to local settings manager
            this.logger.info('🔧 SETTINGS: Loading settings from local storage...');
            this.currentSettings = this.settingsManager.getSettings();
            this.populateSettingsForm(this.currentSettings);
            this.logger.info('🔧 SETTINGS: Local settings loaded successfully');
            
        } catch (error) {
            // Safe logger access with fallbacks
            const errorLog = this.logger?.error || this.logger?.log || console.error;
            errorLog('Failed to load current settings', error);
            throw error;
        }
    }
    
    /**
     * Save settings
     */
    async saveSettings() {
        // Safe logger access with fallbacks
        const infoLog = this.logger?.info || this.logger?.log || console.log;
        const warnLog = this.logger?.warn || this.logger?.log || console.warn;
        const errorLog = this.logger?.error || this.logger?.log || console.error;
        const debugLog = this.logger?.debug || this.logger?.log || console.log;
        
        if (this.isSaving) {
            warnLog('Settings save already in progress');
            return;
        }
        
        try {
            this.isSaving = true;
            infoLog('Starting settings save process');
            
            // Check dependencies
            debugLog('Checking saveSettings dependencies:', {
                hasUIManager: !!this.uiManager,
                hasLocalClient: !!this.localClient,
                hasSettingsManager: !!this.settingsManager,
                hasCredentialsManager: !!this.credentialsManager,
                hasEventBus: !!this.eventBus
            });
            
            // Show immediate feedback
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus('Saving settings...', 'info');
                debugLog('UI feedback shown successfully');
            } else {
                warnLog('UIManager or showSettingsActionStatus method not available');
            }
            
            // Get form data
            const settings = this.getFormData();
            
            // Validate settings
            if (!this.validateSettings(settings)) {
                errorLog('Settings validation failed');
                throw new Error('Settings validation failed');
            }
            
            // Save to credentials manager if available
            if (this.credentialsManager) {
                try {
                    const credentials = {
                        environmentId: settings.pingone_environment_id || '',
                        apiClientId: settings.pingone_client_id || '',
                        apiSecret: settings.pingone_client_secret || '',
                        populationId: settings.pingone_population_id || '',
                        region: settings.pingone_region || 'NA'
                    };
                    
                    const validation = this.credentialsManager.validateCredentials(credentials);
                    if (!validation.isValid) {
                        throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
                    }
                    
                    this.credentialsManager.saveCredentials(credentials);
                    infoLog('Credentials saved to localStorage successfully');
                } catch (credentialsError) {
                    errorLog('Credentials manager error:', credentialsError);
                    throw new Error(`Credentials save failed: ${credentialsError.message}`);
                }
            } else {
                debugLog('No credentials manager available, skipping credentials save');
            }
            
            // Save to server
            if (this.localClient && typeof this.localClient.post === 'function') {
                try {
                    debugLog('Attempting server save with localClient.post');
                    const response = await this.localClient.post('/api/settings', settings);
                    infoLog('Server save successful:', response);
                } catch (serverError) {
                    errorLog('Failed to save to server:', serverError);
                    const errorMessage = serverError.message || 'Unknown server error';
                    if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                        this.uiManager.showSettingsActionStatus('Failed to save settings: ' + errorMessage, 'error', { autoHide: false });
                    }
                    throw new Error(`Server save failed: ${errorMessage}`);
                }
            } else {
                errorLog('LocalClient not available or post method missing');
                throw new Error('LocalClient not available for server communication');
            }
            
            // Update settings manager
            if (this.settingsManager && typeof this.settingsManager.updateSettings === 'function') {
                try {
                    this.settingsManager.updateSettings(settings);
                    this.currentSettings = settings;
                    debugLog('Settings manager updated successfully');
                } catch (settingsManagerError) {
                    errorLog('Settings manager update error:', settingsManagerError);
                    throw new Error(`Settings manager update failed: ${settingsManagerError.message}`);
                }
            } else {
                warnLog('Settings manager not available or updateSettings method missing');
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
                warnLog('Connection status update failed:', connectionStatusError);
            }
            
            // Emit event for other subsystems
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                try {
                    this.eventBus.emit('settingsSaved', { settings });
                    debugLog('Settings saved event emitted successfully');
                } catch (eventError) {
                    warnLog('Event emission failed:', eventError);
                }
            }
            
            infoLog('Settings save process completed successfully');
            
        } catch (error) {
            errorLog('Failed to save settings - detailed error:', {
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
            debugLog('Settings save process finished, isSaving flag reset');
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
        
        // Map UI region values back to standardized values
        const mapRegionToStandardized = (uiRegion) => {
            const reverseRegionMapping = {
                'NorthAmerica': 'NA',
                'Europe': 'EU',
                'Asia': 'AP', 
                'Canada': 'CA',
                'Australia': 'AU',
                // Handle standardized values that might be passed through
                'NA': 'NA',
                'EU': 'EU',
                'AP': 'AP',
                'CA': 'CA',
                'AU': 'AU'
            };
            return reverseRegionMapping[uiRegion] || 'NA';
        };
        
        // Get form region value and convert to standardized
        const uiRegionValue = formData.get('region') || 'NorthAmerica';
        const standardizedRegion = mapRegionToStandardized(uiRegionValue);
        
        // Create settings object with standardized keys
        const settings = {
            pingone_environment_id: formData.get('pingone_environment_id') || '',
            pingone_client_id: formData.get('pingone_client_id') || '',
            pingone_client_secret: formData.get('pingone_client_secret') || '',
            pingone_population_id: formData.get('pingone_population_id') || '',
            pingone_region: standardizedRegion,
            rate_limit: parseInt(formData.get('rate-limit')) || 90
        };
        
        return settings;
    }
    
    /**
     * Validate settings
     */
    validateSettings(settings) {
        const errors = [];
        
        if (!settings.pingone_environment_id?.trim()) {
            errors.push('Environment ID is required');
        }
        if (!settings.pingone_client_id?.trim()) {
            errors.push('API Client ID is required');
        }
        if (!settings.pingone_client_secret?.trim()) {
            errors.push('API Secret is required');
        }
        if (!settings.pingone_region?.trim()) {
            errors.push('Region is required');
        }
        if (errors.length > 0) {
            // Safe logger access with fallbacks
            const errorLog = this.logger?.error || this.logger?.log || console.error;
            errorLog('Settings validation failed', { errors });
            
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus('Validation failed: ' + errors.join(', '), 'error');
            }
            
            return false;
        }
        
        return true;
    }
    
    /**
     * Populate settings form with current values
     */
    populateSettingsForm(settings) {
        if (!settings) return;
        
        const form = document.getElementById('settings-form');
        if (!form) return;
        
        // Map standardized region values to UI dropdown values
        const mapRegionForUI = (standardizedRegion) => {
            const regionMapping = {
                'NA': 'NorthAmerica',
                'EU': 'Europe', 
                'AP': 'Asia',
                'CA': 'Canada',
                'AU': 'Australia'
            };
            return regionMapping[standardizedRegion] || 'NorthAmerica';
        };
        
        const uiRegionValue = mapRegionForUI(settings.pingone_region || 'NA');
        
        const fields = {
            'pingone_environment_id': settings.pingone_environment_id || '',
            'pingone_client_id': settings.pingone_client_id || '',
            'pingone_client_secret': settings.pingone_client_secret || '',
            'pingone_population_id': settings.pingone_population_id || '',
            'region': uiRegionValue,
            'rate-limit': settings.rate_limit || 90
        };
        
        Object.entries(fields).forEach(([name, value]) => {
            const field = form.querySelector(`[name="${name}"]`);
            if (field) {
                field.value = value;
            }
        });
        
        const infoLog = this.logger?.info || this.logger?.log || console.log;
        infoLog('Settings form populated with current values');
    }
    
    /**
     * Test connection and get token
     */
    async testConnection() {
        // Safe logger access with fallbacks
        const infoLog = this.logger?.info || this.logger?.log || console.log;
        const errorLog = this.logger?.error || this.logger?.log || console.error;
        
        try {
            infoLog('Testing connection and getting token...');
            
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus('Testing connection and getting token...', 'info');
            }
            
            // Get current form values for the test
            const environmentId = document.getElementById('pingone_environment_id')?.value;
            const clientId = document.getElementById('pingone_client_id')?.value;
            const clientSecret = document.getElementById('pingone_client_secret')?.value;
            const region = document.getElementById('region')?.value;
            
            // Validate required fields
            if (!environmentId || !clientId || !clientSecret || !region) {
                const missingFields = [];
                if (!environmentId) missingFields.push('Environment ID');
                if (!clientId) missingFields.push('Client ID');
                if (!clientSecret) missingFields.push('Client Secret');
                if (!region) missingFields.push('Region');
                
                const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
                if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                    this.uiManager.showSettingsActionStatus(errorMessage, 'error');
                }
                this.updateConnectionStatus('❌ ' + errorMessage, 'error');
                return;
            }
            
            // Use PingOneClient to construct endpoints and normalized region
            const endpoints = PingOneClient.getPingOneEndpoints(region);
            infoLog('Testing PingOne API connection with endpoints:', endpoints);
            // Use endpoints.api for demonstration, can be extended for other endpoints
            const response = await this.localClient.post('/api/pingone/test-connection', {
                environmentId,
                clientId,
                clientSecret,
                region: endpoints.tld,
                apiUrl: endpoints.api
            });

            if (response.success) {
                infoLog('Connection successful, getting token...');
                if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                    this.uiManager.showSettingsActionStatus('Connection successful! Getting token...', 'info');
                }
                // Get token using the same credentials and region
                const tokenResponse = await this.localClient.post('/token/worker', {
                    environmentId,
                    clientId,
                    clientSecret,
                    region: endpoints.tld
                });
                if (tokenResponse.success) {
                    let successMessage = 'Connection successful! Token obtained';
                    if (tokenResponse.data && tokenResponse.data.expires_in) {
                        const expiresIn = Math.floor(tokenResponse.data.expires_in / 60);
                        successMessage += ` (expires in ${expiresIn} minutes)`;
                    }
                    if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                        this.uiManager.showSettingsActionStatus(successMessage, 'success', { autoHideDelay: 8000 });
                    }
                    this.updateConnectionStatus('✅ ' + successMessage, 'success');
                    if (this.eventBus && typeof this.eventBus.emit === 'function') {
                        this.eventBus.emit('tokenObtained', { token: tokenResponse.data });
                        this.eventBus.emit('token:updated', { token: tokenResponse.data });
                    }
                    if (window.app && window.app.subsystems && window.app.subsystems.globalTokenManager) {
                        setTimeout(() => {
                            window.app.subsystems.globalTokenManager.updateGlobalTokenStatus();
                        }, 100);
                    }
                } else {
                    const errorMessage = 'Connection successful but failed to get token: ' + (tokenResponse.error || 'Unknown error');
                    if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                        this.uiManager.showSettingsActionStatus(errorMessage, 'warning');
                    }
                    this.updateConnectionStatus('⚠️ ' + errorMessage, 'warning');
                }
            } else {
                const errorMessage = 'Connection test failed: ' + (response.error || 'Unknown error');
                if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                    this.uiManager.showSettingsActionStatus(errorMessage, 'error');
                }
                this.updateConnectionStatus('❌ Connection failed', 'error');
            }
        } catch (error) {
            errorLog('Connection test failed', error);
            
            const errorMessage = 'Connection test failed: ' + error.message;
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus(errorMessage, 'error');
            }
            this.updateConnectionStatus('❌ Connection failed', 'error');
        }
    }
    
    /**
     * Get token
     */
    async getToken() {
        // Safe logger access with fallbacks
        const infoLog = this.logger?.info || this.logger?.log || console.log;
        const errorLog = this.logger?.error || this.logger?.log || console.error;
        
        try {
            infoLog('Getting token...');
            
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus('Getting token...', 'info');
            }
            
            const response = await this.localClient.post('/token/worker');
            
            if (response.success) {
                if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                    this.uiManager.showSettingsActionStatus('Token retrieved successfully!', 'success');
                }
                this.updateConnectionStatus('✅ Token obtained', 'success');
                
                // Emit token obtained event
                if (this.eventBus && typeof this.eventBus.emit === 'function') {
                    this.eventBus.emit('tokenObtained', { token: response.data });
                }
            } else {
                if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                    this.uiManager.showSettingsActionStatus('Failed to get token: ' + (response.error || 'Unknown error'), 'error');
                }
                this.updateConnectionStatus('❌ Token failed', 'error');
            }
        } catch (error) {
            errorLog('Failed to get token', error);
            
            if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
                this.uiManager.showSettingsActionStatus('Failed to get token: ' + error.message, 'error');
            }
            this.updateConnectionStatus('❌ Token failed', 'error');
        }
    }
    
    /**
     * Toggle API secret visibility
     */
    toggleSecretVisibility() {
        const secretField = document.getElementById('pingone_client_secret');
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
            // Safe logger access with fallbacks
            const warnLog = this.logger?.warn || this.logger?.log || console.warn;
            warnLog('EventBus not available for cross-subsystem events');
            return;
        }
        
        // Listen for token events
        this.eventBus.on('tokenExpired', (data) => {
            // Safe logger access with fallbacks
            const warnLog = this.logger?.warn || this.logger?.log || console.warn;
            warnLog('Token expired');
            this.updateConnectionStatus('❌ Token expired', 'error');
        });
        
        this.eventBus.on('tokenError', (data) => {
            // Safe logger access with fallbacks
            const errorLog = this.logger?.error || this.logger?.log || console.error;
            errorLog('Token error detected', data);
            this.updateConnectionStatus('❌ Token error', 'error');
        });
        
        this.eventBus.on('tokenRefreshed', (data) => {
            // Safe logger access with fallbacks
            const infoLog = this.logger?.info || this.logger?.log || console.log;
            infoLog('Token refreshed successfully');
            this.updateConnectionStatus('✅ Token refreshed', 'success');
        });
        
        // Safe logger access with fallbacks
        const debugLog = this.logger?.debug || this.logger?.log || console.log;
        debugLog('Cross-subsystem event listeners set up for SettingsSubsystem');
    }
    
    /**
     * Get all settings
     */
    getAllSettings() {
        if (!this.settingsManager) {
            // Safe logger access with fallbacks
            const warnLog = this.logger?.warn || this.logger?.log || console.warn;
            warnLog('No settings available, returning empty object');
            return {};
        }
        
        return this.settingsManager.getSettings() || {};
    }
}

export default SettingsSubsystem;
