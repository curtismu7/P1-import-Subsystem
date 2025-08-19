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
import { authLogger } from '../../server/winston-config.js';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { loadSettings as loadCentralSettings } from '../../server/services/settings-loader.js';
import regionMapper from '../../src/utils/region-mapper.js';

class EnhancedServerAuth extends PingOneAuth {
    constructor(logger = authLogger) {
        super(logger);
        // Standardize on settings.json as the exclusive credential source
        this.credentialSources = ['settings'];
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
        // Deprecated: environment variable sourcing is no longer used for PingOne credentials
        // Keep method for interface compatibility; return null to force settings.json usage
        return null;
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
                PINGONE_REGION: regionMapper.toApiCode(credentials.region || 'NA')
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
        // Use centralized loader for consistent decryption and normalization
        try {
            const { environmentId, clientId, clientSecret, region } = await loadCentralSettings(this.logger);
            return { clientId, clientSecret, environmentId, region };
        } catch (e) {
            this.logger.error('Failed to load credentials from settings.json via centralized loader:', e.message);
            return null;
        }
    }

    async saveCredentials(credentials) {
        try {
            const region = regionMapper.toApiCode(credentials.region || 'NA');
            const settingsPath = path.join(process.cwd(), 'data', 'settings.json');

            // Prepare object with PINGONE_* keys as canonical storage
            const toWrite = {
                PINGONE_CLIENT_ID: credentials.clientId || credentials.apiClientId,
                PINGONE_ENVIRONMENT_ID: credentials.environmentId,
                PINGONE_REGION: region
            };

            const rawSecret = credentials.clientSecret || credentials.apiSecret || '';
            toWrite.PINGONE_CLIENT_SECRET = this.credentialEncryptor.isEncrypted(rawSecret)
                ? rawSecret
                : await this.credentialEncryptor.encrypt(rawSecret);

            // Write pretty JSON
            await fs.writeFile(settingsPath, JSON.stringify(toWrite, null, 2), 'utf8');
            return true;
        } catch (error) {
            this.logger.error('Failed to save credentials to settings.json:', error.message);
            return false;
        }
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
