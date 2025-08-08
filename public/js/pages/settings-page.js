// Settings Page Module
// PingOne User Management Tool v7.0.1.0

export class SettingsPage {
    constructor(app) {
        this.app = app;
        this.isLoaded = false;
    }
    
    async load() {
        if (this.isLoaded) return;
        
        console.log('📄 Loading Settings page...');
        
        const pageContent = `
            <div class="page-header">
                <h1><i class="icon-settings"></i> Settings</h1>
                <p>Configure your PingOne environment and application preferences</p>
            </div>
            
            <div class="settings-container">
                <!-- PingOne Configuration -->
                <section class="settings-section">
                    <div class="settings-box">
                        <h3 class="section-title">PingOne Configuration</h3>
                        <p>Configure your PingOne environment connection settings</p>
                        
                        <form id="pingone-config-form" novalidate>
                            <div class="config-grid">
                                <div class="form-group">
                                    <label for="settings-environment-id"><i class="icon-globe"></i> PingOne Environment ID *</label>
                                    <input type="text" id="settings-environment-id" name="environmentId" class="form-control"
                                           placeholder="Enter your PingOne Environment ID" 
                                           autocomplete="off" 
                                           spellcheck="false"
                                           required>
                                    <div class="form-help">Your PingOne Environment ID from the admin console</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-client-id"><i class="icon-user"></i> PingOne Client ID *</label>
                                    <input type="text" id="settings-client-id" name="clientId" class="form-control"
                                           placeholder="Enter your PingOne Client ID" 
                                           autocomplete="username"
                                           spellcheck="false"
                                           required>
                                    <div class="form-help">OAuth 2.0 Client ID for API access</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-client-secret"><i class="icon-key"></i> PingOne Client Secret *</label>
                                    <div class="input-group">
                                        <input type="password" id="settings-client-secret" name="clientSecret" class="form-control"
                                               placeholder="Enter your PingOne Client Secret" 
                                               autocomplete="current-password"
                                               spellcheck="false"
                                               title="Show/hide client secret"
                                               aria-describedby="settings-toggle-secret"
                                               required>
                                        <button type="button" id="settings-toggle-secret" class="btn btn-outline-secondary"
                                                title="Show secret" 
                                                aria-label="Show client secret">
                                            <i class="icon-eye" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                    <div class="form-help">OAuth 2.0 Client Secret (keep secure)</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="settings-region"><i class="icon-map-pin"></i> PingOne Region *</label>
                                    <select id="settings-region" name="region" class="form-control" 
                                            autocomplete="country"
                                            required>
                                        <option value="NA" selected>North America</option>
                                        <option value="EU">Europe</option>
                                        <option value="AP">Asia Pacific</option>
                                        <option value="CA">Canada</option>
                                    </select>
                                    <div class="form-help">Your PingOne deployment region</div>
                                </div>
                                
                                <div class="form-group population-group">
                                    <label><i class="icon-users"></i> PingOne Population</label>
                                    <div class="population-fields">
                                        <div class="population-input-group">
                                            <label for="settings-population-id" class="field-label">Population ID</label>
                                            <input type="text" id="settings-population-id" name="populationId" class="form-control"
                                                   placeholder="Enter PingOne Population ID"
                                                   autocomplete="off"
                                                   spellcheck="false">
                                        </div>
                                        <div class="population-dropdown-group">
                                            <label for="settings-population-select">Select Population</label>
                                            <div class="population-dropdown-container">
                                                <select id="settings-population-select" class="form-control">
                                                    <option value="">Loading populations...</option>
                                                </select>
                                                <button type="button" id="refresh-populations" class="btn btn-sm btn-outline-secondary" title="Refresh populations">
                                                    ↻
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-help">Choose a population by ID or select from dropdown</div>
                                </div>
                            </div>
                            
                            <div class="export-actions">
                                <button type="submit" id="save-settings" class="btn btn-primary">
                                    <i class="icon-save" aria-hidden="true"></i> Save Settings
                                </button>
                                <button type="button" id="test-connection" class="btn btn-outline-info">
                                    <i class="icon-wifi" aria-hidden="true"></i> Test Connection
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
                
                <!-- Application Preferences -->
                <section class="settings-section">
                    <div class="settings-box">
                        <h3 class="section-title">Application Preferences</h3>
                        <p>Customize your application experience and behavior</p>
                        
                        <div class="options-group">
                            <h4>Interface Options</h4>
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input type="checkbox" id="show-swagger" name="showSwaggerPage" class="form-check-input">
                                        Show Swagger API documentation page
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="show-disclaimer-modal" name="showDisclaimerModal" class="form-check-input">
                                    <label class="form-check-label" for="show-disclaimer-modal">
                                        Show disclaimer modal on startup
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="show-credentials-modal" name="showCredentialsModal" class="form-check-input">
                                    <label class="form-check-label" for="show-credentials-modal">
                                        Show credentials modal when not configured
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="auto-refresh-token" name="autoRefreshToken" class="form-check-input">
                                    <label class="form-check-label" for="auto-refresh-token">
                                        Automatically refresh tokens when they expire
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <!-- Token Information -->
                <section class="settings-section">
                    <div class="settings-box">
                        <h3 class="section-title">Token Information</h3>
                        <p>Current authentication token status and management</p>
                        
                        <div class="token-info-grid">
                            <div class="token-status-item">
                                <span class="label">Status:</span>
                                <div class="token-status-display">
                                    <div class="token-indicator" id="settings-token-indicator"></div>
                                    <span id="settings-token-text" class="value">Unknown</span>
                                </div>
                            </div>
                            <div class="token-expiry-item">
                                <div class="expiry-info">
                                    <span class="label">Expires:</span>
                                    <span id="settings-token-expires" class="value">-</span>
                                </div>
                                <div class="time-left-info">
                                    <span class="label">Time Left:</span>
                                    <span id="settings-token-time" class="value">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="token-actions">
                            <button type="button" id="refresh-token" class="btn btn-outline-info btn-sm">
                                <i class="icon-refresh"></i> Refresh Token
                            </button>
                            <button type="button" id="clear-token" class="btn btn-outline-danger btn-sm">
                                <i class="icon-trash"></i> Clear Token
                            </button>
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
                                <span id="settings-app-version" class="value">v7.0.1.0</span>
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
            this.populateForm();
            this.updateTokenInfo();
            // Apply final inline styles to ensure buttons render with black outline and light blue background
            this.applyTokenButtonStyles();
            // Load populations for the dropdown with a small delay to ensure settings are loaded
            setTimeout(() => {
                // Force clear dropdown first
                const populationSelect = document.getElementById('settings-population-select');
                if (populationSelect) {
                    populationSelect.innerHTML = '<option value="">Loading populations...</option>';
                }
                this.loadPopulations();
                // Also try again after a longer delay in case settings are still loading
                setTimeout(() => {
                    this.loadPopulations();
                }, 1500);
            }, 500);
            this.isLoaded = true;
        }
    }
    
    setupEventListeners() {
        // Form submission handling
        const configForm = document.getElementById('pingone-config-form');
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
        
        // Token actions
        const refreshToken = document.getElementById('refresh-token');
        const clearToken = document.getElementById('clear-token');
        
        if (refreshToken) {
            refreshToken.addEventListener('click', this.handleRefreshToken.bind(this));
        }
        
        if (clearToken) {
            clearToken.addEventListener('click', this.handleClearToken.bind(this));
        }
        
        // Population dropdown selection
        const populationSelect = document.getElementById('settings-population-select');
        if (populationSelect) {
            populationSelect.addEventListener('change', this.handlePopulationSelect.bind(this));
        }
        
        // Population ID input changes
        const populationInput = document.getElementById('settings-population-id');
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
    
    populateForm() {
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
        
        // Handle Client Secret separately - show masked value if secret exists
        const clientSecretElement = document.getElementById('settings-client-secret');
        if (clientSecretElement) {
            const clientSecret = settings.pingone_client_secret || '';
            console.log('🔐 Loading Client Secret:', clientSecret ? `[${clientSecret.length} chars]` : 'empty');
            
            if (clientSecret && clientSecret.trim()) {
                // Show masked version (asterisks) but store actual value in data attribute
                const maskedValue = '*'.repeat(Math.min(clientSecret.length, 24));
                clientSecretElement.value = maskedValue;
                clientSecretElement.dataset.actualValue = clientSecret;
                clientSecretElement.dataset.isMasked = 'true';
                console.log('🔐 Client Secret masked:', maskedValue);
            } else {
                clientSecretElement.value = '';
                delete clientSecretElement.dataset.actualValue;
                delete clientSecretElement.dataset.isMasked;
                console.log('🔐 No Client Secret to mask');
            }
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
    
    updateTokenInfo() {
        const tokenStatus = this.app.tokenStatus;
        
        // Update token indicator
        const indicator = document.getElementById('settings-token-indicator');
        const text = document.getElementById('settings-token-text');
        
        if (indicator && text) {
            indicator.className = 'token-indicator ' + (tokenStatus.isValid ? 'valid' : 'invalid');
            text.textContent = tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid';
        }
        
        // Update token details
        const expires = document.getElementById('settings-token-expires');
        const timeLeft = document.getElementById('settings-token-time');
        
        if (expires) {
            expires.textContent = tokenStatus.expiresAt ? 
                tokenStatus.expiresAt.toLocaleString() : '-';
        }
        
        if (timeLeft) {
            timeLeft.textContent = tokenStatus.isValid ? 
                this.app.formatTimeLeft(tokenStatus.timeLeft) : '-';
        }
    }
    
    handleToggleSecret() {
        const secretInput = document.getElementById('settings-client-secret');
        const toggleIcon = document.querySelector('#settings-toggle-secret i');
        const toggleButton = document.getElementById('settings-toggle-secret');
        
        if (secretInput && toggleIcon && toggleButton) {
            if (secretInput.type === 'password') {
                secretInput.type = 'text';
                toggleIcon.className = 'icon-eye-off';
                toggleButton.title = 'Hide secret';
                toggleButton.setAttribute('aria-label', 'Hide client secret');
            } else {
                secretInput.type = 'password';
                toggleIcon.className = 'icon-eye';
                toggleButton.title = 'Show secret';
                toggleButton.setAttribute('aria-label', 'Show client secret');
            }
        }
    }
    
    async handleSaveSettings() {
        try {
            console.log('💾 Starting Save Settings process...');
            this.app.showLoading('Validating and saving settings...');
            
            // Clear previous validation messages and highlighting
            this.clearValidationMessages();
            this.clearFieldHighlighting();
            
            // Validate required fields exist and collect form data
            const requiredFields = [
                { id: 'settings-environment-id', name: 'Environment ID', key: 'pingone_environment_id' },
                { id: 'settings-client-id', name: 'Client ID', key: 'pingone_client_id' },
                { id: 'settings-client-secret', name: 'Client Secret', key: 'pingone_client_secret' },
                { id: 'settings-region', name: 'Region', key: 'pingone_region' }
            ];
            
            const missingFields = [];
            const emptyFields = [];
            const formData = {};
            
            // Check required fields
            for (const field of requiredFields) {
                const element = document.getElementById(field.id);
                if (!element) {
                    missingFields.push(field.name);
                    continue;
                }
                
                let value = element.value ? element.value.trim() : '';
                
                // Handle masked Client Secret field
                if (field.id === 'settings-client-secret' && element.dataset.isMasked === 'true' && element.dataset.actualValue) {
                    // If field is masked and contains asterisks, use the actual stored value
                    if (value.match(/^\*+$/)) {
                        value = element.dataset.actualValue;
                    } else {
                        // User has typed new value, clear the masked state
                        delete element.dataset.isMasked;
                        delete element.dataset.actualValue;
                    }
                }
                
                if (!value) {
                    emptyFields.push(field.name);
                    this.highlightField(element, true);
                } else {
                    this.highlightField(element, false);
                }
                formData[field.key] = value;
            }
            
            // Check optional fields
            const populationElement = document.getElementById('settings-population-id');
            if (populationElement) {
                formData.pingone_population_id = populationElement.value ? populationElement.value.trim() : '';
            }
            
            // Check preference fields (with safe defaults)
            const rateLimitElement = document.getElementById('rate-limit');
            formData.rateLimit = rateLimitElement ? (parseInt(rateLimitElement.value) || 100) : 100;
            
            const disclaimerElement = document.getElementById('show-disclaimer-modal');
            formData.showDisclaimerModal = disclaimerElement ? disclaimerElement.checked : false;
            
            const swaggerElement = document.getElementById('show-swagger');
            formData.showSwaggerPage = swaggerElement ? swaggerElement.checked : false;
            
            const autoRefreshElement = document.getElementById('auto-refresh-token');
            formData.autoRefreshToken = autoRefreshElement ? autoRefreshElement.checked : false;
            
            console.log('💾 Form data collected:', formData);
            console.log('💾 Missing fields:', missingFields);
            console.log('💾 Empty fields:', emptyFields);
            
            // Show user-friendly error messages
            if (missingFields.length > 0) {
                console.error('💾 Save failed: Missing form fields:', missingFields);
                this.showValidationErrors([`Missing form fields: ${missingFields.join(', ')}. Please refresh the page.`]);
                return;
            }
            
            if (emptyFields.length > 0) {
                console.error('💾 Save failed: Empty required fields:', emptyFields);
                this.showValidationErrors([`Please fill in all required fields: ${emptyFields.join(', ')}`]);
                return;
            }
            
            console.log('💾 Validating credentials...');
            // Validate credentials before saving
            const validation = await this.validateCredentials(formData);
            console.log('💾 Validation result:', validation);
            
            if (!validation.success) {
                console.error('💾 Save failed: Validation failed:', validation.errors);
                this.showValidationErrors(validation.errors || ['Validation failed']);
                return;
            }
            
            // Show warnings if any
            if (validation.warnings && validation.warnings.length > 0) {
                this.showValidationWarnings(validation.warnings);
            }
            
            console.log('💾 Updating app settings...');
            // Update app settings
            Object.assign(this.app.settings, formData);
            console.log('💾 Updated app settings:', this.app.settings);
            
            // Save to localStorage
            localStorage.setItem('pingone-settings', JSON.stringify(this.app.settings));
            console.log('💾 Saved to localStorage');
            
            // Save to server
            console.log('💾 Saving to server...');
            const saveResult = await this.app.saveSettings();
            console.log('💾 Server save result:', saveResult);
            
            // Update UI based on new settings
            this.updateUIBasedOnSettings();
            
            // Show success message with validation info
            let successMessage = 'Settings saved successfully!';
            if (validation.connectionTest?.success) {
                successMessage += ' Connection test passed.';
            } else if (validation.connectionTest) {
                successMessage += ' (Note: Connection test failed - please verify credentials)';
            }
            
            this.app.showSuccess(successMessage);
            
            // Update last updated time
            const lastUpdated = document.getElementById('settings-last-updated');
            if (lastUpdated) {
                lastUpdated.textContent = new Date().toLocaleString();
            }
            
            // Clear any previous validation messages
            this.clearValidationMessages();
            
        } catch (error) {
            console.error('💾 Save Settings failed with error:', error);
            console.error('💾 Error stack:', error.stack);
            
            let errorMessage = 'Failed to save settings: ' + error.message;
            
            // Check if it's a network/fetch error
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Network error: Could not connect to server. Please check your connection.';
            }
            
            // Check if it's a validation error
            if (error.message.includes('400') || error.message.includes('Bad Request')) {
                errorMessage = 'Validation error: Please check your settings and try again.';
            }
            
            this.app.showError(errorMessage);
        } finally {
            this.app.hideLoading();
        }
    }
    
    async handleTestConnection() {
        try {
            this.app.showLoading('Testing connection...');
            
            const credentials = {
                pingone_environment_id: document.getElementById('settings-environment-id').value,
                pingone_client_id: document.getElementById('settings-client-id').value,
                pingone_client_secret: document.getElementById('settings-client-secret').value,
                pingone_region: document.getElementById('settings-region').value
            };
            
            if (!credentials.pingone_environment_id || !credentials.pingone_client_id || !credentials.pingone_client_secret) {
                throw new Error('Please fill in all required fields before testing');
            }
            
            const result = await this.app.getToken(credentials);
            
            if (result.success) {
                this.app.showSuccess('Connection test successful! Token acquired.');
                this.app.updateTokenStatus(result.token);
                this.updateTokenInfo();
            } else {
                throw new Error(result.error || 'Connection test failed');
            }
            
        } catch (error) {
            this.app.showError('Connection test failed: ' + error.message);
        } finally {
            this.app.hideLoading();
        }
    }
    
    async handleRefreshToken() {
        try {
            this.app.showLoading('Refreshing token...');
            
            const credentials = {
                pingone_environment_id: this.app.settings.pingone_environment_id,
                pingone_client_id: this.app.settings.pingone_client_id,
                pingone_client_secret: this.app.settings.pingone_client_secret,
                pingone_region: this.app.settings.pingone_region
            };
            
            const result = await this.app.getToken(credentials);
            
            if (result.success) {
                this.app.updateTokenStatus(result.token);
                this.updateTokenInfo();
                this.app.showSuccess('Token refreshed successfully!');
            } else {
                throw new Error(result.error || 'Failed to refresh token');
            }
            
        } catch (error) {
            this.app.showError('Failed to refresh token: ' + error.message);
        } finally {
            this.app.hideLoading();
        }
    }
    
    handleClearToken() {
        if (confirm('Are you sure you want to clear the current token?')) {
            this.app.updateTokenStatus(null);
            this.updateTokenInfo();
            this.app.showInfo('Token cleared successfully');
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
        const populationSelect = document.getElementById('settings-population-select');
        const populationInput = document.getElementById('settings-population-id');
        
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
        const populationSelect = document.getElementById('settings-population-select');
        const populationInput = document.getElementById('settings-population-id');
        
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
        const populationSelect = document.getElementById('settings-population-select');
        if (populationSelect) {
            // Clear existing options to force reload
            populationSelect.innerHTML = '<option value="">Loading populations...</option>';
        }
        
        // Force reload populations
        await this.loadPopulations();
    }
    
    /**
     * Load populations into the dropdown
     */
    async loadPopulations() {
        const populationSelect = document.getElementById('settings-population-select');
        if (!populationSelect) {
            console.warn('🏘️ Population select element not found');
            return;
        }
        
        // Check if dropdown already has populations (avoid duplicate loading)
        // Only skip if we have actual population options, not just "Loading..." or "No populations"
        const hasRealPopulations = Array.from(populationSelect.options).some(option => 
            option.value && option.value !== "" && !option.textContent.includes("Loading") && !option.textContent.includes("No populations")
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
                
                if (result.success && result.data && result.data.populations) {
                    this.populateDropdown(result.data.populations);
                    console.log('🏘️ Loaded populations from API:', result.data.populations.length);
                } else if (result.populations) {
                    // Handle different response format
                    this.populateDropdown(result.populations);
                    console.log('🏘️ Loaded populations from API (alt format):', result.populations.length);
                } else {
                    throw new Error('Invalid populations response format: ' + JSON.stringify(result));
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
        const populationSelect = document.getElementById('settings-population-select');
        if (!populationSelect) {
            console.warn('🏘️ Population select element not found in populateDropdown');
            return;
        }
        
        if (!populations || !Array.isArray(populations)) {
            console.warn('🏘️ Invalid populations data:', populations);
            populationSelect.innerHTML = '<option value="">No populations available</option>';
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
                toggleIcon.className = 'icon-eye-off';
                toggleButton.title = 'Hide secret';
                toggleButton.setAttribute('aria-label', 'Hide client secret');
                
                // If this is a masked value, show the actual value
                if (secretInput.dataset.isMasked === 'true' && secretInput.dataset.actualValue) {
                    secretInput.value = secretInput.dataset.actualValue;
                }
            } else {
                // Hiding secret
                secretInput.type = 'password';
                toggleIcon.className = 'icon-eye';
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
}
