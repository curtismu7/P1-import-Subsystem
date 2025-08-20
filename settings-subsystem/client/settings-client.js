/**
 * Settings Client - Client Side
 * 
 * Provides functionality for managing application settings on the client side.
 * Handles reading and writing settings to localStorage, synchronizing with server,
 * and providing a reactive interface for settings changes.
 * 
 * Features:
 * - Local storage persistence
 * - Server synchronization
 * - Change notifications
 * - Default settings
 * - Settings validation
 */

/**
 * Settings Client
 * 
 * Manages application settings on the client side.
 */
class SettingsClient {
    /**
     * Create a new SettingsClient
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.defaultSettings - Default settings
     * @param {string} options.storageKey - localStorage key for settings
     * @param {boolean} options.syncWithServer - Whether to sync with server
     */
    constructor(options = {}) {
        const { 
            logger, 
            defaultSettings = {}, 
            storageKey = 'app_settings',
            syncWithServer = true
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Storage key
        this.storageKey = storageKey;
        
        // Default settings
        this.defaultSettings = {
            // API settings
            apiClientId: '',
            apiSecret: '',
            environmentId: '',
            region: 'NorthAmerica',
            
            // UI settings
            theme: 'light',
            showAdvancedOptions: false,
            
            // Custom settings
            ...defaultSettings
        };
        
        // Sync with server
        this.syncWithServer = syncWithServer;
        
        // Change listeners
        this.listeners = new Map();
        
        // Settings cache
        this.settingsCache = null;
        
        // Initialize
        this._initialize();
    }

    /**
     * Initialize settings
     * @private
     */
    _initialize() {
        // Load settings from localStorage
        this._loadFromStorage();
        
        // Sync with server if enabled
        if (this.syncWithServer) {
            this._syncWithServer().catch(error => {
                this.logger.warn('Failed to sync settings with server:', error.message);
            });
        }
    }

    /**
     * Load settings from localStorage
     * @private
     */
    _loadFromStorage() {
        try {
            const storedSettings = localStorage.getItem(this.storageKey);
            
            if (storedSettings) {
                this.settingsCache = JSON.parse(storedSettings);
                this.logger.debug('Settings loaded from localStorage');
            } else {
                this.settingsCache = { ...this.defaultSettings };
                this.logger.debug('No settings found in localStorage, using defaults');
            }
        } catch (error) {
            this.logger.warn('Failed to load settings from localStorage:', error.message);
            this.settingsCache = { ...this.defaultSettings };
        }
    }

    /**
     * Save settings to localStorage
     * @private
     */
    _saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settingsCache));
            this.logger.debug('Settings saved to localStorage');
        } catch (error) {
            this.logger.warn('Failed to save settings to localStorage:', error.message);
        }
    }

    /**
     * Sync settings with server
     * @returns {Promise<void>}
     * @private
     */
    async _syncWithServer() {
        try {
            // Get settings from server
            const response = await fetch('/api/settings');
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const payload = await response.json();
            const serverSettings = (payload && payload.success) ? (payload.data || {}) : (payload || {});
            
            // Merge with local settings
            const mergedSettings = {
                ...this.settingsCache,
                ...serverSettings
            };
            
            // Update cache
            this.settingsCache = mergedSettings;
            
            // Save to localStorage
            this._saveToStorage();
            
            this.logger.debug('Settings synced with server');
        } catch (error) {
            this.logger.warn('Failed to sync settings with server:', error.message);
        }
    }

    /**
     * Notify listeners of settings changes
     * @param {string} key - Changed setting key
     * @param {*} value - New value
     * @param {*} oldValue - Old value
     * @private
     */
    _notifyListeners(key, value, oldValue) {
        // Notify specific key listeners
        if (this.listeners.has(key)) {
            for (const listener of this.listeners.get(key)) {
                try {
                    listener(value, oldValue, key);
                } catch (error) {
                    this.logger.warn(`Error in settings listener for ${key}:`, error.message);
                }
            }
        }
        
        // Notify global listeners
        if (this.listeners.has('*')) {
            for (const listener of this.listeners.get('*')) {
                try {
                    listener(key, value, oldValue);
                } catch (error) {
                    this.logger.warn('Error in global settings listener:', error.message);
                }
            }
        }
    }

    /**
     * Get all settings
     * @returns {Object} Settings object
     */
    getSettings() {
        return { ...this.settingsCache };
    }

    /**
     * Save settings
     * @param {Object} settings - Settings to save
     * @param {boolean} syncWithServer - Whether to sync with server
     * @returns {Promise<boolean>} Success status
     */
    async saveSettings(settings, syncWithServer = this.syncWithServer) {
        try {
            // Get current settings for change detection
            const oldSettings = { ...this.settingsCache };
            
            // Update cache
            this.settingsCache = {
                ...this.settingsCache,
                ...settings
            };
            
            // Save to localStorage
            this._saveToStorage();
            
            // Notify listeners of changes
            for (const [key, value] of Object.entries(settings)) {
                if (oldSettings[key] !== value) {
                    this._notifyListeners(key, value, oldSettings[key]);
                }
            }
            
            // Sync with server if enabled
            if (syncWithServer) {
                try {
                    const response = await fetch('/api/settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(settings)
                    });
                    
                    if (!response.ok) {
                        this.logger.warn(`Failed to sync settings with server: HTTP ${response.status}`);
                    }
                } catch (error) {
                    this.logger.warn('Failed to sync settings with server:', error.message);
                }
            }
            
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
     * @returns {*} Setting value
     */
    getSetting(key, defaultValue = undefined) {
        return this.settingsCache[key] !== undefined 
            ? this.settingsCache[key] 
            : (this.defaultSettings[key] !== undefined ? this.defaultSettings[key] : defaultValue);
    }

    /**
     * Set a specific setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @param {boolean} syncWithServer - Whether to sync with server
     * @returns {Promise<boolean>} Success status
     */
    async setSetting(key, value, syncWithServer = this.syncWithServer) {
        const settings = { [key]: value };
        return await this.saveSettings(settings, syncWithServer);
    }

    /**
     * Reset settings to defaults
     * @param {boolean} syncWithServer - Whether to sync with server
     * @returns {Promise<boolean>} Success status
     */
    async resetSettings(syncWithServer = this.syncWithServer) {
        return await this.saveSettings(this.defaultSettings, syncWithServer);
    }

    /**
     * Add a settings change listener
     * @param {string} key - Setting key to listen for, or '*' for all changes
     * @param {Function} listener - Listener function
     * @returns {Function} Function to remove the listener
     */
    onChange(key, listener) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        this.listeners.get(key).add(listener);
        
        // Return function to remove listener
        return () => {
            if (this.listeners.has(key)) {
                this.listeners.get(key).delete(listener);
            }
        };
    }

    /**
     * Remove all listeners for a key
     * @param {string} key - Setting key
     */
    removeListeners(key) {
        if (this.listeners.has(key)) {
            this.listeners.delete(key);
        }
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.listeners.clear();
    }
}

export default SettingsClient;