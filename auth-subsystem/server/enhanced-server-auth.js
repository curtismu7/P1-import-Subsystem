/**
 * Enhanced Server Authentication System
 * 
 * Provides comprehensive server-side authentication with PingOne including:
 * - Automatic worker token retrieval on server startup
 * - Multi-source credential management (.env, settings.json, localStorage)
 * - Secure credential storage and encryption
 * - Fallback mechanisms and error handling
 * - Persistent credential management interface
 * 
 * This module extends the existing PingOneAuth class with enhanced
 * server startup capabilities and comprehensive credential management.
 */

import PingOneAuth from './pingone-auth.js';
import CredentialEncryptor from './credential-encryptor.js';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

class EnhancedServerAuth extends PingOneAuth {
    constructor(logger) {
        super(logger);
        this.credentialSources = ['env', 'settings', 'fallback'];
        this.startupToken = null;
        this.startupTokenExpiry = null;
        this.isInitialized = false;
        this.initializationError = null;
        
        // Enhanced credential management
        this.credentialManager = {
            env: new EnvCredentialManager(logger),
            settings: new SettingsCredentialManager(this.credentialEncryptor, logger),
            localStorage: new LocalStorageCredentialManager(logger)
        };
    }

    /**
     * Initialize the authentication system on server startup
     * Retrieves worker token and validates credentials from all sources
     * @returns {Promise<Object>} Initialization result with token and status
     */
    async initializeOnStartup() {
        this.logger.info('🚀 Initializing Enhanced Server Authentication System...');
        
        try {
            // Step 1: Load and validate credentials from all sources
            const credentialResult = await this.loadAndValidateCredentials();
            
            if (!credentialResult.success) {
                this.initializationError = credentialResult.error;
                this.logger.error('❌ Server authentication initialization failed:', credentialResult.error);
                return {
                    success: false,
                    error: credentialResult.error,
                    token: null,
                    recommendations: this.getSetupRecommendations()
                };
            }

            // Step 2: Retrieve worker token using validated credentials
            this.logger.info('🔑 Retrieving PingOne worker token...');
            const token = await this.getAccessToken();
            
            if (token) {
                this.startupToken = token;
                this.startupTokenExpiry = this.tokenExpiry;
                this.isInitialized = true;
                
                this.logger.info('✅ Server authentication initialized successfully');
                this.logger.info(`🎯 Token expires at: ${new Date(this.tokenExpiry).toISOString()}`);
                
                return {
                    success: true,
                    token: token,
                    expiresAt: this.tokenExpiry,
                    credentialSource: credentialResult.source,
                    environmentId: credentialResult.credentials.environmentId
                };
            } else {
                throw new Error('Failed to retrieve access token');
            }
            
        } catch (error) {
            this.initializationError = error.message;
            this.logger.error('❌ Server authentication initialization failed:', error.message);
            
            return {
                success: false,
                error: error.message,
                token: null,
                recommendations: this.getSetupRecommendations()
            };
        }
    }

    /**
     * Load and validate credentials from multiple sources with fallback
     * Priority: .env -> settings.json -> fallback
     * @returns {Promise<Object>} Credential loading result
     */
    async loadAndValidateCredentials() {
        const results = {
            env: null,
            settings: null,
            fallback: null
        };

        // Try each credential source in priority order
        for (const source of this.credentialSources) {
            try {
                this.logger.info(`🔍 Checking credentials from: ${source}`);
                
                let credentials = null;
                switch (source) {
                    case 'env':
                        credentials = await this.credentialManager.env.loadCredentials();
                        break;
                    case 'settings':
                        credentials = await this.credentialManager.settings.loadCredentials();
                        break;
                    case 'fallback':
                        credentials = await this.loadFallbackCredentials();
                        break;
                }

                if (credentials && this.validateCredentialCompleteness(credentials)) {
                    // Test credentials by attempting validation
                    const validation = await this.validateCredentials({
                        apiClientId: credentials.clientId,
                        apiSecret: credentials.clientSecret,
                        environmentId: credentials.environmentId,
                        region: credentials.region
                    });

                    if (validation.success) {
                        this.logger.info(`✅ Valid credentials found in: ${source}`);
                        return {
                            success: true,
                            credentials: credentials,
                            source: source
                        };
                    } else {
                        this.logger.warn(`⚠️ Invalid credentials in ${source}: ${validation.message}`);
                        results[source] = { error: validation.message };
                    }
                } else {
                    this.logger.warn(`⚠️ Incomplete credentials in: ${source}`);
                    results[source] = { error: 'Incomplete credentials' };
                }
            } catch (error) {
                this.logger.warn(`⚠️ Error loading credentials from ${source}:`, error.message);
                results[source] = { error: error.message };
            }
        }

        // No valid credentials found in any source
        return {
            success: false,
            error: 'No valid PingOne credentials found in any source (.env, settings.json, or fallback)',
            results: results
        };
    }

