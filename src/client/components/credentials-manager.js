/**
 * @module
 * @description ES Module (converted from CommonJS)
 */

/**
 * Credentials Manager
 * Manages API credentials with localStorage persistence and .env fallback
 */
class CredentialsManager {
    constructor() {
        this.storageKey = 'pingone-credentials';
        this.defaultCredentials = this.getDefaultCredentials();
        this.credentials = null;
        this.init();
    }

    /**
     * Initialize the credentials manager
     */
    async init() {
        await this.loadCredentialsWithFallback();
        this.logCredentialEvent('info', {
            credentialSource: this.credentialSource,
            clientId: this.credentials.apiClientId ? '***' + this.credentials.apiClientId.slice(-4) : 'missing',
            environmentId: this.credentials.environmentId ? '***' + this.credentials.environmentId.slice(-4) : 'missing',
            region: this.credentials.region,
            tokenStatus: 'client-init',
            message: 'Credentials Manager initialized',
            success: true
        });
    }

    /**
     * Get default credentials from environment variables or empty values
     * @returns {Object} Default credentials object
     */
    getDefaultCredentials() {
        return {
            environmentId: '',
            apiClientId: '',
            apiSecret: '',
            region: 'NorthAmerica',
            populationId: ''
        };
    }

    /**
     * Load credentials from localStorage
     */
    async loadCredentialsWithFallback() {
        // Try API for server-side credentials first
        try {
            const res = await fetch('/api/auth/current-credentials');
            const data = await res.json();
            if (data.success && data.credentials) {
                this.credentials = {
                    environmentId: data.credentials.environmentId,
                    apiClientId: data.credentials.clientId,
                    apiSecret: data.credentials.hasClientSecret ? '************' : '',
                    region: data.credentials.region,
                    populationId: ''
                };
                this.credentialSource = data.credentials.credentialSource || 'server';
                this.logCredentialEvent('info', {
                    credentialSource: this.credentialSource,
                    clientId: this.credentials.apiClientId ? '***' + this.credentials.apiClientId.slice(-4) : 'missing',
                    environmentId: this.credentials.environmentId ? '***' + this.credentials.environmentId.slice(-4) : 'missing',
                    region: this.credentials.region,
                    tokenStatus: data.credentials.tokenStatus || 'unknown',
                    message: 'Loaded credentials from server',
                    success: true
                });
                return;
            }
        } catch (error) {
            this.logCredentialEvent('warn', {
                credentialSource: 'server',
                clientId: '',
                environmentId: '',
                region: '',
                tokenStatus: 'fetch-failed',
                message: 'Failed to load credentials from server',
                success: false
            });
        }
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.credentials = JSON.parse(stored);
                this.credentialSource = 'localStorage';
                this.logCredentialEvent('info', {
                    credentialSource: 'localStorage',
                    clientId: this.credentials.apiClientId ? '***' + this.credentials.apiClientId.slice(-4) : 'missing',
                    environmentId: this.credentials.environmentId ? '***' + this.credentials.environmentId.slice(-4) : 'missing',
                    region: this.credentials.region,
                    tokenStatus: 'localStorage',
                    message: 'Credentials loaded from localStorage',
                    success: true
                });
            } else {
                this.credentials = this.getDefaultCredentials();
                this.credentialSource = 'default';
                this.logCredentialEvent('warn', {
                    credentialSource: 'default',
                    clientId: '',
                    environmentId: '',
                    region: '',
                    tokenStatus: 'default',
                    message: 'No stored credentials found, using defaults',
                    success: false
                });
            }
        } catch (error) {
            this.credentials = this.getDefaultCredentials();
            this.credentialSource = 'error';
            this.logCredentialEvent('error', {
                credentialSource: 'error',
                clientId: '',
                environmentId: '',
                region: '',
                tokenStatus: 'error',
                message: 'Failed to load credentials from localStorage',
                success: false
            });
        }
    }

    /**
     * Save credentials to localStorage
     * @param {Object} credentials - Credentials object to save
     */
    saveCredentials(credentials) {
        try {
            this.credentials = { ...this.credentials, ...credentials };
            localStorage.setItem(this.storageKey, JSON.stringify(this.credentials));
            (window.logger?.debug || console.log)('Credentials saved to localStorage');
        } catch (error) {
            (window.logger?.error || console.error)('Failed to save credentials to localStorage:', error);
        }
    }

    /**
     * Get current credentials
     * @returns {Object} Current credentials
     */
    getCredentials() {
        return { ...this.credentials };
    }

    /**
     * Update specific credential fields
     * @param {Object} updates - Credential fields to update
     */
    updateCredentials(updates) {
        this.credentials = { ...this.credentials, ...updates };
        this.saveCredentials(this.credentials);
    }

    /**
     * Clear all stored credentials
     */
    clearCredentials() {
        try {
            localStorage.removeItem(this.storageKey);
            this.credentials = this.getDefaultCredentials();
            (window.logger?.debug || console.log)('Credentials cleared');
        } catch (error) {
            (window.logger?.error || console.error)('Failed to clear credentials:', error);
        }
    }

    /**
     * Check if credentials are complete
     * @returns {boolean} True if all required fields are filled
     */
    hasCompleteCredentials() {
        return !!(this.credentials.environmentId && 
                 this.credentials.apiClientId && 
                 this.credentials.apiSecret);
    }

    /**
     * Get credentials for API calls with validation
     * @returns {Object|null} Valid credentials or null if incomplete
     */
    getValidCredentials() {
        if (!this.hasCompleteCredentials()) {
            return null;
        }
        return this.getCredentials();
    }

    /**
     * Validate credentials format
     * @param {Object} credentials - Credentials to validate
     * @returns {Object} Validation result
     */
    validateCredentials(credentials) {
        const errors = [];
        
        if (!credentials.environmentId) {
            errors.push('Environment ID is required');
        } else if (!this.isValidUUID(credentials.environmentId)) {
            errors.push('Environment ID must be a valid UUID');
        }
        
        if (!credentials.apiClientId) {
            errors.push('API Client ID is required');
        }
        
        if (!credentials.apiSecret) {
            errors.push('API Secret is required');
        }
        
        if (!credentials.region) {
            errors.push('Region is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if string is valid UUID
     * @param {string} uuid - String to validate
     * @returns {boolean} True if valid UUID
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Export credentials (for backup purposes)
     * @returns {string} JSON string of credentials
     */
    exportCredentials() {
        return JSON.stringify(this.credentials, null, 2);
    }

    /**
     * Import credentials from JSON string
     * @param {string} jsonString - JSON string of credentials
     * @returns {Object} Import result
     */
    importCredentials(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            const validation = this.validateCredentials(imported);
            
            if (validation.isValid) {
                this.saveCredentials(imported);
                return { success: true, message: 'Credentials imported successfully' };
            } else {
                return { success: false, errors: validation.errors };
            }
        } catch (error) {
            return { success: false, errors: ['Invalid JSON format'] };
        }
    }

    /**
     * Display credentials modal
     */
    displayCredentialsModal() {
        const modal = document.getElementById('credentials-modal');
        if (!modal) {
            this.logCredentialEvent('error', {
                credentialSource: this.credentialSource,
                clientId: '',
                environmentId: '',
                region: '',
                tokenStatus: 'modal',
                message: 'Credentials modal element not found',
                success: false
            });
            return;
        }
        // Populate modal content
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.innerHTML = `
                <h3>API Credentials</h3>
                <p><strong>Environment ID:</strong> ${this.credentials.environmentId}</p>
                <p><strong>API Client ID:</strong> ${this.credentials.apiClientId}</p>
                <p><strong>API Secret:</strong> ************ <span title="Secret is masked for security">(masked)</span></p>
                <p><strong>Region:</strong> ${this.credentials.region}</p>
                <p><strong>Population ID:</strong> ${this.credentials.populationId}</p>
                <p><em>Source: ${this.credentialSource || 'unknown'}</em></p>
            `;
        }
        // Show modal
        modal.style.display = 'block';
        this.logCredentialEvent('info', {
            credentialSource: this.credentialSource,
            clientId: this.credentials.apiClientId ? '***' + this.credentials.apiClientId.slice(-4) : 'missing',
            environmentId: this.credentials.environmentId ? '***' + this.credentials.environmentId.slice(-4) : 'missing',
            region: this.credentials.region,
            tokenStatus: 'modal',
            message: 'Credentials modal displayed',
            success: true
        });
    }
    /**
     * Unified credential event logger
     */
    logCredentialEvent(level, { credentialSource, clientId, environmentId, region, tokenStatus, message, success }) {
        const timestamp = new Date().toISOString();
        const logMsg = `[🗝️ CREDENTIAL-MANAGER] [${timestamp}] [${level.toUpperCase()}] Source: ${credentialSource || 'unknown'} | ClientID: ${clientId || 'missing'} | EnvID: ${environmentId || 'missing'} | Region: ${region || 'missing'} | TokenStatus: ${tokenStatus || 'unknown'} | Success: ${success ? '✅' : '❌'} | ${message}`;
        (window.logger?.log || console.log)(logMsg);
        // TODO: Forward to UI logging page and server logs if needed
    }

    /**
     * Hide credentials modal
     */
    hideCredentialsModal() {
        const modal = document.getElementById('credentials-modal');
        if (modal) {
            modal.style.display = 'none';
            (window.logger?.info || console.log)('Credentials modal hidden');
        }
    }
}

// Export for use in other modules
window.CredentialsManager = CredentialsManager;