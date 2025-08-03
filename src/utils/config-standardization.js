/**
 * Configuration Standardization Utility
 * 
 * Provides utilities for standardizing configuration key names across the entire codebase.
 * Ensures consistent naming conventions for PingOne configuration variables.
 * 
 * @fileoverview Configuration key standardization and migration utilities
 * @version 7.0.1.0
 */

/**
 * Standardized configuration key mappings
 */
export const STANDARD_KEYS = {
    ENVIRONMENT_ID: 'pingone_environment_id',
    CLIENT_ID: 'pingone_client_id', 
    CLIENT_SECRET: 'pingone_client_secret',
    REGION: 'pingone_region'
};

/**
 * Legacy key mappings to standard keys
 */
export const LEGACY_KEY_MAPPINGS = {
    // Environment ID variations
    'environment-id': STANDARD_KEYS.ENVIRONMENT_ID,
    'environmentId': STANDARD_KEYS.ENVIRONMENT_ID,
    'environment_id': STANDARD_KEYS.ENVIRONMENT_ID,
    'envId': STANDARD_KEYS.ENVIRONMENT_ID,
    'env-id': STANDARD_KEYS.ENVIRONMENT_ID,
    
    // Client ID variations
    'api-client-id': STANDARD_KEYS.CLIENT_ID,
    'apiClientId': STANDARD_KEYS.CLIENT_ID,
    'client-id': STANDARD_KEYS.CLIENT_ID,
    'clientId': STANDARD_KEYS.CLIENT_ID,
    'client_id': STANDARD_KEYS.CLIENT_ID,
    'api_client_id': STANDARD_KEYS.CLIENT_ID,
    
    // Client Secret variations
    'api-secret': STANDARD_KEYS.CLIENT_SECRET,
    'apiSecret': STANDARD_KEYS.CLIENT_SECRET,
    'client-secret': STANDARD_KEYS.CLIENT_SECRET,
    'clientSecret': STANDARD_KEYS.CLIENT_SECRET,
    'client_secret': STANDARD_KEYS.CLIENT_SECRET,
    'api_secret': STANDARD_KEYS.CLIENT_SECRET,
    'API-secret': STANDARD_KEYS.CLIENT_SECRET,
    'API_SECRET': STANDARD_KEYS.CLIENT_SECRET,
    
    // Region variations
    'region': STANDARD_KEYS.REGION,
    'pingone-region': STANDARD_KEYS.REGION,
    'pingone.region': STANDARD_KEYS.REGION,
    'ping_one_region': STANDARD_KEYS.REGION
};

/**
 * Environment variable mappings
 */
export const ENV_VAR_MAPPINGS = {
    'PINGONE_ENVIRONMENT_ID': STANDARD_KEYS.ENVIRONMENT_ID,
    'PINGONE_CLIENT_ID': STANDARD_KEYS.CLIENT_ID,
    'PINGONE_CLIENT_SECRET': STANDARD_KEYS.CLIENT_SECRET,
    'PINGONE_REGION': STANDARD_KEYS.REGION
};

/**
 * Standardize configuration object keys
 * @param {Object} config - Configuration object to standardize
 * @param {Object} options - Standardization options
 * @returns {Object} Standardized configuration object
 */
export function standardizeConfigKeys(config, options = {}) {
    const {
        logLegacyUsage = true,
        preserveLegacyKeys = false,
        logger = console
    } = options;
    
    if (!config || typeof config !== 'object') {
        return config;
    }
    
    const standardized = {};
    const legacyKeysFound = [];
    
    // Process each key in the configuration
    for (const [key, value] of Object.entries(config)) {
        const standardKey = LEGACY_KEY_MAPPINGS[key];
        
        if (standardKey) {
            // This is a legacy key that needs standardization
            standardized[standardKey] = value;
            legacyKeysFound.push({ legacy: key, standard: standardKey });
            
            // Optionally preserve legacy key for backward compatibility
            if (preserveLegacyKeys) {
                standardized[key] = value;
            }
        } else if (Object.values(STANDARD_KEYS).includes(key)) {
            // This is already a standard key
            standardized[key] = value;
        } else {
            // This is not a PingOne configuration key, keep as-is
            standardized[key] = value;
        }
    }
    
    // Log legacy key usage for cleanup tracking
    if (logLegacyUsage && legacyKeysFound.length > 0) {
        logger.warn('🔄 Legacy configuration keys detected and standardized:', {
            legacyKeys: legacyKeysFound,
            location: 'config-standardization',
            action: 'Please update to use standard keys for consistency'
        });
    }
    
    return standardized;
}

/**
 * Standardize localStorage keys
 * @param {Object} options - Standardization options
 */
export function standardizeLocalStorageKeys(options = {}) {
    const { logger = console } = options;
    const legacyKeysFound = [];
    
    // Check for legacy keys in localStorage
    for (const [legacyKey, standardKey] of Object.entries(LEGACY_KEY_MAPPINGS)) {
        const value = localStorage.getItem(legacyKey);
        if (value !== null) {
            // Migrate to standard key
            localStorage.setItem(standardKey, value);
            localStorage.removeItem(legacyKey);
            legacyKeysFound.push({ legacy: legacyKey, standard: standardKey });
        }
    }
    
    if (legacyKeysFound.length > 0) {
        logger.info('🔄 Migrated localStorage keys to standard format:', {
            migratedKeys: legacyKeysFound,
            location: 'localStorage'
        });
    }
}

/**
 * Get standardized configuration from environment variables
 * @returns {Object} Standardized environment configuration
 */