    /**
     * Validate that credentials contain all required fields
     * @param {Object} credentials - Credentials to validate
     * @returns {boolean} True if credentials are complete
     */
    validateCredentialCompleteness(credentials) {
        if (!credentials) return false;
        
        const required = ['clientId', 'clientSecret', 'environmentId'];
        return required.every(field => 
            credentials[field] && 
            credentials[field].trim() !== '' &&
            !credentials[field].includes('YOUR_') &&
            !credentials[field].includes('_HERE')
        );
    }

    /**
     * Load fallback credentials (for emergency access)
     * @returns {Promise<Object|null>} Fallback credentials or null
     */
    async loadFallbackCredentials() {
        // This could load from a secure backup location, environment-specific configs, etc.
        // For now, return null as fallback should be implemented based on specific needs
        this.logger.info('No fallback credentials configured');
        return null;
    }

    /**
     * Save credentials to multiple storage locations
     * @param {Object} credentials - Credentials to save
     * @param {Array} targets - Storage targets ['env', 'settings', 'localStorage']
     * @returns {Promise<Object>} Save operation results
     */
    async saveCredentialsToMultipleLocations(credentials, targets = ['env', 'settings']) {
        const results = {};
        
        this.logger.info('💾 Saving credentials to multiple locations...');
        
        for (const target of targets) {
            try {
                let success = false;
                
                switch (target) {
                    case 'env':
                        success = await this.credentialManager.env.saveCredentials(credentials);
                        break;
                    case 'settings':
                        success = await this.credentialManager.settings.saveCredentials(credentials);
                        break;
                    case 'localStorage':
                        success = await this.credentialManager.localStorage.saveCredentials(credentials);
                        break;
                }
                
                results[target] = { success, error: null };
                this.logger.info(`${success ? '✅' : '❌'} Credentials ${success ? 'saved to' : 'failed to save to'}: ${target}`);
                
            } catch (error) {
                results[target] = { success: false, error: error.message };
                this.logger.error(`❌ Error saving credentials to ${target}:`, error.message);
            }
        }
        
        return results;
    }

    /**
     * Get setup recommendations for configuration
     * @returns {Array} Array of setup recommendations
     */
    getSetupRecommendations() {
        return [
            '1. Create or update .env file with valid PingOne credentials',
            '2. Ensure PINGONE_CLIENT_ID, PINGONE_CLIENT_SECRET, and PINGONE_ENVIRONMENT_ID are set',
            '3. Verify credentials are valid by testing them in PingOne console',
            '4. Check that the PingOne application has the required scopes',
            '5. Ensure network connectivity to PingOne APIs',
            '6. Review server logs for detailed error information'
        ];
    }

    /**
     * Get current authentication status
     * @returns {Object} Current authentication status
     */
    getAuthenticationStatus() {
        return {
            isInitialized: this.isInitialized,
            hasValidToken: this.token && this.tokenExpiry > Date.now(),
            tokenExpiresAt: this.tokenExpiry,
            initializationError: this.initializationError,
            lastTokenRefresh: this.lastTokenRequest,
            currentRegion: this.currentRegion
        };
    }

