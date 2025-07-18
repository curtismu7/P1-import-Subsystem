/**
 * @fileoverview Settings Manager Class
 * 
 * Manages application settings with secure storage and encryption.
 * Handles API credentials, user preferences, and configuration data
 * with automatic encryption for sensitive information.
 * 
 * @param {Object} logger - Winston logger instance for debugging
 */
import { createWinstonLogger } from './winston-logger.js';
import { CryptoUtils } from './crypto-utils.js';

class SettingsManager {
    /**
     * Create a new SettingsManager instance
     * @param {Object} logger - Winston logger instance for debugging
     */
    constructor(logger = null) {
        // Initialize settings with default values
        this.settings = this.getDefaultSettings();
        this.storageKey = 'pingone-import-settings';
        this.encryptionKey = null;
        
        // Initialize Winston logger for debugging and error reporting
        this.initializeLogger(logger);
        
        // Encryption will be initialized in the init method
        this.encryptionInitialized = false;
    }
    
    /**
     * Initialize the settings manager
     * @returns {Promise<void>}
     */
    async init() {
        try {
            await this.initializeEncryption();
            this.encryptionInitialized = true;
            this.logger.info('Settings manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize settings manager', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Initialize Winston logger
     * @param {Object} logger - Logger instance
     */
    initializeLogger(logger) {
        if (logger && typeof logger.child === 'function') {
            this.logger = logger.child({ component: 'settings-manager' });
        } else {
            this.logger = createWinstonLogger({
                service: 'pingone-import-settings',
                environment: process.env.NODE_ENV || 'development'
            });
        }
    }
    
    /**
     * Create a default console logger if none provided
     * @returns {Object} Default logger object
     */
    createDefaultLogger() {
        return {
            log: (msg, level = 'info') => this.logger.log(level, `[Settings] ${msg}`),
            info: (msg) => this.logger.info(`[Settings] ${msg}`),
            warn: (msg) => this.logger.warn(`[Settings] ${msg}`),
            error: (msg) => this.logger.error(`[Settings] ${msg}`),
            debug: (msg) => this.logger.debug(`[Settings] ${msg}`)
        };
    }
    
    /**
     * Get region info by code
     * @param {string} code - Region code (e.g., 'NA', 'CA', 'EU', 'AU', 'SG', 'AP')
     * @returns {{code: string, tld: string, label: string}} Region information
     */
    static getRegionInfo(code) {
        if (!code) {
            return { code: 'NA', tld: 'com', label: 'North America (excluding Canada)' };
        }
        
        const regions = {
            NA: { code: 'NA', tld: 'com', label: 'North America (excluding Canada)' },
            CA: { code: 'CA', tld: 'ca', label: 'Canada' },
            EU: { code: 'EU', tld: 'eu', label: 'European Union' },
            AU: { code: 'AU', tld: 'com.au', label: 'Australia' },
            SG: { code: 'SG', tld: 'sg', label: 'Singapore' },
            AP: { code: 'AP', tld: 'asia', label: 'Asia-Pacific' }
        };
        return regions[code] || regions['NA'];
    }

    /**
     * Get default settings
     * @returns {Object} Default settings object
     */
    getDefaultSettings() {
        return {
            environmentId: '',
            region: 'NA',
            apiClientId: '',
            populationId: '',
            rateLimit: 50,
            connectionStatus: 'disconnected',
            connectionMessage: 'Not connected',
            lastConnectionTest: null,
            autoSave: true,
            lastUsedDirectory: '',
            theme: 'light',
            pageSize: 50,
            showNotifications: true
        };
    }
    
    /**
     * Load settings from storage
     * @returns {Promise<Object>} Loaded settings
     */
    async loadSettings() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (!storedData) {
                this.logger.info('No stored settings found, using defaults');
                return this.settings;
            }
            
            // Try to parse as JSON first (unencrypted)
            try {
                const parsedSettings = JSON.parse(storedData);
                this.settings = { ...this.getDefaultSettings(), ...parsedSettings };
                
                this.logger.info('Settings loaded successfully (unencrypted)', {
                    hasEnvironmentId: !!this.settings.environmentId,
                    hasApiClientId: !!this.settings.apiClientId,
                    region: this.settings.region
                });
                
                return this.settings;
            } catch (jsonError) {
                // If JSON parsing fails, try decryption
                if (!this.encryptionInitialized) {
                    this.logger.warn('Encryption not initialized and JSON parsing failed, using defaults');
                    return this.settings;
                }
                
                try {
                    const decryptedData = await CryptoUtils.decrypt(storedData, this.encryptionKey);
                    const parsedSettings = JSON.parse(decryptedData);
                    
                    // Merge with defaults to ensure all properties exist
                    this.settings = { ...this.getDefaultSettings(), ...parsedSettings };
                    
                    this.logger.info('Settings loaded successfully (encrypted)', {
                        hasEnvironmentId: !!this.settings.environmentId,
                        hasApiClientId: !!this.settings.apiClientId,
                        region: this.settings.region
                    });
                    
                    return this.settings;
                } catch (decryptionError) {
                    this.logger.error('Failed to decrypt settings', { error: decryptionError.message });
                    // Return default settings on decryption error
                    return this.settings;
                }
            }
        } catch (error) {
            this.logger.error('Failed to load settings', { error: error.message });
            // Return default settings on error
            return this.settings;
        }
    }
    
    /**
     * Save settings to storage
     * @param {Object} settings - Settings to save (optional)
     * @returns {Promise<void>}
     */
    async saveSettings(settings = null) {
        try {
            if (settings) {
                this.settings = { ...this.settings, ...settings };
            }
            
            // Always try to save without encryption first as fallback
            const jsonData = JSON.stringify(this.settings);
            
            if (!this.encryptionInitialized) {
                this.logger.warn('Encryption not initialized, saving settings without encryption');
                localStorage.setItem(this.storageKey, jsonData);
                this.logger.info('Settings saved successfully (unencrypted)', {
                    hasEnvironmentId: !!this.settings.environmentId,
                    hasApiClientId: !!this.settings.apiClientId,
                    region: this.settings.region
                });
                return;
            }
            
            try {
                const encryptedData = await CryptoUtils.encrypt(jsonData, this.encryptionKey);
                localStorage.setItem(this.storageKey, encryptedData);
                
                this.logger.info('Settings saved successfully (encrypted)', {
                    hasEnvironmentId: !!this.settings.environmentId,
                    hasApiClientId: !!this.settings.apiClientId,
                    region: this.settings.region
                });
            } catch (encryptionError) {
                this.logger.warn('Encryption failed, saving settings without encryption', { 
                    error: encryptionError.message 
                });
                // Fallback to unencrypted storage
                localStorage.setItem(this.storageKey, jsonData);
                this.logger.info('Settings saved successfully (unencrypted fallback)', {
                    hasEnvironmentId: !!this.settings.environmentId,
                    hasApiClientId: !!this.settings.apiClientId,
                    region: this.settings.region
                });
            }
        } catch (error) {
            this.logger.error('Failed to save settings', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Get a specific setting
     * @param {string} key - Setting key
     * @returns {*} Setting value
     */
    getSetting(key) {
        if (!key) {
            throw new Error('Setting key is required');
        }
        
        return this.settings[key];
    }
    
    /**
     * Set a specific setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @returns {Promise<void>}
     */
    async setSetting(key, value) {
        if (!key) {
            throw new Error('Setting key is required');
        }
        
        try {
            this.settings[key] = value;
            await this.saveSettings();
            
            this.logger.debug('Setting updated', { key, value: typeof value === 'string' ? value : '[object]' });
        } catch (error) {
            this.logger.error('Failed to update setting', { key, error: error.message });
            throw error;
        }
    }
    
    /**
     * Get all settings
     * @returns {Object} All settings
     */
    getAllSettings() {
        return { ...this.settings };
    }
    
    /**
     * Update multiple settings at once
     * @param {Object} newSettings - New settings to update
     * @returns {Promise<void>}
     */
    async updateSettings(newSettings) {
        if (!newSettings || typeof newSettings !== 'object') {
            throw new Error('New settings object is required');
        }
        
        try {
            this.settings = { ...this.settings, ...newSettings };
            await this.saveSettings();
            
            this.logger.info('Multiple settings updated', {
                updatedKeys: Object.keys(newSettings),
                hasEnvironmentId: !!this.settings.environmentId,
                hasApiClientId: !!this.settings.apiClientId
            });
        } catch (error) {
            this.logger.error('Failed to update settings', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Reset settings to defaults
     * @returns {Promise<void>}
     */
    async resetSettings() {
        try {
            this.settings = this.getDefaultSettings();
            await this.saveSettings();
            
            this.logger.info('Settings reset to defaults');
        } catch (error) {
            this.logger.error('Failed to reset settings', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Clear all settings
     * @returns {Promise<void>}
     */
    async clearSettings() {
        try {
            localStorage.removeItem(this.storageKey);
            this.settings = this.getDefaultSettings();
            
            this.logger.info('Settings cleared');
        } catch (error) {
            this.logger.error('Failed to clear settings', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Initialize encryption with a key derived from browser and user-specific data
     * @returns {Promise<void>}
     */
    async initializeEncryption() {
        try {
            let deviceId = await this.getDeviceId();
            if (typeof deviceId !== 'string') deviceId = String(deviceId || '');
            if (!deviceId) deviceId = 'fallback-device-id';
            this.encryptionKey = await CryptoUtils.generateKey(deviceId);
            this.logger.debug('Encryption initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize encryption', { error: error.message });
            // Fallback to a less secure but functional approach
            this.encryptionKey = await CryptoUtils.generateKey('fallback-encryption-key');
            this.logger.warn('Using fallback encryption key');
        }
    }
    
    /**
     * Generate a device ID based on browser and system information
     * @returns {Promise<string>} A unique device ID
     */
    async getDeviceId() {
        try {
            // Try to get a stored device ID first
            if (this.isLocalStorageAvailable()) {
                const storedDeviceId = localStorage.getItem('pingone-device-id');
                if (storedDeviceId && typeof storedDeviceId === 'string') {
                    return storedDeviceId;
                }
            }
            
            // Generate device ID from browser info
            const navigatorInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                maxTouchPoints: navigator.maxTouchPoints
            };
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(navigatorInfo));
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            if (typeof deviceId !== 'string' || !deviceId) {
                return 'fallback-device-id';
            }
            
            return deviceId;
        } catch (error) {
            this.logger.error('Failed to generate device ID:', error);
            // Fallback to a random string if crypto API fails
            return 'fallback-' + Math.random().toString(36).substring(2, 15);
        }
    }
    
    /**
     * Check if localStorage is available
     * @returns {boolean} True if localStorage is available
     */
    isLocalStorageAvailable() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            this.logger.warn('localStorage not available', { error: error.message });
            return false;
        }
    }
    
    /**
     * Export settings (for backup)
     * @returns {Promise<Object>} Export data
     */
    async exportSettings() {
        try {
            const exportData = {
                settings: this.settings,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            this.logger.info('Settings exported', { exportDate: exportData.exportDate });
            return exportData;
        } catch (error) {
            this.logger.error('Failed to export settings', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Import settings (from backup)
     * @param {Object} importData - Import data object
     * @returns {Promise<void>}
     */
    async importSettings(importData) {
        if (!importData) {
            throw new Error('Import data is required');
        }
        
        if (!importData.settings) {
            throw new Error('Invalid import data: missing settings');
        }
        
        try {
            this.settings = { ...this.getDefaultSettings(), ...importData.settings };
            await this.saveSettings();
            
            this.logger.info('Settings imported successfully', {
                importDate: importData.exportDate,
                hasEnvironmentId: !!this.settings.environmentId,
                hasApiClientId: !!this.settings.apiClientId
            });
        } catch (error) {
            this.logger.error('Failed to import settings', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Debug method to check localStorage contents
     * @returns {Object|null} Debug information
     */
    debugLocalStorage() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (!storedData) {
                this.logger.info('No data found in localStorage', { key: this.storageKey });
                return null;
            }
            
            this.logger.info('localStorage contents found', { 
                key: this.storageKey,
                length: storedData.length,
                preview: storedData.substring(0, 100) + (storedData.length > 100 ? '...' : '')
            });
            
            // Try to parse as JSON
            try {
                const parsed = JSON.parse(storedData);
                this.logger.info('Data is valid JSON', { 
                    keys: Object.keys(parsed),
                    hasEnvironmentId: !!parsed.environmentId,
                    hasApiClientId: !!parsed.apiClientId
                });
                return parsed;
            } catch (jsonError) {
                this.logger.info('Data is not valid JSON, likely encrypted', { 
                    error: jsonError.message 
                });
                return 'encrypted';
            }
        } catch (error) {
            this.logger.error('Failed to debug localStorage', { error: error.message });
            return null;
        }
    }
}

// Export the SettingsManager class
export { SettingsManager };
