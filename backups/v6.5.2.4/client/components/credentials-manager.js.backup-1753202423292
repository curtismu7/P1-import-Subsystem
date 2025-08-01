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
    init() {
        this.loadCredentials();
        console.log('Credentials Manager initialized');
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
    loadCredentials() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.credentials = JSON.parse(stored);
                console.log('Credentials loaded from localStorage');
            } else {
                this.credentials = this.getDefaultCredentials();
                console.log('No stored credentials found, using defaults');
            }
        } catch (error) {
            console.warn('Failed to load credentials from localStorage:', error);
            this.credentials = this.getDefaultCredentials();
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
            console.log('Credentials saved to localStorage');
        } catch (error) {
            console.error('Failed to save credentials to localStorage:', error);
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
            console.log('Credentials cleared');
        } catch (error) {
            console.error('Failed to clear credentials:', error);
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
}

// Export for use in other modules
window.CredentialsManager = CredentialsManager; 