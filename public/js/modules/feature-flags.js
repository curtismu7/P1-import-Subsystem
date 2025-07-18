/**
 * @fileoverview Feature Flags Management
 * 
 * Manages feature flags for the PingOne Import Tool application.
 * Provides a simple way to enable/disable features dynamically
 * without requiring code changes or deployments.
 * 
 * Features:
 * - Persistent storage in localStorage
 * - Default flag values
 * - Dynamic flag updates
 * - Flag validation
 * - Winston logging integration
 */

import { createWinstonLogger } from './winston-logger.js';

/**
 * Feature Flags Manager Class
 * 
 * Manages application feature flags with persistent storage
 * and Winston logging integration.
 */
class FeatureFlags {
    constructor() {
        this.storageKey = 'pingone-feature-flags';
        this.flags = this.getDefaultFlags();
        
        // Initialize Winston logger
        this.logger = createWinstonLogger({
            service: 'pingone-import-feature-flags',
            environment: process.env.NODE_ENV || 'development'
        });
        
        this.initialize();
    }
    
    /**
     * Initialize feature flags
     */
    initialize() {
        try {
            this.loadFlags();
            this.logger.info('Feature flags initialized', { flags: this.flags });
        } catch (error) {
            this.logger.error('Failed to initialize feature flags', { error: error.message });
        }
    }
    
    /**
     * Get default flag values
     */
    getDefaultFlags() {
        return {
            A: false, // Advanced import options
            B: false, // Experimental export format
            C: false, // Enhanced logging
            progressPage: false // Progress page feature flag - disabled by default
        };
    }
    
    /**
     * Load flags from localStorage
     */
    loadFlags() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.flags = { ...this.getDefaultFlags(), ...parsed };
                this.logger.debug('Flags loaded from storage', { flags: this.flags });
            } else {
                this.logger.debug('No stored flags found, using defaults');
            }
        } catch (error) {
            this.logger.warn('Error reading from localStorage', { error: error.message });
            this.flags = this.getDefaultFlags();
        }
    }
    
    /**
     * Save flags to localStorage
     */
    saveFlags() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.flags));
            this.logger.debug('Flags saved to storage', { flags: this.flags });
        } catch (error) {
            this.logger.warn('Error saving to localStorage', { error: error.message });
        }
    }
    
    /**
     * Get a specific flag value
     */
    getFlag(flag) {
        if (this.flags.hasOwnProperty(flag)) {
            const value = this.flags[flag];
            this.logger.debug(`Flag ${flag} retrieved`, { value });
            return value;
        } else {
            this.logger.warn(`Unknown flag: ${flag}`);
            return false;
        }
    }
    
    /**
     * Set a specific flag value
     */
    setFlag(flag, value) {
        if (this.flags.hasOwnProperty(flag)) {
            this.flags[flag] = Boolean(value);
            this.saveFlags();
            this.logger.info(`Flag ${flag} set to ${value}`, { flag, value: this.flags[flag] });
        } else {
            this.logger.warn(`Unknown flag: ${flag}`);
        }
    }
    
    /**
     * Get all flags
     */
    getAllFlags() {
        this.logger.debug('All flags retrieved', { flags: this.flags });
        return { ...this.flags };
    }
    
    /**
     * Reset all flags to defaults
     */
    resetFlags() {
        this.flags = this.getDefaultFlags();
        this.saveFlags();
        this.logger.info('All flags reset to defaults', { flags: this.flags });
    }
    
    /**
     * Check if a flag is enabled
     */
    isEnabled(flag) {
        return this.getFlag(flag) === true;
    }
    
    /**
     * Check if a flag is disabled
     */
    isDisabled(flag) {
        return this.getFlag(flag) === false;
    }
    
    /**
     * Toggle a flag value
     */
    toggleFlag(flag) {
        if (this.flags.hasOwnProperty(flag)) {
            const newValue = !this.flags[flag];
            this.setFlag(flag, newValue);
            this.logger.info(`Flag ${flag} toggled to ${newValue}`, { flag, value: newValue });
        } else {
            this.logger.warn(`Cannot toggle unknown flag: ${flag}`);
        }
    }
    
    /**
     * Get flag metadata
     */
    getFlagMetadata() {
        return {
            A: {
                name: 'Advanced Import Options',
                description: 'Enables advanced import features and options',
                default: false
            },
            B: {
                name: 'Experimental Export Format',
                description: 'Uses experimental export format for better compatibility',
                default: false
            },
            C: {
                name: 'Enhanced Logging',
                description: 'Enables detailed logging for debugging',
                default: false
            },
            progressPage: {
                name: 'Progress Page',
                description: 'Enables the Progress page functionality',
                default: false
            }
        };
    }
    
    /**
     * Validate flag configuration
     */
    validateFlags() {
        const defaultFlags = this.getDefaultFlags();
        const missingFlags = Object.keys(defaultFlags).filter(flag => !this.flags.hasOwnProperty(flag));
        
        if (missingFlags.length > 0) {
            this.logger.warn('Missing flags detected', { missingFlags });
            // Add missing flags with default values
            missingFlags.forEach(flag => {
                this.flags[flag] = defaultFlags[flag];
            });
            this.saveFlags();
        }
        
        this.logger.debug('Flag validation completed', { 
            totalFlags: Object.keys(this.flags).length,
            enabledFlags: Object.keys(this.flags).filter(flag => this.flags[flag]).length
        });
    }
}

// Create and export default instance
const featureFlags = new FeatureFlags();

// Export the class and instance
export { FeatureFlags, featureFlags }; 