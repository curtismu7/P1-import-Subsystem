// Settings Page Module
// PingOne User Management Tool v7.2.0

export class SettingsPage {
    constructor(app) {
        this.app = app;
        this.isLoaded = false;
        this.signageSystem = new SignageSystem(this);
        this.tokenMonitor = null;
        this.systemHealthCheck = null;
    }
    
    async load() {
        if (this.isLoaded) return;
        
        console.log('📄 Loading Settings page...');
        
        const pageContent = `
            <div class="page-header">
                <h1><i class="mdi mdi-cog"></i> Settings</h1>
                <p>Configure your PingOne environment settings and credentials</p>
            </div>
            
            <div class="settings-container">
                <!-- Credentials Section -->
                <section class="settings-section">
                    <div class="settings-box">
                        <h3 class="section-title">PingOne Credentials</h3>
                        <p>Configure your PingOne environment connection settings</p>
                        
                        <form id="settings-form" class="settings-form">
                            <div class="form-group">
                                <label for="settings-environment-id"><i class="mdi mdi-earth"></i> PingOne Environment ID *</label>
                                <input type="text" id="settings-environment-id" name="environmentId" class="form-control" required>
                                <div class="form-help">Your PingOne environment identifier</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="settings-client-id"><i class="mdi mdi-account"></i> PingOne Client ID *</label>
                                <input type="text" id="settings-client-id" name="clientId" class="form-control" required>
                                <div class="form-help">Your PingOne API client identifier</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="settings-client-secret"><i class="mdi mdi-key"></i> PingOne Client Secret *</label>
                                <div class="input-with-button">
                                    <input type="password" id="settings-client-secret" name="clientSecret" class="form-control" required>
                                    <button type="button" class="btn-icon" id="settings-toggle-secret" title="Toggle password visibility">
                                        <i class="mdi mdi-eye" aria-hidden="true"></i>
                                    </button>
                                </div>
                                <div class="form-help">Your PingOne API client secret</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="settings-region"><i class="mdi mdi-map-marker"></i> PingOne Region *</label>
                                <select id="settings-region" name="region" class="form-control" required>
                                    <option value="">Select Region</option>
                                    <option value="NorthAmerica">North America</option>
                                    <option value="Europe">Europe</option>
                                    <option value="AsiaPacific">Asia Pacific</option>
                                    <option value="Canada">Canada</option>
                                </select>
                                <div class="form-help">Your PingOne environment region</div>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="mdi mdi-account-group"></i> PingOne Population</label>
                                <div class="input-group">
                                    <select id="settings-population" name="populationId" class="form-control">
                                        <option value="">Select Population</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary">
                                        <i class="mdi mdi-refresh"></i>
                                    </button>
                                </div>
                                <div class="form-help">Default population for operations (optional)</div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" id="save-settings" class="btn btn-primary">
                                    <i class="mdi mdi-content-save"></i> Save Settings
                                </button>
                                <button type="button" id="test-connection" class="btn btn-outline-info">
                                    <i class="mdi mdi-test-tube"></i> Test Connection
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
                
                <!-- Token Management Section -->
                <section class="settings-section">
                    <div class="settings-box">
                        <h3 class="section-title">Token Management</h3>
                        <p>Manage your PingOne access tokens and authentication</p>
                        
                        <div class="token-actions">
                            <button type="button" id="refresh-token" class="btn btn-primary btn-sm" title="Get a new token using current credentials">
                                <i class="mdi mdi-refresh"></i> Refresh Token
                            </button>
                            <button type="button" id="validate-token" class="btn btn-outline-success btn-sm" title="Check if current token is valid">
                                <i class="mdi mdi-check-circle"></i> Validate Token
                            </button>
                            <button type="button" id="test-connection-token" class="btn btn-outline-info btn-sm" title="Test connection with current token">
                                <i class="mdi mdi-connection"></i> Test Connection
                            </button>
                            <button type="button" id="revoke-token" class="btn btn-outline-warning btn-sm" title="Revoke current token">
                                <i class="mdi mdi-block-helper"></i> Revoke Token
                            </button>
                            <button type="button" id="clear-token" class="btn btn-outline-danger btn-sm" title="Clear stored token">
                                <i class="mdi mdi-delete"></i> Clear Token
                            </button>
                        </div>
                        
                        <div class="token-status-display" id="token-status-display" style="display: none;">
                            <div class="token-details">
                                <div class="detail-row">
                                    <strong>Status:</strong>
                                    <span id="token-status-text">Checking...</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Expires:</strong>
                                    <span id="token-expires-text">-</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Time Remaining:</strong>
                                    <span id="token-remaining-text">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <!-- System Information -->
                <section class="settings-section">
                    <div class="settings-box">
                        <h3 class="section-title">System Information</h3>
                        <p>Application and server status information</p>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Application Version:</span>
                                <span id="settings-app-version" class="value">v7.2.0</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Server Status:</span>
                                <span id="settings-server-status" class="value status-indicator">
                                    <i class="icon-circle"></i> Connected
                                </span>
                            </div>
                            <div class="info-item">
                                <span class="label">Last Updated:</span>
                                <span id="settings-last-updated" class="value">-</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
        
        const settingsPage = document.getElementById('settings-page');
        if (settingsPage) {
            settingsPage.innerHTML = pageContent;
            this.setupEventListeners();
            await this.populateForm(); // Make this async
            
            // Apply final inline styles to ensure buttons render with black outline and light blue background
            this.applyTokenButtonStyles();
            
            // Focus management for Settings page
            this.manageSettingsFocus();
            
            // Load populations for the dropdown with a small delay to ensure settings are loaded
            setTimeout(() => {
                // Force clear dropdown first
                const populationSelect = document.getElementById('settings-population');
                if (populationSelect) {
                    populationSelect.innerHTML = '<option value="">Select Population</option>';
                }
                this.loadPopulations();
                // Also try again after a longer delay in case settings are still loading
                setTimeout(() => {
                    this.loadPopulations();
                }, 2000);
            }, 1000);
            
            // Show signage window after a short delay
            setTimeout(() => {
                this.signageSystem.show();
            }, 2000);
            
            this.isLoaded = true;
        }
    }
    
    setupEventListeners() {
        // Form submission handling
        const configForm = document.getElementById('settings-form');
        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault(); // Prevent default form submission
                this.handleSaveSettings();
            });
        }
        
        // Toggle secret visibility
        const toggleSecret = document.getElementById('settings-toggle-secret');
        if (toggleSecret) {
            toggleSecret.addEventListener('click', this.handleToggleSecret.bind(this));
        }
        
        // Save Settings button
        const saveSettings = document.getElementById('save-settings');
        if (saveSettings) {
            console.log(' Save Settings button found and event listener attached');
            saveSettings.addEventListener('click', this.handleSaveSettings.bind(this));
        } else {
            console.error(' Save Settings button NOT found!');
        }
        
        // Test connection
        const testConnection = document.getElementById('test-connection');
        if (testConnection) {
            testConnection.addEventListener('click', this.handleTestConnection.bind(this));
        }

        // Default region to North America if empty
        const regionSelect = document.getElementById('settings-region');
        if (regionSelect && (!regionSelect.value || regionSelect.value === '')) {
            regionSelect.value = 'NorthAmerica';
        }
        
        // Token action buttons
        document.getElementById('refresh-token')?.addEventListener('click', async () => {
            await this.handleRefreshToken();
        });

        document.getElementById('validate-token')?.addEventListener('click', async () => {
            await this.handleValidateToken();
        });

        document.getElementById('test-connection-token')?.addEventListener('click', async () => {
            await this.handleTestConnection();
        });

        document.getElementById('revoke-token')?.addEventListener('click', async () => {
            await this.handleRevokeToken();
        });

        document.getElementById('clear-token')?.addEventListener('click', () => {
            this.handleClearToken();
        });
        
        // Population dropdown selection
        const populationSelect = document.getElementById('settings-population');
        if (populationSelect) {
            populationSelect.addEventListener('change', this.handlePopulationSelect.bind(this));
        }
        
        // Population ID input changes
        const populationInput = document.getElementById('settings-population');
        if (populationInput) {
            populationInput.addEventListener('input', this.handlePopulationInput.bind(this));
        }
        
        // Refresh populations button
        const refreshPopulationsBtn = document.getElementById('refresh-populations');
        if (refreshPopulationsBtn) {
            refreshPopulationsBtn.addEventListener('click', this.handleRefreshPopulations.bind(this));
        }
        
        // Checkbox changes
        const checkboxes = document.querySelectorAll('#settings-page input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handlePreferenceChange.bind(this));
        });
    }
    
    async populateForm() {
        const settings = this.app.settings;
        console.log('🔧 Populating form with settings:', settings);
        
        // Populate PingOne configuration
        const fields = {
            'settings-environment-id': settings.pingone_environment_id || '',
            'settings-client-id': settings.pingone_client_id || '',
            'settings-region': settings.pingone_region || 'NorthAmerica',
            'settings-population-id': settings.pingone_population_id || ''
        };
        
        console.log('🔧 Form fields to populate:', fields);
        
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });
        
        // Get client secret from credentials endpoint with settings.json backup
        try {
            const response = await fetch('/api/settings/credentials');
            if (response.ok) {
                const credentials = await response.json();
                console.log('🔐 Credentials loaded from server:', credentials);
                
                if (credentials.success && credentials.data) {
                    const clientSecret = credentials.data.clientSecret || '';
                    console.log('🔐 Client Secret loaded:', clientSecret ? `[${clientSecret.length} chars]` : 'empty');
                    
                    // Update the client secret field
                    const clientSecretElement = document.getElementById('settings-client-secret');
                    if (clientSecretElement && clientSecret) {
                        // Show masked version (asterisks) but store actual value in data attribute
                        const maskedValue = '*'.repeat(Math.min(clientSecret.length, 24));
                        clientSecretElement.value = maskedValue;
                        clientSecretElement.dataset.actualValue = clientSecret;
                        clientSecretElement.dataset.isMasked = 'true';
                        console.log('🔐 Client Secret masked:', maskedValue);
                    }
                }
            } else {
                console.warn('⚠️ Could not load credentials from server, trying settings.json backup');
                // Fallback to settings.json
                await this.loadClientSecretFromSettingsJson();
            }
        } catch (error) {
            console.warn('⚠️ Could not load credentials:', error.message);
            // Fallback to settings.json
            await this.loadClientSecretFromSettingsJson();
        }
        
        // Populate preferences
        const preferences = {
            'show-disclaimer-modal': settings.showDisclaimerModal !== false,
            'show-credentials-modal': settings.showCredentialsModal !== false,
            'show-swagger-page': settings.showSwaggerPage === true,
            'auto-refresh-token': settings.autoRefreshToken !== false
        };
        
        Object.entries(preferences).forEach(([id, checked]) => {
            const element = document.getElementById(id);
            if (element) element.checked = checked;
        });
        
        // Update last updated time
        const lastUpdated = document.getElementById('settings-last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = new Date().toLocaleString();
        }
    }
    
    async loadClientSecretFromSettingsJson() {
        try {
            const response = await fetch('/data/settings.json');
            if (response.ok) {
                const settingsData = await response.json();
                console.log('🔐 Loading client secret from settings.json backup');
                
                const clientSecret = settingsData.pingone_client_secret || '';
                console.log('🔐 Client Secret from backup:', clientSecret ? `[${clientSecret.length} chars]` : 'empty');
                
                const clientSecretElement = document.getElementById('settings-client-secret');
                if (clientSecretElement && clientSecret) {
                    // Show masked version (asterisks) but store actual value in data attribute
                    const maskedValue = '*'.repeat(Math.min(clientSecret.length, 24));
                    clientSecretElement.value = maskedValue;
                    clientSecretElement.dataset.actualValue = clientSecret;
                    clientSecretElement.dataset.isMasked = 'true';
                    console.log('🔐 Client Secret masked from backup:', maskedValue);
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not load settings.json backup:', error.message);
        }
    }
    
    updateTokenInfo() {
        // Get token status from the proper API endpoint like other subsystems
        this.getTokenStatusFromServer().then(tokenStatus => {
            console.log('🔧 Settings page updating token info from server:', tokenStatus);
            
            // Update token indicator
            const indicator = document.getElementById('token-status-text');
            const text = document.getElementById('token-status-text');
            
            if (indicator && text) {
                indicator.className = 'token-indicator ' + (tokenStatus.isValid ? 'valid' : 'invalid');
                text.textContent = tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid';
                
                // Add focus management for invalid tokens
                // Always show a green outline around Token Management section
                const tokenSection = Array.from(document.querySelectorAll('.settings-section'))
                    .find(sec => sec.querySelector('.section-title')?.textContent?.includes('Token Management'));
                if (tokenSection) {
                    tokenSection.style.border = '2px solid #00AA44';
                    tokenSection.style.backgroundColor = '';
                }
            }
            
            // Update token details
            const expires = document.getElementById('token-expires-text');
            const timeLeft = document.getElementById('token-remaining-text');
            
            if (expires) {
                expires.textContent = tokenStatus.expiresAt ? 
                    tokenStatus.expiresAt.toLocaleString() : '-';
            }
            
            if (timeLeft) {
                timeLeft.textContent = tokenStatus.isValid ? 
                    this.formatTimeLeft(tokenStatus.timeLeft) : '-';
            }
            
            // Update button states based on token status
            this.updateTokenButtonStates(tokenStatus.isValid);
            
            console.log('🔧 Token info updated - Valid:', tokenStatus.isValid, 'Time Left:', tokenStatus.timeLeft);
        }).catch(error => {
            console.error('❌ Failed to get token status:', error);
            // Fallback to app token status
            this.updateTokenInfoFromApp();
        });
    }
    
    async getTokenStatusFromServer() {
        try {
            // Use the same endpoint as other subsystems
            const response = await fetch('/api/v1/auth/token');
            if (response.ok) {
                const serverTokenInfo = await response.json();
                
                if (serverTokenInfo.success && serverTokenInfo.tokenInfo) {
                    return {
                        isValid: serverTokenInfo.tokenInfo.isValid,
                        timeLeft: serverTokenInfo.tokenInfo.timeLeft || 0,
                        expiresAt: serverTokenInfo.tokenInfo.expiresAt ? new Date(serverTokenInfo.tokenInfo.expiresAt) : null,
                        source: 'server'
                    };
                }
            }
            
            // Fallback to localStorage like other subsystems
            const token = localStorage.getItem('pingone_worker_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (!token || !expiry) {
                return { isValid: false, timeLeft: 0, expiresAt: null, source: 'localStorage' };
            }
            
            const expiryTime = parseInt(expiry);
            const currentTime = Date.now();
            const timeLeft = Math.floor((expiryTime - currentTime) / 1000);
            
            return {
                isValid: true,
                timeLeft: Math.max(0, timeLeft),
                expiresAt: new Date(expiryTime),
                source: 'localStorage'
            };
            
        } catch (error) {
            console.error('Error getting token status from server:', error);
            throw error;
        }
    }
    
    updateTokenInfoFromApp() {
        // Fallback to app token status
        const tokenStatus = this.app.tokenStatus;
        console.log('🔧 Settings page using app token status as fallback:', tokenStatus);
        
        // Update token indicator
        const indicator = document.getElementById('token-status-text');
        const text = document.getElementById('token-status-text');
        
        if (indicator && text) {
            indicator.className = 'token-indicator ' + (tokenStatus.isValid ? 'valid' : 'invalid');
            text.textContent = tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid';
        }
        
        // Update token details
        const expires = document.getElementById('token-expires-text');
        const timeLeft = document.getElementById('token-remaining-text');
        
        if (expires) {
            expires.textContent = tokenStatus.expiresAt ? 
                tokenStatus.expiresAt.toLocaleString() : '-';
        }
        
        if (timeLeft) {
            timeLeft.textContent = tokenStatus.isValid ? 
                this.app.formatTimeLeft(tokenStatus.timeLeft) : '-';
        }
        
        // Update button states based on token status
        this.updateTokenButtonStates(tokenStatus.isValid);
    }
    
    formatTimeLeft(seconds) {
        if (!seconds || seconds <= 0) return 'Expired';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    // Method to refresh token info when page becomes visible
    refreshTokenInfo() {
        console.log('🔧 Refreshing token info in settings page...');
        this.updateTokenInfo();
    }
    
    updateTokenButtonStates(isValid) {
        const refreshBtn = document.getElementById('refresh-token');
        const validateBtn = document.getElementById('validate-token');
        const testConnectionBtn = document.getElementById('test-connection-token');
        const revokeBtn = document.getElementById('revoke-token');
        const clearBtn = document.getElementById('clear-token');
        
        // Always enable all token buttons
        if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.style.opacity = '1'; }
        if (validateBtn) { validateBtn.disabled = false; validateBtn.style.opacity = '1'; }
        if (testConnectionBtn) { testConnectionBtn.disabled = false; testConnectionBtn.style.opacity = '1'; }
        if (revokeBtn) { revokeBtn.disabled = false; revokeBtn.style.opacity = '1'; }
        if (clearBtn) { clearBtn.disabled = false; clearBtn.style.opacity = '1'; }
    }
    
    handleToggleSecret() {
        const secretInput = document.getElementById('settings-client-secret');
        const toggleIcon = document.querySelector('#settings-toggle-secret i');
        const toggleButton = document.getElementById('settings-toggle-secret');
        
        if (secretInput && toggleIcon && toggleButton) {
            if (secretInput.type === 'password') {
                // Showing secret
                secretInput.type = 'text';
                toggleIcon.className = 'mdi mdi-eye-off';
                toggleButton.title = 'Hide secret';
                toggleButton.setAttribute('aria-label', 'Hide client secret');
                
                // If this is a masked value, show the actual value
                if (secretInput.dataset.isMasked === 'true' && secretInput.dataset.actualValue) {
                    secretInput.value = secretInput.dataset.actualValue;
                }
            } else {
                // Hiding secret
                secretInput.type = 'password';
                toggleIcon.className = 'mdi mdi-eye';
                toggleButton.title = 'Show secret';
                toggleButton.setAttribute('aria-label', 'Show client secret');
                
                // If this was showing actual value, mask it again
                if (secretInput.dataset.actualValue && secretInput.value === secretInput.dataset.actualValue) {
                    secretInput.value = '*'.repeat(Math.min(secretInput.dataset.actualValue.length, 20));
                }
            }
        }
    }
    
    async handleSaveSettings() {
        console.log('💾 Saving settings...');
        
        this.setButtonLoading('save-settings', true);
        this.app.showInfo('Saving settings...');
        
        try {
            const form = document.getElementById('settings-form');
            if (!form) {
                throw new Error('Settings form not found');
            }
            
            const formData = new FormData(form);
            const settings = {
                pingone_environment_id: formData.get('environmentId'),
                pingone_client_id: formData.get('clientId'),
                pingone_client_secret: formData.get('clientSecret'),
                pingone_region: formData.get('region'),
                pingone_population_id: formData.get('populationId')
            };
            
            // Validate required fields
            const requiredFields = ['pingone_environment_id', 'pingone_client_id', 'pingone_client_secret', 'pingone_region'];
            const missingFields = requiredFields.filter(field => !settings[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }
            
            this.showTokenStatus('Validating settings...', 'info', 'Checking configuration validity');
            
            // Save settings
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showSuccess('Settings saved successfully');
                
                // Update app settings
                if (this.app && this.app.settings) {
                    Object.assign(this.app.settings, settings);
                }
                
                // Update token info
                this.updateTokenInfo();
                
            } else {
                throw new Error(result.error || 'Failed to save settings');
            }
            
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            this.app.showError(`Failed to save settings: ${error.message}`);
        } finally {
            this.setButtonLoading('save-settings', false);
        }
    }
    
    async handleTestConnection() {
        console.log('🔌 Testing connection...');
        
        try {
            this.app.showInfo('Testing connection...');
            
            const credentials = this.getFormCredentials();
            if (!credentials) {
                this.signageSystem.addMessage('❌ Please fill in all required credentials', 'error');
                return;
            }
            
            const response = await fetch('/api/pingone/test-connection', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showSuccess('Connection test successful');
                
                if (result.token && result.token.timeLeft) {
                    this.signageSystem.addMessage(`⏰ Token acquired - Time left: ${result.token.timeLeft}`, 'info');
                }
            } else {
                this.app.showError(`Connection test failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error testing connection:', error);
            this.app.showError(`Error testing connection: ${error.message}`);
        }
    }
    
    async handleRefreshToken() {
        console.log('🔄 Refreshing token...');
        
        try {
            // Show status in signage
            this.signageSystem.addMessage('🔄 Refreshing token...', 'info');
            
            // Get credentials from form
            const credentials = this.getFormCredentials();
            if (!credentials) {
                this.signageSystem.addMessage('❌ Please fill in all required credentials', 'error');
                return;
            }
            
            // Validate credentials first
            const validationResult = await this.validateCredentials(credentials);
            if (!validationResult.isValid) {
                this.signageSystem.addMessage(`❌ Invalid credentials: ${validationResult.errors.join(', ')}`, 'error');
                return;
            }
            
            // Get new token
            const response = await fetch('/api/v1/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.signageSystem.addMessage('✅ Token refreshed successfully!', 'success');
                // Update token info
                this.updateTokenInfo();
            } else {
                this.signageSystem.addMessage(`❌ Failed to refresh token: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error refreshing token:', error);
            this.signageSystem.addMessage(`❌ Error refreshing token: ${error.message}`, 'error');
        }
    }

    async handleValidateToken() {
        console.log('✅ Validating token...');
        
        try {
            this.signageSystem.addMessage('🔍 Validating token...', 'info');
            
            const response = await fetch('/api/v1/auth/token', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success && result.token && result.token.isValid) {
                const timeLeft = result.token.timeLeft || 'Unknown';
                this.signageSystem.addMessage('✅ Token is valid!', 'success');
                this.signageSystem.addMessage(`⏰ Time remaining: ${timeLeft}`, 'info');
            } else {
                this.signageSystem.addMessage('❌ Token is invalid or expired', 'error');
            }
        } catch (error) {
            console.error('❌ Error validating token:', error);
            this.signageSystem.addMessage(`❌ Error validating token: ${error.message}`, 'error');
        }
    }

    async handleRevokeToken() {
        console.log('🚫 Revoking token...');
        
        try {
            this.signageSystem.addMessage('🚫 Revoking token...', 'warning');
            
            const response = await fetch('/api/v1/auth/token', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.signageSystem.addMessage('✅ Token revoked successfully!', 'success');
                this.signageSystem.addMessage('🗑️ Token has been invalidated', 'info');
                // Update token info
                this.updateTokenInfo();
            } else {
                this.signageSystem.addMessage(`❌ Failed to revoke token: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error revoking token:', error);
            this.signageSystem.addMessage(`❌ Error revoking token: ${error.message}`, 'error');
        }
    }

    handleClearToken() {
        console.log('🗑️ Clearing token...');
        
        try {
            this.signageSystem.addMessage('🗑️ Clearing token...', 'warning');
            
            // Clear token from localStorage
            localStorage.removeItem('pingone_token');
            localStorage.removeItem('pingone_token_expiry');
            
            // Update token info display
            this.updateTokenInfo();
            
            this.signageSystem.addMessage('✅ Token cleared successfully!', 'success');
            this.signageSystem.addMessage('🗑️ Token has been removed from local storage', 'info');
        } catch (error) {
            console.error('❌ Error clearing token:', error);
            this.signageSystem.addMessage(`❌ Error clearing token: ${error.message}`, 'error');
        }
    }
    
    handlePreferenceChange() {
        // Auto-save preferences when they change
        setTimeout(() => {
            this.handleSaveSettings();
        }, 100);
    }
    
    /**
     * Handle population dropdown selection
     */
    handlePopulationSelect() {
        const populationSelect = document.getElementById('settings-population');
        const populationInput = document.getElementById('settings-population');
        
        if (populationSelect && populationInput) {
            const selectedValue = populationSelect.value;
            if (selectedValue) {
                populationInput.value = selectedValue;
                console.log('🏘️ Population selected from dropdown:', selectedValue);
            }
        }
    }
    
    /**
     * Handle population ID input changes
     */
    handlePopulationInput() {
        const populationSelect = document.getElementById('settings-population');
        const populationInput = document.getElementById('settings-population');
        
        if (populationSelect && populationInput) {
            const inputValue = populationInput.value.trim();
            
            // Try to match the input value with dropdown options
            const matchingOption = Array.from(populationSelect.options).find(
                option => option.value === inputValue
            );
            
            if (matchingOption) {
                populationSelect.value = inputValue;
                console.log('🏘️ Population input matched dropdown:', inputValue);
            } else {
                populationSelect.value = '';
                console.log('🏘️ Population input no match:', inputValue);
            }
        }
    }
    
    /**
     * Handle refresh populations button click
     */
    async handleRefreshPopulations() {
        console.log('🏘️ Refresh populations button clicked');
        const populationSelect = document.getElementById('settings-population');
        if (populationSelect) {
            // Clear existing options to force reload
            populationSelect.innerHTML = '<option value="">Select Population</option>';
        }
        
        // Force reload populations
        await this.loadPopulations();
    }
    
    /**
     * Load populations into the dropdown
     */
    async loadPopulations() {
        const populationSelect = document.getElementById('settings-population');
        if (!populationSelect) {
            console.warn('��️ Population select element not found');
            return;
        }
        
        // Check if dropdown already has populations (avoid duplicate loading)
        // Only skip if we have actual population options, not just "Loading..." or "No populations"
        const hasRealPopulations = Array.from(populationSelect.options).some(option => 
            option.value && option.value !== "" && !option.textContent.includes("Select Population") && !option.textContent.includes("No populations")
        );
        
        if (hasRealPopulations) {
            console.log('🏘️ Dropdown already populated with real populations, skipping reload');
            return;
        }
        
        try {
            console.log('🏘️ Loading populations for dropdown...');
            console.log('🏘️ App settings available:', !!this.app.settings);
            
            // Check if we have cached populations
            if (this.app.settings && this.app.settings.populationCache && this.app.settings.populationCache.populations) {
                const populations = this.app.settings.populationCache.populations;
                console.log('🏘️ Found cached populations count:', populations.length);
                console.log('🏘️ Cached populations data:', populations);
                
                if (Array.isArray(populations) && populations.length > 0) {
                    this.populateDropdown(populations);
                    console.log('🏘️ Successfully loaded populations from cache:', populations.length);
                    return;
                } else {
                    console.log('🏘️ Cached populations array is empty or invalid');
                }
            } else {
                console.log('🏘️ No cached populations found in settings');
                console.log('🏘️ Settings structure:', {
                    hasSettings: !!this.app.settings,
                    hasPopulationCache: !!(this.app.settings && this.app.settings.populationCache),
                    hasPopulations: !!(this.app.settings && this.app.settings.populationCache && this.app.settings.populationCache.populations)
                });
            }
            
            // Try to fetch populations from API
            console.log('🏘️ Attempting to fetch populations from API...');
            const response = await fetch('/api/populations');
            console.log('🏘️ API response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('🏘️ API response data:', result);
                
                // Handle the actual API response structure
                let populations = null;
                
                if (result.success && result.data && result.data.message && result.data.message.populations) {
                    populations = result.data.message.populations;
                    console.log('🏘️ Loaded populations from API (nested format):', populations.length);
                } else if (result.success && result.data && result.data.populations) {
                    populations = result.data.populations;
                    console.log('🏘️ Loaded populations from API (data format):', populations.length);
                } else if (result.message && result.message.populations) {
                    populations = result.message.populations;
                    console.log('🏘️ Loaded populations from API (message format):', populations.length);
                } else if (result.populations) {
                    populations = result.populations;
                    console.log('🏘️ Loaded populations from API (direct format):', populations.length);
                } else {
                    console.error('🏘️ Could not find populations in response:', result);
                    throw new Error('Invalid populations response format: ' + JSON.stringify(result));
                }
                
                if (populations && Array.isArray(populations)) {
                    this.populateDropdown(populations);
                    console.log('🏘️ Successfully populated dropdown with', populations.length, 'populations');
                } else {
                    throw new Error('Populations data is not an array: ' + JSON.stringify(populations));
                }
            } else {
                throw new Error(`Failed to fetch populations: ${response.status}`);
            }
            
        } catch (error) {
            console.error('⚠️ Could not load populations:', error);
            populationSelect.innerHTML = '<option value="">No populations available</option>';
        }
    }
    
    /**
     * Populate the dropdown with population options
     */
    populateDropdown(populations) {
        console.log('🏘️ populateDropdown called with:', populations);
        
        const populationSelect = document.getElementById('settings-population');
        if (!populationSelect) {
            console.error('🏘️ Population select element not found in populateDropdown');
            return;
        }
        
        if (!populations || !Array.isArray(populations)) {
            console.warn('🏘️ Invalid populations data:', populations);
            populationSelect.innerHTML = '<option value="">Select a population...</option>';
            return;
        }
        
        console.log('🏘️ Populating dropdown with populations:', populations);
        
        // Clear existing options
        populationSelect.innerHTML = '<option value="">Select a population...</option>';
        
        // Add population options
        populations.forEach((population, index) => {
            console.log(`🏘️ Adding population ${index}:`, population);
            const option = document.createElement('option');
            option.value = population.id || population.populationId || '';
            
            // Build display text
            let displayText = population.name || population.populationName || `Population ${index + 1}`;
            if (population.userCount !== undefined) {
                displayText += ` (${population.userCount} users)`;
            }
            
            option.textContent = displayText;
            populationSelect.appendChild(option);
        });
        
        console.log(`🏘️ Added ${populations.length} populations to dropdown`);
        
        // Set current selection if we have a population ID
        const currentPopulationId = this.app.settings?.pingone_population_id;
        if (currentPopulationId) {
            populationSelect.value = currentPopulationId;
            console.log('🏘️ Set current population selection:', currentPopulationId);
        }
        
        // Verify the dropdown was populated
        const options = populationSelect.querySelectorAll('option');
        console.log('🏘️ Final dropdown options count:', options.length);
        console.log('🏘️ Dropdown options:', Array.from(options).map(opt => ({ value: opt.value, text: opt.textContent })));
    }
    
    updateUIBasedOnSettings() {
        // Show/hide Swagger navigation based on setting
        const swaggerNav = document.getElementById('swagger-nav');
        const swaggerCard = document.getElementById('swagger-card');
        
        if (this.app.settings.showSwaggerPage) {
            if (swaggerNav) swaggerNav.style.display = 'block';
            if (swaggerCard) swaggerCard.style.display = 'block';
        } else {
            if (swaggerNav) swaggerNav.style.display = 'none';
            if (swaggerCard) swaggerCard.style.display = 'none';
        }
    }
    
    /**
     * Validate credentials using the server-side validation endpoint
     * @param {Object} credentials - Credentials to validate
     * @returns {Object} Validation result
     */
    async validateCredentials(credentials) {
        try {
            const response = await fetch('/api/settings/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const result = await response.json();
            
            // Handle both success and validation failure responses
            if (response.ok) {
                // Success response (200)
                return {
                    success: true,
                    errors: result.errors || [],
                    warnings: result.warnings || [],
                    connectionTest: result.connectionTest,
                    credentialsValid: result.credentialsValid
                };
            } else if (response.status === 400 && result.credentialsValid !== undefined) {
                // Validation failure response (400) - still valid API response
                return {
                    success: result.credentialsValid, // Use actual validation result
                    errors: result.errors || [],
                    warnings: result.warnings || [],
                    connectionTest: result.connectionTest,
                    credentialsValid: result.credentialsValid
                };
            } else {
                // Other error responses
                return {
                    success: false,
                    errors: [result.error || `Server error: ${response.status}`],
                    warnings: [],
                    connectionTest: null,
                    credentialsValid: false
                };
            }
            
        } catch (error) {
            console.error('Credential validation failed:', error);
            return {
                success: false,
                errors: [`Validation request failed: ${error.message}`],
                warnings: [],
                connectionTest: null,
                credentialsValid: false
            };
        }
    }
    
    /**
     * Show validation errors in the UI
     * @param {Array} errors - Array of error messages
     */
    showValidationErrors(errors) {
        this.clearValidationMessages();
        
        const container = this.getOrCreateValidationContainer();
        container.className = 'validation-messages error';
        container.innerHTML = `
            <div class="validation-header">
                <i class="icon-alert-circle"></i>
                <strong>Validation Errors:</strong>
            </div>
            <ul>
                ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        `;
        
        // Scroll to validation messages
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    /**
     * Show validation warnings in the UI
     * @param {Array} warnings - Array of warning messages
     */
    showValidationWarnings(warnings) {
        const container = this.getOrCreateValidationContainer();
        
        // If there are already errors, append warnings
        if (container.classList.contains('error')) {
            const warningHtml = `
                <div class="validation-warnings">
                    <div class="validation-header">
                        <i class="icon-alert-triangle"></i>
                        <strong>Warnings:</strong>
                    </div>
                    <ul>
                        ${warnings.map(warning => `<li>${warning}</li>`).join('')}
                    </ul>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', warningHtml);
        } else {
            container.className = 'validation-messages warning';
            container.innerHTML = `
                <div class="validation-header">
                    <i class="icon-alert-triangle"></i>
                    <strong>Warnings:</strong>
                </div>
                <ul>
                    ${warnings.map(warning => `<li>${warning}</li>`).join('')}
                </ul>
            `;
        }
    }
    
    /**
     * Get or create the validation messages container
     * @returns {HTMLElement} Validation container element
     */
    getOrCreateValidationContainer() {
        let container = document.getElementById('validation-messages');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'validation-messages';
            
            // Insert after the PingOne Configuration section
            const configSection = document.querySelector('.settings-section');
            if (configSection) {
                configSection.insertAdjacentElement('afterend', container);
            } else {
                // Fallback: insert at the beginning of settings container
                const settingsContainer = document.querySelector('.settings-container');
                if (settingsContainer) {
                    settingsContainer.insertAdjacentElement('afterbegin', container);
                }
            }
        }
        
        return container;
    }
    
    /**
     * Clear validation messages from the UI
     */
    clearValidationMessages() {
        const container = document.getElementById('validation-messages');
        if (container) {
            container.remove();
        }
    }
    
    /**
     * Enhanced secret toggle with better UX and masked value handling
     */
    handleToggleSecret() {
        const secretInput = document.getElementById('settings-client-secret');
        const toggleIcon = document.querySelector('#settings-toggle-secret i');
        const toggleButton = document.getElementById('settings-toggle-secret');
        
        if (secretInput && toggleIcon && toggleButton) {
            if (secretInput.type === 'password') {
                // Showing secret
                secretInput.type = 'text';
                toggleIcon.className = 'mdi mdi-eye-off';
                toggleButton.title = 'Hide secret';
                toggleButton.setAttribute('aria-label', 'Hide client secret');
                
                // If this is a masked value, show the actual value
                if (secretInput.dataset.isMasked === 'true' && secretInput.dataset.actualValue) {
                    secretInput.value = secretInput.dataset.actualValue;
                }
            } else {
                // Hiding secret
                secretInput.type = 'password';
                toggleIcon.className = 'mdi mdi-eye';
                toggleButton.title = 'Show secret';
                toggleButton.setAttribute('aria-label', 'Show client secret');
                
                // If this was showing actual value, mask it again
                if (secretInput.dataset.actualValue && secretInput.value === secretInput.dataset.actualValue) {
                    secretInput.value = '*'.repeat(Math.min(secretInput.dataset.actualValue.length, 20));
                }
            }
        }
    }

    /**
     * Apply enforced styles to Refresh/Clear Token buttons to defeat any CSS order conflicts
     */
    applyTokenButtonStyles() {
        const styleDefault = (btn) => {
            if (!btn) return;
            btn.style.backgroundColor = '#E6F2FF';
            btn.style.border = '1px solid #000';
            btn.style.outline = 'none';
            btn.style.color = '#111';
            btn.style.boxShadow = 'none';
            btn.style.backgroundImage = 'none';
            // Force larger consistent size
            btn.style.padding = '8px 16px';
            btn.style.fontSize = '0.9rem';
            btn.style.lineHeight = '1.4';
            btn.style.height = '40px';
            btn.style.minHeight = '40px';
            btn.style.maxHeight = '40px';
            btn.style.borderRadius = '6px';
            btn.style.width = 'auto';
            btn.style.minWidth = '120px';
            btn.style.maxWidth = '160px';
            btn.style.verticalAlign = 'middle';
            btn.style.display = 'inline-block';
        };
        const styleHover = (btn) => {
            if (!btn) return;
            btn.style.backgroundColor = '#CCE4FF';
        };

        const wire = (btn) => {
            if (!btn) return;
            styleDefault(btn);
            btn.addEventListener('mouseenter', () => styleHover(btn));
            btn.addEventListener('mouseleave', () => styleDefault(btn));
            btn.addEventListener('focus', () => styleHover(btn));
            btn.addEventListener('blur', () => styleDefault(btn));
            btn.addEventListener('mousedown', () => styleHover(btn));
            btn.addEventListener('mouseup', () => styleHover(btn));
        };

        wire(document.getElementById('refresh-token'));
        wire(document.getElementById('validate-token'));
        wire(document.getElementById('test-connection-token'));
        wire(document.getElementById('revoke-token'));
        wire(document.getElementById('clear-token'));
    }

    /**
     * Highlight or unhighlight a form field
     * @param {HTMLElement} element - The form field element
     * @param {boolean} highlight - Whether to highlight (true) or remove highlight (false)
     */
    highlightField(element, highlight) {
        if (!element) return;
        
        if (highlight) {
            element.classList.add('field-error');
            element.style.borderColor = 'var(--ping-error)';
            element.style.boxShadow = '0 0 0 2px rgba(204, 0, 0, 0.2)';
        } else {
            element.classList.remove('field-error');
            element.style.borderColor = '';
            element.style.boxShadow = '';
        }
    }

    /**
     * Clear highlighting from all form fields
     */
    clearFieldHighlighting() {
        const fields = [
            'settings-environment-id',
            'settings-client-id', 
            'settings-client-secret',
            'settings-region',
            'settings-population-id'
        ];
        
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                this.highlightField(element, false);
            }
        });
    }

    manageSettingsFocus() {
        // Check if token is invalid and focus on token section
        if (!this.app.tokenStatus.isValid) {
            setTimeout(() => {
                const tokenSection = document.getElementById('token-information-section');
                if (tokenSection) {
                    // Scroll to token section
                    tokenSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Focus on refresh token button
                    const refreshBtn = document.getElementById('refresh-token');
                    if (refreshBtn) {
                        refreshBtn.focus();
                    }
                }
            }, 1000);
        } else {
            // Focus on first form field for valid tokens
            setTimeout(() => {
                const firstField = document.getElementById('settings-environment-id');
                if (firstField) {
                    firstField.focus();
                }
            }, 500);
        }
    }

    /**
     * Show token action status
     */
    showTokenStatus(message, type = 'info', details = '') {
        const statusWindow = document.getElementById('token-status-window');
        const statusMessage = document.getElementById('token-status-message');
        const statusDetails = document.getElementById('token-status-details');
        
        if (statusWindow && statusMessage && statusDetails) {
            // Update message and type
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`;
            
            // Update details if provided
            if (details) {
                statusDetails.textContent = details;
                statusDetails.style.display = 'block';
            } else {
                statusDetails.style.display = 'none';
            }
            
            // Show the status window with animation
            statusWindow.style.display = 'block';
            statusWindow.classList.add('show');
            
            // Auto-hide after 5 seconds for success/info, 10 seconds for warnings/errors
            const hideDelay = (type === 'success' || type === 'info') ? 5000 : 10000;
            setTimeout(() => {
                this.hideTokenStatus();
            }, hideDelay);
        }
    }

    /**
     * Hide token status window
     */
    hideTokenStatus() {
        const statusWindow = document.getElementById('token-status-window');
        if (statusWindow) {
            statusWindow.classList.add('hide');
            setTimeout(() => {
                statusWindow.style.display = 'none';
                statusWindow.classList.remove('hide');
            }, 300);
        }
    }

    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, loading = true) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (loading) {
                button.classList.add('loading');
                button.disabled = true;
            } else {
                button.classList.remove('loading');
                button.disabled = false;
            }
        }
    }

    /**
     * Show status in the token action status window
     */
    showTokenActionStatus(message, type = 'info', details = '') {
        const statusWindow = document.getElementById('token-status-window');
        const statusMessage = document.getElementById('token-status-message');
        const statusDetails = document.getElementById('token-status-details');
        
        if (statusWindow && statusMessage) {
            // Show the status window
            statusWindow.style.display = 'block';
            
            // Update message
            statusMessage.textContent = message;
            statusMessage.className = `status-message status-${type}`;
            
            // Update details if provided
            if (statusDetails) {
                statusDetails.textContent = details;
                statusDetails.style.display = details ? 'block' : 'none';
            }
            
            // Auto-hide after 5 seconds for success/info messages
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    statusWindow.style.display = 'none';
                }, 5000);
            }
        }
    }

    /**
     * Get credentials from the form
     */
    getFormCredentials() {
        const form = document.getElementById('settings-form');
        if (!form) {
            return null;
        }
        
        const formData = new FormData(form);
        const credentials = {
            pingone_environment_id: formData.get('environmentId'),
            pingone_client_id: formData.get('clientId'),
            pingone_client_secret: formData.get('clientSecret'),
            pingone_region: formData.get('region')
        };
        
        // Check if all required fields are filled
        if (!credentials.pingone_environment_id || !credentials.pingone_client_id || !credentials.pingone_client_secret) {
            return null;
        }
        
        return credentials;
    }
}

