/**
 * Client-Side Credential Management UI
 * 
 * Provides a user interface for managing PingOne credentials with:
 * - Secure credential input and validation
 * - Multi-location storage (localStorage, server .env, settings.json)
 * - Real-time credential testing and validation
 * - Import/export capabilities for credential management
 * - Integration with the enhanced server authentication system
 */

class CredentialManagementUI {
    constructor(eventBus, logger) {
        this.eventBus = eventBus;
        this.logger = logger || console;
        this.isVisible = false;
        this.currentCredentials = null;
        this.validationStatus = {
            clientId: false,
            clientSecret: false,
            environmentId: false,
            region: true // Region has default value
        };

        this.setupEventListeners();
    }

    /**
     * Initialize the credential management UI
     */
    initialize() {
        this.createUI();
        this.loadCurrentCredentials();
        this.logger.info('Credential Management UI initialized');
    }

    /**
     * Create the credential management UI elements
     */
    createUI() {
        // Create modal container
        const modalHtml = `
            <div id="credential-management-modal" class="modal credential-modal" style="display: none;">
                <div class="modal-content credential-modal-content">
                    <div class="modal-header">
                        <h2>
                            <i class="fas fa-key"></i>
                            PingOne Credential Management
                        </h2>
                        <button class="close-btn" id="close-credential-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <!-- Credential Status Section -->
                        <div class="credential-status-section">
                            <h3>Current Status</h3>
                            <div id="credential-status-display" class="status-display">
                                <div class="status-item">
                                    <span class="status-label">Authentication:</span>
                                    <span id="auth-status" class="status-value">Checking...</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Token Expires:</span>
                                    <span id="token-expiry" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Credential Source:</span>
                                    <span id="credential-source" class="status-value">-</span>
                                </div>
                            </div>
                        </div>

                        <!-- Credential Input Section -->
                        <div class="credential-input-section">
                            <h3>Credential Configuration</h3>
                            <form id="credential-form">
                                <div class="form-group">
                                    <label for="client-id">
                                        Client ID
                                        <span class="validation-indicator" id="client-id-indicator">
                                            <i class="fas fa-circle"></i>
                                        </span>
                                    </label>
                                    <input type="text" id="client-id" name="clientId" 
                                           placeholder="Enter PingOne Client ID" required>
                                    <small class="help-text">Your PingOne application's Client ID</small>
                                </div>

                                <div class="form-group">
                                    <label for="client-secret">
                                        Client Secret
                                        <span class="validation-indicator" id="client-secret-indicator">
                                            <i class="fas fa-circle"></i>
                                        </span>
                                    </label>
                                    <div class="password-input-group">
                                        <input type="password" id="client-secret" name="clientSecret" 
                                               placeholder="Enter PingOne Client Secret" required>
                                        <button type="button" class="toggle-password" id="toggle-client-secret">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                    <small class="help-text">Your PingOne application's Client Secret</small>
                                </div>

                                <div class="form-group">
                                    <label for="environment-id">
                                        Environment ID
                                        <span class="validation-indicator" id="environment-id-indicator">
                                            <i class="fas fa-circle"></i>
                                        </span>
                                    </label>
                                    <input type="text" id="environment-id" name="environmentId" 
                                           placeholder="Enter PingOne Environment ID" required>
                                    <small class="help-text">Your PingOne environment's unique identifier</small>
                                </div>

                                <div class="form-group">
                                    <label for="region">
                                        Region
                                        <span class="validation-indicator" id="region-indicator">
                                            <i class="fas fa-check-circle"></i>
                                        </span>
                                    </label>
                                    <select id="region" name="region">
                                        <option value="NorthAmerica">North America</option>
                                        <option value="Europe">Europe</option>
                                        <option value="AsiaPacific">Asia Pacific</option>
                                        <option value="Canada">Canada</option>
                                    </select>
                                    <small class="help-text">Select your PingOne region</small>
                                </div>
                            </form>
                        </div>

                        <!-- Storage Options Section -->
                        <div class="storage-options-section">
                            <h3>Storage Options</h3>
                            <div class="storage-checkboxes">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="save-to-env" checked>
                                    <span class="checkmark"></span>
                                    Save to .env file (Server)
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="save-to-settings" checked>
                                    <span class="checkmark"></span>
                                    Save to settings.json (Server)
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="save-to-localstorage">
                                    <span class="checkmark"></span>
                                    Save to localStorage (Client)
                                </label>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="action-buttons">
                            <button type="button" id="test-credentials-btn" class="btn btn-secondary">
                                <i class="fas fa-vial"></i>
                                Test Credentials
                            </button>
                            <button type="button" id="save-credentials-btn" class="btn btn-primary">
                                <i class="fas fa-save"></i>
                                Save Credentials
                            </button>
                            <button type="button" id="load-credentials-btn" class="btn btn-secondary">
                                <i class="fas fa-download"></i>
                                Load Current
                            </button>
                            <button type="button" id="clear-credentials-btn" class="btn btn-danger">
                                <i class="fas fa-trash"></i>
                                Clear All
                            </button>
                        </div>

                        <!-- Results Section -->
                        <div id="credential-results" class="results-section" style="display: none;">
                            <h3>Results</h3>
                            <div id="results-content" class="results-content"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.bindEventHandlers();
    }

    /**
     * Bind event handlers for UI interactions
     */
    bindEventHandlers() {
        // Modal controls
        document.getElementById('close-credential-modal').addEventListener('click', () => {
            this.hide();
        });

        // Password visibility toggle
        document.getElementById('toggle-client-secret').addEventListener('click', () => {
            this.togglePasswordVisibility('client-secret', 'toggle-client-secret');
        });

        // Form validation
        ['client-id', 'client-secret', 'environment-id'].forEach(fieldId => {
            document.getElementById(fieldId).addEventListener('input', (e) => {
                this.validateField(fieldId, e.target.value);
            });
        });

        // Action buttons
        document.getElementById('test-credentials-btn').addEventListener('click', () => {
            this.testCredentials();
        });

        document.getElementById('save-credentials-btn').addEventListener('click', () => {
            this.saveCredentials();
        });

        document.getElementById('load-credentials-btn').addEventListener('click', () => {
            this.loadCurrentCredentials();
        });

        document.getElementById('clear-credentials-btn').addEventListener('click', () => {
            this.clearCredentials();
        });

        // Close modal when clicking outside
        document.getElementById('credential-management-modal').addEventListener('click', (e) => {
            if (e.target.id === 'credential-management-modal') {
                this.hide();
            }
        });
    }

    /**
     * Setup event listeners for external events
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('auth:statusChanged', (status) => {
                this.updateStatusDisplay(status);
            });

            this.eventBus.on('credentials:updated', () => {
                this.loadCurrentCredentials();
            });
        }
    }

    /**
     * Show the credential management modal
     */
    show() {
        const modal = document.getElementById('credential-management-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.isVisible = true;
            this.loadCurrentCredentials();
            this.updateAuthenticationStatus();
        }
    }

    /**
     * Hide the credential management modal
     */
    hide() {
        const modal = document.getElementById('credential-management-modal');
        if (modal) {
            modal.style.display = 'none';
            this.isVisible = false;
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(inputId, buttonId) {
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    /**
     * Validate individual form fields
     */
    validateField(fieldId, value) {
        const indicator = document.getElementById(`${fieldId}-indicator`);
        const icon = indicator.querySelector('i');
        
        let isValid = false;
        
        switch (fieldId) {
            case 'client-id':
                isValid = value && value.length > 10 && !value.includes('YOUR_');
                this.validationStatus.clientId = isValid;
                break;
            case 'client-secret':
                isValid = value && value.length > 20 && !value.includes('YOUR_');
                this.validationStatus.clientSecret = isValid;
                break;
            case 'environment-id':
                isValid = value && value.length > 10 && !value.includes('YOUR_');
                this.validationStatus.environmentId = isValid;
                break;
        }

        // Update indicator
        if (isValid) {
            icon.className = 'fas fa-check-circle';
            icon.style.color = '#28a745';
        } else {
            icon.className = 'fas fa-exclamation-circle';
            icon.style.color = '#dc3545';
        }
    }

    /**
     * Test credentials by making a validation request
     */
    async testCredentials() {
        const credentials = this.getFormCredentials();
        const button = document.getElementById('test-credentials-btn');
        const originalText = button.innerHTML;

        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            button.disabled = true;

            const response = await fetch('/api/auth/validate-credentials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const result = await response.json();
            
            this.showResults({
                type: result.success ? 'success' : 'error',
                title: 'Credential Test Results',
                message: result.message,
                details: result.details || null
            });

        } catch (error) {
            this.showResults({
                type: 'error',
                title: 'Test Failed',
                message: 'Failed to test credentials: ' + error.message
            });
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    /**
     * Save credentials to selected storage locations
     */
    async saveCredentials() {
        const credentials = this.getFormCredentials();
        const storageTargets = this.getSelectedStorageTargets();
        const button = document.getElementById('save-credentials-btn');
        const originalText = button.innerHTML;

        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            button.disabled = true;

            const response = await fetch('/api/auth/save-credentials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    credentials: credentials,
                    targets: storageTargets
                })
            });

            const result = await response.json();
            
            // Save to localStorage if selected
            if (storageTargets.includes('localStorage')) {
                this.saveToLocalStorage(credentials);
            }

            this.showResults({
                type: result.success ? 'success' : 'warning',
                title: 'Save Results',
                message: 'Credential save operation completed',
                details: result.results
            });

            if (result.success) {
                this.eventBus?.emit('credentials:updated', credentials);
            }

        } catch (error) {
            this.showResults({
                type: 'error',
                title: 'Save Failed',
                message: 'Failed to save credentials: ' + error.message
            });
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    /**
     * Load current credentials from server
     */
    async loadCurrentCredentials() {
        try {
            const response = await fetch('/api/auth/current-credentials');
            const result = await response.json();

            if (result.success && result.credentials) {
                this.populateForm(result.credentials);
                this.currentCredentials = result.credentials;
            }
        } catch (error) {
            this.logger.error('Failed to load current credentials:', error);
        }
    }

    /**
     * Clear all credentials
     */
    async clearCredentials() {
        if (!confirm('Are you sure you want to clear all credentials? This will require reconfiguration.')) {
            return;
        }

        try {
            // Clear form
            document.getElementById('credential-form').reset();
            
            // Clear localStorage
            localStorage.removeItem('pingone_credentials');
            
            // Clear server credentials
            const response = await fetch('/api/auth/clear-credentials', {
                method: 'POST'
            });

            const result = await response.json();
            
            this.showResults({
                type: result.success ? 'success' : 'error',
                title: 'Clear Results',
                message: result.message
            });

            // Reset validation indicators
            Object.keys(this.validationStatus).forEach(key => {
                this.validationStatus[key] = false;
                const indicator = document.getElementById(`${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-indicator`);
                if (indicator) {
                    const icon = indicator.querySelector('i');
                    icon.className = 'fas fa-circle';
                    icon.style.color = '#6c757d';
                }
            });

        } catch (error) {
            this.showResults({
                type: 'error',
                title: 'Clear Failed',
                message: 'Failed to clear credentials: ' + error.message
            });
        }
    }

    /**
     * Get credentials from form
     */
    getFormCredentials() {
        return {
            clientId: document.getElementById('client-id').value.trim(),
            clientSecret: document.getElementById('client-secret').value.trim(),
            environmentId: document.getElementById('environment-id').value.trim(),
            region: document.getElementById('region').value
        };
    }

    /**
     * Get selected storage targets
     */
    getSelectedStorageTargets() {
        const targets = [];
        if (document.getElementById('save-to-env').checked) targets.push('env');
        if (document.getElementById('save-to-settings').checked) targets.push('settings');
        if (document.getElementById('save-to-localstorage').checked) targets.push('localStorage');
        return targets;
    }

    /**
     * Populate form with credentials
     */
    populateForm(credentials) {
        if (credentials.clientId) {
            document.getElementById('client-id').value = credentials.clientId;
            this.validateField('client-id', credentials.clientId);
        }
        if (credentials.clientSecret) {
            document.getElementById('client-secret').value = credentials.clientSecret;
            this.validateField('client-secret', credentials.clientSecret);
        }
        if (credentials.environmentId) {
            document.getElementById('environment-id').value = credentials.environmentId;
            this.validateField('environment-id', credentials.environmentId);
        }
        if (credentials.region) {
            document.getElementById('region').value = credentials.region;
        }
    }

    /**
     * Save credentials to localStorage
     */
    saveToLocalStorage(credentials) {
        try {
            // Only save non-sensitive data to localStorage
            const safeCredentials = {
                clientId: credentials.clientId,
                environmentId: credentials.environmentId,
                region: credentials.region,
                // Never save client secret to localStorage
                hasClientSecret: !!credentials.clientSecret
            };
            
            localStorage.setItem('pingone_credentials', JSON.stringify(safeCredentials));
        } catch (error) {
            this.logger.error('Failed to save to localStorage:', error);
        }
    }

    /**
     * Update authentication status display
     */
    async updateAuthenticationStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const status = await response.json();
            this.updateStatusDisplay(status);
        } catch (error) {
            this.logger.error('Failed to get auth status:', error);
        }
    }

    /**
     * Update status display elements
     */
    updateStatusDisplay(status) {
        const authStatus = document.getElementById('auth-status');
        const tokenExpiry = document.getElementById('token-expiry');
        const credentialSource = document.getElementById('credential-source');

        if (authStatus) {
            authStatus.textContent = status.isInitialized ? 
                (status.hasValidToken ? 'Active' : 'Token Expired') : 'Not Initialized';
            authStatus.className = `status-value ${status.hasValidToken ? 'status-success' : 'status-error'}`;
        }

        if (tokenExpiry && status.tokenExpiresAt) {
            tokenExpiry.textContent = new Date(status.tokenExpiresAt).toLocaleString();
        }

        if (credentialSource && status.credentialSource) {
            credentialSource.textContent = status.credentialSource;
        }
    }

    /**
     * Show results in the results section
     */
    showResults(result) {
        const resultsSection = document.getElementById('credential-results');
        const resultsContent = document.getElementById('results-content');

        let html = `
            <div class="result-item result-${result.type}">
                <h4>${result.title}</h4>
                <p>${result.message}</p>
        `;

        if (result.details) {
            html += '<div class="result-details">';
            if (typeof result.details === 'object') {
                for (const [key, value] of Object.entries(result.details)) {
                    const status = value.success ? 'success' : 'error';
                    html += `<div class="detail-item detail-${status}">
                        <strong>${key}:</strong> ${value.success ? 'Success' : value.error || 'Failed'}
                    </div>`;
                }
            } else {
                html += `<p>${result.details}</p>`;
            }
            html += '</div>';
        }

        html += '</div>';

        resultsContent.innerHTML = html;
        resultsSection.style.display = 'block';

        // Auto-hide after 10 seconds for success messages
        if (result.type === 'success') {
            setTimeout(() => {
                resultsSection.style.display = 'none';
            }, 10000);
        }
    }
}

export default CredentialManagementUI;