    /**
     * Refresh startup token if needed
     * @returns {Promise<string>} Refreshed token
     */
    async refreshStartupToken() {
        if (!this.isInitialized) {
            throw new Error('Authentication system not initialized');
        }
        
        const token = await this.getAccessToken();
        this.startupToken = token;
        this.startupTokenExpiry = this.tokenExpiry;
        
        return token;
    }
}

/**
 * Environment Variable Credential Manager
 */
class EnvCredentialManager {
    constructor(logger) {
        this.logger = logger;
        this.envPath = path.join(process.cwd(), '.env');
    }

    async loadCredentials() {
        // Reload .env file to get latest values
        dotenv.config({ path: this.envPath });
        
        return {
            clientId: process.env.PINGONE_CLIENT_ID,
            clientSecret: process.env.PINGONE_CLIENT_SECRET,
            environmentId: process.env.PINGONE_ENVIRONMENT_ID,
            region: process.env.PINGONE_REGION || 'NorthAmerica'
        };
    }

    async saveCredentials(credentials) {
        try {
            let envContent = '';
            
            // Read existing .env file if it exists
            try {
                envContent = await fs.readFile(this.envPath, 'utf8');
            } catch (error) {
                // File doesn't exist, start with empty content
                this.logger.info('Creating new .env file');
            }

            // Update or add PingOne credentials
            const updates = {
                PINGONE_CLIENT_ID: credentials.clientId || credentials.apiClientId,
                PINGONE_CLIENT_SECRET: credentials.clientSecret || credentials.apiSecret,
                PINGONE_ENVIRONMENT_ID: credentials.environmentId,
                PINGONE_REGION: credentials.region || 'NorthAmerica'
            };

            // Parse existing content and update
            const lines = envContent.split('\n');
            const updatedLines = [];
            const processedKeys = new Set();

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine && !trimmedLine.startsWith('#')) {
                    const [key] = trimmedLine.split('=');
                    if (updates.hasOwnProperty(key)) {
                        updatedLines.push(`${key}=${updates[key]}`);
                        processedKeys.add(key);
                    } else {
                        updatedLines.push(line);
                    }
                } else {
                    updatedLines.push(line);
                }
            }

            // Add any new keys that weren't in the original file
            for (const [key, value] of Object.entries(updates)) {
                if (!processedKeys.has(key)) {
                    updatedLines.push(`${key}=${value}`);
                }
            }

            // Write updated content
            await fs.writeFile(this.envPath, updatedLines.join('\n'), 'utf8');
            
            // Reload environment variables
            dotenv.config({ path: this.envPath });
            
            return true;
        } catch (error) {
            this.logger.error('Failed to save credentials to .env:', error.message);
            return false;
        }
    }
}

/**
 * Settings File Credential Manager
 */
class SettingsCredentialManager {
    constructor(credentialEncryptor, logger) {
        this.credentialEncryptor = credentialEncryptor;
        this.logger = logger;
    }

    async loadCredentials() {
        const settings = await this.credentialEncryptor.readAndDecryptSettings();
        if (!settings) return null;

        return {
            clientId: settings['api-client-id'] || settings.apiClientId,
            clientSecret: settings['api-secret'] || settings.apiSecret,
            environmentId: settings['environment-id'] || settings.environmentId,
            region: settings.region || 'NorthAmerica'
        };
    }

    async saveCredentials(credentials) {
        const credentialsToSave = {
            apiClientId: credentials.clientId || credentials.apiClientId,
            apiSecret: credentials.clientSecret || credentials.apiSecret,
            environmentId: credentials.environmentId,
            region: credentials.region || 'NorthAmerica'
        };

        return await this.credentialEncryptor.encryptAndSaveSettings(credentialsToSave);
    }
}

/**
 * Local Storage Credential Manager (for client-side access)
 */
class LocalStorageCredentialManager {
    constructor(logger) {
        this.logger = logger;
    }

    async loadCredentials() {
        // This would be implemented on the client-side
        // Server-side implementation returns null
        return null;
    }

    async saveCredentials(credentials) {
        // This would be implemented on the client-side
        // Server-side implementation returns true (no-op)
        return true;
    }
}

export default EnhancedServerAuth;
