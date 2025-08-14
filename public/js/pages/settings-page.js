// Settings Page Module
// PingOne User Management Tool v7.2.0

export class SettingsPage {
    constructor(app) {
        this.app = app;
        this.isLoaded = false;
        this.signageSystem = new SignageSystem(this);
        this.tokenMonitor = null;
        this.systemHealthCheck = null;
        // Spinner hold settings
        this._overlayMinHoldMs = 1500; // 1.5 seconds
        this._overlayShownAt = 0;
        this._overlayHideTimer = null;
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
                        
                        <form id="settings-form" class="settings-form" autocomplete="off">
                            <div class="form-group">
                                <label for="settings-environment-id"><i class="mdi mdi-earth"></i> PingOne Environment ID *</label>
                                <div class="input-group input-group-fused">
                                    <input type="text" id="settings-environment-id" name="environmentId" class="form-control" required style="min-width: 520px;" autocomplete="off" autocapitalize="off" spellcheck="false">
                                    <button type="button" class="btn btn-outline-secondary" id="copy-settings-env-id" title="Copy Environment ID" aria-label="Copy Environment ID">
                                        <i class="mdi mdi-content-copy"></i>
                                    </button>
                                </div>
                                <div class="form-help">Your PingOne environment identifier</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="settings-client-id"><i class="mdi mdi-account"></i> PingOne Client ID *</label>
                                <div class="input-group input-group-fused">
                                    <input type="text" id="settings-client-id" name="clientId" class="form-control" required style="min-width: 520px;" autocomplete="off" autocapitalize="off" spellcheck="false">
                                    <button type="button" class="btn btn-outline-secondary" id="copy-settings-client-id" title="Copy Client ID" aria-label="Copy Client ID">
                                        <i class="mdi mdi-content-copy"></i>
                                    </button>
                                </div>
                                <div class="form-help">Your PingOne API client identifier</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="settings-client-secret"><i class="mdi mdi-key"></i> PingOne Client Secret *</label>
                                <div class="input-group input-group-fused">
                                    <input type="password" id="settings-client-secret" name="clientSecret" class="form-control" required style="min-width: 640px;" autocomplete="new-password">
                                    <button type="button" class="btn btn-outline-secondary" id="settings-toggle-secret" title="Toggle password visibility" aria-label="Toggle password visibility">
                                        <svg class="mdi-icon" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"></path></svg>
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
                                <label><i class="mdi mdi-account-group" style="color:#1565c0;"></i> PingOne Population</label>
                                <div class="input-group input-group-fused">
                                    <select id="settings-population" name="populationId" class="form-control">
                                        <option value="">Select Population</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary" title="Refresh populations" aria-label="Refresh populations">
                                        <i class="mdi mdi-refresh" style="color:#1565c0;"></i>
                                    </button>
                                </div>
                                <div class="form-help">Default population for operations (optional)</div>
                                <div id="settings-population-refresh-indicator" class="refresh-indicator" style="display:none;"></div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" id="save-settings" class="btn btn-primary" style="min-width: 140px; height: 40px; padding: 8px 16px;">
                                    <i class="mdi mdi-content-save"></i> Save Settings
                                </button>
                                <button type="button" id="test-connection" class="btn btn-danger" title="Get a new token using the current saved settings" disabled style="min-width: 140px; height: 40px; padding: 8px 16px;">
                                    <i class="mdi mdi-key"></i> Get Token
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
                                 <button type="button" id="get-new-token" class="btn btn-danger btn-sm" title="Clear and fetch a brand new token">
                                     <i class="mdi mdi-key-plus"></i> Get New Token
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
                                <span id="settings-server-status" class="value status-indicator status-valid" style="display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;width:100%;">
                                    <i class="icon-circle"></i>
                                    <span>Connected</span>
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
            // Re-apply saved values after the browser's autofill typically runs
            setTimeout(() => { this.populateForm().catch(()=>{}); }, 50);
            // And once more on next frame to defeat late autofill
            requestAnimationFrame(() => { this.populateForm().catch(()=>{}); });
            
            // Apply final inline styles to ensure buttons render with black outline and light blue background
            this.applyTokenButtonStyles();
            
            // Focus management for Settings page
            this.manageSettingsFocus();
            
            // Initialize population dropdown in locked state until a new token is acquired
            const populationSelect = document.getElementById('settings-population');
            if (populationSelect) {
                populationSelect.disabled = true;
                populationSelect.innerHTML = '<option value="">Get new token</option>';
                // Ensure it stays disabled until token is obtained
                populationSelect.style.opacity = '0.6';
                populationSelect.style.cursor = 'not-allowed';
            }
            
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

        // If user types in the secret field, consider it unmasked and use the typed value
        const secretInputEl = document.getElementById('settings-client-secret');
        if (secretInputEl) {
            const clearMask = () => {
                secretInputEl.dataset.isMasked = 'false';
                // Don't keep stale actualValue if user is typing a new one
                secretInputEl.dataset.actualValue = '';
            };
            secretInputEl.addEventListener('input', clearMask);
            secretInputEl.addEventListener('change', clearMask);
        }
        
        // Save Settings button
        const saveSettings = document.getElementById('save-settings');
        if (saveSettings) {
            console.log(' Save Settings button found and event listener attached');
            saveSettings.addEventListener('click', this.handleSaveSettings.bind(this));
            // Inject an inline spinner next to the Save button (hidden by default)
            const actions = saveSettings.parentElement;
            if (actions && !document.getElementById('save-inline-spinner')) {
                const spinner = document.createElement('span');
                spinner.id = 'save-inline-spinner';
                spinner.setAttribute('aria-live', 'polite');
                spinner.setAttribute('role', 'status');
                spinner.style.display = 'none';
                spinner.style.marginLeft = '10px';
                spinner.innerHTML = `
                  <div class="spinner-border text-primary" role="status" style="width:1rem;height:1rem;">
                    <span class="visually-hidden">Loading...</span>
                  </div>`;
                actions.appendChild(spinner);
            }
        } else {
            console.error(' Save Settings button NOT found!');
        }
        
        // Test connection
        const getTokenBtn = document.getElementById('test-connection');
        if (getTokenBtn) {
            // Initially disabled until saved settings match form values
            getTokenBtn.disabled = true;
            // Force red style on load
            getTokenBtn.classList.remove('btn-outline-info', 'btn-success');
            getTokenBtn.classList.add('btn-danger');
            getTokenBtn.title = 'Save settings to enable Get Token';
            // Enforce visible red regardless of conflicting CSS
            try {
                getTokenBtn.style.backgroundColor = '#dc3545';
                getTokenBtn.style.borderColor = '#dc3545';
                getTokenBtn.style.color = '#fff';
            } catch (_) {}
            const evaluateEnable = async () => {
                try {
                    const resp = await fetch(`/api/v1/settings?_=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
                    const json = await resp.json().catch(()=>({}));
                    const settings = (json && (json.data?.data || json.data || json.message)) || json || {};
                    const serverClientId = (settings.apiClientId || settings.pingone_client_id || settings.clientId || '').trim();
                    const formClientId = (document.getElementById('settings-client-id')?.value || '').trim();
                    getTokenBtn.disabled = !serverClientId || serverClientId !== formClientId;
                    getTokenBtn.title = getTokenBtn.disabled ? 'Save settings to enable Get Token' : 'Get a new token using saved settings';
                } catch (_) {
                    getTokenBtn.disabled = true;
                }
            };
            // Re-evaluate on input changes and after save
            ['settings-client-id','settings-environment-id','settings-client-secret','settings-region'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', evaluateEnable);
            });
            evaluateEnable();

            getTokenBtn.addEventListener('click', async () => {
                await this.handleGetTokenFlow(getTokenBtn);
                this.app?.extendStatusDuration?.(2500);
            });
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

        // Get brand new token (clear then fetch)
        document.getElementById('get-new-token')?.addEventListener('click', async () => {
            try {
                this.signageSystem.addMessage('🧹 Clearing token cache…', 'warning');
                await fetch('/api/v1/auth/clear-token', { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(()=>{});
            } catch (_) {}
            await this.handleRefreshToken();
            this.app?.extendStatusDuration?.(2500);
        });

        document.getElementById('clear-token')?.addEventListener('click', () => {
            this.handleClearToken();
        });
        
        // Population dropdown selection
        const populationSelect = document.getElementById('settings-population');
        if (populationSelect) {
            populationSelect.addEventListener('change', this.handlePopulationSelect.bind(this));
        }

        // Copy Environment ID
        const copyEnvIdBtn = document.getElementById('copy-settings-env-id');
        if (copyEnvIdBtn) {
            copyEnvIdBtn.addEventListener('click', async () => {
                try {
                    const el = document.getElementById('settings-environment-id');
                    const value = el?.value?.trim();
                    if (!value) { this.app.showWarning('No Environment ID to copy'); return; }
                    await navigator.clipboard.writeText(value);
                    this.app.showSuccess('Environment ID copied to clipboard');
                } catch (err) {
                    this.app.showError('Failed to copy Environment ID');
                }
            });
        }

        // Copy Client ID
        const copyClientIdBtn = document.getElementById('copy-settings-client-id');
        if (copyClientIdBtn) {
            copyClientIdBtn.addEventListener('click', async () => {
                try {
                    const el = document.getElementById('settings-client-id');
                    const value = el?.value?.trim();
                    if (!value) { this.app.showWarning('No Client ID to copy'); return; }
                    await navigator.clipboard.writeText(value);
                    this.app.showSuccess('Client ID copied to clipboard');
                } catch (err) {
                    this.app.showError('Failed to copy Client ID');
                }
            });
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
        // Always pull latest saved values directly from server to override autofill
        let settings = this.app.settings || {};
        try {
            const resp = await fetch(`/api/v1/settings?_=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
            const j = await resp.json().catch(()=>({}));
            const data = (j && (j.data?.data || j.data || j.message)) || {};
            if (data && Object.keys(data).length) settings = { ...settings, ...data };
        } catch (_) {}
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
            if (!element) return;
            // Force-set to server values to defeat autofill
            element.value = value;
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

            // Normalize server status indicator (display green when started)
            const serverStatusEl = document.getElementById('settings-server-status');
            if (serverStatusEl) {
                serverStatusEl.classList.remove('status-valid','status-invalid','status-unknown');
                // If we got a response, the server is up
                serverStatusEl.classList.add('status-valid');
                const textNode = serverStatusEl.childNodes[serverStatusEl.childNodes.length - 1];
                if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                    // keep as is
                }
            }
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
        
        // Update population dropdown state based on token validity
        this.updatePopulationDropdownState(isValid);
    }
    
    updatePopulationDropdownState(hasValidToken) {
        const populationSelect = document.getElementById('settings-population');
        if (populationSelect) {
            populationSelect.disabled = !hasValidToken;
            populationSelect.style.opacity = hasValidToken ? '1' : '0.6';
            populationSelect.style.cursor = hasValidToken ? 'pointer' : 'not-allowed';
            
            // If no valid token, show placeholder
            if (!hasValidToken) {
                populationSelect.innerHTML = '<option value="">Get new token</option>';
            }
        }
    }
    
    handleToggleSecret() {
        const secretInput = document.getElementById('settings-client-secret');
        const toggleButton = document.getElementById('settings-toggle-secret');
        const svgPath = toggleButton?.querySelector('svg path');
        // MDI paths
        const EYE_PATH = 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z';
        const EYE_OFF_PATH = 'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z';
        
        if (secretInput && toggleButton && svgPath) {
            if (secretInput.type === 'password') {
                // Showing secret
                secretInput.type = 'text';
                svgPath.setAttribute('d', EYE_OFF_PATH);
                toggleButton.title = 'Hide secret';
                toggleButton.setAttribute('aria-label', 'Hide client secret');
                
                if (secretInput.dataset.isMasked === 'true' && secretInput.dataset.actualValue) {
                    secretInput.value = secretInput.dataset.actualValue;
                }
            } else {
                // Hiding secret
                secretInput.type = 'password';
                svgPath.setAttribute('d', EYE_PATH);
                toggleButton.title = 'Show secret';
                toggleButton.setAttribute('aria-label', 'Show client secret');
                
                if (secretInput.dataset.actualValue && secretInput.value === secretInput.dataset.actualValue) {
                    secretInput.value = '*'.repeat(Math.min(secretInput.dataset.actualValue.length, 20));
                }
            }
        }
    }
    
    async handleSaveSettings() {
        console.log('💾 Saving settings...');
        
        this.setButtonLoading('save-settings', true);
        // Show full-page overlay immediately for consistency with other actions
        this.ensureGlobalLoading(true, 'Saving settings...');
        // Yield to the browser so the overlay paints before heavy work
        await this.yieldToUI();
        // Show green (success-themed) top status while saving per requirement
        this.app.showSuccess('Saving settings...');
        this.app?.extendStatusDuration?.(2500);
        
        try {
            const form = document.getElementById('settings-form');
            if (!form) {
                throw new Error('Settings form not found');
            }
            
            const formData = new FormData(form);
            // Resolve secret: if field shows masked value (contains *), use dataset.actualValue; else use typed value
            const secretEl = document.getElementById('settings-client-secret');
            let secretValue = (formData.get('clientSecret') || '').toString();
            if (secretEl) {
                const hasAsterisks = /\*/.test(secretEl.value || '');
                if (hasAsterisks && secretEl.dataset && secretEl.dataset.actualValue) {
                    secretValue = secretEl.dataset.actualValue;
                }
            }
            const regionValue = (formData.get('region') || 'NorthAmerica').toString();
            const settings = {
                pingone_environment_id: formData.get('environmentId'),
                pingone_client_id: formData.get('clientId'),
                pingone_client_secret: secretValue,
                pingone_region: regionValue,
                pingone_population_id: formData.get('populationId')
            };
            
            // Add camelCase duplicates for compatibility with any legacy handlers
            const settingsCompat = {
                ...settings,
                environmentId: settings.pingone_environment_id,
                apiClientId: settings.pingone_client_id,
                apiSecret: settings.pingone_client_secret,
                region: settings.pingone_region,
                populationId: settings.pingone_population_id
            };
            
            // Validate required fields and formats before POST to avoid 400
            const requiredFields = ['pingone_environment_id', 'pingone_client_id', 'pingone_client_secret', 'pingone_region'];
            const missingFields = requiredFields.filter(field => !(settings[field] && String(settings[field]).trim()))
                .map(f => f.replace('pingone_', ''));
            if (missingFields.length > 0) throw new Error(`Missing required fields: ${missingFields.join(', ')}`);

            const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||'').trim());
            if (!isUuid(settings.pingone_environment_id)) throw new Error('Invalid environment ID (must be UUID)');
            if (!isUuid(settings.pingone_client_id)) throw new Error('Invalid client ID (must be UUID)');
            
            this.showTokenStatus('Validating settings...', 'info', 'Checking configuration validity');
            // Show inline spinner during save
            const inlineSpinner = document.getElementById('save-inline-spinner');
            if (inlineSpinner) inlineSpinner.style.display = 'inline-block';
            // Overlay already shown at method start
            
            // Save settings
            const response = await fetch('/api/v1/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsCompat)
            });
            
            const result = await response.json().catch(() => ({}));
            
            if (response.ok && result && result.success) {
                this.app.showSuccess('Settings saved successfully');
                this.app?.extendStatusDuration?.(2500);
                
                // Turn Save Settings button green to indicate success
                const saveBtn = document.getElementById('save-settings');
                if (saveBtn) {
                    saveBtn.classList.remove('btn-primary');
                    saveBtn.classList.add('btn-success');
                    // Revert to primary after 3 seconds
                    setTimeout(() => {
                        if (saveBtn) {
                            saveBtn.classList.remove('btn-success');
                            saveBtn.classList.add('btn-primary');
                        }
                    }, 3000);
                }
                
                // Update app settings
                if (this.app && this.app.settings) Object.assign(this.app.settings, settings);
                
                // Also persist a safe local copy for fallback (mapped to app schema)
                try {
                    this.app.setLocalCredentials(settings);
                } catch (_) {}
                
                // Update token info
                this.updateTokenInfo();
                
                // Keep population dropdown disabled until token is obtained
                const populationSelect = document.getElementById('settings-population');
                if (populationSelect) {
                    populationSelect.disabled = true;
                    populationSelect.style.opacity = '0.6';
                    populationSelect.style.cursor = 'not-allowed';
                }
                
            } else {
                // Surface unified server-side message shape (handle object error)
                const errObj = result?.error;
                const msg = (errObj && typeof errObj === 'object' && errObj.message) || result?.message || (Array.isArray(result?.details) ? result.details.join(', ') : 'Failed to save settings');
                throw new Error(msg);
            }
            
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            this.app.showError(`Failed to save settings: ${error.message}`);
            this.app?.extendStatusDuration?.(2500);
        } finally {
            this.setButtonLoading('save-settings', false);
            this.ensureGlobalLoading(false);
            const inlineSpinner = document.getElementById('save-inline-spinner');
            if (inlineSpinner) inlineSpinner.style.display = 'none';
        }
    }

    // Allow the UI to render pending style changes (e.g., overlay) before continuing
    async yieldToUI(frames = 1) {
        for (let i = 0; i < frames; i += 1) {
            await new Promise(resolve => requestAnimationFrame(() => resolve()));
        }
    }
    
    async handleTestConnection() {
        console.log('🔌 Testing connection...');
        
        try {
            this.ensureGlobalLoading(true, 'Testing connection...');
            this.app.showInfo('Testing connection...');
            this.app?.extendStatusDuration?.(2500);
            
            const form = document.getElementById('settings-form');
            const fd = form ? new FormData(form) : new FormData();
            const secretEl = document.getElementById('settings-client-secret');
            const resolvedSecret = secretEl && secretEl.dataset && secretEl.dataset.isMasked === 'true' && secretEl.dataset.actualValue
                ? secretEl.dataset.actualValue
                : (fd.get('clientSecret') || '');

            // Normalize region for backend route which expects NA/EU/APAC
            const regionRaw = (fd.get('region') || 'NorthAmerica').toString().trim();
            const regionNormalized = (() => {
                const r = regionRaw.toLowerCase();
                if (r === 'northamerica' || r === 'na' || r === 'canada') return 'NA';
                if (r === 'europe' || r === 'eu') return 'EU';
                if (r === 'asiapacific' || r === 'apac' || r === 'asia') return 'APAC';
                return 'NA';
            })();

            const credentials = {
                environmentId: (fd.get('environmentId') || '').toString().trim(),
                clientId: (fd.get('clientId') || '').toString().trim(),
                clientSecret: (resolvedSecret || '').toString(),
                region: regionNormalized
            };

            if (!credentials.environmentId || !credentials.clientId || !credentials.clientSecret) {
                this.signageSystem.addMessage('❌ Please fill in all required credentials', 'error');
                return;
            }
            
            const response = await fetch('/api/pingone/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showSuccess('Connection test successful');
                this.app?.extendStatusDuration?.(2500);
                
                if (result.token && result.token.timeLeft) {
                    this.signageSystem.addMessage(`⏰ Token acquired - Time left: ${result.token.timeLeft}`, 'info');
                }
            } else {
                this.app.showError(`Connection test failed: ${result.error || 'Unknown error'}`);
                this.app?.extendStatusDuration?.(2500);
            }
        } catch (error) {
            console.error('❌ Error testing connection:', error);
            this.app.showError(`Error testing connection: ${error.message}`);
            this.app?.extendStatusDuration?.(2500);
        } finally {
            this.ensureGlobalLoading(false);
        }
    }
    
    async handleRefreshToken() {
        console.log('🔄 Refreshing token...');
        
        try {
            this.ensureGlobalLoading(true, 'Refreshing token...');
            // Show status in signage
            this.signageSystem.addMessage('🔄 Refreshing token...', 'info');
            
            // Acquire token using auth subsystem; fallback to legacy refresh
            let response = await fetch('/api/v1/auth/token', { method: 'GET' }).catch(()=>null);
            let result = response ? await response.json().catch(()=>({})) : null;
            if (!response || !response.ok || !result?.success) {
                response = await fetch('/api/token/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(()=>null);
                result = response ? await response.json().catch(()=>({})) : null;
            }
            
            if (response && response.ok && result && (result.success || result.access_token || result.token)) {
                this.signageSystem.addMessage('✅ Token refreshed successfully!', 'success');
                // Update token info
                this.updateTokenInfo();
            } else {
                this.signageSystem.addMessage(`❌ Failed to refresh token: ${result?.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error refreshing token:', error);
            this.signageSystem.addMessage(`❌ Error refreshing token: ${error.message}`, 'error');
        } finally {
            this.ensureGlobalLoading(false);
        }
    }

    // Get a new token using the saved settings (server first), then local fallback
    async handleGetTokenFlow(buttonEl) {
        try {
            if (buttonEl) {
                buttonEl.classList.remove('btn-outline-info','btn-success');
                buttonEl.classList.add('btn-danger');
            }
            this.ensureGlobalLoading(true, 'Getting token...');
            this.signageSystem.addMessage('🔑 Getting new token…', 'info');

            // 1) Load most recent saved server settings
            let serverSettings = null;
            try {
                const resp = await fetch('/api/v1/settings', { cache: 'no-store' });
                const j = await resp.json().catch(()=>({}));
                serverSettings = (j && (j.data?.data || j.data || j.message)) || null;
            } catch (_) { /* ignore */ }

            // 2) Build credentials in order: server → current form → local
            const form = document.getElementById('settings-form');
            const fd = form ? new FormData(form) : new FormData();
            const secretEl = document.getElementById('settings-client-secret');
            const secretValue = secretEl && secretEl.dataset && secretEl.dataset.isMasked === 'true' && secretEl.dataset.actualValue
                ? secretEl.dataset.actualValue
                : (fd.get('clientSecret') || '');
            const local = this.app.getLocalCredentials?.() || {};

            const creds = {
                pingone_environment_id: (serverSettings?.pingone_environment_id || fd.get('environmentId') || local.pingone_environment_id || '').trim(),
                pingone_client_id: (serverSettings?.pingone_client_id || fd.get('clientId') || local.pingone_client_id || '').trim(),
                pingone_client_secret: (serverSettings?.pingone_client_secret || secretValue || local.pingone_client_secret || '').trim(),
                pingone_region: (serverSettings?.pingone_region || fd.get('region') || local.pingone_region || 'NorthAmerica').trim()
            };

            if (!creds.pingone_environment_id || !creds.pingone_client_id || !creds.pingone_client_secret) {
                this.app.showError('Missing credentials. Please save settings first.');
                return;
            }

            // 3) Request a token via auth subsystem (uses saved credentials)
            // Prefer auth subsystem GET; fallback to legacy refresh
            let resp = await fetch('/api/v1/auth/token', { method: 'GET' }).catch(()=>null);
            let result = resp ? await resp.json().catch(() => ({})) : null;
            if (!resp || !resp.ok || !result?.success) {
                // Fallback to legacy token endpoint
                resp = await fetch('/api/token/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(()=>null);
                result = await resp.json().catch(()=>({}));
                if (!resp || !resp.ok) throw new Error(result?.error || `HTTP ${resp?.status || 404}`);
            }

            // 4) Update UI and token info
            if (buttonEl) {
                buttonEl.classList.remove('btn-danger');
                buttonEl.classList.add('btn-success');
            }
            this.app.showSuccess('New token acquired');
            this.updateTokenInfo();

            // Enable population dropdown now that we have a token
            const populationSelect = document.getElementById('settings-population');
            if (populationSelect) {
                populationSelect.disabled = false;
                populationSelect.style.opacity = '1';
                populationSelect.style.cursor = 'pointer';
            }

            // 5) Fetch latest populations and update dropdown + persist to server settings
            await this.refreshSettingsPopulations();
        } catch (error) {
            if (buttonEl) {
                buttonEl.classList.remove('btn-success');
                buttonEl.classList.add('btn-danger');
            }
            this.app.showError(`Failed to get token: ${error.message}`);
        } finally {
            this.ensureGlobalLoading(false);
        }
    }

    // Pull populations from PingOne, update settings.json, and refresh the dropdown
    async refreshSettingsPopulations() {
        try {
            this.ensureGlobalLoading(true, 'Refreshing populations...');
            const resp = await fetch('/api/populations?refresh=1', { cache: 'no-store' });
            const data = await resp.json().catch(()=>({}));
            const populations = (data && (data.populations || data.data?.populations || data.message?.populations)) || [];
            if (Array.isArray(populations) && populations.length) {
                // Persist to settings.json by posting full settings merge
                const current = await (async () => {
                    const r = await fetch('/api/v1/settings', { cache: 'no-store' });
                    const j = await r.json().catch(()=>({}));
                    return (j && (j.data?.data || j.data || j.message)) || {};
                })();
                const merged = { ...current, populationCache: { populations } };
                await fetch('/api/v1/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(merged)
                }).catch(()=>{});

                // Update dropdown
                const select = document.getElementById('settings-population');
                if (select) {
                    // Only enable if we have a valid token
                    const hasValidToken = this.app.tokenStatus && this.app.tokenStatus.isValid;
                    select.disabled = !hasValidToken;
                    select.style.opacity = hasValidToken ? '1' : '0.6';
                    select.style.cursor = hasValidToken ? 'pointer' : 'not-allowed';
                    
                    select.innerHTML = '<option value="">Select a population...</option>';
                    populations.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id || '';
                        opt.textContent = `${p.name || 'Unnamed'}${p.userCount ? ` (${p.userCount} users)` : ''}`;
                        opt.dataset.population = JSON.stringify(p);
                        select.appendChild(opt);
                    });
                }
                this.app.showSuccess('Populations refreshed');
            } else {
                this.app.showWarning('No populations returned');
            }
        } catch (e) {
            this.app.showError('Failed to refresh populations');
        } finally {
            this.ensureGlobalLoading(false);
        }
    }

    // Ensure the global loading overlay is visible/hidden regardless of external CSS conflicts
    ensureGlobalLoading(show, message = '') {
        try {
            let overlay = document.getElementById('loading-overlay');
            let text = document.getElementById('loading-text');
            // Create overlay on-the-fly if missing
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'loading-overlay';
                overlay.className = 'loading-overlay';
                overlay.innerHTML = `
                  <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text" id="loading-text">Loading...</div>
                  </div>`;
                document.body.appendChild(overlay);
                text = overlay.querySelector('#loading-text');
            }
            if (show) {
                // cancel any pending hide
                if (this._overlayHideTimer) {
                    clearTimeout(this._overlayHideTimer);
                    this._overlayHideTimer = null;
                }
                this._overlayShownAt = Date.now();
                overlay.style.setProperty('display', 'flex', 'important');
                overlay.style.setProperty('position', 'fixed', 'important');
                overlay.style.setProperty('inset', '0', 'important');
                overlay.style.setProperty('background', 'rgba(0,0,0,0.25)', 'important');
                overlay.style.setProperty('z-index', '2147483647', 'important');
                overlay.style.setProperty('align-items', 'center', 'important');
                overlay.style.setProperty('justify-content', 'center', 'important');
                if (text) text.textContent = message || 'Loading...';

                // Center inner content and style it as a modal chip
                const content = overlay.querySelector('.loading-content');
                if (content) {
                    content.style.setProperty('display', 'flex', 'important');
                    content.style.setProperty('flex-direction', 'row', 'important');
                    content.style.setProperty('align-items', 'center', 'important');
                    content.style.setProperty('justify-content', 'center', 'important');
                    content.style.setProperty('gap', '10px', 'important');
                    content.style.setProperty('background', '#fff', 'important');
                    content.style.setProperty('padding', '12px 16px', 'important');
                    content.style.setProperty('border-radius', '10px', 'important');
                    content.style.setProperty('box-shadow', '0 10px 30px rgba(0,0,0,0.15)', 'important');
                }

                // Ensure a visible spinner in the center using Bootstrap style
                let spinner = overlay.querySelector('.loading-spinner');
                if (spinner) {
                    spinner.innerHTML = '<div class="spinner-border text-primary" role="status" style="width:1.25rem;height:1.25rem;animation-duration:2s;"><span class="visually-hidden">Loading...</span></div>';
                }
                // Accessibility hook
                document.body.setAttribute('aria-busy', 'true');
            } else {
                // Defer hide until one full slow rotation has completed
                const elapsed = Date.now() - (this._overlayShownAt || 0);
                const remaining = Math.max(0, (this._overlayMinHoldMs || 0) - elapsed);
                const doHide = () => {
                    overlay.style.setProperty('display', 'none', 'important');
                    document.body.removeAttribute('aria-busy');
                    this._overlayHideTimer = null;
                };
                if (remaining > 0) {
                    if (this._overlayHideTimer) clearTimeout(this._overlayHideTimer);
                    this._overlayHideTimer = setTimeout(doHide, remaining);
                } else {
                    doHide();
                }
            }
        } catch (_) {}
    }

    async handleValidateToken() {
        console.log('✅ Validating token...');
        
        try {
            this.ensureGlobalLoading(true, 'Validating token...');
            this.signageSystem.addMessage('🔍 Validating token...', 'info');
            // Use status endpoint for a non-refreshing validation check
            const response = await fetch('/api/v1/auth/status', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            
            const result = await response.json();
            const isValid = !!(result && ((result.isValid === true) || (result.tokenInfo && result.tokenInfo.isValid)));
            const timeLeft = (result && (result.expiresIn || (result.tokenInfo && result.tokenInfo.expiresIn))) || 'Unknown';
            if (result.success && isValid) {
                this.signageSystem.addMessage('✅ Token is valid!', 'success');
                this.signageSystem.addMessage(`⏰ Time remaining: ${timeLeft}`, 'info');
            } else {
                this.signageSystem.addMessage('❌ Token is invalid or expired', 'error');
            }
        } catch (error) {
            console.error('❌ Error validating token:', error);
            this.signageSystem.addMessage(`❌ Error validating token: ${error.message}`, 'error');
        } finally {
            this.ensureGlobalLoading(false);
        }
    }

    async handleRevokeToken() {
        console.log('🚫 Revoking token...');
        
        try {
            this.ensureGlobalLoading(true, 'Revoking token...');
            this.signageSystem.addMessage('🚫 Revoking token...', 'warning');
            
            // Use auth-subsystem endpoint
            const response = await fetch('/api/v1/auth/clear-token', {
                method: 'POST',
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
        } finally {
            this.ensureGlobalLoading(false);
        }
    }

    handleClearToken() {
        console.log('🗑️ Clearing token...');
        
        try {
            this.ensureGlobalLoading(true, 'Clearing token...');
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
        } finally {
            this.ensureGlobalLoading(false);
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
        try {
            this.ensureGlobalLoading(true, 'Refreshing populations...');
            const { populationLoader } = await import('../services/population-loader.js');
            populationLoader.clearCache();
        } catch (_) {}
        await this.loadPopulations();
        this.ensureGlobalLoading(false);
    }
    
    /**
     * Load populations into the dropdown
     */
    async loadPopulations() {
        const populationSelect = document.getElementById('settings-population');
        if (!populationSelect) return;
        
        // Check if we have a valid token before enabling the dropdown
        const hasValidToken = this.app.tokenStatus && this.app.tokenStatus.isValid;
        if (!hasValidToken) {
            // Keep dropdown disabled if no valid token
            populationSelect.disabled = true;
            populationSelect.style.opacity = '0.6';
            populationSelect.style.cursor = 'not-allowed';
            populationSelect.innerHTML = '<option value="">Get new token</option>';
            return;
        }
        
        try {
            const { populationLoader } = await import('../services/population-loader.js');
            await populationLoader.loadPopulations('settings-population', {
                showRefreshed: true,
                onError: (error) => {
                    console.error('❌ Error loading populations for settings page:', error);
                    populationSelect.innerHTML = '<option value="">No populations available</option>';
                },
                onSuccess: () => {
                    // If app has a saved default and nothing is selected yet, apply it
                    if (!populationSelect.value && this.app.settings?.pingone_population_id) {
                        populationSelect.value = this.app.settings.pingone_population_id;
                        populationSelect.dispatchEvent(new Event('change'));
                    }
                }
            });
        } catch (error) {
            console.error('⚠️ Could not load populations (settings):', error);
            populationSelect.innerHTML = '<option value="">No populations available</option>';
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
        const toggleButton = document.getElementById('settings-toggle-secret');
        const svgPath = toggleButton?.querySelector('svg path');
        const EYE_PATH = 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z';
        const EYE_OFF_PATH = 'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z';
        if (secretInput && toggleButton && svgPath) {
            if (secretInput.type === 'password') {
                secretInput.type = 'text';
                svgPath.setAttribute('d', EYE_OFF_PATH);
                toggleButton.title = 'Hide secret';
                toggleButton.setAttribute('aria-label', 'Hide client secret');
                if (secretInput.dataset.isMasked === 'true' && secretInput.dataset.actualValue) {
                    secretInput.value = secretInput.dataset.actualValue;
                }
            } else {
                secretInput.type = 'password';
                svgPath.setAttribute('d', EYE_PATH);
                toggleButton.title = 'Show secret';
                toggleButton.setAttribute('aria-label', 'Show client secret');
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

    /**
     * Update population cache status display
     */
    updatePopulationCacheStatus(status) {
        const cacheStatusEl = document.getElementById('population-cache-status');
        if (cacheStatusEl) {
            if (status.hasPopulationCache && status.hasPopulations) {
                cacheStatusEl.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i>
                        Population cache available: ${this.app.settings.populationCache.count} populations
                        <br><small>Cached at: ${new Date(this.app.settings.populationCache.cachedAt).toLocaleString()}</small>
                    </div>
                `;
            } else if (status.hasPopulationCache) {
                cacheStatusEl.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Population cache exists but no populations found
                    </div>
                `;
            } else {
                cacheStatusEl.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        No population cache available
                    </div>
                `;
            }
        }
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