/**
 * Comprehensive Signage System for Real-time System Information
 */
class SignageSystem {
    constructor(settingsPage) {
        this.settingsPage = settingsPage;
        this.signageContainer = null;
        this.messages = [];
        this.maxMessages = 20;
        this.isVisible = false;
        this.tokenWarningThreshold = 5 * 60; // 5 minutes in seconds
        this.lastTokenCheck = null;
        this.lastSystemCheck = null;
        
        // Initialize when settings page loads
        this.init();
    }
    
    init() {
        this.signageContainer = document.getElementById('scrolling-signage');
        if (this.signageContainer) {
            this.startMonitoring();
            this.addMessage('System initialized - monitoring token status and system health', 'info');
        }
    }
    
    /**
     * Add a message to the scrolling signage
     */
    addMessage(text, type = 'info', details = '') {
        const message = {
            id: Date.now() + Math.random(),
            text,
            type,
            details,
            timestamp: new Date(),
            timeAgo: 'Just now'
        };
        
        this.messages.unshift(message);
        
        // Keep only the latest messages
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(0, this.maxMessages);
        }
        
        this.renderMessages();
        this.updateTimeAgo();
        
        // Auto-show window for urgent messages
        if (type === 'error' || type === 'warning') {
            this.show();
            this.addUrgentClass();
        }
    }
    
    /**
     * Add urgent class to status window
     */
    addUrgentClass() {
        const statusWindow = document.getElementById('token-status-window');
        if (statusWindow) {
            statusWindow.classList.add('has-urgent-messages');
            
            // Remove class after 10 seconds
            setTimeout(() => {
                statusWindow.classList.remove('has-urgent-messages');
            }, 10000);
        }
    }
    
    /**
     * Render all messages in the signage
     */
    renderMessages() {
        if (!this.signageContainer) return;
        
        let html = '';
        this.messages.forEach(message => {
            const icon = this.getIconForType(message.type);
            const timeAgo = this.formatTimeAgo(message.timestamp);
            
            html += `
                <div class="signage-item" data-type="${message.type}" data-id="${message.id}">
                    <i class="${icon}"></i>
                    <span class="signage-text">${this.escapeHtml(message.text)}</span>
                    <span class="signage-time">${timeAgo}</span>
                </div>
            `;
        });
        
        this.signageContainer.innerHTML = html;
    }
    
    /**
     * Get icon for message type
     */
    getIconForType(type) {
        const icons = {
            info: 'icon-info-circle',
            success: 'icon-check-circle',
            warning: 'icon-alert-triangle',
            error: 'icon-x-circle',
            token: 'icon-key',
            system: 'icon-server',
            github: 'icon-github',
            network: 'icon-wifi',
            security: 'icon-shield'
        };
        return icons[type] || 'icon-info-circle';
    }
    
    /**
     * Format time ago
     */
    formatTimeAgo(timestamp) {
        const now = new Date();
        const diff = Math.floor((now - timestamp) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }
    
    /**
     * Update time ago for all messages
     */
    updateTimeAgo() {
        const timeElements = this.signageContainer?.querySelectorAll('.signage-time');
        if (timeElements) {
            timeElements.forEach((element, index) => {
                if (this.messages[index]) {
                    element.textContent = this.formatTimeAgo(this.messages[index].timestamp);
                }
            });
        }
    }
    
    /**
     * Start comprehensive monitoring
     */
    startMonitoring() {
        // Token monitoring
        this.startTokenMonitoring();
        
        // System health monitoring
        this.startSystemHealthMonitoring();
        
        // GitHub status monitoring
        this.startGitHubStatusMonitoring();
        
        // Network connectivity monitoring
        this.startNetworkMonitoring();
        
        // Security monitoring
        this.startSecurityMonitoring();
        
        // Update time ago every minute
        setInterval(() => {
            this.updateTimeAgo();
        }, 60000);
    }
    
    /**
     * Monitor token status and expiration
     */
    startTokenMonitoring() {
        const checkToken = async () => {
            try {
                const response = await fetch('/api/v1/auth/token');
                const result = await response.json();
                
                if (result.success && result.token) {
                    const token = result.token;
                    
                    if (token.isValid) {
                        const timeLeft = token.expiresIn || 0;
                        
                        if (timeLeft <= this.tokenWarningThreshold && timeLeft > 0) {
                            this.addMessage(`⚠️ Token expires in ${Math.floor(timeLeft / 60)} minutes`, 'warning');
                        } else if (timeLeft <= 0) {
                            this.addMessage('🚨 Token has expired - please refresh', 'error');
                        } else if (timeLeft > 3600) {
                            // Only show valid status every hour to avoid spam
                            const hoursLeft = Math.floor(timeLeft / 3600);
                            if (!this.lastTokenCheck || (Date.now() - this.lastTokenCheck) > 3600000) {
                                this.addMessage(`✅ Token valid - ${hoursLeft}h remaining`, 'success');
                                this.lastTokenCheck = Date.now();
                            }
                        }
                    } else {
                        this.addMessage('❌ Token is invalid', 'error');
                    }
                } else {
                    this.addMessage('⚠️ No valid token found', 'warning');
                }
            } catch (error) {
                this.addMessage(`🔌 Token check failed: ${error.message}`, 'error');
            }
        };
        
        // Check immediately
        checkToken();
        
        // Check every 30 seconds
        setInterval(checkToken, 30000);
    }
    
    /**
     * Monitor system health
     */
    startSystemHealthMonitoring() {
        const checkSystemHealth = async () => {
            try {
                const response = await fetch('/api/health');
                const result = await response.json();
                
                if (result.success && result.data) {
                    const health = result.data;
                    
                    // Check memory usage
                    if (health.system?.memory?.memoryUsage) {
                        const memoryUsage = parseInt(health.system.memory.memoryUsage);
                        if (memoryUsage > 90) {
                            this.addMessage(`⚠️ High memory usage: ${memoryUsage}%`, 'warning');
                        }
                    }
                    
                    // Check server status
                    if (health.system?.uptime) {
                        const uptime = health.system.uptime;
                        const hours = Math.floor(uptime / 3600);
                        if (hours > 24) {
                            this.addMessage(`🖥️ Server uptime: ${hours}h`, 'info');
                        }
                    }
                    
                    // Check PingOne connection
                    if (health.optimization?.pingOneConnected) {
                        if (health.optimization.pingOneConnected === 'ok') {
                            this.addMessage('✅ PingOne connection healthy', 'success');
                        } else {
                            this.addMessage('⚠️ PingOne connection issues', 'warning');
                        }
                    }
                }
            } catch (error) {
                this.addMessage(`🔌 System health check failed: ${error.message}`, 'error');
            }
        };
        
        // Check every 2 minutes
        setInterval(checkSystemHealth, 120000);
    }
    
    /**
     * Monitor GitHub status
     */
    startGitHubStatusMonitoring() {
        const checkGitHubStatus = async () => {
            try {
                // Check if we're in a git repository
                const response = await fetch('/api/system/git-status');
                const result = await response.json();
                
                if (result.success) {
                    const gitInfo = result.data;
                    
                    if (gitInfo.isGitRepo) {
                        if (gitInfo.branch) {
                            this.addMessage(`📦 Git branch: ${gitInfo.branch}`, 'info');
                        }
                        
                        if (gitInfo.hasUncommittedChanges) {
                            this.addMessage('📝 Uncommitted changes detected', 'warning');
                        }
                        
                        if (gitInfo.behindRemote) {
                            this.addMessage(`⬇️ ${gitInfo.behindRemote} commits behind remote`, 'warning');
                        }
                        
                        if (gitInfo.aheadRemote) {
                            this.addMessage(`⬆️ ${gitInfo.aheadRemote} commits ahead of remote`, 'info');
                        }
                    }
                }
            } catch (error) {
                // GitHub status check is optional, don't show errors
                console.log('GitHub status check not available');
            }
        };
        
        // Check every 5 minutes
        setInterval(checkGitHubStatus, 300000);
    }
    
    /**
     * Monitor network connectivity
     */
    startNetworkMonitoring() {
        const checkNetwork = () => {
            if (navigator.onLine) {
                this.addMessage('🌐 Network connection stable', 'success');
            } else {
                this.addMessage('🌐 Network connection lost', 'error');
            }
        };
        
        // Check network status
        window.addEventListener('online', () => {
            this.addMessage('🌐 Network connection restored', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.addMessage('🌐 Network connection lost', 'error');
        });
        
        // Check every 5 minutes
        setInterval(checkNetwork, 300000);
    }
    
    /**
     * Monitor security status
     */
    startSecurityMonitoring() {
        const checkSecurity = () => {
            // Check if running on HTTPS
            if (window.location.protocol === 'https:') {
                this.addMessage('🔒 Secure connection (HTTPS)', 'success');
            } else {
                this.addMessage('⚠️ Insecure connection (HTTP)', 'warning');
            }
            
            // Check for security headers
            this.checkSecurityHeaders();
        };
        
        // Check every 10 minutes
        setInterval(checkSecurity, 600000);
    }
    
    /**
     * Check security headers
     */
    async checkSecurityHeaders() {
        try {
            const response = await fetch('/api/system/security-headers');
            const result = await response.json();
            
            if (result.success) {
                const headers = result.data;
                
                if (!headers.contentSecurityPolicy) {
                    this.addMessage('⚠️ Missing Content Security Policy', 'warning');
                }
                
                if (!headers.xFrameOptions) {
                    this.addMessage('⚠️ Missing X-Frame-Options', 'warning');
                }
            }
        } catch (error) {
            // Security headers check is optional
            console.log('Security headers check not available');
        }
    }
    
    /**
     * Show the signage window
     */
    show() {
        const statusWindow = document.getElementById('token-status-window');
        if (statusWindow) {
            statusWindow.style.display = 'block';
            this.isVisible = true;
        }
    }
    
    /**
     * Hide the signage window
     */
    hide() {
        const statusWindow = document.getElementById('token-status-window');
        if (statusWindow) {
            statusWindow.style.display = 'none';
            this.isVisible = false;
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
