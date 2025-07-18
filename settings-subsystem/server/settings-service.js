/**
 * Settings Service - Server Side
 * 
 * Provides functionality for managing application settings on the server side.
 * Handles reading and writing settings to the filesystem, validation, and defaults.
 * 
 * Features:
 * - Settings file management
 * - Schema validation
 * - Default settings
 * - Settings migration
 * - Environment variable integration
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Settings Service
 * 
 * Manages application settings on the server side.
 */
class SettingsService {
    /**
     * Create a new SettingsService
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {string} options.settingsPath - Path to settings file
     * @param {Object} options.defaultSettings - Default settings
     * @param {Object} options.schema - Settings schema for validation
     */
    constructor(options = {}) {
        const { logger, settingsPath, defaultSettings = {}, schema = null } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Settings file path
        this.settingsPath = settingsPath || path.join(process.cwd(), 'data', 'settings.json');
        
        // Default settings
        this.defaultSettings = {
            // API settings
            apiClientId: '',
            apiSecret: '',
            environmentId: '',
            region: 'NorthAmerica',
            
            // Application settings
            port: process.env.PORT || 4000,
            logLevel: 'info',
            maxConcurrentRequests: 5,
            
            // UI settings
            theme: 'light',
            showAdvancedOptions: false,
            
            // Custom settings
            ...defaultSettings
        };
        
        // Schema for validation
        this.schema = schema;
        
        // Cache for settings
        this.settingsCache = null;
        this.lastLoadTime = 0;
        this.cacheLifetime = 60000; // 1 minute
    }

    /**
     * Get all settings
     * @param {boolean} useCache - Whether to use cached settings
     * @returns {Promise<Object>} Settings object
     */
    async getSettings(useCache = true) {
        // Check cache
        const now = Date.now();
        if (useCache && this.settingsCache && (now - this.lastLoadTime) < this.cacheLifetime) {
            return { ...this.settingsCache };
        }
        
        try {
            // Try to read settings file
            const settings = await this._readSettingsFile();
            
            // Merge with defaults and environment variables
            const mergedSettings = this._mergeWithDefaultsAndEnv(settings);
            
            // Update cache
            this.settingsCache = mergedSettings;
            this.lastLoadTime = now;
            
            return { ...mergedSettings };
        } catch (error) {
            this.logger.warn('Failed to read settings, using defaults:', error.message);
            
            // Use defaults if file cannot be read
            const defaultsWithEnv = this._mergeWithDefaultsAndEnv({});
            
            // Update cache
            this.settingsCache = defaultsWithEnv;
            this.lastLoadTime = now;
            
            return { ...defaultsWithEnv };
        }
    }

    /**
     * Save settings
     * @param {Object} settings - Settings to save
     * @returns {Promise<boolean>} Success status
     */
    async saveSettings(settings) {
        try {
            // Validate settings if schema is provided
            if (this.schema) {
                const validationResult = this._validateSettings(settings);
                if (!validationResult.valid) {
                    this.logger.error('Invalid settings:', validationResult.errors);
                    return false;
                }
            }
            
            // Merge with existing settings
            const existingSettings = await this.getSettings(false);
            const mergedSettings = {
                ...existingSettings,
                ...settings
            };
            
            // Ensure directory exists
            const dir = path.dirname(this.settingsPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Write settings file
            await fs.writeFile(
                this.settingsPath,
                JSON.stringify(mergedSettings, null, 2),
                'utf8'
            );
            
            // Update cache
            this.settingsCache = mergedSettings;
            this.lastLoadTime = Date.now();
            
            this.logger.info('Settings saved successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to save settings:', error.message);
            return false;
        }
    }

    /**
     * Get a specific setting
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default value if setting not found
     * @returns {Promise<*>} Setting value
     */
    async getSetting(key, defaultValue = undefined) {
        const settings = await this.getSettings();
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    /**
     * Set a specific setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @returns {Promise<boolean>} Success status
     */
    async setSetting(key, value) {
        const settings = await this.getSettings();
        settings[key] = value;
        return await this.saveSettings(settings);
    }

    /**
     * Reset settings to defaults
     * @returns {Promise<boolean>} Success status
     */
    async resetSettings() {
        try {
            // Write default settings
            await fs.writeFile(
                this.settingsPath,
                JSON.stringify(this.defaultSettings, null, 2),
                'utf8'
            );
            
            // Update cache
            this.settingsCache = { ...this.defaultSettings };
            this.lastLoadTime = Date.now();
            
            this.logger.info('Settings reset to defaults');
            return true;
        } catch (error) {
            this.logger.error('Failed to reset settings:', error.message);
            return false;
        }
    }

    /**
     * Clear settings cache
     */
    clearCache() {
        this.settingsCache = null;
        this.lastLoadTime = 0;
    }

    /**
     * Read settings from file
     * @returns {Promise<Object>} Settings object
     * @private
     */
    async _readSettingsFile() {
        try {
            const data = await fs.readFile(this.settingsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.logger.info('Settings file not found, creating with defaults');
                
                // Create default settings file
                try {
                    // Ensure directory exists
                    const dir = path.dirname(this.settingsPath);
                    await fs.mkdir(dir, { recursive: true });
                    
                    // Write default settings
                    await fs.writeFile(
                        this.settingsPath,
                        JSON.stringify(this.defaultSettings, null, 2),
                        'utf8'
                    );
                } catch (writeError) {
                    this.logger.warn('Failed to create default settings file:', writeError.message);
                }
            } else {
                this.logger.warn('Failed to parse settings file:', error.message);
            }
            
            throw error;
        }
    }

    /**
     * Merge settings with defaults and environment variables
     * @param {Object} settings - Settings object
     * @returns {Object} Merged settings
     * @private
     */
    _mergeWithDefaultsAndEnv(settings) {
        // Start with defaults
        const result = { ...this.defaultSettings };
        
        // Override with settings from file
        Object.assign(result, settings);
        
        // Override with environment variables
        if (process.env.PINGONE_CLIENT_ID) {
            result.apiClientId = process.env.PINGONE_CLIENT_ID;
        }
        
        if (process.env.PINGONE_CLIENT_SECRET) {
            result.apiSecret = process.env.PINGONE_CLIENT_SECRET;
        }
        
        if (process.env.PINGONE_ENVIRONMENT_ID) {
            result.environmentId = process.env.PINGONE_ENVIRONMENT_ID;
        }
        
        if (process.env.PINGONE_REGION) {
            result.region = process.env.PINGONE_REGION;
        }
        
        if (process.env.PORT) {
            result.port = parseInt(process.env.PORT, 10) || 4000;
        }
        
        if (process.env.LOG_LEVEL) {
            result.logLevel = process.env.LOG_LEVEL;
        }
        
        return result;
    }

    /**
     * Validate settings against schema
     * @param {Object} settings - Settings to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateSettings(settings) {
        if (!this.schema) {
            return { valid: true };
        }
        
        // Simple validation for now
        // In a real implementation, use a schema validation library like Joi
        const errors = [];
        
        for (const [key, value] of Object.entries(this.schema)) {
            if (value.required && (settings[key] === undefined || settings[key] === null)) {
                errors.push(`Missing required setting: ${key}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default SettingsService;