export function getStandardizedEnvConfig() {
    const config = {};
    
    for (const [envVar, standardKey] of Object.entries(ENV_VAR_MAPPINGS)) {
        const value = process.env[envVar];
        if (value) {
            config[standardKey] = value;
        }
    }
    
    return config;
}

/**
 * Validate that configuration uses standard keys
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateStandardKeys(config) {
    const issues = [];
    const warnings = [];
    
    if (!config || typeof config !== 'object') {
        return { valid: false, issues: ['Configuration is not an object'], warnings: [] };
    }
    
    // Check for legacy keys
    for (const key of Object.keys(config)) {
        if (LEGACY_KEY_MAPPINGS[key]) {
            warnings.push(`Legacy key '${key}' should be '${LEGACY_KEY_MAPPINGS[key]}'`);
        }
    }
    
    // Check for required standard keys
    const requiredKeys = [
        STANDARD_KEYS.ENVIRONMENT_ID,
        STANDARD_KEYS.CLIENT_ID,
        STANDARD_KEYS.CLIENT_SECRET,
        STANDARD_KEYS.REGION
    ];
    
    for (const requiredKey of requiredKeys) {
        if (!config[requiredKey]) {
            issues.push(`Missing required standard key: ${requiredKey}`);
        }
    }
    
    return {
        valid: issues.length === 0,
        issues,
        warnings,
        hasLegacyKeys: warnings.length > 0
    };
}

/**
 * Create backward-compatible configuration object
 * @param {Object} standardConfig - Configuration with standard keys
 * @returns {Object} Configuration with both standard and legacy keys
 */
export function createBackwardCompatibleConfig(standardConfig) {
    const compatible = { ...standardConfig };
    
    // Add legacy key mappings for backward compatibility
    const reverseMapping = {};
    for (const [legacy, standard] of Object.entries(LEGACY_KEY_MAPPINGS)) {
        if (!reverseMapping[standard]) {
            reverseMapping[standard] = [];
        }
        reverseMapping[standard].push(legacy);
    }
    
    // Add the most common legacy keys for each standard key
    const commonLegacyKeys = {
        [STANDARD_KEYS.ENVIRONMENT_ID]: 'environment-id',
        [STANDARD_KEYS.CLIENT_ID]: 'api-client-id',
        [STANDARD_KEYS.CLIENT_SECRET]: 'api-secret',
        [STANDARD_KEYS.REGION]: 'region'
    };
    
    for (const [standardKey, legacyKey] of Object.entries(commonLegacyKeys)) {
        if (standardConfig[standardKey]) {
            compatible[legacyKey] = standardConfig[standardKey];
        }
    }
    
    return compatible;
}

/**
 * Migrate configuration file to use standard keys
 * @param {string} filePath - Path to configuration file
 * @param {Object} options - Migration options
 */
export async function migrateConfigurationFile(filePath, options = {}) {
    const {
        createBackup = true,
        preserveLegacyKeys = false,
        logger = console
    } = options;
    
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Read current configuration
        const configContent = await fs.readFile(filePath, 'utf8');
        const config = JSON.parse(configContent);
        
        // Create backup if requested
        if (createBackup) {
            const backupPath = `${filePath}.backup.${Date.now()}`;
            await fs.writeFile(backupPath, configContent);
            logger.info(`📁 Created backup: ${backupPath}`);
        }
        
        // Standardize configuration
        const standardizedConfig = standardizeConfigKeys(config, {
            logLegacyUsage: true,
            preserveLegacyKeys,
            logger
        });
        
        // Write standardized configuration
        await fs.writeFile(filePath, JSON.stringify(standardizedConfig, null, 2));
        
        logger.info(`✅ Migrated configuration file: ${filePath}`);
        
        return {
            success: true,
            originalConfig: config,
            standardizedConfig,
            backupCreated: createBackup
        };
        
    } catch (error) {
        logger.error(`❌ Failed to migrate configuration file: ${filePath}`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get configuration value using standard key with fallback to legacy keys
 * @param {Object} config - Configuration object
 * @param {string} standardKey - Standard key to look for
 * @returns {any} Configuration value
 */
export function getConfigValue(config, standardKey) {
    if (!config || typeof config !== 'object') {
        return undefined;
    }
    
    // First try the standard key
    if (config[standardKey] !== undefined) {
        return config[standardKey];
    }
    
    // Fall back to legacy keys
    for (const [legacyKey, mappedStandardKey] of Object.entries(LEGACY_KEY_MAPPINGS)) {
        if (mappedStandardKey === standardKey && config[legacyKey] !== undefined) {
            return config[legacyKey];
        }
    }
    
    return undefined;
}

/**
 * Set configuration value using standard key
 * @param {Object} config - Configuration object to modify
 * @param {string} standardKey - Standard key to set
 * @param {any} value - Value to set
 * @param {Object} options - Set options
 */
export function setConfigValue(config, standardKey, value, options = {}) {
    const { removeLegacyKeys = false } = options;
    
    if (!config || typeof config !== 'object') {
        return;
    }
    
    // Set the standard key
    config[standardKey] = value;
    
    // Optionally remove legacy keys
    if (removeLegacyKeys) {
        for (const [legacyKey, mappedStandardKey] of Object.entries(LEGACY_KEY_MAPPINGS)) {
            if (mappedStandardKey === standardKey && config[legacyKey] !== undefined) {
                delete config[legacyKey];
            }
        }
    }
}

export default {
    STANDARD_KEYS,
    LEGACY_KEY_MAPPINGS,
    ENV_VAR_MAPPINGS,
    standardizeConfigKeys,
    standardizeLocalStorageKeys,
    getStandardizedEnvConfig,
    validateStandardKeys,
    createBackwardCompatibleConfig,
    migrateConfigurationFile,
    getConfigValue,
    setConfigValue
};
