/**
 * Configuration Standardization Utility - Browser Version
 * 
 * Browser-compatible version that only includes client-side functionality.
 * Does not include Node.js file system operations.
 * 
 * @fileoverview Configuration key standardization utilities for browser
 * @version 7.0.0.2
 */

/**
 * Standardized configuration key mappings
 */
export const STANDARD_KEYS = {
    ENVIRONMENT_ID: 'pingone_environment_id',
    CLIENT_ID: 'pingone_client_id', 
    CLIENT_SECRET: 'pingone_client_secret',
    REGION: 'pingone_region',
    POPULATION_ID: 'pingone_population_id'
};

/**
 * Legacy key mappings to standardized keys
 */
export const LEGACY_KEY_MAPPINGS = {
    // Environment ID mappings
    'environment-id': 'pingone_environment_id',
    'environmentId': 'pingone_environment_id',
    'environment_id': 'pingone_environment_id',
    'envId': 'pingone_environment_id',
    'env-id': 'pingone_environment_id',
    'env_id': 'pingone_environment_id',
    
    // Client ID mappings
    'api-client-id': 'pingone_client_id',
    'apiClientId': 'pingone_client_id',
    'api_client_id': 'pingone_client_id',
    'clientId': 'pingone_client_id',
    'client-id': 'pingone_client_id',
    'client_id': 'pingone_client_id',
    
    // Client Secret mappings
    'api-secret': 'pingone_client_secret',
    'apiSecret': 'pingone_client_secret',
    'api_secret': 'pingone_client_secret',
    'clientSecret': 'pingone_client_secret',
    'client-secret': 'pingone_client_secret',
    'client_secret': 'pingone_client_secret',
    
    // Region mappings
    'region': 'pingone_region',
    'pingone-region': 'pingone_region',
    'pingone_region': 'pingone_region',
    
    // Population ID mappings
    'population-id': 'pingone_population_id',
    'populationId': 'pingone_population_id',
    'population_id': 'pingone_population_id',
    'popId': 'pingone_population_id',
    'pop-id': 'pingone_population_id',
    'pop_id': 'pingone_population_id'
};

/**
 * Standardize configuration object keys
 * @param {Object} config - Configuration object to standardize
 * @param {Object} options - Standardization options
 * @returns {Object} Standardized configuration object
 */
export function standardizeConfigKeys(config, options = {}) {
    const {
        logLegacyUsage = false,
        preserveLegacyKeys = false,
        logger = console
    } = options;
    
    if (!config || typeof config !== 'object') {
        return config;
    }
    
    const standardized = preserveLegacyKeys ? { ...config } : {};
    const legacyKeysFound = [];
    
    // Process each key in the configuration
    for (const [key, value] of Object.entries(config)) {
        const standardKey = LEGACY_KEY_MAPPINGS[key];
        
        if (standardKey) {
            // This is a legacy key that should be standardized
            standardized[standardKey] = value;
            legacyKeysFound.push({ legacy: key, standard: standardKey });
            
            // Remove legacy key if not preserving
            if (!preserveLegacyKeys) {
                delete standardized[key];
            }
        } else if (Object.values(STANDARD_KEYS).includes(key)) {
            // This is already a standard key
            standardized[key] = value;
        } else {
            // This is a non-configuration key, preserve it
            standardized[key] = value;
        }
    }
    
    // Log legacy key usage if requested
    if (logLegacyUsage && legacyKeysFound.length > 0) {
        const infoLog = logger?.info || logger?.log || console.log;
        infoLog('🔄 Legacy configuration keys detected and standardized:');
        legacyKeysFound.forEach(({ legacy, standard }) => {
            infoLog(`   ${legacy} → ${standard}`);
        });
    }
    
    return standardized;
}

/**
 * Create backward compatible configuration with both standard and legacy keys
 * @param {Object} standardConfig - Configuration with standard keys
 * @returns {Object} Configuration with both standard and legacy keys
 */
export function createBackwardCompatibleConfig(standardConfig) {
    if (!standardConfig || typeof standardConfig !== 'object') {
        return standardConfig;
    }
    
    const compatible = { ...standardConfig };
    
    // Common legacy key mappings for backward compatibility
    const commonLegacyKeys = {
        [STANDARD_KEYS.ENVIRONMENT_ID]: 'environmentId',
        [STANDARD_KEYS.CLIENT_ID]: 'apiClientId', 
        [STANDARD_KEYS.CLIENT_SECRET]: 'apiSecret',
        [STANDARD_KEYS.REGION]: 'region',
        [STANDARD_KEYS.POPULATION_ID]: 'populationId'
    };
    
    // Add legacy keys for backward compatibility
    for (const [standardKey, legacyKey] of Object.entries(commonLegacyKeys)) {
        if (standardConfig[standardKey]) {
            compatible[legacyKey] = standardConfig[standardKey];
        }
    }
    
    return compatible;
}

/**
 * Get configuration value with fallback to legacy keys
 * @param {Object} config - Configuration object
 * @param {string} standardKey - Standard key to look for
 * @param {string|Array} fallbackKeys - Legacy keys to check if standard key not found
 * @param {*} defaultValue - Default value if no keys found
 * @returns {*} Configuration value
 */
export function getConfigValue(config, standardKey, fallbackKeys = [], defaultValue = null) {
    if (!config || typeof config !== 'object') {
        return defaultValue;
    }
    
    // Check standard key first
    if (config[standardKey] !== undefined) {
        return config[standardKey];
    }
    
    // Check fallback keys
    const fallbacks = Array.isArray(fallbackKeys) ? fallbackKeys : [fallbackKeys];
    for (const fallbackKey of fallbacks) {
        if (config[fallbackKey] !== undefined) {
            return config[fallbackKey];
        }
    }
    
    return defaultValue;
}
